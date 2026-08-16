import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetTrackedBooks,
  dbAddTrackedBook,
  dbUpdateTrackedBook,
  dbDeleteTrackedBook,
  dbAddTrackedBookTest,
  dbDeleteTrackedBookTest,
  toUUID
} from '../services/supabaseService';
import { safeSetItem } from '../utils/storageUtils';

const TrackedBookContext = createContext();

export function useTrackedBooks() {
  return useContext(TrackedBookContext);
}

export function TrackedBookProvider({ children }) {
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('eTestTrackedBooks');
    return saved ? JSON.parse(saved) : [];
  });

  const [bookTests, setBookTests] = useState(() => {
    const saved = localStorage.getItem('eTestTrackedBookTests');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function syncTrackedBooksFromSupabase() {
      setIsLoading(true);
      try {
        const res = await dbGetTrackedBooks();
        if (res) {
          if (res.books) setBooks(res.books);
          if (res.bookTests) setBookTests(res.bookTests);
        }
      } finally {
        setIsLoading(false);
      }
    }
    syncTrackedBooksFromSupabase();
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
        id: t.id, bookId: t.bookId, name: t.name, subjectId: t.subjectId, questionCount: t.questionCount, answerKey: t.answerKey, isOpenEnded: t.isOpenEnded, optionCount: t.optionCount
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
    setBooks(prev => prev.map(book => book.id === id ? { ...book, ...updates } : book));
    if (updates.optionCount !== undefined) {
      setBookTests(prev => prev.map(t => (t.bookId === id || toUUID(t.bookId) === toUUID(id)) ? { ...t, optionCount: updates.optionCount } : t));
    }
    await dbUpdateTrackedBook(id, updates);
  };

  const deleteTrackedBook = async (id) => {
    setBooks(prev => prev.filter(book => book.id !== id));
    setBookTests(prev => prev.filter(test => test.bookId !== id));
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

  const updateTrackedBookTest = async (id, updates) => {
    setBookTests(prev => prev.map(test => test.id === id ? { ...test, ...updates } : test));
    const target = bookTests.find(t => t.id === id);
    if (target) {
      await dbAddTrackedBookTest({ ...target, ...updates });
    }
  };

  const deleteTrackedBookTest = async (id) => {
    setBookTests(prev => prev.filter(test => test.id !== id));
    await dbDeleteTrackedBookTest(id);
  };

  return (
    <TrackedBookContext.Provider value={{
      books,
      bookTests,
      isLoading,
      addTrackedBook,
      updateTrackedBook,
      deleteTrackedBook,
      addTrackedBookTest,
      updateTrackedBookTest,
      deleteTrackedBookTest
    }}>
      {children}
    </TrackedBookContext.Provider>
  );
}
