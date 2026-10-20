import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Check, Plus, BookOpen, CheckCircle2, AlertCircle,
  HelpCircle, Calendar, Sparkles, TrendingUp, ChevronDown, Layers,
  FileText, Zap, Edit3, RotateCcw, Clipboard, CheckCheck
} from 'lucide-react';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toUUID } from '../services/supabaseService';
import { getTurkeyToday } from '../utils/dateHelpers';
import { compareOpenEndedAnswers } from '../utils/answerEvaluation';

const MISTAKE_REASONS = [
  { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '⚠️ Dikkat Kaybı', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { label: '📖 Formül / Bilgi', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  { label: '⏱️ Zaman Yetmedi', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { label: '❓ Soru Kökü Yanlış', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
];

export default function ManualTestModal({
  isOpen,
  onClose,
  initialData = null,
  onSaved = null,
  studentId: propStudentId = null
}) {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { submissions = [], addSubmission, updateSubmission } = useEvaluation();
  const { homeworks = [], submitHomework } = useHomework();
  const { data: curData } = useCurriculum();

  const studentId = propStudentId || initialData?.studentId || currentUser?.id;

  // Selected entities
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  
  // Custom text fallbacks
  const [customBookTitle, setCustomBookTitle] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customUnitTopic, setCustomUnitTopic] = useState('');
  const [customTestName, setCustomTestName] = useState('');
  // Scores
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [emptyCount, setEmptyCount] = useState(0);
  const [penaltyRatio, setPenaltyRatio] = useState('4'); // '4' for YKS, '3' for LGS, '0' for None
  const [date, setDate] = useState(() => getTurkeyToday());

  // Mistake reasons map: { 1: "⚡ İşlem Hatası", 2: "⚠️ Dikkat Kaybı" }
  const [mistakeReasons, setMistakeReasons] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Open-ended / Auto-evaluation State
  const [entryMode, setEntryMode] = useState('by_question'); // 'by_question' | 'manual_counts'
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  // Guard against re-renders wiping user-entered input while modal is open
  const prevIsOpenRef = useRef(false);
  const prevDataKeyRef = useRef(null);

  // Available followed books
  const availableBooks = useMemo(() => {
    return books.filter(b => b && b.bookType !== 'exam');
  }, [books]);

  // Selected book object
  const selectedBook = useMemo(() => {
    if (!selectedBookId || selectedBookId === '__custom__') return null;
    return books.find(b => String(b.id) === String(selectedBookId) || toUUID(b.id) === toUUID(selectedBookId));
  }, [books, selectedBookId]);

  // Available subjects for the selected book
  const availableSubjects = useMemo(() => {
    if (!selectedBook) return curData?.subjects?.map(s => s.name) || ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü'];
    return (selectedBook.subjects || []).map(s => s.name);
  }, [selectedBook, curData]);

  // Available topics for selected book & subject
  const availableTopics = useMemo(() => {
    if (!selectedBook) return [];
    const subjObj = (selectedBook.subjects || []).find(s => s.name === selectedSubject);
    return subjObj?.topics || [];
  }, [selectedBook, selectedSubject]);

  // Available tests for selected book & subject/topic
  const availableTests = useMemo(() => {
    if (!selectedBook) return [];
    const bookTList = (bookTests || []).filter(t => 
      String(t.bookId) === String(selectedBook.id) || 
      toUUID(t.bookId) === toUUID(selectedBook.id)
    );

    return bookTList.filter(t => {
      if (selectedSubject) {
        const subjObj = (selectedBook.subjects || []).find(s => s.name === selectedSubject);
        if (subjObj && t.subjectId && String(t.subjectId) !== String(subjObj.id)) return false;
      }
      if (selectedTopicId) {
        if (t.topicId && String(t.topicId) !== String(selectedTopicId)) return false;
      }
      return true;
    });
  }, [selectedBook, bookTests, selectedSubject, selectedTopicId]);

  // Selected test object
  const currentTestObj = useMemo(() => {
    if (selectedTestId && selectedTestId !== '__custom__') {
      return (
        availableTests.find(t => String(t.id) === String(selectedTestId) || toUUID(t.id) === toUUID(selectedTestId)) ||
        (bookTests || []).find(t => String(t.id) === String(selectedTestId) || toUUID(t.id) === toUUID(selectedTestId)) ||
        null
      );
    }
    if (initialData?.testId && initialData.testId !== '__custom__') {
      return (
        availableTests.find(t => String(t.id) === String(initialData.testId) || toUUID(t.id) === toUUID(initialData.testId)) ||
        (bookTests || []).find(t => String(t.id) === String(initialData.testId) || toUUID(t.id) === toUUID(initialData.testId)) ||
        null
      );
    }
    return null;
  }, [selectedTestId, availableTests, bookTests, initialData]);

  // Answer Key for selected test or book
  const testAnswerKey = useMemo(() => {
    const raw =
      initialData?.answerKey ||
      initialData?.answer_key ||
      currentTestObj?.answerKey ||
      currentTestObj?.answer_key ||
      currentTestObj?.raw_data?.answerKey ||
      currentTestObj?.raw_data?.answer_key ||
      currentTestObj?.correctAnswers ||
      currentTestObj?.opticAnswers ||
      selectedBook?.answerKey ||
      selectedBook?.answer_key ||
      selectedBook?.raw_data?.answerKey ||
      null;

    if (!raw) return null;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (typeof raw === 'object' && Object.keys(raw).filter(k => k !== '__meta' && k !== 'meta').length > 0) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
      return raw.trim();
    }
    return null;
  }, [initialData, currentTestObj, selectedBook]);

  // Check if test or book is open-ended
  const isTestOpenEnded = useMemo(() => {
    if (initialData?.isOpenEnded !== undefined) return Boolean(initialData.isOpenEnded);
    if (currentTestObj) {
      if (
        currentTestObj.isOpenEnded === true ||
        currentTestObj.is_open_ended === true ||
        currentTestObj.questionType === 'acik_uclu' ||
        currentTestObj.question_type === 'acik_uclu'
      ) return true;
      if (currentTestObj.name && /açık\s*uçlu|acik\s*uclu|yazılı\s*klasik/i.test(currentTestObj.name)) return true;
    }
    if (selectedBook && (selectedBook.bookType === 'open_ended' || selectedBook.book_type === 'open_ended')) return true;
    return false;
  }, [initialData, currentTestObj, selectedBook]);

  // Check if there is a defined answer key
  const hasDefinedAnswerKey = useMemo(() => {
    if (!testAnswerKey) return false;
    if (Array.isArray(testAnswerKey)) return testAnswerKey.length > 0;
    if (typeof testAnswerKey === 'object') {
      return Object.keys(testAnswerKey).filter(k => k !== '__meta' && k !== 'meta').length > 0;
    }
    if (typeof testAnswerKey === 'string') return testAnswerKey.trim().length > 0;
    return false;
  }, [testAnswerKey]);

  // Retrieve correct answer key for a specific question number
  const getCorrectKeyForQ = (qNo) => {
    if (!testAnswerKey) return '';
    if (Array.isArray(testAnswerKey)) {
      return String(testAnswerKey[qNo - 1] ?? testAnswerKey[qNo] ?? '').trim();
    }
    if (typeof testAnswerKey === 'object') {
      if (testAnswerKey[qNo] !== undefined && testAnswerKey[qNo] !== null && testAnswerKey[qNo] !== '') {
        return String(testAnswerKey[qNo]).trim();
      }
      if (testAnswerKey[String(qNo)] !== undefined && testAnswerKey[String(qNo)] !== null && testAnswerKey[String(qNo)] !== '') {
        return String(testAnswerKey[String(qNo)]).trim();
      }
      if (testAnswerKey[qNo - 1] !== undefined && testAnswerKey[qNo - 1] !== null && testAnswerKey[qNo - 1] !== '') {
        return String(testAnswerKey[qNo - 1]).trim();
      }
      if (testAnswerKey[String(qNo - 1)] !== undefined && testAnswerKey[String(qNo - 1)] !== null && testAnswerKey[String(qNo - 1)] !== '') {
        return String(testAnswerKey[String(qNo - 1)]).trim();
      }
    }
    if (typeof testAnswerKey === 'string') {
      const clean = testAnswerKey.replace(/[^A-Ea-e]/g, '');
      if (clean.length >= qNo) return clean[qNo - 1];
    }
    return '';
  };

  // Evaluate an answers map against answerKey
  const evaluateAnswersMap = (answersMap, totQ = totalQuestions) => {
    let cor = 0;
    let wrg = 0;
    let emp = 0;

    for (let i = 1; i <= totQ; i++) {
      const rawUserAns = answersMap[i] ?? answersMap[String(i)] ?? '';
      const rawCorrectKey = getCorrectKeyForQ(i);

      if (rawUserAns === '' || rawUserAns === null || rawUserAns === undefined) {
        emp++;
      } else if (rawCorrectKey !== '' && rawCorrectKey !== null && rawCorrectKey !== undefined) {
        const isMatch = compareOpenEndedAnswers(rawUserAns, rawCorrectKey);
        if (isMatch === true) {
          cor++;
        } else {
          wrg++;
        }
      } else {
        cor++;
      }
    }

    return { cor, wrg, emp };
  };

  // Init when modal opens or target test data changes
  useEffect(() => {
    const dataKey = initialData ? (initialData.submissionId || initialData.id || initialData.testId || initialData.bookId || '__init__') : '__null__';
    const justOpened = isOpen && !prevIsOpenRef.current;
    const dataChanged = isOpen && dataKey !== prevDataKeyRef.current;

    prevIsOpenRef.current = isOpen;
    prevDataKeyRef.current = dataKey;

    if (!isOpen) return;
    if (!justOpened && !dataChanged) return;

    const hasSpecificTestData = Boolean(
      initialData && (
        initialData.submissionId ||
        initialData.id ||
        initialData.bookId ||
        initialData.testId ||
        initialData.subject ||
        initialData.totalQuestions ||
        initialData.correctCount
      )
    );

    if (hasSpecificTestData) {
      setSelectedBookId(initialData.bookId || '__custom__');
      setSelectedSubject(initialData.subject || '');
      setSelectedTopicId(initialData.topicId || '');
      setSelectedTestId(initialData.testId || '');
      
      setCustomBookTitle(initialData.bookTitle || '');
      setCustomSubject(initialData.subject || '');
      setCustomUnitTopic(initialData.unitTopic || initialData.topic || '');
      setCustomTestName(initialData.testName || initialData.title || '');

      const tot = Number(initialData.totalQuestions) || 20;
      const cor = Number(initialData.correctCount) || 0;
      const wrg = Number(initialData.wrongCount) || 0;
      const emp = initialData.emptyCount !== undefined ? Number(initialData.emptyCount) : Math.max(0, tot - (cor + wrg));

      setTotalQuestions(tot);
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setMistakeReasons(initialData.mistakeReasons || {});

      // Populate question answers if available
      const existingAnswers = {};
      if (initialData?.studentAnswers && typeof initialData.studentAnswers === 'object') {
        Object.entries(initialData.studentAnswers).forEach(([k, v]) => {
          if (v !== undefined && v !== null) existingAnswers[k] = String(v);
        });
      } else if (Array.isArray(initialData?.answers)) {
        initialData.answers.forEach((a, idx) => {
          const qNo = a.questionNo || a.questionIndex || (idx + 1);
          const v = a.userAnswer ?? a.userAnswerText ?? a.userAnswerLetter ?? '';
          if (v !== undefined && v !== null && v !== '') existingAnswers[qNo] = String(v);
        });
      }
      setQuestionAnswers(existingAnswers);
      setBulkInput('');
      setShowBulkInput(false);

      if (hasDefinedAnswerKey || (initialData?.answerKey && Object.keys(initialData.answerKey).length > 0)) {
        setEntryMode('by_question');
        if (Object.keys(existingAnswers).length > 0) {
          const { cor: evaluatedCor, wrg: evaluatedWrg, emp: evaluatedEmp } = evaluateAnswersMap(existingAnswers, tot);
          setCorrectCount(evaluatedCor);
          setWrongCount(evaluatedWrg);
          setEmptyCount(evaluatedEmp);
        } else {
          setCorrectCount(cor);
          setWrongCount(wrg);
          setEmptyCount(emp);
        }
      } else {
        setCorrectCount(cor);
        setWrongCount(wrg);
        setEmptyCount(emp);
      }
    } else {
      // Default reset for fresh entry
      if (availableBooks.length > 0) {
        const firstB = availableBooks[0];
        setSelectedBookId(firstB.id);
        const firstSubj = (firstB.subjects || [])[0]?.name || '';
        setSelectedSubject(firstSubj);
        setCustomSubject(firstSubj);
      } else {
        setSelectedBookId('__custom__');
        setSelectedSubject('');
        setCustomSubject('');
      }
      setSelectedTopicId('');
      setSelectedTestId('');
      setCustomBookTitle('');
      setCustomUnitTopic('');
      setCustomTestName('');
      setTotalQuestions(20);
      setCorrectCount(0);
      setWrongCount(0);
      setEmptyCount(20);
      setDate(new Date().toISOString().split('T')[0]);
      setMistakeReasons({});
      setQuestionAnswers({});
      setBulkInput('');
      setShowBulkInput(false);
      setEntryMode('by_question');
    }
  }, [isOpen, initialData, availableBooks, hasDefinedAnswerKey]);

  // When book changes, auto-select first subject
  const handleBookChange = (e) => {
    const bId = e.target.value;
    setSelectedBookId(bId);
    setSelectedTopicId('');
    setSelectedTestId('');

    if (bId !== '__custom__') {
      const bObj = books.find(b => String(b.id) === String(bId) || toUUID(b.id) === toUUID(bId));
      if (bObj && bObj.subjects && bObj.subjects.length > 0) {
        const firstSub = bObj.subjects[0].name;
        setSelectedSubject(firstSub);
        setCustomSubject(firstSub);
      }
    } else {
      setCustomSubject(selectedSubject || '');
    }
  };

  // When test is selected from dropdown, update total questions
  const handleTestChange = (e) => {
    const tId = e.target.value;
    setSelectedTestId(tId);
    if (tId && tId !== '__custom__') {
      const tObj = availableTests.find(t => String(t.id) === String(tId)) || (bookTests || []).find(t => String(t.id) === String(tId));
      if (tObj?.questionCount) {
        const qCount = Number(tObj.questionCount);
        setTotalQuestions(qCount);
        const { cor, wrg, emp } = evaluateAnswersMap(questionAnswers, qCount);
        setCorrectCount(cor);
        setWrongCount(wrg);
        setEmptyCount(emp);
      }
      if (tObj?.answerKey || tObj?.answer_key) {
        setEntryMode('by_question');
      }
    }
  };

  // Handler for question-by-question answer changes
  const handleAnswerChange = (qNo, val) => {
    const nextAnswers = { ...questionAnswers, [qNo]: val, [String(qNo)]: val };
    setQuestionAnswers(nextAnswers);

    if (hasDefinedAnswerKey) {
      const { cor, wrg, emp } = evaluateAnswersMap(nextAnswers, totalQuestions);
      setCorrectCount(cor);
      setWrongCount(wrg);
      setEmptyCount(emp);
    }
  };

  // Handler for bulk paste answers
  const handleApplyBulkInput = () => {
    if (!bulkInput.trim()) return;
    const tokens = bulkInput.trim().split(/[,;\n\t]+/).map(s => s.trim()).filter(Boolean);
    const nextAnswers = { ...questionAnswers };
    tokens.forEach((token, idx) => {
      const qNo = idx + 1;
      if (qNo <= totalQuestions) {
        nextAnswers[qNo] = token;
        nextAnswers[String(qNo)] = token;
      }
    });
    setQuestionAnswers(nextAnswers);
    if (hasDefinedAnswerKey) {
      const { cor, wrg, emp } = evaluateAnswersMap(nextAnswers, totalQuestions);
      setCorrectCount(cor);
      setWrongCount(wrg);
      setEmptyCount(emp);
    }
    setShowBulkInput(false);
  };

  // Handlers for Score Inputs with auto-calculation
  const handleTotalChange = (val) => {
    const tot = Math.max(1, Number(val) || 1);
    setTotalQuestions(tot);
    setEmptyCount(Math.max(0, tot - (correctCount + wrongCount)));
  };

  const handleCorrectChange = (val) => {
    const c = Math.max(0, Number(val) || 0);
    setCorrectCount(c);
    setEmptyCount(Math.max(0, totalQuestions - (c + wrongCount)));
  };

  const handleWrongChange = (val) => {
    const w = Math.max(0, Number(val) || 0);
    setWrongCount(w);
    setEmptyCount(Math.max(0, totalQuestions - (correctCount + w)));
  };

  const handleEmptyChange = (val) => {
    const e = Math.max(0, Number(val) || 0);
    setEmptyCount(e);
  };

  // Calculated Stats
  const calculatedNet = useMemo(() => {
    const d = Number(correctCount) || 0;
    const y = Number(wrongCount) || 0;
    const ratio = Number(penaltyRatio) || 0;
    if (ratio <= 0) return d;
    return parseFloat(Math.max(0, d - (y / ratio)).toFixed(2));
  }, [correctCount, wrongCount, penaltyRatio]);

  const calculatedPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100)));
  }, [correctCount, totalQuestions]);

  // Handle saving
  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const totQ = Math.max(1, Number(totalQuestions) || (correctCount + wrongCount + emptyCount));
    if (correctCount + wrongCount > totQ) {
      alert(`⚠️ Doğru (${correctCount}) ve Yanlış (${wrongCount}) toplamı, Soru Sayısından (${totQ}) fazla olamaz!`);
      return;
    }

    setIsSaving(true);
    try {
      let finalBookTitle = customBookTitle;
      let finalSubject = selectedSubject || customSubject || 'Genel';
      let finalTopic = customUnitTopic;
      let finalTestName = customTestName;

      let bookId = selectedBookId !== '__custom__' ? selectedBookId : null;
      let testId = selectedTestId && selectedTestId !== '__custom__' ? selectedTestId : null;

      if (selectedBook) {
        finalBookTitle = selectedBook.title;
        if (selectedTestId && selectedTestId !== '__custom__') {
          const tObj = availableTests.find(t => String(t.id) === String(selectedTestId));
          if (tObj) {
            finalTestName = tObj.name || 'Test';
            if (tObj.topicName) finalTopic = tObj.topicName;
          }
        }
        if (selectedTopicId) {
          const tpObj = availableTopics.find(tp => String(tp.id) === String(selectedTopicId));
          if (tpObj) finalTopic = tpObj.name;
        }
      }

      if (!finalTestName) {
        finalTestName = 'Konu Testi';
      }
      if (!finalBookTitle) {
        finalBookTitle = 'Takip Edilen Kitap';
      }

      // Synthesize individual answers for detailed mistake analysis & review
      const answersList = [];
      const isAutoEvaluated = Boolean(hasDefinedAnswerKey && entryMode === 'by_question');

      if (isAutoEvaluated) {
        for (let i = 1; i <= totQ; i++) {
          const uAns = questionAnswers[i] ?? questionAnswers[String(i)] ?? '';
          const cKey = getCorrectKeyForQ(i);
          const isCor = Boolean(uAns !== '' && cKey !== '' && compareOpenEndedAnswers(uAns, cKey) === true);
          const isWrg = Boolean(uAns !== '' && cKey !== '' && !isCor);
          const reason = mistakeReasons[i] || null;

          answersList.push({
            questionIndex: i,
            questionNo: i,
            userAnswer: uAns,
            correctAnswer: cKey,
            isCorrect: isCor,
            isWrong: isWrg,
            status: isCor ? 'correct' : (isWrg ? 'wrong' : 'empty'),
            mistakeReason: reason
          });
        }
      } else {
        let qNum = 1;
        for (let i = 0; i < correctCount; i++) {
          answersList.push({
            questionIndex: qNum,
            questionNo: qNum,
            userAnswer: 'A',
            correctAnswer: 'A',
            isCorrect: true,
            isWrong: false,
            status: 'correct'
          });
          qNum++;
        }
        for (let i = 0; i < wrongCount; i++) {
          const reason = mistakeReasons[i + 1] || null;
          answersList.push({
            questionIndex: qNum,
            questionNo: qNum,
            userAnswer: 'B',
            correctAnswer: 'A',
            isCorrect: false,
            isWrong: true,
            status: 'wrong',
            mistakeReason: reason
          });
          qNum++;
        }
        for (let i = 0; i < emptyCount; i++) {
          answersList.push({
            questionIndex: qNum,
            questionNo: qNum,
            userAnswer: '',
            correctAnswer: 'A',
            isCorrect: null,
            isWrong: false,
            status: 'empty'
          });
          qNum++;
        }
      }

      const submissionId = initialData?.submissionId || initialData?.id || `sub_manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const isStaff = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
      const isBookTest = Boolean(bookId || currentTestObj || selectedBook);
      const isApproved = isStaff || isAutoEvaluated || isBookTest || initialData?.isApproved === true || initialData?.approvalStatus === 'approved';
      const approvalStatus = isApproved ? 'approved' : 'pending';
      const finalStatus = isApproved ? 'completed' : 'pending_approval';

      const newSubmission = {
        id: submissionId,
        studentId: String(studentId),
        bookId: bookId ? String(bookId) : null,
        testId: testId ? String(testId) : submissionId,
        bookTestId: testId ? String(testId) : null,
        realTestId: testId ? String(testId) : null,
        title: finalTestName,
        testTitle: finalTestName,
        bookTitle: finalBookTitle,
        subject: finalSubject,
        unitTopic: finalTopic || null,
        correctCount: Number(correctCount),
        wrongCount: Number(wrongCount),
        emptyCount: Number(emptyCount),
        totalQuestions: Number(totQ),
        scorePercentage: calculatedPct,
        totalNet: calculatedNet,
        submittedAt: new Date(date).toISOString(),
        completedAt: new Date(date).toISOString(),
        createdAt: new Date(date).toISOString(),
        date: date,
        status: finalStatus,
        approvalStatus: approvalStatus,
        isApproved: isApproved,
        isAutoEvaluated: isAutoEvaluated,
        isManual: true,
        sourceType: 'manual_test',
        submittedByRole: currentUser?.role || 'student',
        submittedByName: currentUser?.name || 'Öğrenci',
        approvedBy: isApproved ? (currentUser?.id || initialData?.approvedBy || (isAutoEvaluated ? 'auto_system' : null)) : null,
        approvedByName: isApproved ? (currentUser?.name || initialData?.approvedByName || (isAutoEvaluated ? 'Otomatik Değerlendirme Sistemi' : null)) : null,
        approvedAt: isApproved ? new Date().toISOString() : null,
        answers: answersList,
        studentAnswers: questionAnswers,
        mistakeReasons: mistakeReasons
      };

      if (typeof updateSubmission === 'function') {
        await updateSubmission(submissionId, newSubmission);
      } else if (typeof addSubmission === 'function') {
        await addSubmission(newSubmission);
      }

      // Check if linked to an assigned homework (only submit if approved and specific test is assigned)
      const targetHw = (homeworks || []).find(h => 
        testId && (String(h.id) === String(testId) || (Array.isArray(h.tests) && h.tests.includes(testId)))
      );
      if (targetHw && isApproved && typeof submitHomework === 'function') {
        try {
          await submitHomework(targetHw.id, studentId, calculatedPct, totQ, {
            testId: testId || submissionId,
            correctCount,
            wrongCount,
            emptyCount,
            totalNet: calculatedNet
          });
        } catch (hwErr) {
          console.warn('[ManualTestModal] Optional hw sync info:', hwErr);
        }
      }

      // Trigger global event so all components react immediately
      window.dispatchEvent(new CustomEvent('manual_test_added', { detail: newSubmission }));
      window.dispatchEvent(new CustomEvent('submission_updated', { detail: newSubmission }));

      if (onSaved) onSaved(newSubmission);
      onClose();
    } catch (err) {
      console.error('Error saving manual test result:', err);
      alert('Sonuç kaydedilirken bir hata oluştu: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto'
    }}
    onClick={onClose}
    >
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        color: 'var(--color-text, #0f172a)',
        borderRadius: '1.5rem',
        border: '1.5px solid var(--color-border, #e2e8f0)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1.5px solid var(--color-border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                {initialData?.submissionId ? 'Test Sonucunu Düzenle' : '✏️ Manuel Test Sonucu Ekle'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>
                Kitap veya yol haritası testlerinizin Doğru / Yanlış / Boş sayılarını girin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Approval Info Banner */}
        {hasDefinedAnswerKey ? (
          <div style={{
            margin: '0.85rem 1.5rem 0',
            padding: '0.7rem 0.95rem',
            borderRadius: 12,
            background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #bbf7d0',
            color: isDark ? '#34d399' : '#15803d',
            fontSize: '0.76rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <Sparkles size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>🤖 Otomatik Değerlendirme Aktif:</strong> Bu testin {isTestOpenEnded ? 'açık uçlu' : ''} cevap anahtarı sistemde kayıtlı. Girdiğiniz cevaplar otomatik değerlendirilir, anında onaylanır ve kitap haritanıza yansır.
            </div>
          </div>
        ) : currentUser?.role === 'teacher' || currentUser?.role === 'admin' ? (
          <div style={{
            margin: '0.85rem 1.5rem 0',
            padding: '0.65rem 0.9rem',
            borderRadius: 12,
            background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #bbf7d0',
            color: isDark ? '#34d399' : '#15803d',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: '1.1rem' }}>✓</span>
            <div>
              <strong>Yetkili Girişi:</strong> Öğretmen/Yönetici olarak eklediğiniz sonuçlar doğrudan onaylanıp öğrencinin istatistiklerine ve kitap haritasına yansıtılır.
            </div>
          </div>
        ) : (
          <div style={{
            margin: '0.85rem 1.5rem 0',
            padding: '0.65rem 0.9rem',
            borderRadius: 12,
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a',
            color: isDark ? '#fbbf24' : '#b45309',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: '1.1rem' }}>⏳</span>
            <div>
              <strong>Onay Sistemi:</strong> Girdiğiniz manuel test sonucu öğretmeninizin onayına sunulacak, <u>öğretmeniniz onayladıktan sonra</u> kitap ilerlemenize ve istatistiklerinize yansıyacaktır.
            </div>
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* 1. Kitap / Kaynak Seçimi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 6 }}>
              📖 KİTAP / ÇALIŞMA KAYNAĞI
            </label>
            <select
              value={selectedBookId}
              onChange={handleBookChange}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.75rem',
                border: '1.5px solid var(--color-border, #cbd5e1)',
                background: 'var(--color-surface, #ffffff)',
                color: 'var(--color-text, #0f172a)',
                fontSize: '0.85rem',
                fontWeight: 700,
                outline: 'none'
              }}
            >
              {availableBooks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title} {b.publisher ? `(${b.publisher})` : ''}
                </option>
              ))}
              <option value="__custom__">➕ Diğer / Özel Kitap veya Ders</option>
            </select>
          </div>

          {/* Özel Kitap Adı (Eğer Özel Seçildiyse) */}
          {selectedBookId === '__custom__' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Kitap veya Kaynak Adı
              </label>
              <input
                type="text"
                value={customBookTitle}
                onChange={e => setCustomBookTitle(e.target.value)}
                placeholder="Örn: 4. Sınıf Paragraf & Problem Seti"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid var(--color-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-text, #0f172a)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* 2. Ders ve Ünite / Konu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 6 }}>
                📚 DERS
              </label>
              {availableSubjects.length > 0 && selectedBookId !== '__custom__' ? (
                <select
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setSelectedTopicId('');
                    setSelectedTestId('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text, #0f172a)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  {availableSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => {
                    setCustomSubject(e.target.value);
                    setSelectedSubject(e.target.value);
                  }}
                  placeholder="Örn: Matematik"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text, #0f172a)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 6 }}>
                📌 ÜNİTE / KONU (Opsiyonel)
              </label>
              {availableTopics.length > 0 && selectedBookId !== '__custom__' ? (
                <select
                  value={selectedTopicId}
                  onChange={e => {
                    setSelectedTopicId(e.target.value);
                    setSelectedTestId('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text, #0f172a)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  <option value="">Tüm Üniteler</option>
                  {availableTopics.map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customUnitTopic}
                  onChange={e => setCustomUnitTopic(e.target.value)}
                  placeholder="Örn: 3. Ünite - Bölme"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text, #0f172a)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>
          </div>

          {/* 3. Test Adı Seçimi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 6 }}>
              📝 TEST ADI
            </label>
            {availableTests.length > 0 && selectedBookId !== '__custom__' ? (
              <select
                value={selectedTestId}
                onChange={handleTestChange}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid var(--color-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-text, #0f172a)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              >
                <option value="">-- Test Seçin --</option>
                {availableTests.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.questionCount || 20} Soru)
                  </option>
                ))}
                <option value="__custom__">➕ Özel Test Adı Yaz</option>
              </select>
            ) : (
              <input
                type="text"
                value={customTestName}
                onChange={e => setCustomTestName(e.target.value)}
                placeholder="Örn: Test-5 (Problemler)"
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid var(--color-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-text, #0f172a)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Eğer Test Listesinden Özel Seçildiyse */}
          {selectedTestId === '__custom__' && (
            <div>
              <input
                type="text"
                value={customTestName}
                onChange={e => setCustomTestName(e.target.value)}
                placeholder="Test Adını Yazın (Örn: Ekstra Test 1)"
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid var(--color-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-text, #0f172a)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* 4. Soru ve Sonuç Girişi */}
          <div style={{
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
            border: '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: '1.25rem',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem'
          }}>
            {/* Giriş Modu Seçimi (Eğer cevap anahtarı varsa) */}
            {hasDefinedAnswerKey ? (
              <div style={{
                display: 'flex',
                background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#e2e8f0',
                padding: 3,
                borderRadius: '0.75rem',
                gap: 4
              }}>
                <button
                  type="button"
                  onClick={() => setEntryMode('by_question')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: entryMode === 'by_question' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: entryMode === 'by_question' ? '#ffffff' : 'var(--color-text-muted)',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: entryMode === 'by_question' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Zap size={14} /> ✍️ Soru Soru Cevap Gir (Otomatik Değerlendir)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('manual_counts')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: entryMode === 'manual_counts' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: entryMode === 'manual_counts' ? '#ffffff' : 'var(--color-text-muted)',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: entryMode === 'manual_counts' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Edit3 size={14} /> 🔢 Manuel Sayı Gir (D / Y / B)
                </button>
              </div>
            ) : null}

            {/* Soru Soru Cevap Girişi Modu */}
            {hasDefinedAnswerKey && entryMode === 'by_question' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Toplu Yapıştır Butonu ve Alanı */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                    {isTestOpenEnded ? '📝 Açık Uçlu Soru Cevapları' : '📝 Soru Cevapları'} ({totalQuestions} Soru):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBulkInput(!showBulkInput)}
                    style={{
                      background: 'none',
                      border: '1px dashed var(--color-border)',
                      borderRadius: '0.5rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'var(--color-primary, #6366f1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Clipboard size={12} /> {showBulkInput ? 'Yapıştırmayı Gizle' : 'Toplu Cevap Yapıştır'}
                  </button>
                </div>

                {showBulkInput && (
                  <div style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '0.75rem',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      Cevapları virgülle, boşlukla veya satır satır yapıştırın:
                    </label>
                    <textarea
                      rows={2}
                      value={bulkInput}
                      onChange={e => setBulkInput(e.target.value)}
                      placeholder={isTestOpenEnded ? "Örn: 103959, 2, 503976, 22..." : "Örn: A, B, C, D, E..."}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        onClick={handleApplyBulkInput}
                        style={{
                          padding: '0.35rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#fff',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Dağıt ve Otomatik Değerlendir
                      </button>
                    </div>
                  </div>
                )}

                {/* Soru Soru Liste / Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '0.55rem',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '0.35rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff'
                }}>
                  {Array.from({ length: totalQuestions }, (_, idx) => {
                    const qNo = idx + 1;
                    const val = questionAnswers[qNo] ?? questionAnswers[String(qNo)] ?? '';
                    const correctKey = getCorrectKeyForQ(qNo);
                    const hasKey = correctKey !== '' && correctKey !== null && correctKey !== undefined;

                    const isMatch = val !== '' && hasKey ? compareOpenEndedAnswers(val, correctKey) : null;
                    const isCor = isMatch === true;
                    const isWrg = isMatch === false;
                    const isEmp = val === '';

                    const borderColor = isCor ? '#86efac' : isWrg ? '#fca5a5' : 'var(--color-border, #cbd5e1)';
                    const bg = isCor ? (isDark ? 'rgba(22, 163, 74, 0.12)' : '#f0fdf4')
                      : isWrg ? (isDark ? 'rgba(220, 38, 38, 0.12)' : '#fef2f2')
                      : 'var(--color-surface, #ffffff)';

                    return (
                      <div
                        key={qNo}
                        style={{
                          background: bg,
                          border: `1.5px solid ${borderColor}`,
                          borderRadius: '0.65rem',
                          padding: '0.45rem 0.6rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)' }}>
                            {qNo}. Soru
                          </span>
                          {isCor && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#16a34a' }}>✓ Doğru</span>
                          )}
                          {isWrg && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#dc2626' }}>✗ Yanlış</span>
                          )}
                          {isEmp && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>○ Boş</span>
                          )}
                        </div>

                        <input
                          type="text"
                          value={val}
                          onChange={e => handleAnswerChange(qNo, e.target.value)}
                          placeholder={isTestOpenEnded ? "Öğrenci cevabı..." : "Seçenek..."}
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            borderRadius: '0.45rem',
                            border: `1px solid ${borderColor}`,
                            background: 'var(--color-surface, #ffffff)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            outline: 'none'
                          }}
                        />

                        {isWrg && (
                          <select
                            value={mistakeReasons[qNo] || ''}
                            onChange={e => {
                              const r = e.target.value;
                              setMistakeReasons(prev => ({
                                ...prev,
                                [qNo]: r
                              }));
                            }}
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '0.2rem',
                              borderRadius: '0.35rem',
                              border: '1px solid #fca5a5',
                              background: '#fff',
                              color: '#dc2626',
                              outline: 'none',
                              marginTop: 2
                            }}
                          >
                            <option value="">Hata Sebebi Seçin</option>
                            {MISTAKE_REASONS.map(mr => (
                              <option key={mr.label} value={mr.label}>{mr.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Otomatik Hesaplanmış Veya Manuel Skor Kutuları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', marginBottom: 4, textAlign: 'center' }}>
                  TOPLAM
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={totalQuestions}
                  onChange={e => handleTotalChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.3rem',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#16a34a', marginBottom: 4, textAlign: 'center' }}>
                  ✓ DOĞRU
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalQuestions}
                  value={correctCount}
                  onChange={e => handleCorrectChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.3rem',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    borderRadius: '0.75rem',
                    border: '1.5px solid #86efac',
                    background: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4',
                    color: '#16a34a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#dc2626', marginBottom: 4, textAlign: 'center' }}>
                  ✗ YANLIŞ
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalQuestions}
                  value={wrongCount}
                  onChange={e => handleWrongChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.3rem',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    borderRadius: '0.75rem',
                    border: '1.5px solid #fca5a5',
                    background: isDark ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2',
                    color: '#dc2626',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', marginBottom: 4, textAlign: 'center' }}>
                  ○ BOŞ
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalQuestions}
                  value={emptyCount}
                  onChange={e => handleEmptyChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.3rem',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text-muted)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Tarih ve Net Kuralı */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  📅 ÇÖZÜLME TARİHİ
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  ⚖️ NET HESAPLAMA
                </label>
                <select
                  value={penaltyRatio}
                  onChange={e => setPenaltyRatio(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="4">4 Yanlış 1 Doğruyu Götürür (YKS/Lise)</option>
                  <option value="3">3 Yanlış 1 Doğruyu Götürür (LGS/Ortaokul)</option>
                  <option value="0">Yanlış Doğruyu Götürmez (İlkokul/Kazanım)</option>
                </select>
              </div>
            </div>

            {/* Canlı Skor Özeti */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px dashed var(--color-border, #cbd5e1)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>BAŞARI ORANI</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: calculatedPct >= 70 ? '#16a34a' : calculatedPct >= 50 ? '#d97706' : '#dc2626' }}>
                  %{calculatedPct}
                </div>
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>HESAPLANAN NET</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6366f1' }}>
                  {calculatedNet} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Net</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Yanlış Soru Hata Analizi (Opsiyonel) */}
          {wrongCount > 0 && (
            <div style={{
              background: isDark ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: '1rem',
              padding: '0.9rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <AlertCircle size={15} color="#dc2626" />
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#dc2626' }}>
                  Yanlış Yapılan {wrongCount} Soru İçin Hata Nedenleri
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                {Array.from({ length: Math.min(wrongCount, 20) }, (_, i) => i + 1).map(wIdx => {
                  const currentReason = mistakeReasons[wIdx] || '';

                  return (
                    <div key={wIdx} style={{
                      background: 'var(--color-surface)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.65rem',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        Yanlış {wIdx}:
                      </span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {MISTAKE_REASONS.map(mr => {
                          const isSelected = currentReason === mr.label;
                          return (
                            <button
                              key={mr.label}
                              type="button"
                              onClick={() => {
                                setMistakeReasons(prev => ({
                                  ...prev,
                                  [wIdx]: isSelected ? '' : mr.label
                                }));
                              }}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.45rem',
                                border: isSelected ? `1.5px solid ${mr.color}` : '1px solid var(--color-border)',
                                background: isSelected ? mr.color : (isDark ? 'var(--color-surface-hover)' : '#ffffff'),
                                color: isSelected ? '#ffffff' : 'var(--color-text)',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {mr.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.65rem 1.6rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <CheckCircle2 size={16} />
              {isSaving ? 'Kaydediliyor...' : 'Sonucu Kaydet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
