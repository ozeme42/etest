import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Clock3, Trophy, Eye, Home, CheckCircle2, BookOpen, ArrowLeft, Sparkles, Play, Layers, Calendar, ShieldCheck, Check, Zap, Sun, Moon, WifiOff } from 'lucide-react';
import { checkIsAnswerCorrect, compareOpenEndedAnswers } from '../utils/answerEvaluation';
import { toUUID } from '../services/supabaseService';
import { isDeviceOnline } from '../services/offlineSyncService';

import PdfQuizRunner from '../components/quiz/runner/PdfQuizRunner';
import HtmlQuizRunner from '../components/quiz/runner/HtmlQuizRunner';
import ImageQuizRunner from '../components/quiz/runner/ImageQuizRunner';
import PhysicalQuizRunner from '../components/quiz/runner/PhysicalQuizRunner';
import SingleMultipleChoiceRunner from '../components/quiz/single/SingleMultipleChoiceRunner';
import SingleOpenEndedRunner from '../components/quiz/single/SingleOpenEndedRunner';
import CompositeHomeworkRunner from '../components/quiz/composite/CompositeHomeworkRunner';
import RemedialQuizRunner from '../components/quiz/remedial/RemedialQuizRunner';
import { isSectionOpenEnded, isMultipleChoice } from '../components/quiz/utils/quizTypeDetector';

import { resolveTestQuestions, hasMeaningfulOptions } from '../utils/testResolver';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { idbGetPayload } from '../services/indexedDbService';
import { extractImageUrls } from '../components/quiz/common/ImageLightbox';

export default function ModularQuizPage() {
  const { testId } = useParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { homeworks, updateHomeworkSubmission, isLoading: hwLoading } = useHomework();
  const { data: curriculumData, isLoading: currLoading } = useCurriculum();
  const { submissions, addSubmission, updateSubmission, isSyncing } = useEvaluation();
  const { questions: allBankQuestions, isLoading: qbLoading } = useQuestionBank();
  const { bookTests, books, isLoading: booksLoading } = useTrackedBooks();

  // Find associated homework object if any
  const activeHomework = useMemo(() => {
    if (!homeworks || homeworks.length === 0) return null;
    return homeworks.find(h => {
      if (String(h.id) === String(testId) || String(h.id).replace('hw_', '') === String(testId)) return true;
      const match = h.tests && h.tests.some(t => String(t) === String(testId) || (toUUID(t) && toUUID(t) === toUUID(testId)));
      return Boolean(match);
    });
  }, [homeworks, testId]);

  const studentId = useMemo(() => {
    const paramId = searchParams.get('studentId');
    if (paramId) return paramId;
    if (activeHomework) {
      if (activeHomework.targetStudentId) return activeHomework.targetStudentId;
      if (activeHomework.assignedStudentId) return activeHomework.assignedStudentId;
      if (Array.isArray(activeHomework.target_ids) && activeHomework.target_ids.length === 1) {
        return activeHomework.target_ids[0];
      }
      if (Array.isArray(activeHomework.targetIds) && activeHomework.targetIds.length === 1) {
        return activeHomework.targetIds[0];
      }
    }
    return currentUser?.id;
  }, [searchParams, activeHomework, currentUser]);

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(() => {
    try {
      const cleanId = String(testId || '').trim();
      const started = localStorage.getItem(`quiz_started_${cleanId}`);
      const draftAns = localStorage.getItem(`draft_quiz_${cleanId}_ans`) || 
                       localStorage.getItem(`quiz_draft_${cleanId}`) ||
                       localStorage.getItem(`draft_single_mc_${cleanId}_ans`) ||
                       localStorage.getItem(`draft_single_oe_${cleanId}_txt`);
      if (started === 'true' || draftAns) return true;
    } catch {}
    return false;
  });
  const [submittedResult, setSubmittedResult] = useState(null);
  const isSubmittingRef = useRef(false);

  // Network connection state for offline quiz resilience
  const [isOnline, setIsOnline] = useState(isDeviceOnline());
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Grace period for initial context data load (4 seconds)
  const [initLoading, setInitLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitLoading(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const location = useLocation();
  const returnUrl = location.state?.from || location.state?.returnUrl || (searchParams.get('from'));

  const handleGoBack = useCallback(() => {
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate(-1);
    }
  }, [navigate, returnUrl]);

  const isRetake = searchParams.get('retake') === 'true' || searchParams.get('mode') === 'solve' || Boolean(location?.state?.retake);

  // If this is an explicit re-take of a test, clear old draft keys so student gets a fresh blank test
  useEffect(() => {
    if (isRetake) {
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
          localStorage.removeItem(`draft_single_mc_${k}_ans`);
          localStorage.removeItem(`draft_single_oe_${k}_txt`);
          localStorage.removeItem(`quiz_draft_${k}`);
          localStorage.removeItem(`quiz_started_${k}`);
        });
      } catch (e) {}
    }
  }, [isRetake, testId, activeHomework?.id, test?.id, test?.realTestId]);

  const draftSubmission = useMemo(() => {
    if (isRetake) return null;
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
  }, [submissions, testId, test?.id, studentId, activeHomework, isRetake]);

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

  // Auto-redirect to Review page if this test is already completed (unless explicit retake was requested or test is a repeatable remedial test)
  useEffect(() => {
    const isRemTest = Boolean(
      test?.isRemedial ||
      test?.isRemedialTest ||
      test?.isTeacherRemedial ||
      test?.sourceType === 'pdfSlicerRemedial' ||
      /telafi/i.test(test?.title || '') ||
      /telafi/i.test(test?.name || '')
    );
    if (isRemTest || isRetake) return;

    if (completedSub && !isRetake && !submittedResult) {
      const targetSubId = completedSub.id || completedSub.testId || testId;
      navigate(`/review/${targetSubId}?studentId=${studentId || ''}`, {
        replace: true,
        state: { from: returnUrl || '/student' }
      });
    }
  }, [completedSub, isRetake, submittedResult, studentId, testId, returnUrl, navigate, test]);

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

    // 7. Search in submissions for remedial/custom test payload if not found elsewhere
    if (!foundTest && submissions && Array.isArray(submissions)) {
      const matchSub = submissions.find(s => {
        if (!s) return false;
        const sTestId = String(s.testId || s.hwId || s.id || '');
        return testCandidates.some(cand => sTestId === cand || (toUUID(sTestId) && toUUID(sTestId) === cand) || (cand && toUUID(cand) && toUUID(sTestId) === toUUID(cand)));
      });
      if (matchSub && (matchSub.questionsList || matchSub.imageUrls || matchSub.contentPayload)) {
        foundTest = {
          id: matchSub.testId || matchSub.id || cleanTestId,
          title: matchSub.testTitle || matchSub.title || 'Özel Telafi Testi',
          subject: matchSub.subject || 'Genel',
          questionCount: matchSub.totalQuestions || matchSub.questionsList?.length || 1,
          totalQuestions: matchSub.totalQuestions || matchSub.questionsList?.length || 1,
          questionsList: matchSub.questionsList || [],
          imageUrls: matchSub.imageUrls || [],
          imageUrl: matchSub.imageUrl || (matchSub.imageUrls && matchSub.imageUrls[0]) || '',
          contentPayload: matchSub.contentPayload || '',
          isRemedial: true,
          isRemedialTest: true,
          sourceType: 'pdfSlicerRemedial',
          answerKey: matchSub.answers ? Object.fromEntries(matchSub.answers.map((a, i) => [i + 1, a.correctAnswer])) : {}
        };
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
          const ansMeta = ansKey.__meta || {};

          const isOe = Boolean(
            bt.isOpenEnded === true ||
            bt.is_open_ended === true ||
            foundTest.isOpenEnded === true ||
            foundTest.is_open_ended === true ||
            ansMeta.isOpenEnded === true ||
            bt.questionType === 'acik_uclu' ||
            bt.question_type === 'acik_uclu' ||
            foundTest.questionType === 'acik_uclu' ||
            ansMeta.questionType === 'acik_uclu' ||
            (bt.name && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(bt.name)) ||
            (bt.title && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(bt.title)) ||
            (foundTest.name && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(foundTest.name)) ||
            (foundTest.title && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(foundTest.title))
          );

          const hasKey = (Array.isArray(ansKey) && ansKey.length > 0) ||
                         (typeof ansKey === 'string' && ansKey.trim().length > 0) ||
                         (typeof ansKey === 'object' && ansKey !== null && Object.keys(ansKey).length > 0 && ansMeta.isOpenEnded !== true);
          const hasOptions = (Array.isArray(bt.options) && bt.options.length > 1);
          const isExplicitMC = !isOe && (bt.questionType === 'coktan_secmeli' || bt.type === 'coktan_secmeli' || hasOptions || hasKey);

          const qType = isOe ? 'acik_uclu' : (bt.questionType || bt.question_type || ansMeta.questionType || 'coktan_secmeli');

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
              correctAnswerLetter: letterAns,
              isOpenEnded: isOe,
              is_open_ended: isOe,
              type: qType,
              questionType: qType
            });
          }

          return {
            id: bt.id || `sec_${secIdx}`,
            title: bt.name || bt.title || foundTest.title || `Bölüm ${secIdx + 1}`,
            questionCount: qCount,
            isOpenEnded: isOe,
            is_open_ended: isOe,
            type: qType,
            questionType: qType,
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
          const ansKey = foundTest.answerKey || {};
          const ansMeta = ansKey.__meta || {};
          const hasKey = (Array.isArray(foundTest.answerKey) && foundTest.answerKey.length > 0) ||
                         (typeof foundTest.answerKey === 'string' && foundTest.answerKey.trim().length > 0) ||
                         (typeof foundTest.answerKey === 'object' && foundTest.answerKey !== null && Object.keys(foundTest.answerKey).length > 0 && ansMeta.isOpenEnded !== true);
          const isFallbackOe = !hasKey && foundTest.questionType !== 'coktan_secmeli' && foundTest.type !== 'coktan_secmeli' && Boolean(
            foundTest.isOpenEnded === true ||
            foundTest.is_open_ended === true ||
            foundTest.questionType === 'acik_uclu' ||
            ansMeta.isOpenEnded === true ||
            ansMeta.questionType === 'acik_uclu' ||
            (foundTest.title && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(foundTest.title)) ||
            (foundTest.name && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(foundTest.name))
          );
          for (let i = 1; i <= totalQFallback; i++) {
            allResolvedQs.push({
              id: `hw_q${i}`,
              questionNo: i,
              testName: foundTest.title || foundTest.name || 'Kitap Ödevi',
              questionText: `Soru ${i}`,
              questionCount: 1,
              correctAnswer: null,
              correctAnswerLetter: null,
              isOpenEnded: isFallbackOe,
              is_open_ended: isFallbackOe,
              type: isFallbackOe ? 'acik_uclu' : 'coktan_secmeli',
              questionType: isFallbackOe ? 'acik_uclu' : 'coktan_secmeli'
            });
          }
        }

        const testAnsMeta = foundTest.answerKey?.__meta || {};
        const isFoundTestExplicitOE = Boolean(
          foundTest.isOpenEnded === true ||
          foundTest.is_open_ended === true ||
          foundTest.questionType === 'acik_uclu' ||
          foundTest.type === 'acik_uclu' ||
          foundTest.type === 'gorsel_klasik' ||
          testAnsMeta.isOpenEnded === true ||
          testAnsMeta.questionType === 'acik_uclu'
        );
        const testHasKey = (Array.isArray(foundTest.answerKey) && foundTest.answerKey.length > 0) ||
                           (typeof foundTest.answerKey === 'string' && foundTest.answerKey.trim().length > 0) ||
                           (typeof foundTest.answerKey === 'object' && foundTest.answerKey !== null && Object.keys(foundTest.answerKey).length > 0 && testAnsMeta.isOpenEnded !== true);
        const testHasOptions = Array.isArray(foundTest.options) && foundTest.options.length > 1;
        const isExplicitMC = !isFoundTestExplicitOE && (foundTest.questionType === 'coktan_secmeli' || foundTest.type === 'coktan_secmeli' || testHasKey || testHasOptions);

        const isFoundTestOe = isFoundTestExplicitOE || (!isExplicitMC && Boolean(
          sections.some(s => s.isOpenEnded) ||
          (foundTest.title && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(foundTest.title)) ||
          (foundTest.name && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(foundTest.name))
        ));

        setTest({
          ...foundTest,
          title: foundTest.title || foundTest.name || 'Kitap Testi',
          sourceType: 'trackedBook',
          isOpenEnded: isFoundTestOe,
          is_open_ended: isFoundTestOe,
          questionType: isFoundTestOe ? 'acik_uclu' : (foundTest.questionType || 'coktan_secmeli'),
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

            const qImages = (Array.isArray(bankQ?.imageUrls) ? bankQ.imageUrls : null) ||
                            (Array.isArray(bankQ?.images) ? bankQ.images : null) ||
                            (typeof item === 'object' && Array.isArray(item.imageUrls) ? item.imageUrls : null) ||
                            (typeof item === 'object' && Array.isArray(item.images) ? item.images : null) ||
                            [];
            const qImg = bankQ?.imageUrl || bankQ?.image || (typeof item === 'object' ? item.imageUrl : null) || (typeof item === 'object' ? item.image : null) || null;

            const secOptions = hasMeaningfulOptions(bankQ?.options)
              ? bankQ.options
              : (hasMeaningfulOptions(item?.options) ? item.options : (bankQ?.options || item?.options || []));

            return {
              ...(bankQ || {}),
              ...(typeof item === 'object' ? item : {}),
              id: itemId || `sec_${idx}`,
              options: secOptions,
              questionId: itemId,
              title,
              bankQ: bankQ || (typeof item === 'object' ? item : { id: itemId, title }),
              pdfPayload: bankQ?.pdfPayload || (typeof item === 'object' ? item.pdfPayload : null),
              contentPayload: bankQ?.contentPayload || (typeof item === 'object' ? item.contentPayload : null),
              pdfUrl: bankQ?.pdfUrl || (typeof item === 'object' ? item.pdfUrl : null),
              htmlPayload: bankQ?.htmlPayload || (typeof item === 'object' ? item.htmlPayload : null),
              imageUrls: qImages.length > 0 ? qImages : (qImg ? [qImg] : undefined),
              imageUrl: qImg,
              images: qImages.length > 0 ? qImages : (qImg ? [qImg] : undefined),
              imagePayload: bankQ?.imagePayload || (typeof item === 'object' ? item.imagePayload : null),
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
          const candidateIds = [
            (Array.isArray(questionIdList) && questionIdList.length === 1 ? (typeof questionIdList[0] === 'object' ? (questionIdList[0].id || questionIdList[0].questionId) : questionIdList[0]) : null),
            foundTest.sourceTestId,
            foundTest.testId,
            foundTest.questionId,
            foundTest.sourceId,
            foundTest.questionIds?.[0],
            foundTest.selectedQuestions?.[0],
            foundTest.id
          ].filter(Boolean);

          let bankQ = null;
          for (const candId of candidateIds) {
            const cleanCand = String(candId).replace(/^q_?|^hw_?/, '');
            bankQ = allBankQuestions?.find(q => String(q.id) === String(candId) || String(q.id).replace(/^q_?|^hw_?/, '') === cleanCand);
            if (bankQ) break;
          }

          if (bankQ) {
            const isMergedOE = Boolean(
              bankQ.type === 'acik_uclu' ||
              bankQ.questionType === 'acik_uclu' ||
              bankQ.type === 'yazili' ||
              bankQ.questionType === 'yazili' ||
              bankQ.type === 'gorsel_klasik' ||
              bankQ.questionType === 'gorsel_klasik' ||
              bankQ.isOpenEnded ||
              foundTest.isOpenEnded ||
              foundTest.questionType === 'acik_uclu' ||
              foundTest.type === 'acik_uclu' ||
              foundTest.questionType === 'yazili' ||
              foundTest.type === 'yazili' ||
              foundTest.questionType === 'gorsel_klasik' ||
              foundTest.type === 'gorsel_klasik' ||
              ((!foundTest.options || foundTest.options.length <= 1) && (!bankQ.options || bankQ.options.length <= 1) && (!foundTest.answerKey || foundTest.answerKey.length === 0) && (!bankQ.answerKey || bankQ.answerKey.length === 0))
            );

            const hasValidPayload = (p) => typeof p === 'string' && p.length > 20 && !p.includes('[STORED_IN_INDEXEDDB]') && !p.includes('[LOCALSTORAGE_CACHE]');

            const resolvedContentPayload = hasValidPayload(foundTest.contentPayload) ? foundTest.contentPayload :
              (hasValidPayload(bankQ.contentPayload) ? bankQ.contentPayload : (foundTest.contentPayload || bankQ.contentPayload));

            const resolvedPdfPayload = hasValidPayload(foundTest.pdfPayload) ? foundTest.pdfPayload :
              (hasValidPayload(bankQ.pdfPayload) ? bankQ.pdfPayload : (foundTest.pdfPayload || bankQ.pdfPayload));

            const resolvedImageUrls = (Array.isArray(foundTest.imageUrls) && foundTest.imageUrls.length > 0 && hasValidPayload(foundTest.imageUrls[0])) ? foundTest.imageUrls :
              ((Array.isArray(bankQ.imageUrls) && bankQ.imageUrls.length > 0) ? bankQ.imageUrls : (hasValidPayload(bankQ.imageUrl) ? [bankQ.imageUrl] : (foundTest.imageUrls || bankQ.imageUrls)));

            const resolvedImageUrl = hasValidPayload(foundTest.imageUrl) ? foundTest.imageUrl :
              (hasValidPayload(bankQ.imageUrl) ? bankQ.imageUrl : (foundTest.imageUrl || bankQ.imageUrl));

            const merged = {
              ...bankQ,
              ...foundTest,
              questionType: isMergedOE ? 'acik_uclu' : (foundTest.questionType && foundTest.questionType !== 'test' ? foundTest.questionType : (bankQ.questionType || foundTest.type || bankQ.type)),
              type: isMergedOE ? 'acik_uclu' : (foundTest.type && foundTest.type !== 'test' ? foundTest.type : (bankQ.type || 'test')),
              contentType: foundTest.contentType || bankQ.contentType,
              formatType: foundTest.formatType || bankQ.formatType,
              sourceFormat: foundTest.sourceFormat || bankQ.sourceFormat,
              questionText: foundTest.questionText || bankQ.questionText || foundTest.text || bankQ.text,
              options: hasMeaningfulOptions(bankQ?.options) ? bankQ.options : (hasMeaningfulOptions(foundTest.options) ? foundTest.options : (bankQ?.options || foundTest.options || [])),
              questionsList: (foundTest.questionsList && foundTest.questionsList.length > 0) ? foundTest.questionsList : bankQ.questionsList,
              contentPayload: resolvedContentPayload,
              pdfPayload: resolvedPdfPayload,
              htmlPayload: foundTest.htmlPayload || bankQ.htmlPayload,
              pdfUrl: foundTest.pdfUrl || bankQ.pdfUrl,
              imageUrls: resolvedImageUrls,
              imageUrl: resolvedImageUrl,
              images: resolvedImageUrls,
              imagePayload: foundTest.imagePayload || bankQ.imagePayload || resolvedContentPayload,
              correctAnswer: foundTest.correctAnswer !== undefined ? foundTest.correctAnswer : bankQ.correctAnswer,
              answerKey: foundTest.answerKey || bankQ.answerKey,
              questionCount: foundTest.questionCount || bankQ.questionCount || (bankQ.questionsList?.length) || (foundTest.questionsList?.length) || (Array.isArray(bankQ.answerKey) ? bankQ.answerKey.length : 1),
              totalQuestions: foundTest.totalQuestions || bankQ.totalQuestions || (bankQ.questionsList?.length) || (foundTest.questionsList?.length) || (Array.isArray(bankQ.answerKey) ? bankQ.answerKey.length : 1),
              isOpenEnded: isMergedOE,
              is_open_ended: isMergedOE,
              bankQ: bankQ
            };
            setTest(merged);
            const resolved = resolveTestQuestions(merged, allBankQuestions);
            setQuestions(resolved);
          } else {
            setTest(foundTest);
            const resolved = resolveTestQuestions(foundTest, allBankQuestions);
            setQuestions(resolved);
          }
        }
      }
      setLoading(false);
    } else {
      // Only finish loading if all context fetches are completed
      if (!hwLoading && !booksLoading && !currLoading && !qbLoading) {
        setLoading(false);
      }
    }
  }, [testId, homeworks, curriculumData, allBankQuestions, bookTests, books, hwLoading, booksLoading, currLoading, qbLoading]);

  // Restore payload from IndexedDB if stored as placeholder
  useEffect(() => {
    let isMounted = true;
    async function restoreTestPayload() {
      if (!test) return;
      const isMissingPayload = (
        !test.contentPayload ||
        test.contentPayload === '[STORED_IN_INDEXEDDB]' ||
        test.contentPayload === '[LOCALSTORAGE_CACHE]' ||
        test.pdfPayload === '[STORED_IN_INDEXEDDB]' ||
        test.imageUrl === '[STORED_IN_INDEXEDDB]'
      );

      if (isMissingPayload) {
        const candidateIds = [
          test.id,
          test.testId,
          test.hwId,
          test.sourceTestId,
          test.sourceId,
          test.questionId,
          ...(test.questionIds || []),
          ...(test.selectedQuestions || []),
          ...(questions || []).map(q => q?.id),
          ...(questions || []).map(q => q?.questionId)
        ].filter(Boolean);

        for (const cid of candidateIds) {
          const strId = typeof cid === 'object' ? (cid.id || cid.questionId) : String(cid);
          if (!strId) continue;
          const variants = [
            strId,
            strId.replace(/^q_|^hw_/, ''),
            `q_${strId.replace(/^q_|^hw_/, '')}`,
            `hw_${strId.replace(/^q_|^hw_/, '')}`
          ];

          for (const v of variants) {
            try {
              const val = await idbGetPayload(v);
              if (val && typeof val === 'string' && val.length > 20 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
                setTest(prev => {
                  if (!prev) return prev;
                  const isPdfData = val.startsWith('data:application/pdf') || val.startsWith('%PDF-');
                  const isImgData = val.startsWith('data:image/') || val.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(val);
                  return {
                    ...prev,
                    contentPayload: val,
                    pdfPayload: isPdfData ? val : prev.pdfPayload,
                    imageUrl: isImgData ? val : prev.imageUrl,
                    imageUrls: isImgData ? (prev.imageUrls?.length > 1 ? prev.imageUrls : [val]) : prev.imageUrls
                  };
                });
                return;
              }
            } catch (e) {}
          }
        }
      }
    }

    restoreTestPayload();
    return () => { isMounted = false; };
  }, [test?.id, test?.contentPayload]);

  // If this is a physical exam or tracked book test, redirect to the appropriate specialized runner
  useEffect(() => {
    if (test && !isRetake) {
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
        return;
      }

      const isTrackedBook = Boolean(
        !String(test.id || '').startsWith('hw_') &&
        (
          test.sourceType === 'trackedBook' ||
          test.sourceType === 'bookTest' ||
          (test.bookId && !test.contentType && !test.contentPayload && !test.imageUrls && !test.imageUrl && !test.sections && !test.questionsList && (!test.questions || test.questions.length <= 1)) ||
          (test.id && (String(test.id).startsWith('bt_') || String(test.id).startsWith('tbt_')))
        )
      );
      if (isTrackedBook && test.id) {
        navigate(`/book-quiz/${test.id}?studentId=${studentId || ''}`, { replace: true });
      }
    }
  }, [test, bookForTest, testId, studentId, isRetake, navigate]);



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
      const isQExplicitOE = Boolean(
        isSectionOpenEnded(effectiveTest) ||
        isSectionOpenEnded(test) ||
        options.isOpenEnded ||
        qObj.type === 'acik_uclu' ||
        qObj.type === 'yazili' ||
        qObj.type === 'gorsel_klasik' ||
        qObj.questionType === 'acik_uclu' ||
        qObj.questionType === 'yazili' ||
        qObj.questionType === 'gorsel_klasik' ||
        test.questionType === 'acik_uclu' ||
        test.type === 'acik_uclu' ||
        test.type === 'gorsel_klasik' ||
        test.isOpenEnded ||
        ans.isOpenEnded ||
        ans.is_open_ended
      );

      const hasTextVal = Boolean(textVal && String(textVal).trim() !== '' && String(textVal).trim() !== 'empty');

      let isCorrect = ans.isCorrect;
      if (isQExplicitOE) {
        const correctKey = qObj.correctAnswer || (test.answerKey ? (test.answerKey[qNo] ?? test.answerKey[String(qNo)]) : null);
        if (correctKey !== null && correctKey !== undefined && String(correctKey).trim() !== '') {
          isCorrect = compareOpenEndedAnswers(textVal || userAns, correctKey);
        } else {
          isCorrect = null; // Açık uçlu sorular kayıtlı cevap anahtarı yoksa öğretmen puanlayana kadar pending kalır
        }
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
      else if (isCorrect === false && ((userAns !== null && userAns !== undefined && userAns !== '') || hasTextVal)) wrongCount++;
      else if (isQExplicitOE) {
        if (hasTextVal && isCorrect === null) {
          pendingCount++;
        } else {
          blankCount++;
        }
      } else blankCount++;

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

    const totalScored = correctCount + wrongCount + blankCount;
    const totalQ = totalScored + pendingCount;
    const score = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : 0;

    const hasExplicitOptionChoices = isMultipleChoice(effectiveTest) || isMultipleChoice(test) ||
      test.type === 'coktan_secmeli' || test.questionType === 'coktan_secmeli' ||
      effectiveTest.type === 'coktan_secmeli' || effectiveTest.questionType === 'coktan_secmeli' ||
      formattedAnswers.some(a => typeof a.userAnswer === 'number' || (typeof a.userAnswer === 'string' && /^[A-Ea-e0-4]$/.test(String(a.userAnswer).trim())));

    const isAcikUclu = !hasExplicitOptionChoices && (
      isSectionOpenEnded(effectiveTest) || isSectionOpenEnded(test) || Boolean(
        test.questionType === 'acik_uclu' ||
        test.type === 'acik_uclu' ||
        test.type === 'gorsel_klasik' ||
        test.isOpenEnded === true ||
        test.is_open_ended === true ||
        (test.title && (test.title.toLowerCase().includes('açık uçlu') || test.title.toLowerCase().includes('acik uclu') || test.title.toLowerCase().includes('klasik soru') || test.title.toLowerCase().includes('yazılı klasik'))) ||
        formattedAnswers.some(a => a.isOpenEnded)
      )
    );
    const finalStatus = isAcikUclu ? 'pending' : 'completed';
    const newSubId = `sub_${Date.now()}`;

    const derivedOpenEndedText = {
      ...(options.openEndedText || {}),
    };
    formattedAnswers.forEach(a => {
      const qNo = a.questionNoInSection || a.questionNo;
      if (qNo && a.userAnswerText) {
        derivedOpenEndedText[qNo] = a.userAnswerText;
        derivedOpenEndedText[String(qNo)] = a.userAnswerText;
      }
    });

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
      openEndedText: derivedOpenEndedText,
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
      try {
        localStorage.setItem(`sub_latest_${testId}`, JSON.stringify(submissionData));
        if (test.id) localStorage.setItem(`sub_latest_${test.id}`, JSON.stringify(submissionData));
        if (submissionData.id) localStorage.setItem(`sub_latest_${submissionData.id}`, JSON.stringify(submissionData));
      } catch (e) {}

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
    if (!formattedAnswers) return;

    const isAcikUclu = isSectionOpenEnded(effectiveTest) || isSectionOpenEnded(test) || Boolean(
      test.questionType === 'acik_uclu' ||
      test.type === 'acik_uclu' ||
      test.type === 'gorsel_klasik' ||
      test.isOpenEnded === true ||
      test.is_open_ended === true
    );

    let answersList = [];
    if (Array.isArray(formattedAnswers)) {
      answersList = formattedAnswers;
    } else if (typeof formattedAnswers === 'object') {
      const qList = questions && questions.length > 0 ? questions : (test.questions || []);
      if (qList.length > 0) {
        answersList = qList.map((q, idx) => {
          const qNo = q.questionNo || (idx + 1);
          const val = formattedAnswers[qNo] ?? formattedAnswers[String(qNo)] ?? formattedAnswers[idx];
          return {
            questionNo: qNo,
            userAnswer: val !== undefined && val !== null ? (typeof val === 'number' ? String.fromCharCode(65 + val) : String(val)) : null,
            userAnswerIndex: typeof val === 'number' ? val : null,
            userAnswerText: typeof val === 'string' && val.length > 1 ? val : null
          };
        });
      } else {
        answersList = Object.entries(formattedAnswers).map(([k, val], idx) => ({
          questionNo: Number(k) || (idx + 1),
          userAnswer: val !== undefined && val !== null ? (typeof val === 'number' ? String.fromCharCode(65 + val) : String(val)) : null,
          userAnswerIndex: typeof val === 'number' ? val : null,
          userAnswerText: typeof val === 'string' && val.length > 1 ? val : null
        }));
      }
    }

    const derivedOpenEndedText = {};
    const evaluatedAnswers = answersList.map((ans, idx) => {
      const qObj = questions[idx] || {};
      const userAns = ans.userAnswer;
      const textVal = ans.userAnswerText;
      const qNo = ans.questionNo || (idx + 1);

      if (textVal) {
        derivedOpenEndedText[qNo] = textVal;
        derivedOpenEndedText[String(qNo)] = textVal;
      }

      let isCorrect = ans.isCorrect;
      if (isAcikUclu) {
        isCorrect = null;
      } else if (userAns !== null && userAns !== undefined && userAns !== '') {
        isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
      } else {
        isCorrect = null;
      }

      return {
        ...ans,
        isCorrect,
        isOpenEnded: isAcikUclu,
        correctAnswer: ans.correctAnswerLetter || ans.correctAnswer || qObj.correctAnswerLetter || (qObj.correctAnswer !== null && qObj.correctAnswer !== undefined ? String.fromCharCode(65 + qObj.correctAnswer) : null)
      };
    });

    const totalQ = questions.length || test.questionCount || test.totalQuestions || formattedAnswers.length || 1;

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
      openEndedText: derivedOpenEndedText,
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

  const isWritten = isSectionOpenEnded(effectiveTest);


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
    (typeof test.contentPayload === 'string' && (
      test.contentPayload.includes('<!DOCTYPE') ||
      test.contentPayload.includes('<html') ||
      test.contentPayload.includes('<body') ||
      test.contentPayload.includes('<div') ||
      test.contentPayload.startsWith('data:text/html')
    )) ||
    (typeof test.payload === 'string' && (
      test.payload.includes('<!DOCTYPE') ||
      test.payload.includes('<html') ||
      test.payload.includes('<body') ||
      test.payload.includes('<div') ||
      test.payload.startsWith('data:text/html')
    ))
  );

  const isValidPdfPayload = Boolean(
    (test.pdfUrl && typeof test.pdfUrl === 'string') ||
    (typeof test.pdfPayload === 'string' && (test.pdfPayload.startsWith('data:application/pdf') || test.pdfPayload.startsWith('JVBERi0') || test.pdfPayload.startsWith('blob:') || test.pdfPayload.startsWith('http') || test.pdfPayload.endsWith('.pdf'))) ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:application/pdf') || test.contentPayload.startsWith('JVBERi0') || test.contentPayload.startsWith('%PDF') || (test.contentPayload.includes('.pdf') && !isValidHtmlPayload)))
  );

  const isHtml = isValidHtmlPayload || (!isDefinitelyStandardForHtml && Boolean(
    test.sourceFormat === 'html' || test.formatType === 'html' ||
    test.contentType === 'html' || test.type === 'html' || test.questionType === 'html' || hasExplicitHtmlQuestions ||
    ((test.title && String(test.title).toLowerCase().includes('html')) && !isValidPdfPayload) ||
    ((test.name && String(test.name).toLowerCase().includes('html')) && !isValidPdfPayload)
  ));

  const hasExplicitPdfQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'pdf' || q.questionType === 'pdf' || q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || Boolean(q.pdfPayload) || Boolean(q.pdfUrl)
  ));

  const isPdf = !isHtml && !isValidHtmlPayload && Boolean(
    isValidPdfPayload ||
    (test.pdfPayload && typeof test.pdfPayload === 'string') ||
    (test.pdfUrl && typeof test.pdfUrl === 'string') ||
    test.sourceFormat === 'pdf' ||
    test.formatType === 'pdf' ||
    test.contentType === 'pdf' ||
    test.type === 'pdf' ||
    test.questionType === 'pdf' ||
    hasExplicitPdfQuestions ||
    (test.title && String(test.title).toLowerCase().includes('pdf') && !test.options?.length) ||
    (test.name && String(test.name).toLowerCase().includes('pdf') && !test.options?.length)
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
    extractImageUrls(test).length > 0 ||
    (questions && questions.some(q => extractImageUrls(q).length > 0)) ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:image') || test.contentPayload.startsWith('http') || test.contentPayload.includes('.png') || test.contentPayload.includes('.jpg')))
  );

  const hasMultipleDistinctSections = Boolean(
    (test.sections && Array.isArray(test.sections) && test.sections.length > 1) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 1) ||
    (test.questionIds && Array.isArray(test.questionIds) && test.questionIds.length > 1)
  );

  const isMultiSection = !isPhysical && (hasMultipleDistinctSections || Boolean(
    test.isBulk ||
    test.isMulti ||
    test.isComposite
  ));

  const isRemedial = Boolean(
    test.isRemedial === true ||
    test.isRemedialTest === true ||
    test.sourceType === 'pdfSlicerRemedial' ||
    /özel\s*telafi|telafi\s*testi/i.test(test.title || '') ||
    /özel\s*telafi|telafi\s*testi/i.test(test.name || '')
  );

  const renderRunner = () => {
    // 0. Dedicated Remedial Quiz Runner for custom remedial tests
    if (isRemedial) {
      return (
        <RemedialQuizRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={handleGoBack}
        />
      );
    }

    // 1. Composite / Multi-Section Homework
    if (isMultiSection) {
      return (
        <CompositeHomeworkRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={handleGoBack}
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
          onExit={handleGoBack}
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
          onExit={handleGoBack}
        />
      );
    }

    // 4. Single Open-Ended / Written
    if (isSingleOE) {
      return (
        <SingleOpenEndedRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={handleGoBack}
        />
      );
    }

    // 5. Single Image
    if (isImageTest) {
      return (
        <ImageQuizRunner
          test={effectiveTest}
          questions={questions}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          draftAnswers={draftSubmission?.answers}
          onExit={handleGoBack}
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
          onExit={handleGoBack}
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
        onExit={handleGoBack}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', padding: isMobile ? '1rem 0.75rem' : '2rem 1.5rem', color: 'var(--color-text)' }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: isMobile ? '1.25rem' : '1.5rem',
          padding: isMobile ? '1.5rem 1.15rem' : '2.5rem 2rem',
          maxWidth: '640px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 35px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '1.15rem' : '1.35rem'
        }}>
          {/* ICON BADGE */}
          <div style={{
            width: isMobile ? '64px' : '80px',
            height: isMobile ? '64px' : '80px',
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.12)',
            border: '2px solid #6366f1',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.2)'
          }}>
            <Sparkles size={isMobile ? 32 : 40} />
          </div>

          {/* BADGES & TITLE */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
              <span style={{ padding: '0.25rem 0.65rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', borderRadius: '99px', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                <span>{isDark ? 'Açık' : 'Koyu'}</span>
              </button>
            </div>

            <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: 900, margin: '0 0 0.45rem 0', color: 'var(--color-text)', lineHeight: 1.25 }}>
              {testTitle}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: isMobile ? '0.82rem' : '0.88rem', lineHeight: 1.5, margin: 0 }}>
              Sınavınız hazırlandı. Başlamaya hazır olduğunuzda <b>"{hasExistingDraft ? 'Kaldığın Yerden Devam Et' : 'Sınava Başla'}"</b> butonuna tıklayınız.
            </p>
          </div>

          {/* STATS 4-CARD GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '0.65rem', width: '100%' }}>
            <div style={{ background: 'var(--color-surface-hover)', padding: '0.75rem 0.6rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ color: '#6366f1', display: 'flex', justifyContent: 'center', marginBottom: 3 }}><Layers size={16} /></div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>{displayQuestionCount} Soru</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 1 }}>Toplam Soru</div>
            </div>
            
            <div style={{ background: 'var(--color-surface-hover)', padding: '0.75rem 0.6rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: 3 }}><Clock3 size={16} /></div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: '#10b981' }}>{totalMinutes} Dk</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 1 }}>{timePerQ} dk / soru</div>
            </div>

            {dueDateStr && (
              <div style={{ background: 'var(--color-surface-hover)', padding: '0.75rem 0.6rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ color: '#d97706', display: 'flex', justifyContent: 'center', marginBottom: 3 }}><Calendar size={16} /></div>
                <div style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 900, color: '#d97706', lineHeight: 1.2, marginTop: 2 }}>{dueDateStr}</div>
                <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 1 }}>Son Teslim</div>
              </div>
            )}

            <div style={{ background: 'var(--color-surface-hover)', padding: '0.75rem 0.6rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ color: '#0284c7', display: 'flex', justifyContent: 'center', marginBottom: 3 }}><ShieldCheck size={16} /></div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.1rem', fontWeight: 900, color: '#0284c7', marginTop: 1 }}>Aktif</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 1 }}>Sınav Durumu</div>
            </div>
          </div>

          {/* RULES / TIPS BOX */}
          <div style={{ width: '100%', background: 'var(--color-surface-hover)', borderRadius: '0.9rem', border: '1.5px solid var(--color-border)', padding: '0.85rem 1rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              💡 Sınav Bilgilendirmesi
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li>İşaretlediğiniz cevaplar anlık olarak otomatik kaydedilir.</li>
              <li>Sorular arasında dilediğiniz gibi geçiş yapabilir, cevabınızı güncelleyebilirsiniz.</li>
              <li>Testi bitirdikten sonra sağ üstteki <b>"Sınavı Tamamla"</b> butonuna basarak teslim ediniz.</li>
            </ul>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '0.65rem', width: '100%', marginTop: '0.3rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setHasStarted(true)}
              style={{
                flex: 2,
                minWidth: isMobile ? '100%' : '180px',
                padding: '0.9rem 1.25rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.95rem' : '1rem',
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
                  flex: 1.2,
                  minWidth: isMobile ? '100%' : '150px',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '0.85rem',
                  background: 'var(--color-surface)',
                  color: '#4f46e5',
                  fontWeight: 900,
                  fontSize: '0.88rem',
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
                minWidth: isMobile ? '100%' : '100px',
                padding: '0.85rem 1rem',
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
      {/* Offline Status Badge */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          background: 'rgba(217, 119, 6, 0.95)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          padding: '0.45rem 1rem',
          borderRadius: '999px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.78rem',
          fontWeight: 800,
          pointerEvents: 'none'
        }}>
          <WifiOff size={15} />
          <span>Çevrimdışı Mod — Cevaplarınız cihazınızda güvenle saklanıyor</span>
        </div>
      )}

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
            padding: isMobile ? '0.75rem' : '1.25rem',
            overflowY: 'auto',
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: isMobile ? '1.25rem' : '1.5rem',
              width: '100%',
              maxWidth: '680px',
              color: 'var(--color-text)',
              padding: isMobile ? '1.5rem 1.15rem' : '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '1rem' : '1.25rem',
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

              {/* Offline submission callout */}
              {!isOnline && (
                <div style={{
                  background: 'rgba(217, 119, 6, 0.1)',
                  border: '1.5px solid rgba(217, 119, 6, 0.3)',
                  borderRadius: '1rem',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#d97706',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}>
                  <WifiOff size={18} style={{ flexShrink: 0 }} />
                  <span>Sınavınız cihazınıza başarıyla kaydedildi. İnternet bağlantınız sağlandığında sonuçlarınız öğretmen paneline otomatik olarak senkronize edilecektir.</span>
                </div>
              )}

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
                     navigate(`/quiz-review/${submittedResult.testId}?studentId=${studentId}&submissionId=${submittedResult.id}`, {
                       state: {
                         submission: submittedResult,
                         from: returnUrl || (submittedResult.bookId ? `/student/books/${submittedResult.bookId}` : '/student')
                       }
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
                   onClick={handleGoBack}
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
                   <CheckCircle2 size={18} /> {returnUrl ? (returnUrl.includes('/program') || returnUrl.includes('/my-program') ? '📅 Programa Dön' : (returnUrl.includes('/homeworks') ? '📝 Ödevlere Dön' : (returnUrl === '/student' ? '🏠 Panoya Dön' : 'Geri Dön'))) : '🏠 Öğrenci Paneline Dön'}
                 </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
