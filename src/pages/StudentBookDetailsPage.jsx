import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { BookOpen, ArrowLeft, CheckCircle2, Lock, PlayCircle, Layers, Award, Target, Settings, X, Save } from 'lucide-react';
import { toUUID } from '../services/supabaseService';

export default function StudentBookDetailsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [], isLoading: hwLoading } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, updateTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  // Find the book
  const book = useMemo(() => books.find(b => String(b.id) === String(bookId)), [books, bookId]);

  // Find all test IDs assigned to this student for this book
  const bookData = useMemo(() => {
    const ids = new Set();
    let targetDueDate = null;

    const bookAssignments = homeworks.filter(hw => {
      if (!hw.isBookAssignment || String(hw.bookId) !== String(bookId)) return false;
      if (hw.targetType === 'student' && hw.targetIds?.includes(studentId)) return true;
      if ((hw.targetType === 'class' || hw.targetType === 'grade') && 
          (hw.targetIds?.includes(grade) || hw.targetIds?.includes(gradeId) || hw.targetIds?.includes(className))) {
        return true;
      }
      return false;
    });

    let isSelfAdded = false;

    bookAssignments.forEach(hw => {
      if (hw.title && hw.title.includes('(Kendi Eklediğim)')) {
        isSelfAdded = true;
      }
      
      if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
        bookTests.forEach(bt => {
           if (String(bt.bookId) === String(bookId)) {
             ids.add(String(bt.id));
           }
        });
      } else if (hw.tests) {
        hw.tests.forEach(tId => ids.add(String(tId)));
      }

      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!targetDueDate || dueDate > targetDueDate) {
          targetDueDate = dueDate;
        }
      }
    });

    let remainingDays = null;
    if (targetDueDate) {
      const diff = targetDueDate.getTime() - new Date().getTime();
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    }

    return { ids, targetDueDate, remainingDays, isSelfAdded };
  }, [homeworks, bookId, studentId, grade, gradeId, className]);

  const assignedTestIds = bookData.ids;

  // Compute test completion logic and lock statuses
  // Hierarchy: For each Subject -> ordered list of assigned tests.
  const subjectProgress = useMemo(() => {
    if (!book) return [];

    return (book.subjects || []).map(subject => {
      // Find all tests in this subject
      const allSubjectTests = bookTests.filter(t => String(t.subjectId) === String(subject.id));
      
      // Filter only those assigned to the student
      const assignedSubjTests = allSubjectTests
        .filter(t => assignedTestIds.has(String(t.id)))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
      
      if (assignedSubjTests.length === 0) return null;

      // Check completions
      let hasFoundFirstUnfinished = false;
      
      const testsWithStatus = assignedSubjTests.map((t, index) => {
        // Is it solved?
        const solvedSubs = submissions.filter(s => {
          if (String(s.studentId) !== String(studentId)) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;
          
          // Direct match
          if (String(s.testId) === String(t.id) || String(s.testId) === toUUID(t.id)) return true;
          if (String(s.bookTestId) === String(t.id) || String(s.bookTestId) === toUUID(t.id)) return true;
          if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === String(t.id) || String(tid) === toUUID(t.id))) return true;

          // Homework match! If the submission is a homework (starts with hw_ or is its UUID equivalent)
          const relatedHw = homeworks.find(hw => String(hw.id) === String(s.testId) || toUUID(hw.id) === String(s.testId));
          if (relatedHw && relatedHw.tests && relatedHw.tests.some(tId => String(tId) === String(t.id) || String(tId) === toUUID(t.id))) {
            return true;
          }
          return false;
        });
        
        // Check if there is a homework submission for this test (from before UUID fix)
        const hwForTest = homeworks.find(hw => hw.tests && hw.tests.some(tId => String(tId) === String(t.id) || String(tId) === toUUID(t.id)));
        const hwSub = (hwForTest?.submissions || []).find(s => String(s.studentId) === String(studentId));
        
        const isCompleted = solvedSubs.length > 0 || !!hwSub;
        
        let bestScore = null;
        let bestSub = null;
        if (solvedSubs.length > 0) {
          bestScore = Math.max(...solvedSubs.map(s => s.score || 0));
          bestSub = solvedSubs[solvedSubs.length - 1]; // get the latest one
        } else if (hwSub) {
          bestScore = hwSub.score || 0;
          bestSub = hwSub;
        }

        // Is it locked? (Locked if it's NOT completed AND we already found an earlier unfinished test)
        let isLocked = false;
        
        if (!isCompleted) {
           if (hasFoundFirstUnfinished) {
             isLocked = true;
           } else {
             // This is the first unfinished test, so it's unlocked!
             hasFoundFirstUnfinished = true;
           }
        }

        return {
          ...t,
          index: index + 1,
          isCompleted,
          isLocked,
          bestScore,
          bestSub,
          latestSubId: isCompleted ? (solvedSubs.length > 0 ? solvedSubs[solvedSubs.length - 1].id : (hwSub ? hwSub.id : null)) : null
        };
      });

      const completedCount = testsWithStatus.filter(t => t.isCompleted).length;
      
      return {
        ...subject,
        tests: testsWithStatus,
        completedCount,
        totalCount: testsWithStatus.length,
        pct: Math.round((completedCount / testsWithStatus.length) * 100)
      };
    }).filter(Boolean); // Remove subjects that have 0 assigned tests
  }, [book, bookTests, assignedTestIds, submissions, studentId, homeworks]);

  const [isBulkSettingsModalOpen, setIsBulkSettingsModalOpen] = useState(false);
  const [bulkSettings, setBulkSettings] = useState({}); 
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  useEffect(() => {
    if (isBulkSettingsModalOpen) {
      const initial = {};
      subjectProgress.forEach(subj => {
        subj.tests.forEach(t => {
           let akString = "";
           if (t.answerKey && typeof t.answerKey === 'object') {
             const maxQ = Math.max(...Object.keys(t.answerKey).map(Number), 0);
             for(let i=1; i<=maxQ; i++) {
               akString += t.answerKey[i] || " ";
             }
           }
           initial[t.id] = {
             questionCount: t.questionCount || 20,
             answerKeyString: akString.trim()
           };
        });
      });
      setBulkSettings(initial);
    }
  }, [isBulkSettingsModalOpen, subjectProgress]);

  const handleSaveBulkSettings = async () => {
    setIsSavingBulk(true);
    try {
       const promises = [];
       Object.entries(bulkSettings).forEach(([testId, data]) => {
         const akStr = (data.answerKeyString || '').replace(/[^A-Ea-e]/g, '').toUpperCase();
         const akObj = {};
         for(let i=0; i<akStr.length; i++) {
            akObj[i+1] = akStr[i];
         }
         
         promises.push(
           updateTrackedBookTest(testId, {
             questionCount: data.questionCount,
             answerKey: akObj
           })
         );
       });
       await Promise.all(promises);
       setIsBulkSettingsModalOpen(false);
    } catch(e) {
      console.error('Save error:', e);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const isDataLoading = booksLoading || (hwLoading && homeworks.length === 0);

  if (!book) {
    if (isDataLoading) {
      return (
        <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ marginTop: '1rem', color: '#64748b' }}>Kitap Haritası Yükleniyor...</h3>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    return <div className="container" style={{ padding: '2rem' }}>Kitap bulunamadı.</div>;
  }

  let overallCompleted = 0;
  let overallTotal = 0;
  let overallCorrect = 0;
  let overallWrong = 0;
  let overallBlank = 0;

  subjectProgress.forEach(subj => {
    overallCompleted += subj.completedCount;
    overallTotal += subj.totalCount;
    subj.tests.forEach(test => {
      if (test.isCompleted && test.bestSub) {
        overallCorrect += test.bestSub.correctCount || 0;
        overallWrong += test.bestSub.wrongCount || 0;
        overallBlank += test.bestSub.blankCount || 0;
      }
    });
  });

  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
  const totalQuestions = overallCorrect + overallWrong + overallBlank;
  const overallSuccessRate = totalQuestions > 0 ? Math.round((overallCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/student/books')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}
        >
          <ArrowLeft size={18} /> Kitaplarıma Dön
        </button>

        {bookData.isSelfAdded && (
          <button 
            className="btn hover-lift" 
            onClick={() => setIsBulkSettingsModalOpen(true)}
            style={{ background: '#3b82f6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, padding: '0.6rem 1.2rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
          >
            <Settings size={18} /> Hızlı Cevap Anahtarı Gir
          </button>
        )}
      </div>

      {/* Smart Pacing Guide */}
      {overallPct < 100 && bookData.remainingDays !== null && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '2px solid #86efac', borderRadius: '1rem', padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)' }}>
          <div style={{ background: '#16a34a', color: 'white', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#15803d', fontWeight: 900 }}>Akıllı Tempo Önerisi</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#16a34a', fontWeight: 600 }}>
              {bookData.remainingDays === 0 ? (
                "Süren doldu! Testleri bir an önce tamamlamalısın."
              ) : (
                `Hedefe ${bookData.remainingDays} gün kaldı. Zamanında bitirmek için haftada ortalama ${Math.max(1, Math.ceil(((overallTotal - overallCompleted) / bookData.remainingDays) * 7))} test çözmelisin.`
              )}
            </p>
          </div>
        </div>
      )}

      {/* Book Header */}
      <div className="card glass" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 100, height: 140, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', flexShrink: 0 }}>
          <BookOpen size={48} />
        </div>
        <div style={{ flex: 1, minWidth: 250 }}>
          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            {book.publisher}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', margin: '0 0 1rem 0' }}>
            {book.title}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 800 }}>
                <span style={{ color: '#475569' }}>Genel İlerleme</span>
                <span style={{ color: overallPct === 100 ? '#10b981' : 'var(--color-primary)' }}>% {overallPct}</span>
              </div>
              <div style={{ background: '#e2e8f0', height: 10, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${overallPct}%`, background: overallPct === 100 ? '#10b981' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))', height: '100%', transition: 'width 0.5s ease' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Çözülen</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b' }}>{overallCompleted} / {overallTotal}</div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0', margin: '0 0.25rem' }}></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Doğru</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>{overallCorrect}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>Yanlış</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b91c1c' }}>{overallWrong}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Boş</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#64748b' }}>{overallBlank}</div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0', margin: '0 0.25rem' }}></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>Genel Başarı</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4f46e5' }}>%{overallSuccessRate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Map / Subjects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {subjectProgress.map(subj => (
          <div key={subj.id} className="card glass" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={22} color="var(--color-primary)" /> {subj.name}
              </h2>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '99px' }}>
                {subj.completedCount} / {subj.totalCount} Tamamlandı
              </div>
            </div>

            <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
              {/* Vertical line connecting tests */}
              <div style={{ position: 'absolute', top: 10, bottom: 10, left: '2rem', width: 2, background: '#e2e8f0', zIndex: 0 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                {subj.tests.map(test => {
                  const Icon = test.isCompleted ? CheckCircle2 : (test.isLocked ? Lock : PlayCircle);
                  let iconColor = '#94a3b8'; // default locked
                  let bgCol = '#f8fafc';
                  let borderCol = '#e2e8f0';

                  if (test.isCompleted) {
                    iconColor = '#10b981'; // green
                    bgCol = '#ecfdf5';
                    borderCol = '#34d399';
                  } else if (!test.isLocked) {
                    iconColor = 'var(--color-primary)'; // blue
                    bgCol = '#eff6ff';
                    borderCol = '#bfdbfe';
                  }

                  return (
                    <div key={test.id} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: test.isCompleted ? '#10b981' : (test.isLocked ? '#e2e8f0' : 'var(--color-primary)'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', flexShrink: 0, boxShadow: !test.isLocked && !test.isCompleted ? '0 0 0 4px rgba(99,102,241,0.2)' : 'none' }}>
                        {test.index}
                      </div>
                      
                      <div style={{ flex: 1, background: bgCol, border: `1px solid ${borderCol}`, borderRadius: '0.85rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', opacity: test.isLocked ? 0.7 : 1 }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 800, color: test.isLocked ? '#64748b' : '#1e293b' }}>
                            {test.name}
                          </h3>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {test.topicName || 'Genel Test'} • {test.questionCount || 20} Soru
                          </div>
                        </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {test.isCompleted && test.bestScore !== null && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Award size={16} /> {test.bestScore}% Başarı
                                </div>
                                {test.bestSub && (
                                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                    <span style={{ color: '#10b981' }}>{test.bestSub.correctCount || 0} D</span>
                                    <span style={{ color: '#ef4444' }}>{test.bestSub.wrongCount || 0} Y</span>
                                    <span>{test.bestSub.blankCount || 0} B</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {test.isCompleted ? (
                            <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: '#10b981', color: '#10b981' }} onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book.id}` } })}>
                              Sonucu İncele
                            </button>
                          ) : test.isLocked ? (
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Lock size={16} /> Kilitli
                            </div>
                          ) : (
                            <button className="btn btn-primary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => navigate(`/book-quiz/${test.id}`)}>
                              <PlayCircle size={16} /> Şimdi Çöz
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}



        {subjectProgress.length === 0 && (
          <div className="card glass" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            {hwLoading || booksLoading ? 'Atanmış görevler yükleniyor...' : 'Bu kitaba ait atanmış görev bulunamadı.'}
          </div>
        )}
      </div>

      {isBulkSettingsModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 900 }}>
                  <Settings size={24} /> Toplu Test Ayarları
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Cevap anahtarlarını klavyeden doğrudan (Örn: ABCDE) yazabilirsiniz.
                </p>
              </div>
              <button onClick={() => setIsBulkSettingsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {subjectProgress.map(subj => (
                  <div key={subj.id}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      {subj.name}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {subj.tests.map(t => {
                        const testData = bulkSettings[t.id] || { questionCount: 20, answerKeyString: '' };
                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '0.25rem' }}>{t.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Girilen Cevap: <strong style={{ color: testData.answerKeyString.replace(/[^A-Ea-e]/g, '').length === testData.questionCount ? '#10b981' : '#ef4444' }}>{testData.answerKeyString.replace(/[^A-Ea-e]/g, '').length}</strong> / {testData.questionCount}
                              </div>
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Soru</label>
                              <input 
                                type="number" 
                                min="1" 
                                value={testData.questionCount} 
                                onChange={e => setBulkSettings(prev => ({
                                  ...prev, 
                                  [t.id]: { ...prev[t.id], questionCount: Number(e.target.value) }
                                }))}
                                style={{ width: '60px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'center' }} 
                              />
                            </div>

                            <div style={{ flex: 3 }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Hızlı Cevap Anahtarı Girişi (A,B,C,D,E)</label>
                              <input 
                                type="text" 
                                placeholder="Örn: ABCDEADCBA..." 
                                value={testData.answerKeyString}
                                onChange={e => {
                                  const raw = e.target.value.toUpperCase();
                                  setBulkSettings(prev => ({
                                    ...prev, 
                                    [t.id]: { ...prev[t.id], answerKeyString: raw }
                                  }));
                                }}
                                style={{ 
                                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', 
                                  border: `1px solid ${testData.answerKeyString.replace(/[^A-Ea-e]/g, '').length > testData.questionCount ? '#ef4444' : '#cbd5e1'}`, 
                                  fontWeight: 800, letterSpacing: '0.25em', fontFamily: 'monospace' 
                                }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc', borderBottomLeftRadius: 'var(--border-radius-lg)', borderBottomRightRadius: 'var(--border-radius-lg)' }}>
              <button className="btn btn-outline" onClick={() => setIsBulkSettingsModalOpen(false)}>İptal</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveBulkSettings}
                disabled={isSavingBulk}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                <Save size={18} /> {isSavingBulk ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
