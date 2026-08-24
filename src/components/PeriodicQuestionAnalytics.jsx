import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Calendar, TrendingUp, BarChart3, PieChart as PieIcon, Award,
  CheckCircle2, XCircle, MinusCircle, Clock, Zap, Target, BookOpen,
  Filter, ChevronRight, Layers, ArrowUpRight, Flame, ChevronDown, ChevronUp,
  Table as TableIcon, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Cell, ReferenceLine
} from 'recharts';
import {
  getTurkeyYMD,
  getTurkeyToday,
  getTurkeyWeekRange,
  getTurkeyMonthRange
} from '../utils/dateHelpers';

export default function PeriodicQuestionAnalytics({
  homeworkSubmissions = [],
  mockExams = [],
  studentName = 'Öğrenci'
}) {
  const { isDark } = useTheme();

  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [dayRange, setDayRange] = useState(7); // 7 | 14 | 30 for daily
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [activeChartView, setActiveChartView] = useState('distribution'); // 'distribution' | 'trend' | 'subjects' | 'table'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Tüm Test ve Deneme Kayıtlarını Tek Bir Temiz Listede Birleştir (Türkiye Saati Uyumlu)
  const unifiedItems = useMemo(() => {
    const list = [];

    // Ödevler ve Konu Testleri
    (homeworkSubmissions || []).forEach(h => {
      if (!h) return;
      const d = h.correctCount ?? h.correct ?? h.totalCorrect ?? 0;
      const y = h.wrongCount ?? h.wrong ?? h.totalWrong ?? 0;
      const b = h.emptyCount ?? h.blankCount ?? h.empty ?? h.totalEmpty ?? 0;
      const q = d + y + b || h.totalQuestions || 0;
      if (q === 0) return;

      const dateStr = getTurkeyYMD(h.date || h.submittedAt || h.createdAt || h.completedAt);
      list.push({
        id: h.id || `hw_${Math.random()}`,
        title: h.title || 'Konu Testi',
        subject: h.subject || h.subjectName || 'Genel',
        date: dateStr,
        d, y, b, q,
        type: 'test',
        net: parseFloat(h.totalNet || h.net || 0),
        scores: h.scores || {}
      });
    });

    // Deneme Sınavları
    (mockExams || []).forEach(m => {
      if (!m) return;
      let d = m.totalCorrect ?? m.correctCount ?? m.correct ?? 0;
      let y = m.totalWrong ?? m.wrongCount ?? m.wrong ?? 0;
      let b = m.totalEmpty ?? m.emptyCount ?? m.blankCount ?? m.empty ?? 0;

      // Extract from scores dictionary if available
      if (m.scores && typeof m.scores === 'object' && Object.keys(m.scores).length > 0) {
        let scoreD = 0, scoreY = 0, scoreB = 0;
        Object.values(m.scores).forEach(sc => {
          if (sc && typeof sc === 'object') {
            scoreD += Number(sc.d || sc.correct || 0);
            scoreY += Number(sc.y || sc.wrong || 0);
            scoreB += Number(sc.b || sc.empty || sc.blank || 0);
          }
        });
        if (scoreD > 0 || scoreY > 0 || scoreB > 0) {
          d = Math.max(d, scoreD);
          y = Math.max(y, scoreY);
          b = Math.max(b, scoreB);
        }
      }

      const q = d + y + b || Number(m.totalQuestions || m.questionCount || 0);
      if (q === 0) return;

      const dateStr = getTurkeyYMD(m.date || m.createdAt || m.submittedAt);
      list.push({
        id: m.id || `mock_${Math.random()}`,
        title: m.title || m.examName || 'Deneme Sınavı',
        subject: m.subject || 'Deneme Sınavı',
        date: dateStr,
        d, y, b, q,
        type: 'trial',
        net: parseFloat(m.totalNet || m.net || 0),
        scores: m.scores || {}
      });
    });

    return list;
  }, [homeworkSubmissions, mockExams]);

  // Helper: Extract accurate { d, y, b, q, net } for any item according to current subject filter
  const getItemSubjectStats = (item, subj) => {
    if (subj === 'all' || !subj) {
      return { d: item.d, y: item.y, b: item.b, q: item.q, net: item.net };
    }
    if (item.scores && item.scores[subj]) {
      const sc = item.scores[subj];
      const sd = Number(sc.d || sc.correct || 0);
      const sy = Number(sc.y || sc.wrong || 0);
      const sb = Number(sc.b || sc.empty || sc.blank || 0);
      const sq = sd + sy + sb;
      const snet = sc.net !== undefined ? Number(sc.net) : (sd - (sy / 3));
      return { d: sd, y: sy, b: sb, q: sq, net: snet };
    }
    if (item.subject === subj) {
      return { d: item.d, y: item.y, b: item.b, q: item.q, net: item.net };
    }
    return { d: 0, y: 0, b: 0, q: 0, net: 0 };
  };

  // Filtrelenmiş Liste (Ders Filtresine Göre)
  const filteredItems = useMemo(() => {
    if (selectedSubject === 'all') return unifiedItems;
    return unifiedItems.filter(item => {
      if (item.subject === selectedSubject) return true;
      if (item.scores && item.scores[selectedSubject]) return true;
      return false;
    });
  }, [unifiedItems, selectedSubject]);

  // Mevcut Ders Listesi
  const availableSubjects = useMemo(() => {
    const set = new Set();
    unifiedItems.forEach(i => {
      if (i.subject && i.subject !== 'Deneme Sınavı') set.add(i.subject);
      if (i.scores && typeof i.scores === 'object') {
        Object.keys(i.scores).forEach(s => {
          if (s && s !== 'undefined') set.add(s);
        });
      }
    });
    return Array.from(set);
  }, [unifiedItems]);

  // 2. Periyotlara Göre Gruplama (Türkiye Saati Uyumlu: Günlük / Haftalık / Aylık)
  const chartData = useMemo(() => {
    const todayYMD = getTurkeyToday();
    const [ty, tm, td] = todayYMD.split('-').map(Number);

    if (period === 'daily') {
      const days = [];
      for (let i = dayRange - 1; i >= 0; i--) {
        const refDate = new Date(ty, tm - 1, td - i);
        const ymd = getTurkeyYMD(refDate);
        const label = `${refDate.getDate()} ${refDate.toLocaleString('tr-TR', { month: 'short' })}`;
        const dayName = refDate.toLocaleString('tr-TR', { weekday: 'short' });

        const itemsOnDay = filteredItems.filter(item => item.date === ymd);
        let dCount = 0, yCount = 0, bCount = 0, qCount = 0;
        itemsOnDay.forEach(it => {
          const stats = getItemSubjectStats(it, selectedSubject);
          dCount += stats.d;
          yCount += stats.y;
          bCount += stats.b;
          qCount += stats.q;
        });

        const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
        const testCount = itemsOnDay.length;

        days.push({
          key: ymd,
          label: `${label}`,
          shortLabel: `${refDate.getDate()} ${refDate.toLocaleString('tr-TR', { month: 'short' }).slice(0, 3)}`,
          subLabel: dayName,
          doğru: dCount,
          yanlış: yCount,
          boş: bCount,
          toplamSoru: qCount,
          başarıOranı: rate,
          testSayısı: testCount
        });
      }
      return days;
    }

    if (period === 'weekly') {
      const weeks = [];
      for (let i = 5; i >= 0; i--) {
        const refDay = new Date(ty, tm - 1, td - (i * 7));
        const { startYMD, endYMD } = getTurkeyWeekRange(refDay);
        const [sy, sm, sd] = startYMD.split('-').map(Number);
        const [ey, em, ed] = endYMD.split('-').map(Number);
        const startDay = new Date(sy, sm - 1, sd);
        const endDay = new Date(ey, em - 1, ed);

        const label = i === 0 ? 'Bu Hafta' : i === 1 ? 'Geçen H.' : `${sd} ${startDay.toLocaleString('tr-TR', { month: 'short' })}`;

        const itemsInWeek = filteredItems.filter(item => item.date >= startYMD && item.date <= endYMD);
        let dCount = 0, yCount = 0, bCount = 0, qCount = 0;
        itemsInWeek.forEach(it => {
          const stats = getItemSubjectStats(it, selectedSubject);
          dCount += stats.d;
          yCount += stats.y;
          bCount += stats.b;
          qCount += stats.q;
        });

        const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
        const testCount = itemsInWeek.length;

        weeks.push({
          key: `${startYMD}_${endYMD}`,
          label,
          shortLabel: label,
          subLabel: `${sd}/${sm}-${ed}/${em}`,
          doğru: dCount,
          yanlış: yCount,
          boş: bCount,
          toplamSoru: qCount,
          başarıOranı: rate,
          testSayısı: testCount
        });
      }
      return weeks;
    }

    if (period === 'monthly') {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const refDay = new Date(ty, tm - 1 - i, 1);
        const y = refDay.getFullYear();
        const m = refDay.getMonth() + 1;
        const mStr = String(m).padStart(2, '0');
        const monthKey = `${y}-${mStr}`;
        const label = refDay.toLocaleString('tr-TR', { month: 'short' });
        const fullLabel = refDay.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

        const itemsInMonth = filteredItems.filter(item => item.date.startsWith(monthKey));
        let dCount = 0, yCount = 0, bCount = 0, qCount = 0;
        itemsInMonth.forEach(it => {
          const stats = getItemSubjectStats(it, selectedSubject);
          dCount += stats.d;
          yCount += stats.y;
          bCount += stats.b;
          qCount += stats.q;
        });

        const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
        const testCount = itemsInMonth.length;

        months.push({
          key: monthKey,
          label,
          shortLabel: label,
          fullLabel,
          doğru: dCount,
          yanlış: yCount,
          boş: bCount,
          toplamSoru: qCount,
          başarıOranı: rate,
          testSayısı: testCount
        });
      }
      return months;
    }

    return [];
  }, [period, dayRange, filteredItems, selectedSubject]);

  // 3. Seçili Periyot Özeti & Günlük Ortalama (Grand Totals & Daily Average)
  const totals = useMemo(() => {
    const totQ = chartData.reduce((acc, d) => acc + d.toplamSoru, 0);
    const totD = chartData.reduce((acc, d) => acc + d.doğru, 0);
    const totY = chartData.reduce((acc, d) => acc + d.yanlış, 0);
    const totB = chartData.reduce((acc, d) => acc + d.boş, 0);
    const totTests = chartData.reduce((acc, d) => acc + d.testSayısı, 0);
    const avgRate = totQ > 0 ? Math.round((totD / totQ) * 100) : 0;

    const activeDaysCount = chartData.filter(d => d.toplamSoru > 0).length;
    let dailyAvg = 0;
    let activeAvg = 0;
    if (period === 'daily') {
      dailyAvg = totQ > 0 ? parseFloat((totQ / dayRange).toFixed(1)) : 0;
      activeAvg = activeDaysCount > 0 ? Math.round(totQ / activeDaysCount) : 0;
    } else if (period === 'weekly') {
      const daysCount = (chartData.length || 6) * 7;
      dailyAvg = totQ > 0 ? parseFloat((totQ / daysCount).toFixed(1)) : 0;
      activeAvg = Math.round(totQ / (chartData.length || 6));
    } else {
      const daysCount = (chartData.length || 6) * 30;
      dailyAvg = totQ > 0 ? parseFloat((totQ / daysCount).toFixed(1)) : 0;
      activeAvg = Math.round(totQ / (chartData.length || 6));
    }

    return { totQ, totD, totY, totB, totTests, avgRate, dailyAvg, activeAvg, activeDaysCount };
  }, [chartData, period, dayRange]);

  // 4. Ders Bazlı Dağılım Çubukları (Denemelerin dersleri de ilgili derslere dağıtılır)
  const subjectBreakdown = useMemo(() => {
    const map = {};
    unifiedItems.forEach(it => {
      if (it.scores && Object.keys(it.scores).length > 0) {
        Object.entries(it.scores).forEach(([sName, sc]) => {
          if (!sName || sName === 'undefined') return;
          if (!map[sName]) map[sName] = { d: 0, y: 0, b: 0, q: 0, tests: 0 };
          const sd = Number(sc?.d || sc?.correct || 0);
          const sy = Number(sc?.y || sc?.wrong || 0);
          const sb = Number(sc?.b || sc?.empty || sc?.blank || 0);
          map[sName].d += sd;
          map[sName].y += sy;
          map[sName].b += sb;
          map[sName].q += (sd + sy + sb);
          map[sName].tests += 1;
        });
      } else {
        const subj = it.subject || 'Genel';
        if (!map[subj]) map[subj] = { d: 0, y: 0, b: 0, q: 0, tests: 0 };
        map[subj].d += it.d;
        map[subj].y += it.y;
        map[subj].b += it.b;
        map[subj].q += it.q;
        map[subj].tests += 1;
      }
    });
    return Object.entries(map)
      .map(([name, stat]) => ({
        name,
        ...stat,
        rate: stat.q > 0 ? Math.round((stat.d / stat.q) * 100) : 0
      }))
      .filter(s => s.q > 0)
      .sort((a, b) => b.q - a.q);
  }, [unifiedItems]);

  // Custom Chart Tooltip (High Contrast)
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={{
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
        padding: isMobile ? '6px 10px' : '8px 12px',
        borderRadius: '10px',
        border: isDark ? '1.5px solid #334155' : '1.5px solid #cbd5e1',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: isMobile ? '0.72rem' : '0.8rem',
        minWidth: 130
      }}>
        <div style={{ fontWeight: 900, color: isDark ? '#818cf8' : '#4f46e5', marginBottom: 3, borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, paddingBottom: 2 }}>
          {data?.fullLabel || data?.label || label}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '1px 0' }}>
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Soru:</span>
          <span style={{ fontWeight: 900, color: isDark ? '#38bdf8' : '#0284c7' }}>{data?.toplamSoru || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '1px 0' }}>
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Doğru:</span>
          <span style={{ fontWeight: 900, color: isDark ? '#34d399' : '#059669' }}>{data?.doğru || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '1px 0' }}>
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Yanlış:</span>
          <span style={{ fontWeight: 900, color: isDark ? '#f87171' : '#dc2626' }}>{data?.yanlış || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 3, paddingTop: 2, borderTop: `1px dashed ${isDark ? '#334155' : '#e2e8f0'}` }}>
          <span style={{ color: isDark ? '#fbbf24' : '#d97706', fontWeight: 800 }}>Başarı:</span>
          <span style={{ fontWeight: 900, color: isDark ? '#fbbf24' : '#d97706' }}>%{data?.başarıOranı || 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: isMobile ? '1rem' : '1.25rem',
      border: '1.5px solid var(--color-border)',
      padding: isMobile ? '0.85rem 0.75rem' : '1.35rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      color: 'var(--color-text)',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>

      {/* ── ÜST BAŞLIK VE KONTROLLER (APP HEADER) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: isMobile ? '0.5rem' : '0.85rem',
        marginBottom: isMobile ? '0.75rem' : '1rem'
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: isMobile ? 32 : 38,
            height: isMobile ? 32 : 38,
            borderRadius: isMobile ? '0.55rem' : '0.7rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 3px 10px rgba(99,102,241,0.3)',
            flexShrink: 0
          }}>
            <BarChart3 size={isMobile ? 17 : 20} />
          </div>
          <div>
            <div style={{ fontSize: isMobile ? '0.92rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', lineHeight: 1.2 }}>
              Soru & Başarı Analizi
            </div>
            {!isMobile && (
              <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }}>
                {studentName ? `${studentName} — ` : ''}Günlük, haftalık ve aylık çözüm temposu
              </div>
            )}
          </div>
        </div>

        {/* Periyot Segment Butonları (iOS Tarzı Segmented Control) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <div style={{
            background: isDark ? 'var(--color-surface-hover, #1e293b)' : '#f1f5f9',
            padding: '2px',
            borderRadius: '0.65rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            border: isDark ? '1px solid var(--color-border)' : '1.5px solid #cbd5e1'
          }}>
            {[
              { id: 'daily', label: 'Günlük' },
              { id: 'weekly', label: 'Haftalık' },
              { id: 'monthly', label: 'Aylık' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                style={{
                  padding: isMobile ? '0.28rem 0.6rem' : '0.35rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: period === tab.id ? '#4f46e5' : 'transparent',
                  color: period === tab.id ? '#ffffff' : (isDark ? '#94a3b8' : '#334155'),
                  fontWeight: 900,
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: period === tab.id ? '0 2px 6px rgba(79,70,229,0.3)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Günlük Aralık Seçici */}
          {period === 'daily' && (
            <select
              value={dayRange}
              onChange={e => setDayRange(Number(e.target.value))}
              style={{
                padding: isMobile ? '0.25rem 0.45rem' : '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                border: isDark ? '1px solid var(--color-border)' : '1.5px solid #cbd5e1',
                background: isDark ? 'var(--color-surface-hover)' : '#ffffff',
                fontSize: isMobile ? '0.7rem' : '0.76rem',
                fontWeight: 800,
                color: 'var(--color-text, #0f172a)',
                cursor: 'pointer'
              }}
            >
              <option value={7}>7 Gün</option>
              <option value={14}>14 Gün</option>
              <option value={30}>30 Gün</option>
            </select>
          )}

          {/* Ders Filtresi */}
          {availableSubjects.length > 1 && (
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{
                padding: isMobile ? '0.25rem 0.45rem' : '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                border: isDark ? '1px solid var(--color-border)' : '1.5px solid #cbd5e1',
                background: isDark ? 'var(--color-surface-hover)' : '#ffffff',
                fontSize: isMobile ? '0.7rem' : '0.76rem',
                fontWeight: 800,
                color: 'var(--color-text, #0f172a)',
                cursor: 'pointer',
                maxWidth: isMobile ? 110 : 160
              }}
            >
              <option value="all">🌐 Tümü</option>
              {availableSubjects.map((s, idx) => (
                <option key={`${s}_${idx}`} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 5'Lİ MİKRO KPI ÖZET KARTLARI & GÜNLÜK ORTALAMA METRİĞİ ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: isMobile ? '0.45rem' : '0.65rem',
        marginBottom: isMobile ? '0.75rem' : '1.1rem'
      }}>
        {/* 1. Toplam Soru */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.08) 100%)'
            : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: isDark ? '1.5px solid rgba(59, 130, 246, 0.35)' : '1.5px solid #bfdbfe',
          borderRadius: '0.85rem',
          padding: isMobile ? '0.55rem 0.65rem' : '0.7rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '72px',
          boxShadow: isDark ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.08)'
        }}>
          <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 900, color: isDark ? '#60a5fa' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Toplam Soru
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: isDark ? '#93c5fd' : '#1e3a8a', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {totals.totQ}
            </span>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.68rem',
              fontWeight: 900,
              color: isDark ? '#bfdbfe' : '#1d4ed8',
              background: isDark ? 'rgba(59, 130, 246, 0.25)' : '#ffffff',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.4rem',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #bfdbfe',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {totals.totTests} Test
            </span>
          </div>
        </div>

        {/* 2. GÜNLÜK ORTALAMA ÇÖZÜLEN SORU (YENİ METRİK) */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.08) 100%)'
            : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: isDark ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid #fde68a',
          borderRadius: '0.85rem',
          padding: isMobile ? '0.55rem 0.65rem' : '0.7rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '72px',
          boxShadow: isDark ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 900, color: isDark ? '#fbbf24' : '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ⚡ Günlük Ortalama
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: isDark ? '#fde68a' : '#78350f', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {totals.dailyAvg}
            </span>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.68rem',
              fontWeight: 900,
              color: isDark ? '#fde68a' : '#b45309',
              background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#ffffff',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.4rem',
              border: isDark ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fde68a',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {period === 'daily' ? `${totals.activeDaysCount}/${dayRange} Gün` : 'Soru / Gün'}
            </span>
          </div>
        </div>

        {/* 3. Doğru Sayısı */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.08) 100%)'
            : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: isDark ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1.5px solid #a7f3d0',
          borderRadius: '0.85rem',
          padding: isMobile ? '0.55rem 0.65rem' : '0.7rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '72px',
          boxShadow: isDark ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 900, color: isDark ? '#34d399' : '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Doğru (D)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: isDark ? '#6ee7b7' : '#064e3b', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {totals.totD}
            </span>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.68rem',
              fontWeight: 900,
              color: isDark ? '#a7f3d0' : '#047857',
              background: isDark ? 'rgba(16, 185, 129, 0.25)' : '#ffffff',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.4rem',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              %{totals.totQ > 0 ? Math.round((totals.totD / totals.totQ) * 100) : 0} D
            </span>
          </div>
        </div>

        {/* 4. Yanlış & Boş */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.08) 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: isDark ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid #fecaca',
          borderRadius: '0.85rem',
          padding: isMobile ? '0.55rem 0.65rem' : '0.7rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '72px',
          boxShadow: isDark ? 'none' : '0 2px 8px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 900, color: isDark ? '#f87171' : '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Yanlış / Boş
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: isDark ? '#fca5a5' : '#7f1d1d', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {totals.totY}
            </span>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.68rem',
              fontWeight: 900,
              color: isDark ? '#fecaca' : '#991b1b',
              background: isDark ? 'rgba(239, 68, 68, 0.25)' : '#ffffff',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.4rem',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fecaca',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {totals.totB} Boş
            </span>
          </div>
        </div>

        {/* 5. Başarı Oranı */}
        <div style={{
          background: totals.avgRate >= 70
            ? (isDark ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.08) 100%)' : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)')
            : (isDark ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.08) 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'),
          border: totals.avgRate >= 70
            ? (isDark ? '1.5px solid rgba(168, 85, 247, 0.35)' : '1.5px solid #e9d5ff')
            : (isDark ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid #fde68a'),
          borderRadius: '0.85rem',
          padding: isMobile ? '0.55rem 0.65rem' : '0.7rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '72px',
          boxShadow: isDark ? 'none' : (totals.avgRate >= 70 ? '0 2px 8px rgba(168, 85, 247, 0.08)' : '0 2px 8px rgba(245, 158, 11, 0.08)')
        }}>
          <div style={{
            fontSize: isMobile ? '0.64rem' : '0.7rem',
            fontWeight: 900,
            color: totals.avgRate >= 70 ? (isDark ? '#c084fc' : '#6b21a8') : (isDark ? '#fbbf24' : '#b45309'),
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Başarı Oranı
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 3 }}>
            <span style={{
              fontSize: isMobile ? '1.25rem' : '1.45rem',
              fontWeight: 900,
              color: totals.avgRate >= 70 ? (isDark ? '#e9d5ff' : '#581c87') : (isDark ? '#fef3c7' : '#78350f'),
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
              %{totals.avgRate}
            </span>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.68rem',
              fontWeight: 900,
              color: totals.avgRate >= 70 ? (isDark ? '#e9d5ff' : '#7e22ce') : (isDark ? '#fef3c7' : '#92400e'),
              background: isDark ? (totals.avgRate >= 70 ? 'rgba(168, 85, 247, 0.25)' : 'rgba(245, 158, 11, 0.25)') : '#ffffff',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.4rem',
              border: isDark ? (totals.avgRate >= 70 ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)') : (totals.avgRate >= 70 ? '1px solid #e9d5ff' : '1px solid #fde68a'),
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {totals.avgRate >= 70 ? '🌟 Süper' : totals.avgRate >= 50 ? '📈 İyi' : '⚠️ Dikkat'}
            </span>
          </div>
        </div>
      </div>
{/* ── GRAFİK & DETAY GÖRÜNÜM SEÇİCİ SEKMELERİ ── */}
      <div style={{
        background: isDark ? 'var(--color-surface-hover, #1e293b)' : '#f1f5f9',
        borderRadius: '0.75rem',
        padding: '3px',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        marginBottom: '0.85rem',
        border: isDark ? '1px solid var(--color-border)' : '1.5px solid #cbd5e1',
        overflowX: 'auto'
      }}>
        {[
          { id: 'distribution', label: '📊 Soru Dağılımı', short: '📊 Soru' },
          { id: 'trend',        label: '📈 Başarı Eğrisi', short: '📈 Başarı' },
          { id: 'subjects',     label: '📚 Ders Analizi', short: '📚 Dersler' },
          { id: 'table',        label: '📋 Döküm Tablosu', short: '📋 Tablo' }
        ].map(view => {
          const isActive = activeChartView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveChartView(view.id)}
              style={{
                flex: '1 1 auto',
                padding: isMobile ? '0.35rem 0.4rem' : '0.45rem 0.85rem',
                borderRadius: '0.55rem',
                border: isActive ? (isDark ? '1px solid rgba(99,102,241,0.4)' : '1.5px solid #c7d2fe') : 'none',
                background: isActive ? (isDark ? 'var(--color-surface, #0f172a)' : '#ffffff') : 'transparent',
                color: isActive ? '#4f46e5' : (isDark ? '#94a3b8' : '#334155'),
                fontWeight: 900,
                fontSize: isMobile ? '0.72rem' : '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(79,70,229,0.18)' : 'none',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              {isMobile ? view.short : view.label}
            </button>
          );
        })}
      </div>


      {/* ── AKTİF GÖRÜNÜM İÇERİĞİ (ULTRA KOMPAKT VE ŞIK) ── */}
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        borderRadius: '0.85rem',
        border: '1px solid var(--color-border, #e2e8f0)',
        padding: isMobile ? '0.75rem 0.5rem 0.35rem' : '1rem 0.85rem',
        minHeight: isMobile ? 210 : 250
      }}>

        {/* 1. Soru Dağılım Grafiği (Stacked Bar) */}
        {activeChartView === 'distribution' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 0.35rem 0.5rem' : '0 0.5rem 0.75rem' }}>
              <span style={{ fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 800, color: 'var(--color-text, #334155)' }}>
                Dönemsel Soru Hacmi (D / Y / B)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 800 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#16a34a' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} /> Doğru
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#dc2626' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} /> Yanlış
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-text-muted, #64748b)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#94a3b8' }} /> Boş
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: isMobile ? 180 : 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis 
                    dataKey={isMobile ? "shortLabel" : "label"} 
                    stroke="var(--color-text-muted, #94a3b8)" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="var(--color-text-muted, #94a3b8)" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="doğru" name="Doğru" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="yanlış" name="Yanlış" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="boş" name="Boş" stackId="a" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  {totals.dailyAvg > 0 && (
                    <ReferenceLine
                      y={totals.dailyAvg}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={!isMobile ? { value: `Ortalama: ${totals.dailyAvg} Soru`, position: 'insideTopRight', fill: '#d97706', fontSize: 10, fontWeight: 900 } : undefined}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Başarı Eğrisi (Area Chart) */}
        {activeChartView === 'trend' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 0.35rem 0.5rem' : '0 0.5rem 0.75rem' }}>
              <span style={{ fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 800, color: 'var(--color-text, #334155)' }}>
                Başarı Yüzdesi Gelişim Eğrisi (%)
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '1px 6px', borderRadius: 6, fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 800 }}>
                Hedef %70+
              </span>
            </div>

            <div style={{ width: '100%', height: isMobile ? 180 : 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rateGradientMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis 
                    dataKey={isMobile ? "shortLabel" : "label"} 
                    stroke="var(--color-text-muted, #94a3b8)" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="var(--color-text-muted, #94a3b8)" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `%${v}`}
                  />
                  <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="başarıOranı" 
                    name="Başarı Oranı" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#rateGradientMobile)" 
                    dot={{ r: 3, fill: '#4f46e5', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 5, fill: '#4338ca' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. Ders Bazlı Analiz Çubukları */}
        {activeChartView === 'subjects' && (
          <div style={{ padding: '0.25rem 0.35rem' }}>
            {subjectBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: isMobile ? '230px' : '280px', overflowY: 'auto' }}>
                {subjectBreakdown.map((sb, idx) => (
                  <div key={`${sb.name}_${idx}`} style={{ background: 'var(--color-surface-hover, #f8fafc)', padding: isMobile ? '0.45rem 0.65rem' : '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 800, fontSize: isMobile ? '0.75rem' : '0.82rem', color: 'var(--color-text, #0f172a)' }}>{sb.name}</span>
                      <span style={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.8rem', color: sb.rate >= 70 ? '#10b981' : sb.rate >= 50 ? '#f59e0b' : '#ef4444' }}>
                        %{sb.rate} Başarı
                      </span>
                    </div>
                    
                    <div style={{ width: '100%', height: 5, background: 'var(--color-border, #e2e8f0)', borderRadius: 3, overflow: 'hidden', margin: '3px 0' }}>
                      <div style={{
                        width: `${Math.min(100, sb.rate)}%`,
                        height: '100%',
                        background: sb.rate >= 70 ? '#22c55e' : sb.rate >= 50 ? '#f59e0b' : '#ef4444',
                        borderRadius: 3
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.64rem' : '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                      <span>{sb.q} Soru ({sb.tests} Test)</span>
                      <span>✅ {sb.d} · ❌ {sb.y} {sb.b > 0 ? `· ⭕ ${sb.b}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.75rem', padding: '2rem 0' }}>
                Ders bazlı soru kaydı bulunmuyor.
              </div>
            )}
          </div>
        )}

        {/* 4. Döküm Tablosu */}
        {activeChartView === 'table' && (
          <div style={{ overflowX: 'auto', maxHeight: isMobile ? '230px' : '280px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover, #f1f5f9)', color: 'var(--color-text-muted, #475569)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'left' }}>Tarih / Periyot</th>
                  <th style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'center' }}>Soru</th>
                  <th style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'center' }}>D/Y</th>
                  <th style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'center' }}>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, idx) => (
                  <tr key={d.key || idx} style={{ borderBottom: '1px solid var(--color-border, #f1f5f9)' }}>
                    <td style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', fontWeight: 800, color: 'var(--color-text, #0f172a)' }}>
                      {d.shortLabel || d.label} {d.subLabel && period === 'daily' ? `(${d.subLabel})` : ''}
                    </td>
                    <td style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'center', fontWeight: 800, color: '#3b82f6' }}>
                      {d.toplamSoru}
                    </td>
                    <td style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>
                      <span style={{ color: '#10b981' }}>{d.doğru}</span>/<span style={{ color: '#ef4444' }}>{d.yanlış}</span>
                    </td>
                    <td style={{ border: '1px solid var(--color-border, #e2e8f0)', padding: '4px 6px', textAlign: 'center', fontWeight: 900, color: d.başarıOranı >= 70 ? '#10b981' : d.başarıOranı >= 50 ? '#f59e0b' : '#ef4444' }}>
                      %{d.başarıOranı}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
