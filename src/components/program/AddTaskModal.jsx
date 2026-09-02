import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Clock, BookOpen, Check, Sparkles, ChevronRight, 
  RotateCcw, Layers, Hash, FileText, CheckCircle2, Bookmark
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isStandardOrMixedBook } from '../../utils/testResolver';

export const TASK_TYPES = [
  { id: 'konu',   label: 'Konu Çalışması', icon: '📖', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: '#818cf8' },
  { id: 'soru',   label: 'Soru Çözme',     icon: '✏️', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: '#34d399' },
  { id: 'tekrar', label: 'Tekrar',          icon: '🔄', color: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)', border: '#38bdf8' },
  { id: 'kitap',  label: 'Kitap Takibi',    icon: '📚', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', border: '#10b981' },
  { id: 'deneme', label: 'Deneme Sınavı',   icon: '📊', color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', border: '#fbbf24' },
  { id: 'diger',  label: 'Diğer',           icon: '✨', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: '#a78bfa' },
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

const QUICK_DURATION_CHIPS = ['20 dk', '30 dk', '45 dk', '1 saat', '1.5 saat', '2 saat'];
const QUICK_QUESTION_CHIPS = ['10 Soru', '15 Soru', '20 Soru', '30 Soru', '50 Soru'];
const QUICK_TIME_SLOTS = [
  { label: 'Sabah (09:00)', start: '09:00', end: '10:00' },
  { label: 'Öğle (14:00)', start: '14:00', end: '15:00' },
  { label: 'Akşam (19:00)', start: '19:00', end: '20:00' },
  { label: 'Gece (21:00)', start: '21:00', end: '22:00' }
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
  const [bookName, setBookName] = useState(initialItem?.bookName || initialItem?.bookTitle || '');
  const [selectedBookId, setSelectedBookId] = useState(initialItem?.bookId || '');
  const [selectedTestId, setSelectedTestId] = useState(initialItem?.testId || initialItem?.bookTestId || '');
  const [note, setNote] = useState(initialItem?.note || '');
  const [startTime, setStartTime] = useState(initialItem?.startTime || '');
  const [endTime, setEndTime] = useState(initialItem?.endTime || '');

  const trackedBooksData = useTrackedBooks();
  const books = trackedBooksData?.books || [];
  const bookTests = trackedBooksData?.bookTests || [];

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
    if (taskType === 'kitap') return bookName.trim().length > 0 || testName.trim().length > 0 || subject.trim().length > 0;
    if (taskType === 'deneme') return subject.trim().length > 0 || note.trim().length > 0;
    if (taskType === 'diger') return note.trim().length > 0 || subject.trim().length > 0;
    return subject.trim().length > 0;
  }, [taskType, bookName, testName, subject, note]);

  const handleSave = () => {
    if (!canAdd) return;

    const isRecurring = repeatType !== 'none';
    const isDaily = repeatType === 'daily';

    const itemData = {
      id: initialItem?.id || uid(),
      taskType,
      subject: subject.trim(),
      unit: unit.trim(),
      testName: testName.trim(),
      topic: unit.trim() && testName.trim()
        ? `${unit.trim()} — ${testName.trim()}`
        : (unit.trim() || testName.trim() || topic.trim()),
      hours: hours.trim(),
      questionCount: questionCount.trim(),
      bookName: bookName.trim(),
      bookTitle: bookName.trim(),
      bookId: selectedBookId || null,
      testId: selectedTestId || null,
      bookTestId: selectedTestId || null,
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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: isDark ? 'rgba(3, 7, 18, 0.82)' : 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: isMobile ? 0 : '1rem'
    }}>
      <div style={{
        background: isDark ? 'linear-gradient(180deg, #131722 0%, #0f121d 100%)' : '#ffffff',
        borderRadius: isMobile ? '1.75rem 1.75rem 0 0' : '1.5rem',
        width: '100%',
        maxWidth: isMobile ? '100%' : 540,
        boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)' : '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
        color: isDark ? '#f8fafc' : '#0f172a',
        animation: isMobile ? 'sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'modalPop 0.2s ease-out',
        maxHeight: isMobile ? '92vh' : '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <style>{`
          @keyframes sheetSlideUp {
            from { transform: translateY(100%); opacity: 0.8; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes modalPop {
            from { transform: scale(0.96) translateY(10px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Mobile Drag Indicator Bar */}
        {isMobile && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 44, height: 4.5, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.25)' : '#cbd5e1' }} />
          </div>
        )}

        {/* Modal Header */}
        <div style={{
          padding: isMobile ? '0.75rem 1.25rem 0.85rem' : '1.25rem 1.5rem 1rem',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{selectedType.icon}</span>
              <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, margin: 0, color: 'var(--color-text)' }}>
                {initialItem?.id ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, display: 'block' }}>
              Çalışma takvimine hedef belirle, odaklan ve tamamla
            </span>
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

        {/* Modal Body - Scrollable */}
        <div style={{
          padding: isMobile ? '1rem 1.25rem 1.5rem' : '1.25rem 1.5rem',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem'
        }}>
          {/* 1. HANGİ GÜN? - Horizontal 7-Day Pill Strip */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Calendar size={13} color="#6366f1" /> Hangi Gün Yapılacak?
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 5
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
                      padding: '0.55rem 0.2rem',
                      borderRadius: '0.75rem',
                      border: isSelected
                        ? '2px solid #6366f1'
                        : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0'),
                      background: isSelected
                        ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                        : (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                      color: isSelected
                        ? '#ffffff'
                        : (isDark ? 'rgba(255,255,255,0.85)' : '#334155'),
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 900 }}>{d.short}</div>
                    {isToday && (
                      <div style={{
                        fontSize: '0.55rem',
                        fontWeight: 800,
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

          {/* 2. GÖREV TİPİ - 6 Interactive Category Cards */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Layers size={13} color="#6366f1" /> Görev Tipi
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {TASK_TYPES.map(t => {
                const isSelected = taskType === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTaskType(t.id)}
                    style={{
                      padding: '0.65rem 0.45rem',
                      border: isSelected ? `2px solid ${t.color}` : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #e8ecf0'),
                      borderRadius: '0.85rem',
                      background: isSelected
                        ? (isDark ? `${t.color}30` : t.bg)
                        : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                      boxShadow: isSelected ? `0 4px 14px ${t.color}35` : 'none',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', marginBottom: 2 }}>{t.icon}</div>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: isSelected ? (isDark ? '#ffffff' : t.color) : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                      lineHeight: 1.2
                    }}>
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. DİNAMİK FORM ALANLARI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Kitap Takibi Modu */}
            {taskType === 'kitap' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                    KİTAP SEÇİN VEYA ADINI GİRİN *
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
                        padding: '0.65rem 0.85rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: '0.75rem',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        outline: 'none',
                        background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        marginBottom: 6
                      }}
                    >
                      <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Kayıtlı Kitaplarımdan Seç --</option>
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
                    placeholder="Veya serbest kitap adı yazın..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
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
                      padding: '0.65rem 0.85rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
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
                        padding: '0.65rem 0.85rem',
                        border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                        borderRadius: '0.75rem',
                        fontSize: '0.86rem',
                        outline: 'none',
                        background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
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
                    placeholder="Örn: Test 1, Ünite Değerlendirme 2..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Konu, Soru, Tekrar, Deneme, Diğer Modları */
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: 5 }}>
                  DERS {taskType !== 'diger' && '*'}
                </label>
                <select
                  value={subject}
                  onChange={e => { setSubject(e.target.value); setTopic(''); }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
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
                        padding: '3px 8px',
                        borderRadius: 99,
                        border: subject === sName ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                        background: subject === sName ? 'rgba(99,102,241,0.2)' : 'var(--color-surface-hover)',
                        color: subject === sName ? '#6366f1' : 'var(--color-text-muted)',
                        fontSize: '0.68rem',
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
                      padding: '0.65rem 0.85rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
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
                      padding: '0.65rem 0.85rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                )}
              </div>
            )}

            {/* Soru Sayısı & Hızlı Çipler */}
            {(taskType === 'soru' || taskType === 'kitap' || taskType === 'deneme') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Hash size={12} color="#10b981" /> HEDEF SORU SAYISI
                  </label>
                  {questionCount && (
                    <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800 }}>✓ Seçildi</span>
                  )}
                </div>
                <input
                  value={questionCount}
                  onChange={e => setQuestionCount(e.target.value)}
                  placeholder="Örn: 20 soru, 1 test..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a'
                  }}
                />
                {/* Hızlı Soru Çipleri */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {QUICK_QUESTION_CHIPS.map(qText => (
                    <button
                      key={qText}
                      type="button"
                      onClick={() => setQuestionCount(qText)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 8,
                        border: questionCount === qText ? '1.5px solid #10b981' : '1px solid var(--color-border)',
                        background: questionCount === qText ? 'rgba(16,185,129,0.2)' : 'var(--color-surface-hover)',
                        color: questionCount === qText ? '#10b981' : 'var(--color-text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {qText}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Süre / Hedef & Hızlı Süre Çipleri */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color="#6366f1" /> ÇALIŞMA SÜRESİ / HEDEF
                </label>
              </div>
              <input
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder={taskType === 'kitap' ? 'Örn: 20 sayfa veya 40 dk...' : 'Örn: 45 dk, 1.5 saat...'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                  borderRadius: '0.75rem',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
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
                      padding: '3px 8px',
                      borderRadius: 8,
                      border: hours === dText ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                      background: hours === dText ? 'rgba(99,102,241,0.2)' : 'var(--color-surface-hover)',
                      color: hours === dText ? '#6366f1' : 'var(--color-text-muted)',
                      fontSize: '0.68rem',
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
                    padding: '0.6rem 0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: '0.65rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
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
                    padding: '0.6rem 0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                    borderRadius: '0.65rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
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
                      border: (startTime === slot.start && endTime === slot.end) ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                      background: (startTime === slot.start && endTime === slot.end) ? 'rgba(99,102,241,0.2)' : 'var(--color-surface-hover)',
                      color: (startTime === slot.start && endTime === slot.end) ? '#6366f1' : 'var(--color-text-muted)',
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
                placeholder="Örn: Formüllere dikkat et, çözümlü videoyu izle..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                  borderRadius: '0.75rem',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a'
                }}
              />
            </div>

            {/* Tekrar Düzeni ve Bitiş Tarihi */}
            <div style={{
              background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc',
              padding: '0.85rem 1rem',
              borderRadius: '0.85rem',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
            }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#475569', display: 'block', marginBottom: '0.55rem' }}>
                TEKRAR DÜZENİ
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', marginBottom: '0.65rem' }}>
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
                      padding: '0.55rem 0.35rem',
                      border: repeatType === mode.id ? '2px solid #6366f1' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                      borderRadius: '0.65rem',
                      background: repeatType === mode.id ? (isDark ? 'rgba(99,102,241,0.25)' : '#eef2ff') : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                      color: repeatType === mode.id ? (isDark ? '#ffffff' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.7)' : '#475569'),
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
                      padding: '0.55rem 0.75rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1',
                      borderRadius: '0.65rem',
                      fontSize: '0.84rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. CANLI ÖNİZLEME KARTI */}
          {canAdd && (
            <div style={{
              padding: '0.85rem 1.1rem',
              background: isDark ? `${selectedType.color}20` : selectedType.bg,
              borderRadius: '0.85rem',
              border: `1.5px solid ${selectedType.color}45`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.4rem' }}>{selectedType.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: selectedType.color }}>
                    {selectedType.label}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 99,
                    background: 'rgba(99,102,241,0.15)',
                    color: '#6366f1'
                  }}>
                    {DAYS.find(d => d.key === selectedDayKey)?.long}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: isDark ? '#ffffff' : '#1e293b', fontWeight: 700, marginTop: 2 }}>
                  {taskType === 'kitap' ? (bookName || 'Kitap') : [subject, topic].filter(Boolean).join(' › ') || note || 'Görev'}
                  {(startTime || hours || questionCount) && (
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontWeight: 600 }}>
                      {' · '}{startTime ? `${startTime}${endTime ? `→${endTime}` : ''}` : ''}{hours ? ` ${hours}` : ''}{questionCount ? ` · ${questionCount}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer Action Bar */}
        <div style={{
          padding: isMobile ? '0.75rem 1.25rem 1rem' : '1rem 1.5rem',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          gap: '0.65rem',
          background: isDark ? 'rgba(19, 23, 34, 0.95)' : '#ffffff',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: isMobile ? '0.75rem' : '0.85rem',
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              border: 'none',
              borderRadius: '0.85rem',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              color: isDark ? 'rgba(255,255,255,0.8)' : '#64748b',
              fontFamily: 'inherit'
            }}
          >
            İptal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canAdd}
            style={{
              flex: 2,
              padding: isMobile ? '0.75rem' : '0.85rem',
              background: canAdd
                ? `linear-gradient(135deg, ${selectedType.color}, #4f46e5)`
                : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
              border: 'none',
              borderRadius: '0.85rem',
              fontWeight: 900,
              fontSize: '0.92rem',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              color: canAdd ? '#ffffff' : '#94a3b8',
              boxShadow: canAdd ? `0 4px 16px ${selectedType.color}45` : 'none',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
          >
            {initialItem?.id ? '✏️ Değişiklikleri Kaydet' : `${selectedType.icon} Görevi Ekle`}
          </button>
        </div>
      </div>
    </div>
  );
}
