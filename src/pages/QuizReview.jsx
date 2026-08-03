import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { CheckCircle, XCircle, ArrowLeft, Clock3, Maximize, Minimize, RotateCcw } from 'lucide-react';
import DrawingOverlay from '../components/DrawingOverlay';
import { getEmbeddablePdfUrl as getEmbeddableUrl } from '../utils/pdfUtils';
import { idbGetPayload } from '../services/indexedDbService';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';
import './QuizRunner.css';

export default function QuizReview() {
  const params = useParams();
  const id = params.submissionId || params.id || '';
  const navigate = useNavigate();
  const location = useLocation();
  const { submissions } = useEvaluation();
  const { questions } = useQuestionBank();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [enrichedQuestions, setEnrichedQuestions] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [isReviewed, setIsReviewed] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestReviewedSubmissions');
      const set = saved ? new Set(JSON.parse(saved)) : new Set();
      return set.has(id);
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const submission = submissions.find(s => s.id === id);

  const baseQuestions = useMemo(() => {
    if (!submission || !submission.answers) return [];
    const groupedAnswers = {};
    submission.answers.forEach(ans => {
      if (!groupedAnswers[ans.questionId]) groupedAnswers[ans.questionId] = [];
      groupedAnswers[ans.questionId].push(ans);
    });
    return Object.keys(groupedAnswers).map(qId => questions.find(q => q.id === qId)).filter(Boolean);
  }, [submission?.id, JSON.stringify(submission?.answers), questions]);

  const loadedSubIdRef = useRef(null);
  useEffect(() => {
    let isSubscribed = true;
    async function loadFullPayloads() {
      if (baseQuestions.length === 0) {
        setEnrichedQuestions([]);
        return;
      }

      const currentKey = `${id}-${baseQuestions.map(q => q.id).join(',')}`;
      if (loadedSubIdRef.current === currentKey) return;

      const enriched = await Promise.all(baseQuestions.map(async (q) => {
        let payload = q.contentPayload;
        if (!payload || payload === '[STORED_IN_INDEXEDDB]' || (typeof payload === 'string' && payload.includes('[LOCALSTORAGE_CACHE]'))) {
          const fullPayload = await idbGetPayload(q.id);
          if (fullPayload) {
            payload = fullPayload;
          }
        }
        return { ...q, contentPayload: payload };
      }));

      if (isSubscribed) {
        loadedSubIdRef.current = currentKey;
        setEnrichedQuestions(enriched);
      }
    }
    loadFullPayloads();
    return () => { isSubscribed = false; };
  }, [baseQuestions, id]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from, { state: { subject: location.state.subject } });
    } else {
      navigate('/student');
    }
  };

  if (!submission) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center', fontWeight: 800 }}>Sonuç bulunamadı.</div>;
  }

  const isPending = submission.status === 'pending_evaluation';

  const renderContentPreview = (q) => {
    if (q.contentType === 'pdf') {
      return <PdfViewerWithControls payload={q.contentPayload} title={q.title || "PDF Soru Dokümanı"} height="100%" />;
    }
    switch (q.contentType) {
      case 'gorsel': {
        const urls = (q.imageUrls && q.imageUrls.length > 0) ? q.imageUrls : [q.contentPayload];
        return (
          <div className="q-preview-gorsel" style={{ marginBottom: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            {urls.map((url, idx) => (
              <img key={idx} src={url} alt={`Soru Görseli ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '0.75rem', objectFit: 'contain', border: '1px solid #cbd5e1' }} />
            ))}
          </div>
        );
      }
      case 'html':
        return <HtmlViewerWithControls payload={q.contentPayload} title={q.title || "HTML Soru Dokümanı"} height="100%" />;
      default:
        return null;
    }
  };

  const groupedAnswers = {};
  submission.answers.forEach(ans => {
    if (!groupedAnswers[ans.questionId]) groupedAnswers[ans.questionId] = [];
    groupedAnswers[ans.questionId].push(ans);
  });

  const uniqueQuestions = enrichedQuestions;

  const stats = submission.answers.reduce((acc, ans) => {
    if (ans.isCorrect === true) {
      acc.correct++;
    } else if (ans.isCorrect === null) {
      acc.pending++;
    } else {
      if (ans.type === 'coktan_secmeli' || ans.isBundle) {
        if (ans.userAnswer === null || ans.userAnswer === undefined) acc.blank++;
        else acc.wrong++;
      } else {
        if (!ans.userAnswerText || ans.userAnswerText.trim() === '') acc.blank++;
        else acc.wrong++;
      }
    }
    return acc;
  }, { correct: 0, wrong: 0, blank: 0, pending: 0, total: submission.answers.length });

  const successRate = stats.total > 0 ? Math.round((stats.correct / (stats.total - stats.pending)) * 100) : 0;

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

  const formatDisplayTitle = (rawTitle) => {
    if (!rawTitle) return 'Test İncelemesi';
    const cleaned = rawTitle.replace(/^json\s*[-:_]\s*/i, '').replace(/^json$/i, '').trim();
    if (!cleaned) return 'Test İncelemesi';
    return `${cleaned} - Test İncelemesi`;
  };

  const toggleTestReviewed = () => {
    try {
      const saved = localStorage.getItem('eTestReviewedSubmissions');
      const set = saved ? new Set(JSON.parse(saved)) : new Set();
      if (set.has(id)) {
        set.delete(id);
        setIsReviewed(false);
      } else {
        set.add(id);
        setIsReviewed(true);
      }
      localStorage.setItem('eTestReviewedSubmissions', JSON.stringify(Array.from(set)));
    } catch (e) {}
  };

  const handleRetakeQuiz = () => {
    if (!submission) return;
    if (!window.confirm("Bu sınavı baştan tekrar çözmek istiyor musunuz? Yeni bir çözüm oturumu başlatılacaktır.")) return;

    const targetTestId = submission.testId || submission.hwId || submission.id;
    const stId = submission.studentId;

    let retakeUrl = `/quiz/${targetTestId}?studentId=${stId}&retake=true`;
    if (submission.type === 'physicalExam') {
      retakeUrl = `/physical-exam/${targetTestId}?studentId=${stId}&retake=true`;
    } else if (submission.bookTestId || submission.sourceType === 'trackedBook') {
      retakeUrl = `/book-quiz/${targetTestId}?studentId=${stId}&retake=true`;
    }
    navigate(retakeUrl);
  };

  return (
    <div className={`container quiz-container animate-fade-in ${isFullscreen ? 'fullscreen-mode' : ''}`} style={{ maxWidth: isFullscreen ? '100vw' : '1400px', width: isFullscreen ? '100vw' : (isMobile ? '100%' : '95%'), margin: isFullscreen ? '0' : (isMobile ? '0 auto' : '2rem auto'), padding: isMobile ? '0.75rem' : '1rem' }}>
      
      {!isFullscreen && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem', fontWeight: 800 }} onClick={handleBack}>
            <ArrowLeft size={18} /> Geri Dön
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleRetakeQuiz}
              style={{
                background: '#eef2ff',
                color: '#4f46e5',
                border: '1.5px solid #c7d2fe',
                padding: '0.7rem 1.15rem',
                borderRadius: '0.75rem',
                fontWeight: 900,
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <RotateCcw size={18} />
              <span>Sınavı Tekrar Çöz</span>
            </button>

            <button
              onClick={toggleTestReviewed}
              style={{
                width: isMobile ? '100%' : 'auto',
                background: isReviewed ? '#dcfce7' : '#10b981',
                color: isReviewed ? '#166534' : 'white',
                border: isReviewed ? '2px solid #86efac' : 'none',
                padding: '0.7rem 1.25rem',
                borderRadius: '0.75rem',
                fontWeight: 900,
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justify: 'center',
                gap: '0.5rem',
                boxShadow: isReviewed ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
                transition: 'all 0.2s'
              }}
            >
              <CheckCircle size={20} color={isReviewed ? '#166534' : 'white'} />
              <span>{isReviewed ? '✓ Yanlışlar ve Boşlar Kontrol Edildi' : '🟩 Yanlışları ve Boşları Kontrol Ettim'}</span>
            </button>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="quiz-toolbar">
          <button className="btn-icon" title="Tam Ekrandan Çık" onClick={toggleFullscreen}>
            <Minimize size={20} />
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="quiz-header card glass" style={{ marginBottom: isFullscreen ? '1rem' : '1.5rem', padding: isMobile ? '1rem' : '1.5rem', display: isFullscreen ? 'none' : 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
          <h2 style={{ fontSize: isMobile ? '1.15rem' : '1.5rem', margin: 0, fontWeight: 900, color: '#0f172a' }}>{formatDisplayTitle(submission.testTitle)}</h2>
          <button className="btn-icon" onClick={toggleFullscreen} title="Tam Ekran" style={{ background: 'rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <Maximize size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.75rem', marginTop: '0.85rem' }}>
          <div>
            <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 800 }}>DURUM</div>
            {isPending ? (
              <div style={{ color: 'var(--color-secondary)', fontWeight: 900, fontSize: isMobile ? '0.85rem' : '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock3 size={16} /> Değerlendirme Bekliyor
              </div>
            ) : (
              <div style={{ color: '#10b981', fontWeight: 900, fontSize: isMobile ? '0.85rem' : '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={16} /> Tamamlandı
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 800 }}>TOPLAM PUAN</div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 900, color: '#4f46e5' }}>
              {isPending ? '?' : submission.score}
            </div>
          </div>
        </div>
      </div>

      {/* Sleek Touch-Optimized Stat Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: isMobile ? '0.65rem' : '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card glass" style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1.25rem', borderBottom: '4px solid #10b981', background: '#ecfdf5' }}>
          <div style={{ fontSize: isMobile ? '1.7rem' : '2.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{stats.correct}</div>
          <div style={{ fontWeight: 800, color: '#047857', fontSize: '0.75rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>Doğru</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1.25rem', borderBottom: '4px solid #ef4444', background: '#fef2f2' }}>
          <div style={{ fontSize: isMobile ? '1.7rem' : '2.5rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{stats.wrong}</div>
          <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>Yanlış</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1.25rem', borderBottom: '4px solid #64748b', background: '#f8fafc' }}>
          <div style={{ fontSize: isMobile ? '1.7rem' : '2.5rem', fontWeight: 900, color: '#64748b', lineHeight: 1 }}>{stats.blank}</div>
          <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.75rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>Boş</div>
        </div>
        {stats.pending > 0 && (
          <div className="card glass" style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1.25rem', borderBottom: '4px solid #f59e0b', background: '#fffbeb' }}>
            <div style={{ fontSize: isMobile ? '1.7rem' : '2.5rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{stats.pending}</div>
            <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.75rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>Bekleyen</div>
          </div>
        )}
        <div className="card glass" style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1.25rem', borderBottom: '4px solid #6366f1', background: '#e0e7ff' }}>
          <div style={{ fontSize: isMobile ? '1.7rem' : '2.5rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1 }}>%{isNaN(successRate) ? 0 : successRate}</div>
          <div style={{ fontWeight: 800, color: '#3730a3', fontSize: '0.75rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>Başarı</div>
        </div>
      </div>

      {/* Main Review Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: isFullscreen ? 'auto' : 'visible', flex: isFullscreen ? 1 : 'none', padding: isFullscreen ? '1rem' : 0 }}>
        {uniqueQuestions.map((q, qIdx) => {
          const qAnswers = groupedAnswers[q.id];
          const isBundle = q.isBundle;

          if (isBundle) {
            // DIRECT QUESTION REVIEW FOR JSON / WRITTEN TEST BUNDLES
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
                <div key={q.id} className="card glass" style={{ borderLeft: '4px solid #4f46e5', marginBottom: '1.25rem', padding: isMobile ? '1rem' : '1.75rem' }}>
                  <div style={{ fontWeight: 900, color: '#312e81', fontSize: isMobile ? '1rem' : '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
                    <span>📚 {formatDisplayTitle(q.title || submission.testTitle)}</span>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.8rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                      Toplam {subQuestions.length} Soru
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {subQuestions.map((qItem, sIdx) => {
                      const ans = qAnswers.find(a => a.subIndex === sIdx) || qAnswers[sIdx];
                      const userAnsIdx = ans?.userAnswer;
                      let correctAnsIdx = qItem.correctAnswer;
                      if (typeof correctAnsIdx === 'string') {
                        const upper = correctAnsIdx.trim().toUpperCase();
                        if (upper === 'A') correctAnsIdx = 0;
                        else if (upper === 'B') correctAnsIdx = 1;
                        else if (upper === 'C') correctAnsIdx = 2;
                        else if (upper === 'D') correctAnsIdx = 3;
                        else if (upper === 'E') correctAnsIdx = 4;
                      }
                      if (correctAnsIdx === undefined && ans?.correctAnswer !== undefined) {
                        correctAnsIdx = ans.correctAnswer;
                      }

                      const isCorrect = ans?.isCorrect;
                      const isPending = ans?.isCorrect === null || ans?.isCorrect === undefined;
                      const isBlank = (ans?.userAnswer === null || ans?.userAnswer === undefined) && (!ans?.userAnswerText || ans?.userAnswerText.trim() === '');

                      let statusColor = '#f59e0b';
                      let statusText = '⏳ Değerlendiriliyor';
                      if (!isPending) {
                        if (isCorrect === true) {
                          statusColor = '#10b981';
                          statusText = '✓ Doğru (+10)';
                        } else if (isBlank && (ans?.type === 'coktan_secmeli' || ans?.isBundle)) {
                          statusColor = '#64748b';
                          statusText = '⚪ Boş';
                        } else {
                          statusColor = '#ef4444';
                          statusText = '✕ Yanlış / 0 Puan';
                        }
                      }

                      return (
                        <div key={sIdx} style={{ background: 'white', padding: isMobile ? '1rem' : '1.25rem', borderRadius: '1rem', border: `2px solid ${statusColor}`, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>
                              Soru {sIdx + 1}
                            </span>
                            <span style={{ background: isCorrect ? '#dcfce7' : (isPending ? '#fef3c7' : (isBlank ? '#f1f5f9' : '#fee2e2')), color: isCorrect ? '#166534' : (isPending ? '#92400e' : (isBlank ? '#475569' : '#991b1b')), fontWeight: 900, fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                              {statusText}
                            </span>
                          </div>

                          <h4 style={{ fontSize: isMobile ? '0.98rem' : '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                            {qItem.questionText || `Soru ${sIdx + 1}`}
                          </h4>

                          {/* Image for Visual Subquestion */}
                          {qItem.contentPayload && (
                            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                              <img
                                src={qItem.contentPayload}
                                alt={`Soru ${sIdx + 1} Görseli`}
                                style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '0.75rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                              />
                            </div>
                          )}

                          {/* Options for Multiple Choice */}
                          {qItem.options && qItem.options.length > 0 && q.type !== 'acik_uclu' && qItem.type !== 'acik_uclu' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.65rem' }}>
                              {qItem.options.map((optText, oIdx) => {
                                const isUserSelected = userAnsIdx === oIdx;
                                const isCorrectOpt = correctAnsIdx === oIdx;

                                let optBg = '#f8fafc';
                                let optBorder = '1px solid #e2e8f0';
                                let optColor = '#334155';

                                if (isCorrectOpt) {
                                  optBg = '#ecfdf5';
                                  optBorder = '2px solid #10b981';
                                  optColor = '#065f46';
                                } else if (isUserSelected && !isCorrectOpt) {
                                  optBg = '#fef2f2';
                                  optBorder = '2px solid #ef4444';
                                  optColor = '#991b1b';
                                }

                                return (
                                  <div
                                    key={oIdx}
                                    style={{
                                      padding: '0.65rem 0.85rem',
                                      borderRadius: '0.75rem',
                                      background: optBg,
                                      border: optBorder,
                                      color: optColor,
                                      fontWeight: isUserSelected || isCorrectOpt ? 800 : 600,
                                      fontSize: '0.88rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justify: 'space-between',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isCorrectOpt ? '#10b981' : (isUserSelected ? '#ef4444' : '#cbd5e1'), color: 'white', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span>{optText}</span>
                                    </div>
                                    {isCorrectOpt && <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#10b981', flexShrink: 0 }}>✓ Doğru Şık</span>}
                                    {isUserSelected && !isCorrectOpt && <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ef4444', flexShrink: 0 }}>✕ Seçiminiz</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Text Answer for Open Ended */}
                          {(!qItem.options || qItem.options.length === 0 || qItem.type === 'acik_uclu' || q.type === 'acik_uclu') && (
                            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>📝 Öğrencinin Yazılı Cevabı (Açık Uçlu):</span>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>
                                {ans?.userAnswerText || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>(Boş Bırakılmış / Yanıt Verilmedi)</span>}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // PDF / HTML Bundle Review
            return (
              <div key={q.id} className="card glass" style={{ borderLeft: '4px solid #4f46e5', padding: isMobile ? '0.85rem' : '1.5rem' }}>
                <div style={{ fontWeight: 900, color: '#4f46e5', marginBottom: '1rem', fontSize: isMobile ? '0.95rem' : '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📚 Bölüm {qIdx + 1} (Çoklu Soru Paketi)</span>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.8rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                    {qAnswers.length} Soru
                  </span>
                </div>
                <div className="bundle-layout" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.25rem', alignItems: 'stretch' }}>
                  <div style={{ flex: isMobile ? 'none' : '2', width: '100%', height: isMobile ? '450px' : '75vh', minHeight: '350px' }}>
                    <DrawingOverlay>
                      {renderContentPreview(q)}
                    </DrawingOverlay>
                  </div>
                  <div style={{ flex: isMobile ? 'none' : '1', width: '100%', background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', overflowY: 'auto', maxHeight: isMobile ? '380px' : '75vh' }}>
                    <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #cbd5e1', paddingBottom: '0.5rem', fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>Optik Form Sonuçları</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {qAnswers.map((ans, idx) => {
                        const isCorrect = ans.isCorrect === true;
                        const isBlank = ans.userAnswer === null || ans.userAnswer === undefined;
                        const statusColor = isCorrect ? '#10b981' : (isBlank ? '#64748b' : '#ef4444');
                        const statusBg = isCorrect ? '#ecfdf5' : (isBlank ? '#f8fafc' : '#fef2f2');
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: statusBg, padding: '0.75rem 1rem', borderRadius: '0.75rem', borderLeft: `4px solid ${statusColor}`, border: `1px solid ${statusColor}33` }}>
                            <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.9rem' }}>Soru {ans.subIndex + 1}</span>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>CEVABINIZ</div>
                              <div style={{ fontWeight: 900, color: statusColor, fontSize: '0.95rem' }}>
                                {ans.userAnswer !== null && ans.userAnswer !== undefined ? String.fromCharCode(65 + ans.userAnswer) : 'Boş'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>DOĞRU</div>
                              <div style={{ fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                {ans.correctAnswer !== null && ans.correctAnswer !== undefined ? String.fromCharCode(65 + ans.correctAnswer) : '?'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Single question (Text or Image)
          const ans = qAnswers[0];
          let statusColor = '#64748b';
          let statusIcon = <Clock3 size={18} />;
          let statusText = 'Değerlendirme Bekliyor';

          const isBlank = ans.userAnswer === null || ans.userAnswer === undefined || (ans.type === 'acik_uclu' && (!ans.userAnswerText || ans.userAnswerText.trim() === ''));

          if (ans.isCorrect === true) {
            statusColor = '#10b981';
            statusIcon = <CheckCircle size={18} />;
            statusText = 'Doğru';
          } else if (ans.isCorrect === false) {
            if (isBlank) {
              statusColor = '#64748b';
              statusIcon = <Clock3 size={18} />;
              statusText = 'Boş Bırakıldı';
            } else {
              statusColor = '#ef4444';
              statusIcon = <XCircle size={18} />;
              statusText = 'Yanlış';
            }
          }

          return (
            <div key={q.id} className="card glass" style={{ borderLeft: `4px solid ${statusColor}`, padding: isMobile ? '1rem' : '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 900, color: '#4f46e5', fontSize: '1rem' }}>Soru {qIdx + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: statusColor, fontWeight: 900, fontSize: '0.85rem', background: `${statusColor}15`, padding: '0.25rem 0.65rem', borderRadius: '20px' }}>
                  {statusIcon} {statusText}
                </div>
              </div>

              {q.contentType !== 'text' && (
                <div style={{ height: isMobile ? '450px' : '75vh', marginBottom: '1rem' }}>
                  <DrawingOverlay>
                    {renderContentPreview(q)}
                  </DrawingOverlay>
                </div>
              )}
              
              {q.questionText && <div style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', marginBottom: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{q.questionText}</div>}

              {ans.type === 'coktan_secmeli' ? (
                <div style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>CEVABINIZ</div>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: statusColor }}>
                      {ans.userAnswer !== null && ans.userAnswer !== undefined ? String.fromCharCode(65 + ans.userAnswer) : 'Boş'}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#cbd5e1' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>DOĞRU CEVAP</div>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#10b981' }}>
                      {ans.correctAnswer !== null && ans.correctAnswer !== undefined ? String.fromCharCode(65 + ans.correctAnswer) : '?'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '0.35rem' }}>VERDİĞİNİZ CEVAP (AÇIK UÇLU)</div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                    {ans.userAnswerText || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>(Boş Bırakılmış)</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {uniqueQuestions.length === 0 && submission.answers.length > 0 && (
          <div className="card glass" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', color: '#4f46e5', fontWeight: 900 }}>Optik Form İncelemesi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {submission.answers.map((ans, idx) => {
                const isPending = ans.isCorrect === null || ans.isCorrect === undefined;
                let statusColor = '#f59e0b';
                let statusText = '⏳ Değerlendirme Bekliyor';
                
                if (!isPending) {
                   if (ans.isCorrect === true) {
                     statusColor = '#10b981';
                     statusText = '✓ Doğru (+10)';
                   } else if (ans.isCorrect === false) {
                     statusColor = '#ef4444';
                     statusText = '✕ Yanlış (0 Puan)';
                   }
                }

                return (
                  <div key={idx} style={{ background: '#f8fafc', borderLeft: `4px solid ${statusColor}`, borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '28px', height: '28px', background: '#4f46e5', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem', flexShrink: 0 }}>
                      {ans.questionId || (idx + 1)}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      {isPending ? (
                        <>
                           <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>CEVABINIZ (AÇIK UÇLU)</div>
                           <div style={{ fontWeight: 700, whiteSpace: 'pre-wrap', fontSize: '0.88rem', color: '#1e293b' }}>{ans.userAnswer || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Boş bırakıldı</span>}</div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                             <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>CEVABINIZ</div>
                             <div style={{ fontWeight: 900, fontSize: '1rem', color: statusColor }}>
                               {ans.userAnswer !== null && ans.userAnswer !== undefined ? (typeof ans.userAnswer === 'number' ? String.fromCharCode(65 + ans.userAnswer) : ans.userAnswer) : 'Boş'}
                             </div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>DOĞRU CEVAP</div>
                             <div style={{ fontWeight: 900, fontSize: '1rem', color: '#10b981' }}>
                               {ans.correctAnswer !== null && ans.correctAnswer !== undefined ? (typeof ans.correctAnswer === 'number' ? String.fromCharCode(65 + ans.correctAnswer) : ans.correctAnswer) : '?'}
                             </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
