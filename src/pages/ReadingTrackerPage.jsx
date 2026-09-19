import React, { useState, useMemo } from 'react';
import { 
  Plus, CheckCircle2, Bookmark, Flame, Calendar, 
  Award, Star, Trash2, Edit3, Sparkles, 
  BarChart3, X, Play, CheckSquare, Square, AlertTriangle,
  ArrowUp, ArrowDown, ArrowUpToLine, GripVertical, List
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useReading, READING_CATEGORIES, BOOK_COLORS } from '../context/ReadingContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import BulkAddBooksModal from '../components/reading/BulkAddBooksModal';
import CreateReadingScheduleModal from '../components/reading/CreateReadingScheduleModal';

export default function ReadingTrackerPage() {
  const { isDark } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const {
    books,
    stats,
    addBook,
    addBooksBulk,
    updateBook,
    deleteBook,
    deleteBooksBulk,
    removeDuplicateBooks,
    moveBookOrder,
    setBookOrderRank,
    reorderToReadBooks,
    startReadingBook,
    updateReadingProgress,
    completeBook,
    logManualReading
  } = useReading();

  const [activeTab, setActiveTab] = useState('reading'); // 'reading' | 'to_read' | 'completed'
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState(new Set());
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverBookId, setDragOverBookId] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleInitialBookIds, setScheduleInitialBookIds] = useState([]);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isQuickLogModalOpen, setIsQuickLogModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Form states for Add / Edit Book
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formTotalPages, setFormTotalPages] = useState('200');
  const [formCurrentPage, setFormCurrentPage] = useState('0');
  const [formCategory, setFormCategory] = useState('Roman');
  const [formColor, setFormColor] = useState('indigo');
  const [formStatus, setFormStatus] = useState('reading');

  // Form states for Progress Modal
  const [progressPage, setProgressPage] = useState('');
  const [progressMinutes, setProgressMinutes] = useState('30');

  // Form states for Finish Modal
  const [finishRating, setFinishRating] = useState(5);
  const [finishReview, setFinishReview] = useState('');

  // Form states for Quick Log
  const [quickPages, setQuickPages] = useState('20');
  const [quickTitle, setQuickTitle] = useState('');

  // Filtered lists
  const readingBooks = useMemo(() => books.filter(b => b.status === 'reading'), [books]);
  
  // Sıralı okunacak kitaplar listesi (Okuma Sırası = Okuma Planı)
  const toReadBooks = useMemo(() => {
    return books
      .filter(b => b.status === 'to_read')
      .sort((a, b) => {
        const oA = a.order !== undefined && a.order !== null ? a.order : 999999;
        const oB = b.order !== undefined && b.order !== null ? b.order : 999999;
        if (oA !== oB) return oA - oB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }, [books]);

  // Kümülatif okuma planı hesaplamaları
  const { totalToReadPages, cumulativeRanges } = useMemo(() => {
    let currentCumulative = 0;
    const ranges = new Map();
    toReadBooks.forEach((book, index) => {
      const pages = Number(book.totalPages) || 0;
      const start = currentCumulative + 1;
      const end = currentCumulative + pages;
      ranges.set(book.id, {
        rank: index + 1,
        startPage: start,
        endPage: end,
        pages
      });
      currentCumulative = end;
    });
    return {
      totalToReadPages: currentCumulative,
      cumulativeRanges: ranges
    };
  }, [toReadBooks]);

  const completedBooks = useMemo(() => books.filter(b => b.status === 'completed'), [books]);

  // Handlers
  const handleOpenAdd = (defaultStatus = activeTab) => {
    setFormTitle('');
    setFormAuthor('');
    setFormTotalPages('200');
    setFormCurrentPage('0');
    setFormCategory('Roman');
    setFormColor('indigo');
    setFormStatus(defaultStatus);
    setSelectedBook(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (book) => {
    setSelectedBook(book);
    setFormTitle(book.title || '');
    setFormAuthor(book.author || '');
    setFormTotalPages(String(book.totalPages || 100));
    setFormCurrentPage(String(book.currentPage || 0));
    setFormCategory(book.category || 'Roman');
    setFormColor(book.color || 'indigo');
    setFormStatus(book.status || 'reading');
    setIsAddModalOpen(true);
  };

  const handleSaveBook = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (selectedBook) {
      updateBook(selectedBook.id, {
        title: formTitle.trim(),
        author: formAuthor.trim(),
        totalPages: Number(formTotalPages) || 100,
        currentPage: Number(formCurrentPage) || 0,
        category: formCategory,
        color: formColor,
        status: formStatus
      });
    } else {
      addBook({
        title: formTitle.trim(),
        author: formAuthor.trim(),
        totalPages: Number(formTotalPages) || 100,
        currentPage: Number(formCurrentPage) || 0,
        category: formCategory,
        color: formColor,
        status: formStatus
      });
    }
    setIsAddModalOpen(false);
  };

  const handleAddBulk = (booksList) => {
    if (!booksList || booksList.length === 0) return;
    addBooksBulk(booksList);
    confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    const targetStatus = booksList[0]?.status || 'to_read';
    setActiveTab(targetStatus);
  };

  const handleOpenProgress = (book) => {
    setSelectedBook(book);
    setProgressPage(String(book.currentPage || 0));
    setProgressMinutes('30');
    setIsProgressModalOpen(true);
  };

  const handleSaveProgress = (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    const targetPage = Number(progressPage);
    updateReadingProgress(selectedBook.id, targetPage, Number(progressMinutes) || 0);
    setIsProgressModalOpen(false);

    if (targetPage >= selectedBook.totalPages) {
      handleOpenFinish(selectedBook);
    }
  };

  const handleOpenFinish = (book) => {
    setSelectedBook(book);
    setFinishRating(5);
    setFinishReview(book.notes || '');
    setIsFinishModalOpen(true);
  };

  const handleSaveFinish = (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    completeBook(selectedBook.id, {
      rating: finishRating,
      review: finishReview
    });
    setIsFinishModalOpen(false);

    // Celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  const handleSaveQuickLog = (e) => {
    e.preventDefault();
    const count = Number(quickPages) || 0;
    if (count <= 0) return;
    logManualReading(quickTitle || (readingBooks[0]?.title || 'Kitap Okuma'), count, 30);
    setIsQuickLogModalOpen(false);
  };

  // Mükerrer / Yinelenen kitapları tek tıkla temizleme
  const handleCleanDuplicates = () => {
    const dupCount = stats.duplicateCount || 0;
    if (dupCount <= 0) {
      alert('Yinelenen (çift) kitap bulunamadı.');
      return;
    }
    const confirmed = window.confirm(
      `Tespit edilen ${dupCount} adet mükerrer kitap silinecektir.\n\nHer kitabın tek bir orijinal kopyası korunacaktır.\n\nOnaylıyor musunuz?`
    );
    if (confirmed) {
      const removed = removeDuplicateBooks();
      alert(`${removed || dupCount} adet mükerrer kitap başarıyla temizlendi!`);
    }
  };

  // Çoklu seçim handlers
  const toggleSelectBook = (id) => {
    setSelectedBookIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllToRead = () => {
    if (selectedBookIds.size === toReadBooks.length) {
      setSelectedBookIds(new Set());
    } else {
      setSelectedBookIds(new Set(toReadBooks.map(b => b.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedBookIds.size === 0) return;
    const confirmed = window.confirm(`Seçilen ${selectedBookIds.size} adet kitabı silmek istediğinize emin misiniz?`);
    if (confirmed) {
      deleteBooksBulk(Array.from(selectedBookIds));
      setSelectedBookIds(new Set());
      setIsSelectMode(false);
    }
  };

  // Sıralama ve Taşıma Handlers
  const handlePromptOrderRank = (book, currentRank) => {
    const input = window.prompt(
      `"${book.title}" kitabını kaçıncı sıraya taşımak istiyorsunuz?\n(1 ile ${toReadBooks.length} arasında bir sayı girin):`,
      String(currentRank)
    );
    if (!input) return;
    const target = parseInt(input.trim(), 10);
    if (!isNaN(target) && target >= 1) {
      setBookOrderRank(book.id, target);
    }
  };

  const handleDragStart = (e, bookId) => {
    e.dataTransfer.setData('text/plain', bookId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedBookId(bookId);
  };

  const handleDragOver = (e, bookId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBookId !== bookId) {
      setDragOverBookId(bookId);
    }
  };

  const handleDrop = (e, targetBookId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedBookId;
    setDraggedBookId(null);
    setDragOverBookId(null);

    if (!sourceId || sourceId === targetBookId) return;

    const ids = toReadBooks.map(b => b.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetBookId);

    if (sourceIndex >= 0 && targetIndex >= 0) {
      ids.splice(sourceIndex, 1);
      ids.splice(targetIndex, 0, sourceId);
      reorderToReadBooks(ids);
    }
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setDragOverBookId(null);
  };

  // Color mapper helper
  const getColorObj = (colorId) => {
    return BOOK_COLORS.find(c => c.id === colorId) || BOOK_COLORS[0];
  };

  // Max pages in last 7 days for bar heights
  const max7DayPages = useMemo(() => {
    const max = Math.max(...(stats.last7Days || []).map(d => d.pages), 1);
    return Math.max(max, 30);
  }, [stats.last7Days]);

  return (
    <div style={{
      maxWidth: 1120,
      margin: '0 auto',
      padding: isMobile ? '1rem 0.85rem 6rem' : '1.5rem 1.5rem 4rem',
      color: isDark ? '#f8fafc' : '#0f172a',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      {/* ── 1. ÜST BAŞLIK & BUTONLAR ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(236, 72, 153, 0.35)',
              color: 'white',
              fontSize: '1.35rem'
            }}>
              📖
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                Kitap Okuma Takibi
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                Düzenli kitap oku, sayfalarını kaydet, hedeflerini tamamla
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsQuickLogModalOpen(true)}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '0.65rem 1rem',
              borderRadius: '0.85rem',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              color: isDark ? '#ffffff' : '#0f172a',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <Sparkles size={16} color="#f43f5e" /> Hızlı Sayfa Ekle
          </button>

          {stats.duplicateCount > 0 && (
            <button
              type="button"
              onClick={handleCleanDuplicates}
              style={{
                flex: isMobile ? 1 : 'none',
                padding: '0.65rem 1.15rem',
                borderRadius: '0.85rem',
                border: isDark ? '1px solid rgba(234,179,8,0.4)' : '1px solid #facc15',
                background: isDark ? 'rgba(234,179,8,0.18)' : '#fef9c3',
                color: isDark ? '#fef08a' : '#a16207',
                fontSize: '0.86rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(202,138,4,0.15)'
              }}
            >
              <span>🧹 Yinelenenleri Temizle ({stats.duplicateCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setScheduleInitialBookIds(Array.from(selectedBookIds));
              setIsScheduleModalOpen(true);
            }}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '0.65rem 1.15rem',
              borderRadius: '0.85rem',
              border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #a7f3d0',
              background: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5',
              color: isDark ? '#6ee7b7' : '#059669',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(16,185,129,0.15)'
            }}
          >
            <Calendar size={16} />
            <span>📅 Çalışma Planına Ekle</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '0.65rem 1.15rem',
              borderRadius: '0.85rem',
              border: isDark ? '1px solid rgba(99,102,241,0.35)' : '1px solid #c7d2fe',
              background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
              color: isDark ? '#a5b4fc' : '#4f46e5',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(99,102,241,0.15)'
            }}
          >
            <span>⚡ Toplu Kitap Ekle</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd('reading')}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
              color: 'white',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)'
            }}
          >
            <Plus size={18} /> Yeni Kitap Ekle
          </button>
        </div>
      </div>

      {/* ── 2. KPI KARTLARI (4 KART) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        {/* 1. Bugün Okunan */}
        <div style={{
          background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          borderRadius: '1.1rem',
          padding: '1rem',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bugün Okunan
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bookmark size={15} color="#f43f5e" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1 }}>
              {stats.todayPages}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 }}>sayfa</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 4, fontWeight: 600 }}>
              {stats.todayPages > 0 ? 'Harika! Bugün kitap okudun 👏' : 'Bugün henüz sayfa girmedin'}
            </div>
          </div>
        </div>

        {/* 2. Bu Ay Okunan */}
        <div style={{
          background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          borderRadius: '1.1rem',
          padding: '1rem',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bu Ay
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} color="#6366f1" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1 }}>
              {stats.monthPages}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 }}>sayfa</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 4, fontWeight: 600 }}>
              Bu ay <strong>{stats.monthFinishedBooks}</strong> kitap tamamlandı
            </div>
          </div>
        </div>

        {/* 3. Toplam Bitirilen */}
        <div style={{
          background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          borderRadius: '1.1rem',
          padding: '1rem',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Biten Kitaplar
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={15} color="#10b981" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1 }}>
              {stats.completedCount}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 }}>kitap</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 4, fontWeight: 600 }}>
              Toplam {stats.allTimePages} sayfa okundu
            </div>
          </div>
        </div>

        {/* 4. Okuma Serisi (Streak) */}
        <div style={{
          background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          borderRadius: '1.1rem',
          padding: '1rem',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Okuma Serisi
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={15} color="#f59e0b" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1, color: stats.streak > 0 ? '#f59e0b' : 'inherit' }}>
              {stats.streak}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 }}>gün</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 4, fontWeight: 600 }}>
              {stats.streak > 0 ? 'Ateşi söndürme, devam et 🔥' : 'Bugün oku, seriyi başlat!'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MİNİ GÜNLÜK OKUMA GRAFİĞİ (SON 7 GÜN) ── */}
      <div style={{
        background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
        borderRadius: '1.1rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={16} color="#ec4899" />
            <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>Son 7 Günlük Sayfa Grafiği</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
            Haftalık Toplam: {(stats.last7Days || []).reduce((acc, d) => acc + d.pages, 0)} Sayfa
          </span>
        </div>

        {/* Bar Visualizer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: isMobile ? 6 : 12,
          alignItems: 'flex-end',
          height: 80,
          paddingTop: 10
        }}>
          {(stats.last7Days || []).map((day, idx) => {
            const heightPct = Math.max(8, Math.round((day.pages / max7DayPages) * 100));
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: day.pages > 0 ? (isDark ? '#f472b6' : '#ec4899') : (isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'), marginBottom: 4 }}>
                  {day.pages > 0 ? day.pages : ''}
                </span>
                <div style={{
                  width: '100%',
                  maxWidth: 36,
                  height: `${heightPct}%`,
                  borderRadius: '6px 6px 3px 3px',
                  background: day.isToday
                    ? 'linear-gradient(180deg, #ec4899 0%, #f43f5e 100%)'
                    : (day.pages > 0 ? (isDark ? 'rgba(236,72,153,0.45)' : 'rgba(236,72,153,0.3)') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9')),
                  border: day.isToday ? '1px solid #f43f5e' : 'none',
                  transition: 'height 0.3s ease'
                }} />
                <span style={{ fontSize: '0.68rem', fontWeight: day.isToday ? 900 : 700, color: day.isToday ? '#f43f5e' : (isDark ? '#94a3b8' : '#64748b'), marginTop: 6 }}>
                  {day.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. ÜÇ SEKMELİ KİTAP LİSTESİ DÜZENİ ── */}
      {/* Sekme Butonları */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid #e2e8f0',
        marginBottom: '1.25rem',
        paddingBottom: '0.2rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('reading')}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: '0.75rem 0.75rem 0 0',
            border: 'none',
            background: activeTab === 'reading' ? (isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.1)') : 'transparent',
            borderBottom: activeTab === 'reading' ? '3px solid #ec4899' : '3px solid transparent',
            color: activeTab === 'reading' ? (isDark ? '#f472b6' : '#ec4899') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: 800,
            fontSize: isMobile ? '0.82rem' : '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
          }}
        >
          📖 Okunanlar
          <span style={{
            background: activeTab === 'reading' ? '#ec4899' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
            color: activeTab === 'reading' ? '#ffffff' : 'inherit',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 99
          }}>
            {readingBooks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('to_read')}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: '0.75rem 0.75rem 0 0',
            border: 'none',
            background: activeTab === 'to_read' ? (isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)') : 'transparent',
            borderBottom: activeTab === 'to_read' ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === 'to_read' ? (isDark ? '#818cf8' : '#6366f1') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: 800,
            fontSize: isMobile ? '0.82rem' : '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
          }}
        >
          ⏳ Okunacaklar
          <span style={{
            background: activeTab === 'to_read' ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
            color: activeTab === 'to_read' ? '#ffffff' : 'inherit',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 99
          }}>
            {toReadBooks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: '0.75rem 0.75rem 0 0',
            border: 'none',
            background: activeTab === 'completed' ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)') : 'transparent',
            borderBottom: activeTab === 'completed' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'completed' ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: 800,
            fontSize: isMobile ? '0.82rem' : '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
          }}
        >
          ✅ Bitenler
          <span style={{
            background: activeTab === 'completed' ? '#10b981' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
            color: activeTab === 'completed' ? '#ffffff' : 'inherit',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 99
          }}>
            {completedBooks.length}
          </span>
        </button>
      </div>

      {/* ── 5. KİTAP KARTLARI LİSTESİ ── */}
      {/* 1. OKUNANLAR (ŞU AN OKUDUĞUM KİTAPLAR) */}
      {activeTab === 'reading' && (
        <div>
          {readingBooks.length === 0 ? (
            <div style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
              border: isDark ? '1px dashed rgba(255,255,255,0.12)' : '1.5px dashed #cbd5e1',
              borderRadius: '1.25rem',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📚</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem' }}>Şu an okuduğun kitap yok</h3>
              <p style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', maxWidth: 400, margin: '0 auto 1.25rem' }}>
                Okunacaklar listenden bir kitaba başla veya yeni bir kitap ekle.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdd('reading')}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                + Kitap Ekle &amp; Başla
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem' }}>
              {readingBooks.map(book => {
                const colorObj = getColorObj(book.color);
                const progressPct = book.totalPages > 0 ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : 0;
                const remainingPages = Math.max(0, book.totalPages - book.currentPage);

                return (
                  <div
                    key={book.id}
                    style={{
                      background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                      borderRadius: '1.25rem',
                      padding: '1.25rem',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Top Color Accent Line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: colorObj.bg }} />

                    {/* Book Details */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: colorObj.light,
                            color: colorObj.bg,
                            border: `1px solid ${colorObj.bg}30`
                          }}>
                            {book.category || 'Roman'}
                          </span>
                          {book.startDate && (
                            <span style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                              🗓️ {book.startDate} tarihinde başlandı
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(book)}
                            title="Düzenle"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDark ? '#94a3b8' : '#64748b',
                              cursor: 'pointer',
                              padding: 4
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${book.title}" kitabını silmek istiyor musunuz?`)) {
                                deleteBook(book.id);
                              }
                            }}
                            title="Sil"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 4
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 2px', lineHeight: 1.3 }}>
                        {book.title}
                      </h3>
                      {book.author && (
                        <div style={{ fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                          ✍️ {book.author}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar & Stats */}
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                      border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                      borderRadius: '0.85rem',
                      padding: '0.75rem 0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                          Sayfa {book.currentPage} / {book.totalPages}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: colorObj.bg }}>
                          %{progressPct}
                        </span>
                      </div>

                      {/* Bar */}
                      <div style={{ width: '100%', height: 8, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${colorObj.bg}, #f43f5e)`,
                          borderRadius: 99,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                        <span>Kalan: <strong>{remainingPages} sayfa</strong></span>
                        {book.notes && <span style={{ fontStyle: 'italic', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {book.notes}</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenProgress(book)}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.8rem',
                          borderRadius: '0.75rem',
                          border: isDark ? '1px solid rgba(236,72,153,0.3)' : '1.5px solid #fbcfe8',
                          background: isDark ? 'rgba(236,72,153,0.12)' : '#fdf2f8',
                          color: isDark ? '#f472b6' : '#db2777',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5
                        }}
                      >
                        <Bookmark size={15} /> Sayfa Güncelle
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenFinish(book)}
                        style={{
                          padding: '0.6rem 0.85rem',
                          borderRadius: '0.75rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                        }}
                      >
                        <CheckCircle2 size={15} /> Bitirdim
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. OKUNACAKLAR (İSTEK LİSTESİ) */}
      {activeTab === 'to_read' && (
        <div>
          {toReadBooks.length === 0 ? (
            <div style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
              border: isDark ? '1px dashed rgba(255,255,255,0.12)' : '1.5px dashed #cbd5e1',
              borderRadius: '1.25rem',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏳</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem' }}>Okunacaklar listen boş</h3>
              <p style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', maxWidth: 400, margin: '0 auto 1.25rem' }}>
                Gelecekte okumayı planladığın kitapları buraya ekleyerek bir okuma listesi oluşturabilirsin.
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('to_read')}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  + Tek Kitap Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1px solid rgba(99,102,241,0.35)' : '1px solid #c7d2fe',
                    background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                    color: isDark ? '#a5b4fc' : '#4f46e5',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>⚡ Toplu Kitap Ekle</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* 🌟 1. OKUMA SIRASI & OKUMA PLANI BİLGİLENDİRME BANNER'I */}
              <div style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.12) 100%)'
                  : 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
                border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #c7d2fe',
                borderRadius: '1.25rem',
                padding: '1.15rem 1.35rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(99,102,241,0.06)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: 6
                    }}>
                      ✨ Okuma Sırası = Okuma Planı
                    </span>
                    <span style={{ fontSize: '0.8rem', color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: 800 }}>
                      Toplam {toReadBooks.length} Kitap • {totalToReadPages.toLocaleString('tr-TR')} Sayfa
                    </span>
                  </div>

                  {toReadBooks.length > 0 && (
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: isDark ? '#f8fafc' : '#1e1b4b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginTop: 2
                    }}>
                      <span style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Sırada İlk Okunacak:</span>
                      <span style={{ color: '#ec4899', fontWeight: 900 }}>
                        👑 #1 {toReadBooks[0].title}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>
                        ({toReadBooks[0].totalPages} sf.)
                      </span>
                      {!isSelectMode && (
                        <button
                          type="button"
                          onClick={() => startReadingBook(toReadBooks[0].id)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: 'none',
                            background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            marginLeft: 4
                          }}
                        >
                          <Play size={10} fill="white" /> Hemen Başla
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 5 }}>
                    💡 Kitapları sıraya dizdiğinde okuma planın otomatik oluşur. Sıraları oklarla veya sürükleyerek değiştirebilir, bu sırayı tek tıkla haftalık çalışma planına aktarabilirsin.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleInitialBookIds(toReadBooks.map(b => b.id));
                      setIsScheduleModalOpen(true);
                    }}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: '0.65rem 1.15rem',
                      borderRadius: '0.85rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Calendar size={15} /> 🚀 Bu Sırayla Plana Aktar
                  </button>
                </div>
              </div>

              {/* ⚠️ Yinelenen Kitap Bildirimi ve Hızlı Temizlik Banner'ı */}
              {stats.duplicateCount > 0 && (
                <div style={{
                  background: isDark ? 'rgba(234,179,8,0.1)' : '#fefce8',
                  border: isDark ? '1px solid rgba(234,179,8,0.3)' : '1px solid #fde047',
                  borderRadius: '1rem',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 2px 8px rgba(234,179,8,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isDark ? 'rgba(234,179,8,0.2)' : '#fef08a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ca8a04',
                      flexShrink: 0
                    }}>
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isDark ? '#fef08a' : '#854d0e' }}>
                        {stats.duplicateCount} Adet Yinelenen (Çift) Kitap Tespit Edildi!
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isDark ? '#cbd5e1' : '#713f12' }}>
                        İki kez eklenen kopyaları tek tıkla silebilirsiniz. Her kitabın orijinal 1 kopyası korunacaktır.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCleanDuplicates}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(202,138,4,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Trash2 size={14} /> Kopyaları Otomatik Temizle ({stats.duplicateCount})
                  </button>
                </div>
              )}

              {/* Header Action Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.65rem'
              }}>
                {/* Sol Alan: Başlık */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <List size={17} color="#6366f1" />
                    <span>Okunacak Kitaplar Sıralaması ({toReadBooks.length})</span>
                  </div>

                  {isSelectMode && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
                      color: isDark ? '#a5b4fc' : '#4338ca'
                    }}>
                      {selectedBookIds.size} seçildi
                    </span>
                  )}
                </div>

                {/* Sağ Alan: Butonlar */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isSelectMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectAllToRead}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                          background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                          color: isDark ? '#e2e8f0' : '#334155',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {selectedBookIds.size === toReadBooks.length ? <CheckSquare size={14} /> : <Square size={14} />}
                        {selectedBookIds.size === toReadBooks.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                      </button>

                      {selectedBookIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleInitialBookIds(Array.from(selectedBookIds));
                            setIsScheduleModalOpen(true);
                          }}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '0.65rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Calendar size={14} /> Seçilenleri Plana Ekle ({selectedBookIds.size})
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={selectedBookIds.size === 0}
                        onClick={handleDeleteSelected}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: 'none',
                          background: selectedBookIds.size > 0 ? '#ef4444' : (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'),
                          color: selectedBookIds.size > 0 ? '#ffffff' : (isDark ? '#f87171' : '#dc2626'),
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: selectedBookIds.size > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          opacity: selectedBookIds.size > 0 ? 1 : 0.6
                        }}
                      >
                        <Trash2 size={14} /> Seçilenleri Sil ({selectedBookIds.size})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedBookIds(new Set());
                        }}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                          background: 'transparent',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Vazgeç
                      </button>
                    </>
                  ) : (
                    <>
                      {stats.duplicateCount > 0 && (
                        <button
                          type="button"
                          onClick={handleCleanDuplicates}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '0.65rem',
                            border: isDark ? '1px solid rgba(234,179,8,0.4)' : '1px solid #facc15',
                            background: isDark ? 'rgba(234,179,8,0.18)' : '#fef9c3',
                            color: isDark ? '#fef08a' : '#a16207',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          🧹 Kopyaları Sil ({stats.duplicateCount})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setScheduleInitialBookIds(toReadBooks.map(b => b.id));
                          setIsScheduleModalOpen(true);
                        }}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(16,185,129,0.35)' : '1px solid #a7f3d0',
                          background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                          color: isDark ? '#6ee7b7' : '#059669',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Calendar size={14} /> 📅 Plan Oluştur
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsSelectMode(true)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                          color: isDark ? '#cbd5e1' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <CheckSquare size={14} /> Çoklu Seç / Sil
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsBulkModalOpen(true)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(99,102,241,0.35)' : '1px solid #c7d2fe',
                          background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                          color: isDark ? '#a5b4fc' : '#4f46e5',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        ⚡ Toplu Ekle
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAdd('to_read')}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.65rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Plus size={14} /> Yeni Ekle
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── DOĞRUDAN OKUMA SIRALAMA TABLOSU (KARTLAR KALDIRILDI) ── */}
              <div style={{
                background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                borderRadius: '1.25rem',
                overflow: 'hidden',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.03)'
              }}>
                {/* Tablo Başlıkları */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '52px 1fr 90px' : '65px 75px 1fr 100px 150px 135px',
                  padding: '0.8rem 1rem',
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <div>Sıra</div>
                  {!isMobile && <div>Taşı</div>}
                  <div>Kitap &amp; Yazar</div>
                  {!isMobile && <div>Sayfa</div>}
                  {!isMobile && <div>Plan Aralığı</div>}
                  <div style={{ textAlign: 'right' }}>İşlem</div>
                </div>

                {/* Tablo Satırları */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {toReadBooks.map((book, idx) => {
                    const rankInfo = cumulativeRanges.get(book.id) || { rank: idx + 1, startPage: 1, endPage: book.totalPages || 0 };
                    const colorObj = getColorObj(book.color);
                    const isSelected = selectedBookIds.has(book.id);
                    const isDragOver = dragOverBookId === book.id && draggedBookId !== book.id;

                    return (
                      <div
                        key={book.id}
                        draggable={!isSelectMode}
                        onDragStart={(e) => handleDragStart(e, book.id)}
                        onDragOver={(e) => handleDragOver(e, book.id)}
                        onDrop={(e) => handleDrop(e, book.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (isSelectMode) toggleSelectBook(book.id);
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '52px 1fr 90px' : '65px 75px 1fr 100px 150px 135px',
                          alignItems: 'center',
                          padding: isMobile ? '0.75rem 0.65rem' : '0.75rem 1rem',
                          borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9',
                          background: isDragOver
                            ? (isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff')
                            : isSelected
                              ? (isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff')
                              : 'transparent',
                          outline: isDragOver ? '2px dashed #6366f1' : 'none',
                          cursor: isSelectMode ? 'pointer' : 'grab',
                          transition: 'background 0.15s ease',
                          opacity: draggedBookId === book.id ? 0.45 : 1
                        }}
                      >
                        {/* Sıra Numarası ve Drag Tutamacı */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          {!isSelectMode && (
                            <GripVertical size={13} color={isDark ? '#64748b' : '#94a3b8'} style={{ cursor: 'grab', flexShrink: 0 }} />
                          )}
                          {isSelectMode ? (
                            <div style={{ color: isSelected ? '#6366f1' : (isDark ? '#64748b' : '#94a3b8') }}>
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromptOrderRank(book, rankInfo.rank);
                              }}
                              title="Sırayı doğrudan değiştirmek için tıkla"
                              style={{
                                border: rankInfo.rank === 1 ? '1px solid #f59e0b' : (isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #e2e8f0'),
                                background: rankInfo.rank === 1
                                  ? (isDark ? 'rgba(245,158,11,0.25)' : '#fef3c7')
                                  : (isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                                color: rankInfo.rank === 1
                                  ? (isDark ? '#fbbf24' : '#b45309')
                                  : (isDark ? '#e2e8f0' : '#1e293b'),
                                fontWeight: 900,
                                fontSize: '0.74rem',
                                borderRadius: 6,
                                padding: '2px 5px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {rankInfo.rank === 1 ? '👑 #1' : `#${rankInfo.rank}`}
                            </button>
                          )}
                        </div>

                        {/* Taşıma Okları (Desktop) */}
                        {!isMobile && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveBookOrder(book.id, 'up');
                              }}
                              title="Bir yukarı taşı"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: idx === 0 ? (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1') : (isDark ? '#cbd5e1' : '#334155'),
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                padding: 3
                              }}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === toReadBooks.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveBookOrder(book.id, 'down');
                              }}
                              title="Bir aşağı taşı"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: idx === toReadBooks.length - 1 ? (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1') : (isDark ? '#cbd5e1' : '#334155'),
                                cursor: idx === toReadBooks.length - 1 ? 'not-allowed' : 'pointer',
                                padding: 3
                              }}
                            >
                              <ArrowDown size={14} />
                            </button>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBookOrderRank(book.id, 1);
                                }}
                                title="En başa taşı"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#6366f1',
                                  cursor: 'pointer',
                                  padding: 3
                                }}
                              >
                                <ArrowUpToLine size={14} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Kitap Adı & Yazar */}
                        <div style={{ minWidth: 0, paddingRight: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              color: isDark ? '#f8fafc' : '#0f172a',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}>
                              {book.title}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: colorObj.light,
                              color: colorObj.bg,
                              fontWeight: 700
                            }}>
                              {book.category || 'Roman'}
                            </span>
                          </div>
                          {book.author && (
                            <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                              ✍️ {book.author}
                            </div>
                          )}
                          {isMobile && (
                            <div style={{ fontSize: '0.68rem', color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: 700, marginTop: 2 }}>
                              📄 {book.totalPages} sf. • Plan: Sf. {rankInfo.startPage}-{rankInfo.endPage}
                            </div>
                          )}
                        </div>

                        {/* Sayfa Sayısı (Desktop) */}
                        {!isMobile && (
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>
                            {book.totalPages} sf.
                          </div>
                        )}

                        {/* Plan Aralığı (Desktop) */}
                        {!isMobile && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#a5b4fc' : '#4f46e5' }}>
                            Sf. {rankInfo.startPage.toLocaleString('tr-TR')} - {rankInfo.endPage.toLocaleString('tr-TR')}
                          </div>
                        )}

                        {/* İşlem Butonları (Desktop + Mobile) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                          {!isSelectMode && (
                            <>
                              {isMobile && (
                                <>
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveBookOrder(book.id, 'up');
                                    }}
                                    title="Yukarı taşı"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: idx === 0 ? (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1') : (isDark ? '#cbd5e1' : '#334155'),
                                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                      padding: 2
                                    }}
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === toReadBooks.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveBookOrder(book.id, 'down');
                                    }}
                                    title="Aşağı taşı"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: idx === toReadBooks.length - 1 ? (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1') : (isDark ? '#cbd5e1' : '#334155'),
                                      cursor: idx === toReadBooks.length - 1 ? 'not-allowed' : 'pointer',
                                      padding: 2
                                    }}
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startReadingBook(book.id);
                                }}
                                title="Okumaya Başla"
                                style={{
                                  padding: isMobile ? '3px 6px' : '4px 8px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                                  color: 'white',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}
                              >
                                <Play size={10} fill="white" /> {!isMobile && 'Başla'}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(book);
                                }}
                                title="Düzenle"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isDark ? '#94a3b8' : '#64748b',
                                  cursor: 'pointer',
                                  padding: 3
                                }}
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`"${book.title}" kitabını silmek istiyor musunuz?`)) {
                                    deleteBook(book.id);
                                  }
                                }}
                                title="Sil"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: 3
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. BİTENLER (TAMAMLANAN KİTAPLAR) */}
      {activeTab === 'completed' && (
        <div>
          {completedBooks.length === 0 ? (
            <div style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
              border: isDark ? '1px dashed rgba(255,255,255,0.12)' : '1.5px dashed #cbd5e1',
              borderRadius: '1.25rem',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem' }}>Henüz bitirdiğin kitap yok</h3>
              <p style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', maxWidth: 400, margin: '0 auto' }}>
                Okuduğun kitapları tamamladıkça burada rozetleri, puanların ve özet notlarınla arşivlenecek.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem' }}>
              {completedBooks.map(book => {
                const colorObj = getColorObj(book.color);
                return (
                  <div
                    key={book.id}
                    style={{
                      background: isDark ? 'linear-gradient(145deg, #181824 0%, #10131f 100%)' : '#ffffff',
                      border: isDark ? '1px solid rgba(16,185,129,0.25)' : '1px solid #bbf7d0',
                      borderRadius: '1.25rem',
                      padding: '1.25rem',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.85rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(16,185,129,0.15)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.3)'
                        }}>
                          ✓ Tamamlandı
                        </span>

                        {/* Stars */}
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={14}
                              fill={star <= (book.rating || 5) ? '#f59e0b' : 'transparent'}
                              color={star <= (book.rating || 5) ? '#f59e0b' : '#94a3b8'}
                            />
                          ))}
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 2px' }}>
                        {book.title}
                      </h3>
                      {book.author && (
                        <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                          ✍️ {book.author}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                        <span>📄 <strong>{book.totalPages}</strong> Sayfa</span>
                        {book.finishDate && <span>🏁 Bitiş: <strong>{book.finishDate}</strong></span>}
                      </div>

                      {book.notes && (
                        <div style={{
                          marginTop: 10,
                          padding: '0.6rem 0.75rem',
                          borderRadius: '0.75rem',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                          fontSize: '0.75rem',
                          fontStyle: 'italic',
                          color: isDark ? '#cbd5e1' : '#334155'
                        }}>
                          "{book.notes}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => startReadingBook(book.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#6366f1',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        🔄 Tekrar Oku
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${book.title}" kaydını silmek istiyor musunuz?`)) {
                            deleteBook(book.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: YENİ KİTAP EKLE / DÜZENLE ── */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: isDark ? 'rgba(3, 7, 18, 0.82)' : 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : '1rem'
        }}>
          <div style={{
            background: isDark ? '#141824' : '#ffffff',
            borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '1.25rem',
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>
                {selectedBook ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveBook} style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  KİTAP ADI *
                </label>
                <input
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Örn: Şeker Portakalı, Nutuk, Çalıkuşu..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  YAZAR (İSTEĞE BAĞLI)
                </label>
                <input
                  value={formAuthor}
                  onChange={e => setFormAuthor(e.target.value)}
                  placeholder="Örn: José Mauro de Vasconcelos"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                    TOPLAM SAYFA *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formTotalPages}
                    onChange={e => setFormTotalPages(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                    ŞU ANKİ SAYFA
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formCurrentPage}
                    onChange={e => setFormCurrentPage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  KATEGORİ
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {READING_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} style={{ background: '#0f172a', color: '#ffffff' }}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  BAŞLANGIÇ DURUMU
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { id: 'to_read', label: '⏳ Okunacak' },
                    { id: 'reading', label: '📖 Okunuyor' },
                    { id: 'completed', label: '✅ Bitti' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormStatus(s.id)}
                      style={{
                        padding: '0.55rem 0.3rem',
                        borderRadius: '0.65rem',
                        border: formStatus === s.id ? '2px solid #ec4899' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'),
                        background: formStatus === s.id ? 'rgba(236,72,153,0.15)' : 'transparent',
                        color: formStatus === s.id ? '#ec4899' : (isDark ? '#94a3b8' : '#64748b'),
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    background: 'transparent',
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(236,72,153,0.35)'
                  }}
                >
                  {selectedBook ? 'Değişiklikleri Kaydet' : 'Kitabı Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SAYFA GÜNCELLEME & İLERLEME GİRİŞİ ── */}
      {isProgressModalOpen && selectedBook && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: isDark ? 'rgba(3, 7, 18, 0.82)' : 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : '1rem'
        }}>
          <div style={{
            background: isDark ? '#141824' : '#ffffff',
            borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '1.25rem',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>
                  Okuma İlerlemesini Kaydet
                </h3>
                <span style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                  {selectedBook.title}
                </span>
              </div>
              <button
                onClick={() => setIsProgressModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                borderRadius: '0.85rem',
                background: isDark ? 'rgba(236,72,153,0.08)' : '#fdf2f8',
                border: isDark ? '1px solid rgba(236,72,153,0.2)' : '1px solid #fbcfe8'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase' }}>
                  Şu Anda Kaldığın Sayfa
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                  <input
                    type="number"
                    min="0"
                    max={selectedBook.totalPages}
                    required
                    value={progressPage}
                    onChange={e => setProgressPage(e.target.value)}
                    style={{
                      width: 100,
                      padding: '0.5rem',
                      borderRadius: '0.65rem',
                      border: '2px solid #ec4899',
                      background: isDark ? '#0f121d' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b' }}>
                    / {selectedBook.totalPages}
                  </span>
                </div>

                {/* Quick Add Chips */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                  {[10, 20, 30, 50].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => setProgressPage(String(Math.min(selectedBook.totalPages, (Number(progressPage) || selectedBook.currentPage || 0) + add)))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: '#ec4899',
                        cursor: 'pointer'
                      }}
                    >
                      +{add} sf
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  OKUMA SÜRESİ (İSTEĞE BAĞLI)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {['15 dk', '30 dk', '45 dk', '1 saat'].map((dur, idx) => {
                    const mins = [15, 30, 45, 60][idx];
                    const isSelected = Number(progressMinutes) === mins;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setProgressMinutes(String(mins))}
                        style={{
                          padding: '0.5rem 0.2rem',
                          borderRadius: '0.65rem',
                          border: isSelected ? '2px solid #ec4899' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'),
                          background: isSelected ? 'rgba(236,72,153,0.15)' : 'transparent',
                          color: isSelected ? '#ec4899' : (isDark ? '#94a3b8' : '#64748b'),
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {dur}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProgressModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    background: 'transparent',
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(236,72,153,0.35)'
                  }}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: KİTABI BİTİRDİM (TEBRİKLER & DEĞERLENDİRME) ── */}
      {isFinishModalOpen && selectedBook && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: isDark ? 'rgba(3, 7, 18, 0.82)' : 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : '1rem'
        }}>
          <div style={{
            background: isDark ? '#141824' : '#ffffff',
            borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '1.25rem',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.5rem 1.25rem 0.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🎉</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 4px' }}>
                Tebrikler, Bir Kitap Daha Bitti!
              </h3>
              <p style={{ fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                "{selectedBook.title}" kitabını başarıyla tamamladın.
              </p>
            </div>

            <form onSubmit={handleSaveFinish} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', textAlign: 'center', marginBottom: 6 }}>
                  KİTABI PUANLA
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFinishRating(star)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        transform: finishRating >= star ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <Star
                        size={28}
                        fill={star <= finishRating ? '#f59e0b' : 'transparent'}
                        color={star <= finishRating ? '#f59e0b' : '#94a3b8'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  KİTAP HAKKINDA DÜŞÜNCEN / KISA ÖZETİN (İSTEĞE BAĞLI)
                </label>
                <textarea
                  rows="3"
                  value={finishReview}
                  onChange={e => setFinishReview(e.target.value)}
                  placeholder="Bu kitap sana ne kattı, en çok hangi karakteri veya bölümü sevdin?..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsFinishModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    background: 'transparent',
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                  }}
                >
                  Bitenlere Ekle ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: HIZLI SAYFA GİRİŞİ ── */}
      {isQuickLogModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: isDark ? 'rgba(3, 7, 18, 0.82)' : 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : '1rem'
        }}>
          <div style={{
            background: isDark ? '#141824' : '#ffffff',
            borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '1.25rem',
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>
                ⚡ Hızlı Okuma Girişi
              </h3>
              <button
                onClick={() => setIsQuickLogModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLog} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  KİTAP ADI VEYA SEÇİM
                </label>
                {readingBooks.length > 0 ? (
                  <select
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Okuduğun Kitaplardan Seç --</option>
                    {readingBooks.map(b => (
                      <option key={b.id} value={b.title} style={{ background: '#0f172a', color: '#ffffff' }}>
                        📖 {b.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    placeholder="Okuduğun kitabın adı..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  BUGÜN KAÇ SAYFA OKUDUN?
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quickPages}
                  onChange={e => setQuickPages(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '2px solid #ec4899',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: 'center'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                  {[10, 15, 20, 30, 50].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuickPages(String(cnt))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: Number(quickPages) === cnt ? '1.5px solid #ec4899' : '1px solid var(--color-border)',
                        background: Number(quickPages) === cnt ? 'rgba(236,72,153,0.15)' : 'transparent',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: Number(quickPages) === cnt ? '#ec4899' : 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      {cnt} sf
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsQuickLogModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    background: 'transparent',
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '0.7rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(236,72,153,0.35)'
                  }}
                >
                  Günlüğe Ekle ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. TOPLU KİTAP EKLEME MODALI */}
      <BulkAddBooksModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAddBulk={handleAddBulk}
        isDark={isDark}
        isMobile={isMobile}
      />

      {/* 6. OTOMATİK OKUMA ÇALIŞMA PLANI MODALI */}
      <CreateReadingScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        initialBookIds={scheduleInitialBookIds}
        isDark={isDark}
        isMobile={isMobile}
      />
    </div>
  );
}
