import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Clock3, Trophy, Eye, Home, CheckCircle2, BookOpen, ArrowLeft, Sparkles, Play, Layers, Calendar, ShieldCheck, Check, Zap, Sun, Moon } from 'lucide-react';
import { checkIsAnswerCorrect } from '../utils/answerEvaluation';
import { toUUID } from '../services/supabaseService';

import PdfQuizRunner from '../components/quiz/runner/PdfQuizRunner';
import HtmlQuizRunner from '../components/quiz/runner/HtmlQuizRunner';
import ImageQuizRunner from '../components/quiz/runner/ImageQuizRunner';
import PhysicalQuizRunner from '../components/quiz/runner/PhysicalQuizRunner';
import SingleMultipleChoiceRunner from '../components/quiz/single/SingleMultipleChoiceRunner';
import SingleOpenEndedRunner from '../components/quiz/single/SingleOpenEndedRunner';
import CompositeHomeworkRunner from '../components/quiz/composite/CompositeHomeworkRunner';
import { isSectionOpenEnded } from '../components/quiz/utils/quizTypeDetector';

import { resolveTestQuestions } from '../utils/testResolver';

export default function ModularQuizPage() {
  const { testId } = useParams();
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || currentUser?.id;
  const navigate = useNavigate();

  const { homeworks, updateHomeworkSubmission, isLoading: hwLoading } = useHomework();
  const { data: curriculumData, isLoading: currLoading } = useCurriculum();
  const { submissions, addSubmission, updateSubmission, isSyncing } = useEvaluation();
  const { questions: allBankQuestions, isLoading: qbLoading } = useQuestionBank();
  const { bookTests, books, isLoading: booksLoading } = useTrackedBooks();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const isSubmittingRef = useRef(false);

  // Grace period for initial context data load (4 seconds)
  const [initLoading, setInitLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitLoading(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const location = useLocation();
  const isRetake = searchParams.get('retake') === 'true' || searchParams.get('mode') === 'solve' || Boolean(location?.state?.retake);

  // Check if there is an active homework assigned to this student that matches this test
  const activeHomework = useMemo(() => {
    if (!homeworks || homeworks.length === 0) return null;
    const cleanId = String(testId || '').trim();
    return homeworks.find(h => {
      const match = String(h.id) === cleanId || 
                    (h.questionIds && h.questionIds.map(String).includes(cleanId)) ||
                    (h.tests && h.tests.map(String).includes(cleanId));
      return Boolean(match);
    });
  }, [homeworks, testId]);

  const isNewOrReassigned = useMemo(() => {
    if (!activeHomework) return false;
    const hwCreatedTime = activeHomework.createdAt ? new Date(activeHomework.createdAt).getTime() : 0;
    const subInHw = (activeHomework.submissions || []).find(s => 
      String(s.studentId) === String(studentId) && s.status !== 'in_progress' && s.status !== 'draft'
    );
    if (subInHw) return false;

    const subAfterHw = (submissions || []).find(s => 
      (String(s.hwId) === String(activeHomework.id) || String(s.testId) === String(activeHomework.id) || String(s.testId) === String(testId)) && 
      String(s.studentId) === String(studentId) && 
      s.status !== 'in_progress' && s.status !== 'draft' &&
      (s.submittedAt ? new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000) : false)
    );
    return !subAfterHw;
  }, [activeHomework, submissions, studentId, testId]);

  // If this is a new or re-assigned homework, clear any old localStorage draft keys so student gets a fresh blank test
  useEffect(() => {
    if (isNewOrReassigned || isRetake) {
      try {
        const cleanId = String(testId || '').trim();
        const keysToClean = [
          cleanId,
          activeHomework?.id,
          test?.id,
          test?.realTestId
        ].filter(Boolean);

        keysToClean.forEach(k => {
          localStorage.removeItem(`draft_quiz_${k}_ans`);
          localStorage.removeItem(`draft_quiz_${k}_txt`);
          localStorage.removeItem(`draft_quiz_${k}_time`);
          localStorage.removeItem(`quiz_draft_${k}`);
        });
      } catch (e) {}
    }
  }, [isNewOrReassigned, isRetake, testId, activeHomework?.id, test?.id, test?.realTestId]);

  const draftSubmission = useMemo(() => {
    if (isRetake || isNewOrReassigned) return null;
    if (!submissions || submissions.length === 0) return null;
    const hwCreatedTime = activeHomework?.createdAt ? new Date(activeHomework.createdAt).getTime() : 0;
    const currentTId = String(test?.id || testId);
    const currentTUUID = String(toUUID(test?.id || testId) || '');

    return submissions.find(s => {
      if (String(s.studentId) !== String(studentId)) return false;
      if (s.status !== 'in_progress' && s.status !== 'draft') return false;

      const matchFields = [
        String(s.testId || ''),
        String(s.realTestId || ''),
        String(s.bookTestId || '')
      ];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
        matchFields.push(...s.bookTestIds.map(String));
      }
      if (activeHomework && (!activeHomework.tests || activeHomework.tests.length <= 1)) {
        matchFields.push(String(activeHomework.id));
      }

      const matches = matchFields.some(f => f && (f === currentTId || (currentTUUID && f === currentTUUID)));
      if (!matches) return false;
      if (hwCreatedTime && (s.updatedAt || s.submittedAt || s.createdAt)) {
        const subTime = new Date(s.updatedAt || s.submittedAt || s.createdAt).getTime();
        if (subTime < (hwCreatedTime - 60000)) return false;
      }
      return true;
    });
  }, [submissions, testId, test?.id, studentId, activeHomework, isRetake, isNewOrReassigned]);

  // Prevent taking the exam again ONLY IF this specific test was already submitted AFTER it was assigned
  const completedSub = useMemo(() => {
    if (isRetake) return null;
    if (!submissions || submissions.length === 0) return null;

    const currentTId = String(test?.id || testId);
    const currentTUUID = String(toUUID(test?.id || testId) || '');

    if (activeHomework) {
      const hwCreatedTime = activeHomework.createdAt ? new Date(activeHomework.createdAt).getTime() : 0;

      // Look for a submission that belongs specifically to this active homework AND this specific test
      const subInHw = (activeHomework.submissions || []).find(s => {
        if (String(s.studentId) !== String(studentId) || s.status === 'in_progress' || s.status === 'draft') return false;
        if (activeHomework.tests && activeHomework.tests.length > 1) {
          const sTId = String(s.testId || s.bookTestId || '');
          return sTId === currentTId || (currentTUUID && sTId === currentTUUID);
        }
        return true;
      });
      if (subInHw) return subInHw;

      // Look in global submissions submitted AFTER the homework was created matching THIS test ID
      const subAfterHw = submissions.find(s => {
        if (String(s.studentId) !== String(studentId) || s.status === 'in_progress' || s.status === 'draft') return false;

        const matchFields = [
          String(s.testId || ''),
          String(s.realTestId || ''),
          String(s.bookTestId || ''),
          String(s.metadata?.realTestId || ''),
          String(s.metadata?.bookTestId || ''),
          String(s.metadata?.realId || '')
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          matchFields.push(...s.bookTestIds.map(String));
        }

        const isExactTestMatch = matchFields.some(f => f && (f === currentTId || (currentTUUID && f === currentTUUID)));
        const isSingleHwMatch = (String(s.hwId) === String(activeHomework.id) || String(s.testId) === String(activeHomework.id)) && (!activeHomework.tests || activeHomework.tests.length <= 1);

        if (!isExactTestMatch && !isSingleHwMatch) return false;

        return s.submittedAt ? new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000) : false;
      });

      return subAfterHw || null;
    }

    // If there is no active homework, check if there is a completed submission specifically for this test
    return submissions.find(s => {
      if (String(s.studentId) !== String(studentId) || s.status === 'in_progress' || s.status === 'draft') return false;
      const matchFields = [
        String(s.testId || ''),
        String(s.realTestId || ''),
        String(s.bookTestId || '')
      ];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
        matchFields.push(...s.bookTestIds.map(String));
      }
      return matchFields.some(f => f && (f === currentTId || (currentTUUID && f === currentTUUID)));
    }) || null;
  }, [submissions, testId, test?.id, studentId, activeHomework, isRetake]);

  const bookForTest = useMemo(() => {
    if (!test) return null;
    const bId = test.bookId || (test.tests && Array.isArray(test.tests) && test.tests.length > 0 && bookTests?.find(bt => String(bt.id) === String(test.tests[0]) || toUUID(bt.id) === toUUID(test.tests[0]))?.bookId);
    return books?.find(b => String(b.id) === String(bId) || toUUID(b.id) === toUUID(bId));
  }, [test, books, bookTests]);

  const effectiveTest = useMemo(() => {
    if (!test) return null;
    return {
      ...test,
      book: bookForTest,
      optionCount: test.optionCount || test.optionsCount || bookForTest?.optionCount
    };
  }, [test, bookForTest]);



  const resolvedTestIdRef = useRef(null);
  const prevBankQCountRef = useRef(0);
  useEffect(() => {
    resolvedTestIdRef.current = null;
  }, [testId]);

  useEffect(() => {
    const cleanTestId = String(testId || '').trim();
    const bankQLen = allBankQuestions?.length || 0;
    if (resolvedTestIdRef.current === cleanTestId && test && prevBankQCountRef.current === bankQLen) {
      return;
    }
    resolvedTestIdRef.current = cleanTestId;
    prevBankQCountRef.current = bankQLen;
    const uuidTestId = toUUID(cleanTestId);
    const normalizeId = (id) => String(id || '').replace(/^hw_/, '').replace(/^q_?/, '').replace(/^bt_?/, '').replace(/^tbt_?/, '');

    // 0. Extract composite test IDs (e.g. bt_hw_wt3wv8_1786690900059_tbt_8xm27i_1786690469999 or book_test_hw_..._...)
    let subCandidateId = null;
    let explicitHwId = null;

    if (cleanTestId.includes('_tbt_')) {
      const idx = cleanTestId.indexOf('_tbt_');
      subCandidateId = cleanTestId.slice(idx + 1); // "tbt_8xm27i_1786690469999"
      explicitHwId = cleanTestId.slice(0, idx).replace(/^(?:bt_|book_test_)/, '');
    } else if (cleanTestId.includes('_bt_')) {
      const idx = cleanTestId.indexOf('_bt_');
      subCandidateId = cleanTestId.slice(idx + 1); // "bt_..."
      explicitHwId = cleanTestId.slice(0, idx).replace(/^(?:bt_|book_test_)/, '');
    } else if (cleanTestId.includes('_q_')) {
      const idx = cleanTestId.indexOf('_q_');
      subCandidateId = cleanTestId.slice(idx + 1);
      explicitHwId = cleanTestId.slice(0, idx).replace(/^(?:bt_|book_test_)/, '');
    }

    if (!subCandidateId && bookTests && bookTests.length > 0) {
      const matchedBt = bookTests.find(bt => cleanTestId.endsWith(String(bt.id)));
      if (matchedBt) {
        subCandidateId = matchedBt.id;
        const prefix = cleanTestId.slice(0, cleanTestId.lastIndexOf(matchedBt.id)).replace(/_$/, '');
        explicitHwId = prefix.replace(/^(?:bt_|book_test_)/, '');
      }
    }

    let foundTest = null;
    const testCandidates = [subCandidateId, cleanTestId].filter(Boolean);

    // 1. Search in bookTests (Tracked Book Tests)
    if (bookTests && bookTests.length > 0) {
      for (const cand of testCandidates) {
        const match = bookTests.find(t => 
          String(t.id) === cand || 
          toUUID(t.id) === cand || 
          String(t.id) === toUUID(cand) ||
          toUUID(t.id) === toUUID(cand) ||
          normalizeId(t.id) === normalizeId(cand)
        );
        if (match) {
          foundTest = { ...match, hwId: explicitHwId || match.hwId, sourceType: 'trackedBook' };
          break;
        }
      }
    }

    // 2. Search in homeworks directly (by cleanTestId or explicitHwId)
    if (!foundTest && homeworks && homeworks.length > 0) {
      const hwCandidates = [explicitHwId, cleanTestId].filter(Boolean);
      for (const cand of hwCandidates) {
        const match = homeworks.find(h => 
          String(h.id) === cand || 
          toUUID(h.id) === cand || 
          String(h.id) === toUUID(cand) ||
          toUUID(h.id) === toUUID(cand) ||
          normalizeId(h.id) === normalizeId(cand)
        );
        if (match) {
          foundTest = match;
          break;
        }
      }
    }

    // 3. Search if any candidate is inside any homework's `tests` array
    if (!foundTest && homeworks) {
      const parentHw = homeworks.find(h => h.tests && Array.isArray(h.tests) && h.tests.some(t => {
        const tid = typeof t === 'object' ? t.id : String(t);
        return testCandidates.some(cand => 
          String(tid) === cand || 
          toUUID(tid) === cand || 
          String(tid) === toUUID(cand) || 
          toUUID(tid) === toUUID(cand) || 
          normalizeId(tid) === normalizeId(cand)
        );
      }));
      if (parentHw) {
        const specificTest = (bookTests || []).find(bt => testCandidates.some(cand => String(bt.id) === cand || toUUID(bt.id) === cand || normalizeId(bt.id) === normalizeId(cand)));
        if (specificTest) {
          foundTest = { ...specificTest, hwId: parentHw.id, bookId: parentHw.bookId || specificTest.bookId, sourceType: 'trackedBook' };
        } else {
          foundTest = parentHw;
        }
      }
    }

    // 4. Search in curriculumData.tests
    if (!foundTest && curriculumData?.tests) {
      foundTest = curriculumData.tests.find(t => 
        testCandidates.some(cand => 
          String(t.id) === cand || 
          toUUID(t.id) === cand || 
          normalizeId(t.id) === normalizeId(cand)
        )
      );
    }

    // 5. Search in allBankQuestions
    if (!foundTest && allBankQuestions) {
      foundTest = allBankQuestions.find(q => 
        testCandidates.some(cand => 
          String(q.id) === cand || 
          toUUID(q.id) === cand || 
          normalizeId(q.id) === normalizeId(cand)
        )
      );
    }

    // 6. Search in books list for whole-book tasks
    if (!foundTest && books) {
      const matchingBook = books.find(b => testCandidates.some(cand => String(b.id) === cand || toUUID(b.id) === cand));
      if (matchingBook) {
        const testsForBook = (bookTests || []).filter(bt => String(bt.bookId) === String(matchingBook.id) || toUUID(bt.bookId) === toUUID(matchingBook.id));
        if (testsForBook.length > 0) {
          foundTest = {
            id: matchingBook.id,
            title: matchingBook.title || 'Kitap Görevi',
            sourceType: 'trackedBook',
            bookId: matchingBook.id,
            tests: testsForBook.map(t => t.id),
            totalQuestions: testsForBook.reduce((acc, t) => acc + (t.questionCount || 20), 0)
          };
        }
      }
    }

    if (foundTest) {
      resolvedTestIdRef.current = cleanTestId;
      const isTrackedBook = Boolean(
        !String(foundTest.id || '').startsWith('hw_') &&
        (
          foundTest.sourceType === 'trackedBook' || 
          foundTest.sourceFormat === 'physical' ||
          (foundTest.bookId && !foundTest.contentType && !foundTest.contentPayload && !foundTest.imageUrls && !foundTest.imageUrl && !foundTest.sections) ||
          (foundTest.id && (String(foundTest.id).startsWith('bt_') || String(foundTest.id).startsWith('tbt_')))
        )
      );

      if (isTrackedBook) {
        // Resolve questions from bookTests
        let targetBookTests = [];
        if (foundTest.tests && Array.isArray(foundTest.tests) && bookTests && bookTests.length > 0) {
          targetBookTests = bookTests.filter(bt => 
            foundTest.tests.some(t => {
              const tid = typeof t === 'object' ? t.id : String(t);
              return String(tid) === String(bt.id) || 
                     (toUUID(tid) && String(toUUID(tid)) === String(toUUID(bt.id))) ||
                     normalizeId(tid) === normalizeId(bt.id);
            })
          );
        }
        if (targetBookTests.length === 0) {
          targetBookTests = [foundTest];
        }

        const sections = targetBookTests.map((bt, secIdx) => {
          const qCount = bt.questionCount || bt.totalQuestions || bt.questionsCount || foundTest.totalQuestions || foundTest.questionCount || 20;
          const ansKey = bt.answerKey || foundTest.answerKey || {};
          const secQs = [];

          for (let i = 1; i <= qCount; i++) {
            let letterAns = null;
            let idxAns = null;

            if (Array.isArray(ansKey)) {
              letterAns = ansKey[i - 1];
            } else if (typeof ansKey === 'object' && ansKey !== null) {
              letterAns = ansKey[i] ?? ansKey[String(i)] ?? ansKey[i - 1] ?? ansKey[String(i - 1)];
            } else if (typeof ansKey === 'string') {
              const clean = ansKey.replace(/[^A-Ea-e0-4]/g, '');
              letterAns = clean[i - 1];
            }

            if (letterAns !== null && letterAns !== undefined && letterAns !== '') {
              if (typeof letterAns === 'number') {
                idxAns = letterAns;
                letterAns = String.fromCharCode(65 + idxAns);
              } else if (typeof letterAns === 'string') {
                const str = letterAns.trim().toUpperCase();
                if (/^[A-E]$/.test(str)) {
                  idxAns = str.charCodeAt(0) - 65;
                  letterAns = str;
                } else {
                  const num = Number(str);
                  if (!isNaN(num) && num >= 0 && num <= 4) {
                    idxAns = num;
                    letterAns = String.fromCharCode(65 + num);
                  }
                }
              }
            }

            secQs.push({
              id: `${bt.id || foundTest.id || 'bt'}_q${i}`,
              questionNo: i,
              testName: bt.name || bt.title || foundTest.title || `Bölüm ${secIdx + 1}`,
              questionText: `${bt.name || bt.title || foundTest.title || 'Test'} - Soru ${i}`,
              questionCount: 1,
              correctAnswer: idxAns,
              correctAnswerLetter: letterAns
            });
          }

          return {
            id: bt.id || `sec_${secIdx}`,
            title: bt.name || bt.title || foundTest.title || `Bölüm ${secIdx + 1}`,
            questionCount: qCount,
            questions: secQs
          };
        });

        let globalQNo = 1;
        const allResolvedQs = [];
        sections.forEach(sec => {
          sec.questions.forEach(q => {
            allResolvedQs.push({
              ...q,
              globalQuestionNo: globalQNo++
            });
          });
        });

        const totalQFallback = foundTest.totalQuestions || foundTest.questionCount || foundTest.questionsCount || allResolvedQs.length || 20;
        if (allResolvedQs.length === 0 && totalQFallback) {
          for (let i = 1; i <= totalQFallback; i++) {
            allResolvedQs.push({
              id: `hw_q${i}`,
              questionNo: i,
              testName: foundTest.title || foundTest.name || 'Kitap Ödevi',
              questionText: `Soru ${i}`,
              questionCount: 1,
              correctAnswer: null,
              correctAnswerLetter: null
            });
          }
        }

        setTest({
          ...foundTest,
          title: foundTest.title || foundTest.name || 'Kitap Testi',
          sourceType: 'trackedBook',
          sections
        });
        setQuestions(allResolvedQs);
      } else {
        // Digital / Question Bank homework resolution
        let sections = [];
        const questionIdList = foundTest.sections || foundTest.questionIds || foundTest.selectedQuestions || foundTest.tests || foundTest.items;

        if (Array.isArray(questionIdList) && questionIdList.length > 1) {
          sections = questionIdList.map((item, idx) => {
            const itemId = typeof item === 'object' ? (item.id || item.questionId) : item;
            const bankQ = allBankQuestions?.find(q => String(q.id) === String(itemId)) || (typeof item === 'object' ? item : null);
            const resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (item?.questions || item?.questionsList || []);
            const title = (typeof item === 'object' ? (item.title || item.name) : null) || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`;
            const qCount = (typeof item === 'object' ? (item.questionCount || item.totalQuestions || item.qCount) : null) || bankQ?.questionCount || bankQ?.questionsList?.length || resolvedQuestions.length || 1;

            return {
              ...(bankQ || {}),
              ...(typeof item === 'object' ? item : {}),
              id: itemId || `sec_${idx}`,
              questionId: itemId,
              title,
              bankQ: bankQ || (typeof item === 'object' ? item : { id: itemId, title }),
              pdfPayload: bankQ?.pdfPayload || (typeof item === 'object' ? item.pdfPayload : null),
              contentPayload: bankQ?.contentPayload || (typeof item === 'object' ? item.contentPayload : null),
              pdfUrl: bankQ?.pdfUrl || (typeof item === 'object' ? item.pdfUrl : null),
              htmlPayload: bankQ?.htmlPayload || (typeof item === 'object' ? item.htmlPayload : null),
              contentType: (typeof item === 'object' ? item.contentType : null) || bankQ?.contentType,
              questionType: (typeof item === 'object' ? item.questionType : null) || bankQ?.questionType,
              questionCount: qCount,
              resolvedQuestions,
              questions: resolvedQuestions
            };
          });
        }

        if (sections.length > 0) {
          setTest({
            ...foundTest,
            sections
          });
        } else {
          const singleQId = (Array.isArray(questionIdList) && questionIdList.length === 1)
            ? (typeof questionIdList[0] === 'object' ? (questionIdList[0].id || questionIdList[0].questionId) : questionIdList[0])
            : (foundTest.questionIds?.[0] || foundTest.id);
          const bankQ = singleQId ? allBankQuestions?.find(q => String(q.id) === String(singleQId) || String(q.id).replace(/^q_?/, '') === String(singleQId).replace(/^q_?/, '')) : null;

          if (bankQ) {
            setTest({
              ...bankQ,
              ...foundTest,
              questionCount: bankQ.questionCount || bankQ.questionsList?.length || (Array.isArray(bankQ.answerKey) ? bankQ.answerKey.length : 1),
              totalQuestions: bankQ.questionCount || bankQ.questionsList?.length || (Array.isArray(bankQ.answerKey) ? bankQ.answerKey.length : 1),
              isOpenEnded: bankQ.isOpenEnded || bankQ.type === 'acik_uclu' || bankQ.contentType === 'acik_uclu' || foundTest.isOpenEnded
            });
          } else {
            setTest(foundTest);
          }
        }

        const resolved = resolveTestQuestions(foundTest, allBankQuestions);
        setQuestions(resolved);
      }
      setLoading(false);
    } else {
      // Only finish loading if all context fetches are completed
      if (!hwLoading && !booksLoading && !currLoading && !qbLoading) {
        setLoading(false);
      }
    }
  }, [testId, homeworks, curriculumData, allBankQuestions, bookTests, books, hwLoading, booksLoading, currLoading, qbLoading]);

  // If this is a physical exam (from ExamManager or TrackedBook with bookType: 'exam'), redirect directly to /physical-exam/:id
  useEffect(() => {
    if (test) {
      const isPhysicalExam = (
        test.type === 'physicalExam' ||
        test.contentType === 'physicalExam' ||
        test.bookType === 'exam' ||
        bookForTest?.bookType === 'exam' ||
        test.sourceFormat === 'physicalExam' ||
        (test.subjects && test.subjects.length > 0 && !test.questionsList)
      );
      if (isPhysicalExam) {
        const targetId = test.hwId || test.bookId || test.id || testId;
        navigate(`/physical-exam/${targetId}?studentId=${studentId || ''}`, { replace: true });
      }
    }
  }, [test, bookForTest, testId, studentId, navigate]);



  const isDataLoading = (hwLoading && (!homeworks || homeworks.length === 0)) || 
                        (booksLoading && (!bookTests || bookTests.length === 0));

  if (loading || isDataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800 }}>
        Sınav Yükleniyor...
      </div>
    );
  }

  if (!test) {
    if (initLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800 }}>
          Sınav Yükleniyor...
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', gap: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text)' }}>Sınav Bulunamadı</h2>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>
          Bu teste ait kayıt bulunamadı veya henüz yükleniyor olabilir. Lütfen listenizi kontrol ediniz.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => navigate('/student')} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
            Öğrenci Paneline Dön
          </button>
          <button onClick={() => navigate('/student/books')} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
            Kitaplarıma Dön
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (formattedAnswers, options = {}) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;

    const evaluatedAnswers = formattedAnswers.map((ans, idx) => {
      const qObj = questions[idx] || {};
      const userAns = ans.userAnswer;
      const textVal = ans.userAnswerText;
      const qNo = ans.questionNoInSection || ans.questionNo || (idx + 1);
      const isOE = Boolean(ans.isOpenEnded || ans.is_open_ended || textVal);

      let isCorrect = ans.isCorrect;
      if (isOE) {
        isCorrect = null; // Açık uçlu sorular öğretmen puanlayana kadar pending kalır
      } else if (isCorrect === undefined || isCorrect === null) {
        const testCtx = {
          ...test,
          ...qObj,
          answerKey: test?.answerKey || questions[0]?.answerKey || qObj?.answerKey || test?.opticAnswers || test?.htmlPayload?.answerKey,
          answer_key: test?.answer_key || questions[0]?.answer_key || qObj?.answer_key || test?.htmlPayload?.answer_key,
          htmlPayload: test?.htmlPayload || qObj?.htmlPayload,
          bankQ: {
            ...(test?.bankQ || {}),
            ...(qObj?.bankQ || {})
          }
        };
        if (userAns !== null && userAns !== undefined && userAns !== '') {
          isCorrect = checkIsAnswerCorrect(userAns, qObj, testCtx, qNo);
        }
      }

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false && (userAns !== null && userAns !== undefined && userAns !== '')) wrongCount++;
      else if (isOE) pendingCount++;
      else blankCount++;

      const answerKeyArr = test.answerKey || questions[0]?.answerKey || null;
      const answerKeyLetter = (answerKeyArr && Array.isArray(answerKeyArr)) ? answerKeyArr[qNo - 1] : null;
      const finalCorrectAnswer = (ans.correctAnswerLetter !== undefined && ans.correctAnswerLetter !== null && ans.correctAnswerLetter !== '')
        ? ans.correctAnswerLetter
        : (ans.correctAnswer !== undefined && ans.correctAnswer !== null && ans.correctAnswer !== '')
          ? (typeof ans.correctAnswer === 'number' ? String.fromCharCode(65 + ans.correctAnswer) : String(ans.correctAnswer))
          : answerKeyLetter
          ?? (qObj.correctAnswerLetter || (qObj.correctAnswer !== null && qObj.correctAnswer !== undefined ? String.fromCharCode(65 + qObj.correctAnswer) : null));

      return {
        ...ans,
        isCorrect,
        correctAnswer: finalCorrectAnswer
      };
    });

    const totalQ = correctCount + wrongCount + blankCount + pendingCount;
    const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const isAcikUclu = test.questionType === 'acik_uclu' || test.type === 'acik_uclu' || pendingCount > 0 || formattedAnswers.some(a => a.isOpenEnded);
    const finalStatus = isAcikUclu ? 'pending' : 'completed';
    const newSubId = `sub_${Date.now()}`;

    const effectiveHwId = activeHomework ? activeHomework.id : (String(testId || '').startsWith('hw_') ? testId : null);
    const submissionData = {
      id: draftSubmission ? draftSubmission.id : newSubId,
      testId: test.id,
      hwId: effectiveHwId || (String(test.id) !== String(testId) ? testId : null),
      homeworkId: effectiveHwId || (String(test.id) !== String(testId) ? testId : null),
      testTitle: test.title || test.name || 'Sınav',
      studentId: studentId,
      studentName: searchParams.get('studentName') || 'Öğrenci',
      subject: test.subject || test.publisher || 'Genel',
      bookId: test.bookId || null,
      bookTestId: test.id,
      bookTestIds: test.tests || [test.id],
      questionsList: questions.map(q => ({
        id: q.id,
        text: q.questionText || q.text || '',
        imageUrl: q.imageUrl || null,
        imageUrls: q.imageUrls || (q.imageUrl ? [q.imageUrl] : []),
        contentPayload: q.contentPayload || null,
        contentType: q.contentType || q.type || test.contentType || test.type || null,
        options: q.options || []
      })),
      contentPayload: test.contentPayload || questions[0]?.contentPayload || null,
      pdfPayload: test.pdfPayload || questions[0]?.pdfPayload || null,
      htmlPayload: test.htmlPayload || questions[0]?.htmlPayload || null,
      imageUrl: test.imageUrl || questions[0]?.imageUrl || null,
      imageUrls: test.imageUrls || questions[0]?.imageUrls || [],
      contentType: test.contentType || test.type || questions[0]?.contentType || questions[0]?.type || null,
      sourceFormat: test.sourceFormat || test.formatType || null,
      isOpenEnded: isAcikUclu,
      answers: evaluatedAnswers,
      correctCount,
      wrongCount,
      blankCount,
      pendingCount,
      totalQuestions: totalQ,
      score,
      status: finalStatus,
      submittedAt: new Date().toISOString()
    };

    try {
      if (draftSubmission) {
        updateSubmission(draftSubmission.id, submissionData);
      } else {
        addSubmission(submissionData);
      }

      if (submissionData.hwId || submissionData.testId) {
        const hId = submissionData.hwId || submissionData.testId;
        try {
          if (updateHomeworkSubmission) {
            updateHomeworkSubmission(hId, studentId, submissionData);
          }
        } catch (e) {}
      }

      setSubmittedResult(submissionData);
      isSubmittingRef.current = false;
      
      if (options.isReviewAction) {
         navigate(`/quiz-review/${testId}?studentId=${studentId}`, { replace: true });
      } else if (options.isCloseAction) {
         navigate('/student', { replace: true });
      }
      // If neither is true (e.g. from HtmlQuizRunner), do nothing! The inline submittedResult block will render.

    } catch (err) {
      console.error('Error saving submission:', err);
      isSubmittingRef.current = false;
    }
  };

  const handleAutoSave = (formattedAnswers) => {
    const evaluatedAnswers = formattedAnswers.map((ans, idx) => {
      const qObj = questions[idx] || {};
      const userAns = ans.userAnswer;
      const textVal = ans.userAnswerText;
      const qNo = ans.questionNo || (idx + 1);

      let isCorrect = ans.isCorrect;
      if (userAns !== null && userAns !== undefined && userAns !== '') {
        isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
      } else if (textVal) {
        isCorrect = null;
      } else {
        isCorrect = null;
      }

      return {
        ...ans,
        isCorrect,
        correctAnswer: ans.correctAnswerLetter || ans.correctAnswer || qObj.correctAnswerLetter || (qObj.correctAnswer !== null && qObj.correctAnswer !== undefined ? String.fromCharCode(65 + qObj.correctAnswer) : null)
      };
    });

    const totalQ = questions.length || test.questionCount || test.totalQuestions || formattedAnswers.length || 1;
    const isAcikUclu = test.questionType === 'acik_uclu' || test.type === 'acik_uclu';

    const draftData = {
      testId: test.id,
      hwId: String(test.id) !== String(testId) ? testId : null,
      testTitle: test.title || test.name || 'Sınav',
      studentId: studentId,
      studentName: searchParams.get('studentName') || 'Öğrenci',
      subject: test.subject || test.publisher || 'Genel',
      bookId: test.bookId || null,
      bookTestId: test.id,
      bookTestIds: test.tests || [test.id],
      isOpenEnded: isAcikUclu,
      answers: evaluatedAnswers,
      totalQuestions: totalQ,
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    };

    if (draftSubmission) {
      updateSubmission(draftSubmission.id, draftData);
    } else {
      const newDraftId = `draft_${Date.now()}`;
      const fullDraftData = { id: newDraftId, ...draftData, submittedAt: new Date().toISOString() };
      addSubmission(fullDraftData);
    }
  };

  // Determine Source Format Mode
  const isWritten = Boolean(
    test.questionType === 'yazili' ||
    test.type === 'yazili' ||
    test.contentType === 'yazili' ||
    test.questionType === 'acik_uclu' ||
    test.type === 'acik_uclu' ||
    test.contentType === 'acik_uclu' ||
    test.sourceFormat === 'yazili' ||
    test.formatType === 'yazili' ||
    test.isOpenEnded ||
    (questions && questions.some(q => q.type === 'yazili' || q.type === 'acik_uclu' || q.contentType === 'yazili' || q.contentType === 'acik_uclu'))
  );


  const isRealStandardQuiz = Boolean(
    questions && Array.isArray(questions) && questions.length > 0 && questions.some(q => {
      if (!q.questionText) return false;
      const text = q.questionText.trim();
      if (text.length <= 10) return false;
      if (/^soru\s*\d+/i.test(text) || /^\d+\.\s*soru/i.test(text)) return false;
      return true;
    })
  );

  const hasExplicitHtmlQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'html' || q.questionType === 'html' || q.contentType === 'html' || q.formatType === 'html' || q.sourceFormat === 'html' || (q.htmlPayload && !q.options && q.type !== 'coktan_secmeli' && q.type !== 'yazili')
  ));
  const isDefinitelyStandardForHtml = isRealStandardQuiz && !hasExplicitHtmlQuestions;
  
  const isValidHtmlPayload = Boolean(
    (typeof test.htmlPayload === 'string' && test.htmlPayload.length > 0 && !test.htmlPayload.startsWith('data:image')) ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.includes('<!DOCTYPE') || test.contentPayload.includes('<html') || test.contentPayload.includes('<body') || test.contentPayload.includes('<div') || test.contentPayload.startsWith('data:text/html')))
  );

  const isHtml = !isDefinitelyStandardForHtml && Boolean(
    isValidHtmlPayload || test.sourceFormat === 'html' || test.formatType === 'html' ||
    test.contentType === 'html' || test.type === 'html' || test.questionType === 'html' || hasExplicitHtmlQuestions ||
    (test.title && String(test.title).toLowerCase().includes('html')) ||
    (test.name && String(test.name).toLowerCase().includes('html'))
  );

  const hasExplicitPdfQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'pdf' || q.questionType === 'pdf' || q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || Boolean(q.pdfPayload) || Boolean(q.pdfUrl)
  ));
  const isPdf = !isHtml && Boolean(
    test.pdfPayload || test.pdfUrl || test.sourceFormat === 'pdf' || test.formatType === 'pdf' ||
    test.contentType === 'pdf' || test.type === 'pdf' || test.questionType === 'pdf' || hasExplicitPdfQuestions ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:application/pdf') || test.contentPayload.includes('.pdf') || test.contentPayload.startsWith('%PDF'))) ||
    (test.title && String(test.title).toLowerCase().includes('pdf')) ||
    (test.name && String(test.name).toLowerCase().includes('pdf'))
  );

  // ALWAYS force Physical Optik Grid Form ONLY for real physical tracked book tests with no digital content
  const isPhysical = Boolean(
    !String(test.id || '').startsWith('hw_') &&
    (
      test.sourceFormat === 'physical' ||
      test.formatType === 'physical' ||
      test.questionType === 'optik_form' ||
      test.type === 'optik_form' ||
      (test.sourceType === 'trackedBook' && !test.contentType && !test.contentPayload && !test.sections && !test.questionsList && !test.questions?.length)
    )
  );

  const hasExplicitImageQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'gorsel' || q.type === 'gorsel_klasik' || q.questionType === 'gorsel_klasik' || q.contentType === 'gorsel' || q.formatType === 'image' || q.sourceFormat === 'image' || (q.imageUrls && q.imageUrls.length > 0) || (q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl !== '[STORED_IN_INDEXEDDB]')
  ));
  const isImageTest = !isHtml && !isPdf && !isPhysical && Boolean(
    test.sourceFormat === 'image' || test.formatType === 'image' ||
    test.contentType === 'gorsel' || test.type === 'gorsel' || test.questionType === 'gorsel_klasik' || hasExplicitImageQuestions ||
    Boolean(test.imageUrl || (test.imageUrls && test.imageUrls.length > 0)) ||
    (typeof test.contentPayload === 'string' && test.contentPayload.startsWith('data:image'))
  );

  const hasMultipleDistinctSections = Boolean(
    (test.sections && Array.isArray(test.sections) && test.sections.length > 0) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 0) ||
    (test.questionIds && Array.isArray(test.questionIds) && test.questionIds.length > 1)
  );

  const isMultiSection = !isPhysical && (hasMultipleDistinctSections || Boolean(
    test.isBulk ||
    test.isMulti ||
    test.isComposite
  ));

  const bookPdfUrl = test?.pdfUrl || bookForTest?.pdfUrl || '';

  const isSingleOE = !isMultiSection && !isPdf && !isHtml && !isPhysical && !isImageTest && (isWritten || isSectionOpenEnded(effectiveTest));

  const renderRunner = () => {
    // 1. Composite / Multi-Section Homework
    if (isMultiSection) {
      return (
        <CompositeHomeworkRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={() => navigate('/student')}
        />
      );
    }

    // 2. Single HTML
    if (isHtml) {
      return (
        <HtmlQuizRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={() => navigate('/student')}
        />
      );
    }

    // 3. Single PDF
    if (isPdf) {
      return (
        <PdfQuizRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={() => navigate('/student')}
        />
      );
    }

    // 4. Single Image
    if (isImageTest) {
      return (
        <ImageQuizRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={() => navigate('/student')}
        />
      );
    }

    // 5. Single Open-Ended / Written
    if (isSingleOE) {
      return (
        <SingleOpenEndedRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={() => navigate('/student')}
        />
      );
    }

    // 6. Physical Exam
    if (isPhysical) {
      return (
        <PhysicalQuizRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          bookPdfUrl={bookPdfUrl}
          onExit={() => navigate('/student')}
        />
      );
    }

    // 7. Default: Single Multiple-Choice
    return (
      <SingleMultipleChoiceRunner
        test={effectiveTest}
        questions={questions}
        onSubmit={handleSubmit}
        onAutoSave={handleAutoSave}
        draftAnswers={draftSubmission?.answers}
        onExit={() => navigate('/student')}
      />
    );
  };

  if (!hasStarted) {
    const testTitle = activeHomework?.title || test?.title || test?.name || 'Ödev / Sınav';
    const testSubject = activeHomework?.subject || test?.subject || bookForTest?.title || 'Genel Sınav';
    const displayQuestionCount = test?.questionCount || test?.totalQuestions || (questions && questions.length > 0 ? questions.length : null) || activeHomework?.totalQuestions || (Array.isArray(test?.answerKey) ? test.answerKey.length : 1);
    const timePerQ = activeHomework?.timePerQuestion || test?.timePerQuestion || 2;
    const totalMinutes = test?.durationMinutes || (displayQuestionCount * timePerQ);
    const dueDateStr = activeHomework?.dueDate ? new Date(activeHomework.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
    const formatLabel = isWritten ? 'Açık Uçlu / Yazılı' : isHtml ? 'İnteraktif HTML' : isPdf ? 'PDF Destekli Sınav' : isMultiSection ? 'Çok Bölümlü Ödev' : isPhysical ? 'Fiziksel Kitap Optik Formu' : 'Çoktan Seçmeli Test';
    const hasExistingDraft = Boolean(draftSubmission && draftSubmission.answers && draftSubmission.answers.length > 0);

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', padding: '1.5rem', color: 'var(--color-text)' }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.5rem',
          padding: '2.5rem 2rem',
          maxWidth: '620px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 25px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.35rem'
        }}>
          {/* ICON BADGE */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(37,99,235,0.12)',
            border: '2px solid #3b82f6',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37,99,235,0.15)'
          }}>
            <Sparkles size={40} />
          </div>

          {/* BADGES & TITLE */}
          <div>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
              <span style={{ padding: '0.25rem 0.65rem', background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '99px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {testSubject}
              </span>
              <span style={{ padding: '0.25rem 0.65rem', background: isDark ? 'rgba(22, 163, 74, 0.2)' : '#f0fdf4', border: `1px solid ${isDark ? '#15803d' : '#bbf7d0'}`, color: isDark ? '#4ade80' : '#15803d', borderRadius: '99px', fontWeight: 800, fontSize: '0.72rem' }}>
                {formatLabel}
              </span>
              {activeHomework && (
                <span style={{ padding: '0.25rem 0.65rem', background: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb', border: `1px solid ${isDark ? '#b45309' : '#fde68a'}`, color: isDark ? '#fbbf24' : '#b45309', borderRadius: '99px', fontWeight: 800, fontSize: '0.72rem' }}>
                  Ödev Görevi
                </span>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
                style={{
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border-input)',
                  color: 'var(--color-text)',
                  padding: '0.22rem 0.6rem',
                  borderRadius: '99px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isDark ? <Sun size={12} color="#f59e0b" /> : <Moon size={12} color="#6366f1" />}
                <span>{isDark ? 'Açık Tema' : 'Koyu Tema'}</span>
              </button>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: 'var(--color-text)', lineHeight: 1.25 }}>
              {testTitle}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              Sınavınız hazırlandı. Başlamaya hazır olduğunuzda <b>"{hasExistingDraft ? 'Kaldığın Yerden Devam Et' : 'Sınava Başla'}"</b> butonuna tıklayınız.
            </p>
          </div>

          {/* STATS 4-CARD GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '0.75rem', width: '100%' }}>
            <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ color: '#4f46e5', display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Layers size={17} /></div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>{displayQuestionCount} Soru</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>Toplam Soru</div>
            </div>
            
            <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ color: '#16a34a', display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Clock3 size={17} /></div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#16a34a' }}>{totalMinutes} Dk</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>{timePerQ} dk / soru</div>
            </div>

            {dueDateStr && (
              <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ color: '#d97706', display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Calendar size={17} /></div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#d97706', lineHeight: 1.2, marginTop: 3 }}>{dueDateStr}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>Son Teslim</div>
              </div>
            )}

            <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ color: '#0284c7', display: 'flex', justifyContent: 'center', marginBottom: 4 }}><ShieldCheck size={17} /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0284c7', marginTop: 2 }}>Aktif</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>Sınav Durumu</div>
            </div>
          </div>

          {/* RULES / TIPS BOX */}
          <div style={{ width: '100%', background: 'var(--color-surface-hover)', borderRadius: '0.9rem', border: '1.5px solid var(--color-border)', padding: '0.9rem 1.15rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              💡 Sınav Bilgilendirmesi
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li>İşaretlediğiniz cevaplar anlık olarak otomatik kaydedilir.</li>
              <li>Sorular arasında dilediğiniz gibi geçiş yapabilir, cevabınızı güncelleyebilirsiniz.</li>
              <li>Testi bitirdikten sonra sağ üstteki <b>"Sınavı Tamamla"</b> butonuna basarak teslim ediniz.</li>
            </ul>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setHasStarted(true)}
              style={{
                flex: 2,
                minWidth: '180px',
                padding: '0.9rem 1.5rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white',
                fontWeight: 900,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 16px rgba(79,70,229,0.35)',
                transition: 'all 0.15s'
              }}
            >
              <Play size={18} fill="white" /> {hasExistingDraft ? 'Kaldığın Yerden Devam Et' : (completedSub ? 'Sınavı Tekrar Çöz' : 'Sınava Başla')}
            </button>

            {completedSub && (
              <button
                onClick={() => navigate(`/quiz-review/${testId}?studentId=${studentId}`, { replace: true })}
                style={{
                  flex: 1.5,
                  minWidth: '160px',
                  padding: '0.9rem 1.25rem',
                  borderRadius: '0.85rem',
                  background: 'var(--color-surface)',
                  color: '#4f46e5',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  border: '2px solid #6366f1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.15)',
                  transition: 'all 0.15s'
                }}
              >
                <Eye size={18} /> Önceki Sonucu İncele
              </button>
            )}

            <button
              onClick={() => navigate(-1)}
              style={{
                flex: 1,
                minWidth: '100px',
                padding: '0.9rem 1.1rem',
                borderRadius: '0.85rem',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.85rem',
                border: '1.5px solid var(--color-border-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s'
              }}
            >
              <ArrowLeft size={16} /> Geri Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderRunner()}
      {submittedResult && (() => {
        const cCount = submittedResult.correctCount || 0;
        const wCount = submittedResult.wrongCount || 0;
        const bCount = submittedResult.blankCount || 0;
        const pCount = submittedResult.pendingCount || 0;
        const totQ = submittedResult.totalQuestions || (cCount + wCount + bCount + pCount) || 1;
        const scorePct = submittedResult.score !== undefined && submittedResult.score !== null ? submittedResult.score : Math.round((cCount / totQ) * 100);
        const net = Math.max(0, cCount - (wCount * 0.25));

        const getStatus = (pct) => {
          if (pct >= 85) return { label: 'Mükemmel 🌟', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
          if (pct >= 70) return { label: 'Çok İyi 🎯', color: '#0284c7', bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.3)' };
          if (pct >= 50) return { label: 'Başarılı 👍', color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' };
          return { label: 'Geliştirilmeli 📈', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)' };
        };

        const status = getStatus(scorePct);

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            overflowY: 'auto',
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.5rem',
              width: '100%',
              maxWidth: '680px',
              color: 'var(--color-text)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              margin: 'auto'
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: submittedResult.isOpenEnded ? 'rgba(124, 58, 237, 0.12)' : status.bg,
                  border: `2px solid ${submittedResult.isOpenEnded ? 'rgba(167, 139, 250, 0.4)' : status.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {submittedResult.isOpenEnded ? '⏳' : '🎉'}
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: 'var(--color-text)' }}>
                  {submittedResult.isOpenEnded ? 'Sınav Başarıyla Gönderildi!' : 'Sınav Sonuç Raporu'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ background: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff', color: isDark ? '#93c5fd' : '#2563eb', border: `1px solid ${isDark ? '#1d4ed8' : '#bfdbfe'}`, padding: '0.15rem 0.55rem', borderRadius: 99, fontWeight: 900, fontSize: '0.78rem' }}>
                    🎓 {submittedResult.studentName || 'Öğrenci'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>
                    {submittedResult.testTitle}
                  </span>
                </div>
              </div>

              {/* Open Ended Evaluation Banner */}
              {submittedResult.isOpenEnded ? (
                <div style={{
                  background: 'rgba(124, 58, 237, 0.08)',
                  border: '1.5px solid rgba(167, 139, 250, 0.4)',
                  borderRadius: '1rem',
                  padding: '1.15rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem'
                }}>
                  <div style={{ fontSize: '1.6rem' }}>📝</div>
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, color: '#a78bfa', fontSize: '0.95rem' }}>
                      Yazılı / Açık Uçlu Cevaplarınız Öğretmen Değerlendirmesine İletildi
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Açık uçlu ({submittedResult.pendingCount || submittedResult.totalQuestions} soru) cevaplarınız öğretmeniniz tarafından incelenip puanlandıktan sonra karne ve başarı durumunuza yansıyacaktır.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.75rem' }}>
                {/* Card 1: BAŞARI DURUMU */}
                {submittedResult.isOpenEnded ? (
                  <div style={{
                    background: isDark ? 'rgba(124, 58, 237, 0.15)' : '#f5f3ff',
                    border: '1.5px solid #ddd6fe',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      DURUM
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#a78bfa', lineHeight: 1.1 }}>
                      ⏳
                    </div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 900,
                      color: isDark ? '#ddd6fe' : '#7c3aed', background: isDark ? 'rgba(124, 58, 237, 0.3)' : '#ede9fe',
                      border: '1px solid #ddd6fe',
                      padding: '0.12rem 0.5rem', borderRadius: '12px', marginTop: '0.2rem'
                    }}>
                      Değerlendirmede
                    </span>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    border: `1.5px solid ${status.border}`,
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      BAŞARI DURUMU
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: status.color, lineHeight: 1.1 }}>
                      %{scorePct}
                    </div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 900,
                      color: status.color, background: status.bg,
                      border: `1px solid ${status.border}`,
                      padding: '0.12rem 0.5rem', borderRadius: '12px', marginTop: '0.2rem'
                    }}>
                      {status.label}
                    </span>
                  </div>
                )}

                {/* Card 2: DOĞRU / YANLIŞ / BOŞ */}
                {submittedResult.isOpenEnded ? (
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      AÇIK UÇLU
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#a78bfa', marginTop: '0.1rem' }}>
                      {submittedResult.totalQuestions || total} Soru
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      Öğretmen İncelemesinde
                    </span>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      DOĞRU / YANLIŞ
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#16a34a', marginTop: '0.1rem' }}>
                      {cCount} <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>D / {wCount} Y</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      {bCount > 0 ? `(${bCount} Boş Soru)` : '(Tümü Yanıtlandı)'}
                    </span>
                  </div>
                )}

                {/* Card 3: NET PUAN */}
                {submittedResult.isOpenEnded ? (
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      SONUÇ / PUAN
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text-muted)', lineHeight: 1.1 }}>
                      —
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      Puanlama Sonrası
                    </span>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      NET PUAN
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', lineHeight: 1.1 }}>
                      {net.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      Net
                    </span>
                  </div>
                )}

                {/* Card 4: Open Ended if applicable */}
                {submittedResult.isOpenEnded && (
                  <div style={{
                    background: 'rgba(124, 58, 237, 0.08)',
                    border: '1px solid rgba(167, 139, 250, 0.35)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.65rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 800 }}>AÇIK UÇLU YANIT</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#a78bfa', marginTop: 2 }}>
                      {pCount || totQ} Soru
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700 }}>
                      ⏳ Değerlendirmede
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION BREAKDOWN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                  📊 Bölüm Bazlı Sonuç Özeti
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.45rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ padding: '0.15rem 0.45rem', background: submittedResult.isOpenEnded ? '#7c3aed' : '#0284c7', borderRadius: '0.35rem', fontSize: '0.68rem', fontWeight: 900, color: 'white' }}>
                        {submittedResult.isOpenEnded ? '✍️ Yazılı Bölüm' : '📝 Test Bölümü'}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-text)' }}>
                        {submittedResult.testTitle}
                      </span>
                    </div>

                    {submittedResult.isOpenEnded ? (
                      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.4rem', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(167, 139, 250, 0.4)', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 900 }}>
                        ⏳ Öğretmen Değerlendirmesinde
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem', fontWeight: 800, flexWrap: 'wrap' }}>
                        <span style={{ color: '#16a34a' }}>{cCount} Doğru</span>
                        <span style={{ color: '#dc2626' }}>{wCount} Yanlış</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{bCount} Boş</span>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          background: status.bg,
                          border: `1px solid ${status.border}`,
                          color: status.color,
                          borderRadius: '0.4rem',
                          fontWeight: 900,
                          fontSize: '0.75rem'
                        }}>
                          %{scorePct} Başarı
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/quiz-review/${submittedResult.testId}?studentId=${studentId}`, {
                      state: { from: submittedResult.bookId ? `/student/books/${submittedResult.bookId}` : '/student' }
                    });
                  }}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: '0.85rem 1.25rem',
                    borderRadius: '0.85rem',
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border-input)',
                    color: 'var(--color-text)',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <Eye size={17} /> Cevapları İncele
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/student');
                  }}
                  style={{
                    flex: 1.3,
                    minWidth: 160,
                    padding: '0.85rem 1.25rem',
                    borderRadius: '0.85rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
                  }}
                >
                  <CheckCircle2 size={18} /> Öğrenci Paneline Dön
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
