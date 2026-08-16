import React, { useState, useEffect, useMemo } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useSummaries } from '../context/SummaryContext';
import { useAuth } from '../context/AuthContext';
import SummaryHtmlViewer from '../components/summary/SummaryHtmlViewer';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, ChevronDown, 
  Sparkles, Layers, Printer, Maximize2, Minimize2, ZoomIn, ZoomOut,
  FolderOpen, FileText, CheckCircle2, Bookmark, Share2, Menu, X, ArrowLeft
} from 'lucide-react';
import './StudentSummaryPage.css';

export default function StudentSummaryPage() {
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

  // Match student grade if available
  useEffect(() => {
    if (currentUser?.gradeId && grades.some(g => String(g.id) === String(currentUser.gradeId))) {
      setSelectedGradeId(currentUser.gradeId);
    } else if (!selectedGradeId && grades.length > 0) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, currentUser, selectedGradeId]);

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

  const filteredUnits = useMemo(() => {
    return units.filter(u => String(u.subjectId) === String(selectedSubjectId));
  }, [units, selectedSubjectId]);

  // Build flattened list of all reading items for Next / Prev navigation
  const readingItemList = useMemo(() => {
    const list = [];
    filteredUnits.forEach(u => {
      list.push({
        type: 'unit',
        id: u.id,
        name: u.name,
        unitId: u.id,
        unitName: u.name,
        label: `${u.name} (Genel Özet)`
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

  // Auto-select first item
  useEffect(() => {
    if (!selectedTarget && readingItemList.length > 0) {
      // Find first item with actual summary, or default to first item
      const firstWithSummary = readingItemList.find(item => hasSummary(item.type, item.id));
      setSelectedTarget(firstWithSummary || readingItemList[0]);
    } else if (selectedTarget && !readingItemList.some(item => String(item.id) === String(selectedTarget.id))) {
      setSelectedTarget(readingItemList[0] || null);
    }
  }, [readingItemList, selectedTarget]);

  // Active summary
  const currentSummary = useMemo(() => {
    if (!selectedTarget) return null;
    return getSummary(selectedTarget.type, selectedTarget.id);
  }, [selectedTarget, summaries]);

  // Prev & Next item navigation
  const currentIdx = readingItemList.findIndex(item => String(item.id) === String(selectedTarget?.id));
  const prevItem = currentIdx > 0 ? readingItemList[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < readingItemList.length - 1 ? readingItemList[currentIdx + 1] : null;

  // Selected entities for breadcrumb
  const currentGrade = grades.find(g => String(g.id) === String(selectedGradeId));
  const currentSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const currentUnit = units.find(u => String(u.id) === String(selectedTarget?.unitId || selectedTarget?.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`student-summary-page ${isFocusMode ? 'focus-mode' : ''}`}>
      
      {/* TOP HEADER */}
      <header className="summary-site-header no-print">
        <div className="site-brand-row">
          <div className="site-badge">
            <Sparkles size={16} /> Konu Anlatımı & Ders Özetleri
          </div>
          <h1>Ders Özetleri Kütüphanesi 📚</h1>
          <p>Müfredatındaki tüm ünite ve konuların özetlerine, formüllerine ve önemli notlarına dilediğin an ulaş.</p>
        </div>

        {/* GRADE & SUBJECT PILLS */}
        <div className="site-selectors glass">
          <div className="selector-group">
            <span className="selector-label">Sınıf / Kademe:</span>
            <div className="pill-scroll-row">
              {grades.map(g => (
                <button
                  key={g.id}
                  className={`site-pill-btn ${String(selectedGradeId) === String(g.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedGradeId(g.id); setSelectedTarget(null); }}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="selector-group">
            <span className="selector-label">Ders:</span>
            <div className="pill-scroll-row">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map(s => {
                  const subjectUnits = units.filter(u => String(u.subjectId) === String(s.id));
                  let sumCount = 0;
                  subjectUnits.forEach(u => {
                    if (hasSummary('unit', u.id)) sumCount++;
                    const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));
                    unitTopics.forEach(t => {
                      if (hasSummary('topic', t.id)) sumCount++;
                    });
                  });

                  return (
                    <button
                      key={s.id}
                      className={`site-pill-btn subject-pill ${String(selectedSubjectId) === String(s.id) ? 'active' : ''}`}
                      onClick={() => { setSelectedSubjectId(s.id); setSelectedTarget(null); }}
                    >
                      <BookOpen size={14} />
                      <span>{s.name}</span>
                      {sumCount > 0 && <span className="pill-counter">{sumCount}</span>}
                    </button>
                  );
                })
              ) : (
                <span className="no-data-hint">Ders bulunamadı</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER TOGGLE */}
      <div className="mobile-drawer-bar no-print">
        <button 
          className="drawer-toggle-btn"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        >
          <Menu size={18} />
          <span>{selectedTarget ? selectedTarget.name : 'Ünite & Konu Listesi'}</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + READER */}
      <div className="summary-reader-layout">
        
        {/* LEFT STUDY TREE SIDEBAR */}
        <aside className={`summary-tree-nav glass ${isMobileDrawerOpen ? 'drawer-open' : ''} no-print`}>
          <div className="nav-tree-header">
            <div className="tree-header-title">
              <FolderOpen size={18} color="#818cf8" />
              <span>İçindekiler</span>
            </div>
            {isMobileDrawerOpen && (
              <button className="close-drawer-btn" onClick={() => setIsMobileDrawerOpen(false)}>
                <X size={18} />
              </button>
            )}
          </div>

          <div className="tree-search-wrap">
            <Search size={15} />
            <input 
              type="text"
              placeholder="Konu veya ünite ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tree-scroll-container custom-scrollbar">
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
                  <div key={u.id} className="tree-unit-group">
                    
                    {/* Unit Item */}
                    <div 
                      className={`tree-unit-row ${isUnitActive ? 'active-reading' : ''}`}
                      onClick={() => {
                        setSelectedTarget({ type: 'unit', id: u.id, name: u.name, unitId: u.id });
                        setIsMobileDrawerOpen(false);
                      }}
                    >
                      <div className="unit-label-wrap">
                        <span className="unit-idx-badge">{uIdx + 1}</span>
                        <div className="unit-name-col">
                          <strong>{u.name}</strong>
                          <span className="unit-type-sub">Ünite Özeti</span>
                        </div>
                      </div>
                      {unitHasSummary ? (
                        <span className="dot-badge filled" title="Özet Mevcut">●</span>
                      ) : (
                        <span className="dot-badge empty" title="Henüz özet yok">○</span>
                      )}
                    </div>

                    {/* Topics Sub-items */}
                    <div className="tree-topics-sublist">
                      {filteredTopicsList.map((t) => {
                        const isTopicActive = selectedTarget?.type === 'topic' && String(selectedTarget?.id) === String(t.id);
                        const topicHasSummary = hasSummary('topic', t.id);

                        return (
                          <div
                            key={t.id}
                            className={`tree-topic-row ${isTopicActive ? 'active-reading' : ''}`}
                            onClick={() => {
                              setSelectedTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id });
                              setIsMobileDrawerOpen(false);
                            }}
                          >
                            <div className="topic-name-wrap">
                              <span className="topic-line-bullet" />
                              <span>{t.name}</span>
                            </div>
                            {topicHasSummary ? (
                              <span className="dot-badge filled" title="Özet Mevcut">●</span>
                            ) : (
                              <span className="dot-badge empty" title="Henüz özet yok">○</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="tree-empty-notice">
                <BookOpen size={24} />
                <span>Bu derse ait ünite bulunamadı.</span>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER READER ARTICLE */}
        <main className="summary-reader-main glass">
          
          {/* ARTICLE TOOLBAR */}
          <div className="reader-toolbar no-print">
            
            {/* BREADCRUMB */}
            <div className="reader-breadcrumb">
              <span>{currentGrade?.name || 'Sınıf'}</span>
              <ChevronRight size={14} />
              <span>{currentSubject?.name || 'Ders'}</span>
              <ChevronRight size={14} />
              <span>{currentUnit?.name || 'Ünite'}</span>
              {selectedTarget?.type === 'topic' && (
                <>
                  <ChevronRight size={14} />
                  <strong className="crumb-active">{selectedTarget.name}</strong>
                </>
              )}
            </div>

            {/* READING CONTROLS */}
            <div className="reader-controls">
              {/* Font Sizer */}
              <div className="control-btn-group">
                <button 
                  onClick={() => setFontSize(prev => Math.max(13, prev - 1))}
                  title="Yazı Boyutunu Küçült"
                  className="ctrl-btn"
                >
                  <ZoomOut size={15} /> A-
                </button>
                <span className="font-size-indicator">{fontSize}px</span>
                <button 
                  onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                  title="Yazı Boyutunu Büyüt"
                  className="ctrl-btn"
                >
                  <ZoomIn size={15} /> A+
                </button>
              </div>

              {/* Print Button */}
              <button onClick={handlePrint} className="ctrl-btn" title="Yazdır / PDF Olarak Kaydet">
                <Printer size={15} />
              </button>

              {/* Focus Mode Toggle */}
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)} 
                className={`ctrl-btn ${isFocusMode ? 'active' : ''}`}
                title={isFocusMode ? 'Odak Modundan Çık' : 'Odak / Tam Ekran Oku'}
              >
                {isFocusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>

          </div>

          {/* ARTICLE CONTENT BODY */}
          <article className="summary-article-body custom-scrollbar">
            
            {selectedTarget ? (
              <>
                {/* Article Header Banner */}
                <div className="article-hero-banner">
                  <div className="hero-pill-row">
                    <span className={`hero-type-tag ${selectedTarget.type}`}>
                      {selectedTarget.type === 'unit' ? '📁 ÜNİTE GENEL ÖZETİ' : '📄 KONU ANLATIMI & ÖZET'}
                    </span>
                    {currentSummary?.updatedAt && (
                      <span className="hero-date">
                        Güncelleme: {new Date(currentSummary.updatedAt).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                  <h1 className="article-main-title">{selectedTarget.name}</h1>
                </div>

                {/* HTML VIEWER */}
                <div className="article-html-wrap">
                  <SummaryHtmlViewer
                    htmlContent={currentSummary?.contentHtml || ''}
                    fontSize={fontSize}
                    title={selectedTarget.name}
                    targetType={selectedTarget.type}
                    emptyMessage="Bu konu veya ünite için öğretmeniniz henüz bir özet metni eklememiş."
                  />
                </div>

                {/* ARTICLE FOOTER NAVIGATION (PREV / NEXT) */}
                <div className="article-nav-footer no-print">
                  {prevItem ? (
                    <button 
                      className="nav-page-btn prev-btn"
                      onClick={() => setSelectedTarget(prevItem)}
                    >
                      <ChevronLeft size={18} />
                      <div className="nav-btn-text">
                        <span className="nav-sub">Önceki Konu</span>
                        <strong>{prevItem.name}</strong>
                      </div>
                    </button>
                  ) : <div />}

                  {nextItem ? (
                    <button 
                      className="nav-page-btn next-btn"
                      onClick={() => setSelectedTarget(nextItem)}
                    >
                      <div className="nav-btn-text text-right">
                        <span className="nav-sub">Sonraki Konu</span>
                        <strong>{nextItem.name}</strong>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ) : <div />}
                </div>
              </>
            ) : (
              <div className="article-placeholder">
                <BookOpen size={48} color="#6366f1" />
                <h2>Okumak İçin Bir Konu veya Ünite Seçin</h2>
                <p>Sol menüden dilediğiniz konuyu seçerek zengin ders özetlerini inceleyebilirsiniz.</p>
              </div>
            )}

          </article>

        </main>

      </div>

    </div>
  );
}
