import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toUUID } from '../services/supabaseService';

const ReadingContext = createContext(null);

export const READING_CATEGORIES = [
  'Roman',
  'Dünya Klasikleri',
  'Türk Klasikleri',
  'Hikaye / Öykü',
  'Bilim & Teknoloji',
  'Tarih',
  'Felsefe & Düşünce',
  'Kişisel Gelişim',
  'Şiir',
  'Biyografi',
  'Macera & Fantastik',
  'Diğer'
];

export const BOOK_COLORS = [
  { id: 'indigo',  bg: '#6366f1', text: '#ffffff', light: 'rgba(99, 102, 241, 0.15)' },
  { id: 'emerald', bg: '#10b981', text: '#ffffff', light: 'rgba(16, 185, 129, 0.15)' },
  { id: 'rose',    bg: '#f43f5e', text: '#ffffff', light: 'rgba(244, 63, 94, 0.15)' },
  { id: 'amber',   bg: '#f59e0b', text: '#ffffff', light: 'rgba(245, 158, 11, 0.15)' },
  { id: 'cyan',    bg: '#06b6d4', text: '#ffffff', light: 'rgba(6, 182, 212, 0.15)' },
  { id: 'purple',  bg: '#a855f7', text: '#ffffff', light: 'rgba(168, 85, 247, 0.15)' },
  { id: 'blue',    bg: '#3b82f6', text: '#ffffff', light: 'rgba(59, 130, 246, 0.15)' },
  { id: 'teal',    bg: '#14b8a6', text: '#ffffff', light: 'rgba(20, 184, 166, 0.15)' },
];

const getTurkeyYMD = (date = new Date()) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const uid = () => `rb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const logUid = () => `rl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function ReadingProvider({ children }) {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id ? String(currentUser.id) : 'guest';

  const storageKey = `etest_reading_data_${studentId}`;

  // Initial local state load
  const [books, setBooks] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.books) ? parsed.books : [];
      }
    } catch {}
    return [];
  });

  const [logs, setLogs] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.logs) ? parsed.logs : [];
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);

  // Keep refs for absolute latest state to avoid race conditions and async batching loss
  const booksRef = useRef(books);
  booksRef.current = books;
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const isInitialLoadedRef = useRef(false);

  // Sync to localStorage whenever state changes (only AFTER initial load completed)
  useEffect(() => {
    if (!studentId || studentId === 'guest') return;
    if (!isInitialLoadedRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ books, logs, updatedAt: new Date().toISOString() }));
    } catch (err) {
      console.warn('ReadingContext local save warning:', err);
    }
  }, [books, logs, storageKey, studentId]);

  // Load from LocalStorage and Supabase on mount / user change
  useEffect(() => {
    if (!studentId || studentId === 'guest') return;

    let isMounted = true;
    isInitialLoadedRef.current = false;

    // 1. Immediately hydrate from localStorage for this specific studentId
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.books) && parsed.books.length > 0) {
          setBooks(parsed.books);
        }
        if (Array.isArray(parsed.logs)) {
          setLogs(parsed.logs);
        }
      }
    } catch {}

    if (!isSupabaseConfigured()) {
      isInitialLoadedRef.current = true;
      return;
    }

    const fetchCloudData = async () => {
      setIsLoading(true);
      try {
        const uuidId = toUUID(studentId) || studentId;
        const targetIds = [studentId, `cp_${studentId}`];
        if (uuidId && !targetIds.includes(uuidId)) targetIds.push(uuidId);

        const { data, error } = await supabase
          .from('coaching_profiles')
          .select('id, student_id, extra_data')
          .in('id', targetIds);

        if (!error && data && data.length > 0 && isMounted) {
          for (const row of data) {
            let extra = row?.extra_data || row?.data || {};
            if (typeof extra === 'string') {
              try {
                extra = JSON.parse(extra);
              } catch {}
            }
            const cloudReading = extra?.readingTracker;
            if (cloudReading) {
              if (Array.isArray(cloudReading.books) && cloudReading.books.length > 0) {
                setBooks(cloudReading.books);
                try {
                  localStorage.setItem(storageKey, JSON.stringify({
                    books: cloudReading.books,
                    logs: cloudReading.logs || [],
                    updatedAt: cloudReading.updatedAt || new Date().toISOString()
                  }));
                } catch {}
              }
              if (Array.isArray(cloudReading.logs)) {
                setLogs(cloudReading.logs);
              }
              break;
            }
          }
        }
      } catch (err) {
        console.warn('ReadingContext fetchCloudData catch:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          isInitialLoadedRef.current = true;
        }
      }
    };

    fetchCloudData();

    return () => {
      isMounted = false;
    };
  }, [studentId, storageKey]);

  // Helper to persist current state to Supabase & localStorage safely
  const persistCloud = useCallback(async (newBooks, newLogs) => {
    if (!studentId || studentId === 'guest') return;
    if (!Array.isArray(newBooks)) return;

    // Safety guard: if newBooks is empty but we currently have books in ref, do NOT wipe out
    if (newBooks.length === 0 && booksRef.current.length > 0) {
      console.warn('PersistCloud skipped: prevented accidental empty books write');
      return;
    }

    const updatedAt = new Date().toISOString();

    // 1. Instantly write to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify({ books: newBooks, logs: newLogs, updatedAt }));
    } catch (err) {
      console.warn('ReadingContext localStorage save warning:', err);
    }

    if (!isSupabaseConfigured()) return;

    // 2. Persist to Supabase coaching_profiles
    try {
      const uuidId = toUUID(studentId) || studentId;
      const targetIds = [studentId, `cp_${studentId}`];
      if (uuidId && !targetIds.includes(uuidId)) targetIds.push(uuidId);

      // Fetch existing extra_data to avoid clobbering other features
      const { data } = await supabase
        .from('coaching_profiles')
        .select('id, student_id, extra_data')
        .in('id', targetIds);

      const matchedRow = data?.[0];
      let existingExtra = matchedRow?.extra_data || matchedRow?.data || {};
      if (typeof existingExtra === 'string') {
        try {
          existingExtra = JSON.parse(existingExtra);
        } catch {}
      }

      const updatedExtra = {
        ...existingExtra,
        readingTracker: {
          books: newBooks,
          logs: newLogs,
          updatedAt
        }
      };

      // Upsert to both studentId and cp_${studentId} for full cross-system compatibility
      const payload1 = {
        id: studentId,
        student_id: studentId,
        extra_data: updatedExtra
      };
      const payload2 = {
        id: `cp_${studentId}`,
        student_id: studentId,
        extra_data: updatedExtra
      };

      try {
        await supabase
          .from('coaching_profiles')
          .upsert([payload1, payload2], { onConflict: 'id' });
      } catch {
        // Fallback with stringified extra_data in case table column type is TEXT
        try {
          const stringified1 = { ...payload1, extra_data: JSON.stringify(updatedExtra) };
          const stringified2 = { ...payload2, extra_data: JSON.stringify(updatedExtra) };
          await supabase
            .from('coaching_profiles')
            .upsert([stringified1, stringified2], { onConflict: 'id' });
        } catch {}
      }
    } catch (err) {
      console.warn('ReadingContext persistCloud warning:', err);
    }
  }, [studentId, storageKey]);

  // Actions
  const addBook = useCallback((bookData) => {
    const newBook = {
      id: bookData.id || uid(),
      studentId,
      title: (bookData.title || '').trim(),
      author: (bookData.author || '').trim(),
      totalPages: Number(bookData.totalPages) || 100,
      currentPage: Number(bookData.currentPage) || 0,
      status: bookData.status || 'to_read', // 'to_read' | 'reading' | 'completed'
      category: bookData.category || 'Roman',
      color: bookData.color || BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)].id,
      startDate: bookData.startDate || (bookData.status === 'reading' ? getTurkeyYMD() : null),
      finishDate: bookData.finishDate || null,
      rating: Number(bookData.rating) || 0,
      notes: (bookData.notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextBooks = [newBook, ...booksRef.current];
    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
    return newBook;
  }, [studentId, persistCloud]);

  const addBooksBulk = useCallback((booksList) => {
    if (!Array.isArray(booksList) || booksList.length === 0) return [];

    const newBooks = booksList
      .filter(b => b && (b.title || '').trim())
      .map((b, idx) => {
        const color = b.color || BOOK_COLORS[(Math.floor(Math.random() * BOOK_COLORS.length) + idx) % BOOK_COLORS.length].id;
        const status = b.status || 'to_read';
        return {
          id: b.id || `rb_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          studentId,
          title: (b.title || '').trim(),
          author: (b.author || '').trim(),
          totalPages: Math.max(1, Number(b.totalPages) || 100),
          currentPage: 0,
          status,
          category: b.category || 'Roman',
          color,
          startDate: status === 'reading' ? getTurkeyYMD() : null,
          finishDate: null,
          rating: 0,
          notes: (b.notes || '').trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

    if (newBooks.length === 0) return [];

    const nextBooks = [...newBooks, ...booksRef.current];
    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
    return newBooks;
  }, [studentId, persistCloud]);

  const updateBook = useCallback((bookId, updates) => {
    const nextBooks = booksRef.current.map(b => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    });
    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
    return nextBooks;
  }, [persistCloud]);

  const deleteBook = useCallback((bookId) => {
    const nextBooks = booksRef.current.filter(b => b.id !== bookId);
    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
    return nextBooks;
  }, [persistCloud]);

  const deleteBooksBulk = useCallback((bookIds) => {
    if (!Array.isArray(bookIds) || bookIds.length === 0) return 0;
    const idSet = new Set(bookIds);
    const nextBooks = booksRef.current.filter(b => !idSet.has(b.id));
    const count = booksRef.current.length - nextBooks.length;
    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
    return count;
  }, [persistCloud]);

  const removeDuplicateBooks = useCallback(() => {
    let removedCount = 0;
    const seen = new Set();
    const nextBooks = [];

    // Sort so books in progress or completed take priority over unread copies
    const sorted = [...booksRef.current].sort((a, b) => {
      const scoreA = (a.status === 'completed' ? 100 : a.status === 'reading' ? 50 : 0) + (a.currentPage || 0);
      const scoreB = (b.status === 'completed' ? 100 : b.status === 'reading' ? 50 : 0) + (b.currentPage || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    for (const b of sorted) {
      const normTitle = (b.title || '').trim().toLowerCase();
      const normAuthor = (b.author || '').trim().toLowerCase();
      const key = `${normTitle}___${normAuthor}`;

      if (!seen.has(key)) {
        seen.add(key);
        nextBooks.push(b);
      } else {
        removedCount++;
      }
    }

    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
    return removedCount;
  }, [persistCloud]);

  const reorderToReadBooks = useCallback((reorderedBookIds) => {
    if (!Array.isArray(reorderedBookIds) || reorderedBookIds.length === 0) return;
    const orderMap = new Map();
    reorderedBookIds.forEach((id, idx) => {
      orderMap.set(id, idx + 1);
    });

    const nextBooks = booksRef.current.map(b => {
      if (orderMap.has(b.id)) {
        return {
          ...b,
          order: orderMap.get(b.id),
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
  }, [persistCloud]);

  const moveBookOrder = useCallback((bookId, direction) => {
    const toReadList = booksRef.current
      .filter(b => b.status === 'to_read')
      .sort((a, b) => {
        const oA = a.order !== undefined && a.order !== null ? a.order : 999999;
        const oB = b.order !== undefined && b.order !== null ? b.order : 999999;
        if (oA !== oB) return oA - oB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

    const index = toReadList.findIndex(b => b.id === bookId);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= toReadList.length) return;

    const copyList = [...toReadList];
    const temp = copyList[index];
    copyList[index] = copyList[targetIndex];
    copyList[targetIndex] = temp;

    const orderMap = new Map();
    copyList.forEach((b, idx) => {
      orderMap.set(b.id, idx + 1);
    });

    const nextBooks = booksRef.current.map(b => {
      if (orderMap.has(b.id)) {
        return {
          ...b,
          order: orderMap.get(b.id),
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
  }, [persistCloud]);

  const setBookOrderRank = useCallback((bookId, newRank) => {
    const rankNum = parseInt(newRank, 10);
    if (isNaN(rankNum) || rankNum < 1) return;

    const toReadList = booksRef.current
      .filter(b => b.status === 'to_read')
      .sort((a, b) => {
        const oA = a.order !== undefined && a.order !== null ? a.order : 999999;
        const oB = b.order !== undefined && b.order !== null ? b.order : 999999;
        if (oA !== oB) return oA - oB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

    const currentIndex = toReadList.findIndex(b => b.id === bookId);
    if (currentIndex < 0) return;

    const copyList = [...toReadList];
    const [targetBook] = copyList.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(copyList.length, rankNum - 1));
    copyList.splice(targetIndex, 0, targetBook);

    const orderMap = new Map();
    copyList.forEach((b, idx) => {
      orderMap.set(b.id, idx + 1);
    });

    const nextBooks = booksRef.current.map(b => {
      if (orderMap.has(b.id)) {
        return {
          ...b,
          order: orderMap.get(b.id),
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
  }, [persistCloud]);

  const startReadingBook = useCallback((bookId) => {
    const today = getTurkeyYMD();
    const nextBooks = booksRef.current.map(b => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        status: 'reading',
        startDate: b.startDate || today,
        finishDate: null,
        updatedAt: new Date().toISOString()
      };
    });
    setBooks(nextBooks);
    persistCloud(nextBooks, logsRef.current);
  }, [persistCloud]);

  const uncompleteBook = useCallback((bookId) => {
    const currentBooks = booksRef.current;
    const currentLogs = logsRef.current;
    const targetBook = currentBooks.find(b => String(b.id) === String(bookId));
    if (!targetBook) return;

    const isBookLog = (l) => {
      if (l.bookId && String(l.bookId) === String(bookId)) return true;
      if (!l.bookId && targetBook.title && l.bookTitle && l.bookTitle.trim().toLowerCase() === targetBook.title.trim().toLowerCase()) return true;
      return false;
    };

    const latestLog = currentLogs.find(isBookLog);
    const totalP = Number(targetBook.totalPages) || 100;
    const currentP = Number(targetBook.currentPage) || totalP;

    // Eğer bitirme anındaki fromPage biliniyorsa oraya dön, aksi halde 1 sayfa eksiğe dön
    const restoredPage = (latestLog && typeof latestLog.fromPage === 'number')
      ? Math.max(0, latestLog.fromPage)
      : Math.max(0, totalP - 1);

    const pagesToDeduct = Math.max(0, currentP - restoredPage);

    const nextBooks = currentBooks.map(b => {
      if (String(b.id) !== String(bookId)) return b;
      return {
        ...b,
        status: 'reading',
        currentPage: restoredPage,
        finishDate: null,
        rating: 0,
        updatedAt: new Date().toISOString()
      };
    });

    // İstatistiklerden de düşülmesi için ilgili bitirme logunu sil veya düşür
    let nextLogs = [...currentLogs];
    if (pagesToDeduct > 0) {
      let toDeduct = pagesToDeduct;
      const updatedLogs = [];
      for (const l of nextLogs) {
        if (toDeduct > 0 && isBookLog(l)) {
          const lPages = Number(l.pagesRead) || 0;
          if (lPages <= toDeduct) {
            toDeduct -= lPages;
            continue; // Logu tamamen kaldır
          } else {
            updatedLogs.push({
              ...l,
              pagesRead: lPages - toDeduct,
              toPage: restoredPage
            });
            toDeduct = 0;
            continue;
          }
        }
        updatedLogs.push(l);
      }
      nextLogs = updatedLogs;
    }

    setBooks(nextBooks);
    setLogs(nextLogs);
    persistCloud(nextBooks, nextLogs);
  }, [persistCloud]);

  const updateReadingProgress = useCallback((bookId, newPageNumber, durationMinutes = 0) => {
    const targetPage = Math.max(0, Number(newPageNumber) || 0);
    const today = getTurkeyYMD();
    const currentBooks = booksRef.current;
    const currentLogs = logsRef.current;

    const book = currentBooks.find(b => String(b.id) === String(bookId));
    if (!book) return;

    const oldPage = Number(book.currentPage) || 0;
    const totalP = Math.max(1, Number(book.totalPages) || 100);
    const cappedPage = Math.min(targetPage, totalP);
    const isNowFinished = cappedPage >= totalP;

    let nextBooks = currentBooks.map(b => {
      if (String(b.id) !== String(bookId)) return b;
      return {
        ...b,
        currentPage: cappedPage,
        status: isNowFinished ? 'completed' : (b.status === 'completed' && cappedPage < totalP ? 'reading' : b.status),
        finishDate: isNowFinished ? (b.finishDate || today) : (cappedPage < totalP ? null : b.finishDate),
        startDate: b.startDate || today,
        updatedAt: new Date().toISOString()
      };
    });

    // Eğer bu kitap bittiyse ve aktif okunan başka kitap yoksa, sıradaki ilk 'to_read' kitabı otomatik 'reading' yap
    if (isNowFinished) {
      const hasOtherReading = nextBooks.some(b => String(b.id) !== String(bookId) && b.status === 'reading');
      if (!hasOtherReading) {
        const nextToRead = nextBooks
          .filter(b => b.status === 'to_read')
          .sort((a, b) => {
            const oA = a.order !== undefined && a.order !== null ? a.order : 999999;
            const oB = b.order !== undefined && b.order !== null ? b.order : 999999;
            if (oA !== oB) return oA - oB;
            return (a.createdAt || '').localeCompare(b.createdAt || '');
          })[0];

        if (nextToRead) {
          nextBooks = nextBooks.map(b => {
            if (b.id !== nextToRead.id) return b;
            return {
              ...b,
              status: 'reading',
              startDate: b.startDate || today,
              updatedAt: new Date().toISOString()
            };
          });
        }
      }
    }

    let nextLogs = [...currentLogs];

    if (cappedPage > oldPage) {
      // 📈 Sayfa ARTTI: Okuma kaydı ekle
      const pagesRead = cappedPage - oldPage;
      const newLog = {
        id: logUid(),
        studentId,
        bookId,
        bookTitle: book.title || '',
        pagesRead,
        fromPage: oldPage,
        toPage: cappedPage,
        date: today,
        durationMinutes: Number(durationMinutes) || 0,
        timestamp: new Date().toISOString()
      };
      nextLogs = [newLog, ...nextLogs];
    } else if (cappedPage < oldPage) {
      // 📉 Sayfa AZALDI (Geri Alındı): İstatistiklerden de düşülmesi için logları eksilt / geri al
      let toDeduct = oldPage - cappedPage;
      const isBookLog = (l) => {
        if (l.bookId && String(l.bookId) === String(bookId)) return true;
        if (!l.bookId && book.title && l.bookTitle && l.bookTitle.trim().toLowerCase() === book.title.trim().toLowerCase()) return true;
        return false;
      };

      const updatedLogs = [];
      for (const l of nextLogs) {
        if (toDeduct > 0 && isBookLog(l)) {
          const lPages = Number(l.pagesRead) || 0;
          if (lPages <= toDeduct) {
            toDeduct -= lPages;
            // Bu logun tamamını sil (tamamen geri alındı)
            continue;
          } else {
            // Logun bir kısmını düşür
            updatedLogs.push({
              ...l,
              pagesRead: lPages - toDeduct,
              toPage: cappedPage
            });
            toDeduct = 0;
            continue;
          }
        }
        updatedLogs.push(l);
      }
      nextLogs = updatedLogs;
    }

    setBooks(nextBooks);
    setLogs(nextLogs);
    persistCloud(nextBooks, nextLogs);
  }, [studentId, persistCloud]);

  const completeBook = useCallback((bookId, { rating = 5, review = '', finishDate = null }) => {
    const today = getTurkeyYMD();
    const currentBooks = booksRef.current;
    const currentLogs = logsRef.current;
    const targetBook = currentBooks.find(b => String(b.id) === String(bookId));
    if (!targetBook) return;

    const oldPage = Number(targetBook.currentPage) || 0;
    const totalP = Math.max(1, Number(targetBook.totalPages) || 100);
    const pagesLeft = Math.max(0, totalP - oldPage);

    let nextBooks = currentBooks.map(b => {
      if (String(b.id) !== String(bookId)) return b;
      return {
        ...b,
        status: 'completed',
        currentPage: totalP,
        rating: Number(rating) || 5,
        notes: review ? review.trim() : b.notes,
        finishDate: finishDate || today,
        updatedAt: new Date().toISOString()
      };
    });

    // Sıradaki ilk 'to_read' kitabı otomatik başlat
    const hasOtherReading = nextBooks.some(b => String(b.id) !== String(bookId) && b.status === 'reading');
    if (!hasOtherReading) {
      const nextToRead = nextBooks
        .filter(b => b.status === 'to_read')
        .sort((a, b) => {
          const oA = a.order !== undefined && a.order !== null ? a.order : 999999;
          const oB = b.order !== undefined && b.order !== null ? b.order : 999999;
          if (oA !== oB) return oA - oB;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        })[0];

      if (nextToRead) {
        nextBooks = nextBooks.map(b => {
          if (b.id !== nextToRead.id) return b;
          return {
            ...b,
            status: 'reading',
            startDate: b.startDate || today,
            updatedAt: new Date().toISOString()
          };
        });
      }
    }

    let nextLogs = [...currentLogs];
    if (pagesLeft > 0) {
      const finishLog = {
        id: logUid(),
        studentId,
        bookId,
        bookTitle: targetBook.title || '',
        pagesRead: pagesLeft,
        fromPage: oldPage,
        toPage: totalP,
        date: finishDate || today,
        durationMinutes: 30,
        timestamp: new Date().toISOString()
      };
      nextLogs = [finishLog, ...nextLogs];
    }

    setBooks(nextBooks);
    setLogs(nextLogs);
    persistCloud(nextBooks, nextLogs);
  }, [studentId, persistCloud]);

  const logManualReading = useCallback((bookTitle, pagesCount, durationMinutes = 0) => {
    const count = Number(pagesCount) || 0;
    if (count <= 0) return;

    const today = getTurkeyYMD();
    const newLog = {
      id: logUid(),
      studentId,
      bookId: null,
      bookTitle: (bookTitle || 'Genel Kitap Okuma').trim(),
      pagesRead: count,
      fromPage: 0,
      toPage: count,
      date: today,
      durationMinutes: Number(durationMinutes) || 0,
      timestamp: new Date().toISOString()
    };

    const nextLogs = [newLog, ...logsRef.current];
    setLogs(nextLogs);
    persistCloud(booksRef.current, nextLogs);
  }, [studentId, persistCloud]);

  // Statistics calculation
  const stats = useMemo(() => {
    const todayYMD = getTurkeyYMD();
    const currentYearMonth = todayYMD.slice(0, 7); // 'YYYY-MM'

    let todayPages = 0;
    let monthPages = 0;
    let allTimePages = 0;

    const dailyMap = {};

    logs.forEach(log => {
      const p = Number(log.pagesRead) || 0;
      allTimePages += p;
      if (log.date === todayYMD) {
        todayPages += p;
      }
      if (log.date && log.date.startsWith(currentYearMonth)) {
        monthPages += p;
      }
      if (log.date) {
        dailyMap[log.date] = (dailyMap[log.date] || 0) + p;
      }
    });

    // Books by status
    const toRead = books.filter(b => b.status === 'to_read');
    const reading = books.filter(b => b.status === 'reading');
    const completed = books.filter(b => b.status === 'completed');

    const monthFinishedBooks = completed.filter(b => b.finishDate && b.finishDate.startsWith(currentYearMonth)).length;

    // Consecutive reading streak
    let streak = 0;
    const checkDate = new Date();
    // Check today first
    const todayKey = getTurkeyYMD(checkDate);
    let hasToday = Boolean(dailyMap[todayKey] && dailyMap[todayKey] > 0);

    if (hasToday) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If haven't read today yet, check if read yesterday to maintain streak
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const ymd = getTurkeyYMD(checkDate);
      if (dailyMap[ymd] && dailyMap[ymd] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Last 7 days data for mini bar chart
    const last7Days = [];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = getTurkeyYMD(d);
      const dayName = dayNames[d.getDay()];
      last7Days.push({
        date: ymd,
        dayName,
        isToday: ymd === todayYMD,
        pages: dailyMap[ymd] || 0
      });
    }

    // Calculate duplicate count
    const seenTitles = new Set();
    let duplicateCount = 0;
    books.forEach(b => {
      const normTitle = (b.title || '').trim().toLowerCase();
      const normAuthor = (b.author || '').trim().toLowerCase();
      const key = `${normTitle}___${normAuthor}`;
      if (seenTitles.has(key)) {
        duplicateCount++;
      } else {
        seenTitles.add(key);
      }
    });

    return {
      todayPages,
      monthPages,
      allTimePages,
      toReadCount: toRead.length,
      readingCount: reading.length,
      completedCount: completed.length,
      monthFinishedBooks,
      streak,
      last7Days,
      duplicateCount
    };
  }, [books, logs]);

  const activeBook = useMemo(() => books.find(b => b.status === 'reading') || null, [books]);
  const logReading = useCallback((bookId, pagesToAdd, newCurrent) => {
    updateReadingProgress(bookId, newCurrent);
  }, [updateReadingProgress]);

  const value = useMemo(() => ({
    books,
    logs,
    isLoading,
    stats,
    activeBook,
    todayPages: stats.todayPages,
    streak: stats.streak,
    logReading,
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
    uncompleteBook,
    logManualReading
  }), [
    books,
    logs,
    isLoading,
    stats,
    activeBook,
    logReading,
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
    uncompleteBook,
    logManualReading
  ]);

  return (
    <ReadingContext.Provider value={value}>
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const context = useContext(ReadingContext);
  if (!context) {
    return {
      books: [],
      logs: [],
      isLoading: false,
      stats: { todayPages: 0, monthPages: 0, allTimePages: 0, readingCount: 0, completedCount: 0, toReadCount: 0, monthFinishedBooks: 0, streak: 0, last7Days: [], duplicateCount: 0 },
      activeBook: null,
      todayPages: 0,
      streak: 0,
      logReading: () => {},
      addBook: () => {},
      addBooksBulk: () => [],
      updateBook: () => {},
      deleteBook: () => {},
      deleteBooksBulk: () => 0,
      removeDuplicateBooks: () => 0,
      moveBookOrder: () => {},
      setBookOrderRank: () => {},
      reorderToReadBooks: () => {},
      startReadingBook: () => {},
      updateReadingProgress: () => {},
      completeBook: () => {},
      uncompleteBook: () => {},
      logManualReading: () => {}
    };
  }
  return context;
}
