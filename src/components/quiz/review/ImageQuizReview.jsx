import React, { useState, useMemo } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';

export default function ImageQuizReview({ submission, test, questions = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const handleGoBack = () => {
    if (location.state?.from && !location.state.from.includes('/quiz/')) {
      navigate(location.state.from, { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  };

  const answers = submission.answers || [];
  const bundleQ = questions[0] || {};

  const allImageUrls = useMemo(() => {
    const urls = [];
    if (questions.length > 1) {
      questions.forEach(q => {
        const u = q.imageUrls || (q.imageUrl ? [q.imageUrl] : (q.contentPayload ? [q.contentPayload] : []));
        if (Array.isArray(u)) urls.push(...u);
        else if (u) urls.push(u);
      });
    } else if (bundleQ) {
      const u = bundleQ.imageUrls || (bundleQ.imageUrl ? [bundleQ.imageUrl] : (bundleQ.contentPayload ? bundleQ.contentPayload.split(/\n\n|\n|\|/) : []));
      if (Array.isArray(u)) urls.push(...u);
      else if (u) urls.push(u);
    }
    return urls.filter(isValidImageUrl);
  }, [questions, bundleQ]);

  const qCount = useMemo(() => {
    let count = Number(
      submission.totalQuestions ||
      test.questionCount ||
      test.totalQuestions ||
      bundleQ.questionCount ||
      (questions.length > 1 ? questions.length : null) ||
      allImageUrls.length ||
      (bundleQ.questionsList?.length) ||
      (test.questionsList?.length) ||
      answers.length
    );

    const keyArray = test.answerKey || bundleQ.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) {
      return Math.max(keyArray.length, answers.length, count || 1);
    }

    if (answers.length > 1) {
      return Math.max(answers.length, count || 1);
    }

    return count > 0 ? count : (answers.length || 1);
  }, [submission.totalQuestions, test, questions, bundleQ, allImageUrls.length, answers]);

  const activeQuestion = questions[currentIndex] || questions[0] || {};
  const activeImageUrl = allImageUrls[currentIndex] || activeQuestion.imageUrl || activeQuestion.contentPayload;
  const imageUrls = activeImageUrl ? [activeImageUrl].filter(isValidImageUrl) : [];

  const activeAnsObj = answers.find(a => (a.questionNo === currentIndex + 1 || String(a.questionId).includes(`_${currentIndex + 1}`))) || answers[currentIndex] || {};
  const userAns = activeAnsObj.userAnswer;
  const textAns = activeAnsObj.userAnswerText;

  const isCorrect = (activeAnsObj.isCorrect !== undefined && activeAnsObj.isCorrect !== null)
    ? activeAnsObj.isCorrect
    : checkIsAnswerCorrect(userAns, activeQuestion, test, currentIndex + 1);

  const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

  const keySource = test.answerKey || bundleQ.answerKey || test.opticAnswers || bundleQ.opticAnswers;
  const rawCorrectKey = Array.isArray(keySource)
    ? keySource[currentIndex]
    : (keySource && typeof keySource === 'object' ? (keySource[currentIndex + 1] ?? keySource[currentIndex]) : activeQuestion.correctAnswer);

  const displayCorrectKey = (rawCorrectKey !== undefined && rawCorrectKey !== null)
    ? (typeof rawCorrectKey === 'number' ? String.fromCharCode(65 + rawCorrectKey) : String(rawCorrectKey).toUpperCase())
    : null;

  const isEvaluated = Boolean(
    submission?.isEvaluatedByTeacher ||
    submission?.status === 'completed' ||
    submission?.status === 'evaluated' ||
    submission?.status === 'graded'
  );

  const stats = useMemo(() => {
    if (submission?.correctCount !== undefined && submission?.wrongCount !== undefined && isEvaluated) {
      return {
        correctCount: submission.correctCount || 0,
        wrongCount: submission.wrongCount || 0,
        blankCount: submission.blankCount ?? Math.max(0, qCount - ((submission.correctCount || 0) + (submission.wrongCount || 0)))
      };
    }

    let cCount = 0;
    let wCount = 0;
    let bCount = 0;

    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || questions[0] || {};
      const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx] || {};

      const uAns = ansObj.userAnswer;
      const tAns = ansObj.userAnswerText;

      const evalCorrect = (ansObj.isCorrect !== undefined && ansObj.isCorrect !== null)
        ? ansObj.isCorrect
        : checkIsAnswerCorrect(uAns, qObj, test, qNo);

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
  }, [qCount, questions, answers, test, submission, isEvaluated]);

  const { correctCount, wrongCount, blankCount } = stats;
  const totalCount = correctCount + wrongCount + blankCount;
  const scorePercentage = (submission?.score !== undefined && submission?.score !== null)
    ? submission.score
    : (totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0);

  // Map answers for grid navigator
  const answersMap = useMemo(() => {
    const map = {};
    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || questions[0] || {};
      const foundAns = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[idx];
      if (foundAns) map[qNo] = foundAns;
    });
    return map;
  }, [qCount, questions, answers]);

  const isOpenEndedMode = useMemo(() => {
    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0) ||
      (Array.isArray(questions[0]?.answerKey) && questions[0]?.answerKey.length > 0)
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

    return questions.some(q =>
      q.type === 'acik_uclu' ||
      q.type === 'yazili' ||
      q.contentType === 'acik_uclu' ||
      q.contentType === 'yazili' ||
      q.isOpenEnded
    );
  }, [test, questions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>{test.title} — İnceleme Raporu</h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🖼️ Görsel Formatında Sınav İncelemesi</div>
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

      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#ec4899' }}>
              Soru {currentIndex + 1} İncelemesi
            </h3>

            {(() => {
              const isQOpenEnded = isOpenEndedMode || textAns || activeAnsObj.userAnswerText || activeQuestion.type === 'acik_uclu';

              if (isQOpenEnded && !isEvaluated) {
                if (textAns || activeAnsObj.userAnswerText) {
                  return (
                    <span style={{ padding: '0.35rem 0.75rem', background: '#78350f', color: '#fef3c7', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      ✍️ DEĞERLENDİRME BEKLİYOR
                    </span>
                  );
                }
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#334155', color: '#94a3b8', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #475569' }}>
                    BOŞ BIRAKILDI
                  </span>
                );
              }

              if (isCorrect === true || activeAnsObj.score > 0) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#064e3b', color: '#34d399', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #059669' }}>
                    <CheckCircle size={16} /> {isQOpenEnded ? `DOĞRU (${activeAnsObj.score ?? 10} Puan)` : 'DOĞRU CEVAPLADIN'}
                  </span>
                );
              }

              if (isCorrect === false) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#7f1d1d', color: '#f87171', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #dc2626' }}>
                    <XCircle size={16} /> {isQOpenEnded ? 'YANLIŞ (0 Puan)' : 'YANLIŞ CEVAPLADIN'}
                  </span>
                );
              }

              if (hasAnswer) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#075985', color: '#38bdf8', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #0284c7' }}>
                    ✓ CEVAPLANDI
                  </span>
                );
              }

              return (
                <span style={{ padding: '0.35rem 0.75rem', background: '#334155', color: '#94a3b8', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #475569' }}>
                  BOŞ BIRAKILDI
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

          {textAns ? (
            <div style={{ marginTop: '1rem', background: '#0f172a', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>YAZILI CEVABINIZ</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', color: '#f8fafc', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {textAns}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: isCorrect === true ? 'rgba(6,78,59,0.4)' : isCorrect === false ? 'rgba(127,29,29,0.4)' : '#0f172a', padding: '1rem', borderRadius: '0.85rem', border: `1px solid ${isCorrect === true ? '#059669' : isCorrect === false ? '#dc2626' : '#334155'}` }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8' }}>SENİN CEVABIN</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isCorrect === true ? '#34d399' : isCorrect === false ? '#f87171' : '#cbd5e1', marginTop: '0.25rem' }}>
                  {hasAnswer
                    ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : userAns)
                    : 'Boş'}
                </div>
              </div>

              {displayCorrectKey && (
                <div style={{ background: 'rgba(6,78,59,0.4)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #059669' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#34d399' }}>DOĞRU CEVAP</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399', marginTop: '0.25rem' }}>
                    {displayCorrectKey}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeQuestion.solutionText && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.85rem', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: '0.9rem' }}>
              <strong>💡 Çözüm Açıklaması: </strong> {activeQuestion.solutionText}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: '1px solid #cbd5e1',
              background: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
              color: currentIndex === 0 ? '#94a3b8' : '#1e293b',
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
              background: currentIndex === qCount - 1 ? '#e2e8f0' : '#ec4899',
              color: currentIndex === qCount - 1 ? '#94a3b8' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
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
