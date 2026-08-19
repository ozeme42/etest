import React, { useState, useEffect, useMemo, useRef } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useAuth } from '../../../context/AuthContext';

export default function ImageQuizReview({ submission, test, questions = [], onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

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
      if (resolved) setIdbPayload(resolved);
      loadedRef.current = testId;
    }
    loadFromIdb();
  }, [test, questions]);

  const allAvailableImages = useMemo(() => {
    const collected = [];
    const directUrls = test.imageUrls || bundleQ.imageUrls;
    if (Array.isArray(directUrls)) collected.push(...directUrls.filter(isValidImageUrl));
    if (test.imageUrl && isValidImageUrl(test.imageUrl)) collected.push(test.imageUrl);
    if (bundleQ.imageUrl && isValidImageUrl(bundleQ.imageUrl)) collected.push(bundleQ.imageUrl);
    if (idbPayload && isValidImageUrl(idbPayload)) collected.push(idbPayload);
    questions.forEach(q => {
      if (q.imageUrl && isValidImageUrl(q.imageUrl)) collected.push(q.imageUrl);
      if (Array.isArray(q.imageUrls)) collected.push(...q.imageUrls.filter(isValidImageUrl));
    });
    return Array.from(new Set(collected));
  }, [test, bundleQ, idbPayload, questions]);

  const qCount = useMemo(() => {
    const keyArray = test.answerKey || bundleQ.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) return keyArray.length;
    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) return test.questionsList.length;
    if (Array.isArray(test.questionIds) && test.questionIds.length > 0) return test.questionIds.length;
    if (Array.isArray(questions) && questions.length > 0) return questions.length;
    if (allAvailableImages.length > 0) return allAvailableImages.length;
    if (Array.isArray(answers) && answers.length > 0) return answers.length;
    return 1;
  }, [test, bundleQ, questions, allAvailableImages, answers]);

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

  const activeQuestion = questions[currentIndex] || bundleQ || {};
  const activeAnsObj = answers.find(a => (a.questionNo === currentIndex + 1 || String(a.questionId).includes(`_${currentIndex + 1}`))) || answers[currentIndex] || {};

  const userAns = activeAnsObj.userAnswer;
  const textAns = activeAnsObj.userAnswerText;
  const hasAnswer = userAns !== null && userAns !== undefined && userAns !== '';

  const isOpenEndedMode = useMemo(() => {
    if (test.questionType === 'coktan_secmeli' || test.type === 'coktan_secmeli' || (Array.isArray(test.answerKey) && test.answerKey.length > 0)) {
      return false;
    }
    return Boolean(
      test.questionType === 'gorsel_klasik' || test.type === 'gorsel_klasik' || test.questionType === 'acik_uclu' || test.type === 'acik_uclu' || test.isOpenEnded ||
      (test.title && (test.title.toLowerCase().includes('açık uçlu') || test.title.toLowerCase().includes('görsel'))) ||
      questions.some(q => q.type === 'acik_uclu' || q.type === 'gorsel_klasik' || q.isOpenEnded)
    );
  }, [test, questions]);

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

  const imageUrls = useMemo(() => {
    const collected = [];
    if (activeQuestion.imageUrl && isValidImageUrl(activeQuestion.imageUrl)) collected.push(activeQuestion.imageUrl);
    if (Array.isArray(activeQuestion.imageUrls)) collected.push(...activeQuestion.imageUrls.filter(isValidImageUrl));
    if (collected.length === 0 && allAvailableImages.length > 0) {
      if (allAvailableImages.length === qCount && allAvailableImages[currentIndex]) collected.push(allAvailableImages[currentIndex]);
      else if (allAvailableImages[0]) collected.push(allAvailableImages[0]);
    }
    return collected;
  }, [activeQuestion, allAvailableImages, currentIndex, qCount]);

  const answersMap = useMemo(() => {
    const map = {};
    for (let i = 0; i < qCount; i++) {
      const qNo = i + 1;
      const ans = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[i];
      if (ans) {
        const sc = questionScores[qNo] ?? (ans.score !== undefined ? Number(ans.score) : null);
        const isC = sc !== null ? sc >= 5 : ans.isCorrect;
        map[i] = {
          userAnswer: ans.userAnswer,
          isCorrect: isC,
          hasAnswer: ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== ''
        };
      }
    }
    return map;
  }, [qCount, answers, questionScores]);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const currentQNo = currentIndex + 1;
  const currentScore = questionScores[currentQNo] ?? (activeAnsObj.score !== undefined ? Number(activeAnsObj.score) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
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
              {submission.studentName ? `🎓 ${submission.studentName} — ` : ''}{test.title || test.name || 'Görselli Sınav'}
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              🖼️ Görselli Soru & Değerlendirme
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

      <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#4f46e5' }}>
              Soru {currentQNo} İncelemesi & Puanlama
            </h3>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: currentScore === 10 ? '#15803d' : (currentScore >= 5 ? '#d97706' : '#7c3aed') }}>
              Verilen Not: {currentScore} / 10 Puan
            </span>
          </div>

          {imageUrls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {imageUrls.map((url, imgIdx) => (
                <StandardImageFrame
                  key={imgIdx}
                  src={url}
                  alt={`Soru ${currentQNo} Görsel`}
                  onOpenFullscreen={() => setLightboxSrc(url)}
                />
              ))}
            </div>
          )}

          {/* Soru Metni Varsa */}
          {activeQuestion.questionText && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }}>
              {activeQuestion.questionText}
            </div>
          )}

          {/* Öğrencinin Yazılı Yanıtı */}
          <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>✍️ ÖĞRENCİNİN YAZILI CEVABI:</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {textAns || activeAnsObj.userAnswer || '(Öğrenci bu soruya yazılı yanıt vermedi - Boş)'}
            </div>
          </div>

          {/* Öğretmen Puanlama Butonları & Not */}
          {isTeacherMode && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#334155' }}>🎯 Puan Ver:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 10 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1', background: currentScore === 10 ? '#16a34a' : '#ffffff', color: currentScore === 10 ? '#ffffff' : '#15803d', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ✓ Doğru (D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 0 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1', background: currentScore === 0 ? '#dc2626' : '#ffffff', color: currentScore === 0 ? '#ffffff' : '#b91c1c', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ✗ Yanlış (Y)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 0 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ○ Boş (B)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 5 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 5 ? '2px solid #d97706' : '1px solid #cbd5e1', background: currentScore === 5 ? '#d97706' : '#ffffff', color: currentScore === 5 ? '#ffffff' : '#d97706', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ½ Yarım (5P)
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Bu soru için öğrenciye geri bildirim notu..."
                value={teacherNotes[currentQNo] || ''}
                onChange={e => setTeacherNotes(p => ({ ...p, [currentQNo]: e.target.value }))}
                style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        {/* Genel Karne & İleri/Geri */}
        {isTeacherMode && (
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '1.25rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4f46e5' }}>💬 Genel Değerlendirme & Karne Notu:</div>
            <textarea
              rows="2"
              placeholder="Öğrencinin bu sınavı için genel karne notunuz..."
              value={overallFeedback}
              onChange={e => setOverallFeedback(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
            />
            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: currentIndex === 0 ? '#f1f5f9' : '#ffffff', color: currentIndex === 0 ? '#94a3b8' : '#334155', fontWeight: 800, fontSize: '0.9rem', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ChevronLeft size={18} /> Önceki Soru
          </button>

          <button
            onClick={() => setCurrentIndex(Math.min(qCount - 1, currentIndex + 1))}
            disabled={currentIndex === qCount - 1}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', border: 'none', background: currentIndex === qCount - 1 ? '#f1f5f9' : '#4f46e5', color: currentIndex === qCount - 1 ? '#94a3b8' : '#ffffff', fontWeight: 800, fontSize: '0.9rem', cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: currentIndex === qCount - 1 ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)' }}
          >
            Sonraki Soru <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <ImageLightbox isOpen={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
