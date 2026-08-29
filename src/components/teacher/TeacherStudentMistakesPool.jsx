import React, { useState, useMemo } from 'react';
import {
  AlertCircle, CheckCircle2, Scissors, Sparkles, BookOpen,
  Filter, Search, CheckSquare, Square, Calendar, ChevronRight,
  BookMarked, Eye, Clock, ArrowRight, UserCheck
} from 'lucide-react';
import { useEvaluation } from '../../context/EvaluationContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useCurriculum } from '../../context/CurriculumContext';
import { toUUID } from '../../services/supabaseService';

export default function TeacherStudentMistakesPool({
  student,
  isDark,
  onLaunchSlicer
}) {
  const { submissions = [] } = useEvaluation();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { data: curData } = useCurriculum();

  const [selectedSubject, setSelectedSubject] = useState('Tümü');
  const [selectedBookFilter, setSelectedBookFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  // Repetition scheduler settings
  const [scheduleMode, setScheduleMode] = useState('spaced_leitner'); // 'spaced_leitner' | 'fast' | 'today' | 'custom' | 'none'
  const [customIntervals, setCustomIntervals] = useState([1, 3, 7, 15]);
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);

  // Extract all mistake & blank questions for this student across all books
  const allStudentMistakes = useMemo(() => {
    if (!student?.id) return [];

    const studentIdStr = String(student.id).trim();
    const studentUuidStr = String(toUUID(student.id) || '').trim();

    const isMatchStudent = (s) => {
      if (!s) return false;
      const sid = String(s.studentId ?? s.userId ?? s.student_id ?? s.raw_data?.studentId ?? s.raw_data?.student_id ?? '').trim();
      if (!sid) return false;
      return sid === studentIdStr || sid.toLowerCase() === studentIdStr.toLowerCase() ||
        (studentUuidStr && (sid === studentUuidStr || toUUID(sid) === studentUuidStr));
    };

    let deletedIds = new Set();
    try {
      const savedDeleted = localStorage.getItem('eTestDeletedSubmissions');
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed.map(String));
      }
    } catch {}

    const isDeletedItem = (s) => {
      if (!s) return true;
      const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || {});
      const candidates = [
        s.id,
        s.submissionId,
        s.supabaseId,
        s.originalSubmissionId,
        meta?.realId,
        meta?.submissionId
      ];
      return candidates.some(c => {
        if (!c) return false;
        const str = String(c);
        const u = toUUID(str);
        return deletedIds.has(str) || (u && deletedIds.has(String(u)));
      });
    };

    // Pre-index student submissions
    const subsByTestId = new Map();
    (submissions || []).forEach(s => {
      if (!s || isDeletedItem(s) || !isMatchStudent(s)) return;
      const testIds = [
        s.testId,
        s.realTestId,
        s.hwId,
        s.id,
        s.metadata?.realTestId,
        s.metadata?.testId
      ].filter(Boolean);

      testIds.forEach(tid => {
        const str = String(tid).trim();
        if (!subsByTestId.has(str)) subsByTestId.set(str, []);
        subsByTestId.get(str).push(s);

        const clean = str.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
        if (clean && clean !== str) {
          if (!subsByTestId.has(clean)) subsByTestId.set(clean, []);
          subsByTestId.get(clean).push(s);
        }
      });
    });

    const mistakesList = [];

    books.forEach(book => {
      const bTests = (book.tests && Array.isArray(book.tests) && book.tests.length > 0)
        ? book.tests
        : bookTests.filter(bt => String(bt.bookId) === String(book.id) || toUUID(bt.bookId) === toUUID(book.id));

      bTests.forEach(test => {
        const candidates = [
          test.id,
          test.realTestId,
          test.testId,
          test.supabaseId,
          String(test.id).replace(/^tbt_/, ''),
          String(test.id).replace(/^bt_/, ''),
          toUUID(test.id)
        ].filter(Boolean);

        let matchingSubs = [];
        for (const cand of candidates) {
          const found = subsByTestId.get(String(cand));
          if (found && found.length > 0) {
            matchingSubs = found;
            break;
          }
        }

        if (matchingSubs.length === 0) return;

        // Sort to get latest submission
        const latestSub = [...matchingSubs].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0))[0];
        if (!latestSub) return;

        const rawAnswers = Array.isArray(latestSub.answers) ? latestSub.answers : [];
        rawAnswers.forEach((ans, idx) => {
          if (!ans || ans.type === 'metadata') return;
          const qNo = ans.questionNo || ans.qNum || (idx + 1);
          const isWrong = ans.isCorrect === false || (ans.selectedOption && ans.selectedOption !== ans.correctOption && ans.correctOption && ans.selectedOption !== 'EMPTY');
          const isBlank = ans.selectedOption === null || ans.selectedOption === undefined || ans.selectedOption === '' || ans.selectedOption === 'EMPTY';

          if (isWrong || isBlank) {
            const uniqueKey = `${book.id}_${test.id}_${qNo}`;
            mistakesList.push({
              id: uniqueKey,
              bookId: book.id,
              bookTitle: book.title,
              bookPdfUrl: book.pdfUrl,
              subject: book.subject || test.subjectName || 'Genel',
              grade: book.grade,
              testId: test.id,
              testTitle: test.title || test.name || `${test.testNo || 1}. Test`,
              testPage: test.pdfPage || test.page || 1,
              testItem: test,
              qNo,
              selectedOption: ans.selectedOption || 'Boş',
              correctOption: ans.correctOption || '—',
              isWrong,
              isBlank,
              submittedAt: latestSub.submittedAt || latestSub.createdAt
            });
          }
        });
      });
    });

    return mistakesList;
  }, [student, submissions, books, bookTests]);

  // Unique subjects with counts
  const subjectList = useMemo(() => {
    const counts = {};
    allStudentMistakes.forEach(m => {
      counts[m.subject] = (counts[m.subject] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allStudentMistakes]);

  // Unique books with counts
  const bookList = useMemo(() => {
    const counts = {};
    allStudentMistakes.forEach(m => {
      counts[m.bookId] = { id: m.bookId, title: m.bookTitle, count: (counts[m.bookId]?.count || 0) + 1 };
    });
    return Object.values(counts);
  }, [allStudentMistakes]);

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return allStudentMistakes.filter(m => {
      const matchSubject = selectedSubject === 'Tümü' || m.subject === selectedSubject;
      const matchBook = selectedBookFilter === 'all' || String(m.bookId) === String(selectedBookFilter);
      const matchSearch = !searchQuery.trim() ||
        m.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.testTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchBook && matchSearch;
    });
  }, [allStudentMistakes, selectedSubject, selectedBookFilter, searchQuery]);

  const handleToggleSelectAll = () => {
    if (selectedQuestionIds.length === filteredMistakes.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredMistakes.map(m => m.id));
    }
  };

  const handleToggleQuestion = (id) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateRemedialFromSelection = () => {
    if (selectedQuestionIds.length === 0) return;
    const selectedItems = allStudentMistakes.filter(m => selectedQuestionIds.includes(m.id));
    if (selectedItems.length === 0) return;

    // Pick target book from first selected item
    const targetBookId = selectedItems[0].bookId;

    // Group selected items for initialMistakes in Slicer
    const mistakesByTest = {};
    selectedItems.forEach(item => {
      if (!mistakesByTest[item.testId]) {
        mistakesByTest[item.testId] = {
          ...item.testItem,
          id: item.testId,
          testId: item.testId,
          title: item.testTitle,
          page: item.testPage,
          pdfPage: item.testPage,
          wrongQuestionsList: [],
          wrongCount: 0
        };
      }
      mistakesByTest[item.testId].wrongQuestionsList.push({
        qNum: item.qNo,
        selectedOption: item.selectedOption,
        correctOption: item.correctOption,
        page: item.testPage,
        pdfPage: item.testPage
      });
      mistakesByTest[item.testId].wrongCount++;
    });

    const structuredMistakes = Object.values(mistakesByTest);

    if (onLaunchSlicer) {
      onLaunchSlicer({
        studentId: student.id,
        bookId: targetBookId,
        mistakes: structuredMistakes,
        scheduleMode,
        customIntervals,
        keepMasteryTracking,
        subject: selectedItems[0].subject,
        grade: selectedItems[0].grade
      });
    }
  };

  if (!student) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
        Lütfen yukarıdan veya soldan bir öğrenci seçin.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── ⚙️ ARALIKLI TEKRAR & GÜN SEÇİM KONTROL ÇUBUĞU ── */}
      <div style={{
        background: isDark ? 'rgba(30,41,59,0.6)' : '#f8fafc',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={15} className="text-amber-500" />
              <span>Tekrar Planı:</span>
            </span>
            <select
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--color-border)',
                background: isDark ? '#0f172a' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <option value="spaced_leitner">🧠 Standart Leitner (1, 3, 7, 15 Gün)</option>
              <option value="fast">⚡ Hızlı Pekiştirme (1, 2, 4, 7 Gün)</option>
              <option value="today">📅 Sadece Bugün (1 Gün)</option>
              <option value="custom">⚙️ Özel Günler...</option>
              <option value="none">🚫 Programa Ekleme (Sadece Havuz)</option>
            </select>
          </div>

          {scheduleMode === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map(dayNum => {
                const isSelected = customIntervals.includes(dayNum);
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      setCustomIntervals(prev => {
                        if (prev.includes(dayNum)) {
                          if (prev.length <= 1) return prev;
                          return prev.filter(d => d !== dayNum);
                        } else {
                          return [...prev, dayNum].sort((a, b) => a - b);
                        }
                      });
                    }}
                    style={{
                      padding: '2px 7px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                      background: isSelected ? '#6366f1' : 'transparent',
                      color: isSelected ? 'white' : 'var(--color-text-muted)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {dayNum}g
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {scheduleMode !== 'none' && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.74rem',
            fontWeight: 900,
            color: '#059669',
            cursor: 'pointer',
            userSelect: 'none',
            background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.3)'
          }}>
            <input
              type="checkbox"
              checked={keepMasteryTracking}
              onChange={(e) => setKeepMasteryTracking(e.target.checked)}
              style={{ accentColor: '#10b981', cursor: 'pointer' }}
            />
            <span>🎯 %100 Doğru Yapılana Kadar Tekrar Et</span>
          </label>
        )}
      </div>

      {/* ── 🔍 FİLTRELEME & SEÇİM ÇUBUĞU ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Ders Filtreleri */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedSubject('Tümü')}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: selectedSubject === 'Tümü' ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
              background: selectedSubject === 'Tümü' ? (isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : 'transparent',
              color: selectedSubject === 'Tümü' ? (isDark ? '#c7d2fe' : '#4338ca') : 'var(--color-text-muted)'
            }}
          >
            Tüm Dersler ({allStudentMistakes.length})
          </button>
          {subjectList.map(s => (
            <button
              key={s.name}
              type="button"
              onClick={() => setSelectedSubject(s.name)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: selectedSubject === s.name ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                background: selectedSubject === s.name ? (isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : 'transparent',
                color: selectedSubject === s.name ? (isDark ? '#c7d2fe' : '#4338ca') : 'var(--color-text-muted)'
              }}
            >
              {s.name} ({s.count})
            </button>
          ))}
        </div>

        {/* Kitap Filtresi & Arama */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {bookList.length > 1 && (
            <select
              value={selectedBookFilter}
              onChange={(e) => setSelectedBookFilter(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: isDark ? '#1e293b' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.74rem',
                fontWeight: 800,
                maxWidth: 200,
                cursor: 'pointer'
              }}
            >
              <option value="all">Tüm Kitaplar ({bookList.length})</option>
              {bookList.map(b => (
                <option key={b.id} value={b.id}>
                  📖 {b.title} ({b.count})
                </option>
              ))}
            </select>
          )}

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Soru veya test ara..."
              style={{
                padding: '4px 8px 4px 26px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: isDark ? '#1e293b' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.74rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 🚀 SEÇİM VE TELAFİ OLUŞTUR AKSİYON ÇUBUĞU ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(244,63,94,0.08))',
        border: '1.5px solid rgba(99,102,241,0.25)',
        borderRadius: '1rem',
        padding: '0.75rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleToggleSelectAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            {selectedQuestionIds.length === filteredMistakes.length && filteredMistakes.length > 0 ? (
              <CheckSquare size={16} className="text-indigo-600" />
            ) : (
              <Square size={16} className="text-gray-400" />
            )}
            <span>Tümünü Seç ({filteredMistakes.length})</span>
          </button>

          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#6366f1' }}>
            📌 {selectedQuestionIds.length} Soru Seçildi
          </span>
        </div>

        <button
          type="button"
          disabled={selectedQuestionIds.length === 0}
          onClick={handleCreateRemedialFromSelection}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0.6rem 1.25rem',
            borderRadius: '0.85rem',
            background: selectedQuestionIds.length > 0 ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : '#94a3b8',
            color: 'white',
            fontWeight: 900,
            fontSize: '0.82rem',
            border: 'none',
            cursor: selectedQuestionIds.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedQuestionIds.length > 0 ? '0 4px 14px rgba(244,63,94,0.35)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <Scissors size={16} />
          <span>✂️ Seçilen {selectedQuestionIds.length > 0 ? `(${selectedQuestionIds.length})` : ''} Soruyu PDF'ten Kırp &amp; Telafi Testi Oluştur</span>
        </button>
      </div>

      {/* ── 📋 YANLIŞ SORULAR TABLO/KART LİSTESİ ── */}
      {filteredMistakes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1rem',
          background: isDark ? 'rgba(30,41,59,0.3)' : '#f8fafc',
          borderRadius: '1.25rem',
          border: '1.5px dashed var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle2 size={36} style={{ color: '#10b981' }} />
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
            Tebrikler! Yanlış Soru Bulunamadı 🏆
          </h4>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Seçilen filtrelerde bu öğrenciye ait herhangi bir yanlış/boş soru kalmadı.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
          {filteredMistakes.map(item => {
            const isChecked = selectedQuestionIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleToggleQuestion(item.id)}
                style={{
                  background: isChecked
                    ? (isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff')
                    : (isDark ? 'rgba(30,41,59,0.7)' : '#ffffff'),
                  border: isChecked
                    ? '1.5px solid #6366f1'
                    : '1.5px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isChecked ? '0 3px 10px rgba(99,102,241,0.12)' : 'none'
                }}
              >
                <div style={{ flexShrink: 0, color: isChecked ? '#6366f1' : 'var(--color-text-muted)' }}>
                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#6366f1' }}>
                      📚 {item.subject}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: item.isWrong ? (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2') : (isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7'),
                      color: item.isWrong ? '#dc2626' : '#d97706'
                    }}>
                      {item.isWrong ? 'Yanlış' : 'Boş'}
                    </span>
                  </div>

                  <h5 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.bookTitle}
                  </h5>

                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{item.testTitle}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 900, color: 'var(--color-text)' }}>Soru {item.qNo}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', fontWeight: 800, marginTop: 2 }}>
                    <span style={{ color: '#ef4444' }}>Seçilen: ✗ {item.selectedOption}</span>
                    <span style={{ color: '#10b981' }}>Doğru: ✓ {item.correctOption}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
