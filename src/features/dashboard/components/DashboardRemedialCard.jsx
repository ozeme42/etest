import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../context/ThemeContext';
import {
  Printer,
  Trash2,
  Search,
  Compass,
  PlayCircle,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Filter,
  Check,
  X,
  Sparkles,
  Zap,
  Flame,
  Clock,
  Target,
  Shield,
  Award,
  Trophy,
  ArrowRight,
  RefreshCw,
  Layers
} from 'lucide-react';

const SUBJECT_THEMES = {
  'Matematik': {
    from: '#3b82f6',
    to: '#1d4ed8',
    icon: '📐',
    iconUrl: '/assets/dashboard/icon_matematik.png',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeText: '#2563eb',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
    glow: 'rgba(59, 130, 246, 0.22)'
  },
  'Türkçe': {
    from: '#f43f5e',
    to: '#be123c',
    icon: '📖',
    iconUrl: '/assets/dashboard/icon_turkce.png',
    badgeBg: 'rgba(244, 63, 94, 0.12)',
    badgeText: '#e11d48',
    badgeBorder: 'rgba(244, 63, 94, 0.3)',
    glow: 'rgba(244, 63, 94, 0.22)'
  },
  'Fen Bilimleri': {
    from: '#10b981',
    to: '#047857',
    icon: '🧪',
    iconUrl: '/assets/dashboard/icon_fen.png',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#059669',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    glow: 'rgba(16, 185, 129, 0.22)'
  },
  'Sosyal Bilgiler': {
    from: '#f59e0b',
    to: '#b45309',
    icon: '🌍',
    iconUrl: '/assets/dashboard/icon_sosyal.png',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeText: '#d97706',
    badgeBorder: 'rgba(245, 158, 11, 0.3)',
    glow: 'rgba(245, 158, 11, 0.22)'
  },
  'İngilizce': {
    from: '#8b5cf6',
    to: '#6d28d9',
    icon: '💬',
    iconUrl: '/assets/dashboard/icon_ingilizce.png',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeText: '#7c3aed',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
    glow: 'rgba(139, 92, 246, 0.22)'
  },
  'Din Kültürü': {
    from: '#06b6d4',
    to: '#0e7490',
    icon: '✨',
    iconUrl: '/assets/dashboard/icon_din.png',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeText: '#0891b2',
    badgeBorder: 'rgba(6, 182, 212, 0.3)',
    glow: 'rgba(6, 182, 212, 0.22)'
  },
  'Kitap Okuma': {
    from: '#ec4899',
    to: '#be185d',
    icon: '📚',
    badgeBg: 'rgba(236, 72, 153, 0.12)',
    badgeText: '#db2777',
    badgeBorder: 'rgba(236, 72, 153, 0.3)',
    glow: 'rgba(236, 72, 153, 0.22)'
  },
  'Deneme': {
    from: '#f97316',
    to: '#c2410c',
    icon: '🎯',
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    badgeText: '#ea580c',
    badgeBorder: 'rgba(249, 115, 22, 0.3)',
    glow: 'rgba(249, 115, 22, 0.22)'
  }
};

const resolveSubjectTheme = (subj) => {
  if (!subj) return { from: '#6366f1', to: '#4f46e5', icon: '📝', badgeBg: 'rgba(99, 102, 241, 0.12)', badgeText: '#6366f1', badgeBorder: 'rgba(99, 102, 241, 0.3)', glow: 'rgba(99, 102, 241, 0.22)' };
  const s = subj.toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) return SUBJECT_THEMES['Matematik'];
  if (s.includes('türkçe') || s.includes('edebiyat')) return SUBJECT_THEMES['Türkçe'];
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) return SUBJECT_THEMES['Fen Bilimleri'];
  if (s.includes('sosyal') || s.includes('tarih') || s.includes('coğrafya') || s.includes('inkılap')) return SUBJECT_THEMES['Sosyal Bilgiler'];
  if (s.includes('ingilizce') || s.includes('dil')) return SUBJECT_THEMES['İngilizce'];
  if (s.includes('din')) return SUBJECT_THEMES['Din Kültürü'];
  if (s.includes('okuma') || s.includes('kitap')) return SUBJECT_THEMES['Kitap Okuma'];
  if (s.includes('deneme')) return SUBJECT_THEMES['Deneme'];
  return { from: '#6366f1', to: '#4f46e5', icon: '📝', badgeBg: 'rgba(99, 102, 241, 0.12)', badgeText: '#6366f1', badgeBorder: 'rgba(99, 102, 241, 0.3)', glow: 'rgba(99, 102, 241, 0.22)' };
};

export default function DashboardRemedialCard({
  isMobile = false,
  isDark = false,
  catchUpTasks = [],
  onToggleTask,
  onTaskClick,
  onDeleteTask,
  getRowTheme,
  onNavigateTasks,
  onNavigateBooks,
  onStartStudyRoom
}) {
  const themeContext = useTheme ? useTheme() : null;
  const isDarkEffective = Boolean(isDark ?? themeContext?.isDark);

  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrintingCatchUp, setIsPrintingCatchUp] = useState(false);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingCatchUp(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintCatchUp = () => {
    if (!catchUpTasks || catchUpTasks.length === 0) {
      alert('Geciken veya telafi edilmesi gereken herhangi bir görev bulunmuyor. 🎉');
      return;
    }
    setIsPrintingCatchUp(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingCatchUp(false);
      }, 1000);
    }, 100);
  };

  // Kategori Etiketi
  const getCatchUpCategoryBadge = (task) => {
    if (task.categoryType === 'yol_haritasi' || task.isRoadmapTask || task.roadmapAssignmentId) {
      return { label: '🗺️ Yol Haritası', bg: 'rgba(124, 58, 237, 0.14)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.35)' };
    }
    if (task.categoryType === 'kitap' || task.isBookTask || task.bookTestId || (task.testId && task.bookId)) {
      return { label: '📚 Kitap Takibi', bg: 'rgba(5, 150, 105, 0.14)', color: '#059669', border: 'rgba(5, 150, 105, 0.35)' };
    }
    if (task.categoryType === 'deneme' || task.isExamTask || task.type === 'physicalExam') {
      return { label: '🎯 Deneme', bg: 'rgba(217, 119, 6, 0.14)', color: '#d97706', border: 'rgba(217, 119, 6, 0.35)' };
    }
    return { label: '📝 Ödev / Görev', bg: 'rgba(99, 102, 241, 0.14)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.35)' };
  };

  // Branş Dağılımı (Soru ve Görev Sayıları ile Birlikte)
  const subjectDistribution = useMemo(() => {
    const map = {};
    (catchUpTasks || []).forEach(t => {
      const cleanSubj = (t.subject && t.subject.toLowerCase() === 'geometri') ? 'Matematik' : (t.subject || 'Diğer');
      if (!map[cleanSubj]) {
        map[cleanSubj] = { subject: cleanSubj, count: 0, questions: 0 };
      }
      map[cleanSubj].count += 1;
      const q = Number(t.questionCount || t.targetQuestionCount || 15);
      map[cleanSubj].questions += (isNaN(q) ? 15 : q);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [catchUpTasks]);

  const subjectCounts = useMemo(() => {
    const counts = {};
    subjectDistribution.forEach(item => {
      counts[item.subject] = item.count;
    });
    return counts;
  }, [subjectDistribution]);

  // Tahmini Toplam Soru
  const totalQuestionsEstimate = useMemo(() => {
    return (catchUpTasks || []).reduce((acc, t) => {
      const q = Number(t.questionCount || t.targetQuestionCount || 15);
      return acc + (isNaN(q) ? 15 : q);
    }, 0);
  }, [catchUpTasks]);

  // Tahmini Telafi Süresi Formatı
  const totalEstimatedMinutes = Math.round(totalQuestionsEstimate * 1.25);
  const totalHours = Math.floor(totalEstimatedMinutes / 60);
  const remainingMins = totalEstimatedMinutes % 60;
  const estimatedDurationFormatted = totalHours > 0 ? `${totalHours}s ${remainingMins}dk` : `${remainingMins}dk`;

  // Tamamlanan Görev Sayısı
  const completedTasksCount = (catchUpTasks || []).filter(t => t.done).length;
  const completionPct = catchUpTasks.length > 0 ? Math.round((completedTasksCount / catchUpTasks.length) * 100) : 100;

  // Filtrelenmiş Liste
  const filteredTasks = useMemo(() => {
    return (catchUpTasks || []).filter(task => {
      const cleanSubj = (task.subject && task.subject.toLowerCase() === 'geometri') ? 'Matematik' : (task.subject || 'Diğer');
      if (selectedSubject !== 'all' && cleanSubj !== selectedSubject) return false;

      if (selectedCategory !== 'all') {
        const isReading = task.taskType === 'okuma' || String(task.topic || '').toLowerCase().includes('okuma');
        const isRoadmap = Boolean(task.roadmapAssignmentId || task.isRoadmapTask);
        const isBook = Boolean(task.isBookTask || task.bookTestId);
        const isHw = Boolean(task.hwId && !task.bookTestId && !task.roadmapAssignmentId);
        const isExam = Boolean(task.categoryType === 'deneme' || task.isExamTask || task.type === 'physicalExam');

        if (selectedCategory === 'harita' && !isRoadmap) return false;
        if (selectedCategory === 'kitap' && !isBook) return false;
        if (selectedCategory === 'ödev' && !isHw) return false;
        if (selectedCategory === 'deneme' && !isExam) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.testName || task.title || '').toLowerCase().includes(q);
        const matchBook = (task.bookTitle || '').toLowerCase().includes(q);
        const matchTopic = (task.unitTopic || task.topic || '').toLowerCase().includes(q);
        const matchSubj = cleanSubj.toLowerCase().includes(q);
        if (!matchTitle && !matchBook && !matchTopic && !matchSubj) return false;
      }

      return true;
    });
  }, [catchUpTasks, selectedSubject, selectedCategory, searchQuery]);

  const hasTasks = Array.isArray(catchUpTasks) && catchUpTasks.length > 0;

  // Premium Renk & Gölge Tanımları
  const cardBg = isDarkEffective ? '#1e293b' : '#ffffff';
  const cardBorder = isDarkEffective ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0';
  const cardShadow = isDarkEffective ? '0 10px 30px rgba(0, 0, 0, 0.35)' : '0 10px 30px rgba(0, 0, 0, 0.05)';
  const textColor = isDarkEffective ? '#f8fafc' : '#0f172a';
  const subTextColor = isDarkEffective ? '#94a3b8' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.35rem', width: '100%', boxSizing: 'border-box' }}>

      {/* ══════════════════════════════════════════════════════
          1. ÜST 4 KPI METRİK KARTI (PREMIUM HERO ROW)
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '0.75rem' : '1rem',
        width: '100%'
      }}>
        {/* KART 1: Geciken Görev */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: hasTasks ? (isDarkEffective ? '1.5px solid rgba(239, 68, 68, 0.45)' : '1.5px solid #fecdd3') : cardBorder,
          boxShadow: hasTasks ? '0 10px 28px rgba(239, 68, 68, 0.18)' : cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 46,
              height: isMobile ? 38 : 46,
              borderRadius: 14,
              background: hasTasks ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: hasTasks ? '0 6px 18px rgba(239, 68, 68, 0.4)' : '0 6px 18px rgba(16, 185, 129, 0.4)',
              fontSize: isMobile ? '1.2rem' : '1.45rem'
            }}>
              {hasTasks ? '🔥' : '✨'}
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: hasTasks ? '#ef4444' : '#10b981',
              background: hasTasks ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${hasTasks ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              padding: '2px 8px',
              borderRadius: 99
            }}>
              {hasTasks ? 'Acil Telafi' : 'Tertemiz'}
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Geciken Görev
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              {catchUpTasks.length} Görev
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: hasTasks ? '100%' : '0%', height: '100%', background: 'linear-gradient(90deg, #ef4444, #f59e0b)', borderRadius: 99 }} />
          </div>
        </div>

        {/* KART 2: Telafi Soru Yükü */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 46,
              height: isMobile ? 38 : 46,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(59, 130, 246, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.45rem'
            }}>
              📝
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#3b82f6',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Soru Havuzu
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Telafi Soruları
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              ~{totalQuestionsEstimate.toLocaleString('tr-TR')} Soru
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: totalQuestionsEstimate > 0 ? '75%' : '0%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 99 }} />
          </div>
        </div>

        {/* KART 3: Etkilenen Branşlar */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 46,
              height: isMobile ? 38 : 46,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.45rem'
            }}>
              📚
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#059669',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Ders Dağılımı
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Ders Çeşitliliği
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              {Object.keys(subjectCounts).length} Branş
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Object.keys(subjectCounts).length * 20)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)', borderRadius: 99 }} />
          </div>
        </div>

        {/* KART 4: Tahmini Telafi Süresi */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 46,
              height: isMobile ? 38 : 46,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(139, 92, 246, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.45rem'
            }}>
              ⏱️
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#8b5cf6',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Hedef Süre
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Tahmini Telafi
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              {totalQuestionsEstimate > 0 ? estimatedDurationFormatted : '0 dk'}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: totalQuestionsEstimate > 0 ? '65%' : '0%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2. KARANLIK LÜKS TELAFİ & HIZLI KURTARMA KOKPİTİ
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #090d1a 0%, #1a0f2e 50%, #2b0b18 100%)',
        borderRadius: 24,
        padding: isMobile ? '1.2rem 1rem 1rem' : '1.75rem 2rem 1.5rem',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), 0 0 35px rgba(239, 68, 68, 0.16)',
        border: '1.5px solid rgba(239, 68, 68, 0.35)',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff'
      }}>
        {/* Neon Üst Işık Şeridi */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: hasTasks
            ? 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #ec4899 100%)'
            : 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
          boxShadow: hasTasks ? '0 0 16px rgba(239, 68, 68, 0.8)' : '0 0 16px rgba(16, 185, 129, 0.8)'
        }} />

        {/* Arka Plan Hafif Işıltı Küreleri */}
        <div style={{
          position: 'absolute',
          top: -60,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: hasTasks ? 'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(20px)'
        }} />

        {/* ── Kokpit Başlığı & Hızlı Aksiyon Araçları ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: '1.25rem',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Sol: İkon + Başlık */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: isMobile ? 42 : 50,
              height: isMobile ? 42 : 50,
              borderRadius: 16,
              background: hasTasks
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(245, 158, 11, 0.2))'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(6, 182, 212, 0.2))',
              border: hasTasks ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1.5px solid rgba(16, 185, 129, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.4rem' : '1.75rem',
              boxShadow: hasTasks ? '0 6px 20px rgba(239, 68, 68, 0.35)' : '0 6px 20px rgba(16, 185, 129, 0.35)',
              flexShrink: 0
            }}>
              {hasTasks ? '🔥' : '✨'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '1.15rem' : '1.45rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}>
                  Akıllı Telafi &amp; Hızlı Kurtarma Kokpiti
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '2px 9px',
                  borderRadius: 99,
                  background: hasTasks ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  boxShadow: hasTasks ? '0 2px 10px rgba(239, 68, 68, 0.5)' : '0 2px 10px rgba(16, 185, 129, 0.5)'
                }}>
                  {hasTasks ? `${catchUpTasks.length} Geciken Görev` : 'Tertemiz • 0 Eksik'}
                </span>
              </div>
              <p style={{
                margin: '3px 0 0',
                fontSize: isMobile ? '0.74rem' : '0.84rem',
                color: '#fed7aa',
                fontWeight: 600
              }}>
                {hasTasks
                  ? 'Geciken görevleri tamamlayarak haftalık çalışma programını ve puanını anında telafi et!'
                  : 'Harika bir disiplin! Programındaki tüm görevler zamanında tamamlanmış.'}
              </p>
            </div>
          </div>

          {/* Sağ: Yazdır, Havuz Temizle & Kupa */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'flex-start' : 'flex-end'
          }}>
            {hasTasks && (
              <button
                type="button"
                onClick={handlePrintCatchUp}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  color: '#ffffff',
                  borderRadius: 12,
                  padding: isMobile ? '5px 10px' : '6px 14px',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.18s ease'
                }}
                title="A4 Çıktı Olarak Yazdır"
              >
                <Printer size={14} style={{ color: '#fed7aa' }} />
                <span>Yazdır (A4)</span>
              </button>
            )}

            {hasTasks && onDeleteTask && (
              <button
                type="button"
                onClick={() => onDeleteTask('CLEAR_ALL_CATCHUP')}
                style={{
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  borderRadius: 12,
                  padding: isMobile ? '5px 10px' : '6px 14px',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.18s ease'
                }}
                title="Tüm telafi havuzundaki görevleri kaldır"
              >
                <Trash2 size={13} />
                <span>Temizle</span>
              </button>
            )}

            {/* 3D Kupa */}
            <img
              src="/assets/dashboard/gold_trophy.png"
              alt="Kurtarma"
              style={{
                width: isMobile ? 36 : 46,
                height: isMobile ? 36 : 46,
                objectFit: 'contain',
                filter: 'drop-shadow(0 6px 14px rgba(245, 158, 11, 0.45))'
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* ── Görsel Branş Dağılım Sütunları (Subject Pillars) ── */}
        {hasTasks && subjectDistribution.length > 0 && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 18,
            padding: isMobile ? '0.85rem 0.65rem' : '1.1rem 1.25rem',
            marginBottom: '1rem',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10
            }}>
              <span style={{ fontSize: isMobile ? '0.74rem' : '0.82rem', fontWeight: 800, color: '#fed7aa', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} style={{ color: '#ef4444' }} />
                Branş Bazlı Gecikme Dağılımı (Filtrelemek için tıkla)
              </span>
              {selectedSubject !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedSubject('all')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Tümünü Göster ✕
                </button>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(6, subjectDistribution.length)}, 1fr)`,
              gap: isMobile ? 6 : 12,
              alignItems: 'flex-end',
              height: isMobile ? 120 : 140,
              paddingTop: '0.5rem'
            }}>
              {(() => {
                const maxCount = Math.max(...subjectDistribution.map(s => s.count), 1);
                return subjectDistribution.slice(0, 6).map((item) => {
                  const sTheme = resolveSubjectTheme(item.subject);
                  const isSelected = selectedSubject === item.subject;
                  const heightPct = Math.max(22, Math.round((item.count / maxCount) * 100));

                  return (
                    <div
                      key={item.subject}
                      onClick={() => setSelectedSubject(isSelected ? 'all' : item.subject)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                        gap: 6,
                        cursor: 'pointer',
                        opacity: selectedSubject !== 'all' && !isSelected ? 0.45 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      title={`${item.subject}: ${item.count} Görev • ~${item.questions} Soru`}
                    >
                      {/* Üst Görev Sayısı */}
                      <span style={{
                        fontSize: isMobile ? '0.62rem' : '0.72rem',
                        fontWeight: 900,
                        color: isSelected ? '#ffffff' : '#fed7aa'
                      }}>
                        {item.count}G
                      </span>

                      {/* Sütun Çubuğu */}
                      <div style={{
                        width: isMobile ? '70%' : '50%',
                        maxWidth: 36,
                        height: `${heightPct}%`,
                        borderRadius: '8px 8px 3px 3px',
                        background: `linear-gradient(180deg, ${sTheme.from} 0%, ${sTheme.to} 100%)`,
                        boxShadow: isSelected ? `0 0 16px ${sTheme.from}` : 'none',
                        border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                        transition: 'height 0.5s ease'
                      }} />

                      {/* Ders Adı */}
                      <span style={{
                        fontSize: isMobile ? '0.66rem' : '0.76rem',
                        fontWeight: isSelected ? 900 : 700,
                        color: isSelected ? '#ffffff' : '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        textAlign: 'center'
                      }}>
                        {item.subject.slice(0, 5)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ── Alt Özet Şeridi (İlerleme & Hızlı Motivasyon) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: 16,
          padding: isMobile ? '0.65rem 0.85rem' : '0.8rem 1.35rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} style={{ color: '#fb923c' }} />
              <span style={{ fontSize: isMobile ? '0.74rem' : '0.84rem', fontWeight: 800, color: '#e0e7ff' }}>
                Telafi Süresi: <strong style={{ color: '#ffffff' }}>{totalQuestionsEstimate > 0 ? estimatedDurationFormatted : '0 dk'}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.85rem' }}>🎯</span>
              <span style={{ fontSize: isMobile ? '0.74rem' : '0.84rem', fontWeight: 800, color: '#e0e7ff' }}>
                Kurtarılacak Soru: <strong style={{ color: '#ffffff' }}>~{totalQuestionsEstimate} Soru</strong>
              </span>
            </div>

            {completedTasksCount > 0 && (
              <span style={{
                fontSize: isMobile ? '0.68rem' : '0.76rem',
                fontWeight: 900,
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '2px 8px',
                borderRadius: 99
              }}>
                ✓ {completedTasksCount} Tamamlandı (%{completionPct})
              </span>
            )}
          </div>

          <div style={{
            background: hasTasks ? 'linear-gradient(135deg, #ea580c, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '3px 12px',
            borderRadius: 99,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            fontWeight: 900,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: hasTasks ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.4)'
          }}>
            <span>⚡</span>
            <span>{hasTasks ? 'Hemen Telafi Et & Sıfırla' : 'Hedef Tamamlandı'}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          3. AKILLI FİLTRELEME & ARAMA KONTROLLERİ
      ══════════════════════════════════════════════════════ */}
      {hasTasks && (
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.85rem 0.85rem' : '1.15rem 1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Üst Satır: Kategori Butonları + Hızlı Arama */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            {/* Kategori Seçici */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 2,
              WebkitOverflowScrolling: 'touch'
            }}>
              {[
                { id: 'all', label: 'Tüm Görevler' },
                { id: 'kitap', label: '📚 Kitaplar' },
                { id: 'harita', label: '🗺️ Yol Haritası' },
                { id: 'ödev', label: '📝 Ödevler' },
                { id: 'deneme', label: '🎯 Denemeler' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: isMobile ? '5px 10px' : '6px 14px',
                    borderRadius: 99,
                    border: '1.5px solid',
                    borderColor: selectedCategory === cat.id ? '#6366f1' : (isDarkEffective ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                    background: selectedCategory === cat.id ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : (isDarkEffective ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                    color: selectedCategory === cat.id ? '#ffffff' : subTextColor,
                    fontSize: isMobile ? '0.72rem' : '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: selectedCategory === cat.id ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Arama Girişi */}
            <div style={{
              position: 'relative',
              minWidth: isMobile ? '100%' : 260
            }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: subTextColor,
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Telafi görevi, kitap veya konu ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 2rem 0.55rem 2.2rem',
                  borderRadius: 12,
                  border: isDarkEffective ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #cbd5e1',
                  background: isDarkEffective ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                  color: textColor,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: subTextColor,
                    cursor: 'pointer',
                    padding: 2
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Alt Satır: Branş Filtre Hapları */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
            borderTop: isDarkEffective ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
            paddingTop: 10
          }}>
            <button
              type="button"
              onClick={() => setSelectedSubject('all')}
              style={{
                padding: '4px 12px',
                borderRadius: 99,
                border: '1.5px solid',
                borderColor: selectedSubject === 'all' ? '#ef4444' : (isDarkEffective ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                background: selectedSubject === 'all' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                color: selectedSubject === 'all' ? '#ffffff' : subTextColor,
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedSubject === 'all' ? '0 3px 10px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              Tüm Dersler ({catchUpTasks.length})
            </button>

            {subjectDistribution.map((item) => {
              const isAct = selectedSubject === item.subject;
              const sTheme = resolveSubjectTheme(item.subject);
              return (
                <button
                  key={item.subject}
                  type="button"
                  onClick={() => setSelectedSubject(isAct ? 'all' : item.subject)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 99,
                    border: '1.5px solid',
                    borderColor: isAct ? sTheme.from : (isDarkEffective ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                    background: isAct ? `linear-gradient(135deg, ${sTheme.from}, ${sTheme.to})` : 'transparent',
                    color: isAct ? '#ffffff' : textColor,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: isAct ? `0 3px 10px ${sTheme.from}50` : 'none',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span>{sTheme.icon}</span>
                  <span>{item.subject}</span>
                  <span style={{
                    fontSize: '0.66rem',
                    background: isAct ? 'rgba(255,255,255,0.25)' : (isDarkEffective ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                    padding: '1px 6px',
                    borderRadius: 99,
                    color: isAct ? '#ffffff' : subTextColor
                  }}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          4. GÖREV LİSTESİ KARTLARI (2 SÜTUNLU MODERN GRID)
      ══════════════════════════════════════════════════════ */}
      {hasTasks ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: isMobile ? '0.65rem' : '0.85rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {filteredTasks.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              background: cardBg,
              borderRadius: 20,
              border: isDarkEffective ? '1.5px dashed rgba(255, 255, 255, 0.15)' : '1.5px dashed #cbd5e1',
              color: subTextColor
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: textColor }}>
                Arama kriterlerine uygun telafi görevi bulunamadı.
              </div>
              <button
                type="button"
                onClick={() => { setSelectedSubject('all'); setSelectedCategory('all'); setSearchQuery(''); }}
                style={{
                  marginTop: 12,
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            filteredTasks.map((task, cIdx) => {
              const isReadingTask = task.taskType === 'okuma' ||
                task.subject === 'Kitap Okuma' ||
                String(task.topic || '').toLowerCase().includes('kitap okuma') ||
                String(task.title || '').toLowerCase().includes('kitap okuma') ||
                String(task.taskType || '').toLowerCase().includes('okuma');
              const isQuizTask = !isReadingTask && Boolean(task.isAutoHomework || task.testId || task.hwId || task.roadmapAssignmentId);
              const cleanSubj = (task.subject && task.subject.toLowerCase() === 'geometri') ? 'Matematik' : (task.subject || 'Genel');
              const catBadge = getCatchUpCategoryBadge(task);
              const rawBook = (task.bookTitle || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();

              const sBook = String(task.bookTitle || task.bookName || '');
              const sTestName = String(task.testName || task.name || '');
              const sTitle = String(task.title || '');
              const sTopic = String(task.topic || task.unitTopic || '');
              const sUnit = String(task.unit || task.unitName || '');

              let displayTitle = String(sTestName || sTitle || sTopic || 'Telafi Görevi')
                .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
                .replace(/\s*\(Tüm Kitap\)/gi, '')
                .replace(/\s*\(Kendi Eklediğim\)/gi, '')
                .replace(/\s*\(Görev\)/gi, '')
                .replace(/^🎯\s*/, '')
                .replace(/^\[\d+\.\s*Tekrar[^\]]*\]\s*/i, '')
                .trim();

              if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                const stripped = displayTitle.replace(new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s\—\-\:\/]+/, '').trim();
                if (stripped && !/^(test|testi)$/i.test(stripped)) {
                  displayTitle = stripped;
                }
              }

              if (!displayTitle || /^(ödev|görev|test|testi|sınav|kitap testi|telafi görevi)$/i.test(displayTitle.trim()) || (rawBook && displayTitle.toLowerCase() === rawBook.toLowerCase())) {
                if (sTestName && !/^(ödev|görev|test|testi|sınav|kitap testi)$/i.test(sTestName.trim()) && sTestName.toLowerCase() !== rawBook.toLowerCase()) {
                  displayTitle = sTestName.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
                } else if (sTopic && !/^(ödev|görev|test|testi|sınav|kitap testi)$/i.test(sTopic.trim())) {
                  displayTitle = `${sTopic} Testi`;
                } else if (sUnit) {
                  displayTitle = `${sUnit} Testi`;
                } else if (task.isBookTask) {
                  displayTitle = isReadingTask ? (sTitle || 'Kitap Okuma') : (sTestName || sTitle || (rawBook ? `${rawBook} Testi` : 'Kitap Testi'));
                } else if (cleanSubj) {
                  displayTitle = isReadingTask ? (sTitle || 'Kitap Okuma') : `${cleanSubj} Testi`;
                } else {
                  displayTitle = isReadingTask ? 'Kitap Okuma' : 'Konu Testi';
                }
              }

              let pageBadge = null;
              const pageMatch = displayTitle.match(/^(\d+(?:[\-\–]\d+)?\.\s*(?:Sayfa|s\.)|\s*s\.\s*\d+(?:[\-\–]\d+)?)\s*/i);
              if (pageMatch) {
                pageBadge = pageMatch[0].trim();
                displayTitle = displayTitle.substring(pageMatch[0].length).trim();
              }

              const sTheme = resolveSubjectTheme(cleanSubj);

              return (
                <div
                  key={`remedial_premium_${task.id || task.hwId || cIdx}`}
                  onClick={() => {
                    if (isReadingTask) {
                      onToggleTask && onToggleTask(task);
                    } else {
                      onTaskClick && onTaskClick(task);
                    }
                  }}
                  style={{
                    background: task.done
                      ? (isDarkEffective ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                      : cardBg,
                    border: task.done
                      ? '1.5px solid rgba(16, 185, 129, 0.4)'
                      : (isDarkEffective ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid #e2e8f0'),
                    borderLeft: `5px solid ${task.done ? '#10b981' : (isReadingTask ? '#ec4899' : sTheme.from)}`,
                    borderRadius: 18,
                    padding: isMobile ? '0.85rem 0.85rem' : '1.1rem 1.25rem',
                    cursor: 'pointer',
                    boxShadow: task.done ? '0 2px 10px rgba(16, 185, 129, 0.15)' : cardShadow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? 10 : 14,
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Sol: Özel Yuvarlatılmış Checkbox Butonu */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                    style={{
                      width: isMobile ? 32 : 36,
                      height: isMobile ? 32 : 36,
                      minWidth: isMobile ? 32 : 36,
                      borderRadius: 11,
                      border: task.done
                        ? '2px solid #10b981'
                        : (isDarkEffective ? '2px solid rgba(255, 255, 255, 0.25)' : '2px solid #cbd5e1'),
                      background: task.done
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : (isDarkEffective ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: task.done ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
                      transition: 'all 0.18s ease'
                    }}
                    title={task.done ? 'Tamamlandı (Geri almak için tıkla)' : 'Tamamlandı olarak işaretle'}
                  >
                    {task.done ? (
                      <Check size={isMobile ? 18 : 20} color="#ffffff" strokeWidth={3.5} />
                    ) : null}
                  </button>

                  {/* Orta: İçerik Bilgileri */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Üst Rozetler Satırı */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: isMobile ? '0.64rem' : '0.7rem',
                        fontWeight: 900,
                        color: sTheme.badgeText,
                        background: sTheme.badgeBg,
                        border: `1px solid ${sTheme.badgeBorder}`,
                        padding: '1.5px 7px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: isMobile ? '0.78rem' : '0.86rem' }}>{sTheme.icon}</span>
                        <span>{cleanSubj}</span>
                      </span>

                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#ef4444',
                        background: isDarkEffective ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2',
                        border: isDarkEffective ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecdd3',
                        padding: '1px 6px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0
                      }}>
                        ⚠️ Gecikti
                      </span>

                      {catBadge && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          color: catBadge.color,
                          background: catBadge.bg,
                          border: `1px solid ${catBadge.border}`,
                          padding: '1px 6px',
                          borderRadius: 6,
                          flexShrink: 0
                        }}>
                          {catBadge.label}
                        </span>
                      )}
                    </div>

                    {/* Başlık */}
                    <div style={{
                      fontSize: isMobile ? '0.88rem' : '0.98rem',
                      fontWeight: 850,
                      color: task.done ? subTextColor : textColor,
                      textDecoration: task.done ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.25
                    }}>
                      {displayTitle}
                    </div>

                    {/* Alt Detaylar (Kitap, Soru, Sayfa, Gecikme Nedeni) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      color: subTextColor,
                      fontWeight: 650
                    }}>
                      {task.bookTitle && !/^kitap$/i.test(task.bookTitle.trim()) && (
                        <span style={{
                          color: (task.roadmapAssignmentId || task.isRoadmapTask) ? '#7c3aed' : textColor,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: isMobile ? 140 : 220
                        }}>
                          {(task.roadmapAssignmentId || task.isRoadmapTask) ? `🗺️ ${task.bookTitle}` : `📖 ${task.bookTitle}`}
                        </span>
                      )}
                      {task.questionCount && !isReadingTask && (
                        <span>• 📝 {String(task.questionCount).replace(/\s*soru\s*$/i, '')} Soru</span>
                      )}
                      {isReadingTask && (
                        <span style={{ color: '#db2777' }}>• 📚 Okuma</span>
                      )}
                      {pageBadge && (
                        <span>• 📄 {pageBadge}</span>
                      )}
                      {task.unitTopic && (
                        <span>• 📌 {task.unitTopic}</span>
                      )}
                      {(task.reason || task.dueDateStr || task.time) && (
                        <span style={{ color: '#ef4444' }}>
                          • ⏰ {task.reason || task.dueDateStr || task.time}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sağ: Silme & Aksiyon Düğmeleri */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          background: isDarkEffective ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                          border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
                          color: subTextColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'all 0.15s ease'
                        }}
                        title="Telafi havuzundan kaldır"
                      >
                        <X size={13} />
                      </button>
                    )}

                    {task.roadmapAssignmentId ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          padding: isMobile ? '0.45rem 0.75rem' : '0.52rem 1rem',
                          fontSize: isMobile ? '0.74rem' : '0.8rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)'
                        }}
                      >
                        <Compass size={13} />
                        <span>Harita</span>
                      </button>
                    ) : isQuizTask ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          padding: isMobile ? '0.45rem 0.85rem' : '0.52rem 1.05rem',
                          fontSize: isMobile ? '0.76rem' : '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                        }}
                      >
                        <Zap size={13} />
                        <span>Çöz</span>
                        <ChevronRight size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          padding: isMobile ? '0.45rem 0.85rem' : '0.52rem 1.05rem',
                          fontSize: isMobile ? '0.76rem' : '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        <span>{isReadingTask ? 'Okudum' : 'Tamamla'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
            5. KUTLAMA VİTRİNİ (HAVUZ BOŞ İSE TERTEMİZ STATE)
        ══════════════════════════════════════════════════════ */
        <div style={{
          background: cardBg,
          borderRadius: 24,
          border: cardBorder,
          boxShadow: cardShadow,
          textAlign: 'center',
          padding: isMobile ? '2.5rem 1.25rem' : '4rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Arka Plan Glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* İkon Rozeti */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.4))',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.8rem',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)'
          }}>
            ✨
          </div>

          <h4 style={{
            margin: 0,
            fontSize: isMobile ? '1.25rem' : '1.55rem',
            fontWeight: 950,
            color: textColor,
            letterSpacing: '-0.02em'
          }}>
            Tebrikler! Telafi Havuzun Tertemiz 🎉
          </h4>

          <p style={{
            margin: 0,
            maxWidth: 520,
            fontSize: isMobile ? '0.82rem' : '0.92rem',
            color: subTextColor,
            lineHeight: 1.6,
            fontWeight: 600
          }}>
            Geçmiş günlerden kalan hiçbir gecikmiş görevin veya eksik ödevin bulunmuyor. Haftalık çalışma programın tam disiplinle ve eksiksiz ilerliyor!
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 10,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {onNavigateTasks && (
              <button
                type="button"
                onClick={onNavigateTasks}
                style={{
                  borderRadius: 14,
                  padding: isMobile ? '0.65rem 1.25rem' : '0.75rem 1.6rem',
                  fontSize: isMobile ? '0.8rem' : '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 6px 18px rgba(59, 130, 246, 0.35)'
                }}
              >
                <span>⚔️ Bugünkü Görevlere Git</span>
                <ChevronRight size={16} />
              </button>
            )}

            {onStartStudyRoom && (
              <button
                type="button"
                onClick={onStartStudyRoom}
                style={{
                  borderRadius: 14,
                  padding: isMobile ? '0.65rem 1.25rem' : '0.75rem 1.6rem',
                  fontSize: isMobile ? '0.8rem' : '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)'
                }}
              >
                <span>🎧 Çalışma Odasına Gir</span>
                <Zap size={16} />
              </button>
            )}

            {onNavigateBooks && (
              <button
                type="button"
                onClick={onNavigateBooks}
                style={{
                  background: isDarkEffective ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                  border: isDarkEffective ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                  color: textColor,
                  borderRadius: 14,
                  padding: isMobile ? '0.65rem 1.25rem' : '0.75rem 1.6rem',
                  fontSize: isMobile ? '0.8rem' : '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <BookOpen size={16} />
                <span>🎒 Kütüphaneyi İncele</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          6. YAZDIRILABİLİR TELAFİ DOKÜMANI (A4 PORTAL)
      ══════════════════════════════════════════════════════ */}
      {isPrintingCatchUp && hasTasks && typeof document !== 'undefined' && createPortal(
        <div id="print-catchup-tasks-portal" className="print-catchup-tasks-doc">
          <style>{`
            .print-catchup-tasks-doc { display: none; }
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 10mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
              }
              body > *:not(#print-catchup-tasks-portal) {
                display: none !important;
              }
              #print-catchup-tasks-portal {
                display: block !important;
                width: 100% !important;
                position: static !important;
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: 'Inter', -apple-system, sans-serif !important;
              }
              .print-cu-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                border-bottom: 2.5px solid #dc2626 !important;
                padding-bottom: 6px !important;
                margin-bottom: 8px !important;
              }
              .print-cu-brand {
                font-size: 11pt !important;
                font-weight: 900 !important;
                color: #0f172a !important;
                letter-spacing: -0.02em !important;
              }
              .print-cu-title {
                font-size: 9.2pt !important;
                font-weight: 900 !important;
                color: #dc2626 !important;
                margin-top: 2px !important;
              }
              .print-cu-alert-box {
                background: #fff7ed !important;
                border: 1px solid #fed7aa !important;
                border-left: 4px solid #f97316 !important;
                padding: 5px 8px !important;
                font-size: 7.2pt !important;
                color: #9a3412 !important;
                margin-bottom: 10px !important;
                border-radius: 4px !important;
                page-break-inside: avoid !important;
              }
              .print-cu-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: 10px !important;
                font-size: 7.4pt !important;
                page-break-inside: auto !important;
              }
              .print-cu-th {
                background: #f8fafc !important;
                border: 1px solid #cbd5e1 !important;
                padding: 4px 6px !important;
                font-weight: 900 !important;
                color: #1e293b !important;
                text-align: left !important;
              }
              .print-cu-tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .print-cu-td {
                border: 1px solid #e2e8f0 !important;
                padding: 4px 6px !important;
                vertical-align: middle !important;
                line-height: 1.25 !important;
              }
              .print-cu-check {
                display: inline-flex !important;
                width: 13px !important;
                height: 13px !important;
                border: 1.5px solid #64748b !important;
                border-radius: 3px !important;
                background: #ffffff !important;
              }
              .print-cu-footer {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                border-top: 1.5px solid #cbd5e1 !important;
                padding-top: 6px !important;
                margin-top: 10px !important;
                display: flex !important;
                justify-content: space-between !important;
                font-size: 7.2pt !important;
                color: #475569 !important;
              }
            }
          `}</style>

          <div className="print-cu-header">
            <div>
              <div className="print-cu-brand">E-TEST EĞİTİM & KOÇLUK PLATFORMU</div>
              <div className="print-cu-title">⚠️ Akıllı Telafi Havuzu • Geciken Görevler Listesi</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '7.8pt', color: '#334155' }}>
              <div style={{ fontWeight: 900, color: '#dc2626' }}>Toplam: {catchUpTasks.length} Görev</div>
              <div style={{ color: '#64748b', fontSize: '7.2pt', marginTop: 2 }}>
                Yazdırma Tarihi: {new Date().toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>

          <div className="print-cu-alert-box">
            📌 <strong>Bilgilendirme:</strong> Bu listedeki görevler süresi geçmiş veya telafi edilmesi gereken çalışmaları içerir. Tamamladıkça kutucukları işaretleyiniz ve doğru/yanlış/boş sayılarını not ediniz.
          </div>

          <table className="print-cu-table">
            <thead>
              <tr>
                <th className="print-cu-th" style={{ width: 24, textAlign: 'center' }}>No</th>
                <th className="print-cu-th" style={{ width: 70 }}>Ders</th>
                <th className="print-cu-th" style={{ width: 80 }}>Tür</th>
                <th className="print-cu-th">Görev / Kitap / Test Adı</th>
                <th className="print-cu-th" style={{ width: 45, textAlign: 'center' }}>Soru</th>
                <th className="print-cu-th" style={{ width: 75 }}>Gecikme Sebebi</th>
                <th className="print-cu-th" style={{ width: 65, textAlign: 'center' }}>Sonuç (D/Y/B)</th>
                <th className="print-cu-th" style={{ width: 30, textAlign: 'center' }}>Tamam</th>
              </tr>
            </thead>
            <tbody>
              {catchUpTasks.map((task, idx) => {
                const cleanSubj = (task.subject && task.subject.toLowerCase() === 'geometri') ? 'Matematik' : (task.subject || 'Genel');
                const rawBook = (task.bookTitle || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();

                let displayTitle = (task.testName || task.title || task.topic || 'Telafi Görevi')
                  .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
                  .replace(/\s*\(Tüm Kitap\)/gi, '')
                  .replace(/\s*\(Kendi Eklediğim\)/gi, '')
                  .replace(/\s*\(Görev\)/gi, '')
                  .trim();

                if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                  const stripped = displayTitle.replace(new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s\—\-\:\/]+/, '').trim();
                  if (stripped && !/^(test|testi)$/i.test(stripped)) {
                    displayTitle = stripped;
                  }
                }

                if (!displayTitle || /^(ödev|görev|test|testi|sınav|kitap testi|telafi görevi)$/i.test(displayTitle.trim()) || (rawBook && displayTitle.toLowerCase() === rawBook.toLowerCase())) {
                  if (task.testName && !/^(ödev|görev|test|testi|sınav|kitap testi)$/i.test(task.testName.trim()) && task.testName.toLowerCase() !== rawBook.toLowerCase()) {
                    displayTitle = task.testName.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
                  } else if (task.unitTopic) {
                    displayTitle = `${task.unitTopic} Testi`;
                  } else if (task.subject) {
                    displayTitle = `${task.subject} Testi`;
                  } else {
                    displayTitle = 'Konu Testi';
                  }
                }

                const catBadge = getCatchUpCategoryBadge(task);
                const qCountStr = task.questionCount ? String(task.questionCount).replace(/\s*soru\s*$/i, '') : '-';

                return (
                  <tr key={`print_cu_row_${task.id || idx}`} className="print-cu-tr">
                    <td className="print-cu-td" style={{ textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                    <td className="print-cu-td" style={{ fontWeight: 800 }}>{cleanSubj}</td>
                    <td className="print-cu-td" style={{ fontSize: '6.8pt' }}>{catBadge?.label || 'Görev'}</td>
                    <td className="print-cu-td">
                      <div style={{ fontWeight: 800 }}>{displayTitle}</div>
                      {task.bookTitle && (
                        <div style={{ fontSize: '6.8pt', color: '#64748b', marginTop: 1 }}>
                          📖 {task.bookTitle} {task.unitTopic ? `• ${task.unitTopic}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="print-cu-td" style={{ textAlign: 'center', fontWeight: 700 }}>{qCountStr}</td>
                    <td className="print-cu-td" style={{ fontSize: '6.8pt', color: '#dc2626' }}>
                      {task.reason || task.dueDateStr || task.time || 'Gecikti'}
                    </td>
                    <td className="print-cu-td" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      ___ / ___ / ___
                    </td>
                    <td className="print-cu-td" style={{ textAlign: 'center' }}>
                      <div className="print-cu-check" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="print-cu-footer">
            <div>Öğrenci Adı Soyadı: ___________________________</div>
            <div>Veli / Öğretmen İmzası: ___________________________</div>
            <div>Sayfa 1 / 1</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
