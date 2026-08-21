import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useUser } from '../context/UserContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter } from '../utils/answerEvaluation';
import { toUUID } from '../services/supabaseService';
import {
  BookMarked, CheckCircle2, Clock, PlayCircle, AlertCircle,
  Search, ArrowLeft, ChevronRight, Eye, Sparkles, Filter,
  Layers, Trophy, Calendar, CheckSquare, Award, BookOpen, Brain, Zap, Target
} from 'lucide-react';

const SUBJECT_ROW_THEMES = {
  'matematik':       { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  'türkçe':          { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  'fen':             { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  'sosyal':          { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  'inkılap':         { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', text: '#c2410c', badgeBg: '#ffedd5' },
  'ingilizce':       { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  'yabancı dil':     { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  'din':             { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
  'geometri':        { bg: '#f0fdfa', border: '#99f6e4', accent: '#0d9488', text: '#0f766e', badgeBg: '#ccfbf1' },
  'fizik':           { bg: '#f5f3ff', border: '#ddd6fe', accent: '#6366f1', text: '#4338ca', badgeBg: '#ede9fe' },
  'kimya':           { bg: '#fdf4ff', border: '#f5d0fe', accent: '#c026d3', text: '#a21caf', badgeBg: '#fae8ff' },
  'biyoloji':        { bg: '#f0fdf4', border: '#a7f3d0', accent: '#059669', text: '#047857', badgeBg: '#d1fae5' },
  'tarih':           { bg: '#fffbeb', border: '#fed7aa', accent: '#d97706', text: '#9a3412', badgeBg: '#ffedd5' },
  'coğrafya':        { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', text: '#166534', badgeBg: '#dcfce7' },
  'felsefe':         { bg: '#fdf2f8', border: '#fbcfe8', accent: '#ec4899', text: '#be185d', badgeBg: '#fce7f3' },
};

const PALETTES_LIST = [
  { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
];

const getRowTheme = (subject, idx) => {
  if (subject) {
    const sLower = String(subject).toLowerCase();
    for (const [key, val] of Object.entries(SUBJECT_ROW_THEMES)) {
      if (sLower.includes(key)) return val;
    }
  }
  return PALETTES_LIST[idx % PALETTES_LIST.length];
};

export default function StudentHomeworksPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks } = useHomework();
  const { bookTests = [], books = [] } = useTrackedBooks() || {};
  const { submissions } = useEvaluation();
  const { data: curData } = useCurriculum();
  const { users } = useUser();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(() => {
    if (currentUser?.role === 'student') return currentUser;
    return studentMembers.length > 0 ? studentMembers[0] : null;
  });

  // Keep selectedStudent synced with currentUser
  React.useEffect(() => {
    if (currentUser?.role === 'student') setSelectedStudent(currentUser);
    else if (!selectedStudent && studentMembers.length > 0) setSelectedStudent(studentMembers[0]);
  }, [currentUser, studentMembers]);

  /* ─── Compute All Assigned Homeworks & Tests for Selected Student ─── */
  const allTests = useMemo(() => {
    if (!selectedStudent) return [];
    const gradesList = curData?.grades || [];

    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || selectedStudent.uuid || '');
    const isMatchStudent = (s) => {
      if (!s) return false;
      const sStudentId = String(s.studentId || s.student_id || s.user_id || s.userId || '');
      if (!sStudentId) return false;
      if (sStudentId === studentIdStr) return true;
      if (studentUuidStr && (sStudentId === studentUuidStr || toUUID(sStudentId) === studentUuidStr)) return true;
      if (studentIdStr && toUUID(studentIdStr) === sStudentId) return true;
      return false;
    };

    const isMatchHwSub = (s, hw, bookObj, specificTestId = null) => {
      if (!s || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;

      const hwIdStr = String(hw?.id || '');
      const cleanHwId = hwIdStr.replace(/^hw_/, '');
      const sHwId = String(s.hwId || s.homeworkId || '');
      const sTestId = String(s.testId || '');
      const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
      const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
      const sId = String(s.id || '');

      if (specificTestId) {
        const specStr = String(specificTestId);
        const specClean = specStr.replace(/^q_/, '').replace(/^bt_/, '');
        const specUuid = String(toUUID(specificTestId) || '');
        if (sTestId && (sTestId === specStr || sTestId === specClean || (specUuid && sTestId === specUuid))) return true;
        if (sRealTestId && (sRealTestId === specStr || sRealTestId === specClean || (specUuid && sRealTestId === specUuid))) return true;
        if (sBookTestId && (sBookTestId === specStr || sBookTestId === specClean || (specUuid && sBookTestId === specUuid))) return true;
        if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === specStr || String(tid) === specClean)) return true;
        return false;
      }

      // 1. Direct ID match
      if (sHwId && (sHwId === hwIdStr || sHwId === cleanHwId || sHwId.replace(/^hw_/, '') === cleanHwId)) return true;
      if (sTestId && (sTestId === hwIdStr || sTestId === cleanHwId || sTestId.replace(/^hw_/, '') === cleanHwId || sTestId.replace(/^q_/, '') === cleanHwId)) return true;
      if (sId && (sId === hwIdStr || sId === cleanHwId)) return true;

      // 2. Question IDs / Sections / Tests match
      const qIds = [
        ...(Array.isArray(hw?.questionIds) ? hw.questionIds : []),
        ...(Array.isArray(hw?.selectedQuestions) ? hw.selectedQuestions : []),
        ...(Array.isArray(hw?.tests) ? hw.tests : []),
        ...(Array.isArray(hw?.items) ? hw.items : []),
        ...(Array.isArray(hw?.sections) ? hw.sections.map(sec => typeof sec === 'object' ? (sec.id || sec.questionId) : sec) : [])
      ].map(String);

      if (qIds.length > 0) {
        if (sTestId && qIds.some(qid => qid === sTestId || qid.replace(/^q_/, '') === sTestId.replace(/^q_/, ''))) return true;
        if (sRealTestId && qIds.some(qid => qid === sRealTestId || qid.replace(/^q_/, '') === sRealTestId.replace(/^q_/, ''))) return true;
        if (sBookTestId && qIds.some(qid => qid === sBookTestId || qid.replace(/^q_/, '') === sBookTestId.replace(/^q_/, ''))) return true;
        if (sHwId && qIds.some(qid => qid === sHwId || qid.replace(/^q_/, '') === sHwId.replace(/^q_/, ''))) return true;
      }

      // 3. Book match
      if (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id))) return true;

      return false;
    };

    const hwTests = (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      const bookObj = (books || []).find(b => String(b.id) === String(hw.bookId));
      const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || bookObj?.bookType === 'exam' || hw.isPhysical;

      if (isExam) {
        const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
          (submissions || []).find(s => isMatchHwSub(s, hw, bookObj));

        return [{
          ...hw,
          type: 'physicalExam',
          contentType: 'physicalExam',
          isPhysical: true,
          status: sub ? 'Sonuçlandı' : 'Atandı',
          isDone: !!sub,
          questionCount: hw.totalQuestions || (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 90,
          correctAnswers: sub ? (typeof sub.correctCount === 'number' ? sub.correctCount : (typeof sub.score === 'number' && sub.score <= 100 && sub.totalQuestions ? Math.round((sub.score / 100) * sub.totalQuestions) : (sub.score || 0))) : 0,
          totalScoreQuestions: sub?.totalQuestions || hw.totalQuestions || 90,
          scorePct: sub ? (sub.scorePercentage !== undefined && sub.scorePercentage !== null ? Math.round(Number(sub.scorePercentage)) : (typeof sub.score === 'number' && sub.score <= 100 ? Math.round(sub.score) : (sub.totalQuestions ? Math.round(((sub.correctCount || 0) / sub.totalQuestions) * 100) : null))) : null,
          submissionId: sub?.id,
          submittedAt: sub?.submittedAt || sub?.createdAt,
          realTestId: hw.id,
          hwId: hw.id,
          bookId: hw.bookId || (bookObj ? bookObj.id : undefined)
        }];
      }

      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && bookObj);

      if (isBook) {
        return []; // Kitap ödevleri zaten "Kitaplarım" sayfasında gösterildiği için burada gizliyoruz
      }

      const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
        (submissions || []).find(s => isMatchHwSub(s, hw, bookObj));

      let qCount = hw.totalQuestions || hw.questionCount || 0;
      if (!qCount && Array.isArray(hw.sections) && hw.sections.length > 0) {
        qCount = hw.sections.reduce((acc, sec) => acc + (sec.qCount || sec.questionCount || 0), 0);
      }
      if (!qCount && Array.isArray(hw.questionIds) && hw.questionIds.length > 0) {
        qCount = hw.questionIds.length;
      }
      if (!qCount) qCount = 1;

      let correctCount = 0;
      if (sub) {
        if (Array.isArray(sub.answers) && sub.answers.length > 0) {
          sub.answers.forEach((ans, aIdx) => {
            const qNo = ans.questionNoInSection || ans.questionNo || (aIdx + 1);
            const userAns = ans.userAnswer;
            const hasOption = userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty';
            if (!hasOption) return;

            const resolvedCorrect = resolveQuestionCorrectAnswer(qNo, null, ans, hw, []);
            const uLetter = formatAnswerLetter(userAns);
            const cLetter = formatAnswerLetter(resolvedCorrect);

            let isRight = null;
            if (uLetter && cLetter) {
              isRight = (uLetter === cLetter);
            } else if (ans.isCorrect !== undefined && ans.isCorrect !== null) {
              isRight = ans.isCorrect;
            } else {
              isRight = checkIsAnswerCorrect(userAns, null, hw, qNo);
            }

            if (isRight === true) correctCount++;
          });
        } else if (typeof sub.correctCount === 'number') {
          correctCount = sub.correctCount;
        } else if (typeof sub.score === 'number' && sub.score <= 100 && qCount > 0) {
          correctCount = Math.round((sub.score / 100) * qCount);
        }
      }
      let scorePct = null;
      if (sub) {
        if (qCount > 0) scorePct = Math.round((correctCount / qCount) * 100);
        else if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) scorePct = Math.round(Number(sub.scorePercentage));
        else if (typeof sub.score === 'number' && sub.score <= 100) scorePct = Math.round(sub.score);
      }

      return [{
        ...hw,
        id: hw.id,
        realTestId: hw.id,
        testId: hw.id,
        hwId: hw.id,
        title: hw.title || hw.name || 'Ödev Testi',
        status: sub ? 'Sonuçlandı' : 'Atandı',
        isDone: !!sub,
        questionCount: qCount,
        correctAnswers: correctCount,
        totalScoreQuestions: qCount,
        scorePct,
        submissionId: sub?.id,
        submittedAt: sub?.submittedAt || sub?.createdAt
      }];
    });

    return hwTests;
  }, [homeworks, submissions, selectedStudent, curData, books, bookTests]);

  // Homework groups (by Book / Main Assignment)
  const homeworkGroups = useMemo(() => {
    const groups = {};
    allTests.forEach(item => {
      const groupKey = item.bookId ? `book_${item.bookId}` : `hw_${item.hwId || item.id}`;
      const groupTitle = item.bookTitle || item.title?.split('—')?.[0]?.trim() || item.name || 'Ödev Seti';
      const subject = item.subject || '';

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          title: groupTitle,
          subject,
          items: [],
          totalCount: 0,
          doneCount: 0,
          pendingCount: 0,
          pct: 0
        };
      }
      groups[groupKey].items.push(item);
      groups[groupKey].totalCount++;
      if (item.isDone) groups[groupKey].doneCount++;
      else groups[groupKey].pendingCount++;
    });

    return Object.values(groups).map(g => ({
      ...g,
      pct: g.totalCount > 0 ? Math.round((g.doneCount / g.totalCount) * 100) : 0
    }));
  }, [allTests]);

  // Stats
  const pendingTests = useMemo(() => allTests.filter(t => !t.isDone), [allTests]);
  const completedTests = useMemo(() => allTests.filter(t => t.isDone), [allTests]);
  const totalPct = allTests.length > 0 ? Math.round((completedTests.length / allTests.length) * 100) : 0;

  // Subjects list for filters
  const subjectsList = useMemo(() => {
    const set = new Set();
    allTests.forEach(t => { if (t.subject) set.add(t.subject); });
    return ['all', ...Array.from(set)];
  }, [allTests]);

  // Filtered List
  const filteredTests = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingTests;
    else if (activeTab === 'completed') list = completedTests;
    else list = allTests;

    if (selectedSubject !== 'all') {
      list = list.filter(t => t.subject === selectedSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.testName && t.testName.toLowerCase().includes(q)) ||
        (t.bookTitle && t.bookTitle.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allTests, pendingTests, completedTests, activeTab, selectedSubject, searchQuery]);

  // Group filtered tests by day / date
  const dayGroupedHomeworks = useMemo(() => {
    const groups = [];
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const todayTime = todayObj.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const overdue = [];
    const todayItems = [];
    const tomorrowItems = [];
    const futureMap = {}; // 'YYYY-MM-DD' -> { dateObj, items }
    const noDueDate = [];
    const completedList = [];

    filteredTests.forEach(task => {
      if (activeTab === 'completed' || task.isDone) {
        completedList.push(task);
        return;
      }

      const rawDue = task.dueDate || task.assignedDueDate;
      if (!rawDue) {
        noDueDate.push(task);
        return;
      }

      const d = new Date(rawDue);
      if (isNaN(d.getTime())) {
        noDueDate.push(task);
        return;
      }

      const itemDayObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const itemDayTime = itemDayObj.getTime();
      const diffDays = Math.round((itemDayTime - todayTime) / oneDayMs);

      if (diffDays < 0) {
        overdue.push(task);
      } else if (diffDays === 0) {
        todayItems.push(task);
      } else if (diffDays === 1) {
        tomorrowItems.push(task);
      } else {
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!futureMap[ymd]) {
          futureMap[ymd] = {
            dateObj: d,
            items: []
          };
        }
        futureMap[ymd].items.push(task);
      }
    });

    if (overdue.length > 0) {
      groups.push({
        id: 'overdue',
        title: 'Süresi Dolan / Geciken Ödevler',
        emoji: '🔥',
        badgeColor: '#e11d48',
        badgeBg: '#ffe4e6',
        badgeBorder: '#fecdd3',
        items: overdue
      });
    }

    if (todayItems.length > 0) {
      const todayFormatted = todayObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
      groups.push({
        id: 'today',
        title: `Bugünün Ödevleri (${todayFormatted})`,
        emoji: '⚡',
        badgeColor: '#d97706',
        badgeBg: '#fef3c7',
        badgeBorder: '#fde68a',
        isToday: true,
        items: todayItems
      });
    }

    if (tomorrowItems.length > 0) {
      const tomDate = new Date(todayTime + oneDayMs);
      const tomFormatted = tomDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
      groups.push({
        id: 'tomorrow',
        title: `Yarının Ödevleri (${tomFormatted})`,
        emoji: '📅',
        badgeColor: '#4f46e5',
        badgeBg: '#e0e7ff',
        badgeBorder: '#c7d2fe',
        items: tomorrowItems
      });
    }

    // Sort future dates ascending
    const sortedDates = Object.keys(futureMap).sort();
    sortedDates.forEach(ymd => {
      const entry = futureMap[ymd];
      const formatted = entry.dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
      groups.push({
        id: ymd,
        title: formatted,
        emoji: '📅',
        badgeColor: '#2563eb',
        badgeBg: '#eff6ff',
        badgeBorder: '#bfdbfe',
        items: entry.items
      });
    });

    if (noDueDate.length > 0) {
      groups.push({
        id: 'no_due',
        title: 'Tarihsiz / Genel Ödevler',
        emoji: '📌',
        badgeColor: '#475569',
        badgeBg: '#f1f5f9',
        badgeBorder: '#e2e8f0',
        items: noDueDate
      });
    }

    if (completedList.length > 0) {
      groups.push({
        id: 'completed',
        title: 'Tamamlanan Ödevler',
        emoji: '✅',
        badgeColor: '#16a34a',
        badgeBg: '#dcfce7',
        badgeBorder: '#bbf7d0',
        items: completedList
      });
    }

    return groups;
  }, [filteredTests, activeTab]);

  const handleStartTask = (task) => {
    if (task.type === 'physicalExam' || task.isPhysical) {
      navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${selectedStudent.id}`);
    } else if (task.isBookAssignment || task.sourceType === 'trackedBook') {
      navigate(`/book-quiz/${task.bookTestId || task.realTestId || task.testId}?studentId=${selectedStudent.id}`);
    } else {
      navigate(`/quiz/${task.realTestId || task.hwId || task.id}?studentId=${selectedStudent.id}`);
    }
  };

  const handleReviewTask = (task) => {
    if (task.submissionId) {
      navigate(`/review/${task.submissionId}`);
    } else if (task.bookTestId || task.realTestId) {
      navigate(`/quiz-review/${task.bookTestId || task.realTestId}`);
    } else {
      navigate('/student-results');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '1.25rem 1rem 5rem',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .hw-anim { animation: fadeIn 0.25s ease both; }
        .hw-row:hover { filter: brightness(0.96); }
        .hw-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 0.85rem 1.15rem;
          transition: all 0.15s ease;
        }
        @media (max-width: 640px) {
          .hw-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
          .hw-row {
            padding: 0.75rem 0.85rem !important;
            gap: 0.6rem !important;
          }
          .hw-icon-box {
            width: 30px !important;
            height: 30px !important;
            font-size: 0.82rem !important;
          }
          .hw-title-text {
            font-size: 0.85rem !important;
          }
          .hw-meta-text {
            font-size: 0.68rem !important;
          }
          .hw-row-actions {
            gap: 4px !important;
          }
          .hw-row-actions button {
            padding: 0.42rem 0.75rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        
        {/* ─── TOP HEADER & ACTION BAR ─── */}
        <div className="hw-header-wrap hw-anim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                borderRadius: '0.75rem',
                padding: '0.5rem 0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: 'var(--color-text)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s'
              }}
            >
              <ArrowLeft size={16} /> Öğrenci Paneli
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.15rem',
                color: 'white',
                border: '2px solid var(--color-surface)',
                boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                flexShrink: 0
              }}>
                📋
              </div>
              <div>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: 'var(--color-text)', lineHeight: 1.2 }}>
                  Ödevlerim &amp; Görevlerim
                </h1>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                  {selectedStudent?.name ? `${selectedStudent.name} · ` : ''}Öğretmeniniz veya koçunuz tarafından atanan ödevler
                </div>
              </div>
            </div>
          </div>

          {/* Teacher selector if viewed by teacher/admin */}
          {currentUser?.role !== 'student' && studentMembers.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1.5px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto', maxWidth: '100%' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', marginLeft: 4 }}>👁️ Öğrenci:</span>
              <select
                value={selectedStudent?.id || ''}
                onChange={e => {
                  const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                  if (s) setSelectedStudent(s);
                }}
                style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', borderRadius: 8, padding: '0.3rem 0.6rem', fontSize: '0.76rem', fontWeight: 700, outline: 'none' }}
              >
                {studentMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className || 'Sınıf'})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ─── 4 SUMMARY METRIC CARDS ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          {/* Card 1: Toplam Görev */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(37,99,235,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              📚
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Toplam Görev</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>{allTests.length}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>({homeworkGroups.length} Set)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Bekleyen Ödev */}
          <div style={{
            background: 'var(--color-surface)',
            border: pendingTests.length > 0 ? '1.5px solid rgba(244,63,94,0.35)' : '1.5px solid var(--color-border)',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(239,68,68,0.12)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              ⏳
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Bekleyen Ödev</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f87171' }}>{pendingTests.length}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Çözüm bekliyor</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tamamlanan */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid rgba(16,185,129,0.3)',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              ✅
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Tamamlanan</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>{completedTests.length}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399' }}>Bitti 🎉</span>
              </div>
            </div>
          </div>

          {/* Card 4: Genel Tamamlama % */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid rgba(139,92,246,0.3)',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(124,58,237,0.12)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              🎯
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İlerleme</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#c084fc' }}>%{totalPct}</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalPct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB SWITCHER & FILTER CONTROLS ─── */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.15rem',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            {/* TABS */}
            <div style={{ display: 'inline-flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, overflowX: 'auto', maxWidth: '100%' }}>
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  background: activeTab === 'pending' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                  color: activeTab === 'pending' ? '#ffffff' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === 'pending' ? '0 2px 8px rgba(239,68,68,0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                ⏳ Bekleyenler ({pendingTests.length})
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                style={{
                  background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  color: activeTab === 'completed' ? '#ffffff' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === 'completed' ? '0 2px 8px rgba(16,185,129,0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                ✅ Tamamlananlar ({completedTests.length})
              </button>

              <button
                onClick={() => setActiveTab('all')}
                style={{
                  background: activeTab === 'all' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                  color: activeTab === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === 'all' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                📑 Tümü ({allTests.length})
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 340 }}>
              <Search size={15} color="var(--color-text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ödev veya test ara..."
                style={{
                  width: '100%',
                  background: 'var(--color-surface-hover)',
                  border: '1.5px solid var(--color-border-input)',
                  borderRadius: 10,
                  padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                  color: 'var(--color-text)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* SUBJECT FILTER PILLS */}
          {subjectsList.length > 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800, flexShrink: 0, marginRight: 2 }}>Ders:</span>
              {subjectsList.map(subj => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  style={{
                    background: selectedSubject === subj ? '#4f46e5' : 'var(--color-surface-hover)',
                    border: selectedSubject === subj ? '1.5px solid #4338ca' : '1px solid var(--color-border)',
                    color: selectedSubject === subj ? '#ffffff' : 'var(--color-text-muted)',
                    borderRadius: 99,
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s'
                  }}
                >
                  {subj === 'all' ? 'Tüm Dersler' : subj}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── HOMEWORKS LIST GROUPED BY DAYS ─── */}
        {dayGroupedHomeworks.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px dashed var(--color-border-input)',
            borderRadius: '1.25rem',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '1rem', background: 'rgba(37,99,235,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {activeTab === 'pending' ? '🎉' : '📂'}
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
              {activeTab === 'pending' ? 'Bekleyen Ödeviniz Bulunmuyor!' : 'Bu kriterde ödev kaydı bulunamadı.'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 420, margin: 0, lineHeight: 1.4 }}>
              {activeTab === 'pending'
                ? 'Tüm ödevlerinizi başarıyla tamamladınız. Harika bir performans! 🌟'
                : 'Farklı bir filtre seçerek veya arama terimini değiştirerek tekrar deneyebilirsiniz.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {dayGroupedHomeworks.map((group) => (
              <div key={group.id} className="hw-anim" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                
                {/* 📅 Gün Grubu Başlığı */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: '1.1rem' }}>{group.emoji}</span>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                      {group.title}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    background: group.badgeBg,
                    color: group.badgeColor,
                    border: `1px solid ${group.badgeBorder}`,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 99
                  }}>
                    {group.items.length} Ödev
                  </span>
                </div>

                {/* 📋 Günün Ödev Listesi (Kolay Liste Görünümü) */}
                <div style={{
                  background: 'var(--color-surface)',
                  border: group.isToday ? '1.5px solid #fde68a' : '1.5px solid var(--color-border)',
                  borderRadius: '1.15rem',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  {group.items.map((task, idx) => {
                    const rawDue = task.dueDate || task.assignedDueDate;
                    let dueLabel = '';
                    let isOverdue = false;
                    let isDueToday = false;

                    if (rawDue) {
                      const dueTime = new Date(rawDue).getTime();
                      const nowTime = new Date().setHours(0, 0, 0, 0);
                      const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0 && !task.isDone) isOverdue = true;
                      else if (diffDays === 0 && !task.isDone) isDueToday = true;
                      try {
                        dueLabel = new Date(rawDue).toLocaleDateString('tr-TR');
                      } catch {}
                    }

                    const isLast = idx === group.items.length - 1;
                    const rowTheme = getRowTheme(task.subject, idx);

                    // Clean up title duplication with book name
                    const rawTitle = task.title || task.name || task.testName || 'Ödev Görevi';
                    const rawBook = task.bookTitle || '';
                    let displayTitle = rawTitle;
                    if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                      const regex = new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                      displayTitle = displayTitle.replace(regex, '').replace(/^[\s\—\-\:\/]+/, '').trim();
                      if (!displayTitle) displayTitle = task.testName || rawTitle;
                    }

                    return (
                      <div
                        key={task.id}
                        className="hw-row"
                        style={{
                          background: 'var(--color-surface)',
                          borderLeft: `5px solid ${task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1')}`,
                          borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                          padding: '1rem 1.2rem 1rem 1.1rem',
                          display: 'flex',
                          alignItems: 'stretch',
                          gap: '0.9rem',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* SOL: Durum İkonu */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 2 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: task.isDone ? 'rgba(16,185,129,0.12)' : isOverdue ? 'rgba(225,29,72,0.1)' : isDueToday ? 'rgba(245,158,11,0.12)' : (rowTheme.badgeBg || 'var(--color-surface-hover)'),
                            color: task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1'),
                            border: `2px solid ${task.isDone ? 'rgba(16,185,129,0.3)' : isOverdue ? 'rgba(225,29,72,0.3)' : isDueToday ? 'rgba(245,158,11,0.3)' : (rowTheme.border || 'var(--color-border)')}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', fontWeight: 900, flexShrink: 0
                          }}>
                            {task.isDone ? '✓' : isOverdue ? '!' : isDueToday ? '⚡' : '⏳'}
                          </div>
                        </div>

                        {/* ORTA: Tüm Bilgiler */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>

                          {/* Rozet Satırı */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            {task.isDone ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: '#059669', background: '#d1fae5', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>✓ Tamamlandı</span>
                            ) : isOverdue ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: '#be123c', background: '#ffe4e6', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(225,29,72,0.25)', whiteSpace: 'nowrap' }}>
                                {rawDue ? ((() => { const d = Math.abs(Math.ceil((new Date(rawDue).getTime() - new Date().setHours(0,0,0,0)) / 86400000)); return d === 1 ? '⚠ 1 gün geçti' : `⚠ ${d} gün geçti`; })()) : '⚠ Süresi Doldu'}
                              </span>
                            ) : isDueToday ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(245,158,11,0.3)', whiteSpace: 'nowrap' }}>⚡ Bugün Son</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: rowTheme.text || '#6366f1', background: rowTheme.badgeBg || 'var(--color-surface-hover)', padding: '2px 7px', borderRadius: 99, border: `1px solid ${rowTheme.border || 'var(--color-border)'}`, whiteSpace: 'nowrap' }}>
                                {rawDue ? ((() => { const d = Math.ceil((new Date(rawDue).getTime() - new Date().setHours(0,0,0,0)) / 86400000); return d === 1 ? '⏳ Yarın son' : `⏳ ${d} gün kaldı`; })()) : '⏳ Bekliyor'}
                              </span>
                            )}
                            {task.subject && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: rowTheme.text || '#6366f1', background: rowTheme.badgeBg || 'var(--color-surface-hover)', padding: '2px 8px', borderRadius: 99, border: `1px solid ${rowTheme.border || 'var(--color-border)'}`, whiteSpace: 'nowrap' }}>
                                {task.subject}
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: task.isPhysical ? '#92400e' : task.isBookAssignment ? '#065f46' : '#4c1d95', background: task.isPhysical ? '#fef3c7' : task.isBookAssignment ? '#d1fae5' : '#ede9fe', padding: '2px 8px', borderRadius: 99, border: task.isPhysical ? '1px solid #fde68a' : task.isBookAssignment ? '1px solid #6ee7b7' : '1px solid #ddd6fe', whiteSpace: 'nowrap' }}>
                              {task.isPhysical ? '📋 Deneme' : task.isBookAssignment ? '📖 Kitap' : '🎯 Dijital'}
                            </span>
                          </div>

                          {/* Başlık */}
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                            {displayTitle}
                          </div>

                          {/* Kitap adı */}
                          {rawBook && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <BookOpen size={11} /> {rawBook}
                            </div>
                          )}

                          {/* Bilgi Çipleri */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                              <Target size={11} style={{ color: rowTheme.accent || '#6366f1' }} />
                              {task.questionCount || 20} Soru
                            </span>
                            {dueLabel && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: isOverdue ? '#be123c' : isDueToday ? '#b45309' : 'var(--color-text-muted)' }}>
                                <Calendar size={11} style={{ color: isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : rowTheme.accent || '#6366f1' }} />
                                Son: {dueLabel}
                              </span>
                            )}
                            {task.isDone && task.submittedAt && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                                <CheckCircle2 size={11} /> {new Date(task.submittedAt).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>

                          {/* Skor Çubuğu */}
                          {task.isDone && task.scorePct !== null && (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                  {task.correctAnswers || 0} / {task.totalScoreQuestions || task.questionCount || 20} doğru
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: task.scorePct >= 80 ? '#10b981' : task.scorePct >= 50 ? '#3b82f6' : '#e11d48' }}>
                                  %{task.scorePct}
                                </span>
                              </div>
                              <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${task.scorePct}%`,
                                  background: task.scorePct >= 80 ? 'linear-gradient(90deg,#34d399,#10b981)' : task.scorePct >= 50 ? 'linear-gradient(90deg,#60a5fa,#3b82f6)' : 'linear-gradient(90deg,#fb7185,#e11d48)',
                                  borderRadius: 99,
                                  transition: 'width 0.8s ease'
                                }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SAĞ: Aksiyon */}
                        <div className="hw-row-actions" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          {task.isDone ? (
                            <button
                              type="button"
                              onClick={() => handleReviewTask(task)}
                              style={{
                                background: 'rgba(59,130,246,0.1)',
                                color: '#3b82f6',
                                border: '1.5px solid rgba(59,130,246,0.35)',
                                borderRadius: 10,
                                padding: '0.5rem 0.9rem',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Eye size={13} /> İncele
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartTask(task)}
                              style={{
                                background: isOverdue
                                  ? 'linear-gradient(135deg,#e11d48,#be123c)'
                                  : isDueToday
                                    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                                    : `linear-gradient(135deg,${rowTheme.accent || '#6366f1'},${rowTheme.accent ? rowTheme.accent + 'cc' : '#4f46e5'})`,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                padding: '0.5rem 1rem',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: isOverdue
                                  ? '0 3px 12px rgba(225,29,72,0.3)'
                                  : isDueToday
                                    ? '0 3px 12px rgba(245,158,11,0.3)'
                                    : `0 3px 12px ${rowTheme.accent ? rowTheme.accent + '44' : 'rgba(99,102,241,0.3)'}`,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <PlayCircle size={14} />
                              {isOverdue ? 'Hemen Çöz' : isDueToday ? 'Bugün Çöz' : 'Çöz'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
