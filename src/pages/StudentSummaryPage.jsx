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
  GraduationCap, PlayCircle, HelpCircle, ArrowRight
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
  const [selectedTarget, setSelectedTarget] = useState(null); // { type: 'unit' | 'topic', id: string, name: string, unitId?: string }

  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const grades = curriculumData.grades || [];
  const subjects = curriculumData.subjects || [];
  const units = curriculumData.units || [];
  const topics = curriculumData.topics || [];

  // 1. Set initial grade matching student's grade if available
  useEffect(() => {
    if (currentUser?.gradeId && grades.some(g => String(g.id) === String(currentUser.gradeId))) {
      setSelectedGradeId(currentUser.gradeId);
    } else if (!selectedGradeId && grades.length > 0) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, currentUser, selectedGradeId]);

  // 2. Filter subjects by selected grade
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

  // 3. Filter units by selected subject
  const filteredUnits = useMemo(() => {
    return units.filter(u => String(u.subjectId) === String(selectedSubjectId));
  }, [units, selectedSubjectId]);

  // 4. Build linear reading item list for next/previous navigation
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

  // 5. Auto-select first available topic or unit
  useEffect(() => {
    if (!selectedTarget && readingItemList.length > 0) {
      const firstWithSummary = readingItemList.find(item => hasSummary(item.type, item.id));
      setSelectedTarget(firstWithSummary || readingItemList[0]);
    } else if (selectedTarget && !readingItemList.some(item => String(item.id) === String(selectedTarget.id))) {
      setSelectedTarget(readingItemList[0] || null);
    }
  }, [readingItemList, selectedTarget]);

  // 6. Active summary object
  const currentSummary = useMemo(() => {
    if (!selectedTarget) return null;
    return getSummary(selectedTarget.type, selectedTarget.id);
  }, [selectedTarget, summaries]);

  // 7. Navigation indices
  const currentIdx = readingItemList.findIndex(item => String(item.id) === String(selectedTarget?.id));
  const prevItem = currentIdx > 0 ? readingItemList[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < readingItemList.length - 1 ? readingItemList[currentIdx + 1] : null;

  // 8. Selected labels
  const currentGrade = grades.find(g => String(g.id) === String(selectedGradeId));
  const currentSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const currentUnit = units.find(u => String(u.id) === String(selectedTarget?.unitId || selectedTarget?.id));

  const activeTheme = getSubjectTheme(currentSubject?.name);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`edu-portal-root ${isFocusMode ? 'edu-focus-mode' : ''}`}>
      
      {/* ════════════ TOP HERO & PORTAL HEADER ════════════ */}
      <header className="edu-hero-header no-print">
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
                    onClick={() => { setSelectedGradeId(g.id); setSelectedTarget(null); }}
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
              <p>Müfredata tam uyumlu ünite özetleri, formüller, önemli kavramlar ve sınav ipuçları parmaklarının ucunda.</p>
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
                    onClick={() => { setSelectedSubjectId(s.id); setSelectedTarget(null); }}
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

      {/* ════════════ MOBILE TOC TRIGGER BAR ════════════ */}
      <div className="edu-mobile-toc-bar no-print">
        <button 
          className="edu-mobile-toc-btn"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        >
          <Menu size={18} />
          <span className="edu-toc-current-label">
            {selectedTarget ? `${selectedTarget.name}` : 'İçindekiler / Konu Seç'}
          </span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* ════════════ MAIN PORTAL WORKSPACE ════════════ */}
      <div className="edu-workspace-layout">
        
        {/* ──── LEFT SIDEBAR: STUDY TREE & TOC ──── */}
        <aside className={`edu-toc-sidebar ${isMobileDrawerOpen ? 'drawer-active' : ''} no-print`}>
          <div className="edu-toc-header">
            <div className="edu-toc-title">
              <FolderOpen size={18} color="#4f46e5" />
              <span>Konu ve Ünite Ağacı</span>
            </div>
            {isMobileDrawerOpen && (
              <button className="edu-toc-close" onClick={() => setIsMobileDrawerOpen(false)}>
                <X size={20} />
              </button>
            )}
          </div>

          <div className="edu-toc-search">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Konu veya ünite ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="edu-toc-scroll custom-scrollbar">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((u, uIdx) => {
                const isUnitActive = selectedTarget?.type === 'unit' && String(selectedTarget?.id) === String(u.id);
                const unitHasSummary = hasSummary('unit', u.id);
                const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));

                const filteredTopicsList = searchQuery
                  ? unitTopics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  : unitTopics;

                if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && filteredTopicsList.length === 0) {
                  return null;
                }

                return (
                  <div key={u.id} className="edu-unit-group">
                    
                    {/* Unit Row */}
                    <div 
                      className={`edu-unit-node ${isUnitActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTarget({ type: 'unit', id: u.id, name: u.name, unitId: u.id });
                        setIsMobileDrawerOpen(false);
                      }}
                    >
                      <div className="edu-unit-title-box">
                        <span className="edu-unit-num">{uIdx + 1}</span>
                        <div className="edu-unit-text">
                          <strong>{u.name}</strong>
                          <span className="edu-unit-sub">Ünite Genel Özeti</span>
                        </div>
                      </div>
                      {unitHasSummary ? (
                        <span className="edu-status-pill filled">✓ Özet</span>
                      ) : (
                        <span className="edu-status-pill empty">Taslak</span>
                      )}
                    </div>

                    {/* Topics Sub-list */}
                    <div className="edu-topics-tree">
                      {filteredTopicsList.map((t) => {
                        const isTopicActive = selectedTarget?.type === 'topic' && String(selectedTarget?.id) === String(t.id);
                        const topicHasSummary = hasSummary('topic', t.id);

                        return (
                          <div
                            key={t.id}
                            className={`edu-topic-node ${isTopicActive ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id });
                              setIsMobileDrawerOpen(false);
                            }}
                          >
                            <div className="edu-topic-title-box">
                              <span className="edu-topic-line-bullet" />
                              <span className="edu-topic-name">{t.name}</span>
                            </div>
                            {topicHasSummary && (
                              <span className="edu-topic-check" title="Özet Mevcut">●</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="edu-empty-units-card">
                <BookOpen size={32} color="#94a3b8" />
                <p>Bu derse ait ünite kaydı bulunamadı.</p>
              </div>
            )}
          </div>
        </aside>

        {/* ──── CENTER READING DESK ──── */}
        <main className="edu-reading-desk">
          
          {/* ARTICLE TOP TOOLBAR */}
          <div className="edu-article-toolbar no-print">
            
            {/* Breadcrumb Path */}
            <div className="edu-breadcrumb">
              <span className="edu-crumb-item">{currentGrade?.name || 'Sınıf'}</span>
              <ChevronRight size={13} className="edu-crumb-arrow" />
              <span className="edu-crumb-item" style={{ color: activeTheme.color, fontWeight: 700 }}>
                {currentSubject?.name || 'Ders'}
              </span>
              <ChevronRight size={13} className="edu-crumb-arrow" />
              <span className="edu-crumb-item">{currentUnit?.name || 'Ünite'}</span>
              {selectedTarget?.type === 'topic' && (
                <>
                  <ChevronRight size={13} className="edu-crumb-arrow" />
                  <span className="edu-crumb-current">{selectedTarget.name}</span>
                </>
              )}
            </div>

            {/* Controls (Font Size, Print, Fullscreen) */}
            <div className="edu-reader-actions">
              <div className="edu-font-control-group">
                <button 
                  onClick={() => setFontSize(prev => Math.max(14, prev - 1))}
                  title="Yazı Boyutunu Küçült"
                  className="edu-action-btn"
                >
                  <ZoomOut size={14} /> A-
                </button>
                <span className="edu-font-display">{fontSize}px</span>
                <button 
                  onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                  title="Yazı Boyutunu Büyüt"
                  className="edu-action-btn"
                >
                  <ZoomIn size={14} /> A+
                </button>
              </div>

              <button onClick={handlePrint} className="edu-action-btn" title="Yazdır / PDF Kaydet">
                <Printer size={15} />
                <span>Yazdır</span>
              </button>

              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`edu-action-btn ${isFocusMode ? 'focus-active' : ''}`}
                title={isFocusMode ? 'Odak Modundan Çık' : 'Odak Modu (Tam Ekran)'}
              >
                {isFocusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                <span>{isFocusMode ? 'Çık' : 'Odak'}</span>
              </button>
            </div>

          </div>

          {/* ARTICLE CONTENT CARD (PURE WHITE EDUCATION PAPER) */}
          <article className="edu-article-card">
            
            {selectedTarget ? (
              <>
                {/* Article Header */}
                <div className="edu-article-header">
                  <div className="edu-header-meta">
                    <span 
                      className="edu-meta-badge"
                      style={{ background: activeTheme.lightBg, color: activeTheme.color, borderColor: activeTheme.border }}
                    >
                      {selectedTarget.type === 'unit' ? '📁 ÜNİTE GENEL ÖZETİ' : '📄 KONU ANLATIMI & ÖZET'}
                    </span>
                    {currentSummary?.updatedAt && (
                      <span className="edu-updated-date">
                        Güncellenme: {new Date(currentSummary.updatedAt).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                  <h1 className="edu-article-title">{selectedTarget.name}</h1>
                </div>

                {/* HTML VIEWER */}
                <div className="edu-article-html-body">
                  <SummaryHtmlViewer
                    htmlContent={currentSummary?.contentHtml || ''}
                    fontSize={fontSize}
                    title={selectedTarget.name}
                    targetType={selectedTarget.type}
                    emptyMessage="Bu konu için henüz özet veya ders notu eklenmemiş. Çok yakında öğretmeniniz tarafından eklenecektir."
                  />
                </div>

                {/* BOTTOM ACTION & TEST SHORTCUT */}
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
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* ARTICLE NEXT / PREVIOUS FOOTER */}
                <div className="edu-article-pagination no-print">
                  {prevItem ? (
                    <button 
                      className="edu-page-nav-btn prev"
                      onClick={() => setSelectedTarget(prevItem)}
                    >
                      <ChevronLeft size={20} />
                      <div className="edu-page-nav-text">
                        <span className="edu-nav-sub">Önceki Konu</span>
                        <strong>{prevItem.name}</strong>
                      </div>
                    </button>
                  ) : <div />}

                  {nextItem ? (
                    <button 
                      className="edu-page-nav-btn next"
                      onClick={() => setSelectedTarget(nextItem)}
                    >
                      <div className="edu-page-nav-text text-right">
                        <span className="edu-nav-sub">Sonraki Konu</span>
                        <strong>{nextItem.name}</strong>
                      </div>
                      <ChevronRight size={20} />
                    </button>
                  ) : <div />}
                </div>
              </>
            ) : (
              <div className="edu-empty-reader-state">
                <BookOpen size={56} color="#6366f1" />
                <h2>Okumak İstediğin Konuyu Seç</h2>
                <p>Sol taraftaki ünite ve konu ağacından dilediğin derse tıklayarak zengin konu anlatımlarına ulaşabilirsin.</p>
              </div>
            )}

          </article>

        </main>

      </div>

    </div>
  );
}
