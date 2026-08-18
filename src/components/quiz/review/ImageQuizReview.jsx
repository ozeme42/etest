import React, { useState, useEffect, useMemo, useRef } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

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
    // 1. Direct answer key length (Most authoritative!)
    const keyArray = test.answerKey || bundleQ.answerKey;
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
    if (Array.isArray(bundleQ.questionsList) && bundleQ.questionsList.length > 0) {
      return bundleQ.questionsList.length;
    }
    if (Array.isArray(questions) && questions.length > 1) {
      return questions.length;
    }
    if (Array.isArray(allImageUrls) && allImageUrls.length > 1) {
      return allImageUrls.length;
    }

    // 3. Title regex (e.g. "(2 Soru)" or "2 Soru")
    const titles = [test.title, test.name, bundleQ.title, bundleQ.name, submission?.testTitle, submission?.title];
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
      bundleQ.questionCount ||
      submission?.totalQuestions ||
      test.totalQuestions ||
      test.questionsCount ||
      bundleQ.totalQuestions
    );
    if (explicit && explicit > 0) return explicit;

    return 1;
  }, [submission?.totalQuestions, test, questions, bundleQ, allImageUrls.length, answers]);

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
                🖼️ Görsel Formatında Sınav İncelemesi
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

      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#0284c7' }}>
              Soru {currentIndex + 1} İncelemesi
            </h3>

            {(() => {
              const isQOpenEnded = isOpenEndedMode || textAns || activeAnsObj.userAnswerText || activeQuestion.type === 'acik_uclu';

              if (isQOpenEnded && !isEvaluated) {
                if (textAns || activeAnsObj.userAnswerText) {
                  return (
                    <span style={{ padding: '0.35rem 0.75rem', background: '#faf5ff', color: '#7c3aed', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      ✍️ DEĞERLENDİRME BEKLİYOR
                    </span>
                  );
                }
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    BOŞ BIRAKILDI
                  </span>
                );
              }

              if (!hasAnswer && !textAns && !activeAnsObj.userAnswerText) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    BOŞ BIRAKILDI
                  </span>
                );
              }

              if (isCorrect === true || activeAnsObj.score > 0) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#f0fdf4', color: '#15803d', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #bbf7d0' }}>
                    <CheckCircle size={16} /> {isQOpenEnded ? `DOĞRU (${activeAnsObj.score ?? 10} Puan)` : 'DOĞRU CEVAPLADIN'}
                  </span>
                );
              }

              if (isCorrect === false && (hasAnswer || activeAnsObj.score === 0)) {
                return (
                  <span style={{ padding: '0.35rem 0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #fecaca' }}>
                    <XCircle size={16} /> {isQOpenEnded ? 'YANLIŞ (0 Puan)' : 'YANLIŞ CEVAPLADIN'}
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
            <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>YAZILI CEVABINIZ</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {textAns}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: isCorrect === true ? '#f0fdf4' : isCorrect === false ? '#fef2f2' : '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: `1.5px solid ${isCorrect === true ? '#bbf7d0' : isCorrect === false ? '#fecaca' : '#e2e8f0'}` }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>SENİN CEVABIN</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isCorrect === true ? '#15803d' : isCorrect === false ? '#b91c1c' : '#334155', marginTop: '0.25rem' }}>
                  {hasAnswer
                    ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : userAns)
                    : 'Boş'}
                </div>
              </div>

              {displayCorrectKey && (
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.85rem', border: '1.5px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#15803d' }}>DOĞRU CEVAP</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
                    {displayCorrectKey}
                  </div>
                </div>
              )}
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
