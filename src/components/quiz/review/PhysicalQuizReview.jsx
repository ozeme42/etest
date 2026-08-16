import React from 'react';
import { ArrowLeft, CheckCircle, XCircle, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

function getAnsIndex(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const code = val.trim().toUpperCase().charCodeAt(0) - 65;
    if (code >= 0 && code <= 4) return code;
  }
  return null;
}

export default function PhysicalQuizReview({ submission, test, questions, onClose }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (location.state?.from) {
      navigate(location.state.from, { replace: true });
      return;
    }
    if (location.state?.fromTeacher || location.state?.isTeacher) {
      navigate('/evaluation', { replace: true });
    } else {
      navigate('/student-results', { replace: true });
    }
  };

  const answers = submission.answers || [];
  const qCount = useMemo(() => {
    if (Array.isArray(questions) && questions.length > 0) return questions.length;
    if (Array.isArray(answers) && answers.length > 0) return answers.length;
    if (test?.questionCount && Number(test.questionCount) > 0) return Number(test.questionCount);
    if (submission?.totalQuestions && Number(submission.totalQuestions) > 0) return Number(submission.totalQuestions);
    if (test?.totalQuestions && Number(test.totalQuestions) > 0) return Number(test.totalQuestions);
    return 20;
  }, [questions, answers, test, submission]);

  const correctCount = submission.correctCount || answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission.wrongCount || answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length;
  const blankCount = submission.blankCount || (qCount - correctCount - wrongCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      
      {/* HEADER */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.75rem 1.5rem',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: isMobile ? '0.4rem' : '1rem',
        minHeight: isMobile ? '48px' : '62px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', minWidth: 0, flex: 1 }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.85rem',
              borderRadius: '0.65rem',
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#e2e8f0',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              flexShrink: 0
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={isMobile ? 15 : 16} />
            {!isMobile && "Geri Dön"}
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{
              fontSize: isMobile ? '0.85rem' : '1.1rem',
              fontWeight: 900,
              margin: 0,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {test.title || test.name}
              {!isMobile && " — Optik Form İnceleme"}
            </h2>
            {!isMobile && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                📋 İşaretlenmiş Optik Form Karşılaştırma Analizi
              </div>
            )}
          </div>
        </div>

        {/* SCORE & BADGES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.5rem', flexShrink: 0 }}>
          <div style={{
            background: 'rgba(16,185,129,0.15)',
            color: '#34d399',
            padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            border: '1px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <span>✓ {correctCount}</span>
            {!isMobile && <span>Doğru</span>}
          </div>
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#fca5a5',
            padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            border: '1px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <span>✕ {wrongCount}</span>
            {!isMobile && <span>Yanlış</span>}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8',
            padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <span>○ {blankCount}</span>
            {!isMobile && <span>Boş</span>}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{ maxWidth: '950px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        
        {/* BANNER WITH COLOR LEGEND */}
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>Optik Form Sonuç Görünümü</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                İşaretlediğiniz kabarcıklar ile doğru cevap anahtarı renklerle gösterilmiştir:
              </p>
            </div>
          </div>

          {/* COLOR LEGEND GUIDES */}
          <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '0.75rem', fontSize: '0.78rem', fontWeight: 800, flexWrap: 'wrap' }}>
            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} /> Doğru
            </span>
            <span style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} /> Hatalı
            </span>
            <span style={{ color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #10b981', background: 'transparent' }} /> Cevap Anahtarı
            </span>
          </div>
        </div>

        {/* OPTICAL FORM GRID REVIEW */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: qCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = questions[idx] || {};
            const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionNo) === String(qNo) || a.questionId === qObj.id)) || answers[idx] || {};

            const userAnsIndex = getAnsIndex(ansObj.userAnswer);
            const textAns = ansObj.userAnswerText;

            let correctAnsIndex = getAnsIndex(qObj.correctAnswer);
            if (correctAnsIndex === null) correctAnsIndex = getAnsIndex(qObj.correctAnswerLetter);
            if (correctAnsIndex === null) correctAnsIndex = getAnsIndex(ansObj.correctAnswer);

            const isBlank = userAnsIndex === null && !textAns;
            let isCorrect = ansObj.isCorrect;
            if (isCorrect === null || isCorrect === undefined) {
              if (userAnsIndex !== null && correctAnsIndex !== null) {
                isCorrect = userAnsIndex === correctAnsIndex;
              }
            }

            return (
              <div
                key={qNo}
                style={{
                  background: '#0f172a',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  border: `1.5px solid ${isCorrect === true ? '#10b981' : isCorrect === false ? '#ef4444' : '#334155'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                {/* QUESTION HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem' }}>
                  <span style={{ color: '#f8fafc' }}>
                    {qObj.testName ? `${qObj.testName} - Soru ${qNo}` : `Soru ${qNo}`}
                  </span>

                  {isCorrect === true && (
                    <span style={{ fontSize: '0.73rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontWeight: 900, border: '1px solid #10b981' }}>
                      ✓ Doğru
                    </span>
                  )}
                  {isCorrect === false && (
                    <span style={{ fontSize: '0.73rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontWeight: 900, border: '1px solid #ef4444' }}>
                      ✕ Yanlış
                    </span>
                  )}
                  {isBlank && (
                    <span style={{ fontSize: '0.73rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontWeight: 800 }}>
                      — Boş
                    </span>
                  )}
                </div>

                {/* TEXT / OPEN-ENDED RESPONSE */}
                {textAns ? (
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: '#1e293b', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                    <strong style={{ color: '#a5b4fc' }}>Yazılı Yanıt: </strong>{textAns}
                  </div>
                ) : (
                  /* 5 OPTICAL BUBBLES IN COLOR */
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                    {(() => {
                      const isExplicitFive = Boolean(
                        Number(test?.optionCount) === 5 ||
                        Number(test?.optionsCount) === 5 ||
                        Number(test?.book?.optionCount) === 5 ||
                        String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                        test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS' ||
                        test?.book?.publisher === 'TYT' || test?.book?.publisher === 'AYT' || test?.book?.publisher === 'YKS' ||
                        Boolean(String(test?.grade || test?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                        Boolean(String(test?.title || test?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                      );
                      const isFourOptions = !isExplicitFive;
                      const optionsList = (qObj.options && Array.isArray(qObj.options) && qObj.options.length > 0)
                        ? (isFourOptions && qObj.options.length > 4 ? qObj.options.slice(0, 4) : qObj.options)
                        : (isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']);
                      return optionsList.map((opt, optIdx) => {
                        const isUserMarked = userAnsIndex === optIdx;
                        const isAnswerKey = correctAnsIndex === optIdx;

                        let bg = '#1e293b';
                        let color = '#94a3b8';
                        let border = '1px solid #334155';
                        let labelText = opt;

                        if (isUserMarked && isAnswerKey) {
                          // 🟢 Student marked correctly!
                          bg = '#10b981';
                          color = '#ffffff';
                          border = '2px solid #059669';
                          labelText = '✓ ' + opt;
                        } else if (isUserMarked && !isAnswerKey) {
                          // 🔴 Student marked wrong!
                          bg = '#ef4444';
                          color = '#ffffff';
                          border = '2px solid #dc2626';
                          labelText = '✕ ' + opt;
                        } else if (!isUserMarked && isAnswerKey) {
                          // 🟢 Correct Answer Key (missed or left blank)
                          bg = 'rgba(16, 185, 129, 0.15)';
                          color = '#34d399';
                          border = '2px solid #10b981';
                          labelText = opt + ' ★';
                        }

                        return (
                          <div
                            key={opt}
                            style={{
                              flex: 1,
                              height: '34px',
                            borderRadius: '0.5rem',
                            background: bg,
                            color: color,
                            border: border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            boxShadow: (isUserMarked || isAnswerKey) ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {labelText}
                        </div>
                      );
                    });
                  })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
