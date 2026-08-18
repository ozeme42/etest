import React, { useState, useMemo, useEffect } from 'react';
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

export default function PeriodicQuestionAnalytics({
  homeworkSubmissions = [],
  mockExams = [],
  studentName = 'Öğrenci'
}) {
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

  // 1. Tüm Test ve Deneme Kayıtlarını Tek Bir Temiz Listede Birleştir
  const unifiedItems = useMemo(() => {
    const list = [];

    // Ödevler ve Konu Testleri
    (homeworkSubmissions || []).forEach(h => {
      if (!h) return;
      const d = h.correctCount || 0;
      const y = h.wrongCount || 0;
      const b = h.emptyCount || 0;
      const q = d + y + b;
      if (q === 0) return;

      const dateStr = (h.date || h.submittedAt || h.createdAt || new Date().toISOString()).slice(0, 10);
      list.push({
        id: h.id,
        title: h.title || 'Konu Testi',
        subject: h.subject || h.subjectName || 'Genel',
        date: dateStr,
        d, y, b, q,
        type: 'test',
        net: h.totalNet || 0
      });
    });

    // Deneme Sınavları
    (mockExams || []).forEach(m => {
      if (!m) return;
      const d = m.totalCorrect || 0;
      const y = m.totalWrong || 0;
      const b = m.totalEmpty || 0;
      const q = d + y + b;
      if (q === 0) return;

      const dateStr = (m.date || m.createdAt || new Date().toISOString()).slice(0, 10);
      list.push({
        id: m.id,
        title: m.title || m.examName || 'Deneme Sınavı',
        subject: 'Deneme Sınavı',
        date: dateStr,
        d, y, b, q,
        type: 'trial',
        net: parseFloat(m.totalNet || m.net || 0),
        scores: m.scores || {}
      });
    });

    return list;
  }, [homeworkSubmissions, mockExams]);

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
      if (i.scores) {
        Object.keys(i.scores).forEach(s => set.add(s));
      }
    });
    return Array.from(set);
  }, [unifiedItems]);

  // 2. Periyotlara Göre Gruplama (Günlük / Haftalık / Aylık)
  const chartData = useMemo(() => {
    const now = new Date();

    if (period === 'daily') {
      const days = [];
      for (let i = dayRange - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const ymd = d.toISOString().slice(0, 10);
        const label = `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
        const dayName = d.toLocaleString('tr-TR', { weekday: 'short' });

        const itemsOnDay = filteredItems.filter(item => item.date === ymd);
        const dCount = itemsOnDay.reduce((acc, it) => acc + it.d, 0);
        const yCount = itemsOnDay.reduce((acc, it) => acc + it.y, 0);
        const bCount = itemsOnDay.reduce((acc, it) => acc + it.b, 0);
        const qCount = dCount + yCount + bCount;
        const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
        const testCount = itemsOnDay.length;

        days.push({
          key: ymd,
          label: `${label}`,
          shortLabel: `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' }).slice(0, 3)}`,
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
        const endDay = new Date();
        endDay.setDate(now.getDate() - (i * 7));
        const startDay = new Date(endDay);
        startDay.setDate(endDay.getDate() - 6);

        const startYmd = startDay.toISOString().slice(0, 10);
        const endYmd = endDay.toISOString().slice(0, 10);
        const label = i === 0 ? 'Bu Hafta' : i === 1 ? 'Geçen H.' : `${startDay.getDate()} ${startDay.toLocaleString('tr-TR', { month: 'short' })}`;

        const itemsInWeek = filteredItems.filter(item => item.date >= startYmd && item.date <= endYmd);
        const dCount = itemsInWeek.reduce((acc, it) => acc + it.d, 0);
        const yCount = itemsInWeek.reduce((acc, it) => acc + it.y, 0);
        const bCount = itemsInWeek.reduce((acc, it) => acc + it.b, 0);
        const qCount = dCount + yCount + bCount;
        const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
        const testCount = itemsInWeek.length;

        weeks.push({
          key: `${startYmd}_${endYmd}`,
          label,
          shortLabel: label,
          subLabel: `${startDay.getDate()}/${startDay.getMonth()+1}-${endDay.getDate()}/${endDay.getMonth()+1}`,
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
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const mStr = String(m).padStart(2, '0');
        const monthKey = `${y}-${mStr}`;
        const label = d.toLocaleString('tr-TR', { month: 'short' });
        const fullLabel = d.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

        const itemsInMonth = filteredItems.filter(item => item.date.startsWith(monthKey));
        const dCount = itemsInMonth.reduce((acc, it) => acc + it.d, 0);
        const yCount = itemsInMonth.reduce((acc, it) => acc + it.y, 0);
        const bCount = itemsInMonth.reduce((acc, it) => acc + it.b, 0);
        const qCount = dCount + yCount + bCount;
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
  }, [period, dayRange, filteredItems]);

  // 3. Seçili Periyot Özeti (Grand Totals)
  const totals = useMemo(() => {
    const totQ = chartData.reduce((acc, d) => acc + d.toplamSoru, 0);
    const totD = chartData.reduce((acc, d) => acc + d.doğru, 0);
    const totY = chartData.reduce((acc, d) => acc + d.yanlış, 0);
    const totB = chartData.reduce((acc, d) => acc + d.boş, 0);
    const totTests = chartData.reduce((acc, d) => acc + d.testSayısı, 0);
    const avgRate = totQ > 0 ? Math.round((totD / totQ) * 100) : 0;

    return { totQ, totD, totY, totB, totTests, avgRate };
  }, [chartData]);

  // 4. Ders Bazlı Dağılım Çubukları
  const subjectBreakdown = useMemo(() => {
    const map = {};
    filteredItems.forEach(it => {
      const subj = it.subject || 'Genel';
      if (!map[subj]) map[subj] = { d: 0, y: 0, b: 0, q: 0, tests: 0 };
      map[subj].d += it.d;
      map[subj].y += it.y;
      map[subj].b += it.b;
      map[subj].q += it.q;
      map[subj].tests += 1;
    });
    return Object.entries(map)
      .map(([name, stat]) => ({
        name,
        ...stat,
        rate: stat.q > 0 ? Math.round((stat.d / stat.q) * 100) : 0
      }))
      .sort((a, b) => b.q - a.q);
  }, [filteredItems]);

  // Custom Chart Tooltip (Mobile Optimized)
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={{
        background: '#ffffff',
        color: '#0f172a',
        padding: isMobile ? '6px 10px' : '8px 12px',
        borderRadius: '10px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        fontSize: isMobile ? '0.72rem' : '0.8rem',
        minWidth: 130
      }}>
        <div style={{ fontWeight: 900, color: '#4f46e5', marginBottom: 3, borderBottom: '1px solid #e2e8f0', paddingBottom: 2 }}>
          {data?.fullLabel || data?.label || label}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '1px 0' }}>
          <span style={{ color: '#64748b' }}>Soru:</span>
          <span style={{ fontWeight: 900, color: '#2563eb' }}>{data?.toplamSoru || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '1px 0' }}>
          <span style={{ color: '#64748b' }}>Doğru:</span>
          <span style={{ fontWeight: 900, color: '#15803d' }}>{data?.doğru || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '1px 0' }}>
          <span style={{ color: '#64748b' }}>Yanlış:</span>
          <span style={{ fontWeight: 900, color: '#b91c1c' }}>{data?.yanlış || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 3, paddingTop: 2, borderTop: '1px dashed #e2e8f0' }}>
          <span style={{ color: '#b45309', fontWeight: 800 }}>Başarı:</span>
          <span style={{ fontWeight: 900, color: '#b45309' }}>%{data?.başarıOranı || 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: isMobile ? '1rem' : '1.25rem',
      border: '1.5px solid #e2e8f0',
      padding: isMobile ? '0.85rem' : '1.35rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
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
            <div style={{ fontSize: isMobile ? '0.92rem' : '1.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              Soru & Başarı Analizi
            </div>
            {!isMobile && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {studentName ? `${studentName} — ` : ''}Günlük, haftalık ve aylık çözüm temposu
              </div>
            )}
          </div>
        </div>

        {/* Periyot Segment Butonları (iOS Tarzı Segmented Control) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <div style={{
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '0.65rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid #e2e8f0'
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
                  color: period === tab.id ? '#ffffff' : '#64748b',
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
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: isMobile ? '0.7rem' : '0.76rem',
                fontWeight: 800,
                color: '#334155',
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
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: isMobile ? '0.7rem' : '0.76rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer',
                maxWidth: isMobile ? 110 : 160
              }}
            >
              <option value="all">🌐 Tümü</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 4'LÜ MİKRO KPI ÖZET KARTLARI (KOMPAKT APP VİTRİNİ) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '0.45rem' : '0.75rem',
        marginBottom: isMobile ? '0.75rem' : '1.1rem'
      }}>
        {/* Toplam Soru */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: isMobile ? '0.75rem' : '0.9rem',
          padding: isMobile ? '0.5rem 0.65rem' : '0.75rem 0.9rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
            Toplam Soru
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>
              {totals.totQ}
            </span>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 800, color: '#2563eb' }}>
              {totals.totTests} Test
            </span>
          </div>
        </div>

        {/* Doğru Sayısı */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: isMobile ? '0.75rem' : '0.9rem',
          padding: isMobile ? '0.5rem 0.65rem' : '0.75rem 0.9rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
            Doğru (D)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
              {totals.totD}
            </span>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 800, color: '#16a34a' }}>
              %{totals.totQ > 0 ? Math.round((totals.totD / totals.totQ) * 100) : 0} D
            </span>
          </div>
        </div>

        {/* Yanlış & Boş */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fecaca',
          borderRadius: isMobile ? '0.75rem' : '0.9rem',
          padding: isMobile ? '0.5rem 0.65rem' : '0.75rem 0.9rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
            Yanlış / Boş
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: '#b91c1c', lineHeight: 1 }}>
              {totals.totY}
            </span>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 800, color: '#94a3b8' }}>
              {totals.totB} Boş
            </span>
          </div>
        </div>

        {/* Başarı Oranı */}
        <div style={{
          background: totals.avgRate >= 70 ? 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: `1px solid ${totals.avgRate >= 70 ? '#e9d5ff' : '#fde68a'}`,
          borderRadius: isMobile ? '0.75rem' : '0.9rem',
          padding: isMobile ? '0.5rem 0.65rem' : '0.75rem 0.9rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: totals.avgRate >= 70 ? '#6b21a8' : '#92400e', textTransform: 'uppercase' }}>
            Başarı Oranı
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: totals.avgRate >= 70 ? '#7e22ce' : '#b45309', lineHeight: 1 }}>
              %{totals.avgRate}
            </span>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 800, color: totals.avgRate >= 70 ? '#7e22ce' : '#b45309' }}>
              {totals.avgRate >= 70 ? '🌟 Süper' : totals.avgRate >= 50 ? '📈 İyi' : '⚠️ Dikkat'}
            </span>
          </div>
        </div>
      </div>

      {/* ── GRAFİK & DETAY GÖRÜNÜM SEÇİCİ SEKMELERİ (MOBİL İÇİN YERDEN TASARRUF) ── */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '0.75rem',
        padding: '3px',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        marginBottom: '0.85rem',
        border: '1px solid #e2e8f0',
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
                padding: isMobile ? '0.35rem 0.4rem' : '0.4rem 0.8rem',
                borderRadius: '0.55rem',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#4f46e5' : '#64748b',
                fontWeight: 900,
                fontSize: isMobile ? '0.72rem' : '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
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
        background: '#ffffff',
        borderRadius: '0.85rem',
        border: '1px solid #e2e8f0',
        padding: isMobile ? '0.75rem 0.5rem 0.35rem' : '1rem 0.85rem',
        minHeight: isMobile ? 210 : 250
      }}>

        {/* 1. Soru Dağılım Grafiği (Stacked Bar) */}
        {activeChartView === 'distribution' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 0.35rem 0.5rem' : '0 0.5rem 0.75rem' }}>
              <span style={{ fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 800, color: '#334155' }}>
                Dönemsel Soru Hacmi (D / Y / B)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 800 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#16a34a' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} /> Doğru
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#dc2626' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} /> Yanlış
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#64748b' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#94a3b8' }} /> Boş
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: isMobile ? 180 : 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey={isMobile ? "shortLabel" : "label"} 
                    stroke="#94a3b8" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="doğru" name="Doğru" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="yanlış" name="Yanlış" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="boş" name="Boş" stackId="a" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Başarı Eğrisi (Area Chart) */}
        {activeChartView === 'trend' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 0.35rem 0.5rem' : '0 0.5rem 0.75rem' }}>
              <span style={{ fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 800, color: '#334155' }}>
                Başarı Yüzdesi Gelişim Eğrisi (%)
              </span>
              <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: 6, fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 800 }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey={isMobile ? "shortLabel" : "label"} 
                    stroke="#94a3b8" 
                    fontSize={isMobile ? 10 : 11} 
                    fontWeight={700}
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
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
                {subjectBreakdown.map(sb => (
                  <div key={sb.name} style={{ background: '#f8fafc', padding: isMobile ? '0.45rem 0.65rem' : '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 800, fontSize: isMobile ? '0.75rem' : '0.82rem', color: '#0f172a' }}>{sb.name}</span>
                      <span style={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.8rem', color: sb.rate >= 70 ? '#15803d' : sb.rate >= 50 ? '#b45309' : '#b91c1c' }}>
                        %{sb.rate} Başarı
                      </span>
                    </div>
                    
                    <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '3px 0' }}>
                      <div style={{
                        width: `${Math.min(100, sb.rate)}%`,
                        height: '100%',
                        background: sb.rate >= 70 ? '#22c55e' : sb.rate >= 50 ? '#f59e0b' : '#ef4444',
                        borderRadius: 3
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.64rem' : '0.7rem', color: '#64748b', fontWeight: 700 }}>
                      <span>{sb.q} Soru ({sb.tests} Test)</span>
                      <span>✅ {sb.d} · ❌ {sb.y} {sb.b > 0 ? `· ⭕ ${sb.b}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', padding: '2rem 0' }}>
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
                <tr style={{ background: '#f1f5f9', color: '#475569', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'left' }}>Tarih / Periyot</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center' }}>Soru</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center' }}>D/Y</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center' }}>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, idx) => (
                  <tr key={d.key || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', fontWeight: 800, color: '#0f172a' }}>
                      {d.shortLabel || d.label} {d.subLabel && period === 'daily' ? `(${d.subLabel})` : ''}
                    </td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>
                      {d.toplamSoru}
                    </td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>
                      <span style={{ color: '#16a34a' }}>{d.doğru}</span>/<span style={{ color: '#dc2626' }}>{d.yanlış}</span>
                    </td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', textAlign: 'center', fontWeight: 900, color: d.başarıOranı >= 70 ? '#15803d' : d.başarıOranı >= 50 ? '#b45309' : '#b91c1c' }}>
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
