import React, { useMemo } from 'react';
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

function getQuestionColumns(totalCount, maxPerCol = 10) {
  let perCol = maxPerCol;
  if (totalCount <= 10) perCol = totalCount;
  else if (totalCount <= 14) perCol = Math.ceil(totalCount / 2);
  else if (totalCount <= 20) perCol = 10;
  else if (totalCount <= 30) perCol = 10;
  else perCol = Math.ceil(totalCount / Math.ceil(totalCount / 10));

  const columns = [];
  for (let i = 0; i < totalCount; i += perCol) {
    const col = [];
    for (let j = i; j < Math.min(i + perCol, totalCount); j++) {
      col.push(j + 1);
    }
    columns.push(col);
  }
  return columns;
}

export default function PhysicalQuizReview({ submission, test, questions = [], onClose }) {
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

  const answers = submission?.answers || [];
  const qCount = useMemo(() => {
    if (Array.isArray(questions) && questions.length > 0) return questions.length;
    if (Array.isArray(answers) && answers.length > 0) return answers.length;
    if (test?.questionCount && Number(test.questionCount) > 0) return Number(test.questionCount);
    if (submission?.totalQuestions && Number(submission.totalQuestions) > 0) return Number(submission.totalQuestions);
    if (test?.totalQuestions && Number(test.totalQuestions) > 0) return Number(test.totalQuestions);
    return 20;
  }, [questions, answers, test, submission]);

  const correctCount = submission?.correctCount ?? answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission?.wrongCount ?? answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '').length;
  const blankCount = submission?.blankCount ?? Math.max(0, qCount - correctCount - wrongCount);
  const scorePct = submission?.score ?? (qCount > 0 ? Math.round((correctCount / qCount) * 100) : 0);

  const questionColumns = useMemo(() => {
    return getQuestionColumns(qCount, 10);
  }, [qCount]);

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
  const optionsList = isExplicitFive ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      
      {/* HEADER */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.75rem 2rem',
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
              {test?.title || test?.name || submission?.testTitle || 'Optik Form İnceleme'}
              {!isMobile && " — Optik Form İnceleme"}
            </h2>
            {!isMobile && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                📋 İşaretlenmiş Optik Form Karşılaştırma Analizi ({qCount} Soru)
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
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            color: '#ffffff',
            padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.85rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            border: '1px solid #6366f1',
            boxShadow: '0 2px 8px rgba(79,70,229,0.35)'
          }}>
            %{scorePct}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: isMobile ? '0.75rem' : '1.25rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        
        {/* BANNER WITH COLOR LEGEND */}
        <div style={{ background: 'linear-gradient(135deg, #0f766e, #047857)', borderRadius: '1rem', padding: '0.85rem 1.25rem', color: 'white', boxShadow: '0 6px 20px rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem' }}>Optik Form Sonuç Görünümü</h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                İşaretlediğiniz kabarcıklar ve doğru cevap anahtarı sütun sıralamasıyla listelenmiştir:
              </p>
            </div>
          </div>

          {/* COLOR LEGEND GUIDES */}
          <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.25)', padding: '0.35rem 0.75rem', borderRadius: '0.6rem', fontSize: '0.74rem', fontWeight: 800, flexWrap: 'wrap' }}>
            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /> Doğru
            </span>
            <span style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> Hatalı
            </span>
            <span style={{ color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #10b981', background: 'transparent' }} /> Cevap Anahtarı
            </span>
          </div>
        </div>

        {/* NATURAL COMPACT OPTICAL FORM */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
          gap: '0.85rem',
          alignItems: 'start'
        }}>
          {Array.from({ length: qCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = questions[idx] || {};
            const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionNo) === String(qNo) || a.questionId === qObj.id)) || answers[idx] || {};

            const userAnsIndex = getAnsIndex(ansObj.userAnswer);
            const textAns = ansObj.userAnswerText;

            let correctAnsIndex = getAnsIndex(qObj.correctAnswer);
            if (correctAnsIndex === null) correctAnsIndex = getAnsIndex(qObj.correctAnswerLetter);
            if (correctAnsIndex === null) correctAnsIndex = getAnsIndex(ansObj.correctAnswer);
            if (correctAnsIndex === null && test?.answerKey) {
              const ak = test.answerKey;
              const keyVal = Array.isArray(ak) ? ak[idx] : (ak[qNo] || ak[String(qNo)]);
              correctAnsIndex = getAnsIndex(keyVal);
            }

            const isBlank = userAnsIndex === null && !textAns;
            let isCorrect = ansObj.isCorrect;
            if (isCorrect === null || isCorrect === undefined) {
              if (userAnsIndex !== null && correctAnsIndex !== null) {
                isCorrect = userAnsIndex === correctAnsIndex;
              }
            }

            const correctLetter = correctAnsIndex !== null ? String.fromCharCode(65 + correctAnsIndex) : '';

            return (
              <div
                key={qNo}
                style={{
                  background: '#1e293b',
                  padding: isMobile ? '0.5rem 0.75rem' : '0.6rem 0.9rem',
                  borderRadius: '0.85rem',
                  border: `1.5px solid ${isCorrect === true ? '#10b981' : isCorrect === false ? '#ef4444' : '#334155'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 50, flexShrink: 0 }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '0.5rem',
                    background: '#0f172a',
                    color: isCorrect === true ? '#4ade80' : isCorrect === false ? '#f87171' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    border: '1px solid #334155'
                  }}>
                    {qNo}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isCorrect === true ? '#4ade80' : isCorrect === false ? '#f87171' : '#94a3b8' }}>
                    {isCorrect === true ? '✓' : isCorrect === false ? (correctLetter ? `(${correctLetter})` : '✕') : '—'}
                  </span>
                </div>

                {textAns ? (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', background: '#0f172a', padding: '0.35rem 0.6rem', borderRadius: '0.5rem', flex: 1 }}>
                    {textAns}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: isMobile ? '0.3rem' : '0.45rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {optionsList.map((opt, optIdx) => {
                      const isUserMarked = userAnsIndex === optIdx;
                      const isAnswerKey = correctAnsIndex === optIdx;

                      let bg = '#0f172a';
                      let color = '#94a3b8';
                      let border = '1.5px solid #334155';
                      let shadow = 'none';

                      if (isUserMarked && isAnswerKey) {
                        bg = 'linear-gradient(135deg, #10b981, #059669)';
                        color = '#ffffff';
                        border = '2px solid #34d399';
                        shadow = '0 3px 10px rgba(16,185,129,0.4)';
                      } else if (isUserMarked && !isAnswerKey) {
                        bg = 'linear-gradient(135deg, #ef4444, #dc2626)';
                        color = '#ffffff';
                        border = '2px solid #f87171';
                        shadow = '0 3px 10px rgba(239,68,68,0.4)';
                      } else if (!isUserMarked && isAnswerKey) {
                        bg = 'rgba(16, 185, 129, 0.15)';
                        color = '#34d399';
                        border = '2px dashed #10b981';
                      }

                      return (
                        <div
                          key={opt}
                          style={{
                            width: isMobile ? 32 : 38,
                            height: isMobile ? 32 : 38,
                            borderRadius: '50%',
                            background: bg,
                            color: color,
                            border: border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: isMobile ? '0.85rem' : '0.95rem',
                            boxShadow: shadow
                          }}
                          title={isUserMarked && isAnswerKey ? 'Doğru işaretlendi' : isUserMarked ? 'Hatalı işaretlendi' : isAnswerKey ? 'Doğru cevap anahtarı' : ''}
                        >
                          {opt}
                        </div>
                      );
                    })}
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
