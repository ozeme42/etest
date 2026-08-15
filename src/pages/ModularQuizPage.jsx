import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { Clock3, Trophy, Eye, Home, CheckCircle2, BookOpen, ArrowLeft } from 'lucide-react';
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
  const [submissionResult, setSubmissionResult] = useState(null);
  const isSubmittingRef = useRef(false);

  // Grace period for initial context data load (4 seconds)
  const [initLoading, setInitLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitLoading(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const draftSubmission = useMemo(() => {
    if (!submissions || submissions.length === 0) return null;
    return submissions.find(
      s => (String(s.testId) === String(testId) || String(s.hwId) === String(testId) || toUUID(s.testId) === toUUID(testId)) && 
           String(s.studentId) === String(studentId) && 
           (s.status === 'in_progress' || s.status === 'draft')
    );
  }, [submissions, testId, studentId]);

  // Prevent taking the exam again if already submitted (protects against F5 refresh after submit)
  const completedSub = useMemo(() => {
    if (!submissions || submissions.length === 0) return null;
    return submissions.find(
      s => (String(s.testId) === String(testId) || String(s.hwId) === String(testId) || toUUID(s.testId) === toUUID(testId)) && 
           String(s.studentId) === String(studentId) && 
           s.status !== 'in_progress' && s.status !== 'draft'
    );
  }, [submissions, testId, studentId]);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Sınav Yükleniyor...
      </div>
    );
  }

  if (!test) {
    if (initLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
          Sınav Yükleniyor...
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', gap: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Sınav Bulunamadı</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>
          Bu teste ait kayıt bulunamadı veya henüz yükleniyor olabilir. Lütfen listenizi kontrol ediniz.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => navigate('/student')} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
            Öğrenci Paneline Dön
          </button>
          <button onClick={() => navigate('/student/books')} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: '#334155', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
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

    const submissionData = {
      id: draftSubmission ? draftSubmission.id : newSubId,
      testId: test.id,
      hwId: String(test.id) !== String(testId) ? testId : null,
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
            updateHomeworkSubmission(hId, submissionData.id, submissionData);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '1.5rem', color: 'white' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.5rem', padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)' }}>
              <Clock3 size={44} />
            </div>
            <div>
              <span style={{ padding: '0.35rem 0.75rem', background: '#f59e0b', color: '#0f172a', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✍️ Değerlendirmeye Gönderildi
              </span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.75rem 0 0.5rem 0', color: 'white' }}>
                Cevaplarınız Başarıyla Kaydedildi!
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
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
                  style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#334155', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <BookOpen size={18} /> Kitaba Dön
                </button>
              ) : (
                <button
                  onClick={() => navigate('/student')}
                  style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#334155', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '1.5rem', color: 'white' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.5rem', padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)' }}>
            <Trophy size={44} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: 'white' }}>
              Tebrikler! Test Tamamlandı
            </h1>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#34d399', margin: '0.5rem 0' }}>
              %{submissionResult.score} Başarı
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', width: '100%', background: '#0f172a', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #334155' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>{submissionResult.correctCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Doğru</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f87171' }}>{submissionResult.wrongCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Yanlış</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#94a3b8' }}>{submissionResult.blankCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Boş</div>
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
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#334155', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <BookOpen size={18} /> Kitaba Dön
              </button>
            ) : (
              <button
                onClick={() => navigate('/student')}
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#334155', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
    (test.sections && Array.isArray(test.sections) && test.sections.length > 1) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 1) ||
    (test.questionIds && Array.isArray(test.questionIds) && test.questionIds.length > 1) ||
    (test.selectedQuestions && Array.isArray(test.selectedQuestions) && test.selectedQuestions.length > 1) ||
    (test.items && Array.isArray(test.items) && test.items.length > 1) ||
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a' }}>
      <div style={{
        padding: '0.4rem 1rem',
        background: '#0f172a',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: '#94a3b8',
            padding: '0.4rem 0.8rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          className="hover:bg-slate-800 hover:text-white"
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
