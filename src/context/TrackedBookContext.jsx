import { createContext, useContext, useState, useEffect } from 'react';

const TrackedBookContext = createContext();

export function useTrackedBooks() {
  return useContext(TrackedBookContext);
}

const INITIAL_BOOKS = [];
const INITIAL_TESTS = [];

export function TrackedBookProvider({ children }) {
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('eTestTrackedBooks');
    return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  });

  const [bookTests, setBookTests] = useState(() => {
    const saved = localStorage.getItem('eTestTrackedBookTests');
    return saved ? JSON.parse(saved) : INITIAL_TESTS;
  });

  useEffect(() => {
    localStorage.setItem('eTestTrackedBooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('eTestTrackedBookTests', JSON.stringify(bookTests));
  }, [bookTests]);

  const addTrackedBook = (bookData) => {
    const newBook = {
      id: `tb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      subjects: [],
      ...bookData
    };
    setBooks(prev => [...prev, newBook]);
    return newBook;
  };

  const updateTrackedBook = (id, updates) => {
    setBooks(prev => prev.map(book => book.id === id ? { ...book, ...updates } : book));
  };

  const deleteTrackedBook = (id) => {
    setBooks(prev => prev.filter(book => book.id !== id));
    // Also delete associated tests
    setBookTests(prev => prev.filter(test => test.bookId !== id));
  };

  const addTrackedBookTest = (bookId, testData) => {
    const newTest = {
      id: `tbt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookId,
      createdAt: new Date().toISOString(),
      ...testData
    };
    setBookTests(prev => [...prev, newTest]);
    return newTest;
  };

  const updateTrackedBookTest = (id, updates) => {
    setBookTests(prev => prev.map(test => test.id === id ? { ...test, ...updates } : test));
  };

  const deleteTrackedBookTest = (id) => {
    setBookTests(prev => prev.filter(test => test.id !== id));
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
