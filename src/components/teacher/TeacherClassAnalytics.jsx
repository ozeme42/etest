import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Award, Activity, Calendar,
  BookOpen, Users, CheckCircle2, AlertTriangle, ArrowUpRight,
  GraduationCap, School, Trophy, Search, Sparkles, Filter,
  ChevronRight, ArrowRight, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { getSubjectTheme, getAvatarBg } from '../../config/subjectThemes';
import { getSubmissionScorePct } from '../../utils/scoreHelpers';
import { computeStudentAnalyticsData } from '../../utils/testResolver';

function AnalyticsStudentAvatar({ name, index = 0, size = 34 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: getAvatarBg(index),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontWeight: 800,
      fontSize: size * 0.38,
      flexShrink: 0
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

export default function TeacherClassAnalytics({
  students = [],
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  grades = [],
  curData = {}
}) {
  const { isDark } = useTheme();
  const [selectedGradeId, setSelectedGradeId] = useState('all'); // 'all' | grade.id
  const [timeRange, setTimeRange] = useState('all'); // 'week' | 'month' | 'all'
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSortBy, setStudentSortBy] = useState('score'); // 'score' | 'questions' | 'name'

  // Helper to normalize subjects reliably
  const normalizeSubjectName = (rawName) => {
    if (!rawName) return 'Genel';
    const s = String(rawName).trim();
    const l = s.toLowerCase();
    if (l.includes('matematik') || l.includes('geometri')) return 'Matematik';
    if (l.includes('türkçe') || l.includes('paragraf') || l.includes('edebiyat') || l.includes('dil bilgisi')) return 'Türkçe';
    if (l.includes('fen') || l.includes('fizik') || l.includes('kimya') || l.includes('biyoloji')) return 'Fen Bilimleri';
    if (l.includes('sosyal') || l.includes('tarih') || l.includes('coğrafya') || l.includes('inkılap')) return 'Sosyal Bilgiler';
    if (l.includes('ingilizce') || l.includes('english')) return 'İngilizce';
    if (l.includes('din') || l.includes('ahlak')) return 'Din Kültürü';
    return s || 'Genel';
  };

  // Helper to get grade ID and clean label for a student
  const getStudentGradeInfo = (std) => {
    const rawId = std?.gradeId || std?.grade || '';
    if (!rawId) return { id: 'unassigned', name: 'Sınıf Belirtilmemiş' };

    const found = (grades || []).find(g =>
      String(g.id) === String(rawId) ||
      String(g.name || '').trim().toLowerCase() === String(rawId).trim().toLowerCase()
    );
    if (found) {
      return { id: String(found.id), name: found.name };
    }

    const cleanStr = String(rawId).trim();
    if (/^\d+$/.test(cleanStr)) {
      return { id: cleanStr, name: `${cleanStr}. Sınıf` };
    }
    return { id: cleanStr, name: cleanStr.includes('Sınıf') ? cleanStr : `${cleanStr}. Sınıf` };
  };

  // Build unified class list from curriculum grades and students
  const classList = useMemo(() => {
    const map = new Map();

    // 1. Add curriculum grades
    (grades || []).forEach(g => {
      if (g && g.id) {
        const num = parseInt(String(g.name || g.id).replace(/\D/g, ''), 10) || 0;
        map.set(String(g.id), {
          id: String(g.id),
          name: g.name || `${g.id}. Sınıf`,
          order: num
        });
      }
    });

    // 2. Add grades from students if not already mapped
    (students || []).forEach(std => {
      const info = getStudentGradeInfo(std);
      if (info.id !== 'unassigned' && !map.has(info.id)) {
        const num = parseInt(String(info.name).replace(/\D/g, ''), 10) || 0;
        map.set(info.id, {
          id: info.id,
          name: info.name,
          order: num
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.order !== b.order) return b.order - a.order; // E.g. 8, 7, 6, 5
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [grades, students]);

  // Aggregate and filter all students' resolved submissions
  const allResolvedSubs = useMemo(() => {
    const allSubs = [];

    students.forEach(std => {
      const gradeInfo = getStudentGradeInfo(std);
      const { generalTrialExams = [], otherHomeworkSubmissions = [] } = computeStudentAnalyticsData({
        studentId: std.id,
        targetStudent: std,
        submissions,
        homeworks,
        books,
        bookTests
      });

      [...generalTrialExams, ...otherHomeworkSubmissions].forEach(sub => {
        allSubs.push({
          ...sub,
          studentId: std.id,
          studentGradeId: gradeInfo.id,
          studentGradeName: gradeInfo.name,
          resolvedSubject: normalizeSubjectName(sub.subject)
        });
      });
    });

    return allSubs;
  }, [students, submissions, homeworks, books, bookTests, grades]);

  // Class Comparison Stats (All Classes)
  const classComparisonStats = useMemo(() => {
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];

    return classList.map((c, idx) => {
      const classStudents = students.filter(s => getStudentGradeInfo(s).id === c.id);
      const classSubs = allResolvedSubs.filter(sub => sub.studentGradeId === c.id);

      let totalQ = 0;
      let totalCorrect = 0;
      let totalWrong = 0;
      let validScoreSum = 0;
      let validScoreCount = 0;
      const activeStudentIds = new Set();
      const subjectMap = {};

      classSubs.forEach(sub => {
        activeStudentIds.add(sub.studentId);
        const correct = Number(sub.correctCount ?? sub.correct ?? 0);
        const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
        const blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
        const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);

        totalQ += qCount;
        totalCorrect += correct;
        totalWrong += wrong;

        const pct = getSubmissionScorePct(sub);
        if (pct !== null) {
          validScoreSum += pct;
          validScoreCount++;
        }

        const subj = sub.resolvedSubject || 'Genel';
        if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0 };
        subjectMap[subj].correct += correct;
        subjectMap[subj].total += qCount;
      });

      const avgScore = validScoreCount > 0 ? Math.round(validScoreSum / validScoreCount) : (totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0);

      let topSubject = 'Ders verisi bekleniyor';
      let topSubjectPct = 0;
      Object.entries(subjectMap).forEach(([subj, sData]) => {
        if (sData.total >= 3) {
          const sPct = Math.round((sData.correct / sData.total) * 100);
          if (sPct > topSubjectPct) {
            topSubjectPct = sPct;
            topSubject = `${subj} (%${sPct})`;
          }
        }
      });

      return {
        id: c.id,
        name: c.name,
        studentCount: classStudents.length,
        activeStudentCount: activeStudentIds.size,
        totalQuestions: totalQ,
        totalCorrect,
        totalWrong,
        testCount: classSubs.length,
        avgScore,
        topSubject,
        color: palette[idx % palette.length]
      };
    });
  }, [classList, students, allResolvedSubs]);

  // Active students based on selectedGradeId
  const activeStudents = useMemo(() => {
    if (selectedGradeId === 'all') return students;
    return students.filter(s => getStudentGradeInfo(s).id === selectedGradeId);
  }, [students, selectedGradeId, grades]);

  // Filtered subs based on selectedGradeId and timeRange
  const filteredSubs = useMemo(() => {
    const now = Date.now();
    const timeThreshold = timeRange === 'week' ? now - 7 * 86400000 : timeRange === 'month' ? now - 30 * 86400000 : 0;

    return allResolvedSubs.filter(sub => {
      if (selectedGradeId !== 'all' && sub.studentGradeId !== selectedGradeId) return false;
      if (timeThreshold > 0) {
        const subDateMs = new Date(sub.date || sub.submittedAt || sub.createdAt || 0).getTime();
        if (subDateMs < timeThreshold) return false;
      }
      return true;
    });
  }, [allResolvedSubs, selectedGradeId, timeRange]);

  // Summary Metrics for the active selection
  const summaryStats = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let validScoreSum = 0;
    let validScoreCount = 0;
    const activeStudentSet = new Set();

    filteredSubs.forEach(sub => {
      activeStudentSet.add(sub.studentId);
      const correct = Number(sub.correctCount ?? sub.correct ?? 0);
      const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
      const blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
      const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);

      totalQuestions += qCount;
      totalCorrect += correct;
      totalWrong += wrong;
      totalBlank += blank;

      const pct = getSubmissionScorePct(sub);
      if (pct !== null) {
        validScoreSum += pct;
        validScoreCount++;
      }
    });

    const avgScorePct = validScoreCount > 0 ? Math.round(validScoreSum / validScoreCount) : (totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
    const activeCount = activeStudentSet.size;
    const activeRatio = activeStudents.length > 0 ? Math.round((activeCount / activeStudents.length) * 100) : 0;

    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalBlank,
      avgScorePct,
      testCount: filteredSubs.length,
      activeCount,
      activeRatio
    };
  }, [filteredSubs, activeStudents]);

  // Daily Question Trend
  const dailyActivityData = useMemo(() => {
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
    const daysMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      const dayLabel = `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
      daysMap[key] = { dateKey: key, dayLabel, questions: 0, tests: 0, correct: 0 };
    }

    filteredSubs.forEach(sub => {
      const dateStr = (sub.date || sub.submittedAt || sub.createdAt || new Date().toISOString()).split('T')[0];
      if (daysMap[dateStr]) {
        const correct = Number(sub.correctCount ?? sub.correct ?? 0);
        const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
        const blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
        const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);

        daysMap[dateStr].questions += qCount;
        daysMap[dateStr].correct += correct;
        daysMap[dateStr].tests += 1;
      }
    });

    return Object.values(daysMap);
  }, [filteredSubs]);

  // Subject Performance Breakdown
  const subjectBreakdown = useMemo(() => {
    const subMap = {};

    filteredSubs.forEach(sub => {
      const subjectName = sub.resolvedSubject || normalizeSubjectName(sub.subject);
      if (!subMap[subjectName]) {
        subMap[subjectName] = { name: subjectName, correct: 0, wrong: 0, total: 0, count: 0 };
      }
      const correct = Number(sub.correctCount ?? sub.correct ?? 0);
      const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
      const blank = Number(sub.emptyCount ?? sub.blankCount ?? 0);
      const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);

      subMap[subjectName].correct += correct;
      subMap[subjectName].wrong += wrong;
      subMap[subjectName].total += qCount;
      subMap[subjectName].count += 1;
    });

    return Object.values(subMap)
      .map(item => ({
        ...item,
        avgScore: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
        color: getSubjectTheme(item.name).accent || '#6366f1'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredSubs]);

  // Student Performance Rankings for Active View
  const studentRankings = useMemo(() => {
    return activeStudents
      .map((std, idx) => {
        const stdSubs = filteredSubs.filter(sub => sub.studentId === std.id);
        let totalQ = 0;
        let totalCorrect = 0;
        let totalWrong = 0;
        let totalBlank = 0;
        let validScoreSum = 0;
        let validScoreCount = 0;

        stdSubs.forEach(sub => {
          const c = Number(sub.correctCount ?? sub.correct ?? 0);
          const w = Number(sub.wrongCount ?? sub.wrong ?? 0);
          const b = Number(sub.blankCount ?? sub.emptyCount ?? 0);
          const q = Number(sub.totalQuestions || (c + w + b) || 10);
          totalQ += q;
          totalCorrect += c;
          totalWrong += w;
          totalBlank += b;

          const pct = getSubmissionScorePct(sub);
          if (pct !== null) {
            validScoreSum += pct;
            validScoreCount++;
          }
        });

        const avgScore = validScoreCount > 0 ? Math.round(validScoreSum / validScoreCount) : (totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0);
        const gradeInfo = getStudentGradeInfo(std);

        return {
          ...std,
          avatarIdx: idx,
          gradeName: gradeInfo.name,
          testCount: stdSubs.length,
          totalQuestions: totalQ,
          totalCorrect,
          totalWrong,
          totalBlank,
          avgScore
        };
      })
      .filter(std => {
        if (!studentSearch.trim()) return true;
        const q = studentSearch.toLowerCase();
        return (std.name || '').toLowerCase().includes(q) || (std.email || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (studentSortBy === 'score') return b.avgScore - a.avgScore || b.totalQuestions - a.totalQuestions;
        if (studentSortBy === 'questions') return b.totalQuestions - a.totalQuestions || b.avgScore - a.avgScore;
        return (a.name || '').localeCompare(b.name || '', 'tr');
      });
  }, [activeStudents, filteredSubs, studentSearch, studentSortBy, grades]);

  // Selected grade object
  const activeGradeObj = classList.find(c => c.id === selectedGradeId);
  const activeScopeTitle = selectedGradeId === 'all' ? 'Tüm Sınıflar' : (activeGradeObj?.name || 'Seçili Sınıf');

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: isDark ? '#1e293b' : '#ffffff',
          border: '1.5px solid var(--color-border)',
          borderRadius: '0.75rem',
          padding: '0.65rem 0.85rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontSize: '0.78rem',
          color: 'var(--color-text)'
        }}>
          <p style={{ fontWeight: 900, margin: '0 0 4px', color: '#6366f1' }}>{label || data.dayLabel || data.name}</p>
          {data.questions !== undefined && (
            <p style={{ margin: 0, fontWeight: 700 }}>⚡ {data.questions} Soru Çözüldü</p>
          )}
          {data.tests !== undefined && (
            <p style={{ margin: '2px 0 0', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>📋 {data.tests} Test Tamamlandı</p>
          )}
          {data.avgScore !== undefined && (
            <p style={{ margin: '2px 0 0', color: '#10b981', fontWeight: 800 }}>🎯 Ortalama Başarı: %{data.avgScore}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── 1. SINIF SEÇİCİ & ZAMAN FİLTRESİ ÇUBUĞU ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.1rem 1.35rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        {/* Üst Başlık & Zaman Seçici */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontWeight: 900,
              fontSize: '1.15rem',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem'
            }}>
              <School size={22} color="#6366f1" />
              Sınıf Analizi, Başarı &amp; Grafik Raporları
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Sınıf düzeylerine göre soru hacimleri, başarı grafikleri ve öğrenci karne sıralamaları.
            </p>
          </div>

          {/* Zaman Seçici Pills */}
          <div style={{
            display: 'flex',
            background: 'var(--color-surface-hover)',
            padding: '0.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border)'
          }}>
            {[
              { id: 'all', label: 'Tüm Zamanlar' },
              { id: 'month', label: 'Son 30 Gün' },
              { id: 'week', label: 'Son 7 Gün' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.55rem',
                  border: 'none',
                  background: timeRange === t.id ? '#6366f1' : 'transparent',
                  color: timeRange === t.id ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🏫 SINIF SEÇİCİ BUTONLARI (PILL BAR) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--color-border)'
        }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginRight: '0.25rem' }}>
            <Filter size={13} /> Sınıf Filtresi:
          </span>

          {/* TÜM SINIFLAR BUTONU */}
          <button
            type="button"
            onClick={() => setSelectedGradeId('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '0.75rem',
              border: selectedGradeId === 'all' ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
              background: selectedGradeId === 'all' ? (isDark ? 'rgba(99,102,241,0.22)' : '#eef2ff') : 'var(--color-surface)',
              color: selectedGradeId === 'all' ? '#4f46e5' : 'var(--color-text)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedGradeId === 'all' ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
            }}
          >
            <School size={15} />
            <span>Tüm Sınıflar</span>
            <span style={{
              background: selectedGradeId === 'all' ? '#4f46e5' : 'var(--color-surface-hover)',
              color: selectedGradeId === 'all' ? '#ffffff' : 'var(--color-text-muted)',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px'
            }}>
              {students.length} Öğrenci
            </span>
          </button>

          {/* HER BİR SINIF DÜZEYİ İÇİN BUTONLAR */}
          {classList.map(c => {
            const isSel = selectedGradeId === c.id;
            const classStudentCount = students.filter(s => getStudentGradeInfo(s).id === c.id).length;
            const comp = classComparisonStats.find(x => x.id === c.id);

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedGradeId(c.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.75rem',
                  border: isSel ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                  background: isSel ? (isDark ? 'rgba(99,102,241,0.22)' : '#eef2ff') : 'var(--color-surface)',
                  color: isSel ? '#4f46e5' : 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSel ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                }}
              >
                <GraduationCap size={15} color={isSel ? '#4f46e5' : 'var(--color-text-muted)'} />
                <span>{c.name}</span>
                <span style={{
                  background: isSel ? '#4f46e5' : 'var(--color-surface-hover)',
                  color: isSel ? '#ffffff' : 'var(--color-text-muted)',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px'
                }}>
                  {classStudentCount}
                </span>
                {comp?.avgScore > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: comp.avgScore >= 70 ? '#059669' : comp.avgScore >= 50 ? '#d97706' : '#dc2626'
                  }}>
                    %{comp.avgScore}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. EĞER "TÜM SINIFLAR" SEÇİLİYSE: SINIFLAR ARASI KIYASLAMA & SINIF KARTLARI ── */}
      {selectedGradeId === 'all' && classComparisonStats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* SINIFLAR ARASI BAŞARI GRAFİĞİ */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={17} color="#6366f1" />
                  Sınıflar Arası Başarı Ortalaması Karşılaştırması (%)
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  Sınıf düzeylerinin sınav &amp; test ortalama başarı yüzdeleri
                </p>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                {classList.length} Sınıf Düzeyi
              </span>
            </div>

            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classComparisonStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                    {classComparisonStats.map((entry, index) => (
                      <Cell key={`grade-bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SINIF SEVİYELERİ ÖZET KARTLARI (GRID) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color="#4f46e5" />
                Sınıf Düzeyleri Performans Kartları
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Ayrıntılı analiz için sınıfa tıklayabilirsiniz
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '0.85rem'
            }}>
              {classComparisonStats.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedGradeId(c.id)}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '1.15rem',
                    padding: '1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '0.75rem',
                        background: `${c.color}1a`,
                        color: c.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <School size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
                          {c.name}
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          👥 {c.studentCount} Kayıtlı Öğrenci
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.5rem',
                      background: c.avgScore >= 70 ? '#ecfdf5' : c.avgScore >= 50 ? '#fef3c7' : '#fee2e2',
                      color: c.avgScore >= 70 ? '#059669' : c.avgScore >= 50 ? '#d97706' : '#dc2626',
                      border: `1px solid ${c.avgScore >= 70 ? '#a7f3d0' : c.avgScore >= 50 ? '#fde68a' : '#fecdd3'}`
                    }}>
                      %{c.avgScore}
                    </span>
                  </div>

                  {/* Mini İstatistikler */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--color-surface-hover)',
                    borderRadius: '0.75rem',
                    fontSize: '0.72rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontWeight: 600 }}>Toplam Soru:</span>
                      <strong style={{ color: 'var(--color-text)', fontSize: '0.82rem' }}>{c.totalQuestions} Soru</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontWeight: 600 }}>Çözülen Test:</span>
                      <strong style={{ color: 'var(--color-text)', fontSize: '0.82rem' }}>{c.testCount} Test</strong>
                    </div>
                  </div>

                  {/* En Başarılı Ders */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Öne Çıkan Ders:</span>
                    <span style={{ color: '#6366f1', fontWeight: 800 }}>{c.topSubject}</span>
                  </div>

                  {/* İncele Butonu */}
                  <button
                    type="button"
                    style={{
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '0.65rem',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: '#4f46e5',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Sınıfı Detaylı İncele</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── 3. SEÇİLİ KAPSAM BAŞLIĞI ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.65rem 1rem',
        background: selectedGradeId === 'all' ? 'rgba(99,102,241,0.06)' : 'rgba(16,185,129,0.06)',
        border: `1.5px solid ${selectedGradeId === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
        borderRadius: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={18} color={selectedGradeId === 'all' ? '#6366f1' : '#10b981'} />
          <strong style={{ fontSize: '0.88rem', color: 'var(--color-text)' }}>
            {activeScopeTitle} Performans Özeti
          </strong>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            ({activeStudents.length} Öğrenci Dahil)
          </span>
        </div>

        {selectedGradeId !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedGradeId('all')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            ↩ Tüm Sınıflara Dön
          </button>
        )}
      </div>

      {/* ── 4. DÖRT KPI KARTI (SEÇİLİ KAPSAMA ÖZEL) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Toplam Soru */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.15rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: 42, height: 42, borderRadius: '0.85rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Toplam Soru</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>{summaryStats.totalQuestions}</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>⚡ {summaryStats.testCount} Test Çözüldü</span>
          </div>
        </div>

        {/* Başarı Ortalaması */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.15rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: 42, height: 42, borderRadius: '0.85rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Başarı Ortalaması</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', display: 'block', lineHeight: 1.1 }}>%{summaryStats.avgScorePct}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>🎯 Sınav &amp; Ödev Net Ort.</span>
          </div>
        </div>

        {/* Aktif Katılım */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.15rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: 42, height: 42, borderRadius: '0.85rem', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Aktif Katılım</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>{summaryStats.activeCount} / {activeStudents.length}</span>
            <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 700 }}>👥 %{summaryStats.activeRatio} Katılım Oranı</span>
          </div>
        </div>

        {/* Doğru / Yanlış / Boş */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.15rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: 42, height: 42, borderRadius: '0.85rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Doğru / Yanlış</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>
              {summaryStats.totalCorrect} <span style={{ fontSize: '0.8rem', color: '#10b981' }}>D</span> / {summaryStats.totalWrong} <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Y</span>
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{summaryStats.totalBlank} Boş Yanıt</span>
          </div>
        </div>
      </div>

      {/* ── 5. İKİ GRAFİK: GÜNLÜK ÇÖZÜM & DERS DAĞILIMI ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        {/* CHART 1: GÜNLÜK SORU ÇÖZÜM EĞRİSİ */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={16} color="#6366f1" />
              {activeScopeTitle} - Günlük Soru Çözüm Eğrisi
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Son 7 Gün
            </span>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="questionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="questions" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#questionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: DERS BAZINDA BAŞARI DAĞILIMI */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={16} color="#10b981" />
              {activeScopeTitle} - Ders Bazında Başarı Dağılımı (%)
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Ortalama Net Yüzdesi
            </span>
          </div>

          {subjectBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              <BookOpen size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 700 }}>Ders bazlı sınav verisi henüz yok</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                    {subjectBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. SINIF ÖĞRENCİ BAŞARI & KARNE SIRALAMASI TABLOSU ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        {/* Tablo Başlığı & Arama / Sıralama Filtreleri */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={18} color="#f59e0b" />
              {activeScopeTitle} - Öğrenci Karne &amp; Sıralama Tablosu
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
              Öğrencilerin çözdüğü soru sayısı, test adetleri ve net başarı dereceleri
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Öğrenci Arama */}
            <div style={{ position: 'relative', width: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Öğrenci ara..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="teacher-form-input"
                style={{ paddingLeft: '1.9rem', fontSize: '0.78rem', padding: '0.4rem 0.65rem 0.4rem 1.9rem' }}
              />
            </div>

            {/* Sıralama Ölçütü */}
            <select
              value={studentSortBy}
              onChange={e => setStudentSortBy(e.target.value)}
              className="teacher-form-input"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', width: 'auto' }}
            >
              <option value="score">🎯 Başarı Oranına Göre</option>
              <option value="questions">⚡ Soru Sayısına Göre</option>
              <option value="name">🔤 İsim Sırasına Göre</option>
            </select>
          </div>
        </div>

        {/* Öğrenci Listesi Tablosu */}
        {studentRankings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Bu sınıfta kriterlere uygun öğrenci bulunamadı.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="teacher-simple-table">
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: 'center' }}>Sıra</th>
                  <th>Öğrenci</th>
                  <th>Sınıf Düzeyi</th>
                  <th>Çözülen Soru</th>
                  <th>Test Sayısı</th>
                  <th>D / Y / B</th>
                  <th>Başarı Oranı</th>
                  <th style={{ textAlign: 'right' }}>Gelişim Durumu</th>
                </tr>
              </thead>
              <tbody>
                {studentRankings.map((std, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const score = std.avgScore;
                  const tier = score >= 85 ? { label: '🔥 Zirvede', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' } :
                               score >= 70 ? { label: '🌟 Çok Başarılı', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' } :
                               score >= 50 ? { label: '👍 İstikrarlı', color: '#d97706', bg: '#fef3c7', border: '#fde68a' } :
                               std.totalQuestions > 0 ? { label: '⚡ Desteğe İhtiyaç Var', color: '#dc2626', bg: '#fee2e2', border: '#fecdd3' } :
                               { label: '⏳ Çözüm Yok', color: 'var(--color-text-muted)', bg: 'var(--color-surface-hover)', border: 'var(--color-border)' };

                  return (
                    <tr key={std.id}>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: idx < 3 ? '1.1rem' : '0.8rem', color: idx < 3 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                        {medal}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <AnalyticsStudentAvatar name={std.name} index={std.avatarIdx} size={32} />
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.84rem' }}>{std.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{std.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="teacher-badge-pill" style={{ fontSize: '0.72rem' }}>
                          {std.gradeName}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{std.totalQuestions}</strong> soru
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          {std.testCount} Test
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>{std.totalCorrect}D</span>{' '}
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{std.totalWrong}Y</span>{' '}
                        <span style={{ color: '#64748b', fontWeight: 600 }}>{std.totalBlank}B</span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.45rem',
                          background: score >= 70 ? 'rgba(16, 185, 129, 0.12)' : score >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
                        }}>
                          %{score}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.5rem',
                          background: tier.bg,
                          color: tier.color,
                          border: `1px solid ${tier.border}`
                        }}>
                          {tier.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
