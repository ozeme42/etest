import React, { useState, useEffect, useMemo, useRef } from 'react';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function HtmlQuizReview({ submission, test, questions = [], onClose }) {
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
    // 1. Direct answer key length (Most authoritative!)
    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) {
      return keyArray.length;
    }
    if (typeof keyArray === 'string' && keyArray.trim().length > 0) {
      return keyArray.trim().length;
    }
    if (typeof keyArray === 'object' && keyArray !== null && Object.keys(keyArray).length > 0) {
      return Object.keys(keyArray).length;
    }

    // 2. Direct question list length if explicitly provided
    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) {
      return test.questionsList.length;
    }
    if (Array.isArray(test.questionIds) && test.questionIds.length > 0) {
      return test.questionIds.length;
    }
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.length;
    }

    // 3. Title regex (e.g. "(2 Soru)" or "2 Soru")
    const titles = [test.title, test.name, questions[0]?.title, questions[0]?.name, submission?.testTitle, submission?.title];
    for (const t of titles) {
      if (typeof t === 'string') {
        const match = t.match(/(\d+)\s*soru/i);
        if (match && Number(match[1]) > 0) {
          return Number(match[1]);
        }
      }
    }

    // 4. If submission has recorded actual answers list
    if (Array.isArray(answers) && answers.length > 0) {
      return answers.length;
    }

    // 5. Explicit question count properties on test / question / submission
    const explicit = Number(
      test.questionCount ||
      questions[0]?.questionCount ||
      submission?.totalQuestions ||
      test.totalQuestions ||
      test.questionsCount ||
      questions[0]?.totalQuestions
    );
    if (explicit && explicit > 0) return explicit;

    return 1;
  }, [test, questions, answers, submission]);

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

    let isCorrect = null;
    if (isMatches) {
      isCorrect = true;
    } else if (userAns !== null && userAns !== undefined && userAns !== '') {
      isCorrect = checkIsAnswerCorrect(userAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo);
    } else if (ansObj.userAnswerText) {
      isCorrect = ansObj.isCorrect !== undefined ? ansObj.isCorrect : null;
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

  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
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
              fontSize: isMobile ? '0.85rem' : '1.1rem',
              fontWeight: 900,
              margin: 0,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {test.title || test.name || 'Sınav İncelemesi'}
              {!isMobile && " — İnceleme Raporu"}
            </h2>
            {!isMobile && (
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                🌐 HTML Formatında Sınav İncelemesi
              </div>
            )}
          </div>
        </div>

        {/* Score Badges */}
        {isOpenEndedMode && !isEvaluated ? (
          <div style={{
            background: '#fffbeb',
            color: '#b45309',
            padding: isMobile ? '0.25rem 0.55rem' : '0.45rem 1.1rem',
            borderRadius: '0.65rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.72rem' : '0.85rem',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            flexShrink: 0
          }}>
            ✍️ {isMobile ? 'Bekliyor' : 'Değerlendirme Bekliyor'}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.5rem', flexShrink: 0 }}>
            <div style={{
              background: '#f0fdf4',
              color: '#15803d',
              padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.72rem' : '0.82rem',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <span>✓ {correctCount}</span>
              {!isMobile && <span>Doğru</span>}
            </div>
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.72rem' : '0.82rem',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <span>✕ {wrongCount}</span>
              {!isMobile && <span>Yanlış</span>}
            </div>
            <div style={{
              background: '#f8fafc',
              color: '#475569',
              padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.72rem' : '0.82rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}>
              <span>○ {blankCount}</span>
              {!isMobile && <span>Boş</span>}
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.85rem',
              borderRadius: '0.5rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.72rem' : '0.82rem',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
            }}>
              %{scorePercentage}
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
                    background: (isItemOE && !isEvaluated) ? '#faf5ff' : (isCorrect === true ? '#f0fdf4' : isCorrect === false ? '#fef2f2' : '#ffffff'),
                    padding: '1rem',
                    borderRadius: '0.85rem',
                    border: `1.5px solid ${(isItemOE && !isEvaluated) ? '#e9d5ff' : (isCorrect === true ? '#bbf7d0' : isCorrect === false ? '#fecaca' : '#e2e8f0')}`,
                    color: '#0f172a'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>Soru {qNo}</span>
                    {isItemOE && !isEvaluated ? (
                      textAns ? (
                        <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: '0.8rem' }}>✍️ DEĞERLENDİRME BEKLİYOR</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                      )
                    ) : hasAnswer ? (
                      isCorrect === true ? (
                        <span style={{ color: '#15803d', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={15} /> DOĞRU
                        </span>
                      ) : isCorrect === false ? (
                        <span style={{ color: '#b91c1c', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <XCircle size={15} /> YANLIŞ
                        </span>
                      ) : (
                        <span style={{ color: '#0284c7', fontWeight: 900, fontSize: '0.8rem' }}>✓ CEVAPLANDI</span>
                      )
                    ) : textAns ? (
                      <span style={{ color: '#d97706', fontWeight: 900, fontSize: '0.8rem' }}>✍️ YAZILI YANIT</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                    )}
                  </div>

                  {textAns ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>AÇIK UÇLU CEVAP</div>
                      <div style={{ fontSize: '0.85rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: '#0f172a' }}>
                        {textAns}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>SENİN CEVABIN: </span>
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
                </div>
              );
            })}
          </div>
        }
      />
    </div>
  );
}
