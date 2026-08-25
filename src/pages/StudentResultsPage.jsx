import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ListTree, Search, Calendar, Award, CheckCircle2, Clock3, Eye,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, TrendingUp,
  BarChart3, Target, BookMarked, XCircle, Table, List, Home,
  ChevronRight, AlertTriangle, Zap, FileText, BookCheck, GraduationCap as Exam,
  FlameKindling, ThumbsUp, ThumbsDown, Minus, RefreshCw, PieChart as PieIcon,
  LayoutGrid, Plus, Edit3, Trash2
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
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { isHomeworkForStudent, computeStudentAnalyticsData } from '../utils/testResolver';
import { normalizeUnifiedTest, normalizeUnifiedSubmission } from '../services/unifiedQuizAdapter';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter, normalizeAnswerIndex } from '../utils/answerEvaluation';
import { toUUID } from '../services/supabaseService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { isSectionOpenEnded, isQuestionOpenEnded } from '../components/quiz/utils/quizTypeDetector';
import PeriodicQuestionAnalytics from '../components/PeriodicQuestionAnalytics';
import ManualTestModal from '../components/ManualTestModal';
import StudentPerformanceReportModal from '../components/reports/StudentPerformanceReportModal';

function computeUnifiedSubmissionStats(sub, hw, allQuestions = []) {
  if (!sub) return null;
  const isMultiSec = Boolean(
    hw?.isBulk ||
    hw?.type === 'multi' ||
    sub?.type === 'multi' ||
    (Array.isArray(hw?.sections) && hw.sections.length > 1) ||
    (Array.isArray(hw?.tests) && hw.tests.length > 1) ||
    (Array.isArray(hw?.items) && hw.items.length > 1) ||
    (sub?.sections && typeof sub.sections === 'object' && Object.keys(sub.sections).length > 1)
  );

  if (!isMultiSec) return null;

  try {
    const unifiedTest = normalizeUnifiedTest(hw || sub, allQuestions);
    const rawSections = unifiedTest.sections;
    if (!rawSections || rawSections.length === 0) return null;

    if (sub.isEvaluatedByTeacher && typeof sub.correctCount === 'number' && typeof sub.wrongCount === 'number') {
      const correct = Number(sub.correctCount);
      const wrong = Number(sub.wrongCount);
      const blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
      const total = Number(sub.totalQuestions || (correct + wrong + blank) || 27);
      const scorePct = sub.scorePercentage ?? sub.score ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
      const rawNet = typeof sub.netScore === 'number' ? sub.netScore : Math.max(0, correct - (wrong * 0.25));
      const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));
      return { total, correct, wrong, blank, pending: 0, scorePct, netScore };
    }

    const unifiedSub = normalizeUnifiedSubmission(sub, unifiedTest);
    const sectionAnswersMap = unifiedSub.sections || {};
    const teacherScores = sub.teacherScores || sub.scores || (sub.raw_data && (sub.raw_data.teacherScores || sub.raw_data.scores)) || {};

    let totalQuestions = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;

    const secOffsets = [];
    let acc = 0;
    rawSections.forEach(s => {
      secOffsets.push(acc);
      acc += (s.qCount || s.questions?.length || s.resolvedQuestions?.length || 1);
    });

    rawSections.forEach((sec, sIdx) => {
      const sa = sectionAnswersMap[sec.id] ||
                 sectionAnswersMap[sIdx] ||
                 sectionAnswersMap[String(sIdx)] ||
                 (sec.title && sectionAnswersMap[sec.title]) ||
                 (sec.raw?.id && sectionAnswersMap[sec.raw.id]) ||
                 (sec.raw?.questionId && sectionAnswersMap[sec.raw.questionId]) ||
                 { answers: {}, openEndedText: {}, teacherScores: {} };

      const secQs = sec.questions || sec.resolvedQuestions || [];
      const count = sec.qCount || secQs.length || 1;
      const isSecOpenEnded = sec.type === 'open_ended' || isSectionOpenEnded(sec, hw);
      const secStart = secOffsets[sIdx] || 0;

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const globalQNo = secStart + i;
        const qObj = secQs[i - 1] || {};
        const isQOE = isSecOpenEnded || isQuestionOpenEnded(qObj, sec, hw);

        const rawAnsItem = Array.isArray(sub?.answers)
          ? sub.answers.find(a =>
              (a.sectionId && (String(a.sectionId) === String(sec.id) || String(a.sectionId) === String(sec.raw?.id)) && Number(a.questionNoInSection) === i) ||
              Number(a.questionNo) === globalQNo ||
              (sIdx === 0 && Number(a.questionNo) === i)
            )
          : null;

        const teacherScore = teacherScores[sec.id]?.[i] ??
                             teacherScores[sIdx]?.[i] ??
                             sa.teacherScores?.[i] ??
                             sa.teacherScores?.[String(i)] ??
                             rawAnsItem?.score;

        if (isQOE) {
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)] ?? rawAnsItem?.userAnswerText;
          const hasText = textVal && String(textVal).trim() !== '';

          const isExplicitEmpty = teacherScore === 'empty' || rawAnsItem?.score === 'empty' || rawAnsItem?.evalStatus === 'empty' || (rawAnsItem?.score === 0 && rawAnsItem?.isCorrect === null);
          const hasExplicitTeacherScore = !isExplicitEmpty && teacherScore !== undefined && teacherScore !== null && teacherScore !== 'empty';

          if (isExplicitEmpty) {
            blankCount++;
          } else if (hasExplicitTeacherScore) {
            if (Number(teacherScore) >= 5) correctCount++;
            else wrongCount++;
          } else if (rawAnsItem && (rawAnsItem.evaluatedByTeacher || rawAnsItem.evaluatedAt) && rawAnsItem.score !== undefined && rawAnsItem.score !== null) {
            if (Number(rawAnsItem.score) >= 5) correctCount++;
            else if (Number(rawAnsItem.score) > 0 || hasText) wrongCount++;
            else blankCount++;
          } else if (hasText) {
            pendingCount++;
          } else {
            blankCount++;
          }
        } else {
          // Multiple choice
          const rawAns = sa.answers?.[i] ?? sa.answers?.[String(i)] ?? rawAnsItem?.userAnswer;
          const u = normalizeAnswerIndex(rawAns);

          if (u === null && (!rawAnsItem || (rawAnsItem.userAnswer === null && !rawAnsItem.answer))) {
            blankCount++;
          } else if (rawAnsItem && typeof rawAnsItem.isCorrect === 'boolean') {
            if (rawAnsItem.isCorrect) correctCount++;
            else wrongCount++;
          } else if (u !== null) {
            let isCorr = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, i);
            if (isCorr === false) wrongCount++;
            else correctCount++;
          } else {
            blankCount++;
          }
        }
      }
    });

    const totalScored = correctCount + wrongCount + blankCount;
    const scorePct = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : 0;
    const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
    const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));

    return {
      total: totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      blank: blankCount,
      pending: pendingCount,
      scorePct,
      netScore
    };
  } catch (err) {
    console.warn('computeUnifiedSubmissionStats error:', err);
    return null;
  }
}

/* ── Subject Config ─────────────────────────────────────────── */
const SUBJECTS = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Genel Testler'];

const getSubjectTheme = (subjKey, isDark) => {
  const themes = {
    'Matematik': {
      bg: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff',
      color: '#3b82f6',
      border: isDark ? 'rgba(59,130,246,0.35)' : '#bfdbfe',
      icon: Ruler,
      radar: '#3b82f6',
      light: isDark ? 'rgba(59,130,246,0.1)' : '#f0f9ff'
    },
    'Fen Bilimleri': {
      bg: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4',
      color: '#10b981',
      border: isDark ? 'rgba(16,185,129,0.35)' : '#bbf7d0',
      icon: TestTube2,
      radar: '#10b981',
      light: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5'
    },
    'Türkçe': {
      bg: isDark ? 'rgba(249,115,22,0.18)' : '#fff7ed',
      color: '#f97316',
      border: isDark ? 'rgba(249,115,22,0.35)' : '#fed7aa',
      icon: BookCopy,
      radar: '#f97316',
      light: isDark ? 'rgba(249,115,22,0.1)' : '#fffaf5'
    },
    'Sosyal Bilgiler': {
      bg: isDark ? 'rgba(168,85,247,0.18)' : '#faf5ff',
      color: '#a855f7',
      border: isDark ? 'rgba(168,85,247,0.35)' : '#e9d5ff',
      icon: Globe,
      radar: '#a855f7',
      light: isDark ? 'rgba(168,85,247,0.1)' : '#fbf8ff'
    },
    'İngilizce': {
      bg: isDark ? 'rgba(244,63,94,0.18)' : '#fff1f2',
      color: '#f43f5e',
      border: isDark ? 'rgba(244,63,94,0.35)' : '#fecdd3',
      icon: MessageSquare,
      radar: '#f43f5e',
      light: isDark ? 'rgba(244,63,94,0.1)' : '#fff8f9'
    },
    'Genel Testler': {
      bg: isDark ? 'rgba(99,102,241,0.18)' : '#f5f3ff',
      color: '#818cf8',
      border: isDark ? 'rgba(99,102,241,0.35)' : '#ddd6fe',
      icon: Trophy,
      radar: '#6366f1',
      light: isDark ? 'rgba(99,102,241,0.1)' : '#faf8ff'
    },
    'Diğer': {
      bg: isDark ? 'rgba(148,163,184,0.15)' : '#f8fafc',
      color: '#94a3b8',
      border: isDark ? 'rgba(148,163,184,0.3)' : '#e2e8f0',
      icon: BookOpen,
      radar: '#94a3b8',
      light: isDark ? 'rgba(148,163,184,0.1)' : '#f8fafc'
    }
  };
  return themes[subjKey] || themes['Diğer'];
};

const getTypeConfig = (isDark) => ({
  physicalExam: {
    label: '📋 Deneme',
    bg: isDark ? 'rgba(99,102,241,0.18)' : '#f5f3ff',
    color: '#818cf8',
    border: isDark ? 'rgba(99,102,241,0.35)' : '#ddd6fe'
  },
  homework: {
    label: '📝 Ödev',
    bg: isDark ? 'rgba(249,115,22,0.18)' : '#fff7ed',
    color: '#f97316',
    border: isDark ? 'rgba(249,115,22,0.35)' : '#fed7aa'
  },
  book: {
    label: '📚 Kitap Testi',
    bg: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4',
    color: '#10b981',
    border: isDark ? 'rgba(16,185,129,0.35)' : '#bbf7d0'
  },
  individual: {
    label: '⚡ Bireysel',
    bg: isDark ? 'rgba(148,163,184,0.15)' : '#f8fafc',
    color: '#94a3b8',
    border: isDark ? 'rgba(148,163,184,0.3)' : '#e2e8f0'
  },
});

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

function ScoreBadge({ score, type, isPendingEval, isPendingApproval, isRejected, size = 'md', isDark = false }) {
  if (isPendingApproval) {
    return (
      <span style={{
        fontSize: size === 'lg' ? '0.9rem' : size === 'sm' ? '0.72rem' : '0.8rem',
        fontWeight: 900,
        background: isDark ? 'rgba(124,58,237,0.18)' : '#faf5ff',
        color: '#a855f7',
        border: isDark ? '1.5px solid rgba(168,85,247,0.35)' : '1.5px solid #e9d5ff',
        borderRadius: 10,
        padding: size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap'
      }}>
        ⏳ Onay Bekliyor
      </span>
    );
  }
  if (isRejected) {
    return (
      <span style={{
        fontSize: size === 'lg' ? '0.9rem' : size === 'sm' ? '0.72rem' : '0.8rem',
        fontWeight: 900,
        background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
        color: '#ef4444',
        border: isDark ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid #fecaca',
        borderRadius: 10,
        padding: size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap'
      }}>
        ❌ Reddedildi
      </span>
    );
  }
  if (isPendingEval) {
    return (
      <span style={{
        fontSize: size === 'lg' ? '0.9rem' : size === 'sm' ? '0.72rem' : '0.8rem',
        fontWeight: 900,
        background: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb',
        color: '#f59e0b',
        border: isDark ? '1.5px solid rgba(245,158,11,0.35)' : '1.5px solid #fde68a',
        borderRadius: 10,
        padding: size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap'
      }}>
        ⏳ Not Bekliyor
      </span>
    );
  }
  const fontSize = size === 'lg' ? '1.35rem' : size === 'sm' ? '0.8rem' : '0.95rem';
  const pad = size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem';
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const bg = score >= 80
    ? (isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4')
    : score >= 60
    ? (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb')
    : (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2');
  const border = score >= 80
    ? (isDark ? 'rgba(16,185,129,0.35)' : '#bbf7d0')
    : score >= 60
    ? (isDark ? 'rgba(245,158,11,0.35)' : '#fde68a')
    : (isDark ? 'rgba(239,68,68,0.35)' : '#fecaca');

  return (
    <span style={{ fontSize, fontWeight: 900, background: bg, color, border: `1.5px solid ${border}`, borderRadius: 10, padding: pad, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {type === 'physicalExam' ? `${score} Net` : `%${score}`}
    </span>
  );
}

function StatusTag({ accuracy, isDark = false }) {
  if (accuracy >= 80) return <span style={{ background: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4', color: '#10b981', border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>🏆 Güçlü</span>;
  if (accuracy >= 60) return <span style={{ background: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb', color: '#f59e0b', border: isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #fde68a', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>📈 Gelişiyor</span>;
  return <span style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>⚠️ Kritik</span>;
}

const TAB_DEFS = [
  { key: 'overview',  label: '🏠 Genel Bakış',                 shortLabel: '🏠 Genel',        icon: Home },
  { key: 'periodic',  label: '📊 Günlük / Aylık Soru Analizi', shortLabel: '📊 Soru Analizi', icon: BarChart3 },
  { key: 'subjects',  label: '📚 Ders & Konu',                  shortLabel: '📚 Dersler',       icon: BookOpen },
  { key: 'bytype',    label: '📝 Ödev & Deneme',                shortLabel: '📝 Ödev/Deneme',  icon: FileText },
  { key: 'trend',     label: '📈 Zaman Trendi',                 shortLabel: '📈 Trend',        icon: TrendingUp },
  { key: 'all',       label: '📋 Tüm Sonuçlar',                shortLabel: '📋 Tüm Liste',     icon: Table },
];

/* ── Custom Tooltips ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div style={{ background: 'var(--color-surface, #ffffff)', color: 'var(--color-text, #0f172a)', padding: '0.75rem 1rem', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1.5px solid var(--color-border, #e2e8f0)', minWidth: 160 }}>
      <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#6366f1', marginBottom: 4 }}>{d.title || d.ders || label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)', display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 3 }}>
          <span style={{ color: p.color || 'var(--color-text-muted)', fontWeight: 700 }}>{p.name}</span>
          <span style={{ fontWeight: 900, color: 'var(--color-text)' }}>{typeof p.value === 'number' && p.name?.includes('%') ? `%${p.value}` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function CustomSubjectTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload || {};
    const scoreVal = data['Başarı %'] !== undefined ? data['Başarı %'] : (data.accuracy !== undefined ? data.accuracy : data.avgScore);
    const correctVal = data['Doğru'] !== undefined ? data['Doğru'] : (data.correctQ !== undefined ? data.correctQ : data.totalCorrect);
    const wrongVal = data['Yanlış'] !== undefined ? data['Yanlış'] : (data.wrongQ !== undefined ? data.wrongQ : data.totalWrong);
    const blankVal = data['Boş'] !== undefined ? data['Boş'] : (data.blankQ !== undefined ? data.blankQ : data.totalBlank);
    
    let totalVal = data['Soru Sayısı'] ?? data.totalQ ?? data.value;
    if (totalVal === undefined || totalVal === null || isNaN(totalVal)) {
      const c = Number(correctVal) || 0;
      const w = Number(wrongVal) || 0;
      const b = Number(blankVal) || 0;
      totalVal = c + w + b;
    }

    const title = data.fullName || data.name || data.displayName || data.subject || 'Ders';

    return (
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        border: '1.5px solid var(--color-border, #e2e8f0)',
        borderRadius: 14,
        padding: '0.75rem 1rem',
        color: 'var(--color-text, #0f172a)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        fontSize: '0.8rem',
        minWidth: 160
      }}>
        <div style={{ fontWeight: 900, color: '#6366f1', marginBottom: 6, fontSize: '0.9rem' }}>
          {title}
        </div>
        {scoreVal !== undefined && !isNaN(scoreVal) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Başarı Oranı:</span>
            <span style={{ fontWeight: 900, color: scoreVal >= 70 ? '#10b981' : scoreVal >= 50 ? '#f59e0b' : '#ef4444' }}>
              %{scoreVal}
            </span>
          </div>
        )}
        {correctVal !== undefined && !isNaN(correctVal) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#10b981' }}>✓ Doğru:</span>
            <span style={{ fontWeight: 800, color: '#10b981' }}>{correctVal}</span>
          </div>
        )}
        {wrongVal !== undefined && !isNaN(wrongVal) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#ef4444' }}>✗ Yanlış:</span>
            <span style={{ fontWeight: 800, color: '#ef4444' }}>{wrongVal}</span>
          </div>
        )}
        {blankVal !== undefined && !isNaN(blankVal) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>— Boş:</span>
            <span style={{ fontWeight: 800, color: 'var(--color-text-muted)' }}>{blankVal}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--color-text)', fontWeight: 800 }}>
          <span>Toplam Soru:</span>
          <span>{Number(totalVal) || 0}</span>
        </div>
      </div>
    );
  }
  return null;
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function StudentResultsPage({ studentId: propStudentId, onBack, embedded = false }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark } = useTheme();
  const { submissions, deleteSubmission, deleteSubmissionsByTestId, clearSubmissionsForStudent } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { data: curData } = useCurriculum();
  const { books, bookTests } = useTrackedBooks();
  const { questions: allBankQuestions } = useQuestionBank();
  const { getMockExamsForStudent } = useCoaching();

  const { currentUser } = useAuth();
  const isStudentRole = currentUser?.role === 'student';

  const handleDeleteResult = async (subObj, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`"${subObj.testTitle || subObj.testName || 'Bu sınav'}" sonucunu kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
    try {
      if (subObj.id) {
        await deleteSubmission(subObj.id);
      }
      if (subObj.supabaseId) {
        await deleteSubmission(subObj.supabaseId);
      }
      if (subObj.testId) {
        await deleteSubmissionsByTestId(subObj.testId);
      }
      if (subObj.hwId && subObj.hwId !== subObj.testId) {
        await deleteSubmissionsByTestId(subObj.hwId);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleClearAllResults = async () => {
    if (!selectedStudent?.id) return;
    if (!window.confirm(`${selectedStudent.name || 'Öğrencinin'} tüm sınav sonuçlarını ve geçmişini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await clearSubmissionsForStudent(selectedStudent.id);
    } catch (err) {
      console.error('Clear all error:', err);
    }
  };

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id || currentUser?.id === u.id)), [users, currentUser]);

  const activeTargetStudentId = propStudentId || searchParams.get('studentId');

  const initialStudent = useMemo(() => {
    if (activeTargetStudentId) {
      const match = studentMembers.find(u => String(u.id) === String(activeTargetStudentId));
      if (match) return match;
    }
    if (isStudentRole && currentUser) {
      return studentMembers.find(u => String(u.id) === String(currentUser.id)) || currentUser;
    }
    return studentMembers[0] || null;
  }, [activeTargetStudentId, isStudentRole, currentUser, studentMembers]);

  const [selectedStudent, setSelectedStudent] = useState(initialStudent);
  const [manualTestModalData, setManualTestModalData] = useState({ isOpen: false, data: null });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  React.useEffect(() => {
    if (activeTargetStudentId) {
      const match = studentMembers.find(u => String(u.id) === String(activeTargetStudentId));
      if (match) setSelectedStudent(match);
    } else if (isStudentRole && currentUser) {
      const match = studentMembers.find(u => String(u.id) === String(currentUser.id)) || currentUser;
      setSelectedStudent(match);
    }
  }, [activeTargetStudentId, isStudentRole, currentUser, studentMembers]);

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
  const [viewMode, setViewMode]       = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'cards' : 'table'));
  const [trendSubject, setTrendSubject] = useState('all');
  const [byTypeTab, setByTypeTab]       = useState('homework');
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [perfViewMode, setPerfViewMode] = useState('radar'); // 'radar' | 'bars'
  const [subjChartType, setSubjChartType] = useState('bar'); // 'bar' | 'radar' | 'pie'
  const [selectedSubjFilter, setSelectedSubjFilter] = useState('all');
  const [topicChartSort, setTopicChartSort] = useState('accuracy_desc'); // 'accuracy_desc' | 'accuracy_asc' | 'totalQ_desc'

  const typeConfig = useMemo(() => getTypeConfig(isDark), [isDark]);
  const theme = (key) => getSubjectTheme(key, isDark);

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

  /* ── Build studentSubmissions ─── */
  const studentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];

    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');

    const activeHws = (homeworks || []).filter(hw => {
      if (!hw || !hw.id) return false;
      return isHomeworkForStudent(hw, selectedStudent, curData?.grades);
    });

    const isEval = (sub, isOpenEnded = false) => {
      if (!isOpenEnded) return true;
      if (!sub) return false;

      const rawObj = sub.raw_data || {};
      const hasTeacherGradingHeader = Boolean(
        sub.isEvaluatedByTeacher === true ||
        rawObj.isEvaluatedByTeacher === true ||
        sub.isEvaluated === true ||
        rawObj.isEvaluated === true ||
        sub.status === 'evaluated' ||
        sub.status === 'graded' ||
        rawObj.status === 'evaluated' ||
        rawObj.status === 'graded' ||
        sub.teacherFeedback ||
        sub.teacherNote ||
        rawObj.teacherFeedback ||
        rawObj.teacherNote ||
        (sub.evaluatedAt && (sub.teacherFeedback || sub.teacherNote || sub.isEvaluatedByTeacher)) ||
        (rawObj.evaluatedAt && (rawObj.teacherFeedback || rawObj.teacherNote || rawObj.isEvaluatedByTeacher))
      );
      if (hasTeacherGradingHeader) return true;

      if (Array.isArray(sub.answers) && sub.answers.length > 0) {
        const hasEvaluatedAnswers = sub.answers.some(a => 
a.evaluatedAt || 
          a.teacherNote || 
          a.teacher_note || 
          a.feedback || 
          (typeof a.score === 'number' && a.score > 0) || 
          (typeof a.earnedScore === 'number' && a.earnedScore > 0) ||
          a.evalStatus === 'graded' ||
          a.evalStatus === 'evaluated'
        );
        if (hasEvaluatedAnswers) return true;
      }

      if (sub.status === 'pending' || sub.status === 'pending_evaluation' || rawObj.status === 'pending' || rawObj.status === 'pending_evaluation') {
        return false;
      }

      return false;
    };
    const results = [];
    const processedTestKeys = new Set();
    const allHomeworkIds = new Set();
    const compositeSectionIds = new Set();

    const isBookHomework = (hw) => Boolean(
      hw?.isBookAssignment ||
      hw?.bookId ||
      hw?.sourceType === 'trackedBook' ||
      hw?.title?.includes('(Tüm Kitap Görevi)') ||
      hw?.title?.includes('(Tüm Kitap)') ||
      hw?.title?.includes('(Kendi Eklediğim)') ||
      (books && Array.isArray(books) && books.some(b => 
        String(b.id) === String(hw.id) ||
        String(b.id) === String(hw.bookId) ||
        (b.title && hw.title && (hw.title.toLowerCase().includes(b.title.toLowerCase()) || b.title.toLowerCase().includes(hw.title.toLowerCase())))
      ))
    );

    const isMatchStudent = (s) => {
      if (!s) return false;
      const sid = String(s.studentId ?? s.userId ?? s.student_id ?? '');
      return sid === studentIdStr || (studentUuidStr && sid === studentUuidStr) || (studentUuidStr && toUUID(sid) === studentUuidStr);
    };

    const hasOEWordInTitle = (t) => {
      const s = String(t || '').toLowerCase();
      return s.includes('açık') || s.includes('acik') || s.includes('yazılı') || s.includes('yazili') || s.includes('klasik');
    };

    // 1. Process Homework Submissions (Both regular and book assignments)
    (homeworks || []).forEach(hw => {
      if (!hw || !hw.id) return;
      if (curData?.grades && !isHomeworkForStudent(hw, selectedStudent, curData.grades)) return;

      const isBookHw = isBookHomework(hw);
      const allMatchingSubs = [
        ...(hw.submissions || []).filter(isMatchStudent),
        ...(submissions || []).filter(s => isMatchStudent(s) && (
          String(s.hwId) === String(hw.id) ||
          String(s.homeworkId) === String(hw.id) ||
          String(s.testId) === String(hw.id) ||
          String(s.id) === String(hw.id) ||
          String(s.id) === `hw_sub_${hw.id}_${selectedStudent.id}`
        ))
      ].filter(s => s && s.status !== 'in_progress' && s.status !== 'draft');

      if (allMatchingSubs.length === 0) return;

      // Group matching submissions (in case multi-test or retakes exist)
      allMatchingSubs.forEach(sub => {
        if (!sub) return;
        const subIdStr = String(sub.id || sub.submissionId || `hw_${hw.id}_${selectedStudent.id}`);
        if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
        if (sub.status === 'in_progress' || sub.status === 'draft') return;
        const raw = sub.raw_data || {};
        if (raw.status === 'draft' || raw.status === 'in_progress') return;

        if (processedTestKeys.has(subIdStr)) return;
        processedTestKeys.add(subIdStr);
        if (sub.id) processedTestKeys.add(String(sub.id));
        if (sub.submissionId) processedTestKeys.add(String(sub.submissionId));
        if (sub.supabaseId) processedTestKeys.add(String(sub.supabaseId));

        let testObj = (bookTests || []).find(bt => String(bt.id) === String(sub.bookTestId || sub.testId || hw.id) || (toUUID(bt.id) && String(toUUID(bt.id)) === String(sub.bookTestId || sub.testId || hw.id)));
        let bookObj = (books || []).find(b => String(b.id) === String(sub.bookId || raw.bookId || hw.bookId || testObj?.bookId) || (toUUID(b.id) && String(toUUID(b.id)) === String(sub.bookId || raw.bookId || hw.bookId || testObj?.bookId)));

        if (!testObj && books && Array.isArray(books)) {
          for (const b of books) {
            if (b.subjects && Array.isArray(b.subjects)) {
              for (const s of b.subjects) {
                if (s.tests && Array.isArray(s.tests)) {
                  const ft = s.tests.find(t => String(t.id) === String(sub.bookTestId || sub.testId || hw.id));
                  if (ft) { testObj = { ...ft, bookId: b.id, subjectId: s.id }; if (!bookObj) bookObj = b; break; }
                }
                if (s.topics && Array.isArray(s.topics)) {
                  for (const tp of s.topics) {
                    if (tp.tests && Array.isArray(tp.tests)) {
                      const ft = tp.tests.find(t => String(t.id) === String(sub.bookTestId || sub.testId || hw.id));
                      if (ft) { testObj = { ...ft, bookId: b.id, subjectId: s.id, topicId: tp.id }; if (!bookObj) bookObj = b; break; }
                    }
                  }
                }
              }
            }
            if (testObj) break;
          }
        }

        const rawBookTitle = sub.bookTitle || raw.bookTitle || bookObj?.title || (isBookHw ? hw.title : '') || '';
        const cleanBookTitle = rawBookTitle ? rawBookTitle.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim() : '';

        const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
        const subjectName = sub.subject || raw.subject || subjObj?.name || hw.subject || bookObj?.subject || 'Genel';
        const testName = sub.testTitle || raw.testTitle || sub.title || testObj?.name || hw.title || 'Ödev Testi';

        const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(testObj?.topicId || raw.topicId));
        const topicName = sub.unitTopic || sub.topic || sub.unit || sub.topicName || sub.unitName || topicObj?.name || testObj?.topicName || testObj?.unit || raw.topic || raw.unit || '';

        const fullTestTitle = cleanBookTitle
          ? (topicName ? `${cleanBookTitle} — ${subjectName} › ${topicName} (${testName})` : `${cleanBookTitle} — ${subjectName} (${testName})`)
          : (topicName ? `${subjectName} › ${topicName} (${testName})` : testName);

        const isOpenEnded = Boolean(
          hasOEWordInTitle(fullTestTitle) ||
          hasOEWordInTitle(hw.title) ||
          hw.questionType === 'acik_uclu' ||
          hw.type === 'acik_uclu' ||
          sub.isOpenEnded ||
          raw.isOpenEnded ||
          (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.userAnswerText))
        );
        const isEvaluated = isEval(sub, isOpenEnded);
        const isPendingEval = isOpenEnded && !isEvaluated;

        let correct = sub.correctCount ?? raw.correctCount ?? 0;
        let wrong = sub.wrongCount ?? raw.wrongCount ?? 0;
        let blank = sub.blankCount ?? raw.blankCount ?? 0;
        let pending = sub.pendingCount ?? raw.pendingCount ?? 0;

        if (sub.isEvaluatedByTeacher && typeof sub.correctCount === 'number') {
          correct = Number(sub.correctCount);
          wrong = Number(sub.wrongCount ?? 0);
          blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
        } else if (Array.isArray(sub.answers) && sub.answers.length > 0) {
          let aCorr = 0, aWrong = 0, aEmpty = 0, aPend = 0;
          sub.answers.forEach((ans, aIdx) => {
            const userAns = ans.userAnswer;
            const isOE = Boolean(ans.isOpenEnded || ans.is_open_ended || ans.userAnswerText);
            const numScore = ans.score !== undefined && ans.score !== null && ans.score !== 'empty' ? Number(ans.score) : null;
            const isBlankAns = ans.evalStatus === 'empty' || ans.score === 'empty' || ((userAns === null || userAns === undefined || userAns === '' || userAns === 'empty') && (!ans.userAnswerText || String(ans.userAnswerText).trim() === ''));

            if (isBlankAns) { aEmpty++; return; }
            if (isOE || numScore !== null) {
              if (ans.isCorrect === true || (numScore !== null && numScore >= 5)) aCorr++;
              else if (ans.isCorrect === false || ans.evalStatus === 'wrong' || (numScore !== null && numScore < 5 && ans.evaluatedByTeacher)) aWrong++;
              else aPend++;
            } else if (ans.isCorrect === true) aCorr++;
            else if (ans.isCorrect === false) aWrong++;
            else if (userAns !== null && userAns !== undefined && userAns !== '' && ans.correctAnswer !== undefined) {
              if (String(userAns).trim().toUpperCase() === String(ans.correctAnswer).trim().toUpperCase()) aCorr++;
              else aWrong++;
            } else aCorr++;
          });
          correct = aCorr; wrong = aWrong; blank = aEmpty; pending = aPend;
        }

        const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
        const sumCount = correct + wrong + blank + pending;
        const isSingleSub = sub.sourceType === 'study_room_optical' || sub.sourceType === 'bookTest' || isBookHw || Boolean(testObj);
        let rawTotal = isSingleSub ? (testObj?.questionCount || ansCount) : (hw.totalQuestions || hw.questionCount || sub.totalQuestions || raw.totalQuestions || 0);
        let total = Math.max(rawTotal, ansCount, sumCount, 1);

        if (correct === 0 && wrong === 0 && blank === 0 && ansCount === 0 && !sub.submittedAt) return;
        if (isSingleSub && total >= (correct + wrong)) {
          blank = Math.max(0, total - (correct + wrong));
        }

        let score = 0;
        if (total > 0 && typeof correct === 'number' && (correct > 0 || wrong > 0 || blank > 0)) {
          score = Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
        } else if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) {
          score = Math.min(100, Math.max(0, Math.round(sub.scorePercentage)));
        } else if (typeof sub.score === 'number' && !isNaN(sub.score) && sub.score > 0 && sub.score <= 100) {
          score = Math.min(100, Math.max(0, Math.round(sub.score)));
        }

        let calcNet = (correct > 0 || wrong > 0)
          ? Number(((correct || 0) - ((wrong || 0) / 4)).toFixed(2))
          : (sub.totalNet !== undefined && sub.totalNet !== null ? Number(sub.totalNet) : 0);

        if (!isSingleSub) {
          const unifiedStats = computeUnifiedSubmissionStats(sub, hw, allBankQuestions || []);
          if (unifiedStats) {
            correct = unifiedStats.correct; wrong = unifiedStats.wrong; blank = unifiedStats.blank;
            total = unifiedStats.total; score = unifiedStats.scorePct; calcNet = unifiedStats.netScore;
          }
        }

        const isPhysicalExam = hw.type === 'physicalExam' || hw.isPhysicalExam;
        const isBook = Boolean(isBookHw || bookObj || testObj || cleanBookTitle);
        const typeKey = isPhysicalExam ? 'physicalExam' : isBook ? 'book' : 'homework';

        results.push({
          ...sub,
          id: subIdStr,
          testId: testObj?.id || hw.id,
          bookId: bookObj?.id || hw.bookId || sub.bookId || null,
          bookTitle: cleanBookTitle,
          subjectName,
          topicName,
          testName,
          testTitle: fullTestTitle,
          subjectKey: getSubjectKey({ testTitle: fullTestTitle, subjectKey: subjectName }),
          typeKey,
          isEvaluated,
          isOpenEnded,
          isPendingEval,
          correctCount: correct,
          wrongCount: wrong,
          blankCount: blank,
          pendingCount: pending,
          totalQuestions: total,
          computedScore: score,
          totalNet: calcNet,
          submittedAt: sub.submittedAt || sub.completedAt || raw.submittedAt || hw.createdAt || new Date().toISOString()
        });
      });
    });

    // 2. Process all standalone test submissions (Book tests, Question bank tests, Study Room, Manual tests)
    (submissions || []).forEach(sub => {
      if (!sub) return;
      if (!isMatchStudent(sub)) return;

      const subIdStr = String(sub.id || sub.submissionId || sub.supabaseId || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
      if (sub.status === 'in_progress' || sub.status === 'draft') return;
      const raw = sub.raw_data || {};
      if (raw.status === 'draft' || raw.status === 'in_progress') return;

      // Skip if already processed in Step 1
      if (sub.id && processedTestKeys.has(String(sub.id))) return;
      if (sub.submissionId && processedTestKeys.has(String(sub.submissionId))) return;
      if (sub.supabaseId && processedTestKeys.has(String(sub.supabaseId))) return;

      const bTestId = String(sub.bookTestId || sub.testId || sub.realTestId || raw.bookTestId || raw.testId || '');
      let correct = sub.correctCount ?? raw.correctCount ?? 0;
      let wrong = sub.wrongCount ?? raw.wrongCount ?? 0;
      let blank = sub.blankCount ?? raw.blankCount ?? 0;
      let pending = sub.pendingCount ?? raw.pendingCount ?? 0;

      if (sub.isEvaluatedByTeacher && typeof sub.correctCount === 'number') {
        correct = Number(sub.correctCount);
        wrong = Number(sub.wrongCount ?? 0);
        blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
      } else if (Array.isArray(sub.answers) && sub.answers.length > 0) {
        let aCorr = 0, aWrong = 0, aEmpty = 0, aPend = 0;
        sub.answers.forEach((ans, aIdx) => {
          const qNo = ans.questionNoInSection || ans.questionNo || (aIdx + 1);
          const userAns = ans.userAnswer;
          const isOE = Boolean(ans.isOpenEnded || ans.is_open_ended || ans.userAnswerText);
          const numScore = ans.score !== undefined && ans.score !== null && ans.score !== 'empty' ? Number(ans.score) : null;
          const isBlankAns = ans.evalStatus === 'empty' || ans.score === 'empty' || ((userAns === null || userAns === undefined || userAns === '' || userAns === 'empty') && (!ans.userAnswerText || String(ans.userAnswerText).trim() === ''));

          if (isBlankAns) { aEmpty++; return; }
          if (isOE || numScore !== null) {
            if (ans.isCorrect === true || (numScore !== null && numScore >= 5)) aCorr++;
            else if (ans.isCorrect === false || ans.evalStatus === 'wrong' || (numScore !== null && numScore < 5 && ans.evaluatedByTeacher)) aWrong++;
            else aPend++;
            return;
          }

          const hasOption = userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty';
          if (!hasOption) { aEmpty++; return; }

          const resolvedCorrect = resolveQuestionCorrectAnswer(qNo, null, ans, sub, []);
          const uLetter = formatAnswerLetter(userAns);
          const cLetter = formatAnswerLetter(resolvedCorrect);

          let isRight = null;
          if (uLetter && cLetter) isRight = (uLetter === cLetter);
          else if (ans.isCorrect !== undefined && ans.isCorrect !== null) isRight = ans.isCorrect;
          else isRight = checkIsAnswerCorrect(userAns, null, sub, qNo);

          if (isRight === true) aCorr++;
          else if (isRight === false) aWrong++;
          else aEmpty++;
        });

        if (aCorr > 0 || aWrong > 0 || aEmpty > 0) {
          correct = aCorr; wrong = aWrong; blank = aEmpty; pending = aPend;
        }
      }

      if (correct === 0 && wrong === 0 && blank === 0 && pending === 0 && (!sub.answers || sub.answers.length === 0)) return;

      const isManual = Boolean(
        sub.isManual === true ||
        sub.sourceType === 'manual_test' ||
        raw.isManual === true ||
        raw.sourceType === 'manual_test' ||
        String(sub.id || '').startsWith('sub_manual') ||
        String(bTestId).startsWith('sub_manual')
      );

      let testObj = (bookTests || []).find(bt => String(bt.id) === bTestId || (toUUID(bt.id) && String(toUUID(bt.id)) === bTestId));
      let bookObj = (books || []).find(b => String(b.id) === String(sub.bookId || raw.bookId || testObj?.bookId) || (toUUID(b.id) && String(toUUID(b.id)) === String(sub.bookId || raw.bookId || testObj?.bookId)));

      if (!testObj && books && Array.isArray(books)) {
        for (const b of books) {
          if (b.subjects && Array.isArray(b.subjects)) {
            for (const s of b.subjects) {
              if (s.tests && Array.isArray(s.tests)) {
                const ft = s.tests.find(t => String(t.id) === bTestId || (toUUID(t.id) && String(toUUID(t.id)) === bTestId));
                if (ft) { testObj = { ...ft, bookId: b.id, subjectId: s.id }; if (!bookObj) bookObj = b; break; }
              }
              if (s.topics && Array.isArray(s.topics)) {
                for (const tp of s.topics) {
                  if (tp.tests && Array.isArray(tp.tests)) {
                    const ft = tp.tests.find(t => String(t.id) === bTestId || (toUUID(t.id) && String(toUUID(t.id)) === bTestId));
                    if (ft) { testObj = { ...ft, bookId: b.id, subjectId: s.id, topicId: tp.id }; if (!bookObj) bookObj = b; break; }
                  }
                }
              }
            }
          }
          if (testObj) break;
        }
      }

      const curInfo = allCurTestsMap.get(bTestId) || {};
      const bankQ = (allBankQuestions || []).find(q => String(q.id) === bTestId || (toUUID(q.id) && String(toUUID(q.id)) === bTestId));

      const rawBookTitle = sub.bookTitle || raw.bookTitle || bookObj?.title || '';
      let cleanBookTitle = rawBookTitle ? rawBookTitle.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim() : '';

      const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
      let subjectName = sub.subject || raw.subject || subjObj?.name || bookObj?.subject || bankQ?.subject || curInfo?.subject || 'Genel';
      let testName = testObj?.name || sub.testTitle || raw.testTitle || sub.title || bankQ?.title || bankQ?.name || curInfo?.title || 'Test';

      const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(testObj?.topicId || raw.topicId));
      let topicName = sub.unitTopic || sub.topic || sub.unit || sub.topicName || sub.unitName || topicObj?.name || testObj?.topicName || testObj?.unit || testObj?.unitName || raw.topic || raw.unit || '';

      let fullTestTitle = sub.testTitle || raw.testTitle || '';
      if (!fullTestTitle || fullTestTitle === 'Test') {
        fullTestTitle = cleanBookTitle
          ? (topicName ? `${cleanBookTitle} — ${subjectName} › ${topicName} (${testName})` : `${cleanBookTitle} — ${subjectName} (${testName})`)
          : (topicName ? `${subjectName} › ${topicName} (${testName})` : testName);
      }

      const isSingleTestSubmission = Boolean(
        sub.sourceType === 'study_room_optical' ||
        sub.sourceType === 'bookTest' ||
        sub.bookTestId ||
        testObj ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && (!sub.sections || Object.keys(sub.sections || {}).length <= 1))
      );

      const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
      const sumCount = correct + wrong + blank + pending;
      const rawTotal = sub.totalQuestions || raw.totalQuestions || (isSingleTestSubmission ? (testObj?.questionCount || ansCount) : (testObj?.questionCount || bankQ?.questionCount || 0));
      let total = Math.max(rawTotal, ansCount, sumCount, 1);

      const isOpenEnded = Boolean(
        sub.isOpenEnded ||
        sub.questionType === 'acik_uclu' ||
        sub.type === 'acik_uclu' ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.userAnswerText))
      );
      const isEvaluated = isEval(sub, isOpenEnded);
      const isPendingEval = isOpenEnded && !isEvaluated;

      if (isSingleTestSubmission && total >= (correct + wrong)) {
        blank = Math.max(0, total - (correct + wrong));
      }

      let scorePct = 0;
      if (total > 0 && typeof correct === 'number' && (correct > 0 || wrong > 0 || blank > 0)) {
        scorePct = Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
      } else if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) {
        scorePct = Math.min(100, Math.max(0, Math.round(sub.scorePercentage)));
      } else if (typeof sub.score === 'number' && !isNaN(sub.score) && sub.score > 0 && sub.score <= 100) {
        scorePct = Math.min(100, Math.max(0, Math.round(sub.score)));
      }

      let calcNet = (correct > 0 || wrong > 0)
        ? Number(((correct || 0) - ((wrong || 0) / 4)).toFixed(2))
        : (sub.totalNet !== undefined && sub.totalNet !== null ? Number(sub.totalNet) : 0);

      const isPendingApproval = isManual && (sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected'));
      const isRejected = isManual && (sub.approvalStatus === 'rejected' || sub.status === 'rejected');

      const isPhysicalExam = Boolean(
        sub.type === 'physicalExam' ||
        sub.sourceFormat === 'physicalExam' ||
        sub.bookType === 'exam' ||
        bookObj?.bookType === 'exam'
      );

      const isBook = Boolean(
        bookObj ||
        testObj ||
        sub.sourceType === 'trackedBook' ||
        raw.sourceType === 'trackedBook' ||
        sub.sourceType === 'bookTest' ||
        raw.sourceType === 'bookTest' ||
        sub.bookId ||
        raw.bookId ||
        sub.bookTestId ||
        raw.bookTestId ||
        cleanBookTitle
      );

      const typeKey = isPhysicalExam ? 'physicalExam' : isManual ? 'individual' : isBook ? 'book' : 'homework';

      if (sub.id) processedTestKeys.add(String(sub.id));
      if (sub.submissionId) processedTestKeys.add(String(sub.submissionId));
      if (sub.supabaseId) processedTestKeys.add(String(sub.supabaseId));

      results.push({
        ...sub,
        id: subIdStr || `sub_${bTestId || Date.now()}_${selectedStudent?.id || 'anon'}`,
        testId: testObj?.id || bTestId || sub.id,
        bookId: bookObj?.id || sub.bookId || raw.bookId || null,
        bookTitle: cleanBookTitle,
        subjectName,
        topicName,
        testName,
        testTitle: fullTestTitle,
        subjectKey: getSubjectKey({ testTitle: fullTestTitle, subjectKey: subjectName }),
        typeKey,
        isEvaluated,
        isOpenEnded,
        isPendingEval,
        isManual,
        isPendingApproval,
        isRejected,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
        pendingCount: pending,
        totalQuestions: total,
        computedScore: scorePct,
        totalNet: calcNet,
        submittedAt: sub.submittedAt || sub.completedAt || raw.submittedAt || sub.createdAt || new Date().toISOString()
      });
    });

    // Final deduplication pass on results: Deduplicate ONLY by identical submission records
    const finalResults = [];
    const seenSubRecordKeys = new Set();

    for (const r of results) {
      if (!r) continue;
      const subKey = String(r.id || r.submissionId || r.supabaseId || `${r.testId}_${r.submittedAt}`);
      if (!seenSubRecordKeys.has(subKey)) {
        seenSubRecordKeys.add(subKey);
        finalResults.push(r);
      }
    }

    return finalResults.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [homeworks, submissions, selectedStudent, curData, books, bookTests, allCurTestsMap, allBankQuestions]);

  /* ── Overall Stats ─── */
  const overallStats = useMemo(() => {
    const eligibleSubs = studentSubmissions.filter(s => !s.isPendingApproval && !s.isPendingEval && !s.isRejected);
    const total = eligibleSubs.length;
    if (total === 0) return { total: 0, avgScore: 0, maxScore: 0, totalQ: 0, totalCorrect: 0, weakSubjects: 0, completedCount: 0 };
    let sumScore = 0, max = 0, totalQ = 0, totalCorrect = 0;
    eligibleSubs.forEach(s => {
      sumScore += s.computedScore || 0;
      if (s.computedScore > max) max = s.computedScore;
      totalQ += s.totalQuestions || 0;
      totalCorrect += s.correctCount || 0;
    });

    const successRate = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : (total > 0 ? Math.round(sumScore / total) : 0);

    const subjectAvgs = {};
    eligibleSubs.forEach(s => {
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
      completedCount: eligibleSubs.filter(s => s.status !== 'pending_evaluation').length,
    };
  }, [studentSubmissions]);

  /* ── Radar data ─── */
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
        theme: getSubjectTheme(s, isDark)
      };
    });
  }, [studentSubmissions, isDark]);

  /* ── Pie / type breakdown ─── */
  const typeBreakdown = useMemo(() => {
    const counts = { physicalExam: 0, homework: 0, book: 0, individual: 0 };
    studentSubmissions.forEach(s => { counts[s.typeKey] = (counts[s.typeKey] || 0) + 1; });
    return [
      { name: 'Ödevler', value: counts.homework, fill: '#f97316' },
      { name: 'Kitap Testleri', value: counts.book, fill: '#10b981' },
      { name: 'Denemeler', value: counts.physicalExam, fill: '#8b5cf6' },
      { name: 'Bireysel', value: counts.individual, fill: '#64748b' }
    ].filter(item => item.value > 0);
  }, [studentSubmissions]);

  /* ── Subject & Topic Breakdown ─── */
  const subjectBreakdown = useMemo(() => {
    const map = {};
    studentSubmissions.forEach(s => {
      const subj = s.subjectKey;
      if (!map[subj]) {
        map[subj] = {
          subj,
          tests: [],
          topics: {},
          totalQ: 0,
          totalCorrect: 0,
          totalWrong: 0,
          totalBlank: 0,
          sumScore: 0
        };
      }
      map[subj].tests.push(s);
      map[subj].totalQ += s.totalQuestions || 0;
      map[subj].totalCorrect += s.correctCount || 0;
      map[subj].totalWrong += s.wrongCount || 0;
      map[subj].totalBlank += s.blankCount || 0;
      map[subj].sumScore += s.computedScore || 0;

      const topicName = s.topicName || s.testName || s.testTitle || 'Genel Konu';
      if (!map[subj].topics[topicName]) {
        map[subj].topics[topicName] = {
          name: topicName,
          totalQ: 0,
          correctQ: 0,
          wrongQ: 0,
          blankQ: 0,
          testCount: 0
        };
      }
      map[subj].topics[topicName].totalQ += s.totalQuestions || 0;
      map[subj].topics[topicName].correctQ += s.correctCount || 0;
      map[subj].topics[topicName].wrongQ += s.wrongCount || 0;
      map[subj].topics[topicName].blankQ += s.blankCount || 0;
      map[subj].topics[topicName].testCount++;
    });

    return Object.values(map).map(entry => {
      const testCount = entry.tests.length;
      const avgScore = entry.totalQ > 0
        ? Math.round((entry.totalCorrect / entry.totalQ) * 100)
        : (testCount > 0 ? Math.round(entry.sumScore / testCount) : 0);

      const topicArray = Object.values(entry.topics).map(t => ({
        ...t,
        accuracy: t.totalQ > 0 ? Math.round((t.correctQ / t.totalQ) * 100) : 0
      })).sort((a, b) => b.accuracy - a.accuracy);

      return {
        ...entry,
        avgScore,
        topicArray
      };
    }).sort((a, b) => b.totalQ - a.totalQ);
  }, [studentSubmissions]);

  /* ── Trend chart data ─── */
  const trendData = useMemo(() => {
    const list = [...studentSubmissions].reverse();
    return list.map((s, idx) => {
      const d = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }) : `#${idx + 1}`;
      return {
        name: d,
        title: s.testTitle,
        ders: s.subjectKey,
        'Başarı %': s.computedScore,
        Doğru: s.correctCount,
        Yanlış: s.wrongCount,
        Boş: s.blankCount
      };
    });
  }, [studentSubmissions]);

  /* ── Filtered submissions for 'all' tab ─── */
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

  /* ── Top Best / Weak Topics ─── */
  const { topBestTopics, topWeakTopics } = useMemo(() => {
    const allTopics = [];
    subjectBreakdown.forEach(sb => {
      sb.topicArray.forEach(t => {
        allTopics.push({ ...t, subject: sb.subj });
      });
    });
    const valid = allTopics.filter(t => t.totalQ >= 3);
    const best = [...valid].sort((a, b) => b.accuracy - a.accuracy).slice(0, 4);
    const weak = [...valid].filter(t => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
    return { topBestTopics: best, topWeakTopics: weak };
  }, [subjectBreakdown]);

  /* ── Subject Bar & Pie Data ─── */
  const subjectBarData = useMemo(() => {
    return subjectBreakdown.map(sb => ({
      name: sb.subj,
      'Başarı %': sb.avgScore,
      'Soru Sayısı': sb.totalQ,
      barColor: getSubjectTheme(sb.subj, isDark).color
    }));
  }, [subjectBreakdown, isDark]);

  const subjectPieData = useMemo(() => {
    return subjectBreakdown
      .filter(sb => (sb.totalQ || 0) > 0)
      .map(sb => ({
        name: sb.subj,
        value: sb.totalQ,
        totalQ: sb.totalQ,
        'Soru Sayısı': sb.totalQ,
        'Başarı %': sb.avgScore,
        avgScore: sb.avgScore,
        correctQ: sb.totalCorrect,
        wrongQ: sb.totalWrong,
        blankQ: sb.totalBlank,
        'Doğru': sb.totalCorrect,
        'Yanlış': sb.totalWrong,
        'Boş': sb.totalBlank,
        color: getSubjectTheme(sb.subj, isDark).color
      }));
  }, [subjectBreakdown, isDark]);

  const handleOpenReview = (s) => {
    if (!s) return;
    if (s.type === 'physicalExam' || s.typeKey === 'physicalExam' || s.isPhysicalExam) {
      navigate(`/physical-exam/${s.hwId || s.testId || s.id}?studentId=${selectedStudent?.id || ''}`);
      return;
    }
    const isBook = s.sourceType === 'bookTest' || s.typeKey === 'bookTest' || s.isBookTest || Boolean(s.bookTestId) || (s.bookId && s.testId);
    const bTestId = s.bookTestId || s.realTestId || s.testId;
    if (isBook && bTestId) {
      navigate(`/book-quiz/${bTestId}?studentId=${selectedStudent?.id || ''}`);
      return;
    }
    navigate(`/review/${s.id || s.testId || s.hwId}?studentId=${selectedStudent?.id || ''}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      padding: isMobile ? '0.75rem 0.75rem calc(65px + env(safe-area-inset-bottom) + 20px) 0.75rem' : '1.25rem 1.25rem',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: 'var(--color-text)',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sr-anim { animation: fadeSlideUp 0.3s ease both; }
        .sr-card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .sr-card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        @media (max-width: 768px) {
          .sr-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .sr-chart-grid { grid-template-columns: 1fr !important; }
          .sr-tabs-container { overflow-x: auto !important; flex-wrap: nowrap !important; justify-content: flex-start !important; -webkit-overflow-scrolling: touch; padding: 4px !important; }
          .sr-tab-btn { flex-shrink: 0 !important; font-size: 0.74rem !important; padding: 0.45rem 0.75rem !important; }
          .sr-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .sr-subject-header-btn { flex-direction: column !important; align-items: flex-start !important; }
          .sr-subject-header-right { width: 100% !important; justify-content: space-between !important; margin-top: 6px !important; }
          .sr-filter-bar { flex-direction: column !important; align-items: stretch !important; }
          .sr-filter-bar select, .sr-filter-bar input { width: 100% !important; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        {/* ── HEADER ── */}
        <div className="sr-header-wrap" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 8 : 14,
          marginBottom: isMobile ? 12 : 20
        }}>
          {isMobile ? (
            /* Sleek Native Mobile Header Bar */
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1rem',
              padding: '0.55rem 0.85rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <button
                  onClick={() => {
                    if (onBack) onBack();
                    else if (window.history.length > 1) navigate(-1);
                    else navigate(currentUser?.role === 'student' ? '/student' : '/statistics');
                  }}
                  style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 9,
                    width: 34,
                    height: 34,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text)',
                    padding: 0,
                    flexShrink: 0
                  }}
                  title="Geri"
                >
                  <ArrowLeft size={16} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Sparkles size={14} color="#6366f1" />
                    {selectedStudent ? selectedStudent.name : 'Gelişim & Karne'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                    {overallStats.total} Sınav / Test · %{overallStats.avgScore} Başarı
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.38rem 0.65rem',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Award size={13} /> Karne Al
                </button>

                <button
                  onClick={() => setManualTestModalData({ isOpen: true, data: { studentId: selectedStudent?.id } })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.38rem 0.65rem',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={13} /> Test Ekle
                </button>
              </div>
              </div>
            ) : (
              /* Desktop Header */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => {
                      if (onBack) onBack();
                      else if (window.history.length > 1) navigate(-1);
                      else navigate(currentUser?.role === 'student' ? '/student' : '/statistics');
                    }}
                    style={{
                      background: embedded ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--color-surface)',
                      border: embedded ? 'none' : '1.5px solid var(--color-border-input)',
                      borderRadius: 12,
                      padding: '0.55rem 1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      color: embedded ? '#ffffff' : 'var(--color-text)',
                      boxShadow: embedded ? '0 4px 14px rgba(99,102,241,0.3)' : '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    <ArrowLeft size={16} /> {embedded ? 'Genel İstatistiklere Dön' : 'Geri'}
                  </button>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={22} color="#6366f1" />
                      {selectedStudent ? `${selectedStudent.name} — Gelişim & Karne` : 'Gelişim Merkezi & Karne'}
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                      Ders bazlı · Konu bazlı · Ödev & Deneme ayrıntılı karne analizi
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 14,
                      padding: '0.6rem 1.15rem',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Award size={16} /> 📄 Gelişim Karnesi İndir / Yazdır
                  </button>

                  <button
                    onClick={() => setManualTestModalData({ isOpen: true, data: { studentId: selectedStudent?.id } })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 14,
                      padding: '0.6rem 1.15rem',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Plus size={16} /> ✏️ Manuel Test Sonucu Ekle
                  </button>

                  {!isStudentRole && (
                    <button
                      onClick={handleClearAllResults}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1.5px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: 14,
                        padding: '0.6rem 1rem',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      title="Seçili öğrencinin tüm sınav sonuçlarını temizle"
                    >
                      <Trash2 size={15} /> Sonuçları Temizle
                    </button>
                  )}

                {/* Student Selector */}
                {!isStudentRole ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', padding: '0.4rem 0.6rem', borderRadius: 16, border: '1.5px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                      <GraduationCap size={15} color="#6366f1" /> Öğrenci:
                    </span>
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={e => {
                        const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                        if (s) {
                          setSelectedStudent(s);
                          if (!propStudentId) setSearchParams({ studentId: s.id });
                        }
                      }}
                      style={{
                        padding: '0.45rem 1.8rem 0.45rem 0.75rem',
                        borderRadius: 10,
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text)',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {studentMembers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.className ? `(${s.className})` : s.grade ? `(${s.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', padding: '0.5rem 1rem', borderRadius: 14, border: '1.5px solid var(--color-border)', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, boxShadow: '0 2px 8px rgba(99,102,241,0.2)' }}>
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>{selectedStudent?.name || currentUser?.name || 'Öğrenci'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>Öğrenci Karnesi</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Student Selector (Teachers / Admins) */}
        {!isStudentRole && isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: 'var(--color-surface)',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.85rem',
            border: '1.5px solid var(--color-border)',
            marginBottom: 10,
            boxSizing: 'border-box'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <GraduationCap size={14} color="#6366f1" /> Öğrenci:
            </span>
            <select
              value={selectedStudent?.id || ''}
              onChange={e => {
                const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                if (s) {
                  setSelectedStudent(s);
                  if (!propStudentId) setSearchParams({ studentId: s.id });
                }
              }}
              style={{
                padding: '0.35rem 1rem 0.35rem 0.6rem',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '65%'
              }}
            >
              {studentMembers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.className ? `(${s.className})` : s.grade ? `(${s.grade})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── TABS BAR ── */}
        <div className="sr-tabs-container" style={{
          display: 'flex',
          gap: 4,
          background: 'var(--color-surface)',
          padding: 4,
          borderRadius: 14,
          border: '1.5px solid var(--color-border)',
          marginBottom: isMobile ? 14 : 22,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {TAB_DEFS.map(t => (
            <button
              key={t.key}
              className="sr-tab-btn"
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: isMobile ? '0 0 auto' : '1 1 auto',
                padding: isMobile ? '0.45rem 0.75rem' : '0.6rem 1rem',
                borderRadius: 10,
                border: 'none',
                fontWeight: activeTab === t.key ? 900 : 700,
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'all 0.15s',
                background: activeTab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: activeTab === t.key ? 'white' : 'var(--color-text-muted)',
                boxShadow: activeTab === t.key ? '0 3px 10px rgba(99,102,241,0.25)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {isMobile ? (t.shortLabel || t.label) : t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: PERIODIC ANALYTICS ── */}
        {activeTab === 'periodic' && (
          <div className="sr-anim">
            <PeriodicQuestionAnalytics
              homeworkSubmissions={otherHomeworkSubmissions}
              mockExams={generalTrialExams}
              studentName={selectedStudent?.name || currentUser?.name || 'Öğrenci'}
            />
          </div>
        )}

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 20 }}>
            {/* KPI Grid */}
            <div className="sr-kpi-grid" style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: isMobile ? 8 : 12
            }}>
              {[
                { label: 'Toplam Sınav / Test', val: overallStats.total, icon: '📋', bg: isDark ? 'rgba(37,99,235,0.18)' : '#eff6ff', border: isDark ? 'rgba(37,99,235,0.35)' : '#bfdbfe', iconBg: isDark ? 'rgba(37,99,235,0.25)' : '#dbeafe' },
                { label: 'Genel Başarı Oranı', val: `%${overallStats.avgScore}`, icon: '🎯', bg: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4', border: isDark ? 'rgba(16,185,129,0.35)' : '#bbf7d0', iconBg: isDark ? 'rgba(16,185,129,0.25)' : '#dcfce7' },
                { label: 'Toplam Çözülen Soru', val: overallStats.totalQ, icon: '⚡', bg: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb', border: isDark ? 'rgba(245,158,11,0.35)' : '#fde68a', iconBg: isDark ? 'rgba(245,158,11,0.25)' : '#fef3c7' },
                { label: 'Kritik Ders Sayısı', val: overallStats.weakSubjects, icon: '⚠️', bg: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', border: isDark ? 'rgba(239,68,68,0.35)' : '#fecaca', iconBg: isDark ? 'rgba(239,68,68,0.25)' : '#fee2e2' },
              ].map((k, i) => (
                <div key={i} style={{
                  background: 'var(--color-surface)',
                  borderRadius: isMobile ? 14 : 20,
                  padding: isMobile ? '0.75rem 0.85rem' : '1.1rem 1.25rem',
                  border: `1.5px solid ${k.border}`,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 10 : 14,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: isMobile ? 36 : 44,
                    height: isMobile ? 36 : 44,
                    borderRadius: isMobile ? 10 : 14,
                    background: k.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '1.1rem' : '1.35rem',
                    flexShrink: 0
                  }}>
                    {k.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: isMobile ? '1.15rem' : '1.45rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>
                      {k.val}
                    </div>
                    <div style={{ fontSize: isMobile ? '0.64rem' : '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {k.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row: Radar/Bar & Pie */}
            <div className="sr-chart-grid" style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr',
              gap: isMobile ? 12 : 16
            }}>
              {/* Performance Radar/Bar */}
              <div style={{ background: 'var(--color-surface)', borderRadius: isMobile ? 16 : 22, padding: isMobile ? '1rem' : '1.35rem', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? '0.92rem' : '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={18} color="#6366f1" /> Ders Yetkinlik Grafiği
                  </h3>
                  <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 2, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => setPerfViewMode('radar')}
                      style={{
                        padding: isMobile ? '0.25rem 0.55rem' : '0.3rem 0.65rem',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: perfViewMode === 'radar' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                        color: perfViewMode === 'radar' ? 'white' : 'var(--color-text-muted)'
                      }}
                    >
                      Radar
                    </button>
                    <button
                      onClick={() => setPerfViewMode('bars')}
                      style={{
                        padding: isMobile ? '0.25rem 0.55rem' : '0.3rem 0.65rem',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: perfViewMode === 'bars' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                        color: perfViewMode === 'bars' ? 'white' : 'var(--color-text-muted)'
                      }}
                    >
                      Sütun
                    </button>
                  </div>
                </div>

                {perfViewMode === 'radar' ? (
                  <div style={{ width: '100%', height: isMobile ? 220 : 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--color-border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text)', fontSize: isMobile ? 9 : 11, fontWeight: 800 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--color-border)" tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }} />
                        <Radar name="Başarı %" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} strokeWidth={2.5} />
                        <Tooltip content={<CustomSubjectTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: isMobile ? 220 : 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={radarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="subject" tick={{ fill: 'var(--color-text)', fontSize: isMobile ? 10 : 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `%${v}`} />
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <Bar dataKey="value" name="Başarı" radius={[8, 8, 0, 0]}>
                          {radarData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.theme?.color || '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Subject Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(135px, 1fr))', gap: 6, marginTop: 12, borderTop: '1.5px solid var(--color-border)', paddingTop: 12 }}>
                  {radarData.map((d, i) => {
                    const hasTests = d.count > 0;
                    const SubIcon = d.theme?.icon || BookOpen;
                    const color = d.theme?.color || '#3b82f6';
                    const isGood = d.value >= 70;
                    const isMid = d.value >= 50 && d.value < 70;

                    return (
                      <div
                        key={i}
                        style={{
                          background: 'var(--color-surface-hover)',
                          borderRadius: 12,
                          padding: '0.55rem 0.65rem',
                          border: `1.5px solid ${hasTests ? d.theme?.border : 'var(--color-border)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, background: d.theme?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <SubIcon size={11} color={color} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.fullSubject}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            color: hasTests ? (isGood ? '#10b981' : isMid ? '#f59e0b' : '#ef4444') : 'var(--color-text-muted)',
                            flexShrink: 0
                          }}>
                            {hasTests ? `%${d.value}` : '—'}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '100%', height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${hasTests ? d.value : 0}%`,
                              background: hasTests ? (isGood ? '#10b981' : isMid ? '#f59e0b' : '#ef4444') : 'transparent',
                              borderRadius: 99,
                              transition: 'width 0.6s ease'
                            }}
                          />
                        </div>

                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          {hasTests ? `${d.count} Test · ${d.totalQ} Soru` : 'Henüz test yok'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie + Legend */}
              <div style={{ background: 'var(--color-surface)', borderRadius: isMobile ? 16 : 22, padding: isMobile ? '1rem' : '1.4rem', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', minWidth: 0, overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: isMobile ? '0.92rem' : '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📊 Ödev Türü Dağılımı
                </h3>
                {typeBreakdown.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: isMobile ? 150 : 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={isMobile ? 38 : 50} outerRadius={isMobile ? 62 : 78} dataKey="value" paddingAngle={4}>
                            {typeBreakdown.map((e, i) => <Cell key={i} fill={e.fill} stroke="var(--color-surface)" strokeWidth={2} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {typeBreakdown.map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', fontWeight: 800, background: 'var(--color-surface-hover)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: e.fill, flexShrink: 0 }} />
                          <span style={{ color: 'var(--color-text-muted)' }}>{e.name}: <b style={{ color: 'var(--color-text)' }}>{e.value}</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0', fontWeight: 700 }}>Henüz veri yok</div>
                )}
              </div>
            </div>

            {/* Recent 5 Tests */}
            <div style={{ background: 'var(--color-surface)', borderRadius: isMobile ? 16 : 22, padding: isMobile ? '1rem' : '1.4rem', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: isMobile ? '0.92rem' : '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🕒 Son 5 Sınav / Ödev
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studentSubmissions.slice(0, 5).map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div
                      key={i}
                      className="sr-card-hover"
                      style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? 8 : 12,
                        padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.1rem',
                        borderRadius: 14,
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <SubIcon size={17} color={th.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ background: typeConfig[s.typeKey]?.bg, color: typeConfig[s.typeKey]?.color, border: `1px solid ${typeConfig[s.typeKey]?.border}`, borderRadius: 5, padding: '1px 5px', fontSize: '0.64rem', fontWeight: 900 }}>
                              {typeConfig[s.typeKey]?.label}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                              {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--color-text)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                            {s.bookTitle ? (
                              <>
                                <span style={{ color: '#6366f1', fontWeight: 900 }}>{s.bookTitle}</span>
                                <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>—</span>
                                <span>{s.subjectName || s.subjectKey}</span>
                                {s.topicName && <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}> › {s.topicName}</span>}
                                <span style={{ color: 'var(--color-text)', fontWeight: 900 }}> ({s.testName})</span>
                              </>
                            ) : (
                              s.testTitle
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isMobile ? 'space-between' : 'flex-end',
                        gap: 8,
                        flexWrap: 'wrap',
                        borderTop: isMobile ? '1px solid var(--color-border)' : 'none',
                        paddingTop: isMobile ? 6 : 0
                      }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {s.isPendingEval ? (
                            <span style={{ background: isDark ? 'rgba(124,58,237,0.18)' : '#f5f3ff', color: '#7c3aed', border: isDark ? '1px solid rgba(124,58,237,0.35)' : '1px solid #ddd6fe', borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              ⏳ Değerlendirmede
                            </span>
                          ) : (
                            <>
                              <span style={{ background: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4', color: '#10b981', border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                              <span style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                              <span style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>— {s.blankCount}</span>
                            </>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} isPendingApproval={s.isPendingApproval} isRejected={s.isRejected} isDark={isDark} size="sm" />

                          <button onClick={() => handleOpenReview(s)} style={{ background: s.type === 'physicalExam' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, padding: '0.38rem 0.75rem', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                            <Eye size={12} /> {s.type === 'physicalExam' ? 'Karne' : 'İncele'}
                          </button>
                          {!isStudentRole && (
                            <button
                              onClick={(e) => handleDeleteResult(s, e)}
                              title="Bu Sınavı Kalıcı Olarak Sil"
                              style={{
                                background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
                                color: '#ef4444',
                                border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca',
                                borderRadius: 8,
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {studentSubmissions.length === 0 && (
                  <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0', fontWeight: 700 }}>Henüz çözülmüş test veya deneme kaydı yok.</div>
                )}
              </div>
            </div>

            {/* Strength / Weakness Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Best Topics */}
              <div style={{
                background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
                border: isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0',
                borderRadius: 20,
                padding: '1.1rem 1.35rem',
                boxShadow: '0 4px 16px rgba(16,185,129,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: isDark ? 'rgba(16,185,129,0.25)' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    🏆
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#10b981', fontSize: '0.92rem', fontWeight: 900 }}>En Güçlü Olduğun Konular</h4>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Yüksek doğruluk oranı</span>
                  </div>
                </div>

                {topBestTopics.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>Yeterli soru verisi henüz yok</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topBestTopics.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '0.45rem 0.75rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                          {t.subject ? `[${t.subject}] ` : ''}{t.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#10b981' }}>%{t.accuracy}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weak Topics */}
              <div style={{
                background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
                border: isDark ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid #fecaca',
                borderRadius: 20,
                padding: '1.1rem 1.35rem',
                boxShadow: '0 4px 16px rgba(239,68,68,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: isDark ? 'rgba(239,68,68,0.25)' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    ⚠️
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#ef4444', fontSize: '0.92rem', fontWeight: 900 }}>Öncelikli Tekrar Gereken Konular</h4>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Doğruluk %60 altı olanlar</span>
                  </div>
                </div>

                {topWeakTopics.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 700, padding: '0.5rem 0' }}>Tebrikler! Kritik derecede zayıf konu bulunmuyor 🎉</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topWeakTopics.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '0.45rem 0.75rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                          {t.subject ? `[${t.subject}] ` : ''}{t.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#ef4444' }}>%{t.accuracy}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: SUBJECTS & TOPICS ── */}
        {activeTab === 'subjects' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
            {/* Chart Container */}
            <div style={{ background: 'var(--color-surface)', borderRadius: isMobile ? 16 : 22, padding: isMobile ? '1rem' : '1.4rem', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: 12, flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.3)', flexShrink: 0 }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>Ders Başarı Analizi</h3>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Tüm derslerdeki soru ve test başarı grafiği</p>
                  </div>
                </div>

                {/* Chart Toggle Buttons */}
                <div style={{ display: 'flex', gap: 3, background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)', width: isMobile ? '100%' : 'auto' }}>
                  <button
                    onClick={() => setSubjChartType('bar')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.85rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: subjChartType === 'bar' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: subjChartType === 'bar' ? '#fff' : 'var(--color-text-muted)',
                      boxShadow: subjChartType === 'bar' ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <BarChart3 size={13} /> {isMobile ? 'Sütun' : 'Başarı Dağılımı'}
                  </button>
                  <button
                    onClick={() => setSubjChartType('radar')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.85rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: subjChartType === 'radar' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: subjChartType === 'radar' ? '#fff' : 'var(--color-text-muted)',
                      boxShadow: subjChartType === 'radar' ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Target size={13} /> {isMobile ? 'Radar' : 'Yetkinlik Radarı'}
                  </button>
                  <button
                    onClick={() => setSubjChartType('pie')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.85rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: subjChartType === 'pie' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: subjChartType === 'pie' ? '#fff' : 'var(--color-text-muted)',
                      boxShadow: subjChartType === 'pie' ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <PieIcon size={13} /> {isMobile ? 'Pay' : 'Soru Payı'}
                  </button>
                </div>
              </div>

              {/* Chart Content */}
              {subjectBreakdown.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Henüz çözülmüş test verisi bulunmuyor
                </div>
              ) : (
                <div style={{ height: isMobile ? 230 : 310, width: '100%', position: 'relative' }}>
                  {subjChartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectBarData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: 'var(--color-text)', fontSize: isMobile ? 10 : 12, fontWeight: 700 }}
                          axisLine={{ stroke: 'var(--color-border)' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }}
                          tickFormatter={v => `%${v}`}
                          axisLine={{ stroke: 'var(--color-border)' }}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.8} label={{ value: 'Hedef %70', fill: '#10b981', fontSize: 10, position: 'right' }} />
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
                        <PolarGrid stroke="var(--color-border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text)', fontSize: isMobile ? 9 : 12, fontWeight: 800 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--color-border)" tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }} />
                        <Radar name="Başarı %" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} strokeWidth={2.5} />
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
                          cy="44%"
                          innerRadius={isMobile ? 38 : 60}
                          outerRadius={isMobile ? 68 : 105}
                          paddingAngle={4}
                        >
                          {subjectPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-surface)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomSubjectTooltip />} />
                        <Legend
                          formatter={(value) => (
                            <span style={{
                              color: 'var(--color-text)',
                              fontSize: isMobile ? '0.7rem' : '0.76rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.45rem',
                              borderRadius: 6,
                              background: 'var(--color-surface-hover)',
                              border: '1px solid var(--color-border)',
                              display: 'inline-block'
                            }}>
                              {value}
                            </span>
                          )}
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          wrapperStyle={{
                            paddingTop: 8,
                            display: 'flex',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '6px 8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            {/* Subject Filter Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, alignItems: 'center', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setSelectedSubjFilter('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                  borderRadius: 10,
                  border: selectedSubjFilter === 'all' ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  background: selectedSubjFilter === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                  color: selectedSubjFilter === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.74rem' : '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedSubjFilter === 'all' ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none',
                  transition: 'all 0.15s',
                  flexShrink: 0
                }}
              >
                <span>🌐 Tüm Dersler ({subjectBreakdown.length})</span>
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
                      gap: 5,
                      padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                      borderRadius: 10,
                      border: isSelected ? `1.5px solid ${th.color}` : '1.5px solid var(--color-border)',
                      background: isSelected ? th.bg : 'var(--color-surface)',
                      color: isSelected ? th.color : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: isMobile ? '0.74rem' : '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? `0 4px 14px ${th.color}25` : 'none',
                      transition: 'all 0.15s',
                      flexShrink: 0
                    }}
                  >
                    <SubIcon size={14} color={isSelected ? th.color : 'var(--color-text-muted)'} />
                    <span>{sb.subj}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '1px 5px',
                      borderRadius: 5,
                      background: isSelected ? th.color : 'var(--color-surface-hover)',
                      color: isSelected ? '#ffffff' : 'var(--color-text)',
                      fontWeight: 900
                    }}>
                      %{sb.avgScore}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Accordion list of subjects & topics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {subjectBreakdown
                .filter(sb => selectedSubjFilter === 'all' || sb.subj === selectedSubjFilter)
                .map(({ subj, tests, avgScore, topicArray, totalQ, totalCorrect, totalWrong, totalBlank }) => {
                  const th = theme(subj);
                  const SubIcon = th.icon;
                  const isExpanded = expandedSubject === subj || selectedSubjFilter === subj;
                  return (
                    <div key={subj} style={{ background: 'var(--color-surface)', borderRadius: isMobile ? 14 : 20, border: `1.5px solid ${isExpanded ? th.border : 'var(--color-border)'}`, boxShadow: isExpanded ? '0 8px 30px rgba(0,0,0,0.05)' : '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                      {/* Subject Header */}
                      <button
                        className="sr-subject-header-btn"
                        onClick={() => setExpandedSubject(isExpanded && selectedSubjFilter === 'all' ? null : subj)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isMobile ? '0.85rem 1rem' : '1.1rem 1.4rem',
                          background: isExpanded ? th.bg : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          gap: 10,
                          flexWrap: 'wrap',
                          transition: 'background 0.25s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: isMobile ? 38 : 46, height: isMobile ? 38 : 46, borderRadius: isMobile ? 10 : 14, background: th.bg, border: `1.5px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SubIcon size={isMobile ? 18 : 22} color={th.color} />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 900, fontSize: isMobile ? '0.92rem' : '1.05rem', color: 'var(--color-text)' }}>{subj}</div>
                            <div style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                              {tests.length} test · {totalQ} soru (<span style={{ color: '#10b981' }}>{totalCorrect} D</span> · <span style={{ color: '#ef4444' }}>{totalWrong} Y</span> · <span style={{ color: 'var(--color-text-muted)' }}>{totalBlank} B</span>)
                            </div>
                          </div>
                        </div>
                        <div className="sr-subject-header-right" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <ScoreBadge score={avgScore} size="sm" isDark={isDark} />
                          <StatusTag accuracy={avgScore} isDark={isDark} />
                          <ChevronRight size={16} color="var(--color-text-muted)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </button>

                      {/* Expanded: Topic horizontal bars */}
                      {isExpanded && topicArray.length > 0 && (
                        <div style={{ padding: isMobile ? '0.85rem 1rem' : '1.25rem 1.4rem', background: 'var(--color-surface-hover)', borderTop: '1.5px solid var(--color-border)' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                            🎯 Konu / Test Bazlı Doğruluk Analizi
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {topicArray.map((top, idx) => (
                              <div key={idx} style={{ background: 'var(--color-surface)', borderRadius: 10, padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1rem', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', gap: 4 }}>
                                  <span style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 800, color: 'var(--color-text)', maxWidth: isMobile ? '100%' : '70%' }}>{top.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                      {top.correctQ} D / {top.wrongQ} Y / {top.blankQ} B ({top.totalQ} Soru)
                                    </span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: top.accuracy >= 70 ? '#10b981' : top.accuracy >= 50 ? '#f59e0b' : '#ef4444' }}>
                                      %{top.accuracy}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ background: 'var(--color-border)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
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

        {/* ── TAB: BY TYPE ── */}
        {activeTab === 'bytype' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
            {/* Sub-tabs */}
            <div style={{
              display: 'flex',
              gap: 4,
              background: 'var(--color-surface)',
              padding: 4,
              borderRadius: 12,
              border: '1.5px solid var(--color-border)',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
              {[
                { key: 'homework',     label: '📝 Ödevler',            count: byTypeSubs.homework.length },
                { key: 'book',         label: '📚 Kitap',              count: byTypeSubs.book.length },
                { key: 'physicalExam', label: '📋 Denemeler',          count: byTypeSubs.physicalExam.length },
                { key: 'individual',   label: '⚡ Bireysel',           count: byTypeSubs.individual.length },
              ].map(bt => (
                <button
                  key={bt.key}
                  onClick={() => setByTypeTab(bt.key)}
                  style={{
                    flex: isMobile ? '0 0 auto' : 1,
                    padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.1rem',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: byTypeTab === bt.key ? 900 : 700,
                    fontSize: isMobile ? '0.74rem' : '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    background: byTypeTab === bt.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                    color: byTypeTab === bt.key ? 'white' : 'var(--color-text-muted)',
                    boxShadow: byTypeTab === bt.key ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {bt.label} <span style={{ opacity: 0.85, fontSize: '0.68rem' }}>({bt.count})</span>
                </button>
              ))}
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(byTypeSubs[byTypeTab] || []).map((s, i) => {
                const th = theme(s.subjectKey);
                const SubIcon = th.icon;
                return (
                  <div
                    key={i}
                    className="sr-card-hover"
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 14,
                      padding: isMobile ? '0.75rem 0.85rem' : '1rem 1.25rem',
                      border: '1.5px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'center',
                      gap: isMobile ? 8 : 12,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: th.bg, border: `1.5px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <SubIcon size={18} color={th.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                          {s.bookTitle ? (
                            <>
                              <span style={{ color: '#6366f1', fontWeight: 900 }}>{s.bookTitle}</span>
                              <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>—</span>
                              <span>{s.subjectName || s.subjectKey}</span>
                              {s.topicName && <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}> › {s.topicName}</span>}
                              <span style={{ color: 'var(--color-text)', fontWeight: 900 }}> ({s.testName})</span>
                            </>
                          ) : (
                            s.testTitle
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            {s.totalQuestions} Soru
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isMobile ? 'space-between' : 'flex-end',
                      gap: 8,
                      flexWrap: 'wrap',
                      borderTop: isMobile ? '1px solid var(--color-border)' : 'none',
                      paddingTop: isMobile ? 6 : 0
                    }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {s.isPendingEval ? (
                          <span style={{ background: isDark ? 'rgba(124,58,237,0.18)' : '#f5f3ff', color: '#7c3aed', border: isDark ? '1px solid rgba(124,58,237,0.35)' : '1px solid #ddd6fe', borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            ⏳ Değerlendirmede
                          </span>
                        ) : (
                          <>
                            <span style={{ background: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4', color: '#10b981', border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                            <span style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                            <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>— {s.blankCount}</span>
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} isPendingApproval={s.isPendingApproval} isRejected={s.isRejected} isDark={isDark} size="sm" />

                        <button onClick={() => handleOpenReview(s)} style={{ background: s.type === 'physicalExam' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, padding: '0.38rem 0.75rem', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                          <Eye size={12} /> {s.type === 'physicalExam' ? 'Karne' : 'İncele'}
                        </button>
                        {!isStudentRole && (
                          <button
                            onClick={(e) => handleDeleteResult(s, e)}
                            title="Bu Sınavı Kalıcı Olarak Sil"
                            style={{
                              background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
                              color: '#ef4444',
                              border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca',
                              borderRadius: 8,
                              padding: '0.35rem 0.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(byTypeSubs[byTypeTab] || []).length === 0 && (
                <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700, border: '1.5px solid var(--color-border)' }}>
                  Bu kategoride henüz sonuç bulunamadı
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: TREND ── */}
        {activeTab === 'trend' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: isMobile ? 16 : 22, padding: isMobile ? '1rem' : '1.4rem', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.92rem' : '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={18} color="#6366f1" /> Zaman İçinde Başarı Değişimi
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                  Son {trendData.length} Test & Deneme
                </span>
              </div>

              {trendData.length > 0 ? (
                <div style={{ width: '100%', height: isMobile ? 220 : 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `%${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Hedef %70', fill: '#10b981', fontSize: 10, position: 'right' }} />
                      <Area type="monotone" dataKey="Başarı %" stroke="#6366f1" strokeWidth={3} fill="url(#scoreTrendGrad)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 6, fill: '#4f46e5', stroke: 'var(--color-surface)', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2.5rem 0', fontWeight: 700 }}>Trend analizi için yeterli veri yok.</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ALL RESULTS ── */}
        {activeTab === 'all' && (
          <div className="sr-anim" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 16 }}>
            {/* Filter Bar */}
            <div className="sr-filter-bar" style={{
              display: 'flex',
              gap: 8,
              background: 'var(--color-surface)',
              padding: isMobile ? 8 : 10,
              borderRadius: 14,
              border: '1.5px solid var(--color-border)',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Test veya ders ara…"
                  style={{
                    width: '100%',
                    paddingLeft: 32,
                    paddingRight: 10,
                    paddingTop: 8,
                    paddingBottom: 8,
                    borderRadius: 9,
                    border: '1.5px solid var(--color-border-input)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {isMobile ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
                  <select
                    value={subjectFilter}
                    onChange={e => setSubjectFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 8,
                      border: '1.5px solid var(--color-border-input)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <option value="all">Tüm Dersler</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 8,
                      border: '1.5px solid var(--color-border-input)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <option value="all">Tüm Türler</option>
                    <option value="homework">Ödevler</option>
                    <option value="book">Kitap Testleri</option>
                    <option value="physicalExam">Denemeler</option>
                    <option value="individual">Bireysel</option>
                  </select>
                </div>
              ) : (
                <>
                  <select
                    value={subjectFilter}
                    onChange={e => setSubjectFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: 10,
                      border: '1.5px solid var(--color-border-input)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Dersler</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: 10,
                      border: '1.5px solid var(--color-border-input)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Türler</option>
                    <option value="homework">Ödevler</option>
                    <option value="book">Kitap Testleri</option>
                    <option value="physicalExam">Denemeler</option>
                    <option value="individual">Bireysel</option>
                  </select>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: isMobile ? '100%' : 'auto', gap: 6 }}>
                <div style={{ display: 'flex', gap: 3, background: 'var(--color-surface-hover)', padding: 3, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'table' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: viewMode === 'table' ? 'white' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.74rem',
                      fontWeight: 800
                    }}
                  >
                    <List size={14} /> {isMobile ? 'Tablo' : ''}
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'cards' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: viewMode === 'cards' ? 'white' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.74rem',
                      fontWeight: 800
                    }}
                  >
                    <LayoutGrid size={14} /> {isMobile ? 'Kartlar' : ''}
                  </button>
                </div>

                {!isStudentRole && studentSubmissions.length > 0 && (
                  <button
                    onClick={handleClearAllResults}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0.4rem 0.65rem',
                      borderRadius: 8,
                      border: '1.5px solid #fca5a5',
                      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                      color: '#dc2626',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    title="Öğrencinin tüm sınav sonuçlarını ve geçmişini sıfırla"
                  >
                    <Trash2 size={12} /> Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1.5px solid var(--color-border)' }}>
                        {['TEST ADI', 'TÜR', 'TARİH', 'SORU', 'D / Y / B', 'BAŞARI', 'İŞLEM'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 0.85rem', fontWeight: 900, fontSize: '0.68rem', color: 'var(--color-text-muted)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((s, idx) => {
                        const th = theme(s.subjectKey);
                        const SubIcon = th.icon;
                        return (
                          <tr key={s.id || idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 1 ? 'var(--color-surface-hover)' : 'var(--color-surface)' }}>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <SubIcon size={14} color={th.color} />
                                </div>
                                <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                                    {s.bookTitle ? (
                                      <>
                                        <span style={{ color: '#6366f1', fontWeight: 900 }}>{s.bookTitle}</span>
                                        <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>—</span>
                                        <span>{s.subjectName || s.subjectKey}</span>
                                        {s.topicName && <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}> › {s.topicName}</span>}
                                        <span style={{ color: 'var(--color-text)', fontWeight: 900 }}> ({s.testName})</span>
                                      </>
                                    ) : (
                                      s.testTitle
                                    )}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                              <span style={{ background: typeConfig[s.typeKey]?.bg, color: typeConfig[s.typeKey]?.color, border: `1px solid ${typeConfig[s.typeKey]?.border}`, borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 900 }}>
                                {typeConfig[s.typeKey]?.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', color: 'var(--color-text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--color-text)' }}>
                              {s.totalQuestions}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                              {s.isPendingEval ? (
                                <span style={{ background: isDark ? 'rgba(124,58,237,0.18)' : '#f5f3ff', color: '#7c3aed', border: isDark ? '1px solid rgba(124,58,237,0.35)' : '1px solid #ddd6fe', borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  ⏳ Değerlendirmede
                                </span>
                              ) : (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <span style={{ background: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4', color: '#10b981', border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0', borderRadius: 5, padding: '0.12rem 0.4rem', fontSize: '0.7rem', fontWeight: 900 }}>✓{s.correctCount}</span>
                                  <span style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca', borderRadius: 5, padding: '0.12rem 0.4rem', fontSize: '0.7rem', fontWeight: 900 }}>✗{s.wrongCount}</span>
                                  <span style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 5, padding: '0.12rem 0.4rem', fontSize: '0.7rem', fontWeight: 900 }}>—{s.blankCount}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                              <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} isPendingApproval={s.isPendingApproval} isRejected={s.isRejected} size="sm" isDark={isDark} />
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button onClick={() => handleOpenReview(s)} style={{ background: s.type === 'physicalExam' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, padding: '0.35rem 0.75rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                                  <Eye size={12} /> {s.type === 'physicalExam' ? 'Karne' : 'İncele'}
                                </button>
                                {!isStudentRole && (
                                  <button
                                    onClick={(e) => handleDeleteResult(s, e)}
                                    title="Bu Sınavı Kalıcı Olarak Sil"
                                    style={{
                                      background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
                                      color: '#ef4444',
                                      border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca',
                                      borderRadius: 8,
                                      padding: '0.35rem 0.5rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSubs.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          <ListTree size={36} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--color-border)' }} />
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(270px, 1fr))', gap: isMobile ? 8 : 12 }}>
                {filteredSubs.map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div
                      key={i}
                      className="sr-card-hover"
                      style={{
                        background: 'var(--color-surface)',
                        borderRadius: 14,
                        border: `1.5px solid ${th.border}`,
                        padding: isMobile ? '0.85rem' : '1.15rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ height: 3, background: th.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: th.bg, color: th.color, border: `1px solid ${th.border}`, borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 900 }}>
                          <SubIcon size={12} /> {s.subjectKey}
                        </span>
                        <span style={{ background: typeConfig[s.typeKey]?.bg, color: typeConfig[s.typeKey]?.color, border: `1px solid ${typeConfig[s.typeKey]?.border}`, borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.68rem', fontWeight: 900 }}>
                          {typeConfig[s.typeKey]?.label}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                        {s.bookTitle ? (
                          <>
                            <span style={{ color: '#6366f1', fontWeight: 900 }}>{s.bookTitle}</span>
                            <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>—</span>
                            <span>{s.subjectName || s.subjectKey}</span>
                            {s.topicName && <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}> › {s.topicName}</span>}
                            <span style={{ color: 'var(--color-text)', fontWeight: 900 }}> ({s.testName})</span>
                          </>
                        ) : (
                          s.testTitle
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {s.isPendingEval ? (
                          <span style={{ background: isDark ? 'rgba(124,58,237,0.18)' : '#f5f3ff', color: '#7c3aed', border: isDark ? '1px solid rgba(124,58,237,0.35)' : '1px solid #ddd6fe', borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            ⏳ Değerlendirmede
                          </span>
                        ) : (
                          <>
                            <span style={{ background: isDark ? 'rgba(16,185,129,0.18)' : '#f0fdf4', color: '#10b981', border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #bbf7d0', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                            <span style={{ background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                            <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 900 }}>— {s.blankCount}</span>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
                        <div>
                          <ScoreBadge score={s.computedScore} type={s.type} isPendingEval={s.isPendingEval} isPendingApproval={s.isPendingApproval} isRejected={s.isRejected} isDark={isDark} size="sm" />
                          <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <button onClick={() => handleOpenReview(s)} style={{ background: s.type === 'physicalExam' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, padding: '0.35rem 0.75rem', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                            <Eye size={12} /> {s.type === 'physicalExam' ? 'Karne' : 'İncele'}
                          </button>
                          {!isStudentRole && (
                            <button
                              onClick={(e) => handleDeleteResult(s, e)}
                              title="Bu Sınavı Kalıcı Olarak Sil"
                              style={{
                                background: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
                                color: '#ef4444',
                                border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fecaca',
                                borderRadius: 8,
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <div style={{ gridColumn: '1/-1', background: 'var(--color-surface)', borderRadius: 16, padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700, border: '1.5px solid var(--color-border)' }}>
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

      {/* Manuel Test Sonucu Ekleme Modalı */}
      <ManualTestModal
        isOpen={manualTestModalData.isOpen}
        initialData={manualTestModalData.data}
        onClose={() => setManualTestModalData({ isOpen: false, data: null })}
      />

      {/* Gelişim & Performans Karnesi Modalı */}
      <StudentPerformanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        student={selectedStudent || currentUser || {}}
        submissions={studentSubmissions || []}
      />
    </div>
  );
}
