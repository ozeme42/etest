import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { Clock3, Trophy, Eye, Home, CheckCircle2, BookOpen, ArrowLeft, Sparkles, Play, Layers, Calendar, ShieldCheck, Check, Zap } from 'lucide-react';
import { checkIsAnswerCorrect } from '../utils/answerEvaluation';
import { toUUID } from '../services/supabaseService';

import PdfQuizRunner from '../components/quiz/runner/PdfQuizRunner';
import HtmlQuizRunner from '../components/quiz/runner/HtmlQuizRunner';
import ImageQuizRunner from '../components/quiz/runner/ImageQuizRunner';
import StandardQuizRunner from '../components/quiz/runner/StandardQuizRunner';
import PhysicalQuizRunner from '../components/quiz/runner/PhysicalQuizRunner';
import BulkHomeworkRunner from '../components/quiz/runner/BulkHomeworkRunner';
import CompositeQuizRunner from '../components/quiz/runner/CompositeQuizRunner';
import MultiHomeworkRunner from '../components/quiz/runner/MultiHomeworkRunner';

import { resolveTestQuestions } from '../utils/testResolver';

export default function ModularQuizPage() {
  const { testId } = useParams();
  const { currentUser } = useAuth();
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
  const [submissionResult, setSubmissionResult] = useState(null);
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

  useEffect(() => {
    if (completedSub && !submissionResult) {
      navigate(`/quiz-review/${testId}?studentId=${studentId}`, { replace: true });
    }
  }, [completedSub, submissionResult, navigate, testId, studentId]);

  if (completedSub && !submissionResult) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Daha önceden çözülmüş sınav. Sonuç ekranına yönlendiriliyorsunuz...
      </div>
    );
  }

  useEffect(() => {
    const cleanTestId = String(testId || '').trim();
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
            const resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : [];
            const title = bankQ?.title || bankQ?.name || (typeof item === 'object' ? (item.title || item.name) : null) || `${idx + 1}. Bölüm`;
            const qCount = bankQ?.questionCount || bankQ?.questionsList?.length || resolvedQuestions.length || 1;

            return {
              id: itemId || `sec_${idx}`,
              questionId: itemId,
              title,
              bankQ: bankQ || { id: itemId, title },
              questionCount: qCount,
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
          setTest(foundTest);
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
  }, [testId, homeworks, curriculumData, allBankQuestions, bookTests, books, submissions, studentId, hwLoading, booksLoading, currLoading, qbLoading]);

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

  if (loading || isSyncing || isDataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a', fontWeight: 800 }}>
        Sınav Yükleniyor...
      </div>
    );
  }

  if (!test) {
    if (initLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a', fontWeight: 800 }}>
          Sınav Yükleniyor...
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a', gap: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Sınav Bulunamadı</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>
          Bu teste ait kayıt bulunamadı veya henüz yükleniyor olabilir. Lütfen listenizi kontrol ediniz.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => navigate('/student')} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
            Öğrenci Paneline Dön
          </button>
          <button onClick={() => navigate('/student/books')} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: '#ffffff', color: '#475569', border: '1.5px solid #cbd5e1', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
            Kitaplarıma Dön
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (formattedAnswers) => {
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
      const qNo = ans.questionNo || (idx + 1);

      let isCorrect = null;
      // Her zaman kullanıcı cevabını checkIsAnswerCorrect ile değerlendir
      if (userAns !== null && userAns !== undefined && userAns !== '') {
        isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
      } else if (textVal) {
        isCorrect = null; // Open ended pending
      } else {
        isCorrect = false; // Blank
      }

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false && (userAns !== null && userAns !== undefined && userAns !== '')) wrongCount++;
      else if (isCorrect === null && textVal) pendingCount++;
      else blankCount++;

      // Do\u011fru cevab\u0131 \u00f6nce runner'dan gelen ans.correctAnswer'dan al,
      // sonra test.answerKey'den, sonra bireysel qObj'den al
      const answerKeyArr = test.answerKey || questions[0]?.answerKey || null;
      const answerKeyLetter = (answerKeyArr && Array.isArray(answerKeyArr)) ? answerKeyArr[qNo - 1] : null;
      const finalCorrectAnswer = (ans.correctAnswer !== undefined && ans.correctAnswer !== null && ans.correctAnswer !== '')
        ? ans.correctAnswer
        : answerKeyLetter
        ?? (qObj.correctAnswerLetter || (qObj.correctAnswer !== null && qObj.correctAnswer !== undefined && !Array.isArray(questions) || questions.length > 1 ? String.fromCharCode(65 + qObj.correctAnswer) : null));

      return {
        ...ans,
        isCorrect,
        correctAnswer: finalCorrectAnswer
      };
    });

    const totalQ = correctCount + wrongCount + blankCount + pendingCount;
    const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const isAcikUclu = test.questionType === 'acik_uclu' || test.type === 'acik_uclu' || pendingCount > 0;
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

      setSubmissionResult({
        submissionId: newSubId,
        isPending: isAcikUclu,
        correctCount,
        wrongCount,
        blankCount,
        pendingCount,
        totalQuestions: totalQ,
        score
      });
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
      if (isCorrect === undefined) {
        if (userAns !== null && userAns !== undefined && userAns !== '') {
          isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
        } else if (textVal) {
          isCorrect = null;
        } else {
          isCorrect = false;
        }
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

  if (submissionResult) {
    if (submissionResult.isPending) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: '1.5rem', color: '#0f172a' }}>
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.5rem', padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 4px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fffbeb', border: '2px solid #fde68a', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock3 size={44} />
            </div>
            <div>
              <span style={{ padding: '0.35rem 0.75rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✍️ Değerlendirmeye Gönderildi
              </span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.75rem 0 0.5rem 0', color: '#0f172a' }}>
                Cevaplarınız Başarıyla Kaydedildi!
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Bu sınavda açık uçlu / yazılı sorular yer almaktadır. Yanıtlarınız öğretmeninizin değerlendirmesine gönderilmiştir. Puanınız öğretmen değerlendirmesinden sonra açıklanacaktır.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '1rem' }}>
              <button
                onClick={() => navigate(`/quiz-review/${test.id}?studentId=${studentId}`, { state: { from: test.bookId ? `/student/books/${test.bookId}` : '/student' } })}
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
              >
                <Eye size={18} /> Cevapları İncele
              </button>
              {test?.bookId ? (
                <button
                  onClick={() => navigate(`/student/books/${test.bookId}`)}
                  style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#ffffff', color: '#475569', border: '1.5px solid #cbd5e1', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <BookOpen size={18} /> Kitaba Dön
                </button>
              ) : (
                <button
                  onClick={() => navigate('/student')}
                  style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#ffffff', color: '#475569', border: '1.5px solid #cbd5e1', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Home size={18} /> Ana Sayfaya Dön
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', padding: '1.5rem', color: 'var(--color-text)' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.5rem', padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 4px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={44} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>
              Tebrikler! Test Tamamlandı
            </h1>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#15803d', margin: '0.5rem 0' }}>
              %{submissionResult.score} Başarı
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', width: '100%', background: 'var(--color-surface-hover)', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d' }}>{submissionResult.correctCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>Doğru</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c' }}>{submissionResult.wrongCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700 }}>Yanlış</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text)' }}>{submissionResult.blankCount}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Boş</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '1rem' }}>
            <button
              onClick={() => navigate(`/quiz-review/${test.id}?studentId=${studentId}`, { state: { from: test.bookId ? `/student/books/${test.bookId}` : '/student' } })}
              style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
            >
              <Eye size={18} /> Detaylı İncele
            </button>
            {test?.bookId ? (
              <button
                onClick={() => navigate(`/student/books/${test.bookId}`)}
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <BookOpen size={18} /> Kitaba Dön
              </button>
            ) : (
              <button
                onClick={() => navigate('/student')}
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Home size={18} /> Ana Sayfaya Dön
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
  
  const isValidHtmlPayload = test.htmlPayload && typeof test.htmlPayload === 'string' && !test.htmlPayload.startsWith('data:image');
  
  const isHtml = !isDefinitelyStandardForHtml && Boolean(
    isValidHtmlPayload || test.sourceFormat === 'html' || test.formatType === 'html' ||
    test.contentType === 'html' || test.type === 'html' || test.questionType === 'html' || hasExplicitHtmlQuestions
  );

  const hasExplicitPdfQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'pdf' || q.questionType === 'pdf' || q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || Boolean(q.pdfPayload) || Boolean(q.pdfUrl)
  ));
  const isPdf = Boolean(
    test.pdfPayload || test.pdfUrl || test.sourceFormat === 'pdf' || test.formatType === 'pdf' ||
    test.contentType === 'pdf' || test.type === 'pdf' || test.questionType === 'pdf' || hasExplicitPdfQuestions ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:application/pdf') || test.contentPayload.includes('.pdf')))
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

  const isMultiSection = Boolean(
    String(testId || '').trim().startsWith('hw_') ||
    (test.sections && Array.isArray(test.sections) && test.sections.length > 0) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 0) ||
    (test.items && Array.isArray(test.items) && test.items.length > 0) ||
    test.isBulk ||
    test.isMulti
  );

  const bookPdfUrl = test?.pdfUrl || bookForTest?.pdfUrl || '';

  const renderRunner = () => {
    if (isMultiSection) {
      return <MultiHomeworkRunner test={effectiveTest} questions={questions} onSubmit={handleSubmit} onAutoSave={handleAutoSave} submissionAnswers={draftSubmission?.answers} draftAnswers={draftSubmission?.answers} bookPdfUrl={bookPdfUrl} />;
    }

    if (isHtml) {
      return <HtmlQuizRunner test={effectiveTest} questions={questions} onSubmit={handleSubmit} onAutoSave={handleAutoSave} submissionAnswers={draftSubmission?.answers} draftAnswers={draftSubmission?.answers} />;
    }

    if (isPdf) {
      return <PdfQuizRunner test={effectiveTest} questions={questions} onSubmit={handleSubmit} onAutoSave={handleAutoSave} submissionAnswers={draftSubmission?.answers} draftAnswers={draftSubmission?.answers} />;
    }

    if (isImageTest) {
      return <ImageQuizRunner test={effectiveTest} questions={questions} onSubmit={handleSubmit} onAutoSave={handleAutoSave} submissionAnswers={draftSubmission?.answers} draftAnswers={draftSubmission?.answers} />;
    }

    if (isPhysical) {
      return <PhysicalQuizRunner test={effectiveTest} questions={questions} onSubmit={handleSubmit} onAutoSave={handleAutoSave} submissionAnswers={draftSubmission?.answers} draftAnswers={draftSubmission?.answers} bookPdfUrl={bookPdfUrl} />;
    }

    return <StandardQuizRunner test={effectiveTest} questions={questions} onSubmit={handleSubmit} onAutoSave={handleAutoSave} submissionAnswers={draftSubmission?.answers} draftAnswers={draftSubmission?.answers} />;
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
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
              <span style={{ padding: '0.25rem 0.65rem', background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '99px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {testSubject}
              </span>
              <span style={{ padding: '0.25rem 0.65rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '99px', fontWeight: 800, fontSize: '0.72rem' }}>
                {formatLabel}
              </span>
              {activeHomework && (
                <span style={{ padding: '0.25rem 0.65rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: '99px', fontWeight: 800, fontSize: '0.72rem' }}>
                  Ödev Görevi
                </span>
              )}
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
                minWidth: '200px',
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
              <Play size={18} fill="white" /> {hasExistingDraft ? 'Kaldığın Yerden Devam Et' : 'Sınava Başla'}
            </button>
            <button
              onClick={() => navigate(-1)}
              style={{
                flex: 1,
                minWidth: '110px',
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{
        padding: '0.4rem 1rem',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#475569',
            padding: '0.4rem 0.8rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: '700',
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} />
          Çıkış Yap
        </button>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderRunner()}
      </div>
    </div>
  );
}
