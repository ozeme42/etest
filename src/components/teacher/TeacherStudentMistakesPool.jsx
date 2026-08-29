import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle, CheckCircle2, Scissors, Sparkles, BookOpen,
  Filter, Search, CheckSquare, Square, Calendar, ChevronRight,
  BookMarked, Eye, Clock, ArrowRight, UserCheck, Layers, HelpCircle
} from 'lucide-react';
import { useEvaluation } from '../../context/EvaluationContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useCurriculum } from '../../context/CurriculumContext';
import { toUUID } from '../../services/supabaseService';

const SUBJECT_ICONS = {
  'Sosyal Bilgiler': '🏛️',
  'Sosyal': '🏛️',
  'İnkılap': '🏛️',
  'Türkçe': '📖',
  'Matematik': '📐',
  'Fen Bilimleri': '🔬',
  'Fen': '🔬',
  'İngilizce': '🇬🇧',
  'Din Kültürü': '🕌',
  'Din': '🕌',
  'Genel': '🎯'
};

const resolveSubjectName = (...candidates) => {
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const lower = c.toLowerCase().trim();
    if (lower.includes('mat')) return 'Matematik';
    if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyo')) return 'Fen Bilimleri';
    if (lower.includes('türk') || lower.includes('turk') || lower.includes('paragraf') || lower.includes('edebiyat')) return 'Türkçe';
    if (lower.includes('sosyal') || lower.includes('inkılap') || lower.includes('tarih') || lower.includes('coğrafya')) return 'Sosyal Bilgiler';
    if (lower.includes('ing') || lower.includes('english')) return 'İngilizce';
    if (lower.includes('din')) return 'Din Kültürü';
  }
  return 'Genel';
};

const compareUnitOrder = (a, b) => {
  const getNum = (name) => {
    const m = String(name || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 9999;
  };
  return getNum(a.unitName) - getNum(b.unitName);
};

export default function TeacherStudentMistakesPool({
  student,
  isDark,
  onLaunchSlicer
}) {
  const { submissions = [] } = useEvaluation();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { data: curData } = useCurriculum();

  // Navigation states: Book -> Subject -> Unit
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Repetition scheduler settings
  const [scheduleMode, setScheduleMode] = useState('spaced_leitner');
  const [customIntervals, setCustomIntervals] = useState([1, 3, 7, 15]);
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);

  // Selected questions map: key -> question object
  const [selectedQuestions, setSelectedQuestions] = useState({});

  // 1. Build comprehensive mistake database for this student across ALL books
  const booksMistakesTree = useMemo(() => {
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

    // Pre-index submissions
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

    const bookResults = [];

    books.forEach(book => {
      const bId = String(book.id || '');
      const bUuid = String(toUUID(book.id) || '');

      // Build canonical tests for this book
      const rawSubjects = (book.subjects && book.subjects.length > 0)
        ? book.subjects
        : (book.raw_data?.subjects || []);

      const canonicalTests = [];
      if (rawSubjects.length > 0) {
        rawSubjects.forEach((subj, sIdx) => {
          const sId = String(subj.id || ('subj_' + sIdx));
          const sName = resolveSubjectName(subj.name, book.subject, book.title);
          const topics = (subj.topics && Array.isArray(subj.topics) && subj.topics.length > 0)
            ? subj.topics
            : [{ id: ('top_' + sId + '_1'), name: '1. Ünite' }];

          topics.forEach((tp, tpIdx) => {
            const tpId = String(tp.id || ('tp_' + tpIdx));
            const uName = tp.name || tp.title || ((tpIdx + 1) + '. Ünite');

            let matchedTests = (bookTests || []).filter(bt => {
              const isMatchBook = String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid);
              if (!isMatchBook) return false;
              return String(bt.topicId || bt.topic_id) === tpId || (topics.length === 1 && String(bt.subjectId || bt.subject_id) === sId);
            });

            if (matchedTests.length === 0 && tp.tests && Array.isArray(tp.tests) && tp.tests.length > 0) {
              matchedTests = tp.tests;
            }

            if (matchedTests.length === 0) {
              matchedTests = [];
              for (let i = 1; i <= 5; i++) {
                matchedTests.push({
                  id: ('tbt_' + bId + '_' + sId + '_' + tpId + '_' + i),
                  bookId: bId,
                  subjectId: sId,
                  topicId: tpId,
                  name: i <= 3 ? ('Test-' + i) : (i === 4 ? 'Yeni Nesil 1' : 'Yeni Nesil 2'),
                  questionCount: 20,
                  answerKey: {}
                });
              }
            }

            matchedTests.forEach(t => {
              canonicalTests.push({
                ...t,
                id: String(t.id),
                cleanId: String(t.id).replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''),
                uuid: toUUID(t.id),
                name: t.name || t.title || 'Test',
                subjectName: sName,
                unitName: uName,
                pdfPage: t.pdfPage || t.page || tp.pdfPage || 1,
                answerKey: t.answerKey || t.answer_key || book.answerKey || {}
              });
            });
          });
        });
      } else {
        const bTests = (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid));
        const defaultSubj = resolveSubjectName(book.subject, book.title);

        if (bTests.length > 0) {
          bTests.forEach(bt => {
            canonicalTests.push({
              ...bt,
              id: String(bt.id),
              cleanId: String(bt.id).replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''),
              uuid: toUUID(bt.id),
              name: bt.name || bt.title || 'Test',
              subjectName: resolveSubjectName(bt.subject_name, bt.subjectName, bt.subject, defaultSubj),
              unitName: bt.unit_name || bt.unitName || bt.topic_name || bt.topicName || '1. Ünite',
              pdfPage: bt.pdfPage || bt.page || 1,
              answerKey: bt.answerKey || bt.answer_key || book.answerKey || {}
            });
          });
        }
      }

      // Check mistakes for this book's tests
      const subjectMap = new Map();
      let bookTotalWrong = 0;
      let bookTotalTestsWithWrong = 0;

      canonicalTests.forEach(testObj => {
        const tIdStr = String(testObj.id);
        const tCleanId = String(testObj.cleanId || '');
        const tUuidStr = String(testObj.uuid || '');

        const matchedSubs = (submissions || []).filter(s => {
          if (!s || isDeletedItem(s) || !isMatchStudent(s)) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;

          const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || {});
          const matchFields = [
            String(s.testId || ''),
            String(s.realTestId || ''),
            String(s.bookTestId || ''),
            String(s.id || ''),
            String(meta?.realTestId || ''),
            String(meta?.bookTestId || '')
          ].filter(f => Boolean(f) && f.length >= 2);

          return matchFields.some(f => (
            f === tIdStr || (tCleanId && tCleanId.length >= 3 && f === tCleanId) || (tUuidStr && f === tUuidStr)
          ));
        });

        if (matchedSubs.length === 0) return;

        const latestSub = [...matchedSubs].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0))[0];
        if (!latestSub || !Array.isArray(latestSub.answers)) return;

        const wrongQuestions = [];
        latestSub.answers.forEach((ans, idx) => {
          if (!ans || ans.type === 'metadata') return;
          const qNo = ans.questionNo || ans.qNum || (idx + 1);
          const isWrong = ans.isCorrect === false || (ans.selectedOption && ans.selectedOption !== ans.correctOption && ans.correctOption && ans.selectedOption !== 'EMPTY');
          const isBlank = ans.selectedOption === null || ans.selectedOption === undefined || ans.selectedOption === '' || ans.selectedOption === 'EMPTY';

          if (isWrong || isBlank) {
            wrongQuestions.push({
              qNo,
              selectedOption: ans.selectedOption || 'Boş',
              correctOption: ans.correctOption || '—',
              isWrong,
              isBlank,
              page: testObj.pdfPage || 1
            });
          }
        });

        if (wrongQuestions.length === 0) return;

        bookTotalWrong += wrongQuestions.length;
        bookTotalTestsWithWrong++;

        const sName = testObj.subjectName || 'Genel';
        const uName = testObj.unitName || '1. Ünite';

        if (!subjectMap.has(sName)) {
          subjectMap.set(sName, {
            subjectName: sName,
            totalWrong: 0,
            totalTests: 0,
            unitMap: new Map()
          });
        }

        const sGroup = subjectMap.get(sName);
        sGroup.totalWrong += wrongQuestions.length;
        sGroup.totalTests++;

        if (!sGroup.unitMap.has(uName)) {
          sGroup.unitMap.set(uName, {
            unitName: uName,
            subjectName: sName,
            totalWrong: 0,
            tests: []
          });
        }

        const uGroup = sGroup.unitMap.get(uName);
        uGroup.totalWrong += wrongQuestions.length;
        uGroup.tests.push({
          ...testObj,
          wrongQuestions,
          wrongCount: wrongQuestions.length
        });
      });

      if (bookTotalWrong > 0) {
        const subjects = [];
        subjectMap.forEach(sGroup => {
          const units = Array.from(sGroup.unitMap.values());
          units.sort(compareUnitOrder);
          subjects.push({
            subjectName: sGroup.subjectName,
            totalWrong: sGroup.totalWrong,
            totalTests: sGroup.totalTests,
            units
          });
        });

        bookResults.push({
          bookId: book.id,
          bookTitle: book.title,
          bookPdfUrl: book.pdfUrl,
          subject: book.subject,
          grade: book.grade,
          totalWrong: bookTotalWrong,
          totalTests: bookTotalTestsWithWrong,
          subjects
        });
      }
    });

    return bookResults;
  }, [student, submissions, books, bookTests]);

  // Auto-select first book with mistakes
  useEffect(() => {
    if (booksMistakesTree.length > 0) {
      if (!selectedBookId || !booksMistakesTree.some(b => b.bookId === selectedBookId)) {
        setSelectedBookId(booksMistakesTree[0].bookId);
      }
    }
  }, [booksMistakesTree, selectedBookId]);

  // Active book object
  const activeBook = useMemo(() => {
    if (!selectedBookId) return booksMistakesTree[0] || null;
    return booksMistakesTree.find(b => b.bookId === selectedBookId) || booksMistakesTree[0] || null;
  }, [booksMistakesTree, selectedBookId]);

  // Auto-select first subject of active book
  useEffect(() => {
    if (activeBook && activeBook.subjects.length > 0) {
      if (!selectedSubject || !activeBook.subjects.some(s => s.subjectName === selectedSubject)) {
        setSelectedSubject(activeBook.subjects[0].subjectName);
      }
    }
  }, [activeBook, selectedSubject]);

  // Active subject object
  const activeSubjectObj = useMemo(() => {
    if (!activeBook || !activeBook.subjects) return null;
    if (!selectedSubject) return activeBook.subjects[0] || null;
    return activeBook.subjects.find(s => s.subjectName === selectedSubject) || activeBook.subjects[0] || null;
  }, [activeBook, selectedSubject]);

  // Filtered tests under active subject & unit
  const visibleTests = useMemo(() => {
    if (!activeSubjectObj) return [];
    let tests = [];

    if (selectedUnit === 'all') {
      activeSubjectObj.units.forEach(u => {
        tests.push(...u.tests);
      });
    } else {
      const matchedUnit = activeSubjectObj.units.find(u => u.unitName === selectedUnit);
      if (matchedUnit) {
        tests.push(...matchedUnit.tests);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tests = tests.filter(t => t.name.toLowerCase().includes(q) || t.unitName.toLowerCase().includes(q));
    }

    return tests;
  }, [activeSubjectObj, selectedUnit, searchQuery]);

  // Toggle selection for a single question
  const handleToggleQuestion = (test, q) => {
    const qKey = test.id + '_' + q.qNo;
    setSelectedQuestions(prev => {
      const next = { ...prev };
      if (next[qKey]) {
        delete next[qKey];
      } else {
        next[qKey] = {
          bookId: activeBook.bookId,
          bookTitle: activeBook.bookTitle,
          testId: test.id,
          testTitle: test.name,
          testPage: test.pdfPage || 1,
          testItem: test,
          qNo: q.qNo,
          selectedOption: q.selectedOption,
          correctOption: q.correctOption,
          isWrong: q.isWrong,
          isBlank: q.isBlank,
          subject: test.subjectName || activeBook.subject,
          grade: activeBook.grade
        };
      }
      return next;
    });
  };

  // Toggle all questions in a test
  const handleToggleTest = (test) => {
    const allSelected = test.wrongQuestions.every(q => selectedQuestions[test.id + '_' + q.qNo]);
    setSelectedQuestions(prev => {
      const next = { ...prev };
      test.wrongQuestions.forEach(q => {
        const qKey = test.id + '_' + q.qNo;
        if (allSelected) {
          delete next[qKey];
        } else {
          next[qKey] = {
            bookId: activeBook.bookId,
            bookTitle: activeBook.bookTitle,
            testId: test.id,
            testTitle: test.name,
            testPage: test.pdfPage || 1,
            testItem: test,
            qNo: q.qNo,
            selectedOption: q.selectedOption,
            correctOption: q.correctOption,
            isWrong: q.isWrong,
            isBlank: q.isBlank,
            subject: test.subjectName || activeBook.subject,
            grade: activeBook.grade
          };
        }
      });
      return next;
    });
  };

  // Select all visible questions in current unit/subject
  const handleSelectAllVisible = () => {
    const allVisibleSelected = visibleTests.every(t =>
      t.wrongQuestions.every(q => selectedQuestions[t.id + '_' + q.qNo])
    );

    setSelectedQuestions(prev => {
      const next = { ...prev };
      visibleTests.forEach(t => {
        t.wrongQuestions.forEach(q => {
          const qKey = t.id + '_' + q.qNo;
          if (allVisibleSelected) {
            delete next[qKey];
          } else {
            next[qKey] = {
              bookId: activeBook.bookId,
              bookTitle: activeBook.bookTitle,
              testId: t.id,
              testTitle: t.name,
              testPage: t.pdfPage || 1,
              testItem: t,
              qNo: q.qNo,
              selectedOption: q.selectedOption,
              correctOption: q.correctOption,
              isWrong: q.isWrong,
              isBlank: q.isBlank,
              subject: t.subjectName || activeBook.subject,
              grade: activeBook.grade
            };
          }
        });
      });
      return next;
    });
  };

  const selectedCount = Object.keys(selectedQuestions).length;

  const handleLaunchSlicerAction = () => {
    if (selectedCount === 0 || !activeBook) return;

    const selectedList = Object.values(selectedQuestions);

    // Group selected items for initialMistakes in Slicer
    const mistakesByTest = {};
    selectedList.forEach(item => {
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
        bookId: activeBook.bookId,
        mistakes: structuredMistakes,
        scheduleMode,
        customIntervals,
        keepMasteryTracking,
        subject: activeSubjectObj?.subjectName || activeBook.subject,
        grade: activeBook.grade
      });
    }
  };

  if (booksMistakesTree.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        background: isDark ? 'rgba(30,41,59,0.3)' : '#f8fafc',
        borderRadius: '1.25rem',
        border: '1.5px dashed var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10
      }}>
        <CheckCircle2 size={40} style={{ color: '#10b981' }} />
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>
          Harika! Yanlış Soru Havuzu Tertemiz 🏆
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 460 }}>
          Bu öğrencinin çözdüğü kitaplarda henüz yanlış soru bulunmuyor veya çözülen tüm sorular başarıyla telafi edildi.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── 📚 1. SEVİYE: KİTAP SEÇİM ALANI ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={15} className="text-emerald-500" />
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)' }}>
            1. Kitap Seçin ({booksMistakesTree.length} Kitapta Yanlış Var):
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {booksMistakesTree.map(b => {
            const isSelected = selectedBookId === b.bookId;
            return (
              <button
                key={b.bookId}
                type="button"
                onClick={() => setSelectedBookId(b.bookId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0.6rem 1rem',
                  borderRadius: 12,
                  border: isSelected ? '2px solid #10b981' : '1.5px solid var(--color-border)',
                  background: isSelected ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : 'var(--color-surface)',
                  color: isSelected ? '#059669' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.15)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <span>📖 {b.bookTitle}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: isSelected ? '#10b981' : (isDark ? '#334155' : '#e2e8f0'),
                  color: isSelected ? 'white' : 'var(--color-text-muted)'
                }}>
                  {b.totalWrong} Yanlış
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 📖 2. SEVİYE: DERS SEÇİM KARTLARI ── */}
      {activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)' }}>
              2. Ders Seçin:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {activeBook.subjects.map(s => {
              const isSelected = (selectedSubject || activeBook.subjects[0]?.subjectName) === s.subjectName;
              const icon = SUBJECT_ICONS[s.subjectName] || '📚';
              return (
                <button
                  key={s.subjectName}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(s.subjectName);
                    setSelectedUnit('all');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '0.65rem 1.1rem',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                    background: isSelected ? (isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : 'var(--color-surface)',
                    color: isSelected ? '#4338ca' : 'var(--color-text)',
                    cursor: 'pointer',
                    minWidth: 100,
                    boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.18)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>{s.subjectName}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isSelected ? '#4f46e5' : 'var(--color-text-muted)' }}>
                    ({s.totalWrong} Yanlış)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 📁 3. SEVİYE: ÜNİTELER & ARAMA ── */}
      {activeSubjectObj && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.65rem 0.85rem',
          background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
          borderRadius: 12,
          border: '1px solid var(--color-border)'
        }}>
          {/* Ünite Hap Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedUnit('all')}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: 'pointer',
                border: selectedUnit === 'all' ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                background: selectedUnit === 'all' ? '#6366f1' : 'transparent',
                color: selectedUnit === 'all' ? 'white' : 'var(--color-text-muted)'
              }}
            >
              Tüm Üniteler ({activeSubjectObj.units.reduce((acc, u) => acc + u.totalWrong, 0)})
            </button>

            {activeSubjectObj.units.map(u => (
              <button
                key={u.unitName}
                type="button"
                onClick={() => setSelectedUnit(u.unitName)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  border: selectedUnit === u.unitName ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                  background: selectedUnit === u.unitName ? '#6366f1' : 'transparent',
                  color: selectedUnit === u.unitName ? 'white' : 'var(--color-text-muted)'
                }}
              >
                {u.unitName} ({u.tests.length}T • {u.totalWrong}Y)
              </button>
            ))}
          </div>

          {/* Test / Soru Arama */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test veya soru ara..."
              style={{
                width: '100%',
                padding: '4px 8px 4px 24px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: isDark ? '#0f172a' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.72rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* ── ⚙️ ARALIKLI TEKRAR DÖNGÜSÜ & HIZLI AKSİYON ÇUBUĞU ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(244,63,94,0.08))',
        border: '1.5px solid rgba(99,102,241,0.25)',
        borderRadius: '1.25rem',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Tekrar Modu ve Günler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={14} className="text-amber-500" />
              <span>Tekrar Planı:</span>
            </span>
            <select
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: '1.5px solid var(--color-border)',
                background: isDark ? '#0f172a' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.76rem',
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
                      padding: '2px 6px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                      background: isSelected ? '#6366f1' : 'transparent',
                      color: isSelected ? 'white' : 'var(--color-text-muted)'
                    }}
                  >
                    {dayNum}g
                  </button>
                );
              })}
            </div>
          )}

          {scheduleMode !== 'none' && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.72rem',
              fontWeight: 900,
              color: '#059669',
              cursor: 'pointer',
              userSelect: 'none'
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

        {/* Seçim Sayısı ve Kırp Butonu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleSelectAllVisible}
            style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              color: 'var(--color-text)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Görünen Tümünü Seç / Kaldır
          </button>

          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#6366f1' }}>
            📌 {selectedCount} Soru Seçildi
          </span>

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleLaunchSlicerAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.6rem 1.25rem',
              borderRadius: '0.85rem',
              background: selectedCount > 0 ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : '#94a3b8',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.82rem',
              border: 'none',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: selectedCount > 0 ? '0 4px 14px rgba(244,63,94,0.35)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Scissors size={15} />
            <span>✂️ Seçilen {selectedCount > 0 ? ('(' + selectedCount + ')') : ''} Soruyu PDF'ten Kırp & Oluştur</span>
          </button>
        </div>
      </div>

      {/* ── 📌 4. SEVİYE: TESTLER & SORU ROZETLERİ IZGARASI ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {visibleTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            Seçilen ünite veya filtrede yanlış soru bulunamadı.
          </div>
        ) : (
          visibleTests.map(test => {
            const allTestSelected = test.wrongQuestions.every(q => selectedQuestions[test.id + '_' + q.qNo]);
            const someTestSelected = test.wrongQuestions.some(q => selectedQuestions[test.id + '_' + q.qNo]);

            return (
              <div
                key={test.id}
                style={{
                  background: isDark ? 'rgba(30,41,59,0.7)' : '#ffffff',
                  border: someTestSelected ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '0.85rem 1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: someTestSelected ? '0 3px 12px rgba(99,102,241,0.1)' : 'none'
                }}
              >
                {/* Test Başlığı & Ünite */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTest(test)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: allTestSelected ? '#6366f1' : 'var(--color-text)'
                    }}
                  >
                    {allTestSelected ? (
                      <CheckSquare size={18} className="text-indigo-600" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        📌 {test.name}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2',
                        color: '#dc2626'
                      }}>
                        {test.wrongCount} Yanlış
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {test.unitName} • Sayfa {test.pdfPage || 1}
                    </div>
                  </div>
                </div>

                {/* Soru Butonları (S.1 (C), S.4 (A)...) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {test.wrongQuestions.map(q => {
                    const qKey = test.id + '_' + q.qNo;
                    const isQSelected = Boolean(selectedQuestions[qKey]);

                    return (
                      <button
                        key={q.qNo}
                        type="button"
                        onClick={() => handleToggleQuestion(test, q)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: isQSelected ? '2px solid #6366f1' : (isDark ? '1.5px solid rgba(239,68,68,0.4)' : '1.5px solid #fecaca'),
                          background: isQSelected
                            ? '#6366f1'
                            : (isDark ? 'rgba(239,68,68,0.12)' : '#fff1f2'),
                          color: isQSelected ? 'white' : '#dc2626',
                          cursor: 'pointer',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          minWidth: 54,
                          transition: 'all 0.15s',
                          boxShadow: isQSelected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                        }}
                      >
                        <span>S.{q.qNo}</span>
                        <span style={{ fontSize: '0.66rem', opacity: isQSelected ? 0.9 : 0.75 }}>
                          ({q.correctOption})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}