import React, { useState, useEffect, useMemo } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useSummaries } from '../context/SummaryContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import SummaryHtmlViewer from '../components/summary/SummaryHtmlViewer';
import {
  BookOpen, Search, ChevronRight, ChevronLeft, ChevronDown,
  Printer, ZoomIn, ZoomOut, FileText, CheckCircle2,
  ArrowLeft, ArrowRight, BookMarked, X,
  LayoutGrid, Grid3X3, Grid2X2, Columns, List, Sparkles,
  ChevronsUpDown, Check, Award, Maximize2, Minimize2
} from 'lucide-react';
import './StudentSummaryPage.css';

const UNIT_PALETTES = [
  // 1. Vibrant Indigo / Electric Blue
  { color: '#4f46e5', gradient: 'linear-gradient(135deg, #4338ca, #6366f1)', lightBg: '#eef2ff', darkBg: 'rgba(79,70,229,0.18)', lightBorder: '#c7d2fe', darkBorder: 'rgba(99,102,241,0.38)', lightText: '#3730a3', darkText: '#a5b4fc', glow: 'rgba(99,102,241,0.28)' },
  // 2. Emerald Green / Mint
  { color: '#059669', gradient: 'linear-gradient(135deg, #047857, #10b981)', lightBg: '#ecfdf5', darkBg: 'rgba(16,185,129,0.18)', lightBorder: '#a7f3d0', darkBorder: 'rgba(16,185,129,0.38)', lightText: '#065f46', darkText: '#6ee7b7', glow: 'rgba(16,185,129,0.28)' },
  // 3. Rose Red / Ruby
  { color: '#e11d48', gradient: 'linear-gradient(135deg, #be123c, #f43f5e)', lightBg: '#fff1f2', darkBg: 'rgba(244,63,94,0.18)', lightBorder: '#fecdd3', darkBorder: 'rgba(244,63,94,0.38)', lightText: '#9f1239', darkText: '#fda4af', glow: 'rgba(244,63,94,0.28)' },
  // 4. Amber Gold / Warm Sunshine
  { color: '#d97706', gradient: 'linear-gradient(135deg, #b45309, #f59e0b)', lightBg: '#fffbeb', darkBg: 'rgba(245,158,11,0.18)', lightBorder: '#fde68a', darkBorder: 'rgba(245,158,11,0.38)', lightText: '#92400e', darkText: '#fcd34d', glow: 'rgba(245,158,11,0.28)' },
  // 5. Electric Purple / Violet
  { color: '#7c3aed', gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', lightBg: '#faf5ff', darkBg: 'rgba(139,92,246,0.18)', lightBorder: '#ddd6fe', darkBorder: 'rgba(139,92,246,0.38)', lightText: '#5b21b6', darkText: '#c4b5fd', glow: 'rgba(139,92,246,0.28)' },
  // 6. Deep Cyan / Laguna
  { color: '#0891b2', gradient: 'linear-gradient(135deg, #0e7490, #06b6d4)', lightBg: '#ecfeff', darkBg: 'rgba(6,182,212,0.18)', lightBorder: '#a5f3fc', darkBorder: 'rgba(6,182,212,0.38)', lightText: '#155e75', darkText: '#67e8f9', glow: 'rgba(6,182,212,0.28)' },
  // 7. Vivid Pink / Magenta
  { color: '#db2777', gradient: 'linear-gradient(135deg, #be185d, #ec4899)', lightBg: '#fdf2f8', darkBg: 'rgba(236,72,153,0.18)', lightBorder: '#fbcfe8', darkBorder: 'rgba(236,72,153,0.38)', lightText: '#9d174d', darkText: '#f472b6', glow: 'rgba(236,72,153,0.28)' },
  // 8. Azure / Sky Blue
  { color: '#0284c7', gradient: 'linear-gradient(135deg, #0369a1, #38bdf8)', lightBg: '#f0f9ff', darkBg: 'rgba(14,165,233,0.18)', lightBorder: '#bae6fd', darkBorder: 'rgba(56,189,248,0.38)', lightText: '#075985', darkText: '#7dd3fc', glow: 'rgba(14,165,233,0.28)' },
  // 9. Tangerine / Coral Orange
  { color: '#ea580c', gradient: 'linear-gradient(135deg, #c2410c, #fb923c)', lightBg: '#fff7ed', darkBg: 'rgba(249,115,22,0.18)', lightBorder: '#fed7aa', darkBorder: 'rgba(251,146,60,0.38)', lightText: '#9a3412', darkText: '#fdba74', glow: 'rgba(249,115,22,0.28)' },
  // 10. Teal / Turquoise
  { color: '#0d9488', gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)', lightBg: '#f0fdfa', darkBg: 'rgba(20,184,166,0.18)', lightBorder: '#99f6e4', darkBorder: 'rgba(20,184,166,0.38)', lightText: '#115e59', darkText: '#5eead4', glow: 'rgba(20,184,166,0.28)' },
  // 11. Fuchsia / Orchid
  { color: '#c026d3', gradient: 'linear-gradient(135deg, #a21caf, #e879f9)', lightBg: '#fdf4ff', darkBg: 'rgba(217,70,239,0.18)', lightBorder: '#f5d0fe', darkBorder: 'rgba(232,121,249,0.38)', lightText: '#86198f', darkText: '#f0abfc', glow: 'rgba(217,70,239,0.28)' },
  // 12. Lime / Apple Green
  { color: '#65a30d', gradient: 'linear-gradient(135deg, #4d7c0f, #84cc16)', lightBg: '#f7fee7', darkBg: 'rgba(132,204,22,0.18)', lightBorder: '#d9f99d', darkBorder: 'rgba(132,204,22,0.38)', lightText: '#3f6212', darkText: '#bef264', glow: 'rgba(132,204,22,0.28)' },
];

const getUnitTheme = (index, unitNum, isDark) => {
  const palIndex = (typeof unitNum === 'number' && unitNum > 0 ? (unitNum - 1) : index) % UNIT_PALETTES.length;
  const p = UNIT_PALETTES[Math.abs(palIndex)];
  return {
    color: p.color,
    gradient: p.gradient,
    bg: isDark ? p.darkBg : p.lightBg,
    border: isDark ? p.darkBorder : p.lightBorder,
    text: isDark ? p.darkText : p.lightText,
    glow: p.glow
  };
};

const getSubjectTheme = (subjectName, isDark) => {
  const s = String(subjectName || '').toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) return { icon: '📐', color: '#3b82f6', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', bg: isDark ? 'rgba(37,99,235,0.18)' : '#eff6ff', border: isDark ? 'rgba(59,130,246,0.38)' : '#bfdbfe', text: isDark ? '#93c5fd' : '#1d4ed8', glow: 'rgba(59,130,246,0.25)' };
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) return { icon: '🔬', color: '#10b981', gradient: 'linear-gradient(135deg, #059669, #10b981)', bg: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5', border: isDark ? 'rgba(16,185,129,0.38)' : '#bbf7d0', text: isDark ? '#6ee7b7' : '#15803d', glow: 'rgba(16,185,129,0.25)' };
  if (s.includes('turkce') || s.includes('edebiyat') || s.includes('dil')) return { icon: '📖', color: '#f43f5e', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', bg: isDark ? 'rgba(244,63,94,0.18)' : '#fff1f2', border: isDark ? 'rgba(244,63,94,0.38)' : '#fecdd3', text: isDark ? '#fda4af' : '#be123c', glow: 'rgba(244,63,94,0.25)' };
  if (s.includes('tarih') || s.includes('sosyal') || s.includes('cografya') || s.includes('inkilap')) return { icon: '🏛️', color: '#f59e0b', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', bg: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb', border: isDark ? 'rgba(245,158,11,0.38)' : '#fde68a', text: isDark ? '#fcd34d' : '#b45309', glow: 'rgba(245,158,11,0.25)' };
  if (s.includes('ingilizce') || s.includes('yabanci') || s.includes('almanca')) return { icon: '🌍', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', bg: isDark ? 'rgba(139,92,246,0.18)' : '#faf5ff', border: isDark ? 'rgba(139,92,246,0.38)' : '#e9d5ff', text: isDark ? '#c4b5fd' : '#6d28d9', glow: 'rgba(139,92,246,0.25)' };
  if (s.includes('din') || s.includes('ahlak')) return { icon: '🕌', color: '#06b6d4', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', bg: isDark ? 'rgba(6,182,212,0.18)' : '#ecfeff', border: isDark ? 'rgba(6,182,212,0.38)' : '#a5f3fc', text: isDark ? '#67e8f9' : '#0e7490', glow: 'rgba(6,182,212,0.25)' };
  return { icon: '📚', color: '#6366f1', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', bg: isDark ? 'rgba(99,102,241,0.18)' : '#f8fafc', border: isDark ? 'rgba(99,102,241,0.38)' : '#cbd5e1', text: isDark ? '#a5b4fc' : '#334155', glow: 'rgba(99,102,241,0.25)' };
};

const getSubjectIcon = (subjectName) => {
  const s = String(subjectName || '').toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) return '📐';
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) return '🔬';
  if (s.includes('turkce') || s.includes('edebiyat') || s.includes('dil')) return '📖';
  if (s.includes('tarih') || s.includes('sosyal') || s.includes('cografya') || s.includes('inkilap')) return '🏛️';
  if (s.includes('ingilizce') || s.includes('yabanci') || s.includes('almanca')) return '🌍';
  if (s.includes('din') || s.includes('ahlak')) return '🕌';
  return '📚';
};

const extractUnitOrderNumber = (unit, fallbackIndex) => {
  if (!unit) return fallbackIndex;
  if (typeof unit.order === 'number') return unit.order;
  if (typeof unit.sortOrder === 'number') return unit.sortOrder;
  if (typeof unit.unitNumber === 'number') return unit.unitNumber;
  const raw = String(unit.name || '').trim();
  const match = raw.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return fallbackIndex;
};

const sortUnitsNaturally = (unitList) =>
  [...unitList].sort((a, b) => {
    const numA = extractUnitOrderNumber(a, 999);
    const numB = extractUnitOrderNumber(b, 999);
    if (numA !== numB) return numA - numB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true, sensitivity: 'base' });
  });

const sortTopicsNaturally = (topicList) =>
  [...topicList].sort((a, b) => {
    if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
    const numA = (String(a.name || '').match(/(\d+)/) || [])[1];
    const numB = (String(b.name || '').match(/(\d+)/) || [])[1];
    if (numA && numB && parseInt(numA, 10) !== parseInt(numB, 10)) return parseInt(numA, 10) - parseInt(numB, 10);
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true, sensitivity: 'base' });
  });

const getUnitDetails = (unit, index) => {
  const unitNum = extractUnitOrderNumber(unit, index + 1);
  const raw = String(unit && unit.name ? unit.name : '').trim();
  const isGeneric = !raw || /^\d+$/.test(raw) || /^(\d+)\.\s*unite$/i.test(raw) || /^unite\s*(\d+)$/i.test(raw);
  let cleanTitle = '';
  if (!isGeneric) {
    cleanTitle = raw.replace(/^(\d+\.\s*unite|\d+\s*-\s*unite|unite\s*\d+)[:\s\-]*/i, '').replace(/^(\d+)[\.\-]\s*/, '').trim();
  }
  const fullDisplayName = cleanTitle ? (unitNum + '. Ünite: ' + cleanTitle) : (unitNum + '. Ünite');
  return { unitNum, cleanTitle, fullDisplayName, badgeText: (unitNum + '. ÜNİTE') };
};

export default function StudentSummaryPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: curriculumData } = useCurriculum();
  const { summaries, getSummary, hasSummary, isSummaryRead, toggleSummaryRead } = useSummaries();
  const { currentUser } = useAuth();

  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [activeReadingTarget, setActiveReadingTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'has_summary' | 'unread' | 'completed'
  const [colLayout, setColLayout] = useState('auto'); // 'auto' | '2' | '3' | '4' | '1'
  const [fontSize, setFontSize] = useState(16);
  const [isPageFullscreen, setIsPageFullscreen] = useState(false);
  const [openUnitIds, setOpenUnitIds] = useState(new Set());

  const isCurrentTargetRead = useMemo(() => {
    if (!activeReadingTarget) return false;
    return isSummaryRead(activeReadingTarget.type, activeReadingTarget.id, currentUser && currentUser.id);
  }, [activeReadingTarget, isSummaryRead, currentUser]);

  const handleToggleCurrentRead = () => {
    if (!activeReadingTarget) return;
    toggleSummaryRead(activeReadingTarget.type, activeReadingTarget.id, currentUser && currentUser.id);
  };

  const togglePageFullscreen = () => {
    if (!isPageFullscreen) {
      setIsPageFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (err) {}
    } else {
      setIsPageFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {}
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsPageFullscreen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && isPageFullscreen) {
        setIsPageFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPageFullscreen]);

  useEffect(() => {
    if (isPageFullscreen) {
      document.body.setAttribute('data-ssp-fullscreen', 'true');
      document.documentElement.classList.add('ssp-in-fullscreen');
    } else {
      document.body.removeAttribute('data-ssp-fullscreen');
      document.documentElement.classList.remove('ssp-in-fullscreen');
    }
    return () => {
      document.body.removeAttribute('data-ssp-fullscreen');
      document.documentElement.classList.remove('ssp-in-fullscreen');
    };
  }, [isPageFullscreen]);

  const grades = curriculumData.grades || [];
  const subjects = curriculumData.subjects || [];
  const units = curriculumData.units || [];
  const topics = curriculumData.topics || [];

  useEffect(() => {
    if (currentUser && currentUser.gradeId && grades.some(g => String(g.id) === String(currentUser.gradeId))) {
      setSelectedGradeId(currentUser.gradeId);
    } else if (!selectedGradeId && grades.length > 0) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, currentUser, selectedGradeId]);

  const filteredSubjects = useMemo(
    () => subjects.filter(s => String(s.gradeId) === String(selectedGradeId)),
    [subjects, selectedGradeId]
  );

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubjectId || !filteredSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    } else {
      setSelectedSubjectId(null);
    }
  }, [filteredSubjects, selectedSubjectId]);

  const filteredUnits = useMemo(() => {
    const list = units.filter(u => String(u.subjectId) === String(selectedSubjectId));
    return sortUnitsNaturally(list);
  }, [units, selectedSubjectId]);

  useEffect(() => {
    if (filteredUnits.length > 0) {
      setOpenUnitIds(new Set(filteredUnits.map(u => String(u.id))));
    }
  }, [selectedSubjectId, filteredUnits.length]);

  const readingItemList = useMemo(() => {
    const list = [];
    filteredUnits.forEach((u, uIdx) => {
      const details = getUnitDetails(u, uIdx);
      const full = details.fullDisplayName;
      list.push({ type: 'unit', id: u.id, name: full, unitId: u.id, unitName: full, unitIdx: uIdx });
      const unitTopics = sortTopicsNaturally(topics.filter(t => String(t.unitId) === String(u.id)));
      unitTopics.forEach(t => list.push({ type: 'topic', id: t.id, name: t.name, unitId: u.id, unitName: full, unitIdx: uIdx }));
    });
    return list;
  }, [filteredUnits, topics]);

  const currentSummary = useMemo(() => {
    if (!activeReadingTarget) return null;
    return getSummary(activeReadingTarget.type, activeReadingTarget.id);
  }, [activeReadingTarget, summaries, getSummary]);

  const currentIdx = readingItemList.findIndex(item => String(item.id) === String(activeReadingTarget && activeReadingTarget.id));
  const prevItem = currentIdx > 0 ? readingItemList[currentIdx - 1] : null;
  const nextItem = (currentIdx >= 0 && currentIdx < readingItemList.length - 1) ? readingItemList[currentIdx + 1] : null;

  const currentGrade = grades.find(g => String(g.id) === String(selectedGradeId));
  const currentSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const activeSubjectTheme = getSubjectTheme(currentSubject && currentSubject.name, isDark);
  const activeIcon = getSubjectIcon(currentSubject && currentSubject.name);

  const activeUnitTheme = useMemo(() => {
    if (!activeReadingTarget) return activeSubjectTheme;
    const uIdx = filteredUnits.findIndex(u => String(u.id) === String(activeReadingTarget.unitId));
    const targetUnit = uIdx >= 0 ? filteredUnits[uIdx] : null;
    const uNum = extractUnitOrderNumber(targetUnit, uIdx >= 0 ? uIdx + 1 : 1);
    return getUnitTheme(uIdx >= 0 ? uIdx : 0, uNum, isDark);
  }, [activeReadingTarget, filteredUnits, isDark, activeSubjectTheme]);

  const totalSummariesInGrade = useMemo(() => {
    let count = 0;
    filteredSubjects.forEach(s => {
      const sUnits = units.filter(u => String(u.subjectId) === String(s.id));
      sUnits.forEach(u => {
        if (hasSummary('unit', u.id)) count++;
        topics.filter(t => String(t.unitId) === String(u.id)).forEach(t => { if (hasSummary('topic', t.id)) count++; });
      });
    });
    return count;
  }, [filteredSubjects, units, topics, summaries, hasSummary]);

  const readSummariesCountInGrade = useMemo(() => {
    let count = 0;
    filteredSubjects.forEach(s => {
      const sUnits = units.filter(u => String(u.subjectId) === String(s.id));
      sUnits.forEach(u => {
        if (isSummaryRead('unit', u.id, currentUser && currentUser.id)) count++;
        topics.filter(t => String(t.unitId) === String(u.id)).forEach(t => {
          if (isSummaryRead('topic', t.id, currentUser && currentUser.id)) count++;
        });
      });
    });
    return count;
  }, [filteredSubjects, units, topics, isSummaryRead, currentUser]);

  const toggleUnit = (unitId) => {
    setOpenUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(String(unitId))) next.delete(String(unitId));
      else next.add(String(unitId));
      return next;
    });
  };

  const handleExpandAll = () => {
    setOpenUnitIds(new Set(filteredUnits.map(u => String(u.id))));
  };

  const handleCollapseAll = () => {
    setOpenUnitIds(new Set());
  };

  const allUnitsOpen = filteredUnits.length > 0 && openUnitIds.size === filteredUnits.length;

  useEffect(() => {
    if (activeReadingTarget) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeReadingTarget]);

  return (
    <div className="ssp-page">
      {activeReadingTarget ? (
        <div className={'ssp-reader' + (isPageFullscreen ? ' is-fullscreen' : '')}>
          <header className="ssp-reader-bar no-print">
            <div className="ssp-reader-bar-inner">
              <div className="ssp-reader-bar-left">
                <button className="ssp-reader-back-btn" onClick={() => { setActiveReadingTarget(null); setIsPageFullscreen(false); }}>
                  <ArrowLeft size={15} />
                  <span>Konu Listesi</span>
                </button>
                <div className="ssp-reader-breadcrumbs">
                  <span>{currentGrade && currentGrade.name}</span>
                  <ChevronRight size={11} className="ssp-crumb-sep" />
                  <span className="ssp-crumb-subject">{currentSubject && currentSubject.name}</span>
                  <ChevronRight size={11} className="ssp-crumb-sep" />
                  <span className="ssp-crumb-unit" style={{ color: activeUnitTheme.color, fontWeight: 800 }}>{activeReadingTarget.unitName}</span>
                  {activeReadingTarget.type === 'topic' && (
                    <>
                      <ChevronRight size={11} className="ssp-crumb-sep" />
                      <span className="ssp-crumb-active">{activeReadingTarget.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="ssp-reader-bar-right">
                <button
                  className={'ssp-bar-btn' + (isCurrentTargetRead ? ' read-active' : '')}
                  onClick={handleToggleCurrentRead}
                >
                  <CheckCircle2 size={14} />
                  <span className="btn-label">{isCurrentTargetRead ? 'Okundu' : 'Okudum'}</span>
                </button>
                <button
                  className={'ssp-bar-btn fullscreen-btn' + (isPageFullscreen ? ' is-active' : '')}
                  onClick={togglePageFullscreen}
                  title={isPageFullscreen ? 'Tam Ekrandan Çık (Esc)' : 'Tam Ekran Yap'}
                >
                  {isPageFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span className="btn-label">{isPageFullscreen ? 'Küçült' : 'Tam Ekran'}</span>
                </button>
                <div className="ssp-font-box">
                  <button className="ssp-font-btn" onClick={() => setFontSize(p => Math.max(13, p - 1))}>
                    <ZoomOut size={12} /> A-
                  </button>
                  <span className="ssp-font-val">{fontSize}px</span>
                  <button className="ssp-font-btn" onClick={() => setFontSize(p => Math.min(24, p + 1))}>
                    <ZoomIn size={12} /> A+
                  </button>
                </div>
                <button className="ssp-bar-btn" onClick={() => window.print()}>
                  <Printer size={14} />
                  <span className="btn-label">Yazdır</span>
                </button>
              </div>
            </div>
          </header>

          <div className="ssp-reader-layout">
            <div className="ssp-reader-main">
              <article className="ssp-article-card ssp-anim">
                <div className="ssp-article-hero" style={{ borderLeft: '5px solid ' + activeUnitTheme.color }}>
                  <div className="ssp-article-meta">
                    <span className="ssp-article-type-badge" style={{ background: activeUnitTheme.bg, color: activeUnitTheme.color, borderColor: activeUnitTheme.border }}>
                      {activeReadingTarget.type === 'unit' ? 'ÜNİTE GENEL ÖZETİ' : 'KONU ANLATIMI ve ÖZET'}
                    </span>
                    {isCurrentTargetRead && (
                      <span className="ssp-article-read-badge">
                        <CheckCircle2 size={11} /> Okundu
                      </span>
                    )}
                    {currentSummary && currentSummary.updatedAt && (
                      <span className="ssp-article-updated">
                        {'Güncellendi: ' + new Date(currentSummary.updatedAt).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                  <h1 className="ssp-article-title">{activeReadingTarget.name}</h1>
                </div>
                <div className="ssp-article-content">
                  <SummaryHtmlViewer
                    htmlContent={currentSummary ? currentSummary.contentHtml || '' : ''}
                    fontSize={fontSize}
                    title={activeReadingTarget.name}
                    targetType={activeReadingTarget.type}
                    emptyMessage="Bu konu için henüz özet veya ders notu eklenmemiş. Çok yakında öğretmeniniz tarafından eklenecektir."
                    isRead={isCurrentTargetRead}
                    onToggleRead={handleToggleCurrentRead}
                    showControls={true}
                  />
                </div>
              </article>

              <div className="ssp-cta-card no-print">
                <div className="ssp-cta-left">
                  <div className="ssp-cta-emoji">{activeIcon}</div>
                  <div className="ssp-cta-text">
                    <h4>Konuyu Pekiştir ve Test Çöz</h4>
                    <p>{isCurrentTargetRead
                      ? 'Harika! Bu konunun özetini okudun. Şimdi soru bankasında ilgili soruları çöz.'
                      : 'Özeti tamamladıktan sonra Okudum butonuna tıklayabilir, ilgili soruları çözebilirsin.'}</p>
                  </div>
                </div>
                <div className="ssp-cta-actions">
                  <button className={'ssp-cta-read-btn' + (isCurrentTargetRead ? ' read' : '')} onClick={handleToggleCurrentRead}>
                    <CheckCircle2 size={15} />
                    <span>{isCurrentTargetRead ? 'Okundu' : 'Okudum Olarak İşaretle'}</span>
                  </button>
                  <button className="ssp-cta-go-btn" onClick={() => navigate('/student/exams')}>
                    <span>Testlere Git</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="ssp-pagination no-print">
                {prevItem ? (
                  <button className="ssp-nav-btn" onClick={() => setActiveReadingTarget(prevItem)}>
                    <ChevronLeft size={18} />
                    <div className="ssp-nav-text">
                      <span className="ssp-nav-sub">Önceki Konu</span>
                      <span className="ssp-nav-label">{prevItem.name}</span>
                    </div>
                  </button>
                ) : <div />}
                {nextItem ? (
                  <button className="ssp-nav-btn next" onClick={() => setActiveReadingTarget(nextItem)}>
                    <div className="ssp-nav-text">
                      <span className="ssp-nav-sub">Sonraki Konu</span>
                      <span className="ssp-nav-label">{nextItem.name}</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                ) : <div />}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ssp-catalog ssp-anim">
          {/* Hero Banner */}
          <div className="ssp-hero">
            <div className="ssp-hero-inner">
              <div className="ssp-hero-top">
                <button className="ssp-back-btn" onClick={() => navigate('/student')}>
                  <ArrowLeft size={15} />
                  <span>Öğrenci Paneli</span>
                </button>
                <div className="ssp-grade-pills">
                  <span className="ssp-grade-label">Sınıf:</span>
                  {grades.map(g => (
                    <button key={g.id}
                      className={'ssp-grade-pill' + (String(selectedGradeId) === String(g.id) ? ' active' : '')}
                      onClick={() => setSelectedGradeId(g.id)}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ssp-hero-title">
                <div className="ssp-hero-icon">📚</div>
                <div className="ssp-hero-text">
                  <h1>Ders Notları ve Konu Özetleri</h1>
                  <p>Müfredatla uyumlu ünite özetleri ve sınav hazırlık ders notları</p>
                </div>
              </div>
              <div className="ssp-stats-row">
                <div className="ssp-stat-item">
                  <span className="ssp-stat-value">{currentGrade ? currentGrade.name : '-'}</span>
                  <span className="ssp-stat-label">Sınıf</span>
                </div>
                <div className="ssp-stat-item">
                  <span className="ssp-stat-value">{filteredSubjects.length}</span>
                  <span className="ssp-stat-label">Ders</span>
                </div>
                <div className="ssp-stat-item">
                  <span className="ssp-stat-value">{filteredUnits.length}</span>
                  <span className="ssp-stat-label">Ünite</span>
                </div>
                <div className={'ssp-stat-item' + (totalSummariesInGrade > 0 ? ' highlight' : '')}>
                  <span className="ssp-stat-value">{readSummariesCountInGrade + '/' + totalSummariesInGrade}</span>
                  <span className="ssp-stat-label">Okundu</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subjects Navigation Bar */}
          <div className="ssp-subjects-bar">
            <div className="ssp-subjects-row">
              {filteredSubjects.map(s => {
                const theme = getSubjectTheme(s.name, isDark);
                const icon = getSubjectIcon(s.name);
                const isSelected = String(selectedSubjectId) === String(s.id);
                const sUnits = units.filter(u => String(u.subjectId) === String(s.id));
                let summaryCount = 0;
                sUnits.forEach(u => {
                  if (hasSummary('unit', u.id)) summaryCount++;
                  topics.filter(t => String(t.unitId) === String(u.id)).forEach(t => { if (hasSummary('topic', t.id)) summaryCount++; });
                });
                return (
                  <button key={s.id}
                    className={'ssp-subject-btn' + (isSelected ? ' active' : '')}
                    onClick={() => setSelectedSubjectId(s.id)}
                    style={isSelected ? { borderColor: theme.color, background: theme.bg, boxShadow: `0 8px 24px ${theme.glow}` } : {}}>
                    <span className="ssp-subject-emoji">{icon}</span>
                    <div className="ssp-subject-info">
                      <span className="ssp-subject-name" style={{ color: isSelected ? theme.color : 'inherit' }}>{s.name}</span>
                      <span className="ssp-subject-meta" style={{ color: isSelected ? theme.text : 'var(--color-text-muted, #64748b)' }}>
                        {summaryCount > 0 ? `${summaryCount} Özet Hazır` : `${sUnits.length} Ünite`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar: Search, Filters, Column Switcher, Expand/Collapse */}
          <div className="ssp-toolbar-card">
            <div className="ssp-toolbar-top">
              <div className="ssp-search-wrapper">
                <Search size={16} className="ssp-search-icon" />
                <input
                  type="text"
                  placeholder={`${currentSubject ? currentSubject.name : 'Ders'} içinde ünite veya konu ara...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="ssp-search-clear" onClick={() => setSearchQuery('')} title="Aramayı Temizle">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="ssp-filter-pills">
                <button
                  className={'ssp-filter-pill' + (filterStatus === 'all' ? ' active' : '')}
                  onClick={() => setFilterStatus('all')}>
                  Tümü
                </button>
                <button
                  className={'ssp-filter-pill' + (filterStatus === 'has_summary' ? ' active' : '')}
                  onClick={() => setFilterStatus('has_summary')}>
                  <Sparkles size={12} /> Özetliler
                </button>
                <button
                  className={'ssp-filter-pill' + (filterStatus === 'unread' ? ' active' : '')}
                  onClick={() => setFilterStatus('unread')}>
                  Okunmamış
                </button>
                <button
                  className={'ssp-filter-pill' + (filterStatus === 'completed' ? ' active' : '')}
                  onClick={() => setFilterStatus('completed')}>
                  <Check size={12} /> Tamamlananlar
                </button>
              </div>
            </div>

            <div className="ssp-toolbar-bottom">
              <div className="ssp-toolbar-left">
                <button
                  className="ssp-expand-toggle-btn"
                  onClick={allUnitsOpen ? handleCollapseAll : handleExpandAll}
                  title={allUnitsOpen ? 'Tüm Üniteleri Daralt' : 'Tüm Üniteleri Genişlet'}>
                  <ChevronsUpDown size={14} />
                  <span>{allUnitsOpen ? 'Tümünü Kapat' : 'Tümünü Genişlet'}</span>
                </button>
                <span className="ssp-count-badge">
                  {filteredUnits.length} Ünite
                </span>
              </div>

              {/* Dynamic Column Selector */}
              <div className="ssp-column-selector-group">
                <span className="ssp-col-label">Görünüm:</span>
                <div className="ssp-col-buttons">
                  <button
                    className={'ssp-col-btn' + (colLayout === 'auto' ? ' active' : '')}
                    onClick={() => setColLayout('auto')}
                    title="Dinamik Otomatik Sütun (Ekrana Göre Uyum Sağlar)">
                    <LayoutGrid size={14} />
                    <span className="ssp-col-text">Otomatik</span>
                  </button>
                  <button
                    className={'ssp-col-btn' + (colLayout === '2' ? ' active' : '')}
                    onClick={() => setColLayout('2')}
                    title="2 Sütunlu Izgara">
                    <Grid2X2 size={14} />
                    <span className="ssp-col-text">2'li</span>
                  </button>
                  <button
                    className={'ssp-col-btn' + (colLayout === '3' ? ' active' : '')}
                    onClick={() => setColLayout('3')}
                    title="3 Sütunlu Izgara">
                    <Grid3X3 size={14} />
                    <span className="ssp-col-text">3'lü</span>
                  </button>
                  <button
                    className={'ssp-col-btn' + (colLayout === '4' ? ' active' : '')}
                    onClick={() => setColLayout('4')}
                    title="4 Sütunlu Izgara (Geniş Ekran)">
                    <Columns size={14} />
                    <span className="ssp-col-text">4'lü</span>
                  </button>
                  <button
                    className={'ssp-col-btn' + (colLayout === '1' ? ' active' : '')}
                    onClick={() => setColLayout('1')}
                    title="Tek Sütunlu Liste">
                    <List size={14} />
                    <span className="ssp-col-text">Liste</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Units Dynamic Multi-Column Grid with Distinct Per-Unit Colors */}
          <div className={`ssp-units-grid ssp-grid-${colLayout}`}>
            {filteredUnits.length > 0 ? (
              filteredUnits.map((u, uIdx) => {
                const det = getUnitDetails(u, uIdx);
                const unitTheme = getUnitTheme(uIdx, det.unitNum, isDark);
                const unitHasSummary = hasSummary('unit', u.id);
                const isUnitRead = isSummaryRead('unit', u.id, currentUser && currentUser.id);
                const unitTopics = sortTopicsNaturally(topics.filter(t => String(t.unitId) === String(u.id)));
                const isOpen = openUnitIds.has(String(u.id));

                const filteredTopicsList = unitTopics.filter(t => {
                  const topicHasSummary = hasSummary('topic', t.id);
                  const isTopicRead = isSummaryRead('topic', t.id, currentUser && currentUser.id);

                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const matchTopic = t.name.toLowerCase().includes(q);
                    const matchUnit = det.fullDisplayName.toLowerCase().includes(q);
                    if (!matchTopic && !matchUnit) return false;
                  }

                  if (filterStatus === 'has_summary' && !topicHasSummary && !unitHasSummary) return false;
                  if (filterStatus === 'unread' && isTopicRead) return false;
                  if (filterStatus === 'completed' && !isTopicRead) return false;

                  return true;
                });

                if (searchQuery || filterStatus !== 'all') {
                  const unitMatchesSearch = searchQuery && det.fullDisplayName.toLowerCase().includes(searchQuery.toLowerCase());
                  const unitMatchesFilter = (filterStatus === 'has_summary' && unitHasSummary) ||
                                            (filterStatus === 'unread' && !isUnitRead) ||
                                            (filterStatus === 'completed' && isUnitRead);

                  if (!unitMatchesSearch && !unitMatchesFilter && filteredTopicsList.length === 0) {
                    return null;
                  }
                }

                const totalTopicsCount = unitTopics.length;
                const readTopicsCount = unitTopics.filter(t => isSummaryRead('topic', t.id, currentUser && currentUser.id)).length;
                const progressPct = totalTopicsCount > 0 ? Math.round((readTopicsCount / totalTopicsCount) * 100) : (isUnitRead ? 100 : 0);
                const isUnitCompleted = totalTopicsCount > 0 ? readTopicsCount === totalTopicsCount : isUnitRead;

                return (
                  <div
                    key={u.id}
                    className={`ssp-unit-card ${isUnitCompleted ? 'is-completed' : ''}`}
                    style={{
                      '--unit-color': unitTheme.color,
                      '--unit-glow': unitTheme.glow,
                      borderColor: isUnitCompleted ? 'rgba(16, 185, 129, 0.45)' : (isDark ? 'rgba(255,255,255,0.09)' : unitTheme.border)
                    }}>
                    {/* Top Decorative Color Accent (Unique per unit) */}
                    <div className="ssp-card-accent" style={{ background: unitTheme.gradient }} />

                    {/* Unit Card Header */}
                    <div className="ssp-unit-card-header" onClick={() => toggleUnit(u.id)}>
                      <div className="ssp-card-header-top">
                        <div className="ssp-unit-badge-pill" style={{ background: unitTheme.gradient }}>
                          {det.badgeText}
                        </div>
                        <div className="ssp-unit-meta-chips">
                          <span className="ssp-chip-topic-count">
                            {totalTopicsCount} Konu
                          </span>
                          {unitHasSummary && (
                            <span className="ssp-chip-summary-ready" style={{ color: unitTheme.color, background: unitTheme.bg }} title="Ünite Özeti Mevcut">
                              ● Özet
                            </span>
                          )}
                          {isUnitCompleted && (
                            <span className="ssp-chip-completed">
                              <Award size={11} /> Tamamlandı
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unit Title */}
                      <h3 className="ssp-unit-title" title={det.cleanTitle || det.fullDisplayName}>
                        {det.cleanTitle || det.fullDisplayName}
                      </h3>

                      {/* Progress Bar & Stats */}
                      <div className="ssp-unit-progress-container">
                        <div className="ssp-progress-info">
                          <span className="ssp-progress-text">
                            {totalTopicsCount > 0 ? `${readTopicsCount} / ${totalTopicsCount} Konu Okundu` : (isUnitRead ? 'Okundu' : 'Okunmadı')}
                          </span>
                          <span className="ssp-progress-percent" style={{ color: unitTheme.color }}>%{progressPct}</span>
                        </div>
                        <div className="ssp-unit-progress-track">
                          <div
                            className="ssp-unit-progress-fill"
                            style={{
                              width: `${progressPct}%`,
                              background: isUnitCompleted ? 'linear-gradient(90deg, #10b981, #059669)' : unitTheme.gradient
                            }}
                          />
                        </div>
                      </div>

                      {/* Card Header Actions */}
                      <div className="ssp-unit-header-actions">
                        <button
                          className={'ssp-unit-summary-cta' + (isUnitRead ? ' is-read' : (unitHasSummary ? ' has-summary' : ''))}
                          style={{
                            background: isUnitRead ? 'rgba(16,185,129,0.12)' : (unitHasSummary ? unitTheme.bg : 'var(--color-surface-hover, #f8fafc)'),
                            color: isUnitRead ? '#059669' : (unitHasSummary ? unitTheme.color : 'var(--color-text-muted, #64748b)'),
                            borderColor: isUnitRead ? 'rgba(16,185,129,0.4)' : (unitHasSummary ? unitTheme.border : 'var(--color-border, #e2e8f0)')
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            setActiveReadingTarget({
                              type: 'unit',
                              id: u.id,
                              name: det.fullDisplayName,
                              unitId: u.id,
                              unitName: det.fullDisplayName
                            });
                          }}>
                          {isUnitRead ? <CheckCircle2 size={13} color="#10b981" /> : <BookMarked size={13} />}
                          <span>{isUnitRead ? 'Ünite Özeti (Okundu)' : 'Ünite Özeti'}</span>
                        </button>

                        <div className="ssp-expand-icon-box" title={isOpen ? 'Daralt' : 'Genişlet'}>
                          <span className="ssp-expand-hint">{isOpen ? 'Gizle' : 'Konular'}</span>
                          <ChevronDown size={16} className={'ssp-unit-chevron' + (isOpen ? ' open' : '')} />
                        </div>
                      </div>
                    </div>

                    {/* Unit Card Body (Topic list) */}
                    {isOpen && (
                      <div className="ssp-unit-card-body">
                        {filteredTopicsList.length > 0 ? (
                          <div className="ssp-topics-list-container">
                            {filteredTopicsList.map((t, tIdx) => {
                              const topicHasSummary = hasSummary('topic', t.id);
                              const isTopicRead = isSummaryRead('topic', t.id, currentUser && currentUser.id);

                              return (
                                <div
                                  key={t.id}
                                  className={'ssp-topic-item' + (isTopicRead ? ' topic-read' : '')}
                                  onClick={() => setActiveReadingTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id, unitName: det.fullDisplayName })}>
                                  <div className="ssp-topic-item-header">
                                    <div
                                      className="ssp-topic-num-badge"
                                      style={{
                                        background: isTopicRead ? 'rgba(16,185,129,0.14)' : unitTheme.bg,
                                        color: isTopicRead ? '#059669' : unitTheme.color,
                                        borderColor: isTopicRead ? 'rgba(16,185,129,0.4)' : unitTheme.border
                                      }}>
                                      {isTopicRead ? <Check size={12} /> : (tIdx + 1)}
                                    </div>
                                    <div className="ssp-topic-item-title" title={t.name}>
                                      {t.name || `Konu ${tIdx + 1}`}
                                    </div>
                                  </div>

                                  <div className="ssp-topic-item-footer">
                                    <div className="ssp-topic-tags">
                                      {topicHasSummary ? (
                                        <span className="ssp-mini-badge ready" style={{ background: unitTheme.bg, color: unitTheme.color }}>
                                          ● Özet Hazır
                                        </span>
                                      ) : (
                                        <span className="ssp-mini-badge pending">
                                          Notlar
                                        </span>
                                      )}
                                      {isTopicRead && (
                                        <span className="ssp-mini-badge read">
                                          <CheckCircle2 size={10} /> Okundu
                                        </span>
                                      )}
                                    </div>

                                    <div className="ssp-topic-buttons">
                                      <button
                                        className={'ssp-topic-read-btn' + (isTopicRead ? ' read' : '')}
                                        title={isTopicRead ? 'Okundu olarak işaretlendi' : 'Okudum olarak işaretle'}
                                        onClick={e => {
                                          e.stopPropagation();
                                          toggleSummaryRead('topic', t.id, currentUser && currentUser.id);
                                        }}>
                                        <CheckCircle2 size={12} />
                                        <span>{isTopicRead ? 'Okundu' : 'Okudum'}</span>
                                      </button>
                                      <button
                                        className={'ssp-topic-open-btn' + (topicHasSummary ? ' has-summary' : '')}
                                        style={topicHasSummary ? { background: unitTheme.gradient } : {}}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setActiveReadingTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id, unitName: det.fullDisplayName });
                                        }}>
                                        {topicHasSummary ? <BookOpen size={12} /> : <FileText size={12} />}
                                        <span>{topicHasSummary ? 'Özet' : 'İncele'}</span>
                                        <ChevronRight size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="ssp-empty-unit">
                            {unitTopics.length === 0 ? 'Bu ünitede kayıtlı konu bulunmuyor.' : 'Filtreye uygun konu bulunamadı.'}
                          </div>
                        )}

                        {isUnitCompleted && totalTopicsCount > 0 && (
                          <div className="ssp-unit-completed-banner">
                            <Sparkles size={14} color="#10b981" />
                            <span>Tebrikler! Bu ünitedeki tüm konuları tamamladın. 🎉</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="ssp-empty-catalog">
                <BookOpen size={48} color="var(--color-text-muted, #94a3b8)" />
                <h3>Bu Derse Ait Ünite Bulunamadı</h3>
                <p>Seçtiğiniz sınıf veya derse ait müfredat bilgisi henüz sisteme girilmemiş.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
