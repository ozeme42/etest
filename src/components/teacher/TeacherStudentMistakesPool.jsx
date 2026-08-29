import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Scissors, Sparkles, BookOpen,
  Filter, Search, CheckSquare, Square, Calendar, ChevronRight,
  BookMarked, Eye, Clock, ArrowRight, UserCheck, Layers, HelpCircle,
  Trash2
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
    if (lower === 'genel' || lower === 'genel testler' || lower === 'other' || lower === 'undefined' || lower === 'null') continue;
    if (lower.includes('mat') || lower.includes('problem')) return 'Matematik';
    if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyo')) return 'Fen Bilimleri';
    if (lower.includes('türk') || lower.includes('turk') || lower.includes('paragraf') || lower.includes('edebiyat') || lower.includes('dil bilgisi')) return 'Türkçe';
    if (lower.includes('sosyal') || lower.includes('inkılap') || lower.includes('tarih') || lower.includes('coğrafya')) return 'Sosyal Bilgiler';
    if (lower.includes('ing') || lower.includes('english')) return 'İngilizce';
    if (lower.includes('din')) return 'Din Kültürü';
  }
  return 'Genel';
};

const resolveUnitName = (title, unit, fallback) => {
  if (unit && typeof unit === 'string' && unit.trim()) {
    const mU = unit.match(/(\d+)/);
    if (mU) return `${mU[1]}. Ünite`;
    return unit.trim();
  }
  const m = (title || '').match(/(\d+)\s*[\.\-]?\s*Ünite/i);
  if (m) return `${m[1]}. Ünite`;
  const m2 = (title || '').match(/Ünite\s*(\d+)/i);
  if (m2) return `${m2[1]}. Ünite`;
  const m3 = (title || '').match(/Ü\.\s*Değ\.\s*(\d+)/i);
  if (m3) return `${m3[1]}. Ünite`;
  return fallback || '1. Ünite';
};

const cleanTestDisplayTitle = (rawTitle) => {
  if (!rawTitle) return 'Test';
  let t = String(rawTitle).trim();
  t = t.replace(/^Ünite Ünite Yeni Nesil Soru BAnkası\s*[—–-]\s*/i, '');
  t = t.replace(/^4\.\s*Sınıf Yeni Nesil Paragraf ve Problem Tek Kitap Seti\s*[—–-]\s*/i, '');
  const m = t.match(/^(?:Türkçe|Matematik|Fen Bilimleri|Sosyal Bilgiler|İngilizce|Din Kültürü)\s*›\s*\d+\.\s*Ünite\s*\((.*)\)$/i);
  if (m) return m[1];
  t = t.replace(/^(?:Türkçe|Matematik|Fen Bilimleri|Sosyal Bilgiler|İngilizce|Din Kültürü)\s*›\s*/i, '');
  return t;
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
  const navigate = useNavigate();
  const { submissions = [], deleteSubmission, deleteSubmissionsByTestId } = useEvaluation();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { data: curData } = useCurriculum();

  // Navigation states: Book -> Subject -> Unit
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Deleting in progress state
  const [deletingId, setDeletingId] = useState(null);

  // Repetition scheduler settings
  const [scheduleMode, setScheduleMode] = useState('spaced_leitner');
  const [customIntervals, setCustomIntervals] = useState([1, 3, 7, 15]);
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);

  // Selected questions map: key -> question object
  const [selectedQuestions, setSelectedQuestions] = useState({});

  // Build mapping lookup from books: subjectId -> Subject Name, topicId -> Topic/Unit Name
  const { subjectNameMap, topicNameMap } = useMemo(() => {
    const sMap = new Map();
    const tMap = new Map();
    (books || []).forEach(b => {
      (b.subjects || []).forEach(s => {
        if (s && s.id) {
          sMap.set(String(s.id), s.name);
          (s.topics || []).forEach(top => {
            if (top && top.id) tMap.set(String(top.id), top.name);
          });
        }
      });
    });
    return { subjectNameMap: sMap, topicNameMap: tMap };
  }, [books]);

  // Build comprehensive, ACCURATE mistake database for this student across ALL books
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

    // Filter valid, completed submissions of this student
    const studentSubs = (submissions || []).filter(s => {
      if (!s || isDeletedItem(s) || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;
      const subIdStr = String(s.id || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return false;
      return true;
    });

    const bookTree = new Map();

    const resolveBookAndTestInfo = (s) => {
      const rawAnswers = s.answers || [];
      const meta = (Array.isArray(rawAnswers)) ? rawAnswers.find(a => a?.type === 'metadata') : (s.metadata || null);
      const title = (s.title || s.testTitle || '').trim();
      const metaBookTitle = (meta?.bookTitle || '').trim();

      // Lookup matching bookTest
      const candidateIds = [
        s.testId, s.test_id, s.realTestId, s.bookTestId,
        meta?.realTestId, meta?.bookTestId, meta?.testId, s.id
      ].filter(Boolean);

      let matchedBookTest = null;
      for (const cid of candidateIds) {
        const cidStr = String(cid);
        const cidUuid = toUUID(cidStr);
        matchedBookTest = (bookTests || []).find(bt => {
          const btIdStr = String(bt.id || bt.testId || '');
          return btIdStr === cidStr || btIdStr === cidUuid || toUUID(btIdStr) === cidUuid ||
            (bt.answer_key?.__meta?.realTestId && String(bt.answer_key.__meta.realTestId) === cidStr) ||
            (bt.answerKey?.__meta?.realTestId && String(bt.answerKey.__meta.realTestId) === cidStr);
        });
        if (matchedBookTest) break;
      }

      // Lookup matched book
      let matchedBook = null;
      if (matchedBookTest) {
        const bTestBookId = String(matchedBookTest.bookId || matchedBookTest.book_id || '');
        matchedBook = books.find(b => String(b.id) === bTestBookId || toUUID(b.id) === bTestBookId || toUUID(b.id) === toUUID(bTestBookId));
      }

      if (!matchedBook && metaBookTitle) {
        matchedBook = books.find(b => {
          const bt = (b.title || '').toLowerCase().trim();
          const mt = metaBookTitle.toLowerCase().trim();
          return bt === mt || bt.includes(mt) || mt.includes(bt);
        });
      }

      if (!matchedBook) {
        const lowerTitle = title.toLowerCase();
        const lowerMeta = metaBookTitle.toLowerCase();
        if (lowerTitle.includes('paragraf') || lowerTitle.includes('problem') || lowerMeta.includes('paragraf') || lowerMeta.includes('problem')) {
          matchedBook = books.find(b => {
            const bt = (b.title || '').toLowerCase();
            return bt.includes('paragraf') || bt.includes('problem');
          });
        } else if (lowerTitle.includes('ünite ünite') || lowerTitle.includes('unite unite') || lowerMeta.includes('ünite ünite') || lowerMeta.includes('unite unite')) {
          matchedBook = books.find(b => {
            const bt = (b.title || '').toLowerCase();
            return bt.includes('ünite ünite') || bt.includes('unite unite');
          });
        }
      }

      const bId = matchedBook ? matchedBook.id : (meta?.bookId || 'other_tests');
      const bTitle = matchedBook ? matchedBook.title : (metaBookTitle || (title ? 'Diğer Kitap & Testler' : 'Genel Testler'));
      const bPdfUrl = matchedBook?.pdfUrl || null;
      const bSubject = matchedBook?.subject || null;
      const bGrade = matchedBook?.grade || null;

      // Extract subject from matched test
      const testSubjFromId = matchedBookTest?.subject_id ? subjectNameMap.get(String(matchedBookTest.subject_id)) : (matchedBookTest?.subjectId ? subjectNameMap.get(String(matchedBookTest.subjectId)) : null);
      const testTopicFromId = matchedBookTest?.topic_id ? topicNameMap.get(String(matchedBookTest.topic_id)) : (matchedBookTest?.topicId ? topicNameMap.get(String(matchedBookTest.topicId)) : null);

      return {
        bookId: bId,
        bookTitle: bTitle,
        bookPdfUrl: bPdfUrl,
        bookSubject: bSubject,
        bookGrade: bGrade,
        matchedBook,
        matchedBookTest,
        testSubjFromId,
        testTopicFromId
      };
    };

    studentSubs.forEach(s => {
      const rawAnswers = s.answers || [];
      const meta = (Array.isArray(rawAnswers)) ? rawAnswers.find(a => a?.type === 'metadata') : (s.metadata || null);
      const cleanAnswers = (Array.isArray(rawAnswers)) ? rawAnswers.filter(a => a?.type !== 'metadata') : [];

      const wrongList = [];

      if (cleanAnswers.length > 0) {
        cleanAnswers.forEach((ans, idx) => {
          const qNo = ans.questionNo || ans.qNum || (idx + 1);
          const userAns = ans.userAnswer ?? ans.selectedOption ?? ans.selectedAnswer ?? ans.answer ?? ans.textAns ?? '';
          const correctAns = ans.correctAnswer ?? ans.correctOption ?? ans.correct ?? '—';
          
          const isExplicitCorrect = ans.isCorrect === true || ans.evalStatus === 'correct';
          const isMatchExact = Boolean(userAns && correctAns && correctAns !== '—' && String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase() && userAns !== 'EMPTY');
          const isCorrect = isExplicitCorrect || isMatchExact;

          if (isCorrect) return; // ✅ Doğru soru — telafi havuzuna ASLA dahil edilmez!

          const isBlank = (ans.isCorrect === null && (!userAns || userAns === 'EMPTY' || userAns === 'Boş')) || ans.evalStatus === 'empty' || userAns === 'EMPTY' || userAns === 'Boş' || !userAns;
          const isWrong = ans.isCorrect === false || ans.evalStatus === 'wrong' || (!isCorrect && !isBlank && userAns && correctAns !== '—');

          if (isWrong || isBlank) {
            wrongList.push({
              qNo,
              userAns: userAns || 'Boş',
              correctAns: (correctAns && correctAns !== '—') ? correctAns : '?',
              isWrong: Boolean(isWrong),
              isBlank: Boolean(isBlank),
              page: meta?.page || 1
            });
          }
        });
      } else {
        // Fallback: If raw answers not expanded, use wrong_count
        const wCount = Number(s.wrongCount ?? s.wrong_count ?? s.wrong ?? 0);
        for (let i = 1; i <= wCount; i++) {
          wrongList.push({
            qNo: i,
            userAns: 'Yanlış',
            correctAns: '?',
            isWrong: true,
            isBlank: false,
            page: 1
          });
        }
      }

      if (wrongList.length === 0) return;

      const {
        bookId,
        bookTitle,
        bookPdfUrl,
        bookSubject,
        bookGrade,
        testSubjFromId,
        testTopicFromId
      } = resolveBookAndTestInfo(s);

      const subjectName = resolveSubjectName(
        testSubjFromId,
        s.title,
        s.testTitle,
        meta?.subject,
        s.subject,
        bookSubject
      );

      const unitName = resolveUnitName(
        s.title || s.testTitle,
        testTopicFromId || meta?.unitTopic || meta?.unit
      );

      const displayTitle = cleanTestDisplayTitle(s.title || s.testTitle || 'Test');

      if (!bookTree.has(bookId)) {
        bookTree.set(bookId, {
          bookId,
          bookTitle,
          bookPdfUrl,
          subject: bookSubject || subjectName,
          grade: bookGrade,
          totalWrong: 0,
          totalTests: 0,
          subjectsMap: new Map()
        });
      }

      const bNode = bookTree.get(bookId);
      bNode.totalWrong += wrongList.length;
      bNode.totalTests += 1;

      if (!bNode.subjectsMap.has(subjectName)) {
        bNode.subjectsMap.set(subjectName, {
          subjectName,
          totalWrong: 0,
          totalTests: 0,
          unitsMap: new Map()
        });
      }

      const sNode = bNode.subjectsMap.get(subjectName);
      sNode.totalWrong += wrongList.length;
      sNode.totalTests += 1;

      if (!sNode.unitsMap.has(unitName)) {
        sNode.unitsMap.set(unitName, {
          unitName,
          subjectName,
          totalWrong: 0,
          tests: []
        });
      }

      const uNode = sNode.unitsMap.get(unitName);
      uNode.totalWrong += wrongList.length;
      uNode.tests.push({
        id: String(s.id),
        submissionId: String(s.id),
        supabaseId: s.supabaseId || s.id,
        testId: String(s.testId || s.test_id || meta?.realTestId || meta?.bookTestId || s.id),
        name: displayTitle,
        fullTitle: s.title || s.testTitle,
        subjectName,
        unitName,
        pdfPage: meta?.page || 1,
        wrongCount: wrongList.length,
        wrongQuestions: wrongList,
        rawSubmission: s
      });
    });

    const bookResults = [];
    bookTree.forEach(b => {
      const subjects = [];
      b.subjectsMap.forEach(s => {
        const units = Array.from(s.unitsMap.values());
        units.sort(compareUnitOrder);
        subjects.push({
          subjectName: s.subjectName,
          totalWrong: s.totalWrong,
          totalTests: s.totalTests,
          units
        });
      });

      // Subject display ordering: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce, Din Kültürü, Diğer
      const order = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü', 'Genel'];
      subjects.sort((a, b) => {
        const idxA = order.indexOf(a.subjectName);
        const idxB = order.indexOf(b.subjectName);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

      bookResults.push({
        bookId: b.bookId,
        bookTitle: b.bookTitle,
        bookPdfUrl: b.bookPdfUrl,
        subject: b.subject,
        grade: b.grade,
        totalWrong: b.totalWrong,
        totalTests: b.totalTests,
        subjects
      });
    });

    return bookResults;
  }, [student, submissions, books, bookTests, subjectNameMap, topicNameMap]);

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
      tests = tests.filter(t => t.name.toLowerCase().includes(q) || t.unitName.toLowerCase().includes(q) || (t.fullTitle && t.fullTitle.toLowerCase().includes(q)));
    }

    return tests;
  }, [activeSubjectObj, selectedUnit, searchQuery]);

  // Handle Deleting a single test submission
  const handleDeleteTestSubmission = async (test) => {
    const confirmMessage = `"${test.fullTitle || test.name}" testinin çözüm kaydını silmek istediğinize emin misiniz?\n\nBu işlem öğrencinin bu teste ait sınav sonucunu ve yanlış havuzundaki sorularını temizler.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(test.id);
    try {
      if (typeof deleteSubmission === 'function') {
        if (test.id) await deleteSubmission(test.id);
        if (test.supabaseId && test.supabaseId !== test.id) await deleteSubmission(test.supabaseId);
      }
      if (typeof deleteSubmissionsByTestId === 'function' && test.testId) {
        await deleteSubmissionsByTestId(test.testId);
      }

      // Record in local deletion cache for instant response
      try {
        const savedDeleted = localStorage.getItem('eTestDeletedSubmissions');
        const parsed = savedDeleted ? JSON.parse(savedDeleted) : [];
        const toAdd = [String(test.id), String(test.supabaseId || ''), String(test.testId || '')].filter(Boolean);
        localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(Array.from(new Set([...parsed, ...toAdd]))));
      } catch {}
    } catch (err) {
      console.error('Error deleting test submission:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle selection for a single question
  const handleToggleQuestion = (test, q) => {
    const qKey = `${test.id}_${q.qNo}`;
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
          fullTitle: test.fullTitle,
          testPage: test.pdfPage || 1,
          testItem: test,
          qNo: q.qNo,
          userAns: q.userAns,
          selectedOption: q.userAns,
          correctOption: q.correctAns,
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
    const allSelected = test.wrongQuestions.every(q => selectedQuestions[`${test.id}_${q.qNo}`]);
    setSelectedQuestions(prev => {
      const next = { ...prev };
      test.wrongQuestions.forEach(q => {
        const qKey = `${test.id}_${q.qNo}`;
        if (allSelected) {
          delete next[qKey];
        } else {
          next[qKey] = {
            bookId: activeBook.bookId,
            bookTitle: activeBook.bookTitle,
            testId: test.id,
            testTitle: test.name,
            fullTitle: test.fullTitle,
            testPage: test.pdfPage || 1,
            testItem: test,
            qNo: q.qNo,
            userAns: q.userAns,
            selectedOption: q.userAns,
            correctOption: q.correctAns,
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
      t.wrongQuestions.every(q => selectedQuestions[`${t.id}_${q.qNo}`])
    );

    setSelectedQuestions(prev => {
      const next = { ...prev };
      visibleTests.forEach(t => {
        t.wrongQuestions.forEach(q => {
          const qKey = `${t.id}_${q.qNo}`;
          if (allVisibleSelected) {
            delete next[qKey];
          } else {
            next[qKey] = {
              bookId: activeBook.bookId,
              bookTitle: activeBook.bookTitle,
              testId: t.id,
              testTitle: t.name,
              fullTitle: t.fullTitle,
              testPage: t.pdfPage || 1,
              testItem: t,
              qNo: q.qNo,
              userAns: q.userAns,
              selectedOption: q.userAns,
              correctOption: q.correctAns,
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
          title: item.fullTitle || item.testTitle,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* ── 📚 1. SEVİYE: KİTAP SEÇİM ALANI ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={15} className="text-emerald-500" />
          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
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
                onClick={() => {
                  setSelectedBookId(b.bookId);
                  setSelectedSubject(null);
                  setSelectedUnit('all');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0.65rem 1.1rem',
                  borderRadius: 12,
                  border: isSelected ? '2px solid #10b981' : '1.5px solid var(--color-border)',
                  background: isSelected ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : 'var(--color-surface)',
                  color: isSelected ? '#059669' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.18)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <span>📖 {b.bookTitle}</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '2px 7px',
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
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
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
                    padding: '0.65rem 1.25rem',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                    background: isSelected ? (isDark ? 'rgba(99,102,241,0.22)' : '#e0e7ff') : 'var(--color-surface)',
                    color: isSelected ? '#4338ca' : 'var(--color-text)',
                    cursor: 'pointer',
                    minWidth: 105,
                    boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.2)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{s.subjectName}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: isSelected ? '#4f46e5' : 'var(--color-text-muted)' }}>
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
          padding: '0.75rem 1rem',
          background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
          borderRadius: 14,
          border: '1px solid var(--color-border)'
        }}>
          {/* Ünite Hap Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedUnit('all')}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: '0.76rem',
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
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: '0.76rem',
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
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test veya soru ara..."
              style={{
                width: '100%',
                padding: '5px 10px 5px 28px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: isDark ? '#0f172a' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* ── ⚙️ ARALIKLI TEKRAR DÖNGÜSÜ & HIZLI AKSİYON ÇUBUĞU ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.09), rgba(244,63,94,0.09))',
        border: '1.5px solid rgba(99,102,241,0.28)',
        borderRadius: '1.25rem',
        padding: '0.9rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Tekrar Modu ve Günler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
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
              fontSize: '0.74rem',
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
              fontSize: '0.76rem',
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

          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#6366f1' }}>
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
              padding: '0.65rem 1.35rem',
              borderRadius: '0.85rem',
              background: selectedCount > 0 ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : '#94a3b8',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.84rem',
              border: 'none',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: selectedCount > 0 ? '0 4px 14px rgba(244,63,94,0.35)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Scissors size={15} />
            <span>✂️ Seçilen {selectedCount > 0 ? `(${selectedCount})` : ''} Soruyu PDF'ten Kırp &amp; Oluştur</span>
          </button>
        </div>
      </div>

      {/* ── 📌 4. SEVİYE: TESTLER & SORU ROZETLERİ IZGARASI ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {visibleTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
            Seçilen ünite veya filtrede yanlış soru bulunamadı.
          </div>
        ) : (
          visibleTests.map(test => {
            const allTestSelected = test.wrongQuestions.every(q => selectedQuestions[`${test.id}_${q.qNo}`]);
            const someTestSelected = test.wrongQuestions.some(q => selectedQuestions[`${test.id}_${q.qNo}`]);
            const isThisDeleting = deletingId === test.id;

            return (
              <div
                key={test.id}
                style={{
                  background: isDark ? 'rgba(30,41,59,0.7)' : '#ffffff',
                  border: someTestSelected ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '0.9rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  boxShadow: someTestSelected ? '0 3px 12px rgba(99,102,241,0.12)' : 'none',
                  opacity: isThisDeleting ? 0.45 : 1,
                  transition: 'all 0.15s'
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
                      <CheckSquare size={19} className="text-indigo-600" />
                    ) : (
                      <Square size={19} className="text-gray-400" />
                    )}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        📌 {test.name}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2',
                        color: '#dc2626'
                      }}>
                        {test.wrongCount} Yanlış Soru
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {test.unitName} {test.pdfPage ? `• Sayfa ${test.pdfPage}` : ''}
                    </div>
                  </div>
                </div>

                {/* Soru Butonları ve Aksiyon Butonları (İncele & Sil) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Soru Butonları (S.1 (C), S.4 (A)...) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {test.wrongQuestions.map(q => {
                      const qKey = `${test.id}_${q.qNo}`;
                      const isQSelected = Boolean(selectedQuestions[qKey]);

                      return (
                        <button
                          key={q.qNo}
                          type="button"
                          onClick={() => handleToggleQuestion(test, q)}
                          title={`Soru ${q.qNo}: Doğru Cevap [${q.correctAns}], Öğrencinin Cevabı [${q.userAns}]`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: isQSelected ? '2px solid #6366f1' : (isDark ? '1.5px solid rgba(239,68,68,0.45)' : '1.5px solid #fecaca'),
                            background: isQSelected
                              ? '#6366f1'
                              : (isDark ? 'rgba(239,68,68,0.15)' : '#fff1f2'),
                            color: isQSelected ? 'white' : '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            minWidth: 56,
                            transition: 'all 0.15s',
                            boxShadow: isQSelected ? '0 2px 8px rgba(99,102,241,0.35)' : 'none'
                          }}
                        >
                          <span>S.{q.qNo}</span>
                          <span style={{ fontSize: '0.68rem', opacity: isQSelected ? 0.95 : 0.8 }}>
                            ({q.correctAns})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 👁️ İncele & 🗑️ Sil Butonları */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: '1.5px solid var(--color-border)', paddingLeft: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const isTrackedBook = activeBook && activeBook.bookId !== 'other_tests' && books.some(b => String(b.id) === String(activeBook.bookId) || toUUID(b.id) === String(activeBook.bookId));
                        const isVerifiedBookTest = Boolean(test.testId && (test.testId.startsWith('tbt_') || test.testId.startsWith('7462745f') || (bookTests || []).some(bt => String(bt.id) === String(test.testId))));

                        if (isTrackedBook && isVerifiedBookTest) {
                          navigate(`/book-quiz/${test.testId}?studentId=${student.id}`, {
                            state: { from: '/remedials' }
                          });
                        } else {
                          const subId = test.submissionId || test.id;
                          navigate(`/review/${subId}?studentId=${student.id}`, {
                            state: { from: '/remedials' }
                          });
                        }
                      }}
                      title="Bu testi ve öğrencinin optik form / soru çözümlerini incele"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 11px',
                        borderRadius: 8,
                        border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #c7d2fe',
                        background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                        color: '#4f46e5',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Eye size={13} />
                      <span>İncele</span>
                    </button>

                    <button
                      type="button"
                      disabled={isThisDeleting}
                      onClick={() => handleDeleteTestSubmission(test)}
                      title="Bu testin çözüm kaydını ve yanlışlarını sil"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca',
                        background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                        color: '#dc2626',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        cursor: isThisDeleting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Sil</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
