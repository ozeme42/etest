import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Calendar, BookOpen, Check, ArrowUp, ArrowDown, 
  Trash2, Sparkles, ChevronRight, CheckCircle2, Clock, 
  CalendarDays, Flame, Award, Plus, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useCoaching } from '../../context/CoachingContext';
import { useReading, BOOK_COLORS } from '../../context/ReadingContext';
import { normalizeWeeklyProgram } from '../ProgramCenter';

const DAYS_LIST = [
  { key: 'Pzt', label: 'Pazartesi', short: 'Pzt' },
  { key: 'Sal', label: 'Salı', short: 'Sal' },
  { key: 'Çrş', label: 'Çarşamba', short: 'Çrş' },
  { key: 'Prş', label: 'Perşembe', short: 'Prş' },
  { key: 'Cum', label: 'Cuma', short: 'Cum' },
  { key: 'Cts', label: 'Cumartesi', short: 'Cts' },
  { key: 'Paz', label: 'Pazar', short: 'Paz' },
];

const DAY_KEYS_MAP = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];

const formatYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CreateReadingScheduleModal({
  isOpen,
  onClose,
  initialBookIds = [],
  isDark = false,
  isMobile = false
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const studentId = currentUser?.id ? String(currentUser.id) : 'guest';
  const { getCoachingProfileForStudent, saveCoachingProfile } = useCoaching();
  const { books, startReadingBook } = useReading();

  // Eligible books: uncompleted books (to_read and reading)
  const availableBooks = useMemo(() => {
    return books.filter(b => b.status !== 'completed');
  }, [books]);

  // Selected books in order
  const [selectedBooksOrder, setSelectedBooksOrder] = useState(() => {
    if (initialBookIds && initialBookIds.length > 0) {
      const bookMap = new Map(availableBooks.map(b => [b.id, b]));
      const matches = initialBookIds.map(id => bookMap.get(id)).filter(Boolean);
      return matches.length > 0 ? matches : (availableBooks.slice(0, 1));
    }
    return availableBooks.slice(0, 1);
  });

  // Settings
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return formatYMD(today);
  });
  const [paceMode, setPaceMode] = useState('single'); // 'single' | 'split' | 'custom'
  const [dailyPages, setDailyPages] = useState('25');
  const [weekdayPages, setWeekdayPages] = useState('20');
  const [weekendPages, setWeekendPages] = useState('40');
  const [customDailyPages, setCustomDailyPages] = useState({
    Pzt: '20',
    Sal: '20',
    Çrş: '20',
    Prş: '20',
    Cum: '20',
    Cts: '40',
    Paz: '40'
  });
  const [activeDays, setActiveDays] = useState(['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz']);
  const [autoStartFirst, setAutoStartFirst] = useState(true);
  const [readingHours, setReadingHours] = useState(''); // e.g. "21:00"
  
  // UI states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  // Sync initial books if modal opens with different selection
  React.useEffect(() => {
    if (isOpen) {
      setSuccessInfo(null);
      if (initialBookIds && initialBookIds.length > 0) {
        const bookMap = new Map(availableBooks.map(b => [b.id, b]));
        const matches = initialBookIds.map(id => bookMap.get(id)).filter(Boolean);
        if (matches.length > 0) setSelectedBooksOrder(matches);
      } else if (selectedBooksOrder.length === 0 && availableBooks.length > 0) {
        setSelectedBooksOrder(availableBooks.slice(0, 1));
      }
    }
  }, [isOpen, initialBookIds]);

  // Book Selection Helpers
  const handleToggleBook = (book) => {
    setSelectedBooksOrder(prev => {
      const exists = prev.some(b => b.id === book.id);
      if (exists) {
        return prev.filter(b => b.id !== book.id);
      } else {
        return [...prev, book];
      }
    });
  };

  const handleMoveBook = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedBooksOrder.length) return;
    const copy = [...selectedBooksOrder];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setSelectedBooksOrder(copy);
  };

  const handleRemoveBook = (bookId) => {
    setSelectedBooksOrder(prev => prev.filter(b => b.id !== bookId));
  };

  // Day presets
  const handleSetAllDays = () => setActiveDays(['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz']);
  const handleSetWeekdays = () => setActiveDays(['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum']);
  const handleSetWeekend = () => setActiveDays(['Cts', 'Paz']);

  const handleToggleDay = (key) => {
    setActiveDays(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // At least 1 day required
        return prev.filter(d => d !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleCustomDayPageChange = (dayKey, val) => {
    setCustomDailyPages(prev => ({
      ...prev,
      [dayKey]: val
    }));
  };

  // Schedule Calculation Engine
  const schedulePlan = useMemo(() => {
    if (selectedBooksOrder.length === 0) return { items: [], totalPages: 0, totalDays: 0, endDate: null };

    const start = new Date(startDate + 'T00:00:00');
    if (isNaN(start.getTime())) return { items: [], totalPages: 0, totalDays: 0, endDate: null };

    const items = [];
    let curDate = new Date(start.getTime());
    let totalScheduledPages = 0;

    for (const book of selectedBooksOrder) {
      const total = Math.max(1, Number(book.totalPages) || 100);
      let currentP = Math.max(0, Number(book.currentPage) || 0);
      if (currentP >= total) currentP = 0; // if already marked done, start from begin

      while (currentP < total) {
        // Find next active day
        while (true) {
          const dayKey = DAY_KEYS_MAP[curDate.getDay()];
          if (activeDays.includes(dayKey)) {
            break;
          }
          curDate.setDate(curDate.getDate() + 1);
        }

        const ymd = formatYMD(curDate);
        const dayKey = DAY_KEYS_MAP[curDate.getDay()];

        // Determine target pages for this dayKey
        let targetPagesForDay = 20;
        if (paceMode === 'single') {
          targetPagesForDay = Math.max(1, Number(dailyPages) || 20);
        } else if (paceMode === 'split') {
          const isWeekend = dayKey === 'Cts' || dayKey === 'Paz';
          targetPagesForDay = Math.max(1, Number(isWeekend ? weekendPages : weekdayPages) || 20);
        } else if (paceMode === 'custom') {
          targetPagesForDay = Math.max(1, Number(customDailyPages[dayKey]) || 20);
        }

        const fromPage = currentP + 1;
        const toPage = Math.min(total, currentP + targetPagesForDay);
        const pagesCount = toPage - fromPage + 1;
        currentP = toPage;
        totalScheduledPages += pagesCount;

        items.push({
          date: ymd,
          dayKey,
          book,
          fromPage,
          toPage,
          pages: pagesCount,
          isBookFinish: toPage >= total
        });

        // Advance date to next day
        curDate.setDate(curDate.getDate() + 1);
      }
    }

    const lastItem = items[items.length - 1];
    return {
      items,
      totalPages: totalScheduledPages,
      totalDays: items.length,
      endDate: lastItem ? lastItem.date : null
    };
  }, [selectedBooksOrder, startDate, dailyPages, weekdayPages, weekendPages, customDailyPages, paceMode, activeDays]);

  // Save to Study Plan / weeklyProgram
  const handleSaveToStudyPlan = async () => {
    if (schedulePlan.items.length === 0) {
      alert('Planlanacak geçerli bir kitap ve gün seçilmedi.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Fetch current profile
      const rawProfile = getCoachingProfileForStudent(studentId) || { studentId, weeklyProgram: [] };
      const normalizedWeekly = normalizeWeeklyProgram(rawProfile.weeklyProgram);

      // 2. Generate task items and distribute into weeklyProgram by dayKey
      const newWeekly = normalizedWeekly.map(dayObj => ({
        ...dayObj,
        items: [...(dayObj.items || [])]
      }));

      schedulePlan.items.forEach((planItem, idx) => {
        const taskItem = {
          id: `read_task_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          taskType: 'okuma',
          subject: 'Kitap Okuma',
          topic: `${planItem.book.title} (Sayfa ${planItem.fromPage} - ${planItem.toPage})`,
          hours: readingHours.trim(),
          pageCount: String(planItem.pages),
          pageRange: `${planItem.fromPage} - ${planItem.toPage}`,
          fromPage: planItem.fromPage,
          toPage: planItem.toPage,
          bookName: planItem.book.title,
          bookTitle: planItem.book.title,
          readingBookId: planItem.book.id,
          bookId: null,
          testId: null,
          bookTestId: null,
          note: `${planItem.book.author ? `${planItem.book.author} • ` : ''}${planItem.book.title} (Sayfa ${planItem.fromPage} - ${planItem.toPage})`,
          scheduledDate: planItem.date,
          date: planItem.date,
          targetDate: planItem.date,
          createdYMD: planItem.date,
          done: false
        };

        const targetDay = newWeekly.find(d => d.day === planItem.dayKey);
        if (targetDay) {
          targetDay.items.push(taskItem);
        }
      });

      // 3. Save coaching profile
      await saveCoachingProfile({
        ...rawProfile,
        studentId,
        weeklyProgram: newWeekly
      });

      // 4. If autoStartFirst is checked, mark first book as reading
      if (autoStartFirst && selectedBooksOrder.length > 0) {
        const firstBook = selectedBooksOrder[0];
        if (firstBook.status === 'to_read') {
          startReadingBook(firstBook.id);
        }
      }

      // 5. Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      setSuccessInfo({
        bookCount: selectedBooksOrder.length,
        taskCount: schedulePlan.items.length,
        totalPages: schedulePlan.totalPages,
        endDate: schedulePlan.endDate
      });
    } catch (err) {
      console.error('Okuma planı oluşturma hatası:', err);
      alert('Plan kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: isMobile ? '0.5rem' : '1.5rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: 780,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.7)' : '0 25px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
            }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: isDark ? '#f8fafc' : '#0f172a' }}>
                Otomatik Okuma Çalışma Planı
              </h2>
              <p style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                Kitapları ve sayfa sayılarını baştan sona otomatik günlere dağıtın
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#cbd5e1' : '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {successInfo ? (
            /* Başarı Ekranı */
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 8px 25px rgba(16,185,129,0.35)'
              }}>
                <CheckCircle2 size={40} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.5rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
                Okuma Programınız Başarıyla Oluşturuldu!
              </h3>
              <p style={{ fontSize: '0.88rem', color: isDark ? '#94a3b8' : '#64748b', maxWidth: 460, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                Toplam <strong>{successInfo.bookCount} kitap</strong> ({successInfo.totalPages} sayfa), <strong>{successInfo.taskCount} günlük görev</strong> halinde Haftalık Çalışma Programınıza ve Günün Görevleri ekranınıza işlendi.
              </p>

              <div style={{
                background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
                border: isDark ? '1px solid rgba(16,185,129,0.25)' : '1px solid #bbf7d0',
                borderRadius: '1rem',
                padding: '1rem',
                maxWidth: 420,
                margin: '0 auto 2rem',
                display: 'flex',
                justifyContent: 'space-around',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{successInfo.taskCount} Gün</div>
                  <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>Plan Süresi</div>
                </div>
                <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6366f1' }}>{successInfo.totalPages} Sf</div>
                  <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>Toplam Sayfa</div>
                </div>
                <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>
                    {successInfo.endDate ? new Date(successInfo.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>Bitiş Tarihi</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/student/program');
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.85rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Calendar size={16} /> Çalışma Programını Gör
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.85rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                    background: 'transparent',
                    color: isDark ? '#cbd5e1' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* ── BÖLÜM 1: PLAN VE HEDEF AYARLARI (BAŞLANGIÇ TARİHİ & GÜNLÜK SAYFA) ── */}
              <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                borderRadius: '1.15rem',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  {/* Başlangıç Tarihi */}
                  <div>
                    <label style={{ fontSize: '0.84rem', fontWeight: 800, display: 'block', marginBottom: 6, color: isDark ? '#f8fafc' : '#0f172a' }}>
                      📅 1. Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.75rem',
                        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                        background: isDark ? '#131722' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                      Kitap okumanın çalışma planınızda başlayacağı tarih
                    </div>
                  </div>

                  {/* Tercih Edilen Saat Aralığı */}
                  <div>
                    <label style={{ fontSize: '0.84rem', fontWeight: 800, display: 'block', marginBottom: 6, color: isDark ? '#f8fafc' : '#0f172a' }}>
                      ⏰ Tercih Edilen Saat (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: 21:00 veya Akşam"
                      value={readingHours}
                      onChange={(e) => setReadingHours(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.75rem',
                        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                        background: isDark ? '#131722' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                      Çalışma planında görevin yanında gösterilecek saat
                    </div>
                  </div>
                </div>

                {/* Günlük Okuma Hedefi (Modlar) */}
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.9rem',
                  borderRadius: '0.95rem',
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                      📖 2. Günlük Okuma Hedefi Belirleme
                    </label>

                    {/* Mod Seçici Tablar */}
                    <div style={{
                      display: 'flex',
                      background: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9',
                      padding: 3,
                      borderRadius: '0.7rem',
                      gap: 2
                    }}>
                      <button
                        type="button"
                        onClick={() => setPaceMode('single')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.55rem',
                          border: 'none',
                          background: paceMode === 'single' ? '#6366f1' : 'transparent',
                          color: paceMode === 'single' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        ⚡ Her Gün Aynı
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaceMode('split')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.55rem',
                          border: 'none',
                          background: paceMode === 'split' ? '#6366f1' : 'transparent',
                          color: paceMode === 'split' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        ⚖️ Hafta İçi / Hafta Sonu
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaceMode('custom')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.55rem',
                          border: 'none',
                          background: paceMode === 'custom' ? '#6366f1' : 'transparent',
                          color: paceMode === 'custom' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        🗓️ Gün Gün Özel
                      </button>
                    </div>
                  </div>

                  {/* MOD 1: HER GÜN AYNI */}
                  {paceMode === 'single' && (
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', width: 90 }}>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={dailyPages}
                            onChange={(e) => setDailyPages(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.65rem',
                              borderRadius: '0.65rem',
                              border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                              background: isDark ? '#131722' : '#ffffff',
                              color: isDark ? '#f8fafc' : '#0f172a',
                              fontSize: '0.9rem',
                              fontWeight: 900,
                              textAlign: 'center',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
                          sayfa / gün
                        </span>

                        <div style={{ display: 'flex', gap: '0.3rem', flex: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {['15', '20', '25', '30', '40', '50'].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setDailyPages(p)}
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: '0.5rem',
                                border: dailyPages === p ? '1px solid #6366f1' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                                background: dailyPages === p ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                                color: dailyPages === p ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {p} sf
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 6 }}>
                        Her okuma günü için sabit {dailyPages || 0} sayfa okunacak.
                      </div>
                    </div>
                  )}

                  {/* MOD 2: HAFTA İÇİ / HAFTA SONU */}
                  {paceMode === 'split' && (
                    <div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                        gap: '0.75rem'
                      }}>
                        {/* Hafta İçi */}
                        <div style={{
                          padding: '0.65rem 0.8rem',
                          borderRadius: '0.75rem',
                          background: isDark ? 'rgba(99,102,241,0.08)' : '#f0f4ff',
                          border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid #c7d2fe'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6366f1' }}>
                              💼 Hafta İçi (Pzt - Cum)
                            </span>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#6366f1' }}>
                              {weekdayPages} sf/gün
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={weekdayPages}
                              onChange={(e) => setWeekdayPages(e.target.value)}
                              style={{
                                width: 65,
                                padding: '0.4rem 0.5rem',
                                borderRadius: '0.55rem',
                                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                                background: isDark ? '#131722' : '#ffffff',
                                color: isDark ? '#f8fafc' : '#0f172a',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                textAlign: 'center',
                                outline: 'none'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {['15', '20', '25', '30', '40'].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setWeekdayPages(p)}
                                  style={{
                                    padding: '0.3rem 0.45rem',
                                    borderRadius: '0.45rem',
                                    border: weekdayPages === p ? '1px solid #6366f1' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                                    background: weekdayPages === p ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                                    color: weekdayPages === p ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Hafta Sonu */}
                        <div style={{
                          padding: '0.65rem 0.8rem',
                          borderRadius: '0.75rem',
                          background: isDark ? 'rgba(236,72,153,0.08)' : '#fdf2f8',
                          border: isDark ? '1px solid rgba(236,72,153,0.25)' : '1px solid #fbcfe8'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ec4899' }}>
                              🏖️ Hafta Sonu (Cts - Paz)
                            </span>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#ec4899' }}>
                              {weekendPages} sf/gün
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={weekendPages}
                              onChange={(e) => setWeekendPages(e.target.value)}
                              style={{
                                width: 65,
                                padding: '0.4rem 0.5rem',
                                borderRadius: '0.55rem',
                                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                                background: isDark ? '#131722' : '#ffffff',
                                color: isDark ? '#f8fafc' : '#0f172a',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                textAlign: 'center',
                                outline: 'none'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {['20', '30', '40', '50', '60'].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setWeekendPages(p)}
                                  style={{
                                    padding: '0.3rem 0.45rem',
                                    borderRadius: '0.45rem',
                                    border: weekendPages === p ? '1px solid #ec4899' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                                    background: weekendPages === p ? '#ec4899' : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                                    color: weekendPages === p ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 6 }}>
                        Hafta içi günde {weekdayPages} sf, hafta sonu günde {weekendPages} sf okunacak.
                      </div>
                    </div>
                  )}

                  {/* MOD 3: GÜN GÜN ÖZEL */}
                  {paceMode === 'custom' && (
                    <div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)',
                        gap: '0.45rem'
                      }}>
                        {DAYS_LIST.map(d => {
                          const isActive = activeDays.includes(d.key);
                          const val = customDailyPages[d.key] || '20';
                          return (
                            <div
                              key={d.key}
                              style={{
                                padding: '0.45rem 0.35rem',
                                borderRadius: '0.65rem',
                                background: isActive
                                  ? (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc')
                                  : (isDark ? 'rgba(255,255,255,0.01)' : '#f1f5f9'),
                                border: isActive
                                  ? (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1')
                                  : (isDark ? '1px dashed rgba(255,255,255,0.05)' : '1px dashed #e2e8f0'),
                                opacity: isActive ? 1 : 0.45,
                                textAlign: 'center'
                              }}
                            >
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginBottom: 4,
                                color: (d.key === 'Cts' || d.key === 'Paz') ? '#ec4899' : (isDark ? '#e0e7ff' : '#334155')
                              }}>
                                {d.short}
                              </div>
                              {isActive ? (
                                <div>
                                  <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={val}
                                    onChange={(e) => handleCustomDayPageChange(d.key, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.35rem 0.2rem',
                                      borderRadius: '0.45rem',
                                      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                                      background: isDark ? '#131722' : '#ffffff',
                                      color: isDark ? '#f8fafc' : '#0f172a',
                                      fontSize: '0.82rem',
                                      fontWeight: 900,
                                      textAlign: 'center',
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  <div style={{ fontSize: '0.65rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                                    sayfa
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.68rem', color: isDark ? '#64748b' : '#94a3b8', padding: '0.45rem 0' }}>
                                  İzinli
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 6 }}>
                        Her gün için ayrı hedef. Pasif günlerde okuma yapılmaz (aşağıdan günleri açıp kapatabilirsiniz).
                      </div>
                    </div>
                  )}
                </div>

                {/* Okuma Günleri Seçimi */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                      🗓️ 3. Okuma Yapılacak Günler
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={handleSetAllDays}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: 'none',
                          background: activeDays.length === 7 ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: activeDays.length === 7 ? '#6366f1' : (isDark ? '#94a3b8' : '#64748b'),
                          cursor: 'pointer'
                        }}
                      >
                        Her Gün
                      </button>
                      <button
                        type="button"
                        onClick={handleSetWeekdays}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: 'none',
                          background: activeDays.length === 5 && !activeDays.includes('Cts') ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: activeDays.length === 5 && !activeDays.includes('Cts') ? '#6366f1' : (isDark ? '#94a3b8' : '#64748b'),
                          cursor: 'pointer'
                        }}
                      >
                        Hafta İçi
                      </button>
                      <button
                        type="button"
                        onClick={handleSetWeekend}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: 'none',
                          background: activeDays.length === 2 && activeDays.includes('Cts') ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: activeDays.length === 2 && activeDays.includes('Cts') ? '#6366f1' : (isDark ? '#94a3b8' : '#64748b'),
                          cursor: 'pointer'
                        }}
                      >
                        Hafta Sonu
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                    {DAYS_LIST.map(d => {
                      const isChecked = activeDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => handleToggleDay(d.key)}
                          style={{
                            padding: '0.55rem 0.2rem',
                            borderRadius: '0.65rem',
                            border: isChecked ? '1px solid #6366f1' : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'),
                            background: isChecked ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                            color: isChecked ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {d.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ek Seçenekler */}
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={autoStartFirst}
                      onChange={(e) => setAutoStartFirst(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                    />
                    İlk sıradaki kitabı Okuma Takibi'nde "Şu an Okuyorum" durumuna al
                  </label>
                </div>
              </div>

              {/* ── BÖLÜM 2: OKUMA SIRASINDAKİ KİTAPLAR (KOMPAKT & KAYDIRILABİLİR) ── */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    📚 4. Okuma Sırasındaki Kitaplar ({selectedBooksOrder.length} Kitap)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                    Sırayı değiştirebilir veya listeden çıkarabilirsiniz
                  </span>
                </div>

                {selectedBooksOrder.length === 0 ? (
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '1rem',
                    border: isDark ? '1px dashed rgba(255,255,255,0.15)' : '1.5px dashed #cbd5e1',
                    textAlign: 'center',
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontSize: '0.82rem'
                  }}>
                    Plana dahil edilecek kitap bulunamadı.
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    maxHeight: 220,
                    overflowY: 'auto',
                    paddingRight: 4,
                    marginBottom: '0.5rem'
                  }}>
                    {selectedBooksOrder.map((book, idx) => {
                      const remainPages = Math.max(1, (book.totalPages || 100) - (book.currentPage || 0));
                      return (
                        <div
                          key={book.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '0.75rem',
                            background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                            <span style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: idx === 0 ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {book.title}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                                {book.author ? `${book.author} • ` : ''}Toplam: {book.totalPages} sf {book.currentPage > 0 ? `(${book.currentPage}. sf, kalan: ${remainPages} sf)` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveBook(idx, -1)}
                              title="Yukarı taşı"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: idx === 0 ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? '#cbd5e1' : '#475569'),
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                padding: 3
                              }}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedBooksOrder.length - 1}
                              onClick={() => handleMoveBook(idx, 1)}
                              title="Aşağı taşı"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: idx === selectedBooksOrder.length - 1 ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? '#cbd5e1' : '#475569'),
                                cursor: idx === selectedBooksOrder.length - 1 ? 'not-allowed' : 'pointer',
                                padding: 3
                              }}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBook(book.id)}
                              title="Listeden çıkar"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 3,
                                marginLeft: 2
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Kitap Ekleme Açılır Listesi */}
                {availableBooks.length > selectedBooksOrder.length && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {availableBooks
                      .filter(b => !selectedBooksOrder.some(s => s.id === b.id))
                      .slice(0, 6)
                      .map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleToggleBook(b)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '0.65rem',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                            color: isDark ? '#cbd5e1' : '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <Plus size={11} /> {b.title} ({b.totalPages} sf)
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* ── BÖLÜM 3: ÖZET VE CANLI ÖNİZLEME ── */}
              <div style={{
                background: isDark ? 'linear-gradient(145deg, #1e1b4b 0%, #171727 100%)' : '#eef2ff',
                border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #c7d2fe',
                borderRadius: '1.15rem',
                padding: '1.15rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: isDark ? '#e0e7ff' : '#3730a3' }}>
                    📊 Planlanan Okuma Çizelgesi Özeti
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(prev => !prev)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isDark ? '#a5b4fc' : '#4f46e5',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {isPreviewOpen ? 'Önizlemeyi Gizle' : 'Gün Gün Listeyi Gör'}
                    <ChevronRight size={14} style={{ transform: isPreviewOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                  </button>
                </div>

                {/* Mini KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.75rem',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'
                  }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#6366f1' }}>
                      {selectedBooksOrder.length}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                      Kitap
                    </div>
                  </div>

                  <div style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.75rem',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'
                  }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#06b6d4' }}>
                      {schedulePlan.totalPages}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                      Toplam Sayfa
                    </div>
                  </div>

                  <div style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.75rem',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'
                  }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>
                      {schedulePlan.totalDays} gün
                    </div>
                    <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                      Okuma Günü
                    </div>
                  </div>

                  <div style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.75rem',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'
                  }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>
                      {schedulePlan.endDate ? new Date(schedulePlan.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                      Bitiş Tarihi
                    </div>
                  </div>
                </div>

                {/* Gün Gün Çizelge Önizleme Listesi */}
                {isPreviewOpen && (
                  <div style={{
                    marginTop: '1rem',
                    maxHeight: 240,
                    overflowY: 'auto',
                    borderRadius: '0.75rem',
                    background: isDark ? 'rgba(0,0,0,0.25)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                    padding: '0.5rem'
                  }}>
                    {schedulePlan.items.map((item, idx) => {
                      const dateObj = new Date(item.date + 'T00:00:00');
                      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderBottom: idx < schedulePlan.items.length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9') : 'none',
                            fontSize: '0.78rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              color: isDark ? '#94a3b8' : '#64748b',
                              width: 80
                            }}>
                              {dateStr}
                            </span>
                            <span style={{ fontWeight: 800 }}>
                              {item.book.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontWeight: 800,
                              color: '#6366f1',
                              background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.72rem'
                            }}>
                              Sayfa {item.fromPage} - {item.toPage} ({item.pages} sf)
                            </span>
                            {item.isBookFinish && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: '#10b981',
                                background: isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7',
                                padding: '2px 6px',
                                borderRadius: 4
                              }}>
                                🏁 Bitiyor
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!successInfo && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.75rem',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                background: 'transparent',
                color: isDark ? '#cbd5e1' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>

            <button
              type="button"
              disabled={isSubmitting || schedulePlan.items.length === 0}
              onClick={handleSaveToStudyPlan}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: schedulePlan.items.length > 0 ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : (isDark ? '#334155' : '#cbd5e1'),
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: schedulePlan.items.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: schedulePlan.items.length > 0 ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              <Sparkles size={16} />
              {isSubmitting ? 'Plan Ekleniyor...' : `🚀 Çalışma Planına Ekle (${schedulePlan.totalDays} Günlük)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
