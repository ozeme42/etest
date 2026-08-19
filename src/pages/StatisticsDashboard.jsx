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
import { computeStudentAnalyticsData, isHomeworkForStudent } from '../utils/testResolver';
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
function StatHeroCard({ label, value, sub, icon: Icon, color, bg, border, badge }) {
  return (
    <div style={{
      background: '#ffffff',
      border: `1.5px solid ${border || '#e2e8f0'}`,
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
        background: bg || '#eff6ff',
        color: color || '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 4px 12px ${color}22`
      }}>
        <Icon size={25} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
            {label}
          </span>
          {badge && (
            <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color: color, border: `1px solid ${border}` }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', display: 'block', lineHeight: 1.2, marginTop: 2 }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: '0.72rem', color: color || '#64748b', fontWeight: 700, marginTop: 1, display: 'block' }}>{sub}</span>}
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

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: STATISTICS DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function StatisticsDashboard() {
  const navigate = useNavigate();
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
    const all = (users || []).filter(u => u && u.role === 'student');
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
      const matched = (curriculumData?.grades || []).find(g => String(g.id) === String(std.gradeId) || g.name === std.gradeId || g.name === std.grade || g.name === std.className);
      if (matched) gradeName = matched.name;

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

        const topic = h.topicName || h.topic || h.title || 'Genel Konu';
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
  }, [unifiedStudentData]);

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
      
      {/* ─── 1. EXECUTIVE HEADER & CONTROLS ─── */}
      <header className="stats-glass-card" style={{
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '0.75rem',
              padding: '0.55rem 0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              color: '#334155',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              <Sparkles size={13} /> LMS 360° Akıllı Analitik & Performans Masası
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              Gelişmiş İstatistikler & Çok Boyutlu Başarı Analizi 📊
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Ödevler, Kitap Takibi, Deneme Netleri, Yol Haritası ve Periyodik Gelişim Eğrileri.
            </p>
          </div>
        </div>

        {/* Header Right Filters & Student Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Hızlı Öğrenci Seçici Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              value=""
              onChange={e => {
                if (e.target.value) handleSelectStudentForResults(e.target.value);
              }}
              style={{
                padding: '0.5rem 1.6rem 0.5rem 0.85rem',
                borderRadius: '0.75rem',
                border: '1.5px solid #6366f1',
                background: '#f5f3ff',
                color: '#4f46e5',
                fontSize: '0.78rem',
                fontWeight: 900,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 10px rgba(99,102,241,0.12)'
              }}
            >
              <option value="">👤 Öğrenci Seç & Detaylı Karnesini Gör...</option>
              {allTeacherStudents.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} {st.className ? `(${st.className})` : st.grade ? `(${st.grade})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sınıf Filtresi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', borderLeft: '1.5px solid #e2e8f0', paddingLeft: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
              Sınıf:
            </span>
            <button
              onClick={() => setSelectedGradeFilter('ALL')}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '0.65rem',
                border: selectedGradeFilter === 'ALL' ? '1.5px solid #818cf8' : '1.5px solid #cbd5e1',
                background: selectedGradeFilter === 'ALL' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#ffffff',
                color: selectedGradeFilter === 'ALL' ? '#ffffff' : '#475569', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                boxShadow: selectedGradeFilter === 'ALL' ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
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
                    padding: '0.45rem 0.75rem', borderRadius: '0.65rem',
                    border: isSel ? '1.5px solid #818cf8' : '1.5px solid #cbd5e1',
                    background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#ffffff',
                    color: isSel ? '#ffffff' : '#475569', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: isSel ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          {/* Zaman Aralığı Filtresi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', borderLeft: '1.5px solid #e2e8f0', paddingLeft: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
              Zaman:
            </span>
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'TODAY', label: 'Bugün' },
              { id: 'WEEK', label: 'Son 7 Gün' },
              { id: 'MONTH', label: 'Son 30 Gün' }
            ].map(t => {
              const isSel = timeRange === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '0.65rem',
                    border: isSel ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                    background: isSel ? 'linear-gradient(135deg,#10b981,#059669)' : '#ffffff',
                    color: isSel ? '#ffffff' : '#475569', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: isSel ? '0 4px 14px rgba(16,185,129,0.25)' : 'none'
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ─── 2. SEKMELER (NAV TABS) ─── */}
      <div style={{
        display: 'flex',
        gap: 6,
        background: '#ffffff',
        padding: '0.45rem',
        borderRadius: '1.15rem',
        border: '1.5px solid #e2e8f0',
        overflowX: 'auto',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        {[
          { key: 'overview', label: '🌐 Genel Bakış & KPI Özeti', icon: BarChart3 },
          { key: 'periodic', label: '📊 Soru & Zaman Trendi (Günlük / Aylık)', icon: TrendingUp },
          { key: 'subjects', label: '📚 Dersler & Konu Kazanım Karnesi', icon: BookOpen },
          { key: 'books', label: '📖 Kitap Takibi & Test Çözümleri', icon: BookCheck },
          { key: 'exams', label: '📋 Deneme Sınavları & Net Analizi', icon: Award },
          { key: 'roadmap', label: '🗺️ Yol Haritası & Müfredat İlerlemesi', icon: Compass },
          { key: 'students', label: '👥 Öğrenci Karşılaştırma & Sıralama', icon: Users }
        ].map(t => {
          const active = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: '1 1 auto',
                padding: '0.65rem 1.1rem',
                borderRadius: '0.85rem',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
                background: active ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                color: active ? '#ffffff' : '#64748b',
                boxShadow: active ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. 6 BÜYÜK TEMEL PERFORMANS GÖSTERGESİ (EXECUTIVE KPI CARDS) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <StatHeroCard 
          icon={Zap} 
          label="Toplam Çözülen Soru" 
          value={`${classKPIs.totalQuestions} Soru`} 
          sub={`✓ ${classKPIs.totalCorrect} Doğru · ✗ ${classKPIs.totalWrong} Yanlış`} 
          color="#3b82f6" 
          bg="#eff6ff" 
          border="#bae6fd"
          badge="Tüm Kaynaklar"
        />
        <StatHeroCard 
          icon={Trophy} 
          label="Genel Başarı & Doğruluk" 
          value={`%${classKPIs.overallAccuracy}`} 
          sub={classKPIs.overallAccuracy >= 75 ? '🔥 Yüksek Başarı' : classKPIs.overallAccuracy >= 55 ? '⚡ Orta Seviye' : '⚠️ Destek Gerekli'} 
          color={classKPIs.overallAccuracy >= 75 ? '#16a34a' : classKPIs.overallAccuracy >= 55 ? '#d97706' : '#dc2626'} 
          bg={classKPIs.overallAccuracy >= 75 ? '#f0fdf4' : classKPIs.overallAccuracy >= 55 ? '#fffbeb' : '#fef2f2'} 
          border={classKPIs.overallAccuracy >= 75 ? '#bbf7d0' : classKPIs.overallAccuracy >= 55 ? '#fde68a' : '#fecaca'} 
          badge="Net Doğruluk"
        />
        <StatHeroCard 
          icon={Award} 
          label="Deneme Net Ortalaması" 
          value={`${classKPIs.overallExamNet} Net`} 
          sub={`${classKPIs.totalExamsCount} Deneme Kağıdı Analiz Edildi`} 
          color="#8b5cf6" 
          bg="#f5f3ff" 
          border="#ddd6fe" 
          badge="LGS / Denemeler"
        />
        <StatHeroCard 
          icon={BookCheck} 
          label="Takip Edilen Kitaplar" 
          value={`${allBooks.length} Kitap / ${allBookTests.length} Test`} 
          sub={`${classKPIs.totalUniqueBooks} Öğrenci Aktif Kitap Çözüyor`} 
          color="#10b981" 
          bg="#f0fdf4" 
          border="#bbf7d0" 
          badge="Fiziksel Kitap"
        />
        <StatHeroCard 
          icon={Compass} 
          label="Yol Haritası Tamamlama" 
          value={`%${classKPIs.overallRoadmapPct}`} 
          sub={`${classKPIs.completedRoadmapTasks} / ${classKPIs.totalRoadmapTasks} Görev Bitti`} 
          color="#d97706" 
          bg="#fffbeb" 
          border="#fde68a" 
          badge="Müfredat Hedefi"
        />
        <StatHeroCard 
          icon={Users} 
          label="Aktif Öğrenci Sayısı" 
          value={`${classKPIs.totalStudents} Öğrenci`} 
          sub={selectedGradeFilter === 'ALL' ? 'Tüm sınıflar dahil' : `${selectedGradeFilter}. sınıf seviyesi`} 
          color="#0284c7" 
          bg="#f0f9ff" 
          border="#bae6fd" 
          badge="Sınıf Havuzu"
        />
      </div>

      {/* ─── TAB 1: 🌐 GENEL BAKIŞ & YÖNETİCİ ÖZETİ ─── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Top Podium Cards */}
          {topPodium.length > 0 && (
            <div className="stats-glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} color="#d97706" /> En Başarılı Öğrenciler Kürsüsü (Top 3)
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  Genel soru çözümü ve sınav doğruluk yüzdesine göre sıralanmıştır
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {topPodium.map((std, rank) => {
                  const medals = [
                    { title: '1. Birincilik', icon: '🥇', grad: '#fffbeb', border: '#fde68a', text: '#b45309' },
                    { title: '2. İkincilik', icon: '🥈', grad: '#f8fafc', border: '#cbd5e1', text: '#475569' },
                    { title: '3. Üçüncülük', icon: '🥉', grad: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
                  ];
                  const m = medals[rank];
                  return (
                    <div
                      key={std.id}
                      onClick={() => handleSelectStudentForResults(std.id)}
                      style={{
                        background: m.grad,
                        border: `1.5px solid ${m.border}`,
                        borderRadius: '1.15rem', padding: '1rem 1.25rem',
                        display: 'flex', alignItems: 'center', gap: '0.85rem',
                        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={`${std.name} öğrencisinin tüm karne ve istatistik sonuçlarını incele`}
                    >
                      <div style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{m.icon}</div>
                      <Avatar name={std.name} index={std.idx} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: m.text, textTransform: 'uppercase' }}>{m.title}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>· {std.gradeName}</span>
                        </div>
                        <h4 style={{ margin: '2px 0 0', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {std.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#16a34a' }}>
                            %{std.avgScore} Başarı · {std.totalQ} Soru
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            Karnesi <ChevronRight size={12} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            
            {/* Ders Başarı Çubuk Grafiği */}
            <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360, background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} color="#4f46e5" /> Ders Bazlı Başarı Oranı & Soru Hacmi
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  Branş Yetkinliği
                </span>
              </div>

              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectAggregates} margin={{ top: 20, right: 15, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `%${v}`} />
                    <Tooltip 
                      formatter={(val, name, props) => [`%${val} (Toplam ${props.payload.totalQ} Soru)`, 'Başarı Oranı']}
                      contentStyle={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: 800 }}
                    />
                    <Bar dataKey="Başarı %" radius={[8, 8, 0, 0]} barSize={28}>
                      {subjectAggregates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kaynak Dağılımı (Ödev vs Kitap vs Deneme) */}
            <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360, background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PieIcon size={18} color="#059669" /> Soru Kaynakları Dağılımı
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  Ödev · Kitap · Deneme
                </span>
              </div>

              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {sourceBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [`${val} Soru`, 'Çözülen Miktar']}
                      contentStyle={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: 800 }}
                    />
                    <Legend 
                      formatter={(val) => <span style={{ color: '#0f172a', fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px' }}>{val}</span>}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            <div className="stats-glass-card" style={{ border: '1.5px solid #fecaca', background: '#fffafa' }}>
              <h3 style={{ margin: '0 0 0.85rem 0', fontWeight: 900, fontSize: '0.95rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#dc2626" /> Sınıfın En Çok Zorlandığı Kritik Konular (%65 Altı)
              </h3>
              {criticalWeakInsights.weakTopics.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, padding: '1rem 0' }}>
                  🎉 Harika! Sınıf genelinde kritik seviyede başarısız olunan konu bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {criticalWeakInsights.weakTopics.map((top, i) => (
                    <div key={i} style={{ background: '#ffffff', borderRadius: 12, padding: '0.65rem 0.95rem', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase' }}>{top.subject}</span>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{top.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#dc2626' }}>%{top.accuracy} Başarı</span>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>{top.totalQ} Soru Çözüldü</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stats-glass-card" style={{ border: '1.5px solid #fde68a', background: '#fffdf5' }}>
              <h3 style={{ margin: '0 0 0.85rem 0', fontWeight: 900, fontSize: '0.95rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color="#d97706" /> Bireysel Destek & Takip Gerektiren Öğrenciler
              </h3>
              {criticalWeakInsights.strugglingStudents.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, padding: '1rem 0' }}>
                  🌟 Tüm öğrencilerin soru doğruluk ortalaması %60 barajının üzerinde!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {criticalWeakInsights.strugglingStudents.map((std, i) => (
                    <div key={i} style={{ background: '#ffffff', borderRadius: 12, padding: '0.65rem 0.95rem', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={std.name} index={std.idx} size={32} />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>{std.name}</div>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>{std.gradeName} · {std.totalQ} Soru</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectStudentForResults(std.id)}
                        style={{
                          background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706',
                          borderRadius: 8, padding: '0.3rem 0.65rem', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer'
                        }}
                      >
                        Karnesini Aç ↗
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="#6366f1" /> Günlük Soru Çözüm Hacmi & İlerleme Eğrisi
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Sınıf genelinde gün gün çözülen toplam soru miktarı ve doğruluk trendi
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: '#16a34a' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /> Doğru Soru
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: '#dc2626' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> Yanlış Soru
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: '#6366f1' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} /> Toplam Soru
                </div>
              </div>
            </div>

            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeVelocityData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: '1.5px solid #e2e8f0', fontWeight: 800 }} />
                  <Area type="monotone" dataKey="Toplam Soru" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotalQ)" />
                  <Area type="monotone" dataKey="Doğru" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCorrectQ)" />
                  <Area type="monotone" dataKey="Yanlış" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 3: 📚 DERSLER & KONU KAZANIM KARNESİ ─── */}
      {activeTab === 'subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {subjectAggregates.map(subj => {
              const isExpanded = expandedSubjectCard === subj.subject;
              return (
                <div key={subj.subject} className="stats-glass-card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${subj.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                        {SUBJECT_COLORS[subj.subject]?.icon || '📚'}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>{subj.subject}</h4>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{subj.totalQ} Soru Çözüldü</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: subj.color }}>%{subj.accuracy}</span>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: subj.accuracy >= 75 ? '#16a34a' : subj.accuracy >= 55 ? '#d97706' : '#dc2626' }}>
                        {subj.accuracy >= 75 ? '🏆 Güçlü' : subj.accuracy >= 55 ? '📈 Gelişiyor' : '⚠️ Destek'}
                      </div>
                    </div>
                  </div>

                  {/* Soru Dağılım Çubuğu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
                    <span style={{ color: '#16a34a' }}>✓ {subj.correct} D</span>
                    <span>·</span>
                    <span style={{ color: '#dc2626' }}>✗ {subj.wrong} Y</span>
                    <span>·</span>
                    <span style={{ color: '#64748b' }}>— {subj.blank} B</span>
                  </div>

                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${subj.accuracy}%`, background: subj.color, borderRadius: 99 }} />
                  </div>

                  {/* Konu Listesi Aç / Kapat */}
                  <button
                    onClick={() => setExpandedSubjectCard(isExpanded ? null : subj.subject)}
                    style={{
                      marginTop: 4,
                      padding: '0.45rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#475569',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <span>{isExpanded ? 'Konuları Gizle' : `Konu Kazanımlarını Gör (${subj.topicList.length})`}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* Genişletilmiş Konu Tablosu */}
                  {isExpanded && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                      {subj.topicList.length === 0 ? (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
                          Ayrıntılı konu etiketi bulunmuyor
                        </div>
                      ) : (
                        subj.topicList.map((top, tIdx) => (
                          <div key={tIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.35rem 0.5rem', background: '#f8fafc', borderRadius: 6 }}>
                            <span style={{ fontWeight: 700, color: '#334155', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {top.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>{top.totalQ} S</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookCheck size={20} color="#10b981" /> Takip Edilen Fiziksel Soru Bankaları & Testler
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Öğrencilere tanımlı kaynak kitaplar, çözülen test miktarları ve başarı durumları
                </p>
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.3rem 0.8rem', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                {allBooks.length} Kitap Tanımlı
              </span>
            </div>

            {allBooks.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                Henüz sisteme eklenmiş takip kitabı bulunmuyor.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {allBooks.map(b => {
                  const testsInBook = (allBookTests || []).filter(t => String(t.bookId) === String(b.id));
                  return (
                    <div key={b.id} style={{ background: '#f8fafc', borderRadius: 16, padding: '1rem 1.25rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1.5rem' }}>📚</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{b.title}</h4>
                            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 800 }}>{b.publisher || b.subject || 'Soru Bankası'}</span>
                          </div>
                        </div>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.7rem', border: '1px solid #bfdbfe' }}>
                          {testsInBook.length} Test
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginTop: 4 }}>
                        Ders: <strong>{b.subject || 'Genel'}</strong> {b.grade ? `· ${b.grade}. Sınıf` : ''}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="#8b5cf6" /> Sınıf Genel Deneme Sınavları & Net Gelişimi
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Tüm LGS ve branş deneme sınavlarının sınıf net ortalamaları
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.3rem 0.8rem', borderRadius: 99, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                  Ort. {classKPIs.overallExamNet} Net
                </span>
              </div>
            </div>

            {classKPIs.totalExamsCount === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                Henüz değerlendirilmiş deneme sınavı kaydı bulunmuyor.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredStudents.map(std => {
                  const stdExams = unifiedStudentData.find(s => s.id === std.id)?.filteredExams || [];
                  if (stdExams.length === 0) return null;
                  return (
                    <div key={std.id} style={{ background: '#f8fafc', borderRadius: 16, padding: '1rem 1.25rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={std.name} size={32} />
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{std.name}</span>
                        </div>
                        <span style={{ fontWeight: 900, color: '#7c3aed', fontSize: '0.95rem' }}>
                          {unifiedStudentData.find(s => s.id === std.id)?.avgExamNet} Net
                        </span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="stats-glass-card" style={{ background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={20} color="#d97706" /> Çalışma Programı & Yol Haritası Görev Durumu
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Öğrencilere tanımlanan haftalık hedefler, konu kazanımları ve tamamlama oranları
                </p>
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.3rem 0.8rem', borderRadius: 99, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                % {classKPIs.overallRoadmapPct} Tamamlanma
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {searchedAndSortedStudents.map(std => (
                <div key={std.id} style={{ background: '#f8fafc', borderRadius: 16, padding: '1rem 1.25rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={std.name} size={32} />
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{std.name}</span>
                    </div>
                    <span style={{ fontWeight: 900, color: std.roadmapPct >= 70 ? '#16a34a' : '#d97706', fontSize: '0.88rem' }}>
                      %{std.roadmapPct}
                    </span>
                  </div>

                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${std.roadmapPct}%`, background: std.roadmapPct >= 70 ? '#10b981' : '#f59e0b', borderRadius: 99 }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    <span>{std.completedTasks} / {std.totalTasks} Görev Tamamlandı</span>
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
        <section className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#16a34a" /> Öğrenci Bazlı Kapsamlı Başarı & Karne Matrisi
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                  {searchedAndSortedStudents.length} Öğrenci
                </span>
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                Öğrenciye tıklayarak veya "Detaylı Karne"ye basarak tüm sonuçlarını görüntüleyebilirsiniz.
              </p>
            </div>

            {/* Arama & Sıralama Kontrolleri */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={studentTableSort}
                onChange={e => setStudentTableSort(e.target.value)}
                style={{
                  padding: '0.5rem 1.4rem 0.5rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '0.78rem',
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

              <div style={{ position: 'relative', minWidth: 200 }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Öğrenci veya sınıf ara..."
                  value={studentSearchQ}
                  onChange={e => setStudentSearchQ(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.85rem 0.5rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıf</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Çözülen Soru</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Doğruluk %</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Deneme Neti</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Yol Haritası</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {searchedAndSortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
                      Kayıtlı veya aramayla eşleşen öğrenci bulunamadı.
                    </td>
                  </tr>
                ) : (
                  searchedAndSortedStudents.map((student, idx) => {
                    const isHigh = student.avgScore >= 75;
                    const isMid = student.avgScore >= 55;
                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.15s' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div
                            onClick={() => handleSelectStudentForResults(student.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                            title="Öğrencinin tüm sonuçlarını ve karne dökümünü incele"
                          >
                            <Avatar name={student.name} index={student.idx} size={36} />
                            <div>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', display: 'block' }}>{student.name}</span>
                              <span style={{ fontSize: '0.68rem', color: '#4f46e5', fontWeight: 700 }}>Detaylı Karnesi ↗</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontWeight: 800, fontSize: '0.72rem' }}>
                            {student.gradeName}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.85rem' }}>{student.totalQ} Soru</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>✓{student.totalCorrect} · ✗{student.totalWrong}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.65rem', borderRadius: '0.5rem',
                            background: isHigh ? '#f0fdf4' : isMid ? '#fffbeb' : '#fef2f2',
                            color: isHigh ? '#16a34a' : isMid ? '#d97706' : '#dc2626',
                            border: `1px solid ${isHigh ? '#bbf7d0' : isMid ? '#fde68a' : '#fecaca'}`,
                            fontWeight: 900, fontSize: '0.82rem'
                          }}>
                            %{student.avgScore}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 900, color: '#7c3aed', fontSize: '0.85rem' }}>
                            {student.avgExamNet} Net
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 99, width: `${student.roadmapPct}%`,
                                background: student.roadmapPct >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
                                  : student.roadmapPct >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                                  : 'linear-gradient(90deg,#f43f5e,#e11d48)',
                                transition: 'width 0.6s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', minWidth: 32 }}>%{student.roadmapPct}</span>
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
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '0.6rem', padding: '0.38rem 0.75rem',
                                cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem',
                                color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: 4
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
        </section>
      )}

    </div>
  );
}
