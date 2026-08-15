import React, { useState, useEffect, useMemo, useRef } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';

export default function ImageQuizReview({ submission, test, questions = [], onClose }) {
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
  const bundleQ = questions[0] || {};

  const loadedRef = useRef(null);
  const [idbPayload, setIdbPayload] = useState(null);

  const extractPayload = (obj) => {
    if (!obj) return null;
    const candidates = [obj.contentPayload, obj.imageUrl, obj.url, obj.imagePayload, obj.payload];
    return candidates.find(c => typeof c === 'string' && c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  useEffect(() => {
    const testId = test.id;
    if (extractPayload(test)) return;
    if (loadedRef.current === testId) return;

    async function loadFromIdb() {
      const ids = [testId, testId?.replace(/^q_/, ''), questions?.[0]?.id, test.questionsList?.[0]?.id].filter(Boolean);
      let resolved = null;
      for (const id of ids) {
        const val = await idbGetPayload(id);
        if (val && val !== '[STORED_IN_INDEXEDDB]') { resolved = val; break; }
      }
      if (!resolved && questions?.length > 0) {
        for (const q of questions) {
          const c = extractPayload(q);
          if (c) { resolved = c; break; }
          if (q.id) { const val = await idbGetPayload(q.id); if (val) { resolved = val; break; } }
        }
      }
      if (resolved) { loadedRef.current = testId; setIdbPayload(resolved); }
    }
    loadFromIdb();
  }, [test.id, test.contentPayload, questions]);

  const allImageUrls = useMemo(() => {
    const urls = [];
    const getObjUrls = (obj) => {
      if (!obj) return [];
      if (obj.imageUrls && Array.isArray(obj.imageUrls) && obj.imageUrls.length > 0) return obj.imageUrls;
      if (obj.imageUrl && typeof obj.imageUrl === 'string' && obj.imageUrl !== '[STORED_IN_INDEXEDDB]') return [obj.imageUrl];
      const payload = extractPayload(obj) || idbPayload;
      if (payload && typeof payload === 'string') {
        if (payload.startsWith('http') || payload.startsWith('data:image')) return [payload];
        if (payload.includes('|') || payload.includes('\n')) return payload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean);
      }
      if (obj.url && typeof obj.url === 'string') return [obj.url];
      return [];
    };

    if (questions.length > 0) {
      questions.forEach(q => urls.push(...getObjUrls(q)));
    }
    if (urls.length === 0) {
      urls.push(...getObjUrls(test));
    }
    if (urls.length === 0 && bundleQ) {
      urls.push(...getObjUrls(bundleQ));
    }
    return urls.filter(isValidImageUrl);
  }, [questions, bundleQ, test, idbPayload]);

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
  
  const activeImageUrl = useMemo(() => {
    const qDirect = activeQuestion.imageUrl || (activeQuestion.imageUrls && activeQuestion.imageUrls[0]) || activeQuestion.contentPayload;
    if (qDirect && isValidImageUrl(qDirect) && qDirect !== '[STORED_IN_INDEXEDDB]') {
      return qDirect;
    }
    if (allImageUrls[currentIndex]) {
      return allImageUrls[currentIndex];
    }
    if (allImageUrls.length > 0) {
      return allImageUrls[0];
    }
    const testDirect = test.imageUrl || test.contentPayload || (test.imageUrls && test.imageUrls[0]) || idbPayload;
    if (testDirect && isValidImageUrl(testDirect) && testDirect !== '[STORED_IN_INDEXEDDB]') {
      return testDirect;
    }
    return null;
  }, [activeQuestion, allImageUrls, currentIndex, test, idbPayload]);

  const imageUrls = useMemo(() => {
    // Paket halinde yüklenen görsel soru setlerinde allImageUrls öncelikli
    if (allImageUrls.length > 0) {
      const url = allImageUrls[currentIndex] || allImageUrls[0];
      return url ? [url] : [];
    }
    // Bireysel soruların kendi imageUrls dizisi varsa sadece ilkini al
    if (activeQuestion.imageUrls && Array.isArray(activeQuestion.imageUrls) && activeQuestion.imageUrls.length > 0) {
      const firstValid = activeQuestion.imageUrls.find(isValidImageUrl);
      return firstValid ? [firstValid] : [];
    }
    return activeImageUrl ? [activeImageUrl].filter(isValidImageUrl) : [];
  }, [activeQuestion, allImageUrls, currentIndex, activeImageUrl]);

  const activeAnsObj = answers.find(a => 
    a.questionNo === currentIndex + 1 || 
    String(a.questionId || '').endsWith(`_${currentIndex + 1}`) || 
    a.questionId === `q_${currentIndex + 1}`
  ) || {};
  const userAns = activeAnsObj.userAnswer;
  const textAns = activeAnsObj.userAnswerText;
  const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

  const isCorrect = hasAnswer
    ? checkIsAnswerCorrect(userAns, activeQuestion, { ...test, answerKey: test.answerKey || bundleQ.answerKey || test.opticAnswers || bundleQ.opticAnswers }, currentIndex + 1)
    : (activeAnsObj.isCorrect !== undefined && activeAnsObj.isCorrect !== null ? activeAnsObj.isCorrect : null);


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
    // Sadece answers dizisi boşsa (yani cevaplar yüklenemediyse) submission'dan hazır değerleri al.
    // Aksi takdirde güncel answers dizisi üzerinden her zaman yeniden hesapla.
    if (answers.length === 0 && submission?.correctCount !== undefined && submission?.wrongCount !== undefined && isEvaluated) {
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
      // Sadece questionNo veya questionId ile eşleştir, idx fallback kullanma
      const ansObj = answers.find(a =>
        a.questionNo === qNo ||
        String(a.questionId || '').endsWith(`_${qNo}`) ||
        a.questionId === `q_${qNo}`
      ) || {};

      const uAns = ansObj.userAnswer;
      const tAns = ansObj.userAnswerText;
      const hasAns = uAns !== null && uAns !== undefined && uAns !== '';

      // Çoktan seçmeli sorularda geçmiş hatalı DB kayıtlarını ezmek için her zaman lokal hesaplama yap.
      let evalCorrect;
      if (hasAns) {
        // qObj bundle sınavlarında answersKey içermeyebilir, test'i güçlendir
        evalCorrect = checkIsAnswerCorrect(uAns, qObj, { ...test, answerKey: test.answerKey || bundleQ.answerKey || test.opticAnswers || bundleQ.opticAnswers }, qNo);
      } else if (ansObj.isCorrect !== undefined && ansObj.isCorrect !== null) {
        evalCorrect = ansObj.isCorrect;
      } else {
        evalCorrect = null;
      }

      if (evalCorrect === true) {
        cCount++;
      } else if (hasAns || tAns) {
        // Cevap verilmiş ama yanlış ya da hesaplanamadı
        wCount++;
      } else {
        bCount++;
      }
    });

    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount };
  }, [qCount, questions, answers, test, submission, isEvaluated]);

  const { correctCount, wrongCount, blankCount } = stats;
  const totalCount = correctCount + wrongCount + blankCount;
  const scorePercentage = (isEvaluated && submission?.isEvaluatedByTeacher && submission?.score !== undefined && submission?.score !== null)
    ? submission.score
    : (totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : (submission?.score || 0));

  // Map answers for grid navigator
  const answersMap = useMemo(() => {
    const map = {};
    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || questions[0] || {};
      const foundAns = answers.find(a => 
        a.questionNo === qNo || 
        String(a.questionId || '').endsWith(`_${qNo}`) ||
        a.questionId === `q_${qNo}`
      );
      if (foundAns) {
        const uAns = foundAns.userAnswer;
        const hasAns = uAns !== null && uAns !== undefined && uAns !== '';
        let evalCorrect;
        if (hasAns) {
          evalCorrect = checkIsAnswerCorrect(uAns, qObj, { ...test, answerKey: test.answerKey || bundleQ.answerKey || test.opticAnswers || bundleQ.opticAnswers }, qNo);
        } else if (foundAns.isCorrect !== undefined && foundAns.isCorrect !== null) {
          evalCorrect = foundAns.isCorrect;
        } else {
          evalCorrect = null;
        }
        map[qNo] = { ...foundAns, isCorrect: evalCorrect };
      }
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
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 10 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
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

              if (!hasAnswer && !textAns && !activeAnsObj.userAnswerText) {
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

              if (isCorrect === false && (hasAnswer || activeAnsObj.score === 0)) {
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
