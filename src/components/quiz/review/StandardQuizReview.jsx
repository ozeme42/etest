import React, { useState, useMemo } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight, Save, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import ReviewResultModal from './ReviewResultModal';

function unwrapUserAnswer(val) {
  if (val === undefined || val === null) return null;
  let curr = val;
  while (curr && typeof curr === 'object' && !Array.isArray(curr)) {
    const next = curr.userAnswer ?? curr.user_answer ?? curr.userAns ?? curr.user_ans ?? curr.answer ?? curr.selectedOption ?? curr.selected_option ?? curr.selectedAnswer ?? curr.studentAnswer ?? curr.option ?? curr.value ?? curr.selected;
    if (next === undefined || next === curr) break;
    curr = next;
  }
  if (curr === undefined || curr === null || curr === '') return null;
  if (typeof curr === 'string' && /^[A-Ea-e]$/.test(curr.trim())) {
    return curr.trim().toUpperCase().charCodeAt(0) - 65;
  }
  if (!isNaN(Number(curr)) && String(curr).trim() !== '') {
    return Number(curr);
  }
  return curr;
}

export default function StandardQuizReview({ submission, test, questions = [], onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const isTeacherMode = Boolean(
    currentUser?.role !== 'student' &&
    (
      location.state?.isTeacher ||
      location.state?.fromTeacher ||
      location.search.includes('teacher=true') ||
      currentUser?.role === 'teacher' ||
      currentUser?.role === 'admin'
    )
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
      return questions;
    }
    if (test.questionsList && test.questionsList.length > 0) return test.questionsList;
    if (test.questions && test.questions.length > 0) return test.questions;
    if (test.contentPayload) {
      const parsed = parseJsonList(test.contentPayload);
      if (parsed) return parsed;
    }
    return [];
  }, [questions, test]);

  const qCount = useMemo(() => {
    if (resolvedQuestions.length > 0) return resolvedQuestions.length;
    if (answers.length > 0) return answers.length;
    return test.totalQuestions || test.questionCount || 1;
  }, [resolvedQuestions, answers, test]);

  const activeQuestion = resolvedQuestions[currentIndex] || {};
  const activeAnsObj = answers.find(a => (a.questionNo === (currentIndex + 1) || String(a.questionId).includes(`_${currentIndex + 1}`))) || answers[currentIndex] || {};

  const userAns = activeAnsObj?.userAnswer;
  const textAns = activeAnsObj?.userAnswerText || activeAnsObj?.textAns;
  const hasAnswer = (userAns !== undefined && userAns !== null && userAns !== '') || (textAns !== undefined && textAns !== null && String(textAns).trim() !== '');

  const isOpenEnded = Boolean(
    activeQuestion.isOpenEnded ||
    activeQuestion.openEnded ||
    activeQuestion.type === 'acik_uclu' ||
    activeQuestion.contentType === 'acik_uclu' ||
    activeQuestion.type === 'yazili' ||
    activeQuestion.questionType === 'yazili' ||
    activeQuestion.formatType === 'yazili' ||
    test.isOpenEnded ||
    test.type === 'acik_uclu' ||
    test.questionType === 'acik_uclu' ||
    test.contentType === 'acik_uclu' ||
    test.formatType === 'yazili' ||
    (textAns && !userAns)
  );

  const [questionScores, setQuestionScores] = useState(() => {
    const initial = {};
    if (answers && Array.isArray(answers)) {
      answers.forEach((a, idx) => {
        const qNo = a.questionNo || (idx + 1);
        if (a.score !== undefined && a.score !== null) {
          initial[qNo] = Number(a.score);
        } else if (a.isCorrect === true) {
          initial[qNo] = 10;
        } else if (a.isCorrect === false) {
          initial[qNo] = 0;
        }
      });
    }
    return initial;
  });

  const [teacherNotes, setTeacherNotes] = useState(() => {
    const initial = {};
    if (answers && Array.isArray(answers)) {
      answers.forEach((a, idx) => {
        const qNo = a.questionNo || (idx + 1);
        if (a.teacherFeedback || a.teacherNote) {
          initial[qNo] = a.teacherFeedback || a.teacherNote;
        }
      });
    }
    return initial;
  });

  const [overallFeedback, setOverallFeedback] = useState(submission.teacherFeedback || submission.teacherNote || submission.feedback || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const scorePercentage = useMemo(() => {
    let totalSc = 0;
    let countedQs = 0;

    for (let i = 1; i <= qCount; i++) {
      const sc = questionScores[i];
      if (sc !== undefined && sc !== null && sc !== 'empty') {
        totalSc += Number(sc);
        countedQs++;
      } else {
        const a = answers[i - 1];
        if (a?.isCorrect === true) {
          totalSc += 10;
          countedQs++;
        } else if (a?.isCorrect === false) {
          countedQs++;
        }
      }
    }
    const maxPossible = (qCount || 1) * 10;
    return Math.round((totalSc / maxPossible) * 100);
  }, [qCount, questionScores, answers]);

  const handleSaveEvaluation = async () => {
    setIsSaving(true);
    try {
      const updatedAnswers = [];
      for (let i = 0; i < qCount; i++) {
        const qNo = i + 1;
        const origAns = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[i] || {};
        const sc = questionScores[qNo];
        const note = teacherNotes[qNo] || '';

        let isC = origAns.isCorrect;
        if (sc === 'empty') isC = null;
        else if (sc !== undefined && sc !== null) isC = Number(sc) >= 5;

        updatedAnswers.push({
          ...origAns,
          questionNo: qNo,
          score: sc === 'empty' ? 0 : (sc !== undefined ? Number(sc) : origAns.score),
          isCorrect: isC,
          teacherFeedback: note
        });
      }

      const updatedSub = {
        ...submission,
        answers: updatedAnswers,
        score: scorePercentage,
        teacherFeedback: overallFeedback,
        isEvaluatedByTeacher: true,
        status: 'evaluated',
        evaluatedAt: new Date().toISOString()
      };

      if (updateSubmission) {
        await updateSubmission(submission.id, updatedSub);
      }
      if (updateHomeworkSubmission && (submission.hwId || submission.homeworkId)) {
        await updateHomeworkSubmission(submission.hwId || submission.homeworkId, submission.id, updatedSub);
      }

      setShowResultModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;

    for (let i = 1; i <= qCount; i++) {
      const sc = questionScores[i];
      if (sc !== undefined && sc !== null) {
        if (sc === 'empty') {
          bCount++;
        } else {
          const numSc = Number(sc);
          if (numSc >= 5) cCount++;
          else wCount++;
        }
      } else {
        const a = answers[i - 1];
        if (a?.isCorrect === true) cCount++;
        else if (a?.isCorrect === false) wCount++;
        else bCount++;
      }
    }
    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount };
  }, [qCount, questionScores, answers]);

  const { correctCount, wrongCount, blankCount } = stats;

  const answersMap = useMemo(() => {
    const map = {};
    for (let i = 0; i < qCount; i++) {
      const qNo = i + 1;
      const ans = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[i];
      if (ans) {
        const sc = questionScores[qNo];
        let isC = ans.isCorrect;
        if (sc === 'empty') isC = null;
        else if (sc !== undefined && sc !== null) isC = Number(sc) >= 5;

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
  const teacherCurrentSc = questionScores[currentQNo];
  const currentScore = teacherCurrentSc !== undefined ? teacherCurrentSc : (activeAnsObj.score !== undefined ? Number(activeAnsObj.score) : (hasAnswer ? (activeAnsObj.isCorrect === true ? 10 : 0) : 'empty'));

  const questionText = extractQuestionText(activeQuestion);
  const optionsList = extractQuestionOptions(activeQuestion);

  const imageUrls = useMemo(() => {
    const collected = [];
    if (activeQuestion.imageUrl && isValidImageUrl(activeQuestion.imageUrl)) collected.push(activeQuestion.imageUrl);
    if (Array.isArray(activeQuestion.imageUrls)) collected.push(...activeQuestion.imageUrls.filter(isValidImageUrl));
    return collected;
  }, [activeQuestion]);

  const numericUserAns = useMemo(() => {
    const unwrapped = unwrapUserAnswer(userAns ?? activeAnsObj);
    return typeof unwrapped === 'number' ? unwrapped : null;
  }, [userAns, activeAnsObj]);

  const resolvedCorrectAns = useMemo(() => {
    let corr = null;
    const answerKey = test?.answerKey || questions[0]?.answerKey;
    if (Array.isArray(answerKey)) {
      corr = answerKey[currentQNo - 1];
    } else if (typeof answerKey === 'object' && answerKey !== null) {
      corr = answerKey[currentQNo] ?? answerKey[String(currentQNo)];
    }
    if (corr === null || corr === undefined) {
      corr = activeAnsObj?.correctAnswerLetter || activeAnsObj?.correctAnswer || activeQuestion?.correctAnswerLetter || activeQuestion?.correctAnswer;
    }
    if (corr !== null && corr !== undefined) {
      if (typeof corr === 'string' && /^[A-Ea-e]$/.test(corr.trim())) {
        return corr.trim().toUpperCase().charCodeAt(0) - 65;
      } else if (!isNaN(Number(corr))) {
        return Number(corr);
      }
    }
    if (Array.isArray(optionsList) && optionsList.length > 0) {
      const cIdx = optionsList.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect || o.is_correct)));
      if (cIdx !== -1) return cIdx;
    }
    return null;
  }, [test, questions, currentQNo, activeAnsObj, activeQuestion, optionsList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.75rem 1.5rem',
        background: 'var(--color-surface)',
        borderBottom: '1.5px solid var(--color-border)',
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
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
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
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {submission.studentName ? `🎓 ${submission.studentName} — ` : ''}{test.title || test.name || 'Sınav İncelemesi'}
            </h2>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              📝 Soru Bankası Test İncelemesi
            </div>
          </div>
        </div>

        {/* Action, Theme & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              padding: '0.4rem 0.65rem',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 800
            }}
            title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
          >
            {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            <span style={{ display: isMobile ? 'none' : 'inline' }}>{isDark ? 'Açık' : 'Koyu'}</span>
          </button>

          <div style={{
            background: isOpenEnded && !submission?.isEvaluatedByTeacher && Object.keys(questionScores).length === 0 ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            padding: isMobile ? '0.25rem 0.55rem' : '0.4rem 0.95rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.78rem' : '0.9rem',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
          }}>
            {isOpenEnded && !submission?.isEvaluatedByTeacher && Object.keys(questionScores).length === 0 ? '⏳ Değerlendirmede' : `%${scorePercentage} Puan`}
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

        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#6366f1' }}>
              Soru {currentQNo}
            </h3>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: currentScore === 10 ? '#10b981' : (currentScore >= 5 ? '#f59e0b' : '#8b5cf6') }}>
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

          {questionText && (
            <div style={{ background: 'var(--color-surface-hover)', padding: '1.15rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.6 }}>
              {questionText}
            </div>
          )}

          {optionsList && optionsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {optionsList.map((opt, optIdx) => {
                const optLetter = String.fromCharCode(65 + optIdx);
                let optText = '';
                if (typeof opt === 'string') optText = opt;
                else if (opt && typeof opt === 'object') optText = opt.text || opt.optionText || opt.label || opt.title || opt.value || opt.content || '';
                const showText = Boolean(optText && optText.trim() !== optLetter);

                const isSelected = hasAnswer && numericUserAns === optIdx;
                const isCorrectOpt = resolvedCorrectAns === optIdx;

                let bg = 'var(--color-surface)';
                let border = '1.5px solid var(--color-border-input)';
                let color = 'var(--color-text)';
                let badge = null;

                if (isSelected && isCorrectOpt) {
                  bg = 'rgba(16, 185, 129, 0.12)';
                  border = '2px solid #10b981';
                  color = '#10b981';
                  badge = <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.18)', padding: '0.2rem 0.55rem', borderRadius: '0.4rem' }}>✓ Doğru Yanıtınız</span>;
                } else if (isSelected && !isCorrectOpt) {
                  bg = 'rgba(239, 68, 68, 0.12)';
                  border = '2px solid #ef4444';
                  color = '#ef4444';
                  badge = <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.18)', padding: '0.2rem 0.55rem', borderRadius: '0.4rem' }}>✗ İşaretlediğiniz Yanlış Şık</span>;
                } else if (isCorrectOpt) {
                  if (hasAnswer) {
                    bg = 'rgba(16, 185, 129, 0.12)';
                    border = '2.5px solid #10b981';
                    color = '#10b981';
                    badge = <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.18)', padding: '0.2rem 0.55rem', borderRadius: '0.4rem' }}>✓ Doğru Cevap ({optLetter})</span>;
                  } else {
                    bg = 'rgba(14, 165, 233, 0.1)';
                    border = '2px dashed #0284c7';
                    color = '#0284c7';
                    badge = <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 900, color: '#0284c7', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', padding: '0.2rem 0.55rem', borderRadius: '0.4rem' }}>🔑 Doğru Cevap ({optLetter}) - Boş Bıraktınız</span>;
                  }
                }

                return (
                  <div
                    key={optIdx}
                    style={{
                      padding: '0.9rem 1.25rem',
                      borderRadius: '0.75rem',
                      border,
                      background: bg,
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: (isSelected || isCorrectOpt) ? 900 : 600,
                      fontSize: '0.95rem'
                    }}
                  >
                    <span style={{ fontWeight: 900, marginRight: '0.65rem', minWidth: '24px', color: isSelected ? (isCorrectOpt ? '#10b981' : '#ef4444') : (isCorrectOpt ? '#10b981' : 'var(--color-text-muted)') }}>
                      {optLetter})
                    </span>
                    {showText ? <span>{optText}</span> : <span>Şık {optLetter}</span>}
                    {badge}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Öğrencinin Yazılı Yanıtı (Açık Uçlu) */
            <div style={{ background: hasAnswer ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-surface-hover)', padding: '1.25rem', borderRadius: '1rem', border: hasAnswer ? '1.5px solid rgba(59, 130, 246, 0.3)' : '1.5px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', color: hasAnswer ? '#3b82f6' : 'var(--color-text-muted)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>
                ✍️ ÖĞRENCİNİN CEVABI:
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: hasAnswer ? 'var(--color-text)' : 'var(--color-text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {textAns || (hasAnswer ? `Şık ${String.fromCharCode(65 + (numericUserAns ?? 0))}` : '(Öğrenci bu soruya yanıt vermedi - Boş)')}
              </div>
            </div>
          )}

          {/* Öğretmen Puanlama Butonları & Not */}
          {isTeacherMode ? (
            <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>🎯 Puan Ver:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 10 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 10 ? '2px solid #10b981' : '1px solid var(--color-border-input)', background: currentScore === 10 ? '#10b981' : 'var(--color-surface)', color: currentScore === 10 ? '#ffffff' : '#10b981', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ✓ Doğru (D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 0 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 0 ? '2px solid #ef4444' : '1px solid var(--color-border-input)', background: currentScore === 0 ? '#ef4444' : 'var(--color-surface)', color: currentScore === 0 ? '#ffffff' : '#ef4444', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ✗ Yanlış (Y)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 'empty' }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 'empty' ? '2px solid #64748b' : '1px solid var(--color-border-input)', background: currentScore === 'empty' ? '#64748b' : 'var(--color-surface)', color: currentScore === 'empty' ? '#ffffff' : 'var(--color-text-muted)', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    ○ Boş (B)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 5 }))}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: currentScore === 5 ? '2px solid #f59e0b' : '1px solid var(--color-border-input)', background: currentScore === 5 ? '#f59e0b' : 'var(--color-surface)', color: currentScore === 5 ? '#ffffff' : '#f59e0b', fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
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
                style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ) : teacherNotes[currentQNo] ? (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
              <strong style={{ color: '#3b82f6' }}>💬 Öğretmen Notu: </strong> {teacherNotes[currentQNo]}
            </div>
          ) : null}
        </div>

        {/* Genel Karne & İleri/Geri */}
        {isTeacherMode ? (
          <div style={{ background: 'var(--color-surface)', padding: '1.25rem', borderRadius: '1.25rem', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#6366f1' }}>💬 Genel Değerlendirme & Karne Notu:</div>
            <textarea
              rows="2"
              placeholder="Öğrencinin bu sınavı için genel karne notunuz..."
              value={overallFeedback}
              onChange={e => setOverallFeedback(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
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
        ) : overallFeedback ? (
          <div style={{ background: 'var(--color-surface)', padding: '1.25rem', borderRadius: '1.25rem', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)' }}>👨‍🏫 Öğretmen Değerlendirme Notu / Karne Görüşü:</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
              {overallFeedback}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border-input)', background: currentIndex === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)', color: currentIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)', fontWeight: 800, fontSize: '0.9rem', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ChevronLeft size={18} /> Önceki Soru
          </button>

          <button
            onClick={() => setCurrentIndex(Math.min(qCount - 1, currentIndex + 1))}
            disabled={currentIndex === qCount - 1}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', border: 'none', background: currentIndex === qCount - 1 ? 'var(--color-surface-hover)' : '#4f46e5', color: currentIndex === qCount - 1 ? 'var(--color-text-muted)' : '#ffffff', fontWeight: 800, fontSize: '0.9rem', cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: currentIndex === qCount - 1 ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)' }}
          >
            Sonraki Soru <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <ImageLightbox isOpen={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <ReviewResultModal
        isOpen={showResultModal}
        onClose={handleGoBack}
        studentName={submission.studentName || 'Öğrenci'}
        testTitle={test.title || submission.testTitle || 'Test Sınavı'}
        score={isOpenEnded && !submission?.isEvaluatedByTeacher && Object.keys(questionScores).length === 0 ? null : scorePercentage}
        correctCount={correctCount}
        wrongCount={wrongCount}
        blankCount={blankCount}
        totalQuestions={qCount}
        overallFeedback={overallFeedback}
        isTeacher={isTeacherMode}
        isPending={isOpenEnded && !submission?.isEvaluatedByTeacher && Object.keys(questionScores).length === 0}
      />
    </div>
  );
}
