import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Clock, ChevronRight, ChevronLeft, Maximize, Minimize, Layout, LayoutPanelTop, PanelRightClose, PanelRightOpen, GripVertical, GripHorizontal, CheckCircle, XCircle, Clock3, FileText, X } from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import DrawingOverlay from '../components/DrawingOverlay';
import { getEmbeddablePdfUrl as getEmbeddableUrl } from '../utils/pdfUtils';
import { idbGetPayload, idbSetPayload } from '../services/indexedDbService';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';
import './QuizRunner.css';

export default function QuizRunner({ reviewSubmission = null, isReviewMode = false, submissionId: propsSubId = null }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useCurriculum();
  const { updateQuestion, questions: allQuestions } = useQuestionBank();

  const { homeworks, submitHomework } = useHomework();
  const { submissions = [], addSubmission, updateSubmission, isSyncing } = useEvaluation();
  const { users } = useUser();
  
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get('studentId') || 'u1';
  const student = users.find(u => u.id === studentId) || { name: 'Öğrenci' };
  const isRetake = Boolean(location.state?.isRetake || queryParams.get('retake') === 'true');

  const targetSubmission = reviewSubmission || (submissions || []).find(s => String(s.id) === String(propsSubId || params.submissionId || params.id));
  const isReadOnlyMode = isReviewMode || Boolean(targetSubmission);
  const id = targetSubmission?.testId || targetSubmission?.questionId || params.testId || params.id || '';

  const handleDirectPdfUploadInRunner = (file, questionId) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Pdf = e.target.result;
      if (questionId) {
        await idbSetPayload(questionId, base64Pdf);
        updateQuestion(questionId, { contentPayload: base64Pdf });
      }
      if (id) {
        await idbSetPayload(id, base64Pdf);
      }
      setTestQuestions(prev => prev.map(q => (q.id === questionId || q.id === id) ? { ...q, contentPayload: base64Pdf } : q));
    };
    reader.readAsDataURL(file);
  };

  const savedState = !isRetake ? JSON.parse(localStorage.getItem(`quiz_state_${id}`) || 'null') : null;

  // Core Quiz States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(savedState?.currentQuestionIdx || 0);
  const [subQuestionIdx, setSubQuestionIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState(() => {
    let m = null;
    if (targetSubmission && Array.isArray(targetSubmission.answers)) {
      m = {};
      targetSubmission.answers.forEach(ans => {
        const k = ans.sectionId || ans.questionId || id;
        if (ans.subIndex !== undefined) {
          if (!m[k] || typeof m[k] !== 'object') m[k] = {};
          m[k][ans.subIndex] = ans.userAnswer ?? ans.userAnswerText;
        } else {
          m[k] = ans.userAnswer ?? ans.userAnswerText;
        }
      });
    }
    
    if (savedState?.studentAnswers) {
      if (!m) m = {};
      Object.keys(savedState.studentAnswers).forEach(k => {
        if (typeof savedState.studentAnswers[k] === 'object' && savedState.studentAnswers[k] !== null) {
          if (!m[k] || typeof m[k] !== 'object') m[k] = {};
          Object.keys(savedState.studentAnswers[k]).forEach(subK => {
            m[k][subK] = savedState.studentAnswers[k][subK];
          });
        } else {
          m[k] = savedState.studentAnswers[k];
        }
      });
    }
    
    return m || {};
  });
  const [openEvalGrades, setOpenEvalGrades] = useState({});

  useEffect(() => {
    setSubQuestionIdx(0);
  }, [currentQuestionIdx]);
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft ?? null);
  const [isFinished, setIsFinished] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [finalStats, setFinalStats] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const isSubmittingRef = useRef(false);

  // Advanced Layout States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState('horizontal');
  const [showOptic, setShowOptic] = useState(true);
  const [splitRatio, setSplitRatio] = useState(65);
  const [isDragging, setIsDragging] = useState(false);

  // Dedicated Mobile Solver States
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState('doc'); // 'doc', 'optic', 'scratch', 'split'
  const [showMobileOpticDrawer, setShowMobileOpticDrawer] = useState(false);
  const [mobileSplitRatio, setMobileSplitRatio] = useState(50); // top section % height in mobile split view

  // Grace period for initial context data load
  const [initLoading, setInitLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Check if test is already completed by this student (ignored if isRetake is true)
  const existingSubmission = useMemo(() => {
    if (isRetake) return null;
    if (!id || !studentId) return null;
    return (submissions || []).find(s => (s.testId === id || s.id === id) && s.studentId === studentId);
  }, [submissions, id, studentId, isRetake]);

  // If already finished or existing submission found and not explicitly retaking, lock test solver and redirect to review
  useEffect(() => {
    if (existingSubmission && !showResultsModal && !isFinished && !isRetake) {
      navigate(`/review/${existingSubmission.id}`, { replace: true });
    }
  }, [existingSubmission, showResultsModal, isFinished, navigate, isRetake]);

  // Prevent browser back button from re-opening test solver once test is finished
  useEffect(() => {
    if (isFinished || showResultsModal) {
      localStorage.removeItem(`quiz_state_${id}`);
      window.history.pushState(null, '', window.location.href);
      const handlePopState = (e) => {
        e.preventDefault();
        navigate('/student', { replace: true });
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isFinished, showResultsModal, id, navigate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isHomework = id.startsWith('hw_');
  const resolvedTest = isHomework 
    ? homeworks.find(hw => hw.id === id) 
    : (data?.tests?.find(t => t.id === id) || allQuestions.find(q => q.id === id));
  
  const test = resolvedTest || (isReadOnlyMode && targetSubmission ? {
    id: targetSubmission.testId || targetSubmission.questionId || id,
    title: targetSubmission.testTitle || targetSubmission.title || 'Sınav',
    type: targetSubmission.answers?.some(a => a.type === 'acik_uclu') ? 'acik_uclu' : 'coktan_secmeli',
    questionsList: targetSubmission.answers || [],
    questionCount: targetSubmission.answers?.length || 0,
    isBundle: true,
    _syntheticFromSubmission: true,
  } : null);

  const testQuestionList = useMemo(() => {
    return test?.questionIds || test?.questions || test?.tests || (test?.testId ? [test.testId] : []);
  }, [test]);

  const testQuestionIds = useMemo(() => {
    return testQuestionList.map(q => typeof q === 'string' ? q : (q?.id || q));
  }, [testQuestionList]);

  const rawTestQuestions = useMemo(() => {
    if (!test) return [];

    // SYNTHETIC: test built from submission
    if (test._syntheticFromSubmission && targetSubmission?.answers) {
      const answers = targetSubmission.answers;
      const seenIds = [];
      answers.forEach(a => { const q = a.questionId || a.sectionId; if (q && !seenIds.includes(q)) seenIds.push(q); });
      const sections = seenIds.map(qId => {
        const found = allQuestions.find(q => q.id === qId);
        const subs = answers.filter(a => (a.questionId || a.sectionId) === qId);
        if (found) return { ...found, isBundle: true, questionCount: subs.length || found.questionCount || 1 };
        const isOE = subs.some(a => a.type === 'acik_uclu');
        return { 
          id: qId, title: 'Bölüm', type: isOE ? 'acik_uclu' : 'coktan_secmeli', isBundle: true, 
          questionCount: subs.length || 1, 
          questionsList: subs.map((a,i) => ({ id: `${qId}_${i}`, questionText: a.questionText || `Soru ${i+1}`, type: a.type || 'acik_uclu' })), 
          _fromSubmissionAnswers: true 
        };
      });
      return sections.length > 0 ? sections : [{ ...test, isBundle: true, questionCount: answers.length || 1 }];
    }

    // 1. Multi-item test/homework from Question Bank (testQuestionList.length > 1)
    if (testQuestionList.length > 1) {
      if (typeof testQuestionList[0] === 'object' && testQuestionList[0] !== null) {
        return testQuestionList;
      }
      const foundInBank = testQuestionIds.map(qId => allQuestions.find(q => String(q.id) === String(qId)) || { id: qId, title: 'Soru', type: 'coktan_secmeli' });
      if (foundInBank.length > 0) {
        return foundInBank;
      }
    }

    // 2. Multi-item questionsList array on test itself (e.g. homework created from Soru Bankası selection)
    if (test.questionsList && Array.isArray(test.questionsList) && test.questionsList.length > 1 && !test.contentType?.includes('pdf') && !test.contentType?.includes('html')) {
      return test.questionsList.map((q, idx) => {
        if (typeof q === 'object' && q !== null) return { ...q, title: q.title || q.questionText || `${idx + 1}. Bölüm` };
        const found = allQuestions.find(bq => String(bq.id) === String(q));
        return found || { id: q, title: `${idx + 1}. Bölüm`, type: 'coktan_secmeli' };
      });
    }

    // 3. Bundle tests (single PDF, HTML, Gorsel package with right-hand optic form)
    if (test.isBundle || test.contentType === 'pdf' || test.contentType === 'gorsel' || test.contentType === 'html' || test.contentType === 'json') {
      const qCount = test.questionCount || test.questionsList?.length || test.imageUrls?.length || 1;
      return [{
        ...test,
        isBundle: true,
        questionCount: qCount
      }];
    }

    if (testQuestionList.length === 1) {
      const singleItem = testQuestionList[0];
      if (typeof singleItem === 'object' && singleItem !== null) return [singleItem];
      const foundInBank = allQuestions.find(q => String(q.id) === String(singleItem));
      if (foundInBank) return [foundInBank];
    }

    const directQuestion = allQuestions.find(q => String(q.id) === String(test.id) || testQuestionIds.includes(String(q.id)));
    if (directQuestion) {
      if (directQuestion.isBundle || directQuestion.contentType === 'gorsel' || directQuestion.contentType === 'pdf' || directQuestion.contentType === 'html' || directQuestion.contentType === 'json') {
        const qCount = directQuestion.questionCount || directQuestion.questionsList?.length || directQuestion.imageUrls?.length || 1;
        return [{
          ...directQuestion,
          isBundle: true,
          questionCount: qCount
        }];
      }
      return [directQuestion];
    }
    return [test];
  }, [test, testQuestionList, testQuestionIds, allQuestions]);

  const [testQuestions, setTestQuestions] = useState(rawTestQuestions);

  const loadedTestIdRef = useRef(null);
  useEffect(() => {
    let isSubscribed = true;
    async function loadFullPayloads() {
      if (rawTestQuestions.length === 0) return;
      
      const currentKey = `${id}-${test?.id}-${rawTestQuestions.map(q => q.id).join(',')}`;
      if (loadedTestIdRef.current === currentKey) return;

      const enriched = await Promise.all(rawTestQuestions.map(async (q) => {
        let payload = q.contentPayload || q.htmlPayload || q.pdfPayload || q.url || q.content;
        if (!payload || payload === '[STORED_IN_INDEXEDDB]' || (typeof payload === 'string' && (payload.includes('[STORED_IN_INDEXEDDB]') || payload.includes('[LOCALSTORAGE_CACHE]')))) {
          const fullPayload = (await idbGetPayload(q.id)) ||
                              (await idbGetPayload(q.id?.replace(/^q_/, ''))) ||
                              (await idbGetPayload(id)) ||
                              (await idbGetPayload(id?.replace(/^hw_/, ''))) ||
                              (await idbGetPayload(id?.replace(/^hw_/, 'q_'))) ||
                              (await idbGetPayload(test?.id)) ||
                              (await idbGetPayload(testQuestionIds[0]));
          if (fullPayload && fullPayload !== '[STORED_IN_INDEXEDDB]') {
            payload = fullPayload;
          }
        }
        return { ...q, contentPayload: payload || q.contentPayload };
      }));

      if (isSubscribed) {
        loadedTestIdRef.current = currentKey;
        setTestQuestions(enriched);
      }
    }
    loadFullPayloads();
    return () => { isSubscribed = false; };
  }, [rawTestQuestions, id, test?.id]);

  useEffect(() => {
    if (test?.sourceType === 'trackedBook') {
      navigate(`/book-quiz/${id}?studentId=${new URLSearchParams(location.search).get('studentId')}`, { replace: true });
    }
  }, [test, id, navigate, location.search]);

  const totalQuestionsCount = useMemo(() => {
    if (!testQuestions || testQuestions.length === 0) return 1;
    let count = 0;
    testQuestions.forEach(q => {
      const subListCount = q.questionsList?.length || q.imageUrls?.length;
      if (subListCount > 0) {
        count += subListCount;
      } else if (q.questionCount && q.questionCount > 0) {
        count += q.questionCount;
      } else {
        count += 1;
      }
    });
    return count > 0 ? count : 1;
  }, [testQuestions]);

  useEffect(() => {
    if (test && test.sourceType !== 'trackedBook') {
      const expectedMinutes = totalQuestionsCount * 2;
      const expectedTime = expectedMinutes * 60;

      // Always sync duration to actual questions count (2 mins / q) if time is null or saved state had different question count
      if (timeLeft === null || !savedState || savedState?.totalQuestionsCount !== totalQuestionsCount || savedState?.timeLeft > expectedTime + 60) {
        setTimeLeft(expectedTime);
      }
    }
  }, [test, totalQuestionsCount, savedState]);

  // AUTOSAVE LOGIC
  useEffect(() => {
    if (isFinished) {
      localStorage.removeItem(`quiz_state_${id}`);
      return;
    }
    const stateToSave = {
      currentQuestionIdx,
      studentAnswers,
      timeLeft,
      totalQuestionsCount
    };
    localStorage.setItem(`quiz_state_${id}`, JSON.stringify(stateToSave));
  }, [id, currentQuestionIdx, studentAnswers, timeLeft, totalQuestionsCount, isFinished]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAutoSave();
    }, 500);
    return () => clearTimeout(timer);
  }, [studentAnswers, isFinished, isReadOnlyMode, triggerAutoSave]);

  useEffect(() => {
    if (timeLeft === null || isFinished) return;
    
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && test) {
      handleFinishTest(true);
    }
  }, [timeLeft, isFinished, test]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

      if (isMobile) {
        const mainEl = document.querySelector('.mobile-main-content');
        if (mainEl) {
          const rect = mainEl.getBoundingClientRect();
          const relY = clientY - rect.top;
          const ratio = (relY / rect.height) * 100;
          if (ratio >= 15 && ratio <= 85) {
            setMobileSplitRatio(ratio);
          }
        }
      } else {
        if (layoutMode === 'horizontal') {
          const ratio = (clientX / window.innerWidth) * 100;
          if (ratio > 15 && ratio < 85) setSplitRatio(ratio);
        } else {
          const ratio = (clientY / window.innerHeight) * 100;
          if (ratio > 15 && ratio < 85) setSplitRatio(ratio);
        }
      }
    };

    const handleEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, layoutMode, isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!test) {
    if (initLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
          Sınav Yükleniyor...
        </div>
      );
    }
    return <div className="container" style={{ padding: '4rem', textAlign: 'center', color: '#f8fafc', background: '#0f172a', height: '100vh' }}>Sınav bulunamadı.</div>;
  }

  if (isSyncing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Sınav Yükleniyor...
      </div>
    );
  }

  if (testQuestions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', gap: '1rem' }}>
        <h2>Bu testin içerisinde soru bulunmuyor.</h2>
        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '1rem', marginTop: '1rem', borderRadius: '8px' }}>
          <p><strong>Test ID:</strong> {id}</p>
          <p><strong>isHomework:</strong> {isHomework ? 'Yes' : 'No'}</p>
          {test && <div style={{ fontSize: '10px', overflowX: 'auto', background: '#fff', padding: '8px', border: '1px solid #ddd' }}><strong>Test Object Dump:</strong> <pre>{JSON.stringify(test, null, 2)}</pre></div>}
          <p><strong>All Questions Count:</strong> {allQuestions?.length}</p>
          <p><strong>All Questions Sample (first 5 IDs):</strong> {JSON.stringify(allQuestions?.slice(0, 5).map(q => q.id))}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = testQuestions[currentQuestionIdx] || testQuestions[0];
  if (!currentQuestion) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Soru yüklenirken bir sorun oluştu.</div>;
  }

  const handleNext = () => {
    if (currentQuestionIdx < testQuestions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };
  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  const handleOptionSelect = (idx) => {
    const q = currentQuestion;
    if (!q) return;
    setStudentAnswers(prev => {
      const isAlreadySelected = prev[q.id] === idx;
      const updated = { ...prev };
      if (isAlreadySelected) {
        delete updated[q.id];
      } else {
        updated[q.id] = idx;
      }
      if (q.parentTestId) {
        const parentAns = { ...(prev[q.parentTestId] || {}) };
        if (isAlreadySelected) {
          delete parentAns[q.subIndex];
        } else {
          parentAns[q.subIndex] = idx;
        }
        updated[q.parentTestId] = parentAns;
      }
      return updated;
    });
  };

  const handleOpenAnswerChange = (val) => {
    const q = currentQuestion;
    if (!q) return;
    setStudentAnswers(prev => {
      const updated = { ...prev, [q.id]: val };
      if (q.parentTestId) {
        const parentAns = prev[q.parentTestId] || {};
        updated[q.parentTestId] = {
          ...parentAns,
          [q.subIndex]: val
        };
      }
      return updated;
    });
  };

  const handleBundleOptionSelect = (subIndex, optIdx) => {
    if (!currentQuestion?.id) return;
    setStudentAnswers(prev => {
      const currentBundleAnswers = { ...(prev[currentQuestion.id] || {}) };
      if (currentBundleAnswers[subIndex] === optIdx) {
        delete currentBundleAnswers[subIndex];
      } else {
        currentBundleAnswers[subIndex] = optIdx;
      }
      return {
        ...prev,
        [currentQuestion.id]: currentBundleAnswers
      };
    });
  };

  const handleBundleTextChange = (subIndex, textVal) => {
    if (!currentQuestion?.id) return;
    setStudentAnswers(prev => {
      const currentBundleAnswers = { ...(prev[currentQuestion.id] || {}) };
      currentBundleAnswers[subIndex] = textVal;
      return {
        ...prev,
        [currentQuestion.id]: currentBundleAnswers
      };
    });
  };

  async function handleFinishTest(autoSubmit = false) {
    if (isSubmittingRef.current) return;
    if (!autoSubmit && !showFinishModal) {
      setShowFinishModal(true);
      return;
    }
    
    isSubmittingRef.current = true;
    
    setIsFinished(true);
    setShowFinishModal(false);
    
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;
    
    const collected = [];
    const wrongList = [];

    testQuestions.forEach((q, idx) => {
      const ans = studentAnswers[q.id] !== undefined 
        ? studentAnswers[q.id] 
        : (q.parentTestId && studentAnswers[q.parentTestId] ? studentAnswers[q.parentTestId][q.subIndex] : undefined);
      
      const targetQId = q.parentTestId || q.id;
      const isBundleItem = !!q.parentTestId || q.isBundle;
      const subIdx = q.subIndex !== undefined ? q.subIndex : idx;

      if (q.isBundle && !q.isSubOfBundle) {
        const bundleAns = ans || {};
        const isAcikUclu = q.type === 'acik_uclu' || test?.type === 'acik_uclu' || (q.questionsList && q.questionsList[0] && q.questionsList[0].type === 'acik_uclu');
        
        for (let i = 0; i < q.questionCount; i++) {
          const userVal = bundleAns[i];

          if (isAcikUclu) {
            const userText = typeof userVal === 'string' ? userVal.trim() : '';
            if (userText.length > 0) {
              pendingCount++;
              collected.push({
                questionId: q.id,
                isBundle: true,
                subIndex: i,
                type: 'acik_uclu',
                userAnswerText: userText,
                isCorrect: null, // Pending evaluation
                earnedPoints: 0
              });
            } else {
              blankCount++;
              collected.push({
                questionId: q.id,
                isBundle: true,
                subIndex: i,
                type: 'acik_uclu',
                userAnswerText: null,
                isCorrect: false,
                earnedPoints: 0
              });
            }
          } else {
            const answerKey = q.answerKey || [];
            const userAnsIdx = typeof userVal === 'number' ? userVal : undefined;
            const correctAnsLetter = answerKey[i];
            const correctIdx = correctAnsLetter ? correctAnsLetter.charCodeAt(0) - 65 : null;
            
            if (userAnsIdx !== undefined && correctAnsLetter) {
              const userLetter = String.fromCharCode(65 + userAnsIdx);
              const isCorrect = userLetter === correctAnsLetter;
              if (isCorrect) {
                totalScore += 10;
                correctCount++;
              } else {
                wrongCount++;
                wrongList.push({ qId: q.id, subIndex: i, isBundle: true });
              }
              
              collected.push({
                questionId: q.id,
                isBundle: true,
                subIndex: i,
                userAnswer: userAnsIdx,
                correctAnswer: correctIdx,
                isCorrect: isCorrect,
                earnedPoints: isCorrect ? 10 : 0
              });
            } else {
              blankCount++;
              wrongList.push({ qId: q.id, subIndex: i, isBundle: true });
              collected.push({
                questionId: q.id,
                isBundle: true,
                subIndex: i,
                userAnswer: null,
                correctAnswer: correctIdx,
                isCorrect: false,
                earnedPoints: 0
              });
            }
          }
        }
      } else if (q.type === 'coktan_secmeli') {
        if (ans !== undefined && ans !== null) {
          const isCorrect = ans === q.correctAnswer;
          if (isCorrect) {
            totalScore += 10;
            correctCount++;
          } else {
            wrongCount++;
            wrongList.push({ qId: targetQId, subIndex: subIdx, isBundle: isBundleItem });
          }
          collected.push({
            questionId: targetQId,
            isBundle: isBundleItem,
            subIndex: subIdx,
            type: 'coktan_secmeli',
            userAnswer: ans,
            correctAnswer: q.correctAnswer,
            isCorrect: isCorrect,
            earnedPoints: isCorrect ? 10 : 0
          });
        } else {
          blankCount++;
          wrongList.push({ qId: targetQId, subIndex: subIdx, isBundle: isBundleItem });
          collected.push({
            questionId: targetQId,
            isBundle: isBundleItem,
            subIndex: subIdx,
            type: 'coktan_secmeli',
            userAnswer: null,
            correctAnswer: q.correctAnswer,
            isCorrect: false,
            earnedPoints: 0
          });
        }
      } else {
        // Open-ended
        const userText = typeof ans === 'string' ? ans.trim() : '';
        if (userText.length > 0) {
          pendingCount++;
          collected.push({
            questionId: targetQId,
            isBundle: isBundleItem,
            subIndex: subIdx,
            type: 'acik_uclu',
            userAnswerText: userText,
            questionText: q.questionText || q.text || q.title || `Soru ${globalQIndex + 1}`,
            isCorrect: null, // Pending evaluation
            earnedPoints: 0
          });
        } else {
          blankCount++;
          collected.push({
            questionId: targetQId,
            isBundle: isBundleItem,
            subIndex: subIdx,
            type: 'acik_uclu',
            userAnswerText: null,
            questionText: q.questionText || q.text || q.title || `Soru ${globalQIndex + 1}`,
            isCorrect: false, // Left blank, implicitly 0 points
            earnedPoints: 0
          });
        }
      }
    });

    const hasPending = collected.some(a => a.isCorrect === null);
    const finalStatus = hasPending ? 'pending_evaluation' : 'completed';
    
    setFinalStats({
      correct: correctCount,
      wrong: wrongCount,
      blank: blankCount,
      pending: pendingCount,
      score: totalScore,
      totalQuestions: correctCount + wrongCount + blankCount + pendingCount
    });

    const newSubId = await addSubmission({
      testId: test?.id || id,
      hwId: isHomework ? (test?.id || id) : undefined,
      testTitle: test?.title || test?.name || (isHomework ? 'Ödev Sınavı' : 'Test'),
      studentId: student.id,
      studentName: student.name,
      questions: (questions || []).map(q => ({
        id: q.id,
        questionText: q.questionText || q.text || q.title || '',
        imageUrl: q.imageUrl || (Array.isArray(q.imageUrls) ? q.imageUrls[0] : q.imageUrls) || q.contentPayload || null,
        imageUrls: q.imageUrls || (q.imageUrl ? [q.imageUrl] : []),
        contentPayload: q.contentPayload || null,
        contentType: q.contentType || q.type || test?.contentType || test?.type || null,
        options: q.options || []
      })),
      contentPayload: test?.contentPayload || questions?.[0]?.contentPayload || null,
      pdfPayload: test?.pdfPayload || questions?.[0]?.pdfPayload || null,
      htmlPayload: test?.htmlPayload || questions?.[0]?.htmlPayload || null,
      imageUrl: test?.imageUrl || questions?.[0]?.imageUrl || null,
      imageUrls: test?.imageUrls || questions?.[0]?.imageUrls || [],
      contentType: test?.contentType || test?.type || questions?.[0]?.contentType || questions?.[0]?.type || null,
      sourceFormat: test?.sourceFormat || test?.formatType || null,
      isOpenEnded: finalStatus === 'pending_evaluation',
      isHomework: isHomework,
      status: finalStatus,
      score: totalScore,
      correctCount: correctCount,
      wrongCount: wrongCount,
      blankCount: blankCount,
      totalQuestions: correctCount + wrongCount + blankCount + pendingCount,
      answers: collected
    });
    
    setSubmissionId(newSubId);

    if (isHomework) {
       submitHomework(test.id, studentId, totalScore, (correctCount + wrongCount + blankCount + pendingCount) * 10 || 100);
    }
    
    // Save to global mistakes pool logic here in the future
    console.log("Yanlış Havuzu Verisi (Hazır): ", wrongList);
    setShowResultsModal(true);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getEmbeddableUrl = (url) => {
    if (!url) return url;
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  const renderContentPreview = (q) => {
    if (q.contentType === 'pdf') {
      return (
        <PdfViewerWithControls
          payload={q.contentPayload}
          title={test?.title || "PDF Soru Dokümanı"}
          height="100%"
        />
      );
    }

    if (q.contentType === 'json' || q.questionsList) {
      let subQuestions = q.questionsList || [];
      if (!subQuestions.length && q.contentPayload) {
        try {
          const parsed = JSON.parse(q.contentPayload);
          if (Array.isArray(parsed)) subQuestions = parsed;
        } catch (e) {
          subQuestions = [];
        }
      }

      if (subQuestions.length === 0) return null;

      const safeSubIdx = Math.min(subQuestionIdx, subQuestions.length - 1);
      const qItem = subQuestions[safeSubIdx];
      const isAcikUcluItem = q.type === 'acik_uclu' || test?.type === 'acik_uclu' || qItem.type === 'acik_uclu';
      const hasRealTextOptions = !isAcikUcluItem && qItem.options && qItem.options.length > 0 && qItem.options.some((opt, idx) => opt && opt.trim() !== String.fromCharCode(65 + idx));

      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Current Sub Question */}
          <div style={{ background: 'var(--color-surface)', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {qItem.contentPayload && (
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <img src={qItem.contentPayload} alt={`Soru Görseli ${safeSubIdx + 1}`} style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }} />
              </div>
            )}
            {qItem.questionText && (
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                {qItem.questionText}
              </div>
            )}
            {hasRealTextOptions && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem', marginTop: '0.75rem' }}>
                {qItem.options.map((optText, oIdx) => {
                  const bundleAns = studentAnswers[q.id] || {};
                  const isSelected = (typeof bundleAns === 'object' && bundleAns !== null) ? bundleAns[safeSubIdx] === oIdx : false;
                  return (
                    <div 
                      key={oIdx} 
                      onClick={() => handleBundleOptionSelect(safeSubIdx, oIdx)}
                      style={{ 
                        background: isSelected ? '#ecfdf5' : '#f1f5f9', 
                        padding: '0.65rem 0.9rem', 
                        borderRadius: '0.65rem', 
                        fontSize: '0.88rem', 
                        fontWeight: 700, 
                        color: isSelected ? '#065f46' : '#334155', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.65rem', 
                        border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover:scale-[1.01] active:scale-95"
                    >
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? '#10b981' : '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span style={{ flex: 1 }}>{optText}</span>
                      {isSelected && <span style={{ color: '#10b981', fontWeight: 900, fontSize: '0.85rem' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {isAcikUcluItem && (
              <div style={{ marginTop: '1rem', background: '#fffef0', padding: '1rem', borderRadius: '0.75rem', border: '1.5px solid #fde68a' }}>
                <label style={{ display: 'block', fontWeight: 900, fontSize: '0.85rem', color: '#92400e', marginBottom: '0.4rem' }}>
                  ✍️ Cevabınızı Yazın:
                </label>
                <textarea
                  rows={4}
                  value={(() => {
                    const bundleAns = studentAnswers[q.id] || {};
                    return typeof bundleAns === 'object' && bundleAns[safeSubIdx] ? bundleAns[safeSubIdx] : '';
                  })()}
                  onChange={(e) => handleBundleTextChange(safeSubIdx, e.target.value)}
                  placeholder="Yazılı cevabınızı buraya detaylıca yazınız..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #d97706', fontSize: '0.9rem', fontFamily: 'inherit', background: 'var(--color-surface)', fontWeight: 600 }}
                />
              </div>
            )}
          </div>

          {/* Sub-questions Footer / Pagination Bar if subQuestions > 1 */}
          {subQuestions.length > 1 && (
            <div style={{ background: 'var(--color-surface)', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1.5px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.82rem', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>
                  📌 Soru {safeSubIdx + 1} / {subQuestions.length}
                </span>
                
                <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', padding: '0.1rem' }}>
                  {subQuestions.map((_, pIdx) => {
                    const bundleAns = studentAnswers[q.id] || {};
                    const isAns = (typeof bundleAns === 'object' && bundleAns !== null) && (bundleAns[pIdx] !== undefined && bundleAns[pIdx] !== null && bundleAns[pIdx] !== '');
                    const isCurr = pIdx === safeSubIdx;
                    return (
                      <button
                        key={pIdx}
                        onClick={() => setSubQuestionIdx(pIdx)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          border: isCurr ? '2px solid #4f46e5' : (isAns ? '1.5px solid #10b981' : '1px solid #cbd5e1'),
                          background: isCurr ? '#4f46e5' : (isAns ? '#dcfce7' : '#f1f5f9'),
                          color: isCurr ? 'white' : (isAns ? '#166534' : '#475569'),
                          fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer'
                        }}
                      >
                        {pIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  disabled={safeSubIdx === 0}
                  onClick={() => setSubQuestionIdx(prev => Math.max(0, prev - 1))}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.65rem',
                    border: '1px solid var(--color-border)', background: safeSubIdx === 0 ? '#f1f5f9' : '#e0e7ff',
                    color: safeSubIdx === 0 ? '#94a3b8' : '#3730a3',
                    fontWeight: 800, fontSize: '0.8rem', cursor: safeSubIdx === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <ChevronLeft size={16} /> Önceki
                </button>

                <button
                  type="button"
                  disabled={safeSubIdx === subQuestions.length - 1}
                  onClick={() => setSubQuestionIdx(prev => Math.min(subQuestions.length - 1, prev + 1))}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.65rem',
                    border: '1px solid var(--color-border)', background: safeSubIdx === subQuestions.length - 1 ? '#f1f5f9' : '#4f46e5',
                    color: safeSubIdx === subQuestions.length - 1 ? '#94a3b8' : 'white',
                    fontWeight: 800, fontSize: '0.8rem', cursor: safeSubIdx === subQuestions.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  Sonraki <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      );
    }

    switch (q.contentType) {
      case 'gorsel': {
        const urls = (q.imageUrls && q.imageUrls.length > 0)
          ? q.imageUrls
          : (q.contentPayload ? [q.contentPayload] : []);
        
        if (urls.length === 0) return null;

        const safeImgIdx = Math.min(subQuestionIdx, urls.length - 1);
        const url = urls[safeImgIdx];

        return (
          <div className="q-preview-gorsel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', overflowY: 'auto', padding: '1.25rem', background: 'var(--color-surface)' }}>
            <div style={{ background: 'var(--color-surface)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--color-border)', width: '100%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img
                src={url}
                alt={`Soru Görseli ${safeImgIdx + 1}`}
                style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}
              />
            </div>

            {urls.length > 1 && (
              <div style={{ background: 'var(--color-surface)', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', justify: 'space-between', gap: '0.5rem', flexWrap: 'wrap', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: '#d97706', color: 'white', fontWeight: 900, fontSize: '0.82rem', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>
                    🖼️ Görsel Soru {safeImgIdx + 1} / {urls.length}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', padding: '0.1rem' }}>
                    {urls.map((_, pIdx) => {
                      const bundleAns = studentAnswers[q.id] || {};
                      const isAns = (typeof bundleAns === 'object' && bundleAns !== null) && (bundleAns[pIdx] !== undefined && bundleAns[pIdx] !== null && bundleAns[pIdx] !== '');
                      const isCurr = pIdx === safeImgIdx;
                      return (
                        <button
                          key={pIdx}
                          onClick={() => setSubQuestionIdx(pIdx)}
                          style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            border: isCurr ? '2px solid #d97706' : (isAns ? '1.5px solid #10b981' : '1px solid #cbd5e1'),
                            background: isCurr ? '#d97706' : (isAns ? '#dcfce7' : '#f1f5f9'),
                            color: isCurr ? 'white' : (isAns ? '#166534' : '#475569'),
                            fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >
                          {pIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    disabled={safeImgIdx === 0}
                    onClick={() => setSubQuestionIdx(prev => Math.max(0, prev - 1))}
                    style={{
                      padding: '0.4rem 0.85rem', borderRadius: '0.65rem',
                      border: '1px solid var(--color-border)', background: safeImgIdx === 0 ? '#f1f5f9' : '#fef3c7',
                      color: safeImgIdx === 0 ? '#94a3b8' : '#b45309',
                      fontWeight: 800, fontSize: '0.8rem', cursor: safeImgIdx === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.3rem'
                    }}
                  >
                    <ChevronLeft size={16} /> Önceki
                  </button>

                  <button
                    type="button"
                    disabled={safeImgIdx === urls.length - 1}
                    onClick={() => setSubQuestionIdx(prev => Math.min(urls.length - 1, prev + 1))}
                    style={{
                      padding: '0.4rem 0.85rem', borderRadius: '0.65rem',
                      border: '1px solid var(--color-border)', background: safeImgIdx === urls.length - 1 ? '#f1f5f9' : '#d97706',
                      color: safeImgIdx === urls.length - 1 ? '#94a3b8' : 'white',
                      fontWeight: 800, fontSize: '0.8rem', cursor: safeImgIdx === urls.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.3rem'
                    }}
                  >
                    Sonraki <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'pdf': {
        return (
          <PdfViewerWithControls
            payload={q.contentPayload}
            title={test?.title || "PDF Soru Dokümanı"}
            height="100%"
          />
        );
      }
      case 'html': {
        const htmlPayload = q.contentPayload || q.htmlPayload || q.htmlUrl || q.url || q.content || test?.contentPayload || test?.htmlPayload;
        return (
          <HtmlViewerWithControls
            payload={htmlPayload}
            title={test?.title || "HTML Soru Dokümanı"}
            height="100%"
          />
        );
      }
      case 'text':
      default: {
        const isAcikUclu = q.type === 'acik_uclu' || test?.type === 'acik_uclu';
        const hasOptions = !isAcikUclu && q.options && q.options.length > 0;
        const currentAns = studentAnswers[q.id];

        return (
          <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--color-surface)', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              
              {/* Question Text */}
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '1rem', lineHeight: 1.5 }}>
                {q.questionText || q.title || 'Yazılı / Açık Uçlu Soru'}
              </div>

              {/* Question Image if any */}
              {q.contentPayload && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <img
                    src={q.contentPayload}
                    alt="Soru Görseli"
                    style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}
                  />
                </div>
              )}

              {/* Multiple choice options if available */}
              {hasOptions && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem', marginTop: '0.75rem' }}>
                  {q.options.map((optText, oIdx) => {
                    const isSelected = currentAns === oIdx;
                    return (
                      <div
                        key={oIdx}
                        onClick={() => handleOptionSelect(oIdx)}
                        style={{
                          background: isSelected ? '#ecfdf5' : '#f1f5f9',
                          padding: '0.65rem 0.9rem',
                          borderRadius: '0.65rem',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: isSelected ? '#065f46' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover:scale-[1.01] active:scale-95"
                      >
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? '#10b981' : '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span style={{ flex: 1 }}>{optText}</span>
                        {isSelected && <span style={{ color: '#10b981', fontWeight: 900, fontSize: '0.85rem' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Open-ended written answer text box */}
              {isAcikUclu && (
                <div style={{ marginTop: '1rem', background: '#fffef0', padding: '1rem', borderRadius: '0.75rem', border: '1.5px solid #fde68a' }}>
                  <label style={{ display: 'block', fontWeight: 900, fontSize: '0.85rem', color: '#92400e', marginBottom: '0.4rem' }}>
                    ✍️ Cevabınızı Yazın:
                  </label>
                  <textarea
                    rows={4}
                    value={typeof currentAns === 'string' ? currentAns : ''}
                    onChange={(e) => handleOpenAnswerChange(e.target.value)}
                    placeholder="Yazılı cevabınızı buraya detaylıca yazınız..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #d97706', fontSize: '0.9rem', fontFamily: 'inherit', background: 'var(--color-surface)', fontWeight: 600 }}
                  />
                </div>
              )}

            </div>
          </div>
        );
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().catch(err => {
        setIsFullscreen(false);
      });
    }
  };

  // --- DEDICATED TEACHER EVALUATION MODE ---
  // Uses exact same CSS layout as bundle test-solving screen
  if (isReadOnlyMode && targetSubmission) {
    const bundleAns = studentAnswers[currentQuestion.id] || {};
    const isAcikUcluBundle =
      currentQuestion?.type === 'acik_uclu' ||
      currentQuestion?.type === 'yazili' ||
      test?.type === 'acik_uclu' ||
      (currentQuestion?.questionsList && currentQuestion.questionsList[0]?.type === 'acik_uclu');

    const totalSections = testQuestions.length;
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];

    const handleSaveGrades = () => {
      if (targetSubmission && updateSubmission) {
        const updatedAnswers = (targetSubmission.answers || []).map((ans, aIdx) => {
          const foundKey = Object.keys(openEvalGrades).find(k =>
            k === `${ans.questionId || currentQuestion?.id}_${ans.subIndex !== undefined ? ans.subIndex : aIdx}`
          );
          const isCorrect = foundKey !== undefined ? openEvalGrades[foundKey] : ans.isCorrect;
          return { ...ans, isCorrect };
        });
        updateSubmission(targetSubmission.id, { answers: updatedAnswers, isEvaluated: true, status: 'completed' });
      }
      alert('✅ Değerlendirmeler kaydedildi!');
    };

    return (
      <>
        <div className={`container quiz-container animate-fade-in ${isFullscreen ? 'fullscreen-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div className="quiz-toolbar">
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
              {testQuestions.map((q, idx) => {
                const isActive = idx === currentQuestionIdx;
                const sectionEvalKeys = Object.keys(openEvalGrades).filter(k => k.startsWith(`${q.id}_`));
                const allGraded = sectionEvalKeys.length > 0 && sectionEvalKeys.every(k => openEvalGrades[k] !== undefined);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    title={q.title || `Bölüm ${idx + 1}`}
                    style={{
                      padding: '0.3rem 0.7rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.78rem',
                      border: isActive ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                      background: isActive ? 'var(--color-primary)' : allGraded ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                      color: isActive ? 'white' : allGraded ? '#059669' : '#94a3b8',
                      cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {allGraded ? '✅ ' : ''}{idx + 1}. Bölüm
                  </button>
                );
              })}
            </div>
            <button className="btn-icon" title="Tam Ekran" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>

          {/* Header */}
          <div className="quiz-header card glass-dark" style={{ marginBottom: isFullscreen ? '1rem' : '2rem' }}>
            <div className="quiz-progress">
              📄 Bölüm {currentQuestionIdx + 1} / {totalSections}
              {currentQuestion?.title && (
                <span style={{ marginLeft: '0.75rem', opacity: 0.6, fontWeight: 600 }}>
                  {currentQuestion.title}
                </span>
              )}
            </div>
            <div className="quiz-timer">
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                {isAcikUcluBundle ? '✍️ Açık Uçlu' : '📊 Çoktan Seçmeli'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 8 }}>
                {targetSubmission.studentName || 'Öğrenci'}
              </span>
            </div>
          </div>

          {/* Bundle Layout */}
          <div className="bundle-layout horizontal" style={{ flex: 1, minHeight: 0 }}>

            {/* Left: Content */}
            <div className="bundle-content" style={{ flex: `0 0 ${splitRatio}%`, padding: 0, display: 'flex' }}>
              <DrawingOverlay>{renderContentPreview(currentQuestion)}</DrawingOverlay>
            </div>

            {/* Resizer */}
            <div
              className="resizer-horizontal"
              onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            >
              <GripVertical size={16} color="#ccc" />
            </div>

            {/* Right: Teacher Grading Panel */}
            <div className="bundle-optic" style={{ flex: '1', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{isAcikUcluBundle ? '✍️ Öğrenci Yanıtları' : '📊 Optik Form'}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '50px', padding: '0.2rem 0.65rem' }}>
                  ⚖️ Öğretmen Modu
                </span>
              </h3>

              {isAcikUcluBundle ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Array.from({ length: currentQuestion.questionCount || 1 }).map((_, i) => {
                    const textVal = typeof bundleAns === 'object' && bundleAns !== null ? (bundleAns[i] || '') : (i === 0 && typeof bundleAns === 'string' ? bundleAns : '');
                    const evalKey = `${currentQuestion?.id || currentQuestionIdx}_${i}`;
                    const grade = openEvalGrades[evalKey];
                    const isGradedCorrect = grade === true;
                    const isGradedWrong = grade === false;
                    const isGradedBlank = grade === null;
                    const isUngraded = grade === undefined;
                    const cardBg = isGradedCorrect ? 'rgba(34, 197, 94, 0.08)' : isGradedWrong ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.05)';
                    const cardBorder = isGradedCorrect ? 'rgba(34, 197, 94, 0.3)' : isGradedWrong ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.15)';
                    return (
                      <div key={i} style={{ background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: '0.875rem', padding: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#e2e8f0' }}>Soru {i + 1}</span>
                          {!isUngraded && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '50px', background: isGradedCorrect ? 'rgba(34,197,94,0.15)' : isGradedWrong ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: isGradedCorrect ? '#4ade80' : isGradedWrong ? '#f87171' : '#94a3b8', border: `1px solid ${cardBorder}` }}>
                              {isGradedCorrect ? 'Doğru' : isGradedWrong ? 'Yanlış' : 'Boş'}
                            </span>
                          )}
                        </div>
                        <div style={{ background: textVal ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.6rem', padding: '0.7rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.88rem', color: textVal ? '#e2e8f0' : '#64748b', fontStyle: textVal ? 'normal' : 'italic', lineHeight: 1.6, minHeight: 56, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {textVal || 'Öğrenci cevap vermedi.'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                          <button type="button" onClick={() => setOpenEvalGrades(p => ({ ...p, [evalKey]: true }))} style={{ padding: '0.55rem 0', borderRadius: '0.6rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s', border: isGradedCorrect ? '2px solid #22c55e' : '1.5px solid rgba(255,255,255,0.15)', background: isGradedCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.03)', color: isGradedCorrect ? '#4ade80' : '#94a3b8' }}>✓ Doğru</button>
                          <button type="button" onClick={() => setOpenEvalGrades(p => ({ ...p, [evalKey]: false }))} style={{ padding: '0.55rem 0', borderRadius: '0.6rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s', border: isGradedWrong ? '2px solid #ef4444' : '1.5px solid rgba(255,255,255,0.15)', background: isGradedWrong ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)', color: isGradedWrong ? '#f87171' : '#94a3b8' }}>✕ Yanlış</button>
                          <button type="button" onClick={() => setOpenEvalGrades(p => ({ ...p, [evalKey]: null }))} style={{ padding: '0.55rem 0', borderRadius: '0.6rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s', border: isGradedBlank ? '2px solid #64748b' : '1.5px solid rgba(255,255,255,0.15)', background: isGradedBlank ? 'rgba(100,116,139,0.2)' : 'rgba(255,255,255,0.03)', color: isGradedBlank ? '#cbd5e1' : '#94a3b8' }}>⚪ Boş</button>
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={handleSaveGrades} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem', fontWeight: 900, fontSize: '0.95rem', borderRadius: '0.75rem' }}>
                    💾 Bu Bölümü Kaydet
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Array.from({ length: currentQuestion.questionCount || 1 }).map((_, i) => {
                    const studentSel = typeof bundleAns === 'object' && bundleAns !== null ? bundleAns[i] : (i === 0 && typeof bundleAns === 'number' ? bundleAns : null);
                    let correctAnsKey = null;
                    if (Array.isArray(currentQuestion.answerKey) && currentQuestion.answerKey[i]) {
                      const k = currentQuestion.answerKey[i];
                      correctAnsKey = typeof k === 'number' ? k : (k.charCodeAt(0) - 65);
                    } else if (currentQuestion.questionsList && currentQuestion.questionsList[i]) {
                      const c = currentQuestion.questionsList[i].correctAnswer;
                      correctAnsKey = typeof c === 'number' ? c : (typeof c === 'string' ? c.charCodeAt(0) - 65 : null);
                    }
                    const isCorrect = studentSel !== null && studentSel !== undefined && correctAnsKey !== null && studentSel === correctAnsKey;
                    const isWrong = studentSel !== null && studentSel !== undefined && correctAnsKey !== null && studentSel !== correctAnsKey;
                    return (
                      <div key={i} style={{ background: isCorrect ? 'rgba(34,197,94,0.08)' : isWrong ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '0.75rem', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.82rem', color: '#94a3b8', width: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
                          {optionLetters.map((letter, optIdx) => {
                            const isUserSel = studentSel === optIdx;
                            const isCorrectOpt = correctAnsKey === optIdx;
                            let bg = 'rgba(255,255,255,0.05)', br = 'rgba(255,255,255,0.15)', col = '#94a3b8', fw = 700;
                            if (isCorrectOpt) { bg = 'rgba(34,197,94,0.15)'; br = 'rgba(34,197,94,0.5)'; col = '#4ade80'; fw = 900; }
                            if (isUserSel && isCorrect) { bg = 'rgba(34,197,94,0.2)'; br = '#22c55e'; col = '#4ade80'; fw = 900; }
                            if (isUserSel && isWrong) { bg = 'rgba(239,68,68,0.2)'; br = '#ef4444'; col = '#f87171'; fw = 900; }
                            return <div key={optIdx} style={{ width: 30, height: 30, borderRadius: '50%', background: bg, border: `2px solid ${br}`, color: col, fontWeight: fw, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{letter}</div>;
                          })}
                        </div>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{isCorrect ? '✅' : isWrong ? '❌' : '⬜'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', gap: '1rem', paddingBottom: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-secondary" onClick={() => setCurrentQuestionIdx(i => Math.max(0, i - 1))} disabled={currentQuestionIdx === 0} style={{ opacity: currentQuestionIdx === 0 ? 0.4 : 1 }}>
              ← Önceki Bölüm
            </button>
            <button className="btn btn-primary" onClick={() => setCurrentQuestionIdx(i => Math.min(totalSections - 1, i + 1))} disabled={currentQuestionIdx === totalSections - 1} style={{ opacity: currentQuestionIdx === totalSections - 1 ? 0.4 : 1 }}>
              Sonraki Bölüm →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (showResultsModal && finalStats) {
    // If the test has pending open-ended questions, show ONLY the pending screen
    if (finalStats.pending > 0) {
      return (
        <div className="container quiz-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
          <div className="card glass quiz-result" style={{ width: '100%', maxWidth: '600px', textAlign: 'center', padding: '4rem 3rem', borderTop: '4px solid var(--color-secondary)', position: 'relative', overflow: 'hidden' }}>
            
            <div style={{ background: 'var(--color-secondary-light)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', color: 'white', boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)', animation: 'pulse 2s infinite' }}>
              <Clock3 size={50} />
            </div>
            
            <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>Değerlendirmeye Gönderildi!</h1>
            <p className="text-muted" style={{ fontSize: '1.2rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Tebrikler, testi bitirdiniz. Ancak bu testte yer alan <strong>Açık Uçlu sorular</strong> öğretmeniniz tarafından değerlendirildikten sonra puanınız ve sınav sonuçlarınız kesinleşecektir.
            </p>

            <button className="btn btn-primary btn-lg" onClick={() => navigate('/student', { replace: true })} style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
              Kontrol Paneline Dön
            </button>
            
            {/* Animated Background Elements */}
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', background: 'var(--color-secondary)', opacity: 0.05, borderRadius: '50%', filter: 'blur(40px)', zIndex: -1 }}></div>
            <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--color-secondary)', opacity: 0.05, borderRadius: '50%', filter: 'blur(40px)', zIndex: -1 }}></div>
          </div>
        </div>
      );
    }

    // Fully Evaluated Classic Results Screen
    const totalQ = finalStats.correct + finalStats.wrong + finalStats.blank;
    const successRate = totalQ > 0 ? Math.round((finalStats.correct / totalQ) * 100) : 0;
    
    let statusColor = 'var(--color-primary)';
    let statusBg = 'var(--color-primary-light)';
    let StatusIcon = CheckCircle;
    let statusMessage = 'Harika bir iş çıkardınız. İşte sonuçlarınız:';
    
    if (successRate >= 80) {
      statusColor = 'var(--color-success)';
      statusBg = 'rgba(16, 185, 129, 0.2)';
      statusMessage = 'Mükemmel! Harika bir sonuç elde ettiniz. 🎉';
    } else if (successRate >= 50) {
      statusColor = 'var(--color-primary)';
      statusBg = 'rgba(124, 58, 237, 0.2)';
      statusMessage = 'İyi iş çıkardınız, ancak hala gelişime açık alanlar var. 👍';
    } else {
      statusColor = 'var(--color-error)';
      statusBg = 'rgba(239, 68, 68, 0.2)';
      StatusIcon = XCircle;
      statusMessage = 'Daha fazla pratik yapmalısınız. Pes etmeyin! 💪';
    }
    
    return (
      <div className="container quiz-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div className="card glass quiz-result" style={{ width: '100%', maxWidth: '800px', textAlign: 'center', padding: '3rem', borderTop: `4px solid ${statusColor}`, position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ background: statusBg, width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: statusColor, boxShadow: `0 0 30px ${statusBg}`, transform: 'scale(1)', transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', animation: 'pulse 2s infinite' }}>
            <StatusIcon size={50} />
          </div>
          
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: statusColor }}>Test Tamamlandı!</h1>
          <p className="text-muted" style={{ fontSize: '1.2rem', marginBottom: '2.5rem' }}>
            {statusMessage}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', marginBottom: '3.5rem' }}>
            <div className="card stat-card" style={{ flex: '1 1 140px', maxWidth: '180px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>{finalStats.correct}</div>
              <div style={{ fontWeight: 600, color: 'var(--color-success)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Doğru</div>
            </div>
            <div className="card stat-card" style={{ flex: '1 1 140px', maxWidth: '180px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-error)', lineHeight: 1 }}>{finalStats.wrong}</div>
              <div style={{ fontWeight: 600, color: 'var(--color-error)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Yanlış</div>
            </div>
            <div className="card stat-card" style={{ flex: '1 1 140px', maxWidth: '180px', background: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.3)', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>{finalStats.blank}</div>
              <div style={{ fontWeight: 600, color: '#94a3b8', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Boş</div>
            </div>
            <div className="card stat-card" style={{ flex: '1 1 140px', maxWidth: '180px', background: `linear-gradient(135deg, ${statusBg}, transparent)`, border: `1px solid ${statusColor}`, transition: 'transform 0.3s', position: 'relative' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: statusColor, lineHeight: 1 }}>%{successRate}</div>
              <div style={{ fontWeight: 600, color: statusColor, marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Başarı</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/student', { replace: true })} style={{ flex: '1 1 200px', maxWidth: '300px' }}>
              Panele Dön
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/review/${submissionId}`, { replace: true, state: { from: '/student' } })} style={{ flex: '1 1 200px', maxWidth: '300px', background: statusColor, borderColor: statusColor }}>
              Soruları İncele
            </button>
          </div>
          
          {/* Animated Background Elements */}
          <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', background: statusColor, opacity: 0.05, borderRadius: '50%', filter: 'blur(40px)', zIndex: -1 }}></div>
          <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '200px', height: '200px', background: statusColor, opacity: 0.05, borderRadius: '50%', filter: 'blur(40px)', zIndex: -1 }}></div>
        </div>
      </div>
    );
  }

  // --- DEDICATED MOBILE TEST SOLVER VIEW ---
  if (isMobile) {
    const bundleAns = studentAnswers[currentQuestion?.id] || {};
    const answeredCount = typeof bundleAns === 'object' && bundleAns !== null ? Object.keys(bundleAns).length : (studentAnswers[currentQuestion?.id] ? 1 : 0);
    const totalCount = currentQuestion?.questionCount || totalQuestionsCount || 1;

    return (
      <div className="mobile-quiz-runner">
        {/* Modals */}
        {showFinishModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content card glass-dark animate-fade-in" style={{ width: '90%', maxWidth: '380px', textAlign: 'center', padding: '1.5rem', background: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-text)', fontWeight: 900 }}>Testi Bitir</h3>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Testi bitirmek istediğinize emin misiniz? <br/><br/>Seçimleriniz kaydedilecek ve değerlendirilecektir.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowFinishModal(false)}>İptal</button>
                <button className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }} onClick={() => handleFinishTest(true)}>Evet, Bitir</button>
              </div>
            </div>
          </div>
        )}

        {/* 1. Mobile Top Header */}
        <div className="mobile-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/student')}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="mobile-top-bar-title">{test?.title || 'Test Çözümü'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="mobile-timer-badge">
              <Clock size={14} />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFinishModal(true)}
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              🏁 Bitir
            </button>
          </div>
        </div>

        {/* 2. Mobile View Mode Sub-Header Tabs */}
        <div className="mobile-tab-bar">
          <button
            type="button"
            className={`mobile-tab-btn ${mobileTab === 'doc' ? 'active' : ''}`}
            onClick={() => setMobileTab('doc')}
          >
            📄 Soru / Doküman
          </button>
          <button
            type="button"
            className={`mobile-tab-btn ${mobileTab === 'optic' ? 'active' : ''}`}
            onClick={() => setMobileTab('optic')}
          >
            📝 Optik Form
          </button>
          <button
            type="button"
            className={`mobile-tab-btn ${mobileTab === 'scratch' ? 'active' : ''}`}
            onClick={() => setMobileTab('scratch')}
          >
            ✏️ Karalama
          </button>
          <button
            type="button"
            className={`mobile-tab-btn ${mobileTab === 'split' ? 'active' : ''}`}
            onClick={() => setMobileTab('split')}
          >
            🔀 Bölünmüş
          </button>
        </div>

        {/* 3. Mobile Main View Area */}
        <div className="mobile-main-content">
          {mobileTab === 'doc' && (
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <DrawingOverlay>
                {renderContentPreview(currentQuestion)}
              </DrawingOverlay>
            </div>
          )}

          {mobileTab === 'optic' && (
            <div className="mobile-optic-grid">
              <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)', marginBottom: '8px' }}>
                Optik Cevap Anahtarı ({answeredCount}/{totalCount} Cevaplandı)
              </div>
              {Array.from({ length: currentQuestion?.questionCount || 1 }).map((_, i) => (
                <div key={i} className="mobile-optic-row">
                  <span className="mobile-optic-num">Soru {i + 1}</span>
                  <div className="mobile-optic-bubbles">
                    {[0, 1, 2, 3, 4].map(optIdx => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = bundleAns[i] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={`mobile-optic-bubble ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleBundleOptionSelect(i, optIdx)}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'scratch' && (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <DrawingOverlay>
                <div style={{ width: '100%', height: '100%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 800 }}>
                  ✏️ Mobil Karalama Tahtası
                </div>
              </DrawingOverlay>
            </div>
          )}

          {mobileTab === 'split' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {/* Top Section: PDF / Question Preview */}
              <div style={{ height: `${mobileSplitRatio}%`, width: '100%', overflow: 'hidden', position: 'relative' }}>
                <DrawingOverlay>
                  {renderContentPreview(currentQuestion)}
                </DrawingOverlay>
              </div>

              {/* Touch Resizer Divider Bar */}
              <div
                onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
                onTouchStart={(e) => { setIsDragging(true); }}
                style={{
                  height: '14px',
                  background: isDragging ? '#4f46e5' : '#cbd5e1',
                  cursor: 'row-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  touchAction: 'none',
                  zIndex: 20,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
              >
                <GripHorizontal size={18} color={isDragging ? '#ffffff' : '#475569'} />
              </div>

              {/* Bottom Section: Touch Optic Form */}
              <div className="mobile-optic-grid" style={{ height: `calc(${100 - mobileSplitRatio}% - 14px)`, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Optik Form ({answeredCount}/{totalCount})</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>↕️ Çizgiyi kaydırarak alanı ayarlayın</span>
                </div>
                {Array.from({ length: currentQuestion?.questionCount || 1 }).map((_, i) => (
                  <div key={i} className="mobile-optic-row" style={{ padding: '6px 10px' }}>
                    <span className="mobile-optic-num" style={{ fontSize: '0.82rem' }}>S{i + 1}</span>
                    <div className="mobile-optic-bubbles">
                      {[0, 1, 2, 3, 4].map(optIdx => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isSelected = bundleAns[i] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={`mobile-optic-bubble ${isSelected ? 'selected' : ''}`}
                            style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}
                            onClick={() => handleBundleOptionSelect(i, optIdx)}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Mobile Bottom Action Bar */}
        <div className="mobile-bottom-bar">
          <button
            type="button"
            className="mobile-nav-btn prev"
            onClick={handlePrev}
            disabled={currentQuestionIdx === 0}
            style={{ opacity: currentQuestionIdx === 0 ? 0.5 : 1 }}
          >
            <ChevronLeft size={18} /> Önceki
          </button>

          <button
            type="button"
            className="mobile-optic-toggle-btn"
            onClick={() => setShowMobileOpticDrawer(true)}
          >
            📝 Optik ({answeredCount}/{totalCount})
          </button>

          {currentQuestionIdx < testQuestions.length - 1 ? (
            <button type="button" className="mobile-nav-btn next" onClick={handleNext}>
              Sonraki <ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" className="mobile-nav-btn finish" onClick={() => setShowFinishModal(true)}>
              Bitir 🏁
            </button>
          )}
        </div>

        {/* 5. Mobile Slide-Up Optic Drawer */}
        {showMobileOpticDrawer && (
          <div className="mobile-drawer-overlay" onClick={() => setShowMobileOpticDrawer(false)}>
            <div className="mobile-drawer-content" onClick={e => e.stopPropagation()}>
              <div className="mobile-drawer-header">
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  {(currentQuestion?.type === 'acik_uclu' || test?.type === 'acik_uclu' || (currentQuestion?.questionsList && currentQuestion.questionsList[0]?.type === 'acik_uclu')) ? '📝 Yazılı Yanıt Formu' : '📝 Hızlı Optik Cevap Anahtarı'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileOpticDrawer(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mobile-optic-grid" style={{ maxHeight: '60vh' }}>
                {(currentQuestion?.type === 'acik_uclu' || test?.type === 'acik_uclu' || (currentQuestion?.questionsList && currentQuestion.questionsList[0]?.type === 'acik_uclu')) ? (
                  (currentQuestion?.isBundle || (currentQuestion?.questionsList && currentQuestion.questionsList.length > 1)) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
                      {Array.from({ length: currentQuestion?.questionCount || currentQuestion?.questionsList?.length || 1 }).map((_, i) => (
                        <div key={i} style={{ background: 'var(--color-surface)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                          <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                            Soru {i + 1} Yanıtınız:
                          </label>
                          <textarea
                            rows={2}
                            value={typeof bundleAns === 'object' && bundleAns !== null ? (bundleAns[i] || '') : ''}
                            onChange={(e) => handleBundleTextChange(i, e.target.value)}
                            placeholder={`${i + 1}. sorunun cevabını buraya yazınız...`}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
                      <div style={{ background: 'var(--color-surface)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                        <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                          Soru {currentQuestionIdx + 1} Yanıtınız:
                        </label>
                        <textarea
                          rows={4}
                          value={typeof studentAnswers[currentQuestion.id] === 'string' ? studentAnswers[currentQuestion.id] : ''}
                          onChange={(e) => handleOpenAnswerChange(e.target.value)}
                          placeholder="Cevabınızı buraya yazınız..."
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  Array.from({ length: currentQuestion?.questionCount || 1 }).map((_, i) => (
                    <div key={i} className="mobile-optic-row">
                      <span className="mobile-optic-num">Soru {i + 1}</span>
                      <div className="mobile-optic-bubbles">
                        {[0, 1, 2, 3, 4].map(optIdx => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isSelected = bundleAns[i] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              className={`mobile-optic-bubble ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleBundleOptionSelect(i, optIdx)}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- BUNDLE VIEW (PDF, HTML, Visual, JSON Multi-question packages) ---
  if (currentQuestion?.isBundle) {
    const bundleAns = studentAnswers[currentQuestion.id] || {};
    const isAcikUcluBundle = currentQuestion?.type === 'acik_uclu' 
      || test?.type === 'acik_uclu' 
      || (currentQuestion?.questionsList && currentQuestion.questionsList[0]?.type === 'acik_uclu');

    return (
      <>
        {/* Modals */}
        {showFinishModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content card glass-dark animate-fade-in" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Testi Bitir</h3>
              <p style={{ marginBottom: '2rem' }}>Testi bitirmek istediğinize emin misiniz? <br/><br/>Tüm seçimleriniz kaydedilecek ve değerlendirilecektir.</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setShowFinishModal(false)}>İptal</button>
                <button className="btn btn-primary" onClick={() => handleFinishTest(true)}>Evet, Bitir</button>
              </div>
            </div>
          </div>
        )}

        <div className={`container quiz-container animate-fade-in ${isFullscreen ? 'fullscreen-mode' : ''}`}>

          {/* Toolbar */}
          <div className="quiz-toolbar">
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
              {testQuestions.map((q, idx) => {
                const isActive = idx === currentQuestionIdx;
                // Check if answered
                const isAnswered = studentAnswers[q.id] && Object.keys(studentAnswers[q.id]).length > 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    title={q.title || `Bölüm ${idx + 1}`}
                    style={{
                      padding: '0.3rem 0.7rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.78rem',
                      border: isActive ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                      background: isActive ? 'var(--color-primary)' : isAnswered ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                      color: isActive ? 'white' : isAnswered ? '#059669' : '#94a3b8',
                      cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {isAnswered ? '✅ ' : ''}{idx + 1}. Bölüm
                  </button>
                );
              })}
            </div>
            <button className="btn-icon" title="Tam Ekran" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>

          {/* Header */}
          <div className="quiz-header card glass-dark" style={{ marginBottom: isFullscreen ? '1rem' : '2rem' }}>
            <div className="quiz-progress">
              📄 Bölüm {currentQuestionIdx + 1} / {testQuestions.length}
              {currentQuestion?.title && (
                <span style={{ marginLeft: '0.75rem', opacity: 0.6, fontWeight: 600 }}>
                  {currentQuestion.title}
                </span>
              )}
            </div>
            <div className="quiz-timer">
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                {isAcikUcluBundle ? '✍️ Açık Uçlu' : '📊 Çoktan Seçmeli'}
              </span>
              <span style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                <Clock size={16} /> <span style={{ fontWeight: 800 }}>{formatTime(timeLeft)}</span>
              </span>
            </div>
          </div>

          {/* Bundle Layout */}
          <div className="bundle-layout horizontal" style={{ flex: 1, minHeight: 0 }}>

            {/* Left: Content */}
            <div className="bundle-content" style={{ flex: `0 0 ${splitRatio}%`, padding: 0, display: 'flex' }}>
              <DrawingOverlay>{renderContentPreview(currentQuestion)}</DrawingOverlay>
            </div>

            {/* Resizer */}
            <div
              className="resizer-horizontal"
              onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            >
              <GripVertical size={16} color="#ccc" />
            </div>

            {/* Right: Optic/Writing Panel */}
            <div className="bundle-optic" style={{ flex: '1', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{isAcikUcluBundle ? '✍️ Yanıt Formu' : '📊 Optik Form'}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '50px', padding: '0.2rem 0.65rem' }}>
                  Öğrenci Modu
                </span>
              </h3>

              {isAcikUcluBundle ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Array.from({ length: currentQuestion.questionCount || 1 }).map((_, i) => {
                    const textVal = bundleAns[i] || '';
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.875rem', border: '1.5px solid rgba(255,255,255,0.15)', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'block', fontWeight: 900, fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '0.6rem' }}>
                          Soru {i + 1} Yanıtınız:
                        </div>
                        <textarea
                          rows={3}
                          value={textVal}
                          onChange={(e) => handleBundleTextChange(i, e.target.value)}
                          placeholder={`${i + 1}. sorunun cevabını buraya detaylı yazınız...`}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.6rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                            background: 'rgba(0,0,0,0.2)',
                            color: '#e2e8f0',
                            lineHeight: 1.6
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Array.from({ length: currentQuestion.questionCount || 1 }).map((_, i) => {
                    const studentSel = bundleAns[i];
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '0.75rem', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.82rem', color: '#94a3b8', width: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
                          {[0, 1, 2, 3, 4].map(optIdx => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const isUserSel = studentSel === optIdx;
                            let bg = 'rgba(255,255,255,0.05)', br = 'rgba(255,255,255,0.15)', col = '#94a3b8', fw = 700;
                            if (isUserSel) { bg = 'var(--color-primary)'; br = 'var(--color-primary)'; col = 'white'; fw = 900; }
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleBundleOptionSelect(i, optIdx)}
                                style={{ width: 30, height: 30, borderRadius: '50%', background: bg, border: `2px solid ${br}`, color: col, fontWeight: fw, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', gap: '1rem', paddingBottom: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-secondary" onClick={() => setCurrentQuestionIdx(i => Math.max(0, i - 1))} disabled={currentQuestionIdx === 0} style={{ opacity: currentQuestionIdx === 0 ? 0.4 : 1 }}>
              ← Önceki Bölüm
            </button>
            {currentQuestionIdx < testQuestions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrentQuestionIdx(i => Math.min(testQuestions.length - 1, i + 1))}>
                Sonraki Bölüm →
              </button>
            ) : (
              <button className="btn btn-primary" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleFinishTest(false)}>
                Testi Bitir <CheckCircle size={20} style={{ marginLeft: 8 }} />
              </button>
            )}
          </div>
        </div>
    </>
  );
  }

  // --- STANDARD SINGLE QUESTION VIEW ---
  const ans = studentAnswers[currentQuestion.id];
  
  return (
    <>
      {/* Modals */}
      {showFinishModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass-dark animate-fade-in" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Testi Bitir</h3>
            <p style={{ marginBottom: '2rem' }}>Testi bitirmek istediğinize emin misiniz? <br/><br/>Tüm seçimleriniz kaydedilecek ve değerlendirilecektir.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowFinishModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={() => handleFinishTest(true)}>Evet, Bitir</button>
            </div>
          </div>
        </div>
      )}

      <div className={`container quiz-container animate-fade-in ${isFullscreen ? 'fullscreen-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div className="quiz-toolbar">
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
            {testQuestions.map((q, idx) => {
              const isActive = idx === currentQuestionIdx;
              const isAnswered = studentAnswers[q.id] !== undefined && studentAnswers[q.id] !== null && studentAnswers[q.id] !== '';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentQuestionIdx(idx)}
                  title={q.title || `Soru ${idx + 1}`}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.78rem',
                    border: isActive ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                    background: isActive ? 'var(--color-primary)' : isAnswered ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'white' : isAnswered ? '#059669' : '#94a3b8',
                    cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  {isAnswered ? '✅ ' : ''}{idx + 1}. Soru
                </button>
              );
            })}
          </div>
          <button className="btn-icon" title="Tam Ekran" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        {/* Header */}
        <div className="quiz-header card glass-dark" style={{ marginBottom: isFullscreen ? '1rem' : '1.5rem', flexShrink: 0 }}>
          <div className="quiz-progress">
            📄 Soru {currentQuestionIdx + 1} / {testQuestions.length}
          </div>
          <div className="quiz-timer">
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
              {currentQuestion.type === 'coktan_secmeli' ? '📊 Çoktan Seçmeli' : '✍️ Açık Uçlu'}
            </span>
            <span style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
              <Clock size={16} /> <span style={{ fontWeight: 800 }}>{formatTime(timeLeft)}</span>
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="card glass question-card" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.15)' }}>
          
          {currentQuestion.contentType !== 'text' && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <DrawingOverlay>
                {renderContentPreview(currentQuestion)}
              </DrawingOverlay>
            </div>
          )}
          
          {currentQuestion.questionText && (
            <h3 className="question-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e2e8f0', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {currentQuestion.questionText}
            </h3>
          )}
          
          <div style={{ flex: 1 }}>
            {currentQuestion.type === 'coktan_secmeli' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {(currentQuestion.options && currentQuestion.options.length > 0 ? currentQuestion.options : ['A','B','C','D', 'E']).map((opt, idx) => {
                  const isSelected = idx === ans;
                  return (
                    <button 
                      key={idx} 
                      onClick={() => handleOptionSelect(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem 1.25rem', borderRadius: '1rem',
                        border: isSelected ? '2px solid var(--color-primary)' : '1.5px solid rgba(255,255,255,0.15)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        width: 36, height: 36, borderRadius: '50%',
                        background: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? 'white' : '#94a3b8',
                        fontWeight: 900, fontSize: '1rem',
                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.15)'
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span style={{ fontWeight: isSelected ? 800 : 600, color: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: '1rem', lineHeight: 1.4 }}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.15)' }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.95rem', color: '#e2e8f0', marginBottom: '0.75rem' }}>
                  ✍️ Yanıtınız:
                </label>
                <textarea 
                  rows="6" 
                  placeholder="Detaylı cevabınızı buraya yazınız..." 
                  value={ans || ''}
                  onChange={e => handleOpenAnswerChange(e.target.value)}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.15)', fontSize: '1rem', fontFamily: 'inherit',
                    resize: 'vertical', outline: 'none', background: 'rgba(0,0,0,0.2)',
                    color: '#e2e8f0',
                    lineHeight: 1.6, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="quiz-actions animate-fade-in" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <button 
              className="btn btn-secondary btn-lg" 
              style={{ flex: 1, padding: '1rem', fontWeight: 800, borderRadius: '0.75rem' }} 
              onClick={handlePrev}
              disabled={currentQuestionIdx === 0}
            >
              ← Önceki Soru
            </button>
            
            {currentQuestionIdx < testQuestions.length - 1 ? (
              <button className="btn btn-primary btn-lg" style={{ flex: 1, padding: '1rem', fontWeight: 800, borderRadius: '0.75rem' }} onClick={handleNext}>
                Sonraki Soru →
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ flex: 1, padding: '1rem', fontWeight: 800, borderRadius: '0.75rem', background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleFinishTest(false)}>
                Testi Bitir <CheckCircle style={{marginLeft: '0.5rem'}} size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
