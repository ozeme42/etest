import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTree, Search, Calendar, Award, CheckCircle2, Clock3, Eye,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, TrendingUp,
  BarChart3, Target, BookMarked, XCircle, Table, List, Home,
  ChevronRight, AlertTriangle, Zap, FileText, BookCheck, GraduationCap as Exam,
  FlameKindling, ThumbsUp, ThumbsDown, Minus, RefreshCw, PieChart as PieIcon
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie
} from 'recharts';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { isHomeworkForStudent, computeStudentAnalyticsData } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import PeriodicQuestionAnalytics from '../components/PeriodicQuestionAnalytics';

/* ── Subject Config ────────────────────────────────────────────────── */
const SUBJECTS = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Genel Testler'];
const subjectThemes = {
  'Matematik':       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: Ruler,         radar: '#3b82f6', light: '#f0f9ff' },
  'Fen Bilimleri':   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: TestTube2,      radar: '#10b981', light: '#ecfdf5' },
  'Türkçe':          { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: BookCopy,       radar: '#f97316', light: '#fffaf5' },
  'Sosyal Bilgiler': { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', icon: Globe,          radar: '#a855f7', light: '#fbf8ff' },
  'İngilizce':       { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: MessageSquare,  radar: '#f43f5e', light: '#fff8f9' },
  'Genel Testler':   { bg: '#f5f3ff', color: '#4338ca', border: '#ddd6fe', icon: Trophy,         radar: '#6366f1', light: '#faf8ff' },
  'Diğer':           { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: BookOpen,       radar: '#94a3b8', light: '#f8fafc' },
};

const typeConfig = {
  physicalExam: { label: '🏛️ Deneme',     bg: '#f5f3ff', color: '#4338ca', border: '#ddd6fe' },
  homework:     { label: '📝 Ödev',        bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  book:         { label: '📕 Kitap Testi', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  individual:   { label: '⚡ Bireysel',    bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
};

function getSubjectKey(s) {
  const t = ((s.testTitle || '') + ' ' + (s.subjectKey || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('deneme') || t.includes('genel')) return 'Genel Testler';
  return s.subjectKey || 'Diğer';
}

function getTypeKey(s) {
  if (s.type === 'physicalExam') return 'physicalExam';
  if (s.bookTestId) return 'book';
  if (s.isHomework) return 'homework';
  return 'individual';
}

function ScoreBadge({ score, type, isPendingEval, size = 'md' }) {
  if (isPendingEval) {
    return (
      <span style={{ fontSize: size === 'lg' ? '0.9rem' : size === 'sm' ? '0.72rem' : '0.8rem', fontWeight: 900, background: '#fffbeb', color: '#b45309', border: '1.5px solid #fde68a', borderRadius: 10, padding: size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        ✍️ Not Bekliyor
      </span>
    );
  }
  const fontSize = size === 'lg' ? '1.35rem' : size === 'sm' ? '0.8rem' : '0.95rem';
  const pad = size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem';
  const color = score >= 80 ? '#15803d' : score >= 60 ? '#b45309' : '#b91c1c';
  const bg = score >= 80 ? '#f0fdf4' : score >= 60 ? '#fffbeb' : '#fef2f2';
  const border = score >= 80 ? '#bbf7d0' : score >= 60 ? '#fde68a' : '#fecaca';
  return (
    <span style={{ fontSize, fontWeight: 900, background: bg, color, border: `1.5px solid ${border}`, borderRadius: 10, padding: pad, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {type === 'physicalExam' ? `${score} Net` : `%${score}`}
    </span>
  );
}

function StatusTag({ accuracy }) {
  if (accuracy >= 80) return <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>🏆 Güçlü</span>;
  if (accuracy >= 60) return <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>📈 Gelişiyor</span>;
  return <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>⚠️ Kritik</span>;
}

const TAB_DEFS = [
  { key: 'overview',  label: '🏠 Genel Bakış',             icon: Home },
  { key: 'periodic',  label: '📊 Günlük / Aylık Soru Analizi', icon: BarChart3 },
  { key: 'subjects',  label: '📚 Ders & Konu',              icon: BookOpen },
  { key: 'bytype',    label: '📝 Ödev & Deneme',            icon: FileText },
  { key: 'trend',     label: '📈 Zaman Trendi',             icon: TrendingUp },
  { key: 'all',       label: '🗃️ Tüm Sonuçlar',            icon: Table },
];

/* ── Custom Tooltip ─────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div style={{ background: '#ffffff', color: '#0f172a', padding: '0.75rem 1rem', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: '1.5px solid #e2e8f0', minWidth: 160 }}>
      <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#4f46e5', marginBottom: 4 }}>{d.title || d.ders || label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 3 }}>
          <span style={{ color: p.color || '#64748b', fontWeight: 700 }}>{p.name}</span>
          <span style={{ fontWeight: 900, color: '#0f172a' }}>{typeof p.value === 'number' && p.name?.includes('%') ? `%${p.value}` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function CustomSubjectTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const scoreVal = data['Başarı %'] !== undefined ? data['Başarı %'] : (data.accuracy !== undefined ? data.accuracy : data.avgScore);
    const correctVal = data['Doğru'] !== undefined ? data['Doğru'] : data.correctQ;
    const wrongVal = data['Yanlış'] !== undefined ? data['Yanlış'] : data.wrongQ;
    const blankVal = data['Boş'] !== undefined ? data['Boş'] : data.blankQ;
    const totalVal = data['Soru Sayısı'] || data.totalQ || (correctVal + wrongVal + blankVal);

    return (
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 14,
        padding: '0.75rem 1rem',
        color: '#0f172a',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        fontSize: '0.8rem',
        minWidth: 160
      }}>
        <div style={{ fontWeight: 900, color: '#4f46e5', marginBottom: 6, fontSize: '0.9rem' }}>
          {data.fullName || data.name || data.displayName}
        </div>
        {scoreVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#64748b' }}>Başarı Oranı:</span>
            <span style={{ fontWeight: 900, color: scoreVal >= 70 ? '#15803d' : scoreVal >= 50 ? '#b45309' : '#b91c1c' }}>
              %{scoreVal}
            </span>
          </div>
        )}
        {correctVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#16a34a' }}>✓ Doğru:</span>
            <span style={{ fontWeight: 800, color: '#15803d' }}>{correctVal}</span>
          </div>
        )}
        {wrongVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#dc2626' }}>✗ Yanlış:</span>
            <span style={{ fontWeight: 800, color: '#b91c1c' }}>{wrongVal}</span>
          </div>
        )}
        {blankVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#64748b' }}>○ Boş:</span>
            <span style={{ fontWeight: 800, color: '#475569' }}>{blankVal}</span>
          </div>
        )}
        {totalVal !== undefined && (
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', gap: 12, color: '#0f172a', fontWeight: 800 }}>
            <span>Toplam Soru:</span>
            <span>{totalVal}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function StudentResultsPage() {
  const navigate = useNavigate();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { data: curData } = useCurriculum();
  const { books, bookTests } = useTrackedBooks();
  const { getMockExamsForStudent } = useCoaching();

  const { currentUser } = useAuth();
  const isStudentRole = currentUser?.role === 'student';

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);

  const initialStudent = useMemo(() => {
    if (isStudentRole && currentUser) {
      return studentMembers.find(u => String(u.id) === String(currentUser.id)) || currentUser;
    }
    return studentMembers[0] || null;
  }, [isStudentRole, currentUser, studentMembers]);

  const [selectedStudent, setSelectedStudent] = useState(initialStudent);

  React.useEffect(() => {
    if (isStudentRole && currentUser) {
      const match = studentMembers.find(u => String(u.id) === String(currentUser.id)) || currentUser;
      setSelectedStudent(match);
    }
  }, [isStudentRole, currentUser, studentMembers]);

  const studentMockExams = useMemo(() => {
    if (!selectedStudent?.id || typeof getMockExamsForStudent !== 'function') return [];
    return getMockExamsForStudent(selectedStudent.id) || [];
  }, [selectedStudent, getMockExamsForStudent]);

  const { generalTrialExams, otherHomeworkSubmissions } = useMemo(() => {
    return computeStudentAnalyticsData({
      studentId: selectedStudent?.id,
      targetStudent: selectedStudent,
      submissions,
      homeworks,
      books,
      bookTests,
      studentMockExams
    });
  }, [selectedStudent, submissions, homeworks, books, bookTests, studentMockExams]);

  const [activeTab, setActiveTab] = useState('overview');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [viewMode, setViewMode]       = useState('table');
  const [trendSubject, setTrendSubject] = useState('all');
  const [byTypeTab, setByTypeTab]       = useState('homework');
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [perfViewMode, setPerfViewMode] = useState('radar'); // 'radar' | 'bars'
  const [subjChartType, setSubjChartType] = useState('bar'); // 'bar' | 'radar' | 'pie'
  const [selectedSubjFilter, setSelectedSubjFilter] = useState('all');
  const [topicChartSort, setTopicChartSort] = useState('accuracy_desc'); // 'accuracy_desc' | 'accuracy_asc' | 'totalQ_desc'

  /* ── Curriculum test map ─── */
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

  /* ── Build studentSubmissions (Yalnızca aktif testler ve kitap testleri) ─── */
  const studentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];

    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');

    const activeHws = (homeworks || []).filter(hw => {
      if (!hw || !hw.id) return false;
      return isHomeworkForStudent(hw, selectedStudent, curData?.grades);
    });

    const isEval = (sub) => Boolean(sub?.isEvaluatedByTeacher || sub?.status === 'evaluated' || sub?.status === 'graded' || sub?.teacherFeedback || sub?.teacherNote);
    const results = [];
    const processedTestKeys = new Set();

    // 1. Process regular non-book homeworks (Kitap ödevi olmayan normal ödev/denemeler)
    activeHws.forEach(hw => {
      if (hw.isBookAssignment || hw.bookId || hw.title?.includes('(Tüm Kitap Görevi)') || hw.title?.includes('(Kendi Eklediğim)')) {
        return; // Kitap görevleri tek bir mega-sınav değildir, test bazlı aşağıda işlenir
      }

      const subInHw = (hw.submissions || []).find(s => {
        const sid = String(s.studentId);
        return sid === studentIdStr || (studentUuidStr && sid === studentUuidStr);
      });
      const subInGlobal = (submissions || []).find(s => {
        const sid = String(s.studentId);
        const isMatch = sid === studentIdStr || (studentUuidStr && sid === studentUuidStr);
        return isMatch && (
          String(s.hwId) === String(hw.id) ||
          String(s.testId) === String(hw.id) ||
          String(s.id) === String(hw.id) ||
          String(s.id) === String(subInHw?.id) ||
          String(s.id) === `hw_sub_${hw.id}_${selectedStudent.id}`
        );
      });

      let sub = subInGlobal;
      if (!sub || (subInHw && isEval(subInHw) && !isEval(subInGlobal))) {
        sub = subInHw || subInGlobal;
      }
      if (!sub) return;

      const subIdStr = String(sub.id || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
      if (sub.status === 'in_progress' || sub.status === 'draft') return;
      const raw = sub.raw_data || {};
      if (raw.status === 'draft' || raw.status === 'in_progress') return;

      const isEvaluated = isEval(sub);
      const isOpenEnded = Boolean(
        hw.isOpenEnded ||
        hw.questionType === 'acik_uclu' ||
        hw.type === 'acik_uclu' ||
        hw.contentType === 'acik_uclu' ||
        sub.isOpenEnded ||
        sub.questionType === 'acik_uclu' ||
        (Array.isArray(sub.answers) && sub.answers.some(a => a.userAnswerText && (a.userAnswer === null || a.userAnswer === undefined)))
      );
      const isPendingEval = isOpenEnded && !isEvaluated;

      let correct = sub.correctCount ?? raw.correctCount ?? 0;
      let wrong = sub.wrongCount ?? raw.wrongCount ?? 0;
      let blank = sub.blankCount ?? raw.blankCount ?? 0;

      if (!isOpenEnded && Array.isArray(sub.answers) && sub.answers.length > 0) {
        correct = 0; wrong = 0; blank = 0;
        sub.answers.forEach(ans => {
          if (ans.isCorrect === true) correct++;
          else if (ans.isCorrect === false) {
            const isB = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
            if (isB) blank++; else wrong++;
          }
        });
      }

      const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
      const sumCount = correct + wrong + blank;
      const rawTotal = hw.totalQuestions || hw.questionCount || sub.totalQuestions || raw.totalQuestions || 0;
      const total = Math.max(rawTotal, ansCount, sumCount, 1);

      if (correct === 0 && wrong === 0 && blank === 0 && ansCount === 0) return;

      let score = 0;
      if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) {
        score = Math.min(100, Math.max(0, Math.round(sub.scorePercentage)));
      } else if (raw.scorePercentage !== undefined && raw.scorePercentage !== null) {
        score = Math.min(100, Math.max(0, Math.round(raw.scorePercentage)));
      } else if (isEvaluated && sub.score !== undefined && sub.score !== null) {
        score = Math.min(100, Math.max(0, Math.round(sub.score)));
      } else if (!isPendingEval && total > 0) {
        score = Math.min(100, Math.round((correct / total) * 100));
      }

      const isPhysical = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || hw.isPhysical;
      const typeKey = isPhysical ? 'physicalExam' : 'homework';
      const subjKey = getSubjectKey({ testTitle: hw.title, subjectKey: hw.subject || sub.subjectKey || '' });

      processedTestKeys.add(String(hw.id));
      if (toUUID(hw.id)) processedTestKeys.add(String(toUUID(hw.id)));

      results.push({
        ...sub,
        id: sub.id || `hw_sub_${hw.id}_${selectedStudent.id}`,
        hwId: hw.id,
        testId: hw.id,
        testTitle: hw.title,
        subjectKey: subjKey,
        typeKey,
        isEvaluated,
        isOpenEnded,
        isPendingEval,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
        totalQuestions: total,
        computedScore: score,
        submittedAt: sub.submittedAt || sub.completedAt || raw.submittedAt || hw.createdAt || new Date().toISOString()
      });
    });

    // 2. Process all completed individual book tests (Kitap takibindeki gerçek çözülen testler)
    // Her test için en iyi sonucu alarak mükerrerliği önle (StudentDashboard ile birebir aynı)
    const bestBookSubsByTest = {};

    (submissions || []).forEach(sub => {
      if (!sub) return;
      const sid = String(sub.studentId);
      const isMatch = sid === studentIdStr || (studentUuidStr && sid === studentUuidStr) || (studentUuidStr && toUUID(sub.studentId) === studentUuidStr);
      if (!isMatch) return;

      const subIdStr = String(sub.id || sub.supabaseId || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
      if (sub.status === 'in_progress' || sub.status === 'draft') return;
      const raw = sub.raw_data || {};
      if (raw.status === 'draft' || raw.status === 'in_progress') return;

      const bTestId = String(sub.bookTestId || sub.testId || raw.bookTestId || raw.testId || '');
      if (!bTestId || processedTestKeys.has(bTestId) || (toUUID(bTestId) && processedTestKeys.has(String(toUUID(bTestId))))) {
        return;
      }

      let correct = sub.correctCount ?? raw.correctCount ?? 0;
      let wrong = sub.wrongCount ?? raw.wrongCount ?? 0;
      let blank = sub.blankCount ?? raw.blankCount ?? 0;

      if (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.correctCount === undefined) {
        correct = 0; wrong = 0; blank = 0;
        sub.answers.forEach(ans => {
          if (ans.isCorrect === true) correct++;
          else if (ans.isCorrect === false) {
            const isB = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
            if (isB) blank++; else wrong++;
          }
        });
      }

      if (correct === 0 && wrong === 0 && blank === 0 && (!sub.answers || sub.answers.length === 0)) return;

      const testObj = (bookTests || []).find(bt => String(bt.id) === bTestId || (toUUID(bt.id) && String(toUUID(bt.id)) === bTestId));
      const bookObj = (books || []).find(b => String(b.id) === String(sub.bookId || raw.bookId || testObj?.bookId));
      const cleanBookTitle = (bookObj?.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();

      const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
      const subjectName = subjObj?.name || bookObj?.subject || cleanBookTitle;
      const testName = testObj?.name || sub.testTitle || raw.testTitle || 'Test';

      const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(testObj?.topicId || raw.topicId));
      const topicName = topicObj?.name || '';

      const fullTestTitle = topicName
        ? `${cleanBookTitle} — ${subjectName} · ${topicName} (${testName})`
        : `${cleanBookTitle} — ${subjectName} (${testName})`;

      const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
      const sumCount = correct + wrong + blank;
      const rawTotal = sub.totalQuestions || raw.totalQuestions || testObj?.questionCount || 0;
      const total = Math.max(rawTotal, ansCount, sumCount, 1);

      let scorePct = 0;
      if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) {
        scorePct = Math.min(100, Math.max(0, Math.round(sub.scorePercentage)));
      } else if (raw.scorePercentage !== undefined && raw.scorePercentage !== null) {
        scorePct = Math.min(100, Math.max(0, Math.round(raw.scorePercentage)));
      } else if (total > 0) {
        scorePct = Math.min(100, Math.round((correct / total) * 100));
      }

      const existing = bestBookSubsByTest[bTestId];
      if (!existing || correct > existing.correctCount || (correct === existing.correctCount && scorePct > existing.computedScore)) {
        bestBookSubsByTest[bTestId] = {
          ...sub,
          id: subIdStr || `book_sub_${bTestId}_${selectedStudent.id}`,
          testId: bTestId,
          bookTitle: cleanBookTitle,
          subjectName,
          topicName,
          testName,
          testTitle: fullTestTitle,
          subjectKey: getSubjectKey({ testTitle: testName, subjectKey: subjectName }),
          typeKey: 'book',
          isEvaluated: true,
          isOpenEnded: false,
          isPendingEval: false,
          correctCount: correct,
          wrongCount: wrong,
          blankCount: blank,
          totalQuestions: total,
          computedScore: scorePct,
          submittedAt: sub.submittedAt || sub.completedAt || raw.submittedAt || sub.createdAt || new Date().toISOString()
        };
      }
    });

    Object.values(bestBookSubsByTest).forEach(item => results.push(item));

    return results.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [homeworks, submissions, selectedStudent, curData, books, bookTests]);

  /* ── Overall Stats ─── */
  const overallStats = useMemo(() => {
    const total = studentSubmissions.length;
    if (total === 0) return { total: 0, avgScore: 0, maxScore: 0, totalQ: 0, totalCorrect: 0, weakSubjects: 0 };
    let sumScore = 0, max = 0, totalQ = 0, totalCorrect = 0;
    studentSubmissions.forEach(s => {
      sumScore += s.computedScore || 0;
      if (s.computedScore > max) max = s.computedScore;
      totalQ += s.totalQuestions || 0;
      totalCorrect += s.correctCount || 0;
    });

    const successRate = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : (total > 0 ? Math.round(sumScore / total) : 0);

    const subjectAvgs = {};
    studentSubmissions.forEach(s => {
      if (!subjectAvgs[s.subjectKey]) subjectAvgs[s.subjectKey] = { sum: 0, count: 0 };
      subjectAvgs[s.subjectKey].sum += s.computedScore || 0;
      subjectAvgs[s.subjectKey].count++;
    });
    const weakSubjects = Object.values(subjectAvgs).filter(v => v.count > 0 && (v.sum / v.count) < 60).length;
    return {
      total,
      avgScore: successRate,
      maxScore: Math.round(max),
      totalQ,
      totalCorrect,
      weakSubjects,
      completedCount: studentSubmissions.filter(s => s.status !== 'pending_evaluation').length,
    };
  }, [studentSubmissions]);

  /* ── Radar data (per-subject average) ─── */
  const radarData = useMemo(() => {
    const map = {};
    SUBJECTS.forEach(s => { map[s] = { sum: 0, count: 0, totalQ: 0, totalCorrect: 0 }; });
    studentSubmissions.forEach(s => {
      if (map[s.subjectKey]) {
        map[s.subjectKey].sum += s.computedScore || 0;
        map[s.subjectKey].count++;
        map[s.subjectKey].totalQ += s.totalQuestions || 0;
        map[s.subjectKey].totalCorrect += s.correctCount || 0;
      }
    });
    return SUBJECTS.map(s => {
      const count = map[s].count;
      const avg = count > 0 ? Math.round(map[s].sum / count) : 0;
      let short = s;
      if (s === 'Fen Bilimleri') short = 'Fen Bil.';
      else if (s === 'Sosyal Bilgiler') short = 'Sosyal';
      else if (s === 'Genel Testler') short = 'Genel Test';
      return {
        subject: short,
        fullSubject: s,
        value: avg,
        count: count,
        totalQ: map[s].totalQ,
        totalCorrect: map[s].totalCorrect,
        theme: subjectThemes[s] || subjectThemes['Diğer']
      };
    });
  }, [studentSubmissions]);

  /* ── Pie / type breakdown ─── */
  const typeBreakdown = useMemo(() => {
    const counts = { physicalExam: 0, homework: 0, book: 0, individual: 0 };
    studentSubmissions.forEach(s => { counts[s.typeKey] = (counts[s.typeKey] || 0) + 1; });
    return [
      { name: 'Deneme', value: counts.physicalExam, fill: '#6366f1' },
      { name: 'Ödev',   value: counts.homework,     fill: '#f97316' },
      { name: 'Kitap',  value: counts.book,          fill: '#10b981' },
      { name: 'Bireysel',value: counts.individual,   fill: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [studentSubmissions]);

  /* ── Subject breakdown (for Ders & Konu tab) ─── */
  const subjectBreakdown = useMemo(() => {
    const map = {};
    SUBJECTS.forEach(s => { map[s] = { tests: [], totalQ: 0, totalCorrect: 0, topics: {} }; });
    studentSubmissions.forEach(s => {
      const sk = SUBJECTS.includes(s.subjectKey) ? s.subjectKey : 'Diğer';
      if (!map[sk]) map[sk] = { tests: [], totalQ: 0, totalCorrect: 0, topics: {} };
      map[sk].tests.push(s);
      map[sk].totalQ += s.totalQuestions || 0;
      map[sk].totalCorrect += s.correctCount || 0;
      
      const rawTopicName = s.topicName || s.unitTopic || s.testTitle || 'Genel Test';
      const topicKey = String(rawTopicName).trim();
      if (!map[sk].topics[topicKey]) {
        map[sk].topics[topicKey] = { totalQ: 0, correctQ: 0, wrongQ: 0, blankQ: 0, testCount: 0 };
      }
      map[sk].topics[topicKey].totalQ += s.totalQuestions || 0;
      map[sk].topics[topicKey].correctQ += s.correctCount || 0;
      map[sk].topics[topicKey].wrongQ += s.wrongCount || 0;
      map[sk].topics[topicKey].blankQ += s.blankCount || 0;
      map[sk].topics[topicKey].testCount += 1;
    });
    return Object.entries(map)
      .filter(([, v]) => v.tests.length > 0)
      .map(([subj, v]) => {
        const avgScore = v.tests.length > 0 ? Math.round(v.tests.reduce((a, s) => a + (s.computedScore || 0), 0) / v.tests.length) : 0;
        const totalWrong = v.tests.reduce((a, s) => a + (s.wrongCount || 0), 0);
        const totalBlank = v.tests.reduce((a, s) => a + (s.blankCount || 0), 0);
        const topicArray = Object.entries(v.topics).map(([name, t]) => ({
          name,
          accuracy: t.totalQ > 0 ? Math.round((t.correctQ / t.totalQ) * 100) : 0,
          totalQ: t.totalQ,
          correctQ: t.correctQ,
          wrongQ: t.wrongQ,
          blankQ: t.blankQ,
          testCount: t.testCount
        })).sort((a, b) => b.accuracy - a.accuracy);
        return { subj, ...v, avgScore, totalWrong, totalBlank, topicArray };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [studentSubmissions]);

  /* ── Subject Bar Chart Data ─── */
  const subjectBarData = useMemo(() => {
    return subjectBreakdown.map(sb => {
      const th = subjectThemes[sb.subj] || subjectThemes['Diğer'];
      return {
        name: sb.subj,
        fullName: sb.subj,
        'Başarı %': sb.avgScore,
        'Doğru': sb.totalCorrect,
        'Yanlış': sb.totalWrong,
        'Boş': sb.totalBlank,
        'Soru Sayısı': sb.totalQ,
        'Test Sayısı': sb.tests.length,
        color: th.color,
        barColor: th.radar || th.color
      };
    });
  }, [subjectBreakdown]);

  /* ── Subject Pie Chart Data ─── */
  const subjectPieData = useMemo(() => {
    return subjectBreakdown.map(sb => {
      const th = subjectThemes[sb.subj] || subjectThemes['Diğer'];
      return {
        name: sb.subj,
        value: sb.totalQ,
        correct: sb.totalCorrect,
        avgScore: sb.avgScore,
        color: th.radar || th.color
      };
    });
  }, [subjectBreakdown]);

  /* ── Active Topic Chart Data for selected subject ─── */
  const activeTopicChartData = useMemo(() => {
    let list = [];
    if (selectedSubjFilter === 'all') {
      subjectBreakdown.forEach(sb => {
        sb.topicArray.forEach(tp => {
          list.push({
            ...tp,
            subject: sb.subj,
            displayName: `${sb.subj} · ${tp.name}`
          });
        });
      });
    } else {
      const match = subjectBreakdown.find(sb => sb.subj === selectedSubjFilter);
      if (match) {
        list = match.topicArray.map(tp => ({
          ...tp,
          subject: match.subj,
          displayName: tp.name
        }));
      }
    }

    if (topicChartSort === 'accuracy_desc') {
      list.sort((a, b) => b.accuracy - a.accuracy);
    } else if (topicChartSort === 'accuracy_asc') {
      list.sort((a, b) => a.accuracy - b.accuracy);
    } else if (topicChartSort === 'totalQ_desc') {
      list.sort((a, b) => b.totalQ - a.totalQ);
    }

    return list.slice(0, 15);
  }, [subjectBreakdown, selectedSubjFilter, topicChartSort]);

  /* ── Strong & Weak Topics ─── */
  const { topStrongTopics, topWeakTopics } = useMemo(() => {
    let all = [];
    subjectBreakdown.forEach(sb => {
      sb.topicArray.forEach(tp => {
        all.push({ ...tp, subject: sb.subj });
      });
    });
    const strong = all.filter(t => t.accuracy >= 75 && t.totalQ >= 3).sort((a, b) => b.accuracy - a.accuracy).slice(0, 4);
    const weak = all.filter(t => t.accuracy < 60 && t.totalQ >= 3).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
    return { topStrongTopics: strong, topWeakTopics: weak };
  }, [subjectBreakdown]);

  /* ── Trend data ─── */
  const trendData = useMemo(() => {
    let data = [...studentSubmissions].sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
    if (trendSubject !== 'all') data = data.filter(s => s.subjectKey === trendSubject);
    return data.map((s, i) => ({
      name: s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : `${i + 1}`,
      title: s.testTitle,
      'Başarı %': s.computedScore,
      'Doğru': s.correctCount,
      'Yanlış': s.wrongCount,
      'Boş': s.blankCount,
    }));
  }, [studentSubmissions, trendSubject]);

  /* ── Filtered for "Tüm Sonuçlar" tab ─── */
  const filteredSubs = useMemo(() => {
    return studentSubmissions.filter(s => {
      const titleMatch = (s.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
      const subjectMatch = subjectFilter === 'all' || s.subjectKey === subjectFilter;
      const typeMatch = typeFilter === 'all' || s.typeKey === typeFilter;
      return titleMatch && subjectMatch && typeMatch;
    });
  }, [studentSubmissions, searchQuery, subjectFilter, typeFilter]);

  /* ── By-type tab submissions ─── */
  const byTypeSubs = useMemo(() => {
    const map = { physicalExam: [], homework: [], book: [], individual: [] };
    studentSubmissions.forEach(s => { (map[s.typeKey] || []).push(s); });
    return map;
  }, [studentSubmissions]);

  /* ── Helpers ─── */
  const theme = (key) => subjectThemes[key] || subjectThemes['Diğer'];

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc', padding: '1.25rem 1rem', fontFamily: "'Inter', system-ui, sans-serif", color: '#0f172a', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sr-anim { animation: fadeSlideUp 0.3s ease both; }
        .sr-card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .sr-card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; }
        @media (max-width: 768px) {
          .sr-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .sr-chart-grid { grid-template-columns: 1fr !important; }
          .sr-tabs-container { overflow-x: auto !important; flex-wrap: nowrap !important; justify-content: flex-start !important; -webkit-overflow-scrolling: touch; padding: 4px !important; }
          .sr-tab-btn { flex-shrink: 0 !important; font-size: 0.72rem !important; padding: 0.45rem 0.75rem !important; }
          .sr-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .sr-subject-header-btn { flex-direction: column !important; align-items: flex-start !important; }
          .sr-subject-header-right { width: 100% !important; justify-content: space-between !important; margin-top: 6px !important; }
          .sr-filter-bar { flex-direction: column !important; align-items: stretch !important; }
          .sr-filter-bar select, .sr-filter-bar input { width: 100% !important; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        {/* ── HEADER ── */}
        <div className="sr-header-wrap" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/student')} style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.8rem', color: '#334155', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <ArrowLeft size={15} /> Geri
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={22} color="#6366f1" /> Gelişim Merkezi & Karne
              </h1>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>Ders bazlı · Konu bazlı · Ödev türü bazlı ayrıntılı analiz</p>
            </div>
          </div>

          {/* Student Selector (Only shown to Teachers and Admins) */}
          {!isStudentRole ? (
            <div style={{ display: 'flex', gap: 6, background: '#ffffff', padding: 6, borderRadius: 16, border: '1.5px solid #e2e8f0', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              {studentMembers.map(s => {
                const active = selectedStudent?.id === s.id;
                return (
                  <button key={s.id} onClick={() => setSelectedStudent(s)} style={{ padding: '0.4rem 0.9rem', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f8fafc', color: active ? 'white' : '#475569', boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
                    <GraduationCap size={14} /> {s.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '0.5rem 1rem', borderRadius: 14, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, boxShadow: '0 2px 8px rgba(99,102,241,0.2)' }}>
                <GraduationCap size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>{selectedStudent?.name || currentUser?.name || 'Öğrenci'}</div>
                <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>Öğrenci Karnesi</div>
              </div>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="sr-tabs-container" style={{ display: 'flex', gap: 6, background: '#ffffff', padding: 6, borderRadius: 18, border: '1.5px solid #e2e8f0', marginBottom: 22, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          {TAB_DEFS.map(t => (
            <button key={t.key} className="sr-tab-btn" onClick={() => setActiveTab(t.key)} style={{ flex: '1 1 auto', padding: '0.6rem 1rem', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s', background: activeTab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f8fafc', color: activeTab === t.key ? 'white' : '#475569', boxShadow: activeTab === t.key ? '0 4px 14px rgba(99,102,241,0.3)' : 'none', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB 2: GÜNLÜK / AYLIK PERİYODİK SORU ANALİZİ
        ══════════════════════════════════════ */}
        {activeTab === 'periodic' && (
          <div className="sr-anim">
            <PeriodicQuestionAnalytics
              homeworkSubmissions={otherHomeworkSubmissions}
              mockExams={generalTrialExams}
              studentName={selectedStudent?.name || currentUser?.name || 'Öğrenci'}
            />
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 1: GENEL BAKIŞ
        ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* KPI Cards */}
            <div className="sr-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              {[
                { label: 'Çözülen Test', value: overallStats.total, icon: '📊', color: '#1e1b4b', bg: '#ffffff', iconBg: '#eff6ff', border: '#e2e8f0' },
                { label: 'Ort. Başarı', value: `%${overallStats.avgScore}`, icon: '🎯', color: '#14532d', bg: '#ffffff', iconBg: '#f0fdf4', border: '#e2e8f0' },
                { label: 'En Yüksek', value: `%${overallStats.maxScore}`, icon: '🏆', color: '#78350f', bg: '#ffffff', iconBg: '#fffbeb', border: '#e2e8f0' },
                { label: 'Toplam Soru', value: overallStats.totalQ, icon: '📝', color: '#0c4a6e', bg: '#ffffff', iconBg: '#f0f9ff', border: '#e2e8f0' },
                { label: 'Toplam Doğru', value: overallStats.totalCorrect, icon: '✅', color: '#064e3b', bg: '#ffffff', iconBg: '#f0fdf4', border: '#e2e8f0' },
                { label: 'Kritik Ders', value: overallStats.weakSubjects, icon: '⚠️', color: '#881337', bg: '#ffffff', iconBg: '#fff1f2', border: '#e2e8f0' },
              ].map((k, i) => (
                <div key={i} style={{ background: k.bg, borderRadius: 20, padding: '1.1rem 1.25rem', border: `1.5px solid ${k.border}`, boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', flexShrink: 0 }}>{k.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', marginTop: 3 }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar + Pie row */}
            <div className="sr-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>

              {/* Radar + Performance Breakdown */}
              <div style={{ background: '#ffffff', borderRadius: 22, padding: '1.35rem', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🕸️ Ders Bazlı Performans Haritası
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Tüm derslerdeki ortalama başarı yüzdesi ve soru hacmi</p>
                  </div>
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => setPerfViewMode('radar')}
                      style={{
                        padding: '0.28rem 0.65rem',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: perfViewMode === 'radar' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                        color: perfViewMode === 'radar' ? '#ffffff' : '#64748b',
                        boxShadow: perfViewMode === 'radar' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      🕸️ Radar
                    </button>
                    <button
                      onClick={() => setPerfViewMode('bars')}
                      style={{
                        padding: '0.28rem 0.65rem',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: perfViewMode === 'bars' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                        color: perfViewMode === 'bars' ? '#ffffff' : '#64748b',
                        boxShadow: perfViewMode === 'bars' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      📊 Çubuklar
                    </button>
                  </div>
                </div>

                {perfViewMode === 'radar' ? (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <defs>
                          <linearGradient id="radarNeonGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 900 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          stroke="#cbd5e1"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                          tickCount={5}
                        />
                        <Radar
                          name="Başarı"
                          dataKey="value"
                          stroke="#4f46e5"
                          fill="url(#radarNeonGrad)"
                          fillOpacity={0.65}
                          strokeWidth={2.8}
                          dot={{ r: 4.5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                        <Tooltip
                          formatter={(v, name, props) => [`%${v} (${props.payload.count || 0} Test · ${props.payload.totalQ || 0} Soru)`, props.payload.fullSubject || name]}
                          contentStyle={{ background: '#ffffff', borderRadius: '0.85rem', border: '1.5px solid #e2e8f0', color: '#0f172a', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={radarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="subject" tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 900 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} tickFormatter={v => `%${v}`} />
                        <Tooltip
                          formatter={(v, name, props) => [`%${v} (${props.payload.count || 0} Test · ${props.payload.totalQ || 0} Soru)`, props.payload.fullSubject || name]}
                          contentStyle={{ background: '#ffffff', borderRadius: '0.85rem', border: '1.5px solid #e2e8f0', color: '#0f172a', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                        />
                        <Bar dataKey="value" name="Başarı" radius={[8, 8, 0, 0]}>
                          {radarData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.theme?.color || '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Direct High-Contrast Subject Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8, marginTop: 12, borderTop: '1.5px solid #e2e8f0', paddingTop: 12 }}>
                  {radarData.map((d, i) => {
                    const hasTests = d.count > 0;
                    const SubIcon = d.theme?.icon || BookOpen;
                    const color = d.theme?.color || '#2563eb';
                    const isGood = d.value >= 70;
                    const isMid = d.value >= 50 && d.value < 70;

                    return (
                      <div
                        key={i}
                        style={{
                          background: '#f8fafc',
                          borderRadius: 14,
                          padding: '0.65rem 0.75rem',
                          border: `1.5px solid ${hasTests ? d.theme?.border || '#e2e8f0' : '#e2e8f0'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: d.theme?.bg || '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <SubIcon size={12} color={color} />
                            </div>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.fullSubject}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            color: hasTests ? (isGood ? '#15803d' : isMid ? '#b45309' : '#b91c1c') : '#94a3b8',
                            flexShrink: 0
                          }}>
                            {hasTests ? `%${d.value}` : '—'}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${hasTests ? d.value : 0}%`,
                              background: hasTests ? (isGood ? 'linear-gradient(90deg, #10b981, #34d399)' : isMid ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)') : 'transparent',
                              borderRadius: 99,
                              transition: 'width 0.6s ease'
                            }}
                          />
                        </div>

                        <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>
                          {hasTests ? `${d.count} Test · ${d.totalQ} Soru` : 'Henüz test yok'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie + legend */}
              <div style={{ background: '#ffffff', borderRadius: 22, padding: '1.4rem', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', minWidth: 0, overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🍩 Ödev Türü Dağılımı
                </h3>
                {typeBreakdown.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={4}>
                            {typeBreakdown.map((e, i) => <Cell key={i} fill={e.fill} stroke="#ffffff" strokeWidth={2} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#ffffff', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', color: '#0f172a', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {typeBreakdown.map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, background: '#f8fafc', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: e.fill, flexShrink: 0 }} />
                          <span style={{ color: '#475569' }}>{e.name}: <b style={{ color: '#0f172a' }}>{e.value}</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0', fontWeight: 700 }}>Henüz veri yok</div>
                )}
              </div>
            </div>

            {/* Recent 5 tests */}
            <div style={{ background: '#ffffff', borderRadius: 22, padding: '1.4rem', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                🕐 Son 5 Sınav / Ödev
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studentSubmissions.slice(0, 5).map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div key={i} className="sr-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem 1.1rem', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={18} color={th.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.35 }}>
                          {s.bookTitle ? (
                            <>
                              <span style={{ color: '#4f46e5', fontWeight: 900 }}>{s.bookTitle}</span>
                              <span style={{ color: '#94a3b8', margin: '0 4px' }}>—</span>
                              <span>{s.subjectName || s.subjectKey}</span>
                              {s.topicName && <span style={{ color: '#64748b', fontWeight: 700 }}> · {s.topicName}</span>}
                              <span style={{ color: '#0f172a', fontWeight: 900 }}> ({s.testName})</span>
                            </>
                          ) : (
                            s.testTitle
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'} · {s.totalQuestions} Soru
                        </div>
                      </div>
                      <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} size="sm" />
                    </div>
                  );
                })}
                {studentSubmissions.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontWeight: 700 }}>Henüz sonuç bulunmuyor</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2: DERS & KONU ANALİZİ (GELİŞMİŞ GRAFİKLER)
        ══════════════════════════════════════ */}
        {activeTab === 'subjects' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* 1. ÜST ANALİZ VE GRAFİK KARTI */}
            <div style={{
              background: '#ffffff',
              borderRadius: 24,
              border: '1.5px solid #e2e8f0',
              padding: isMobile ? '1.1rem 1rem' : '1.4rem 1.75rem',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
            }}>
              {/* Header with Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                    <BarChart3 size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Ders & Konu Başarı Karnesi
                    </h2>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                      Dersler ve konular bazında çözülen sorular, doğruluk oranları ve yetkinlik grafiği
                    </span>
                  </div>
                </div>

                {/* Grafik Türü Seçici */}
                <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => setSubjChartType('bar')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0.45rem 0.85rem',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: subjChartType === 'bar' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: subjChartType === 'bar' ? '#fff' : '#64748b',
                      boxShadow: subjChartType === 'bar' ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <BarChart3 size={14} /> Karşılaştırma
                  </button>
                  <button
                    onClick={() => setSubjChartType('radar')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0.45rem 0.85rem',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: subjChartType === 'radar' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: subjChartType === 'radar' ? '#fff' : '#64748b',
                      boxShadow: subjChartType === 'radar' ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Target size={14} /> Yetkinlik Radarı
                  </button>
                  <button
                    onClick={() => setSubjChartType('pie')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0.45rem 0.85rem',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: subjChartType === 'pie' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: subjChartType === 'pie' ? '#fff' : '#64748b',
                      boxShadow: subjChartType === 'pie' ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <PieIcon size={14} /> Soru Payı
                  </button>
                </div>
              </div>

              {/* Chart Content */}
              {subjectBreakdown.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  Henüz çözülmüş test verisi bulunmuyor
                </div>
              ) : (
                <div style={{ height: isMobile ? 260 : 310, width: '100%', position: 'relative' }}>
                  {subjChartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectBarData} margin={{ top: 10, right: 15, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#0f172a', fontSize: isMobile ? 11 : 12, fontWeight: 700 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                          tickFormatter={v => `%${v}`}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.8} label={{ value: 'Hedef %70', fill: '#15803d', fontSize: 10, position: 'right' }} />
                        <Bar
                          dataKey="Başarı %"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={45}
                        >
                          {subjectBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.barColor || '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {subjChartType === 'radar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius={isMobile ? '65%' : '75%'}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#0f172a', fontSize: isMobile ? 10 : 12, fontWeight: 800 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 9 }} />
                        <Radar name="Başarı %" dataKey="value" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.35} strokeWidth={2.5} />
                        <Tooltip content={<CustomSubjectTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}

                  {subjChartType === 'pie' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 50 : 65}
                          outerRadius={isMobile ? 85 : 110}
                          paddingAngle={3}
                        >
                          {subjectPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <Legend
                          formatter={(value) => <span style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 700 }}>{value}</span>}
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            {/* 2. DERS FİLTRELEME PİLLERİ */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, alignItems: 'center' }}>
              <button
                onClick={() => setSelectedSubjFilter('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.5rem 1rem',
                  borderRadius: 12,
                  border: selectedSubjFilter === 'all' ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                  background: selectedSubjFilter === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff',
                  color: selectedSubjFilter === 'all' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedSubjFilter === 'all' ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <span>🌟 Tüm Dersler ({subjectBreakdown.length})</span>
              </button>

              {subjectBreakdown.map(sb => {
                const th = theme(sb.subj);
                const SubIcon = th.icon;
                const isSelected = selectedSubjFilter === sb.subj;
                return (
                  <button
                    key={sb.subj}
                    onClick={() => setSelectedSubjFilter(isSelected ? 'all' : sb.subj)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '0.5rem 1rem',
                      borderRadius: 12,
                      border: isSelected ? `1.5px solid ${th.color}` : '1.5px solid #e2e8f0',
                      background: isSelected ? th.bg : '#ffffff',
                      color: isSelected ? th.color : '#475569',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? `0 4px 14px ${th.color}25` : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <SubIcon size={15} color={isSelected ? th.color : '#64748b'} />
                    <span>{sb.subj}</span>
                    <span style={{
                      background: isSelected ? th.color : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '1px 6px',
                      borderRadius: 99
                    }}>
                      %{sb.avgScore}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. KONU BAZLI DETAYLI GRAFİK VE GELİŞİM PANOSU */}
            {activeTopicChartData.length > 0 && (
              <div style={{
                background: '#ffffff',
                borderRadius: 24,
                border: '1.5px solid #e2e8f0',
                padding: isMobile ? '1.1rem 1rem' : '1.4rem 1.75rem',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📈 Konu Başarı & Soru Dağılım Grafiği</span>
                      {selectedSubjFilter !== 'all' && (
                        <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 8 }}>
                          {selectedSubjFilter}
                        </span>
                      )}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      Konulardaki Doğru / Yanlış / Boş soru dağılımları ve doğruluk yüzdesi
                    </span>
                  </div>

                  {/* Sıralama Seçici */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Sırala:</span>
                    <select
                      value={topicChartSort}
                      onChange={e => setTopicChartSort(e.target.value)}
                      style={{
                        background: '#f8fafc',
                        color: '#0f172a',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 10,
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        outline: 'none'
                      }}
                    >
                      <option value="accuracy_desc">🔥 En Yüksek Başarı</option>
                      <option value="accuracy_asc">⚠️ En Düşük Başarı (Tekrar)</option>
                      <option value="totalQ_desc">📊 En Çok Soru Çözülen</option>
                    </select>
                  </div>
                </div>

                {/* Horizontal Bar Chart for Topics */}
                <div style={{ height: Math.max(240, activeTopicChartData.length * 38), width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={activeTopicChartData}
                      margin={{ top: 10, right: 25, left: isMobile ? 10 : 35, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} stroke="#e2e8f0" />
                      <YAxis
                        type="category"
                        dataKey="displayName"
                        width={isMobile ? 100 : 180}
                        tick={{ fill: '#0f172a', fontSize: isMobile ? 10 : 11, fontWeight: 800 }}
                        stroke="#e2e8f0"
                        tickFormatter={v => v.length > 22 ? v.slice(0, 20) + '…' : v}
                      />
                      <Tooltip content={<CustomSubjectTooltip />} />
                      <Legend
                        formatter={(val) => <span style={{ color: '#334155', fontSize: '0.76rem', fontWeight: 700 }}>{val}</span>}
                        verticalAlign="top"
                        align="right"
                      />
                      <Bar dataKey="correctQ" name="Doğru" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="wrongQ" name="Yanlış" fill="#f43f5e" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="blankQ" name="Boş" fill="#94a3b8" stackId="a" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 4. AKILLI ANALİZ KARTLARI (GÜÇLÜ YÖNLER & TEKRAR GEREKENLER) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Güçlü Konular */}
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: 20,
                padding: '1.1rem 1.35rem',
                boxShadow: '0 4px 16px rgba(16,185,129,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    🚀
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#15803d', fontSize: '0.92rem', fontWeight: 900 }}>
                      En Güçlü Olduğun Konular
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#166534' }}>Doğruluk %75 ve üzeri olanlar</span>
                  </div>
                </div>

                {topStrongTopics.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    Henüz yeterli soru çözülen güçlü konu tespit edilmedi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topStrongTopics.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '0.45rem 0.75rem', borderRadius: 10, border: '1px solid #dcfce7' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                          {t.subject ? `[${t.subject}] ` : ''}{t.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#15803d' }}>
                          %{t.accuracy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tekrar Gereken Konular */}
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: 20,
                padding: '1.1rem 1.35rem',
                boxShadow: '0 4px 16px rgba(239,68,68,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    ⚠️
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#b91c1c', fontSize: '0.92rem', fontWeight: 900 }}>
                      Öncelikli Tekrar Gereken Konular
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#991b1b' }}>Doğruluk %60 altı olanlar</span>
                  </div>
                </div>

                {topWeakTopics.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700, padding: '0.5rem 0' }}>
                    Tebrikler! Kritik derecede zayıf konu bulunmuyor 🎉
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topWeakTopics.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '0.45rem 0.75rem', borderRadius: 10, border: '1px solid #fee2e2' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                          {t.subject ? `[${t.subject}] ` : ''}{t.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#dc2626' }}>
                          %{t.accuracy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. DERS VE KONU AKORDEON DETAYLARI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {subjectBreakdown
                .filter(sb => selectedSubjFilter === 'all' || sb.subj === selectedSubjFilter)
                .map(({ subj, tests, avgScore, topicArray, totalQ, totalCorrect, totalWrong, totalBlank }) => {
                  const th = theme(subj);
                  const SubIcon = th.icon;
                  const isExpanded = expandedSubject === subj || selectedSubjFilter === subj;
                  return (
                    <div key={subj} style={{ background: '#ffffff', borderRadius: 20, border: `1.5px solid ${isExpanded ? th.border : '#e2e8f0'}`, boxShadow: isExpanded ? '0 8px 30px rgba(0,0,0,0.05)' : '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                      {/* Subject Header */}
                      <button className="sr-subject-header-btn" onClick={() => setExpandedSubject(isExpanded && selectedSubjFilter === 'all' ? null : subj)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', background: isExpanded ? th.bg : 'transparent', border: 'none', cursor: 'pointer', gap: 12, flexWrap: 'wrap', transition: 'background 0.25s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 46, height: 46, borderRadius: 14, background: th.bg, border: `1.5px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SubIcon size={22} color={th.color} />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>{subj}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                              {tests.length} test · {totalQ} soru (<span style={{ color: '#16a34a' }}>{totalCorrect} D</span> · <span style={{ color: '#dc2626' }}>{totalWrong} Y</span> · <span style={{ color: '#64748b' }}>{totalBlank} B</span>)
                            </div>
                          </div>
                        </div>
                        <div className="sr-subject-header-right" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <ScoreBadge score={avgScore} size="md" />
                          <StatusTag accuracy={avgScore} />
                          <ChevronRight size={18} color="#64748b" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </button>

                      {/* Expanded: Topic horizontal bars */}
                      {isExpanded && topicArray.length > 0 && (
                        <div style={{ padding: '1.25rem 1.4rem', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                            📋 Konu / Test Bazlı Doğruluk Analizi
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {topicArray.map((top, idx) => (
                              <div key={idx} style={{ background: '#ffffff', borderRadius: 12, padding: '0.75rem 1rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{top.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                                      {top.correctQ} D / {top.wrongQ} Y / {top.blankQ} B ({top.totalQ} Soru)
                                    </span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: top.accuracy >= 70 ? '#15803d' : top.accuracy >= 50 ? '#b45309' : '#b91c1c' }}>
                                      %{top.accuracy}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${top.accuracy}%`, height: '100%', background: top.accuracy >= 70 ? '#10b981' : top.accuracy >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 0.5s ease' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 3: ÖDEV & DENEME TÜRÜ
        ══════════════════════════════════════ */}
        {activeTab === 'bytype' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sub tabs */}
            <div style={{ display: 'flex', gap: 6, background: '#ffffff', padding: 6, borderRadius: 16, border: '1.5px solid #e2e8f0', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              {[
                { key: 'homework',     label: '📝 Ödevler',        count: byTypeSubs.homework.length },
                { key: 'physicalExam', label: '🏛️ Denemeler',      count: byTypeSubs.physicalExam.length },
                { key: 'book',         label: '📕 Kitap Testleri', count: byTypeSubs.book.length },
                { key: 'individual',   label: '⚡ Bireysel',        count: byTypeSubs.individual.length },
              ].map(t => (
                <button key={t.key} onClick={() => setByTypeTab(t.key)} style={{ padding: '0.45rem 0.95rem', borderRadius: 11, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: byTypeTab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f8fafc', color: byTypeTab === t.key ? 'white' : '#475569', boxShadow: byTypeTab === t.key ? '0 4px 14px rgba(99,102,241,0.25)' : 'none' }}>
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byTypeSubs[byTypeTab].map((s, i) => {
                const th = theme(s.subjectKey);
                const SubIcon = th.icon;
                return (
                  <div key={i} className="sr-card-hover" style={{ background: '#ffffff', borderRadius: 16, padding: '1rem 1.25rem', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={20} color={th.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                          {s.bookTitle ? (
                            <>
                              <span style={{ color: '#4f46e5', fontWeight: 900 }}>{s.bookTitle}</span>
                              <span style={{ color: '#94a3b8', margin: '0 4px' }}>—</span>
                              <span>{s.subjectName || s.subjectKey}</span>
                              {s.topicName && <span style={{ color: '#64748b', fontWeight: 700 }}> · {s.topicName}</span>}
                              <span style={{ color: '#0f172a', fontWeight: 900 }}> ({s.testName})</span>
                            </>
                          ) : (
                            s.testTitle
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span>📅 {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : '—'}</span>
                          <span>📝 {s.totalQuestions} Soru</span>
                          <span style={{ color: '#15803d', fontWeight: 800 }}>✓ {s.correctCount} D</span>
                          <span style={{ color: '#dc2626', fontWeight: 800 }}>✗ {s.wrongCount} Y</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} size="md" />
                      {s.type !== 'physicalExam' ? (
                        <button onClick={() => navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '0.45rem 0.95rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                          <Eye size={14} /> İncele
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', border: 'none', borderRadius: 10, padding: '0.45rem 0.95rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
                          <Eye size={14} /> Karne
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {byTypeSubs[byTypeTab].length === 0 && (
                <div style={{ background: '#ffffff', borderRadius: 18, padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 700, border: '1.5px solid #e2e8f0' }}>
                  Bu kategoride sonuç bulunmuyor
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 4: ZAMAN TRENDİ
        ══════════════════════════════════════ */}
        {activeTab === 'trend' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 22, padding: '1.4rem 1.6rem', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📈 Zaman İçindeki Başarı Trendi
                </h3>
                <select value={trendSubject} onChange={e => setTrendSubject(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontWeight: 800, fontSize: '0.8rem', background: '#f8fafc', color: '#0f172a', outline: 'none', cursor: 'pointer' }}>
                  <option value="all">Tüm Dersler</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {trendData.length > 0 ? (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Hedef %70', fill: '#15803d', fontSize: 11, fontWeight: 800 }} />
                      <Area type="monotone" dataKey="Başarı %" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#areaGrad)" dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 7, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>Bu derse ait trend verisi yok</div>
              )}
            </div>

            {/* Doğru/Yanlış/Boş Stacked/Grouped Bar */}
            {trendData.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 22, padding: '1.4rem 1.6rem', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', minWidth: 0, overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 1rem', fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📊 Doğru / Yanlış / Boş Dağılımı
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                      <YAxis style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem', fontWeight: 800, paddingTop: '0.5rem' }} />
                      <Bar dataKey="Doğru"  fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Yanlış" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Boş"    fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 5: TÜM SONUÇLAR
        ══════════════════════════════════════ */}
        {activeTab === 'all' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Filter bar */}
            <div className="sr-filter-bar" style={{ background: '#ffffff', borderRadius: 18, padding: '0.9rem 1.15rem', border: '1.5px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 140 }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Sınav / ders ara..." style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }} />
              </div>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontWeight: 800, fontSize: '0.8rem', background: '#f8fafc', color: '#0f172a', outline: 'none', cursor: 'pointer' }}>
                <option value="all">Tüm Dersler</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontWeight: 800, fontSize: '0.8rem', background: '#f8fafc', color: '#0f172a', outline: 'none', cursor: 'pointer' }}>
                <option value="all">Tüm Türler</option>
                <option value="homework">📝 Ödevler</option>
                <option value="physicalExam">🏛️ Denemeler</option>
                <option value="book">📕 Kitap Testleri</option>
                <option value="individual">⚡ Bireysel</option>
              </select>
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                {['table', 'cards'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{ padding: '0.35rem 0.8rem', borderRadius: 9, border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', background: viewMode === m ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent', color: viewMode === m ? 'white' : '#64748b' }}>
                    {m === 'table' ? '📋 Tablo' : '🃏 Kartlar'}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>{filteredSubs.length} sonuç</span>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        {['SINAV / BAŞLIK', 'DERS', 'TARİH', 'TÜR', 'D / Y / B', 'BAŞARI', 'EYLEM'].map(h => (
                          <th key={h} style={{ padding: '0.9rem 1rem', fontWeight: 900, fontSize: '0.72rem', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((s, i) => {
                        const th = theme(s.subjectKey);
                        const SubIcon = th.icon;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#f8fafc' : '#ffffff', transition: 'background 0.15s' }}>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.86rem', lineHeight: 1.35 }}>
                                {s.bookTitle ? (
                                  <>
                                    <span style={{ color: '#4f46e5', fontWeight: 900 }}>{s.bookTitle}</span>
                                    <span style={{ color: '#94a3b8', margin: '0 4px' }}>—</span>
                                    <span>{s.subjectName || s.subjectKey}</span>
                                    {s.topicName && <span style={{ color: '#64748b', fontWeight: 700 }}> · {s.topicName}</span>}
                                    <span style={{ color: '#0f172a', fontWeight: 900 }}> ({s.testName})</span>
                                  </>
                                ) : (
                                  s.testTitle
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: th.bg, color: th.color, border: `1px solid ${th.border}`, borderRadius: 8, padding: '0.22rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                                <SubIcon size={12} /> {s.subjectKey}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : '—'}</td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <span style={{ background: typeConfig[s.typeKey]?.bg || '#f8fafc', color: typeConfig[s.typeKey]?.color || '#0f172a', border: `1px solid ${typeConfig[s.typeKey]?.border || '#e2e8f0'}`, borderRadius: 8, padding: '0.22rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                                {typeConfig[s.typeKey]?.label || '⚡ Bireysel'}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>✓{s.correctCount}</span>
                                <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>✗{s.wrongCount}</span>
                                <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>○{s.blankCount}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} size="sm" />
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              {s.type !== 'physicalExam' ? (
                                <button onClick={() => navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 9, padding: '0.38rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                                  <Eye size={13} /> İncele
                                </button>
                              ) : (
                                <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', border: 'none', borderRadius: 9, padding: '0.38rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
                                  <Eye size={13} /> Karne
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSubs.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                          <ListTree size={36} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
                          Sonuç bulunamadı. Filtreleri değiştirin.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CARDS VIEW */}
            {viewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
                {filteredSubs.map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div key={i} className="sr-card-hover" style={{ background: '#ffffff', borderRadius: 18, border: `1.5px solid ${th.border}`, padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ height: 4, background: th.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: th.bg, color: th.color, border: `1px solid ${th.border}`, borderRadius: 8, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          <SubIcon size={13} /> {s.subjectKey}
                        </span>
                        <span style={{ background: typeConfig[s.typeKey]?.bg || '#f8fafc', color: typeConfig[s.typeKey]?.color || '#0f172a', border: `1px solid ${typeConfig[s.typeKey]?.border || '#e2e8f0'}`, borderRadius: 8, padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          {typeConfig[s.typeKey]?.label || '⚡'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.35 }}>
                        {s.bookTitle ? (
                          <>
                            <span style={{ color: '#4f46e5', fontWeight: 900 }}>{s.bookTitle}</span>
                            <span style={{ color: '#94a3b8', margin: '0 4px' }}>—</span>
                            <span>{s.subjectName || s.subjectKey}</span>
                            {s.topicName && <span style={{ color: '#64748b', fontWeight: 700 }}> · {s.topicName}</span>}
                            <span style={{ color: '#0f172a', fontWeight: 900 }}> ({s.testName})</span>
                          </>
                        ) : (
                          s.testTitle
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                        <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                        <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>○ {s.blankCount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                        <div>
                          <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} />
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: 3 }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}</div>
                        </div>
                        {s.type !== 'physicalExam' ? (
                          <button onClick={() => navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                            <Eye size={13} /> İncele
                          </button>
                        ) : (
                          <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
                            <Eye size={13} /> Karne
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <div style={{ gridColumn: '1/-1', background: '#ffffff', borderRadius: 18, padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 700, border: '1.5px solid #e2e8f0' }}>
                    Sonuç bulunamadı
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: '2.5rem' }} />
      </div>
    </div>
  );
}
