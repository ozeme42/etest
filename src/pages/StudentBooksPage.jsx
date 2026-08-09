import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { BookOpen, Map, ArrowRight, BarChart2, Star } from 'lucide-react';
import { toUUID } from '../services/supabaseService';

// Debug flag - set to true to see matching details in console while diagnosing progress issues
const DEBUG_PROGRESS = false;

export default function StudentBooksPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  // Filter book assignments
  const bookAssignments = useMemo(() => {
    return homeworks.filter(hw => {
      if (!hw.isBookAssignment) return false;
      if (hw.targetType === 'student' && hw.targetIds?.includes(studentId)) return true;
      if ((hw.targetType === 'class' || hw.targetType === 'grade') &&
          (hw.targetIds?.includes(grade) || hw.targetIds?.includes(gradeId) || hw.targetIds?.includes(className))) {
        return true;
      }
      return false;
    });
  }, [homeworks, studentId, grade, gradeId, className]);

  // Pre-filter this student's non-draft/non-in-progress submissions once
  const studentSubmissions = useMemo(() => {
    return submissions.filter(s =>
      String(s.studentId) === String(studentId) &&
      s.status !== 'in_progress' &&
      s.status !== 'draft'
    );
  }, [submissions, studentId]);

  // Group by bookId
  const assignedBooks = useMemo(() => {
    const bookMap = {};

    bookAssignments.forEach(hw => {
      const book = books.find(b => b.id === hw.bookId);
      if (!book) return;

      if (!bookMap[book.id]) {
        bookMap[book.id] = {
          ...book,
          assignedHomeworks: [],
          totalAssignedTests: 0,
          totalSolvedTests: 0,
        };
      }

      bookMap[book.id].assignedHomeworks.push(hw);

      // ---- Build a normalized set of every possible ID form for this homework's tests ----
      let hwTestIdsRaw = hw.tests || [];
      if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
         const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(book.id));
         hwTestIdsRaw = allBookTests.map(bt => bt.id);
      }
      bookMap[book.id].totalAssignedTests += hwTestIdsRaw.length;

      // Every test id in both its raw string form AND its UUID form
      const hwTestIdSet = new Set();
      hwTestIdsRaw.forEach(id => {
        hwTestIdSet.add(String(id));
        const uuid = toUUID(id);
        if (uuid) hwTestIdSet.add(String(uuid));
      });

      // Also allow matching directly on the homework id itself (some flows store
      // submissions against the homework, not the individual test)
      const hwIdSet = new Set([String(hw.id)]);
      const hwUUID = toUUID(hw.id);
      if (hwUUID) hwIdSet.add(String(hwUUID));

      const solvedInHw = studentSubmissions.filter(s => {
        // Normalize every possible id field on the submission, both raw and UUID form
        const candidateFields = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          candidateFields.push(...s.bookTestIds);
        }

        return candidateFields.some(field => {
          if (field === undefined || field === null) return false;
          const raw = String(field);
          const uuid = toUUID(field);

          if (hwTestIdSet.has(raw)) return true;
          if (uuid && hwTestIdSet.has(String(uuid))) return true;
          if (hwIdSet.has(raw)) return true;
          if (uuid && hwIdSet.has(String(uuid))) return true;

          return false;
        });
      });

      if (DEBUG_PROGRESS) {
        // eslint-disable-next-line no-console
        console.log('[Books Progress Debug] hw:', hw.id, {
          hwTestIdsRaw,
          hwTestIdSet: Array.from(hwTestIdSet),
          hwIdSet: Array.from(hwIdSet),
          studentSubmissionsSample: studentSubmissions.map(s => ({
            testId: s.testId,
            bookTestId: s.bookTestId,
            homeworkId: s.homeworkId,
            hwId: s.hwId,
            status: s.status,
          })),
          solvedInHwCount: solvedInHw.length,
        });
      }

      bookMap[book.id].totalSolvedTests += solvedInHw.length;

      // Calculate earliest due date among unfinished assignments
      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!bookMap[book.id].targetDueDate || dueDate > bookMap[book.id].targetDueDate) {
          bookMap[book.id].targetDueDate = dueDate;
        }
      }
    });

    Object.values(bookMap).forEach(b => {
      // Guard against solved count exceeding assigned count due to overlapping homeworks
      if (b.totalSolvedTests > b.totalAssignedTests) {
        b.totalSolvedTests = b.totalAssignedTests;
      }
      if (b.targetDueDate) {
        const diff = b.targetDueDate.getTime() - new Date().getTime();
        b.remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
      }
    });

    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions]);

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
          <Map size={36} /> Kitaplarım ve İlerlemem
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', margin: 0 }}>
          Sana atanan kitapları oyun haritası gibi adım adım çöz, başarı oranını artır!
        </p>
      </header>

      {assignedBooks.length === 0 ? (
        booksLoading ? (
          <div className="card glass" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ marginTop: '1rem', color: '#64748b' }}>Kitaplar Yükleniyor...</h3>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="card glass" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ background: '#f1f5f9', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#94a3b8' }}>
              <BookOpen size={40} />
            </div>
            <h2 style={{ color: '#475569', margin: '0 0 0.5rem 0' }}>Henüz Sana Atanmış Bir Kitap Yok</h2>
            <p style={{ color: '#64748b', margin: 0 }}>Öğretmenlerin sana bir kitap atadığında burada görünecek.</p>
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {assignedBooks.map(book => {
            const pct = book.totalAssignedTests > 0 ? Math.round((book.totalSolvedTests / book.totalAssignedTests) * 100) : 0;
            const isCompleted = pct >= 100;

            return (
              <div
                key={book.id}
                className="card glass hover-lift"
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  border: isCompleted ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate(`/student/books/${book.id}`)}
              >
                {isCompleted ? (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: '#10b981', color: 'white', padding: '0.4rem 1rem', borderBottomLeftRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={14} fill="white" /> TAMAMLANDI
                  </div>
                ) : book.remainingDays !== undefined ? (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: book.remainingDays < 7 ? '#ef4444' : '#f59e0b', color: 'white', padding: '0.4rem 1rem', borderBottomLeftRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Kalan Süre: {book.remainingDays} Gün
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 64, height: 85, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <BookOpen size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: '#1e293b', fontWeight: 800, lineHeight: 1.2 }}>
                      {book.title}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{book.publisher}</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
                    <span style={{ color: '#475569' }}>İlerleme Durumu</span>
                    <span style={{ color: isCompleted ? '#10b981' : 'var(--color-primary)' }}>% {pct}</span>
                  </div>
                  <div style={{ background: '#e2e8f0', height: 8, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: isCompleted ? '#10b981' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))', height: '100%', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                    <span>Çözülen: {book.totalSolvedTests}</span>
                    <span>Toplam: {book.totalAssignedTests} Test</span>
                  </div>
                </div>

                <button
                  className="btn"
                  style={{
                    width: '100%',
                    background: isCompleted ? '#f1f5f9' : 'var(--color-primary)',
                    color: isCompleted ? '#475569' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    fontWeight: 800
                  }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/student/books/${book.id}`); }}
                >
                  {isCompleted ? 'Haritayı Görüntüle' : 'Kitaba Devam Et'} <ArrowRight size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}