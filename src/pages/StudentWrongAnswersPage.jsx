import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Check, Clock, Plus, Upload,
  Image as ImageIcon, Trash2, ZoomIn, X, Camera, BookMarked,
  RotateCcw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Zap, Scissors, Play, Lock,
  Printer, FileSpreadsheet
} from 'lucide-react';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useCoaching } from '../context/CoachingContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toUUID } from '../services/supabaseService';
import { compressImageToWebP } from '../services/imageCompressionService';
import { LEITNER_BOX_CONFIG, getLeitnerOverview } from '../services/spacedRepetitionService';
import { resolveTestQuestions, sortItemsByBookOrder } from '../utils/testResolver';
import { scheduleRemedialTestInProgram, getRemedialLockStatus, isRemedialStageDone } from '../services/remedialSpacedRepetitionService';
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
  const { addSchedule } = useSchedule();

  // 1. Deleted Entities Tracking (Books, Homeworks, Submissions)
  const deletedBookIdsSet = useMemo(() => {
    try {
      const raw = localStorage.getItem('eTestDeletedBooks');
      const parsed = raw ? JSON.parse(raw) : null;
      const arr = Array.isArray(parsed) ? parsed : [];
      const set = new Set();
      arr.forEach(id => {
        if (!id) return;
        const s = String(id).trim();
        set.add(s);
        set.add(s.toLowerCase());
        const u = toUUID(s);
        if (u) {
          set.add(String(u));
          set.add(String(u).toLowerCase());
        }
        const clean = s.replace(/^b_/, '').replace(/^book_/, '');
        if (clean && clean !== s) {
          set.add(clean);
          set.add(clean.toLowerCase());
        }
      });
      return set;
    } catch {
      return new Set();
    }
  }, []);

  const deletedHwIdsSet = useMemo(() => {
    try {
      const raw = localStorage.getItem('eTestDeletedHomeworks');
      const parsed = raw ? JSON.parse(raw) : null;
      const arr = Array.isArray(parsed) ? parsed : [];
      const set = new Set();
      arr.forEach(id => {
        if (!id) return;
        const s = String(id).trim();
        set.add(s);
        set.add(s.toLowerCase());
        const u = toUUID(s);
        if (u) {
          set.add(String(u));
          set.add(String(u).toLowerCase());
        }
      });
      return set;
    } catch {
      return new Set();
    }
  }, []);

  const deletedSubmissionsSet = useMemo(() => {
    try {
      const raw = localStorage.getItem('eTestDeletedSubmissions');
      const parsed = raw ? JSON.parse(raw) : null;
      const arr = Array.isArray(parsed) ? parsed : [];
      const set = new Set();
      arr.forEach(id => {
        if (!id) return;
        const s = String(id).trim();
        set.add(s);
        set.add(s.toLowerCase());
        const u = toUUID(s);
        if (u) {
          set.add(String(u));
          set.add(String(u).toLowerCase());
        }
      });
      return set;
    } catch {
      return new Set();
    }
  }, []);

  // 2. Active Books (Strictly filtering out deleted books)
  const activeBooks = useMemo(() => {
    return (books || []).filter(b => {
      if (!b) return false;
      if (b.isDeleted === true || b.deleted === true || b.deleted_at) return false;
      const bId = String(b.id || '').trim();
      const bUuid = toUUID(bId) ? String(toUUID(bId)) : '';
      if (deletedBookIdsSet.has(bId) || (bUuid && deletedBookIdsSet.has(bUuid))) return false;
      return true;
    });
  }, [books, deletedBookIdsSet]);

  const activeBookCheck = useMemo(() => {
    const idSet = new Set();
    const titleSet = new Set();

    activeBooks.forEach(b => {
      if (!b) return;
      const idStr = String(b.id || '').trim();
      idSet.add(idStr);
      idSet.add(idStr.toLowerCase());
      const clean = idStr.replace(/^b_/, '').replace(/^book_/, '');
      if (clean) {
        idSet.add(clean);
        idSet.add(clean.toLowerCase());
      }
      const u = toUUID(idStr);
      if (u) {
        idSet.add(String(u));
        idSet.add(String(u).toLowerCase());
      }
      if (b.bookId) {
        idSet.add(String(b.bookId));
        idSet.add(String(b.bookId).toLowerCase());
      }

      const tClean = String(b.title || '')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .trim()
        .toLowerCase();
      if (tClean) titleSet.add(tClean);
    });

    return { idSet, titleSet };
  }, [activeBooks]);

  // 3. Active Book Tests (Only tests belonging to active books)
  const activeBookTests = useMemo(() => {
    return (bookTests || []).filter(t => {
      if (!t) return false;
      if (t.isDeleted === true || t.deleted === true || t.deleted_at) return false;
      const tId = String(t.id || '').trim();
      if (deletedSubmissionsSet.has(tId)) return false;

      const bId = String(t.bookId || t.book_id || '').trim();
      const bUuid = toUUID(bId) ? String(toUUID(bId)) : '';
      if (deletedBookIdsSet.has(bId) || (bUuid && deletedBookIdsSet.has(bUuid))) return false;

      // Must belong to an active book
      if (bId && !activeBookCheck.idSet.has(bId) && (!bUuid || !activeBookCheck.idSet.has(bUuid))) {
        return false;
      }
      return true;
    });
  }, [bookTests, deletedBookIdsSet, deletedSubmissionsSet, activeBookCheck]);

  // 4. Active Homeworks (Excluding deleted homeworks AND assignments for deleted books)
  const activeHomeworks = useMemo(() => {
    return (homeworks || []).filter(h => {
      if (!h) return false;
      if (h.isDeleted === true || h.deleted === true || h.deleted_at) return false;
      const hId = String(h.id || '').trim();
      const hUuid = toUUID(hId) ? String(toUUID(hId)) : '';
      if (deletedHwIdsSet.has(hId) || (hUuid && deletedHwIdsSet.has(hUuid))) return false;

      // Check if it belongs to a deleted book or non-active book
      const bId = String(h.bookId || h.book_id || (h.raw_data && h.raw_data.bookId) || '').trim();
      const bUuid = toUUID(bId) ? String(toUUID(bId)) : '';
      if (bId && (deletedBookIdsSet.has(bId) || (bUuid && deletedBookIdsSet.has(bUuid)))) {
        return false;
      }

      const isBookHw = Boolean(h.isBookAssignment || h.bookId || /kitap|bumerang|fasikül|soru bankası|tüm kitap/i.test(h.title || ''));
      if (isBookHw) {
        if (bId) {
          const isAct = activeBookCheck.idSet.has(bId) || (bUuid && activeBookCheck.idSet.has(bUuid));
          if (!isAct) return false;
        } else {
          // If title has book reference, verify it matches an active book
          const hClean = String(h.title || '')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .replace(/\s*\(Kendi Eklediğim\)/gi, '')
            .trim()
            .toLowerCase();
          const matchesActiveBook = Array.from(activeBookCheck.titleSet).some(bt => bt.length >= 4 && (hClean.includes(bt) || bt.includes(hClean)));
          if (!matchesActiveBook) return false;
        }
      }

      return true;
    });
  }, [homeworks, deletedHwIdsSet, deletedBookIdsSet, activeBookCheck]);

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
    const rawAll = [...(bankQuestions || []), ...(activeHomeworks || [])];
    const seenIds = new Set();
    const result = [];

    // 1. Check in bankQuestions and activeHomeworks
    rawAll.forEach(item => {
      if (!item) return;
      const raw = item.raw_data || {};
      const q = { ...raw, ...item };

      // Exclude if deleted
      const qIdStr = String(q.id || q.testId || '');
      if (deletedSubmissionsSet.has(qIdStr) || deletedHwIdsSet.has(qIdStr)) return;
      const qBookId = String(q.bookId || (q.raw_data && q.raw_data.bookId) || '').trim();
      if (qBookId) {
        const qBookUuid = toUUID(qBookId);
        const isDel = deletedBookIdsSet.has(qBookId) || (qBookUuid && deletedBookIdsSet.has(String(qBookUuid)));
        const isAct = activeBookCheck?.idSet?.has(qBookId) || (qBookUuid && activeBookCheck?.idSet?.has(String(qBookUuid)));
        if (isDel || !isAct) return;
      }

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

      if (qIdStr && !seenIds.has(qIdStr)) {
        seenIds.add(qIdStr);
        if (toUUID(qIdStr)) seenIds.add(String(toUUID(qIdStr)));
        if (q.testId) seenIds.add(String(q.testId));
        if (q.realTestId) seenIds.add(String(q.realTestId));
        result.push(q);
      }
    });

    // 2. Also extract any remedial test from submissions that wasn't in bankQuestions or homeworks
    (submissions || []).forEach(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return;
      const sSid = String(s.studentId || s.student_id || s.userId || s.user_id || '');
      const isMatchSt = allStudentIds.has(sSid) || (toUUID(sSid) && allStudentIds.has(toUUID(sSid)));
      if (!isMatchSt) return false;

      const sIdStr = String(s.id || '');
      if (deletedSubmissionsSet.has(sIdStr)) return;
      const sBookId = String(s.bookId || s.metadata?.bookId || '').trim();
      if (sBookId) {
        const sBookUuid = toUUID(sBookId);
        const isDel = deletedBookIdsSet.has(sBookId) || (sBookUuid && deletedBookIdsSet.has(String(sBookUuid)));
        const isAct = activeBookCheck?.idSet?.has(sBookId) || (sBookUuid && activeBookCheck?.idSet?.has(String(sBookUuid)));
        if (isDel || !isAct) return;
      }

      const isRem = s.isRemedial === true || s.isRemedialTest === true || s.sourceType === 'pdfSlicerRemedial' || s.type === 'remedialTest' || String(s.testTitle || s.title || '').toLowerCase().includes('telafi');
      if (isRem) {
        const sTestId = String(s.testId || s.hwId || s.metadata?.realTestId || '');
        if (sTestId && !seenIds.has(sTestId) && (!toUUID(sTestId) || !seenIds.has(toUUID(sTestId)))) {
          seenIds.add(sTestId);
          if (toUUID(sTestId)) seenIds.add(String(toUUID(sTestId)));
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
  }, [bankQuestions, activeHomeworks, submissions, allStudentIds, currentStudentId, deletedSubmissionsSet, deletedHwIdsSet, deletedBookIdsSet, activeBookCheck]);

  const handleAddTestToProgram = async (testItem, targetDayKey) => {
    const studentId = selectedStudent?.id || currentUser?.id;
    if (!studentId) return;

    const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
    const sUuid = toUUID(studentId);
    const currentProfile = getCoachingProfileForStudent(studentId) || (coachingProfiles || []).find(p => {
      if (!p) return false;
      const pSid = String(p.studentId || p.userId || p.id || '');
      return pSid === String(studentId) || (sUuid && (pSid === sUuid || toUUID(pSid) === sUuid));
    }) || {
      id: `cp_${studentId}`,
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
      targetDayKey
    };

    const updatedProg = rawProg.map(dObj => {
      if (dObj.day === targetDayKey) {
        const existing = dObj.items || [];
        const alreadyHas = existing.some(it => String(it.testId || it.realTestId || it.hwId || it.id) === String(testItem.id));
        return {
          ...dObj,
          items: alreadyHas ? existing : [...existing, newItem]
        };
      }
      return dObj;
    });

    await saveCoachingProfile({
      ...currentProfile,
      studentId,
      weeklyProgram: updatedProg
    });

    if (addSchedule) {
      try {
        await addSchedule({
          studentId,
          day: targetDayKey,
          title: `[Telafi] ${testItem.title || testItem.name || 'Özel Telafi Testi'}`,
          done: false
        });
      } catch {}
    }

    setProgramToast(`✓ "${testItem.title || 'Test'}" ${targetDayKey} gününün çalışma programına eklendi!`);
    setTimeout(() => setProgramToast(null), 3500);
    setOpenDaySelectorId(null);
  };

  const handleAddSpacedRepetitionPlan = async (testItem) => {
    const studentId = selectedStudent?.id || currentUser?.id;
    if (!studentId) return;

    const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
    const sUuid = toUUID(studentId);
    const currentProfile = getCoachingProfileForStudent(studentId) || (coachingProfiles || []).find(p => {
      if (!p) return false;
      const pSid = String(p.studentId || p.userId || p.id || '');
      return pSid === String(studentId) || (sUuid && (pSid === sUuid || toUUID(pSid) === sUuid));
    }) || {
      id: `cp_${studentId}`,
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
      intervals: testItem.repetitionIntervals || [0, 3, 7, 15],
      studentId
    });

    await saveCoachingProfile({
      ...currentProfile,
      studentId,
      weeklyProgram: updatedProg
    });

    if (addSchedule) {
      try {
        const todayIdx = (new Date().getDay() + 6) % 7;
        const intervals = testItem.repetitionIntervals || [0, 3, 7, 15];
        for (let i = 0; i < intervals.length; i++) {
          const iv = intervals[i];
          const targetDayKey = DAYS_LIST[(todayIdx + iv) % 7];
          await addSchedule({
            studentId,
            day: targetDayKey,
            title: `[${i + 1}. Tekrar - ${iv === 0 ? 'Bugün' : iv + 'g'}] ${testItem.title || testItem.name || 'Özel Telafi Testi'}`,
            done: false
          });
        }
      } catch {}
    }

    setProgramToast(`🎯 "${testItem.title || 'Test'}" için aralıklı tekrar planı (Bugün, 3, 7, 15 Gün) programınıza eklendi!`);
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
    const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
    const testObj = remedialTests.find(t => String(t.id) === String(testId));
    const isTeacherTask = Boolean(testObj?.teacherAssigned || testObj?.isTeacherRemedial || testObj?.assignedTeacherId || testObj?.createdBy === 'teacher' || testObj?.source === 'teacher');
    
    if (!isTeacher && isTeacherTask) {
      alert('Öğretmeniniz tarafından atanan telafi testleri öğrenciler tarafından silinemez veya değiştirilemez.');
      return;
    }

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
  const [selectedLeitnerBoxLevel, setSelectedLeitnerBoxLevel] = useState('all'); // 'all' | 1 | 2 | 3 | 4 | 5

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

    const registerTestInfo = (idVal, info) => {
      if (!idVal) return;
      const sId = String(idVal);
      map.set(sId, info);
      const clean = sId.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
      if (clean && clean !== sId) map.set(clean, info);
      const uuid = toUUID(sId);
      if (uuid) {
        map.set(String(uuid), info);
        map.set(String(uuid).replace(/-/g, ''), info);
      }
    };

    // 1. Traverse all books and their internal subjects / topics / tests
    (activeBooks || []).forEach((b) => {
      if (!b) return;
      const bTitle = (b.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
      const bSubj = b.subject || b.subjectName || '';

      (b.subjects || []).forEach((s) => {
        let subName = isSubjectName(s?.name) ? s.name : (bSubj || checkSubjectName(bTitle) || 'Matematik');

        (s.tests || []).forEach((t, tIdx) => {
          if (!t) return;
          const tId = t.id || t.testId;
          const tName = t.name || t.title || t.testName || `Test ${tIdx + 1}`;
          const uName = isSubjectName(s?.name) ? '' : (s?.name || b.unit || b.unitName || '');

          const info = {
            testName: tName,
            bookTitle: bTitle || 'Kitap',
            subject: subName,
            unit: uName,
            topic: '',
            bookId: b.id,
            testId: tId,
            orderIndex: Number(t.order ?? t.order_index ?? tIdx + 1)
          };
          registerTestInfo(tId, info);
        });

        (s.topics || []).forEach((tp) => {
          const uName = isSubjectName(s?.name) ? (tp.name || '') : (s?.name || b.unit || b.unitName || '');
          const topName = tp.name && tp.name !== uName ? tp.name : '';

          (tp.tests || []).forEach((t, tIdx) => {
            if (!t) return;
            const tId = t.id || t.testId;
            const tName = t.name || t.title || t.testName || `Test ${tIdx + 1}`;

            const info = {
              testName: tName,
              bookTitle: bTitle || 'Kitap',
              subject: subName,
              unit: isSubjectName(uName) ? '' : uName,
              topic: topName,
              bookId: b.id,
              testId: tId,
              orderIndex: Number(t.order ?? t.order_index ?? tIdx + 1)
            };
            registerTestInfo(tId, info);
          });
        });
      });
    });

    // 2. Traverse flat bookTests array
    (activeBooks || []).forEach(b => {
      const bTests = (activeBookTests || []).filter(bt => 
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
          testName: bt.name || bt.title || bt.testName || 'Test',
          bookTitle: (b.title || bt.bookTitle || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim(),
          subject: subName,
          unit: isSubjectName(unitName) ? '' : unitName,
          topic: (topicName && topicName !== unitName && !isSubjectName(topicName)) ? topicName : '',
          bookId: b.id,
          testId: bt.id,
          orderIndex: Number(bt.order ?? bt.order_index ?? idx + 1)
        };

        registerTestInfo(bt.id, info);
      });
    });

    // 3. Any leftover bookTests not tied to books
    (activeBookTests || []).forEach((bt, idx) => {
      if (!bt?.id || map.has(String(bt.id))) return;
      const bTitle = (bt.bookTitle || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();
      const info = {
        testName: bt.name || bt.title || bt.testName || 'Test',
        bookTitle: bTitle,
        subject: bt.subject || checkSubjectName(bTitle) || 'Matematik',
        unit: bt.unit || bt.unitName || '',
        topic: bt.topic || bt.topicName || '',
        bookId: bt.bookId || null,
        testId: bt.id,
        orderIndex: Number(bt.order ?? bt.order_index ?? idx + 1)
      };
      registerTestInfo(bt.id, info);
    });

    return map;
  }, [activeBooks, activeBookTests]);

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

      const subIdStr = String(s.id || '').trim();
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;
      if (s.isSubmitted === false) return false;
      if (s.raw_data && (s.raw_data.status === 'draft' || s.raw_data.status === 'in_progress')) return false;

      // 1. Exclude if submission is explicitly deleted
      if (deletedSubmissionsSet.has(subIdStr) || (toUUID(subIdStr) && deletedSubmissionsSet.has(String(toUUID(subIdStr))))) {
        return false;
      }
      if (s.isDeleted || s.deleted || s.deleted_at) {
        return false;
      }

      // 2. Exclude if homework is deleted
      const hwIdStr = String(s.hwId || '').trim();
      if (hwIdStr && (deletedHwIdsSet.has(hwIdStr) || (toUUID(hwIdStr) && deletedHwIdsSet.has(String(toUUID(hwIdStr)))))) {
        return false;
      }

      const c = s.correctCount ?? s.correct ?? 0;
      const w = s.wrongCount ?? s.wrong ?? 0;
      const e = s.emptyCount ?? s.blankCount ?? s.empty ?? 0;
      if (c === 0 && w === 0 && e === 0 && (!s.answers || s.answers.length === 0)) return false;

      const candIds = [s.testId, s.bookTestId, s.realTestId, s.metadata?.realTestId, s.metadata?.bookTestId, s.metadata?.testId, s.id].filter(Boolean).map(String);
      let matchedBookTest = null;
      for (const cid of candIds) {
        matchedBookTest = allBookTestsMap.get(cid) ||
                          allBookTestsMap.get(cid.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '')) ||
                          (toUUID(cid) ? allBookTestsMap.get(toUUID(cid)) : null);
        if (matchedBookTest) break;
      }
      const matchedCurTest = allCurTestsMap.get(String(s.testId));
      const parentHw = (activeHomeworks || []).find(h =>
        String(h.id) === String(s.hwId) ||
        String(h.id) === String(s.testId) ||
        String(h.id) === String(s.id) ||
        (toUUID(h.id) && String(toUUID(h.id)) === String(toUUID(s.hwId || s.testId || s.id)))
      );

      // 3. Exclude if submission belongs to a deleted book!
      const candBookIds = [
        s.bookId,
        s.book_id,
        matchedBookTest?.bookId,
        s.metadata?.bookId,
        parentHw?.bookId,
        (s.raw_data && s.raw_data.bookId)
      ].filter(Boolean).map(String);

      const hasDeletedBookId = candBookIds.some(bid => {
        const str = String(bid).trim();
        const u = toUUID(str);
        return deletedBookIdsSet.has(str) || (u && deletedBookIdsSet.has(String(u)));
      });
      if (hasDeletedBookId) {
        return false;
      }

      // Check if it is a book test submission
      const isBookSubmission = Boolean(
        s.bookTestId ||
        s.bookId ||
        s.type === 'book' ||
        s.type === 'tracked_book' ||
        s.sourceType === 'tracked_book' ||
        s.sourceType === 'book' ||
        (s.testId && (String(s.testId).startsWith('tbt_') || String(s.testId).startsWith('bt_'))) ||
        (parentHw && (parentHw.isBookAssignment || parentHw.bookId || String(parentHw.title || '').includes('(Tüm Kitap'))) ||
        String(s.testTitle || s.title || '').includes('(Tüm Kitap')
      );

      if (isBookSubmission) {
        // If it's a book submission, it MUST match an active book!
        const matchesActiveBook =
          (matchedBookTest && activeBookCheck.idSet.has(String(matchedBookTest.bookId))) ||
          candBookIds.some(bid => activeBookCheck.idSet.has(bid)) ||
          Array.from(activeBookCheck.titleSet).some(bt => {
            if (bt.length < 4) return false;
            const fullTitle = `${s.testTitle || ''} ${s.title || ''} ${parentHw?.title || ''}`.toLowerCase();
            return fullTitle.includes(bt);
          });

        if (!matchesActiveBook) {
          // The book this test belonged to is deleted or no longer active
          return false;
        }
      }

      const isRemedial = Boolean(
        s.isRemedial === true ||
        s.isRemedialTest === true ||
        s.isTeacherRemedial === true ||
        s.teacherAssigned === true ||
        s.sourceType === 'pdfSlicerRemedial' ||
        s.sourceType === 'pdfSlicer' ||
        s.sourceType === 'questionBank' ||
        s.sourceType === 'bank' ||
        s.type === 'remedial' ||
        s.type === 'remedialTest' ||
        String(s.testTitle || s.title || '').toLowerCase().includes('telafi') ||
        String(s.testTitle || s.title || '').toLowerCase().includes('kırpılmış') ||
        String(s.testTitle || s.title || '').toLowerCase().includes('kirpilmis')
      );

      // If it's a remedial test or question bank test, keep it
      if (isRemedial) {
        return true;
      }

      const isHwSub = Boolean(s.hwId || s.isHomework || (s.testId && !matchedBookTest && !matchedCurTest));
      if (isHwSub && !parentHw) {
        return false;
      }

      if (s.bookTestId && !matchedBookTest && !parentHw && !s.hwId && !s.testTitle) {
        return false;
      }

      return true;
    });

    const hwSubs = [];
    (activeHomeworks || []).forEach(hw => {
      if (!hw) return;
      (hw.submissions || []).forEach(sub => {
        const sid = sub.studentId || sub.student_id || sub.userId || sub.user_id;
        if (isMatchStudent(sid)) {
          const subIdStr = String(sub.id || '');
          if (subIdStr.startsWith('draft_') || sub.status === 'in_progress' || sub.status === 'draft') return;
          if (sub.isSubmitted === false) return;
          if (deletedSubmissionsSet.has(subIdStr) || (toUUID(subIdStr) && deletedSubmissionsSet.has(String(toUUID(subIdStr))))) return;

          const subBookIds = [sub.bookId, hw.bookId, (sub.raw_data && sub.raw_data.bookId), (hw.raw_data && hw.raw_data.bookId)].filter(Boolean).map(String);
          if (subBookIds.some(bid => deletedBookIdsSet.has(bid) || (toUUID(bid) && deletedBookIdsSet.has(String(toUUID(bid)))))) {
            return;
          }

          const alreadyExists = baseSubs.some(s =>
            String(s.hwId || s.testId || s.id) === String(hw.id) ||
            (toUUID(s.hwId || s.testId || s.id) && String(toUUID(s.hwId || s.testId || s.id)) === String(toUUID(hw.id)))
          );

          if (!alreadyExists) {
            hwSubs.push({
              id: `hw_sub_${hw.id}_${studentIdStr}`,
              hwId: hw.id,
              testId: sub.testId || sub.bookTestId || hw.id,
              bookTestId: sub.bookTestId || null,
              bookId: sub.bookId || hw.bookId || null,
              testTitle: sub.testTitle || sub.testName || sub.title || hw.title,
              testName: sub.testName || sub.testTitle || sub.title || '',
              subject: hw.subject || sub.subject,
              unit: sub.unit || hw.unit || hw.unitName || '',
              topic: sub.topic || hw.topic || hw.topicName || '',
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
  }, [submissions, activeHomeworks, activeStudent, allBookTestsMap, allCurTestsMap, deletedSubmissionsSet, deletedHwIdsSet, deletedBookIdsSet, activeBookCheck]);

  // Grouped Submissions with robust Subject, Unit and Topic Resolution
  const testGroupedSubmissions = useMemo(() => {
    const parsedSubs = (allSubmissions || []).filter(Boolean).map(sub => {
      if (!sub) return null;
      const wrongQuestions = [];
      const blankQuestions = [];
      let correctCount = 0;

      let rawAnswers = [];
      if (Array.isArray(sub.answers)) rawAnswers = sub.answers;
      else if (Array.isArray(sub.studentAnswers)) rawAnswers = sub.studentAnswers;
      else if (typeof sub.answers === 'string') {
        try { rawAnswers = JSON.parse(sub.answers); } catch {}
      } else if (typeof sub.studentAnswers === 'string') {
        try { rawAnswers = JSON.parse(sub.studentAnswers); } catch {}
      }
      if (!Array.isArray(rawAnswers)) rawAnswers = [];

      if (rawAnswers.length > 0) {
        rawAnswers.forEach((ans, idx) => {
          if (!ans) return;
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

      // Collect candidate IDs for lookup
      const candIds = [
        sub.testId,
        sub.bookTestId,
        sub.realTestId,
        sub.metadata?.realTestId,
        sub.metadata?.bookTestId,
        sub.metadata?.testId,
        sub.id
      ].filter(Boolean).map(String);

      // Match Book Test
      let matchedBookTest = null;
      for (const cid of candIds) {
        matchedBookTest = allBookTestsMap.get(cid) ||
                          allBookTestsMap.get(cid.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '')) ||
                          (toUUID(cid) ? allBookTestsMap.get(toUUID(cid)) : null);
        if (matchedBookTest) break;
      }

      // Match Homework
      const matchedHw = (activeHomeworks || []).find(h =>
        String(h.id) === String(sub.hwId) ||
        String(h.id) === String(sub.testId) ||
        String(h.id) === String(sub.id) ||
        (toUUID(h.id) && String(toUUID(h.id)) === String(toUUID(sub.hwId || sub.testId || sub.id)))
      );

      // Match Curriculum Test
      let matchedCurTest = null;
      for (const cid of candIds) {
        matchedCurTest = allCurTestsMap.get(cid);
        if (matchedCurTest) break;
      }

      // Match Book
      const candBookIds = [
        sub.bookId,
        matchedBookTest?.bookId,
        sub.metadata?.bookId,
        matchedHw?.bookId
      ].filter(Boolean).map(String);

      const isAnyBookDeleted = candBookIds.some(bid => {
        const str = String(bid).trim();
        const u = toUUID(str);
        return deletedBookIdsSet.has(str) || (u && deletedBookIdsSet.has(String(u)));
      });

      let matchedBook = null;
      if (!isAnyBookDeleted) {
        matchedBook = (activeBooks || []).find(b => 
          candBookIds.some(bid => String(b.id) === bid || (toUUID(b.id) && toUUID(b.id) === toUUID(bid)))
        );

        if (!matchedBook && (matchedHw?.title || sub.testTitle || sub.title)) {
          const titleStr = `${matchedHw?.title || ''} ${sub.testTitle || ''} ${sub.title || ''}`.toLowerCase();
          matchedBook = (activeBooks || []).find(b => {
            const btClean = String(b.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim().toLowerCase();
            return btClean.length >= 4 && titleStr.includes(btClean);
          });
        }
      }

      // If matchedBook is found but matchedBookTest is still null, look inside matchedBook's subjects/topics
      if (!matchedBookTest && matchedBook) {
        for (const s of (matchedBook.subjects || [])) {
          const found = (s.tests || []).find(t => candIds.some(cid => String(t.id) === cid || String(t.id).replace(/^tbt_/, '').replace(/^bt_/, '') === cid.replace(/^tbt_/, '').replace(/^bt_/, '')));
          if (found) {
            matchedBookTest = {
              id: found.id,
              testId: found.id,
              testName: found.name || found.title || 'Test',
              bookTitle: matchedBook.title,
              bookId: matchedBook.id,
              subject: s.name || matchedBook.subject,
              unit: s.name,
              topic: '',
              orderIndex: Number(found.order ?? 1)
            };
            break;
          }
          for (const tp of (s.topics || [])) {
            const foundTp = (tp.tests || []).find(t => candIds.some(cid => String(t.id) === cid || String(t.id).replace(/^tbt_/, '').replace(/^bt_/, '') === cid.replace(/^tbt_/, '').replace(/^bt_/, '')));
            if (foundTp) {
              matchedBookTest = {
                id: foundTp.id,
                testId: foundTp.id,
                testName: foundTp.name || foundTp.title || 'Test',
                bookTitle: matchedBook.title,
                bookId: matchedBook.id,
                subject: s.name || matchedBook.subject,
                unit: s.name,
                topic: tp.name,
                orderIndex: Number(foundTp.order ?? 1)
              };
              break;
            }
          }
          if (matchedBookTest) break;
        }
      }

      // Extract Clean Specific Test Name
      let specificTestName = matchedBookTest?.testName || sub.testName || sub.metadata?.testName || sub.metadata?.name || '';
      
      // If specificTestName contains (Tüm Kitap Görevi) or (Tüm Kitap), clean it
      if (specificTestName.includes('(Tüm Kitap Görevi)') || specificTestName.includes('(Tüm Kitap)')) {
        specificTestName = '';
      }

      if (!specificTestName) {
        const tTitle = sub.testTitle || sub.title || sub.metadata?.testTitle || '';
        if (tTitle.includes('—')) {
          const parts = tTitle.split('—').map(p => p.trim());
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('(Tüm Kitap')) {
            specificTestName = lastPart;
          }
        } else if (!tTitle.includes('(Tüm Kitap Görevi)') && !tTitle.includes('(Tüm Kitap)')) {
          specificTestName = tTitle;
        }
      }

      // Check if specificTestName is generic
      const isGeneric = !specificTestName ||
        specificTestName.trim().toLowerCase() === 'test sınavı' ||
        specificTestName.trim().toLowerCase() === 'test sinavi' ||
        specificTestName.trim().toLowerCase() === 'test' ||
        specificTestName.trim().toLowerCase() === 'ödev' ||
        specificTestName.trim().toLowerCase() === 'odev';

      // Fallback: extract test number from ID candidates
      if (isGeneric || !specificTestName) {
        for (const cid of candIds) {
          const m = String(cid).match(/(Test[-\s]?\d+|Yeni Nesil[-\s]?\d+|Ü\.?\s?Değ\.?[-\s]?\d+|Ünite Değerlendirme[-\s]?\d+)/i);
          if (m && !m[0].includes('Tüm Kitap')) {
            specificTestName = m[0].replace(/Ünite Değerlendirme/i, 'Ü. Değ.');
            break;
          }
          const numMatch = String(cid).match(/_(\d+)$/);
          if (numMatch) {
            specificTestName = `Test ${numMatch[1]}`;
            break;
          }
        }
      }

      // Determine clean book title
      const cleanBookTitle = (matchedBook?.title || matchedBookTest?.bookTitle || matchedHw?.title || '')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .trim();

      // Resolve final resolvedTitle
      let resolvedTitle = '';
      if (cleanBookTitle && specificTestName && !isGeneric) {
        resolvedTitle = `${cleanBookTitle} — ${specificTestName}`;
      } else if (specificTestName && !isGeneric) {
        resolvedTitle = specificTestName;
      } else if (matchedCurTest?.title) {
        resolvedTitle = matchedCurTest.title;
      } else if (matchedHw?.title && !matchedHw.title.includes('(Tüm Kitap')) {
        resolvedTitle = matchedHw.title;
      } else if (cleanBookTitle) {
        resolvedTitle = specificTestName ? `${cleanBookTitle} — ${specificTestName}` : `${cleanBookTitle} — Test`;
      } else if (matchedHw?.subject) {
        resolvedTitle = `${matchedHw.subject} Ödevi`;
      } else {
        resolvedTitle = 'Sınav Testi';
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
        bookId: matchedBook?.id || matchedBookTest?.bookId || sub.bookId || null,
        bookTitle: cleanBookTitle,
        specificTestName: specificTestName || resolvedTitle,
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

    return parsedSubs.filter(Boolean);
  }, [allSubmissions, activeHomeworks, allCurTestsMap, allBookTestsMap, bankQuestions, reviewedSubSet, SUBJECT_CONFIG, activeBooks, deletedBookIdsSet]);

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

  // Available Books for filtering with exact stats (Strictly active & non-deleted books only)
  const availableBooks = useMemo(() => {
    const bMap = new Map();

    testGroupedSubmissions.forEach(sub => {
      const bTitle = (sub.bookTitle || '').trim();
      const bId = sub.bookId || bTitle;
      if (!bTitle && !sub.bookId) return;

      // Absolute safety: ensure this book exists in activeBooks and is not deleted
      const bIdStr = String(sub.bookId || '');
      const bTitleLower = bTitle.toLowerCase();
      const isActive = activeBooks.some(b => {
        if (!b) return false;
        if (b.isDeleted || b.deleted || b.deleted_at) return false;
        const bid = String(b.id || '');
        if (bIdStr && (bid === bIdStr || toUUID(bid) === toUUID(bIdStr) || bid.replace(/^b_/, '') === bIdStr.replace(/^b_/, ''))) return true;
        const bt = String(b.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim().toLowerCase();
        return bt && (bt === bTitleLower || bTitleLower.includes(bt) || bt.includes(bTitleLower));
      });

      if (!isActive) return;

      const key = String(bId);
      if (!bMap.has(key)) {
        bMap.set(key, {
          id: key,
          bookId: sub.bookId,
          title: bTitle || 'Kitap',
          totalTests: 0,
          totalWrong: 0,
          totalBlank: 0,
          totalMistakes: 0
        });
      }

      const item = bMap.get(key);
      item.totalTests += 1;
      const wCount = sub.wrongQuestions?.length || 0;
      const bCount = sub.blankQuestions?.length || 0;
      item.totalWrong += wCount;
      item.totalBlank += bCount;
      item.totalMistakes += (wCount + bCount);
    });

    return Array.from(bMap.values()).sort((a, b) => b.totalTests - a.totalTests);
  }, [testGroupedSubmissions, activeBooks]);

  // Selected Book filter & view mode & print modal state
  const [selectedBookId, setSelectedBookId] = useState('all'); // 'all' | bookId / bookTitle
  const [bookMistakesViewMode, setBookMistakesViewMode] = useState('tests'); // 'tests' | 'questions'
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Auto-reset selectedBookId to 'all' if selected book was deleted
  useEffect(() => {
    if (selectedBookId !== 'all') {
      const exists = availableBooks.some(b => 
        String(b.id) === String(selectedBookId) || 
        String(b.title).toLowerCase() === String(selectedBookId).toLowerCase()
      );
      if (!exists) {
        setSelectedBookId('all');
      }
    }
  }, [availableBooks, selectedBookId]);

  const selectedBook = useMemo(() => {
    if (!selectedBookId || selectedBookId === 'all') return null;
    return availableBooks.find(b => String(b.id) === String(selectedBookId) || String(b.title).toLowerCase() === String(selectedBookId).toLowerCase()) || null;
  }, [availableBooks, selectedBookId]);

  // Filtered & Sorted Test Submissions for the active tab
  const filteredTestSubmissions = useMemo(() => {
    const list = currentTabBaseList.filter(sub => {
      const textMatch =
        !searchQuery.trim() ||
        (sub.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.unit || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.bookTitle || '').toLowerCase().includes(searchQuery.toLowerCase());

      const subjectMatch = !selectedSubject || selectedSubject === 'Tümü' || sub.subject === selectedSubject;
      const wrongMatch = !wrongOnlyFilter || sub.wrongQuestions.length > 0;

      const bookMatch =
        !selectedBookId ||
        selectedBookId === 'all' ||
        String(sub.bookId) === String(selectedBookId) ||
        String(sub.bookTitle).toLowerCase() === String(selectedBookId).toLowerCase() ||
        (sub.testTitle && sub.testTitle.toLowerCase().includes(String(selectedBookId).toLowerCase()));

      return textMatch && subjectMatch && wrongMatch && bookMatch;
    });

    // When sorting by book order, use sortItemsByBookOrder for true sequential book order
    if (sortBy === 'book_order') {
      return sortItemsByBookOrder(list, activeBooks, activeBookTests);
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
      }
      if (sortBy === 'wrong_desc') {
        const aW = a.wrongQuestions?.length || 0;
        const bW = b.wrongQuestions?.length || 0;
        return bW - aW;
      }
      if (sortBy === 'name_asc') {
        return (a.testTitle || '').localeCompare(b.testTitle || '', 'tr', { numeric: true });
      }
      return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
    });
  }, [currentTabBaseList, selectedSubject, searchQuery, wrongOnlyFilter, sortBy, selectedBookId, activeBooks, activeBookTests]);

  // Sequential question-by-question list of all wrong and blank questions for the selected book / filtered tests
  const bookSequentialMistakes = useMemo(() => {
    const orderedSubs = sortBy === 'book_order' 
      ? filteredTestSubmissions 
      : sortItemsByBookOrder(filteredTestSubmissions, activeBooks, activeBookTests);

    const questionsList = [];

    (orderedSubs || []).forEach(sub => {
      if (!sub) return;
      let rawAnswers = [];
      if (Array.isArray(sub.answers)) rawAnswers = sub.answers;
      else if (Array.isArray(sub.studentAnswers)) rawAnswers = sub.studentAnswers;
      else if (typeof sub.answers === 'string') {
        try { rawAnswers = JSON.parse(sub.answers); } catch {}
      } else if (typeof sub.studentAnswers === 'string') {
        try { rawAnswers = JSON.parse(sub.studentAnswers); } catch {}
      }
      if (!Array.isArray(rawAnswers)) rawAnswers = [];

      const testName = sub.specificTestName || (sub.testTitle?.includes('—') ? sub.testTitle.split('—').slice(1).join('—').trim() : sub.testTitle) || 'Test';

      // 1. Wrong questions
      (sub.wrongQuestions || []).forEach(wq => {
        if (!wq) return;
        const ans = Array.isArray(rawAnswers) ? (rawAnswers.find((a, idx) => {
          if (!a) return false;
          const qNum = a.subIndex !== undefined ? a.subIndex + 1 : (a.questionNo || idx + 1);
          return qNum === wq.qNum;
        }) || {}) : {};

        const bq = ans.questionId && Array.isArray(bankQuestions) ? bankQuestions.find(q => q && (String(q.id) === String(ans.questionId) || (toUUID(q.id) && String(toUUID(q.id)) === String(ans.questionId)))) : null;
        const imgUrl = ans.imageUrl || ans.image || ans.photoUrl || bq?.imageUrl || bq?.image || bq?.photoUrl || null;
        const qText = ans.questionText || ans.text || bq?.questionText || bq?.text || null;

        questionsList.push({
          subId: sub.id,
          testId: sub.testId,
          testName,
          bookTitle: sub.bookTitle,
          subject: sub.subject,
          unit: sub.unit,
          topic: sub.topic,
          qNum: wq.qNum,
          userAnswer: ans.userAnswer || 'Yanlış',
          correctAnswer: ans.correctAnswer || ans.key || bq?.correctAnswer || bq?.answer || '',
          isWrong: true,
          imageUrl: imgUrl,
          questionText: qText,
          submittedAt: sub.submittedAt
        });
      });

      // 2. Blank questions
      (sub.blankQuestions || []).forEach(bq => {
        if (!bq) return;
        const ans = Array.isArray(rawAnswers) ? (rawAnswers.find((a, idx) => {
          if (!a) return false;
          const qNum = a.subIndex !== undefined ? a.subIndex + 1 : (a.questionNo || idx + 1);
          return qNum === bq.qNum;
        }) || {}) : {};

        const bQuestion = ans.questionId && Array.isArray(bankQuestions) ? bankQuestions.find(q => q && (String(q.id) === String(ans.questionId) || (toUUID(q.id) && String(toUUID(q.id)) === String(ans.questionId)))) : null;
        const imgUrl = ans.imageUrl || ans.image || ans.photoUrl || bQuestion?.imageUrl || bQuestion?.image || bQuestion?.photoUrl || null;
        const qText = ans.questionText || ans.text || bQuestion?.questionText || bQuestion?.text || null;

        questionsList.push({
          subId: sub.id,
          testId: sub.testId,
          testName,
          bookTitle: sub.bookTitle,
          subject: sub.subject,
          unit: sub.unit,
          topic: sub.topic,
          qNum: bq.qNum,
          userAnswer: 'Boş Bırakıldı',
          correctAnswer: ans.correctAnswer || ans.key || bQuestion?.correctAnswer || bQuestion?.answer || '',
          isWrong: false,
          imageUrl: imgUrl,
          questionText: qText,
          submittedAt: sub.submittedAt
        });
      });
    });

    return questionsList;
  }, [filteredTestSubmissions, activeBooks, activeBookTests, bankQuestions, sortBy]);

  // CSV Export Function with UTF-8 BOM (\uFEFF) and semicolon (;) for Excel
  const handleExportCSV = (bookTitleName, subsToExport) => {
    const rows = [
      ['Kitap Adı', 'Ders', 'Ünite', 'Konu', 'Test Adı', 'Soru No', 'Öğrenci Cevabı', 'Doğru Cevap', 'Durum', 'Tarih']
    ];

    const targetList = Array.isArray(subsToExport) ? subsToExport : (Array.isArray(filteredTestSubmissions) ? filteredTestSubmissions : []);
    const orderedSubs = sortItemsByBookOrder(targetList, activeBooks, activeBookTests);

    (orderedSubs || []).forEach(sub => {
      if (!sub) return;
      let rawAnswers = [];
      if (Array.isArray(sub.answers)) rawAnswers = sub.answers;
      else if (Array.isArray(sub.studentAnswers)) rawAnswers = sub.studentAnswers;
      if (!Array.isArray(rawAnswers)) rawAnswers = [];

      const testName = sub.specificTestName || (sub.testTitle?.includes('—') ? sub.testTitle.split('—').slice(1).join('—').trim() : sub.testTitle) || 'Test';

      (sub.wrongQuestions || []).forEach(wq => {
        if (!wq) return;
        const ans = Array.isArray(rawAnswers) ? (rawAnswers.find((a, idx) => {
          if (!a) return false;
          const qNum = a.subIndex !== undefined ? a.subIndex + 1 : (a.questionNo || idx + 1);
          return qNum === wq.qNum;
        }) || {}) : {};
        rows.push([
          sub.bookTitle || bookTitleName || 'Kitap',
          sub.subject || '',
          sub.unit || '',
          sub.topic || '',
          testName,
          `Soru ${wq.qNum}`,
          ans.userAnswer || 'Yanlış',
          ans.correctAnswer || ans.key || '',
          'Yanlış',
          sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : ''
        ]);
      });

      (sub.blankQuestions || []).forEach(bq => {
        if (!bq) return;
        const ans = Array.isArray(rawAnswers) ? (rawAnswers.find((a, idx) => {
          if (!a) return false;
          const qNum = a.subIndex !== undefined ? a.subIndex + 1 : (a.questionNo || idx + 1);
          return qNum === bq.qNum;
        }) || {}) : {};
        rows.push([
          sub.bookTitle || bookTitleName || 'Kitap',
          sub.subject || '',
          sub.unit || '',
          sub.topic || '',
          testName,
          `Soru ${bq.qNum}`,
          'Boş',
          ans.correctAnswer || ans.key || '',
          'Boş',
          sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : ''
        ]);
      });
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (bookTitleName || 'Kitap_Yanlislari').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]/g, '_');
    link.setAttribute('download', `${cleanName}_Sıralı_Yanlışlar.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pagination for Test Submissions
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 20, 50, 'all'

  // Pagination for Görsel Hata Defterim
  const [notebookPage, setNotebookPage] = useState(1);
  const [notebookPageSize, setNotebookPageSize] = useState(12);

  // Reset page when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSubject, wrongOnlyFilter, sortBy, activeMainTab, reviewFilter, pageSize, selectedBookId]);

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
  const totalWrongQuestionsCount = useMemo(() => (testGroupedSubmissions || []).reduce((acc, sub) => acc + (sub?.wrongQuestions?.length || 0), 0), [testGroupedSubmissions]);
  const totalBlankQuestionsCount = useMemo(() => (testGroupedSubmissions || []).reduce((acc, sub) => acc + (sub?.blankQuestions?.length || 0), 0), [testGroupedSubmissions]);
  const currentWrongCount = useMemo(() => (currentTabBaseList || []).reduce((acc, sub) => acc + (sub?.wrongQuestions?.length || 0), 0), [currentTabBaseList]);
  const currentBlankCount = useMemo(() => (currentTabBaseList || []).reduce((acc, sub) => acc + (sub?.blankQuestions?.length || 0), 0), [currentTabBaseList]);

  // Spaced Repetition (Leitner) Flat Questions & Overview (SADECE Özel & Atanan Telafi Testleri)
  const allFlatWrongQuestions = useMemo(() => {
    const list = [];
    const seenQuestionKeys = new Set();

    // 1. Create quick lookup map for remedial tests
    const remedialMap = new Map();
    (remedialTests || []).forEach(rt => {
      if (rt?.id) {
        remedialMap.set(String(rt.id), rt);
        if (toUUID(rt.id)) remedialMap.set(String(toUUID(rt.id)), rt);
      }
    });

    // 2. Scan testGroupedSubmissions strictly for remedial tests only
    (testGroupedSubmissions || []).forEach(sub => {
      const subIdStr = String(sub.testId || sub.hwId || sub.id || '');
      const subTitle = String(sub.testTitle || sub.title || 'Test');
      const titleLower = subTitle.toLowerCase();

      const matchedRemedial = remedialMap.get(subIdStr) ||
                              (sub.metadata?.realTestId ? remedialMap.get(String(sub.metadata.realTestId)) : null) ||
                              (sub.testId ? remedialMap.get(String(sub.testId)) : null) ||
                              (sub.hwId ? remedialMap.get(String(sub.hwId)) : null);

      const isRemedial = Boolean(
        matchedRemedial ||
        sub.isRemedialTest === true ||
        sub.isRemedial === true ||
        sub.isTeacherRemedial === true ||
        sub.teacherAssigned === true ||
        sub.sourceType === 'pdfSlicerRemedial' ||
        sub.sourceType === 'pdfSlicer' ||
        sub.type === 'remedial' ||
        sub.type === 'remedialTest' ||
        sub.taskType === 'remedialTest' ||
        titleLower.includes('telafi') ||
        titleLower.includes('kırpılmış') ||
        titleLower.includes('kirpilmis')
      );

      // SADECE TELAFİ TESTLERİ
      if (!isRemedial) {
        return;
      }

      const testSourceObj = matchedRemedial || sub || null;
      let resolvedQuestions = [];
      if (testSourceObj) {
        resolvedQuestions = (testSourceObj.questionsList && testSourceObj.questionsList.length > 0)
          ? testSourceObj.questionsList
          : resolveTestQuestions(testSourceObj, bankQuestions || []);
      }

      // Both wrong questions and blank questions
      const mistakeItems = [...(sub.wrongQuestions || [])];

      mistakeItems.forEach(wq => {
        const qNum = wq.qNum || 1;
        const qIdx = (typeof qNum === 'number' ? qNum - 1 : 0);
        const resolvedQ = resolvedQuestions[qIdx] || {};

        const qKey = `${sub.id || subIdStr}_${qNum}`;
        if (seenQuestionKeys.has(qKey)) return;
        seenQuestionKeys.add(qKey);

        const qImage = resolvedQ.imageUrl ||
                       wq.imageUrl ||
                       (Array.isArray(testSourceObj?.imageUrls) ? testSourceObj.imageUrls[qIdx] : null) ||
                       (testSourceObj?.imageUrl && qIdx === 0 ? testSourceObj.imageUrl : null) ||
                       null;

        const qText = resolvedQ.questionText ||
                      resolvedQ.text ||
                      resolvedQ.title ||
                      wq.questionText ||
                      `${subTitle} — Soru ${qNum}`;

        const qOptions = resolvedQ.options || wq.options || ['A', 'B', 'C', 'D', 'E'];
        const qCorrect = resolvedQ.correctAnswer !== undefined
          ? resolvedQ.correctAnswer
          : (typeof resolvedQ.correctAnswerLetter === 'string'
              ? (resolvedQ.correctAnswerLetter.toUpperCase().charCodeAt(0) - 65)
              : (wq.correctAnswer ?? 0));

        list.push({
          id: qKey,
          questionId: wq.questionId || qKey,
          testId: sub.id || subIdStr,
          testTitle: sub.testTitle || subTitle,
          subject: sub.subject || resolvedQ.subject || 'Ders',
          questionNo: qNum,
          questionText: qText,
          options: qOptions,
          optionCount: resolvedQ.optionCount || (qOptions ? qOptions.length : 5),
          correctAnswer: qCorrect,
          correctAnswerLetter: resolvedQ.correctAnswerLetter || String.fromCharCode(65 + qCorrect),
          imageUrl: qImage,
          isRemedialTest: true,
          isQuestionBank: false
        });
      });
    });

    // 3. ALSO scan remedialTests array directly with submissions (for 100% guarantee)
    (remedialTests || []).forEach(test => {
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

      if (!sub) return;

      const rawAnswers = sub.answers || sub.studentAnswers || [];
      const resolvedQuestions = (test.questionsList && test.questionsList.length > 0)
        ? test.questionsList
        : resolveTestQuestions(test, bankQuestions || []);

      const wrongList = [];
      if (Array.isArray(rawAnswers) && rawAnswers.length > 0) {
        rawAnswers.forEach((ans, idx) => {
          const qNum = ans.subIndex !== undefined ? ans.subIndex + 1 : (ans.questionNo || idx + 1);
          if (ans.isCorrect === false) {
            wrongList.push({ qNum, questionId: ans.questionId, ...ans });
          }
        });
      } else {
        const wCount = sub.wrongCount !== undefined ? sub.wrongCount : (sub.wrong_count || 0);
        for (let i = 1; i <= wCount; i++) wrongList.push({ qNum: i });
      }

      wrongList.forEach(wq => {
        const qNum = wq.qNum || 1;
        const qIdx = (typeof qNum === 'number' ? qNum - 1 : 0);
        const resolvedQ = resolvedQuestions[qIdx] || {};

        const qKey = `${test.id}_${qNum}`;
        if (seenQuestionKeys.has(qKey)) return;
        seenQuestionKeys.add(qKey);

        const qImage = resolvedQ.imageUrl ||
                       wq.imageUrl ||
                       (Array.isArray(test.imageUrls) ? test.imageUrls[qIdx] : null) ||
                       (test.imageUrl && qIdx === 0 ? test.imageUrl : null) ||
                       null;

        const qText = resolvedQ.questionText ||
                      resolvedQ.text ||
                      resolvedQ.title ||
                      wq.questionText ||
                      `${test.title || test.name || 'Telafi Testi'} — Soru ${qNum}`;

        const qOptions = resolvedQ.options || wq.options || ['A', 'B', 'C', 'D', 'E'];
        const qCorrect = resolvedQ.correctAnswer !== undefined
          ? resolvedQ.correctAnswer
          : (typeof resolvedQ.correctAnswerLetter === 'string'
              ? (resolvedQ.correctAnswerLetter.toUpperCase().charCodeAt(0) - 65)
              : (wq.correctAnswer ?? 0));

        list.push({
          id: qKey,
          questionId: wq.questionId || qKey,
          testId: test.id,
          testTitle: test.title || test.name || 'Özel Telafi Testi',
          subject: test.subject || resolvedQ.subject || 'Ders',
          questionNo: qNum,
          questionText: qText,
          options: qOptions,
          optionCount: resolvedQ.optionCount || (qOptions ? qOptions.length : 5),
          correctAnswer: qCorrect,
          correctAnswerLetter: resolvedQ.correctAnswerLetter || String.fromCharCode(65 + qCorrect),
          imageUrl: qImage,
          isRemedialTest: true,
          isQuestionBank: false
        });
      });
    });

    return list;
  }, [testGroupedSubmissions, remedialTests, submissions, allStudentIds, bankQuestions]);

  const leitnerOverview = useMemo(() => {
    const sId = selectedStudent?.id || currentUser?.id || 'default_student';
    return getLeitnerOverview(sId, allFlatWrongQuestions);
  }, [selectedStudent, currentUser, allFlatWrongQuestions]);

  // Test-Based Leitner Spaced Repetition Data (Özel Telafi Testleri Aşamaları & Sonuçları)
  const remedialTestsLeitnerData = useMemo(() => {
    const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const categorizedTests = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const allEnrichedTests = [];

    (remedialTests || []).forEach(test => {
      // Find all submissions for this test sorted chronologically (STRICT TEST ID MATCH ONLY)
      const testSubs = (submissions || []).filter(s => {
        if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
        const sStdId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
        const isMatchStudent = allStudentIds.has(sStdId) || (toUUID(sStdId) && allStudentIds.has(toUUID(sStdId)));
        if (!isMatchStudent) return false;

        const sTestId = String(s.testId || s.hwId || s.metadata?.realTestId || '');
        const tId = String(test.id || test.testId || '');

        return Boolean(
          sTestId && (
            sTestId === tId ||
            (toUUID(tId) && toUUID(sTestId) === toUUID(tId))
          )
        );
      }).sort((a, b) => new Date(a.submittedAt || a.createdAt || 0) - new Date(b.submittedAt || b.createdAt || 0));

      const totalQ = Number(test.questionCount || test.totalQuestions || test.questionsList?.length || 1);
      const solveCount = testSubs.length;

      // Extract stage-by-stage results (1 to 5)
      const stageResults = [1, 2, 3, 4, 5].map(stgNum => {
        const subForStage = testSubs[stgNum - 1] || null;
        if (!subForStage) return null;
        const c = subForStage.correctCount ?? subForStage.correct_count ?? subForStage.correct ?? 0;
        const w = subForStage.wrongCount ?? subForStage.wrong_count ?? subForStage.wrong ?? 0;
        const e = subForStage.emptyCount ?? subForStage.blankCount ?? subForStage.empty ?? Math.max(0, totalQ - c - w);
        const net = subForStage.net ?? subForStage.netScore ?? Number(Math.max(0, c - (w / 3)).toFixed(2));
        const pct = subForStage.scorePercentage ?? (totalQ > 0 ? Math.round((c / totalQ) * 100) : 0);
        return {
          stage: stgNum,
          submissionId: subForStage.id,
          correct: c,
          wrong: w,
          blank: e,
          net,
          scorePercentage: pct,
          date: subForStage.submittedAt || subForStage.createdAt,
          subObj: subForStage
        };
      });

      const latestSub = testSubs.length > 0 ? testSubs[testSubs.length - 1] : null;
      const latestStageResult = latestSub ? stageResults[testSubs.length - 1] : null;
      const isMastered = latestStageResult?.scorePercentage === 100 || (latestStageResult && latestStageResult.wrong === 0 && latestStageResult.blank === 0);

      // Active Box Level:
      let activeBoxLevel = 1;
      if (isMastered) {
        activeBoxLevel = 5;
      } else if (solveCount === 0) {
        activeBoxLevel = 1;
      } else if (solveCount === 1) {
        activeBoxLevel = 2;
      } else if (solveCount === 2) {
        activeBoxLevel = 3;
      } else if (solveCount === 3) {
        activeBoxLevel = 4;
      } else {
        activeBoxLevel = 5;
      }

      const enrichedItem = {
        ...test,
        solveCount,
        isSolved: solveCount > 0,
        isMastered,
        activeBoxLevel,
        totalQuestions: totalQ,
        stageResults,
        latestStageResult,
        submissions: testSubs,
        latestSub
      };

      allEnrichedTests.push(enrichedItem);
      boxCounts[activeBoxLevel] = (boxCounts[activeBoxLevel] || 0) + 1;
      categorizedTests[activeBoxLevel].push(enrichedItem);
    });

    return {
      boxCounts,
      categorizedTests,
      allEnrichedTests,
      totalTests: allEnrichedTests.length
    };
  }, [remedialTests, submissions, allStudentIds]);

  // Available Homework options for Add Modal
  const availableHomeworkOptions = useMemo(() => {
    if (!selectedStudent) return [];
    const map = new Map();

    (testGroupedSubmissions || []).forEach(sub => {
      if (!sub) return;
      map.set(sub.id, {
        id: sub.id,
        title: sub.testTitle || 'Sınav / Ödev',
        subject: sub.subject || 'Matematik',
        unit: sub.unit || '',
        topic: sub.topic || '',
        wrongCount: sub.wrongQuestions?.length || 0,
        blankCount: sub.blankQuestions?.length || 0,
        date: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : ''
      });
    });

    activeHomeworks.filter(hw => hw.studentId === selectedStudent.id || (hw.targetIds && hw.targetIds.includes(selectedStudent.id)))
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
  }, [testGroupedSubmissions, activeHomeworks, selectedStudent]);

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

    // 2.5. Scan activeHomeworks in HomeworkContext
    (activeHomeworks || []).forEach(hw => {
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
  }, [allSubmissions, activeHomeworks, studentErrors, currentWrongCount, currentBlankCount, selectedStudent, currentUser, isDark]);

  const mistakeChartData = useMemo(() => {
    if (!overallMistakeStats?.reasonDefs) return [];
    return Object.values(overallMistakeStats.reasonDefs).filter(Boolean).map(r => ({
      name: r.key || '',
      shortName: (r.key || '').replace(/^[^\w\s\u00C0-\u017F]*\s*/, ''),
      count: Number(r.count) || 0,
      percentage: overallMistakeStats.totalClassified > 0 ? Math.round(((r.count || 0) / overallMistakeStats.totalClassified) * 100) : 0,
      color: r.color || '#3b82f6',
      bg: r.bg || 'rgba(59,130,246,0.1)',
      border: r.border || '#bfdbfe'
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
    const safeTotalCount = Number(totalCount) || 0;
    if (safeTotalCount <= 0) return null;
    const safeTotal = Math.max(1, Number(total) || 1);
    const safeCurrent = Math.min(Math.max(1, Number(current) || 1), safeTotal);
    const numSize = size === 'all' ? safeTotalCount : (Number(size) || 10);
    const startIdx = size === 'all' ? 1 : (safeCurrent - 1) * numSize + 1;
    const endIdx = size === 'all' ? safeTotalCount : Math.min(safeCurrent * numSize, safeTotalCount);

    const getPageNumbers = () => {
      if (safeTotal <= 7) {
        return Array.from({ length: safeTotal }, (_, i) => i + 1);
      }
      if (safeCurrent <= 4) {
        return [1, 2, 3, 4, 5, '...', safeTotal];
      }
      if (safeCurrent >= safeTotal - 3) {
        return [1, '...', safeTotal - 4, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
      }
      return [1, '...', safeCurrent - 1, safeCurrent, safeCurrent + 1, '...', safeTotal];
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
    <div className="wa-root-container" style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      backgroundImage: isDark
        ? 'radial-gradient(ellipse at 15% 15%, rgba(239, 68, 68, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(99, 102, 241, 0.10) 0%, transparent 45%), var(--color-bg)'
        : 'radial-gradient(ellipse at 15% 15%, rgba(239, 68, 68, 0.06) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(99, 102, 241, 0.05) 0%, transparent 45%), var(--color-bg)',
      padding: '1.25rem 1.25rem 60px',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text)',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .wa-root-container {
            padding: 0.75rem 0.65rem calc(75px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
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
          <div className="wa-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0.55rem 0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: isDark ? '#ffffff' : '#1e293b',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <ArrowLeft size={16} /> Öğrenci Paneli
            </button>

            <button
              onClick={() => navigate('/study-room')}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '12px',
                padding: '0.55rem 0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 900,
                fontSize: '0.82rem',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                boxShadow: '0 3px 10px rgba(245,158,11,0.3)'
              }}
            >
              <Play size={13} fill="#ffffff" /> ⏱️ Çalışma Odası
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
                        const sTestId = String(s.testId || s.hwId || s.metadata?.realTestId || '');
                        const tId = String(test.id || test.testId || '');
                        return Boolean(
                          sTestId && (
                            sTestId === tId ||
                            (toUUID(tId) && toUUID(sTestId) === toUUID(tId))
                          )
                        );
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

                      const matchedHw = (activeHomeworks || []).find(h => String(h.id) === String(test.id) || String(h.id) === String(test.hwId));
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
                                (() => {
                                  const lockStatus = getRemedialLockStatus(test, null, submissions, selectedStudent?.id || currentUser?.id);
                                  if (lockStatus.isLocked) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => alert(lockStatus.lockMessage)}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: 7,
                                          background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                                          color: isDark ? '#94a3b8' : '#64748b',
                                          fontSize: '0.74rem',
                                          fontWeight: 900,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          whiteSpace: 'nowrap'
                                        }}
                                        title={lockStatus.lockMessage}
                                      >
                                        <Lock size={12} color="#f59e0b" /> <span>{lockStatus.daysLeft === 1 ? 'Yarın Açılacak' : lockStatus.formattedDate}</span>
                                      </button>
                                    );
                                  }
                                  return (
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
                                  );
                                })()
                              )}

                              {/* Delete Button (Only for teacher/admin or custom self-created tests) */}
                              {(currentUser?.role === 'teacher' || currentUser?.role === 'admin' || (!Boolean(test.teacherAssigned || test.isTeacherRemedial || test.assignedTeacherId || test.createdBy === 'teacher' || test.source === 'teacher') && test.createdBy === currentUser?.id)) && (
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
                              )}
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
                    const sTestId = String(s.testId || s.hwId || s.metadata?.realTestId || '');
                    const tId = String(test.id || test.testId || '');
                    return Boolean(
                      sTestId && (
                        sTestId === tId ||
                        (toUUID(tId) && toUUID(sTestId) === toUUID(tId))
                      )
                    );
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

                  const matchedHw = (activeHomeworks || []).find(h => String(h.id) === String(test.id) || String(h.id) === String(test.hwId));
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
                            (() => {
                              const lockStatus = getRemedialLockStatus(test, null, submissions, selectedStudent?.id || currentUser?.id);
                              if (lockStatus.isLocked) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => alert(lockStatus.lockMessage)}
                                    style={{
                                      flex: 1,
                                      padding: '7px 12px',
                                      borderRadius: 8,
                                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                      border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                                      color: isDark ? '#94a3b8' : '#64748b',
                                      fontSize: '0.76rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6
                                    }}
                                    title={lockStatus.lockMessage}
                                  >
                                    <Lock size={13} color="#f59e0b" />
                                    <span>{lockStatus.daysLeft === 1 ? 'Yarın Açılacak' : lockStatus.formattedDate}</span>
                                  </button>
                                );
                              }
                              return (
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
                              );
                            })()
                          )}

                          {/* Delete Button (Only for teacher/admin or custom self-created tests) */}
                          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin' || (!Boolean(test.teacherAssigned || test.isTeacherRemedial || test.assignedTeacherId || test.createdBy === 'teacher' || test.source === 'teacher') && test.createdBy === currentUser?.id)) && (
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
                          )}
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

            {/* KİTAP SEÇİMİ VE SIRALI KİTAP YANLIŞLARI PANELİ */}
            {availableBooks.length > 0 && (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '16px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: selectedBook ? '0.75rem' : '0'
                }}>
                  {/* Kitap Seçici Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px' }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <BookOpen size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Kitap / Kaynak Filtresi
                      </div>
                      <select
                        value={selectedBookId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedBookId(val);
                          if (val !== 'all') {
                            setSortBy('book_order');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 8,
                          border: '1.5px solid var(--color-border-input)',
                          background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          outline: 'none',
                          cursor: 'pointer',
                          marginTop: 2
                        }}
                      >
                        <option value="all">📚 Tüm Kitaplar & Sınavlar ({currentTabBaseList.length} Test)</option>
                        {availableBooks.map(b => (
                          <option key={b.id} value={b.id}>
                            📖 {b.title} ({b.totalTests} Test • {b.totalWrong} Yanlış • {b.totalBlank} Boş)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hızlı Kitap Çipleri */}
                  <div className="wa-scroll-x" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flex: '2 1 300px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookId('all')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 8,
                        border: selectedBookId === 'all' ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                        background: selectedBookId === 'all' ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'var(--color-surface-hover)',
                        color: selectedBookId === 'all' ? '#6366f1' : 'var(--color-text-muted)',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Tümü ({currentTabBaseList.length})
                    </button>
                    {availableBooks.map(b => {
                      const isSel = selectedBookId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBookId(b.id);
                            setSortBy('book_order');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0.35rem 0.75rem',
                            borderRadius: 8,
                            border: isSel ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                            background: isSel ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'var(--color-surface-hover)',
                            color: isSel ? '#6366f1' : 'var(--color-text)',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{b.title}</span>
                          <span style={{
                            background: isSel ? '#6366f1' : 'var(--color-surface)',
                            color: isSel ? '#ffffff' : '#ef4444',
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            padding: '0.1rem 0.35rem',
                            borderRadius: 99
                          }}>
                            {b.totalWrong} Y
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seçili Kitap Bilgi & İndirme & Görünüm Çubuğu */}
                {selectedBook && (
                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    {/* Kitap İstatistikleri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        📖 {selectedBook.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                        <span style={{ background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff', color: '#6366f1', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                          {selectedBook.totalTests} Test Çözüldü
                        </span>
                        <span style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                          ❌ {selectedBook.totalWrong} Yanlış
                        </span>
                        <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                          ⚪ {selectedBook.totalBlank} Boş
                        </span>
                      </div>
                    </div>

                    {/* Aksiyon Butonları (Yazdır / PDF İndir & Excel İndir & Görünüm Değiştir) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setShowPrintModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '0.45rem 0.85rem',
                          borderRadius: 8,
                          border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(99,102,241,0.25)'
                        }}
                        title="Tüm yanlış ve boş soruları A4 çalışma fasikülü olarak yazdır veya PDF olarak indir"
                      >
                        <Printer size={14} />
                        <span>Fasikülü Yazdır / PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportCSV(selectedBook.title, filteredTestSubmissions)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '0.45rem 0.85rem',
                          borderRadius: 8,
                          border: '1.5px solid #10b981',
                          background: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4',
                          color: '#10b981',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                        title="Tüm soruları Excel uyumlu CSV olarak indir"
                      >
                        <FileSpreadsheet size={14} />
                        <span>Excel İndir</span>
                      </button>

                      {/* Görünüm Modu: Test Sıralı vs Soru Soru Sıralı */}
                      <div style={{ display: 'inline-flex', background: 'var(--color-surface-hover)', padding: 2, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => setBookMistakesViewMode('tests')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '0.35rem 0.6rem',
                            borderRadius: 6,
                            border: 'none',
                            background: bookMistakesViewMode === 'tests' ? (isDark ? 'rgba(99,102,241,0.25)' : '#eff6ff') : 'transparent',
                            color: bookMistakesViewMode === 'tests' ? '#6366f1' : 'var(--color-text-muted)',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Table size={12} />
                          <span>Test Sıralı</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookMistakesViewMode('questions')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '0.35rem 0.6rem',
                            borderRadius: 6,
                            border: 'none',
                            background: bookMistakesViewMode === 'questions' ? (isDark ? 'rgba(99,102,241,0.25)' : '#eff6ff') : 'transparent',
                            color: bookMistakesViewMode === 'questions' ? '#6366f1' : 'var(--color-text-muted)',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          <List size={12} />
                          <span>Soru Soru Yanlışlar ({selectedBook.totalWrong + selectedBook.totalBlank})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* GÖRÜNÜM: SORU SORU SIRALI YANLIŞLAR VEYA TEST TABLOSU/KARTLARI */}
            {bookMistakesViewMode === 'questions' && selectedBook ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {bookSequentialMistakes.map((item, idx) => (
                  <div
                    key={`${item.subId}_${item.qNum}_${idx}`}
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 14,
                      border: '1.5px solid var(--color-border)',
                      padding: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: '#6366f1', color: '#fff', fontSize: '0.74rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: 8 }}>
                          {item.testName} — Soru {item.qNum}
                        </span>
                        {item.unit && (
                          <span style={{ background: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff', color: isDark ? '#93c5fd' : '#1e40af', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                            📖 {item.unit}
                          </span>
                        )}
                        {item.topic && (
                          <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                            📌 {item.topic}
                          </span>
                        )}
                        <span style={{
                          background: item.isWrong ? (isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2') : (isDark ? 'rgba(245,158,11,0.2)' : '#fffbeb'),
                          color: item.isWrong ? '#ef4444' : '#f59e0b',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 6
                        }}>
                          {item.isWrong ? '❌ Yanlış' : '⚪ Boş'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleOpenReview(item.subId, e)}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>Sınavı Aç</span>
                        <ExternalLink size={13} />
                      </button>
                    </div>

                    {/* Question content: image or text */}
                    {item.imageUrl && (
                      <div style={{ marginBottom: 12, textAlign: 'center', background: '#00000005', borderRadius: 10, padding: 8 }}>
                        <img
                          src={item.imageUrl}
                          alt={`Soru ${item.qNum}`}
                          style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain', borderRadius: 8 }}
                        />
                      </div>
                    )}
                    {item.questionText && (
                      <div style={{ fontSize: '0.86rem', color: 'var(--color-text)', lineHeight: 1.5, marginBottom: 10, fontWeight: 600 }}>
                        {item.questionText}
                      </div>
                    )}

                    {/* Answers row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '0.5rem 0.75rem',
                      borderRadius: 10,
                      background: 'var(--color-surface-hover)',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      <div>
                        Öğrenci Cevabı:{' '}
                        <span style={{ color: item.isWrong ? '#ef4444' : 'var(--color-text-muted)', fontWeight: 900 }}>
                          {item.userAnswer || (item.isWrong ? 'Yanlış' : 'Boş')}
                        </span>
                      </div>
                      {item.correctAnswer && (
                        <div>
                          Doğru Cevap:{' '}
                          <span style={{ color: '#10b981', fontWeight: 900 }}>
                            {item.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {bookSequentialMistakes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                    Bu kitaba ait yanlış veya boş soru bulunamadı. Tebrikler! 🎉
                  </div>
                )}
              </div>
            ) : (
              <>
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
                      if (!sub) return null;
                      const cfg = SUBJECT_CONFIG[sub.subject] || SUBJECT_CONFIG['Matematik'] || SUBJECT_CONFIG['Tümü'] || { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' };
                      const wrongList = Array.isArray(sub.wrongQuestions) ? sub.wrongQuestions : [];
                      const blankList = Array.isArray(sub.blankQuestions) ? sub.blankQuestions : [];
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {sub.testTitle && sub.testTitle.includes('—') ? (
                                <>
                                  <span style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                    {sub.testTitle.split('—')[0].trim()}
                                  </span>
                                  <span style={{ fontWeight: 900, color: 'var(--color-text)', fontSize: '0.9rem' }}>
                                    {sub.testTitle.split('—').slice(1).join('—').trim()}
                                  </span>
                                </>
                              ) : (
                                <span style={{ fontWeight: 900, color: 'var(--color-text)', fontSize: '0.9rem' }}>
                                  {sub.testTitle || 'Test Sınavı'}
                                </span>
                              )}
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
                            {wrongList.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {wrongList.map(q => (
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
                            {blankList.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {blankList.map(q => (
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
                  if (!sub) return null;
                  const cfg = SUBJECT_CONFIG[sub.subject] || SUBJECT_CONFIG['Matematik'] || SUBJECT_CONFIG['Tümü'] || { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' };
                  const wrongList = Array.isArray(sub.wrongQuestions) ? sub.wrongQuestions : [];
                  const blankList = Array.isArray(sub.blankQuestions) ? sub.blankQuestions : [];
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
                        <div style={{ margin: '0 0 6px' }}>
                          {sub.testTitle && sub.testTitle.includes('—') ? (
                            <>
                              <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 2 }}>
                                {sub.testTitle.split('—')[0].trim()}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.3 }}>
                                {sub.testTitle.split('—').slice(1).join('—').trim()}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>
                              {sub.testTitle || 'Test Sınavı'}
                            </div>
                          )}
                        </div>
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
                          <span style={{ color: '#ef4444' }}>❌ {wrongList.length} Yanlış</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>⚪ {blankList.length} Boş</span>
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
              </>
            )}
          </div>
        )}

        {/* ─── SEKME 3: ARALIKLI TEKRAR (LEITNER 5-KUTU) TEST BAZLI SİSTEM ─── */}
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
                    Özel telafi testlerinizdeki aşama aşama başarı ve pekiştirme sonuçlarını (1, 3, 7 ve 15 gün aralıklarla) takip edin.
                  </p>
                </div>
              </div>

              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#6366f1',
                background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                padding: '0.35rem 0.85rem',
                borderRadius: 99,
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <BookOpen size={13} />
                <span>Toplam {remedialTestsLeitnerData.totalTests} Telafi Testi</span>
              </div>
            </div>

            {/* 5 Box Level Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.25rem'
            }}>
              {LEITNER_BOX_CONFIG.map(box => {
                const count = remedialTestsLeitnerData.boxCounts[box.level] || 0;
                const hasItems = count > 0;
                const isSelected = selectedLeitnerBoxLevel === box.level;
                return (
                  <div
                    key={box.level}
                    onClick={() => setSelectedLeitnerBoxLevel(isSelected ? 'all' : box.level)}
                    style={{
                      background: hasItems ? box.bg : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                      border: isSelected ? `2.5px solid ${box.color}` : (hasItems ? `1.5px solid ${box.border}` : '1.5px solid var(--color-border)'),
                      borderRadius: 14,
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.02)' : 'none',
                      boxShadow: isSelected ? `0 6px 18px ${box.color}25` : 'none',
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
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: hasItems ? box.color : 'var(--color-text-muted)',
                      background: hasItems ? 'var(--color-surface)' : 'transparent',
                      padding: '2px 8px',
                      borderRadius: 8
                    }}>
                      {count} Test
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aşama Filtre Butonları */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: '1rem',
              padding: '4px',
              background: 'var(--color-surface-hover)',
              borderRadius: 12,
              border: '1px solid var(--color-border)'
            }}>
              <button
                type="button"
                onClick={() => setSelectedLeitnerBoxLevel('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedLeitnerBoxLevel === 'all' ? '#6366f1' : 'transparent',
                  color: selectedLeitnerBoxLevel === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tüm Telafi Testleri ({remedialTestsLeitnerData.totalTests})
              </button>

              {LEITNER_BOX_CONFIG.map(box => {
                const count = remedialTestsLeitnerData.boxCounts[box.level] || 0;
                const isActive = selectedLeitnerBoxLevel === box.level;
                return (
                  <button
                    key={box.level}
                    type="button"
                    onClick={() => setSelectedLeitnerBoxLevel(box.level)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: isActive ? box.color : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{box.icon}</span>
                    <span>{box.label} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Telafi Test Kartları Listesi */}
            {(() => {
              const displayedTests = (remedialTestsLeitnerData.allEnrichedTests || []).filter(test => {
                if (selectedLeitnerBoxLevel === 'all') return true;
                return test.activeBoxLevel === selectedLeitnerBoxLevel || (test.stageResults && test.stageResults[selectedLeitnerBoxLevel - 1] !== null);
              });

              if (displayedTests.length === 0) {
                return (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    background: 'var(--color-surface)',
                    borderRadius: 16,
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>🌱</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      Bu Aşamada Henüz Telafi Testiniz Bulunmuyor
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                      Yukarıdaki filtreden diğer aşamalara veya Tüm Testler seçeneğine göz atabilirsiniz.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.25rem' }}>
                  {displayedTests.map((test, tIdx) => {
                    const sStyle = SUBJECT_CONFIG[test.subject] || SUBJECT_CONFIG['Tümü'];
                    const isTeacherAssigned = test.teacherAssigned || test.createdByRole === 'teacher' || test.assignedBy === 'teacher' || test.assignedTeacherId;
                    const studentProfile = (coachingProfiles || []).find(p => {
                      if (!p) return false;
                      const pSid = String(p.studentId || p.userId || p.id || '');
                      const curSid = String(currentStudentId || '');
                      return pSid === curSid || (curSid && toUUID(curSid) === toUUID(pSid));
                    });
                    const weeklyProg = studentProfile?.weeklyProgram || [];
                    const progDaysWithTest = [];
                    (weeklyProg || []).forEach(dayObj => {
                      if (dayObj && Array.isArray(dayObj.items)) {
                        const hasTest = dayObj.items.some(it =>
                          String(it.testId || it.realTestId || it.hwId || it.id) === String(test.id) ||
                          (test.title && it.title && it.title.toLowerCase().trim() === test.title.toLowerCase().trim())
                        );
                        if (hasTest) progDaysWithTest.push(dayObj.day);
                      }
                    });
                    const isInProgram = progDaysWithTest.length > 0;
                    const latestResult = test.latestStageResult;
                    const latestWrong = latestResult?.wrong || 0;
                    const latestBlank = latestResult?.blank || 0;

                    return (
                      <div
                        key={test.id || tIdx}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: 16,
                          padding: '1.1rem 1.25rem',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12
                        }}
                      >
                        {/* 1. Üst Başlık & Bilgi Satırı */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 260 }}>
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
                                📝 {test.totalQuestions} Soru
                              </span>

                              {isTeacherAssigned ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid rgba(59,130,246,0.3)'
                                }}>
                                  👨‍🏫 Öğretmen Atadı
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  background: isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff',
                                  color: '#7c3aed',
                                  border: '1px solid rgba(139,92,246,0.3)'
                                }}>
                                  👤 Kendi Hazırladığım
                                </span>
                              )}

                              {test.isMastered && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 900,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  background: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                                  color: '#059669',
                                  border: '1px solid rgba(16,185,129,0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}>
                                  🏆 %100 Ustalaşıldı
                                </span>
                              )}
                            </div>

                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: 'var(--color-text)' }}>
                              {test.title || test.name || 'Özel Telafi Testi'}
                            </h4>

                            {test.bookTitle && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2, fontWeight: 600 }}>
                                📚 {test.bookTitle}
                              </div>
                            )}
                          </div>

                          {/* Sağ: Hızlı İşlem Butonları */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const stId = selectedStudent?.id || currentUser?.id;
                                navigate(`/quiz/${test.id}?studentId=${stId}&retake=true&mode=solve`, { state: { from: '/student/wrong-answers', retake: true, mode: 'solve' } });
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.76rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 3px 8px rgba(99,102,241,0.3)'
                              }}
                            >
                              <RotateCcw size={13} /> <span>Testi Tekrar Çöz</span>
                            </button>

                            {latestResult && (latestWrong > 0 || latestBlank > 0) && (
                              <button
                                type="button"
                                onClick={() => handlePracticeTestMistakes(test, test.latestSub)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Zap size={13} /> <span>Yanlışları Tekrarla ({latestWrong})</span>
                              </button>
                            )}

                            {test.isSolved && test.latestSub && (
                              <button
                                type="button"
                                onClick={() => {
                                  const stId = selectedStudent?.id || currentUser?.id;
                                  navigate(`/quiz-review/${test.id}?studentId=${stId}&submissionId=${test.latestSub.id}`, { state: { from: '/student/wrong-answers' } });
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
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}
                              >
                                <Eye size={13} /> <span>İncele</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. AŞAMA AŞAMA SONUÇ ŞERİDİ (1. Aşama Sonucu, 2. Aşama Sonucu...) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          gap: 8,
                          background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                          padding: '10px',
                          borderRadius: 12,
                          border: '1px solid var(--color-border)'
                        }}>
                          {LEITNER_BOX_CONFIG.map(box => {
                            const stageIndex = box.level - 1;
                            const result = test.stageResults ? test.stageResults[stageIndex] : null;
                            const isCurrentTarget = test.activeBoxLevel === box.level && !result;
                            const isLocked = box.level > test.activeBoxLevel && !result;

                            return (
                              <div
                                key={box.level}
                                style={{
                                  background: result
                                    ? (isDark ? 'rgba(16,185,129,0.12)' : '#f0fdf4')
                                    : (isCurrentTarget
                                        ? (isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb')
                                        : 'var(--color-surface)'),
                                  border: result
                                    ? '1.5px solid rgba(16,185,129,0.35)'
                                    : (isCurrentTarget
                                        ? '1.5px solid rgba(245,158,11,0.45)'
                                        : '1px solid var(--color-border)'),
                                  borderRadius: 10,
                                  padding: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 3,
                                  opacity: isLocked ? 0.6 : 1
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: box.color }}>
                                    {box.icon} {box.label.split(' ')[0]} {box.label.split(' ')[1]}
                                  </span>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                    {box.intervalDays}g aralık
                                  </span>
                                </div>

                                {result ? (
                                  <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <CheckCircle2 size={12} /> %{result.scorePercentage} Başarı
                                    </div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 1 }}>
                                      <span style={{ color: '#16a34a' }}>✓{result.correct}</span>{' '}
                                      <span style={{ color: '#dc2626' }}>✗{result.wrong}</span>{' '}
                                      <span style={{ color: 'var(--color-text-muted)' }}>—{result.blank}</span>{' '}
                                      • Net: {result.net}
                                    </div>
                                    {result.date && (
                                      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: 2, fontWeight: 600 }}>
                                        {new Date(result.date).toLocaleDateString('tr-TR')}
                                      </div>
                                    )}
                                  </div>
                                ) : isCurrentTarget ? (
                                  <div>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#d97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <Clock size={11} /> {box.level === 1 ? '1. Çözüm Bekleniyor' : `${box.level}. Tekrar Hedefi`}
                                    </div>
                                    <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', marginTop: 1, fontWeight: 700 }}>
                                      {box.intervalDays} gün aralıklı tekrar
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 4 }}>
                                    🔒 {box.level === 5 ? '100% Başarıda Açılır' : `${box.level - 1}. Aşama Sonrası`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

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
                <strong>Aralıklı Tekrar Nasıl Çalışır?</strong> Çözdüğünüz bir telafi testinin ilk sonucu <strong>1. Aşama</strong> kutusunda kaydedilir. Ardından 3 gün, 7 gün ve 15 gün aralıklarla test tekrar çözüldükçe yeni aşamalardaki başarı sonuçlarınız adım adım güncellenir ve %100 nete ulaştığında <strong>🏆 Ustalaşıldı</strong> kutusuna aktarılır.
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

      {/* ─── KİTAP SIRALI YANLIŞLARI YAZDIRMA / PDF ÇALIŞMA FASİKÜLÜ MODALI ─── */}
      {showPrintModal && (
        <div
          className="print-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowPrintModal(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 20,
              maxWidth: 900,
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              border: '1.5px solid var(--color-border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Kontrol Çubuğu (Ekranda görünür, yazdırmada gizlenir) */}
            <div
              className="no-print"
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1.5px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-surface-hover)',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Printer size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--color-text)' }}>
                    📖 Kitap Yanlışları Çalışma Fasikülü
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    {activeStudent?.name} • {selectedBook?.title || 'Seçili Kitap'} ({bookSequentialMistakes.length} Soru)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleExportCSV(selectedBook?.title, filteredTestSubmissions)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.5rem 0.9rem',
                    borderRadius: 10,
                    border: '1.5px solid #10b981',
                    background: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4',
                    color: '#10b981',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Excel İndir</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.5rem 1.1rem',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                  }}
                >
                  <Printer size={15} />
                  <span>Yazdır / PDF Olarak Kaydet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    padding: '0.45rem',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Yazdırılabilir Doküman Alanı */}
            <div
              id="print-mistakes-booklet"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '2rem',
                background: '#ffffff',
                color: '#0f172a'
              }}
            >
              {/* Doküman Başlığı */}
              <div style={{
                borderBottom: '2.5px solid #0f172a',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
                    E-TEST PLATFORMU
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4f46e5', marginTop: 2 }}>
                    KİŞİYE ÖZEL HATA VE PEKİŞTİRME FASİKÜLÜ
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: 4 }}>
                    Kitap: <strong>{selectedBook?.title || 'Kitap'}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#475569' }}>
                  <div>Öğrenci: <strong style={{ color: '#0f172a' }}>{activeStudent?.name || 'Öğrenci'}</strong></div>
                  <div>Tarih: <strong>{new Date().toLocaleDateString('tr-TR')}</strong></div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 800, padding: '2px 8px', borderRadius: 4, fontSize: '0.76rem' }}>
                      Toplam {bookSequentialMistakes.length} Soru
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '0.65rem 1rem',
                fontSize: '0.8rem',
                color: '#475569',
                marginBottom: '1.5rem',
                fontStyle: 'italic'
              }}>
                💡 Bu fasikül, öğrencinin kitap üzerindeki eksik ve yanlışlarını analiz etmek ve tekrar çözerek tam öğrenme sağlamak amacıyla hazırlanmıştır.
              </div>

              {/* Soru Listesi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {bookSequentialMistakes.map((item, qIdx) => (
                  <div
                    key={`print_${item.subId}_${item.qNum}_${qIdx}`}
                    className="print-question-box"
                    style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      padding: '1rem',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                      background: '#ffffff'
                    }}
                  >
                    {/* Soru Üst Başlığı */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap',
                      gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.76rem',
                          padding: '0.15rem 0.55rem',
                          borderRadius: 6
                        }}>
                          #{qIdx + 1}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                          {item.testName} • Soru {item.qNum}
                        </span>
                        {item.unit && (
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            ({item.unit}{item.topic ? ` › ${item.topic}` : ''})
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: item.isWrong ? '#dc2626' : '#d97706',
                          background: item.isWrong ? '#fef2f2' : '#fffbeb',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 4,
                          border: item.isWrong ? '1px solid #fecaca' : '1px solid #fde68a'
                        }}>
                          {item.isWrong ? `Öğrenci: ${item.userAnswer || 'Yanlış'}` : 'Öğrenci: Boş'}
                        </span>
                        {item.correctAnswer && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#16a34a',
                            background: '#f0fdf4',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 4,
                            border: '1px solid #bbf7d0'
                          }}>
                            Doğru: {item.correctAnswer}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Soru Görseli veya Metni */}
                    {item.imageUrl ? (
                      <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                        <img
                          src={item.imageUrl}
                          alt={`Soru ${item.qNum}`}
                          style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
                        />
                      </div>
                    ) : item.questionText ? (
                      <div style={{ fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5, marginBottom: '0.75rem', fontWeight: 600 }}>
                        {item.questionText}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                        [Fiziki Kitap Sorusu: {item.testName} - Soru {item.qNum}]
                      </div>
                    )}

                    {/* Çözüm ve Çalışma Alanı */}
                    <div style={{
                      border: '1.5px dashed #94a3b8',
                      borderRadius: 8,
                      height: 95,
                      padding: '0.5rem 0.75rem',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <span>✏️ Öğrenci Çözüm & Not Alanı:</span>
                      <div style={{ borderBottom: '1px dashed #cbd5e1', width: '100%' }}></div>
                    </div>
                  </div>
                ))}

                {bookSequentialMistakes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    Bu kitaba ait yanlış veya boş soru bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yazdırma (Print) CSS Kuralları */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-mistakes-booklet, #print-mistakes-booklet * {
            visibility: visible !important;
          }
          #print-mistakes-booklet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, .print-modal-overlay > div > div.no-print {
            display: none !important;
          }
          .print-question-box {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
