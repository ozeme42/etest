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

// Subject color theme helper
const getSubjectTheme = (subjectName = '') => {
  const s = String(subjectName || '').toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) {
    return { icon: '📐', color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', bg: '#f0f7ff', border: '#bfdbfe', text: '#1d4ed8', badgeBg: '#dbeafe', name: 'Matematik' };
  }
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) {
    return { icon: '🔬', color: '#059669', gradient: 'linear-gradient(135deg, #059669, #10b981)', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badgeBg: '#dcfce7', name: 'Fen Bilimleri' };
  }
  if (s.includes('türkçe') || s.includes('edebiyat') || s.includes('dil')) {
    return { icon: '📖', color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', bg: '#fff1f2', border: '#fecdd3', text: '#be123c', badgeBg: '#ffe4e6', name: 'Türkçe' };
  }
  if (s.includes('inkılap') || s.includes('tarih') || s.includes('sosyal') || s.includes('coğrafya')) {
    return { icon: '🏛️', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', bg: '#fffbeb', border: '#fde68a', text: '#b45309', badgeBg: '#fef3c7', name: 'Sosyal Bilgiler' };
  }
  if (s.includes('ingilizce') || s.includes('yabancı') || s.includes('almanca')) {
    return { icon: '🌍', color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', bg: '#faf5ff', border: '#e9d5ff', text: '#6d28d9', badgeBg: '#f3e8ff', name: 'İngilizce' };
  }
  if (s.includes('din') || s.includes('ahlak')) {
    return { icon: '🕌', color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490', badgeBg: '#cffafe', name: 'Din Kültürü' };
  }
  return { icon: '📚', color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', bg: '#f8fafc', border: '#cbd5e1', text: '#334155', badgeBg: '#f1f5f9', name: 'Ders' };
};

// Row theme palettes for color variety in topic list
const ROW_COLOR_PALETTES = [
  { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
];

const getRowTheme = (subjectName, idx) => {
  if (subjectName) {
    const s = String(subjectName).toLowerCase();
    if (s.includes('matematik')) return ROW_COLOR_PALETTES[0];
    if (s.includes('türkçe')) return ROW_COLOR_PALETTES[1];
    if (s.includes('fen')) return ROW_COLOR_PALETTES[2];
    if (s.includes('ingilizce')) return ROW_COLOR_PALETTES[3];
    if (s.includes('sosyal') || s.includes('inkılap')) return ROW_COLOR_PALETTES[4];
    if (s.includes('din')) return ROW_COLOR_PALETTES[5];
  }
  return ROW_COLOR_PALETTES[idx % ROW_COLOR_PALETTES.length];
};

// Natural alphanumeric order extractor and sorter
const extractUnitOrderNumber = (unit, fallbackIndex = 999) => {
  if (!unit) return fallbackIndex;
  if (typeof unit.order === 'number') return unit.order;
  if (typeof unit.sortOrder === 'number') return unit.sortOrder;
  if (typeof unit.unitNumber === 'number') return unit.unitNumber;

  const raw = String(unit.name || '').trim();
  const match = raw.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return fallbackIndex;
};

const sortUnitsNaturally = (unitList = []) => {
  return [...unitList].sort((a, b) => {
    const numA = extractUnitOrderNumber(a, 999);
    const numB = extractUnitOrderNumber(b, 999);
    if (numA !== numB) return numA - numB;
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

const getUnitDetails = (unit, index) => {
  const unitNum = extractUnitOrderNumber(unit, index + 1);
  const raw = String(unit?.name || '').trim();

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
  const [activeReadingTarget, setActiveReadingTarget] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const grades = curriculumData.grades || [];
  const subjects = curriculumData.subjects || [];
  const units = curriculumData.units || [];
  const topics = curriculumData.topics || [];

  // Sync selectedGradeId
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

  // Filter & sort units by selected subject
  const filteredUnits = useMemo(() => {
    const list = units.filter(u => String(u.subjectId) === String(selectedSubjectId));
    return sortUnitsNaturally(list);
  }, [units, selectedSubjectId]);

  // Reading items for next/previous navigation
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

  // Active summary
  const currentSummary = useMemo(() => {
    if (!activeReadingTarget) return null;
    return getSummary(activeReadingTarget.type, activeReadingTarget.id);
  }, [activeReadingTarget, summaries]);

  // Navigation indices
  const currentIdx = readingItemList.findIndex(item => String(item.id) === String(activeReadingTarget?.id));
  const prevItem = currentIdx > 0 ? readingItemList[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < readingItemList.length - 1 ? readingItemList[currentIdx + 1] : null;

  // Selected entities
  const currentGrade = grades.find(g => String(g.id) === String(selectedGradeId));
  const currentSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const currentUnit = units.find(u => String(u.id) === String(activeReadingTarget?.unitId || activeReadingTarget?.id));

  const activeTheme = getSubjectTheme(currentSubject?.name);

  // Total available summaries count in current grade
  const totalSummariesInGrade = useMemo(() => {
    let count = 0;
    filteredSubjects.forEach(s => {
      const sUnits = units.filter(u => String(u.subjectId) === String(s.id));
      sUnits.forEach(u => {
        if (hasSummary('unit', u.id)) count++;
        const uTopics = topics.filter(t => String(t.unitId) === String(u.id));
        uTopics.forEach(t => {
          if (hasSummary('topic', t.id)) count++;
        });
      });
    });
    return count;
  }, [filteredSubjects, units, topics, summaries]);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (activeReadingTarget) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeReadingTarget?.id]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: activeReadingTarget ? 0 : '1.25rem 1rem 5rem',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .summary-anim { animation: fadeIn 0.25s ease both; }
        .summary-row:hover { filter: brightness(0.98); }
        @media (max-width: 640px) {
          .summary-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════
          VIEW 1: FULLSCREEN EDGE-TO-EDGE READER
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

          {/* MAIN ARTICLE CONTAINER */}
          <main className="edu-fullscreen-article-wrap">
            <article className="edu-reader-card-full">
              
              {/* Article Hero Header */}
              <div className="edu-article-header">
                <div className="edu-header-meta">
                  <span 
                    className="edu-meta-badge"
                    style={{ background: activeTheme.bg, color: activeTheme.color, borderColor: activeTheme.border }}
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

              {/* IFRAME HTML VIEWER */}
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

          {/* SLIDE-OVER TOPIC DRAWER */}
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
                    const { unitNum, fullDisplayName } = getUnitDetails(u, uIdx);
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
            VIEW 2: CLEAN MODERN LIGHT CATALOG VIEW WITH COLORFUL LIST ROWS
           ════════════════════════════════════════════════════════════════ */
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          
          {/* ─── TOP ACTION & HEADER ─── */}
          <div className="summary-header-wrap summary-anim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/student')}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '0.75rem',
                  padding: '0.5rem 0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  color: '#1e293b',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowLeft size={16} /> Öğrenci Paneli
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  color: 'white',
                  border: '2px solid #ffffff',
                  boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                  flexShrink: 0
                }}>
                  📚
                </div>
                <div>
                  <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#0f172a', lineHeight: 1.2 }}>
                    Ders Notları & Konu Özetleri
                  </h1>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                    Müfredata tam uyumlu ünite özetleri ve sınav hazırlık notları
                  </div>
                </div>
              </div>
            </div>

            {/* Sınıf Seçici Rozeti */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '0.35rem 0.6rem', borderRadius: '1rem', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto', maxWidth: '100%' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginLeft: 4 }}>🎓 Sınıf:</span>
              <div style={{ display: 'inline-flex', gap: 4 }}>
                {grades.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGradeId(g.id)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: 8,
                      border: 'none',
                      background: String(selectedGradeId) === String(g.id) ? '#4f46e5' : '#f1f5f9',
                      color: String(selectedGradeId) === String(g.id) ? '#ffffff' : '#475569',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── 4 SUMMARY OVERVIEW METRICS ─── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {/* Card 1: Seçili Sınıf */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '1.15rem',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                🎓
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Seviye / Sınıf</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{currentGrade?.name || 'Sınıf'}</span>
              </div>
            </div>

            {/* Card 2: Ders Sayısı */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '1.15rem',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                📖
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Toplam Ders</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#7c3aed' }}>{filteredSubjects.length} Ders</span>
              </div>
            </div>

            {/* Card 3: Ünite Sayısı */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '1.15rem',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                📁
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Ünite Sayısı</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0891b2' }}>{filteredUnits.length} Ünite</span>
              </div>
            </div>

            {/* Card 4: Hazır Özet */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #bbf7d0',
              borderRadius: '1.15rem',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                ✨
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Hazır Özetler</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#16a34a' }}>{totalSummariesInGrade} İçerik</span>
              </div>
            </div>
          </div>

          {/* ─── DERS SEÇİCİ TABLAR & ARAMA ÇUBUĞU ─── */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '1.15rem',
            padding: '0.85rem 1.15rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            {/* SUBJECT HORIZONTAL CARDS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflowX: 'auto', paddingBottom: 4 }}>
              {filteredSubjects.map(s => {
                const theme = getSubjectTheme(s.name);
                const isSelected = String(selectedSubjectId) === String(s.id);
                
                const sUnits = units.filter(u => String(u.subjectId) === String(s.id));
                let count = 0;
                sUnits.forEach(u => {
                  if (hasSummary('unit', u.id)) count++;
                  const uTopics = topics.filter(t => String(t.unitId) === String(u.id));
                  uTopics.forEach(t => {
                    if (hasSummary('topic', t.id)) count++;
                  });
                });

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubjectId(s.id)}
                    style={{
                      background: isSelected ? theme.bg : '#ffffff',
                      border: isSelected ? `2px solid ${theme.color}` : '1.5px solid #e2e8f0',
                      borderRadius: '0.85rem',
                      padding: '0.5rem 0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      boxShadow: isSelected ? `0 4px 12px ${theme.border}` : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.15rem' }}>{theme.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '0.84rem', color: isSelected ? theme.color : '#0f172a', display: 'block', fontWeight: 900 }}>
                        {s.name}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: isSelected ? theme.text : '#64748b', fontWeight: 700 }}>
                        {count > 0 ? `${count} Özet Hazır` : `${sUnits.length} Ünite`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SEARCH INPUT */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={`${currentSubject?.name || 'Ders'} içinde ünite veya konu ara...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '0.5rem 0.85rem 0.5rem 2.2rem',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* ─── VIBRANT & COLORFUL UNIT LIST (LIST VIEW) ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  <div key={u.id} className="summary-anim" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    
                    {/* 📁 ÜNİTE BAŞLIK ÇUBUĞU */}
                    <div style={{
                      background: '#ffffff',
                      border: `1.5px solid ${activeTheme.border}`,
                      borderLeft: `5px solid ${activeTheme.color}`,
                      borderRadius: '1.15rem',
                      padding: '0.75rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220 }}>
                        <span style={{
                          background: activeTheme.gradient,
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: 6,
                          letterSpacing: '0.04em'
                        }}>
                          {badgeText}
                        </span>
                        {cleanTitle && (
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                            {cleanTitle}
                          </h3>
                        )}
                      </div>

                      {/* Ünite Genel Özeti Butonu */}
                      <button
                        onClick={() => setActiveReadingTarget({ type: 'unit', id: u.id, name: fullDisplayName, unitId: u.id, unitName: fullDisplayName })}
                        style={{
                          background: unitHasSummary ? activeTheme.bg : '#f8fafc',
                          color: unitHasSummary ? activeTheme.color : '#64748b',
                          border: `1.5px solid ${unitHasSummary ? activeTheme.border : '#cbd5e1'}`,
                          borderRadius: 10,
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.76rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s'
                        }}
                      >
                        <BookMarked size={14} />
                        <span>{unitHasSummary ? 'Ünite Genel Özeti' : 'Ünite Notları'}</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* 📋 KONU LİSTESİ (Farklı Renklerde Satırlar) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '1.15rem',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      {filteredTopicsList.length > 0 ? (
                        filteredTopicsList.map((t, tIdx) => {
                          const topicHasSummary = hasSummary('topic', t.id);
                          const topicTitle = t.name || `Konu ${tIdx + 1}`;
                          const isLast = tIdx === filteredTopicsList.length - 1;
                          const rowTheme = getRowTheme(currentSubject?.name, tIdx);

                          return (
                            <div
                              key={t.id}
                              className="summary-row"
                              onClick={() => setActiveReadingTarget({ type: 'topic', id: t.id, name: topicTitle, unitId: u.id, unitName: fullDisplayName })}
                              style={{
                                background: rowTheme.bg,
                                borderLeft: `4.5px solid ${topicHasSummary ? rowTheme.accent : '#94a3b8'}`,
                                borderBottom: isLast ? 'none' : `1px solid ${rowTheme.border}`,
                                padding: '0.85rem 1.15rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {/* SOL: Konu Numarası, Başlık ve Rozet */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                                
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  color: rowTheme.accent,
                                  border: `1.5px solid ${rowTheme.border}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                  fontWeight: 900,
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                }}>
                                  {tIdx + 1}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 900,
                                      color: rowTheme.text,
                                      background: rowTheme.badgeBg,
                                      padding: '1px 6px',
                                      borderRadius: 5,
                                      border: `1px solid ${rowTheme.border}`
                                    }}>
                                      {currentSubject?.name || 'Ders'}
                                    </span>

                                    {topicHasSummary ? (
                                      <span style={{ fontSize: '0.64rem', fontWeight: 900, background: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: 99, border: '1px solid #86efac' }}>
                                        ● Özet Hazır
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.64rem', fontWeight: 700, background: '#ffffff', color: '#64748b', padding: '1px 6px', borderRadius: 99, border: '1px solid #cbd5e1' }}>
                                        Müfredat Konusu
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                                    {topicTitle}
                                  </div>
                                </div>
                              </div>

                              {/* SAĞ: Oku / İncele Butonu */}
                              <div style={{ flexShrink: 0 }}>
                                <button
                                  type="button"
                                  style={{
                                    background: topicHasSummary ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#ffffff',
                                    color: topicHasSummary ? '#ffffff' : '#334155',
                                    border: topicHasSummary ? 'none' : '1.5px solid #cbd5e1',
                                    borderRadius: 9,
                                    padding: '0.45rem 0.95rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    boxShadow: topicHasSummary ? '0 2px 8px rgba(79,70,229,0.25)' : '0 1px 3px rgba(0,0,0,0.02)',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {topicHasSummary ? <BookOpen size={14} /> : <FileText size={14} />}
                                  <span>{topicHasSummary ? 'Özeti Oku' : 'İncele'}</span>
                                  <ChevronRight size={13} />
                                </button>
                              </div>

                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                          Bu ünitede kayıtlı konu bulunmuyor.
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            ) : (
              <div style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '1.25rem',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <BookOpen size={40} color="#94a3b8" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Bu Derse Ait Ünite Bulunamadı</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 420, margin: 0, lineHeight: 1.4 }}>
                  Seçtiğiniz sınıf veya derse ait müfredat bilgisi henüz sisteme girilmemiş.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
