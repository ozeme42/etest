import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { 
  ArrowLeft, CheckCircle, Clock, AlertCircle, Send, Check 
} from 'lucide-react';

export default function BookQuizRunner() {
  const params = useParams();
  const id = params.testId || params.id || '';
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const navigate = useNavigate();

  const { homeworks, submitHomework } = useHomework();
  const { books, bookTests } = useTrackedBooks();
  const { users } = useUser();
  const { submissions, addSubmission } = useEvaluation();

  const [studentAnswers, setStudentAnswers] = useState({});
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const isSubmittingRef = useRef(false);

  // 1. Find Homework
  const hw = homeworks.find(h => h.id === id);
  const testId = hw?.tests?.[0]; // physical book tests are linked via hw.tests
  const student = users.find(u => u.id === studentId);

  // 2. Find Physical Book and Test definition
  const testDef = bookTests.find(t => t.id === testId);
  const book = books.find(b => b.id === testDef?.bookId);

  useEffect(() => {
    if (!hw || !student || !testDef || !book) {
      // In a real app we'd redirect or show error, keeping simple here
    }
  }, [hw, student, testDef, book]);

  if (!hw || !student || !testDef || !book) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Test yüklenirken bir sorun oluştu. Geçersiz bağlantı.</div>;
  }

  const existingSubmission = (submissions || []).find(s => 
    String(s.studentId) === String(studentId) && 
    (String(s.testId) === String(hw.id) || String(s.hwId) === String(hw.id))
  );

  useEffect(() => {
    if (existingSubmission && !submissionComplete) {
      navigate(`/review/${existingSubmission.id}`, { replace: true, state: { from: `/student/books/${book.id}` } });
    }
  }, [existingSubmission, submissionComplete, navigate, book]);

  const isOpenEnded = book.bookType === 'open_ended';
  const qCount = testDef.questionCount || 0;

  // Options: A, B, C, D, E
  const options = ['A', 'B', 'C', 'D', 'E'];

  const handleSelectOption = (qNum, option) => {
    setStudentAnswers(prev => ({ ...prev, [qNum]: option }));
  };

  const handleTextChange = (qNum, text) => {
    setStudentAnswers(prev => ({ ...prev, [qNum]: text }));
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    if (!showFinishModal) {
      setShowFinishModal(true);
      return;
    }
    
    isSubmittingRef.current = true;

    let correctCount = 0;
    let totalScore = 0;
    let pendingCount = 0;
    const answers = [];

    for (let i = 1; i <= qCount; i++) {
      const qNumStr = String(i);
      const userAns = studentAnswers[qNumStr] || null;
      
      if (isOpenEnded) {
        if (userAns) pendingCount++;
        answers.push({
          questionId: qNumStr,
          type: 'acik_uclu',
          userAnswer: userAns,
          correctAnswer: null,
          isCorrect: null // pending evaluation
        });
      } else {
        const correctAns = testDef.answerKey?.[qNumStr] || null;
        let isCorrect = false;
        
        if (userAns && correctAns && userAns === correctAns) {
          isCorrect = true;
          correctCount++;
          totalScore += (100 / qCount);
        }

        answers.push({
          questionId: qNumStr,
          type: 'coktan_secmeli',
          userAnswer: userAns,
          correctAnswer: correctAns,
          isCorrect: userAns ? isCorrect : false // count empty as wrong for UI simplicity later, or explicitly empty
        });
      }
    }

    const subStatus = (isOpenEnded && pendingCount > 0) ? 'pending_evaluation' : 'completed';

    const submissionData = {
      testId: hw.id, // Linking to homework ID for matching across dashboards
      hwId: hw.id,
      bookTestId: testDef.id,
      testTitle: hw.title,
      studentId: student.id,
      studentName: student.name,
      isHomework: true,
      status: subStatus,
      score: Math.round(totalScore),
      submittedAt: new Date().toISOString(),
      answers
    };

    const newSubId = await addSubmission(submissionData);
    if (submitHomework) {
      submitHomework(hw.id, student.id, Math.round(totalScore), qCount);
    }

    setShowFinishModal(false);
    setSubmissionComplete(true);
    
    // Redirect after brief delay
    setTimeout(() => {
      navigate(`/review/${newSubId}`, { replace: true, state: { from: `/student/books/${book.id}` } });
    }, 2500);
  };

  if (submissionComplete) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card glass animate-fade-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
          <CheckCircle size={64} style={{ color: 'var(--color-success)', margin: '0 auto 1.5rem auto' }} />
          <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Sınav Tamamlandı!</h2>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>
            {isOpenEnded 
              ? "Cevaplarınız başarıyla kaydedildi ve değerlendirme için öğretmeninize gönderildi."
              : "Sınavınız başarıyla teslim edildi. Sonuç ekranına yönlendiriliyorsunuz..."}
          </p>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate(`/student/books/${book.id}`)} style={{ padding: '0.5rem', border: 'none', background: 'transparent' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-primary)' }}>{hw.title}</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Öğrenci: {student.name} | Soru Sayısı: {qCount} | Tip: {isOpenEnded ? 'Açık Uçlu Cevap Kağıdı' : 'Optik Form'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>
          <AlertCircle size={20} />
          <span>Lütfen fiziki kitaptaki cevaplarınızı bu {isOpenEnded ? 'cevap kağıdına' : 'optik forma'} dikkatlice geçirin.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isOpenEnded ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: qCount }).map((_, i) => {
            const qNum = String(i + 1);
            return (
              <div key={qNum} style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                    {qNum}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    {isOpenEnded ? (
                      <textarea
                        className="input-field"
                        placeholder={`${qNum}. sorunun cevabını buraya yazınız...`}
                        value={studentAnswers[qNum] || ''}
                        onChange={(e) => handleTextChange(qNum, e.target.value)}
                        style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleSelectOption(qNum, opt)}
                            style={{
                              width: '2.5rem', height: '2.5rem', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                              border: studentAnswers[qNum] === opt ? '2px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.2)',
                              background: studentAnswers[qNum] === opt ? 'var(--color-primary)' : 'white',
                              color: studentAnswers[qNum] === opt ? 'white' : 'var(--color-text)',
                              boxShadow: studentAnswers[qNum] === opt ? '0 4px 10px rgba(124, 58, 237, 0.3)' : 'none'
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSubmit} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
            <Send size={18} style={{ marginRight: '0.5rem' }} /> Testi Bitir
          </button>
        </div>
      </div>

      {/* FINISH MODAL */}
      {showFinishModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <AlertCircle size={48} style={{ color: 'var(--color-secondary)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-primary)' }}>Sınavı Bitiriyorsunuz</h3>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Tüm cevaplarınızı optik forma doğru geçirdiğinizden emin misiniz? Sınavı bitirdikten sonra cevaplarınızı değiştiremezsiniz.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setShowFinishModal(false)}>Kontrol Etmeye Dön</button>
              <button className="btn btn-primary" onClick={handleSubmit} style={{ background: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}>
                Evet, Testi Bitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
