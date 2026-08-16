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

// Helper to determine subject icon and color theme
const getSubjectTheme = (subjectName = '') => {
  const s = subjectName.toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) {
    return { icon: '📐', color: '#4f46e5', lightBg: '#eef2ff', border: '#c7d2fe', badge: 'Matematik' };
  }
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) {
    return { icon: '🔬', color: '#059669', lightBg: '#ecfdf5', border: '#a7f3d0', badge: 'Fen Bilimleri' };
  }
  if (s.includes('türkçe') || s.includes('edebiyat') || s.includes('dil')) {
    return { icon: '📖', color: '#d97706', lightBg: '#fffbeb', border: '#fde68a', badge: 'Türkçe' };
  }
  if (s.includes('inkılap') || s.includes('tarih') || s.includes('sosyal') || s.includes('coğrafya')) {
    return { icon: '🏛️', color: '#e11d48', lightBg: '#fff1f2', border: '#fecdd3', badge: 'Sosyal / Tarih' };
  }
  if (s.includes('ingilizce') || s.includes('yabancı') || s.includes('almanca')) {
    return { icon: '🌍', color: '#0284c7', lightBg: '#f0f9ff', border: '#bae6fd', badge: 'İngilizce' };
  }
  if (s.includes('din') || s.includes('ahlak')) {
    return { icon: '🕌', color: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4', badge: 'Din Kültürü' };
  }
  return { icon: '📚', color: '#6366f1', lightBg: '#eef2ff', border: '#c7d2fe', badge: 'Ders' };
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

  // Filter units by selected subject
  const filteredUnits = useMemo(() => {
    return units.filter(u => String(u.subjectId) === String(selectedSubjectId));
  }, [units, selectedSubjectId]);

  // Linear list of all reading items for next / previous navigation
  const readingItemList = useMemo(() => {
    const list = [];
    filteredUnits.forEach(u => {
      list.push({
        type: 'unit',
        id: u.id,
        name: u.name,
        unitId: u.id,
        unitName: u.name,
        label: `${u.name} (Ünite Genel Özeti)`
      });
      const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));
      unitTopics.forEach(t => {
        list.push({
          type: 'topic',
          id: t.id,
          name: t.name,
          unitId: u.id,
          unitName: u.name,
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
                <span>{currentUnit?.name}</span>
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
                    <FolderOpen size={17} color="#4f46e5" />
                    <span>Konu Listesi</span>
                  </div>
                  <button className="edu-drawer-close" onClick={() => setIsDrawerOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="edu-drawer-scroll custom-scrollbar">
                  {filteredUnits.map((u, uIdx) => {
                    const isUnitActive = activeReadingTarget?.type === 'unit' && String(activeReadingTarget?.id) === String(u.id);
                    const unitHasSummary = hasSummary('unit', u.id);
                    const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));

                    return (
                      <div key={u.id} className="edu-drawer-unit-box">
                        <div 
                          className={`edu-drawer-unit-item ${isUnitActive ? 'active' : ''}`}
                          onClick={() => {
                            setActiveReadingTarget({ type: 'unit', id: u.id, name: u.name, unitId: u.id });
                            setIsDrawerOpen(false);
                          }}
                        >
                          <span className="edu-unit-num">{uIdx + 1}</span>
                          <strong>{u.name} (Genel Özet)</strong>
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
                                  setActiveReadingTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id });
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
            VIEW 2: CATALOG VIEW (Çok Küçük & Kompakt Ünite Kartları)
           ════════════════════════════════════════════════════════════════ */
        <div className="edu-catalog-view">
          
          {/* HERO HEADER */}
          <header className="edu-hero-header">
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
                          '--sub-border': theme.border
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

          {/* COMPACT & MINIMAL UNITS & TOPICS LIST */}
          <div className="edu-units-catalog-grid">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((u, uIdx) => {
                const unitHasSummary = hasSummary('unit', u.id);
                const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));

                const filteredTopicsList = searchQuery
                  ? unitTopics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  : unitTopics;

                if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && filteredTopicsList.length === 0) {
                  return null;
                }

                return (
                  <div key={u.id} className="edu-unit-card-compact">
                    
                    {/* Compact Unit Card Header */}
                    <div className="edu-unit-compact-header">
                      <div className="edu-unit-compact-left">
                        <span className="edu-unit-badge-pill" style={{ background: activeTheme.lightBg, color: activeTheme.color, borderColor: activeTheme.border }}>
                          Ü{uIdx + 1}
                        </span>
                        <h3 className="edu-unit-compact-title">{u.name}</h3>
                      </div>

                      {/* General Unit Summary Pill */}
                      <button
                        className={`edu-unit-compact-pill-btn ${unitHasSummary ? 'has-summary' : ''}`}
                        onClick={() => setActiveReadingTarget({ type: 'unit', id: u.id, name: u.name, unitId: u.id })}
                      >
                        <BookMarked size={13} />
                        <span>{unitHasSummary ? 'Ünite Özeti' : 'Özet'}</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* Compact Topics Chips List */}
                    <div className="edu-unit-compact-topics-wrap">
                      <div className="edu-compact-topics-grid">
                        {filteredTopicsList.map((t, tIdx) => {
                          const topicHasSummary = hasSummary('topic', t.id);

                          return (
                            <div
                              key={t.id}
                              className={`edu-topic-compact-chip ${topicHasSummary ? 'has-content' : ''}`}
                              onClick={() => setActiveReadingTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id })}
                            >
                              <span className="edu-topic-dot-bullet" />
                              <span className="edu-topic-compact-name">{t.name}</span>
                              {topicHasSummary ? (
                                <span className="edu-chip-ready-tag">Özet</span>
                              ) : (
                                <ChevronRight size={12} className="edu-chip-arrow" />
                              )}
                            </div>
                          );
                        })}
                      </div>
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
