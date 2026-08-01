import { useState } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { CheckCircle, XCircle, HelpCircle, Save, Clock3 } from 'lucide-react';
import './Dashboard.css';

export default function EvaluationManager() {
  const { submissions, evaluateAnswer, finalizeSubmission } = useEvaluation();
  const { questions } = useQuestionBank();
  
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  const pendingSubmissions = submissions.filter(sub => sub.status === 'pending_evaluation');
  const completedSubmissions = submissions.filter(sub => sub.status === 'completed');

  const activeSubmission = submissions.find(s => s.id === activeSubmissionId);

  // Show ONLY open-ended / written response answers for teacher evaluation (exclude auto-graded multiple choice questions)
  const allSubmissionAnswers = activeSubmission 
    ? (activeSubmission.answers || []).filter(ans => ans.type !== 'coktan_secmeli' && (ans.userAnswerText !== undefined || ans.type === 'acik_uclu' || ans.isCorrect === null)) 
    : [];
  
  // Pending ones for count
  const remainingPendingCount = allSubmissionAnswers.filter(ans => ans.isCorrect === null || ans.isCorrect === undefined).length;

  const handleEvaluate = (ans, isCorrectResult) => {
    evaluateAnswer(activeSubmissionId, ans.questionId, ans.isBundle, ans.subIndex, isCorrectResult);
  };

  const handleFinalize = () => {
    finalizeSubmission(activeSubmissionId);
    setActiveSubmissionId(null);
  };

  return (
    <div className="container dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Değerlendirme Merkezi ⚖️</h2>
          <p className="text-muted">Öğrencilerin açık uçlu cevaplarını okuyun ve notlandırın.</p>
        </div>
      </header>

      <div className="dashboard-content" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Side: Submissions List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <section>
            <h3 className="section-title">
              <Clock3 size={24} color="var(--color-error)" />
              Bekleyen Değerlendirmeler ({pendingSubmissions.length})
            </h3>
            <div className="card glass" style={{ padding: '0' }}>
              {pendingSubmissions.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Harika! Bekleyen kağıt yok.
                </div>
              ) : (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <tbody>
                    {pendingSubmissions.map(sub => (
                      <tr 
                        key={sub.id} 
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', background: activeSubmissionId === sub.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent' }}
                        onClick={() => setActiveSubmissionId(sub.id)}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{sub.studentName}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{sub.testTitle}</div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <span className="test-badge bg-error-light text-error">Değerlendirme Bekliyor</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section>
            <h3 className="section-title">
              <CheckCircle size={24} color="var(--color-success)" />
              Sonuçlandırılanlar ({completedSubmissions.length})
            </h3>
            <div className="card glass" style={{ padding: '0', opacity: 0.8 }}>
              {completedSubmissions.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Henüz test sonuçlandırılmadı.</div>
              ) : (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <tbody>
                    {completedSubmissions.map(sub => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{sub.studentName}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{sub.testTitle}</div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                          Puan: {sub.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

        </div>

        {/* Right Side: Evaluation Panel */}
        <div style={{ flex: 1.5, position: 'sticky', top: '20px' }}>
          {activeSubmission ? (
            <div className="card glass" style={{ border: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{activeSubmission.studentName}</h3>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{activeSubmission.testTitle} Sınavı Kağıdı</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="test-badge bg-primary-light text-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                    Kalan Soru: {remainingPendingCount} / {allSubmissionAnswers.length}
                  </div>
                </div>
              </div>

              {allSubmissionAnswers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '650px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {allSubmissionAnswers.map((ans, idx) => {
                    const q = questions.find(q => q.id === ans.questionId);
                    if (!q) return null;

                    let displayQuestionText = q.questionText || 'Açık Uçlu Soru';
                    let subItemPayload = null;

                    if ((q.contentType === 'json' || q.questionsList) && ans.subIndex !== undefined) {
                      let subQuestions = q.questionsList || [];
                      if (!subQuestions.length && q.contentPayload) {
                        try {
                          const parsed = JSON.parse(q.contentPayload);
                          if (Array.isArray(parsed)) subQuestions = parsed;
                        } catch (e) {
                          subQuestions = [];
                        }
                      }
                      if (subQuestions[ans.subIndex]) {
                        displayQuestionText = subQuestions[ans.subIndex].questionText || `Soru ${ans.subIndex + 1}`;
                        subItemPayload = subQuestions[ans.subIndex].contentPayload;
                      }
                    }

                    const isEvaluated = ans.isCorrect !== null;
                    const isCorrectVal = ans.isCorrect === true;

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          background: isEvaluated ? (isCorrectVal ? '#f0fdf4' : '#fef2f2') : 'rgba(0,0,0,0.02)', 
                          padding: '1.25rem', 
                          borderRadius: 'var(--border-radius-md)', 
                          border: isEvaluated ? (isCorrectVal ? '2px solid #10b981' : '2px solid #ef4444') : '1px solid rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                            Soru {ans.subIndex !== undefined ? ans.subIndex + 1 : idx + 1}:
                          </div>
                          {isEvaluated && (
                            <span style={{ 
                              background: isCorrectVal ? '#10b981' : '#ef4444', 
                              color: 'white', 
                              fontWeight: 900, 
                              fontSize: '0.75rem', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {isCorrectVal ? <><CheckCircle size={13} /> Doğru (+10 Puan)</> : <><XCircle size={13} /> Yanlış (0 Puan)</>}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {displayQuestionText}
                        </div>

                        {/* Image for Visual Question */}
                        {(subItemPayload || q.contentPayload) && (q.contentType === 'gorsel' || subItemPayload) && (
                          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            <img
                              src={subItemPayload || q.contentPayload}
                              alt="Soru Görseli"
                              style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                            />
                          </div>
                        )}
                        
                        <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Öğrencinin Cevabı:</div>
                        <div style={{ background: 'white', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', minHeight: '60px', marginBottom: '1.25rem', whiteSpace: 'pre-wrap', fontWeight: 700, color: '#1e293b' }}>
                          {ans.userAnswerText || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>(Boş Bırakılmış)</span>}
                        </div>
                        
                        {/* Evaluation Buttons - Clicked button stays marked, can be changed */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button"
                            className="btn" 
                            style={{ 
                              flex: 1, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justify: 'center', 
                              gap: '0.4rem',
                              background: isCorrectVal ? '#10b981' : '#ecfdf5',
                              color: isCorrectVal ? 'white' : '#047857',
                              border: isCorrectVal ? '2px solid #059669' : '1px solid #a7f3d0',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }} 
                            onClick={() => handleEvaluate(ans, true)}
                          >
                            <CheckCircle size={18} /> {isCorrectVal ? '✓ Doğru Olarak İşaretlendi' : 'Doğru Ver (+10)'}
                          </button>
                          
                          <button 
                            type="button"
                            className="btn" 
                            style={{ 
                              flex: 1, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justify: 'center', 
                              gap: '0.4rem',
                              background: (isEvaluated && !isCorrectVal) ? '#ef4444' : '#fef2f2',
                              color: (isEvaluated && !isCorrectVal) ? 'white' : '#b91c1c',
                              border: (isEvaluated && !isCorrectVal) ? '2px solid #dc2626' : '1px solid #fca5a5',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }} 
                            onClick={() => handleEvaluate(ans, false)}
                          >
                            <XCircle size={18} /> {(isEvaluated && !isCorrectVal) ? '✕ Yanlış Olarak İşaretlendi' : 'Yanlış / Boş (0)'}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Finalize Button */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <button 
                      className="btn btn-primary btn-lg" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justify: 'center', gap: '0.5rem', background: remainingPendingCount === 0 ? '#10b981' : '#4f46e5', borderColor: remainingPendingCount === 0 ? '#10b981' : '#4f46e5' }} 
                      onClick={handleFinalize}
                    >
                      <Save size={20} /> Sonucu Kaydet ve Öğrenciye Bildir
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ background: 'var(--color-success)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: 'white' }}>
                    <CheckCircle size={40} />
                  </div>
                  <h3>Tüm Sorular Değerlendirildi!</h3>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>Öğrencinin kağıdını sonuçlandırmak için onaylayın.</p>
                  <button className="btn btn-primary btn-lg" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={handleFinalize}>
                    <Save size={20} /> Sonucu Kaydet ve Öğrenciye Bildir
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card glass" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              <HelpCircle size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>İncelemek için sol taraftan bir kağıt seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
