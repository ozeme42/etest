import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, Check, Clock, Plus, Upload,
  Image as ImageIcon, Trash2, ZoomIn, X, Camera, BookMarked,
  RotateCcw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Calendar
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
  const { questions: bankQuestions = [] } = useQuestionBank();
  const { data: curData } = useCurriculum();
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const {
    getCoachingProfileForStudent,
    addStudentError,
    updateStudentError,
    deleteStudentError
  } = useCoaching();

  const SUBJECT_CONFIG = useMemo(() => getSubjectConfig(isDark), [isDark]);

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

  // Main Tabs: 'unreviewed' (⏳ Kontrol Edilmeyenler) vs 'reviewed' (✅ Kontrol Edilenler) vs 'error_notebook' (📸 Görsel Hata Defterim)
  const [activeMainTab, setActiveMainTab] = useState('unreviewed');

  // Selected Subject Filter (null or subject name)
  const [selectedSubject, setSelectedSubject] = useState('Tümü');

  // Date & Metric Sort State: 'date_desc' | 'date_asc' | 'wrong_desc' | 'name_asc'
  const [sortBy, setSortBy] = useState('date_desc');

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
  const [searchQuery, setSearchQuery] = useState('');
  const [wrongOnlyFilter, setWrongOnlyFilter] = useState(false);

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

      bTests.forEach(bt => {
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
          testId: bt.id
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

  // Current active list depending on selected main tab
  const currentTabBaseList = useMemo(() => {
    if (activeMainTab === 'unreviewed') return unreviewedSubmissions;
    if (activeMainTab === 'reviewed') return reviewedSubmissions;
    return testGroupedSubmissions;
  }, [activeMainTab, unreviewedSubmissions, reviewedSubmissions, testGroupedSubmissions]);

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

  // Tab-Specific Global Counts
  const currentWrongCount = useMemo(() => currentTabBaseList.reduce((acc, sub) => acc + sub.wrongQuestions.length, 0), [currentTabBaseList]);
  const currentBlankCount = useMemo(() => currentTabBaseList.reduce((acc, sub) => acc + sub.blankQuestions.length, 0), [currentTabBaseList]);

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
        .wa-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .wa-card:hover { transform: translateY(-2px); border-color: var(--color-primary, #6366f1) !important; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important; }
        .wa-pill { transition: all 0.15s ease; }
        .wa-pill:hover { opacity: 0.95; transform: scale(1.02); }
        .wa-scroll-x::-webkit-scrollbar { height: 4px; }
        .th-sort { cursor: pointer; user-select: none; transition: background 0.15s; }
        .th-sort:hover { background: var(--color-surface-hover) !important; color: var(--color-text) !important; }
        .wa-table-row { transition: background 0.15s ease; }
        .wa-table-row:hover { background: var(--color-surface-hover) !important; }

        /* Responsive Mobile Styles */
        @media (max-width: 640px) {
          .wa-top-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.55rem !important;
            margin-bottom: 0.65rem !important;
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
            font-size: 1.1rem !important;
          }
          .wa-back-btn {
            padding: 0.4rem 0.65rem !important;
            font-size: 0.75rem !important;
            border-radius: 10px !important;
          }
          .wa-tab-bar {
            width: 100% !important;
            display: flex !important;
            gap: 3px !important;
            padding: 3px !important;
          }
          .wa-tab-btn {
            flex: 1 !important;
            padding: 0.42rem 0.25rem !important;
            font-size: 0.72rem !important;
            justify-content: center !important;
            text-align: center !important;
            gap: 0.2rem !important;
          }
          .wa-tab-text-full {
            display: none !important;
          }
          .wa-tab-text-mobile {
            display: inline !important;
          }
          .wa-kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.35rem !important;
            margin-bottom: 0.65rem !important;
          }
          .wa-kpi-card {
            padding: 0.45rem 0.35rem !important;
            border-radius: 12px !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 0.2rem !important;
          }
          .wa-kpi-icon {
            width: 24px !important;
            height: 24px !important;
            font-size: 0.8rem !important;
            border-radius: 6px !important;
          }
          .wa-kpi-title {
            font-size: 0.58rem !important;
            line-height: 1.1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }
          .wa-kpi-val {
            font-size: 0.95rem !important;
            line-height: 1.1 !important;
          }
          .wa-kpi-unit {
            display: none !important;
          }
          .wa-pill {
            padding: 0.35rem 0.65rem !important;
            font-size: 0.74rem !important;
          }
          .wa-toolbar {
            padding: 0.5rem 0.65rem !important;
            gap: 0.45rem !important;
            margin-bottom: 0.65rem !important;
          }
        }
        @media (min-width: 641px) {
          .wa-tab-text-mobile {
            display: none !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ════════════════════════════════════════════
            1. ÜST BAŞLIK VE 3'LÜ ANA SEKME ÇUBUĞU
        ════════════════════════════════════════════ */}
        <div className="wa-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="wa-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => navigate('/student')}
              className="wa-back-btn"
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border-input)',
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
                <AlertCircle color="#ef4444" size={22} /> Yanlışlarım & Hata Defteri
              </h1>
              <p className="wa-title-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Sınavlarda ve kitap takibinde yanlış veya boş bıraktığınız soruları inceleyin, hatalarınızı pekiştirin.
              </p>
            </div>
          </div>

          {/* TAB DEĞİŞTİRİCİ */}
          <div className="wa-tab-bar" style={{
            display: 'flex',
            background: 'var(--color-surface)',
            padding: '4px',
            borderRadius: '14px',
            border: '1.5px solid var(--color-border)',
            gap: 4,
            flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            {/* SEKME 1: KONTROL EDİLMEYENLER */}
            <button
              onClick={() => setActiveMainTab('unreviewed')}
              className="wa-tab-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '10px',
                border: 'none',
                background: activeMainTab === 'unreviewed' ? (isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff') : 'transparent',
                color: activeMainTab === 'unreviewed' ? '#3b82f6' : 'var(--color-text-muted)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Clock size={15} />
              <span className="wa-tab-text-full">⏳ Kontrol Edilmeyenler</span>
              <span className="wa-tab-text-mobile">Bekleyen</span>
              <span style={{
                background: activeMainTab === 'unreviewed' ? (isDark ? 'rgba(59,130,246,0.3)' : '#dbeafe') : 'var(--color-surface-hover)',
                color: activeMainTab === 'unreviewed' ? (isDark ? '#93c5fd' : '#1e40af') : 'var(--color-text-muted)',
                fontSize: '0.68rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {unreviewedSubmissions.length}
              </span>
            </button>

            {/* SEKME 2: KONTROL EDİLENLER */}
            <button
              onClick={() => setActiveMainTab('reviewed')}
              className="wa-tab-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '10px',
                border: 'none',
                background: activeMainTab === 'reviewed' ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4') : 'transparent',
                color: activeMainTab === 'reviewed' ? '#10b981' : 'var(--color-text-muted)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <CheckCircle2 size={15} />
              <span className="wa-tab-text-full">✅ Kontrol Edilenler</span>
              <span className="wa-tab-text-mobile">Biten</span>
              <span style={{
                background: activeMainTab === 'reviewed' ? (isDark ? 'rgba(16,185,129,0.3)' : '#dcfce7') : 'var(--color-surface-hover)',
                color: activeMainTab === 'reviewed' ? (isDark ? '#86efac' : '#166534') : 'var(--color-text-muted)',
                fontSize: '0.68rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {reviewedSubmissions.length}
              </span>
            </button>

            {/* SEKME 3: GÖRSEL HATA DEFTERİM */}
            <button
              onClick={() => setActiveMainTab('error_notebook')}
              className="wa-tab-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '10px',
                border: 'none',
                background: activeMainTab === 'error_notebook' ? (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2') : 'transparent',
                color: activeMainTab === 'error_notebook' ? '#ef4444' : 'var(--color-text-muted)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <BookMarked size={15} />
              <span className="wa-tab-text-full">📸 Görsel Hata Defterim</span>
              <span className="wa-tab-text-mobile">Defter</span>
              <span style={{
                background: activeMainTab === 'error_notebook' ? (isDark ? 'rgba(239,68,68,0.3)' : '#fee2e2') : 'var(--color-surface-hover)',
                color: activeMainTab === 'error_notebook' ? (isDark ? '#fca5a5' : '#991b1b') : 'var(--color-text-muted)',
                fontSize: '0.68rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {studentErrors.length}
              </span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            2. ÖZET KPI İSTATİSTİK KARTLARI
        ════════════════════════════════════════════ */}
        {activeMainTab !== 'error_notebook' && (
          <div className="wa-kpi-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {/* Kart 1: Yanlış Soru */}
            <div className="wa-kpi-card" style={{
              background: 'var(--color-surface)',
              border: isDark ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid #fecaca',
              borderRadius: '16px',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="wa-kpi-icon" style={{
                width: 42,
                height: 42,
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
                <div className="wa-kpi-title" style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeMainTab === 'unreviewed' ? 'Yanlış Soru' : 'Kontrol Edilen Yanlış'}
                </div>
                <div className="wa-kpi-val" style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                  {currentWrongCount} <span className="wa-kpi-unit" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Soru</span>
                </div>
              </div>
            </div>

            {/* Kart 2: Boş Bırakılan */}
            <div className="wa-kpi-card" style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '16px',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="wa-kpi-icon" style={{
                width: 42,
                height: 42,
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
                <div className="wa-kpi-title" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeMainTab === 'unreviewed' ? 'Boş Soru' : 'Kontrol Edilen Boş'}
                </div>
                <div className="wa-kpi-val" style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                  {currentBlankCount} <span className="wa-kpi-unit" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Soru</span>
                </div>
              </div>
            </div>

            {/* Kart 3: Durum Bilgisi */}
            <div className="wa-kpi-card" style={{
              background: 'var(--color-surface)',
              border: isDark
                ? (activeMainTab === 'unreviewed' ? '1.5px solid rgba(59,130,246,0.35)' : '1.5px solid rgba(16,185,129,0.35)')
                : (activeMainTab === 'unreviewed' ? '1.5px solid #bfdbfe' : '1.5px solid #bbf7d0'),
              borderRadius: '16px',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="wa-kpi-icon" style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: activeMainTab === 'unreviewed' ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff') : (isDark ? 'rgba(16,185,129,0.2)' : '#f0fdf4'),
                color: activeMainTab === 'unreviewed' ? '#3b82f6' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.1rem'
              }}>
                {activeMainTab === 'unreviewed' ? '⏳' : '✅'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="wa-kpi-title" style={{ fontSize: '0.72rem', color: activeMainTab === 'unreviewed' ? '#3b82f6' : '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeMainTab === 'unreviewed' ? 'Bekleyen Test' : 'Biten Test'}
                </div>
                <div className="wa-kpi-val" style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                  {currentTabBaseList.length} <span className="wa-kpi-unit" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Test</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
              ? (activeMainTab === 'error_notebook' ? studentErrors.length : currentTabBaseList.length)
              : (activeMainTab === 'error_notebook' ? studentErrors.filter(e => e.subject === key).length : currentTabBaseList.filter(s => s.subject === key).length);

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

        {/* ════════════════════════════════════════════
            SEKME 1 & 2: KONTROL EDİLMEYENLER / KONTROL EDİLENLER
        ════════════════════════════════════════════ */}
        {(activeMainTab === 'unreviewed' || activeMainTab === 'reviewed') && (
          <div>
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
                
                {/* TARİHE / METRİĞE GÖRE SIRALAMA MENÜSÜ */}
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
                      background: viewMode === 'table' ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : 'transparent',
                      color: viewMode === 'table' ? '#3b82f6' : 'var(--color-text-muted)',
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
                        background: 'var(--color-surface)',
                        border: sub.isReviewed
                          ? (isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0')
                          : '1.5px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      {/* Üst Kısım: Ders Rozeti, Başlık, Ünite & Konu, Tarih */}
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

                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} color="var(--color-text-muted)" />
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </span>
                        </div>

                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: '0.35rem' }}>
                          {sub.testTitle || 'Test Sınavı'}
                        </div>

                        {/* ÜNİTE VE KONU ETİKETLERİ */}
                        {(sub.unit || sub.topic) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                            {sub.unit && (
                              <span style={{
                                background: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff',
                                color: isDark ? '#93c5fd' : '#1e40af',
                                border: isDark ? '1px solid rgba(59,130,246,0.35)' : '1px solid #bfdbfe',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                📖 {sub.unit.toLowerCase().includes('ünite') ? sub.unit : `Ünite: ${sub.unit}`}
                              </span>
                            )}

                            {sub.topic && (
                              <span style={{
                                background: 'var(--color-surface-hover)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                📌 {sub.topic}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Orta Kısım: Yanlış & Boş Soru Çipleri */}
                      <div style={{
                        background: 'var(--color-surface-hover)',
                        borderRadius: '12px',
                        padding: '0.65rem 0.8rem',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}>
                        {/* Yanlış Sorular */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#ef4444', minWidth: 70 }}>
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
                                    background: isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2',
                                    color: '#ef4444',
                                    border: isDark ? '1px solid rgba(239,68,68,0.4)' : '1px solid #fecaca',
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
                            <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 800 }}>✓ Yanlış Yok</span>
                          )}
                        </div>

                        {/* Boş Sorular */}
                        {sub.blankQuestions.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text-muted)', minWidth: 70 }}>
                              ⚪ {sub.blankQuestions.length} Boş:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {sub.blankQuestions.map(q => (
                                <button
                                  key={q.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  title="Soruyu İncele"
                                  style={{
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-muted)',
                                    border: '1px solid var(--color-border)',
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
                            background: sub.isReviewed
                              ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4')
                              : (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb'),
                            color: sub.isReviewed ? '#10b981' : '#f59e0b',
                            border: sub.isReviewed
                              ? (isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0')
                              : (isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #fde68a'),
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
                              background: 'var(--color-surface-hover)',
                              color: 'var(--color-text)',
                              border: '1px solid var(--color-border)',
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
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
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
                    background: 'var(--color-surface)',
                    borderRadius: '16px',
                    border: '1.5px dashed var(--color-border)',
                    color: 'var(--color-text-muted)'
                  }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      {activeMainTab === 'unreviewed' ? 'Harika! Kontrol edilmeyi bekleyen sınav bulunmuyor.' : 'Henüz kontrol edilmiş sınav bulunmuyor.'}
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: 4, color: 'var(--color-text-muted)' }}>
                      {activeMainTab === 'unreviewed' ? 'Çözdüğünüz tüm sınav ve testler kontrol edilmiş görünüyor.' : 'Kontrol Edilmeyenler sekmesinden sınavlarınızı inceleyip kontrol edildi olarak işaretleyebilirsiniz.'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TABLO GÖRÜNÜMÜ */}
            {viewMode === 'table' && (
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '16px',
                border: '1.5px solid var(--color-border)',
                overflowX: 'auto',
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: 700 }}>
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
                    {filteredTestSubmissions.map((sub, idx) => {
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
                                    style={{ background: isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.4)' : '1px solid #fecaca', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}
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
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
            SEKME 3: GÖRSEL HATA DEFTERİM
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
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '14px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
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
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)'
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
                      border: notebookStatusFilter === tab.key
                        ? (isDark ? '1px solid rgba(239,68,68,0.45)' : '1px solid #fecaca')
                        : '1px solid var(--color-border)',
                      background: notebookStatusFilter === tab.key
                        ? (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2')
                        : 'var(--color-surface-hover)',
                      color: notebookStatusFilter === tab.key ? '#ef4444' : 'var(--color-text-muted)',
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
                      background: 'var(--color-surface)',
                      border: isResolved
                        ? (isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0')
                        : '1.5px solid var(--color-border)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    {/* Görsel Kutusu */}
                    <div
                      onClick={() => setViewingErrorModal(err)}
                      style={{
                        height: 160,
                        background: 'var(--color-surface-hover)',
                        position: 'relative',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderBottom: '1px solid var(--color-border)'
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
                        background: 'rgba(15, 23, 42, 0.8)',
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
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>
                            {err.reason}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>
                        {err.testTitle || 'Ödev / Deneme Sorusu'}
                      </div>

                      {err.note && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', padding: '0.35rem 0.55rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                          💬 {err.note}
                        </div>
                      )}

                      {/* Aksiyon Butonları */}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                        <button
                          onClick={(e) => handleToggleStatus(err.id, err.status, e)}
                          style={{
                            flex: 1,
                            background: isResolved
                              ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4')
                              : (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2'),
                            color: isResolved ? '#10b981' : '#ef4444',
                            border: isResolved
                              ? (isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0')
                              : (isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca'),
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
                            background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
                            color: '#ef4444',
                            border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca',
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
                  background: 'var(--color-surface)',
                  borderRadius: '16px',
                  border: '1.5px dashed var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}>
                  <Camera size={36} color="#ef4444" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Görsel Hata Defteriniz Boş</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4, color: 'var(--color-text-muted)' }}>Çözemediğiniz veya tekrar etmek istediğiniz soruların fotoğrafını ekleyebilirsiniz.</div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.7))', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: '20px', padding: '1.4rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', color: 'var(--color-text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={20} color="#e11d48" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>Yanlış Soru Görseli Ekle</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveNewError} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* 1. Ait Olduğu Ödev / Sınav */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Ait Olduğu Sınav / Ödev / Kitap</label>
                <select
                  value={newErrorForm.homeworkId}
                  onChange={e => {
                    const val = e.target.value;
                    const matched = availableHomeworkOptions.find(o => String(o.id) === String(val));
                    setNewErrorForm(p => ({
                      ...p,
                      homeworkId: val,
                      testTitle: matched?.title || p.testTitle,
                      subject: matched?.subject || p.subject,
                      topic: matched?.topic || (matched?.unit ? `Ünite: ${matched.unit}` : p.topic)
                    }));
                  }}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                >
                  <option value="">-- Ödev, Sınav veya Kitap Testi Seçin --</option>
                  {availableHomeworkOptions.map(hw => (
                    <option key={hw.id} value={hw.id}>
                      {hw.title} ({hw.subject}) {hw.unit ? `[${hw.unit}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Ders */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Ders</label>
                <select
                  value={newErrorForm.subject}
                  onChange={e => setNewErrorForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                >
                  {Object.keys(SUBJECT_CONFIG).filter(k => k !== 'Tümü').map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* 3. Görsel Yükleme */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Soru Fotoğrafı</label>
                {newErrorForm.imageUrl ? (
                  <div style={{ position: 'relative', height: 140, borderRadius: '12px', overflow: 'hidden', border: '2px solid #e11d48', background: 'var(--color-surface-hover)' }}>
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
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', background: 'var(--color-surface-hover)', border: '2px dashed var(--color-border-input)', borderRadius: '12px', cursor: 'pointer' }}>
                    <Upload size={24} color="#e11d48" style={{ marginBottom: 4 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>Fotoğraf Seç veya Çek</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* 4. Hata Nedeni */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Hata Nedeni</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {REASON_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewErrorForm(p => ({ ...p, reason: preset }))}
                      style={{
                        border: newErrorForm.reason === preset ? 'none' : '1px solid var(--color-border-input)',
                        background: newErrorForm.reason === preset ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'var(--color-surface-hover)',
                        color: newErrorForm.reason === preset ? 'white' : 'var(--color-text-muted)',
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
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Notunuz / Çözüm Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Doğru çözüm adımları veya dikkat edilecek ipuçları..."
                  value={newErrorForm.note}
                  onChange={e => setNewErrorForm(p => ({ ...p, note: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.35rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: 'none', borderRadius: '10px', padding: '0.55rem 1rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>İptal</button>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.7))', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: '20px', padding: '1.4rem', width: '100%', maxWidth: 750, maxHeight: '92vh', overflowY: 'auto', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem', color: 'var(--color-text)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem' }}>
              <div>
                <span style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6, textTransform: 'uppercase' }}>
                  {viewingErrorModal.subject}
                </span>
                <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {viewingErrorModal.testTitle}
                </h3>
              </div>
              <button onClick={() => setViewingErrorModal(null)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={16} /></button>
            </div>

            {/* Büyük Görsel */}
            <div style={{ background: 'var(--color-surface-hover)', borderRadius: '12px', overflow: 'hidden', minHeight: 300, maxHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: '1px solid var(--color-border)' }}>
              <img src={viewingErrorModal.imageUrl} alt="Soru" style={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain' }} />
            </div>

            {/* Detaylar */}
            <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {viewingErrorModal.reason && (
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444' }}>
                  ⚡ Hata Nedeni: {viewingErrorModal.reason}
                </div>
              )}
              {viewingErrorModal.note && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  💬 Not: {viewingErrorModal.note}
                </div>
              )}
            </div>

            {/* Aksiyonlar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={e => handleDeleteErrorRecord(viewingErrorModal.id, e)}
                style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca', borderRadius: '10px', padding: '0.5rem 0.85rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={14} /> Görseli Sil
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={e => handleToggleStatus(viewingErrorModal.id, viewingErrorModal.status, e)}
                  style={{
                    background: viewingErrorModal.status === 'resolved'
                      ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4')
                      : (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2'),
                    color: viewingErrorModal.status === 'resolved' ? '#10b981' : '#ef4444',
                    border: viewingErrorModal.status === 'resolved'
                      ? (isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0')
                      : (isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca'),
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
                <button onClick={() => setViewingErrorModal(null)} style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
