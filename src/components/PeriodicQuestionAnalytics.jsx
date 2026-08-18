import React, { useState, useMemo } from 'react';
import {
  Calendar, TrendingUp, BarChart3, PieChart as PieIcon, Award,
  CheckCircle2, XCircle, MinusCircle, Clock, Zap, Target, BookOpen,
  Filter, ChevronRight, Layers, ArrowUpRight, Flame
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
      // Son X gün
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
      // Son 6 Hafta
      const weeks = [];
      for (let i = 5; i >= 0; i--) {
        const endDay = new Date();
        endDay.setDate(now.getDate() - (i * 7));
        const startDay = new Date(endDay);
        startDay.setDate(endDay.getDate() - 6);

        const startYmd = startDay.toISOString().slice(0, 10);
        const endYmd = endDay.toISOString().slice(0, 10);
        const label = i === 0 ? 'Bu Hafta' : i === 1 ? 'Geçen Hafta' : `${startDay.getDate()} ${startDay.toLocaleString('tr-TR', { month: 'short' })} - ${endDay.getDate()} ${endDay.toLocaleString('tr-TR', { month: 'short' })}`;

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
          subLabel: `${startDay.getDate()}/${startDay.getMonth()+1} - ${endDay.getDate()}/${endDay.getMonth()+1}`,
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
      // Son 6 Ay
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const mStr = String(m).padStart(2, '0');
        const monthKey = `${y}-${mStr}`;
        const label = d.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
        const shortLabel = d.toLocaleString('tr-TR', { month: 'short' });

        const itemsInMonth = filteredItems.filter(item => item.date.startsWith(monthKey));
        const dCount = itemsInMonth.reduce((acc, it) => acc + it.d, 0);
        const yCount = itemsInMonth.reduce((acc, it) => acc + it.y, 0);
        const bCount = itemsInMonth.reduce((acc, it) => acc + it.b, 0);
        const qCount = dCount + yCount + bCount;
        const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
        const testCount = itemsInMonth.length;

        months.push({
          key: monthKey,
          label: shortLabel,
          fullLabel: label,
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

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={{
        background: '#0f172a',
        color: '#f8fafc',
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        border: '1.5px solid rgba(165, 180, 252, 0.4)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        fontSize: '0.8rem',
        minWidth: 160
      }}>
        <div style={{ fontWeight: 900, color: '#a5b4fc', marginBottom: 4, borderBottom: '1px solid #334155', paddingBottom: 3 }}>
          📅 {data?.label || label} {data?.subLabel ? `(${data.subLabel})` : ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '2px 0' }}>
          <span style={{ color: '#94a3b8' }}>✏️ Toplam Soru:</span>
          <span style={{ fontWeight: 900, color: '#60a5fa' }}>{data?.toplamSoru || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '2px 0' }}>
          <span style={{ color: '#4ade80' }}>✅ Doğru:</span>
          <span style={{ fontWeight: 900, color: '#4ade80' }}>{data?.doğru || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '2px 0' }}>
          <span style={{ color: '#f87171' }}>❌ Yanlış:</span>
          <span style={{ fontWeight: 900, color: '#f87171' }}>{data?.yanlış || 0}</span>
        </div>
        {data?.boş > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '2px 0' }}>
            <span style={{ color: '#94a3b8' }}>⭕ Boş:</span>
            <span style={{ fontWeight: 900, color: '#cbd5e1' }}>{data?.boş || 0}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, paddingTop: 4, borderTop: '1px dashed #334155' }}>
          <span style={{ color: '#fbbf24', fontWeight: 800 }}>🏆 Başarı Oranı:</span>
          <span style={{ fontWeight: 900, color: '#fbbf24' }}>%{data?.başarıOranı || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '2px 0' }}>
          <span style={{ color: '#c084fc' }}>📝 Test / Sınav:</span>
          <span style={{ fontWeight: 800, color: '#e2e8f0' }}>{data?.testSayısı || 0} Adet</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '1.25rem',
      border: '1.5px solid #e2e8f0',
      padding: '1.5rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>

      {/* ── ÜST BAŞLIK VE KONTROLLER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1.5px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
          }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              Periyodik Soru & Başarı Analizi
            </h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              {studentName ? `${studentName} — ` : ''}Günlük, haftalık ve aylık soru temposu ve başarı karnesi
            </p>
          </div>
        </div>

        {/* Periyot Seçici Buton Grubu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Gün / Hafta / Ay Segmented Control */}
          <div style={{
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid #cbd5e1'
          }}>
            <button
              onClick={() => setPeriod('daily')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: period === 'daily' ? '#4f46e5' : 'transparent',
                color: period === 'daily' ? 'white' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              📅 Günlük
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: period === 'weekly' ? '#4f46e5' : 'transparent',
                color: period === 'weekly' ? 'white' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              🗓️ Haftalık
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: period === 'monthly' ? '#4f46e5' : 'transparent',
                color: period === 'monthly' ? 'white' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              📊 Aylık
            </button>
          </div>

          {/* Günlük Aralık Seçici (7 / 14 / 30 gün) */}
          {period === 'daily' && (
            <select
              value={dayRange}
              onChange={e => setDayRange(Number(e.target.value))}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid #cbd5e1',
                background: 'white',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <option value={7}>Son 7 Gün</option>
              <option value={14}>Son 14 Gün</option>
              <option value={30}>Son 30 Gün</option>
            </select>
          )}

          {/* Ders Filtresi */}
          {availableSubjects.length > 1 && (
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.6rem',
                border: '1px solid #cbd5e1',
                background: 'white',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <option value="all">🌐 Tüm Dersler</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 4'LÜ KPI ÖZET KARTLARI ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.5rem'
      }}>
        {/* Toplam Soru */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: '1rem',
          padding: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(37,99,235,0.06)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
            TOPLAM ÇÖZÜLEN SORU
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>
            {totals.totQ}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', marginTop: 2 }}>
            {totals.totTests} Test & Deneme
          </div>
        </div>

        {/* Doğru Sayısı */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1.5px solid #bbf7d0',
          borderRadius: '1rem',
          padding: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(22,101,52,0.06)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
            DOĞRU SAYISI (D)
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#15803d', marginTop: 2 }}>
            {totals.totD}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginTop: 2 }}>
            %{totals.totQ > 0 ? Math.round((totals.totD / totals.totQ) * 100) : 0} Doğruluk
          </div>
        </div>

        {/* Yanlış & Boş */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1.5px solid #fecaca',
          borderRadius: '1rem',
          padding: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(153,27,27,0.06)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
            YANLIŞ & BOŞ
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#b91c1c', marginTop: 2 }}>
            {totals.totY} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/ {totals.totB}B</span>
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', marginTop: 2 }}>
            {totals.totY} Yanlış · {totals.totB} Boş
          </div>
        </div>

        {/* Başarı Oranı */}
        <div style={{
          background: totals.avgRate >= 70 ? 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: `1.5px solid ${totals.avgRate >= 70 ? '#e9d5ff' : '#fde68a'}`,
          borderRadius: '1rem',
          padding: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(107,33,168,0.06)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: totals.avgRate >= 70 ? '#6b21a8' : '#92400e', textTransform: 'uppercase' }}>
            GENEL BAŞARI ORANI
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: totals.avgRate >= 70 ? '#7e22ce' : '#b45309', marginTop: 2 }}>
            %{totals.avgRate}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: totals.avgRate >= 70 ? '#6b21a8' : '#92400e', marginTop: 2 }}>
            {totals.avgRate >= 70 ? '🌟 Yüksek Performans' : totals.avgRate >= 50 ? '📈 Geliştirilebilir' : '⚠️ Yoğunlaşmalı'}
          </div>
        </div>
      </div>

      {/* ── GRAFİK 1: DÖNEMSEL SORU ÇÖZÜMÜ & D/Y/B DAĞILIMI (STACKED BAR CHART) ── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📊</span> Soru Çözüm Hacmi & Doğru/Yanlış Dağılımı
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              {period === 'daily' ? 'Günlük çözülen soru sayıları ve cevap dağılımları' : period === 'weekly' ? 'Haftalık soru çözüm performansı' : 'Aylık soru çözüm temposu'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem', fontWeight: 800 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} /> Doğru
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} /> Yanlış
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#94a3b8' }} /> Boş
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={11} 
                fontWeight={700}
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                fontWeight={700}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="doğru" name="Doğru" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="yanlış" name="Yanlış" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="boş" name="Boş" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── GRAFİK 2: BAŞARI TRENDİ & YÜZDE GRAFİĞİ (AREA CHART) ── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📈</span> Soru Başarı Oranı & Gelişim Trendi (%)
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              Zaman içindeki yüzde başarı değişimi (Hedef Eşik: %70)
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5' }}>
            🎯 Hedef: %70+
          </div>
        </div>

        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={11} 
                fontWeight={700}
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                fontWeight={700}
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `%${v}`}
              />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: '%70 Hedef', fill: '#10b981', fontSize: 10, fontWeight: 800, position: 'right' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="başarıOranı" 
                name="Başarı Oranı" 
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#rateGradient)" 
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#4338ca' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── DERS BAZLI SORU DAĞILIMI & DÖKÜM TABLOSU ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        
        {/* Ders Bazlı İlerleme Çubukları */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📚</span> Ders Bazlı Soru Hacmi & Başarı
          </h3>

          {subjectBreakdown.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {subjectBreakdown.map(sb => (
                <div key={sb.name} style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{sb.name}</span>
                    <span style={{ fontWeight: 900, fontSize: '0.8rem', color: sb.rate >= 70 ? '#15803d' : sb.rate >= 50 ? '#b45309' : '#b91c1c' }}>
                      %{sb.rate} Başarı
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '4px 0' }}>
                    <div style={{
                      width: `${Math.min(100, sb.rate)}%`,
                      height: '100%',
                      background: sb.rate >= 70 ? '#22c55e' : sb.rate >= 50 ? '#f59e0b' : '#ef4444',
                      borderRadius: 3,
                      transition: 'width 0.3s'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                    <span>{sb.q} Soru ({sb.tests} Test)</span>
                    <span>✅ {sb.d} · ❌ {sb.y} {sb.b > 0 ? `· ⭕ ${sb.b}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1.5rem 0' }}>
              Ders bazlı soru verisi bulunmuyor.
            </div>
          )}
        </div>

        {/* Detaylı Periyot Tablosu */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '1.25rem',
          overflowX: 'auto'
        }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋</span> {period === 'daily' ? 'Gün Gün Soru Dökümü' : period === 'weekly' ? 'Haftalık Döküm Tablosu' : 'Aylık Döküm Tablosu'}
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'left' }}>Tarih / Periyot</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>Soru</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>D/Y</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>Başarı</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d, idx) => (
                <tr key={d.key || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 800, color: '#0f172a' }}>
                    {d.fullLabel || d.label} {d.subLabel && period === 'daily' ? `(${d.subLabel})` : ''}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>
                    {d.toplamSoru}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}>
                    <span style={{ color: '#16a34a' }}>{d.doğru}</span> / <span style={{ color: '#dc2626' }}>{d.yanlış}</span>
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 900, color: d.başarıOranı >= 70 ? '#15803d' : d.başarıOranı >= 50 ? '#b45309' : '#b91c1c' }}>
                    %{d.başarıOranı}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
