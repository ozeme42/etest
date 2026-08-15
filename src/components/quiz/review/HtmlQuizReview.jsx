import React, { useState, useEffect, useMemo, useRef } from 'react';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import QuizPanelLayout from '../runner/QuizPanelLayout';

export default function HtmlQuizReview({ submission, test, questions = [], onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (location.state?.fromTeacher || location.state?.isTeacher) {
      navigate('/evaluation', { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  };

  const answers = submission.answers || [];

  const qCount = useMemo(() => {
    let count = Number(
      submission.totalQuestions ||
      test.questionCount ||
      test.totalQuestions ||
      test.questionsCount ||
      questions[0]?.questionCount ||
      questions[0]?.totalQuestions ||
      answers.length
    );

    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) {
      return Math.max(keyArray.length, answers.length);
    }

    if (answers.length > 1) {
      return Math.max(answers.length, count || 1);
    }

    if (test.questionsList && test.questionsList.length > 0) {
      return test.questionsList.length;
    }

    return (count && count > 1) ? count : (answers.length || 10);
  }, [submission.totalQuestions, test, questions, answers]);

  const [idbHtml, setIdbHtml] = useState(null);
  const loadedRef = useRef(null);

  const extractDirectHtml = (obj) => {
    if (!obj) return null;
    const candidates = [
      obj.contentPayload,
      obj.htmlPayload,
      obj.url,
      obj.htmlUrl,
      obj.content,
      obj.pdfPayload,
      obj.filePayload,
      obj.payload,
      obj.data,
      obj.html
    ];
    return candidates.find(c => typeof c === 'string' && c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  const getDirectPayload = () => {
    let p = extractDirectHtml(test);
    if (p) return p;

    if (questions && questions.length > 0) {
      for (const q of questions) {
        p = extractDirectHtml(q);
        if (p) return p;
      }
    }

    if (test.questions && Array.isArray(test.questions)) {
      for (const q of test.questions) {
        p = extractDirectHtml(q);
        if (p) return p;
      }
    }

    if (test.questionsList && Array.isArray(test.questionsList)) {
      for (const q of test.questionsList) {
        p = extractDirectHtml(q);
        if (p) return p;
      }
    }

    return null;
  };

  useEffect(() => {
    const direct = getDirectPayload();
    if (direct) return;
    if (loadedRef.current === test.id) return;

    async function loadFromIdb() {
      const rawIds = [
        test.id,
        test.id?.replace(/^hw_/, ''),
        test.id?.replace(/^hw_/, 'q_'),
        ...(test.questionIds || []),
        ...(questions || []).map(q => q.id),
        ...(test.questions || []).map(q => q.id),
        ...(test.questionsList || []).map(q => q.id)
      ];

      const idsToTry = [];
      rawIds.forEach(id => {
        if (!id) return;
        const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
        if (strId) {
          idsToTry.push(strId);
          idsToTry.push(strId.replace(/^q_?/, ''));
          idsToTry.push(strId.replace(/^q_?/, 'q'));
          idsToTry.push(strId.replace(/^q_?/, 'q_'));
          idsToTry.push(strId.replace(/^hw_/, ''));
          idsToTry.push(strId.replace(/^hw_/, 'q'));
          idsToTry.push(strId.replace(/^hw_/, 'q_'));
          idsToTry.push(`q_${strId}`);
          idsToTry.push(`q${strId}`);
        }
      });

      const uniqueIds = [...new Set(idsToTry)];

      for (const id of uniqueIds) {
        try {
          const val = await idbGetPayload(id);
          if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
            loadedRef.current = test.id;
            setIdbHtml(val);
            return;
          }
        } catch (e) {}
      }
    }
    loadFromIdb();
  }, [test.id, test.contentPayload, test.htmlPayload, test.questionIds, questions]);

  const htmlPayload = getDirectPayload() || idbHtml;

  const isEvaluated = Boolean(
    submission?.isEvaluatedByTeacher ||
    submission?.status === 'completed' ||
    submission?.status === 'evaluated' ||
    submission?.status === 'graded'
  );

  const computeQuestionEvaluation = (qNo, qObj, ansObj) => {
    const userAns = ansObj.userAnswer;

    const userAnsLetter = (userAns !== null && userAns !== undefined && userAns !== '')
      ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : String(userAns).toUpperCase())
      : null;

    const keySource = test.answerKey || qObj.answerKey || test.opticAnswers || qObj.opticAnswers;
    const rawCorrectKey = Array.isArray(keySource)
      ? keySource[qNo - 1]
      : (keySource && typeof keySource === 'object' ? (keySource[qNo] ?? keySource[qNo - 1]) : qObj.correctAnswer);

    const displayCorrectKey = (rawCorrectKey !== undefined && rawCorrectKey !== null)
      ? (typeof rawCorrectKey === 'number' ? String.fromCharCode(65 + rawCorrectKey) : String(rawCorrectKey).toUpperCase())
      : null;

    const isMatches = Boolean(userAnsLetter && displayCorrectKey && userAnsLetter === displayCorrectKey);

    let isCorrect = false;
    if (isMatches) {
      isCorrect = true;
    } else if (userAns !== null && userAns !== undefined && userAns !== '') {
      isCorrect = checkIsAnswerCorrect(userAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo);
    } else if (ansObj.isCorrect !== undefined && ansObj.isCorrect !== null) {
      isCorrect = ansObj.isCorrect;
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

      const userAns = ansObj.userAnswer;
      const textAns = ansObj.userAnswerText;
      const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

      const { isCorrect } = computeQuestionEvaluation(qNo, qObj, ansObj);

      if (isCorrect === true) {
        cCount++;
      } else if (isCorrect === false && (hasAnswer || ansObj.score === 0)) {
        wCount++;
      } else if (hasAnswer) {
        cCount++;
      } else if (textAns) {
        if (isCorrect === true) cCount++;
        else if (isCorrect === false) wCount++;
        else bCount++;
      } else {
        bCount++;
      }
    });

    return {
      correctCount: cCount,
      wrongCount: wCount,
      blankCount: bCount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qCount, questions, answers, test]);

  const isOpenEndedMode = useMemo(() => {
    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0)
    ) {
      return false;
    }

    if (
      test.questionType === 'acik_uclu' ||
      test.questionType === 'yazili' ||
      test.type === 'acik_uclu' ||
      test.type === 'yazili' ||
      test.contentType === 'acik_uclu' ||
      test.contentType === 'yazili' ||
      test.isOpenEnded
    ) {
      return true;
    }

    if (test.title && (
      test.title.toLowerCase().includes('açık uçlu') ||
      test.title.toLowerCase().includes('acik uclu') ||
      test.title.toLowerCase().includes('yazılı') ||
      test.title.toLowerCase().includes('yazili')
    )) {
      return true;
    }

    if (questions.some(q =>
      q.type === 'acik_uclu' ||
      q.type === 'yazili' ||
      q.contentType === 'acik_uclu' ||
      q.contentType === 'yazili' ||
      q.isOpenEnded
    )) {
      return true;
    }

    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli'
    ) {
      return false;
    }

    return false;
  }, [test, questions]);

  const { correctCount, wrongCount, blankCount } = stats;
  const totalCount = correctCount + wrongCount + blankCount;
  const scorePercentage = (isEvaluated && submission?.isEvaluatedByTeacher && submission?.score !== undefined && submission?.score !== null)
    ? submission.score
    : (totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : (submission?.score || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: 'white' }}>
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{test.title} — İnceleme Raporu</h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🌐 HTML Formatında Sınav İncelemesi</div>
          </div>
        </div>

        {/* Score Badges */}
        {isOpenEndedMode && !isEvaluated ? (
          <div style={{
            background: 'linear-gradient(135deg, #78350f, #92400e)',
            color: '#fef3c7',
            padding: '0.45rem 1.1rem',
            borderRadius: '0.75rem',
            fontWeight: 900,
            fontSize: '0.85rem',
            border: '1px solid #f59e0b',
            boxShadow: '0 2px 10px rgba(245,158,11,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            ✍️ Değerlendirme Bekliyor
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#064e3b', color: '#34d399', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #059669' }}>
              ✓ {correctCount} Doğru
            </div>
            <div style={{ background: '#7f1d1d', color: '#f87171', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #dc2626' }}>
              ✕ {wrongCount} Yanlış
            </div>
            <div style={{ background: '#334155', color: '#94a3b8', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #475569' }}>
              ○ {blankCount} Boş
            </div>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: '#e0e7ff', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #6366f1', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>
              🎯 %{scorePercentage} Başarı
            </div>
          </div>
        )}
      </header>

      <QuizPanelLayout
        panelTitle="Cevap Analiz & İnceleme"
        panelSubtitle="Sınavınızdaki detaylı analiz"
        icon="📊"
        defaultPosition="right"
        defaultSize={400}
        documentContent={
          <div style={{ flex: 1, minWidth: 0, height: '100%', background: '#ffffff', color: '#1e293b' }}>
            <HtmlViewerWithControls payload={htmlPayload} title={test.title} height="100%" />
          </div>
        }
        answerContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const qObj = questions[idx] || questions[0] || {};
              const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx] || {};

              const userAns = ansObj.userAnswer;
              const textAns = ansObj.userAnswerText;

              const { userAnsLetter, displayCorrectKey, isCorrect } = computeQuestionEvaluation(qNo, qObj, ansObj);

              const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';
              const isBlank = !hasAnswer && !textAns;

              const isItemOE = isOpenEndedMode || !!textAns || qObj.type === 'acik_uclu';

              return (
                <div
                  key={qNo}
                  style={{
                    background: (isItemOE && !isEvaluated) ? '#0f172a' : (isCorrect === true ? 'rgba(16,185,129,0.1)' : isCorrect === false ? 'rgba(239,68,68,0.1)' : '#0f172a'),
                    padding: '1rem',
                    borderRadius: '0.85rem',
                    border: `1px solid ${(isItemOE && !isEvaluated) ? '#334155' : (isCorrect === true ? '#059669' : isCorrect === false ? '#dc2626' : '#334155')}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>Soru {qNo}</span>
                    {isItemOE && !isEvaluated ? (
                      textAns ? (
                        <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '0.8rem' }}>✍️ DEĞERLENDİRME BEKLİYOR</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                      )
                    ) : hasAnswer ? (
                      isCorrect === true ? (
                        <span style={{ color: '#34d399', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={15} /> DOĞRU
                        </span>
                      ) : isCorrect === false ? (
                        <span style={{ color: '#f87171', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <XCircle size={15} /> YANLIŞ
                        </span>
                      ) : (
                        <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '0.8rem' }}>✓ CEVAPLANDI</span>
                      )
                    ) : textAns ? (
                      <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '0.8rem' }}>✍️ YAZILI YANIT</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                    )}
                  </div>

                  {textAns ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>AÇIK UÇLU CEVAP</div>
                      <div style={{ fontSize: '0.85rem', background: '#1e293b', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #475569', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                        {textAns}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>SENİN CEVABIN: </span>
                        <span style={{ fontWeight: 900, color: isCorrect === true ? '#34d399' : isCorrect === false ? '#f87171' : '#38bdf8' }}>
                          {hasAnswer ? (userAnsLetter || 'Boş') : 'Boş'}
                        </span>
                      </div>
                      {displayCorrectKey && (
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>DOĞRU CEVAP: </span>
                          <span style={{ fontWeight: 900, color: '#34d399' }}>
                            {displayCorrectKey}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        }
      />
    </div>
  );
}
