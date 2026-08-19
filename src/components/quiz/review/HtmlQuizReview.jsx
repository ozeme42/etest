import React, { useState, useEffect, useMemo, useRef } from 'react';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import { ArrowLeft, CheckCircle, XCircle, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useAuth } from '../../../context/AuthContext';
import ReviewResultModal from './ReviewResultModal';

export default function HtmlQuizReview({ submission, test, questions = [], onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const isTeacherMode = Boolean(
    location.state?.isTeacher ||
    location.state?.fromTeacher ||
    location.search.includes('teacher=true') ||
    currentUser?.role === 'teacher' ||
    currentUser?.role === 'admin'
  );

  const handleGoBack = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (location.state?.from) {
      navigate(location.state.from, { replace: true });
      return;
    }
    if (location.state?.fromTeacher || location.state?.isTeacher || location.search.includes('teacher=true')) {
      navigate('/evaluation', { replace: true });
    } else {
      navigate('/student-results', { replace: true });
    }
  };

  const answers = submission.answers || [];

  const qCount = useMemo(() => {
    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) return keyArray.length;
    if (typeof keyArray === 'string' && keyArray.trim().length > 0) return keyArray.trim().length;
    if (typeof keyArray === 'object' && keyArray !== null && Object.keys(keyArray).length > 0) return Object.keys(keyArray).length;

    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) return test.questionsList.length;
    if (Array.isArray(test.questionIds) && test.questionIds.length > 0) return test.questionIds.length;
    if (Array.isArray(questions) && questions.length > 0) return questions.length;

    const titles = [test.title, test.name, questions[0]?.title, questions[0]?.name, submission?.testTitle, submission?.title];
    for (const t of titles) {
      if (typeof t === 'string') {
        const match = t.match(/(\d+)\s*soru/i);
        if (match && Number(match[1]) > 0) return Number(match[1]);
      }
    }

    if (Array.isArray(answers) && answers.length > 0) return answers.length;
    return 1;
  }, [test, questions, answers, submission]);

  const [idbHtml, setIdbHtml] = useState(null);
  const [questionScores, setQuestionScores] = useState(() => {
    const scores = {};
    for (let i = 1; i <= qCount; i++) {
      const a = answers[i - 1];
      if (a?.score !== undefined && a?.score !== null) scores[i] = Number(a.score);
      else if (a?.isCorrect === true) scores[i] = 10;
      else scores[i] = 0;
    }
    return scores;
  });

  const [teacherNotes, setTeacherNotes] = useState(() => {
    const notes = {};
    for (let i = 1; i <= qCount; i++) {
      notes[i] = answers[i - 1]?.teacherNote || '';
    }
    return notes;
  });

  const [overallFeedback, setOverallFeedback] = useState(submission?.teacherFeedback || submission?.teacherNote || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchHtmlPayload() {
      const direct = test.htmlPayload || test.contentPayload || questions[0]?.htmlPayload || questions[0]?.contentPayload;
      if (direct && direct !== '[STORED_IN_INDEXEDDB]' && direct !== '[LOCALSTORAGE_CACHE]') return;

      const candidates = [
        test.id, test.realTestId, test.bookTestId, test.testId,
        questions[0]?.id, questions[0]?.questionId,
        submission.testId, submission.id, submission.homeworkId
      ].filter(Boolean);

      const expanded = new Set();
      candidates.forEach(id => {
        const s = String(id);
        expanded.add(s);
        expanded.add(s.replace(/^q_?|^hw_?|^test_?|^bt_?|^tbt_?/, ''));
      });

      for (const id of expanded) {
        try {
          const val = await idbGetPayload(id);
          if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]' && isMounted) {
            setIdbHtml(val);
            break;
          }
        } catch (e) {}
      }
    }
    fetchHtmlPayload();
    return () => { isMounted = false; };
  }, [test, questions, submission]);

  const htmlPayload = idbHtml || test.htmlPayload || test.contentPayload || questions[0]?.htmlPayload || questions[0]?.contentPayload || submission?.htmlPayload;

  const isEvaluated = Boolean(submission.isEvaluatedByTeacher || submission.status === 'evaluated' || submission.status === 'graded');

  const computeQuestionEvaluation = (qNo, qObj, ansObj) => {
    const userAns = ansObj.userAnswer;
    const textAns = ansObj.userAnswerText;
    const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

    let userAnsLetter = null;
    if (hasAnswer) {
      if (typeof userAns === 'number') userAnsLetter = String.fromCharCode(65 + userAns);
      else userAnsLetter = String(userAns).toUpperCase();
    }

    const keySource = test.answerKey || questions[0]?.answerKey || null;
    const rawCorrectKey = Array.isArray(keySource) ? keySource[qNo - 1]
      : (keySource && typeof keySource === 'object' ? (keySource[qNo] ?? keySource[qNo - 1]) : null);

    let displayCorrectKey = null;
    if (rawCorrectKey !== undefined && rawCorrectKey !== null) {
      if (typeof rawCorrectKey === 'number') displayCorrectKey = String.fromCharCode(65 + rawCorrectKey);
      else displayCorrectKey = String(rawCorrectKey).toUpperCase();
    }

    let isCorrect;
    if (hasAnswer) {
      isCorrect = checkIsAnswerCorrect(userAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo);
    } else if (textAns) {
      isCorrect = questionScores[qNo] !== undefined ? (questionScores[qNo] >= 5) : (ansObj.isCorrect !== undefined ? ansObj.isCorrect : null);
    } else {
      isCorrect = null;
    }

    return { userAnsLetter, displayCorrectKey, isCorrect };
  };

  const stats = useMemo(() => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;

    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || questions[0] || {};
      const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx] || {};

      const { isCorrect } = computeQuestionEvaluation(qNo, qObj, ansObj);
      const userAns = ansObj.userAnswer;
      const textAns = ansObj.userAnswerText;
      const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

      if (isCorrect === true) cCount++;
      else if (isCorrect === false && (hasAnswer || ansObj.score === 0)) wCount++;
      else if (hasAnswer) cCount++;
      else if (textAns) {
        if (isCorrect === true) cCount++;
        else if (isCorrect === false) wCount++;
        else bCount++;
      } else {
        bCount++;
      }
    });

    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount };
  }, [qCount, questions, answers, test, submission, questionScores]);

  const isOpenEndedMode = useMemo(() => {
    if (test.questionType === 'coktan_secmeli' || test.type === 'coktan_secmeli' || (Array.isArray(test.answerKey) && test.answerKey.length > 0)) {
      return false;
    }
    return Boolean(
      test.questionType === 'acik_uclu' || test.type === 'acik_uclu' || test.isOpenEnded ||
      (test.title && (test.title.toLowerCase().includes('açık uçlu') || test.title.toLowerCase().includes('yazılı'))) ||
      questions.some(q => q.type === 'acik_uclu' || q.isOpenEnded)
    );
  }, [test, questions]);

  const { correctCount, wrongCount, blankCount } = stats;
  
  const scorePercentage = useMemo(() => {
    let earned = 0;
    let max = qCount * 10;
    for (let i = 1; i <= qCount; i++) {
      const s = questionScores[i] ?? 0;
      earned += s;
    }
    return max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;
  }, [qCount, questionScores]);

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);
    try {
      const updatedAnswers = Array.from({ length: qCount }).map((_, idx) => {
        const qNo = idx + 1;
        const existingAns = answers[idx] || {};
        const score = questionScores[qNo] ?? (existingAns.isCorrect === true ? 10 : 0);
        const note = teacherNotes[qNo] || '';
        return {
          ...existingAns,
          questionNo: qNo,
          score,
          isCorrect: score >= 5,
          teacherNote: note,
          evaluatedAt: new Date().toISOString()
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        score: scorePercentage,
        status: 'evaluated',
        isEvaluatedByTeacher: true,
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      await updateSubmission(submission.id, updatedSubPayload);

      if (submission.homeworkId || submission.hwId) {
        const hwId = submission.homeworkId || submission.hwId;
        try {
          await updateHomeworkSubmission(hwId, submission.id, updatedSubPayload);
        } catch (e) {}
      }

      alert('✓ Değerlendirme başarıyla kaydedildi!');
      handleGoBack();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Değerlendirme kaydedilirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Header */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.75rem 1.5rem',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: isMobile ? '0.4rem' : '1rem',
        minHeight: isMobile ? '48px' : '62px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', minWidth: 0, flex: 1 }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.85rem',
              borderRadius: '0.65rem',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#475569',
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
              fontSize: isMobile ? '0.85rem' : '1.05rem',
              fontWeight: 900,
              margin: 0,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {submission.studentName ? `🎓 ${submission.studentName} — ` : ''}{test.title || test.name || 'HTML Sınavı'}
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              🌐 HTML Formatında Sınav & Değerlendirme
            </div>
          </div>
        </div>

        {/* Action & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            padding: isMobile ? '0.25rem 0.55rem' : '0.4rem 0.95rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.78rem' : '0.9rem',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
          }}>
            %{scorePercentage} Puan
          </div>

          {isTeacherMode && (
            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none',
                borderRadius: '0.5rem',
                padding: isMobile ? '0.35rem 0.65rem' : '0.5rem 1.1rem',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.75rem' : '0.84rem',
                cursor: isSaving ? 'wait' : 'pointer',
                boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
              }}
            >
              <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet ✓'}
            </button>
          )}
        </div>
      </header>

      <QuizPanelLayout
        panelTitle="Cevap Analiz & Notlandırma"
        panelSubtitle="Soru bazlı öğrenci yanıtları ve puanlama"
        icon="📊"
        defaultPosition="right"
        defaultSize={450}
        documentContent={
          <div style={{ flex: 1, minWidth: 0, height: '100%', background: '#ffffff', color: '#1e293b' }}>
            <HtmlViewerWithControls payload={htmlPayload} title={test.title} height="100%" />
          </div>
        }
        answerContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const qObj = questions[idx] || questions[0] || {};
              const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx] || {};

              const userAns = ansObj.userAnswer;
              const textAns = ansObj.userAnswerText;
              const { userAnsLetter, displayCorrectKey, isCorrect } = computeQuestionEvaluation(qNo, qObj, ansObj);

              const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';
              const isItemOE = isOpenEndedMode || !!textAns || qObj.type === 'acik_uclu';
              const currentScore = questionScores[qNo] ?? (ansObj.score !== undefined ? Number(ansObj.score) : 0);

              return (
                <div
                  key={qNo}
                  style={{
                    background: isItemOE ? '#faf5ff' : (isCorrect === true ? '#f0fdf4' : isCorrect === false ? '#fef2f2' : '#ffffff'),
                    padding: '1rem',
                    borderRadius: '0.85rem',
                    border: `1.5px solid ${isItemOE ? '#e9d5ff' : (isCorrect === true ? '#bbf7d0' : isCorrect === false ? '#fecaca' : '#e2e8f0')}`,
                    color: '#0f172a'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>Soru {qNo}</span>
                    {isItemOE ? (
                      <span style={{ color: currentScore === 10 ? '#15803d' : (currentScore >= 5 ? '#d97706' : '#7c3aed'), fontWeight: 900, fontSize: '0.82rem' }}>
                        {currentScore} / 10 Puan
                      </span>
                    ) : hasAnswer ? (
                      isCorrect === true ? (
                        <span style={{ color: '#15803d', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={15} /> DOĞRU
                        </span>
                      ) : (
                        <span style={{ color: '#b91c1c', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <XCircle size={15} /> YANLIŞ
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                    )}
                  </div>

                  {textAns ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>ÖĞRENCİNİN YAZILI CEVABI:</div>
                      <div style={{ fontSize: '0.88rem', background: '#ffffff', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: '#0f172a', fontWeight: 600 }}>
                        {textAns}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>ÖĞRENCİ CEVABI: </span>
                        <span style={{ fontWeight: 900, color: isCorrect === true ? '#15803d' : isCorrect === false ? '#b91c1c' : '#0284c7' }}>
                          {hasAnswer ? (userAnsLetter || 'Boş') : 'Boş'}
                        </span>
                      </div>
                      {displayCorrectKey && (
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>DOĞRU CEVAP: </span>
                          <span style={{ fontWeight: 900, color: '#15803d' }}>
                            {displayCorrectKey}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Öğretmen Puanlama Butonları */}
                  {isTeacherMode && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isItemOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 10 }))}
                          style={{
                            padding: '0.4rem 0.25rem',
                            borderRadius: 6,
                            border: currentScore === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1',
                            background: currentScore === 10 ? '#16a34a' : '#ffffff',
                            color: currentScore === 10 ? '#ffffff' : '#15803d',
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          ✓ Doğru (D)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                          style={{
                            padding: '0.4rem 0.25rem',
                            borderRadius: 6,
                            border: currentScore === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                            background: currentScore === 0 ? '#dc2626' : '#ffffff',
                            color: currentScore === 0 ? '#ffffff' : '#b91c1c',
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          ✗ Yanlış (Y)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                          style={{
                            padding: '0.4rem 0.25rem',
                            borderRadius: 6,
                            border: currentScore === 0 && !hasAnswer ? '2px solid #64748b' : '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          ○ Boş (B)
                        </button>
                        {isItemOE && (
                          <button
                            type="button"
                            onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 5 }))}
                            style={{
                              padding: '0.4rem 0.25rem',
                              borderRadius: 6,
                              border: currentScore === 5 ? '2px solid #d97706' : '1px solid #cbd5e1',
                              background: currentScore === 5 ? '#d97706' : '#ffffff',
                              color: currentScore === 5 ? '#ffffff' : '#d97706',
                              fontWeight: 900,
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 3
                            }}
                          >
                            ½ Yarım (5P)
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Bu soru için geri bildirim notu..."
                        value={teacherNotes[qNo] || ''}
                        onChange={e => setTeacherNotes(p => ({ ...p, [qNo]: e.target.value }))}
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Genel Değerlendirme Notu & Kaydet */}
            {isTeacherMode && (
              <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#4f46e5' }}>💬 Genel Değerlendirme & Karne Notu:</div>
                <textarea
                  rows="2"
                  placeholder="Öğrencinin bu sınavı için genel karne notunuz..."
                  value={overallFeedback}
                  onChange={e => setOverallFeedback(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  disabled={isSaving}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: '0.88rem', border: 'none', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
                </button>
              </div>
            )}
          </div>
        }
      />

      <ReviewResultModal
        isOpen={showResultModal}
        onClose={handleGoBack}
        studentName={submission.studentName || 'Öğrenci'}
        testTitle={test.title || submission.testTitle || 'HTML Sınavı'}
        score={scorePercentage}
        correctCount={correctCount}
        wrongCount={wrongCount}
        blankCount={blankCount}
        totalQuestions={qCount}
        overallFeedback={overallFeedback}
        isTeacher={isTeacherMode}
      />
    </div>
  );
}
