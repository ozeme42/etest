import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Layers,
  Hash,
  Sparkles,
  BookOpen,
  Plus,
  Minus,
  Check,
  Zap,
  RotateCcw,
  Flame,
  ArrowRight,
  Bookmark,
  Target,
  FileText
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useReading } from '../../context/ReadingContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isStandardOrMixedBook } from '../../utils/testResolver';

export const TASK_TYPES = [
  { id: 'konu',   label: 'Konu Çalışması', icon: '📖', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: '#818cf8', glow: 'rgba(99, 102, 241, 0.35)' },
  { id: 'soru',   label: 'Soru Çözme',     icon: '✏️', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: '#34d399', glow: 'rgba(16, 185, 129, 0.35)' },
  { id: 'kitap',  label: 'Kitap Takibi (Soru Bankası)', icon: '📚', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: '#22d3ee', glow: 'rgba(6, 182, 212, 0.35)' },
  { id: 'okuma',  label: 'Kitap Okuma',    icon: '📖', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: '#f472b6', glow: 'rgba(236, 72, 153, 0.35)' },
  { id: 'deneme', label: 'Deneme Sınavı',   icon: '🎯', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#fbbf24', glow: 'rgba(245, 158, 11, 0.35)' },
  { id: 'tekrar', label: 'Tekrar',          icon: '🔄', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: '#a78bfa', glow: 'rgba(139, 92, 246, 0.35)' },
  { id: 'diger',  label: 'Diğer Hedef',     icon: '✨', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: '#c084fc', glow: 'rgba(168, 85, 247, 0.35)' },
];

export const DAYS = [
  { key: 'Pzt', short: 'Pzt', long: 'Pazartesi' },
  { key: 'Sal', short: 'Sal', long: 'Salı' },
  { key: 'Çrş', short: 'Çrş', long: 'Çarşamba' },
  { key: 'Prş', short: 'Prş', long: 'Perşembe' },
  { key: 'Cum', short: 'Cum', long: 'Cuma' },
  { key: 'Cts', short: 'Cts', long: 'Cumartesi' },
  { key: 'Paz', short: 'Paz', long: 'Pazar' },
];

const DEFAULT_SUBJECTS = [
  'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler',
  'İnkılap Tarihi', 'İngilizce', 'Din Kültürü', 'Fizik', 'Kimya',
  'Biyoloji', 'Tarih', 'Coğrafya', 'Geometri', 'Felsefe'
];

// 1-Click Smart Presets
const SMART_PRESETS = [
  {
    id: 'mat_soru',
    label: '🚀 30 dk Matematik Soru',
    taskType: 'soru',
    subject: 'Matematik',
    hours: '30 dk',
    questionCount: '20'
  },
  {
    id: 'kitap_oku',
    label: '📖 20 Sayfa Kitap Okuma',
    taskType: 'okuma',
    subject: 'Kitap Okuma',
    hours: '30 dk',
    pageCount: '20 Sayfa'
  },
  {
    id: 'fen_tekrar',
    label: '🧪 Fen Konu Tekrarı',
    taskType: 'tekrar',
    subject: 'Fen Bilimleri',
    hours: '40 dk',
    questionCount: '15'
  },
  {
    id: 'genel_deneme',
    label: '🎯 Genel Deneme Sınavı',
    taskType: 'deneme',
    subject: 'Deneme Sınavı',
    hours: '135 dk',
    questionCount: '90'
  },
  {
    id: 'turkce_paragraf',
    label: '📚 20 Paragraf Sorusu',
    taskType: 'soru',
    subject: 'Türkçe',
    hours: '25 dk',
    questionCount: '20'
  },
  {
    id: 'ingilizce_kelime',
    label: '💬 20 dk İngilizce Tekrar',
    taskType: 'tekrar',
    subject: 'İngilizce',
    hours: '20 dk'
  }
];

const QUICK_DURATION_CHIPS = ['20 dk', '30 dk', '45 dk', '1 saat', '1.5 saat', '2 saat'];
const QUICK_QUESTION_CHIPS = ['10', '15', '20', '30', '40', '50'];
const QUICK_PAGE_CHIPS = ['10 Sayfa', '15 Sayfa', '20 Sayfa', '30 Sayfa', '50 Sayfa'];
const QUICK_TIME_SLOTS = [
  { label: '🌅 Sabah (09:00)', start: '09:00', end: '10:00' },
  { label: '☀️ Öğle (14:00)', start: '14:00', end: '15:00' },
  { label: '🌆 Akşam (19:00)', start: '19:00', end: '20:00' },
  { label: '🌙 Gece (21:00)', start: '21:00', end: '22:00' }
];

export const getTodayKey = () => {
  const dayIdx = new Date().getDay(); // 0 is Sun, 1 is Mon...
  return dayIdx === 0 ? 'Paz' : DAYS[dayIdx - 1].key;
};

export const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function AddTaskModal({
  dayKey,
  onAdd,
  onEdit,
  initialItem = null,
  onClose,
  topicPool = [],
  isDark: propIsDark = null
}) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = propIsDark !== null ? propIsDark : themeIsDark;
  const isMobile = useMediaQuery('(max-width: 768px)');

  const todayKey = useMemo(() => getTodayKey(), []);
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey || initialItem?.dayKey || todayKey);
  const [taskType, setTaskType] = useState(initialItem?.taskType || 'konu');
  const [subject, setSubject] = useState(initialItem?.subject || '');
  const [unit, setUnit] = useState(initialItem?.unit || '');
  const [testName, setTestName] = useState(initialItem?.testName || '');
  const [topic, setTopic] = useState(initialItem?.topic || '');
  const [hours, setHours] = useState(initialItem?.hours || '');
  const [questionCount, setQuestionCount] = useState(initialItem?.questionCount || '');
  const [pageCount, setPageCount] = useState(initialItem?.pageCount || '');
  const [pageRange, setPageRange] = useState(initialItem?.pageRange || '');
  const [bookName, setBookName] = useState(initialItem?.bookName || initialItem?.bookTitle || '');
  const [selectedBookId, setSelectedBookId] = useState(initialItem?.bookId || '');
  const [selectedReadingBookId, setSelectedReadingBookId] = useState(initialItem?.readingBookId || '');
  const [selectedTestId, setSelectedTestId] = useState(initialItem?.testId || initialItem?.bookTestId || '');
  const [note, setNote] = useState(initialItem?.note || '');
  const [startTime, setStartTime] = useState(initialItem?.startTime || '');
  const [endTime, setEndTime] = useState(initialItem?.endTime || '');

  const trackedBooksData = useTrackedBooks();
  const books = trackedBooksData?.books || [];
  const bookTests = trackedBooksData?.bookTests || [];

  let readingTrackerData = null;
  try {
    readingTrackerData = useReading();
  } catch {}
  const readingBooks = readingTrackerData?.books || [];
  const activeReadingBooks = useMemo(() => {
    return readingBooks.filter(b => b.status === 'reading' || b.status === 'to-read');
  }, [readingBooks]);

  const initialRepeatMode = initialItem?.repeatType || (initialItem?.isDaily ? 'daily' : (initialItem?.isRecurring === false ? 'none' : 'weekly'));
  const [repeatType, setRepeatType] = useState(initialRepeatMode);
  const [repeatEndDate, setRepeatEndDate] = useState(initialItem?.repeatEndDate || '');

  const selectedType = useMemo(() => TASK_TYPES.find(t => t.id === taskType) || TASK_TYPES[0], [taskType]);

  const availableBookTests = useMemo(() => {
    if (!selectedBookId) return [];
    return bookTests.filter(t => String(t.bookId) === String(selectedBookId) || String(t.book_id) === String(selectedBookId));
  }, [selectedBookId, bookTests]);

  const poolTopicsForSubject = useMemo(() => {
    if (!subject) return [];
    const found = (topicPool || []).find(s => s.name === subject);
    return found ? found.topics.map(t => t.name) : [];
  }, [subject, topicPool]);

  const allSubjects = useMemo(() => {
    const poolSubjects = (topicPool || []).map(s => s.name);
    return [...new Set([...poolSubjects, ...DEFAULT_SUBJECTS])];
  }, [topicPool]);

  const canAdd = useMemo(() => {
    if (taskType === 'okuma') return (bookName && bookName.trim().length > 0) || (pageCount && pageCount.trim().length > 0) || (note && note.trim().length > 0) || (subject && subject.trim().length > 0);
    if (taskType === 'kitap') return bookName.trim().length > 0 || testName.trim().length > 0 || subject.trim().length > 0;
    if (taskType === 'deneme') return subject.trim().length > 0 || note.trim().length > 0;
    if (taskType === 'diger') return note.trim().length > 0 || subject.trim().length > 0;
    return subject.trim().length > 0;
  }, [taskType, bookName, testName, subject, note, pageCount]);

  // Handle Preset Selection
  const applyPreset = (preset) => {
    setTaskType(preset.taskType);
    if (preset.subject) setSubject(preset.subject);
    if (preset.hours) setHours(preset.hours);
    if (preset.questionCount) setQuestionCount(preset.questionCount);
    if (preset.pageCount) setPageCount(preset.pageCount);
  };

  // Stepper handlers for questions & minutes
  const handleQuestionStepper = (delta) => {
    const current = parseInt(questionCount, 10) || 0;
    const next = Math.max(0, current + delta);
    setQuestionCount(next > 0 ? String(next) : '');
  };

  const handleSave = () => {
    if (!canAdd) return;

    const isRecurring = repeatType !== 'none';
    const isDaily = repeatType === 'daily';

    const isReading = taskType === 'okuma';
    const resolvedSubject = isReading ? (subject.trim() || 'Kitap Okuma') : subject.trim();
    const resolvedTopic = isReading
      ? (bookName.trim() ? `${bookName.trim()}${pageRange.trim() ? ` (${pageRange.trim()})` : ''}` : (pageRange.trim() || 'Kitap Okuma'))
      : (unit.trim() && testName.trim()
        ? `${unit.trim()} — ${testName.trim()}`
        : (unit.trim() || testName.trim() || topic.trim()));

    const itemData = {
      id: initialItem?.id || uid(),
      taskType,
      subject: resolvedSubject,
      unit: isReading ? '' : unit.trim(),
      testName: isReading ? '' : testName.trim(),
      topic: resolvedTopic,
      hours: hours.trim(),
      questionCount: isReading ? '' : questionCount.trim(),
      pageCount: pageCount.trim(),
      pageRange: pageRange.trim(),
      bookName: bookName.trim(),
      bookTitle: bookName.trim(),
      bookId: isReading ? null : (selectedBookId || null),
      readingBookId: selectedReadingBookId || null,
      testId: isReading ? null : (selectedTestId || null),
      bookTestId: isReading ? null : (selectedTestId || null),
      note: note.trim(),
      startTime,
      endTime,
      isRecurring,
      repeatType,
      isDaily,
      repeatEndDate: repeatEndDate || null,
      createdYMD: initialItem?.createdYMD || new Date().toISOString().slice(0, 10),
      done: initialItem?.done || false,
    };

    if (initialItem?.id && onEdit) {
      onEdit(itemData, selectedDayKey);
    } else if (onAdd) {
      onAdd(itemData, selectedDayKey);
    }
    onClose();
  };

  // Dynamic Aura Theme Styles
  const primaryAura = selectedType.color;
  const auraGlow = selectedType.glow;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: isDark ? 'rgba(3, 7, 18, 0.85)' : 'rgba(15, 23, 42, 0.68)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: isMobile ? 0 : '1rem'
    }}>
      <div style={{
        background: isDark ? 'linear-gradient(180deg, #131728 0%, #0d101d 100%)' : '#ffffff',
        borderRadius: isMobile ? '1.85rem 1.85rem 0 0' : '1.75rem',
        width: '100%',
        maxWidth: isMobile ? '100%' : 620,
        boxShadow: isDark
          ? `0 25px 65px -10px rgba(0,0,0,0.85), 0 0 40px ${auraGlow}, 0 0 0 1px rgba(255,255,255,0.12)`
          : `0 25px 65px -10px rgba(0,0,0,0.25), 0 0 30px ${auraGlow}, 0 0 0 1px rgba(0,0,0,0.06)`,
        border: isDark ? `1.5px solid ${primaryAura}50` : '1.5px solid #e2e8f0',
        color: isDark ? '#f8fafc' : '#0f172a',
        animation: isMobile ? 'sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        maxHeight: isMobile ? '94vh' : '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Dynamic Neon Beam along top border */}
        <div style={{
          width: '100%',
          height: 3.5,
          background: `linear-gradient(90deg, ${primaryAura}, #a855f7, #3b82f6)`,
          transition: 'background 0.3s ease'
        }} />

        <style>{`
          @keyframes sheetSlideUp {
            from { transform: translateY(100%); opacity: 0.8; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes modalPop {
            from { transform: scale(0.95) translateY(12px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(150, 150, 150, 0.25);
            border-radius: 99px;
          }
        `}</style>

        {/* Mobile Drag Indicator Bar */}
        {isMobile && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 3 }}>
            <div style={{ width: 42, height: 4.5, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.25)' : '#cbd5e1' }} />
          </div>
        )}

        {/* Modal Header */}
        <div style={{
          padding: isMobile ? '0.75rem 1.15rem 0.75rem' : '1.15rem 1.6rem 0.95rem',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${primaryAura}, ${primaryAura}cc)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                color: '#fff',
                boxShadow: `0 4px 14px ${auraGlow}`
              }}>
                {selectedType.icon}
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                  {initialItem?.id ? 'Görevi Düzenle' : 'Akıllı Görev Oluşturucu'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 650, marginTop: 1, display: 'block' }}>
                  Çalışma takvimine hedef belirle, odaklan ve XP kazan!
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Kapat"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1-Click Smart Quick Presets Bar */}
        <div style={{
          padding: isMobile ? '0.5rem 1.15rem' : '0.65rem 1.6rem',
          background: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(248, 250, 252, 0.9)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          flexShrink: 0
        }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 900,
            color: primaryAura,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Sparkles size={12} color={primaryAura} /> Hızlı Şablonlar:
          </span>
          {SMART_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              style={{
                padding: '3px 9px',
                borderRadius: 99,
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0',
                background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                color: isDark ? 'rgba(255,255,255,0.85)' : '#334155',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Modal Body - Scrollable */}
        <div
          className="custom-scrollbar"
          style={{
            padding: isMobile ? '1rem 1.15rem 1.5rem' : '1.25rem 1.6rem',
            overflowY: 'auto',
            flex: 1,
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* 1. HANGİ GÜN? - 7-Day Visual Timeline Strip */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Calendar size={14} color={primaryAura} /> 1. Hangi Gün Yapılacak?
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6
            }}>
              {DAYS.map(d => {
                const isSelected = selectedDayKey === d.key;
                const isToday = todayKey === d.key;

                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDayKey(d.key)}
                    style={{
                      padding: '0.6rem 0.2rem',
                      borderRadius: 12,
                      border: isSelected
                        ? `2px solid ${primaryAura}`
                        : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0'),
                      background: isSelected
                        ? `linear-gradient(135deg, ${primaryAura}, #4f46e5)`
                        : (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                      color: isSelected
                        ? '#ffffff'
                        : (isDark ? 'rgba(255,255,255,0.85)' : '#334155'),
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      boxShadow: isSelected ? `0 4px 14px ${auraGlow}` : 'none',
                      transition: 'all 0.16s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>{d.short}</div>
                    {isToday && (
                      <div style={{
                        fontSize: '0.56rem',
                        fontWeight: 900,
                        color: isSelected ? '#ffffff' : '#f59e0b',
                        marginTop: 1
                      }}>
                        Bugün
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. GÖREV TİPİ - 7 Futuristic Category Cards */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Layers size={14} color={primaryAura} /> 2. Görev Tipi
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(125px, 1fr))', gap: '0.55rem' }}>
              {TASK_TYPES.map(t => {
                const isSelected = taskType === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTaskType(t.id);
                      if (t.id === 'okuma') {
                        if (!subject) setSubject('Kitap Okuma');
                        if (!hours) setHours('30 dk');
                        if (!pageCount) setPageCount('20 Sayfa');
                        setSelectedTestId('');
                        setSelectedBookId('');
                      } else if (t.id === 'soru') {
                        if (!questionCount) setQuestionCount('20');
                        if (!hours) setHours('30 dk');
                      }
                    }}
                    style={{
                      padding: '0.75rem 0.5rem',
                      border: isSelected ? `2px solid ${t.color}` : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #e8ecf0'),
                      borderRadius: 14,
                      background: isSelected
                        ? (isDark ? `${t.color}30` : t.bg)
                        : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.16s ease',
                      fontFamily: 'inherit',
                      boxShadow: isSelected ? `0 4px 16px ${t.glow}` : 'none',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '1.35rem', marginBottom: 3 }}>{t.icon}</div>
                    <div style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: isSelected ? (isDark ? '#ffffff' : t.color) : (isDark ? 'rgba(255,255,255,0.75)' : '#64748b'),
                      lineHeight: 1.25
                    }}>
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. DİNAMİK FORM ALANLARI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* ── Kitap Okuma Modu ── */}
            {taskType === 'okuma' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <BookOpen size={13} color="#ec4899" /> OKUNACAK KİTAP *
                  </label>
                  {activeReadingBooks.length > 0 && (
                    <select
                      value={selectedReadingBookId}
                      onChange={e => {
                        const bId = e.target.value;
                        setSelectedReadingBookId(bId);
                        if (bId) {
                          const bObj = activeReadingBooks.find(b => String(b.id) === String(bId));
                          if (bObj) {
                            setBookName(bObj.title || '');
                            if (bObj.category) setSubject(bObj.category);
                            if (!hours) setHours('30 dk');
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.95rem',
                        border: isDark ? '1.5px solid rgba(236,72,153,0.35)' : '1.5px solid #fbcfe8',
                        borderRadius: 12,
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        outline: 'none',
                        background: isDark ? 'rgba(236,72,153,0.08)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        marginBottom: 6
                      }}
                    >
                      <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Okuma Listemden Kitap Seç --</option>
                      {activeReadingBooks.map(b => (
                        <option key={b.id} value={b.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                          📚 {b.title} {b.author ? `— ${b.author}` : ''} ({b.currentPage || 0}/{b.totalPages || 0} sf)
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    value={bookName}
                    onChange={e => {
                      setBookName(e.target.value);
                      if (selectedReadingBookId) setSelectedReadingBookId('');
                    }}
                    placeholder="Veya serbest kitap adı yazın (Örn: Beyaz Diş, Küçük Prens)..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                </div>

                {/* Okunacak Sayfa Sayısı */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Bookmark size={13} color="#ec4899" /> HEDEF OKUNACAK SAYFA SAYISI
                    </label>
                    {pageCount && (
                      <span style={{ fontSize: '0.7rem', color: '#ec4899', fontWeight: 800 }}>✓ {pageCount}</span>
                    )}
                  </div>
                  <input
                    value={pageCount}
                    onChange={e => setPageCount(e.target.value)}
                    placeholder="Örn: 20 sayfa, 30 sayfa..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                  {/* Hızlı Sayfa Çipleri */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    {QUICK_PAGE_CHIPS.map(pText => (
                      <button
                        key={pText}
                        type="button"
                        onClick={() => setPageCount(pText)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 99,
                          border: pageCount === pText ? '1.5px solid #ec4899' : '1px solid var(--color-border)',
                          background: pageCount === pText ? 'rgba(236,72,153,0.2)' : 'var(--color-surface-hover)',
                          color: pageCount === pText ? '#ec4899' : 'var(--color-text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        {pText}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sayfa / Bölüm Aralığı */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                    SAYFA / BÖLÜM ARALIĞI (İSTEĞE BAĞLI)
                  </label>
                  <input
                    value={pageRange}
                    onChange={e => setPageRange(e.target.value)}
                    placeholder="Örn: Sayfa 40 - 65 veya 3. Bölüm..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                </div>
              </div>
            ) : taskType === 'kitap' ? (
              /* ── Kitap Takibi (Soru Bankası) Modu ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 900, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <BookOpen size={13} color="#06b6d4" /> KİTAP SEÇİN VEYA ADINI GİRİN *
                  </label>
                  {books.filter(b => isStandardOrMixedBook(b)).length > 0 && (
                    <select
                      value={selectedBookId}
                      onChange={e => {
                        const bId = e.target.value;
                        setSelectedBookId(bId);
                        if (bId) {
                          const bObj = books.find(b => String(b.id) === String(bId));
                          if (bObj) {
                            setBookName(bObj.title || '');
                            if (bObj.subject) setSubject(bObj.subject);
                            setSelectedTestId('');
                            setTestName('');
                            setUnit('');
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.95rem',
                        border: isDark ? '1.5px solid rgba(6,182,212,0.35)' : '1.5px solid #a5f3fc',
                        borderRadius: 12,
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        outline: 'none',
                        background: isDark ? 'rgba(6,182,212,0.08)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        marginBottom: 6
                      }}
                    >
                      <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Kayıtlı Soru Bankalarımdan Seç --</option>
                      {books.filter(b => isStandardOrMixedBook(b)).map(b => (
                        <option key={b.id} value={b.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                          📖 {b.title} {b.publisher ? `(${b.publisher})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    value={bookName}
                    onChange={e => setBookName(e.target.value)}
                    placeholder="Veya serbest soru bankası adı yazın..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                </div>

                {/* Ders Adı */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                    DERS ADI *
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Ders seçin --</option>
                    {allSubjects.map((s, idx) => (
                      <option key={`${s}_${idx}`} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Test Adı */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                    TEST / HEDEF *
                  </label>
                  {availableBookTests.length > 0 && (
                    <select
                      value={selectedTestId}
                      onChange={e => {
                        const tId = e.target.value;
                        setSelectedTestId(tId);
                        if (tId) {
                          const tObj = availableBookTests.find(t => String(t.id) === String(tId));
                          if (tObj) {
                            setTestName(tObj.name || tObj.title || '');
                            if (tObj.unit || tObj.unitName) setUnit(tObj.unit || tObj.unitName);
                            if (tObj.subject || tObj.subjectName) setSubject(tObj.subject || tObj.subjectName);
                            if (tObj.questionCount) setQuestionCount(String(tObj.questionCount));
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.95rem',
                        border: isDark ? '1.5px solid rgba(6,182,212,0.35)' : '1.5px solid #a5f3fc',
                        borderRadius: 12,
                        fontSize: '0.88rem',
                        outline: 'none',
                        background: isDark ? 'rgba(6,182,212,0.08)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        marginBottom: 6
                      }}
                    >
                      <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Kitabın Testlerinden Seç --</option>
                      {availableBookTests.map(t => (
                        <option key={t.id} value={t.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                          🎯 {t.name || t.title} {t.questionCount ? `(${t.questionCount} Soru)` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    placeholder="Örn: 1. Fasikül Test 1, Beceri Temelli Test 2..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                </div>
              </div>
            ) : (
              /* ── Standart Modlar: Konu, Soru, Tekrar, Deneme, Diğer ── */
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                  DERS {taskType !== 'diger' && '*'}
                </label>
                <select
                  value={subject}
                  onChange={e => { setSubject(e.target.value); setTopic(''); }}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: 12,
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Ders seçin --</option>
                  {allSubjects.map((s, idx) => (
                    <option key={`${s}_${idx}`} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>
                  ))}
                </select>

                {/* Hızlı Ders Seçim Çipleri */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'].map(sName => (
                    <button
                      key={sName}
                      type="button"
                      onClick={() => setSubject(sName)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 99,
                        border: subject === sName ? `1.5px solid ${primaryAura}` : '1px solid var(--color-border)',
                        background: subject === sName ? `${primaryAura}20` : 'var(--color-surface-hover)',
                        color: subject === sName ? primaryAura : 'var(--color-text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {sName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Konu Alanı */}
            {['konu', 'soru', 'tekrar'].includes(taskType) && subject && (
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                  KONU / ALT BAŞLIK
                </label>
                {poolTopicsForSubject.length > 0 ? (
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Konu seçin (isteğe bağlı) --</option>
                    {poolTopicsForSubject.map((t, idx) => (
                      <option key={`${t}_${idx}`} value={t} style={{ background: '#0f172a', color: '#ffffff' }}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Örn: Kesirler, Noktalama İşaretleri, Kuvvet..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                )}
              </div>
            )}

            {/* Soru Sayısı & Hızlı Çipler & Stepper */}
            {(taskType === 'soru' || taskType === 'kitap' || taskType === 'deneme') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Hash size={13} color="#10b981" /> HEDEF SORU SAYISI
                  </label>
                  {questionCount && (
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>✓ {questionCount} Soru</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleQuestionStepper(-5)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    value={questionCount}
                    onChange={e => setQuestionCount(e.target.value)}
                    placeholder="Örn: 20 soru, 1 test..."
                    style={{
                      flex: 1,
                      padding: '0.7rem 0.95rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      textAlign: 'center',
                      fontWeight: 700
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleQuestionStepper(5)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Hızlı Soru Çipleri */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {QUICK_QUESTION_CHIPS.map(qVal => (
                    <button
                      key={qVal}
                      type="button"
                      onClick={() => setQuestionCount(qVal)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 99,
                        border: questionCount === qVal ? '1.5px solid #10b981' : '1px solid var(--color-border)',
                        background: questionCount === qVal ? 'rgba(16,185,129,0.2)' : 'var(--color-surface-hover)',
                        color: questionCount === qVal ? '#10b981' : 'var(--color-text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {qVal} Soru
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Süre / Hedef & Hızlı Süre Çipleri */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 900, color: primaryAura, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} color={primaryAura} /> ÇALIŞMA SÜRESİ / HEDEF
                </label>
                {hours && (
                  <span style={{ fontSize: '0.7rem', color: primaryAura, fontWeight: 800 }}>✓ {hours}</span>
                )}
              </div>
              <input
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder={taskType === 'okuma' ? 'Örn: 30 dk veya 45 dk...' : (taskType === 'kitap' ? 'Örn: 40 dk, 1 saat...' : 'Örn: 45 dk, 1.5 saat...')}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.95rem',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a'
                }}
              />
              {/* Hızlı Süre Çipleri */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {QUICK_DURATION_CHIPS.map(dText => (
                  <button
                    key={dText}
                    type="button"
                    onClick={() => setHours(dText)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 99,
                      border: hours === dText ? `1.5px solid ${primaryAura}` : '1px solid var(--color-border)',
                      background: hours === dText ? `${primaryAura}20` : 'var(--color-surface-hover)',
                      color: hours === dText ? primaryAura : 'var(--color-text-muted)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {dText}
                  </button>
                ))}
              </div>
            </div>

            {/* Saat Aralığı */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                SAAT ARALIĞI (İSTEĞE BAĞLI)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a'
                  }}
                />
                <span style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontWeight: 900 }}>→</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a'
                  }}
                />
              </div>
              {/* Hızlı Saat Çipleri */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {QUICK_TIME_SLOTS.map(slot => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => { setStartTime(slot.start); setEndTime(slot.end); }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 8,
                      border: (startTime === slot.start && endTime === slot.end) ? `1.5px solid ${primaryAura}` : '1px solid var(--color-border)',
                      background: (startTime === slot.start && endTime === slot.end) ? `${primaryAura}20` : 'var(--color-surface-hover)',
                      color: (startTime === slot.start && endTime === slot.end) ? primaryAura : 'var(--color-text-muted)',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ekstra Not */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                NOT / HATIRLATMA (İSTEĞE BAĞLI)
              </label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Örn: Yanlış yaptığın soruların çözümlerini izle..."
                style={{
                  width: '100%',
                  padding: '0.7rem 0.95rem',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a'
                }}
              />
            </div>

            {/* Tekrar Düzeni ve Bitiş Tarihi */}
            <div style={{
              background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc',
              padding: '0.95rem 1.15rem',
              borderRadius: 14,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
            }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TEKRAR DÜZENİ
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.65rem' }}>
                {[
                  { id: 'weekly', label: '📅 Her Hafta', desc: 'Sadece bu gün' },
                  { id: 'daily', label: '🔁 Her Gün', desc: 'Haftanın 7 günü' },
                  { id: 'none', label: '🚫 Tek Sefer', desc: 'Sadece bu hafta' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setRepeatType(mode.id)}
                    style={{
                      padding: '0.6rem 0.35rem',
                      border: repeatType === mode.id ? `2px solid ${primaryAura}` : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1'),
                      borderRadius: 10,
                      background: repeatType === mode.id ? (isDark ? `${primaryAura}25` : '#eef2ff') : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                      color: repeatType === mode.id ? (isDark ? '#ffffff' : primaryAura) : (isDark ? 'rgba(255,255,255,0.7)' : '#475569'),
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{mode.label}</div>
                    <div style={{ fontSize: '0.62rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontWeight: 600, marginTop: 2 }}>{mode.desc}</div>
                  </button>
                ))}
              </div>

              {repeatType !== 'none' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569' }}>
                      BİTİŞ TARİHİ (İSTEĞE BAĞLI)
                    </label>
                    {repeatEndDate && (
                      <button
                        type="button"
                        onClick={() => setRepeatEndDate('')}
                        style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={repeatEndDate}
                    onChange={e => setRepeatEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 10,
                      fontSize: '0.84rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* 4. CANLI 3D GÖREV KARTI ÖNİZLEMESİ */}
          {canAdd && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: primaryAura, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={12} color={primaryAura} /> Canlı Görev Kartı Önizlemesi:
              </span>
              <div style={{
                padding: '0.85rem 1.15rem',
                background: isDark ? 'rgba(26, 30, 54, 0.9)' : '#ffffff',
                borderRadius: 14,
                border: `1.5px solid ${primaryAura}60`,
                borderLeft: `5px solid ${primaryAura}`,
                boxShadow: `0 4px 18px ${auraGlow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  border: `2px solid ${primaryAura}`,
                  background: `${primaryAura}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: primaryAura,
                  flexShrink: 0
                }}>
                  <Check size={16} strokeWidth={3} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      color: primaryAura,
                      background: `${primaryAura}20`,
                      border: `1px solid ${primaryAura}40`,
                      padding: '2px 7px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span>{selectedType.icon}</span>
                      <span>{taskType === 'okuma' ? 'Kitap Okuma' : (subject || 'Ders')}</span>
                    </span>

                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {taskType === 'kitap'
                        ? (testName || bookName || 'Kitap Testi')
                        : taskType === 'okuma'
                        ? (bookName || 'Kitap Okuma')
                        : (topic || note || `${subject} Çalışması`)}
                    </span>

                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '1.5px 6px',
                      borderRadius: 99,
                      background: 'rgba(99,102,241,0.15)',
                      color: '#6366f1'
                    }}>
                      {DAYS.find(d => d.key === selectedDayKey)?.long}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 650, marginTop: 3 }}>
                    {questionCount && <span>📝 {questionCount} Soru • </span>}
                    {pageCount && <span>📄 {pageCount} • </span>}
                    {hours && <span>⏱️ {hours} • </span>}
                    {startTime && <span>🕒 {startTime}{endTime ? ` - ${endTime}` : ''} • </span>}
                    <span>⚡ +25 XP</span>
                  </div>
                </div>

                <div style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${primaryAura}, #4f46e5)`,
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  whiteSpace: 'nowrap'
                }}>
                  {taskType === 'okuma' ? 'Okudum' : taskType === 'soru' || taskType === 'kitap' ? 'Çöz & Başla' : 'Tamamla'}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer Action Bar */}
        <div style={{
          padding: isMobile ? '0.75rem 1.15rem 1rem' : '1.1rem 1.6rem',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          gap: '0.75rem',
          background: isDark ? 'rgba(15, 18, 32, 0.96)' : '#ffffff',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: isMobile ? '0.8rem' : '0.9rem',
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              border: 'none',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
              fontFamily: 'inherit'
            }}
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canAdd}
            style={{
              flex: 2,
              padding: isMobile ? '0.8rem' : '0.9rem',
              background: canAdd
                ? `linear-gradient(135deg, ${primaryAura}, #4f46e5)`
                : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
              border: 'none',
              borderRadius: 12,
              fontWeight: 900,
              fontSize: '0.94rem',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              color: canAdd ? '#ffffff' : '#94a3b8',
              boxShadow: canAdd ? `0 6px 20px ${auraGlow}` : 'none',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {initialItem?.id ? (
              <>
                <span>✏️ Değişiklikleri Kaydet</span>
              </>
            ) : (
              <>
                <Plus size={18} strokeWidth={3} />
                <span>Görevi Programıma Ekle</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
