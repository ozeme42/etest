import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Edit2, BarChart2, ArrowRight, ArrowLeft, CheckSquare, Sparkles, BookOpen, Layers, Check, Search, Filter,
  GraduationCap, Calendar, AlertCircle, Eye, Send, Trophy, FileText, Image, FileJson,
  Trash2, Zap, Target, ClipboardList, CheckCheck, RefreshCw, Clock, Plus, X, Globe, Users, CheckCircle,
  HelpCircle, UserCheck, ShieldAlert, User, CheckCircle2, ChevronRight, Award, ExternalLink
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';

const subjectThemes = {
  'Matematik': { bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
  'Fen Bilimleri': { bg: 'linear-gradient(135deg,#10b981,#047857)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
  'Türkçe': { bg: 'linear-gradient(135deg,#ec4899,#be185d)', color: '#f472b6', border: 'rgba(244, 114, 182, 0.4)' },
  'Sosyal Bilgiler': { bg: 'linear-gradient(135deg,#f59e0b,#b45309)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' },
  'İngilizce': { bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#c084fc', border: 'rgba(192, 132, 252, 0.4)' },
  'Diger': { bg: 'linear-gradient(135deg,#64748b,#334155)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.4)' }
};
const getTheme = (subject) => subjectThemes[subject] || { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#818cf8', border: 'rgba(129, 140, 248, 0.4)' };

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 99999,
      background: 'linear-gradient(135deg,#059669,#10b981)',
      color: '#fff', padding: '0.85rem 1.4rem', borderRadius: '1rem',
      fontWeight: 800, fontSize: '0.85rem',
      boxShadow: '0 12px 36px rgba(5,150,105,0.5)',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      border: '1.5px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(12px)',
      animation: 'hwToastIn 0.35s ease'
    }}>
      <Sparkles size={16} /> {msg}
    </div>
  );
}

function GlassProgressBar({ value, max, color, customPct, customLabel }) {
  const pct = customPct !== undefined ? Math.min(100, Math.max(0, customPct)) : (max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0);
  const labelText = customLabel || `%{pct} (${value}/${max})`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Tamamlanma</span>
        <span style={{ color: color || '#818cf8', fontWeight: 900 }}>{labelText}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          background: pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : (color || 'linear-gradient(90deg,#6366f1,#818cf8)'),
          height: '100%', borderRadius: 99,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

export default function HomeworkManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { questions: allQuestions } = useQuestionBank();
  const { homeworks: allHomeworks, addHomework, updateHomework, deleteHomework, deleteAllHomeworks } = useHomework();
  const { users } = useUser();
  const { submissions, deleteSubmissionsByTestId, deleteAllSubmissions } = useEvaluation();
  const { books, bookTests } = useTrackedBooks();

  const students = useMemo(() => (users || []).filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id)), [users, currentUser]);
  const homeworks = useMemo(() => {
    let list = currentUser?.role === 'admin' ? (allHomeworks || []) : (allHomeworks || []).filter(hw => hw.assignedBy === currentUser?.id);
    return list.filter(hw => {
      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.title && (hw.title.includes('(Tüm Kitap') || hw.title.includes('(Kendi Eklediğim)')));
      return !isBook;
    });
  }, [allHomeworks, currentUser]);
  const questions = useMemo(() => currentUser?.role === 'admin' ? (allQuestions || []) : (allQuestions || []).filter(q => q.createdBy === currentUser?.id), [allQuestions, currentUser]);

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [subViewMode, setSubViewMode] = useState('homeworks'); // 'homeworks' | 'students'
  const [selectedStudentFilterInHwList, setSelectedStudentFilterInHwList] = useState('all');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState(null);
  const [studentListSearchQuery, setStudentListSearchQuery] = useState('');
  const [studentListGradeFilter, setStudentListGradeFilter] = useState('all');
  const [studentListStatusFilter, setStudentListStatusFilter] = useState('all');

  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeHomework, setActiveHomework] = useState(null);
  const [statsStudentFilter, setStatsStudentFilter] = useState('all');
  const [editingHwId, setEditingHwId] = useState(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  const [targetMode, setTargetMode] = useState('grade');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [selGrade, setSelGrade] = useState('all');
  const [selSubject, setSelSubject] = useState('all');
  const [selUnit, setSelUnit] = useState('all');
  const [selTopic, setSelTopic] = useState('all');
  const [selQuestionType, setSelQuestionType] = useState('all');
  const [selContentType, setSelContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('separate');
  const [selectedHwListIds, setSelectedHwListIds] = useState([]);

  useEffect(() => {
    if (location.state?.autoSelectQuestionId) {
      const qId = location.state.autoSelectQuestionId;
      setSelectedQuestionIds([qId]);
      const matchingQ = questions.find(q => q.id === qId);
      if (matchingQ && !title) setTitle(matchingQ.title || matchingQ.questionText || 'Soru Bankası Ödevi');
      setViewMode('create'); setStep(1);
    }
  }, [location.state, questions]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (selGrade !== 'all') {
        const gS = curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id);
        const gU = curData.units.filter(u => gS.includes(u.subjectId)).map(u => u.id);
        const gT = curData.topics.filter(t => gU.includes(t.unitId)).map(t => t.id);
        if (!gT.includes(q.topicId) && !gU.some(id => q.topicId === 'unit_' + id + '_all') && !gS.some(id => q.topicId === 'sub_' + id + '_all') && q.topicId !== 'grade_' + selGrade + '_all') return false;
      }
      if (selSubject !== 'all') {
        const sU = curData.units.filter(u => u.subjectId === selSubject).map(u => u.id);
        const sT = curData.topics.filter(t => sU.includes(t.unitId)).map(t => t.id);
        if (!sT.includes(q.topicId) && !sU.some(id => q.topicId === 'unit_' + id + '_all') && q.topicId !== 'sub_' + selSubject + '_all') return false;
      }
      if (selUnit !== 'all') {
        const uT = curData.topics.filter(t => t.unitId === selUnit).map(t => t.id);
        if (!uT.includes(q.topicId) && q.topicId !== 'unit_' + selUnit + '_all' && q.topicId !== selUnit) return false;
      }
      if (selTopic !== 'all' && q.topicId !== selTopic) return false;
      if (selQuestionType === 'coktan_secmeli' && q.type !== 'coktan_secmeli') return false;
      if (selQuestionType === 'acik_uclu' && q.type !== 'acik_uclu') return false;
      if (selQuestionType === 'bundle' && !q.isBundle) return false;
      if (selContentType !== 'all') {
        const ct = (q.contentType || '').toLowerCase();
        if (selContentType === 'pdf' && !ct.includes('pdf')) return false;
        if (selContentType === 'html' && !ct.includes('html')) return false;
        if (selContentType === 'text' && !ct.includes('text') && !ct.includes('metin')) return false;
        if (selContentType === 'gorsel' && !ct.includes('gorsel') && !ct.includes('image')) return false;
        if (selContentType === 'json' && !ct.includes('json') && !q.questionsList) return false;
      }
      if (searchQuery.trim()) {
        const sq = searchQuery.toLowerCase().trim();
        if (!(q.title || q.name || '').toLowerCase().includes(sq) && !(q.questionText || '').toLowerCase().includes(sq)) return false;
      }
      return true;
    });
  }, [questions, selGrade, selSubject, selUnit, selTopic, selQuestionType, selContentType, searchQuery, curData]);

  const resetForm = () => {
    setTitle(''); setDueDate(''); setTimePerQuestion(2);
    setTargetMode('grade'); setSelectedTargets([]); setStudentGradeFilter('all');
    setSelGrade('all'); setSelSubject('all'); setSelUnit('all'); setSelTopic('all');
    setSelQuestionType('all'); setSelContentType('all'); setSearchQuery('');
    setSelectedQuestionIds([]); setAssignmentMode('separate'); setEditingHwId(null); setStep(1); setViewMode('list');
  };

  const openEditPage = (hw) => {
    setEditingHwId(hw.id); setTitle(hw.title || '');
    setDueDate(hw.dueDate ? hw.dueDate.split('T')[0] : '');
    setTimePerQuestion(hw.timePerQuestion || 2);
    setTargetMode(hw.targetType || 'grade'); setSelectedTargets(hw.targetIds || []);
    setSelectedQuestionIds(hw.questionIds || []);
    setStep(1); setViewMode('create');
  };

  const setDueDatePreset = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const toggleQ = (id) => setSelectedQuestionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAllFiltered = () => {
    const fIds = filteredQuestions.map(q => q.id);
    const allSel = fIds.every(id => selectedQuestionIds.includes(id));
    if (allSel) setSelectedQuestionIds(prev => prev.filter(id => !fIds.includes(id)));
    else setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...fIds])));
  };

  const isStudentInGrade = (s, gObjOrId) => {
    if (!s || !gObjOrId) return false;
    const gId = typeof gObjOrId === 'object' ? gObjOrId.id : gObjOrId;
    const gName = typeof gObjOrId === 'object' ? gObjOrId.name : curData?.grades?.find(g => String(g.id) === String(gId) || g.name === gId)?.name;
    const matches = [s.gradeId, s.classId, s.grade, s.className];
    return matches.some(m => m && (String(m) === String(gId) || (gName && String(m).toLowerCase() === String(gName).toLowerCase())));
  };

  const filteredStudents = students.filter(s => studentGradeFilter === 'all' || isStudentInGrade(s, studentGradeFilter));

  const handleSelectAllTargets = () => {
    if (targetMode === 'grade') {
      const all = curData.grades.map(g => g.id);
      setSelectedTargets(selectedTargets.length === all.length ? [] : all);
    } else {
      const all = filteredStudents.map(s => s.id);
      setSelectedTargets(selectedTargets.length === all.length ? [] : all);
    }
  };

  const isHomeworkAssignedToStudent = (hw, student) => {
    if (!hw || !student) return false;
    if (hw.targetType === 'grade' || hw.targetType === 'class') {
      return (hw.targetIds || []).some(tid => isStudentInGrade(student, tid));
    }
    return (hw.targetIds || []).some(id => String(id) === String(student.id)) ||
           (hw.targetStudentIds || []).some(id => String(id) === String(student.id));
  };

  const getHomeworkTestIds = (hw) => {
    if (!hw) return [];
    if (hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
      return Object.keys(hw.testDueDates);
    }
    if (Array.isArray(hw.tests) && hw.tests.length > 0) {
      return hw.tests.map(String);
    }
    const bId = String(hw.bookId || hw.book_id || hw.metadata?.bookId || '');
    if (bId && bookTests && bookTests.length > 0) {
      const bTests = bookTests.filter(bt => String(bt.bookId || bt.book_id) === bId);
      if (bTests.length > 0) return bTests.map(bt => String(bt.id));
    }
    if (books && (hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.title && (hw.title.includes('(Tüm Kitap') || hw.title.includes('(Kendi Eklediğim)'))))) {
      const cleanTitle = (hw.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim().toLowerCase();
      const matchedBook = books.find(b => b.title && b.title.toLowerCase().trim() === cleanTitle);
      if (matchedBook) {
        const mbId = String(matchedBook.id);
        const bTests = (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === mbId);
        if (bTests.length > 0) return bTests.map(bt => String(bt.id));
        const rawSubs = (matchedBook.subjects && matchedBook.subjects.length > 0) ? matchedBook.subjects : (matchedBook.raw_data?.subjects || []);
        const gathered = [];
        rawSubs.forEach(s => {
          (s.topics || []).forEach(tp => {
            for (let i = 1; i <= 5; i++) {
              gathered.push(`tbt_${mbId}_${s.id}_${tp.id}_${i}`);
            }
          });
        });
        if (gathered.length > 0) return gathered;
      }
    }
    return [];
  };

  const isTestCompletedByStudent = (testId, studentId, hw) => {
    const tIdStr = String(testId || '');
    const sIdStr = String(studentId || '');
    const sUuidStr = String(toUUID(studentId) || '');
    const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
    const tUuidStr = String(toUUID(testId) || '');

    // 1. Check in hw.submissions
    const subInHw = (hw?.submissions || []).find(s => {
      const sStdId = String(s.studentId || s.student_id || '');
      const isMatchStudent = !sIdStr || sStdId === sIdStr || (sUuidStr && sStdId === sUuidStr) || (sUuidStr && toUUID(sStdId) === sUuidStr);
      if (!isMatchStudent) return false;
      if (s.status === 'in_progress' || s.status === 'draft' || s.isSubmitted === false) return false;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;

      const subFields = [
        String(s.testId || ''),
        String(s.test_id || ''),
        String(s.bookTestId || ''),
        String(s.realTestId || ''),
        String(s.metadata?.realTestId || ''),
        String(s.metadata?.bookTestId || ''),
        String(s.metadata?.realId || ''),
        String(s.extra_data?.realTestId || ''),
        String(s.extra_data?.bookTestId || '')
      ];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
        subFields.push(...s.bookTestIds.map(String));
      }
      return subFields.some(f => f && (
        f === tIdStr ||
        f === tCleanId ||
        f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
        (tUuidStr && f === tUuidStr) ||
        toUUID(f) === tIdStr ||
        (tUuidStr && toUUID(f) === tUuidStr)
      ));
    });
    if (subInHw) return subInHw;

    // 2. Check in EvaluationContext submissions
    const subInEval = (submissions || []).find(s => {
      const sStdId = String(s.studentId || s.student_id || '');
      const isMatchStudent = !sIdStr || sStdId === sIdStr || (sUuidStr && sStdId === sUuidStr) || (sUuidStr && toUUID(sStdId) === sUuidStr);
      if (!isMatchStudent) return false;
      if (s.status === 'in_progress' || s.status === 'draft' || s.isSubmitted === false) return false;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;

      const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || s.extra_data || {});
      const matchFields = [
        String(s.testId || ''),
        String(s.test_id || ''),
        String(s.realTestId || ''),
        String(s.bookTestId || ''),
        String(meta?.realTestId || ''),
        String(meta?.bookTestId || ''),
        String(meta?.realId || ''),
        String(s.extra_data?.realTestId || ''),
        String(s.extra_data?.bookTestId || '')
      ];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
        matchFields.push(...s.bookTestIds.map(String));
      }
      return matchFields.some(f => f && (
        f === tIdStr ||
        f === tCleanId ||
        f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
        (tUuidStr && f === tUuidStr) ||
        toUUID(f) === tIdStr ||
        (tUuidStr && toUUID(f) === tUuidStr)
      ));
    });
    return subInEval || null;
  };

  const getStudentSubmission = (hw, studentId) => {
    if (!hw || !studentId) return null;
    const sIdStr = String(studentId);
    const sUuidStr = String(toUUID(studentId) || '');
    const hwIdStr = String(hw.id || '');
    const hwCleanId = hwIdStr.replace(/^hw_/, '');

    const isMatch = s => {
      const sStdId = String(s.studentId || s.student_id || '');
      const isMatchStudent = !sIdStr || sStdId === sIdStr || (sUuidStr && sStdId === sUuidStr) || (sUuidStr && toUUID(sStdId) === sUuidStr);
      if (!isMatchStudent) return false;
      if (s.status === 'in_progress' || s.status === 'draft' || s.isSubmitted === false) return false;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;

      const sHwId = String(s.hwId || s.homeworkId || s.homework_id || '');
      const sTestId = String(s.testId || s.test_id || '');
      const sRealId = String(s.realTestId || s.metadata?.realTestId || s.metadata?.realId || '');

      return sHwId === hwIdStr || sHwId === hwCleanId || sTestId === hwIdStr || sTestId === hwCleanId || sRealId === hwIdStr || sRealId === hwCleanId || toUUID(sHwId) === toUUID(hwIdStr) || toUUID(sTestId) === toUUID(hwIdStr);
    };

    return (hw.submissions || []).find(isMatch) || (submissions || []).find(isMatch) || null;
  };

  const getHomeworkStats = (hw) => {
    const ids = (hw.targetType === 'grade' || hw.targetType === 'class')
      ? students.filter(s => (hw.targetIds || []).some(tid => isStudentInGrade(s, tid))).map(s => s.id)
      : (hw.targetIds || []);
    const totalStudents = ids.length;
    const testIds = getHomeworkTestIds(hw);
    const isMultiTest = testIds.length > 1;

    if (isMultiTest) {
      let totalPossibleTests = totalStudents * testIds.length;
      let totalCompletedTests = 0;
      let fullyCompletedStudents = 0;
      let studentProgressMap = {};

      ids.forEach(stId => {
        let stCompleted = 0;
        let stSubmissions = [];
        testIds.forEach(tId => {
          const sub = isTestCompletedByStudent(tId, stId, hw);
          if (sub) {
            stCompleted++;
            stSubmissions.push(sub);
          }
        });
        totalCompletedTests += stCompleted;
        if (stCompleted >= testIds.length && testIds.length > 0) {
          fullyCompletedStudents++;
        }
        studentProgressMap[stId] = {
          completedTests: stCompleted,
          totalTests: testIds.length,
          rate: testIds.length > 0 ? Math.round((stCompleted / testIds.length) * 100) : 0,
          isFullyCompleted: stCompleted >= testIds.length && testIds.length > 0,
          submissions: stSubmissions
        };
      });

      const rate = totalPossibleTests > 0 ? Math.round((totalCompletedTests / totalPossibleTests) * 100) : 0;

      return {
        total: totalStudents,
        completed: fullyCompletedStudents,
        rate,
        targetStudentIds: ids,
        isMultiTest: true,
        totalTestsPerStudent: testIds.length,
        totalPossibleTests,
        totalCompletedTests,
        fullyCompletedStudents,
        studentProgressMap,
        testIds
      };
    } else {
      // Single test homework
      const completed = ids.filter(stId => !!(
        (hw.submissions || []).find(s => String(s.studentId) === String(stId) && s.status !== 'in_progress' && s.status !== 'draft' && s.isSubmitted !== false) ||
        submissions.find(s => (String(s.hwId) === String(hw.id) || String(s.testId) === String(hw.id)) && String(s.studentId) === String(stId) && s.status !== 'in_progress' && s.status !== 'draft' && s.isSubmitted !== false)
      )).length;
      const rate = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;
      return {
        total: totalStudents,
        completed,
        rate,
        targetStudentIds: ids,
        isMultiTest: false,
        totalTestsPerStudent: 1,
        totalPossibleTests: totalStudents,
        totalCompletedTests: completed,
        fullyCompletedStudents: completed
      };
    }
  };

  const getTargetLabel = (hw) => {
    if (hw.targetType === 'grade' || hw.targetType === 'class') {
      const names = (curData?.grades || []).filter(g => (hw.targetIds || []).includes(g.id) || (hw.targetIds || []).includes(g.name)).map(g => g.name);
      if (names.length > 0) return names.join(', ');
      
      const hasRawId = Array.isArray(hw.targetIds) && hw.targetIds.some(id => id.startsWith('g_') || id.startsWith('c_'));
      if (hasRawId) return 'Silinmiş Sınıf';
      
      if (Array.isArray(hw.targetIds) && hw.targetIds.length > 0) return hw.targetIds.join(', ');
      return 'Tüm Sınıflar';
    }
    return (hw.targetIds?.length || 0) + ' Öğrenci';
  };

  const globalAnalytics = useMemo(() => {
    const now = new Date(new Date().setHours(0,0,0,0));
    let active = 0, expired = 0, rateSum = 0;
    homeworks.forEach(hw => {
      if (new Date(hw.dueDate) < now) expired++; else active++;
      rateSum += getHomeworkStats(hw).rate;
    });
    return { total: homeworks.length, active, expired, avgRate: homeworks.length ? Math.round(rateSum / homeworks.length) : 0 };
  }, [homeworks, students, submissions, books, bookTests]);

  const studentSummaries = useMemo(() => {
    const now = new Date(new Date().setHours(0, 0, 0, 0));
    return students.map(student => {
      const assignedHws = homeworks.filter(hw => isHomeworkAssignedToStudent(hw, student));
      
      let completedHwCount = 0;
      let scoreSum = 0;
      let scoreCount = 0;
      let totalAssignedHws = assignedHws.length;
      
      const hwDetails = assignedHws.map(hw => {
        const testIds = getHomeworkTestIds(hw);
        const isMultiTest = testIds.length > 1;
        const isPast = new Date(hw.dueDate) < now;

        if (isMultiTest) {
          let stCompleted = 0;
          let stSubmissions = [];
          testIds.forEach(tId => {
            const sub = isTestCompletedByStudent(tId, student.id, hw);
            if (sub) {
              stCompleted++;
              stSubmissions.push(sub);
              if (sub.score !== undefined && sub.score !== null && !isNaN(Number(sub.score))) {
                scoreSum += Number(sub.score);
                scoreCount++;
              } else if (sub.totalQuestions > 0 && sub.correctCount !== undefined) {
                const pct = Math.round((sub.correctCount / sub.totalQuestions) * 100);
                scoreSum += pct;
                scoreCount++;
              }
            }
          });
          const isDone = stCompleted >= testIds.length && testIds.length > 0;
          const progressRate = testIds.length > 0 ? Math.round((stCompleted / testIds.length) * 100) : 0;
          if (isDone) completedHwCount++;

          return {
            homework: hw,
            submission: stSubmissions[0] || null,
            submissionsList: stSubmissions,
            isDone,
            isMultiTest: true,
            completedTestsCount: stCompleted,
            totalTestsCount: testIds.length,
            progressRate,
            isPast
          };
        } else {
          const sub = getStudentSubmission(hw, student.id);
          const isDone = !!sub;
          if (isDone) {
            completedHwCount++;
            if (sub.score !== undefined && sub.score !== null && !isNaN(Number(sub.score))) {
              scoreSum += Number(sub.score);
              scoreCount++;
            } else if (sub.totalQuestions > 0 && sub.correctCount !== undefined) {
              const pct = Math.round((sub.correctCount / sub.totalQuestions) * 100);
              scoreSum += pct;
              scoreCount++;
            }
          }
          return {
            homework: hw,
            submission: sub,
            submissionsList: sub ? [sub] : [],
            isDone,
            isMultiTest: false,
            completedTestsCount: isDone ? 1 : 0,
            totalTestsCount: 1,
            progressRate: isDone ? 100 : 0,
            isPast
          };
        }
      });

      const total = totalAssignedHws;
      const completed = completedHwCount;
      const pending = total - completed;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;

      const gradeObj = curData?.grades?.find(g => isStudentInGrade(student, g));
      const gradeName = gradeObj?.name || student.grade || student.gradeId || 'Sınıf Belirtilmemiş';

      return {
        student,
        gradeName,
        assignedHws,
        hwDetails,
        total,
        completed,
        pending,
        rate,
        avgScore
      };
    });
  }, [students, homeworks, submissions, curData, books, bookTests]);

  const studentGlobalAnalytics = useMemo(() => {
    const totalStudents = students.length;
    const withHw = studentSummaries.filter(s => s.total > 0).length;
    const withPending = studentSummaries.filter(s => s.pending > 0).length;
    const allCompleted = studentSummaries.filter(s => s.total > 0 && s.pending === 0).length;
    const avgOverallRate = withHw > 0
      ? Math.round(studentSummaries.reduce((acc, s) => acc + (s.total > 0 ? s.rate : 0), 0) / withHw)
      : 0;

    return {
      totalStudents,
      withHw,
      withPending,
      allCompleted,
      avgOverallRate
    };
  }, [students, studentSummaries]);

  const filteredStudentSummaries = useMemo(() => {
    return studentSummaries.filter(item => {
      if (studentListGradeFilter !== 'all') {
        if (!isStudentInGrade(item.student, studentListGradeFilter)) return false;
      }
      if (studentListStatusFilter === 'has_homework' && item.total === 0) return false;
      if (studentListStatusFilter === 'has_pending' && item.pending === 0) return false;
      if (studentListStatusFilter === 'all_completed' && (item.total === 0 || item.pending > 0)) return false;

      if (studentListSearchQuery.trim()) {
        const sq = studentListSearchQuery.toLowerCase().trim();
        const name = (item.student.name || '').toLowerCase();
        const email = (item.student.email || '').toLowerCase();
        const num = (item.student.studentNumber || item.student.username || '').toLowerCase();
        if (!name.includes(sq) && !email.includes(sq) && !num.includes(sq)) return false;
      }

      return true;
    });
  }, [studentSummaries, studentListGradeFilter, studentListStatusFilter, studentListSearchQuery]);

  const canStep2 = !!(title.trim() && dueDate);
  const canSubmit = !!(title.trim() && dueDate && selectedTargets.length > 0 && selectedQuestionIds.length > 0);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('⚠️ Lütfen Ödev Başlığını giriniz!');
      setStep(1);
      return;
    }
    if (!dueDate) {
      showToast('⚠️ Lütfen Son Teslim Tarihini seçiniz!');
      setStep(1);
      return;
    }
    if (selectedTargets.length === 0) {
      showToast('⚠️ Lütfen ödev atanacak En Az 1 Sınıf veya Öğrenci seçiniz!');
      setStep(2);
      return;
    }
    if (selectedQuestionIds.length === 0) {
      showToast('⚠️ Lütfen ödeve eklenecek En Az 1 Soru seçiniz!');
      setStep(3);
      return;
    }

    const selectedQs = questions.filter(q => selectedQuestionIds.includes(q.id));
    const physicalExam = selectedQs.find(q => q.contentType === 'physicalExam');
    const isPhysical = !!physicalExam;
    const totalQCount = isPhysical ? physicalExam.totalQuestions : selectedQs.reduce((acc, q) => acc + (q.questionCount || q.totalQuestions || q.qCount || (Array.isArray(q.answerKey) ? q.answerKey.length : 1)), 0);
    const firstQ = selectedQs[0] || {};
    const firstSub = firstQ.subject || firstQ.subjectName || 'Genel';

    const sectionsWithPayloads = await Promise.all(selectedQs.map(async (q, idx) => {
      let pdfPayload = q.pdfPayload;
      let contentPayload = q.contentPayload;

      const needsIdb = (p) => !p || p === '[STORED_IN_INDEXEDDB]' || p === '[LOCALSTORAGE_CACHE]';
      if (needsIdb(pdfPayload) || needsIdb(contentPayload)) {
        const idVariants = [
          q.id,
          String(q.id).replace(/^q_?/, ''),
          String(q.id).replace(/^q_?/, 'q_'),
          String(q.id).replace(/^q_?/, 'q'),
        ];
        for (const idv of idVariants) {
          try {
            const val = await idbGetPayload(idv);
            if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
              if (needsIdb(pdfPayload) && (q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || (typeof val === 'string' && val.startsWith('data:application/pdf')))) {
                pdfPayload = val;
              } else if (needsIdb(contentPayload)) {
                contentPayload = val;
              }
              break;
            }
          } catch (e) {}
        }
      }

      return {
        id: q.id,
        questionId: q.id,
        title: q.title || q.name || `${idx + 1}. Bölüm`,
        contentType: q.contentType || q.type || q.formatType || q.sourceFormat,
        formatType: q.formatType || q.sourceFormat,
        sourceFormat: q.sourceFormat,
        questionCount: q.questionCount || q.totalQuestions || q.qCount || (Array.isArray(q.answerKey) ? q.answerKey.length : 1),
        questionType: q.questionType || q.type,
        // Bug 4 Fix: isOpenEnded was missing from sections — checkIsOE() needs it
        isOpenEnded: q.isOpenEnded || q.type === 'acik_uclu' || q.contentType === 'acik_uclu' || q.contentType === 'gorsel_klasik' || q.type === 'gorsel_klasik' || q.questionType === 'acik_uclu',
        answerKey: q.answerKey,
        questionsList: q.questionsList,
        questions: q.questions,
        options: q.options,
        questionText: q.questionText || q.text,
        pdfPayload: needsIdb(pdfPayload) ? undefined : pdfPayload,
        contentPayload: needsIdb(contentPayload) ? undefined : contentPayload,
        // Bug 3 Fix: htmlPayload was missing from sections — StableHtmlViewer needs it in bundled mode
        htmlPayload: needsIdb(q.htmlPayload) ? undefined : q.htmlPayload,
        pdfUrl: q.pdfUrl,
        imageUrls: q.imageUrls,
      };

    }));

    if (selectedQuestionIds.length > 1 && assignmentMode === 'separate' && !editingHwId) {
      for (let i = 0; i < selectedQs.length; i++) {
        const q = selectedQs[i];
        let pdfPayload = q.pdfPayload;
        let contentPayload = q.contentPayload;
        const needsIdb = (p) => !p || p === '[STORED_IN_INDEXEDDB]' || p === '[LOCALSTORAGE_CACHE]';
        if (needsIdb(pdfPayload) || needsIdb(contentPayload)) {
          const idVariants = [
            q.id,
            String(q.id).replace(/^q_?/, ''),
            String(q.id).replace(/^q_?/, 'q_'),
            String(q.id).replace(/^q_?/, 'q'),
          ];
          for (const idv of idVariants) {
            try {
              const val = await idbGetPayload(idv);
              if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
                if (needsIdb(pdfPayload) && (q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || (typeof val === 'string' && val.startsWith('data:application/pdf')))) {
                  pdfPayload = val;
                } else if (needsIdb(contentPayload)) {
                  contentPayload = val;
                }
                break;
              }
            } catch (e) {}
          }
        }

        const qCount = q.questionCount || q.totalQuestions || q.qCount || (Array.isArray(q.answerKey) ? q.answerKey.length : 1);
        const subHwData = {
          title: q.title || q.name || `${title} (${i + 1}. Test)`,
          dueDate,
          timePerQuestion: parseInt(timePerQuestion, 10),
          totalQuestions: qCount,
          subject: q.subject || q.subjectName || firstSub,
          targetType: targetMode,
          targetIds: selectedTargets,
          questionIds: [q.id],
          questionsList: q.questionsList,
          questions: q.questions,
          options: q.options,
          questionText: q.questionText || q.text,
          assignedBy: currentUser?.id,
          type: q.contentType === 'physicalExam' ? 'physicalExam' : 'test',
          contentType: q.contentType || q.type || 'test',
          contentPayload: needsIdb(contentPayload) ? undefined : contentPayload,
          pdfPayload: needsIdb(pdfPayload) ? undefined : pdfPayload,
          htmlPayload: q.htmlPayload,
          pdfUrl: q.pdfUrl,
          imageUrls: q.imageUrls,
          questionType: q.questionType || q.type,
          isOpenEnded: q.isOpenEnded || q.type === 'acik_uclu' || q.contentType === 'acik_uclu' || q.contentType === 'gorsel_klasik' || q.type === 'gorsel_klasik',
          answerKey: q.answerKey,
          subjects: q.subjects,
          penaltyRatio: q.penaltyRatio,
          examType: q.examType
        };
        addHomework(subHwData);
      }
      showToast(`🎉 ${selectedQs.length} adet ödev ayrı ayrı başarıyla yayınlandı!`);
      resetForm();
      return;
    }

    const hwData = {
      title, dueDate, timePerQuestion: parseInt(timePerQuestion, 10),
      totalQuestions: totalQCount, subject: firstSub,
      targetType: targetMode, targetIds: selectedTargets,
      questionIds: selectedQuestionIds, assignedBy: currentUser?.id,
      questionsList: firstQ.questionsList,
      questions: firstQ.questions,
      options: firstQ.options,
      questionText: firstQ.questionText || firstQ.text,
      type: isPhysical ? 'physicalExam' : 'test',
      contentType: isPhysical ? 'physicalExam' : (firstQ.contentType || firstQ.type || 'test'),
      contentPayload: firstQ.contentPayload,
      pdfPayload: firstQ.pdfPayload,
      htmlPayload: firstQ.htmlPayload,
      questionType: firstQ.questionType || firstQ.type,
      isOpenEnded: firstQ.isOpenEnded || firstQ.type === 'acik_uclu' || firstQ.contentType === 'acik_uclu' || firstQ.contentType === 'gorsel_klasik' || firstQ.type === 'gorsel_klasik',
      answerKey: isPhysical ? physicalExam.answerKey : undefined,
      subjects: isPhysical ? physicalExam.subjects : undefined,
      penaltyRatio: isPhysical ? physicalExam.penaltyRatio : undefined,
      examType: isPhysical ? physicalExam.examType : undefined,
      sections: sectionsWithPayloads
    };
    if (editingHwId) { updateHomework(editingHwId, hwData); showToast('🎉 Ödev güncellendi!'); }
    else { addHomework(hwData); showToast('🎉 Ödev başarıyla yayınlandı!'); }
    resetForm();
  };

  const getQIcon = (ct) => {
    if (!ct) return <FileText size={13} color="#94a3b8" />;
    const c = ct.toLowerCase();
    if (c.includes('pdf')) return <FileText size={13} color="#f87171" />;
    if (c.includes('html')) return <Globe size={13} color="#60a5fa" />;
    if (c.includes('gorsel') || c.includes('image')) return <Image size={13} color="#34d399" />;
    if (c.includes('json')) return <FileJson size={13} color="#c084fc" />;
    return <FileText size={13} color="#94a3b8" />;
  };

  const pageContainerStyle = {
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    padding: '1.25rem 1.5rem 5rem 1.5rem',
    background: 'var(--color-bg)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: 'var(--color-text)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  };

  const glassCardStyle = {
    background: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '1.5rem',
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
    padding: '1.5rem',
    boxSizing: 'border-box'
  };

  if (viewMode === 'list') {
    const now = new Date(new Date().setHours(0,0,0,0));
    const filteredHw = homeworks.filter(hw => {
      const past = new Date(hw.dueDate) < now;
      if (activeTab === 'active' && past) return false;
      if (activeTab === 'expired' && !past) return false;
      if (selectedStudentFilterInHwList !== 'all') {
        const targetStudent = students.find(s => s.id === selectedStudentFilterInHwList);
        if (targetStudent && !isHomeworkAssignedToStudent(hw, targetStudent)) return false;
      }
      return true;
    });

    const isAllHwSelected = filteredHw.length > 0 && selectedHwListIds.length === filteredHw.length;

    const handleToggleSelectAllHw = () => {
      if (isAllHwSelected) {
        setSelectedHwListIds([]);
      } else {
        setSelectedHwListIds(filteredHw.map(h => h.id));
      }
    };

    const handleToggleHwSelect = (id, e) => {
      if (e) e.stopPropagation();
      setSelectedHwListIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    };

    const handleDeleteSelectedHw = () => {
      if (selectedHwListIds.length === 0) return;
      const count = selectedHwListIds.length;
      if (!window.confirm(`Seçilen ${count} adet ödevi ve bunlara ait tüm öğrenci yanıtlarını silmek istediğinize emin misiniz?`)) return;

      selectedHwListIds.forEach(id => {
        deleteHomework(id);
        deleteSubmissionsByTestId(id);
      });
      setSelectedHwListIds([]);
      showToast(`🗑️ ${count} adet ödev başarıyla silindi!`);
    };

    return (
      <div style={pageContainerStyle}>
        <Toast msg={toast} />

        {/* ══════════ STICKY TOP CONTROL HEADER ══════════ */}
        <header style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.5rem',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
              }}
              style={{
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                borderRadius: '0.75rem',
                padding: '0.55rem 0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                color: 'var(--color-text)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <ArrowLeft size={16} /> Geri Dön
            </button>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                <Sparkles size={13} /> LMS Ödev &amp; Görev Masası
              </div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                Ödev &amp; Test Yönetim Merkezi 📝
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Ödev havuzu takibi, öğrenci bazlı karne incelemesi ve canlı sınav değerlendirmesi.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  if (window.confirm('Tüm ödevleri silmek istediğinize emin misiniz?')) {
                    if (typeof deleteAllHomeworks === 'function') deleteAllHomeworks();
                    if (typeof deleteAllSubmissions === 'function') deleteAllSubmissions();
                  }
                }}
                style={{
                  padding: '0.55rem 1rem', borderRadius: '0.75rem',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', fontWeight: 800, fontSize: '0.78rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Trash2 size={14} /> Tümünü Sil
              </button>
            )}
            <button
              onClick={() => { resetForm(); setViewMode('create'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
              }}
            >
              <Sparkles size={16} /> + Yeni Ödev Sihirbazı
            </button>
          </div>
        </header>

        {/* ══════════ VIEW SELECTOR TABS (ÖDEV BAZLI vs ÖĞRENCİ BAZLI) ══════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--color-surface)',
          padding: '0.6rem 1rem',
          borderRadius: '1.25rem',
          border: '1.5px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-surface-hover)', padding: '0.3rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setSubViewMode('homeworks')}
              style={{
                padding: '0.5rem 1.15rem',
                borderRadius: '0.65rem',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: subViewMode === 'homeworks' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                color: subViewMode === 'homeworks' ? '#ffffff' : 'var(--color-text-muted)',
                boxShadow: subViewMode === 'homeworks' ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ClipboardList size={16} /> 📋 Ödev Bazlı Görünüm ({homeworks.length})
            </button>
            <button
              type="button"
              onClick={() => setSubViewMode('students')}
              style={{
                padding: '0.5rem 1.15rem',
                borderRadius: '0.65rem',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: subViewMode === 'students' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                color: subViewMode === 'students' ? '#ffffff' : 'var(--color-text-muted)',
                boxShadow: subViewMode === 'students' ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={16} /> 👨‍🎓 Öğrenci Bazlı Takip ({students.length})
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            {subViewMode === 'homeworks'
              ? 'Tüm tanımlı ödevlerin teslim oranlarını ve sınıf raporlarını izleyin.'
              : 'Öğrenci bazında tamamlanan ve bekleyen ödevleri, başarı puanlarını tek ekranda inceleyin.'}
          </div>
        </div>

        {/* ══════════ SUBVIEW 1: HOMEWORKS LIST ══════════ */}
        {subViewMode === 'homeworks' && (
          <>
            {/* 4 LIVE KPI HERO METRIC CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              <div
                onClick={() => { resetForm(); setViewMode('create'); }}
                style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem', padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  cursor: 'pointer', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(37,99,235,0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Yeni Görev</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>+ Oluştur</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Sihirbazı Başlat</span>
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Aktif Ödevler</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{globalAnalytics.active} Ödev</span>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>Süresi devam eden</span>
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(2,132,199,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trophy size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Ortalama Katılım</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>%{globalAnalytics.avgRate}</span>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>Öğrenci teslim oranı</span>
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(239,68,68,0.12)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Süresi Bitenler</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{globalAnalytics.expired} Ödev</span>
                  <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>Teslim süresi doldu</span>
                </div>
              </div>
            </div>

            {/* HOMEWORK LIST CONTAINER */}
            <div style={glassCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardList size={20} color="#818cf8" /> Ödev Havuzu &amp; Takip Tablosu
                  </div>

                  {/* Student Filter in Homework List */}
                  <select
                    value={selectedStudentFilterInHwList}
                    onChange={(e) => setSelectedStudentFilterInHwList(e.target.value)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.6rem',
                      border: '1.5px solid var(--color-border-input)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">👨‍🎓 Tüm Öğrenciler ({students.length})</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>👨‍🎓 {s.name}</option>
                    ))}
                  </select>

                  {filteredHw.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllHw}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: isAllHwSelected ? '1.5px solid #6366f1' : '1.5px solid var(--color-border-input)',
                        background: isAllHwSelected ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                        color: isAllHwSelected ? '#ffffff' : 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <CheckCheck size={14} />
                      {isAllHwSelected ? 'Tüm Seçimi Kaldır' : `Tümünü Seç (${filteredHw.length})`}
                    </button>
                  )}

                  {selectedHwListIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#60a5fa', background: 'rgba(37,99,235,0.12)', padding: '0.3rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #3b82f6' }}>
                        {selectedHwListIds.length} Seçildi
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedHw}
                        style={{
                          padding: '0.38rem 0.85rem', borderRadius: '0.6rem', border: 'none',
                          background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff',
                          fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          boxShadow: '0 2px 8px rgba(220,38,38,0.25)'
                        }}
                      >
                        <Trash2 size={13} /> Seçilenleri Sil ({selectedHwListIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedHwListIds([])}
                        style={{
                          padding: '0.35rem 0.6rem', borderRadius: '0.6rem',
                          border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer'
                        }}
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem', padding: '0.3rem', border: '1px solid var(--color-border)' }}>
                  {[
                    { key: 'all', label: 'Tümü (' + globalAnalytics.total + ')' },
                    { key: 'active', label: 'Aktif (' + globalAnalytics.active + ')' },
                    { key: 'expired', label: 'Biten (' + globalAnalytics.expired + ')' }
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setActiveTab(t.key); setSelectedHwListIds([]); }}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '0.55rem', border: 'none',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        background: activeTab === t.key ? (t.key === 'expired' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#4f46e5,#6366f1)') : 'transparent',
                        color: activeTab === t.key ? '#ffffff' : 'var(--color-text-muted)',
                        boxShadow: activeTab === t.key ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHw.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <BookOpen size={48} style={{ opacity: 0.35 }} />
                  <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.05rem' }}>Bu kriterlerde ödev bulunamadı.</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Filtreleri değiştirerek veya Yeni Ödev Sihirbazı ile ödev tanımlayabilirsiniz!</div>
                  <button
                    onClick={() => { resetForm(); setViewMode('create'); }}
                    style={{
                      marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '0.65rem 1.35rem', borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                      border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                      cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
                    }}
                  >
                    <Plus size={15} /> Yeni Ödev Oluştur
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 780 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                        <th style={{ width: 44, padding: '0.85rem 0.5rem 0.85rem 1rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isAllHwSelected}
                            onChange={handleToggleSelectAllHw}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                            title="Tümünü Seç / Kaldır"
                          />
                        </th>
                        {['Ödev / Başlık', 'Hedef Kitle', 'Son Tarih', 'İlerleme & Katılım', 'İşlemler'].map((h, i) => (
                          <th key={h} style={{ padding: '0.85rem 1rem', textAlign: i === 4 ? 'right' : 'left', fontWeight: 900, fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHw.map(hw => {
                        const stats = getHomeworkStats(hw);
                        const isPast = new Date(hw.dueDate) < now;
                        const theme = getTheme(hw.subject);
                        const isSelected = selectedHwListIds.includes(hw.id);

                        return (
                          <tr 
                            key={hw.id}
                            style={{ 
                              borderBottom: '1px solid var(--color-border)', 
                              transition: 'background 0.15s',
                              background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent'
                            }}
                          >
                            <td style={{ width: 44, padding: '0.9rem 0.5rem 0.9rem 1rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleToggleHwSelect(hw.id, e)}
                                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                              />
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${theme.border}` }}>
                                  <BookOpen size={16} color={theme.color} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.88rem', lineHeight: 1.3 }}>{hw.title}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: theme.color, fontWeight: 800 }}>{hw.subject || 'Ders'}</span>
                                    {stats.isMultiTest && <span style={{ color: '#818cf8', fontWeight: 800 }}>• 📚 {stats.totalTestsPerStudent} Test</span>}
                                    <span>• {hw.totalQuestions} Soru</span>
                                    <span>• {hw.timePerQuestion} dk/soru</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <span style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6', fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                {getTargetLabel(hw)}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 800, color: isPast ? '#f87171' : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                                <Calendar size={13} color={isPast ? '#f87171' : '#818cf8'} /> {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
                              </div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isPast ? '#f87171' : '#34d399', marginTop: 2 }}>
                                {isPast ? '⚠️ Süresi Doldu' : '✅ Devam Ediyor'}
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1rem', minWidth: 160 }}>
                              <GlassProgressBar
                                customPct={stats.rate}
                                customLabel={
                                  stats.isMultiTest
                                    ? (stats.total === 1
                                        ? `%{stats.rate} (${stats.totalCompletedTests}/${stats.totalTestsPerStudent} Test)`
                                        : `%{stats.rate} (${stats.totalCompletedTests}/${stats.totalPossibleTests} Test · ${stats.completed}/${stats.total} Bitiren)`)
                                    : `%{stats.rate} (${stats.completed}/${stats.total} Öğrenci)`
                                }
                                color={stats.rate === 100 ? '#10b981' : theme.color}
                              />
                            </td>
                            <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                <button
                                  onClick={() => { setActiveHomework(hw); setStatsStudentFilter('all'); setShowStatsModal(true); }}
                                  style={{
                                    padding: '0.4rem 0.85rem', borderRadius: '0.6rem',
                                    background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                    color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.75rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                                  }}
                                >
                                  <BarChart2 size={13} /> Rapor
                                </button>
                                <button
                                  onClick={() => openEditPage(hw)}
                                  style={{
                                    padding: '0.4rem', borderRadius: '0.6rem',
                                    background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)',
                                    cursor: 'pointer', display: 'flex', color: 'var(--color-text)'
                                  }}
                                  title="Düzenle"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Bu ödevi silmek istediğinize emin misiniz?')) {
                                      deleteHomework(hw.id);
                                      deleteSubmissionsByTestId(hw.id);
                                    }
                                  }}
                                  style={{
                                    padding: '0.4rem', borderRadius: '0.6rem',
                                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                                    cursor: 'pointer', display: 'flex', color: '#f87171'
                                  }}
                                  title="Sil"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════ SUBVIEW 2: STUDENT-CENTRIC TRACKING DASHBOARD ══════════ */}
        {subViewMode === 'students' && (
          <>
            {/* 4 LIVE STUDENT KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(37,99,235,0.12)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Toplam Öğrenci</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{studentGlobalAnalytics.totalStudents} Öğrenci</span>
                  <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700 }}>Kayıtlı öğrenciler</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Ödevi Olanlar</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{studentGlobalAnalytics.withHw} Öğrenci</span>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>Ödev tanımlı</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Eksik / Bekleyen</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{studentGlobalAnalytics.withPending} Öğrenci</span>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>Teslim beklenen</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trophy size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Ortalama Tamamlama</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>%{studentGlobalAnalytics.avgOverallRate}</span>
                  <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700 }}>Genel öğrenci başarısı</span>
                </div>
              </div>
            </div>

            {/* STUDENT LIST CONTAINER */}
            <div style={glassCardStyle}>
              {/* Search, Grade & Status Filters */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
                  <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Öğrenci adı, soyadı veya no ile ara..."
                      value={studentListSearchQuery}
                      onChange={(e) => setStudentListSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.85rem 0.5rem 2.2rem',
                        borderRadius: '0.65rem',
                        border: '1.5px solid var(--color-border-input)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={studentListGradeFilter}
                    onChange={(e) => setStudentListGradeFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid var(--color-border-input)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Sınıflar</option>
                    {(curData?.grades || []).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem', padding: '0.3rem', border: '1px solid var(--color-border)' }}>
                  {[
                    { key: 'all', label: `Tümü (${studentSummaries.length})` },
                    { key: 'has_homework', label: `Ödevi Olanlar (${studentGlobalAnalytics.withHw})` },
                    { key: 'has_pending', label: `Eksik / Bekleyen (${studentGlobalAnalytics.withPending})` },
                    { key: 'all_completed', label: `Tamamlayan (${studentGlobalAnalytics.allCompleted})` },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setStudentListStatusFilter(t.key)}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '0.55rem', border: 'none',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        background: studentListStatusFilter === t.key ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                        color: studentListStatusFilter === t.key ? '#ffffff' : 'var(--color-text-muted)',
                        boxShadow: studentListStatusFilter === t.key ? '0 4px 12px rgba(79,70,229,0.25)' : 'none'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredStudentSummaries.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <Users size={48} style={{ opacity: 0.35 }} />
                  <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.05rem' }}>Eşleşen öğrenci bulunamadı.</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Filtreleri veya arama kriterini değiştirerek tekrar deneyiniz.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 780 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                        {['Öğrenci', 'Sınıf / Şube', 'Atanan Ödev', 'Tamamlanan / Bekleyen', 'Tamamlanma Oranı', 'Ortalama Başarı', 'İşlemler'].map((h, i) => (
                          <th key={h} style={{ padding: '0.85rem 1rem', textAlign: i === 6 ? 'right' : 'left', fontWeight: 900, fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentSummaries.map(({ student, gradeName, total, completed, pending, rate, avgScore, hwDetails }) => {
                        return (
                          <tr
                            key={student.id}
                            style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                          >
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.2)' }}>
                                  {(student.name || 'Ö').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.88rem', lineHeight: 1.3 }}>{student.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                    {student.email || student.username || (student.studentNumber ? `No: ${student.studentNumber}` : 'Öğrenci')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <span style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6', fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                {gradeName}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 900, color: 'var(--color-text)', fontSize: '0.85rem' }}>
                                {total} Ödev
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.45rem' }}>
                                  ✓ {completed} Bitti
                                </span>
                                {pending > 0 && (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.45rem' }}>
                                    ⏳ {pending} Bekliyor
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1rem', minWidth: 160 }}>
                              <GlassProgressBar value={completed} max={total} color={rate === 100 ? '#10b981' : rate > 50 ? '#6366f1' : '#f59e0b'} />
                            </td>
                            <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                              {avgScore !== null ? (
                                <span style={{
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '0.5rem',
                                  background: avgScore >= 70 ? 'rgba(16,185,129,0.15)' : avgScore >= 50 ? 'rgba(37,99,235,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: avgScore >= 70 ? '#34d399' : avgScore >= 50 ? '#60a5fa' : '#f87171',
                                  border: `1px solid ${avgScore >= 70 ? '#10b981' : avgScore >= 50 ? '#3b82f6' : '#ef4444'}`,
                                  fontWeight: 900,
                                  fontSize: '0.8rem'
                                }}>
                                  %{avgScore}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForDetail({ student, gradeName, total, completed, pending, rate, avgScore, hwDetails })}
                                style={{
                                  padding: '0.45rem 0.95rem',
                                  borderRadius: '0.65rem',
                                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Eye size={13} /> Ödevleri İncele ({total})
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
          </>
        )}

        {/* ══════════ REPORT / STATS MODAL (HOMEWORK-CENTRIC) ══════════ */}
        {showStatsModal && activeHomework && (() => {
          const stats = getHomeworkStats(activeHomework);
          const isPast = new Date(activeHomework.dueDate) < now;
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '1.5rem', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
                padding: '1.75rem', border: '1.5px solid var(--color-border)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--color-text)' }}>{activeHomework.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>Son Tarih: {new Date(activeHomework.dueDate).toLocaleDateString('tr-TR')} · {isPast ? '⚠️ Süresi Doldu' : '✅ Devam Ediyor'}</span>
                      {stats.isMultiTest && <span style={{ color: '#818cf8', fontWeight: 800 }}>• 📚 Toplam {stats.totalTestsPerStudent} Alt Test</span>}
                    </div>
                  </div>
                  <button onClick={() => setShowStatsModal(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.25)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>{stats.total}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', marginTop: 2 }}>Atanan Öğrenci</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>
                      {stats.isMultiTest ? `${stats.totalCompletedTests} / ${stats.totalPossibleTests}` : `${stats.completed}`}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34d399', textTransform: 'uppercase', marginTop: 2 }}>
                      {stats.isMultiTest ? 'Çözülen Test' : 'Tamamlayan'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>%{stats.rate}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', marginTop: 2 }}>Katılım Oranı</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem', padding: '0.35rem', border: '1px solid var(--color-border)' }}>
                  {[
                    { key: 'all', label: 'Tümü (' + stats.total + ')' },
                    { key: 'completed', label: (stats.isMultiTest ? 'Bitirenler (' : 'Çözenler (') + stats.completed + ')' },
                    { key: 'pending', label: 'Bekleyen / Devam Eden (' + (stats.total - stats.completed) + ')' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setStatsStudentFilter(f.key)}
                      style={{
                        flex: 1, padding: '0.4rem 0.5rem', borderRadius: '0.55rem', border: 'none',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                        background: statsStudentFilter === f.key ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                        color: statsStudentFilter === f.key ? '#ffffff' : 'var(--color-text-muted)'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '38vh', overflowY: 'auto' }}>
                  {stats.targetStudentIds.filter(stId => {
                    const stProgress = stats.isMultiTest ? stats.studentProgressMap[stId] : null;
                    const isFullyDone = stats.isMultiTest ? (stProgress?.isFullyCompleted) : !!(
                      (activeHomework.submissions || []).find(s => String(s.studentId) === String(stId)) ||
                      submissions.find(s => (String(s.hwId) === String(activeHomework.id) || String(s.testId) === String(activeHomework.id)) && String(s.studentId) === String(stId))
                    );
                    if (statsStudentFilter === 'completed') return isFullyDone;
                    if (statsStudentFilter === 'pending') return !isFullyDone;
                    return true;
                  }).map(stId => {
                    const student = students.find(s => s.id === stId);
                    if (!student) return null;
                    const stProgress = stats.isMultiTest ? stats.studentProgressMap[stId] : null;
                    const submission = (activeHomework.submissions || []).find(s => s.studentId === stId) || submissions.find(s => (s.hwId === activeHomework.id || s.testId === activeHomework.id) && s.studentId === stId);
                    
                    const handleReview = () => {
                      setShowStatsModal(false);
                      if (activeHomework.type === 'physicalExam') navigate('/physical-exam/' + activeHomework.id + '?studentId=' + stId);
                      else if (submission?.id) navigate('/review/' + submission.id);
                      else if (stProgress?.submissions?.[0]?.id) navigate('/review/' + stProgress.submissions[0].id);
                      else navigate('/quiz/' + activeHomework.id + '?studentId=' + stId);
                    };

                    const hasActivity = stats.isMultiTest ? (stProgress?.completedTests > 0) : !!submission;

                    return (
                      <div key={stId} onClick={hasActivity ? handleReview : undefined} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.65rem 0.9rem', borderRadius: '0.75rem',
                        border: '1px solid var(--color-border)',
                        background: hasActivity ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-hover)',
                        cursor: hasActivity ? 'pointer' : 'default'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--color-surface)' }}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>{student.name}</div>
                            {stats.isMultiTest ? (
                              <div style={{ fontSize: '0.68rem', color: stProgress?.isFullyCompleted ? '#34d399' : (stProgress?.completedTests > 0 ? '#38bdf8' : 'var(--color-text-muted)'), fontWeight: 800 }}>
                                %{stProgress?.rate} • {stProgress?.completedTests}/{stProgress?.totalTests} Test Çözüldü
                              </div>
                            ) : (
                              submission && <div style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 700 }}>İncelemek için tıkla</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {stats.isMultiTest ? (
                            stProgress?.isFullyCompleted ? (
                              <span style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 900, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                                ✓ Bitti
                              </span>
                            ) : stProgress?.completedTests > 0 ? (
                              <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 900, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(56,189,248,0.3)' }}>
                                ⏳ Devam Ediyor
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(245,158,11,0.3)' }}>
                                Bekliyor
                              </span>
                            )
                          ) : (
                            submission ? (
                              <span style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 900, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                                {submission.score} {activeHomework.type === 'physicalExam' ? 'Net' : 'Puan'}
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(245,158,11,0.3)' }}>
                                Bekliyor
                              </span>
                            )
                          )}
                          {hasActivity ? (
                            <button onClick={e => { e.stopPropagation(); handleReview(); }} style={{ background: 'rgba(37,99,235,0.12)', border: 'none', borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: '#60a5fa', display: 'flex' }}>
                              <Eye size={14} />
                            </button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); showToast(student.name + ' adlı öğrenciye hatırlatma bildirimi gönderildi!'); }} style={{ background: 'rgba(245,158,11,0.12)', border: 'none', borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: '#fbbf24', display: 'flex' }} title="Hatırlatma Gönder">
                              <Send size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════ STUDENT DETAIL MODAL (ÖĞRENCİ BAZLI DETAY & ÖDEV LİSTESİ) ══════════ */}
        {selectedStudentForDetail && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-modal-overlay)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}>
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '1.5rem',
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              border: '1.5px solid var(--color-border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              color: 'var(--color-text)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1.5px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.2)' }}>
                    {(selectedStudentForDetail.student.name || 'Ö').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: 'var(--color-text)' }}>
                        {selectedStudentForDetail.student.name}
                      </h2>
                      <span style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6', fontWeight: 800, fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: 99 }}>
                        {selectedStudentForDetail.gradeName}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {selectedStudentForDetail.student.email || selectedStudentForDetail.student.username || 'Öğrenci Ödev Takip Karnesi'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudentForDetail(null)}
                  style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mini Stat Cards for this student */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: '0.85rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#60a5fa' }}>{selectedStudentForDetail.total}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', marginTop: 2 }}>Toplam Ödev</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.85rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34d399' }}>{selectedStudentForDetail.completed}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginTop: 2 }}>Tamamlanan</div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.85rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24' }}>{selectedStudentForDetail.pending}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginTop: 2 }}>Bekleyen</div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.85rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#818cf8' }}>
                    {selectedStudentForDetail.avgScore !== null ? `%${selectedStudentForDetail.avgScore}` : `%${selectedStudentForDetail.rate}`}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginTop: 2 }}>
                    {selectedStudentForDetail.avgScore !== null ? 'Ort. Başarı' : 'Tamamlama'}
                  </div>
                </div>
              </div>

              {/* Homeworks List for this student */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  📋 Öğrenciye Tanımlı Ödevler ({selectedStudentForDetail.hwDetails.length})
                </h4>

                {selectedStudentForDetail.hwDetails.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Bu öğrenciye henüz atanmış bir ödev bulunmamaktadır.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '45vh', overflowY: 'auto' }}>
                    {selectedStudentForDetail.hwDetails.map(({ homework, submission, submissionsList, isDone, isMultiTest, completedTestsCount, totalTestsCount, progressRate, isPast }) => {
                      const theme = getTheme(homework.subject);
                      const scoreVal = submission?.score ?? (submission?.totalQuestions > 0 && submission?.correctCount !== undefined ? Math.round((submission.correctCount / submission.totalQuestions) * 100) : null);

                      const handleReview = () => {
                        setSelectedStudentForDetail(null);
                        if (homework.type === 'physicalExam') {
                          navigate('/physical-exam/' + homework.id + '?studentId=' + selectedStudentForDetail.student.id);
                        } else if (submission?.id) {
                          navigate('/review/' + submission.id);
                        } else if (submissionsList?.[0]?.id) {
                          navigate('/review/' + submissionsList[0].id);
                        } else {
                          navigate('/quiz/' + homework.id + '?studentId=' + selectedStudentForDetail.student.id);
                        }
                      };

                      return (
                        <div
                          key={homework.id}
                          style={{
                            background: 'var(--color-surface)',
                            border: isDone ? '1.5px solid rgba(16,185,129,0.35)' : isPast ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid var(--color-border)',
                            borderRadius: '0.9rem',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${theme.border}` }}>
                              <BookOpen size={16} color={theme.color} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {homework.title}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ color: theme.color, fontWeight: 800 }}>{homework.subject || 'Ders'}</span>
                                {isMultiTest && <span style={{ color: '#818cf8', fontWeight: 800 }}>• 📚 {totalTestsCount} Alt Test</span>}
                                <span>• {homework.totalQuestions} Soru</span>
                                <span>• Son Tarih: {new Date(homework.dueDate).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                            {isMultiTest ? (
                              isDone ? (
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 900, fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    ✓ Tamamlandı (%100 · {completedTestsCount}/{totalTestsCount} Test)
                                  </span>
                                </div>
                              ) : completedTestsCount > 0 ? (
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ background: 'rgba(56,189,248,0.15)', color: '#0284c7', border: '1px solid #38bdf8', fontWeight: 900, fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    ⏳ Devam Ediyor (%{progressRate} · {completedTestsCount}/{totalTestsCount} Test)
                                  </span>
                                </div>
                              ) : (
                                <span style={{
                                  background: isPast ? '#fef2f2' : '#eff6ff',
                                  color: isPast ? '#dc2626' : '#2563eb',
                                  border: `1px solid ${isPast ? '#fecaca' : '#bfdbfe'}`,
                                  fontWeight: 800, fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '0.45rem'
                                }}>
                                  {isPast ? '⚠️ Süresi Doldu' : `○ Başlamadı (0/${totalTestsCount} Test)`}
                                </span>
                              )
                            ) : (
                              isDone ? (
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 900, fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    ✓ Tamamlandı {scoreVal !== null ? `(%${scoreVal})` : ''}
                                  </span>
                                  {submission?.correctCount !== undefined && (
                                    <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 800, marginTop: 2 }}>
                                      {submission.correctCount}D / {submission.wrongCount || 0}Y
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{
                                  background: isPast ? '#fef2f2' : '#eff6ff',
                                  color: isPast ? '#dc2626' : '#2563eb',
                                  border: `1px solid ${isPast ? '#fecaca' : '#bfdbfe'}`,
                                  fontWeight: 800, fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '0.45rem'
                                }}>
                                  {isPast ? '⚠️ Süresi Doldu' : '⏳ Bekliyor'}
                                </span>
                              )
                            )}

                            {(isDone || (isMultiTest && completedTestsCount > 0)) && (
                              <button
                                type="button"
                                onClick={handleReview}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '0.6rem',
                                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                  border: 'none',
                                  color: '#fff',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  boxShadow: '0 2px 8px rgba(79,70,229,0.25)'
                                }}
                              >
                                <Eye size={12} /> İncele
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════ VIEW MODE: CREATE / EDIT WIZARD ══════════
  const STEPS_DEF = [
    { id: 1, label: 'Temel Bilgiler', icon: ClipboardList, desc: 'Başlık, tarih, süre' },
    { id: 2, label: 'Hedef Kitle', icon: Users, desc: 'Sınıf veya öğrenci seçimi' },
    { id: 3, label: 'Soru Bankası & Test', icon: CheckSquare, desc: selectedQuestionIds.length + ' soru seçildi' },
  ];
  const selUnits = curData.units.filter(u => selSubject !== 'all' ? u.subjectId === selSubject : (selGrade !== 'all' ? curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id).includes(u.subjectId) : true));
  const selTopics = curData.topics.filter(t => selUnit !== 'all' ? t.unitId === selUnit : selUnits.map(u => u.id).includes(t.unitId));

  return (
    <div style={pageContainerStyle}>
      <Toast msg={toast} />

      {/* ── STICKY WIZARD HEADER ── */}
      <header style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <button
          onClick={resetForm}
          style={{
            background: 'var(--color-surface-hover)',
            border: '1.5px solid var(--color-border-input)',
            borderRadius: '0.75rem',
            padding: '0.55rem 0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 800,
            color: 'var(--color-text)'
          }}
        >
          <ArrowLeft size={15} /> Geri Dön
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)' }}>
            {editingHwId ? 'Ödevi Düzenle' : 'Yeni Ödev Sihirbazı ✨'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Adım {step}/3 · {STEPS_DEF[step-1]?.desc}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.6rem 1.35rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg,#059669,#10b981)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
          }}
        >
          <CheckCheck size={16} /> Ödevi Yayınla
        </button>
      </header>

      {/* ── WIZARD STEP NAVIGATION BAR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem', padding: '0.5rem',
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {STEPS_DEF.map(s => {
          const isAct = step === s.id;
          const isDone = step > s.id;
          const canGo = s.id <= step || (s.id === 2 && canStep2) || (s.id === 3 && canStep2 && selectedTargets.length > 0);
          const SIcon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => canGo && setStep(s.id)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem', borderRadius: '0.85rem',
                border: isAct ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                cursor: canGo ? 'pointer' : 'not-allowed',
                background: isAct ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : isDone ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-hover)',
                color: isAct ? '#ffffff' : isDone ? '#34d399' : 'var(--color-text-muted)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                boxShadow: isAct ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                opacity: canGo ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {isDone ? <CheckCircle size={15} color="#34d399" /> : <SIcon size={15} color={isAct ? '#fff' : '#818cf8'} />}
                <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>{s.label}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: isAct ? '#e0e7ff' : 'var(--color-text-muted)', fontWeight: 600 }}>{s.desc}</span>
            </button>
          );
        })}
      </div>

      {/* ── STEP 1: TEMEL BİLGİLER ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>Ödev Temel Bilgileri</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Ödev başlığı, son teslim tarihi ve soru başı süre ayarlarını belirleyin</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Ödev Başlığı *</label>
                <input
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.88rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Örneğin: Hafta Sonu Matematik Üslü İfadeler Tarama Testi..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Son Teslim Tarihi *</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {[{ l: 'Yarın', d: 1 }, { l: '3 Gün', d: 3 }, { l: '1 Hafta', d: 7 }, { l: '2 Hafta', d: 14 }, { l: '1 Ay', d: 30 }].map(p => (
                    <button
                      key={p.l}
                      type="button"
                      onClick={() => setDueDatePreset(p.d)}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                        color: 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                      }}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.88rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  onClick={e => e.target.showPicker && e.target.showPicker()}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Soru Başı Süre (Dakika)</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {[1, 2, 3, 5, 10].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimePerQuestion(t)}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: timePerQuestion === t ? '1.5px solid #6366f1' : '1px solid var(--color-border-input)',
                        background: timePerQuestion === t ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                        color: timePerQuestion === t ? '#ffffff' : 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                      }}
                    >
                      {t} dk
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  style={{ width: 120, padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.88rem', fontWeight: 800, outline: 'none' }}
                  value={timePerQuestion}
                  onChange={e => setTimePerQuestion(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { if (canStep2) setStep(2); else showToast('Lütfen başlık ve tarihi doldurun.'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.65rem 1.4rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
              }}
            >
              Hedef Kitleye Geç <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: HEDEF KİTLE ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>Ödev Hedef Kitlesi</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sınıf bazlı toplu atama veya tek tek bireysel öğrenci seçimi yapın</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface-hover)', borderRadius: '0.85rem', padding: '0.35rem', border: '1px solid var(--color-border)' }}>
                {[{ k: 'grade', l: `Sınıf Bazlı (${curData.grades.length})` }, { k: 'student', l: `Bireysel Öğrenci (${filteredStudents.length})` }].map(m => (
                  <button
                    key={m.k}
                    onClick={() => { setTargetMode(m.k); setSelectedTargets([]); }}
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '0.7rem', border: 'none',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                      background: targetMode === m.k ? 'linear-gradient(135deg,#059669,#10b981)' : 'transparent',
                      color: targetMode === m.k ? '#ffffff' : 'var(--color-text-muted)', boxShadow: targetMode === m.k ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'
                    }}
                  >
                    {m.l}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399' }}>
                  {selectedTargets.length} hedef seçildi
                </span>
                <button
                  onClick={handleSelectAllTargets}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                    border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                    color: 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <CheckCheck size={13} /> Tümünü Seç / Kaldır
                </button>
              </div>

              {targetMode === 'grade' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {curData.grades.map(g => {
                    const isSel = selectedTargets.includes(g.id);
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedTargets(prev => isSel ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                        style={{
                          padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                          border: isSel ? '2px solid #10b981' : '1.5px solid var(--color-border)',
                          background: isSel ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-hover)',
                          display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: isSel ? 'linear-gradient(135deg,#059669,#10b981)' : 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <GraduationCap size={18} color={isSel ? '#ffffff' : 'var(--color-text-muted)'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text)' }}>{g.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            {students.filter(s => isStudentInGrade(s, g)).length} Öğrenci
                          </div>
                        </div>
                        {isSel && <CheckCircle size={18} color="#34d399" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setStudentGradeFilter('all')}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: studentGradeFilter === 'all' ? '1.5px solid #6366f1' : '1px solid var(--color-border-input)',
                        background: studentGradeFilter === 'all' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                        color: studentGradeFilter === 'all' ? '#ffffff' : 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                      }}
                    >
                      Tüm Sınıflar
                    </button>
                    {curData.grades.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setStudentGradeFilter(g.id)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                          border: studentGradeFilter === g.id ? '1.5px solid #6366f1' : '1px solid var(--color-border-input)',
                          background: studentGradeFilter === g.id ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                          color: studentGradeFilter === g.id ? '#ffffff' : 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                        }}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', maxHeight: 320, overflowY: 'auto' }}>
                    {filteredStudents.map(s => {
                      const isSel = selectedTargets.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedTargets(prev => isSel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                          style={{
                            padding: '0.65rem 0.85rem', borderRadius: '0.85rem', cursor: 'pointer',
                            border: isSel ? '2px solid #10b981' : '1.5px solid var(--color-border)',
                            background: isSel ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-hover)',
                            display: 'flex', alignItems: 'center', gap: '0.6rem'
                          }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSel ? 'linear-gradient(135deg,#059669,#10b981)' : 'var(--color-surface)', color: isSel ? '#ffffff' : 'var(--color-text-muted)', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {s.name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                              {curData.grades.find(g => isStudentInGrade(s, g))?.name || s.grade || s.gradeId || 'Sınıf Belirtilmemiş'}
                            </div>
                          </div>
                          {isSel && <CheckCircle size={15} color="#34d399" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '0.65rem 1.25rem', borderRadius: '0.75rem',
                border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                color: 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <ArrowLeft size={15} /> Geri
            </button>
            <button
              onClick={() => { if (selectedTargets.length > 0) setStep(3); else showToast('Lütfen en az bir hedef seçin.'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.65rem 1.4rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
              }}
            >
              Sorulara Geç <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SORU BANKASI & TEST SEÇİMİ ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* FILTER CRITERIA */}
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <Filter size={18} color="#818cf8" />
              <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>Soru Bankası Filtreleme</span>
              <span style={{ marginLeft: 'auto', background: 'rgba(37,99,235,0.12)', color: '#60a5fa', fontWeight: 900, fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 99, border: '1px solid #3b82f6', whiteSpace: 'nowrap' }}>
                {filteredQuestions.length} soru bulundu
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                value={selGrade}
                onChange={e => { setSelGrade(e.target.value); setSelSubject('all'); setSelUnit('all'); setSelTopic('all'); }}
              >
                <option value="all">Tüm Sınıflar</option>
                {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                value={selSubject}
                onChange={e => { setSelSubject(e.target.value); setSelUnit('all'); setSelTopic('all'); }}
              >
                <option value="all">Tüm Dersler</option>
                {curData.subjects.filter(s => selGrade === 'all' || s.gradeId === selGrade).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                value={selUnit}
                onChange={e => { setSelUnit(e.target.value); setSelTopic('all'); }}
              >
                <option value="all">Tüm Üniteler</option>
                {selUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                value={selTopic}
                onChange={e => setSelTopic(e.target.value)}
              >
                <option value="all">Tüm Konular</option>
                {selTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                value={selQuestionType}
                onChange={e => setSelQuestionType(e.target.value)}
              >
                <option value="all">Tüm Türler</option>
                <option value="coktan_secmeli">Çoktan Seçmeli</option>
                <option value="acik_uclu">Açık Uçlu</option>
                <option value="bundle">Soru Seti</option>
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                value={selContentType}
                onChange={e => setSelContentType(e.target.value)}
              >
                <option value="all">Tüm Formatlar</option>
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="text">Metin</option>
                <option value="gorsel">Görsel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div style={{ position: 'relative', marginTop: '0.65rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Soru metni veya başlıkla ara..."
              />
            </div>
          </div>

          {/* QUESTIONS CHECKLIST */}
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                Soru Bankası Listesi
                <span style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: 99, marginLeft: '0.5rem', border: '1px solid rgba(16,185,129,0.25)' }}>
                  {selectedQuestionIds.length} soru seçildi
                </span>
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={handleSelectAllFiltered}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                    border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                    color: 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <CheckCheck size={13} /> Tümünü Seç / Kaldır
                </button>
                {selectedQuestionIds.length > 0 && (
                  <button
                    onClick={() => setSelectedQuestionIds([])}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                      border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.12)',
                      color: '#f87171', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <RefreshCw size={13} /> Sıfırla
                  </button>
                )}
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={40} style={{ opacity: 0.35 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>Bu filtreye uygun soru bulunamadı.</div>
              </div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem', paddingRight: 4 }}>
                {filteredQuestions.map(q => {
                  const isSel = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQ(q.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem', borderRadius: '0.85rem',
                        border: isSel ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                        background: isSel ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)',
                        cursor: 'pointer', transition: 'all 0.1s'
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '0.45rem', flexShrink: 0,
                        border: isSel ? 'none' : '2px solid var(--color-border-input)',
                        background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSel && <Check size={14} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ width: 34, height: 34, borderRadius: '0.6rem', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                        {getQIcon(q.contentType)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title || q.name || 'Başlıksız Soru'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {q.isBundle && <span style={{ background: 'rgba(124,58,237,0.12)', color: '#c084fc', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: '1px solid rgba(124,58,237,0.25)' }}>{(q.questionCount || q.questionsList?.length || 1)} Soru Seti</span>}
                          {q.type === 'acik_uclu' && <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: '1px solid rgba(245,158,11,0.25)' }}>Açık Uçlu</span>}
                          {q.contentType && <span>Format: {q.contentType}</span>}
                        </div>
                      </div>
                      {isSel && (
                        <span style={{ background: '#4f46e5', color: '#fff', fontWeight: 900, fontSize: '0.65rem', padding: '0.15rem 0.55rem', borderRadius: 99, flexShrink: 0, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                          SEÇİLDİ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TOPLU ATAMA BİÇİMİ (IF > 1 TEST) */}
          {selectedQuestionIds.length > 1 && !editingHwId && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.5rem', padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Layers size={22} color="#818cf8" />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>
                    Toplu Ödev Atama Biçimi ({selectedQuestionIds.length} Test Seçildi)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Seçtiğiniz testlerin öğrencilere nasıl atanacağını belirleyin:
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                <div
                  onClick={() => setAssignmentMode('separate')}
                  style={{
                    padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                    border: assignmentMode === 'separate' ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                    background: assignmentMode === 'separate' ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="radio"
                    name="assignmentMode"
                    checked={assignmentMode === 'separate'}
                    onChange={() => setAssignmentMode('separate')}
                    style={{ marginTop: '0.2rem', accentColor: '#6366f1', cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      📑 Ayrı Ayrı Tekil Ödevler Olarak Ata (Önerilen)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      Her test bağımsız birer ödev olarak oluşturulur. Öğrenci her testi kendi ekranında tek tek çözer ({selectedQuestionIds.length} adet bağımsız ödev).
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAssignmentMode('combined')}
                  style={{
                    padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                    border: assignmentMode === 'combined' ? '2px solid #a855f7' : '1.5px solid var(--color-border)',
                    background: assignmentMode === 'combined' ? 'rgba(168,85,247,0.12)' : 'var(--color-surface-hover)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="radio"
                    name="assignmentMode"
                    checked={assignmentMode === 'combined'}
                    onChange={() => setAssignmentMode('combined')}
                    style={{ marginTop: '0.2rem', accentColor: '#a855f7', cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      📚 Birleşik / Bölümlü Tek Ödev Olarak Ata
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      Tüm testler tek bir ödev çatısı altında toplanır (Bölüm 1, Bölüm 2... şeklinde tek seferde çözülür).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM SUMMARY & PUBLISH BAR */}
          <div style={{ ...glassCardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                {selectedQuestionIds.length > 0 ? `${selectedQuestionIds.length} Soru / Test Seçildi` : 'Henüz soru seçilmedi'}
              </div>
              {selectedQuestionIds.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Tahmini süre: ~{selectedQuestionIds.length * timePerQuestion} dakika
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: '0.75rem',
                  border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                  color: 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <ArrowLeft size={15} /> Geri
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.65rem 1.5rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)'
                }}
              >
                <Sparkles size={16} />{' '}
                {editingHwId
                  ? 'Ödevi Güncelle'
                  : selectedQuestionIds.length > 1 && assignmentMode === 'separate'
                  ? `${selectedQuestionIds.length} Ödevi Ayrı Ayrı Yayınla!`
                  : 'Ödevi Yayınla!'}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
