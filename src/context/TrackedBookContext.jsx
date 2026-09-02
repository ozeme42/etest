import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import { isCacheValid, touchCache, invalidateCache } from '../utils/cacheManager';

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

  const deduplicateTests = (tests) => {
    const map = new Map();
    tests.forEach(t => {
      if (!t) return;
      const bKey = String(t.bookId || t.book_id || '');
      const bCanonical = toUUID(bKey) || bKey;
      const sKey = String(t.subjectId || t.subject_id || t.subjectName || t.subject || 'direct').trim().toLowerCase();
      const topKey = String(t.topicId || t.topic_id || t.topicName || t.topic || 'direct').trim().toLowerCase();
      const nameKey = String(t.name || '').trim().toLowerCase();
      
      // Also include the original test ID in the key if available to ensure absolute uniqueness, 
      // since some UUIDs might genuinely have the same book, subject, topic, and name but be different tests.
      const idKey = String(t.id || '').trim();
      const key = `${bCanonical}___${sKey}___${topKey}___${nameKey}___${idKey}`;
      
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
    
    if (!force && isCacheValid('tracked_books', 30) && books.length > 0 && bookTests.length > 0) {
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
          const deduped = deduplicateBooks(cleanBooks);
          setBooks(deduped);
          safeSetItem('eTestTrackedBooks', JSON.stringify(deduped));
        }
        if (res.bookTests) {
          const dedupedTests = deduplicateTests(res.bookTests);
          setBookTests(dedupedTests);
          safeSetItem('eTestTrackedBookTests', JSON.stringify(dedupedTests));
        }
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTrackedBooks(false);

    if (!isSupabaseConfigured() || !supabase) return;

    // İki tablo da aynı debounce'ı paylaşır — birden fazla değişiklik gelirse tek fetch
    let debounceTimer = null;
    const debouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refreshTrackedBooks(true), 2000);
    };

    const bookChannel = supabase
      .channel('realtime_books_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_books' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_book_tests' }, debouncedRefresh)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      try {
        supabase.removeChannel(bookChannel);
      } catch {}
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
    invalidateCache('tracked_books');
    sessionStorage.removeItem('eTestLastTrackedBooksSync');
    const idStr = String(id);
    const idUuid = toUUID(idStr);
    
    setBooks(prev => {
      const next = prev.map(book => {
        const isMatch = String(book.id) === idStr || (idUuid && String(book.id) === idUuid) || (toUUID(book.id) && String(toUUID(book.id)) === idUuid);
        return isMatch ? { ...book, ...updates } : book;
      });
      safeSetItem('eTestTrackedBooks', JSON.stringify(next));
      return next;
    });

    if (updates.optionCount !== undefined) {
      const optCountNum = Number(updates.optionCount);
      setBookTests(prev => {
        const next = prev.map(t => {
          const isMatch = String(t.bookId) === idStr || (idUuid && String(t.bookId) === idUuid) || (toUUID(t.bookId) && String(toUUID(t.bookId)) === idUuid);
          return isMatch ? { ...t, optionCount: optCountNum } : t;
        });
        safeSetItem('eTestTrackedBookTests', JSON.stringify(next));
        return next;
      });
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
    
    // 1. Update bookTests map and localStorage
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

    // 2. Also update embedded tests inside books subjects/topics
    const testsMapById = new Map();
    testsList.forEach(t => {
      if (t?.id) {
        testsMapById.set(String(t.id), t);
        const u = toUUID(t.id);
        if (u) testsMapById.set(String(u), t);
      }
    });

    setBooks(prevBooks => {
      const nextBooks = prevBooks.map(b => {
        let changed = false;
        const newSubjects = (b.subjects || []).map(s => {
          let sChanged = false;
          const newTests = (s.tests || []).map(t => {
            const updated = testsMapById.get(String(t.id)) || (toUUID(t.id) && testsMapById.get(String(toUUID(t.id))));
            if (updated) {
              sChanged = true;
              changed = true;
              return { ...t, ...updated, id: t.id };
            }
            return t;
          });
          const newTopics = (s.topics || []).map(tp => {
            let tpChanged = false;
            const newTpTests = (tp.tests || []).map(t => {
              const updated = testsMapById.get(String(t.id)) || (toUUID(t.id) && testsMapById.get(String(toUUID(t.id))));
              if (updated) {
                tpChanged = true;
                changed = true;
                return { ...t, ...updated, id: t.id };
              }
              return t;
            });
            return tpChanged ? { ...tp, tests: newTpTests } : tp;
          });
          return sChanged || newTopics !== s.topics ? { ...s, tests: newTests, topics: newTopics } : s;
        });
        return changed ? { ...b, subjects: newSubjects } : b;
      });
      safeSetItem('eTestTrackedBooks', JSON.stringify(nextBooks));
      return nextBooks;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tracked-book-tests-updated', { detail: { tests: testsList } }));
    }

    await dbBatchUpsertTrackedBookTests(testsList);
  };

  const updateTrackedBookTest = async (id, updates) => {
    let updatedObj = null;
    const idStr = String(id);
    const idUuid = toUUID(idStr);

    sessionStorage.removeItem('eTestLastTrackedBooksSync');

    setBookTests(prev => {
      let found = false;
      const next = prev.map(test => {
        const isMatch = String(test.id) === idStr || (idUuid && String(test.id) === idUuid) || (toUUID(test.id) && String(toUUID(test.id)) === idUuid);
        if (isMatch) {
          found = true;
          updatedObj = { ...test, ...updates, id: test.id, bookId: updates.bookId || test.bookId || test.book_id };
          return updatedObj;
        }
        return test;
      });
      if (!found) {
        updatedObj = { id: idStr, ...updates };
        next.push(updatedObj);
      }
      safeSetItem('eTestTrackedBookTests', JSON.stringify(next));
      return next;
    });

    // Also update embedded test in books subjects/topics
    let bookToPersist = null;
    setBooks(prevBooks => {
      const nextBooks = prevBooks.map(b => {
        let changed = false;
        const newSubjects = (b.subjects || []).map(s => {
          let sChanged = false;
          const newTests = (s.tests || []).map(t => {
            const isMatch = String(t.id) === idStr || (idUuid && String(t.id) === idUuid) || (toUUID(t.id) && String(toUUID(t.id)) === idUuid);
            if (isMatch) {
              sChanged = true;
              changed = true;
              return { ...t, ...updates, id: t.id };
            }
            return t;
          });
          const newTopics = (s.topics || []).map(tp => {
            let tpChanged = false;
            const newTpTests = (tp.tests || []).map(t => {
              const isMatch = String(t.id) === idStr || (idUuid && String(t.id) === idUuid) || (toUUID(t.id) && String(toUUID(t.id)) === idUuid);
              if (isMatch) {
                tpChanged = true;
                changed = true;
                return { ...t, ...updates, id: t.id };
              }
              return t;
            });
            return tpChanged ? { ...tp, tests: newTpTests } : tp;
          });
          return sChanged || newTopics !== s.topics ? { ...s, tests: newTests, topics: newTopics } : s;
        });
        if (changed) {
          const updatedBook = { ...b, subjects: newSubjects };
          bookToPersist = updatedBook;
          return updatedBook;
        }
        return b;
      });
      safeSetItem('eTestTrackedBooks', JSON.stringify(nextBooks));
      return nextBooks;
    });

    if (bookToPersist) {
      await dbUpdateTrackedBook(bookToPersist.id, { subjects: bookToPersist.subjects });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tracked-book-tests-updated', { detail: { testId: id, test: updatedObj } }));
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

    setBooks(prevBooks => {
      const nextBooks = prevBooks.map(b => {
        let changed = false;
        const newSubjects = (b.subjects || []).map(s => {
          const newTests = (s.tests || []).filter(t => !(String(t.id) === idStr || (idUuid && String(t.id) === idUuid) || (toUUID(t.id) && String(toUUID(t.id)) === idUuid)));
          const newTopics = (s.topics || []).map(tp => {
            const newTpTests = (tp.tests || []).filter(t => !(String(t.id) === idStr || (idUuid && String(t.id) === idUuid) || (toUUID(t.id) && String(toUUID(t.id)) === idUuid)));
            return newTpTests.length !== (tp.tests || []).length ? { ...tp, tests: newTpTests } : tp;
          });
          if (newTests.length !== (s.tests || []).length || newTopics !== s.topics) {
            changed = true;
            return { ...s, tests: newTests, topics: newTopics };
          }
          return s;
        });
        return changed ? { ...b, subjects: newSubjects } : b;
      });
      safeSetItem('eTestTrackedBooks', JSON.stringify(nextBooks));
      return nextBooks;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('test-cache-purged', { detail: { testId: id } }));
    }

    await dbDeleteTrackedBookTest(id);
  };

  const value = useMemo(() => ({
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
  }), [books, bookTests, isLoading]);

  return (
    <TrackedBookContext.Provider value={value}>
      {children}
    </TrackedBookContext.Provider>
  );
}
