import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowLeft,
  Bookmark,
  Target,
  FileText,
  CheckCircle2,
  ChevronRight,
  Award,
  BookCheck,
  Compass
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useReading } from '../../context/ReadingContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isStandardOrMixedBook } from '../../utils/testResolver';

export const TASK_TYPES = [
  {
    id: 'soru',
    label: 'Soru Çözme',
    desc: 'Test ve soru pratiği yap',
    icon: '✏️',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#34d399',
    glow: 'rgba(16, 185, 129, 0.35)'
  },
  {
    id: 'konu',
    label: 'Konu Çalışması',
    desc: 'Ders notları oku ve video izle',
    icon: '📖',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: '#818cf8',
    glow: 'rgba(99, 102, 241, 0.35)'
  },
  {
    id: 'kitap',
    label: 'Kitap Takibi',
    desc: 'Soru bankası testlerini bitir',
    icon: '📚',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    border: '#22d3ee',
    glow: 'rgba(6, 182, 212, 0.35)'
  },
  {
    id: 'okuma',
    label: 'Kitap Okuma',
    desc: 'Roman, hikaye ve serbest okuma',
    icon: '📖',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    border: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.35)'
  },
  {
    id: 'deneme',
    label: 'Deneme Sınavı',
    desc: 'Süre ve net odaklı deneme',
    icon: '🎯',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.35)'
  },
  {
    id: 'tekrar',
    label: 'Tekrar & Pekiştirme',
    desc: 'Geçmiş konuları tazele',
    icon: '🔄',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: '#a78bfa',
    glow: 'rgba(139, 92, 246, 0.35)'
  },
  {
    id: 'diger',
    label: 'Özel Hedef',
    desc: 'Kişisel çalışma veya proje',
    icon: '✨',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.35)'
  },
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

const POPULAR_SUBJECTS = [
  { name: 'Matematik', icon: '📐', color: '#3b82f6' },
  { name: 'Türkçe', icon: '📖', color: '#f43f5e' },
  { name: 'Fen Bilimleri', icon: '🧪', color: '#10b981' },
  { name: 'Sosyal Bilgiler', icon: '🌍', color: '#f59e0b' },
  { name: 'İngilizce', icon: '💬', color: '#8b5cf6' },
  { name: 'Din Kültürü', icon: '✨', color: '#06b6d4' }
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
    label: '🧪 40 dk Fen Tekrarı',
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

  // Step Management: 1: Tür & Gün, 2: Ders & Kaynak, 3: Hedef & Detaylar (ve Canlı Önizleme)
  const [currentStep, setCurrentStep] = useState(initialItem?.id ? 2 : 1);

  const todayKey = useMemo(() => getTodayKey(), []);
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey || initialItem?.dayKey || todayKey);
  const [taskType, setTaskType] = useState(initialItem?.taskType || 'soru');
  const [subject, setSubject] = useState(initialItem?.subject || '');
  const [unit, setUnit] = useState(initialItem?.unit || '');
  const [testName, setTestName] = useState(initialItem?.testName || '');
  const [topic, setTopic] = useState(initialItem?.topic || '');
  const [hours, setHours] = useState(initialItem?.hours || '30 dk');
  const [questionCount, setQuestionCount] = useState(initialItem?.questionCount || '20');
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

  // Validation per step
  const isStep1Valid = Boolean(selectedDayKey && taskType);
  const isStep2Valid = useMemo(() => {
    if (taskType === 'okuma') {
      return Boolean(bookName?.trim() || selectedReadingBookId || subject?.trim());
    }
    if (taskType === 'kitap') {
      return Boolean(selectedBookId || bookName?.trim() || subject?.trim());
    }
    if (taskType === 'deneme' || taskType === 'diger') {
      return Boolean(subject?.trim() || note?.trim());
    }
    return Boolean(subject?.trim());
  }, [taskType, bookName, selectedReadingBookId, selectedBookId, subject, note]);

  const canAdd = useMemo(() => {
    if (taskType === 'okuma') return (bookName && bookName.trim().length > 0) || (pageCount && pageCount.trim().length > 0) || (note && note.trim().length > 0) || (subject && subject.trim().length > 0);
    if (taskType === 'kitap') return Boolean(bookName?.trim().length > 0 || testName?.trim().length > 0 || subject?.trim().length > 0 || selectedBookId);
    if (taskType === 'deneme') return Boolean(subject?.trim().length > 0 || note?.trim().length > 0);
    if (taskType === 'diger') return Boolean(note?.trim().length > 0 || subject?.trim().length > 0);
    return Boolean(subject?.trim().length > 0);
  }, [taskType, bookName, testName, subject, note, pageCount, selectedBookId]);

  // Apply Smart Preset & Jump straight to Step 3 for quick review & save
  const applyPreset = (preset) => {
    setTaskType(preset.taskType);
    if (preset.subject) setSubject(preset.subject);
    if (preset.hours) setHours(preset.hours);
    if (preset.questionCount) setQuestionCount(preset.questionCount);
    if (preset.pageCount) setPageCount(preset.pageCount);
    setCurrentStep(3);
  };

  // Stepper handlers
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

  // Dynamic Theme Colors
  const primaryAura = selectedType.color;
  const auraGlow = selectedType.glow;

  // Step Definitions for the Wizard Progress Bar
  const STEPS = [
    { num: 1, label: 'Tür & Gün', icon: '🎯' },
    { num: 2, label: 'Ders & Kaynak', icon: '📚' },
    { num: 3, label: 'Hedef & Önizleme', icon: '⚡' }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: isDark ? 'rgba(3, 7, 18, 0.86)' : 'rgba(15, 23, 42, 0.68)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
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
        maxWidth: isMobile ? '100%' : 640,
        boxShadow: isDark
          ? `0 25px 70px -10px rgba(0,0,0,0.85), 0 0 45px ${auraGlow}, 0 0 0 1px rgba(255,255,255,0.12)`
          : `0 25px 70px -10px rgba(0,0,0,0.25), 0 0 35px ${auraGlow}, 0 0 0 1px rgba(0,0,0,0.06)`,
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
          @keyframes stepFade {
            from { opacity: 0; transform: translateX(8px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .wizard-step-content {
            animation: stepFade 0.22s ease-out;
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
          padding: isMobile ? '0.75rem 1.15rem 0.65rem' : '1.1rem 1.6rem 0.85rem',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}>
                  {initialItem?.id ? 'Görevi Düzenle' : 'Akıllı Görev Sihirbazı'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 650, marginTop: 1, display: 'block' }}>
                  {currentStep === 1 && 'Adım 1/3: Hedef gününü ve görev türünü belirle'}
                  {currentStep === 2 && 'Adım 2/3: Dersi veya kütüphanedeki kaynağı seç'}
                  {currentStep === 3 && 'Adım 3/3: Soru ve çalışma süreni belirle, anında onayla!'}
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

        {/* ── INTERACTIVE 3-STEP WIZARD PROGRESS BAR ── */}
        <div style={{
          padding: isMobile ? '0.65rem 1.15rem' : '0.85rem 1.6rem',
          background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(248, 250, 252, 0.95)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          flexShrink: 0
        }}>
          {STEPS.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <React.Fragment key={s.num}>
                {/* Step Pill Button */}
                <button
                  type="button"
                  onClick={() => {
                    // Allow navigating backward or forward if valid
                    if (s.num === 1) setCurrentStep(1);
                    else if (s.num === 2 && isStep1Valid) setCurrentStep(2);
                    else if (s.num === 3 && isStep1Valid && isStep2Valid) setCurrentStep(3);
                  }}
                  style={{
                    background: isCurrent
                      ? `linear-gradient(135deg, ${primaryAura}, #4f46e5)`
                      : isCompleted
                      ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7')
                      : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
                    border: isCurrent
                      ? `1.5px solid ${primaryAura}`
                      : isCompleted
                      ? '1.5px solid rgba(16, 185, 129, 0.4)'
                      : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'),
                    borderRadius: 99,
                    padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: isCurrent ? `0 4px 14px ${auraGlow}` : 'none',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    background: isCurrent
                      ? '#ffffff'
                      : isCompleted
                      ? '#10b981'
                      : (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'),
                    color: isCurrent
                      ? primaryAura
                      : isCompleted
                      ? '#ffffff'
                      : (isDark ? '#ffffff' : '#475569'),
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : s.num}
                  </span>
                  <span style={{
                    fontSize: isMobile ? '0.72rem' : '0.8rem',
                    fontWeight: isCurrent ? 900 : 700,
                    color: isCurrent
                      ? '#ffffff'
                      : isCompleted
                      ? (isDark ? '#6ee7b7' : '#15803d')
                      : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                    whiteSpace: 'nowrap'
                  }}>
                    {s.label}
                  </span>
                </button>

                {/* Connecting Line */}
                {idx < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 2,
                    margin: '0 8px',
                    background: currentStep > idx + 1
                      ? '#10b981'
                      : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                    transition: 'background 0.3s ease'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 1-Click Smart Quick Presets Bar */}
        <div style={{
          padding: isMobile ? '0.45rem 1.15rem' : '0.55rem 1.6rem',
          background: isDark ? 'rgba(0, 0, 0, 0.18)' : 'rgba(241, 245, 249, 0.8)',
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
                padding: '3px 10px',
                borderRadius: 99,
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1',
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

        {/* ── MODAL BODY: STEP-BY-STEP CONTENT ── */}
        <div
          className="custom-scrollbar"
          style={{
            padding: isMobile ? '1rem 1.15rem 1.25rem' : '1.25rem 1.6rem',
            overflowY: 'auto',
            flex: 1,
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 1: GÖREV TÜRÜ & GÜN SEÇİMİ
              ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="wizard-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* 1.1 Hangi Gün Yapılacak? */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Calendar size={14} color={primaryAura} /> Hedef Gününü Seç
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
                          padding: '0.65rem 0.2rem',
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
                        <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>{d.short}</div>
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

              {/* 1.2 Görev Kategorisi - 7 Büyük Lüks 3D Kart */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Layers size={14} color={primaryAura} /> Görev Türünü Seç
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                  gap: '0.65rem'
                }}>
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
                          padding: '0.85rem 0.75rem',
                          border: isSelected ? `2.5px solid ${t.color}` : (isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid #e8ecf0'),
                          borderRadius: 16,
                          background: isSelected
                            ? (isDark ? `${t.color}25` : t.bg)
                            : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.18s ease',
                          fontFamily: 'inherit',
                          boxShadow: isSelected ? `0 6px 20px ${t.glow}` : '0 2px 6px rgba(0,0,0,0.02)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 8,
                          transform: isSelected ? 'translateY(-2px)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '1.65rem' }}>{t.icon}</span>
                          <span style={{
                            width: 20,
                            height: 20,
                            borderRadius: 99,
                            border: isSelected ? `2px solid ${t.color}` : (isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1'),
                            background: isSelected ? t.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}>
                            {isSelected ? <Check size={12} strokeWidth={3.5} /> : null}
                          </span>
                        </div>

                        <div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: isSelected ? (isDark ? '#ffffff' : t.color) : (isDark ? '#f8fafc' : '#1e293b'),
                            lineHeight: 1.25,
                            fontFamily: "'Outfit', sans-serif"
                          }}>
                            {t.label}
                          </div>
                          <div style={{
                            fontSize: '0.68rem',
                            color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b',
                            marginTop: 3,
                            lineHeight: 1.2
                          }}>
                            {t.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 2: DERS & KAYNAK SEÇİMİ
              ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="wizard-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              
              {/* Kitap Okuma Modu Kaynak Seçimi */}
              {taskType === 'okuma' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <BookOpen size={14} color="#ec4899" /> Okuma Listenizden Kitap Seçin
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
                          padding: '0.75rem 1rem',
                          border: isDark ? '1.5px solid rgba(236,72,153,0.35)' : '1.5px solid #fbcfe8',
                          borderRadius: 14,
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          outline: 'none',
                          background: isDark ? 'rgba(236,72,153,0.08)' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          marginBottom: 8
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
                      placeholder="Veya serbest kitap adı yazın (Örn: Beyaz Diş, Küçük Prens, Nutuk)..."
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: 14,
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a'
                      }}
                    />
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
                /* Kitap Takibi (Soru Bankası) Modu Kaynak Seçimi */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <BookOpen size={14} color="#06b6d4" /> Kütüphanedeki Soru Bankanızı Seçin
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
                          padding: '0.75rem 1rem',
                          border: isDark ? '1.5px solid rgba(6,182,212,0.35)' : '1.5px solid #a5f3fc',
                          borderRadius: 14,
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          outline: 'none',
                          background: isDark ? 'rgba(6,182,212,0.08)' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          marginBottom: 8
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
                        padding: '0.75rem 1rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: 14,
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a'
                      }}
                    />
                  </div>

                  {/* Kitabın Testlerinden Seç */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Target size={14} color="#06b6d4" /> ÇÖZÜLECEK TESTİ SEÇİN
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
                          padding: '0.75rem 1rem',
                          border: isDark ? '1.5px solid rgba(6,182,212,0.35)' : '1.5px solid #a5f3fc',
                          borderRadius: 14,
                          fontSize: '0.9rem',
                          outline: 'none',
                          background: isDark ? 'rgba(6,182,212,0.08)' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          marginBottom: 8
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
                        padding: '0.75rem 1rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: 14,
                        fontSize: '0.9rem',
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
                /* Standart Ders ve Konu Seçimi (Soru, Konu, Tekrar, Deneme, vb.) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  
                  {/* Görsel Hızlı Ders Seçim Kartları */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Compass size={14} color={primaryAura} /> Ders Seçimi *
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
                      gap: 6,
                      marginBottom: 8
                    }}>
                      {POPULAR_SUBJECTS.map(ps => {
                        const isSubjSelected = subject === ps.name;
                        return (
                          <button
                            key={ps.name}
                            type="button"
                            onClick={() => { setSubject(ps.name); setTopic(''); }}
                            style={{
                              padding: '0.65rem 0.35rem',
                              borderRadius: 12,
                              border: isSubjSelected ? `2px solid ${ps.color}` : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #e2e8f0'),
                              background: isSubjSelected ? `${ps.color}25` : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                              color: isSubjSelected ? (isDark ? '#ffffff' : ps.color) : (isDark ? '#cbd5e1' : '#334155'),
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 3,
                              textAlign: 'center',
                              boxShadow: isSubjSelected ? `0 4px 12px ${ps.color}35` : 'none',
                              transition: 'all 0.16s ease'
                            }}
                          >
                            <span style={{ fontSize: '1.25rem' }}>{ps.icon}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>{ps.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Diğer Tüm Dersler Dropdown */}
                    <select
                      value={subject}
                      onChange={e => { setSubject(e.target.value); setTopic(''); }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: 14,
                        fontSize: '0.88rem',
                        outline: 'none',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                        fontFamily: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Veya Tüm Dersler Listesinden Seç --</option>
                      {allSubjects.map((s, idx) => (
                        <option key={`${s}_${idx}`} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Konu / Alt Başlık Seçimi */}
                  {subject && (
                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <FileText size={14} color={primaryAura} /> KONU VEYA TEST ADI (İSTEĞE BAĞLI)
                      </label>
                      {poolTopicsForSubject.length > 0 ? (
                        <select
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                            borderRadius: 14,
                            fontSize: '0.88rem',
                            outline: 'none',
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                            color: isDark ? '#ffffff' : '#0f172a',
                            fontFamily: 'inherit',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Müfredat Konusu Seçin --</option>
                          {poolTopicsForSubject.map((t, idx) => (
                            <option key={`${t}_${idx}`} value={t} style={{ background: '#0f172a', color: '#ffffff' }}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                          placeholder="Örn: Kesirler, Noktalama İşaretleri, Kuvvet ve Sürtünme..."
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                            borderRadius: 14,
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

                </div>
              )}

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 3: HEDEF, SÜRE, TEKRAR & CANLI ÖNİZLEME
              ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="wizard-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Soru Sayısı Kontrolü (Okuma değilse) */}
              {taskType !== 'okuma' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Hash size={14} color="#10b981" /> HEDEF SORU SAYISI
                    </label>
                    {questionCount && (
                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 900 }}>✓ {questionCount} Soru Hedeflendi</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleQuestionStepper(-5)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                        color: isDark ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}
                    >
                      <Minus size={18} />
                    </button>

                    <input
                      value={questionCount}
                      onChange={e => setQuestionCount(e.target.value)}
                      placeholder="20"
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: 14,
                        fontSize: '1rem',
                        outline: 'none',
                        fontFamily: "'Outfit', sans-serif",
                        boxSizing: 'border-box',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                        textAlign: 'center',
                        fontWeight: 900
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleQuestionStepper(5)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                        color: isDark ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Hızlı Soru Çipleri */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {QUICK_QUESTION_CHIPS.map(qVal => (
                      <button
                        key={qVal}
                        type="button"
                        onClick={() => setQuestionCount(qVal)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 99,
                          border: questionCount === qVal ? '1.5px solid #10b981' : '1px solid var(--color-border)',
                          background: questionCount === qVal ? 'rgba(16,185,129,0.2)' : 'var(--color-surface-hover)',
                          color: questionCount === qVal ? '#10b981' : 'var(--color-text-muted)',
                          fontSize: '0.72rem',
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

              {/* Okunacak Sayfa Sayısı (Okuma modunda ise) */}
              {taskType === 'okuma' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bookmark size={14} color="#ec4899" /> HEDEF SAYFA SAYISI
                    </label>
                    {pageCount && (
                      <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 900 }}>✓ {pageCount}</span>
                    )}
                  </div>
                  <input
                    value={pageCount}
                    onChange={e => setPageCount(e.target.value)}
                    placeholder="Örn: 20 sayfa, 30 sayfa..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: 14,
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {QUICK_PAGE_CHIPS.map(pText => (
                      <button
                        key={pText}
                        type="button"
                        onClick={() => setPageCount(pText)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 99,
                          border: pageCount === pText ? '1.5px solid #ec4899' : '1px solid var(--color-border)',
                          background: pageCount === pText ? 'rgba(236,72,153,0.2)' : 'var(--color-surface-hover)',
                          color: pageCount === pText ? '#ec4899' : 'var(--color-text-muted)',
                          fontSize: '0.72rem',
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
              )}

              {/* Süre / Hedef & Hızlı Süre Çipleri */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 900, color: primaryAura, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color={primaryAura} /> HEDEF ÇALIŞMA SÜRESİ
                  </label>
                  {hours && (
                    <span style={{ fontSize: '0.72rem', color: primaryAura, fontWeight: 900 }}>✓ {hours}</span>
                  )}
                </div>
                <input
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="Örn: 30 dk, 45 dk, 1 saat..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: 14,
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a'
                  }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {QUICK_DURATION_CHIPS.map(dText => (
                    <button
                      key={dText}
                      type="button"
                      onClick={() => setHours(dText)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 99,
                        border: hours === dText ? `1.5px solid ${primaryAura}` : '1px solid var(--color-border)',
                        background: hours === dText ? `${primaryAura}20` : 'var(--color-surface-hover)',
                        color: hours === dText ? primaryAura : 'var(--color-text-muted)',
                        fontSize: '0.72rem',
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

              {/* Tekrar Düzeni */}
              <div style={{
                background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc',
                padding: '0.95rem 1.15rem',
                borderRadius: 16,
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
              }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 900, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TEKRAR DÜZENİ
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.55rem' }}>
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
                        padding: '0.65rem 0.4rem',
                        border: repeatType === mode.id ? `2px solid ${primaryAura}` : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1'),
                        borderRadius: 12,
                        background: repeatType === mode.id ? (isDark ? `${primaryAura}25` : '#eef2ff') : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                        color: repeatType === mode.id ? (isDark ? '#ffffff' : primaryAura) : (isDark ? 'rgba(255,255,255,0.7)' : '#475569'),
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>{mode.label}</div>
                      <div style={{ fontSize: '0.64rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontWeight: 650, marginTop: 2 }}>{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── ŞOV PARÇASI: CANLI 3D KOKPİT GÖREV KARTI ÖNİZLEMESİ ── */}
              {canAdd && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: primaryAura, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap size={14} color={primaryAura} /> Panodaki Canlı Görünüm Önizlemesi:
                  </span>
                  
                  <div style={{
                    padding: '0.95rem 1.25rem',
                    background: isDark ? 'rgba(26, 30, 54, 0.95)' : '#ffffff',
                    borderRadius: 16,
                    border: `1.5px solid ${primaryAura}60`,
                    borderLeft: `5px solid ${primaryAura}`,
                    boxShadow: `0 8px 25px ${auraGlow}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14
                  }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: `2px solid ${primaryAura}`,
                      background: `${primaryAura}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: primaryAura,
                      flexShrink: 0
                    }}>
                      <Check size={18} strokeWidth={3} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          color: primaryAura,
                          background: `${primaryAura}20`,
                          border: `1px solid ${primaryAura}40`,
                          padding: '2px 8px',
                          borderRadius: 7,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span>{selectedType.icon}</span>
                          <span>{taskType === 'okuma' ? 'Kitap Okuma' : (subject || 'Ders')}</span>
                        </span>

                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {taskType === 'kitap'
                            ? (testName || bookName || 'Kitap Testi')
                            : taskType === 'okuma'
                            ? (bookName || 'Kitap Okuma')
                            : (topic || note || `${subject} Çalışması`)}
                        </span>

                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: 99,
                          background: 'rgba(99,102,241,0.15)',
                          color: '#6366f1'
                        }}>
                          {DAYS.find(d => d.key === selectedDayKey)?.long}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700, marginTop: 4 }}>
                        {questionCount && <span>📝 {questionCount} Soru • </span>}
                        {pageCount && <span>📄 {pageCount} • </span>}
                        {hours && <span>⏱️ {hours} • </span>}
                        <span style={{ color: '#0ea5e9', fontWeight: 800 }}>⚡ +25 XP</span>
                      </div>
                    </div>

                    <div style={{
                      padding: '0.42rem 0.85rem',
                      borderRadius: 9,
                      background: `linear-gradient(135deg, ${primaryAura}, #4f46e5)`,
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      boxShadow: `0 3px 10px ${auraGlow}`
                    }}>
                      {taskType === 'okuma' ? 'Okudum' : taskType === 'soru' || taskType === 'kitap' ? 'Çöz & Başla' : 'Tamamla'}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ── MODAL STICKY FOOTER ACTION CONTROLS ── */}
        <div style={{
          padding: isMobile ? '0.85rem 1.15rem 1.1rem' : '1.15rem 1.6rem',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          gap: '0.75rem',
          background: isDark ? 'rgba(15, 18, 32, 0.98)' : '#ffffff',
          flexShrink: 0
        }}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{
                flex: 1,
                padding: isMobile ? '0.8rem' : '0.9rem',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                border: 'none',
                borderRadius: 13,
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                color: isDark ? 'rgba(255,255,255,0.85)' : '#475569',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <ArrowLeft size={16} /> Geri
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: isMobile ? '0.8rem' : '0.9rem',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                border: 'none',
                borderRadius: 13,
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
                fontFamily: 'inherit'
              }}
            >
              Vazgeç
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && isStep1Valid) setCurrentStep(2);
                else if (currentStep === 2 && isStep2Valid) setCurrentStep(3);
              }}
              disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid}
              style={{
                flex: 2,
                padding: isMobile ? '0.8rem' : '0.9rem',
                background: (currentStep === 1 ? isStep1Valid : isStep2Valid)
                  ? `linear-gradient(135deg, ${primaryAura}, #4f46e5)`
                  : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                border: 'none',
                borderRadius: 13,
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: (currentStep === 1 ? isStep1Valid : isStep2Valid) ? 'pointer' : 'not-allowed',
                color: (currentStep === 1 ? isStep1Valid : isStep2Valid) ? '#ffffff' : '#94a3b8',
                boxShadow: (currentStep === 1 ? isStep1Valid : isStep2Valid) ? `0 4px 16px ${auraGlow}` : 'none',
                fontFamily: 'inherit',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>Devam Et</span>
              <ArrowRight size={17} />
            </button>
          ) : (
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
                borderRadius: 13,
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
                  <Zap size={18} fill="#ffffff" />
                  <span>⚡ Görevi Programıma Ekle</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
