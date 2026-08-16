import React, { useState, useEffect, useMemo } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useSummaries } from '../context/SummaryContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SummaryHtmlViewer from '../components/summary/SummaryHtmlViewer';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, ChevronDown, 
  Sparkles, Layers, Printer, Maximize2, Minimize2, ZoomIn, ZoomOut,
  FolderOpen, FileText, CheckCircle2, Bookmark, Share2, Menu, X, ArrowLeft,
  GraduationCap, PlayCircle, HelpCircle, ArrowRight, BookMarked, Compass, ListFilter
} from 'lucide-react';
import './StudentSummaryPage.css';

// Helper to determine subject icon and vibrant color theme
const getSubjectTheme = (subjectName = '') => {
  const s = subjectName.toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) {
    return { icon: '📐', color: '#38bdf8', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)', lightBg: 'rgba(14, 165, 233, 0.16)', border: 'rgba(56, 189, 248, 0.4)', shadow: 'rgba(14, 165, 233, 0.35)', badge: 'Matematik' };
  }
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) {
    return { icon: '🔬', color: '#34d399', gradient: 'linear-gradient(135deg, #059669, #10b981)', lightBg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(52, 211, 153, 0.4)', shadow: 'rgba(16, 185, 129, 0.35)', badge: 'Fen Bilimleri' };
  }
  if (s.includes('türkçe') || s.includes('edebiyat') || s.includes('dil')) {
    return { icon: '📖', color: '#fb7185', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', lightBg: 'rgba(244, 63, 94, 0.16)', border: 'rgba(251, 113, 133, 0.4)', shadow: 'rgba(244, 63, 94, 0.35)', badge: 'Türkçe' };
  }
  if (s.includes('inkılap') || s.includes('tarih') || s.includes('sosyal') || s.includes('coğrafya')) {
    return { icon: '🏛️', color: '#fb923c', gradient: 'linear-gradient(135deg, #ea580c, #f97316)', lightBg: 'rgba(234, 88, 12, 0.16)', border: 'rgba(251, 146, 60, 0.4)', shadow: 'rgba(234, 88, 12, 0.35)', badge: 'Sosyal / Tarih' };
  }
  if (s.includes('ingilizce') || s.includes('yabancı') || s.includes('almanca')) {
    return { icon: '🌍', color: '#818cf8', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', lightBg: 'rgba(99, 102, 241, 0.16)', border: 'rgba(129, 140, 248, 0.4)', shadow: 'rgba(99, 102, 241, 0.35)', badge: 'İngilizce' };
  }
  if (s.includes('din') || s.includes('ahlak')) {
    return { icon: '🕌', color: '#2dd4bf', gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)', lightBg: 'rgba(13, 148, 136, 0.16)', border: 'rgba(45, 212, 191, 0.4)', shadow: 'rgba(13, 148, 136, 0.35)', badge: 'Din Kültürü' };
  }
  return { icon: '📚', color: '#c084fc', gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', lightBg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(192, 132, 252, 0.4)', shadow: 'rgba(168, 85, 247, 0.35)', badge: 'Ders' };
};

// Natural alphanumeric / unit number extractor and sorter
const extractUnitOrderNumber = (unit, fallbackIndex = 999) => {
  if (!unit) return fallbackIndex;
  if (typeof unit.order === 'number') return unit.order;
  if (typeof unit.sortOrder === 'number') return unit.sortOrder;
  if (typeof unit.unitNumber === 'number') return unit.unitNumber;

  const raw = String(unit.name || '').trim();
  // Match "1. Ünite", "Ünite 1", "1 - ...", or leading numbers
  const match = raw.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return fallbackIndex;
};

const sortUnitsNaturally = (unitList = []) => {
  return [...unitList].sort((a, b) => {
    const numA = extractUnitOrderNumber(a, 999);
    const numB = extractUnitOrderNumber(b, 999);
    if (numA !== numB) {
      return numA - numB;
    }
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true, sensitivity: 'base' });
  });
};

const sortTopicsNaturally = (topicList = []) => {
  return [...topicList].sort((a, b) => {
    if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
    const numA = (String(a.name || '').match(/(\d+)/) || [])[1];
    const numB = (String(b.name || '').match(/(\d+)/) || [])[1];
    if (numA && numB && parseInt(numA, 10) !== parseInt(numB, 10)) {
      return parseInt(numA, 10) - parseInt(numB, 10);
    }
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true, sensitivity: 'base' });
  });
};

// Format clean unit details and titles
const getUnitDetails = (unit, index) => {
  const unitNum = extractUnitOrderNumber(unit, index + 1);
  const raw = String(unit?.name || '').trim();

  // If raw is just "1", "1. Ünite", "Ünite 1", "1 - Ünite", etc.
  const isGeneric = !raw || 
    /^\d+$/.test(raw) || 
    /^(\d+)\.\s*ünite$/i.test(raw) || 
    /^ünite\s*(\d+)$/i.test(raw) || 
    /^ünite\s*-\s*(\d+)$/i.test(raw);

  let cleanTitle = '';
  if (!isGeneric) {
    cleanTitle = raw
      .replace(/^(\d+\.\s*ünite|\d+\s*-\s*ünite|ünite\s*\d+)[:\s\-]*/i, '')
      .replace(/^(\d+)[\.\-]\s*/, '')
      .trim();
  }

  const fullDisplayName = cleanTitle 
    ? `${unitNum}. Ünite: ${cleanTitle}` 
    : `${unitNum}. Ünite`;

  return {
    unitNum,
    cleanTitle,
    fullDisplayName,
    badgeText: `${unitNum}. ÜNİTE`
  };
};

export default function StudentSummaryPage() {
  const navigate = useNavigate();
  const { data: curriculumData } = useCurriculum();
  const { summaries, getSummary, hasSummary } = useSummaries();
  const { currentUser } = useAuth();

  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [activeReadingTarget, setActiveReadingTarget] = useState(null); // null = Catalog view, object = Full-screen Reader view

  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const grades = curriculumData.grades || [];
  const subjects = curriculumData.subjects || [];
  const units = curriculumData.units || [];
  const topics = curriculumData.topics || [];

  // Set initial grade matching student's grade if available
  useEffect(() => {
    if (currentUser?.gradeId && grades.some(g => String(g.id) === String(currentUser.gradeId))) {
      setSelectedGradeId(currentUser.gradeId);
    } else if (!selectedGradeId && grades.length > 0) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, currentUser, selectedGradeId]);

  // Filter subjects by selected grade
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => String(s.gradeId) === String(selectedGradeId));
  }, [subjects, selectedGradeId]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubjectId || !filteredSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    } else {
      setSelectedSubjectId(null);
    }
  }, [filteredSubjects, selectedSubjectId]);

  // Filter and naturally sort units by selected subject (1. Ünite, 2. Ünite, 3. Ünite...)
  const filteredUnits = useMemo(() => {
    const list = units.filter(u => String(u.subjectId) === String(selectedSubjectId));
    return sortUnitsNaturally(list);
  }, [units, selectedSubjectId]);

  // Linear list of all reading items for next / previous navigation in natural order
  const readingItemList = useMemo(() => {
    const list = [];
    filteredUnits.forEach((u, uIdx) => {
      const { fullDisplayName } = getUnitDetails(u, uIdx);
      list.push({
        type: 'unit',
        id: u.id,
        name: fullDisplayName,
        unitId: u.id,
        unitName: fullDisplayName,
        label: `${fullDisplayName} (Genel Özet)`
      });
      const unitTopics = sortTopicsNaturally(topics.filter(t => String(t.unitId) === String(u.id)));
      unitTopics.forEach(t => {
        list.push({
          type: 'topic',
          id: t.id,
          name: t.name,
          unitId: u.id,
          unitName: fullDisplayName,
          label: t.name
        });
      });
    });
    return list;
  }, [filteredUnits, topics]);

  // Active summary object
  const currentSummary = useMemo(() => {
    if (!activeReadingTarget) return null;
    return getSummary(activeReadingTarget.type, activeReadingTarget.id);
  }, [activeReadingTarget, summaries]);

  // Navigation indices
  const currentIdx = readingItemList.findIndex(item => String(item.id) === String(activeReadingTarget?.id));
  const prevItem = currentIdx > 0 ? readingItemList[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < readingItemList.length - 1 ? readingItemList[currentIdx + 1] : null;

  // Selected labels
  const currentGrade = grades.find(g => String(g.id) === String(selectedGradeId));
  const currentSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const currentUnit = units.find(u => String(u.id) === String(activeReadingTarget?.unitId || activeReadingTarget?.id));

  const activeTheme = getSubjectTheme(currentSubject?.name);

  const handlePrint = () => {
    window.print();
  };

  // Scroll to top when reading target changes
  useEffect(() => {
    if (activeReadingTarget) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeReadingTarget?.id]);

  return (
    <div className={`edu-portal-root ${activeReadingTarget ? 'reading-active' : ''}`}>
      
      {/* ════════════════════════════════════════════════════════════════
          VIEW 1: FULLSCREEN EDGE-TO-EDGE READER (Sağa Sola Yasla)
         ════════════════════════════════════════════════════════════════ */}
      {activeReadingTarget ? (
        <div className="edu-reader-view-fullscreen">
          
          {/* STICKY TOP READING APP BAR */}
          <header className="edu-reader-topbar no-print">
            <div className="edu-topbar-inner">
              
              {/* Back to Catalog Button */}
              <button 
                className="edu-back-to-catalog-btn"
                onClick={() => setActiveReadingTarget(null)}
              >
                <ArrowLeft size={16} />
                <span>Konu Listesi</span>
              </button>

              {/* Breadcrumbs */}
              <div className="edu-topbar-breadcrumbs">
                <span>{currentGrade?.name}</span>
                <ChevronRight size={12} className="crumb-sep" />
                <span style={{ color: activeTheme.color, fontWeight: 800 }}>{currentSubject?.name}</span>
                <ChevronRight size={12} className="crumb-sep" />
                <span>{activeReadingTarget.unitName || currentUnit?.name}</span>
                {activeReadingTarget.type === 'topic' && (
                  <>
                    <ChevronRight size={12} className="crumb-sep" />
                    <strong className="crumb-active-title">{activeReadingTarget.name}</strong>
                  </>
                )}
              </div>

              {/* Action Controls */}
              <div className="edu-topbar-controls">
                
                {/* Topic Drawer Trigger */}
                <button 
                  className="edu-drawer-toggle-btn"
                  onClick={() => setIsDrawerOpen(true)}
                  title="Diğer Konuları Görüntüle"
                >
                  <ListFilter size={15} />
                  <span>Konular</span>
                </button>

                {/* Font Size Adjuster */}
                <div className="edu-font-adjust-box">
                  <button 
                    onClick={() => setFontSize(prev => Math.max(13, prev - 1))}
                    title="Yazı Boyutunu Küçült"
                    className="edu-ctrl-btn"
                  >
                    <ZoomOut size={13} /> A-
                  </button>
                  <span className="edu-font-val">{fontSize}px</span>
                  <button 
                    onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                    title="Yazı Boyutunu Büyüt"
                    className="edu-ctrl-btn"
                  >
                    <ZoomIn size={13} /> A+
                  </button>
                </div>

                {/* Print Button */}
                <button onClick={handlePrint} className="edu-ctrl-btn" title="Yazdır / PDF Kaydet">
                  <Printer size={14} />
                  <span>Yazdır</span>
                </button>
              </div>

            </div>
          </header>

          {/* MAIN EDGE-TO-EDGE ARTICLE CONTAINER */}
          <main className="edu-fullscreen-article-wrap">
            <article className="edu-reader-card-full">
              
              {/* Article Hero Header */}
              <div className="edu-article-header">
                <div className="edu-header-meta">
                  <span 
                    className="edu-meta-badge"
                    style={{ background: activeTheme.lightBg, color: activeTheme.color, borderColor: activeTheme.border }}
                  >
                    {activeReadingTarget.type === 'unit' ? '📁 ÜNİTE GENEL ÖZETİ' : '📄 KONU ANLATIMI & ÖZET'}
                  </span>
                  {currentSummary?.updatedAt && (
                    <span className="edu-updated-date">
                      Güncelleme: {new Date(currentSummary.updatedAt).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
                <h1 className="edu-article-title">{activeReadingTarget.name}</h1>
              </div>

              {/* IFRAME HTML VIEWER (Edge to edge) */}
              <div className="edu-iframe-container">
                <SummaryHtmlViewer
                  htmlContent={currentSummary?.contentHtml || ''}
                  fontSize={fontSize}
                  title={activeReadingTarget.name}
                  targetType={activeReadingTarget.type}
                  emptyMessage="Bu konu için henüz özet veya ders notu eklenmemiş. Çok yakında öğretmeniniz tarafından eklenecektir."
                />
              </div>

              {/* PRACTICE CTA CARD */}
              <div className="edu-practice-cta-card no-print">
                <div className="edu-cta-left">
                  <div className="edu-cta-icon">{activeTheme.icon}</div>
                  <div>
                    <h4>Konuyu Pekiştir & Test Çöz</h4>
                    <p>Özeti tamamladın mı? Soru bankasından ve denemelerden ilgili soruları çözerek konuyu pekiştir.</p>
                  </div>
                </div>
                <button 
                  className="edu-cta-btn"
                  onClick={() => navigate('/student/exams')}
                >
                  <span>Testlere Git</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* ARTICLE FOOTER NAVIGATION (PREV / NEXT) */}
              <div className="edu-article-pagination no-print">
                {prevItem ? (
                  <button 
                    className="edu-page-nav-btn prev"
                    onClick={() => setActiveReadingTarget(prevItem)}
                  >
                    <ChevronLeft size={18} />
                    <div className="edu-page-nav-text">
                      <span className="edu-nav-sub">Önceki Konu</span>
                      <strong>{prevItem.name}</strong>
                    </div>
                  </button>
                ) : <div />}

                {nextItem ? (
                  <button 
                    className="edu-page-nav-btn next"
                    onClick={() => setActiveReadingTarget(nextItem)}
                  >
                    <div className="edu-page-nav-text text-right">
                      <span className="edu-nav-sub">Sonraki Konu</span>
                      <strong>{nextItem.name}</strong>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                ) : <div />}
              </div>

            </article>
          </main>

          {/* SLIDE-OVER TOPIC DRAWER (Off-canvas) */}
          {isDrawerOpen && (
            <div className="edu-drawer-backdrop no-print" onClick={() => setIsDrawerOpen(false)}>
              <div className="edu-drawer-panel" onClick={e => e.stopPropagation()}>
                <div className="edu-drawer-header">
                  <div className="edu-drawer-title">
                    <FolderOpen size={17} color="#2563eb" />
                    <span>Konu Listesi</span>
                  </div>
                  <button className="edu-drawer-close" onClick={() => setIsDrawerOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="edu-drawer-scroll custom-scrollbar">
                  {filteredUnits.map((u, uIdx) => {
                    const { unitNum, fullDisplayName, badgeText } = getUnitDetails(u, uIdx);
                    const isUnitActive = activeReadingTarget?.type === 'unit' && String(activeReadingTarget?.id) === String(u.id);
                    const unitHasSummary = hasSummary('unit', u.id);
                    const unitTopics = sortTopicsNaturally(topics.filter(t => String(t.unitId) === String(u.id)));

                    return (
                      <div key={u.id} className="edu-drawer-unit-box">
                        <div 
                          className={`edu-drawer-unit-item ${isUnitActive ? 'active' : ''}`}
                          onClick={() => {
                            setActiveReadingTarget({ type: 'unit', id: u.id, name: fullDisplayName, unitId: u.id, unitName: fullDisplayName });
                            setIsDrawerOpen(false);
                          }}
                        >
                          <span className="edu-unit-num">{unitNum}</span>
                          <strong>{fullDisplayName} (Genel Özet)</strong>
                          {unitHasSummary && <span className="edu-dot-badge">●</span>}
                        </div>

                        <div className="edu-drawer-topic-list">
                          {unitTopics.map(t => {
                            const isTopicActive = activeReadingTarget?.type === 'topic' && String(activeReadingTarget?.id) === String(t.id);
                            const topicHasSummary = hasSummary('topic', t.id);

                            return (
                              <div
                                key={t.id}
                                className={`edu-drawer-topic-item ${isTopicActive ? 'active' : ''}`}
                                onClick={() => {
                                  setActiveReadingTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id, unitName: fullDisplayName });
                                  setIsDrawerOpen(false);
                                }}
                              >
                                <span className="edu-topic-bullet" />
                                <span>{t.name}</span>
                                {topicHasSummary && <span className="edu-dot-badge">●</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (

        /* ════════════════════════════════════════════════════════════════
            VIEW 2: VIBRANT COLORFUL CATALOG VIEW
           ════════════════════════════════════════════════════════════════ */
        <div className="edu-catalog-view">
          
          {/* HERO HEADER */}
          <header className="edu-hero-header" style={{ borderTop: `4px solid ${activeTheme.color}` }}>
            <div className="edu-hero-container">
              
              <div className="edu-hero-top-row">
                <div className="edu-brand-badge">
                  <span className="edu-pulse-dot" />
                  <span>Ders Notları & Konu Anlatımları</span>
                </div>
                <div className="edu-grade-selector">
                  <span className="edu-selector-title">Sınıf:</span>
                  <div className="edu-grade-pills">
                    {grades.map(g => (
                      <button
                        key={g.id}
                        className={`edu-grade-pill ${String(selectedGradeId) === String(g.id) ? 'active' : ''}`}
                        onClick={() => setSelectedGradeId(g.id)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="edu-hero-main-banner">
                <div className="edu-banner-text">
                  <h1>{currentGrade?.name || 'Tüm Sınıflar'} Ders Özetleri & Konu Rehberi 📚</h1>
                  <p>Müfredata tam uyumlu ünite özetleri ve sınav notları parmaklarının ucunda.</p>
                </div>
              </div>

              {/* SUBJECT SELECTOR HORIZONTAL TABS */}
              <div className="edu-subjects-scroll-wrap">
                <div className="edu-subjects-scroll-row">
                  {filteredSubjects.map(s => {
                    const theme = getSubjectTheme(s.name);
                    const isSelected = String(selectedSubjectId) === String(s.id);
                    
                    // Count available summaries
                    const subjectUnits = units.filter(u => String(u.subjectId) === String(s.id));
                    let summaryCount = 0;
                    subjectUnits.forEach(u => {
                      if (hasSummary('unit', u.id)) summaryCount++;
                      const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));
                      unitTopics.forEach(t => {
                        if (hasSummary('topic', t.id)) summaryCount++;
                      });
                    });

                    return (
                      <button
                        key={s.id}
                        className={`edu-subject-card-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSubjectId(s.id)}
                        style={{
                          '--sub-color': theme.color,
                          '--sub-bg': theme.lightBg,
                          '--sub-border': theme.border,
                          '--sub-gradient': theme.gradient
                        }}
                      >
                        <span className="edu-subject-icon">{theme.icon}</span>
                        <div className="edu-subject-info">
                          <strong className="edu-subject-name">{s.name}</strong>
                          <span className="edu-subject-count">{summaryCount > 0 ? `${summaryCount} Özet Hazır` : 'Müfredat'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </header>

          {/* SEARCH & FILTER BAR */}
          <div className="edu-catalog-toolbar">
            <div className="edu-catalog-search">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder={`${currentSubject?.name || 'Ders'} içinde konu veya ünite ara...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* VIBRANT & COLORFUL UNIT LIST */}
          <div className="edu-units-catalog-grid">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((u, uIdx) => {
                const { unitNum, cleanTitle, fullDisplayName, badgeText } = getUnitDetails(u, uIdx);
                const unitHasSummary = hasSummary('unit', u.id);
                const unitTopics = sortTopicsNaturally(topics.filter(t => String(t.unitId) === String(u.id)));

                const filteredTopicsList = searchQuery
                  ? unitTopics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || fullDisplayName.toLowerCase().includes(searchQuery.toLowerCase()))
                  : unitTopics;

                if (searchQuery && !fullDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) && filteredTopicsList.length === 0) {
                  return null;
                }

                return (
                  <div key={u.id} className="edu-unit-vibrant-card">
                    
                    {/* Colorful Unit Header Bar */}
                    <div 
                      className="edu-unit-vibrant-bar"
                      style={{
                        background: activeTheme.lightBg,
                        borderLeftColor: activeTheme.color
                      }}
                    >
                      <div className="edu-unit-vibrant-left">
                        <span 
                          className="edu-unit-tag-badge"
                          style={{
                            background: activeTheme.gradient,
                            color: '#ffffff'
                          }}
                        >
                          {badgeText}
                        </span>
                        {cleanTitle ? (
                          <h3 className="edu-unit-vibrant-title">{cleanTitle}</h3>
                        ) : null}
                      </div>

                      {/* General Unit Summary Button */}
                      <button
                        className={`edu-unit-summary-action-btn ${unitHasSummary ? 'has-summary' : ''}`}
                        onClick={() => setActiveReadingTarget({ type: 'unit', id: u.id, name: fullDisplayName, unitId: u.id, unitName: fullDisplayName })}
                        style={{
                          '--action-color': activeTheme.color,
                          '--action-bg': activeTheme.lightBg,
                          background: unitHasSummary ? activeTheme.gradient : 'rgba(255,255,255,0.1)'
                        }}
                      >
                        <BookMarked size={14} />
                        <span>{unitHasSummary ? 'Ünite Özeti Oku' : 'Ünite Özeti'}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Colorful Topics Grid */}
                    <div className="edu-unit-topics-container">
                      {filteredTopicsList.length > 0 ? (
                        <div className="edu-vibrant-topics-grid">
                          {filteredTopicsList.map((t, tIdx) => {
                            const topicHasSummary = hasSummary('topic', t.id);
                            const topicTitle = t.name || `Konu ${tIdx + 1}`;

                            return (
                              <div
                                key={t.id}
                                className={`edu-topic-vibrant-chip ${topicHasSummary ? 'has-content' : ''}`}
                                onClick={() => setActiveReadingTarget({ type: 'topic', id: t.id, name: topicTitle, unitId: u.id, unitName: fullDisplayName })}
                              >
                                <div className="edu-topic-chip-left">
                                  <span className="edu-topic-pill-num">{tIdx + 1}</span>
                                  <span className="edu-topic-pill-title">{topicTitle}</span>
                                </div>

                                <div className="edu-topic-chip-right">
                                  {topicHasSummary ? (
                                    <span className="edu-badge-ready">
                                      <span>Özet Oku</span>
                                      <ChevronRight size={12} />
                                    </span>
                                  ) : (
                                    <span className="edu-badge-plain">
                                      <span>İncele</span>
                                      <ChevronRight size={12} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="edu-no-topics-hint">Bu ünitede kayıtlı konu bulunmuyor.</div>
                      )}
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="edu-empty-catalog">
                <BookOpen size={40} color="#94a3b8" />
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
