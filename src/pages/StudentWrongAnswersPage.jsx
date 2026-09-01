import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Check, Clock, Plus, Upload,
  Image as ImageIcon, Trash2, ZoomIn, X, Camera, BookMarked,
  RotateCcw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Zap, Scissors, Play
} from 'lucide-react';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useCoaching } from '../context/CoachingContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toUUID } from '../services/supabaseService';
import { compressImageToWebP } from '../services/imageCompressionService';
import { LEITNER_BOX_CONFIG, getLeitnerOverview } from '../services/spacedRepetitionService';
import { resolveTestQuestions } from '../utils/testResolver';
import { scheduleRemedialTestInProgram } from '../services/remedialSpacedRepetitionService';
import LeitnerPracticeModal from '../components/quiz/runner/LeitnerPracticeModal';
import PdfQuestionSlicerModal from '../components/question-bank/PdfQuestionSlicerModal';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const getSubjectConfig = (isDark) => ({
  'Tümü': {
    label: 'Tüm Dersler',
    icon: GraduationCap,
    color: '#818cf8',
    bg: isDark ? 'rgba(99, 102, 241, 0.18)' : '#f5f3ff',
    border: isDark ? 'rgba(129, 140, 248, 0.35)' : '#ddd6fe'
  },
  'Matematik': {
    label: 'Matematik',
    icon: Ruler,
    color: '#3b82f6',
    bg: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
    border: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe'
  },
  'Fen Bilimleri': {
    label: 'Fen Bilimleri',
    icon: TestTube2,
    color: '#10b981',
    bg: isDark ? 'rgba(16, 185, 129, 0.18)' : '#f0fdf4',
    border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0'
  },
  'Türkçe': {
    label: 'Türkçe',
    icon: BookCopy,
    color: '#f97316',
    bg: isDark ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed',
    border: isDark ? 'rgba(249, 115, 22, 0.35)' : '#fed7aa'
  },
  'Sosyal Bilgiler': {
    label: 'Sosyal Bilgiler',
    icon: Globe,
    color: '#a855f7',
    bg: isDark ? 'rgba(168, 85, 247, 0.18)' : '#faf5ff',
    border: isDark ? 'rgba(168, 85, 247, 0.35)' : '#e9d5ff'
  },
  'İngilizce': {
    label: 'İngilizce',
    icon: MessageSquare,
    color: '#f43f5e',
    bg: isDark ? 'rgba(244, 63, 94, 0.18)' : '#fff1f2',
    border: isDark ? 'rgba(244, 63, 94, 0.35)' : '#fecdd3'
  },
  'Din Kültürü': {
    label: 'Din Kültürü',
    icon: BookOpen,
    color: '#14b8a6',
    bg: isDark ? 'rgba(20, 184, 166, 0.18)' : '#f0fdfa',
    border: isDark ? 'rgba(20, 184, 166, 0.35)' : '#99f6e4'
  },
  'Genel Testler': {
    label: 'Genel Testler',
    icon: Trophy,
    color: '#6366f1',
    bg: isDark ? 'rgba(99, 102, 241, 0.18)' : '#f5f3ff',
    border: isDark ? 'rgba(99, 102, 241, 0.35)' : '#ddd6fe'
  },
});

const REASON_PRESETS = [
  '⚡ İşlem Hatası',
  '⚠️ Dikkat / Yanlış Okuma',
  '📖 Formül / Bilgi Unutuldu',
  '🧠 Konu Eksiği Var',
  '🧩 Soru Tarzını Anlamadım',
  '⏱️ Zaman Yetmedi'
];

const isSubjectName = (str) => {
  if (!str) return false;
  const lower = String(str).toLowerCase().trim();
  return (
    lower === 'matematik' || lower === 'fen bilimleri' || lower === 'fen' ||
    lower === 'türkçe' || lower === 'turkce' || lower === 'sosyal bilgiler' ||
    lower === 'sosyal' || lower === 'ingilizce' || lower === 'din kültürü' ||
    lower === 'din kulturu' || lower === 'din' || lower === 'genel testler' ||
    lower === 'fizik' || lower === 'kimya' || lower === 'biyoloji' ||
    lower === 'tarih' || lower === 'coğrafya' || lower === 'cografya' ||
    lower === 'edebiyat' || lower === 'geometri'
  );
};

const checkSubjectName = (str) => {
  if (!str) return '';
  const lower = String(str).toLowerCase();
  if (lower.includes('mat') || lower.includes('geometri')) return 'Matematik';
  if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyo')) return 'Fen Bilimleri';
  if (lower.includes('türk') || lower.includes('turk') || lower.includes('paragraf') || lower.includes('edebiyat')) return 'Türkçe';
  if (lower.includes('sosyal') || lower.includes('inkılap') || lower.includes('inkilap') || lower.includes('tarih') || lower.includes('coğrafya')) return 'Sosyal Bilgiler';
  if (lower.includes('ing') || lower.includes('english')) return 'İngilizce';
  if (lower.includes('din')) return 'Din Kültürü';
  if (lower.includes('deneme') || lower.includes('lgs') || lower.includes('yks') || lower.includes('tyt') || lower.includes('ayt')) return 'Genel Testler';
  return '';
};

export default function StudentWrongAnswersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { questions: bankQuestions = [], deleteQuestion } = useQuestionBank();
  const { data: curData } = useCurriculum();
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const {
    getCoachingProfileForStudent,
    coachingProfiles = [],
    saveCoachingProfile,
    addStudentError,
    updateStudentError,
    deleteStudentError
  } = useCoaching();

  const SUBJECT_CONFIG = useMemo(() => getSubjectConfig(isDark), [isDark]);

  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);
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

  // Main Tabs: 'unreviewed' (⏳ Kontrol Edilmeyenler) vs 'reviewed' (✅ Kontrol Edilenler) vs 'error_notebook' (📸 Görsel Hata Defterim)
  const [activeMainTab, setActiveMainTab] = useState('remedial'); // 'remedial' | 'submissions' | 'leitner' | 'notebook' | 'analytics'
  const [reviewFilter, setReviewFilter] = useState('unreviewed'); // 'unreviewed' | 'reviewed'

  // Selected Subject Filter (null or subject name)
  const [selectedSubject, setSelectedSubject] = useState('Tümü');

  // Date & Metric Sort State: 'date_desc' | 'date_asc' | 'wrong_desc' | 'name_asc'
  const [sortBy, setSortBy] = useState('date_desc');
  const [isSlicerModalOpen, setIsSlicerModalOpen] = useState(false);
  const [programToast, setProgramToast] = useState(null);
  const [openDaySelectorId, setOpenDaySelectorId] = useState(null);

  const currentStudentId = selectedStudent?.id || currentUser?.id;

  const allStudentIds = useMemo(() => {
    const sId = currentStudentId;
    const sObj = selectedStudent || currentUser;
    const ids = new Set();
    if (sId) {
      ids.add(String(sId));
      if (toUUID(sId)) ids.add(String(toUUID(sId)));
    }
    if (sObj?.student_id) ids.add(String(sObj.student_id));
    if (sObj?.studentId) ids.add(String(sObj.studentId));
    if (sObj?.email) {
      (users || []).forEach(u => {
        if (u.email && u.email.toLowerCase() === sObj.email.toLowerCase()) {
          ids.add(String(u.id));
          if (u.student_id) ids.add(String(u.student_id));
          if (u.studentId) ids.add(String(u.studentId));
        }
      });
    }
    ids.delete('');
    ids.delete('undefined');
    ids.delete('null');
    return ids;
  }, [currentStudentId, selectedStudent, currentUser, users]);

  const studentGradeName = useMemo(() => {
    const sObj = selectedStudent || currentUser;
    if (!sObj) return '';
    if (sObj.grade) return String(sObj.grade);
    const gId = String(sObj.grade_id || sObj.gradeId || '');
    if (gId) {
      const gradesList = curData?.grades || [];
      const matched = gradesList.find(g => String(g.id) === gId || toUUID(g.id) === toUUID(gId));
      if (matched?.name) return String(matched.name);
    }
    return '';
  }, [selectedStudent, currentUser, curData?.grades]);

  const remedialTests = useMemo(() => {
    const rawAll = [...(bankQuestions || []), ...(homeworks || [])];
    const seenIds = new Set();
    const result = [];

    // 1. Check in bankQuestions and homeworks
    rawAll.forEach(item => {
      if (!item) return;
      const raw = item.raw_data || {};
      const q = { ...raw, ...item };

      // Must be explicitly created as a remedial / sliced test
      const isExplicitRemedial = q.isRemedialTest === true || q.isRemedial === true || q.isTeacherRemedial === true || q.sourceType === 'pdfSlicer' || q.sourceType === 'pdfSlicerRemedial' || q.type === 'remedial' || q.type === 'remedialTest';
      const titleLower = (q.title || q.name || '').toLowerCase();
      const isRemedialTitle = titleLower.includes('telafi') || titleLower.includes('kırpılmış');

      if (!isExplicitRemedial && !isRemedialTitle) {
        return;
      }

      // Check all possible student targets
      const testStudentId = String(q.studentId || q.student_id || q.targetStudentId || q.assignedStudentId || q.targetStudent || '');
      const rawTargetIds = [
        ...(Array.isArray(q.targetIds) ? q.targetIds : []),
        ...(Array.isArray(q.target_ids) ? q.target_ids : []),
        ...(Array.isArray(q.targetStudentIds) ? q.targetStudentIds : []),
        ...(Array.isArray(q.assignedTo) ? q.assignedTo : []),
        ...(Array.isArray(q.studentIds) ? q.studentIds : []),
        ...(testStudentId && testStudentId !== 'undefined' ? [testStudentId] : [])
      ].filter(Boolean).map(String);

      const isDirectTarget = rawTargetIds.some(tid => allStudentIds.has(tid) || (toUUID(tid) && allStudentIds.has(toUUID(tid))));

      const creatorId = String(q.createdBy || q.created_by || q.authorId || q.author || '');
      const isCreatedByThisStudent = creatorId && (allStudentIds.has(creatorId) || (toUUID(creatorId) && allStudentIds.has(toUUID(creatorId))));

      // Check if student has solved this test
      const hasSolvedSub = (submissions || []).some(s => {
        if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
        const sSid = String(s.studentId || s.student_id || s.userId || s.user_id || '');
        const isMatchSt = allStudentIds.has(sSid) || (toUUID(sSid) && allStudentIds.has(toUUID(sSid)));
        if (!isMatchSt) return false;
        const sTestId = String(s.testId || s.hwId || s.id || '');
        return sTestId === String(q.id) || (toUUID(q.id) && toUUID(sTestId) === toUUID(q.id));
      });

      if (!isDirectTarget && !isCreatedByThisStudent && !hasSolvedSub) {
        return;
      }

      const qIdStr = String(q.id || q.testId);
      if (!seenIds.has(qIdStr)) {
        seenIds.add(qIdStr);
        result.push(q);
      }
    });

    // 2. Also extract any remedial test from submissions that wasn't in bankQuestions or homeworks
    (submissions || []).forEach(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return;
      const sSid = String(s.studentId || s.student_id || s.userId || s.user_id || '');
      const isMatchSt = allStudentIds.has(sSid) || (toUUID(sSid) && allStudentIds.has(toUUID(sSid)));
      if (!isMatchSt) return false;

      const isRem = s.isRemedial === true || s.isRemedialTest === true || s.sourceType === 'pdfSlicerRemedial' || s.type === 'remedialTest' || String(s.testTitle || s.title || '').toLowerCase().includes('telafi');
      if (isRem) {
        const sTestId = String(s.testId || s.hwId || s.id || '');
        if (sTestId && !seenIds.has(sTestId) && (!toUUID(sTestId) || !seenIds.has(toUUID(sTestId)))) {
          seenIds.add(sTestId);
          result.push({
            id: sTestId,
            title: s.testTitle || s.title || 'Özel Telafi Testi',
            subject: s.subject || 'Genel',
            grade: s.grade || '',
            questionCount: s.totalQuestions || s.questionsList?.length || 1,
            totalQuestions: s.totalQuestions || s.questionsList?.length || 1,
            questionsList: s.questionsList || [],
            imageUrls: s.imageUrls || [],
            imageUrl: s.imageUrl || (s.imageUrls && s.imageUrls[0]) || '',
            contentPayload: s.contentPayload || '',
            isRemedial: true,
            isRemedialTest: true,
            isTeacherRemedial: true,
            teacherAssigned: true,
            createdByRole: 'teacher',
            assignedBy: 'teacher',
            sourceType: 'pdfSlicerRemedial',
            studentId: currentStudentId,
            assignedStudentId: currentStudentId,
            repetitionIntervals: s.repetitionIntervals || [1, 3, 7, 15],
            createdAt: s.createdAt || s.created_at || new Date().toISOString()
          });
        }
      }
    });

    return result;
  }, [bankQuestions, homeworks, submissions, allStudentIds, currentStudentId]);

  const handleAddTestToProgram = async (testItem, targetDayKey) => {
    const studentId = selectedStudent?.id || currentUser?.id;
    if (!studentId) return;

    const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
    const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(studentId)) || {
      studentId,
      weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
    };

    const rawProg = Array.isArray(currentProfile.weeklyProgram)
      ? currentProfile.weeklyProgram
      : DAYS_LIST.map(d => ({ day: d, items: [] }));

    const newItem = {
      id: `remedial_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      text: testItem.title || testItem.name || `${testItem.subject || 'Ders'} Telafi Testi`,
      title: testItem.title || testItem.name || `${testItem.subject || 'Ders'} Telafi Testi`,
      subject: testItem.subject || 'Genel',
      qCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      targetCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      questionCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      testId: testItem.id,
      realTestId: testItem.id,
      hwId: testItem.hwId || testItem.id,
      type: 'remedialTest',
      taskType: 'remedialTest',
      isTeacherRemedial: true,
      isRemedial: true,
      isRemedialTest: true,
      stage: 1,
      done: false,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedProg = rawProg.map(dObj => {
      if (dObj.day === targetDayKey) {
        return {
          ...dObj,
          items: [...(dObj.items || []), newItem]
        };
      }
      return dObj;
    });

    await saveCoachingProfile({
      ...currentProfile,
      studentId,
      weeklyProgram: updatedProg
    });

    setProgramToast(`✓ "${testItem.title || 'Test'}" ${targetDayKey} gününün çalışma programına eklendi!`);
    setTimeout(() => setProgramToast(null), 3500);
    setOpenDaySelectorId(null);
  };

  const handleAddSpacedRepetitionPlan = async (testItem) => {
    const studentId = selectedStudent?.id || currentUser?.id;
    if (!studentId) return;

    const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
    const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(studentId)) || {
      studentId,
      weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
    };

    const updatedProg = scheduleRemedialTestInProgram({
      currentWeeklyProgram: currentProfile.weeklyProgram || [],
      testItem: {
        id: testItem.id,
        hwId: testItem.hwId || testItem.id,
        title: testItem.title || testItem.name || 'Özel Telafi Testi',
        subject: testItem.subject || 'Genel',
        questionCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1
      },
      intervals: testItem.repetitionIntervals || [1, 3, 7, 15],
      studentId
    });

    await saveCoachingProfile({
      ...currentProfile,
      studentId,
      weeklyProgram: updatedProg
    });

    setProgramToast(`🎯 "${testItem.title || 'Test'}" için aralıklı tekrar planı (1, 3, 7, 15 Gün) programınıza eklendi!`);
    setTimeout(() => setProgramToast(null), 4000);
    setOpenDaySelectorId(null);
  };

  const handlePracticeTestMistakes = (testItem, subItem) => {
    const studentId = selectedStudent?.id || currentUser?.id;
    if (!testItem || !subItem) return;

    const resolvedQuestions = (testItem.questionsList && testItem.questionsList.length > 0)
      ? testItem.questionsList
      : resolveTestQuestions(testItem, bankQuestions || []);

    const answers = subItem.answers || subItem.formattedAnswers || [];

    const mistakeQuestions = [];
    resolvedQuestions.forEach((q, idx) => {
      const qNo = idx + 1;
      const ans = (Array.isArray(answers) ? answers.find(a => (
        Number(a.questionNo || a.questionNoInSection || a.number || a.qNo) === qNo ||
        String(a.questionId || a.id).includes(`_${qNo}`)
      )) : null) || answers[idx];

      const isRight = ans ? (ans.isCorrect === true || ans.evalStatus === 'correct') : false;
      if (!isRight) {
        mistakeQuestions.push({
          ...q,
          id: q.id ? `${testItem.id}_${q.id}` : `${testItem.id}_q${qNo}`,
          testId: testItem.id,
          questionNo: qNo,
          subject: testItem.subject || q.subject || 'Telafi',
          topic: testItem.topic || q.topic || '',
          unit: testItem.unit || q.unit || '',
          imageUrl: q.imageUrl || (Array.isArray(testItem.imageUrls) ? testItem.imageUrls[idx] : (testItem.imageUrl && idx === 0 ? testItem.imageUrl : null)),
          correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (typeof q.correctAnswerLetter === 'string' ? (q.correctAnswerLetter.toUpperCase().charCodeAt(0) - 65) : 0)
        });
      }
    });

    if (mistakeQuestions.length === 0) {
      alert('Bu testte tüm soruları doğru çözmüşsünüz! Tebrikler! 🎉');
      return;
    }

    setLeitnerPracticeQuestions(mistakeQuestions);
    setIsLeitnerModalOpen(true);
  };

  const handleDeleteRemedialTest = async (testId, testTitle, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`"${testTitle || 'Bu telafi testini'}" silmek istediğinize emin misiniz?`)) {
      try {
        await deleteQuestion(testId);
      } catch (err) {
        console.error('Test silinirken hata:', err);
      }
    }
  };

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

  // View Mode: 'cards' | 'table' (Varsayılan: table)
  const [viewMode, setViewMode] = useState('table');
  const [remedialViewMode, setRemedialViewMode] = useState('table'); // 'table' | 'cards' (Varsayılan: table)
  const [searchQuery, setSearchQuery] = useState('');
  const [wrongOnlyFilter, setWrongOnlyFilter] = useState(false);
  const [isLeitnerModalOpen, setIsLeitnerModalOpen] = useState(false);
  const [leitnerPracticeQuestions, setLeitnerPracticeQuestions] = useState([]);

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

  // Curriculum map with Unit and Topic extraction
  const allCurTestsMap = useMemo(() => {
    const map = new Map();
    if (!curData) return map;
    (curData.tests || []).forEach(t => {
      if (t.id) {
        const u = t.unitName || t.unit || '';
        const top = t.topicName || t.topic || '';
        const info = { 
          title: t.title || t.name, 
          subject: t.subjectName || t.subject, 
          unit: isSubjectName(u) ? '' : u, 
          topic: top 
        };
        map.set(String(t.id), info);
        const uuid = toUUID(t.id);
        if (uuid) map.set(String(uuid), info);
      }
    });
    (curData.grades || []).forEach(g => {
      (g.subjects || []).forEach(s => {
        (s.units || []).forEach(u => {
          (u.topics || []).forEach(top => {
            (top.tests || []).forEach(t => {
              if (t.id) {
                const uName = u.name || u.title || '';
                const topName = top.name || top.title || '';
                const info = { 
                  title: t.title || t.name, 
                  subject: s.name, 
                  unit: isSubjectName(uName) ? '' : uName, 
                  topic: topName 
                };
                map.set(String(t.id), info);
                const uuid = toUUID(t.id);
                if (uuid) map.set(String(uuid), info);
              }
            });
          });
        });
      });
    });
    return map;
  }, [curData]);

  // Tracked Books & BookTests map with thorough Unit and Topic extraction from book hierarchy
  const allBookTestsMap = useMemo(() => {
    const map = new Map();
    (books || []).forEach(b => {
      const bTests = (bookTests || []).filter(bt => 
        String(bt.bookId) === String(b.id) || 
        (toUUID(bt.bookId) && String(toUUID(bt.bookId)) === String(toUUID(b.id)))
      );

      bTests.forEach((bt, idx) => {
        let parentSubject = (b.subjects || []).find(s => 
          String(s.id) === String(bt.subjectId) || 
          (s.topics && s.topics.some(tp => String(tp.id) === String(bt.topicId) || (tp.tests && tp.tests.some(tId => String(tId) === String(bt.id) || (toUUID(tId) && toUUID(tId) === toUUID(bt.id)))))) ||
          (s.tests && s.tests.some(tId => String(tId) === String(bt.id) || (toUUID(tId) && toUUID(tId) === toUUID(bt.id))))
        );

        let parentTopic = parentSubject?.topics?.find(tp => 
          String(tp.id) === String(bt.topicId) || 
          (tp.tests && tp.tests.some(tId => String(tId) === String(bt.id) || (toUUID(tId) && toUUID(tId) === toUUID(bt.id))))
        );

        if (!parentTopic && Array.isArray(b.subjects)) {
          for (const s of b.subjects) {
            const tp = s.topics?.find(tp => String(tp.id) === String(bt.topicId) || (tp.tests && tp.tests.some(tId => String(tId) === String(bt.id) || (toUUID(tId) && toUUID(tId) === toUUID(bt.id)))));
            if (tp) {
              parentTopic = tp;
              if (!parentSubject) parentSubject = s;
              break;
            }
          }
        }

        let subName = b.subject || b.subjectName || '';
        if (!subName && parentSubject?.name && isSubjectName(parentSubject.name)) {
          subName = parentSubject.name;
        }
        if (!subName) {
          subName = checkSubjectName(b.title || '') || 'Matematik';
        }

        let unitName = bt.unit || bt.unitName || '';
        let topicName = bt.topic || bt.topicName || '';

        if (parentSubject?.name) {
          if (isSubjectName(parentSubject.name)) {
            if (!unitName && parentTopic?.name) {
              unitName = parentTopic.name;
            }
          } else {
            if (!unitName) {
              unitName = parentSubject.name;
            }
            if (!topicName && parentTopic?.name) {
              topicName = parentTopic.name;
            }
          }
        } else if (parentTopic?.name) {
          if (!unitName) unitName = parentTopic.name;
        }

        if (!unitName) {
          unitName = b.unit || b.unitName || '';
        }

        const info = {
          testName: bt.name || 'Test',
          bookTitle: b.title || 'Kitap',
          subject: subName,
          unit: isSubjectName(unitName) ? '' : unitName,
          topic: (topicName && topicName !== unitName && !isSubjectName(topicName)) ? topicName : '',
          bookId: b.id,
          testId: bt.id,
          orderIndex: Number(bt.order ?? bt.order_index ?? idx + 1)
        };

        map.set(String(bt.id), info);
        const uuid = toUUID(bt.id);
        if (uuid) map.set(String(uuid), info);
      });
    });
    return map;
  }, [books, bookTests]);

  // Submissions for activeStudent
  const allSubmissions = useMemo(() => {
    if (!activeStudent?.id) return [];
    const studentIdStr = String(activeStudent.id).trim();
    const studentUuidStr = String(toUUID(studentIdStr) || '').trim();

    const isMatchStudent = (sid) => {
      if (!sid) return false;
      const str = String(sid).trim();
      if (str === studentIdStr || str.toLowerCase() === studentIdStr.toLowerCase()) return true;
      if (studentUuidStr && (str === studentUuidStr || String(toUUID(str)) === studentUuidStr)) return true;
      return false;
    };

    const baseSubs = (submissions || []).filter(s => {
      if (!s) return false;
      const sid = s.studentId || s.student_id || s.userId || s.user_id || (s.raw_data && (s.raw_data.studentId || s.raw_data.student_id));
      if (!isMatchStudent(sid)) return false;

      const subIdStr = String(s.id || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;
      if (s.isSubmitted === false) return false;
      if (s.raw_data && (s.raw_data.status === 'draft' || s.raw_data.status === 'in_progress')) return false;

      const c = s.correctCount ?? s.correct ?? 0;
      const w = s.wrongCount ?? s.wrong ?? 0;
      const e = s.emptyCount ?? s.blankCount ?? s.empty ?? 0;
      if (c === 0 && w === 0 && e === 0 && (!s.answers || s.answers.length === 0)) return false;

      const bTestId = String(s.bookTestId || s.testId || '');
      const matchedBookTest = allBookTestsMap.get(bTestId);
      const matchedCurTest = allCurTestsMap.get(String(s.testId));
      const parentHw = (homeworks || []).find(h =>
        String(h.id) === String(s.hwId) ||
        String(h.id) === String(s.testId) ||
        String(h.id) === String(s.id) ||
        (toUUID(h.id) && String(toUUID(h.id)) === String(toUUID(s.hwId || s.testId || s.id)))
      );

      const isHwSub = Boolean(s.hwId || s.isHomework || (s.testId && !matchedBookTest && !matchedCurTest));
      if (isHwSub && !parentHw) {
        return false;
      }

      if (s.bookTestId && !matchedBookTest) {
        return false;
      }

      return true;
    });

    const hwSubs = [];
    (homeworks || []).forEach(hw => {
      if (!hw) return;
      (hw.submissions || []).forEach(sub => {
        const sid = sub.studentId || sub.student_id || sub.userId || sub.user_id;
        if (isMatchStudent(sid)) {
          const subIdStr = String(sub.id || '');
          if (subIdStr.startsWith('draft_') || sub.status === 'in_progress' || sub.status === 'draft') return;
          if (sub.isSubmitted === false) return;

          const alreadyExists = baseSubs.some(s =>
            String(s.hwId || s.testId || s.id) === String(hw.id) ||
            (toUUID(s.hwId || s.testId || s.id) && String(toUUID(s.hwId || s.testId || s.id)) === String(toUUID(hw.id)))
          );

          if (!alreadyExists) {
            hwSubs.push({
              id: `hw_sub_${hw.id}_${studentIdStr}`,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              subject: hw.subject,
              unit: hw.unit || hw.unitName || '',
              topic: hw.topic || hw.topicName || '',
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
  }, [submissions, homeworks, activeStudent, allBookTestsMap, allCurTestsMap]);

  // Grouped Submissions with robust Subject, Unit and Topic Resolution
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

      const matchedBookTest = allBookTestsMap.get(String(sub.testId)) || 
                              allBookTestsMap.get(String(sub.bookTestId)) ||
                              allBookTestsMap.get(String(sub.hwId)) ||
                              (sub.metadata?.realTestId ? allBookTestsMap.get(String(sub.metadata.realTestId)) : null);

      const matchedHw = (homeworks || []).find(h =>
        String(h.id) === String(sub.hwId) ||
        String(h.id) === String(sub.testId) ||
        String(h.id) === String(sub.id) ||
        (toUUID(h.id) && String(toUUID(h.id)) === String(toUUID(sub.hwId || sub.testId || sub.id)))
      );

      const matchedCurTest = allCurTestsMap.get(String(sub.testId)) || allCurTestsMap.get(String(sub.hwId));

      let resolvedTitle = sub.testTitle || sub.title;
      const isGeneric = !resolvedTitle ||
        resolvedTitle.trim().toLowerCase() === 'test sınavı' ||
        resolvedTitle.trim().toLowerCase() === 'test sinavi' ||
        resolvedTitle.trim().toLowerCase() === 'test';

      if (matchedBookTest) {
        const cleanBook = (matchedBookTest.bookTitle || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();
        resolvedTitle = cleanBook ? `${cleanBook} — ${matchedBookTest.testName}` : matchedBookTest.testName;
      } else if (matchedHw?.title) {
        resolvedTitle = matchedHw.title;
      } else if (matchedCurTest?.title) {
        resolvedTitle = matchedCurTest.title;
      } else if (isGeneric) {
        if (matchedHw?.subject) resolvedTitle = `${matchedHw.subject} Ödevi`;
        else resolvedTitle = 'Sınav Testi';
      }

      let subject = '';

      if (matchedBookTest?.subject) {
        subject = matchedBookTest.subject;
      } else if (matchedHw?.subject) {
        subject = matchedHw.subject;
      } else if (matchedCurTest?.subject) {
        subject = matchedCurTest.subject;
      } else if (sub.subject && sub.subject !== 'Genel') {
        subject = sub.subject;
      }

      const directMatched = checkSubjectName(subject);
      if (directMatched) {
        subject = directMatched;
      } else {
        const titleMatched = checkSubjectName(resolvedTitle + ' ' + (matchedHw?.title || '') + ' ' + (sub.topic || ''));
        subject = titleMatched || (SUBJECT_CONFIG[subject] ? subject : 'Matematik');
      }

      let unit = sub.unit || sub.unitName || matchedBookTest?.unit || matchedHw?.unit || matchedHw?.unitName || matchedCurTest?.unit || '';
      let topic = sub.topic || sub.topicName || matchedBookTest?.topic || matchedHw?.topic || matchedHw?.topicName || matchedCurTest?.topic || '';

      if (unit && (isSubjectName(unit) || unit.toLowerCase().trim() === subject.toLowerCase().trim())) {
        if (topic) {
          unit = topic;
          topic = '';
        } else {
          unit = '';
        }
      }

      if (topic && (topic.toLowerCase().includes('ünite') || topic.toLowerCase().includes('unite') || !unit)) {
        if (!unit || topic.toLowerCase().includes('ünite') || topic.toLowerCase().includes('unite')) {
          unit = topic;
          topic = '';
        }
      }

      if (!unit && Array.isArray(sub.answers) && sub.answers.length > 0) {
        for (const ans of sub.answers) {
          const uCandidate = ans.unit || ans.unitName;
          if (uCandidate && !isSubjectName(uCandidate)) {
            unit = uCandidate;
            break;
          }
          if (ans.questionId && bankQuestions && bankQuestions.length > 0) {
            const bq = bankQuestions.find(q => String(q.id) === String(ans.questionId) || (toUUID(q.id) && String(toUUID(q.id)) === String(ans.questionId)));
            const bqCandidate = bq?.unit || bq?.unitName;
            if (bqCandidate && !isSubjectName(bqCandidate)) {
              unit = bqCandidate;
              break;
            }
          }
        }
      }

      if (!topic && Array.isArray(sub.answers) && sub.answers.length > 0) {
        for (const ans of sub.answers) {
          const tCandidate = ans.topic || ans.topicName;
          if (tCandidate && tCandidate !== unit && !isSubjectName(tCandidate)) {
            topic = tCandidate;
            break;
          }
          if (ans.questionId && bankQuestions && bankQuestions.length > 0) {
            const bq = bankQuestions.find(q => String(q.id) === String(ans.questionId) || (toUUID(q.id) && String(toUUID(q.id)) === String(ans.questionId)));
            const bqTopic = bq?.topic || bq?.topicName;
            if (bqTopic && bqTopic !== unit && !isSubjectName(bqTopic)) {
              topic = bqTopic;
              break;
            }
          }
        }
      }

      if (topic && (topic.toLowerCase().trim() === unit.toLowerCase().trim() || isSubjectName(topic))) {
        topic = '';
      }

      const isReviewed = reviewedSubSet.has(sub.id);
      const dateStr = sub.submittedAt || sub.createdAt || sub.created_at || new Date().toISOString();
      const totQ = sub.totalQuestions || rawAnswers.length || (wrongQuestions.length + blankQuestions.length + correctCount) || 10;

      return {
        ...sub,
        testTitle: resolvedTitle,
        subject,
        unit,
        topic,
        orderIndex: matchedBookTest?.orderIndex ?? matchedCurTest?.orderIndex ?? (parseInt((resolvedTitle || '').replace(/\D/g, ''), 10) || 9999),
        submittedAt: dateStr,
        wrongQuestions,
        blankQuestions,
        correctCount: correctCount || Math.max(0, totQ - wrongQuestions.length - blankQuestions.length),
        totalQuestions: totQ,
        isReviewed,
        hasErrors: wrongQuestions.length > 0 || blankQuestions.length > 0
      };
    });

    return parsedSubs;
  }, [allSubmissions, homeworks, allCurTestsMap, allBookTestsMap, bankQuestions, reviewedSubSet, SUBJECT_CONFIG]);

  // Split Submissions into Unreviewed vs Reviewed
  const unreviewedSubmissions = useMemo(() => {
    return testGroupedSubmissions.filter(s => !s.isReviewed);
  }, [testGroupedSubmissions]);

  const reviewedSubmissions = useMemo(() => {
    return testGroupedSubmissions.filter(s => s.isReviewed);
  }, [testGroupedSubmissions]);

  // Current active list depending on selected review sub-tab
  const currentTabBaseList = useMemo(() => {
    if (reviewFilter === 'reviewed') return reviewedSubmissions;
    return unreviewedSubmissions;
  }, [reviewFilter, unreviewedSubmissions, reviewedSubmissions]);

  // Filtered & Sorted Test Submissions for the active tab
  const filteredTestSubmissions = useMemo(() => {
    const list = currentTabBaseList.filter(sub => {
      const textMatch =
        !searchQuery.trim() ||
        (sub.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.unit || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.topic || '').toLowerCase().includes(searchQuery.toLowerCase());

      const subjectMatch = !selectedSubject || selectedSubject === 'Tümü' || sub.subject === selectedSubject;
      const wrongMatch = !wrongOnlyFilter || sub.wrongQuestions.length > 0;

      return textMatch && subjectMatch && wrongMatch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'book_order') {
        const orderA = a.orderIndex ?? (parseInt((a.testTitle || '').replace(/\D/g, ''), 10) || 9999);
        const orderB = b.orderIndex ?? (parseInt((b.testTitle || '').replace(/\D/g, ''), 10) || 9999);
        if (orderA !== orderB) return orderA - orderB;
        return (a.testTitle || '').localeCompare(b.testTitle || '', 'tr', { numeric: true });
      }
      if (sortBy === 'date_asc') {
        return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
      }
      if (sortBy === 'wrong_desc') {
        return b.wrongQuestions.length - a.wrongQuestions.length;
      }
      if (sortBy === 'name_asc') {
        return (a.testTitle || '').localeCompare(b.testTitle || '', 'tr');
      }
      return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
    });
  }, [currentTabBaseList, selectedSubject, searchQuery, wrongOnlyFilter, sortBy]);

  // Pagination for Test Submissions
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 20, 50, 'all'

  // Pagination for Görsel Hata Defterim
  const [notebookPage, setNotebookPage] = useState(1);
  const [notebookPageSize, setNotebookPageSize] = useState(12);

  // Reset page when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSubject, wrongOnlyFilter, sortBy, activeMainTab, reviewFilter, pageSize]);

  useEffect(() => {
    setNotebookPage(1);
  }, [notebookStatusFilter, notebookSearchQuery, selectedSubject, notebookPageSize]);

  const totalSubmissionsCount = filteredTestSubmissions.length;
  const totalSubmissionsPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalSubmissionsCount / (Number(pageSize) || 10)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalSubmissionsPages);

  const paginatedSubmissions = useMemo(() => {
    if (pageSize === 'all') return filteredTestSubmissions;
    const numSize = Number(pageSize) || 10;
    const startIdx = (safeCurrentPage - 1) * numSize;
    return filteredTestSubmissions.slice(startIdx, startIdx + numSize);
  }, [filteredTestSubmissions, safeCurrentPage, pageSize]);

  // Global and Tab-Specific Counts
  const totalWrongQuestionsCount = useMemo(() => testGroupedSubmissions.reduce((acc, sub) => acc + sub.wrongQuestions.length, 0), [testGroupedSubmissions]);
  const totalBlankQuestionsCount = useMemo(() => testGroupedSubmissions.reduce((acc, sub) => acc + sub.blankQuestions.length, 0), [testGroupedSubmissions]);
  const currentWrongCount = useMemo(() => currentTabBaseList.reduce((acc, sub) => acc + sub.wrongQuestions.length, 0), [currentTabBaseList]);
  const currentBlankCount = useMemo(() => currentTabBaseList.reduce((acc, sub) => acc + sub.blankQuestions.length, 0), [currentTabBaseList]);

  // Spaced Repetition (Leitner) Flat Questions & Overview (STRICTLY ONLY Soru Bankası & Telafi Testleri)
  const allFlatWrongQuestions = useMemo(() => {
    const list = [];

    // Create quick lookup maps for remedial and question bank tests
    const remedialMap = new Map();
    (remedialTests || []).forEach(rt => {
      if (rt?.id) {
        remedialMap.set(String(rt.id), rt);
        if (toUUID(rt.id)) remedialMap.set(String(toUUID(rt.id)), rt);
      }
    });

    const bankMap = new Map();
    (bankQuestions || []).forEach(bq => {
      if (bq?.id) {
        bankMap.set(String(bq.id), bq);
        if (toUUID(bq.id)) bankMap.set(String(toUUID(bq.id)), bq);
      }
    });

    testGroupedSubmissions.forEach(sub => {
      const subIdStr = String(sub.testId || sub.hwId || sub.id || '');
      const subTitle = String(sub.testTitle || sub.title || '');

      // 1. Check if it's a Remedial Test
      const matchedRemedial = remedialMap.get(subIdStr) || (sub.metadata?.realTestId ? remedialMap.get(String(sub.metadata.realTestId)) : null);
      const isRemedial = Boolean(
        matchedRemedial ||
        sub.isRemedialTest === true ||
        sub.sourceType === 'pdfSlicer' ||
        sub.type === 'remedial' ||
        subTitle.includes('Telafi') ||
        subTitle.includes('Kırpılmış')
      );

      // 2. Check if it's a Question Bank Test
      const matchedBank = bankMap.get(subIdStr) || (sub.metadata?.realTestId ? bankMap.get(String(sub.metadata.realTestId)) : null);
      const isQuestionBank = Boolean(
        matchedBank ||
        sub.sourceType === 'questionBank' ||
        sub.sourceType === 'bank' ||
        sub.type === 'soru_bankasi' ||
        sub.testType === 'bank'
      ) && (
        !sub.isManual &&
        sub.sourceType !== 'trackedBook' &&
        sub.sourceType !== 'bookTest' &&
        sub.sourceType !== 'optik' &&
        sub.sourceType !== 'book' &&
        !subTitle.includes('(Tüm Kitap Görevi)') &&
        !subTitle.includes('(Tüm Kitap)')
      );

      // EXCLUDE all other types (paper books, optical forms, manual forms, curriculum tests without digital content)
      if (!isRemedial && !isQuestionBank) {
        return;
      }

      // Resolve questions list if available
      const testSourceObj = matchedRemedial || matchedBank || null;
      let resolvedQuestions = [];
      if (testSourceObj) {
        resolvedQuestions = (testSourceObj.questionsList && testSourceObj.questionsList.length > 0)
          ? testSourceObj.questionsList
          : resolveTestQuestions(testSourceObj, bankQuestions || []);
      }

      (sub.wrongQuestions || []).forEach(wq => {
        const qIdx = (typeof wq.qNum === 'number' ? wq.qNum - 1 : 0);
        const resolvedQ = resolvedQuestions[qIdx] || {};

        // Resolve best image URL
        const qImage = resolvedQ.imageUrl ||
                       wq.imageUrl ||
                       (Array.isArray(testSourceObj?.imageUrls) ? testSourceObj.imageUrls[qIdx] : null) ||
                       (testSourceObj?.imageUrl && qIdx === 0 ? testSourceObj.imageUrl : null) ||
                       null;

        const qText = resolvedQ.questionText ||
                      resolvedQ.text ||
                      resolvedQ.title ||
                      wq.questionText ||
                      `${subTitle} — Soru ${wq.qNum}`;

        const qOptions = resolvedQ.options || wq.options || ['A', 'B', 'C', 'D', 'E'];
        const qCorrect = resolvedQ.correctAnswer !== undefined
          ? resolvedQ.correctAnswer
          : (typeof resolvedQ.correctAnswerLetter === 'string'
              ? (resolvedQ.correctAnswerLetter.toUpperCase().charCodeAt(0) - 65)
              : (wq.correctAnswer ?? 0));

        list.push({
          id: `${sub.id}_${wq.qNum}`,
          testId: sub.id,
          testTitle: sub.testTitle || subTitle,
          subject: sub.subject || resolvedQ.subject || 'Ders',
          questionNo: wq.qNum,
          questionText: qText,
          options: qOptions,
          optionCount: resolvedQ.optionCount || (qOptions ? qOptions.length : 5),
          correctAnswer: qCorrect,
          correctAnswerLetter: resolvedQ.correctAnswerLetter || String.fromCharCode(65 + qCorrect),
          imageUrl: qImage,
          isRemedialTest: isRemedial,
          isQuestionBank: isQuestionBank
        });
      });
    });

    return list;
  }, [testGroupedSubmissions, remedialTests, bankQuestions]);

  const leitnerOverview = useMemo(() => {
    const sId = selectedStudent?.id || currentUser?.id || 'default_student';
    return getLeitnerOverview(sId, allFlatWrongQuestions);
  }, [selectedStudent, currentUser, allFlatWrongQuestions]);

  // Available Homework options for Add Modal
  const availableHomeworkOptions = useMemo(() => {
    if (!selectedStudent) return [];
    const map = new Map();

    testGroupedSubmissions.forEach(sub => {
      map.set(sub.id, {
        id: sub.id,
        title: sub.testTitle || 'Sınav / Ödev',
        subject: sub.subject || 'Matematik',
        unit: sub.unit || '',
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
            unit: hw.unit || hw.unitName || '',
            topic: hw.topic || hw.topicName || '',
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
    let initialTopic = defaultSub?.topic || (defaultSub?.unit ? `Ünite: ${defaultSub.unit}` : '');

    if (!defaultSub && availableHomeworkOptions.length > 0) {
      const topOpt = availableHomeworkOptions[0];
      initialHwId = topOpt.id;
      initialTitle = topOpt.title;
      initialSubject = topOpt.subject || 'Matematik';
      initialTopic = topOpt.topic || (topOpt.unit ? `Ünite: ${topOpt.unit}` : '');
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImageToWebP(file, 1400, 0.82);
        setNewErrorForm(prev => ({ ...prev, imageUrl: compressed.dataUrl }));
      } catch (err) {
        console.warn('Image compression fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewErrorForm(prev => ({ ...prev, imageUrl: reader.result }));
        };
        reader.readAsDataURL(file);
      }
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
    const list = studentErrors.filter(err => {
      const matchSubject = selectedSubject === 'Tümü' || err.subject === selectedSubject;
      const matchStatus = notebookStatusFilter === 'all' || err.status === notebookStatusFilter;
      const matchQuery = !notebookSearchQuery.trim() ||
        (err.testTitle || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.topic || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.note || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.reason || '').toLowerCase().includes(notebookSearchQuery.toLowerCase());

      return matchSubject && matchStatus && matchQuery;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [studentErrors, selectedSubject, notebookStatusFilter, notebookSearchQuery, sortBy]);

  const [showClassifiedQuestions, setShowClassifiedQuestions] = useState(false);

  const overallMistakeStats = useMemo(() => {
    const studentIdStr = String(selectedStudent?.id || currentUser?.id || '');
    const studentUuidStr = String(toUUID(studentIdStr) || '');

    const reasonDefs = {
      '⚡ İşlem Hatası': { key: '⚡ İşlem Hatası', color: '#d97706', bg: isDark ? 'rgba(217,119,6,0.15)' : '#fffbeb', border: isDark ? 'rgba(217,119,6,0.35)' : '#fde68a', count: 0 },
      '⚠️ Dikkat Kaybı': { key: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: isDark ? 'rgba(225,29,72,0.15)' : '#fff1f2', border: isDark ? 'rgba(225,29,72,0.35)' : '#fecdd3', count: 0 },
      '📖 Formül / Bilgi': { key: '📖 Formül / Bilgi', color: '#0284c7', bg: isDark ? 'rgba(2,132,199,0.15)' : '#f0f9ff', border: isDark ? 'rgba(2,132,199,0.35)' : '#bae6fd', count: 0 },
      '🧠 Konu Eksiği': { key: '🧠 Konu Eksiği', color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.15)' : '#faf5ff', border: isDark ? 'rgba(124,58,237,0.35)' : '#e9d5ff', count: 0 },
      '⏱️ Zaman Yetmedi': { key: '⏱️ Zaman Yetmedi', color: '#db2777', bg: isDark ? 'rgba(219,39,119,0.15)' : '#fdf2f8', border: isDark ? 'rgba(219,39,119,0.35)' : '#fbcfe8', count: 0 }
    };

    const questionsList = [];
    const countedKeys = new Set();

    // 1. Scan LocalStorage for all mistake reason keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || (!k.startsWith('mistake_reasons_') && !k.startsWith('book_mistake_reasons_') && !k.startsWith('eval_mistake_'))) continue;
        const valStr = localStorage.getItem(k);
        if (!valStr) continue;
        try {
          const parsed = JSON.parse(valStr);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([subKey, reason]) => {
              if (!reason || typeof reason !== 'string') return;
              const dedupeKey = `${k}_${subKey}`;
              if (countedKeys.has(dedupeKey)) return;
              countedKeys.add(dedupeKey);

              const matchedKey = Object.keys(reasonDefs).find(rk =>
                reason.includes(rk) || rk.includes(reason) ||
                (reason.includes('İşlem') && rk.includes('İşlem')) ||
                (reason.includes('Dikkat') && rk.includes('Dikkat')) ||
                (reason.includes('Formül') && rk.includes('Formül')) ||
                (reason.includes('Konu') && rk.includes('Konu')) ||
                (reason.includes('Zaman') && rk.includes('Zaman'))
              );
              if (matchedKey) {
                reasonDefs[matchedKey].count++;
                questionsList.push({
                  id: dedupeKey,
                  testTitle: 'Test / Deneme',
                  subject: subKey.includes('_') ? subKey.split('_')[0] : 'Soru',
                  qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
                  reason: matchedKey,
                  def: reasonDefs[matchedKey]
                });
              }
            });
          }
        } catch {}
      }
    } catch {}

    // 2. Scan allSubmissions in EvaluationContext
    (allSubmissions || []).forEach(sub => {
      const isMatch = String(sub.studentId) === studentIdStr || (studentUuidStr && String(sub.studentId) === studentUuidStr);
      if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;
      if (!sub.mistakeReasons || typeof sub.mistakeReasons !== 'object') return;

      Object.entries(sub.mistakeReasons).forEach(([subKey, reason]) => {
        if (!reason || typeof reason !== 'string') return;
        const dedupeKey = `sub_${sub.id || sub.testId}_${subKey}`;
        if (countedKeys.has(dedupeKey)) return;
        countedKeys.add(dedupeKey);

        const matchedKey = Object.keys(reasonDefs).find(rk =>
          reason.includes(rk) || rk.includes(reason) ||
          (reason.includes('İşlem') && rk.includes('İşlem')) ||
          (reason.includes('Dikkat') && rk.includes('Dikkat')) ||
          (reason.includes('Formül') && rk.includes('Formül')) ||
          (reason.includes('Konu') && rk.includes('Konu')) ||
          (reason.includes('Zaman') && rk.includes('Zaman'))
        );
        if (matchedKey) {
          reasonDefs[matchedKey].count++;
          questionsList.push({
            id: dedupeKey,
            testTitle: sub.testTitle || sub.title || 'Sınav / Kitap',
            subject: sub.subject || (subKey.includes('_') ? subKey.split('_')[0] : 'Soru'),
            qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
            reason: matchedKey,
            def: reasonDefs[matchedKey]
          });
        }
      });
    });

    // 2.5. Scan homeworks in HomeworkContext
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(hs => {
        const isMatch = String(hs.studentId) === studentIdStr || (studentUuidStr && String(hs.studentId) === studentUuidStr);
        if (!isMatch) return;
        if (!hs.mistakeReasons || typeof hs.mistakeReasons !== 'object') return;

        Object.entries(hs.mistakeReasons).forEach(([subKey, reason]) => {
          if (!reason || typeof reason !== 'string') return;
          const dedupeKey = `hw_${hw.id}_${subKey}`;
          if (countedKeys.has(dedupeKey)) return;
          countedKeys.add(dedupeKey);

          const matchedKey = Object.keys(reasonDefs).find(rk =>
            reason.includes(rk) || rk.includes(reason) ||
            (reason.includes('İşlem') && rk.includes('İşlem')) ||
            (reason.includes('Dikkat') && rk.includes('Dikkat')) ||
            (reason.includes('Formül') && rk.includes('Formül')) ||
            (reason.includes('Konu') && rk.includes('Konu')) ||
            (reason.includes('Zaman') && rk.includes('Zaman'))
          );
          if (matchedKey) {
            reasonDefs[matchedKey].count++;
            questionsList.push({
              id: dedupeKey,
              testTitle: hw.title || 'Ödev / Test',
              subject: subKey.includes('_') ? subKey.split('_')[0] : (hw.subject || 'Soru'),
              qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
              reason: matchedKey,
              def: reasonDefs[matchedKey]
            });
          }
        });
      });
    });

    // 3. Scan studentErrors (Görsel Hata Defteri)
    (studentErrors || []).forEach(err => {
      if (!err.reason) return;
      const dedupeKey = `err_${err.id}`;
      if (countedKeys.has(dedupeKey)) return;
      countedKeys.add(dedupeKey);

      const matchedKey = Object.keys(reasonDefs).find(rk =>
        err.reason.includes(rk) || rk.includes(err.reason) ||
        (err.reason.includes('İşlem') && rk.includes('İşlem')) ||
        (err.reason.includes('Dikkat') && rk.includes('Dikkat')) ||
        (err.reason.includes('Formül') && rk.includes('Formül')) ||
        (err.reason.includes('Konu') && rk.includes('Konu')) ||
        (err.reason.includes('Zaman') && rk.includes('Zaman'))
      );
      if (matchedKey) {
        reasonDefs[matchedKey].count++;
        questionsList.push({
          id: dedupeKey,
          testTitle: err.testTitle || 'Hata Defteri',
          subject: err.subject || 'Soru',
          qNo: err.questionNo || '—',
          reason: matchedKey,
          def: reasonDefs[matchedKey]
        });
      }
    });

    const totalWrongAndBlank = currentWrongCount + currentBlankCount;
    const totalClassified = Object.values(reasonDefs).reduce((acc, r) => acc + r.count, 0);
    const unclassifiedCount = Math.max(0, totalWrongAndBlank - totalClassified);

    const sortedReasons = Object.values(reasonDefs).sort((a, b) => b.count - a.count);
    const topReason = sortedReasons[0]?.count > 0 ? sortedReasons[0] : null;

    return {
      reasonDefs,
      totalWrongAndBlank,
      totalClassified,
      unclassifiedCount,
      topReason,
      sortedReasons,
      questionsList
    };
  }, [allSubmissions, studentErrors, currentWrongCount, currentBlankCount, selectedStudent, currentUser, isDark]);

  const mistakeChartData = useMemo(() => {
    if (!overallMistakeStats?.reasonDefs) return [];
    return Object.values(overallMistakeStats.reasonDefs).map(r => ({
      name: r.key,
      shortName: r.key.replace(/^[^\w\s\u00C0-\u017F]*\s*/, ''),
      count: r.count,
      percentage: overallMistakeStats.totalClassified > 0 ? Math.round((r.count / overallMistakeStats.totalClassified) * 100) : 0,
      color: r.color,
      bg: r.bg,
      border: r.border
    }));
  }, [overallMistakeStats]);

  const totalNotebookCount = filteredStudentErrors.length;
  const totalNotebookPages = notebookPageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalNotebookCount / (Number(notebookPageSize) || 12)));
  const safeNotebookPage = Math.min(Math.max(1, notebookPage), totalNotebookPages);

  const paginatedNotebookErrors = useMemo(() => {
    if (notebookPageSize === 'all') return filteredStudentErrors;
    const numSize = Number(notebookPageSize) || 12;
    const startIdx = (safeNotebookPage - 1) * numSize;
    return filteredStudentErrors.slice(startIdx, startIdx + numSize);
  }, [filteredStudentErrors, safeNotebookPage, notebookPageSize]);

  // Reusable Pagination Renderer
  const renderPagination = (current, total, totalCount, size, setSize, setPage, label = 'test') => {
    if (totalCount === 0) return null;
    const numSize = size === 'all' ? totalCount : Number(size);
    const startIdx = size === 'all' ? 1 : (current - 1) * numSize + 1;
    const endIdx = size === 'all' ? totalCount : Math.min(current * numSize, totalCount);

    const getPageNumbers = () => {
      if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
      }
      if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
      }
      return [1, '...', current - 1, current, current + 1, '...', total];
    };

    const pages = getPageNumbers();

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        padding: '0.85rem 1.1rem',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '14px',
        marginTop: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Sol: Özet Bilgi */}
        <div style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span>Toplam <strong style={{ color: 'var(--color-text)', fontWeight: 900 }}>{totalCount}</strong> {label}ten</span>
          <span style={{
            background: isDark ? 'rgba(99,102,241,0.2)' : '#ede9fe',
            color: '#6366f1',
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 900,
            fontSize: '0.76rem'
          }}>
            {startIdx} - {endIdx}
          </span>
          <span>arası listeleniyor</span>
        </div>

        {/* Sağ: Sayfa Başına Sayı ve Sayfa Geçiş Butonları */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Sayfa Başına:</span>
            <select
              value={size}
              onChange={e => setSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: 8,
                border: '1.5px solid var(--color-border-input)',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value={10}>10 {label}</option>
              <option value={20}>20 {label}</option>
              <option value={50}>50 {label}</option>
              <option value="all">Tümü ({totalCount})</option>
            </select>
          </div>

          {total > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={current === 1}
                title="İlk Sayfa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: current === 1 ? 'transparent' : 'var(--color-surface-hover)',
                  color: current === 1 ? 'var(--color-text-muted)' : 'var(--color-text)',
                  cursor: current === 1 ? 'not-allowed' : 'pointer',
                  opacity: current === 1 ? 0.45 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}
              >
                <ChevronsLeft size={15} />
              </button>

              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={current === 1}
                title="Önceki Sayfa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: current === 1 ? 'transparent' : 'var(--color-surface-hover)',
                  color: current === 1 ? 'var(--color-text-muted)' : 'var(--color-text)',
                  cursor: current === 1 ? 'not-allowed' : 'pointer',
                  opacity: current === 1 ? 0.45 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}
              >
                <ChevronLeft size={15} />
              </button>

              {pages.map((p, pIdx) => {
                if (p === '...') {
                  return (
                    <span
                      key={`dot_${pIdx}`}
                      style={{
                        padding: '0 4px',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 800
                      }}
                    >
                      …
                    </span>
                  );
                }

                const isCurrent = p === current;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
                      minWidth: 32,
                      height: 32,
                      padding: '0 6px',
                      borderRadius: 8,
                      border: isCurrent ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                      background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-hover)',
                      color: isCurrent ? '#ffffff' : 'var(--color-text)',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: isCurrent ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPage(p => Math.min(total, p + 1))}
                disabled={current === total}
                title="Sonraki Sayfa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: current === total ? 'transparent' : 'var(--color-surface-hover)',
                  color: current === total ? 'var(--color-text-muted)' : 'var(--color-text)',
                  cursor: current === total ? 'not-allowed' : 'pointer',
                  opacity: current === total ? 0.45 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}
              >
                <ChevronRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => setPage(total)}
                disabled={current === total}
                title="Son Sayfa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: current === total ? 'transparent' : 'var(--color-surface-hover)',
                  color: current === total ? 'var(--color-text-muted)' : 'var(--color-text)',
                  cursor: current === total ? 'not-allowed' : 'pointer',
                  opacity: current === total ? 0.45 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      padding: '1.25rem 1.25rem',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text)',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .wa-section-card {
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          border-radius: 18px;
          padding: 1.25rem 1.4rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }
        .wa-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .wa-card:hover { transform: translateY(-2px); border-color: #6366f1 !important; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12) !important; }
        .wa-pill { transition: all 0.15s ease; }
        .wa-pill:hover { transform: translateY(-1px); }
        .wa-scroll-x::-webkit-scrollbar { height: 5px; }
        .wa-scroll-x::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 99px; }
        .th-sort { cursor: pointer; user-select: none; transition: background 0.15s; }
        .th-sort:hover { background: var(--color-surface-hover) !important; color: var(--color-text) !important; }
        .wa-table-row { transition: background 0.15s ease; }
        .wa-table-row:hover { background: var(--color-surface-hover) !important; }
        .wa-q-badge { transition: all 0.12s ease; }
        .wa-q-badge:hover { transform: scale(1.08); filter: brightness(0.95); }

        .wa-mistake-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 1024px) {
          .wa-mistake-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 640px) {
          .wa-mistake-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .wa-mistake-card:last-child {
            grid-column: span 2;
          }
        }

        @media (max-width: 640px) {
          .wa-top-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.65rem !important;
            margin-bottom: 0.75rem !important;
          }
          .wa-header-left {
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
          }
          .wa-title-sub {
            display: none !important;
          }
          .wa-header-title {
            font-size: 1.15rem !important;
          }
          .wa-tab-bar {
            width: 100% !important;
            display: flex !important;
            gap: 4px !important;
            padding: 3px !important;
            overflow-x: auto !important;
          }
          .wa-tab-btn {
            padding: 0.45rem 0.65rem !important;
            font-size: 0.74rem !important;
            white-space: nowrap !important;
          }
          .wa-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ════════════════════════════════════════════
            1. ÜST BAŞLIK & HIZLI AKSİYON
        ════════════════════════════════════════════ */}
        <div className="wa-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="wa-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '12px',
                padding: '0.55rem 0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: 'var(--color-text)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <ArrowLeft size={16} /> Öğrenci Paneli
            </button>
            <div>
              <h1 className="wa-header-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '-0.02em' }}>
                <AlertCircle color="#ef4444" size={22} /> Yanlışlarım & Telafi Merkezi
              </h1>
              <p className="wa-title-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Yanlış veya boş bıraktığınız soruları inceleyin, telafi testlerinizi çözün ve eksiklerinizi tamamlayın.
              </p>
            </div>
          </div>

          {/* SAĞ ÜST AKSİYON BUTONLARI */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeMainTab === 'notebook' ? (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                  transition: 'all 0.15s'
                }}
              >
                <Plus size={15} /> <span>Hata Defterine Soru Ekle</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSlicerModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                  transition: 'all 0.15s'
                }}
              >
                <Scissors size={15} /> <span>Yeni Telafi Testi Kırp</span>
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            2. ANA SEKME ÇUBUĞU (5'Lİ TEMİZ MENÜ)
        ════════════════════════════════════════════ */}
        <div className="wa-tab-bar" style={{
          display: 'flex',
          background: 'var(--color-surface)',
          padding: '5px',
          borderRadius: '16px',
          border: '1.5px solid var(--color-border)',
          gap: 6,
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {/* SEKME 1: ÖZEL & ATANAN TELAFİ TESTLERİM */}
          <button
            onClick={() => setActiveMainTab('remedial')}
            className="wa-tab-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '12px',
              border: 'none',
              background: activeMainTab === 'remedial' ? (isDark ? 'rgba(99,102,241,0.25)' : '#ede9fe') : 'transparent',
              color: activeMainTab === 'remedial' ? '#6366f1' : 'var(--color-text-muted)',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Scissors size={15} />
            <span>✂️ Telafi Testlerim</span>
            <span style={{
              background: activeMainTab === 'remedial' ? '#6366f1' : 'var(--color-surface-hover)',
              color: activeMainTab === 'remedial' ? '#ffffff' : 'var(--color-text)',
              fontSize: '0.68rem',
              padding: '0.1rem 0.45rem',
              borderRadius: 99,
              fontWeight: 900
            }}>
              {remedialTests.length}
            </span>
          </button>

          {/* SEKME 2: SINAV & TEST YANLIŞLARIM */}
          <button
            onClick={() => setActiveMainTab('submissions')}
            className="wa-tab-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '12px',
              border: 'none',
              background: activeMainTab === 'submissions' ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : 'transparent',
              color: activeMainTab === 'submissions' ? '#3b82f6' : 'var(--color-text-muted)',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Layers size={15} />
            <span>📑 Sınav Yanlışlarım</span>
            <span style={{
              background: activeMainTab === 'submissions' ? '#3b82f6' : 'var(--color-surface-hover)',
              color: activeMainTab === 'submissions' ? '#ffffff' : 'var(--color-text)',
              fontSize: '0.68rem',
              padding: '0.1rem 0.45rem',
              borderRadius: 99,
              fontWeight: 900
            }}>
              {totalWrongQuestionsCount}
            </span>
          </button>

          {/* SEKME 3: ARALIKLI TEKRAR (LEITNER KUTULARI) */}
          <button
            onClick={() => setActiveMainTab('leitner')}
            className="wa-tab-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '12px',
              border: 'none',
              background: activeMainTab === 'leitner' ? (isDark ? 'rgba(16,185,129,0.25)' : '#f0fdf4') : 'transparent',
              color: activeMainTab === 'leitner' ? '#10b981' : 'var(--color-text-muted)',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Zap size={15} />
            <span>🧠 Aralıklı Tekrar</span>
            {leitnerOverview.dueTodayCount > 0 ? (
              <span style={{
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.68rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {leitnerOverview.dueTodayCount} Bugün
              </span>
            ) : (
              <span style={{
                background: activeMainTab === 'leitner' ? '#10b981' : 'var(--color-surface-hover)',
                color: activeMainTab === 'leitner' ? '#ffffff' : 'var(--color-text)',
                fontSize: '0.68rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                5 Kutu
              </span>
            )}
          </button>

          {/* SEKME 4: GÖRSEL HATA DEFTERİM */}
          <button
            onClick={() => setActiveMainTab('notebook')}
            className="wa-tab-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '12px',
              border: 'none',
              background: activeMainTab === 'notebook' ? (isDark ? 'rgba(239,68,68,0.25)' : '#fef2f2') : 'transparent',
              color: activeMainTab === 'notebook' ? '#ef4444' : 'var(--color-text-muted)',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <BookMarked size={15} />
            <span>📸 Hata Defterim</span>
            <span style={{
              background: activeMainTab === 'notebook' ? '#ef4444' : 'var(--color-surface-hover)',
              color: activeMainTab === 'notebook' ? '#ffffff' : 'var(--color-text)',
              fontSize: '0.68rem',
              padding: '0.1rem 0.45rem',
              borderRadius: 99,
              fontWeight: 900
            }}>
              {studentErrors.length}
            </span>
          </button>

          {/* SEKME 5: HATA SEBEPLERİ ANALİZİ */}
          <button
            onClick={() => setActiveMainTab('analytics')}
            className="wa-tab-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '12px',
              border: 'none',
              background: activeMainTab === 'analytics' ? (isDark ? 'rgba(245,158,11,0.25)' : '#fffbeb') : 'transparent',
              color: activeMainTab === 'analytics' ? '#f59e0b' : 'var(--color-text-muted)',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Sparkles size={15} />
            <span>📊 Teşhis Analizi</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════
            3. HIZLI ÖZET METRİK KARTLARI
        ════════════════════════════════════════════ */}
        <div className="wa-kpi-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}>
          {/* Kart 1: Yanlış Soru */}
          <div style={{
            background: 'var(--color-surface)',
            border: isDark ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid #fecaca',
            borderRadius: '16px',
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              ❌
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Toplam Yanlış Soru
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                {totalWrongQuestionsCount} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Soru</span>
              </div>
            </div>
          </div>

          {/* Kart 2: Boş Soru */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '16px',
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              ⚪
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Toplam Boş Soru
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                {totalBlankQuestionsCount} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Soru</span>
              </div>
            </div>
          </div>

          {/* Kart 3: Telafi Testleri */}
          <div style={{
            background: 'var(--color-surface)',
            border: isDark ? '1.5px solid rgba(99,102,241,0.35)' : '1.5px solid #ddd6fe',
            borderRadius: '16px',
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: isDark ? 'rgba(99,102,241,0.2)' : '#ede9fe',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              ✂️
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aktif Telafi Testi
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                {remedialTests.length} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Test</span>
              </div>
            </div>
          </div>

          {/* Kart 4: Aralıklı Tekrar */}
          <div style={{
            background: 'var(--color-surface)',
            border: isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: isDark ? 'rgba(16,185,129,0.2)' : '#f0fdf4',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              🧠
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bugün Telafi Tekrarı
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                {leitnerOverview.dueTodayCount} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Soru</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            4. SEÇİLİ SEKMENİN İÇERİĞİ
        ════════════════════════════════════════════ */}

        {/* ─── SEKME 1: ÖZEL & ATANAN TELAFİ TESTLERİM ─── */}
        {activeMainTab === 'remedial' && (
          <div className="wa-section-card" style={{ position: 'relative' }}>
            {/* Program Toast Notification */}
            {programToast && (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: '#059669',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 10,
                fontSize: '0.78rem',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <CheckCircle2 size={15} />
                <span>{programToast}</span>
              </div>
            )}

            {/* Section Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(139,92,246,0.35)',
                  fontSize: '1.1rem'
                }}>
                  <Scissors size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      ✂️ Özel & Atanan Telafi Testlerim
                    </h3>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe',
                      color: '#7c3aed',
                      padding: '2px 8px',
                      borderRadius: 99
                    }}>
                      {remedialTests.length} Test
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Öğretmeninizin size atadığı veya PDF Soru Kırpıcı ile hazırladığınız kişisel telafi testlerini buradan çözün, sonuçları inceleyin veya çalışma programınıza ekleyin.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Tablo / Kartlar Görünüm Toggle */}
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--color-surface)',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)'
                }}>
                  <button
                    type="button"
                    onClick={() => setRemedialViewMode('table')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '7px',
                      fontSize: '0.74rem',
                      fontWeight: remedialViewMode === 'table' ? 900 : 600,
                      border: 'none',
                      background: remedialViewMode === 'table' ? (isDark ? 'rgba(99,102,241,0.25)' : '#ede9fe') : 'transparent',
                      color: remedialViewMode === 'table' ? '#6366f1' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    title="Tablo Görünümü"
                  >
                    <Table size={13} />
                    <span>Tablo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemedialViewMode('cards')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '7px',
                      fontSize: '0.74rem',
                      fontWeight: remedialViewMode === 'cards' ? 900 : 600,
                      border: 'none',
                      background: remedialViewMode === 'cards' ? (isDark ? 'rgba(99,102,241,0.25)' : '#ede9fe') : 'transparent',
                      color: remedialViewMode === 'cards' ? '#6366f1' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    title="Kart Görünümü"
                  >
                    <List size={13} />
                    <span>Kartlar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test List (Empty / Table / Cards) */}
            {remedialTests.length === 0 ? (
              <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                border: '1.5px dashed var(--color-border)',
                borderRadius: 14,
                padding: '1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{ fontSize: '1.8rem' }}>📄✂️</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  Henüz Hazırlanmış veya Atanmış Bir Telafi Testiniz Yok
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: 450 }}>
                  Kitap takibinde yanlış yaptığınız sorulardan tek tıkla yeni bir telafi testi kırpıp birleştirebilir veya öğretmeninizin atadığı telafi testlerini buradan çözebilirsiniz.
                </div>
                <button
                  type="button"
                  onClick={() => setIsSlicerModalOpen(true)}
                  style={{
                    marginTop: 6,
                    background: 'var(--color-surface)',
                    border: '1.5px solid #6366f1',
                    color: '#6366f1',
                    borderRadius: 10,
                    padding: '6px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Scissors size={14} /> <span>İlk Telafi Testini Oluştur</span>
                </button>
              </div>
            ) : remedialViewMode === 'table' ? (
              /* ─── TABLO GÖRÜNÜMÜ (VARSAYILAN) ─── */
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '16px',
                border: '1.5px solid var(--color-border)',
                overflowX: 'auto',
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: 820 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1.5px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>DERS & TEST BİLGİSİ</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>HAZIRLAYAN</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>BAŞARI / SONUÇ</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>PROGRAM DURUMU</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textAlign: 'right' }}>İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remedialTests.map((test, idx) => {
                      const sub = (submissions || []).find(s => {
                        if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
                        const sStdId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
                        const isMatchStudent = allStudentIds.has(sStdId) || (toUUID(sStdId) && allStudentIds.has(toUUID(sStdId)));
                        if (!isMatchStudent) return false;
                        return String(s.testId) === String(test.id) ||
                          String(s.id) === String(test.id) ||
                          (toUUID(test.id) && toUUID(s.testId) === toUUID(test.id)) ||
                          (s.metadata?.realTestId && String(s.metadata.realTestId) === String(test.id));
                      });
                      const isSolved = Boolean(sub);
                      const totalQ = test.questionCount || test.totalQuestions || test.questionsList?.length || 1;
                      const correctCount = sub ? Number(sub.correct_count ?? sub.correctCount ?? sub.correct ?? 0) : 0;
                      const wrongCount = sub ? Number(sub.wrong_count ?? sub.wrongCount ?? sub.wrong ?? 0) : 0;
                      const blankCount = sub ? Number(sub.empty_count ?? sub.blankCount ?? sub.blank ?? Math.max(0, totalQ - correctCount - wrongCount)) : 0;
                      const scorePct = sub ? (sub.scorePercentage ?? (totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0)) : 0;
                      const isDaySelectorOpen = openDaySelectorId === test.id;
                      const sStyle = SUBJECT_CONFIG[test.subject] || SUBJECT_CONFIG['Tümü'];
                      const studentProfile = (coachingProfiles || []).find(p => {
                        if (!p) return false;
                        const pSid = String(p.studentId || p.userId || p.id || '');
                        const curSid = String(currentStudentId || '');
                        return pSid === curSid || (curSid && toUUID(curSid) === toUUID(pSid));
                      });
                      const progDaysWithTest = [];
                      let isScheduledWithTeacherTag = false;
                      if (studentProfile && Array.isArray(studentProfile.weeklyProgram)) {
                        studentProfile.weeklyProgram.forEach(dObj => {
                          if (!dObj || !Array.isArray(dObj.items)) return;
                          const hasTest = dObj.items.some(item => {
                            if (!item) return false;
                            const itId = String(item.testId || item.realTestId || item.hwId || item.id || '');
                            const tId = String(test.id || '');
                            const isMatch = (itId && tId && itId === tId) || (tId && toUUID(tId) && toUUID(itId) === toUUID(tId));
                            if (isMatch && (item.isTeacherRemedial || item.teacherAssigned || String(item.text || item.title || '').includes('👨‍🏫'))) {
                              isScheduledWithTeacherTag = true;
                            }
                            return isMatch;
                          });
                          if (hasTest && dObj.day && !progDaysWithTest.includes(dObj.day)) {
                            progDaysWithTest.push(dObj.day);
                          }
                        });
                      }
                      const isInProgram = progDaysWithTest.length > 0;

                      const raw = test?.raw_data || {};
                      const combinedTest = { ...raw, ...test };
                      const creatorId = String(combinedTest.createdBy || combinedTest.created_by || combinedTest.authorId || combinedTest.author || '');
                      const isCreatedByThisStudent = Boolean(creatorId && (allStudentIds.has(creatorId) || (toUUID(creatorId) && allStudentIds.has(toUUID(creatorId)))));

                      const matchedHw = (homeworks || []).find(h => String(h.id) === String(test.id) || String(h.id) === String(test.hwId));
                      const hwCreatorId = matchedHw ? String(matchedHw.createdBy || matchedHw.created_by || '') : '';
                      const isHwCreatedByStudent = Boolean(hwCreatorId && (allStudentIds.has(hwCreatorId) || (toUUID(hwCreatorId) && allStudentIds.has(toUUID(hwCreatorId)))));

                      let isTeacherAssigned = false;
                      if (isScheduledWithTeacherTag) {
                        isTeacherAssigned = true;
                      } else if (combinedTest.isSelfCreated === true || combinedTest.created_by_student === true || combinedTest.createdByRole === 'student') {
                        isTeacherAssigned = false;
                      } else if (combinedTest.createdByRole === 'teacher' || combinedTest.assignedBy === 'teacher' || combinedTest.teacherAssigned === true || combinedTest.isTeacherRemedial === true) {
                        isTeacherAssigned = true;
                      } else if (creatorId && !isCreatedByThisStudent && creatorId !== 'undefined' && creatorId !== 'null') {
                        isTeacherAssigned = true;
                      } else if (matchedHw && hwCreatorId && !isHwCreatedByStudent && hwCreatorId !== 'undefined') {
                        isTeacherAssigned = true;
                      } else if (isCreatedByThisStudent || isHwCreatedByStudent) {
                        isTeacherAssigned = false;
                      } else {
                        isTeacherAssigned = false;
                      }

                      return (
                        <tr
                          key={test.id || idx}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                          }}
                        >
                          {/* 1. DERS & TEST BİLGİSİ */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                padding: '2px 7px',
                                borderRadius: 6,
                                background: sStyle.bg,
                                color: sStyle.color,
                                border: `1px solid ${sStyle.border}`
                              }}>
                                {test.subject || 'Genel'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                📝 {totalQ} Soru
                              </span>
                            </div>
                            <div style={{ fontWeight: 900, color: 'var(--color-text)', fontSize: '0.88rem', lineHeight: 1.3 }}>
                              {test.title || test.name || 'Özel Telafi Testi'}
                            </div>
                            {test.bookTitle && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2, fontWeight: 600 }}>
                                📚 {test.bookTitle}
                              </div>
                            )}
                          </td>

                          {/* 2. HAZIRLAYAN */}
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            {isTeacherAssigned ? (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid rgba(59,130,246,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                👨‍🏫 Öğretmen Atadı
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff',
                                color: '#7c3aed',
                                border: '1px solid rgba(139,92,246,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                👤 Kendi Hazırladığım
                              </span>
                            )}
                          </td>

                          {/* 3. BAŞARI / SONUÇ */}
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            {isSolved ? (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 900,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    background: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                                    color: '#059669',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                  }}>
                                    <CheckCircle2 size={11} /> %{scorePct} Başarı
                                  </span>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#059669' }}>
                                    Net: {(correctCount - (wrongCount / 3)).toFixed(2)}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', gap: 6 }}>
                                  <span style={{ color: '#16a34a' }}>✓ {correctCount} D</span>
                                  <span style={{ color: '#dc2626' }}>✗ {wrongCount} Y</span>
                                  <span style={{ color: 'var(--color-text-muted)' }}>— {blankCount} B</span>
                                </div>
                              </div>
                            ) : (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                                color: '#d97706'
                              }}>
                                ⏳ Çözülmedi
                              </span>
                            )}
                          </td>

                          {/* 4. PROGRAM DURUMU */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setOpenDaySelectorId(isDaySelectorOpen ? null : test.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 7,
                                  background: isInProgram
                                    ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5')
                                    : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                                  border: isInProgram
                                    ? '1px solid rgba(16,185,129,0.4)'
                                    : '1px solid var(--color-border)',
                                  color: isInProgram ? '#059669' : 'var(--color-text-muted)',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isInProgram ? (
                                  <>
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    <span>✓ Programda ({progDaysWithTest.join(', ')})</span>
                                  </>
                                ) : (
                                  <>
                                    <Calendar size={12} className="text-indigo-500" />
                                    <span>{isDaySelectorOpen ? '▲ Kapat' : '📅 Programa Ekle'}</span>
                                  </>
                                )}
                              </button>

                              {isDaySelectorOpen && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  zIndex: 50,
                                  marginTop: 4,
                                  padding: '8px',
                                  borderRadius: 10,
                                  background: isDark ? '#1e293b' : '#ffffff',
                                  border: '1px solid var(--color-border)',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                  minWidth: 210
                                }}>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                                    Hangi günün programına eklensin?
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {[
                                      { key: 'Pzt', label: 'Pzt' },
                                      { key: 'Sal', label: 'Sal' },
                                      { key: 'Çrş', label: 'Çrş' },
                                      { key: 'Prş', label: 'Prş' },
                                      { key: 'Cum', label: 'Cum' },
                                      { key: 'Cts', label: 'Cts' },
                                      { key: 'Paz', label: 'Paz' }
                                    ].map(d => (
                                      <button
                                        key={d.key}
                                        type="button"
                                        onClick={() => handleAddTestToProgram(test, d.key)}
                                        style={{
                                          padding: '3px 6px',
                                          borderRadius: 6,
                                          border: '1px solid var(--color-border)',
                                          background: 'var(--color-surface)',
                                          color: 'var(--color-text)',
                                          fontSize: '0.7rem',
                                          fontWeight: 800,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {d.label}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddSpacedRepetitionPlan(test)}
                                    style={{
                                      width: '100%',
                                      marginTop: 2,
                                      padding: '4px 6px',
                                      borderRadius: 6,
                                      background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                                      border: '1px dashed #6366f1',
                                      color: '#6366f1',
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 4
                                    }}
                                    title="1. Gün, 3. Gün ve 7. Gün için otomatik tekrar görevleri ekler"
                                  >
                                    <Sparkles size={11} />
                                    <span>⚡ 1, 3 ve 7 Günlük Aralıklı Tekrar Planı</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. İŞLEMLER */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {isSolved ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const stId = selectedStudent?.id || currentUser?.id;
                                      navigate(`/quiz/${test.id}?studentId=${stId}&retake=true&mode=solve`, { state: { from: '/student/wrong-answers', retake: true, mode: 'solve' } });
                                    }}
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: 7,
                                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                      color: '#ffffff',
                                      border: 'none',
                                      fontSize: '0.72rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Testi Baştan Tekrar Çöz"
                                  >
                                    <RotateCcw size={12} /> <span>Tekrar Çöz</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const stId = selectedStudent?.id || currentUser?.id;
                                      navigate(`/quiz-review/${test.id}?studentId=${stId}&submissionId=${sub.id}`, { state: { from: '/student/wrong-answers' } });
                                    }}
                                    style={{
                                      padding: '5px 8px',
                                      borderRadius: 7,
                                      background: 'var(--color-surface)',
                                      border: '1px solid var(--color-border)',
                                      color: 'var(--color-text)',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Cevapları ve Çözümleri İncele"
                                  >
                                    <Eye size={12} /> <span>İncele</span>
                                  </button>

                                  {(wrongCount > 0 || blankCount > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => handlePracticeTestMistakes(test, sub)}
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: 7,
                                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        whiteSpace: 'nowrap'
                                      }}
                                      title="Sadece Yanlışları Tekrarla"
                                    >
                                      <Zap size={12} fill="currentColor" /> <span>Yanlışları Tekrarla ({wrongCount + blankCount})</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const stId = selectedStudent?.id || currentUser?.id;
                                    navigate(`/quiz/${test.id}?studentId=${stId}&mode=solve`, { state: { from: '/student/wrong-answers', mode: 'solve' } });
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 7,
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.74rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Play size={12} fill="currentColor" /> <span>Testi Çöz</span>
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRemedialTest(test.id, test.title || test.name, e)}
                                style={{
                                  padding: '5px 7px',
                                  borderRadius: 7,
                                  background: isDark ? 'rgba(239,68,68,0.1)' : '#fee2e2',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Bu Telafi Testini Sil"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ─── KARTLAR GÖRÜNÜMÜ ─── */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: '0.85rem'
              }}>
                {remedialTests.map(test => {
                  const sub = (submissions || []).find(s => {
                    if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
                    const sStdId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
                    const isMatchStudent = allStudentIds.has(sStdId) || (toUUID(sStdId) && allStudentIds.has(toUUID(sStdId)));
                    if (!isMatchStudent) return false;
                    return String(s.testId) === String(test.id) ||
                      String(s.id) === String(test.id) ||
                      (toUUID(test.id) && toUUID(s.testId) === toUUID(test.id)) ||
                      (s.metadata?.realTestId && String(s.metadata.realTestId) === String(test.id));
                  });
                  const isSolved = Boolean(sub);
                  const totalQ = test.questionCount || test.totalQuestions || test.questionsList?.length || 1;
                  const correctCount = sub ? Number(sub.correct_count ?? sub.correctCount ?? sub.correct ?? 0) : 0;
                  const wrongCount = sub ? Number(sub.wrong_count ?? sub.wrongCount ?? sub.wrong ?? 0) : 0;
                  const blankCount = sub ? Number(sub.empty_count ?? sub.blankCount ?? sub.blank ?? Math.max(0, totalQ - correctCount - wrongCount)) : 0;
                  const scorePct = sub ? (sub.scorePercentage ?? (totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0)) : 0;
                  const isDaySelectorOpen = openDaySelectorId === test.id;
                  const sStyle = SUBJECT_CONFIG[test.subject] || SUBJECT_CONFIG['Tümü'];
                  const studentProfile = (coachingProfiles || []).find(p => {
                    if (!p) return false;
                    const pSid = String(p.studentId || p.userId || p.id || '');
                    const curSid = String(currentStudentId || '');
                    return pSid === curSid || (curSid && toUUID(curSid) === toUUID(pSid));
                  });
                  const progDaysWithTest = [];
                  let isScheduledWithTeacherTag = false;
                  if (studentProfile && Array.isArray(studentProfile.weeklyProgram)) {
                    studentProfile.weeklyProgram.forEach(dObj => {
                      if (!dObj || !Array.isArray(dObj.items)) return;
                      const hasTest = dObj.items.some(item => {
                        if (!item) return false;
                        const itId = String(item.testId || item.realTestId || item.hwId || item.id || '');
                        const tId = String(test.id || '');
                        const isMatch = (itId && tId && itId === tId) || (tId && toUUID(tId) && toUUID(itId) === toUUID(tId));
                        if (isMatch && (item.isTeacherRemedial || item.teacherAssigned || String(item.text || item.title || '').includes('👨‍🏫'))) {
                          isScheduledWithTeacherTag = true;
                        }
                        return isMatch;
                      });
                      if (hasTest && dObj.day && !progDaysWithTest.includes(dObj.day)) {
                        progDaysWithTest.push(dObj.day);
                      }
                    });
                  }
                  const isInProgram = progDaysWithTest.length > 0;

                  const raw = test?.raw_data || {};
                  const combinedTest = { ...raw, ...test };
                  const creatorId = String(combinedTest.createdBy || combinedTest.created_by || combinedTest.authorId || combinedTest.author || '');
                  const isCreatedByThisStudent = Boolean(creatorId && (allStudentIds.has(creatorId) || (toUUID(creatorId) && allStudentIds.has(toUUID(creatorId)))));

                  const matchedHw = (homeworks || []).find(h => String(h.id) === String(test.id) || String(h.id) === String(test.hwId));
                  const hwCreatorId = matchedHw ? String(matchedHw.createdBy || matchedHw.created_by || '') : '';
                  const isHwCreatedByStudent = Boolean(hwCreatorId && (allStudentIds.has(hwCreatorId) || (toUUID(hwCreatorId) && allStudentIds.has(toUUID(hwCreatorId)))));

                  let isTeacherAssigned = false;
                  if (isScheduledWithTeacherTag) {
                    isTeacherAssigned = true;
                  } else if (combinedTest.isSelfCreated === true || combinedTest.created_by_student === true || combinedTest.createdByRole === 'student') {
                    isTeacherAssigned = false;
                  } else if (combinedTest.createdByRole === 'teacher' || combinedTest.assignedBy === 'teacher' || combinedTest.teacherAssigned === true || combinedTest.isTeacherRemedial === true) {
                    isTeacherAssigned = true;
                  } else if (creatorId && !isCreatedByThisStudent && creatorId !== 'undefined' && creatorId !== 'null') {
                    isTeacherAssigned = true;
                  } else if (matchedHw && hwCreatorId && !isHwCreatedByStudent && hwCreatorId !== 'undefined') {
                    isTeacherAssigned = true;
                  } else if (isCreatedByThisStudent || isHwCreatedByStudent) {
                    isTeacherAssigned = false;
                  } else {
                    isTeacherAssigned = false;
                  }

                  return (
                    <div
                      key={test.id}
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                        border: isSolved ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid var(--color-border)',
                        borderRadius: 14,
                        padding: '1rem 1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Top Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: sStyle.bg,
                              color: sStyle.color,
                              border: `1px solid ${sStyle.border}`
                            }}>
                              {test.subject || 'Genel'}
                            </span>
                            {isTeacherAssigned ? (
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid rgba(59,130,246,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                👨‍🏫 Öğretmen Atadı
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff',
                                color: '#7c3aed',
                                border: '1px solid rgba(139,92,246,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                👤 Kendi Hazırladığım
                              </span>
                            )}
                          </div>

                          {/* Status Chip */}
                          {isSolved ? (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                              color: '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              <CheckCircle2 size={11} /> %{scorePct} Başarı
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                              color: '#d97706'
                            }}>
                              ⏳ Çözülmedi
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 style={{
                          margin: '0 0 6px',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          color: 'var(--color-text)',
                          lineHeight: 1.3
                        }}>
                          {test.title || test.name || 'Özel Telafi Testi'}
                        </h4>

                        {/* Info & Stats */}
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>📝 {totalQ} Soru</span>
                          {test.bookTitle && <span>• 📚 {test.bookTitle}</span>}
                        </div>

                        {/* Solved Score Breakdown */}
                        {isSolved && (
                          <div style={{
                            marginTop: 8,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
                            border: '1px solid rgba(16,185,129,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            <span style={{ color: '#16a34a' }}>✓ {correctCount} D</span>
                            <span style={{ color: '#dc2626' }}>✗ {wrongCount} Y</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>— {blankCount} B</span>
                            <span style={{ color: '#059669', fontWeight: 900 }}>Net: {(correctCount - (wrongCount / 3)).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        {/* Primary Solve / Retake / Review Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isSolved ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const stId = selectedStudent?.id || currentUser?.id;
                                  navigate(`/quiz/${test.id}?studentId=${stId}&retake=true&mode=solve`, { state: { from: '/student/wrong-answers', retake: true, mode: 'solve' } });
                                }}
                                style={{
                                  flex: 1,
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s'
                                }}
                                title="Testi Baştan Tekrar Çöz"
                              >
                                <RotateCcw size={13} /> <span>Tekrar Çöz</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const stId = selectedStudent?.id || currentUser?.id;
                                  navigate(`/quiz-review/${test.id}?studentId=${stId}&submissionId=${sub.id}`, { state: { from: '/student/wrong-answers' } });
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  background: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-text)',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Cevapları ve Çözümleri İncele"
                              >
                                <Eye size={13} /> <span>İncele</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const stId = selectedStudent?.id || currentUser?.id;
                                navigate(`/quiz/${test.id}?studentId=${stId}&mode=solve`, { state: { from: '/student/wrong-answers', mode: 'solve' } });
                              }}
                              style={{
                                flex: 1,
                                padding: '7px 12px',
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Play size={13} fill="currentColor" /> <span>Testi Çöz</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteRemedialTest(test.id, test.title || test.name, e)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: isDark ? 'rgba(239,68,68,0.1)' : '#fee2e2',
                              border: '1px solid rgba(239,68,68,0.3)',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Bu Telafi Testini Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Practice Only Mistakes Button (If Solved and has Mistakes) */}
                        {isSolved && (wrongCount > 0 || blankCount > 0) && (
                          <button
                            type="button"
                            onClick={() => handlePracticeTestMistakes(test, sub)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.74rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              boxShadow: '0 2px 8px rgba(236,72,153,0.25)',
                              transition: 'all 0.15s'
                            }}
                            title="Bu testteki yanlışları Leitner aralıklı tekrar modunda çöz"
                          >
                            <Zap size={13} fill="currentColor" />
                            <span>🧠 Sadece Yanlışları Tekrarla ({wrongCount + blankCount} Soru)</span>
                          </button>
                        )}

                        {/* Add to Study Schedule Button & Day Selector */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setOpenDaySelectorId(isDaySelectorOpen ? null : test.id)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: isInProgram
                                ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5')
                                : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                              border: isInProgram
                                ? '1px solid rgba(16,185,129,0.4)'
                                : '1px solid var(--color-border)',
                              color: isInProgram ? '#059669' : 'var(--color-text-muted)',
                              fontSize: '0.74rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              transition: 'all 0.15s'
                            }}
                          >
                            {isInProgram ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                <span>✓ Programda ({progDaysWithTest.join(', ')})</span>
                              </>
                            ) : (
                              <>
                                <Calendar size={13} className="text-indigo-500" />
                                <span>{isDaySelectorOpen ? '▲ Gün Seçimini Kapat' : '📅 Çalışma Programıma Ekle'}</span>
                              </>
                            )}
                          </button>

                          {/* Day Selector Chips */}
                          {isDaySelectorOpen && (
                            <div style={{
                              marginTop: 6,
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: isDark ? '#1e293b' : '#f1f5f9',
                              border: '1px solid var(--color-border)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                                Hangi günün programına eklensin?
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {[
                                  { key: 'Pzt', label: 'Pzt' },
                                  { key: 'Sal', label: 'Sal' },
                                  { key: 'Çrş', label: 'Çrş' },
                                  { key: 'Prş', label: 'Prş' },
                                  { key: 'Cum', label: 'Cum' },
                                  { key: 'Cts', label: 'Cts' },
                                  { key: 'Paz', label: 'Paz' }
                                ].map(d => (
                                  <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => handleAddTestToProgram(test, d.key)}
                                    style={{
                                      flex: '1 0 32px',
                                      padding: '4px 2px',
                                      borderRadius: 6,
                                      border: '1px solid var(--color-border)',
                                      background: 'var(--color-surface)',
                                      color: 'var(--color-text)',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {d.label}
                                  </button>
                                ))}
                              </div>

                              {/* 1-Click Spaced Repetition (1, 3, 7 days) */}
                              <button
                                type="button"
                                onClick={() => handleAddSpacedRepetitionPlan(test)}
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                                  border: '1px dashed #6366f1',
                                  color: '#6366f1',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 5
                                }}
                                title="1. Gün, 3. Gün ve 7. Gün için otomatik tekrar görevleri ekler"
                              >
                                <Sparkles size={12} />
                                <span>⚡ 1, 3 ve 7 Günlük Aralıklı Tekrar Planı Kur</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── SEKME 2: SINAV & TEST YANLIŞLARIM (KONTROL EDİLMEYENLER / EDİLENLER) ─── */}
        {activeMainTab === 'submissions' && (
          <div>
            {/* Alt Sekme Çubuğu (Bekleyen / Biten) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div style={{
                display: 'inline-flex',
                background: 'var(--color-surface)',
                padding: '3px',
                borderRadius: '12px',
                border: '1.5px solid var(--color-border)',
                gap: 4
              }}>
                <button
                  type="button"
                  onClick={() => setReviewFilter('unreviewed')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.45rem 0.9rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: reviewFilter === 'unreviewed' ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : 'transparent',
                    color: reviewFilter === 'unreviewed' ? '#3b82f6' : 'var(--color-text-muted)',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <Clock size={14} />
                  <span>⏳ Kontrol Edilmeyenler ({unreviewedSubmissions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('reviewed')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.45rem 0.9rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: reviewFilter === 'reviewed' ? (isDark ? 'rgba(16,185,129,0.25)' : '#f0fdf4') : 'transparent',
                    color: reviewFilter === 'reviewed' ? '#10b981' : 'var(--color-text-muted)',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>✅ Kontrol Edilenler ({reviewedSubmissions.length})</span>
                </button>
              </div>
            </div>

            {/* DERS FİLTRELEME BUTONLARI (KAYDIRILABİLİR PİLLER) */}
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
                  ? currentTabBaseList.length
                  : currentTabBaseList.filter(s => s.subject === key).length;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedSubject(key)}
                    className="wa-pill"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.48rem 0.85rem',
                      borderRadius: '12px',
                      border: isSelected ? `1.5px solid ${cfg.color}` : '1.5px solid var(--color-border)',
                      background: isSelected ? cfg.bg : 'var(--color-surface)',
                      color: isSelected ? cfg.color : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? `0 4px 12px ${cfg.color}25` : '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <Icon size={15} color={isSelected ? cfg.color : 'var(--color-text-muted)'} />
                    <span>{cfg.label}</span>
                    <span style={{
                      background: isSelected ? cfg.color : 'var(--color-surface-hover)',
                      color: isSelected ? '#ffffff' : 'var(--color-text)',
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

            {/* Arama, Tarihe Göre Sıralama & Görünüm Çubuğu */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '14px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              {/* Arama Kutusu */}
              <div style={{ flex: '1 1 220px', position: 'relative' }}>
                <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Sınav, kitap, ünite veya konu adı ara..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Sıralama Seçici & Filtre & Görünüm */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-surface-hover)', padding: '0.2rem 0.5rem', borderRadius: '10px', border: '1.5px solid var(--color-border-input)' }}>
                  <ArrowUpDown size={14} color="#6366f1" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-text)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      outline: 'none',
                      cursor: 'pointer',
                      padding: '0.3rem 0'
                    }}
                  >
                    <option value="book_order">📖 Kitap / Sıralı Müfredat Sırası</option>
                    <option value="date_desc">📅 Tarihe Göre: En Yeni</option>
                    <option value="date_asc">📅 Tarihe Göre: En Eski</option>
                    <option value="wrong_desc">❌ En Çok Yanlış Olan</option>
                    <option value="name_asc">🔤 İsim (A-Z)</option>
                  </select>
                </div>

                <button
                  onClick={() => setWrongOnlyFilter(prev => !prev)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '10px',
                    border: wrongOnlyFilter ? (isDark ? '1.5px solid rgba(239,68,68,0.45)' : '1.5px solid #fecaca') : '1.5px solid var(--color-border)',
                    background: wrongOnlyFilter ? (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2') : 'var(--color-surface)',
                    color: wrongOnlyFilter ? '#ef4444' : 'var(--color-text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>❌ Yanlışı Olanlar</span>
                </button>

                <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: '2px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'cards' ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : 'transparent',
                      color: viewMode === 'cards' ? '#3b82f6' : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Kart Görünümü"
                  >
                    <List size={13} />
                    <span>Kart</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'table' ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : 'transparent',
                      color: viewMode === 'table' ? '#3b82f6' : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Tablo Görünümü"
                  >
                    <Table size={13} />
                    <span>Tablo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TABLO GÖRÜNÜMÜ */}
            {viewMode === 'table' ? (
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '16px',
                border: '1.5px solid var(--color-border)',
                overflowX: 'auto',
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1.5px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                      <th
                        className="th-sort"
                        onClick={() => setSortBy('name_asc')}
                        style={{ padding: '0.85rem 1rem', fontWeight: 900 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>SINAV / KİTAP & ÜNİTE</span>
                          {sortBy === 'name_asc' && <ArrowUp size={12} color="#6366f1" />}
                        </div>
                      </th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>DERS</th>
                      <th
                        className="th-sort"
                        onClick={() => setSortBy(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
                        style={{ padding: '0.85rem 1rem', fontWeight: 900 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>TARİH</span>
                          {sortBy === 'date_desc' && <ArrowDown size={12} color="#6366f1" />}
                          {sortBy === 'date_asc' && <ArrowUp size={12} color="#6366f1" />}
                          {sortBy !== 'date_desc' && sortBy !== 'date_asc' && <ArrowUpDown size={12} color="var(--color-text-muted)" />}
                        </div>
                      </th>
                      <th
                        className="th-sort"
                        onClick={() => setSortBy(sortBy === 'wrong_desc' ? 'date_desc' : 'wrong_desc')}
                        style={{ padding: '0.85rem 1rem', fontWeight: 900 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>❌ YANLIŞLAR</span>
                          {sortBy === 'wrong_desc' && <ArrowDown size={12} color="#ef4444" />}
                        </div>
                      </th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>⚪ BOŞLAR</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>DURUM</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, textAlign: 'right' }}>İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubmissions.map((sub, idx) => {
                      const cfg = SUBJECT_CONFIG[sub.subject] || SUBJECT_CONFIG['Matematik'];
                      const isEven = idx % 2 === 0;
                      let rowBg = isEven ? 'var(--color-surface)' : 'var(--color-surface-hover)';
                      if (sub.isReviewed) {
                        rowBg = isDark ? (isEven ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.12)') : (isEven ? '#f0fdf4' : '#f7fee7');
                      }

                      return (
                        <tr
                          key={sub.id || idx}
                          className="wa-table-row"
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: rowBg
                          }}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.9rem', marginBottom: 2 }}>
                              {sub.testTitle || 'Test Sınavı'}
                            </div>
                            {(sub.unit || sub.topic) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: 4 }}>
                                {sub.unit && (
                                  <span style={{ background: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff', color: isDark ? '#93c5fd' : '#1e40af', border: isDark ? '1px solid rgba(59,130,246,0.35)' : '1px solid #bfdbfe', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 900 }}>
                                    📖 {sub.unit.toLowerCase().includes('ünite') ? sub.unit : `Ünite: ${sub.unit}`}
                                  </span>
                                )}
                                {sub.topic && (
                                  <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                    📌 {sub.topic}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                              {sub.subject}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {sub.wrongQuestions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {sub.wrongQuestions.map(q => (
                                  <button
                                    key={q.qNum}
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    className="wa-q-badge"
                                    style={{ background: isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.4)' : '1px solid #fecaca', padding: '0.15rem 0.45rem', borderRadius: 6, fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer' }}
                                  >
                                    S.{q.qNum}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.72rem' }}>✓ Yok</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {sub.blankQuestions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {sub.blankQuestions.map(q => (
                                  <button
                                    key={q.qNum}
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}
                                  >
                                    S.{q.qNum}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                              style={{
                                background: sub.isReviewed
                                  ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4')
                                  : (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb'),
                                color: sub.isReviewed ? '#10b981' : '#f59e0b',
                                border: sub.isReviewed
                                  ? (isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0')
                                  : (isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #fde68a'),
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
                    {filteredTestSubmissions.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '0.4rem', display: 'inline-block' }} />
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)' }}>
                            {reviewFilter === 'unreviewed' ? 'Harika! Kontrol edilmeyi bekleyen sınav bulunmuyor.' : 'Henüz kontrol edilmiş sınav bulunmuyor.'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* KARTLAR GÖRÜNÜMÜ */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: '0.85rem'
              }}>
                {paginatedSubmissions.map(sub => {
                  const cfg = SUBJECT_CONFIG[sub.subject] || SUBJECT_CONFIG['Matematik'];
                  return (
                    <div
                      key={sub.id}
                      className="wa-card"
                      style={{
                        background: 'var(--color-surface)',
                        border: sub.isReviewed
                          ? (isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0')
                          : '1.5px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                            {sub.subject}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>
                          {sub.testTitle || 'Test Sınavı'}
                        </h4>
                        {(sub.unit || sub.topic) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                            {sub.unit && (
                              <span style={{ background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff', color: isDark ? '#93c5fd' : '#1e40af', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800 }}>
                                📖 {sub.unit}
                              </span>
                            )}
                            {sub.topic && (
                              <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800 }}>
                                📌 {sub.topic}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                          <span style={{ color: '#ef4444' }}>❌ {sub.wrongQuestions.length} Yanlış</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>⚪ {sub.blankQuestions.length} Boş</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: 8,
                            background: sub.isReviewed
                              ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4')
                              : (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb'),
                            color: sub.isReviewed ? '#10b981' : '#f59e0b',
                            border: sub.isReviewed
                              ? (isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0')
                              : (isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #fde68a'),
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          {sub.isReviewed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{sub.isReviewed ? 'Kontrol Edildi' : 'Kontrol Et'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenReview(sub.id, e)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          Sınavı Aç
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sayfalama (Pagination) */}
            {renderPagination(safeCurrentPage, totalSubmissionsPages, totalSubmissionsCount, pageSize, setPageSize, setCurrentPage, 'test')}
          </div>
        )}

        {/* ─── SEKME 3: ARALIKLI TEKRAR (LEITNER KUTULARI) ─── */}
        {activeMainTab === 'leitner' && (
          <div className="wa-section-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  fontSize: '1.2rem'
                }}>
                  🧠
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    Aralıklı Tekrar (Leitner 5-Kutu) Sistemi
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Soru bankası ve özel telafi testlerinizdeki yanlışları hafızaya kazımak için 1, 3, 7 ve 15 gün aralıklarla otomatik telafi pratiği yapın.
                  </p>
                </div>
              </div>

              {leitnerOverview.dueTodayCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setLeitnerPracticeQuestions(leitnerOverview.dueQuestions);
                    setIsLeitnerModalOpen(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '0.55rem 1.15rem',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                  }}
                >
                  <Zap size={15} /> 🎯 Bugünün Telafi Pratiğini Başlat ({leitnerOverview.dueTodayCount} Soru)
                </button>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#10b981',
                  background: 'rgba(16,185,129,0.12)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 99,
                  border: '1px solid rgba(16,185,129,0.3)'
                }}>
                  🎉 Bugün bekleyen telafi sorunuz yok!
                </span>
              )}
            </div>

            {/* 5 Box Level Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              {LEITNER_BOX_CONFIG.map(box => {
                const count = leitnerOverview.boxCounts[box.level] || 0;
                const hasItems = count > 0;
                return (
                  <div
                    key={box.level}
                    style={{
                      background: hasItems ? box.bg : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                      border: hasItems ? `1.5px solid ${box.border}` : '1.5px solid var(--color-border)',
                      borderRadius: 14,
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        fontSize: '1.2rem',
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: hasItems ? 'rgba(255,255,255,0.7)' : 'var(--color-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}>
                        {box.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 900, color: hasItems ? box.color : 'var(--color-text)' }}>
                          {box.label}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 1 }}>
                          {box.level === 5 ? '🏆 Ustalaşıldı' : `⏱️ ${box.intervalDays} gün aralık`}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '1.3rem',
                      fontWeight: 900,
                      color: hasItems ? box.color : 'var(--color-text-muted)',
                      background: hasItems ? 'var(--color-surface)' : 'transparent',
                      padding: '2px 8px',
                      borderRadius: 8
                    }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bilgilendirici İpucu */}
            <div style={{
              background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 12,
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.78rem',
              color: 'var(--color-text)'
            }}>
              <Sparkles size={16} color="#6366f1" />
              <div>
                <strong>Aralıklı Tekrar Nasıl Çalışır?</strong> Yanlış yaptığınız bir soru 1. Aşamadan başlar. Doğru çözdükçe 3 gün, 7 gün ve 15 gün sonraya ötelenir. 5. Aşamaya ulaşan sorular kalıcı hafızaya aktarılmış kabul edilir.
              </div>
            </div>
          </div>
        )}

        {/* ─── SEKME 4: GÖRSEL HATA DEFTERİM ─── */}
        {activeMainTab === 'notebook' && (
          <div>
            {/* Üst Aksiyon & Filtre Çubuğu */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '14px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              {/* Sol: Durum Filtresi (Tümü / Aktif / Çözüldü) */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--color-surface-hover)', padding: '2px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                {[
                  { key: 'all', label: 'Tümü', count: studentErrors.length },
                  { key: 'active', label: '⏳ Çözülecek', count: studentErrors.filter(e => !e.isResolved).length },
                  { key: 'resolved', label: '✅ Pekiştirildi', count: studentErrors.filter(e => e.isResolved).length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setNotebookStatusFilter(tab.key)}
                    style={{
                      padding: '0.38rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: notebookStatusFilter === tab.key ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : 'transparent',
                      color: notebookStatusFilter === tab.key ? '#3b82f6' : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Sağ: Arama */}
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <Search size={15} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={notebookSearchQuery}
                  onChange={e => setNotebookSearchQuery(e.target.value)}
                  placeholder="Hata notu, soru veya sebep ara..."
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.1rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* DERS PİLLERİ */}
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
                  ? studentErrors.length
                  : studentErrors.filter(e => e.subject === key).length;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedSubject(key)}
                    className="wa-pill"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.8rem',
                      borderRadius: '12px',
                      border: isSelected ? `1.5px solid ${cfg.color}` : '1.5px solid var(--color-border)',
                      background: isSelected ? cfg.bg : 'var(--color-surface)',
                      color: isSelected ? cfg.color : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={14} color={isSelected ? cfg.color : 'var(--color-text-muted)'} />
                    <span>{cfg.label}</span>
                    <span style={{
                      background: isSelected ? cfg.color : 'var(--color-surface-hover)',
                      color: isSelected ? '#ffffff' : 'var(--color-text)',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '0.1rem 0.35rem',
                      borderRadius: 99
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* HATA DEFTERİ KARTLARI IZGARASI */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.85rem'
            }}>
              {paginatedNotebookErrors.map(err => {
                const sStyle = SUBJECT_CONFIG[err.subject] || SUBJECT_CONFIG['Matematik'];
                return (
                  <div
                    key={err.id}
                    className="wa-card"
                    onClick={() => setViewingErrorModal(err)}
                    style={{
                      background: 'var(--color-surface)',
                      border: err.isResolved
                        ? (isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0')
                        : '1.5px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div>
                      {/* Üst Rozetler */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: sStyle.bg,
                          color: sStyle.color,
                          border: `1px solid ${sStyle.border}`
                        }}>
                          {err.subject || 'Ders'}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: err.isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: err.isResolved ? '#10b981' : '#ef4444'
                        }}>
                          {err.isResolved ? '✅ Pekiştirildi' : '⏳ Çözülecek'}
                        </span>
                      </div>

                      {/* Başlık & Soru No */}
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        {err.testTitle || 'Özel Soru'} {err.questionNo ? ('— Soru ' + err.questionNo) : ''}
                      </h4>

                      {/* Sebep Etiketi */}
                      {err.reason && (
                        <div style={{
                          display: 'inline-block',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#6366f1',
                          background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                          padding: '2px 6px',
                          borderRadius: 6,
                          marginBottom: 6
                        }}>
                          {err.reason}
                        </div>
                      )}

                      {/* Fotoğraf Önizlemesi */}
                      {err.imageUrl && (
                        <div style={{
                          width: '100%',
                          height: 120,
                          borderRadius: 10,
                          overflow: 'hidden',
                          background: 'var(--color-surface-hover)',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <img
                            src={err.imageUrl}
                            alt="Hata Sorusu"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      )}

                      {/* Öğrenci Notu */}
                      {err.note && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          📝 {err.note}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)', paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                      <span>{err.createdAt ? new Date(err.createdAt).toLocaleDateString('tr-TR') : 'Bugün'}</span>
                      <span style={{ color: '#6366f1', fontWeight: 800 }}>İncele →</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {paginatedNotebookErrors.length === 0 && (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-border)',
                borderRadius: 16,
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)'
              }}>
                <Camera size={36} color="#6366f1" style={{ marginBottom: 8, display: 'inline-block' }} />
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  Henüz Hata Defterinize Soru Eklenmemiş
                </div>
                <p style={{ margin: '4px 0 12px', fontSize: '0.76rem' }}>
                  Kitaplardan veya denemelerden takıldığınız soruların fotoğrafını çekip neden yanlış yaptığınızı not alarak kaydedebilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.45rem 1rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> İlk Sorunu Ekle
                </button>
              </div>
            )}

            {/* Hata Defteri Sayfalama */}
            {renderPagination(safeNotebookPage, totalNotebookPages, totalNotebookCount, notebookPageSize, setNotebookPageSize, setNotebookPage, 'soru')}
          </div>
        )}

        {/* ─── SEKME 5: HATA SEBEPLERİ TEŞHİS ANALİZİ ─── */}
        {activeMainTab === 'analytics' && (
          <div className="wa-section-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                  fontSize: '1.2rem'
                }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    🤔 Tüm Hata & Yanlış Sebepleri Teşhis Analizi
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Deneme ve kitap testlerinizde işaretlediğiniz tüm yanlış ve boş soruların genel teşhis özeti
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Toplam Yanlış & Boş: <strong style={{ color: 'var(--color-text)' }}>{overallMistakeStats.totalWrongAndBlank}</strong>
                </span>
                <span>•</span>
                <span style={{ color: '#10b981' }}>
                  Sınıflandırılan: <strong>{overallMistakeStats.totalClassified}</strong>
                </span>
                <span>•</span>
                <span style={{ color: '#f59e0b' }}>
                  Bekleyen: <strong>{overallMistakeStats.unclassifiedCount}</strong>
                </span>
              </div>
            </div>

            {/* Multi-segment Progress Bar */}
            {overallMistakeStats.totalClassified > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  width: '100%',
                  height: 10,
                  borderRadius: 99,
                  background: 'var(--color-surface-hover, #f1f5f9)',
                  overflow: 'hidden',
                  display: 'flex',
                  border: '1px solid var(--color-border, #e2e8f0)'
                }}>
                  {Object.values(overallMistakeStats.reasonDefs).map(r => {
                    if (r.count <= 0) return null;
                    const pct = (r.count / overallMistakeStats.totalClassified) * 100;
                    return (
                      <div
                        key={r.key}
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: r.color,
                          transition: 'width 0.3s ease'
                        }}
                        title={r.key + ': ' + r.count + ' soru (%' + Math.round(pct) + ')'}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interaktif Grafikler: Hata Dağılım Pastası & Soru Sayısı Karşılaştırması */}
            {overallMistakeStats.totalClassified > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}>
                {/* 1. Hata Sebepleri Dağılımı (Donut Pasta Grafiği) */}
                <div style={{
                  background: 'var(--color-surface-hover, #f8fafc)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: 16,
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🍩</span> Hata Sebepleri Dağılımı
                    </h4>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                      %{overallMistakeStats.totalClassified > 0 ? 100 : 0} Dağılım
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 210, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div style={{
                                  background: isDark ? '#1e293b' : '#ffffff',
                                  border: `1.5px solid ${d.color || '#cbd5e1'}`,
                                  borderRadius: 10,
                                  padding: '8px 12px',
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                  fontSize: '0.78rem',
                                  color: isDark ? '#f8fafc' : '#0f172a'
                                }}>
                                  <div style={{ fontWeight: 800, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                    {d.name}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                                    <span>Soru Sayısı:</span>
                                    <strong style={{ color: 'var(--color-text)' }}>{d.count} soru</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                                    <span>Oran:</span>
                                    <strong style={{ color: d.color }}>%{d.percentage}</strong>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={mistakeChartData.filter(d => d.count > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="count"
                        >
                          {mistakeChartData.filter(d => d.count > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-surface, #ffffff)" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Ortadaki Özet Sayaç */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                        {overallMistakeStats.totalClassified}
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Soru
                      </div>
                    </div>
                  </div>

                  {/* Mini Legend Listesi */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                    {mistakeChartData.filter(d => d.count > 0).map(d => (
                      <div
                        key={d.name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: d.bg,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: d.color
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                        {d.shortName}: %{d.percentage} ({d.count})
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Hata Sebeplerine Göre Soru Sayısı (Bar Çubuk Grafiği) */}
                <div style={{
                  background: 'var(--color-surface-hover, #f8fafc)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: 16,
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📊</span> Hata Sayısı Karşılaştırması
                    </h4>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                      Soru Adedi
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mistakeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                        <XAxis
                          dataKey="shortName"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}
                          tickLine={false}
                          axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div style={{
                                  background: isDark ? '#1e293b' : '#ffffff',
                                  border: `1.5px solid ${d.color || '#cbd5e1'}`,
                                  borderRadius: 10,
                                  padding: '8px 12px',
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                  fontSize: '0.78rem',
                                  color: isDark ? '#f8fafc' : '#0f172a'
                                }}>
                                  <div style={{ fontWeight: 800, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                    {d.name}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                                    <span>Soru Sayısı:</span>
                                    <strong style={{ color: 'var(--color-text)' }}>{d.count} soru</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                                    <span>Oran:</span>
                                    <strong style={{ color: d.color }}>%{d.percentage}</strong>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {mistakeChartData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Reason KPI Cards Grid */}
            <div className="wa-mistake-grid">
              {Object.values(overallMistakeStats.reasonDefs).map(r => {
                const pct = overallMistakeStats.totalClassified > 0 ? Math.round((r.count / overallMistakeStats.totalClassified) * 100) : 0;
                return (
                  <div
                    key={r.key}
                    className="wa-mistake-card"
                    style={{
                      background: r.count > 0 ? r.bg : 'var(--color-surface-hover, #f8fafc)',
                      border: `1.5px solid ${r.count > 0 ? r.border : 'var(--color-border, #e2e8f0)'}`,
                      borderRadius: 14,
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span className="wa-mistake-card-title" style={{ fontSize: '0.78rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                        {r.key}
                      </span>
                      <span className="wa-mistake-card-pct" style={{ fontSize: '0.9rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                        %{pct}
                      </span>
                    </div>
                    <div className="wa-mistake-card-val" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      {r.count} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>soru</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coaching Tip */}
            {overallMistakeStats.topReason && overallMistakeStats.topReason.count > 0 ? (
              <div style={{
                background: 'var(--color-surface-hover, #f8fafc)',
                border: '1.5px dashed var(--color-border, #cbd5e1)',
                borderRadius: 12,
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.82rem',
                color: 'var(--color-text)',
                marginBottom: overallMistakeStats.questionsList.length > 0 ? 12 : 0
              }}>
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <div>
                  <strong>Genel Hata Analiz İpucu:</strong> En sık karşılaştığınız soru kaybı nedeni <strong style={{ color: overallMistakeStats.topReason.color }}>{overallMistakeStats.topReason.key}</strong> (%{Math.round((overallMistakeStats.topReason.count / overallMistakeStats.totalClassified) * 100)}).
                  {overallMistakeStats.topReason.key.includes('Dikkat') && ' Sorulardaki olumsuz soru köklerini ve altı çizili terimleri yuvarlak içine alarak çözmeniz dikkat hatalarını engelleyecektir.'}
                  {overallMistakeStats.topReason.key.includes('İşlem') && ' İşlem basamaklarını zihinden yapmak yerine kitapçık boşluğuna satır satır yazmanız işlem doğruluğunu %100 artırır.'}
                  {overallMistakeStats.topReason.key.includes('Konu') && ' Konu eksiklerini tamamlamak için video çözümleri izleyip özet notları tekrar etmeniz tavsiye edilir.'}
                  {overallMistakeStats.topReason.key.includes('Formül') && ' Formül ve bilgi kartlarını çalışma masanıza koyup periyodik olarak tekrar etmeniz faydalı olacaktır.'}
                  {overallMistakeStats.topReason.key.includes('Zaman') && ' Turlama tekniği ve süre kontrolüyle sorulara yaklaşarak zaman baskısını azaltabilirsiniz.'}
                </div>
              </div>
            ) : null}

            {/* Collapsible Classified Questions List */}
            {overallMistakeStats.questionsList.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowClassifiedQuestions(p => !p)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 0
                  }}
                >
                  <span>{showClassifiedQuestions ? '▲ Soru Listesini Gizle' : ('▼ Sınıflandırılan Soruları İncele (' + overallMistakeStats.questionsList.length + ' Soru)')}</span>
                </button>

                {showClassifiedQuestions && (
                  <div style={{
                    marginTop: 10,
                    background: 'var(--color-surface-hover, #f8fafc)',
                    borderRadius: 12,
                    border: '1px solid var(--color-border, #e2e8f0)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}>
                    {overallMistakeStats.questionsList.map(item => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--color-surface, #ffffff)',
                          border: `1.5px solid ${item.def.border}`,
                          borderRadius: 8,
                          padding: '0.45rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{item.testTitle}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>{item.subject}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>Soru {item.qNo}</span>
                        </div>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 6,
                          background: item.def.bg,
                          color: item.def.color,
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          border: `1px solid ${item.def.border}`
                        }}>
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════
          MODALLAR
      ════════════════════════════════════════════ */}

      {/* 1. Leitner Practice Modal */}
      {isLeitnerModalOpen && leitnerPracticeQuestions.length > 0 && (
        <LeitnerPracticeModal
          isOpen={isLeitnerModalOpen}
          onClose={() => {
            setIsLeitnerModalOpen(false);
            setLeitnerPracticeQuestions([]);
          }}
          questions={leitnerPracticeQuestions}
          studentId={currentStudentId}
        />
      )}

      {/* 2. PDF Soru Kırpıcı Modalı */}
      {isSlicerModalOpen && (
        <PdfQuestionSlicerModal
          isOpen={isSlicerModalOpen}
          onClose={() => setIsSlicerModalOpen(false)}
          defaultSubject={selectedSubject !== 'Tümü' ? selectedSubject : 'Matematik'}
          defaultGrade={studentGradeName}
          defaultStudentId={currentStudentId}
        />
      )}

      {/* 3. Görsel Hata Defteri: Yeni Soru Ekle Modalı */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 20,
            padding: '1.5rem',
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={18} color="#ef4444" /> Hata Defterine Yeni Soru Ekle
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                  Ders *
                </label>
                <select
                  value={newErrorForm.subject}
                  onChange={e => setNewErrorForm(p => ({ ...p, subject: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  {Object.keys(SUBJECT_CONFIG).filter(k => k !== 'Tümü').map(subName => (
                    <option key={subName} value={subName}>{subName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                  Test / Kitap Adı *
                </label>
                <input
                  type="text"
                  value={newErrorForm.testTitle}
                  onChange={e => setNewErrorForm(p => ({ ...p, testTitle: e.target.value }))}
                  placeholder="Örn: 8. Sınıf Soru Bankası Test 3"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                    Ünite / Konu
                  </label>
                  <input
                    type="text"
                    value={newErrorForm.topic}
                    onChange={e => setNewErrorForm(p => ({ ...p, topic: e.target.value }))}
                    placeholder="Örn: Çarpanlar ve Katlar"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 10,
                      border: '1.5px solid var(--color-border-input)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                    Soru No
                  </label>
                  <input
                    type="text"
                    value={newErrorForm.questionNo}
                    onChange={e => setNewErrorForm(p => ({ ...p, questionNo: e.target.value }))}
                    placeholder="Örn: 5"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 10,
                      border: '1.5px solid var(--color-border-input)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                  Hata Nedeni *
                </label>
                <select
                  value={newErrorForm.reason}
                  onChange={e => setNewErrorForm(p => ({ ...p, reason: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  <option value="⚡ İşlem Hatası">⚡ İşlem Hatası</option>
                  <option value="⚠️ Dikkat Kaybı">⚠️ Dikkat Kaybı / Yanlış Okuma</option>
                  <option value="📖 Formül / Bilgi">📖 Formül / Kural Eksikliği</option>
                  <option value="🧠 Konu Eksiği">🧠 Konu Eksiği</option>
                  <option value="⏱️ Zaman Yetmedi">⏱️ Zaman Yetmedi</option>
                  <option value="💡 Mantık Hatası">💡 Mantık / Yorumlama Hatası</option>
                </select>
              </div>

              {/* Fotoğraf Yükleme */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                  Soru Fotoğrafı
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: 10,
                    border: '1.5px dashed var(--color-border)',
                    background: 'var(--color-surface-hover)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#6366f1'
                  }}>
                    <Upload size={15} /> <span>Fotoğraf Seç / Çek</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImageToWebP(file);
                            setNewErrorForm(p => ({ ...p, imageUrl: compressed }));
                          } catch (err) {
                            console.error('Fotoğraf yüklenemedi:', err);
                          }
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {newErrorForm.imageUrl && (
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={newErrorForm.imageUrl} alt="Önizleme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                  Hata Notu & Çözüm İpucu
                </label>
                <textarea
                  value={newErrorForm.note}
                  onChange={e => setNewErrorForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Bu soruda neyi yanlış yaptın? Neye dikkat etmelisin?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newErrorForm.testTitle) {
                      alert('Lütfen test veya kitap adını girin.');
                      return;
                    }
                    try {
                      await addStudentError(currentStudentId, {
                        ...newErrorForm,
                        isResolved: false
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
                    } catch (err) {
                      console.error('Hata kaydedilemedi:', err);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                  }}
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Görsel Hata Defteri: Soru Detay Modalı */}
      {viewingErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 20,
            padding: '1.5rem',
            width: '100%',
            maxWidth: 560,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: (SUBJECT_CONFIG[viewingErrorModal.subject] || SUBJECT_CONFIG['Matematik']).bg,
                  color: (SUBJECT_CONFIG[viewingErrorModal.subject] || SUBJECT_CONFIG['Matematik']).color
                }}>
                  {viewingErrorModal.subject}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: viewingErrorModal.isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: viewingErrorModal.isResolved ? '#10b981' : '#ef4444'
                }}>
                  {viewingErrorModal.isResolved ? '✅ Pekiştirildi' : '⏳ Çözülecek'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingErrorModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
              {viewingErrorModal.testTitle} {viewingErrorModal.questionNo ? ('— Soru ' + viewingErrorModal.questionNo) : ''}
            </h3>

            {viewingErrorModal.reason && (
              <div style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#6366f1',
                background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                padding: '3px 8px',
                borderRadius: 6,
                marginBottom: 10
              }}>
                Hata Nedeni: {viewingErrorModal.reason}
              </div>
            )}

            {viewingErrorModal.imageUrl && (
              <div style={{
                width: '100%',
                maxHeight: 280,
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--color-surface-hover)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border)'
              }}>
                <img
                  src={viewingErrorModal.imageUrl}
                  alt="Hata Sorusu"
                  style={{ width: '100%', height: '100%', maxHeight: 280, objectFit: 'contain' }}
                />
              </div>
            )}

            {viewingErrorModal.note && (
              <div style={{
                background: 'var(--color-surface-hover)',
                borderRadius: 10,
                padding: '0.75rem 1rem',
                marginBottom: 12,
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  ÖĞRENCİ NOTU:
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                  {viewingErrorModal.note}
                </div>
              </div>
            )}

            {/* Durumu Değiştir & Sil Butonları */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateStudentError(currentStudentId, viewingErrorModal.id, {
                      isResolved: !viewingErrorModal.isResolved
                    });
                    setViewingErrorModal(p => p ? ({ ...p, isResolved: !p.isResolved }) : null);
                  } catch (err) {
                    console.error('Durum güncellenemedi:', err);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: 10,
                  border: 'none',
                  background: viewingErrorModal.isResolved
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {viewingErrorModal.isResolved ? '⏳ Çözüleceklere Geri Al' : '✅ Pekiştirildi Olarak İşaretle'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Bu soruyu hata defterinden silmek istediğinize emin misiniz?')) {
                    try {
                      await deleteStudentError(currentStudentId, viewingErrorModal.id);
                      setViewingErrorModal(null);
                    } catch (err) {
                      console.error('Soru silinemedi:', err);
                    }
                  }
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Trash2 size={15} /> Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
