import { useState } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, Save, Clock3, AlertCircle } from 'lucide-react';
import './Dashboard.css';

export default function EvaluationManager() {
  const { submissions, evaluateAnswer, finalizeSubmission } = useEvaluation();
  const { questions } = useQuestionBank();
  
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  const pendingSubmissions = submissions.filter(sub => sub.status === 'pending_evaluation');
  const completedSubmissions = submissions.filter(sub => sub.status === 'completed');

  const activeSubmission = submissions.find(s => s.id === activeSubmissionId);

  // We only care about pending (open-ended) answers in this view
  const pendingAnswers = activeSubmission 
    ? activeSubmission.answers.filter(ans => ans.isCorrect === null) 
    : [];

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
                <div className="test-badge bg-primary-light text-primary" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                  Kalan Soru: {pendingAnswers.length}
                </div>
              </div>

              {pendingAnswers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {pendingAnswers.map((ans, idx) => {
                    const q = questions.find(q => q.id === ans.questionId);
                    if (!q) return null;

                    let displayQuestionText = q.questionText || 'Açık Uçlu Soru';
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
                      }
                    }
                    
                    return (
                      <div key={idx} style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                          Soru {ans.subIndex !== undefined ? ans.subIndex + 1 : ''}:
                        </div>
                        <div style={{ fontSize: '1.05rem', marginBottom: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{displayQuestionText}</div>
                        
                        <div style={{ fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Öğrencinin Cevabı:</div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', minHeight: '80px', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                          {ans.userAnswerText || <span className="text-muted">(Boş Bırakılmış)</span>}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-success" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleEvaluate(ans, true)}>
                            <CheckCircle size={18} /> Doğru (+10)
                          </button>
                          <button className="btn btn-error" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleEvaluate(ans, false)}>
                            <XCircle size={18} /> Yanlış / Boş (0)
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
