import { useState, useEffect, useMemo } from 'react';
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
import './QuizRunner.css';

export default function QuizRunner() {
  const params = useParams();
  const id = params.testId || params.id || '';
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useCurriculum();
  const { updateQuestion } = useQuestionBank();
  const { questions: allQuestions } = useQuestionBank();

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
  const { homeworks, submitHomework } = useHomework();
  const { submissions = [], addSubmission } = useEvaluation();
  const { users } = useUser();
  
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get('studentId') || 'u1';
  const student = users.find(u => u.id === studentId) || { name: 'Öğrenci' };

  const savedState = JSON.parse(localStorage.getItem(`quiz_state_${id}`) || 'null');

  // Core Quiz States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(savedState?.currentQuestionIdx || 0);
  const [studentAnswers, setStudentAnswers] = useState(savedState?.studentAnswers || {});
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft ?? null);
  const [isFinished, setIsFinished] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [finalStats, setFinalStats] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

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

  // Check if test is already completed by this student
  const existingSubmission = useMemo(() => {
    if (!id || !studentId) return null;
    return (submissions || []).find(s => (s.testId === id || s.id === id) && s.studentId === studentId);
  }, [submissions, id, studentId]);

  // If already finished or existing submission found, lock test solver and redirect to review
  useEffect(() => {
    if (existingSubmission && !showResultsModal && !isFinished) {
      navigate(`/review/${existingSubmission.id}`, { replace: true });
    }
  }, [existingSubmission, showResultsModal, isFinished, navigate]);

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
  const test = isHomework 
    ? homeworks.find(hw => hw.id === id) 
    : (data?.tests?.find(t => t.id === id) || allQuestions.find(q => q.id === id));

  const testQuestionList = test?.questionIds || test?.questions || test?.tests || (test?.testId ? [test.testId] : []);
  const testQuestionIds = testQuestionList.map(q => typeof q === 'string' ? q : (q?.id || q));

  const rawTestQuestions = useMemo(() => {
    if (!test) return [];
    if (test.contentType === 'pdf' || test.contentType === 'gorsel' || test.contentType === 'html') {
      return [test];
    }
    if (testQuestionList.length > 0) {
      if (typeof testQuestionList[0] === 'object' && testQuestionList[0] !== null) {
        return testQuestionList;
      }
      const foundInBank = allQuestions.filter(q => testQuestionIds.includes(q.id));
      if (foundInBank.length > 0) {
        return foundInBank;
      }
    }
    const directQuestion = allQuestions.find(q => q.id === test.id || testQuestionIds.includes(q.id));
    if (directQuestion) {
      return [directQuestion];
    }
    return [];
  }, [test, allQuestions, testQuestionList, testQuestionIds]);

  const [testQuestions, setTestQuestions] = useState(rawTestQuestions);

  useEffect(() => {
    async function loadFullPayloads() {
      if (rawTestQuestions.length === 0) return;
      const enriched = await Promise.all(rawTestQuestions.map(async (q) => {
        let payload = q.contentPayload;
        if (!payload || payload === '[STORED_IN_INDEXEDDB]' || (typeof payload === 'string' && (payload.length < 500 || payload.includes('[LOCALSTORAGE_CACHE]')))) {
          const fullPayload = (await idbGetPayload(q.id)) ||
                              (await idbGetPayload(q.id?.replace(/^q_/, ''))) ||
                              (await idbGetPayload(id)) ||
                              (await idbGetPayload(test?.id)) ||
                              (await idbGetPayload(testQuestionIds[0]));
          if (fullPayload) {
            payload = fullPayload;
          }
        }
        return { ...q, contentPayload: payload };
      }));
      setTestQuestions(enriched);
    }
    loadFullPayloads();
  }, [rawTestQuestions, id, test]);

  useEffect(() => {
    if (test?.sourceType === 'trackedBook') {
      navigate(`/book-quiz/${id}?studentId=${new URLSearchParams(location.search).get('studentId')}`, { replace: true });
    }
  }, [test, id, navigate, location.search]);

  useEffect(() => {
    if (test && test.sourceType !== 'trackedBook' && timeLeft === null && !savedState) {
      const initialTime = (test.time || (testQuestions.length * 2)) * 60;
      setTimeLeft(initialTime > 0 ? initialTime : 3600);
    }
  }, [test, testQuestions.length, timeLeft, savedState]);

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
    };
    localStorage.setItem(`quiz_state_${id}`, JSON.stringify(stateToSave));
  }, [id, currentQuestionIdx, studentAnswers, timeLeft, isFinished]);

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

  if (!test) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Test bulunamadı.</div>;
  if (testQuestions.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Bu testin içerisinde soru bulunmuyor.</h2>
        <div style={{ textAlign: 'left', background: '#f1f5f9', padding: '1rem', marginTop: '1rem', borderRadius: '8px' }}>
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
    setStudentAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: idx
    }));
  };

  const handleOpenAnswerChange = (val) => {
    setStudentAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: val
    }));
  };

  const handleBundleOptionSelect = (subIndex, optIdx) => {
    setStudentAnswers(prev => {
      const currentBundleAnswers = prev[currentQuestion.id] || {};
      return {
        ...prev,
        [currentQuestion.id]: {
          ...currentBundleAnswers,
          [subIndex]: optIdx
        }
      };
    });
  };

  async function handleFinishTest(autoSubmit = false) {
    if (!autoSubmit && !showFinishModal) {
      setShowFinishModal(true);
      return;
    }
    
    setIsFinished(true);
    setShowFinishModal(false);
    
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;
    
    const collected = [];
    const wrongList = [];

    testQuestions.forEach(q => {
      const ans = studentAnswers[q.id];
      
      if (q.isBundle) {
        const bundleAns = ans || {};
        const answerKey = q.answerKey || [];
        
        for (let i = 0; i < q.questionCount; i++) {
          const userAnsIdx = bundleAns[i];
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
              isCorrect: false, // Blank counts as wrong/missed for pool
              earnedPoints: 0
            });
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
            wrongList.push({ qId: q.id, isBundle: false });
          }
          collected.push({
            questionId: q.id,
            type: 'coktan_secmeli',
            isBundle: false,
            userAnswer: ans,
            correctAnswer: q.correctAnswer,
            isCorrect: isCorrect,
            earnedPoints: isCorrect ? 10 : 0
          });
        } else {
          blankCount++;
          wrongList.push({ qId: q.id, isBundle: false });
          collected.push({
            questionId: q.id,
            type: 'coktan_secmeli',
            isBundle: false,
            userAnswer: null,
            correctAnswer: q.correctAnswer,
            isCorrect: false,
            earnedPoints: 0
          });
        }
      } else {
        // Open-ended
        if (ans && ans.trim().length > 0) {
          pendingCount++;
          collected.push({
            questionId: q.id,
            type: 'acik_uclu',
            isBundle: false,
            userAnswerText: ans,
            isCorrect: null, // Pending evaluation
            earnedPoints: 0
          });
        } else {
          blankCount++;
          collected.push({
            questionId: q.id,
            type: 'acik_uclu',
            isBundle: false,
            userAnswerText: null,
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
      testId: test.id,
      testTitle: test.title,
      studentId: student.id,
      studentName: student.name,
      isHomework: isHomework,
      status: finalStatus,
      score: totalScore,
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

    if (q.questionsList && q.questionsList.length > 0) {
      const bundleAns = studentAnswers[q.id] || {};
      return (
        <div style={{ padding: '1.25rem', background: '#f8fafc', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          {q.questionsList.map((qItem, iIdx) => {
            const userSel = bundleAns[iIdx];
            return (
              <div key={iIdx} style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.8rem', padding: '0.2rem 0.65rem', borderRadius: '6px' }}>
                    Soru {iIdx + 1}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                  {qItem.questionText}
                </h4>

                {qItem.options && qItem.options.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.65rem' }}>
                    {qItem.options.map((opt, oIdx) => {
                      const isSelected = userSel === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleBundleOptionSelect(iIdx, oIdx)}
                          style={{
                            padding: '0.75rem 1rem', borderRadius: '0.75rem',
                            border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            background: isSelected ? '#e0e7ff' : 'white',
                            color: isSelected ? '#3730a3' : '#334155',
                            fontWeight: isSelected ? 900 : 700,
                            textAlign: 'left', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? '#4f46e5' : '#f1f5f9', color: isSelected ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {subQuestions.map((qItem, sIdx) => (
            <div key={sIdx} style={{ background: 'white', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontWeight: 900, color: '#4f46e5', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Soru {sIdx + 1}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                {qItem.questionText || `Soru ${sIdx + 1}`}
              </div>
              {qItem.options && qItem.options.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {qItem.options.map((optText, oIdx) => (
                    <div key={oIdx} style={{ background: '#f1f5f9', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#cbd5e1', color: '#1e293b', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{optText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    switch (q.contentType) {
      case 'gorsel': return <div className="q-preview-gorsel"><img src={q.contentPayload} alt="Soru Görseli" style={{maxWidth: '100%', borderRadius: 'var(--border-radius-md)'}} /></div>;
      case 'pdf': {
        return (
          <PdfViewerWithControls
            payload={q.contentPayload}
            title={test?.title || "PDF Soru Dokümanı"}
            height="100%"
          />
        );
      }
      case 'html': return <iframe srcDoc={q.contentPayload} title="HTML Soru" style={{width: '100%', height: '100%', minHeight: '80vh', border: 'none'}}></iframe>;
      default: return null;
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
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-text-muted)', lineHeight: 1 }}>{finalStats.blank}</div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Boş</div>
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
    const answeredCount = Object.keys(bundleAns).length;
    const totalCount = currentQuestion?.questionCount || testQuestions.length || 1;

    return (
      <div className="mobile-quiz-runner">
        {/* Modals */}
        {showFinishModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content card glass animate-fade-in" style={{ width: '90%', maxWidth: '380px', textAlign: 'center', padding: '1.5rem', background: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <h3 style={{ marginBottom: '0.75rem', color: '#1e293b', fontWeight: 900 }}>Testi Bitir</h3>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#475569' }}>Testi bitirmek istediğinize emin misiniz? <br/><br/>Seçimleriniz kaydedilecek ve değerlendirilecektir.</p>
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
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>
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
              <div className="mobile-optic-grid" style={{ height: `calc(${100 - mobileSplitRatio}% - 14px)`, background: '#f1f5f9' }}>
                <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Optik Form ({answeredCount}/{totalCount})</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>↕️ Çizgiyi kaydırarak alanı ayarlayın</span>
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
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                  📝 Hızlı Optik Cevap Anahtarı
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileOpticDrawer(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mobile-optic-grid" style={{ maxHeight: '60vh' }}>
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
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- BUNDLE VIEW (PDF / HTML Multi-question) ---
  if (currentQuestion?.isBundle) {
    const bundleAns = studentAnswers[currentQuestion.id] || {};
    
    return (
      <>
        {/* Modals */}
        {showFinishModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content card glass animate-fade-in" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
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
          
          <div className="quiz-toolbar">
          <button className="btn-icon" title="Mobil Görünüm" onClick={() => setIsMobile(!isMobile)}>
            📱
          </button>
          <button className="btn-icon" title="Optik Formu Gizle/Göster" onClick={() => setShowOptic(!showOptic)}>
            {showOptic ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
          <button className="btn-icon" title="Yerleşimi Değiştir" onClick={() => {
            setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
            setSplitRatio(50);
          }}>
            {layoutMode === 'horizontal' ? <LayoutPanelTop size={20} /> : <Layout size={20} />}
          </button>
          <button className="btn-icon" title="Tam Ekran" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        <div className="quiz-header card glass" style={{ marginBottom: isFullscreen ? '1rem' : '2rem' }}>
          <div className="quiz-progress">Bölüm {currentQuestionIdx + 1} / {testQuestions.length} (Çoklu Soru Paketi)</div>
          <div className="quiz-timer"><Clock size={20} color="var(--color-secondary)" /> <span>{formatTime(timeLeft)}</span></div>
        </div>

        <div className={`bundle-layout ${layoutMode}`}>
          <div className="bundle-content" style={{ flex: showOptic ? `0 0 ${splitRatio}%` : '1', padding: 0, display: 'flex' }}>
            <DrawingOverlay>
              {renderContentPreview(currentQuestion)}
            </DrawingOverlay>
          </div>
          
          {showOptic && (
            <div 
              className={layoutMode === 'horizontal' ? 'resizer-horizontal' : 'resizer-vertical'}
              onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            >
              {layoutMode === 'horizontal' ? <GripVertical size={16} color="#ccc" /> : <GripHorizontal size={16} color="#ccc" />}
            </div>
          )}

          {showOptic && (
            <div className="bundle-optic" style={{ flex: '1' }}>
              <h3 style={{marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem'}}>Optik Form</h3>
              <div className="optic-grid">
                {Array.from({length: currentQuestion.questionCount}).map((_, i) => {
                
                return (
                  <div key={i} className="optic-row">
                    <span className="optic-num">{i + 1}.</span>
                    <div className="optic-options">
                      {[0,1,2,3,4].map(optIdx => {
                        const letter = String.fromCharCode(65 + optIdx);
                        let bubbleClass = "optic-bubble";
                        
                        if (bundleAns[i] === optIdx) {
                          bubbleClass += " selected";
                        }

                        return (
                          <button 
                            key={optIdx} 
                            className={bubbleClass} 
                            onClick={() => handleBundleOptionSelect(i, optIdx)}
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
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {testQuestions.length > 1 && (
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={handlePrev} 
                  disabled={currentQuestionIdx === 0}
                >
                  <ChevronLeft size={18}/> Önceki Bölüm
                </button>
              )}
              
              {currentQuestionIdx < testQuestions.length - 1 ? (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleNext}>
                  Sonraki Bölüm <ChevronRight size={18}/>
                </button>
              ) : (
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleFinishTest(false)}>
                  Testi Bitir <CheckCircle style={{marginLeft: '0.5rem'}} size={20} />
                </button>
              )}
            </div>
          </div>
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
          <div className="modal-content card glass animate-fade-in" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
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
        
        <div className="quiz-toolbar">
        <button className="btn-icon" title="Tam Ekran" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      <div className="quiz-header card glass" style={{ marginBottom: isFullscreen ? '1rem' : '2rem' }}>
        <div className="quiz-progress">Soru {currentQuestionIdx + 1} / {testQuestions.length}</div>
        <div className="quiz-timer"><Clock size={20} color="var(--color-secondary)" /> <span>{formatTime(timeLeft)}</span></div>
      </div>

      <div className="card glass question-card" style={{ flex: isFullscreen ? 1 : 'none', overflowY: isFullscreen ? 'auto' : 'visible', display: 'flex', flexDirection: 'column' }}>
        {currentQuestion.contentType !== 'text' && (
          <div style={{ marginBottom: '1.5rem', flex: isFullscreen ? 1 : 'none', display: 'flex', flexDirection: 'column', height: isFullscreen ? '100%' : '80vh' }}>
            <DrawingOverlay>
              {renderContentPreview(currentQuestion)}
            </DrawingOverlay>
          </div>
        )}
        
        {currentQuestion.questionText && <h3 className="question-text">{currentQuestion.questionText}</h3>}
        
        {currentQuestion.type === 'coktan_secmeli' ? (
          <div className="options-grid">
            {(currentQuestion.options || ['A','B','C','D']).map((opt, idx) => {
              let className = "option-btn";
              if (idx === ans) {
                className += " selected";
              }

              return (
                <button 
                  key={idx} 
                  className={className}
                  onClick={() => handleOptionSelect(idx)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span className="option-text">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="open-ended-container">
            <textarea 
              rows="5" 
              placeholder="Cevabınızı buraya yazınız..." 
              value={ans || ''}
              onChange={e => handleOpenAnswerChange(e.target.value)}
              className="open-textarea"
            ></textarea>
          </div>
        )}
        
        <div className="quiz-actions animate-fade-in" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          {testQuestions.length > 1 && (
            <button 
              className="btn btn-secondary btn-lg" 
              style={{ flex: 1 }} 
              onClick={handlePrev}
              disabled={currentQuestionIdx === 0}
            >
              <ChevronLeft /> Önceki Soru
            </button>
          )}
          
          {currentQuestionIdx < testQuestions.length - 1 ? (
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleNext}>
              Sonraki Soru <ChevronRight />
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" style={{ flex: 1, background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleFinishTest(false)}>
              Testi Bitir <CheckCircle style={{marginLeft: '0.5rem'}} size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
