import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, TrendingUp, CheckCircle2, XCircle, MinusCircle,
  Clock, Zap, Target, BookOpen, ChevronRight, Layers, Flame,
  Table as TableIcon, Sparkles, Activity, Award, Trophy, Filter,
  Calendar, Info, ArrowUpRight, ShieldCheck, Compass
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Cell, ReferenceLine
} from 'recharts';
import {
  getTurkeyYMD,
  getTurkeyToday,
  getTurkeyWeekRange,
  getTurkeyMonthRange,
  extractItemDate
} from '../utils/dateHelpers';

const PeriodicQuestionAnalytics = React.memo(function PeriodicQuestionAnalytics({
  homeworkSubmissions = [],
  mockExams = [],
  studentName = 'Öğrenci'
}) {
  const { isDark } = useTheme();

  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [dayRange, setDayRange] = useState(7); // 7 | 14 | 30 for daily
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [activeChartView, setActiveChartView] = useState('distribution'); // 'distribution' | 'trend' | 'heatmap' | 'subjects' | 'table'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Tüm Test ve Deneme Kayıtlarını Tek Bir Temiz Listede Birleştir (Türkiye Saati Uyumlu)
  const unifiedItems = useMemo(() => {
    const list = [];
    const seenUnifiedKeys = new Set();

    const processItem = (it, type) => {
      if (!it) return;
      let d = it.correctCount ?? it.correct ?? it.totalCorrect ?? 0;
      let y = it.wrongCount ?? it.wrong ?? it.totalWrong ?? 0;
      let b = it.emptyCount ?? it.blankCount ?? it.empty ?? it.totalEmpty ?? 0;

      // Extract from scores dictionary if available
      if (it.scores && typeof it.scores === 'object' && Object.keys(it.scores).length > 0) {
        let scoreD = 0, scoreY = 0, scoreB = 0;
        Object.values(it.scores).forEach(sc => {
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

      const q = d + y + b || it.totalQuestions || 0;
      if (q === 0) return;

      const dateStr = extractItemDate(it);

      let rawTitle = String(it.title || it.examName || 'Test').trim().toLowerCase();
      if (rawTitle.includes('—')) rawTitle = rawTitle.split('—').pop().trim();
      else if (rawTitle.includes(' - ')) rawTitle = rawTitle.split(' - ').pop().trim();
      rawTitle = rawTitle.replace(/\s*\(tüm kitap.*?\)/g, '').replace(/\s*\(kendi eklediğim.*?\)/g, '').trim();

      const rawSubj = String(it.subject || it.subjectName || 'Genel').trim().toLowerCase();
      const uniqueKey = String(it.id || it.submissionId || it.originalSubmissionId || `${rawSubj}___${rawTitle}___${dateStr}___${d}_${y}_${b}`);

      if (seenUnifiedKeys.has(uniqueKey)) {
        return; // Duplicate!
      }

      seenUnifiedKeys.add(uniqueKey);

      list.push({
        id: it.id || `item_${list.length}`,
        title: it.title || it.examName || 'Test',
        subject: it.subject || it.subjectName || 'Genel',
        date: dateStr,
        d, y, b, q,
        type: type,
        net: parseFloat(it.totalNet || it.net || 0),
        scores: it.scores || {}
      });
    };

    (homeworkSubmissions || []).forEach(h => processItem(h, 'test'));
    (mockExams || []).forEach(m => processItem(m, 'trial'));

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

  // 4. Ders Bazlı Dağılım Çubukları
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

  // 5. GitHub Tarzı Çalışma Isı Haritası Hesaplama
  const heatmapData = useMemo(() => {
    const todayYMD = getTurkeyToday();
    const [ty, tm, td] = todayYMD.split('-').map(Number);
    const today = new Date(ty, tm - 1, td);

    const currentDayOfWeek = today.getDay(); // 0: Sun, 1: Mon...
    const daysToSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    const endDate = new Date(today.getTime() + daysToSunday * 86400000);

    const totalWeeks = isMobile ? 14 : 22;
    const totalDays = totalWeeks * 7;
    const startDate = new Date(endDate.getTime() - (totalDays - 1) * 86400000);

    const dayMap = {};
    (filteredItems || []).forEach(it => {
      if (!it.date) return;
      if (!dayMap[it.date]) {
        dayMap[it.date] = { d: 0, y: 0, b: 0, q: 0, tests: 0 };
      }
      const stats = getItemSubjectStats(it, selectedSubject);
      dayMap[it.date].d += stats.d;
      dayMap[it.date].y += stats.y;
      dayMap[it.date].b += stats.b;
      dayMap[it.date].q += stats.q;
      dayMap[it.date].tests += 1;
    });

    const weeks = [];
    let currentWeek = [];
    let bestDay = { q: 0, date: '', label: '' };
    let totalQuestions = 0;
    let activeDaysCount = 0;

    for (let i = 0; i < totalDays; i++) {
      const curDate = new Date(startDate.getTime() + i * 86400000);
      const ymd = getTurkeyYMD(curDate);
      const stats = dayMap[ymd] || { d: 0, y: 0, b: 0, q: 0, tests: 0 };
      const q = stats.q;
      const rate = q > 0 ? Math.round((stats.d / q) * 100) : 0;
      const isFuture = ymd > todayYMD;

      let level = 0;
      if (!isFuture && q > 0) {
        activeDaysCount++;
        totalQuestions += q;
        if (q >= 100) level = 4;
        else if (q >= 50) level = 3;
        else if (q >= 20) level = 2;
        else level = 1;

        if (q > bestDay.q) {
          bestDay = {
            q,
            date: ymd,
            label: `${curDate.getDate()} ${curDate.toLocaleString('tr-TR', { month: 'long' })}`
          };
        }
      }

      const dayObj = {
        date: ymd,
        dayNum: curDate.getDate(),
        monthName: curDate.toLocaleString('tr-TR', { month: 'short' }),
        dayName: curDate.toLocaleString('tr-TR', { weekday: 'short' }),
        fullLabel: `${curDate.getDate()} ${curDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })} ${curDate.toLocaleString('tr-TR', { weekday: 'long' })}`,
        q,
        d: stats.d,
        y: stats.y,
        b: stats.b,
        rate,
        tests: stats.tests,
        level,
        isToday: ymd === todayYMD,
        isFuture
      };

      currentWeek.push(dayObj);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    const pastDaysCount = totalDays - Math.max(0, daysToSunday);
    const consistencyRate = pastDaysCount > 0 ? Math.round((activeDaysCount / pastDaysCount) * 100) : 0;

    return {
      weeks,
      totalWeeks,
      activeDaysCount,
      totalQuestions,
      bestDay,
      consistencyRate
    };
  }, [filteredItems, selectedSubject, isMobile]);

  // ── YENİ NESİL CYBER GLASS TOOLTIP ──
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={{
        background: isDark ? 'rgba(10, 15, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: isDark ? '#ffffff' : '#0f172a',
        padding: '12px 16px',
        borderRadius: '16px',
        border: isDark ? '1.5px solid rgba(129, 140, 248, 0.4)' : '1.5px solid rgba(99, 102, 241, 0.3)',
        boxShadow: isDark
          ? '0 20px 40px -6px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.3)'
          : '0 20px 40px -6px rgba(99, 102, 241, 0.22), 0 4px 16px rgba(0, 0, 0, 0.06)',
        fontSize: '0.82rem',
        minWidth: 165,
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0'
        }}>
          <span style={{ fontWeight: 900, color: '#818cf8', fontSize: '0.9rem' }}>
            {data?.fullLabel || data?.label || label}
          </span>
          {data?.testSayısı > 0 && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: 99,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.4)'
            }}>
              {data.testSayısı} Test
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} /> Toplam Soru:
            </span>
            <span style={{ fontWeight: 900, color: isDark ? '#38bdf8' : '#0284c7', fontSize: '0.9rem' }}>{data?.toplamSoru || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Doğru (D):
            </span>
            <span style={{ fontWeight: 900, color: '#10b981', fontSize: '0.9rem' }}>{data?.doğru || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} /> Yanlış (Y):
            </span>
            <span style={{ fontWeight: 900, color: '#f43f5e', fontSize: '0.9rem' }}>{data?.yanlış || 0}</span>
          </div>
          {data?.boş > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }} /> Boş (B):
              </span>
              <span style={{ fontWeight: 800, color: 'var(--color-text-muted)' }}>{data.boş}</span>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: isDark ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px dashed #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 900, color: data?.başarıOranı >= 70 ? '#10b981' : data?.başarıOranı >= 50 ? '#f59e0b' : '#f43f5e' }}>
            Başarı İsabeti:
          </span>
          <span style={{
            fontSize: '0.96rem',
            fontWeight: 900,
            color: data?.başarıOranı >= 70 ? '#10b981' : data?.başarıOranı >= 50 ? '#f59e0b' : '#f43f5e'
          }}>
            %{data?.başarıOranı || 0}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'relative',
      background: isDark
        ? 'radial-gradient(120% 120% at 50% 0%, #171c38 0%, #0c1222 55%, #050811 100%)'
        : 'radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #f4f6fb 55%, #eef2f9 100%)',
      borderRadius: isMobile ? '1.25rem' : '1.75rem',
      border: isDark ? '1.5px solid rgba(139, 92, 246, 0.35)' : '1.5px solid #dbe2ef',
      padding: isMobile ? '1.1rem 0.9rem' : '1.75rem 2rem',
      boxShadow: isDark
        ? '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : '0 20px 50px -12px rgba(99, 102, 241, 0.15), 0 4px 14px rgba(0, 0, 0, 0.03)',
      fontFamily: "'Outfit', 'Inter', -apple-system, system-ui, sans-serif",
      color: 'var(--color-text)',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>

      {/* ── ÜST NEON LAZER IŞIK HATTI (FUTURISTIC GLOW ACCENT) ── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #38bdf8 0%, #6366f1 30%, #a855f7 60%, #10b981 100%)',
        boxShadow: '0 0 16px rgba(99, 102, 241, 0.7)'
      }} />

      {/* ── ARKA PLAN RADIAL PARILTI ETKİSİ ── */}
      <div style={{
        position: 'absolute',
        top: -80,
        right: isMobile ? -50 : 40,
        width: isMobile ? 220 : 340,
        height: isMobile ? 220 : 340,
        borderRadius: '50%',
        background: isDark
          ? 'radial-gradient(circle, rgba(129, 140, 248, 0.18) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* ── ÜST KONTROL & BAŞLIK BÖLÜMÜ (APP HEADER) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        marginBottom: isMobile ? '1.1rem' : '1.4rem',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Sol: Başlık ve Odak Rozeti */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: isMobile ? 42 : 50,
            height: isMobile ? 42 : 50,
            borderRadius: isMobile ? '0.85rem' : '1rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
            flexShrink: 0
          }}>
            <BarChart3 size={isMobile ? 22 : 26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: isMobile ? '1.08rem' : '1.35rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Soru & Başarı Analizi
              </span>
              <span style={{
                background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '2px 8px',
                borderRadius: 99,
                fontSize: '0.64rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                CANLI ODAK
              </span>
            </div>
            <div style={{ fontSize: isMobile ? '0.74rem' : '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 3 }}>
              {studentName ? `${studentName} — ` : ''}Soru çözüm hacmi, net başarı eğrisi ve hedef takibi
            </div>
          </div>
        </div>

        {/* Sağ: Periyot & Filtreler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* iOS / Gaming Segmented Dock */}
          <div style={{
            background: isDark ? 'rgba(15, 23, 42, 0.85)' : '#e2e8f0',
            padding: '3px',
            borderRadius: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            border: isDark ? '1.5px solid rgba(255, 255, 255, 0.1)' : '1.5px solid #cbd5e1',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {[
              { id: 'daily', label: 'Günlük' },
              { id: 'weekly', label: 'Haftalık' },
              { id: 'monthly', label: 'Aylık' }
            ].map(tab => {
              const isSelected = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriod(tab.id)}
                  style={{
                    padding: isMobile ? '0.38rem 0.72rem' : '0.45rem 0.95rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: isSelected ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                    fontWeight: 900,
                    fontSize: isMobile ? '0.74rem' : '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.45)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Günlük Aralık Seçici (7G / 14G / 30G) */}
          {period === 'daily' && (
            <select
              value={dayRange}
              onChange={e => setDayRange(Number(e.target.value))}
              style={{
                padding: isMobile ? '0.38rem 0.6rem' : '0.45rem 0.85rem',
                borderRadius: '0.75rem',
                border: isDark ? '1.5px solid rgba(99, 102, 241, 0.4)' : '1.5px solid #cbd5e1',
                background: isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                fontSize: isMobile ? '0.74rem' : '0.82rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <option value={7}>📅 7 Gün</option>
              <option value={14}>📅 14 Gün</option>
              <option value={30}>📅 30 Gün</option>
            </select>
          )}

          {/* Ders Filtresi Dropdown */}
          {availableSubjects.length > 1 && (
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{
                padding: isMobile ? '0.38rem 0.6rem' : '0.45rem 0.85rem',
                borderRadius: '0.75rem',
                border: isDark ? '1.5px solid rgba(99, 102, 241, 0.4)' : '1.5px solid #cbd5e1',
                background: isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                fontSize: isMobile ? '0.74rem' : '0.82rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: isMobile ? 120 : 180,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <option value="all">🌐 Tüm Dersler</option>
              {availableSubjects.map((s, idx) => (
                <option key={`${s}_${idx}`} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 5'Lİ YENİ NESİL ODAK HUD PERFORMANS KAPSÜLLERİ ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
        gap: isMobile ? '0.65rem' : '0.85rem',
        marginBottom: isMobile ? '1rem' : '1.4rem',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 2
      }}>
        {/* 1. TOPLAM SORU KAPSÜLÜ */}
        <div style={{
          position: 'relative',
          background: isDark
            ? 'linear-gradient(145deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%)'
            : 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)',
          border: isDark ? '1.5px solid rgba(59, 130, 246, 0.45)' : '1.5px solid #93c5fd',
          borderRadius: isMobile ? '0.85rem' : '1.15rem',
          padding: isMobile ? '0.55rem 0.4rem' : '0.85rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '90px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 8px 20px -4px rgba(59, 130, 246, 0.25)'
            : '0 6px 16px -3px rgba(59, 130, 246, 0.15)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.76rem',
              fontWeight: 900,
              color: isDark ? '#93c5fd' : '#1d4ed8',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              {isMobile ? 'Toplam' : 'Toplam Soru'}
            </span>
            <span style={{ fontSize: isMobile ? '0.85rem' : '1.05rem' }}>📝</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            marginTop: 4
          }}>
            <span style={{
              fontSize: isMobile ? '1.25rem' : '1.65rem',
              fontWeight: 900,
              color: isDark ? '#bfdbfe' : '#1e3a8a',
              lineHeight: 1
            }}>
              {totals.totQ}
            </span>
            <span style={{
              fontSize: isMobile ? '0.58rem' : '0.72rem',
              fontWeight: 900,
              color: isDark ? '#93c5fd' : '#1d4ed8',
              background: isDark ? 'rgba(59, 130, 246, 0.25)' : '#ffffff',
              padding: '2px 6px',
              borderRadius: 6,
              border: isDark ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #bfdbfe',
              whiteSpace: 'nowrap'
            }}>
              {totals.totTests} Test
            </span>
          </div>
        </div>

        {/* 2. GÜNLÜK HIZ / ORTALAMA KAPSÜLÜ */}
        <div style={{
          position: 'relative',
          background: isDark
            ? 'linear-gradient(145deg, rgba(180, 83, 9, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%)'
            : 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)',
          border: isDark ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1.5px solid #fcd34d',
          borderRadius: isMobile ? '0.85rem' : '1.15rem',
          padding: isMobile ? '0.55rem 0.4rem' : '0.85rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '90px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 8px 20px -4px rgba(245, 158, 11, 0.25)'
            : '0 6px 16px -3px rgba(245, 158, 11, 0.15)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.76rem',
              fontWeight: 900,
              color: isDark ? '#fde68a' : '#b45309',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              {isMobile ? 'Tempo' : 'Günlük Hız'}
            </span>
            <span style={{ fontSize: isMobile ? '0.85rem' : '1.05rem' }}>⚡</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            marginTop: 4
          }}>
            <span style={{
              fontSize: isMobile ? '1.25rem' : '1.65rem',
              fontWeight: 900,
              color: isDark ? '#fef3c7' : '#78350f',
              lineHeight: 1
            }}>
              {totals.dailyAvg}
            </span>
            <span style={{
              fontSize: isMobile ? '0.58rem' : '0.72rem',
              fontWeight: 900,
              color: isDark ? '#fde68a' : '#b45309',
              background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#ffffff',
              padding: '2px 6px',
              borderRadius: 6,
              border: isDark ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #fde68a',
              whiteSpace: 'nowrap'
            }}>
              {period === 'daily' ? `${totals.activeDaysCount}/${dayRange} Gün` : 'Soru/G'}
            </span>
          </div>
        </div>

        {/* 3. DOĞRU (D) KAPSÜLÜ */}
        <div style={{
          position: 'relative',
          background: isDark
            ? 'linear-gradient(145deg, rgba(6, 95, 70, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%)'
            : 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)',
          border: isDark ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1.5px solid #6ee7b7',
          borderRadius: isMobile ? '0.85rem' : '1.15rem',
          padding: isMobile ? '0.55rem 0.4rem' : '0.85rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '90px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 8px 20px -4px rgba(16, 185, 129, 0.25)'
            : '0 6px 16px -3px rgba(16, 185, 129, 0.15)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.76rem',
              fontWeight: 900,
              color: isDark ? '#6ee7b7' : '#047857',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              {isMobile ? 'Doğru' : 'Doğru (D)'}
            </span>
            <span style={{ fontSize: isMobile ? '0.85rem' : '1.05rem' }}>🎯</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            marginTop: 4
          }}>
            <span style={{
              fontSize: isMobile ? '1.25rem' : '1.65rem',
              fontWeight: 900,
              color: isDark ? '#a7f3d0' : '#064e3b',
              lineHeight: 1
            }}>
              {totals.totD}
            </span>
            <span style={{
              fontSize: isMobile ? '0.58rem' : '0.72rem',
              fontWeight: 900,
              color: isDark ? '#6ee7b7' : '#047857',
              background: isDark ? 'rgba(16, 185, 129, 0.25)' : '#ffffff',
              padding: '2px 6px',
              borderRadius: 6,
              border: isDark ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid #a7f3d0',
              whiteSpace: 'nowrap'
            }}>
              %{totals.totQ > 0 ? Math.round((totals.totD / totals.totQ) * 100) : 0} D
            </span>
          </div>
        </div>

        {/* 4. YANLIŞ & BOŞ KAPSÜLÜ */}
        <div style={{
          position: 'relative',
          background: isDark
            ? 'linear-gradient(145deg, rgba(153, 27, 27, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%)'
            : 'linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%)',
          border: isDark ? '1.5px solid rgba(239, 68, 68, 0.45)' : '1.5px solid #fca5a5',
          borderRadius: isMobile ? '0.85rem' : '1.15rem',
          padding: isMobile ? '0.55rem 0.4rem' : '0.85rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '90px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 8px 20px -4px rgba(239, 68, 68, 0.25)'
            : '0 6px 16px -3px rgba(239, 68, 68, 0.15)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.76rem',
              fontWeight: 900,
              color: isDark ? '#fca5a5' : '#b91c1c',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              {isMobile ? 'Yanlış' : 'Yanlış / Boş'}
            </span>
            <span style={{ fontSize: isMobile ? '0.85rem' : '1.05rem' }}>❌</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            marginTop: 4
          }}>
            <span style={{
              fontSize: isMobile ? '1.25rem' : '1.65rem',
              fontWeight: 900,
              color: isDark ? '#fecaca' : '#7f1d1d',
              lineHeight: 1
            }}>
              {totals.totY}
            </span>
            <span style={{
              fontSize: isMobile ? '0.58rem' : '0.72rem',
              fontWeight: 900,
              color: isDark ? '#fca5a5' : '#991b1b',
              background: isDark ? 'rgba(239, 68, 68, 0.25)' : '#ffffff',
              padding: '2px 6px',
              borderRadius: 6,
              border: isDark ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid #fecaca',
              whiteSpace: 'nowrap'
            }}>
              {totals.totB} Boş
            </span>
          </div>
        </div>

        {/* 5. BAŞARI SKORU KAPSÜLÜ */}
        <div style={{
          position: 'relative',
          gridColumn: isMobile ? 'span 2' : 'auto',
          background: totals.avgRate >= 70
            ? (isDark ? 'linear-gradient(145deg, rgba(126, 34, 206, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'linear-gradient(145deg, #faf5ff 0%, #f3e8ff 100%)')
            : (isDark ? 'linear-gradient(145deg, rgba(180, 83, 9, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)'),
          border: totals.avgRate >= 70
            ? (isDark ? '1.5px solid rgba(168, 85, 247, 0.5)' : '1.5px solid #d8b4fe')
            : (isDark ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1.5px solid #fde68a'),
          borderRadius: isMobile ? '0.85rem' : '1.15rem',
          padding: isMobile ? '0.55rem 0.4rem' : '0.85rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '64px' : '90px',
          overflow: 'hidden',
          boxShadow: isDark
            ? (totals.avgRate >= 70 ? '0 8px 24px -4px rgba(168, 85, 247, 0.35)' : '0 8px 20px -4px rgba(245, 158, 11, 0.25)')
            : '0 6px 16px -3px rgba(168, 85, 247, 0.15)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.76rem',
              fontWeight: 900,
              color: totals.avgRate >= 70 ? (isDark ? '#e9d5ff' : '#6b21a8') : (isDark ? '#fde68a' : '#b45309'),
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              {isMobile ? 'Başarı' : 'Başarı Oranı'}
            </span>
            <span style={{ fontSize: isMobile ? '0.85rem' : '1.05rem' }}>
              {totals.avgRate >= 70 ? '👑' : totals.avgRate >= 50 ? '📈' : '🎯'}
            </span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            marginTop: 4
          }}>
            <span style={{
              fontSize: isMobile ? '1.25rem' : '1.65rem',
              fontWeight: 900,
              color: totals.avgRate >= 70 ? (isDark ? '#f3e8ff' : '#581c87') : (isDark ? '#fef3c7' : '#78350f'),
              lineHeight: 1
            }}>
              %{totals.avgRate}
            </span>
            <span style={{
              fontSize: isMobile ? '0.58rem' : '0.72rem',
              fontWeight: 900,
              color: totals.avgRate >= 70 ? (isDark ? '#f3e8ff' : '#7e22ce') : (isDark ? '#fef3c7' : '#92400e'),
              background: isDark ? (totals.avgRate >= 70 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(245, 158, 11, 0.3)') : '#ffffff',
              padding: '2px 6px',
              borderRadius: 6,
              border: isDark ? (totals.avgRate >= 70 ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(245, 158, 11, 0.5)') : (totals.avgRate >= 70 ? '1px solid #d8b4fe' : '1px solid #fde68a'),
              whiteSpace: 'nowrap'
            }}>
              {totals.avgRate >= 70 ? '🌟 Efsane' : totals.avgRate >= 50 ? 'Dengeli' : 'Geliştir'}
            </span>
          </div>
        </div>
      </div>

      {/* ── GÖRÜNÜM SEÇİCİ SEKMELERİ (FUTURISTIC GAME DOCK) ── */}
      <div style={{
        background: isDark ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9',
        borderRadius: '0.95rem',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: '1.25rem',
        border: isDark ? '1.5px solid rgba(255, 255, 255, 0.08)' : '1.5px solid #cbd5e1',
        overflowX: 'auto',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {[
          { id: 'distribution', label: '📊 Soru Dağılımı', short: '📊 Dağılım' },
          { id: 'trend',        label: '📈 Başarı Eğrisi', short: '📈 Eğri' },
          { id: 'heatmap',      label: '📅 Isı Haritası',  short: '📅 Isı' },
          { id: 'subjects',     label: '📚 Ders Analizi',  short: '📚 Dersler' },
          { id: 'table',        label: '📋 Döküm Tablosu', short: '📋 Tablo' }
        ].map(view => {
          const isActive = activeChartView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveChartView(view.id)}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                padding: isMobile ? '0.48rem 0.4rem' : '0.62rem 0.75rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                fontWeight: 900,
                fontSize: isMobile ? '0.74rem' : '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 4px 16px rgba(99, 102, 241, 0.45)' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center'
              }}
              title={view.label}
            >
              {isMobile ? view.short : view.label}
            </button>
          );
        })}
      </div>

      {/* ── GRAFİK VE İÇERİK ARENASI ── */}
      <div style={{
        background: isDark ? 'rgba(10, 15, 30, 0.75)' : '#ffffff',
        borderRadius: '1.25rem',
        border: isDark ? '1.5px solid rgba(255, 255, 255, 0.08)' : '1.5px solid #e2e8f0',
        padding: isMobile ? '1rem 0.75rem' : '1.4rem 1.35rem',
        minHeight: isMobile ? 240 : 290,
        boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.02)'
      }}>

        {/* 1. Soru Dağılım Grafiği (BarChart - Gradient Pill Bars) */}
        {activeChartView === 'distribution' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              padding: isMobile ? '0 0.25rem 0.75rem' : '0 0.5rem 1rem'
            }}>
              <span style={{ fontSize: isMobile ? '0.82rem' : '0.94rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📊 Dönemsel Soru Hacmi (Doğru / Yanlış / Boş)</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 900 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981' }} /> Doğru
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f43f5e' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f43f5e' }} /> Yanlış
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#94a3b8' }} /> Boş
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: isMobile ? 210 : 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyberGreenBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="cyberRedBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="cyberGrayBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#64748b" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.2)'} vertical={false} />
                  <XAxis 
                    dataKey={isMobile ? "shortLabel" : "label"} 
                    stroke="var(--color-text-muted)" 
                    fontSize={isMobile ? 11 : 12} 
                    fontWeight={800}
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="var(--color-text-muted)" 
                    fontSize={isMobile ? 11 : 12} 
                    fontWeight={800}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="doğru" name="Doğru" stackId="a" fill="url(#cyberGreenBar)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="yanlış" name="Yanlış" stackId="a" fill="url(#cyberRedBar)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="boş" name="Boş" stackId="a" fill="url(#cyberGrayBar)" radius={[5, 5, 0, 0]} />
                  {totals.dailyAvg > 0 && (
                    <ReferenceLine
                      y={totals.dailyAvg}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={!isMobile ? { value: `⚡ Ortalama: ${totals.dailyAvg} Soru`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 11, fontWeight: 900 } : undefined}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Başarı Eğrisi (AreaChart - Neon Wave) */}
        {activeChartView === 'trend' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              padding: isMobile ? '0 0.25rem 0.75rem' : '0 0.5rem 1rem'
            }}>
              <span style={{ fontSize: isMobile ? '0.82rem' : '0.94rem', fontWeight: 900, color: 'var(--color-text)' }}>
                📈 Başarı Yüzdesi Gelişim Eğrisi (%)
              </span>
              <span style={{
                background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
                color: '#10b981',
                border: '1.5px solid rgba(16, 185, 129, 0.45)',
                padding: '3px 10px',
                borderRadius: 8,
                fontSize: isMobile ? '0.68rem' : '0.78rem',
                fontWeight: 900
              }}>
                🎯 Hedef Çizgisi: %70
              </span>
            </div>

            <div style={{ width: '100%', height: isMobile ? 210 : 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyberNeonRateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6}/>
                      <stop offset="60%" stopColor="#a855f7" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.2)'} vertical={false} />
                  <XAxis 
                    dataKey={isMobile ? "shortLabel" : "label"} 
                    stroke="var(--color-text-muted)" 
                    fontSize={isMobile ? 11 : 12} 
                    fontWeight={800}
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="var(--color-text-muted)" 
                    fontSize={isMobile ? 11 : 12} 
                    fontWeight={800}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `%${v}`}
                  />
                  <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="başarıOranı" 
                    name="Başarı Oranı" 
                    stroke="#818cf8" 
                    strokeWidth={3.5}
                    fillOpacity={1} 
                    fill="url(#cyberNeonRateGradient)" 
                    dot={{ r: 4.5, fill: '#6366f1', strokeWidth: 2.5, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#4f46e5', strokeWidth: 3, stroke: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. GitHub Tarzı Çalışma Isı Haritası (OLED Tiles) */}
        {activeChartView === 'heatmap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
            {/* Heatmap Üst Başlık & Rozetler */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: isMobile ? '0.86rem' : '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📅 Günlük Çalışma Isı Haritası</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7', color: '#10b981', padding: '2px 8px', borderRadius: 8 }}>
                    Son {heatmapData.totalWeeks} Hafta
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                  Kutular günleri temsil eder; renk parladıkça çözülen soru adedi artar.
                </div>
              </div>

              {/* KPI Rozetleri */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, padding: '3px 10px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  ⚡ <strong>{heatmapData.activeDaysCount}</strong> Aktif Gün
                </span>
                {heatmapData.bestDay.q > 0 && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, padding: '3px 10px', borderRadius: 8, background: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7', border: '1px solid rgba(245,158,11,0.4)', color: '#d97706' }}>
                    👑 Rekor: <strong>{heatmapData.bestDay.q} Soru</strong>
                  </span>
                )}
                <span style={{ fontSize: '0.74rem', fontWeight: 900, padding: '3px 10px', borderRadius: 8, background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff', border: '1px solid rgba(99,102,241,0.4)', color: '#4f46e5' }}>
                  📈 %{heatmapData.consistencyRate} Devamlılık
                </span>
              </div>
            </div>

            {/* Isı Haritası Matrisi */}
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
              <div style={{ width: '100%', minWidth: isMobile ? '360px' : 'auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 3 : 5 }}>
                
                {/* Ay Başlıkları Satırı */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, marginBottom: 2 }}>
                  <span style={{ width: isMobile ? 26 : 32, flexShrink: 0 }} />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${heatmapData.totalWeeks}, minmax(0, 1fr))`,
                    width: '100%',
                    gap: isMobile ? '3px' : '5px'
                  }}>
                    {heatmapData.weeks.map((week, wIdx) => {
                      const firstDay = week[0];
                      const prevWeekFirstDay = wIdx > 0 ? heatmapData.weeks[wIdx - 1][0] : null;
                      const isNewMonth = !prevWeekFirstDay || (firstDay && firstDay.monthName !== prevWeekFirstDay.monthName);
                      return (
                        <div key={wIdx} style={{ fontSize: '0.66rem', fontWeight: 900, color: 'var(--color-text-muted)', overflow: 'visible', whiteSpace: 'nowrap', userSelect: 'none' }}>
                          {isNewMonth ? firstDay.monthName : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gün Satırları (Pzt - Paz) */}
                {['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'].map((dayLabel, dayIdx) => (
                  <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, width: '100%' }}>
                    <span style={{
                      width: isMobile ? 26 : 32,
                      fontSize: isMobile ? '0.62rem' : '0.74rem',
                      fontWeight: 800,
                      color: 'var(--color-text-muted)',
                      textAlign: 'right',
                      flexShrink: 0,
                      userSelect: 'none'
                    }}>
                      {dayIdx % 2 === 0 ? dayLabel : ''}
                    </span>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${heatmapData.totalWeeks}, minmax(0, 1fr))`,
                      width: '100%',
                      gap: isMobile ? '3px' : '5px'
                    }}>
                      {heatmapData.weeks.map((week, wIdx) => {
                        const day = week[dayIdx];
                        if (!day) return <div key={wIdx} style={{ width: '100%', aspectRatio: '1/1' }} />;

                        let bg = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
                        let border = isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #cbd5e1';
                        let shadow = 'none';

                        if (!day.isFuture) {
                          if (day.level === 1) {
                            bg = isDark ? '#064e3b' : '#bbf7d0';
                            border = isDark ? '1px solid #065f46' : '1px solid #86efac';
                          } else if (day.level === 2) {
                            bg = isDark ? '#047857' : '#4ade80';
                            border = isDark ? '1px solid #059669' : '1px solid #22c55e';
                          } else if (day.level === 3) {
                            bg = isDark ? '#059669' : '#22c55e';
                            border = isDark ? '1px solid #10b981' : '1px solid #16a34a';
                          } else if (day.level === 4) {
                            bg = isDark ? '#10b981' : '#15803d';
                            border = '1.5px solid #f59e0b';
                            shadow = '0 0 12px rgba(16,185,129,0.6)';
                          }
                        }

                        if (day.isToday) {
                          border = '2px solid #6366f1';
                        }

                        const isSelected = selectedHeatmapDay?.date === day.date;
                        if (isSelected) {
                          border = '2px solid #ffffff';
                          shadow = '0 0 14px #6366f1';
                        }

                        return (
                          <div
                            key={day.date || wIdx}
                            onClick={() => !day.isFuture && setSelectedHeatmapDay(day)}
                            onMouseEnter={() => !day.isFuture && !isMobile && setSelectedHeatmapDay(day)}
                            style={{
                              width: '100%',
                              aspectRatio: '1/1',
                              minHeight: isMobile ? 14 : 18,
                              maxHeight: 28,
                              borderRadius: isMobile ? 4 : 6,
                              background: bg,
                              border,
                              boxShadow: shadow,
                              cursor: day.isFuture ? 'default' : 'pointer',
                              opacity: day.isFuture ? 0.3 : 1,
                              transition: 'all 0.15s ease',
                              transform: isSelected ? 'scale(1.22)' : 'none',
                              zIndex: isSelected ? 5 : 1
                            }}
                            title={`${day.fullLabel}: ${day.q} Soru (${day.rate}% Başarı)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lejant & Seçili Gün Detay Çubuğu */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>
                <span>Daha Az</span>
                <span style={{ width: 13, height: 13, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', display: 'inline-block' }} />
                <span style={{ width: 13, height: 13, borderRadius: 3, background: isDark ? '#064e3b' : '#bbf7d0', display: 'inline-block' }} />
                <span style={{ width: 13, height: 13, borderRadius: 3, background: isDark ? '#047857' : '#4ade80', display: 'inline-block' }} />
                <span style={{ width: 13, height: 13, borderRadius: 3, background: isDark ? '#059669' : '#22c55e', display: 'inline-block' }} />
                <span style={{ width: 13, height: 13, borderRadius: 3, background: isDark ? '#10b981' : '#15803d', border: '1px solid #f59e0b', display: 'inline-block' }} />
                <span>Daha Çok</span>
              </div>

              {selectedHeatmapDay ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff',
                  padding: '5px 14px',
                  borderRadius: 10,
                  border: '1.5px solid rgba(99, 102, 241, 0.45)',
                  fontSize: '0.78rem',
                  fontWeight: 900
                }}>
                  <span style={{ color: 'var(--color-text)' }}>📅 {selectedHeatmapDay.fullLabel}:</span>
                  <span style={{ color: '#4f46e5' }}><strong>{selectedHeatmapDay.q} Soru</strong> ({selectedHeatmapDay.tests} Test)</span>
                  {selectedHeatmapDay.q > 0 && (
                    <>
                      <span style={{ color: '#10b981' }}>{selectedHeatmapDay.d}D</span>
                      <span style={{ color: '#f43f5e' }}>{selectedHeatmapDay.y}Y</span>
                      <span style={{ color: '#d97706' }}>%{selectedHeatmapDay.rate}</span>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontStyle: 'italic', fontWeight: 600 }}>
                  Detay görmek için bir güne dokunun veya üzerine gelin 👆
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Ders Bazlı Analiz Çubukları */}
        {activeChartView === 'subjects' && (
          <div style={{ padding: '0.2rem' }}>
            {subjectBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: isMobile ? '260px' : '320px', overflowY: 'auto' }}>
                {subjectBreakdown.map((sb, idx) => {
                  const rateColor = sb.rate >= 70 ? '#10b981' : sb.rate >= 50 ? '#f59e0b' : '#f43f5e';
                  return (
                    <div
                      key={`${sb.name}_${idx}`}
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                        padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1.15rem',
                        borderRadius: '0.95rem',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontWeight: 900, fontSize: isMobile ? '0.85rem' : '0.96rem', color: 'var(--color-text)' }}>
                          {sb.name}
                        </span>
                        <span style={{
                          fontWeight: 900,
                          fontSize: isMobile ? '0.78rem' : '0.88rem',
                          color: rateColor,
                          background: `${rateColor}20`,
                          border: `1px solid ${rateColor}45`,
                          padding: '2px 8px',
                          borderRadius: 8
                        }}>
                          %{sb.rate} Başarı
                        </span>
                      </div>
                      
                      {/* Çift Tonlu İlerleme Çubuğu */}
                      <div style={{ width: '100%', height: 7, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden', margin: '6px 0' }}>
                        <div style={{
                          width: `${Math.min(100, sb.rate)}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${rateColor} 0%, #6366f1 100%)`,
                          borderRadius: 99,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.72rem' : '0.78rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>
                        <span>{sb.q} Soru ({sb.tests} Test)</span>
                        <span>✅ {sb.d}D · ❌ {sb.y}Y {sb.b > 0 ? `· ⭕ ${sb.b}B` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '2.5rem 0', fontWeight: 800 }}>
                Ders bazlı soru kaydı bulunmuyor.
              </div>
            )}
          </div>
        )}

        {/* 5. Döküm Tablosu */}
        {activeChartView === 'table' && (
          <div style={{ overflowX: 'auto', maxHeight: isMobile ? '260px' : '320px', borderRadius: '0.85rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '0.74rem' : '0.84rem' }}>
              <thead>
                <tr style={{ background: isDark ? 'rgba(30, 41, 59, 0.95)' : '#f1f5f9', color: 'var(--color-text-muted)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'left', fontWeight: 900 }}>Tarih / Periyot</th>
                  <th style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center', fontWeight: 900 }}>Soru</th>
                  <th style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center', fontWeight: 900 }}>D / Y</th>
                  <th style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center', fontWeight: 900 }}>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, idx) => (
                  <tr key={d.key || idx} style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9' }}>
                    <td style={{ border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0', padding: '8px 12px', fontWeight: 900, color: 'var(--color-text)' }}>
                      {d.shortLabel || d.label} {d.subLabel && period === 'daily' ? `(${d.subLabel})` : ''}
                    </td>
                    <td style={{ border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center', fontWeight: 900, color: '#3b82f6' }}>
                      {d.toplamSoru}
                    </td>
                    <td style={{ border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>
                      <span style={{ color: '#10b981' }}>{d.doğru}</span> / <span style={{ color: '#f43f5e' }}>{d.yanlış}</span>
                    </td>
                    <td style={{ border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center', fontWeight: 900, color: d.başarıOranı >= 70 ? '#10b981' : d.başarıOranı >= 50 ? '#f59e0b' : '#f43f5e' }}>
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
});

export default PeriodicQuestionAnalytics;