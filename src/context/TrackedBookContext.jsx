import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetTrackedBooks,
  dbAddTrackedBook,
  dbUpdateTrackedBook,
  dbDeleteTrackedBook,
  dbAddTrackedBookTest,
  dbDeleteTrackedBookTest
} from '../services/supabaseService';

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
    try {
      localStorage.setItem('eTestTrackedBooks', JSON.stringify(books));
    } catch (e) {
      console.warn('TrackedBookContext: localStorage quota exceeded for books', e);
    }
  }, [books]);

  useEffect(() => {
    try {
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
      localStorage.setItem('eTestTrackedBookTests', JSON.stringify(sanitizedTests));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        try {
          const minimalTests = bookTests.map(t => ({
            id: t.id, bookId: t.bookId, name: t.name, subjectId: t.subjectId, questionCount: t.questionCount, answerKey: t.answerKey, isOpenEnded: t.isOpenEnded, optionCount: t.optionCount
          }));
          localStorage.setItem('eTestTrackedBookTests', JSON.stringify(minimalTests));
        } catch (e2) {
          console.warn('TrackedBookContext: localStorage quota exceeded even after minimal save', e2);
        }
      } else {
        console.warn('TrackedBookContext: localStorage quota exceeded for bookTests', e);
      }
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
