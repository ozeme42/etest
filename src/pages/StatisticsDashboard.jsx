import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Users, BookOpen, Target, BrainCircuit, Activity, BarChart3, 
  PieChart as PieIcon, Sparkles, Trophy, GraduationCap, 
  CheckCircle2, ArrowLeft, TrendingUp, Award, Search, Filter, 
  ChevronRight, Calendar, ArrowUpRight, Flame, ShieldAlert, Check, 
  Eye, FileText, Layers, AlertTriangle, Zap, BookCheck, MapPin, 
  Compass, HelpCircle, CheckCheck, Clock3, ChevronDown, ChevronUp, BookMarked
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { computeStudentAnalyticsData, isHomeworkForStudent, isStandardOrMixedBook, isExamBook } from '../utils/testResolver';
import { useMediaQuery } from '../hooks/useMediaQuery';
import PeriodicQuestionAnalytics from '../components/PeriodicQuestionAnalytics';
import StudentResultsPage from './StudentResultsPage';
import './StatisticsDashboard.css';

/* ── AVATAR STYLES ──────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
];
const avatarBg = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

function Avatar({ name, index, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(index ?? 0),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.38,
      flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
      border: '1.5px solid rgba(255,255,255,0.3)'
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

/* ── HERO KPI CARD ──────────────────────────────────────────────────────────── */
function StatHeroCard({ label, value, sub, icon: Icon, color, bg, border, badge, isMobile }) {
  if (isMobile) {
    return (
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        border: `1.5px solid ${border || 'var(--color-border, #e2e8f0)'}`,
        borderRadius: '1rem',
        padding: '0.65rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.35rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        position: 'relative',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '0.65rem',
            background: bg || 'rgba(99, 102, 241, 0.12)',
            color: color || '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={17} />
          </div>
          {badge && (
            <span style={{ fontSize: '0.58rem', fontWeight: 900, padding: '1px 5px', borderRadius: 99, background: bg, color: color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
              {badge}
            </span>
          )}
        </div>
        <div>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', display: 'block', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {value}
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        </div>
        {sub && (
          <span style={{ fontSize: '0.62rem', color: color || 'var(--color-text-muted, #64748b)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
            {sub}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface, #ffffff)',
      border: `1.5px solid ${border || 'var(--color-border, #e2e8f0)'}`,
      borderRadius: '1.25rem',
      padding: '1.1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: '1rem',
        background: bg || 'rgba(99, 102, 241, 0.12)',
        color: color || '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 4px 12px ${color}22`
      }}>
        <Icon size={25} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
            {label}
          </span>
          {badge && (
            <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color: color, border: `1px solid ${border}` }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', display: 'block', lineHeight: 1.2, marginTop: 2 }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: '0.72rem', color: color || 'var(--color-text-muted, #64748b)', fontWeight: 700, marginTop: 1, display: 'block' }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ── SUBJECT CONFIG & HELPERS ────────────────────────────────────────────────── */
const SUBJECT_COLORS = {
  'Matematik': { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📐' },
  'Fen Bilimleri': { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: '🔬' },
  'Türkçe': { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: '📖' },
  'Sosyal Bilgiler': { color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', icon: '🌍' },
  'İngilizce': { color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', icon: '💬' },
  'Din Kültürü': { color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', icon: '✨' },
  'Genel Testler': { color: '#6366f1', bg: '#f5f3ff', border: '#ddd6fe', icon: '🏆' },
  'Diğer': { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '📝' }
};

function getSubjectKey(s) {
  const rawKey = s.subjectKey || s.subjectName || s.subject || '';
  const rawTitle = s.testTitle || s.testName || s.title || '';
  const t = (rawTitle + ' ' + rawKey).toLowerCase();

  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('genel')) return 'Genel Testler';

  if (rawKey && !rawKey.toLowerCase().includes('kitap') && rawKey !== 'Diğer') {
    return rawKey;
  }
  return 'Genel Testler';
}

function extractCleanUnitOrTopic(item, bookTestsList = []) {
  if (!item) return 'Genel Konu';

  // 1. Direct unit field
  const rawUnit = item.unitName || item.unit || item.unitTopic || '';
  if (rawUnit && typeof rawUnit === 'string' && rawUnit.trim()) {
    let clean = rawUnit.trim().replace(/\s*[-–—:]\s*(?:Test|Yeni\s*Nesil|Deneme|Sayfa)\s*[-_\d]+.*$/i, '').trim();
    if (clean) return clean;
  }

  // 2. Direct topic field (not just a test name)
  const rawTopic = item.topicName || item.topic || '';
  if (rawTopic && typeof rawTopic === 'string' && rawTopic.trim()) {
    let clean = rawTopic.trim();
    if (!/^(test[-_\s]*\d+|yeni\s*nesil[-_\s]*\d+|deneme[-_\s]*\d+|sayfa[-_\s]*\d+)/i.test(clean)) {
      clean = clean.replace(/\s*[-–—:]\s*(?:Test|Yeni\s*Nesil|Deneme|Sayfa)\s*[-_\d]+.*$/i, '').trim();
      if (clean) return clean;
    }
  }

  // 3. Match from bookTests if available
  const testId = item.bookTestId || item.testId || item.id;
  if (testId && Array.isArray(bookTestsList) && bookTestsList.length > 0) {
    const matched = bookTestsList.find(bt => String(bt.id) === String(testId));
    if (matched) {
      if (matched.unitName || matched.unit) {
        let clean = (matched.unitName || matched.unit).trim().replace(/\s*[-–—:]\s*(?:Test|Yeni\s*Nesil|Deneme|Sayfa)\s*[-_\d]+.*$/i, '').trim();
        if (clean) return clean;
      }
      if (matched.topicName || matched.topic) {
        let clean = (matched.topicName || matched.topic).trim();
        if (!/^(test[-_\s]*\d+|yeni\s*nesil[-_\s]*\d+|deneme[-_\s]*\d+)/i.test(clean)) {
          return clean;
        }
      }
    }
  }

  // 4. Regex extraction from title/testTitle
  const rawTitle = item.testTitle || item.title || item.testName || '';
  if (rawTitle && typeof rawTitle === 'string') {
    const unitMatch = rawTitle.match(/(\d+\.\s*Ünite(?:\s*[-–—:]\s*[^(—›]+)?)/i);
    if (unitMatch && unitMatch[1]) {
      let clean = unitMatch[1].trim();
      clean = clean.replace(/\s*[-–—:]\s*(?:PARAGRAF\s*DENEME|PARAGRAF\s*YENİ\s*NESİL|TEST|DENEME|YENİ\s*NESİL).*$/i, '').trim();
      if (clean) return clean;
    }

    if (rawTitle.includes('›')) {
      const parts = rawTitle.split('›');
      const lastPart = parts[parts.length - 1].trim();
      const cleanedLast = lastPart.replace(/\s*\([^)]*\)\s*$/g, '').trim();
      if (cleanedLast && !/^(test[-_\s]*\d+|yeni\s*nesil[-_\s]*\d+|sayfa[-_\s]*\d+)/i.test(cleanedLast)) {
        return cleanedLast;
      }
    }

    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      if (parts.length >= 2) {
        const potentialTopic = parts[1].replace(/\s*\([^)]*\)\s*$/g, '').trim();
        if (potentialTopic && !/^(test[-_\s]*\d+|yeni\s*nesil[-_\s]*\d+|deneme[-_\s]*\d+)/i.test(potentialTopic)) {
          return potentialTopic;
        }
      }
    }
  }

  return 'Genel Konu & Müfredat';
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: STATISTICS DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function StatisticsDashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  const { users } = useUser() || { users: [] };
  const auth = useAuth() || {};
  const currentUser = auth.currentUser;
  const { submissions: allSubmissions } = useEvaluation() || { submissions: [] };
  const { homeworks: allHomeworks } = useHomework() || { homeworks: [] };
  const { studyAssignments: allStudyAssignments, studyPlans: allStudyPlans } = useStudyPlan() || { studyAssignments: [], studyPlans: [] };
  const { books: allBooks, bookTests: allBookTests } = useTrackedBooks() || { books: [], bookTests: [] };
  const { mockExams: allMockExams } = useCoaching() || { mockExams: [] };
  const curriculumContext = useCurriculum() || {};
  const curriculumData = curriculumContext.data || { grades: [], subjects: [] };

  // Only standard/mixed regular books (excluding mock exams / physical exams)
  const trackedBooksOnly = useMemo(() => {
    return (allBooks || []).filter(b => isStandardOrMixedBook(b));
  }, [allBooks]);

  const trackedBookIds = useMemo(() => new Set(trackedBooksOnly.map(b => String(b.id))), [trackedBooksOnly]);

  const trackedBookTestsOnly = useMemo(() => {
    return (allBookTests || []).filter(t => trackedBookIds.has(String(t.bookId)));
  }, [allBookTests, trackedBookIds]);

  // Filter States
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [timeRange, setTimeRange] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'periodic' | 'subjects' | 'books' | 'exams' | 'roadmap' | 'students'
  const [studentSearchQ, setStudentSearchQ] = useState('');
  const [studentTableSort, setStudentTableSort] = useState('avgScore'); // 'avgScore' | 'totalQ' | 'totalNet' | 'roadmapPct'
  const [expandedSubjectCard, setExpandedSubjectCard] = useState(null);

  const isTeacher = currentUser?.role === 'teacher';
  const teacherId = currentUser?.id;

  // 1. Öğretmenin Sorumlu Olduğu Öğrenciler
  const allTeacherStudents = useMemo(() => {
    const all = (users || []).filter(u => u && u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id));
    if (!isTeacher || !teacherId) return all;
    return all.filter(u => u.teacherId === teacherId || !u.teacherId);
  }, [users, isTeacher, teacherId]);

  const [activeView, setActiveView] = useState(() => studentIdParam ? 'student' : 'overview'); // 'overview' | 'student'
  const [selectedStudentId, setSelectedStudentId] = useState(() => studentIdParam || (allTeacherStudents[0]?.id || null));

  useEffect(() => {
    if (studentIdParam) {
      setSelectedStudentId(studentIdParam);
      setActiveView('student');
    }
  }, [studentIdParam]);

  const handleSelectStudentForResults = (stdId) => {
    setSelectedStudentId(stdId);
    setActiveView('student');
    setSearchParams({ studentId: stdId });
  };

  // 2. Sınıf Filtresi Uygulanmış Öğrenciler
  const filteredStudents = useMemo(() => {
    if (selectedGradeFilter === 'ALL') return allTeacherStudents;
    return allTeacherStudents.filter(s => {
      const g = curriculumData.grades.find(gr => String(gr.id) === String(s.gradeId) || gr.name === s.gradeId || gr.name === s.grade || gr.name === s.className);
      return String(s.gradeId) === String(selectedGradeFilter) || (g && String(g.id) === String(selectedGradeFilter));
    });
  }, [allTeacherStudents, selectedGradeFilter, curriculumData]);

  const selectedGradeLabel = useMemo(() => {
    if (selectedGradeFilter === 'ALL') return 'Tüm Sınıflar';
    const found = curriculumData.grades?.find(g => String(g.id) === String(selectedGradeFilter) || g.name === selectedGradeFilter);
    if (found?.name) return found.name;
    if (String(selectedGradeFilter).startsWith('g_')) return 'Sınıf';
    return String(selectedGradeFilter).includes('Sınıf') ? selectedGradeFilter : `${selectedGradeFilter}. Sınıf`;
  }, [selectedGradeFilter, curriculumData.grades]);

  const studentIdsSet = useMemo(() => new Set(filteredStudents.map(s => String(s.id))), [filteredStudents]);

  // 3. Tarih Filtresi Kontrolü
  const isWithinTimeRange = (dateStr) => {
    if (!dateStr || timeRange === 'ALL') return true;
    const itemDate = new Date(dateStr);
    const now = new Date();
    if (isNaN(itemDate.getTime())) return true;

    if (timeRange === 'TODAY') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (timeRange === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return itemDate >= weekAgo;
    }
    if (timeRange === 'MONTH') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return itemDate >= monthAgo;
    }
    return true;
  };

  // 4. Tüm Öğrencilerin Birleşik Analitik Verilerinin Hesaplanması (Multi-Source Analytics Engine)
  const unifiedStudentData = useMemo(() => {
    return filteredStudents.map((std, idx) => {
      const stdMockExams = (allMockExams || []).filter(m => String(m.studentId) === String(std.id));
      const { generalTrialExams, otherHomeworkSubmissions } = computeStudentAnalyticsData({
        studentId: std.id,
        targetStudent: std,
        submissions: allSubmissions,
        homeworks: allHomeworks,
        books: allBooks,
        bookTests: allBookTests,
        studentMockExams: stdMockExams
      });

      // Zaman filtresine göre filtrele
      const filteredHws = otherHomeworkSubmissions.filter(h => isWithinTimeRange(h.date || h.submittedAt || h.createdAt));
      const filteredExams = generalTrialExams.filter(e => isWithinTimeRange(e.date || e.submittedAt || e.createdAt));

      // Soru Sayıları & Doğruluk
      let totalQ = 0, totalCorrect = 0, totalWrong = 0, totalBlank = 0, sumScore = 0, examNetsSum = 0;
      
      filteredHws.forEach(h => {
        const c = h.correctCount ?? h.correct ?? 0;
        const w = h.wrongCount ?? h.wrong ?? 0;
        const b = h.emptyCount ?? h.blankCount ?? h.blank ?? 0;
        const q = h.totalQuestions || (c + w + b) || 0;
        totalQ += q;
        totalCorrect += c;
        totalWrong += w;
        totalBlank += b;
        sumScore += (h.computedScore || h.scorePercentage || 0);
      });

      filteredExams.forEach(e => {
        const c = e.correctCount ?? e.totalCorrect ?? 0;
        const w = e.wrongCount ?? e.totalWrong ?? 0;
        const b = e.emptyCount ?? e.blankCount ?? 0;
        const q = e.totalQuestions || (c + w + b) || 0;
        totalQ += q;
        totalCorrect += c;
        totalWrong += w;
        totalBlank += b;
        const netVal = e.totalNet !== undefined ? Number(e.totalNet) : (c - (w / 3));
        examNetsSum += Math.max(0, netVal);
      });

      const avgScore = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : (filteredHws.length > 0 ? Math.round(sumScore / filteredHws.length) : 0);
      const avgExamNet = filteredExams.length > 0 ? (examNetsSum / filteredExams.length).toFixed(1) : '0.0';

      // Yol Haritası & Görev Durumu
      const stdAssignments = (allStudyAssignments || []).filter(a => String(a.studentId) === String(std.id));
      const completedTasks = stdAssignments.filter(a => a.status === 'completed' || a.completed === true).length;
      const totalTasks = stdAssignments.length;
      const roadmapPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Kitap Takip Durumu
      const stdBookTests = filteredHws.filter(h => h.type === 'book' || h.bookTitle);
      const uniqueBooksRead = new Set(stdBookTests.map(b => b.bookTitle || b.bookId)).size;

      let gradeName = std.className || std.grade || 'Sınıfsız';
      const matched = (curriculumData?.grades || []).find(g => 
        String(g.id) === String(std.gradeId) || 
        String(g.id) === String(std.className) || 
        String(g.id) === String(std.grade) || 
        g.name === std.gradeId || 
        g.name === std.grade || 
        g.name === std.className
      );
      if (matched) gradeName = matched.name;
      else if (String(gradeName).startsWith('g_')) gradeName = 'Sınıfsız';

      return {
        ...std,
        idx,
        gradeName,
        totalQ,
        totalCorrect,
        totalWrong,
        totalBlank,
        avgScore,
        avgExamNet: Number(avgExamNet),
        examCount: filteredExams.length,
        homeworkCount: filteredHws.length,
        completedTasks,
        totalTasks,
        roadmapPct,
        uniqueBooksRead,
        filteredHws,
        filteredExams
      };
    });
  }, [filteredStudents, allSubmissions, allHomeworks, allBooks, allBookTests, allMockExams, allStudyAssignments, curriculumData, timeRange]);

  // 5. Genel Sınıf KPI Toplamları
  const classKPIs = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let totalExamNets = 0;
    let totalExamsCount = 0;
    let totalRoadmapTasks = 0;
    let completedRoadmapTasks = 0;
    let totalUniqueBooks = 0;

    unifiedStudentData.forEach(s => {
      totalQuestions += s.totalQ;
      totalCorrect += s.totalCorrect;
      totalWrong += s.totalWrong;
      totalBlank += s.totalBlank;
      totalExamNets += (s.avgExamNet * s.examCount);
      totalExamsCount += s.examCount;
      totalRoadmapTasks += s.totalTasks;
      completedRoadmapTasks += s.completedTasks;
      totalUniqueBooks += s.uniqueBooksRead;
    });

    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const overallExamNet = totalExamsCount > 0 ? (totalExamNets / totalExamsCount).toFixed(1) : '0.0';
    const overallRoadmapPct = totalRoadmapTasks > 0 ? Math.round((completedRoadmapTasks / totalRoadmapTasks) * 100) : 0;

    return {
      totalStudents: filteredStudents.length,
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalBlank,
      overallAccuracy,
      overallExamNet: Number(overallExamNet),
      totalExamsCount,
      totalRoadmapTasks,
      completedRoadmapTasks,
      overallRoadmapPct,
      totalUniqueBooks
    };
  }, [unifiedStudentData, filteredStudents]);

  // 6. Ders Bazlı Başarı & Soru Dağılımı (Subject Breakdown)
  const subjectAggregates = useMemo(() => {
    const map = {};

    unifiedStudentData.forEach(std => {
      // Ödevler & Kitap Testleri
      std.filteredHws.forEach(h => {
        const subj = getSubjectKey({ subjectKey: h.subject || h.subjectName, testTitle: h.title });
        if (!map[subj]) {
          map[subj] = { subject: subj, totalQ: 0, correct: 0, wrong: 0, blank: 0, topics: {}, color: SUBJECT_COLORS[subj]?.color || '#6366f1' };
        }
        const c = h.correctCount ?? h.correct ?? 0;
        const w = h.wrongCount ?? h.wrong ?? 0;
        const b = h.emptyCount ?? h.blankCount ?? 0;
        const q = h.totalQuestions || (c + w + b) || 0;
        map[subj].totalQ += q;
        map[subj].correct += c;
        map[subj].wrong += w;
        map[subj].blank += b;

        const topic = extractCleanUnitOrTopic(h, allBookTests);
        if (!map[subj].topics[topic]) {
          map[subj].topics[topic] = { name: topic, totalQ: 0, correct: 0, wrong: 0 };
        }
        map[subj].topics[topic].totalQ += q;
        map[subj].topics[topic].correct += c;
        map[subj].topics[topic].wrong += w;
      });

      // Denemelerdeki ders soruları
      std.filteredExams.forEach(e => {
        const subj = getSubjectKey({ subjectKey: e.subject || e.subjectName, testTitle: e.title });
        if (!map[subj]) {
          map[subj] = { subject: subj, totalQ: 0, correct: 0, wrong: 0, blank: 0, topics: {}, color: SUBJECT_COLORS[subj]?.color || '#6366f1' };
        }
        const c = e.correctCount ?? e.totalCorrect ?? 0;
        const w = e.wrongCount ?? e.totalWrong ?? 0;
        const b = e.emptyCount ?? e.blankCount ?? 0;
        const q = e.totalQuestions || (c + w + b) || 0;
        map[subj].totalQ += q;
        map[subj].correct += c;
        map[subj].wrong += w;
        map[subj].blank += b;

        const topic = extractCleanUnitOrTopic(e, allBookTests);
        if (!map[subj].topics[topic]) {
          map[subj].topics[topic] = { name: topic, totalQ: 0, correct: 0, wrong: 0 };
        }
        map[subj].topics[topic].totalQ += q;
        map[subj].topics[topic].correct += c;
        map[subj].topics[topic].wrong += w;
      });
    });

    const list = Object.values(map).map(entry => {
      const accuracy = entry.totalQ > 0 ? Math.round((entry.correct / entry.totalQ) * 100) : 0;
      const topicList = Object.values(entry.topics).map(t => ({
        ...t,
        accuracy: t.totalQ > 0 ? Math.round((t.correct / t.totalQ) * 100) : 0
      })).sort((a, b) => b.totalQ - a.totalQ);

      return {
        ...entry,
        'Başarı %': accuracy,
        accuracy,
        topicList
      };
    }).sort((a, b) => b.totalQ - a.totalQ);

    if (list.length === 0) {
      return [
        { subject: 'Matematik', totalQ: 420, correct: 310, wrong: 80, blank: 30, 'Başarı %': 74, accuracy: 74, color: '#3b82f6', topicList: [] },
        { subject: 'Fen Bilimleri', totalQ: 380, correct: 304, wrong: 56, blank: 20, 'Başarı %': 80, accuracy: 80, color: '#10b981', topicList: [] },
        { subject: 'Türkçe', totalQ: 450, correct: 382, wrong: 48, blank: 20, 'Başarı %': 85, accuracy: 85, color: '#f97316', topicList: [] },
        { subject: 'Sosyal Bilgiler', totalQ: 220, correct: 180, wrong: 30, blank: 10, 'Başarı %': 82, accuracy: 82, color: '#a855f7', topicList: [] },
        { subject: 'İngilizce', totalQ: 180, correct: 140, wrong: 25, blank: 15, 'Başarı %': 78, accuracy: 78, color: '#f43f5e', topicList: [] }
      ];
    }
    return list;
  }, [unifiedStudentData, allBookTests]);

  // 7. Günlük / Zaman Bazlı Soru İlerleme Grafiği (Daily Question Velocity Trend)
  const timeVelocityData = useMemo(() => {
    const dateMap = {};

    unifiedStudentData.forEach(std => {
      [...std.filteredHws, ...std.filteredExams].forEach(item => {
        const rawDate = item.date || item.submittedAt || item.createdAt;
        if (!rawDate) return;
        const dStr = new Date(rawDate).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
        if (!dateMap[dStr]) {
          dateMap[dStr] = { date: dStr, 'Toplam Soru': 0, 'Doğru': 0, 'Yanlış': 0, 'Boş': 0, timestamp: new Date(rawDate).getTime() };
        }
        const c = item.correctCount ?? item.correct ?? item.totalCorrect ?? 0;
        const w = item.wrongCount ?? item.wrong ?? item.totalWrong ?? 0;
        const b = item.emptyCount ?? item.blankCount ?? item.blank ?? 0;
        const q = item.totalQuestions || (c + w + b) || 0;
        dateMap[dStr]['Toplam Soru'] += q;
        dateMap[dStr]['Doğru'] += c;
        dateMap[dStr]['Yanlış'] += w;
        dateMap[dStr]['Boş'] += b;
      });
    });

    const result = Object.values(dateMap).sort((a, b) => a.timestamp - b.timestamp);
    if (result.length === 0) {
      return [
        { date: '5 Gün Önce', 'Toplam Soru': 120, 'Doğru': 95, 'Yanlış': 18, 'Boş': 7 },
        { date: '4 Gün Önce', 'Toplam Soru': 180, 'Doğru': 144, 'Yanlış': 26, 'Boş': 10 },
        { date: '3 Gün Önce', 'Toplam Soru': 240, 'Doğru': 198, 'Yanlış': 32, 'Boş': 10 },
        { date: 'Dün', 'Toplam Soru': 310, 'Doğru': 255, 'Yanlış': 40, 'Boş': 15 },
        { date: 'Bugün', 'Toplam Soru': classKPIs.totalQuestions || 280, 'Doğru': classKPIs.totalCorrect || 230, 'Yanlış': classKPIs.totalWrong || 35, 'Boş': 15 }
      ];
    }
    return result;
  }, [unifiedStudentData, classKPIs]);

  // 8. Kaynak Türü Dağılımı (Ödev vs Kitap vs Deneme)
  const sourceBreakdownData = useMemo(() => {
    let hwQuestions = 0, bookQuestions = 0, examQuestions = 0;

    unifiedStudentData.forEach(std => {
      std.filteredHws.forEach(h => {
        const q = h.totalQuestions || ((h.correctCount || 0) + (h.wrongCount || 0) + (h.emptyCount || 0)) || 0;
        if (h.type === 'book' || h.bookTitle) bookQuestions += q;
        else hwQuestions += q;
      });
      std.filteredExams.forEach(e => {
        const q = e.totalQuestions || ((e.correctCount || 0) + (e.wrongCount || 0) + (e.emptyCount || 0)) || 0;
        examQuestions += q;
      });
    });

    const total = hwQuestions + bookQuestions + examQuestions;
    if (total === 0) {
      return [
        { name: 'Ödevler', value: 45, color: '#f97316' },
        { name: 'Kitap Testleri', value: 35, color: '#10b981' },
        { name: 'Deneme Sınavları', value: 20, color: '#6366f1' }
      ];
    }

    return [
      { name: 'Ödevler', value: hwQuestions, color: '#f97316' },
      { name: 'Kitap Testleri', value: bookQuestions, color: '#10b981' },
      { name: 'Deneme Sınavları', value: examQuestions, color: '#6366f1' }
    ].filter(item => item.value > 0);
  }, [unifiedStudentData]);

  // 9. En Başarılı 3 Öğrenci Kürsüsü (Podium)
  const topPodium = useMemo(() => {
    return [...unifiedStudentData].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
  }, [unifiedStudentData]);

  // 10. Erken Uyarı Radarı: En Çok Zorlanılan Konular & Destek Bekleyen Öğrenciler
  const criticalWeakInsights = useMemo(() => {
    const allTopics = [];
    subjectAggregates.forEach(s => {
      s.topicList.forEach(t => {
        if (t.totalQ >= 5) allTopics.push({ ...t, subject: s.subject });
      });
    });

    const weakTopics = [...allTopics].filter(t => t.accuracy < 65).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
    const strugglingStudents = [...unifiedStudentData].filter(s => s.avgScore < 60 && s.totalQ > 0).slice(0, 4);

    return { weakTopics, strugglingStudents };
  }, [subjectAggregates, unifiedStudentData]);

  // 11. Sıralanmış ve Aranmış Öğrenci Listesi
  const searchedAndSortedStudents = useMemo(() => {
    let list = [...unifiedStudentData];
    if (studentSearchQ.trim()) {
      const q = studentSearchQ.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.gradeName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (studentTableSort === 'totalQ') return b.totalQ - a.totalQ;
      if (studentTableSort === 'totalNet') return b.avgExamNet - a.avgExamNet;
      if (studentTableSort === 'roadmapPct') return b.roadmapPct - a.roadmapPct;
      return b.avgScore - a.avgScore; // default 'avgScore'
    });
  }, [unifiedStudentData, studentSearchQ, studentTableSort]);

  // Eğer Bireysel Öğrenci Karnesi Seçilmişse:
  if (activeView === 'student' && selectedStudentId) {
    return (
      <div className="stats-dashboard-page" style={{ padding: '1rem', maxWidth: 1440, margin: '0 auto' }}>
        <StudentResultsPage
          studentId={selectedStudentId}
          embedded={true}
          onBack={() => {
            setActiveView('overview');
            setSearchParams({});
          }}
        />
      </div>
    );
  }

  return (
    <div className="stats-dashboard-page">
      
      {/* ─── 1. EXECUTIVE HEADER & CONTROLS (MOBILE APP NATIVE STYLE) ─── */}
      <header className="stats-glass-card" style={{
        padding: isMobile ? '0.85rem 0.85rem' : '1.25rem 1.75rem',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '0.75rem' : '1rem',
        background: 'var(--color-surface, #ffffff)',
        borderRadius: isMobile ? '1.25rem' : '1.5rem'
      }}>
        {/* Top bar with back button and title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <button
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
              }}
              style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border-input, #cbd5e1)',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.45rem 0.65rem' : '0.55rem 0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 800,
                fontSize: isMobile ? '0.75rem' : '0.82rem',
                color: 'var(--color-text, #334155)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                flexShrink: 0
              }}
            >
              <ArrowLeft size={isMobile ? 15 : 16} /> {!isMobile && 'Geri Dön'}
            </button>

            <div style={{ minWidth: 0 }}>
              {!isMobile && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(165, 180, 252, 0.3)', color: '#818cf8', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <Sparkles size={13} /> LMS 360° Akıllı Analitik & Performans Masası
                </div>
              )}
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.45rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                İstatistikler & Başarı Analizi 📊
              </h1>
              {!isMobile && (
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Ödevler, Kitap Takibi, Deneme Netleri, Yol Haritası ve Periyodik Gelişim Eğrileri.
                </p>
              )}
            </div>
          </div>

          {/* Sınıf / Öğrenci Sayısı Rozeti */}
          <div style={{
            fontSize: isMobile ? '0.65rem' : '0.75rem',
            fontWeight: 900,
            padding: isMobile ? '0.3rem 0.6rem' : '0.35rem 0.75rem',
            borderRadius: 99,
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#6366f1',
            border: '1px solid rgba(165, 180, 252, 0.3)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            👥 {filteredStudents.length} Öğrenci
          </div>
        </div>

        {/* Header Right Filters & Student Selector */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '0.65rem' : '0.75rem', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
          {/* Hızlı Öğrenci Seçici Dropdown */}
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <select
              value=""
              onChange={e => {
                if (e.target.value) handleSelectStudentForResults(e.target.value);
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '0.55rem 0.85rem' : '0.5rem 1.6rem 0.5rem 0.85rem',
                borderRadius: '0.75rem',
                border: '1.5px solid var(--color-border-input, #6366f1)',
                background: 'var(--color-surface, #f5f3ff)',
                color: 'var(--color-text, #4f46e5)',
                fontSize: isMobile ? '0.76rem' : '0.78rem',
                fontWeight: 900,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 10px rgba(99,102,241,0.12)',
                boxSizing: 'border-box'
              }}
            >
              <option value="">👤 Öğrenci Seç & Detaylı Karnesini Gör...</option>
              {allTeacherStudents.map(st => {
                const matchedGrade = (curriculumData?.grades || []).find(g => 
                  String(g.id) === String(st.gradeId) || 
                  String(g.id) === String(st.className) || 
                  String(g.id) === String(st.grade) || 
                  g.name === st.gradeId || 
                  g.name === st.grade || 
                  g.name === st.className
                );
                let gLabel = matchedGrade ? matchedGrade.name : (st.className || st.grade || '');
                if (String(gLabel).startsWith('g_')) gLabel = '';
                return (
                  <option key={st.id} value={st.id}>
                    {st.name} {gLabel ? `(${gLabel})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Yatay Kaydırılabilir Filtre Çubuğu (Sınıf & Zaman) */}
          <div className="sd-hide-scrollbar" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            width: isMobile ? '100%' : 'auto',
            overflowX: 'auto',
            paddingBottom: isMobile ? '2px' : '0',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* Sınıf Filtreleri */}
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', whiteSpace: 'nowrap', marginRight: 2 }}>
              Sınıf:
            </span>
            <button
              onClick={() => setSelectedGradeFilter('ALL')}
              style={{
                padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 0.75rem',
                borderRadius: '0.65rem',
                border: selectedGradeFilter === 'ALL' ? '1.5px solid #818cf8' : '1.5px solid var(--color-border-input, #cbd5e1)',
                background: selectedGradeFilter === 'ALL' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface, #ffffff)',
                color: selectedGradeFilter === 'ALL' ? '#ffffff' : 'var(--color-text, #475569)',
                fontSize: isMobile ? '0.72rem' : '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedGradeFilter === 'ALL' ? '0 3px 10px rgba(99,102,241,0.25)' : 'none',
                flexShrink: 0
              }}
            >
              Tümü
            </button>
            {curriculumData.grades.map(g => {
              const isSel = selectedGradeFilter === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGradeFilter(g.id)}
                  style={{
                    padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 0.75rem',
                    borderRadius: '0.65rem',
                    border: isSel ? '1.5px solid #818cf8' : '1.5px solid var(--color-border-input, #cbd5e1)',
                    background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface, #ffffff)',
                    color: isSel ? '#ffffff' : 'var(--color-text, #475569)',
                    fontSize: isMobile ? '0.72rem' : '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSel ? '0 3px 10px rgba(99,102,241,0.25)' : 'none',
                    flexShrink: 0
                  }}
                >
                  {g.name}
                </button>
              );
            })}

            <div style={{ height: 16, width: 1, background: 'var(--color-border, #cbd5e1)', margin: '0 3px', flexShrink: 0 }} />

            {/* Zaman Filtreleri */}
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', whiteSpace: 'nowrap', marginRight: 2 }}>
              Zaman:
            </span>
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'TODAY', label: 'Bugün' },
              { id: 'WEEK', label: 'Son 7G' },
              { id: 'MONTH', label: 'Son 30G' }
            ].map(t => {
              const isSel = timeRange === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  style={{
                    padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 0.75rem',
                    borderRadius: '0.65rem',
                    border: isSel ? '1.5px solid #10b981' : '1.5px solid var(--color-border-input, #cbd5e1)',
                    background: isSel ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--color-surface, #ffffff)',
                    color: isSel ? '#ffffff' : 'var(--color-text, #475569)',
                    fontSize: isMobile ? '0.72rem' : '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSel ? '0 3px 10px rgba(16,185,129,0.25)' : 'none',
                    flexShrink: 0
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ─── 2. SEKMELER (NAV TABS - MOBILE APP SEGMENTED BAR) ─── */}
      <div className="sd-hide-scrollbar" style={{
        display: 'flex',
        gap: isMobile ? 4 : 6,
        background: 'var(--color-surface, #ffffff)',
        padding: isMobile ? '0.35rem' : '0.45rem',
        borderRadius: isMobile ? '1rem' : '1.15rem',
        border: '1.5px solid var(--color-border, #e2e8f0)',
        overflowX: 'auto',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        WebkitOverflowScrolling: 'touch'
      }}>
        {[
          { key: 'overview', label: isMobile ? '🌐 Genel' : '🌐 Genel Bakış & KPI Özeti', icon: BarChart3 },
          { key: 'periodic', label: isMobile ? '📈 Trendler' : '📊 Soru & Zaman Trendi', icon: TrendingUp },
          { key: 'subjects', label: isMobile ? '📚 Dersler' : '📚 Dersler & Konu Kazanımları', icon: BookOpen },
          { key: 'books', label: isMobile ? '📖 Kitaplar' : '📖 Kitap Takibi & Testler', icon: BookCheck },
          { key: 'exams', label: isMobile ? '📋 Denemeler' : '📋 Deneme Sınavları & Netler', icon: Award },
          { key: 'roadmap', label: isMobile ? '🗺️ Yol Haritası' : '🗺️ Yol Haritası & İlerleme', icon: Compass },
          { key: 'students', label: isMobile ? '👥 Öğrenciler' : '👥 Öğrenci Matrisi & Sıralama', icon: Users }
        ].map(t => {
          const active = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: isMobile ? '0 0 auto' : '1 1 auto',
                padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.1rem',
                borderRadius: isMobile ? '0.75rem' : '0.85rem',
                border: 'none',
                fontWeight: 900,
                fontSize: isMobile ? '0.75rem' : '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'all 0.15s',
                background: active ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                color: active ? '#ffffff' : 'var(--color-text-muted, #64748b)',
                boxShadow: active ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={isMobile ? 14 : 16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. 6 BÜYÜK TEMEL PERFORMANS GÖSTERGESİ (EXECUTIVE KPI CARDS) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: isMobile ? '0.5rem' : '1rem'
      }}>
        <StatHeroCard 
          icon={Zap} 
          label="Toplam Soru" 
          value={`${classKPIs.totalQuestions}`} 
          sub={`✓ ${classKPIs.totalCorrect} D · ✗ ${classKPIs.totalWrong} Y`} 
          color="#3b82f6" 
          bg="#eff6ff" 
          border="#bae6fd"
          badge="Tümü"
          isMobile={isMobile}
        />
        <StatHeroCard 
          icon={Trophy} 
          label="Genel Başarı" 
          value={`%${classKPIs.overallAccuracy}`} 
          sub={classKPIs.overallAccuracy >= 75 ? '🔥 Yüksek Başarı' : classKPIs.overallAccuracy >= 55 ? '⚡ Orta Seviye' : '⚠️ Destek Gerekli'} 
          color={classKPIs.overallAccuracy >= 75 ? '#16a34a' : classKPIs.overallAccuracy >= 55 ? '#d97706' : '#dc2626'} 
          bg={classKPIs.overallAccuracy >= 75 ? '#f0fdf4' : classKPIs.overallAccuracy >= 55 ? '#fffbeb' : '#fef2f2'} 
          border={classKPIs.overallAccuracy >= 75 ? '#bbf7d0' : classKPIs.overallAccuracy >= 55 ? '#fde68a' : '#fecaca'} 
          badge="Doğruluk"
          isMobile={isMobile}
        />

        <StatHeroCard 
          icon={BookCheck} 
          label="Takip Kitapları" 
          value={`${trackedBooksOnly.length} Kitap`} 
          sub={`${trackedBookTestsOnly.length} Test`} 
          color="#10b981" 
          bg="#f0fdf4" 
          border="#bbf7d0" 
          badge="Kitaplar"
          isMobile={isMobile}
        />
        <StatHeroCard 
          icon={Compass} 
          label="Yol Haritası" 
          value={`%${classKPIs.overallRoadmapPct}`} 
          sub={`${classKPIs.completedRoadmapTasks}/${classKPIs.totalRoadmapTasks} Görev`} 
          color="#d97706" 
          bg="#fffbeb" 
          border="#fde68a" 
          badge="Müfredat"
          isMobile={isMobile}
        />
        <StatHeroCard 
          icon={Users} 
          label="Öğrenci Sayısı" 
          value={`${classKPIs.totalStudents}`} 
          sub={selectedGradeLabel} 
          color="#0284c7" 
          bg="#f0f9ff" 
          border="#bae6fd" 
          badge="Sınıf"
          isMobile={isMobile}
        />
      </div>

      {/* ─── TAB 1: 🌐 GENEL BAKIŞ & YÖNETİCİ ÖZETİ ─── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
          
          {/* Top Podium Cards */}
          {topPodium.length > 0 && (
            <div className="stats-glass-card" style={{ padding: isMobile ? '0.85rem' : '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.65rem' : '1rem', background: 'var(--color-surface, #ffffff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Trophy size={isMobile ? 16 : 18} color="#d97706" /> En Başarılı Öğrenciler (Top 3)
                </h3>
                {!isMobile && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                    Genel soru çözümü ve sınav doğruluk yüzdesine göre sıralanmıştır
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: isMobile ? '0.5rem' : '1rem' }}>
                {topPodium.map((std, rank) => {
                  const medals = [
                    { title: '1. Birincilik', icon: '🥇', grad: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a', text: '#f59e0b' },
                    { title: '2. İkincilik', icon: '🥈', grad: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f8fafc', border: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1', text: isDark ? '#cbd5e1' : '#475569' },
                    { title: '3. Üçüncülük', icon: '🥉', grad: isDark ? 'rgba(249, 115, 22, 0.12)' : '#fff7ed', border: isDark ? 'rgba(249, 115, 22, 0.35)' : '#fed7aa', text: '#f97316' },
                  ];
                  const m = medals[rank];
                  return (
                    <div
                      key={std.id}
                      onClick={() => handleSelectStudentForResults(std.id)}
                      style={{
                        background: m.grad,
                        border: `1.5px solid ${m.border}`,
                        borderRadius: isMobile ? '0.85rem' : '1.15rem',
                        padding: isMobile ? '0.65rem 0.85rem' : '1rem 1.25rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={`${std.name} öğrencisinin tüm karne ve istatistik sonuçlarını incele`}
                    >
                      <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', lineHeight: 1, flexShrink: 0 }}>{m.icon}</div>
                      <Avatar name={std.name} index={std.idx} size={isMobile ? 36 : 42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 900, color: m.text, textTransform: 'uppercase' }}>{m.title}</span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-muted, #64748b)' }}>· {std.gradeName}</span>
                        </div>
                        <h4 style={{ margin: '1px 0 0', fontSize: isMobile ? '0.85rem' : '0.92rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {std.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#16a34a' }}>
                            %{std.avgScore} Başarı · {std.totalQ} Soru
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            Karnesi <ChevronRight size={11} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts Row: Subject Mastery & Source Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: isMobile ? '0.75rem' : '1.25rem' }}>
            
            {/* Ders Başarı Çubuk Grafiği */}
            <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: isMobile ? 280 : 360, background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BarChart3 size={isMobile ? 16 : 18} color="#4f46e5" /> Ders Başarı Oranı & Soru Hacmi
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                  Branşlar
                </span>
              </div>

              <div style={{ height: isMobile ? 210 : 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectAggregates} margin={{ top: 15, right: 10, left: isMobile ? -25 : -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'} />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-muted, #64748b)', fontWeight: 700 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-muted, #64748b)' }} tickFormatter={v => `%${v}`} />
                    <Tooltip 
                      formatter={(val, name, props) => [`%${val} (Toplam ${props.payload.totalQ} Soru)`, 'Başarı Oranı']}
                      contentStyle={{ borderRadius: '12px', border: '1.5px solid var(--color-border, #e2e8f0)', fontWeight: 800 }}
                    />
                    <Bar dataKey="Başarı %" radius={[6, 6, 0, 0]} barSize={isMobile ? 20 : 28}>
                      {subjectAggregates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kaynak Dağılımı (Ödev vs Kitap vs Deneme) */}
            <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: isMobile ? 280 : 360, background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <PieIcon size={isMobile ? 16 : 18} color="#059669" /> Soru Kaynakları Dağılımı
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                  Ödev · Kitap · Deneme
                </span>
              </div>

              <div style={{ height: isMobile ? 210 : 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={isMobile ? 42 : 55}
                      outerRadius={isMobile ? 75 : 95}
                      paddingAngle={4}
                    >
                      {sourceBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-surface, #ffffff)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [`${val} Soru`, 'Çözülen Miktar']}
                      contentStyle={{ borderRadius: '12px', border: '1.5px solid var(--color-border, #e2e8f0)', fontWeight: 800 }}
                    />
                    <Legend 
                      formatter={(val) => <span style={{ color: 'var(--color-text, #0f172a)', fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, padding: '2px 4px' }}>{val}</span>}
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ⚠️ Erken Uyarı Radarı & Destek Bekleyen Konular */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: isMobile ? '0.75rem' : '1.25rem' }}>
            <div className="stats-glass-card" style={{ border: isDark ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid #fecaca', background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fffafa', padding: isMobile ? '0.85rem' : '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.65rem 0', fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={isMobile ? 16 : 18} color="#ef4444" /> Kritik Konular (%65 Altı)
              </h3>
              {criticalWeakInsights.weakTopics.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, padding: '0.5rem 0' }}>
                  🎉 Harika! Sınıf genelinde kritik seviyede başarısız olunan konu bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {criticalWeakInsights.weakTopics.map((top, i) => (
                    <div key={i} style={{ background: 'var(--color-surface, #ffffff)', borderRadius: 10, padding: '0.55rem 0.75rem', border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>{top.subject}</span>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top.name}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#ef4444' }}>%{top.accuracy} Başarı</span>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>{top.totalQ} Soru</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stats-glass-card" style={{ border: isDark ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid #fde68a', background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffdf5', padding: isMobile ? '0.85rem' : '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.65rem 0', fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldAlert size={isMobile ? 16 : 18} color="#f59e0b" /> Destek Gerektiren Öğrenciler
              </h3>
              {criticalWeakInsights.strugglingStudents.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, padding: '0.5rem 0' }}>
                  🌟 Tüm öğrencilerin soru doğruluk ortalaması %60 barajının üzerinde!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {criticalWeakInsights.strugglingStudents.map((std, i) => (
                    <div key={i} style={{ background: 'var(--color-surface, #ffffff)', borderRadius: 10, padding: '0.55rem 0.75rem', border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Avatar name={std.name} index={std.idx} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{std.name}</div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>{std.gradeName} · {std.totalQ} Soru</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectStudentForResults(std.id)}
                        style={{
                          background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a', color: '#f59e0b',
                          borderRadius: 8, padding: '0.25rem 0.55rem', fontWeight: 900, fontSize: '0.68rem', cursor: 'pointer', flexShrink: 0
                        }}
                      >
                        Karne ↗
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 2: 📊 PERİYODİK SORU & ZAMAN TRENDİ ─── */}
      {activeTab === 'periodic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.65rem', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.92rem' : '1.05rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingUp size={isMobile ? 17 : 20} color="#6366f1" /> Günlük Soru Çözüm Hacmi & Eğrisi
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: isMobile ? '0.7rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Sınıf genelinde gün gün çözülen toplam soru miktarı ve doğruluk trendi
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800, color: '#16a34a' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Doğru
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Yanlış
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800, color: '#818cf8' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} /> Toplam
                </div>
              </div>
            </div>

            <div style={{ height: isMobile ? 240 : 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeVelocityData} margin={{ top: 15, right: 10, left: isMobile ? -25 : -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTotalQ" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCorrectQ" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-muted, #64748b)', fontWeight: 700 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-muted, #64748b)' }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: '1.5px solid var(--color-border, #e2e8f0)', fontWeight: 800 }} />
                  <Area type="monotone" dataKey="Toplam Soru" stroke="#6366f1" strokeWidth={isMobile ? 2 : 3} fillOpacity={1} fill="url(#colorTotalQ)" />
                  <Area type="monotone" dataKey="Doğru" stroke="#10b981" strokeWidth={isMobile ? 2 : 2.5} fillOpacity={1} fill="url(#colorCorrectQ)" />
                  <Area type="monotone" dataKey="Yanlış" stroke="#ef4444" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 3: 📚 DERSLER & KONU KAZANIM KARNESİ ─── */}
      {activeTab === 'subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: isMobile ? '0.65rem' : '1rem' }}>
            {subjectAggregates.map(subj => {
              const isExpanded = expandedSubjectCard === subj.subject;
              return (
                <div key={subj.subject} className="stats-glass-card" style={{ background: 'var(--color-surface, #ffffff)', display: 'flex', flexDirection: 'column', gap: 10, padding: isMobile ? '0.85rem' : '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: 10, background: `${subj.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1rem' : '1.2rem' }}>
                        {SUBJECT_COLORS[subj.subject]?.icon || '📚'}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '0.98rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>{subj.subject}</h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>{subj.totalQ} Soru Çözüldü</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: subj.color }}>%{subj.accuracy}</span>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: subj.accuracy >= 75 ? '#16a34a' : subj.accuracy >= 55 ? '#d97706' : '#dc2626' }}>
                        {subj.accuracy >= 75 ? '🏆 Güçlü' : subj.accuracy >= 55 ? '📈 Gelişiyor' : '⚠️ Destek'}
                      </div>
                    </div>
                  </div>

                  {/* Soru Dağılım Çubuğu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)' }}>
                    <span style={{ color: '#16a34a' }}>✓ {subj.correct} D</span>
                    <span>·</span>
                    <span style={{ color: '#ef4444' }}>✗ {subj.wrong} Y</span>
                    <span>·</span>
                    <span style={{ color: 'var(--color-text-muted, #64748b)' }}>— {subj.blank} B</span>
                  </div>

                  <div style={{ height: 6, background: 'var(--color-surface-hover, #f1f5f9)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${subj.accuracy}%`, background: subj.color, borderRadius: 99 }} />
                  </div>

                  {/* Konu Listesi Aç / Kapat */}
                  <button
                    onClick={() => setExpandedSubjectCard(isExpanded ? null : subj.subject)}
                    style={{
                      marginTop: 2,
                      padding: '0.4rem',
                      borderRadius: 8,
                      border: '1px solid var(--color-border, #e2e8f0)',
                      background: 'var(--color-surface-hover, #f8fafc)',
                      color: 'var(--color-text, #475569)',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <span>{isExpanded ? 'Ünite & Konuları Gizle' : `Ünite & Konuları Gör (${subj.topicList.length})`}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {/* Genişletilmiş Konu Tablosu */}
                  {isExpanded && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid var(--color-border, #f1f5f9)', paddingTop: 6 }}>
                      {subj.topicList.length === 0 ? (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #94a3b8)', fontStyle: 'italic', textAlign: 'center', padding: '0.4rem 0' }}>
                          Ayrıntılı konu etiketi bulunmuyor
                        </div>
                      ) : (
                        subj.topicList.map((top, tIdx) => (
                          <div key={tIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', padding: '0.35rem 0.45rem', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-text, #334155)', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {top.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>{top.totalQ} S</span>
                              <span style={{ fontWeight: 900, color: top.accuracy >= 70 ? '#16a34a' : top.accuracy >= 50 ? '#d97706' : '#dc2626' }}>
                                %{top.accuracy}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ─── TAB 4: 📖 KİTAP TAKİBİ & TEST ÇÖZÜMLERİ ─── */}
      {activeTab === 'books' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.65rem', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.92rem' : '1.05rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BookCheck size={isMobile ? 17 : 20} color="#10b981" /> Takip Edilen Kitaplar & Testler
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: isMobile ? '0.7rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Öğrencilere tanımlı kaynak kitaplar ve çözülen testler
                </p>
              </div>

              <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: 99, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                {trackedBooksOnly.length} Kitap
              </span>
            </div>

            {trackedBooksOnly.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem', fontWeight: 700 }}>
                Henüz sisteme eklenmiş takip kitabı bulunmuyor.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '0.65rem' : '1rem' }}>
                {trackedBooksOnly.map(b => {
                  const testsInBook = (trackedBookTestsOnly || []).filter(t => String(t.bookId) === String(b.id));
                  return (
                    <div key={b.id} style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 14, padding: isMobile ? '0.85rem' : '1rem 1.25rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>📚</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.92rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>{b.title}</h4>
                            <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 800 }}>{b.publisher || b.subject || 'Soru Bankası'}</span>
                          </div>
                        </div>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 8, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', fontWeight: 800, fontSize: '0.68rem', border: '1px solid rgba(165, 180, 252, 0.3)', flexShrink: 0 }}>
                          {testsInBook.length} Test
                        </span>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginTop: 2 }}>
                        Ders: <strong style={{ color: 'var(--color-text, #0f172a)' }}>{b.subject || 'Genel'}</strong> {b.grade ? `· ${b.grade}. Sınıf` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 5: 📋 DENEME SINAVLARI & NET ANALİZİ ─── */}
      {activeTab === 'exams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.65rem', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.92rem' : '1.05rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Award size={isMobile ? 17 : 20} color="#8b5cf6" /> Sınıf Genel Deneme Net Gelişimi
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: isMobile ? '0.7rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)' }}>
                  LGS ve branş deneme sınavlarının sınıf net ortalamaları
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: 99, background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  Ort. {classKPIs.overallExamNet} Net
                </span>
              </div>
            </div>

            {classKPIs.totalExamsCount === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem', fontWeight: 700 }}>
                Henüz değerlendirilmiş deneme sınavı kaydı bulunmuyor.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '0.65rem' : '1rem' }}>
                {filteredStudents.map(std => {
                  const stdExams = unifiedStudentData.find(s => s.id === std.id)?.filteredExams || [];
                  if (stdExams.length === 0) return null;
                  return (
                    <div key={std.id} style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 14, padding: isMobile ? '0.85rem' : '1rem 1.25rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={std.name} size={30} />
                          <span style={{ fontWeight: 800, fontSize: isMobile ? '0.82rem' : '0.85rem', color: 'var(--color-text, #0f172a)' }}>{std.name}</span>
                        </div>
                        <span style={{ fontWeight: 900, color: '#a78bfa', fontSize: isMobile ? '0.88rem' : '0.95rem' }}>
                          {unifiedStudentData.find(s => s.id === std.id)?.avgExamNet} Net
                        </span>
                      </div>

                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                        {stdExams.length} Deneme Çözdü · Son Deneme: {stdExams[0]?.title || 'LGS Denemesi'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 6: 🗺️ YOL HARİTASI & MÜFREDAT İLERLEMESİ ─── */}
      {activeTab === 'roadmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.65rem', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.92rem' : '1.05rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Compass size={isMobile ? 17 : 20} color="#d97706" /> Program & Yol Haritası Durumu
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: isMobile ? '0.7rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Öğrencilere tanımlanan haftalık hedefler ve tamamlama oranları
                </p>
              </div>

              <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: 99, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                % {classKPIs.overallRoadmapPct} Tamamlanma
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '0.65rem' : '1rem' }}>
              {searchedAndSortedStudents.map(std => (
                <div key={std.id} style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 14, padding: isMobile ? '0.85rem' : '1rem 1.25rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={std.name} size={30} />
                      <span style={{ fontWeight: 800, fontSize: isMobile ? '0.82rem' : '0.85rem', color: 'var(--color-text, #0f172a)' }}>{std.name}</span>
                    </div>
                    <span style={{ fontWeight: 900, color: std.roadmapPct >= 70 ? '#16a34a' : '#d97706', fontSize: isMobile ? '0.82rem' : '0.88rem' }}>
                      %{std.roadmapPct}
                    </span>
                  </div>

                  <div style={{ height: 6, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${std.roadmapPct}%`, background: std.roadmapPct >= 70 ? '#10b981' : '#f59e0b', borderRadius: 99 }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                    <span>{std.completedTasks} / {std.totalTasks} Görev Bitti</span>
                    <span>{std.gradeName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 7: 👥 ÖĞRENCİ KARŞILAŞTIRMA & SIRALAMA TABLOSU ─── */}
      {(activeTab === 'students' || activeTab === 'overview') && (
        <section className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem', background: 'var(--color-surface, #ffffff)', padding: isMobile ? '0.85rem' : '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.75rem', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.95rem' : '1.05rem', color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={isMobile ? 18 : 20} color="#16a34a" /> Öğrenci Başarı & Karne Matrisi
                <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: 99, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  {searchedAndSortedStudents.length} Öğrenci
                </span>
              </h3>
              {!isMobile && (
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Öğrenciye tıklayarak veya "Detaylı Karne"ye basarak tüm sonuçlarını görüntüleyebilirsiniz.
                </p>
              )}
            </div>

            {/* Arama & Sıralama Kontrolleri */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 8 }}>
              <select
                value={studentTableSort}
                onChange={e => setStudentTableSort(e.target.value)}
                style={{
                  padding: isMobile ? '0.55rem 0.85rem' : '0.5rem 1.4rem 0.5rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid var(--color-border-input, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-text, #334155)',
                  fontSize: isMobile ? '0.76rem' : '0.78rem',
                  fontWeight: 800,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="avgScore">Sırala: Başarı Yüzdesine Göre</option>
                <option value="totalQ">Sırala: Çözülen Soru Sayısına Göre</option>
                <option value="totalNet">Sırala: Deneme Netine Göre</option>
                <option value="roadmapPct">Sırala: Yol Haritası İlerlemesine Göre</option>
              </select>

              <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 200 }}>
                <Search size={15} color="var(--color-text-muted, #94a3b8)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Öğrenci veya sınıf ara..."
                  value={studentSearchQ}
                  onChange={e => setStudentSearchQ(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.85rem 0.5rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface, #ffffff)', color: 'var(--color-text, #0f172a)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {isMobile ? (
            /* 📱 NATIVE MOBILE STUDENT CARDS VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchedAndSortedStudents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem', fontWeight: 700 }}>
                  Kayıtlı veya aramayla eşleşen öğrenci bulunamadı.
                </div>
              ) : (
                searchedAndSortedStudents.map((student) => {
                  const isHigh = student.avgScore >= 75;
                  const isMid = student.avgScore >= 55;
                  return (
                    <div
                      key={student.id}
                      style={{
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1.5px solid var(--color-border, #e2e8f0)',
                        borderRadius: 14,
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Top row: Avatar + Name + Grade + Score badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div
                          onClick={() => handleSelectStudentForResults(student.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, cursor: 'pointer' }}
                        >
                          <Avatar name={student.name} index={student.idx} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, color: 'var(--color-text, #0f172a)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {student.name}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 800 }}>
                              {student.gradeName}
                            </span>
                          </div>
                        </div>

                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '0.5rem',
                          background: isHigh ? 'rgba(16, 185, 129, 0.15)' : isMid ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isHigh ? '#10b981' : isMid ? '#f59e0b' : '#ef4444',
                          border: `1px solid ${isHigh ? 'rgba(16, 185, 129, 0.35)' : isMid ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          flexShrink: 0
                        }}>
                          %{student.avgScore} Başarı
                        </span>
                      </div>

                      {/* Middle stats row: 3 metrics */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                        background: 'var(--color-surface, #ffffff)',
                        borderRadius: 10,
                        padding: '0.45rem 0.5rem',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        textAlign: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Soru</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>{student.totalQ}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Deneme Net</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#8b5cf6' }}>{student.avgExamNet}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Yol Haritası</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: student.roadmapPct >= 70 ? '#10b981' : '#f59e0b' }}>%{student.roadmapPct}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button
                          onClick={() => handleSelectStudentForResults(student.id)}
                          style={{
                            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                            border: 'none',
                            borderRadius: '0.65rem',
                            padding: '0.45rem 0.6rem',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                          }}
                        >
                          <BarChart3 size={13} /> Karnesini Gör
                        </button>
                        <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
                          <button style={{
                            width: '100%',
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(165, 180, 252, 0.3)',
                            borderRadius: '0.65rem',
                            padding: '0.45rem 0.6rem',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            color: '#818cf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}>
                            Koçluk <ArrowUpRight size={13} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* 💻 DESKTOP TABLE VIEW */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--color-border, #e2e8f0)', background: 'var(--color-surface-hover, #f8fafc)' }}>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıf</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Çözülen Soru</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Doğruluk %</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Deneme Neti</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Yol Haritası</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text, #0f172a)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedAndSortedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem', fontWeight: 700 }}>
                        Kayıtlı veya aramayla eşleşen öğrenci bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    searchedAndSortedStudents.map((student, idx) => {
                      const isHigh = student.avgScore >= 75;
                      const isMid = student.avgScore >= 55;
                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border, #e2e8f0)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div
                              onClick={() => handleSelectStudentForResults(student.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                              title="Öğrencinin tüm sonuçlarını ve karne dökümünü incele"
                            >
                              <Avatar name={student.name} index={student.idx} size={36} />
                              <div>
                                <span style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.85rem', display: 'block' }}>{student.name}</span>
                                <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 700 }}>Detaylı Karnesi ↗</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)', fontWeight: 800, fontSize: '0.72rem' }}>
                              {student.gradeName}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div style={{ fontWeight: 900, color: 'var(--color-text, #0f172a)', fontSize: '0.85rem' }}>{student.totalQ} Soru</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>✓{student.totalCorrect} · ✗{student.totalWrong}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.65rem', borderRadius: '0.5rem',
                              background: isHigh ? 'rgba(16, 185, 129, 0.15)' : isMid ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isHigh ? '#10b981' : isMid ? '#f59e0b' : '#ef4444',
                              border: `1px solid ${isHigh ? 'rgba(16, 185, 129, 0.35)' : isMid ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                              fontWeight: 900, fontSize: '0.82rem'
                            }}>
                              %{student.avgScore}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span style={{ fontWeight: 900, color: '#a78bfa', fontSize: '0.85rem' }}>
                              {student.avgExamNet} Net
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', minWidth: 140 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 99, width: `${student.roadmapPct}%`,
                                  background: student.roadmapPct >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
                                    : student.roadmapPct >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                                    : 'linear-gradient(90deg,#f43f5e,#e11d48)',
                                  transition: 'width 0.6s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted, #64748b)', minWidth: 32 }}>%{student.roadmapPct}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => handleSelectStudentForResults(student.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                  border: 'none',
                                  borderRadius: '0.6rem',
                                  padding: '0.38rem 0.8rem',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  color: '#ffffff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                                }}
                                title="Öğrencinin tüm sınav, ödev ve karne verilerini detaylı incele"
                              >
                                <BarChart3 size={13} /> Karnesini Gör
                              </button>
                              <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
                                <button style={{
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  border: '1px solid rgba(165, 180, 252, 0.3)',
                                  borderRadius: '0.6rem', padding: '0.38rem 0.75rem',
                                  cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem',
                                  color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: 4
                                }}>
                                  Koçluk <ArrowUpRight size={13} />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
