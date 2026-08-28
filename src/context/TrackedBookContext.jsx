import { isSupabaseConfigured } from '../lib/supabase';
import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetTrackedBooks,
  dbAddTrackedBook,
  dbUpdateTrackedBook,
  dbDeleteTrackedBook,
  dbAddTrackedBookTest,
  dbBatchUpsertTrackedBookTests,
  dbDeleteTrackedBookTest,
  toUUID
} from '../services/supabaseService';
import { safeSetItem } from '../utils/storageUtils';
import { isCacheValid, touchCache } from '../utils/cacheManager';

const TrackedBookContext = createContext();

export function useTrackedBooks() {
  return useContext(TrackedBookContext);
}

export function TrackedBookProvider({ children }) {
  const deduplicateBooks = (list) => {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach(b => {
      if (!b) return;
      const titleNorm = String(b.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const pubNorm = String(b.publisher || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const key = `${titleNorm}___${pubNorm}`;
      if (!map.has(key)) {
        map.set(key, b);
      } else {
        const existing = map.get(key);
        map.set(key, { ...existing, ...b, id: existing.id || b.id });
      }
    });
    return Array.from(map.values());
  };

  const deduplicateTests = (list) => {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach(t => {
      if (!t) return;
      const bKey = String(t.bookId || t.book_id || '');
      const bCanonical = toUUID(bKey) || bKey;
      const sKey = String(t.subjectId || t.subject_id || 'direct').trim().toLowerCase();
      const topKey = String(t.topicId || t.topic_id || 'direct').trim().toLowerCase();
      const nameKey = String(t.name || '').trim().toLowerCase();
      const key = `${bCanonical}___${sKey}___${topKey}___${nameKey}`;
      if (!map.has(key)) {
        map.set(key, t);
      } else {
        const existing = map.get(key);
        map.set(key, { ...existing, ...t, id: existing.id || t.id });
      }
    });
    return Array.from(map.values());
  };

  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('eTestTrackedBooks');
    return saved ? deduplicateBooks(JSON.parse(saved)) : [];
  });

  const [bookTests, setBookTests] = useState(() => {
    const saved = localStorage.getItem('eTestTrackedBookTests');
    return saved ? deduplicateTests(JSON.parse(saved)) : [];
  });

  const [isLoading, setIsLoading] = useState(true);

  const refreshTrackedBooks = async (force = false) => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return null;
    }
    
    if (!force && isCacheValid('tracked_books', 30) && books.length > 0) {
      setIsLoading(false);
      return { books, bookTests };
    }

    setIsLoading(true);
    try {
      const res = await dbGetTrackedBooks();
      if (res) {
        touchCache('tracked_books');
        if (res.books) {
          const cleanBooks = res.books.map(b => ({
            ...b,
            bookType: b.bookType || b.book_type || b.raw_data?.bookType || (b.id === 'tb_07kzdf_1787267196768' ? 'exam' : 'standard')
          }));
          setBooks(deduplicateBooks(cleanBooks));
        }
        if (res.bookTests) setBookTests(deduplicateTests(res.bookTests));
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTrackedBooks();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTrackedBooks(true);
      }
    };
    const handleFocus = () => {
      refreshTrackedBooks(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    safeSetItem('eTestTrackedBooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    const sanitizedTests = bookTests.map(test => {
      const copy = { ...test };
      delete copy.submissions;
      if (typeof copy.contentPayload === 'string' && copy.contentPayload.length > 500 && !copy.contentPayload.startsWith('http')) {
        copy.contentPayload = '[STORED_IN_INDEXEDDB]';
      }
      if (typeof copy.pdfPayload === 'string' && copy.pdfPayload.length > 500 && !copy.pdfPayload.startsWith('http')) {
        copy.pdfPayload = '[STORED_IN_INDEXEDDB]';
      }
      if (typeof copy.htmlPayload === 'string' && copy.htmlPayload.length > 500 && !copy.htmlPayload.startsWith('http')) {
        copy.htmlPayload = '[STORED_IN_INDEXEDDB]';
      }
      return copy;
    });

    const success = safeSetItem('eTestTrackedBookTests', JSON.stringify(sanitizedTests));
    if (!success) {
      const minimalTests = bookTests.map(t => ({
        id: t.id, bookId: t.bookId, name: t.name, subjectId: t.subjectId, questionCount: t.questionCount, answerKey: t.answerKey, isOpenEnded: t.isOpenEnded, questionType: t.questionType, optionCount: t.optionCount
      }));
      safeSetItem('eTestTrackedBookTests', JSON.stringify(minimalTests));
    }
  }, [bookTests]);

  const addTrackedBook = async (bookData) => {
    const newBook = {
      id: `tb_${Math.random().toString(36).substr(2, 6)}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      subjects: [],
      ...bookData
    };
    setBooks(prev => [...prev, newBook]);
    await dbAddTrackedBook(newBook);
    return newBook;
  };

  const updateTrackedBook = async (id, updates) => {
    sessionStorage.removeItem('eTestLastTrackedBooksSync');
    const idStr = String(id);
    const idUuid = toUUID(idStr);
    setBooks(prev => prev.map(book => {
      const isMatch = String(book.id) === idStr || (idUuid && String(book.id) === idUuid) || (toUUID(book.id) && String(toUUID(book.id)) === idUuid);
      return isMatch ? { ...book, ...updates } : book;
    }));
    if (updates.optionCount !== undefined) {
      const optCountNum = Number(updates.optionCount);
      setBookTests(prev => prev.map(t => {
        const isMatch = String(t.bookId) === idStr || (idUuid && String(t.bookId) === idUuid) || (toUUID(t.bookId) && String(toUUID(t.bookId)) === idUuid);
        return isMatch ? { ...t, optionCount: optCountNum } : t;
      }));
    }
    await dbUpdateTrackedBook(id, updates);
  };

  const deleteTrackedBook = async (id) => {
    sessionStorage.removeItem('eTestLastTrackedBooksSync');
    const idStr = String(id);
    const idUuid = toUUID(idStr);

    setBooks(prev => {
      const next = prev.filter(b => !(String(b.id) === idStr || (idUuid && String(b.id) === idUuid) || (toUUID(b.id) && String(toUUID(b.id)) === idUuid)));
      safeSetItem('eTestTrackedBooks', JSON.stringify(next));
      return next;
    });

    setBookTests(prev => {
      const next = prev.filter(t => !(String(t.bookId) === idStr || (idUuid && String(t.bookId) === idUuid) || (toUUID(t.bookId) && String(toUUID(t.bookId)) === idUuid)));
      safeSetItem('eTestTrackedBookTests', JSON.stringify(next));
      return next;
    });

    await dbDeleteTrackedBook(id);
  };

  const addTrackedBookTest = async (bookId, testData) => {
    const newTest = {
      id: `tbt_${Math.random().toString(36).substr(2, 6)}_${Date.now()}`,
      bookId,
      createdAt: new Date().toISOString(),
      ...testData
    };
    setBookTests(prev => [...prev, newTest]);
    await dbAddTrackedBookTest(newTest);
    return newTest;
  };

  const batchSaveTrackedBookTests = async (testsList) => {
    if (!Array.isArray(testsList) || testsList.length === 0) return;
    sessionStorage.removeItem('eTestLastTrackedBooksSync');
    setBookTests(prev => {
      const map = new Map(prev.map(t => [String(t.id), t]));
      testsList.forEach(t => {
        const idStr = String(t.id);
        const existing = map.get(idStr);
        map.set(idStr, { ...(existing || {}), ...t, id: idStr });
      });
      const next = Array.from(map.values());
      safeSetItem('eTestTrackedBookTests', JSON.stringify(next));
      return next;
    });
    await dbBatchUpsertTrackedBookTests(testsList);
  };

  const updateTrackedBookTest = async (id, updates) => {
    let updatedObj = null;
    const idStr = String(id);
    const idUuid = toUUID(idStr);

    setBookTests(prev => {
      const next = prev.map(test => {
        const isMatch = String(test.id) === idStr || (idUuid && String(test.id) === idUuid) || (toUUID(test.id) && String(toUUID(test.id)) === idUuid);
        if (isMatch) {
          updatedObj = { ...test, ...updates, id: test.id, bookId: updates.bookId || test.bookId || test.book_id };
          return updatedObj;
        }
        return test;
      });
      return next;
    });

    if (!updatedObj) {
      const target = bookTests.find(t => String(t.id) === idStr || (idUuid && String(t.id) === idUuid) || (toUUID(t.id) && String(toUUID(t.id)) === idUuid));
      if (target) {
        updatedObj = { ...target, ...updates, id: target.id, bookId: updates.bookId || target.bookId || target.book_id };
      } else {
        updatedObj = { id: idStr, ...updates };
      }
    }

    if (updatedObj) {
      await dbAddTrackedBookTest(updatedObj);
    }
  };

  const deleteTrackedBookTest = async (id) => {
    sessionStorage.removeItem('eTestLastTrackedBooksSync');
    const idStr = String(id);
    const idUuid = toUUID(idStr);

    setBookTests(prev => {
      const next = prev.filter(t => !(String(t.id) === idStr || (idUuid && String(t.id) === idUuid) || (toUUID(t.id) && String(toUUID(t.id)) === idUuid)));
      safeSetItem('eTestTrackedBookTests', JSON.stringify(next));
      return next;
    });

    await dbDeleteTrackedBookTest(id);
  };

  return (
    <TrackedBookContext.Provider value={{
      books,
      bookTests,
      isLoading,
      refreshTrackedBooks,
      addTrackedBook,
      updateTrackedBook,
      deleteTrackedBook,
      addTrackedBookTest,
      batchSaveTrackedBookTests,
      updateTrackedBookTest,
      deleteTrackedBookTest
    }}>
      {children}
    </TrackedBookContext.Provider>
  );
}
