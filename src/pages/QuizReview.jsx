import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { CheckCircle, XCircle, ArrowLeft, Clock3, Maximize, Minimize } from 'lucide-react';
import DrawingOverlay from '../components/DrawingOverlay';
import { getEmbeddablePdfUrl as getEmbeddableUrl } from '../utils/pdfUtils';
import './QuizRunner.css';

export default function QuizReview() {
  const params = useParams();
  const id = params.submissionId || params.id || '';
  const navigate = useNavigate();
  const location = useLocation();
  const { submissions } = useEvaluation();
  const { questions } = useQuestionBank();
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from, { state: { subject: location.state.subject } });
    } else {
      // Fallback to student dashboard instead of blindly going back in history
      // which might reopen the finished test
      navigate('/student');
    }
  };

  const submission = submissions.find(s => s.id === id);

  if (!submission) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Sonuç bulunamadı.</div>;
  }

  const isPending = submission.status === 'pending_evaluation';

  const renderContentPreview = (q) => {
    switch (q.contentType) {
      case 'gorsel': return <div className="q-preview-gorsel" style={{marginBottom: '1rem'}}><img src={q.contentPayload} alt="Soru Görseli" style={{maxWidth: '100%', borderRadius: 'var(--border-radius-md)'}} /></div>;
      case 'pdf': return <iframe src={getEmbeddableUrl(q.contentPayload)} title="PDF Soru" style={{width: '100%', height: '100%', minHeight: '80vh', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem'}}></iframe>;
      case 'html': return <iframe srcDoc={q.contentPayload} title="HTML Soru" style={{width: '100%', height: '100%', minHeight: '80vh', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem'}}></iframe>;
      default: return null;
    }
  };

  // Group answers by question ID
  const groupedAnswers = {};
  submission.answers.forEach(ans => {
    if (!groupedAnswers[ans.questionId]) groupedAnswers[ans.questionId] = [];
    groupedAnswers[ans.questionId].push(ans);
  });

  const uniqueQuestions = Object.keys(groupedAnswers).map(qId => questions.find(q => q.id === qId)).filter(Boolean);

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

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatDisplayTitle = (rawTitle) => {
    if (!rawTitle) return 'Test İncelemesi';
    const cleaned = rawTitle.replace(/^json\s*[-:_]\s*/i, '').replace(/^json$/i, '').trim();
    if (!cleaned) return 'Test İncelemesi';
    return `${cleaned} - Test İncelemesi`;
  };

  const [isReviewed, setIsReviewed] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestReviewedSubmissions');
      const set = saved ? new Set(JSON.parse(saved)) : new Set();
      return set.has(id);
    } catch (e) {
      return false;
    }
  });

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

  return (
    <div className={`container quiz-container animate-fade-in ${isFullscreen ? 'fullscreen-mode' : ''}`} style={{ maxWidth: isFullscreen ? '100vw' : '1400px', width: isFullscreen ? '100vw' : '95%', margin: isFullscreen ? '0' : '2rem auto' }}>
      
      {!isFullscreen && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleBack}>
            <ArrowLeft size={18} /> Geri Dön
          </button>

          <button
            onClick={toggleTestReviewed}
            style={{
              background: isReviewed ? '#dcfce7' : '#10b981',
              color: isReviewed ? '#166534' : 'white',
              border: isReviewed ? '2px solid #86efac' : 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              fontWeight: 900,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isReviewed ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle size={20} color={isReviewed ? '#166534' : 'white'} />
            <span>{isReviewed ? '✓ Yanlışlar ve Boşlar Kontrol Edildi' : '🟩 Yanlışları ve Boşları Kontrol Ettim'}</span>
          </button>
        </div>
      )}

      {isFullscreen && (
        <div className="quiz-toolbar">
          <button className="btn-icon" title="Tam Ekrandan Çık" onClick={toggleFullscreen}>
            <Minimize size={20} />
          </button>
        </div>
      )}

      <div className="quiz-header card glass" style={{ marginBottom: isFullscreen ? '1rem' : '2rem', display: isFullscreen ? 'none' : 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>{formatDisplayTitle(submission.testTitle)}</h2>
          <button className="btn-icon" onClick={toggleFullscreen} title="Tam Ekran" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <Maximize size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Durum</div>
            {isPending ? (
              <div style={{ color: 'var(--color-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock3 size={18} /> Öğretmen Değerlendirmesi Bekleniyor
              </div>
            ) : (
              <div style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={18} /> Tamamlandı
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Toplam Puan</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {isPending ? '?' : submission.score}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card glass" style={{ textAlign: 'center', borderBottom: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{stats.correct}</div>
          <div className="text-muted" style={{ fontWeight: 600 }}>Doğru</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', borderBottom: '4px solid var(--color-error)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-error)' }}>{stats.wrong}</div>
          <div className="text-muted" style={{ fontWeight: 600 }}>Yanlış</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', borderBottom: '4px solid var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>{stats.blank}</div>
          <div className="text-muted" style={{ fontWeight: 600 }}>Boş</div>
        </div>
        {stats.pending > 0 && (
          <div className="card glass" style={{ textAlign: 'center', borderBottom: '4px solid var(--color-secondary)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{stats.pending}</div>
            <div className="text-muted" style={{ fontWeight: 600 }}>Bekleyen</div>
          </div>
        )}
        <div className="card glass" style={{ textAlign: 'center', borderBottom: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>%{isNaN(successRate) ? 0 : successRate}</div>
          <div className="text-muted" style={{ fontWeight: 600 }}>Başarı Oranı</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: isFullscreen ? 'auto' : 'visible', flex: isFullscreen ? 1 : 'none', padding: isFullscreen ? '1rem' : 0 }}>
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
                <div key={q.id} className="card glass" style={{ borderLeft: '4px solid #4f46e5', marginBottom: '1.5rem', padding: '1.75rem' }}>
                  <div style={{ fontWeight: 900, color: '#312e81', fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
                    <span>📚 {formatDisplayTitle(q.title || submission.testTitle)}</span>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px' }}>
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
                      const isPending = ans?.isCorrect === null || qItem.type === 'acik_uclu';
                      const isBlank = userAnsIdx === null || userAnsIdx === undefined;

                      let statusColor = '#64748b';
                      let statusText = 'Değerlendiriliyor';
                      if (!isPending) {
                        if (isCorrect === true) {
                          statusColor = '#10b981';
                          statusText = '✓ Doğru';
                        } else if (isBlank) {
                          statusColor = '#64748b';
                          statusText = '⚪ Boş';
                        } else {
                          statusColor = '#ef4444';
                          statusText = '✕ Yanlış';
                        }
                      }

                      return (
                        <div key={sIdx} style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', border: `2px solid ${statusColor}`, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>
                              Soru {sIdx + 1}
                            </span>
                            <span style={{ background: isCorrect ? '#dcfce7' : (isPending ? '#fef3c7' : (isBlank ? '#f1f5f9' : '#fee2e2')), color: isCorrect ? '#166534' : (isPending ? '#92400e' : (isBlank ? '#475569' : '#991b1b')), fontWeight: 900, fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                              {statusText}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                            {qItem.questionText || `Soru ${sIdx + 1}`}
                          </h4>

                          {/* Options for Multiple Choice */}
                          {qItem.options && qItem.options.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
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
                                      padding: '0.75rem 1rem',
                                      borderRadius: '0.75rem',
                                      background: optBg,
                                      border: optBorder,
                                      color: optColor,
                                      fontWeight: isUserSelected || isCorrectOpt ? 800 : 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justify: 'space-between'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isCorrectOpt ? '#10b981' : (isUserSelected ? '#ef4444' : '#cbd5e1'), color: 'white', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span>{optText}</span>
                                    </div>
                                    {isCorrectOpt && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981' }}>✓ Doğru Şık</span>}
                                    {isUserSelected && !isCorrectOpt && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ef4444' }}>✕ Seçiminiz</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Text Answer for Open Ended */}
                          {(!qItem.options || qItem.options.length === 0 || qItem.type === 'acik_uclu') && (
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>Öğrencinin Cevabı (Açık Uçlu):</span>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                {ans?.userAnswerText || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>(Boş Bırakılmış)</span>}
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
              <div key={q.id} className="card glass" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1rem' }}>Bölüm {qIdx + 1} (Çoklu Soru Paketi)</div>
                <div className="bundle-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 2, height: '80vh' }}>
                    <DrawingOverlay>
                      {renderContentPreview(q)}
                    </DrawingOverlay>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)' }}>
                    <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>Optik Form Sonuçları</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {qAnswers.map((ans, idx) => {
                        const statusColor = ans.isCorrect ? 'var(--color-success)' : 'var(--color-error)';
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.75rem', borderRadius: '4px', borderLeft: `3px solid ${statusColor}` }}>
                            <span style={{ fontWeight: 600 }}>{ans.subIndex + 1}.</span>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cevabınız</div>
                              <div style={{ fontWeight: 600, color: statusColor }}>{ans.userAnswer !== null ? String.fromCharCode(65 + ans.userAnswer) : 'Boş'}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Doğru</div>
                              <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>{ans.correctAnswer !== null ? String.fromCharCode(65 + ans.correctAnswer) : '?'}</div>
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
          let statusColor = 'var(--color-text-muted)';
          let statusIcon = <Clock3 size={20} />;
          let statusText = 'Değerlendirme Bekliyor';

          const isBlank = ans.userAnswer === null || ans.userAnswer === undefined || (ans.type === 'acik_uclu' && (!ans.userAnswerText || ans.userAnswerText.trim() === ''));

          if (ans.isCorrect === true) {
            statusColor = 'var(--color-success)';
            statusIcon = <CheckCircle size={20} />;
            statusText = 'Doğru';
          } else if (ans.isCorrect === false) {
            if (isBlank) {
              statusColor = 'var(--color-text-muted)';
              statusIcon = <Clock3 size={20} />;
              statusText = 'Boş Bırakıldı';
            } else {
              statusColor = 'var(--color-error)';
              statusIcon = <XCircle size={20} />;
              statusText = 'Yanlış';
            }
          }

          return (
            <div key={q.id} className="card glass" style={{ borderLeft: `4px solid ${statusColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Soru {qIdx + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusColor, fontWeight: 600 }}>
                  {statusIcon} {statusText}
                </div>
              </div>

              {q.contentType !== 'text' && (
                <div style={{ height: '80vh', marginBottom: '1rem' }}>
                  <DrawingOverlay>
                    {renderContentPreview(q)}
                  </DrawingOverlay>
                </div>
              )}
              
              {q.questionText && <div style={{ fontSize: '1.05rem', marginBottom: '1.5rem', fontWeight: 500 }}>{q.questionText}</div>}

              {ans.type === 'coktan_secmeli' ? (
                <div style={{ display: 'flex', gap: '2rem', background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '4px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Sizin Cevabınız</div>
                    <div style={{ fontWeight: 600, fontSize: '1.2rem', color: statusColor }}>
                      {ans.userAnswer !== null ? String.fromCharCode(65 + ans.userAnswer) : 'Boş'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Doğru Cevap</div>
                    <div style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--color-success)' }}>
                      {ans.correctAnswer !== null ? String.fromCharCode(65 + ans.correctAnswer) : '?'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Verdiğiniz Cevap (Açık Uçlu)</div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>{ans.userAnswerText || <span className="text-muted">(Boş Bırakılmış)</span>}</div>
                </div>
              )}
            </div>
          );
        })}
        {uniqueQuestions.length === 0 && submission.answers.length > 0 && (
          <div className="card glass">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Optik Form İncelemesi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {submission.answers.map((ans, idx) => {
                const isPending = ans.type === 'acik_uclu';
                let statusColor = 'var(--color-text-muted)';
                let statusText = 'Boş / Değerlendiriliyor';
                
                if (!isPending) {
                   if (ans.isCorrect === true) {
                     statusColor = 'var(--color-success)';
                     statusText = 'Doğru';
                   } else if (ans.isCorrect === false) {
                     statusColor = 'var(--color-error)';
                     statusText = 'Yanlış / Boş';
                   }
                }

                return (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.02)', borderLeft: `4px solid ${statusColor}`, borderRadius: 'var(--border-radius-sm)', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '30px', height: '30px', background: 'var(--color-primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                      {ans.questionId}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      {isPending ? (
                        <>
                           <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Cevabınız (Açık Uçlu)</div>
                           <div style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{ans.userAnswer || <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Boş bırakıldı</span>}</div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                           <div>
                             <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Cevabınız</div>
                             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: statusColor }}>{ans.userAnswer || 'Boş'}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Doğru Cevap</div>
                             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-success)' }}>{ans.correctAnswer || '?'}</div>
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
