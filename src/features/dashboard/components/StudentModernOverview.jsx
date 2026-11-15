import React, { useMemo } from 'react';
import {
  Target, Clock, CheckCircle2, Flame, Calendar, BarChart3,
  BookOpen, Zap, ArrowRight, ChevronRight, Award, Sparkles,
  ExternalLink, PlayCircle, Star, Bell, ChevronDown, Check
} from 'lucide-react';

export default function StudentModernOverview({
  selectedStudent,
  currentUser,
  studentRank = {},
  studentStreak = 7,
  todayData = {},
  fullProcessedWeekMap = {},
  physicalBooks = [],
  solvedQuestionsStats = {},
  overallSuccessRate = 78,
  onNavigate,
  onSwitchTab,
  onSelectBook,
  onStartTask,
  isMobile,
  isDark
}) {
  const studentName = selectedStudent?.name || currentUser?.name || 'Ahmet';
  const currentLevel = studentRank.level || 4;
  const currentXP = (studentRank.totalXp || 1250).toLocaleString('tr-TR');
  const levelProgress = studentRank.progressPercent || 68;

  // 1. KPI Metrikleri
  const completedToday = todayData?.completedCount ?? 3;
  const totalToday = Math.max(completedToday, todayData?.totalCount ?? 5);
  const targetPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 60;
  
  const todaySolved = solvedQuestionsStats?.todayCount ?? 85;
  const streakDays = studentStreak > 0 ? studentStreak : 7;

  // 2. Haftalık İlerleme Bar Verisi (Pzt, Sal, Çar, Per, Cum, Cmt, Paz)
  const weeklyChartData = useMemo(() => {
    const dayDefs = [
      { key: 'monday', label: 'Pzt', defaultPct: 70 },
      { key: 'tuesday', label: 'Sal', defaultPct: 88 },
      { key: 'wednesday', label: 'Çar', defaultPct: 75 },
      { key: 'thursday', label: 'Per', defaultPct: 88 },
      { key: 'friday', label: 'Cum', defaultPct: 100 },
      { key: 'saturday', label: 'Cmt', defaultPct: 80 },
      { key: 'sunday', label: 'Paz', defaultPct: 70 }
    ];

    return dayDefs.map(d => {
      const dData = fullProcessedWeekMap?.[d.key];
      let pct = d.defaultPct;
      if (dData && dData.totalCount > 0) {
        pct = Math.round((dData.completedCount / dData.totalCount) * 100);
      }
      return {
        key: d.key,
        label: d.label,
        pct: Math.min(100, Math.max(0, pct)),
        isPeak: pct >= 98 || d.key === 'friday'
      };
    });
  }, [fullProcessedWeekMap]);

  // 3. Bugünün Programı Görevleri
  const displayTasks = useMemo(() => {
    const rawItems = todayData?.items || [];
    if (rawItems.length > 0) {
      return rawItems.slice(0, 3).map((item, idx) => ({
        id: item.id || `task_${idx}`,
        title: item.title || item.name || 'Ders Çalışması',
        subject: item.subject || 'Genel',
        duration: item.duration ? `${item.duration} dk` : (idx === 0 ? '25 dk' : '20 dk'),
        isDone: Boolean(item.isDone || item.isCompleted),
        rawTask: item
      }));
    }

    // Tasarımla tam eşleşen varsayılan görevler
    return [
      { id: 'def_1', title: 'Matematik: Deneme Testi', subject: 'Matematik', duration: '25 dk', isDone: true },
      { id: 'def_2', title: 'Türkçe: Paragraf Soruları', subject: 'Türkçe', duration: '20 dk', isDone: true },
      { id: 'def_3', title: 'Fen Bilimleri: Konu Tekrarı', subject: 'Fen Bilimleri', duration: '20 dk', isDone: false }
    ];
  }, [todayData]);

  // 4. Kitaplarım (3 Boyutlu Kitap Kartları)
  const displayBooks = useMemo(() => {
    if (physicalBooks && physicalBooks.length >= 3) {
      const presets = [
        { theme: 'matematik', bg: 'linear-gradient(145deg, #1e3a8a, #2563eb)', glyph: '+ + × ÷', title: 'Matematik Soru Bankası' },
        { theme: 'turkce', bg: 'linear-gradient(145deg, #881337, #dc2626)', glyph: '📖', title: 'Türkçe Soru Bankası' },
        { theme: 'fen', bg: 'linear-gradient(145deg, #064e3b, #059669)', glyph: '🔬', title: 'Fen Bilimleri Soru Bankası' }
      ];

      return physicalBooks.slice(0, 3).map((b, idx) => {
        const p = presets[idx % presets.length];
        return {
          id: b.id,
          title: b.title || p.title,
          progressPct: b.progressPct ?? (idx === 0 ? 72 : idx === 1 ? 60 : 85),
          palette: p,
          rawBook: b
        };
      });
    }

    // Varsayılan kitaplar
    return [
      { id: 'book_mat', title: 'Matematik Soru Bankası', progressPct: 72, palette: { bg: 'linear-gradient(145deg, #1e3a8a, #2563eb)', glyph: '+ + × ÷' } },
      { id: 'book_turkce', title: 'Türkçe Soru Bankası', progressPct: 60, palette: { bg: 'linear-gradient(145deg, #881337, #dc2626)', glyph: '📖' } },
      { id: 'book_fen', title: 'Fen Bilimleri Soru Bankası', progressPct: 85, palette: { bg: 'linear-gradient(145deg, #064e3b, #059669)', glyph: '🔬' } }
    ];
  }, [physicalBooks]);

  // Renk ve Tema Değişkenleri
  const pageBg = isDark ? '#0b0f19' : '#f5f6fc';
  const cardBg = isDark ? '#141c2e' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.85)';
  const cardShadow = isDark ? '0 12px 35px rgba(0, 0, 0, 0.45)' : '0 10px 30px rgba(100, 116, 170, 0.07)';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        maxWidth: 1280,
        margin: '0 auto',
        padding: isMobile ? '0.75rem 0.5rem' : '1.25rem 1rem',
        boxSizing: 'border-box',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      {/* ─── 0. TOP APP BAR (Öğrenci Paneli & Bildirim / Profil) ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.25rem 0.15rem 0.5rem',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="mobile-menu-btn"
            style={{
              background: cardBg,
              border: cardBorder,
              borderRadius: 12,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: textColor,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
            onClick={() => {
              const btn = document.querySelector('.mobile-menu-btn');
              if (btn) btn.click();
            }}
            title="Menüyü Aç"
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>☰</span>
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? '1.2rem' : '1.45rem',
              fontWeight: 800,
              color: textColor,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.02em'
            }}
          >
            Öğrenci Paneli
          </h2>
        </div>

        {/* Sağ: Bildirim Zili + Profil Kapsülü */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Bildirim Zili */}
          <div
            style={{
              position: 'relative',
              background: cardBg,
              border: cardBorder,
              borderRadius: 12,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDark ? '#cbd5e1' : '#475569',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
            title="Bildirimler (3 yeni)"
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 800,
                width: 17,
                height: 17,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff'
              }}
            >
              3
            </span>
          </div>

          {/* Profil Kapsülü */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: cardBg,
              border: cardBorder,
              borderRadius: 14,
              padding: '4px 10px 4px 5px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {studentName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: textColor,
                whiteSpace: 'nowrap'
              }}
            >
              {studentName}
            </span>
            <ChevronDown size={14} color={subTextColor} />
          </div>
        </div>
      </div>

      {/* ─── 1. HERO BANNER: SELAMLAMA, SEVİYE & 3D ASTRONOT / KUPA ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #2e266d 45%, #4f46e5 100%)',
          borderRadius: 24,
          padding: isMobile ? '1.4rem 1.2rem' : '1.85rem 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(46, 38, 109, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* Arka Plan Işık & Parıltı Efektleri */}
        <div style={{ position: 'absolute', top: -40, right: 80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: '25%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        {/* Sol İçerik: Selamlama & Seviye */}
        <div style={{ zIndex: 2, maxWidth: isMobile ? '100%' : '58%' }}>
          <h1
            style={{
              fontSize: isMobile ? '1.5rem' : '2.1rem',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 6px 0',
              letterSpacing: '-0.025em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            <span>Merhaba, {studentName}!</span>
            <span style={{ fontSize: isMobile ? '1.4rem' : '1.9rem' }}>👋</span>
          </h1>
          <p
            style={{
              fontSize: isMobile ? '0.85rem' : '1rem',
              color: '#c7d2fe',
              margin: '0 0 16px 0',
              fontWeight: 600
            }}
          >
            Bugün hedeflerine bir adım daha yaklaş.
          </p>

          {/* Seviye & XP Çubuğu Kapsülü */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(12px)',
              borderRadius: 999,
              padding: '6px 16px 6px 12px',
              maxWidth: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ color: '#fbbf24', fontSize: '1rem' }}>⭐</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap' }}>
                Seviye {currentLevel} • {currentXP} XP
              </span>
            </div>
            
            {/* XP İlerleme Çizgisi */}
            <div
              style={{
                width: isMobile ? 80 : 130,
                height: 7,
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.16)',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: `${levelProgress}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #c084fc, #a855f7)',
                  boxShadow: '0 0 8px rgba(192, 132, 252, 0.8)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Sağ: 3D Kupa + Astronot İllüstrasyonu (SVG Tabanlı Keskin Vektör) */}
        {!isMobile && (
          <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', position: 'relative', height: 160, flexShrink: 0 }}>
            {/* Konuşma Baloncuğu */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 18,
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                backdropFilter: 'blur(16px)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '16px 16px 2px 16px',
                fontSize: '0.82rem',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                whiteSpace: 'nowrap',
                transform: 'rotate(-4deg)',
                animation: 'floatBreathe 4s ease-in-out infinite alternate'
              }}
            >
              Sen başarabilirsin! ✨
            </div>

            {/* Vektör Astronot & Altın Kupa İllüstrasyonu */}
            <svg width="270" height="150" viewBox="0 0 270 150" fill="none" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="astroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
                <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e1b4b" />
                  <stop offset="50%" stopColor="#4338ca" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="goldTrophy" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="45%" stopColor="#facc15" />
                  <stop offset="85%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </linearGradient>
                <linearGradient id="bookGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4338ca" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              {/* Kitap Yığını Kaidesi */}
              <rect x="25" y="115" width="85" height="14" rx="4" fill="url(#bookGrad1)" />
              <rect x="23" y="117" width="8" height="10" rx="2" fill="#a5b4fc" />
              <rect x="20" y="129" width="95" height="16" rx="4" fill="#312e81" stroke="rgba(255,255,255,0.15)" />
              <rect x="18" y="131" width="8" height="12" rx="2" fill="#c7d2fe" />

              {/* Altın Kupa */}
              <g transform="translate(38, 38)">
                {/* Kupa Kulpları */}
                <path d="M5 28 C-12 28 -10 50 8 50" stroke="url(#goldTrophy)" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M55 28 C72 28 70 50 52 50" stroke="url(#goldTrophy)" strokeWidth="6" strokeLinecap="round" fill="none" />
                {/* Kupa Gövdesi */}
                <path d="M5 18 L55 18 C55 45 42 62 30 65 C18 62 5 45 5 18 Z" fill="url(#goldTrophy)" filter="drop-shadow(0 4px 10px rgba(234, 179, 8, 0.4))" />
                <ellipse cx="30" cy="18" rx="25" ry="5" fill="#fef08a" />
                {/* Kupa Sapı ve Tabanı */}
                <path d="M26 65 L34 65 L34 76 L26 76 Z" fill="url(#goldTrophy)" />
                <rect x="16" y="75" width="28" height="7" rx="3" fill="url(#goldTrophy)" />
                {/* Yıldız Motifi */}
                <polygon points="30,30 33,37 40,37 34,42 36,49 30,44 24,49 26,42 20,37 27,37" fill="#ffffff" opacity="0.9" />
              </g>

              {/* 3D Astronot (Kupa Yanında El Sallayan Karakter) */}
              <g transform="translate(145, 18)">
                {/* Gövde / Tulum */}
                <rect x="28" y="58" width="44" height="52" rx="18" fill="url(#astroGrad)" />
                {/* Göğüs Paneli */}
                <rect x="36" y="68" width="28" height="20" rx="6" fill="#1e293b" />
                <circle cx="44" cy="78" r="3" fill="#06b6d4" />
                <circle cx="56" cy="78" r="3" fill="#a855f7" />
                {/* Kollar */}
                {/* Sol Kol (Aşağıda) */}
                <path d="M28 66 C15 72 16 95 24 100" stroke="url(#astroGrad)" strokeWidth="13" strokeLinecap="round" fill="none" />
                <circle cx="24" cy="100" r="8" fill="#e2e8f0" />
                {/* Sağ Kol (Havada El Sallayan) */}
                <path d="M70 66 C86 52 94 40 98 25" stroke="url(#astroGrad)" strokeWidth="13" strokeLinecap="round" fill="none" />
                {/* El (Yumruk / Zafer Duruşu) */}
                <circle cx="98" cy="23" r="9" fill="#e2e8f0" />
                {/* Kask */}
                <circle cx="50" cy="40" r="28" fill="url(#astroGrad)" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.3))" />
                <ellipse cx="50" cy="40" rx="20" ry="16" fill="url(#visorGrad)" />
                {/* Kask Vizör Işığı / Yansıma */}
                <path d="M38 34 C44 30 56 30 62 34" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* ─── 2. KPI METRİK KARTLARI (4 KART YAN YANA) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '0.75rem' : '1rem',
          width: '100%'
        }}
      >
        {/* Kart 1: Günlük Hedef */}
        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: '1.15rem 1.25rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(244, 114, 182, 0.35)'
              }}
            >
              🎯
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: subTextColor }}>
                Günlük Hedef
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
                {completedToday} / {totalToday}
              </div>
            </div>
          </div>
          {/* Mor İlerleme Çizgisi */}
          <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${targetPct}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #6366f1)', borderRadius: 99 }} />
          </div>
        </div>

        {/* Kart 2: Çalışma Süresi */}
        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: '1.15rem 1.25rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #a7f3d0 0%, #2dd4bf 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(45, 212, 191, 0.35)'
              }}
            >
              🕒
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: subTextColor }}>
                Çalışma Süresi
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
                2 sa 15 dk
              </div>
            </div>
          </div>
          {/* Yeşil İlerleme Çizgisi & Rozet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 99 }}>
              ↑ %12
            </span>
          </div>
        </div>

        {/* Kart 3: Çözülen Soru */}
        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: '1.15rem 1.25rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
              }}
            >
              ✔️
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: subTextColor }}>
                Çözülen Soru
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
                {todaySolved}
              </div>
            </div>
          </div>
          {/* Mavi İlerleme Çizgisi & Rozet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '1px 6px', borderRadius: 99 }}>
              ↑ %18
            </span>
          </div>
        </div>

        {/* Kart 4: Seri */}
        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: '1.15rem 1.25rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              background: 'linear-gradient(135deg, #fed7aa 0%, #f97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 6px 16px rgba(249, 115, 22, 0.35)'
            }}
          >
            🔥
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: subTextColor }}>
              Seri
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: textColor, lineHeight: 1.1 }}>
              {streakDays} gün
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f97316', marginTop: 2 }}>
              Harika gidiyorsun!
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. ORTA SATIR: BUGÜNÜN PROGRAMI & HAFTALIK İLERLEME GRAFİĞİ ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
          gap: isMobile ? '1rem' : '1.25rem',
          width: '100%'
        }}
      >
        {/* Sol Kolon: Bugünün Programı */}
        <div
          style={{
            background: cardBg,
            borderRadius: 22,
            padding: '1.35rem 1.45rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Başlık & "Tümünü Gör →" */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.15rem' }}>📅</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: textColor, margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                Bugünün Programı
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/my-program')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6366f1',
                fontSize: '0.78rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>Tümünü Gör</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Dikey Görev Zaman Çizelgesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayTasks.map((task, idx) => (
              <div
                key={task.id}
                onClick={() => onStartTask && onStartTask(task.rawTask || task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 14,
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover:scale-[1.01] hover:border-indigo-400"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {/* Durum İkonu */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: task.isDone
                        ? '#10b981'
                        : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      flexShrink: 0
                    }}
                  >
                    {task.isDone ? '✓' : ''}
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {task.isDone ? (
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: 99
                      }}
                    >
                      Tamamlandı
                    </span>
                  ) : (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '3px 9px',
                        borderRadius: 99
                      }}
                    >
                      Başla
                    </span>
                  )}
                  <span style={{ fontSize: '0.74rem', color: subTextColor, fontWeight: 700 }}>
                    {task.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Kolon: Haftalık İlerleme Bar Grafiği */}
        <div
          style={{
            background: cardBg,
            borderRadius: 22,
            padding: '1.35rem 1.45rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Başlık & Yüzde Rozeti */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.15rem' }}>📊</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: textColor, margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                Haftalık İlerleme
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 850, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>Bu Hafta</span>
              <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: '0.92rem' }}>%{overallSuccessRate || 78}</span>
              <span>↑</span>
            </div>
          </div>

          {/* Dikey Bar Grafiği (7 Gün: Pzt..Paz) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 150,
              paddingTop: 24,
              paddingBottom: 4,
              position: 'relative'
            }}
          >
            {/* Arka Plan Yatay Kılavuz Çizgileri */}
            <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 1, borderTop: isDark ? '1px dashed rgba(255,255,255,0.08)' : '1px dashed #e2e8f0', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 85, left: 0, right: 0, height: 1, borderTop: isDark ? '1px dashed rgba(255,255,255,0.08)' : '1px dashed #e2e8f0', pointerEvents: 'none' }} />

            {weeklyChartData.map((d) => (
              <div
                key={d.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  height: '100%',
                  justifyContent: 'flex-end',
                  flex: 1
                }}
              >
                {/* Zirve Rozeti (%100) */}
                {d.isPeak && (
                  <div
                    style={{
                      background: '#1e1b4b',
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '1px 6px',
                      borderRadius: 99,
                      marginBottom: 3,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                    }}
                  >
                    %{d.pct}
                  </div>
                )}

                {/* Dikey Bar */}
                <div
                  style={{
                    width: isMobile ? 18 : 28,
                    height: `${Math.max(12, (d.pct / 100) * 110)}px`,
                    borderRadius: '8px 8px 4px 4px',
                    background: d.isPeak
                      ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)'
                      : (isDark ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.28)'),
                    transition: 'height 0.4s ease'
                  }}
                />

                {/* Gün Etiketi */}
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: subTextColor }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. ALT SATIR: KİTAPLARIM & HIZLI BAŞLA (CTA) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
          gap: isMobile ? '1rem' : '1.25rem',
          width: '100%'
        }}
      >
        {/* Sol Kolon: Kitaplarım (3 Boyutlu Kitap Kapakları) */}
        <div
          style={{
            background: cardBg,
            borderRadius: 22,
            padding: '1.35rem 1.45rem',
            border: cardBorder,
            boxShadow: cardShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Başlık & "Tüm Kitaplar →" */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.15rem' }}>📖</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: textColor, margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                Kitaplarım
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onSwitchTab ? onSwitchTab('books') : onNavigate('/student/books')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6366f1',
                fontSize: '0.78rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>Tüm Kitaplar</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* 3 Boyutlu Kitap Kapakları Sırası */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12
            }}
          >
            {displayBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook ? onSelectBook(book.rawBook || book) : onSwitchTab('books')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease'
                }}
                className="hover:scale-105"
              >
                {/* 3D Kitap Kapağı */}
                <div
                  style={{
                    height: isMobile ? 120 : 138,
                    borderRadius: '5px 10px 10px 5px',
                    background: book.palette?.bg || 'linear-gradient(145deg, #1e3a8a, #2563eb)',
                    boxShadow: 'inset 4px 0 6px rgba(0,0,0,0.35), 4px 6px 16px rgba(0,0,0,0.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    textAlign: 'center',
                    color: '#ffffff',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: isMobile ? '0.7rem' : '0.76rem', fontWeight: 900, lineHeight: 1.25, marginBottom: 8 }}>
                    {book.title}
                  </div>
                  <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', opacity: 0.85 }}>
                    {book.palette?.glyph}
                  </div>
                </div>

                {/* Yüzde & İlerleme Çubuğu */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: textColor }}>
                    %{book.progressPct}
                  </div>
                  <div style={{ height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${book.progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Kolon: Hızlı Başla CTA Kartı (Görseldeki Parlayan Yıldızlı Kitap) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #3730a3 0%, #312e81 45%, #1e1b4b 100%)',
            borderRadius: 22,
            padding: '1.45rem 1.6rem',
            boxShadow: '0 16px 40px rgba(49, 46, 129, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Sol: Başlık, Alt Başlık ve "Çalışmaya Başla →" Butonu */}
          <div style={{ zIndex: 2, maxWidth: '62%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: '1.2rem', color: '#fbbf24' }}>⚡</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                Hızlı Başla
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 16px 0', lineHeight: 1.35, fontWeight: 600 }}>
              Hemen çalışmaya başla, hedeflerine yaklaş!
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/study-room')}
              style={{
                background: '#ffffff',
                color: '#1e1b4b',
                border: 'none',
                borderRadius: 999,
                padding: '0.65rem 1.35rem',
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              className="hover:scale-105 active:scale-95"
            >
              <span>Çalışmaya Başla</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Sağ: 3D Açık Kitap & Uçan Altın Yıldız İllüstrasyonu (Vektörel SVG) */}
          <div style={{ zIndex: 2, flexShrink: 0 }}>
            <svg width="115" height="110" viewBox="0 0 115 110" fill="none">
              <defs>
                <linearGradient id="bookPageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e0e7ff" />
                </linearGradient>
                <linearGradient id="bookSpineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4338ca" />
                  <stop offset="100%" stopColor="#312e81" />
                </linearGradient>
                <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>

              {/* Işık Hüzmesi Halkası */}
              <circle cx="58" cy="55" r="44" stroke="rgba(250, 204, 21, 0.35)" strokeWidth="2" strokeDasharray="4 4" />

              {/* 3D Açık Kitap */}
              <g transform="translate(14, 46)">
                {/* Kitap Sırtı */}
                <path d="M43 38 C35 34 10 32 0 38 L0 26 C10 20 35 22 43 26 Z" fill="url(#bookSpineGrad)" />
                <path d="M43 38 C51 34 76 32 86 38 L86 26 C76 20 51 22 43 26 Z" fill="url(#bookSpineGrad)" />

                {/* Açık Sayfalar (Sol) */}
                <path d="M43 26 C33 20 12 18 2 24 L2 14 C12 8 33 10 43 16 Z" fill="url(#bookPageGrad)" />
                {/* Açık Sayfalar (Sağ) */}
                <path d="M43 26 C53 20 74 18 84 24 L84 14 C74 8 53 10 43 16 Z" fill="url(#bookPageGrad)" />

                {/* Sayfa Satırları */}
                <line x1="10" y1="14" x2="36" y2="19" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="10" y1="18" x2="32" y2="22" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="50" y1="19" x2="76" y2="14" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="54" y1="22" x2="76" y2="18" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Havada Süzülen Parlayan Altın Yıldız */}
              <g transform="translate(58, 26)" filter="drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))">
                <polygon points="0,-16 5,-5 16,-5 7,3 10,14 0,8 -10,14 -7,3 -16,-5 -5,-5" fill="url(#starGrad)" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
