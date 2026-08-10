import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, Target, CheckCircle2, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toUUID } from '../services/supabaseService';

// Debug flag - set to true to see matching details in console while diagnosing progress issues
const DEBUG_PROGRESS = false;

export default function StudentBooksPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [], addHomework } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, addTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewBook = async () => {
    if (!newBook.title || !newBook.publisher) return;
    setIsSaving(true);
    try {
      const bookSubjects = newBook.subjects
         .filter(s => s.name.trim() !== '' && s.testCount > 0)
         .map(s => ({ id: s.id, name: s.name }));
         
      if (bookSubjects.length === 0) {
        bookSubjects.push({ id: 'genel', name: 'Genel' });
      }

      const createdBook = await addTrackedBook({
        title: newBook.title,
        publisher: newBook.publisher,
        subjects: bookSubjects
      });

      const testPromises = [];
      const testIds = [];
      
      newBook.subjects.forEach(subject => {
        if (subject.name.trim() === '' || subject.testCount <= 0) return;
        
        for (let i = 1; i <= subject.testCount; i++) {
          testPromises.push(
            addTrackedBookTest(createdBook.id, {
              subjectId: subject.id,
              name: `Test ${i}`,
              questionCount: subject.questionsPerTest,
              isOpenEnded: false
            }).then(test => testIds.push(test.id))
          );
        }
      });
      
      await Promise.all(testPromises);

      await addHomework({
        title: `${newBook.title} (Kendi Eklediğim)`,
        isBookAssignment: true,
        bookId: createdBook.id,
        targetType: 'student',
        targetIds: [studentId],
        tests: testIds
      });

      setIsAddModalOpen(false);
      setNewBook({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
    } catch (e) {
      console.error('Failed to add book', e);
    } finally {
      setIsSaving(false);
    }
  };

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
      const book = books.find(b => String(b.id) === String(hw.bookId) && b.bookType !== 'exam');
      if (!book) return;

      if (!bookMap[book.id]) {
        bookMap[book.id] = {
          ...book,
          assignedHomeworks: [],
          allAssignedTestIds: new Set(),
          allSolvedTestIds: new Set(),
        };
      }

      bookMap[book.id].assignedHomeworks.push(hw);

      // ---- Build a normalized set of every possible ID form for this homework's tests ----
      let hwTestIdsRaw = hw.tests || [];
      if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
         const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(book.id));
         hwTestIdsRaw = allBookTests.map(bt => bt.id);
      }
      hwTestIdsRaw.forEach(id => bookMap[book.id].allAssignedTestIds.add(String(id)));

      // Also allow matching directly on the homework id itself (some flows store
      // submissions against the homework, not the individual test)
      const hwIdSet = new Set([String(hw.id)]);
      const hwUUID = toUUID(hw.id);
      if (hwUUID) hwIdSet.add(String(hwUUID));

      studentSubmissions.forEach(s => {
        // Normalize every possible id field on the submission, both raw and UUID form
        const candidateFields = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          candidateFields.push(...s.bookTestIds);
        }

        let isHwSolved = false;
        const matchedTestIds = new Set();

        candidateFields.forEach(field => {
          if (field === undefined || field === null) return;
          const raw = String(field);
          const uuid = toUUID(field);

          if (hwIdSet.has(raw) || (uuid && hwIdSet.has(String(uuid)))) {
            isHwSolved = true;
          }

          hwTestIdsRaw.forEach(id => {
            const strId = String(id);
            const uuidId = toUUID(id);
            if (strId === raw || (uuid && String(uuidId) === String(uuid))) {
              matchedTestIds.add(strId);
            }
          });
        });

        if (isHwSolved) {
          hwTestIdsRaw.forEach(id => bookMap[book.id].allSolvedTestIds.add(String(id)));
        } else {
          matchedTestIds.forEach(id => bookMap[book.id].allSolvedTestIds.add(id));
        }
      });


      // Calculate earliest due date among unfinished assignments
      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!bookMap[book.id].targetDueDate || dueDate > bookMap[book.id].targetDueDate) {
          bookMap[book.id].targetDueDate = dueDate;
        }
      }
    });

    Object.values(bookMap).forEach(b => {
      b.totalAssignedTests = b.allAssignedTestIds.size;
      b.totalSolvedTests = b.allSolvedTestIds.size;
      
      // Guard against solved count exceeding assigned count due to overlapping homeworks
      if (b.totalSolvedTests > b.totalAssignedTests) {
        b.totalSolvedTests = b.totalAssignedTests;
      }
      if (b.targetDueDate) {
        const diff = b.targetDueDate.getTime() - new Date().getTime();
        b.remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
      }

      // Calculate best submission stats
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      
      const bestSubsByKey = {};
      
      studentSubmissions.forEach(s => {
        const candidateFields = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);
        
        let belongsToThisBook = false;
        candidateFields.forEach(field => {
           if (!field) return;
           const raw = String(field);
           if (b.allAssignedTestIds.has(raw)) belongsToThisBook = true;
           b.assignedHomeworks.forEach(hw => {
              if (String(hw.id) === raw || String(toUUID(hw.id)) === raw) belongsToThisBook = true;
           });
        });
        
        if (belongsToThisBook) {
           const key = String(s.testId || s.bookTestId || s.id);
           const existing = bestSubsByKey[key];
           if (!existing || (s.score > existing.score) || (s.score === existing.score && new Date(s.submittedAt || 0) > new Date(existing.submittedAt || 0))) {
             bestSubsByKey[key] = s;
           }
        }
      });
      
      Object.values(bestSubsByKey).forEach(sub => {
         totalCorrect += sub.correctCount || 0;
         totalWrong += sub.wrongCount || 0;
         totalBlank += sub.blankCount || 0;
      });
      
      b.totalCorrect = totalCorrect;
      b.totalWrong = totalWrong;
      b.totalBlank = totalBlank;
    });

    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions]);

  const overallStats = useMemo(() => {
    let totalD = 0, totalY = 0, totalB = 0;
    let totalAssigned = 0, totalSolved = 0;
    
    assignedBooks.forEach(b => {
      totalD += (b.totalCorrect || 0);
      totalY += (b.totalWrong || 0);
      totalB += (b.totalBlank || 0);
      totalAssigned += (b.totalAssignedTests || 0);
      totalSolved += (b.totalSolvedTests || 0);
    });
    
    const totalQuestions = totalD + totalY + totalB;
    const successRate = totalQuestions > 0 ? Math.round((totalD / totalQuestions) * 100) : 0;
    const progressRate = totalAssigned > 0 ? Math.round((totalSolved / totalAssigned) * 100) : 0;

    return { totalD, totalY, totalB, successRate, progressRate, totalAssigned, totalSolved, totalBooks: assignedBooks.length };
  }, [assignedBooks]);

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
            <Map size={36} /> Kitaplarım ve İlerlemem
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', margin: 0 }}>
            Sana atanan kitapları oyun haritası gibi adım adım çöz, başarı oranını artır!
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
        >
          <Plus size={20} /> Kendi Kitabını Ekle
        </button>
      </header>

      {assignedBooks.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card glass hover-lift" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '1rem', color: '#10b981' }}>
                <Target size={28} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>Genel Başarı</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>%{overallStats.successRate}</div>
              </div>
            </div>
            <div className="card glass hover-lift" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '1rem', color: '#7c3aed' }}>
                <CheckCircle2 size={28} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>Toplam Doğru</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{overallStats.totalD}</div>
              </div>
            </div>
            <div className="card glass hover-lift" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '1rem', color: '#3b82f6' }}>
                <Activity size={28} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>Görev İlerlemesi</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>%{overallStats.progressRate}</div>
              </div>
            </div>
            <div className="card glass hover-lift" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '1rem', color: '#d97706' }}>
                <BookOpen size={28} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>Toplam Kitap</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{overallStats.totalBooks}</div>
              </div>
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} color="#6366f1" /> Kitaplara Göre Başarı Dağılımı
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={assignedBooks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="title" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={10} tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 800, fontSize: '0.85rem' }} />
                  <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: '0.85rem', fontWeight: 700 }} />
                  <Bar dataKey="totalCorrect" name="Doğru" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="totalWrong" name="Yanlış" stackId="a" fill="#ef4444" />
                  <Bar dataKey="totalBlank" name="Boş" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                    <span>Çözülen: {book.totalSolvedTests}</span>
                    <span>Toplam: {book.totalAssignedTests} Test</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginTop: '0.75rem', textAlign: 'center' }}>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>Doğru</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#059669' }}>{book.totalCorrect}</div>
                     </div>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>Yanlış</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b91c1c' }}>{book.totalWrong}</div>
                     </div>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Boş</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#64748b' }}>{book.totalBlank}</div>
                     </div>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 800 }}>Başarı</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#4f46e5' }}>
                          %{(book.totalCorrect + book.totalWrong + book.totalBlank) > 0 ? Math.round((book.totalCorrect / (book.totalCorrect + book.totalWrong + book.totalBlank)) * 100) : 0}
                        </div>
                     </div>
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

      {/* NEW BOOK MODAL */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>Kendi Kitabını Ekle</h2>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Kitap Adı</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook(prev => ({...prev, title: e.target.value}))} placeholder="Örn: TYT Matematik Soru Bankası" style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Yayınevi</label>
                <input type="text" value={newBook.publisher} onChange={e => setNewBook(prev => ({...prev, publisher: e.target.value}))} placeholder="Örn: 3D Yayınları" style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                  Dersler / Bölümler
                </label>
                {newBook.subjects.map((subj, index) => (
                  <div key={subj.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 2 }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>Ders Adı</label>}
                      <input type="text" value={subj.name} onChange={e => {
                        const newSubs = [...newBook.subjects];
                        newSubs[index].name = e.target.value;
                        setNewBook({...newBook, subjects: newSubs});
                      }} placeholder="Örn: Matematik" style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>Test Sayısı</label>}
                      <input type="number" min="1" value={subj.testCount} onChange={e => {
                        const newSubs = [...newBook.subjects];
                        newSubs[index].testCount = Number(e.target.value);
                        setNewBook({...newBook, subjects: newSubs});
                      }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>Soru (Ort.)</label>}
                      <input type="number" min="1" value={subj.questionsPerTest} onChange={e => {
                        const newSubs = [...newBook.subjects];
                        newSubs[index].questionsPerTest = Number(e.target.value);
                        setNewBook({...newBook, subjects: newSubs});
                      }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: 'transparent' }}>X</label>}
                      <button onClick={() => {
                        const newSubs = newBook.subjects.filter((_, i) => i !== index);
                        setNewBook({...newBook, subjects: newSubs});
                      }} style={{ padding: '0.6rem', background: newBook.subjects.length > 1 ? '#fee2e2' : '#f1f5f9', color: newBook.subjects.length > 1 ? '#ef4444' : '#cbd5e1', border: 'none', borderRadius: '0.5rem', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', marginTop: index === 0 ? '0' : '0' }} disabled={newBook.subjects.length <= 1}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setNewBook(prev => ({...prev, subjects: [...prev.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                  style={{ padding: '0.5rem', background: '#f8fafc', color: '#3b82f6', border: '1px dashed #bfdbfe', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}
                >
                  <Plus size={16} /> Yeni Ders Ekle
                </button>
              </div>
            </div>

            <button 
              onClick={handleSaveNewBook} 
              disabled={isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)}
              style={{ width: '100%', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 800, fontSize: '1rem', cursor: (isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)) ? 'not-allowed' : 'pointer', opacity: (isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)) ? 0.7 : 1, marginTop: '0.5rem' }}
            >
              {isSaving ? 'Harita Oluşturuluyor...' : 'Kitabı Haritama Ekle'}
            </button>
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
}