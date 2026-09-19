import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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

  // Sync to localStorage whenever state changes
  useEffect(() => {
    if (!studentId || studentId === 'guest') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ books, logs, updatedAt: new Date().toISOString() }));
    } catch (err) {
      console.warn('ReadingContext local save warning:', err);
    }
  }, [books, logs, storageKey, studentId]);

  // Load from Supabase on mount / user change
  useEffect(() => {
    if (!studentId || studentId === 'guest' || !isSupabaseConfigured()) return;

    let isMounted = true;
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
            if (cloudReading && (Array.isArray(cloudReading.books) || Array.isArray(cloudReading.logs))) {
              setBooks(cloudReading.books || []);
              setLogs(cloudReading.logs || []);
              break;
            }
          }
        }
      } catch (err) {
        console.warn('ReadingContext fetchCloudData catch:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCloudData();

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  // Helper to persist current state to Supabase in background
  const persistCloud = useCallback(async (newBooks, newLogs) => {
    if (!studentId || studentId === 'guest' || !isSupabaseConfigured()) return;

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
          updatedAt: new Date().toISOString()
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
  }, [studentId]);

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

    setBooks(prev => {
      const updated = [newBook, ...prev];
      persistCloud(updated, logs);
      return updated;
    });

    return newBook;
  }, [studentId, logs, persistCloud]);

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

    setBooks(prev => {
      const updated = [...newBooks, ...prev];
      persistCloud(updated, logs);
      return updated;
    });

    return newBooks;
  }, [studentId, logs, persistCloud]);

  const updateBook = useCallback((bookId, updates) => {
    setBooks(prev => {
      const updated = prev.map(b => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      });
      persistCloud(updated, logs);
      return updated;
    });
  }, [logs, persistCloud]);

  const deleteBook = useCallback((bookId) => {
    setBooks(prev => {
      const updated = prev.filter(b => b.id !== bookId);
      persistCloud(updated, logs);
      return updated;
    });
  }, [logs, persistCloud]);

  const startReadingBook = useCallback((bookId) => {
    const today = getTurkeyYMD();
    setBooks(prev => {
      const updated = prev.map(b => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          status: 'reading',
          startDate: b.startDate || today,
          updatedAt: new Date().toISOString()
        };
      });
      persistCloud(updated, logs);
      return updated;
    });
  }, [logs, persistCloud]);

  const updateReadingProgress = useCallback((bookId, newPageNumber, durationMinutes = 0) => {
    const targetPage = Math.max(0, Number(newPageNumber) || 0);
    const today = getTurkeyYMD();

    let bookTitle = '';
    let oldPage = 0;
    let totalP = 100;

    let updatedBooks = [];
    setBooks(prev => {
      updatedBooks = prev.map(b => {
        if (b.id !== bookId) return b;
        bookTitle = b.title;
        oldPage = b.currentPage || 0;
        totalP = b.totalPages || 100;
        const cappedPage = Math.min(targetPage, totalP);
        const isNowFinished = cappedPage >= totalP;

        return {
          ...b,
          currentPage: cappedPage,
          status: isNowFinished ? 'completed' : 'reading',
          finishDate: isNowFinished ? (b.finishDate || today) : null,
          startDate: b.startDate || today,
          updatedAt: new Date().toISOString()
        };
      });
      return updatedBooks;
    });

    const pagesRead = Math.max(0, targetPage - oldPage);
    if (pagesRead > 0) {
      const newLog = {
        id: logUid(),
        studentId,
        bookId,
        bookTitle,
        pagesRead,
        fromPage: oldPage,
        toPage: targetPage,
        date: today,
        durationMinutes: Number(durationMinutes) || 0,
        timestamp: new Date().toISOString()
      };

      setLogs(prev => {
        const updatedLogs = [newLog, ...prev];
        persistCloud(updatedBooks, updatedLogs);
        return updatedLogs;
      });
    } else {
      persistCloud(updatedBooks, logs);
    }
  }, [studentId, logs, persistCloud]);

  const completeBook = useCallback((bookId, { rating = 5, review = '', finishDate = null }) => {
    const today = getTurkeyYMD();
    setBooks(prev => {
      const updated = prev.map(b => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          status: 'completed',
          currentPage: b.totalPages,
          rating: Number(rating) || 5,
          notes: review ? review.trim() : b.notes,
          finishDate: finishDate || today,
          updatedAt: new Date().toISOString()
        };
      });
      persistCloud(updated, logs);
      return updated;
    });
  }, [logs, persistCloud]);

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

    setLogs(prev => {
      const updated = [newLog, ...prev];
      persistCloud(books, updated);
      return updated;
    });
  }, [studentId, books, persistCloud]);

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

    return {
      todayPages,
      monthPages,
      allTimePages,
      toReadCount: toRead.length,
      readingCount: reading.length,
      completedCount: completed.length,
      monthFinishedBooks,
      streak,
      last7Days
    };
  }, [books, logs]);

  const value = useMemo(() => ({
    books,
    logs,
    isLoading,
    stats,
    addBook,
    addBooksBulk,
    updateBook,
    deleteBook,
    startReadingBook,
    updateReadingProgress,
    completeBook,
    logManualReading
  }), [
    books,
    logs,
    isLoading,
    stats,
    addBook,
    addBooksBulk,
    updateBook,
    deleteBook,
    startReadingBook,
    updateReadingProgress,
    completeBook,
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
      stats: { todayPages: 0, monthPages: 0, allTimePages: 0, readingCount: 0, completedCount: 0, toReadCount: 0, monthFinishedBooks: 0, streak: 0, last7Days: [] },
      addBook: () => {},
      addBooksBulk: () => [],
      updateBook: () => {},
      deleteBook: () => {},
      startReadingBook: () => {},
      updateReadingProgress: () => {},
      completeBook: () => {},
      logManualReading: () => {}
    };
  }
  return context;
}
