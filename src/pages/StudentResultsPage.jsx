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
  'Matematik':       { bg: 'rgba(37,99,235,0.2)', color: '#60a5fa', border: 'rgba(96,165,250,0.35)', icon: Ruler,         radar: '#3b82f6', light: 'rgba(37,99,235,0.1)' },
  'Fen Bilimleri':   { bg: 'rgba(5,150,105,0.2)', color: '#34d399', border: 'rgba(52,211,153,0.35)', icon: TestTube2,      radar: '#10b981', light: 'rgba(5,150,105,0.1)' },
  'Türkçe':          { bg: 'rgba(234,88,12,0.2)', color: '#fb923c', border: 'rgba(251,146,60,0.35)', icon: BookCopy,       radar: '#f97316', light: 'rgba(234,88,12,0.1)' },
  'Sosyal Bilgiler': { bg: 'rgba(147,51,234,0.2)', color: '#c084fc', border: 'rgba(192,132,252,0.35)', icon: Globe,          radar: '#a855f7', light: 'rgba(147,51,234,0.1)' },
  'İngilizce':       { bg: 'rgba(225,29,72,0.2)', color: '#fb7185', border: 'rgba(251,113,133,0.35)', icon: MessageSquare,  radar: '#f43f5e', light: 'rgba(225,29,72,0.1)' },
  'Genel Testler':   { bg: 'rgba(99,102,241,0.2)', color: '#818cf8', border: 'rgba(129,140,248,0.35)', icon: Trophy,         radar: '#6366f1', light: 'rgba(99,102,241,0.1)' },
  'Diğer':           { bg: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: 'rgba(255,255,255,0.15)', icon: BookOpen,       radar: '#94a3b8', light: 'rgba(255,255,255,0.05)' },
};

const typeConfig = {
  physicalExam: { label: '🏛️ Deneme',     bg: 'rgba(99,102,241,0.2)', color: '#c4b5fd', border: 'rgba(165,180,252,0.35)' },
  homework:     { label: '📝 Ödev',        bg: 'rgba(249,115,22,0.2)', color: '#fdba74', border: 'rgba(253,186,116,0.35)' },
  book:         { label: '📕 Kitap Testi', bg: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: 'rgba(110,231,183,0.35)' },
  individual:   { label: '⚡ Bireysel',    bg: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: 'rgba(255,255,255,0.15)' },
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
      <span style={{ fontSize: size === 'lg' ? '0.9rem' : size === 'sm' ? '0.72rem' : '0.8rem', fontWeight: 900, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1.5px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        ✍️ Not Bekliyor
      </span>
    );
  }
  const fontSize = size === 'lg' ? '1.35rem' : size === 'sm' ? '0.8rem' : '0.95rem';
  const pad = size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem';
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171';
  const bg = score >= 80 ? 'rgba(5,150,105,0.25)' : score >= 60 ? 'rgba(217,119,6,0.25)' : 'rgba(225,29,72,0.25)';
  const border = score >= 80 ? 'rgba(52,211,153,0.4)' : score >= 60 ? 'rgba(253,186,116,0.4)' : 'rgba(253,164,175,0.4)';
  return (
    <span style={{ fontSize, fontWeight: 900, background: bg, color, border: `1.5px solid ${border}`, borderRadius: 10, padding: pad, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {type === 'physicalExam' ? `${score} Net` : `%${score}`}
    </span>
  );
}

function StatusTag({ accuracy }) {
  if (accuracy >= 80) return <span style={{ background: 'rgba(5,150,105,0.25)', color: '#4ade80', border: '1px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>🏆 Güçlü</span>;
  if (accuracy >= 60) return <span style={{ background: 'rgba(217,119,6,0.25)', color: '#fbbf24', border: '1px solid rgba(253,186,116,0.4)', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>📈 Gelişiyor</span>;
  return <span style={{ background: 'rgba(225,29,72,0.25)', color: '#f87171', border: '1px solid rgba(253,164,175,0.4)', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>⚠️ Kritik</span>;
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
    <div style={{ background: '#0f172a', color: 'white', padding: '0.75rem 1rem', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', border: '1.5px solid rgba(255,255,255,0.2)', minWidth: 160 }}>
      <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#a5b4fc', marginBottom: 4 }}>{d.title || d.ders || label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 3 }}>
          <span style={{ color: p.color || 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{p.name}</span>
          <span style={{ fontWeight: 900, color: '#ffffff' }}>{typeof p.value === 'number' && p.name?.includes('%') ? `%${p.value}` : p.value}</span>
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
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1.5px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 14,
        padding: '0.75rem 1rem',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        fontSize: '0.8rem',
        minWidth: 160
      }}>
        <div style={{ fontWeight: 900, color: '#c7d2fe', marginBottom: 6, fontSize: '0.9rem' }}>
          {data.fullName || data.name || data.displayName}
        </div>
        {scoreVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#94a3b8' }}>Başarı Oranı:</span>
            <span style={{ fontWeight: 900, color: scoreVal >= 70 ? '#4ade80' : scoreVal >= 50 ? '#fbbf24' : '#f87171' }}>
              %{scoreVal}
            </span>
          </div>
        )}
        {correctVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#4ade80' }}>✓ Doğru:</span>
            <span style={{ fontWeight: 800 }}>{correctVal}</span>
          </div>
        )}
        {wrongVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#f87171' }}>✗ Yanlış:</span>
            <span style={{ fontWeight: 800 }}>{wrongVal}</span>
          </div>
        )}
        {blankVal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#94a3b8' }}>○ Boş:</span>
            <span style={{ fontWeight: 800 }}>{blankVal}</span>
          </div>
        )}
        {totalVal !== undefined && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', gap: 12, color: '#e2e8f0', fontWeight: 800 }}>
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
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.28) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.22) 0%, transparent 55%), linear-gradient(180deg, #0d1527 0%, #131f3b 35%, #1a274d 70%, #101a33 100%)', padding: '1.25rem 1rem', fontFamily: "'Inter', system-ui, sans-serif", color: '#f8fafc', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sr-anim { animation: fadeSlideUp 0.3s ease both; }
        .sr-card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .sr-card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(99,102,241,0.3) !important; }
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
            <button onClick={() => navigate('/student')} style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.8rem', color: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>
              <ArrowLeft size={15} /> Geri
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
                <Sparkles size={22} color="#a5b4fc" /> Gelişim Merkezi & Karne
              </h1>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 2 }}>Ders bazlı · Konu bazlı · Ödev türü bazlı ayrıntılı analiz</p>
            </div>
          </div>

          {/* Student Selector (Only shown to Teachers and Admins) */}
          {!isStudentRole ? (
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 6, borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.12)', flexWrap: 'wrap', backdropFilter: 'blur(10px)' }}>
              {studentMembers.map(s => {
                const active = selectedStudent?.id === s.id;
                return (
                  <button key={s.id} onClick={() => setSelectedStudent(s)} style={{ padding: '0.4rem 0.9rem', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.7)', boxShadow: active ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>
                    <GraduationCap size={14} /> {s.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', padding: '0.5rem 1rem', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.18)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                <GraduationCap size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff' }}>{selectedStudent?.name || currentUser?.name || 'Öğrenci'}</div>
                <div style={{ fontSize: '0.7rem', color: '#c7d2fe', fontWeight: 600 }}>Öğrenci Karnesi</div>
              </div>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="sr-tabs-container" style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 6, borderRadius: 18, border: '1.5px solid rgba(255,255,255,0.12)', marginBottom: 22, flexWrap: 'wrap', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)' }}>
          {TAB_DEFS.map(t => (
            <button key={t.key} className="sr-tab-btn" onClick={() => setActiveTab(t.key)} style={{ flex: '1 1 auto', padding: '0.6rem 1rem', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s', background: activeTab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent', color: activeTab === t.key ? 'white' : 'rgba(255,255,255,0.7)', boxShadow: activeTab === t.key ? '0 4px 14px rgba(99,102,241,0.4)' : 'none', whiteSpace: 'nowrap' }}>
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
                { label: 'Çözülen Test', value: overallStats.total, icon: '📊', color: '#ffffff', bg: 'linear-gradient(135deg, #1e1b4b, #4338ca)', border: 'rgba(165,180,252,0.35)' },
                { label: 'Ort. Başarı', value: `%${overallStats.avgScore}`, icon: '🎯', color: '#ffffff', bg: 'linear-gradient(135deg, #064e3b, #059669)', border: 'rgba(52,211,153,0.35)' },
                { label: 'En Yüksek', value: `%${overallStats.maxScore}`, icon: '🏆', color: '#ffffff', bg: 'linear-gradient(135deg, #78350f, #d97706)', border: 'rgba(253,186,116,0.35)' },
                { label: 'Toplam Soru', value: overallStats.totalQ, icon: '📝', color: '#ffffff', bg: 'linear-gradient(135deg, #0c4a6e, #0284c7)', border: 'rgba(125,211,252,0.35)' },
                { label: 'Toplam Doğru', value: overallStats.totalCorrect, icon: '✅', color: '#ffffff', bg: 'linear-gradient(135deg, #065f46, #10b981)', border: 'rgba(110,231,183,0.35)' },
                { label: 'Kritik Ders', value: overallStats.weakSubjects, icon: '⚠️', color: '#ffffff', bg: 'linear-gradient(135deg, #831843, #e11d48)', border: 'rgba(253,164,175,0.35)' },
              ].map((k, i) => (
                <div key={i} style={{ background: k.bg, borderRadius: 20, padding: '1.1rem 1.25rem', border: `1.5px solid ${k.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.14)', border: '1.5px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>{k.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: k.color, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>{k.value}</div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar + Pie row */}
            <div className="sr-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>

              {/* Radar + Performance Breakdown */}
              <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 27, 75, 0.94) 100%)', borderRadius: 22, padding: '1.35rem', border: '1.5px solid rgba(165, 180, 252, 0.25)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🕸️ Ders Bazlı Performans Haritası
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>Tüm derslerdeki ortalama başarı yüzdesi ve soru hacmi</p>
                  </div>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
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
                        color: perfViewMode === 'radar' ? '#ffffff' : 'rgba(255,255,255,0.7)',
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
                        color: perfViewMode === 'bars' ? '#ffffff' : 'rgba(255,255,255,0.7)',
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
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.7} />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.25} />
                          </linearGradient>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.22)" strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 900 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          stroke="rgba(255,255,255,0.28)"
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                          tickCount={5}
                        />
                        <Radar
                          name="Başarı"
                          dataKey="value"
                          stroke="#38bdf8"
                          fill="url(#radarNeonGrad)"
                          fillOpacity={0.65}
                          strokeWidth={2.8}
                          dot={{ r: 4.5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                        <Tooltip
                          formatter={(v, name, props) => [`%${v} (${props.payload.count || 0} Test · ${props.payload.totalQ || 0} Soru)`, props.payload.fullSubject || name]}
                          contentStyle={{ background: '#0f172a', borderRadius: '0.85rem', border: '1.5px solid rgba(255,255,255,0.22)', color: '#ffffff', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={radarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                        <XAxis dataKey="subject" tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 900 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} tickFormatter={v => `%${v}`} />
                        <Tooltip
                          formatter={(v, name, props) => [`%${v} (${props.payload.count || 0} Test · ${props.payload.totalQ || 0} Soru)`, props.payload.fullSubject || name]}
                          contentStyle={{ background: '#0f172a', borderRadius: '0.85rem', border: '1.5px solid rgba(255,255,255,0.22)', color: '#ffffff', fontWeight: 800 }}
                        />
                        <Bar dataKey="value" name="Başarı" radius={[8, 8, 0, 0]}>
                          {radarData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.theme?.color || '#38bdf8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Direct High-Contrast Subject Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12 }}>
                  {radarData.map((d, i) => {
                    const hasTests = d.count > 0;
                    const SubIcon = d.theme?.icon || BookOpen;
                    const color = d.theme?.color || '#38bdf8';
                    const isGood = d.value >= 70;
                    const isMid = d.value >= 50 && d.value < 70;

                    return (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 14,
                          padding: '0.65rem 0.75rem',
                          border: `1px solid ${hasTests ? d.theme?.border || 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: d.theme?.bg || 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <SubIcon size={12} color={color} />
                            </div>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.fullSubject}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            color: hasTests ? (isGood ? '#4ade80' : isMid ? '#fbbf24' : '#f87171') : 'rgba(255,255,255,0.4)',
                            flexShrink: 0
                          }}>
                            {hasTests ? `%${d.value}` : '—'}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${hasTests ? d.value : 0}%`,
                              background: hasTests ? (isGood ? 'linear-gradient(90deg, #10b981, #34d399)' : isMid ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)') : 'transparent',
                              borderRadius: 99,
                              boxShadow: hasTests ? `0 0 8px ${color}` : 'none',
                              transition: 'width 0.6s ease'
                            }}
                          />
                        </div>

                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                          {hasTests ? `${d.count} Test · ${d.totalQ} Soru` : 'Henüz test yok'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie + legend */}
              <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 22, padding: '1.4rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)', minWidth: 0, overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🍩 Ödev Türü Dağılımı
                </h3>
                {typeBreakdown.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={4}>
                            {typeBreakdown.map((e, i) => <Cell key={i} fill={e.fill} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#0f172a', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {typeBreakdown.map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: e.fill, flexShrink: 0 }} />
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{e.name}: <b style={{ color: '#ffffff' }}>{e.value}</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '3rem 0', fontWeight: 700 }}>Henüz veri yok</div>
                )}
              </div>
            </div>

            {/* Recent 5 tests */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 22, padding: '1.4rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                🕐 Son 5 Sınav / Ödev
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studentSubmissions.slice(0, 5).map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div key={i} className="sr-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem 1.1rem', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={18} color={th.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff', lineHeight: 1.35 }}>
                          {s.bookTitle ? (
                            <>
                              <span style={{ color: '#a5b4fc', fontWeight: 900 }}>{s.bookTitle}</span>
                              <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>—</span>
                              <span>{s.subjectName || s.subjectKey}</span>
                              {s.topicName && <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}> · {s.topicName}</span>}
                              <span style={{ color: '#ffffff', fontWeight: 900 }}> ({s.testName})</span>
                            </>
                          ) : (
                            s.testTitle
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginTop: 2 }}>
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'} · {s.totalQuestions} Soru
                        </div>
                      </div>
                      <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} size="sm" />
                    </div>
                  );
                })}
                {studentSubmissions.length === 0 && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem 0', fontWeight: 700 }}>Henüz sonuç bulunmuyor</div>}
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
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)',
              borderRadius: 24,
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              padding: isMobile ? '1.1rem 1rem' : '1.4rem 1.75rem',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(20px)'
            }}>
              {/* Header with Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
                    <BarChart3 size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      Ders & Konu Başarı Karnesi
                    </h2>
                    <span style={{ fontSize: '0.74rem', color: '#c7d2fe', fontWeight: 600 }}>
                      Dersler ve konular bazında çözülen sorular, doğruluk oranları ve yetkinlik grafiği
                    </span>
                  </div>
                </div>

                {/* Grafik Türü Seçici */}
                <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)' }}>
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
                      color: subjChartType === 'bar' ? '#fff' : '#cbd5e1',
                      boxShadow: subjChartType === 'bar' ? '0 2px 10px rgba(99,102,241,0.4)' : 'none',
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
                      color: subjChartType === 'radar' ? '#fff' : '#cbd5e1',
                      boxShadow: subjChartType === 'radar' ? '0 2px 10px rgba(99,102,241,0.4)' : 'none',
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
                      color: subjChartType === 'pie' ? '#fff' : '#cbd5e1',
                      boxShadow: subjChartType === 'pie' ? '0 2px 10px rgba(99,102,241,0.4)' : 'none',
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#cbd5e1', fontSize: isMobile ? 11 : 12, fontWeight: 700 }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                          tickFormatter={v => `%${v}`}
                          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Hedef %70', fill: '#86efac', fontSize: 10, position: 'right' }} />
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
                        <PolarGrid stroke="rgba(255,255,255,0.15)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#e2e8f0', fontSize: isMobile ? 10 : 12, fontWeight: 800 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar name="Başarı %" dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.45} strokeWidth={2.5} />
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
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(15,23,42,0.6)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <Legend
                          formatter={(value) => <span style={{ color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 700 }}>{value}</span>}
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
                  border: selectedSubjFilter === 'all' ? '1.5px solid #818cf8' : '1.5px solid rgba(255, 255, 255, 0.12)',
                  background: selectedSubjFilter === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(30, 41, 59, 0.85)',
                  color: selectedSubjFilter === 'all' ? '#ffffff' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedSubjFilter === 'all' ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none',
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
                      border: isSelected ? `1.5px solid ${th.color}` : '1.5px solid rgba(255, 255, 255, 0.12)',
                      background: isSelected ? th.bg : 'rgba(30, 41, 59, 0.85)',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? `0 4px 14px ${th.color}40` : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <SubIcon size={15} color={isSelected ? th.color : '#cbd5e1'} />
                    <span>{sb.subj}</span>
                    <span style={{
                      background: isSelected ? th.color : 'rgba(255,255,255,0.12)',
                      color: isSelected ? '#0f172a' : '#ffffff',
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
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)',
                borderRadius: 24,
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                padding: isMobile ? '1.1rem 1rem' : '1.4rem 1.75rem',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📈 Konu Başarı & Soru Dağılım Grafiği</span>
                      {selectedSubjFilter !== 'all' && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.4)', padding: '2px 8px', borderRadius: 8 }}>
                          {selectedSubjFilter}
                        </span>
                      )}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      Konulardaki Doğru / Yanlış / Boş soru dağılımları ve doğruluk yüzdesi
                    </span>
                  </div>

                  {/* Sıralama Seçici */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>Sırala:</span>
                    <select
                      value={topicChartSort}
                      onChange={e => setTopicChartSort(e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
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
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} stroke="rgba(255,255,255,0.15)" />
                      <YAxis
                        type="category"
                        dataKey="displayName"
                        width={isMobile ? 100 : 180}
                        tick={{ fill: '#e2e8f0', fontSize: isMobile ? 10 : 11, fontWeight: 800 }}
                        stroke="rgba(255,255,255,0.15)"
                        tickFormatter={v => v.length > 22 ? v.slice(0, 20) + '…' : v}
                      />
                      <Tooltip content={<CustomSubjectTooltip />} />
                      <Legend
                        formatter={(val) => <span style={{ color: '#e2e8f0', fontSize: '0.76rem', fontWeight: 700 }}>{val}</span>}
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
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)',
                border: '1.5px solid rgba(52, 211, 153, 0.35)',
                borderRadius: 20,
                padding: '1.1rem 1.35rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    🚀
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#6ee7b7', fontSize: '0.92rem', fontWeight: 900 }}>
                      En Güçlü Olduğun Konular
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#a7f3d0' }}>Doğruluk %75 ve üzeri olanlar</span>
                  </div>
                </div>

                {topStrongTopics.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    Henüz yeterli soru çözülen güçlü konu tespit edilmedi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topStrongTopics.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '0.45rem 0.75rem', borderRadius: 10 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                          {t.subject ? `[${t.subject}] ` : ''}{t.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#34d399' }}>
                          %{t.accuracy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tekrar Gereken Konular */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)',
                border: '1.5px solid rgba(251, 113, 133, 0.35)',
                borderRadius: 20,
                padding: '1.1rem 1.35rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(244,63,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    ⚠️
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#fda4af', fontSize: '0.92rem', fontWeight: 900 }}>
                      Öncelikli Tekrar Gereken Konular
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#fecdd3' }}>Doğruluk %60 altı olanlar</span>
                  </div>
                </div>

                {topWeakTopics.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: '#86efac', fontWeight: 700, padding: '0.5rem 0' }}>
                    Tebrikler! Kritik derecede zayıf konu bulunmuyor 🎉
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topWeakTopics.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '0.45rem 0.75rem', borderRadius: 10 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                          {t.subject ? `[${t.subject}] ` : ''}{t.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fb7185' }}>
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
                    <div key={subj} style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 20, border: `1.5px solid ${isExpanded ? th.border : 'rgba(255,255,255,0.12)'}`, boxShadow: isExpanded ? `0 8px 32px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.25)', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                      {/* Subject Header */}
                      <button className="sr-subject-header-btn" onClick={() => setExpandedSubject(isExpanded && selectedSubjFilter === 'all' ? null : subj)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', background: isExpanded ? th.bg : 'transparent', border: 'none', cursor: 'pointer', gap: 12, flexWrap: 'wrap', transition: 'background 0.25s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: `1.5px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SubIcon size={22} color={th.color} />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff' }}>{subj}</div>
                            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                              {tests.length} test · {totalQ} soru (<span style={{ color: '#4ade80' }}>{totalCorrect} D</span> · <span style={{ color: '#f87171' }}>{totalWrong} Y</span> · <span style={{ color: '#94a3b8' }}>{totalBlank} B</span>)
                            </div>
                          </div>
                        </div>
                        <div className="sr-subject-header-right" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <ScoreBadge score={avgScore} size="md" />
                          <StatusTag accuracy={avgScore} />
                          <ChevronRight size={18} color="#ffffff" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </button>

                      {/* Expanded: Topic horizontal bars */}
                      {isExpanded && topicArray.length > 0 && (
                        <div style={{ padding: '1.25rem 1.4rem', background: 'rgba(0, 0, 0, 0.25)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                            📋 Konu / Test Bazlı Doğruluk Analizi
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {topicArray.map((top, idx) => (
                              <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>{top.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                                      {top.correctQ} D / {top.wrongQ} Y / {top.blankQ} B ({top.totalQ} Soru)
                                    </span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: top.accuracy >= 70 ? '#4ade80' : top.accuracy >= 50 ? '#fbbf24' : '#f87171' }}>
                                      %{top.accuracy}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
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
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 6, borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.12)', flexWrap: 'wrap', backdropFilter: 'blur(10px)' }}>
              {[
                { key: 'homework',     label: '📝 Ödevler',        count: byTypeSubs.homework.length },
                { key: 'physicalExam', label: '🏛️ Denemeler',      count: byTypeSubs.physicalExam.length },
                { key: 'book',         label: '📕 Kitap Testleri', count: byTypeSubs.book.length },
                { key: 'individual',   label: '⚡ Bireysel',        count: byTypeSubs.individual.length },
              ].map(t => (
                <button key={t.key} onClick={() => setByTypeTab(t.key)} style={{ padding: '0.45rem 0.95rem', borderRadius: 11, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: byTypeTab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent', color: byTypeTab === t.key ? 'white' : 'rgba(255,255,255,0.7)', boxShadow: byTypeTab === t.key ? '0 4px 14px rgba(99,102,241,0.35)' : 'none' }}>
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byTypeSubs[byTypeTab].map((s, i) => {
                const th = theme(s.subjectKey);
                const SubIcon = th.icon;
                return (
                  <div key={i} className="sr-card-hover" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 16, padding: '1rem 1.25rem', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', backdropFilter: 'blur(16px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={20} color={th.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>
                          {s.bookTitle ? (
                            <>
                              <span style={{ color: '#a5b4fc', fontWeight: 900 }}>{s.bookTitle}</span>
                              <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>—</span>
                              <span>{s.subjectName || s.subjectKey}</span>
                              {s.topicName && <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}> · {s.topicName}</span>}
                              <span style={{ color: '#ffffff', fontWeight: 900 }}> ({s.testName})</span>
                            </>
                          ) : (
                            s.testTitle
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span>📅 {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : '—'}</span>
                          <span>📝 {s.totalQuestions} Soru</span>
                          <span style={{ color: '#4ade80', fontWeight: 800 }}>✓ {s.correctCount} D</span>
                          <span style={{ color: '#f87171', fontWeight: 800 }}>✗ {s.wrongCount} Y</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} size="md" />
                      {s.type !== 'physicalExam' ? (
                        <button onClick={() => navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '0.45rem 0.95rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                          <Eye size={14} /> İncele
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', border: 'none', borderRadius: 10, padding: '0.45rem 0.95rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>
                          <Eye size={14} /> Karne
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {byTypeSubs[byTypeTab].length === 0 && (
                <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)', borderRadius: 18, padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontWeight: 700, border: '1.5px solid rgba(255,255,255,0.12)' }}>
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
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 22, padding: '1.4rem 1.6rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📈 Zaman İçindeki Başarı Trendi
                </h3>
                <select value={trendSubject} onChange={e => setTrendSubject(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.18)', fontWeight: 800, fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', outline: 'none', cursor: 'pointer' }}>
                  <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm Dersler</option>
                  {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>)}
                </select>
              </div>
              {trendData.length > 0 ? (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#c7d2fe' }} />
                      <YAxis domain={[0, 100]} style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#c7d2fe' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={70} stroke="#34d399" strokeDasharray="5 5" label={{ value: 'Hedef %70', fill: '#34d399', fontSize: 11, fontWeight: 800 }} />
                      <Area type="monotone" dataKey="Başarı %" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#areaGrad)" dot={{ fill: '#a78bfa', r: 4 }} activeDot={{ r: 7, fill: '#c4b5fd', stroke: '#0f172a', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Bu derse ait trend verisi yok</div>
              )}
            </div>

            {/* Doğru/Yanlış/Boş Stacked/Grouped Bar */}
            {trendData.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 22, padding: '1.4rem 1.6rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)', minWidth: 0, overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 1rem', fontWeight: 900, fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📊 Doğru / Yanlış / Boş Dağılımı
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#c7d2fe' }} />
                      <YAxis style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#c7d2fe' }} />
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
            <div className="sr-filter-bar" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 18, padding: '0.9rem 1.15rem', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', backdropFilter: 'blur(20px)' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 140 }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Sınav / ders ara..." style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }} />
              </div>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.16)', fontWeight: 800, fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', outline: 'none', cursor: 'pointer' }}>
                <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm Dersler</option>
                {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.16)', fontWeight: 800, fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', outline: 'none', cursor: 'pointer' }}>
                <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm Türler</option>
                <option value="homework" style={{ background: '#0f172a', color: '#ffffff' }}>📝 Ödevler</option>
                <option value="physicalExam" style={{ background: '#0f172a', color: '#ffffff' }}>🏛️ Denemeler</option>
                <option value="book" style={{ background: '#0f172a', color: '#ffffff' }}>📕 Kitap Testleri</option>
                <option value="individual" style={{ background: '#0f172a', color: '#ffffff' }}>⚡ Bireysel</option>
              </select>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                {['table', 'cards'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{ padding: '0.35rem 0.8rem', borderRadius: 9, border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', background: viewMode === m ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent', color: viewMode === m ? 'white' : 'rgba(255,255,255,0.6)' }}>
                    {m === 'table' ? '📋 Tablo' : '🃏 Kartlar'}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{filteredSubs.length} sonuç</span>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 20, border: '1.5px solid rgba(255, 255, 255, 0.14)', overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1.5px solid rgba(255,255,255,0.12)' }}>
                        {['SINAV / BAŞLIK', 'DERS', 'TARİH', 'TÜR', 'D / Y / B', 'BAŞARI', 'EYLEM'].map(h => (
                          <th key={h} style={{ padding: '0.9rem 1rem', fontWeight: 900, fontSize: '0.72rem', color: '#c7d2fe', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((s, i) => {
                        const th = theme(s.subjectKey);
                        const SubIcon = th.icon;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.15s' }}>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.86rem', lineHeight: 1.35 }}>
                                {s.bookTitle ? (
                                  <>
                                    <span style={{ color: '#a5b4fc', fontWeight: 900 }}>{s.bookTitle}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>—</span>
                                    <span>{s.subjectName || s.subjectKey}</span>
                                    {s.topicName && <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}> · {s.topicName}</span>}
                                    <span style={{ color: '#ffffff', fontWeight: 900 }}> ({s.testName})</span>
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
                            <td style={{ padding: '0.8rem 1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : '—'}</td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <span style={{ background: typeConfig[s.typeKey]?.bg || 'rgba(255,255,255,0.08)', color: typeConfig[s.typeKey]?.color || '#ffffff', border: `1px solid ${typeConfig[s.typeKey]?.border || 'rgba(255,255,255,0.15)'}`, borderRadius: 8, padding: '0.22rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                                {typeConfig[s.typeKey]?.label || '⚡ Bireysel'}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span style={{ background: 'rgba(5,150,105,0.2)', color: '#4ade80', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>✓{s.correctCount}</span>
                                <span style={{ background: 'rgba(225,29,72,0.2)', color: '#f87171', border: '1px solid rgba(253,164,175,0.35)', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>✗{s.wrongCount}</span>
                                <span style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>○{s.blankCount}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} size="sm" />
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              {s.type !== 'physicalExam' ? (
                                <button onClick={() => navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 9, padding: '0.38rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                                  <Eye size={13} /> İncele
                                </button>
                              ) : (
                                <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', border: 'none', borderRadius: 9, padding: '0.38rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>
                                  <Eye size={13} /> Karne
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSubs.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                          <ListTree size={36} style={{ display: 'block', margin: '0 auto 8px', color: 'rgba(255,255,255,0.2)' }} />
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
                    <div key={i} className="sr-card-hover" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: 18, border: `1.5px solid ${th.border}`, padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(16px)' }}>
                      <div style={{ height: 4, background: th.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: th.bg, color: th.color, border: `1px solid ${th.border}`, borderRadius: 8, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          <SubIcon size={13} /> {s.subjectKey}
                        </span>
                        <span style={{ background: typeConfig[s.typeKey]?.bg || 'rgba(255,255,255,0.08)', color: typeConfig[s.typeKey]?.color || '#ffffff', border: `1px solid ${typeConfig[s.typeKey]?.border || 'rgba(255,255,255,0.15)'}`, borderRadius: 8, padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          {typeConfig[s.typeKey]?.label || '⚡'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.35 }}>
                        {s.bookTitle ? (
                          <>
                            <span style={{ color: '#a5b4fc', fontWeight: 900 }}>{s.bookTitle}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>—</span>
                            <span>{s.subjectName || s.subjectKey}</span>
                            {s.topicName && <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}> · {s.topicName}</span>}
                            <span style={{ color: '#ffffff', fontWeight: 900 }}> ({s.testName})</span>
                          </>
                        ) : (
                          s.testTitle
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ background: 'rgba(5,150,105,0.2)', color: '#4ade80', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                        <span style={{ background: 'rgba(225,29,72,0.2)', color: '#f87171', border: '1px solid rgba(253,164,175,0.35)', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                        <span style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>○ {s.blankCount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                        <div>
                          <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} />
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginTop: 3 }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}</div>
                        </div>
                        {s.type !== 'physicalExam' ? (
                          <button onClick={() => navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                            <Eye size={13} /> İncele
                          </button>
                        ) : (
                          <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>
                            <Eye size={13} /> Karne
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <div style={{ gridColumn: '1/-1', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)', borderRadius: 18, padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontWeight: 700, border: '1.5px solid rgba(255,255,255,0.12)' }}>
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
