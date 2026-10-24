import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Zap
} from 'lucide-react';

const SUBJECT_THEMES = {
  'Matematik': { from: '#3b82f6', to: '#1d4ed8', icon: '📐', badgeBg: 'rgba(59, 130, 246, 0.12)', badgeText: '#2563eb', badgeBorder: 'rgba(59, 130, 246, 0.3)', glow: 'rgba(59, 130, 246, 0.22)' },
  'Türkçe': { from: '#f43f5e', to: '#be123c', icon: '📖', badgeBg: 'rgba(244, 63, 94, 0.12)', badgeText: '#e11d48', badgeBorder: 'rgba(244, 63, 94, 0.3)', glow: 'rgba(244, 63, 94, 0.22)' },
  'Fen Bilimleri': { from: '#10b981', to: '#047857', icon: '🧪', badgeBg: 'rgba(16, 185, 129, 0.12)', badgeText: '#059669', badgeBorder: 'rgba(16, 185, 129, 0.3)', glow: 'rgba(16, 185, 129, 0.22)' },
  'Sosyal Bilgiler': { from: '#f59e0b', to: '#b45309', icon: '🌍', badgeBg: 'rgba(245, 158, 11, 0.12)', badgeText: '#d97706', badgeBorder: 'rgba(245, 158, 11, 0.3)', glow: 'rgba(245, 158, 11, 0.22)' },
  'İngilizce': { from: '#8b5cf6', to: '#6d28d9', icon: '💬', badgeBg: 'rgba(139, 92, 246, 0.12)', badgeText: '#7c3aed', badgeBorder: 'rgba(139, 92, 246, 0.3)', glow: 'rgba(139, 92, 246, 0.22)' },
  'Din Kültürü': { from: '#06b6d4', to: '#0e7490', icon: '✨', badgeBg: 'rgba(6, 182, 212, 0.12)', badgeText: '#0891b2', badgeBorder: 'rgba(6, 182, 212, 0.3)', glow: 'rgba(6, 182, 212, 0.22)' },
  'Kitap Okuma': { from: '#ec4899', to: '#be185d', icon: '📚', badgeBg: 'rgba(236, 72, 153, 0.12)', badgeText: '#db2777', badgeBorder: 'rgba(236, 72, 153, 0.3)', glow: 'rgba(236, 72, 153, 0.22)' },
  'Deneme': { from: '#f97316', to: '#c2410c', icon: '🎯', badgeBg: 'rgba(249, 115, 22, 0.12)', badgeText: '#ea580c', badgeBorder: 'rgba(249, 115, 22, 0.3)', glow: 'rgba(249, 115, 22, 0.22)' }
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
  isMobile,
  isDark,
  catchUpTasks = [],
  onToggleTask,
  onTaskClick,
  onDeleteTask,
  getRowTheme,
  onNavigateTasks,
  onNavigateBooks
}) {
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

  // Category Icon & Badge Resolver for Catch-Up Items
  const getCatchUpCategoryBadge = (task) => {
    if (task.categoryType === 'yol_haritasi' || task.isRoadmapTask || task.roadmapAssignmentId) {
      return { label: '🗺️ Yol Haritası', bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.3)' };
    }
    if (task.categoryType === 'kitap' || task.isBookTask || task.bookTestId || (task.testId && task.bookId)) {
      return { label: '📚 Kitap Takibi', bg: 'rgba(5, 150, 105, 0.12)', color: '#059669', border: 'rgba(5, 150, 105, 0.3)' };
    }
    if (task.categoryType === 'deneme' || task.isExamTask || task.type === 'physicalExam') {
      return { label: '🎯 Deneme', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', border: 'rgba(217, 119, 6, 0.3)' };
    }
    return { label: '📝 Ödev / Görev', bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' };
  };

  // Calculate subject counts
  const subjectCounts = useMemo(() => {
    const counts = {};
    (catchUpTasks || []).forEach(t => {
      const cleanSubj = (t.subject && t.subject.toLowerCase() === 'geometri') ? 'Matematik' : (t.subject || 'Diğer');
      counts[cleanSubj] = (counts[cleanSubj] || 0) + 1;
    });
    return counts;
  }, [catchUpTasks]);

  // Total questions count estimation
  const totalQuestionsEstimate = useMemo(() => {
    return (catchUpTasks || []).reduce((acc, t) => {
      const q = Number(t.questionCount || t.targetQuestionCount || 0);
      return acc + (isNaN(q) ? 0 : q);
    }, 0);
  }, [catchUpTasks]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return (catchUpTasks || []).filter(task => {
      const cleanSubj = (task.subject && task.subject.toLowerCase() === 'geometri') ? 'Matematik' : (task.subject || 'Diğer');
      if (selectedSubject !== 'all' && cleanSubj !== selectedSubject) return false;

      if (selectedCategory !== 'all') {
        const isReading = task.taskType === 'okuma' || String(task.topic || '').toLowerCase().includes('okuma');
        const isRoadmap = Boolean(task.roadmapAssignmentId || task.isRoadmapTask);
        const isBook = Boolean(task.isBookTask || task.bookTestId);
        const isHw = Boolean(task.hwId && !task.bookTestId && !task.roadmapAssignmentId);

        if (selectedCategory === 'harita' && !isRoadmap) return false;
        if (selectedCategory === 'kitap' && !isBook) return false;
        if (selectedCategory === 'ödev' && !isHw) return false;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* ── Main Remedial Card ── */}
      <div
        className="game-card-elevated"
        style={{
          padding: isMobile ? '1.1rem 0.95rem' : '1.5rem 1.8rem',
          border: hasTasks ? '2px solid rgba(245, 158, 11, 0.45)' : '2px solid var(--color-border)',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #edf2f7',
          marginTop: 0,
          position: 'relative'
        }}
      >
        {/* Neon Gradient Header Top Beam */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: hasTasks
            ? 'linear-gradient(90deg, #ea580c, #f59e0b, #ef4444)'
            : 'linear-gradient(90deg, #10b981, #059669, #34d399)',
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit'
        }} />

        {/* ── Card Header ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1.5px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: isMobile ? 44 : 50,
              height: isMobile ? 44 : 50,
              borderRadius: 16,
              background: hasTasks
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.35rem' : '1.6rem',
              boxShadow: hasTasks ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(16, 185, 129, 0.35)',
              flexShrink: 0
            }}>
              {hasTasks ? '🔥' : '✨'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '1.1rem' : '1.35rem',
                  fontWeight: 900,
                  color: 'var(--color-text)',
                  letterSpacing: '-0.02em'
                }}>
                  Akıllı Telafi Havuzu
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: hasTasks ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  boxShadow: hasTasks ? '0 2px 8px rgba(239, 68, 68, 0.35)' : '0 2px 8px rgba(16, 185, 129, 0.35)'
                }}>
                  {hasTasks ? `${catchUpTasks.length} Geciken Görev` : '0 Eksik • Tertemiz'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {hasTasks
                  ? 'Geçmiş günlerden kalan eksikleri, süresi geçmiş ödevleri ve telafi testlerini çözerek haftalık hedefini yakala!'
                  : 'Harika bir disiplin! Gecikmiş hiçbir görevin yok, programın eksiksiz ilerliyor.'}
              </p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {hasTasks && (
              <button
                type="button"
                onClick={handlePrintCatchUp}
                className="game-btn-3d"
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fff1f2',
                  border: isDark ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1.5px solid #fecdd3',
                  color: '#ef4444',
                  borderRadius: 12,
                  padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.05rem',
                  fontSize: isMobile ? '0.76rem' : '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="A4 Çıktı Olarak Yazdır"
              >
                <Printer size={15} />
                <span>Yazdır (A4)</span>
              </button>
            )}

            {hasTasks && onDeleteTask && (
              <button
                type="button"
                onClick={() => onDeleteTask('CLEAR_ALL_CATCHUP')}
                className="game-btn-3d"
                style={{
                  background: isDark ? 'rgba(100, 116, 139, 0.15)' : '#f1f5f9',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  borderRadius: 12,
                  padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.05rem',
                  fontSize: isMobile ? '0.76rem' : '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Tüm telafi havuzundaki görevleri kaldır"
              >
                <Trash2 size={14} />
                <span>Havuzu Temizle</span>
              </button>
            )}
          </div>
        </div>

        {hasTasks ? (
          <>
            {/* ── Metric Highlights Bar ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: '1.25rem'
            }}>
              <div style={{
                background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 14,
                padding: isMobile ? '0.5rem 0.7rem' : '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 7 : 10
              }}>
                <span style={{ fontSize: '1.4rem' }}>⏳</span>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Geciken Görev</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>{catchUpTasks.length} Adet</div>
                </div>
              </div>

              {totalQuestionsEstimate > 0 && (
                <div style={{
                  background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
                  border: '1.5px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 14,
                  padding: isMobile ? '0.5rem 0.7rem' : '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 7 : 10
                }}>
                  <span style={{ fontSize: '1.4rem' }}>📝</span>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>Tahmini Soru</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>~{totalQuestionsEstimate} Soru</div>
                  </div>
                </div>
              )}

              <div style={{
                background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)',
                border: '1.5px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 14,
                padding: isMobile ? '0.5rem 0.7rem' : '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 7 : 10,
                gridColumn: isMobile ? 'span 2' : 'auto'
              }}>
                <span style={{ fontSize: '1.4rem' }}>📚</span>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Ders Çeşitliliği</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    {Object.keys(subjectCounts).length} Farklı Ders
                  </div>
                </div>
              </div>
            </div>

            {/* ── Search & Filter Controls ── */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: '1rem'
            }}>
              {/* Subject Filter Pills */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 4,
                maxWidth: '100%',
                WebkitOverflowScrolling: 'touch'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedSubject('all')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 99,
                    border: '1.5px solid',
                    borderColor: selectedSubject === 'all' ? '#6366f1' : 'var(--color-border)',
                    background: selectedSubject === 'all' ? '#6366f1' : 'var(--color-surface)',
                    color: selectedSubject === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Tümü ({catchUpTasks.length})
                </button>

                {Object.entries(subjectCounts).map(([subj, count]) => {
                  const isAct = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(subj)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 99,
                        border: '1.5px solid',
                        borderColor: isAct ? '#f59e0b' : 'var(--color-border)',
                        background: isAct ? '#f59e0b' : 'var(--color-surface)',
                        color: isAct ? '#ffffff' : 'var(--color-text)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {subj} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Quick Search Box */}
              <div style={{
                position: 'relative',
                minWidth: isMobile ? '100%' : 220
              }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  placeholder="Telafi görevi veya kitap ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 1.8rem 0.45rem 2rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.78rem',
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
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      padding: 2
                    }}
                  >
                    <X size={isMobile ? 11 : 13} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Task List Grid (Masaüstünde 3'lü Sütun, Görevler ile Birebir Aynı Şık Bento Düzeni) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
              gap: isMobile ? '0.5rem' : '1rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {filteredTasks.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  background: 'var(--color-surface)',
                  borderRadius: 14,
                  border: '1.5px dashed var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🔍</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Seçilen kriterlere uygun telafi görevi bulunamadı.</div>
                  <button
                    type="button"
                    onClick={() => { setSelectedSubject('all'); setSelectedCategory('all'); setSearchQuery(''); }}
                    style={{
                      marginTop: 10,
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontWeight: 800,
                      fontSize: '0.78rem',
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

                  const isTestTask = !isReadingTask && (
                    Boolean(task.testResult) ||
                    isQuizTask ||
                    Boolean(task.testId || task.bookTestId || task.realTestId) ||
                    Boolean(task.isExamTask || task.taskType === 'deneme' || task.taskType === 'test' || task.taskType === 'remedialTest') ||
                    Boolean(task.questionCount) ||
                    /test|deneme|sınav|soru/i.test(task.title || task.topic || task.testName)
                  );

                  const testResult = task.testResult || (task.submission ? {
                    score: task.submission.score !== undefined && !isNaN(Number(task.submission.score)) ? Math.round(Number(task.submission.score)) : (task.submission.totalQuestions ? Math.round(((task.submission.correctCount || 0) / task.submission.totalQuestions) * 100) : 0),
                    correctCount: Number(task.submission.correctCount ?? task.submission.correct_count ?? 0),
                    wrongCount: Number(task.submission.wrongCount ?? task.submission.wrong_count ?? 0),
                    emptyCount: Number(task.submission.emptyCount ?? task.submission.blankCount ?? 0),
                    totalQuestions: Number(task.submission.totalQuestions ?? task.submission.questionCount ?? 0),
                    net: task.submission.net !== undefined ? Number(task.submission.net) : Math.max(0, Math.round(((Number(task.submission.correctCount ?? 0)) - (Number(task.submission.wrongCount ?? 0) / 3)) * 100) / 100)
                  } : null);

                  const successScore = testResult ? Number(testResult.score || 0) : null;
                  const statusTag = successScore !== null ? (
                    successScore >= 80 ? { icon: '🏆', label: 'Güçlü', color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7', border: 'rgba(16,185,129,0.35)' }
                    : successScore >= 60 ? { icon: '📈', label: 'Gelişiyor', color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7', border: 'rgba(245,158,11,0.35)' }
                    : { icon: '⚠️', label: 'Tekrar Etmeli', color: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', border: 'rgba(239,68,68,0.35)' }
                  ) : null;

                  const sTheme = resolveSubjectTheme(cleanSubj);

                  return (
                    <div
                      key={`remedial_tab_${task.id || task.hwId || cIdx}`}
                      onClick={() => {
                        if (isReadingTask) {
                          onToggleTask && onToggleTask(task);
                        } else {
                          onTaskClick && onTaskClick(task);
                        }
                      }}
                      className="game-quest-row"
                      style={{
                        background: task.done 
                          ? (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)') 
                          : (isDark ? 'linear-gradient(145deg, rgba(255,255,255,0.035), var(--color-surface))' : 'linear-gradient(145deg, #ffffff, #fcfcfd)'),
                        borderTop: `4px solid ${task.done ? '#10b981' : sTheme.from}`,
                        borderLeft: `1.5px solid ${task.done ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`,
                        borderRight: `1.5px solid ${task.done ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`,
                        borderBottom: `1.5px solid ${task.done ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`,
                        borderRadius: isMobile ? 14 : 18,
                        padding: isMobile ? '0.55rem 0.7rem' : '1rem 1.15rem',
                        cursor: 'pointer',
                        boxShadow: task.done 
                          ? '0 2px 10px rgba(16,185,129,0.08)' 
                          : `0 4px 16px ${sTheme.glow}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: isMobile ? '0.35rem' : '0.65rem',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Kart Üst Başlık Satırı: Ders + Gecikti Rozeti + Sağda Checkbox / Silme Butonu */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: isMobile ? 6 : 8,
                        width: '100%',
                        paddingBottom: isMobile ? '0.35rem' : '0.6rem',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                          {/* Ders Rozeti */}
                          <span style={{
                            fontSize: isMobile ? '0.66rem' : '0.72rem',
                            fontWeight: 900,
                            color: sTheme.badgeText,
                            background: sTheme.badgeBg,
                            border: `1.5px solid ${sTheme.badgeBorder}`,
                            padding: isMobile ? '2px 6px' : '3px 9px',
                            borderRadius: isMobile ? 6 : 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: isMobile ? 3 : 5
                          }}>
                            <span style={{ fontSize: isMobile ? '0.78rem' : '0.92rem', lineHeight: 1 }}>{sTheme.icon}</span>
                            <span>{cleanSubj}</span>
                          </span>

                          {/* Gecikti Rozeti */}
                          <span style={{
                            fontSize: isMobile ? '0.6rem' : '0.66rem',
                            fontWeight: 900,
                            color: '#dc2626',
                            background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                            border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecdd3',
                            padding: isMobile ? '1.5px 6px' : '2px 8px',
                            borderRadius: isMobile ? 6 : 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            ⚠️ Gecikti
                          </span>

                          {catBadge && (
                            <span style={{
                              fontSize: isMobile ? '0.6rem' : '0.66rem',
                              fontWeight: 800,
                              color: catBadge.color,
                              background: catBadge.bg,
                              border: `1px solid ${catBadge.border}`,
                              padding: isMobile ? '1.5px 5px' : '2px 7px',
                              borderRadius: 6
                            }}>
                              {catBadge.label}
                            </span>
                          )}
                        </div>

                        {/* Sağ: Sil Butonu & Tamamlama Kutusu */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {onDeleteTask && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                              style={{
                                width: isMobile ? 24 : 28,
                                height: isMobile ? 24 : 28,
                                borderRadius: isMobile ? 6 : 8,
                                background: 'transparent',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Bu görevi telafi havuzundan kaldır"
                            >
                              <X size={13} />
                            </button>
                          )}

                          {/* Hızlı Tamamlama Kutusu */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                            style={{
                              width: isMobile ? 26 : 32,
                              height: isMobile ? 26 : 32,
                              minWidth: isMobile ? 26 : 32,
                              borderRadius: isMobile ? 7 : 10,
                              border: task.done 
                                ? '2px solid #10b981' 
                                : isDark ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid #cbd5e1',
                              background: task.done
                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'),
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: 'pointer',
                              padding: 0,
                              boxShadow: task.done ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            title={task.done ? 'Tamamlandı (Geri almak için tıkla)' : 'Tamamlandı olarak işaretle'}
                          >
                            {task.done ? (
                              <Check size={isMobile ? 15 : 18} color="#ffffff" strokeWidth={3.5} />
                            ) : (
                              <span style={{ width: 6, height: 6, borderRadius: 2, background: 'transparent' }} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Görev Başlığı (Tam genişlik & belirgin) */}
                      <div style={{
                        fontSize: isMobile ? '0.85rem' : '1.02rem',
                        fontWeight: 800,
                        color: task.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: task.done ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        lineHeight: isMobile ? 1.3 : 1.35,
                        fontFamily: "'Outfit', sans-serif",
                        width: '100%',
                        paddingBottom: isMobile ? '0.35rem' : '0.5rem',
                        borderBottom: isDark ? '1px dashed rgba(255, 255, 255, 0.08)' : '1px dashed rgba(0, 0, 0, 0.06)'
                      }}>
                        {displayTitle}
                      </div>

                      {/* ── Test Sonucu & Başarı Durumu Paneli (Tamamlanan Testler İçin) ── */}
                      {task.done && isTestTask && (
                        <div style={{
                          background: isDark
                            ? (testResult ? 'rgba(16, 185, 129, 0.09)' : 'rgba(255, 255, 255, 0.03)')
                            : (testResult ? 'rgba(16, 185, 129, 0.06)' : '#f8fafc'),
                          border: isDark
                            ? (testResult ? '1.5px solid rgba(16, 185, 129, 0.28)' : '1px solid rgba(255, 255, 255, 0.08)')
                            : (testResult ? '1.5px solid #bbf7d0' : '#e2e8f0'),
                          borderRadius: 10,
                          padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          {testResult ? (
                            <>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 6
                              }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    fontSize: isMobile ? '0.78rem' : '0.86rem',
                                    fontWeight: 900,
                                    color: statusTag ? statusTag.color : '#10b981',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}>
                                    {statusTag ? statusTag.icon : '🏆'} %{testResult.score} Başarı
                                  </span>

                                  {statusTag && (
                                    <span style={{
                                      fontSize: isMobile ? '0.62rem' : '0.68rem',
                                      fontWeight: 900,
                                      padding: '1px 6px',
                                      borderRadius: 6,
                                      background: statusTag.bg,
                                      color: statusTag.color,
                                      border: `1px solid ${statusTag.border}`
                                    }}>
                                      {statusTag.label}
                                    </span>
                                  )}
                                </div>

                                {testResult.net !== undefined && testResult.net !== null && (
                                  <span style={{
                                    fontSize: isMobile ? '0.7rem' : '0.76rem',
                                    fontWeight: 900,
                                    color: '#2563eb',
                                    background: isDark ? 'rgba(37,99,235,0.18)' : '#eff6ff',
                                    border: isDark ? '1px solid rgba(37,99,235,0.35)' : '1px solid #bfdbfe',
                                    padding: '1px 7px',
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3
                                  }}>
                                    🎯 {testResult.net} Net
                                  </span>
                                )}
                              </div>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: isMobile ? '0.66rem' : '0.72rem',
                                fontWeight: 800,
                                paddingTop: 3,
                                borderTop: isDark ? '1px dashed rgba(255,255,255,0.08)' : '1px dashed rgba(0,0,0,0.06)'
                              }}>
                                <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                  ✅ {testResult.correctCount} Doğru
                                </span>
                                <span style={{ color: 'var(--color-border)', margin: '0 1px' }}>•</span>
                                <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                  ❌ {testResult.wrongCount} Yanlış
                                </span>
                                {testResult.emptyCount > 0 && (
                                  <>
                                    <span style={{ color: 'var(--color-border)', margin: '0 1px' }}>•</span>
                                    <span style={{ color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                      ⚪ {testResult.emptyCount} Boş
                                    </span>
                                  </>
                                )}
                              </div>
                            </>
                          ) : (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: isMobile ? '0.72rem' : '0.78rem',
                              fontWeight: 800,
                              color: '#10b981'
                            }}>
                              <span>✓ Test Tamamlandı</span>
                              <span style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                Manuel İşaretlendi
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Renkli & Dolu Bilgi Etiketleri Şeridi */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, flexWrap: 'wrap', width: '100%' }}>
                        {task.bookTitle && !/^kitap$/i.test(task.bookTitle.trim()) && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: (task.roadmapAssignmentId || task.isRoadmapTask) ? '#7c3aed' : '#2563eb',
                            background: (task.roadmapAssignmentId || task.isRoadmapTask) ? 'rgba(124, 58, 237, 0.12)' : (isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)'),
                            border: (task.roadmapAssignmentId || task.isRoadmapTask) ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(37, 99, 235, 0.25)',
                            padding: isMobile ? '1.5px 5px' : '2px 7px',
                            borderRadius: 6,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: isMobile ? 180 : 220,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            {(task.roadmapAssignmentId || task.isRoadmapTask) ? `🗺️ ${task.bookTitle}` : `📖 ${task.bookTitle}`}
                          </span>
                        )}

                        {task.questionCount && !isReadingTask && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#059669',
                            background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.09)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: isMobile ? '1.5px 5px' : '2px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            📝 {String(task.questionCount).replace(/\s*soru\s*$/i, '')} Soru
                          </span>
                        )}

                        {isReadingTask && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#db2777',
                            background: 'rgba(236, 72, 153, 0.12)',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            padding: isMobile ? '1.5px 5px' : '2px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            📚 Okuma Görevi
                          </span>
                        )}

                        {pageBadge && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#ea580c',
                            background: isDark ? 'rgba(234, 88, 12, 0.15)' : 'rgba(234, 88, 12, 0.08)',
                            border: '1px solid rgba(234, 88, 12, 0.25)',
                            padding: isMobile ? '1.5px 5px' : '2px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            📄 {pageBadge}
                          </span>
                        )}

                        {task.unitTopic && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-surface-hover)',
                            border: '1px solid var(--color-border)',
                            padding: isMobile ? '1.5px 5px' : '2px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            📌 {task.unitTopic}
                          </span>
                        )}

                        {(task.reason || task.dueDateStr || task.time) && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            color: '#ef4444',
                            background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fff1f2',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: isMobile ? '1.5px 5px' : '2px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            ⏰ {task.reason || task.dueDateStr || task.time}
                          </span>
                        )}
                      </div>

                      {/* Alt Aksiyon Butonu (Kompakt & Tam Genişlik) */}
                      <div style={{
                        flexShrink: 0,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'stretch',
                        marginTop: 'auto',
                        paddingTop: isMobile ? '0.35rem' : '0.65rem',
                        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'
                      }}>
                        {task.roadmapAssignmentId ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                            className="game-btn-3d game-btn-accent"
                            style={{
                              borderRadius: 12,
                              padding: '0.55rem 1rem',
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              width: '100%',
                              justifyContent: 'center'
                            }}
                          >
                            <Compass size={15} /> Haritaya Git
                          </button>
                        ) : isQuizTask ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                            className="game-btn-3d"
                            style={{
                              background: `linear-gradient(135deg, ${sTheme.from}, ${sTheme.to})`,
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: isMobile ? 10 : 12,
                              padding: isMobile ? '0.4rem 0.75rem' : '0.55rem 1rem',
                              fontSize: isMobile ? '0.76rem' : '0.82rem',
                              fontWeight: 900,
                              boxShadow: `0 3px 12px ${sTheme.glow}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: isMobile ? 4 : 6,
                              width: '100%',
                              justifyContent: 'center'
                            }}
                          >
                            <PlayCircle size={isMobile ? 14 : 16} /> Telafi Et ⚔️
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                            className="game-btn-3d game-btn-emerald"
                            style={{
                              borderRadius: isMobile ? 10 : 12,
                              padding: isMobile ? '0.4rem 0.75rem' : '0.55rem 1rem',
                              fontSize: isMobile ? '0.76rem' : '0.82rem',
                              fontWeight: 900,
                              width: '100%',
                              justifyContent: 'center',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: isMobile ? 4 : 6
                            }}
                          >
                            {isReadingTask ? (
                              <>
                                <BookOpen size={isMobile ? 13 : 15} /> Okudum ✓
                              </>
                            ) : (
                              'Tamamla ✓'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* ── Celebratory Empty State ── */
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '2.5rem 1.25rem' : '3.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.35))',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
            }}>
              ✨
            </div>

            <h4 style={{
              margin: 0,
              fontSize: isMobile ? '1.15rem' : '1.35rem',
              fontWeight: 900,
              color: 'var(--color-text)'
            }}>
              Tebrikler! Telafi Havuzun Tertemiz 🎉
            </h4>

            <p style={{
              margin: 0,
              maxWidth: 480,
              fontSize: '0.86rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
              fontWeight: 600
            }}>
              Geçmiş günlerden kalan hiçbir gecikmiş görevin veya eksik ödevin bulunmuyor. Harika bir disiplinle ilerliyorsun!
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 10,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {onNavigateTasks && (
                <button
                  type="button"
                  onClick={onNavigateTasks}
                  className="game-btn-3d game-btn-primary"
                  style={{
                    borderRadius: 14,
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.84rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>⚔️ Bugünkü Görevlere Git</span>
                  <ChevronRight size={15} />
                </button>
              )}

              {onNavigateBooks && (
                <button
                  type="button"
                  onClick={onNavigateBooks}
                  className="game-btn-3d"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text)',
                    borderRadius: 14,
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.84rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={15} />
                  <span>🎒 Kütüphaneyi İncele</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── PRINTABLE TELAFİ / CATCH-UP TASKS DOCUMENT (PORTAL DIRECTLY TO BODY FOR FLAWLESS MULTI-PAGE PRINTING) ── */}
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
                  displayTitle = displayTitle.replace(new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s\—\-\:\/]+/, '').trim();
                }

                if (!displayTitle || /^(ödev|görev|test|sınav|kitap testi|telafi görevi)$/i.test(displayTitle.trim()) || (rawBook && displayTitle.toLowerCase() === rawBook.toLowerCase())) {
                  if (task.testName && !/^(ödev|görev|test|sınav|kitap testi)$/i.test(task.testName.trim()) && task.testName.toLowerCase() !== rawBook.toLowerCase()) {
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
