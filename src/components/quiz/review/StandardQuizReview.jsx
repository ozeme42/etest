import React, { useState, useMemo } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function StandardQuizReview({ submission, test, questions = [], onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

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

  const resolvedQuestions = useMemo(() => {
    const parseJsonList = (str) => {
      if (typeof str === 'string' && (str.trim().startsWith('[') || str.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(str);
          const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items);
          if (list && Array.isArray(list) && list.length > 0) return list;
        } catch {}
      }
      return null;
    };

    if (questions && questions.length > 0) {
      if (questions.length === 1 && questions[0].contentPayload) {
        const parsed = parseJsonList(questions[0].contentPayload);
        if (parsed) return parsed;
      }
      if (questions.length === 1 && Array.isArray(questions[0].questionsList) && questions[0].questionsList.length > 0) {
        return questions[0].questionsList;
      }
      return questions;
    }
    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) {
      return test.questionsList;
    }
    const payloadParsed = parseJsonList(test.contentPayload);
    if (payloadParsed) return payloadParsed;

    if (Array.isArray(test.questions) && test.questions.length > 0) {
      return test.questions;
    }
    return [test];
  }, [questions, test]);

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
    if (Array.isArray(resolvedQuestions) && resolvedQuestions.length > 0) {
      return resolvedQuestions.length;
    }
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
  }, [test, questions, resolvedQuestions, answers, submission]);

  const normalizeAnsIndex = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    const str = String(val).trim().toUpperCase();
    if (/^[A-E]$/.test(str)) {
      return str.charCodeAt(0) - 65;
    }
    const num = Number(str);
    return (!isNaN(num) && num >= 0 && num <= 4) ? num : null;
  };

  const answersList = useMemo(() => {
    const raw = submission.answers || submission.userAnswers || submission.studentAnswers || [];
    if (Array.isArray(raw)) {
      return raw.map((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          return {
            questionNo: item.questionNo || (idx + 1),
            questionId: item.questionId || `q_${idx + 1}`,
            userAnswer: item.userAnswer !== undefined ? item.userAnswer : (item.answer !== undefined ? item.answer : item.selectedOption),
            userAnswerText: item.userAnswerText || item.textAnswer || item.textVal || '',
            isCorrect: item.isCorrect,
            ...item
          };
        }
        return {
          questionNo: idx + 1,
          questionId: `q_${idx + 1}`,
          userAnswer: item,
          userAnswerText: typeof item === 'string' && item.length > 1 ? item : '',
          isCorrect: null
        };
      });
    }
    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw).map(([key, val]) => {
        const qNum = parseInt(key.replace(/\D/g, ''), 10) || 1;
        if (typeof val === 'object' && val !== null) {
          return {
            questionNo: val.questionNo || qNum,
            questionId: val.questionId || key,
            userAnswer: val.userAnswer !== undefined ? val.userAnswer : (val.answer !== undefined ? val.answer : val.selectedOption),
            userAnswerText: val.userAnswerText || val.textAnswer || val.textVal || '',
            isCorrect: val.isCorrect,
            ...val
          };
        }
        return {
          questionNo: qNum,
          questionId: key,
          userAnswer: val,
          userAnswerText: typeof val === 'string' && val.length > 1 ? val : '',
          isCorrect: null
        };
      });
    }
    return [];
  }, [submission]);

  const reEvalCorrect = (ansObj, qObj, qNo) => {
    const uAns = ansObj?.userAnswer;
    const hasAns = uAns !== null && uAns !== undefined && uAns !== '';
    const hasText = Boolean(ansObj?.userAnswerText || ansObj?.textAnswer);
    
    if (hasAns) {
      const uIdx = normalizeAnsIndex(uAns);
      const keySource = test.answerKey || qObj?.answerKey || questions[0]?.answerKey;
      const rawCorrectKey = Array.isArray(keySource)
        ? keySource[qNo - 1]
        : (keySource && typeof keySource === 'object' ? (keySource[qNo] ?? keySource[String(qNo)]) : qObj?.correctAnswer);
      const cIdx = normalizeAnsIndex(rawCorrectKey !== undefined && rawCorrectKey !== null ? rawCorrectKey : qObj?.correctAnswer);

      if (uIdx !== null && cIdx !== null) {
        return uIdx === cIdx;
      }

      const computed = checkIsAnswerCorrect(uAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo);
      if (computed !== null && computed !== undefined) return computed;
    }

    if (hasText) {
      if (ansObj?.isCorrect !== undefined && ansObj?.isCorrect !== null) {
        return ansObj.isCorrect;
      }
      return null;
    }
    
    return null;
  };

  const activeQuestion = resolvedQuestions[currentIndex] || questions[currentIndex] || questions[0] || {};
  const activeAnsObj = answersList.find(a => Number(a.questionNo) === currentIndex + 1 || String(a.questionId) === `q_${currentIndex + 1}` || String(a.questionId).endsWith(`_${currentIndex + 1}`)) || answersList[currentIndex] || {};

  const userAns = activeAnsObj.userAnswer;
  const textAns = activeAnsObj.userAnswerText;

  const isCorrect = reEvalCorrect(activeAnsObj, activeQuestion, currentIndex + 1);

  const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

  const rawImages = activeQuestion.imageUrls || (activeQuestion.imageUrl ? [activeQuestion.imageUrl] : (activeQuestion.contentPayload ? [activeQuestion.contentPayload] : []));
  const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

  const questionText = extractQuestionText(activeQuestion, test, currentIndex);

  const optionsList = extractQuestionOptions(activeQuestion, test);

  const keySource = test.answerKey || activeQuestion.answerKey || questions[0]?.answerKey;
  const rawCorrectKey = Array.isArray(keySource)
    ? keySource[currentIndex]
    : (keySource && typeof keySource === 'object' ? (keySource[currentIndex + 1] ?? keySource[currentIndex]) : activeQuestion.correctAnswer);

  const displayCorrectIndex = (rawCorrectKey !== undefined && rawCorrectKey !== null)
    ? (typeof rawCorrectKey === 'number' ? rawCorrectKey : (typeof rawCorrectKey === 'string' && /^[A-Ea-e]$/.test(rawCorrectKey.trim()) ? rawCorrectKey.trim().toUpperCase().charCodeAt(0) - 65 : null))
    : activeQuestion.correctAnswer;

  const isEvaluated = Boolean(
    submission.isEvaluatedByTeacher ||
    submission.status === 'completed' ||
    submission.status === 'evaluated' ||
    submission.status === 'graded'
  );

  const stats = useMemo(() => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;

    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = resolvedQuestions[idx] || questions[idx] || questions[0] || {};
      const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx] || {};

      const uAns = ansObj.userAnswer;
      const tAns = ansObj.userAnswerText;

      const evalCorrect = reEvalCorrect(ansObj, qObj, qNo);

      const hasAns = uAns !== null && uAns !== undefined && uAns !== '';

      if (evalCorrect === true) {
        cCount++;
      } else if (evalCorrect === false && (hasAns || ansObj.score === 0)) {
        wCount++;
      } else if (hasAns) {
        cCount++;
      } else if (tAns) {
        if (evalCorrect === true) cCount++;
        else if (evalCorrect === false) wCount++;
        else bCount++;
      } else {
        bCount++;
      }
    });

    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount };
  }, [qCount, resolvedQuestions, questions, answers, test, submission, isEvaluated]);

  const { correctCount, wrongCount, blankCount } = stats;
  const totalCount = correctCount + wrongCount + blankCount;
  const scorePercentage = (isEvaluated && submission.isEvaluatedByTeacher && submission.score !== undefined && submission.score !== null)
    ? submission.score
    : (totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : (submission.score || 0));

  const answersMap = useMemo(() => {
    const map = {};
    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = resolvedQuestions[idx] || questions[idx] || {};
      const foundAns = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx];
      if (foundAns) {
        const evalCorrect = reEvalCorrect(foundAns, qObj, qNo);
        map[qNo] = { ...foundAns, isCorrect: evalCorrect };
      }
    });
    return map;
  }, [qCount, resolvedQuestions, questions, answers]);

  const isOpenEndedMode = useMemo(() => {
    // 1. If the test as a whole is EXPLICITLY Open-Ended (Overrides everything!)
    if (
      test.questionType === 'acik_uclu' ||
      test.type === 'acik_uclu' ||
      test.contentType === 'acik_uclu' ||
      test.isOpenEnded
    ) {
      return true;
    }

    const isTestExplicitlyMC = (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0) ||
      (Array.isArray(questions[0]?.answerKey) && questions[0]?.answerKey.length > 0)
    );

    const hasMCQuestions = resolvedQuestions.length > 0 && resolvedQuestions.some(q => 
      q.type === 'coktan_secmeli' || q.questionType === 'coktan_secmeli'
    );
    const hasOEQuestions = resolvedQuestions.some(q =>
      q.type === 'acik_uclu' || q.type === 'yazili' || q.contentType === 'acik_uclu' || q.contentType === 'yazili' || q.isOpenEnded
    );

    if (isTestExplicitlyMC || (hasMCQuestions && !hasOEQuestions)) {
      return false;
    }

    if (test.title && (
      test.title.toLowerCase().includes('açık uçlu') ||
      test.title.toLowerCase().includes('acik uclu') ||
      test.title.toLowerCase().includes('yazılı') ||
      test.title.toLowerCase().includes('yazili')
    )) {
      return true;
    }

    return hasOEQuestions;
  }, [test, questions, resolvedQuestions]);

  const isMobile = useMediaQuery('(max-width: 768px)');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
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
        position: 'sticky',
        top: 0,
        zIndex: 10,
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
                📝 Standart Metin Sınav İncelemesi
              </div>
            )}
          </div>
        </div>

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
              %{scorePct}
            </div>
          </div>
        )}
      </header>

      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}
      >
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#0284c7' }}>
              Soru {currentIndex + 1}
            </h3>

            {(() => {
              const isQOpenEnded = isOpenEndedMode || textAns || activeAnsObj.userAnswerText || activeQuestion.type === 'acik_uclu';

              if (!hasAnswer && !textAns && !activeAnsObj.userAnswerText) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    BOŞ
                  </span>
                );
              }

              if (isQOpenEnded && !isEvaluated) {
                if (textAns || activeAnsObj.userAnswerText) {
                  return (
                    <span style={{ padding: '0.35rem 0.75rem', background: '#faf5ff', color: '#7c3aed', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e9d5ff' }}>
                      ✍️ DEĞERLENDİRME BEKLİYOR
                    </span>
                  );
                }
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    BOŞ
                  </span>
                );
              }

              if (isCorrect === true || activeAnsObj.score > 0) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f0fdf4', color: '#15803d', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #bbf7d0' }}>
                    <CheckCircle size={16} /> {isQOpenEnded ? `DOĞRU (${activeAnsObj.score ?? 10} Puan)` : 'DOĞRU'}
                  </span>
                );
              }

              if (isCorrect === false && (hasAnswer || activeAnsObj.score === 0)) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #fecaca' }}>
                    <XCircle size={16} /> {isQOpenEnded ? 'YANLIŞ (0 Puan)' : 'YANLIŞ'}
                  </span>
                );
              }

              if (hasAnswer) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f0f9ff', color: '#0369a1', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #bae6fd' }}>
                    ✓ CEVAPLANDI
                  </span>
                );
              }

              return (
                <span style={{ padding: '0.35rem 0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                  BOŞ
                </span>
              );
            })()}
          </div>

          {imageUrls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {imageUrls.map((url, imgIdx) => (
                <StandardImageFrame
                  key={imgIdx}
                  src={url}
                  alt={`Soru ${currentIndex + 1} Görsel`}
                  onOpenFullscreen={() => setLightboxSrc(url)}
                />
              ))}
            </div>
          )}

          {questionText && (
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.6 }}>
              {questionText}
            </div>
          )}

          {textAns ? (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>YAZILI CEVABINIZ</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {textAns}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {optionsList.map((opt, optIdx) => {
                const optLabel = String.fromCharCode(65 + optIdx);
                const optText = typeof opt === 'string' ? opt : (opt?.text || opt?.label || opt?.optionText || optLabel);

                const userAnsIdx = normalizeAnsIndex(userAns);
                const correctIdx = normalizeAnsIndex(displayCorrectIndex);

                const isUserChoice = userAnsIdx !== null && userAnsIdx === optIdx;
                const isCorrectOption = correctIdx !== null && correctIdx === optIdx;

                let border = '1px solid #cbd5e1';
                let bg = '#ffffff';
                let textColor = '#334155';

                if (isCorrectOption) {
                  border = '2px solid #16a34a';
                  bg = '#f0fdf4';
                  textColor = '#15803d';
                } else if (isUserChoice && !isCorrectOption) {
                  border = '2px solid #dc2626';
                  bg = '#fef2f2';
                  textColor = '#b91c1c';
                }

                return (
                  <div
                    key={optIdx}
                    style={{
                      padding: '0.85rem 1.1rem',
                      borderRadius: '0.85rem',
                      border,
                      background: bg,
                      color: textColor,
                      fontWeight: isUserChoice || isCorrectOption ? 900 : 700,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isCorrectOption ? '#16a34a' : (isUserChoice ? '#dc2626' : '#f1f5f9'), color: (isCorrectOption || isUserChoice) ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                      {optLabel}
                    </div>
                    <span style={{ flexGrow: 1 }}>{optText}</span>
                    {isUserChoice && isCorrectOption && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#15803d' }}>✓ SENİN SEÇİMİN (DOĞRU)</span>}
                    {!isUserChoice && isCorrectOption && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#15803d' }}>✓ DOĞRU CEVAP</span>}
                    {isUserChoice && !isCorrectOption && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#b91c1c' }}>✕ SENİN SEÇİMİN</span>}
                  </div>
                );
              })}
            </div>
          )}

          {activeQuestion.solutionText && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.85rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1e40af', fontSize: '0.9rem' }}>
              <strong style={{ color: '#1d4ed8' }}>💡 Çözüm Açıklaması: </strong> {activeQuestion.solutionText}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: '1.5px solid #cbd5e1',
              background: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
              color: currentIndex === 0 ? '#94a3b8' : '#334155',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ChevronLeft size={18} /> Önceki Soru
          </button>

          <button
            onClick={() => setCurrentIndex(Math.min(qCount - 1, currentIndex + 1))}
            disabled={currentIndex === qCount - 1}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: currentIndex === qCount - 1 ? '#f1f5f9' : '#4f46e5',
              color: currentIndex === qCount - 1 ? '#94a3b8' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: currentIndex === qCount - 1 ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)'
            }}
          >
            Sonraki Soru <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <ImageLightbox isOpen={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
