import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Award, Activity, Calendar,
  BookOpen, Users, CheckCircle2, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { getSubjectTheme } from '../../config/subjectThemes';
import { getSubmissionScorePct } from '../../pages/TeacherDashboard';

export default function TeacherClassAnalytics({ students = [], submissions = [], homeworks = [] }) {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month' | 'all'

  // 1. Filter submissions based on timeRange
  const filteredSubs = useMemo(() => {
    const now = Date.now();
    if (timeRange === 'week') {
      const sevenDaysAgo = now - 7 * 86400000;
      return submissions.filter(s => new Date(s.submittedAt || s.createdAt || 0).getTime() >= sevenDaysAgo);
    }
    if (timeRange === 'month') {
      const thirtyDaysAgo = now - 30 * 86400000;
      return submissions.filter(s => new Date(s.submittedAt || s.createdAt || 0).getTime() >= thirtyDaysAgo);
    }
    return submissions;
  }, [submissions, timeRange]);

  // 2. Compute Summary Metrics
  const summaryStats = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let validScoreSum = 0;
    let validScoreCount = 0;
    const activeStudentSet = new Set();

    filteredSubs.forEach(sub => {
      activeStudentSet.add(sub.studentId);
      const correct = sub.correctCount ?? sub.correct ?? 0;
      const wrong = sub.wrongCount ?? sub.wrong ?? 0;
      const blank = sub.blankCount ?? sub.emptyCount ?? 0;
      const qCount = sub.totalQuestions || (correct + wrong + blank) || (Array.isArray(sub.answers) ? sub.answers.length : 10);
      
      totalQuestions += qCount;
      totalCorrect += correct;
      totalWrong += wrong;

      const pct = getSubmissionScorePct(sub);
      if (pct !== null) {
        validScoreSum += pct;
        validScoreCount++;
      }
    });

    const avgScorePct = validScoreCount > 0 ? Math.round(validScoreSum / validScoreCount) : 0;
    const activeCount = activeStudentSet.size;
    const activeRatio = students.length > 0 ? Math.round((activeCount / students.length) * 100) : 0;

    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      avgScorePct,
      testCount: filteredSubs.length,
      activeCount,
      activeRatio
    };
  }, [filteredSubs, students]);

  // 3. Compute Weekly / Daily Question Trend (Pzt, Sal, Çar, Per, Cum, Cts, Paz)
  const weeklyActivityData = useMemo(() => {
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
    const daysMap = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      const dayLabel = `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
      daysMap[key] = { dateKey: key, dayLabel, questions: 0, tests: 0, correct: 0 };
    }

    filteredSubs.forEach(sub => {
      const dateStr = (sub.submittedAt || sub.createdAt || new Date().toISOString()).split('T')[0];
      if (daysMap[dateStr]) {
        const correct = sub.correctCount ?? sub.correct ?? 0;
        const wrong = sub.wrongCount ?? sub.wrong ?? 0;
        const blank = sub.blankCount ?? sub.emptyCount ?? 0;
        const qCount = sub.totalQuestions || (correct + wrong + blank) || (Array.isArray(sub.answers) ? sub.answers.length : 10);

        daysMap[dateStr].questions += qCount;
        daysMap[dateStr].correct += correct;
        daysMap[dateStr].tests += 1;
      }
    });

    return Object.values(daysMap);
  }, [filteredSubs]);

  // 4. Compute Subject Performance Breakdown
  const subjectBreakdown = useMemo(() => {
    const subMap = {};

    filteredSubs.forEach(sub => {
      const subjectName = sub.subject || sub.testSubject || (sub.testTitle ? sub.testTitle.split(' ')[0] : 'Genel') || 'Genel';
      if (!subMap[subjectName]) {
        subMap[subjectName] = { name: subjectName, scoreSum: 0, count: 0, questionCount: 0 };
      }
      const score = getSubmissionScorePct(sub);
      if (score !== null) {
        subMap[subjectName].scoreSum += score;
        subMap[subjectName].count += 1;
      }
      const correct = sub.correctCount ?? sub.correct ?? 0;
      const wrong = sub.wrongCount ?? sub.wrong ?? 0;
      subMap[subjectName].questionCount += (sub.totalQuestions || (correct + wrong) || 10);
    });

    return Object.values(subMap)
      .map(item => ({
        ...item,
        avgScore: item.count > 0 ? Math.round(item.scoreSum / item.count) : 0,
        color: getSubjectTheme(item.name).accent || '#6366f1'
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 6);
  }, [filteredSubs]);

  // Custom Chart Tooltip
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      
      {/* ── TOP HEADER & TIME RANGE SELECTOR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.1rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} color="#6366f1" />
            Sınıf Canlı Performans &amp; Çözüm Analizi
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Öğrencilerinizin çözdüğü testlerin haftalık hacim, net ve ders dağılım göstergeleri.
          </p>
        </div>

        {/* Time Selector Pills */}
        <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
          {[
            { id: 'week', label: 'Son 7 Gün' },
            { id: 'month', label: 'Son 30 Gün' },
            { id: 'all', label: 'Tüm Zamanlar' }
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

      {/* ── 4 KPI CARDS (PULSE STRIP) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Total Questions */}
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

        {/* Success Rate */}
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
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Sınıf Başarı Ort.</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', display: 'block', lineHeight: 1.1 }}>%{summaryStats.avgScorePct}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>🎯 Sınav &amp; Ödev Başarısı</span>
          </div>
        </div>

        {/* Active Students Participation */}
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
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>{summaryStats.activeCount} / {students.length}</span>
            <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 700 }}>👥 %{summaryStats.activeRatio} Katılım Oranı</span>
          </div>
        </div>

        {/* Doğru / Yanlış Oranı */}
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
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Net Soru Dağılımı</span>
          </div>
        </div>
      </div>

      {/* ── 2 CHARTS SIDE-BY-SIDE ON DESKTOP (STACKED ON MOBILE) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        
        {/* CHART 1: WEEKLY RESOLUTION TREND */}
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
              Günlük Soru Çözüm Eğrisi
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Son 7 Gün
            </span>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* CHART 2: SUBJECT BREAKDOWN */}
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
              Ders Bazında Başarı Dağılımı (%)
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Sınıf Ortalaması
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

    </div>
  );
}
