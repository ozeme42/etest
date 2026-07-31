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

  useEffect(() => {
    async function syncTrackedBooksFromSupabase() {
      const res = await dbGetTrackedBooks();
      if (res) {
        if (res.books) setBooks(res.books);
        if (res.bookTests) setBookTests(res.bookTests);
      }
    }
    syncTrackedBooksFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestTrackedBooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('eTestTrackedBookTests', JSON.stringify(bookTests));
  }, [bookTests]);

  const addTrackedBook = async (bookData) => {
    const newBook = {
      id: `tb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
      id: `tbt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
