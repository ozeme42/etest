import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { 
  ArrowLeft, CheckCircle, Clock, AlertCircle, Send, Check,
  FileText, ChevronDown, ChevronUp, ExternalLink, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import PdfViewerPanel from '../components/PdfViewerPanel';

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
  const [showPdf, setShowPdf] = useState(true);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isSubmittingRef = useRef(false);

  // 1. Find Homework
  const hw = homeworks.find(h => h.id === id);
  const testId = hw?.tests?.[0];
  const student = users.find(u => u.id === studentId);

  // 2. Find Physical Book and Test definition
  const testDef = bookTests.find(t => t.id === testId);
  const book = books.find(b => b.id === testDef?.bookId);

  useEffect(() => {
    if (!hw || !student || !testDef || !book) {}
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

  if (existingSubmission && !submissionComplete) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Daha önceden çözülmüş sınav. Sonuç ekranına yönlendiriliyorsunuz...
      </div>
    );
  }

  const isOpenEnded = book.bookType === 'open_ended';
  const qCount = testDef.questionCount || 0;
  const options = ['A', 'B', 'C', 'D', 'E'];
  const hasPdf = !!(book.pdfUrl);

  const answeredCount = Object.values(studentAnswers).filter(Boolean).length;
  const progressPct = qCount > 0 ? Math.round((answeredCount / qCount) * 100) : 0;

  const handleSelectOption = (qNum, option) => {
    setStudentAnswers(prev => ({
      ...prev,
      [qNum]: prev[qNum] === option ? '' : option // toggle
    }));
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
          isCorrect: null
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
          isCorrect: userAns ? isCorrect : false
        });
      }
    }

    const subStatus = (isOpenEnded && pendingCount > 0) ? 'pending_evaluation' : 'completed';

    const submissionData = {
      testId: hw.id,
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
    <div style={{
      minHeight: '100vh',
      maxWidth: '100vw',
      width: '100%',
      overflowX: 'hidden',
      background: 'var(--color-background, #f8fafc)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* ── STICKY HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
        width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <button
            onClick={() => navigate(`/student/books/${book.id}`)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.3rem', borderRadius: '0.5rem', color: '#64748b', flexShrink: 0 }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {book.title}
            </div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60vw' }}>
              {testDef.name}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Progress pill */}
          <div style={{ fontSize: '0.78rem', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.75rem', borderRadius: '99px', whiteSpace: 'nowrap' }}>
            {answeredCount}/{qCount} işaretlendi
          </div>

          {/* PDF toggle button — only if book has pdf */}
          {hasPdf && (
            <button
              onClick={() => setShowPdf(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.4rem 0.85rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.78rem',
                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: showPdf ? '#1d4ed8' : 'white',
                color: showPdf ? 'white' : '#1d4ed8',
                borderColor: showPdf ? '#1d4ed8' : '#93c5fd',
              }}
            >
              {showPdf ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              <span className="hidden-xs">{showPdf ? 'PDF Gizle' : 'PDF Göster'}</span>
            </button>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1.25rem', borderRadius: '0.6rem', fontWeight: 900, fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(16,185,129,0.35)', transition: 'all 0.15s'
            }}
          >
            <Send size={15} /> Bitir
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: 3, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: '0.1rem' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* ── MAIN CONTENT: PDF (top/left) + OPTIK FORM (bottom/right) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: 'calc(100vh - 72px)',
        overflow: 'hidden',
      }}>

        {/* TOP / LEFT: PDF Viewer */}
        {hasPdf && showPdf && (
          <div style={{
            height: isMobile ? '55%' : '100%',
            width: isMobile ? '100%' : '60%',
            overflow: 'hidden',
            borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
            borderBottom: isMobile ? '1px solid #e2e8f0' : 'none',
            display: 'flex', flexDirection: 'column'
          }}>
            <PdfViewerPanel
              pdfUrl={book.pdfUrl}
              title={book.title}
              defaultOpen={true}
              style={{ height: '100%', borderRadius: 0, border: 'none', flex: 1 }}
            />
          </div>
        )}

        {/* BOTTOM / RIGHT: Optik Form */}
        <div style={{
          height: isMobile && hasPdf && showPdf ? '45%' : '100%',
          width: isMobile ? '100%' : (hasPdf && showPdf ? '40%' : '100%'),
          overflowY: 'auto',
          background: '#f8fafc',
          padding: isMobile ? '0.85rem' : '1.25rem',
        }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}>
            <AlertCircle size={13} />
            {isOpenEnded ? 'Cevap Kağıdı' : 'Optik Form'} — {qCount} Soru
          </div>

          {/* OPTIK FORM GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isOpenEnded ? '1fr' : (isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))'),
            gap: '0.6rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            {Array.from({ length: qCount }).map((_, i) => {
              const qNum = String(i + 1);
              const selected = studentAnswers[qNum] || '';
              return (
                <div key={qNum} style={{
                  background: 'white', borderRadius: '0.65rem',
                  border: selected ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  padding: '0.65rem 0.85rem',
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  boxShadow: selected ? '0 2px 8px rgba(99,102,241,0.12)' : 'none',
                  transition: 'all 0.15s'
                }}>
                  {/* Question number bubble */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: selected ? '#6366f1' : '#f1f5f9',
                    color: selected ? 'white' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '0.78rem'
                  }}>
                    {qNum}
                  </div>

                  {isOpenEnded ? (
                    <textarea
                      className="input-field"
                      placeholder={`${qNum}. sorunun cevabı...`}
                      value={studentAnswers[qNum] || ''}
                      onChange={(e) => handleTextChange(qNum, e.target.value)}
                      style={{ flex: 1, minHeight: 90, padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
                      {options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleSelectOption(qNum, opt)}
                          style={{
                            flex: 1, height: 32, borderRadius: '50%',
                            fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
                            border: selected === opt ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                            background: selected === opt ? '#6366f1' : 'white',
                            color: selected === opt ? 'white' : '#64748b',
                            transition: 'all 0.12s',
                            boxShadow: selected === opt ? '0 2px 6px rgba(99,102,241,0.35)' : 'none',
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom submit */}
          <div style={{ marginTop: '2rem', paddingBottom: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.85rem 2.5rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '1rem',
                background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.15s'
              }}
            >
              <Send size={18} /> Testi Teslim Et
            </button>
          </div>
        </div>
      </div>

      {/* FINISH MODAL */}
      {showFinishModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: 'var(--color-secondary)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 900 }}>Sınavı Bitiriyorsunuz</h3>
            <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              Tüm cevaplarınızı optik forma doğru geçirdiğinizden emin misiniz?
            </p>
            <div style={{ background: '#f1f5f9', borderRadius: '0.6rem', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 800 }}>
              ✅ {answeredCount} işaretlendi &nbsp;|&nbsp; ⬜ {qCount - answeredCount} boş
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setShowFinishModal(false)}>Kontrol Et</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                style={{ background: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}
              >
                Evet, Teslim Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive: hide PDF on very small screens by default */}
      <style>{`
        @media (max-width: 640px) {
          .hidden-xs { display: none !important; }
        }
      `}</style>
    </div>
  );
}
