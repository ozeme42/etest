import React, { useState, useEffect, useMemo, useRef } from 'react';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Save, Clock, Award } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter } from '../../../utils/answerEvaluation';
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
    currentUser?.role !== 'student' &&
    (
      location.state?.isTeacher ||
      location.state?.fromTeacher ||
      location.search.includes('teacher=true') ||
      location.search.includes('from=evaluation') ||
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

  const answers = submission.answers || submission.formattedAnswers || submission.raw_data?.answers || [];

  const isOpenEndedMode = useMemo(() => {
    // 1. If explicitly multiple choice, or has answer key, opticAnswers, or options, NOT open ended!
    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0) ||
      (typeof test.answerKey === 'string' && test.answerKey.trim().length > 0) ||
      (typeof test.answerKey === 'object' && test.answerKey !== null && Object.keys(test.answerKey).length > 0) ||
      (test.opticAnswers && Object.keys(test.opticAnswers).length > 0)
    ) {
      return false;
    }

    // 2. If student answers contain multiple-choice options (e.g. 0, 1, 'A', 'B'), NOT open ended!
    const hasOptionAnswers = answers.some(a => (
      typeof a.userAnswer === 'number' ||
      (typeof a.userAnswer === 'string' && /^[A-Ea-e0-4]$/.test(a.userAnswer.trim()))
    ));
    if (hasOptionAnswers && !answers.some(a => a.isOpenEnded || (a.userAnswerText && String(a.userAnswerText).trim() !== ''))) {
      return false;
    }

    if (
      test.questionType === 'acik_uclu' ||
      test.questionType === 'yazili' ||
      test.type === 'acik_uclu' ||
      test.type === 'yazili' ||
      test.contentType === 'acik_uclu' ||
      test.contentType === 'yazili' ||
      (test.title && (test.title.toLowerCase().includes('açık uçlu') || test.title.toLowerCase().includes('acik uclu') || test.title.toLowerCase().includes('yazılı') || test.title.toLowerCase().includes('yazili') || test.title.toLowerCase().includes('klasik'))) ||
      (submission?.testTitle && (submission.testTitle.toLowerCase().includes('açık uçlu') || submission.testTitle.toLowerCase().includes('acik uclu') || submission.testTitle.toLowerCase().includes('yazılı') || submission.testTitle.toLowerCase().includes('yazili') || submission.testTitle.toLowerCase().includes('klasik'))) ||
      questions.some(q => q.type === 'acik_uclu' || q.type === 'yazili' || q.isOpenEnded) ||
      answers.some(a => a.isOpenEnded || (a.userAnswerText && String(a.userAnswerText).trim() !== ''))
    ) {
      return true;
    }
    return false;
  }, [test, questions, answers, submission]);

  const qCount = useMemo(() => {
    if (Array.isArray(answers) && answers.length > 0) return answers.length;
    if (Array.isArray(submission?.raw_data?.answers) && submission.raw_data.answers.length > 0) return submission.raw_data.answers.length;

    const candidateCounts = [
      test.questionCount, test.questionsCount, test.qCount, test.totalQuestions, test.count,
      questions[0]?.questionCount, questions[0]?.questionsCount, questions[0]?.qCount, questions[0]?.totalQuestions,
      test.contentPayload?.questionCount, test.htmlPayload?.questionCount, test.raw_data?.questionCount,
      submission?.questionCount, submission?.questionsCount, submission?.qCount, submission?.totalQuestions
    ];
    for (const c of candidateCounts) {
      if (c && Number(c) > 0) return Number(c);
    }

    const titles = [test.title, test.name, questions[0]?.title, questions[0]?.name, submission?.testTitle, submission?.title];
    for (const t of titles) {
      if (typeof t === 'string') {
        const match = t.match(/\((\d+)\s*soru\)/i) || t.match(/(\d+)\s*soru/i);
        if (match && Number(match[1]) > 0) return Number(match[1]);
      }
    }

    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) return keyArray.length;
    if (typeof keyArray === 'string' && keyArray.trim().length > 0) return keyArray.trim().length;
    if (typeof keyArray === 'object' && keyArray !== null && Object.keys(keyArray).length > 0) return Object.keys(keyArray).length;

    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) return test.questionsList.length;
    if (Array.isArray(test.questionIds) && test.questionIds.length > 0) return test.questionIds.length;
    if (Array.isArray(questions) && questions.length > 0) return questions.length;

    return 1;
  }, [test, questions, answers, submission]);

  const [idbHtml, setIdbHtml] = useState(null);
  const [questionScores, setQuestionScores] = useState(() => {
    const scores = {};
    for (let i = 1; i <= qCount; i++) {
      const a = (Array.isArray(answers) ? answers.find(ans => (
        Number(ans?.questionNo) === i ||
        Number(ans?.questionNoInSection) === i ||
        Number(ans?.number) === i ||
        Number(ans?.qNo) === i ||
        String(ans?.questionId).includes(`_${i}`) ||
        String(ans?.id).includes(`_${i}`)
      )) : null) || (Array.isArray(answers) ? answers[i - 1] : (typeof answers === 'object' ? (answers[i] || answers[String(i)]) : {})) || {};

      const qObj = questions[i - 1] || questions[0] || {};
      const userAns = a?.userAnswer;
      const textVal = a?.userAnswerText || a?.textAns;
      const hasUserOption = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty' && (typeof userAns === 'number' || /^[A-Ea-e0-4]$/.test(String(userAns).trim())));
      const isQOE = !hasUserOption && (
        a?.isOpenEnded ||
        a?.type === 'acik_uclu' ||
        qObj?.type === 'acik_uclu' ||
        qObj?.isOpenEnded ||
        isOpenEndedMode ||
        (textVal && String(textVal).trim() !== '')
      );

      const hasTeacherGraded = Boolean(
        (submission.isEvaluatedByTeacher === true || submission.status === 'evaluated') &&
        (a?.evaluatedByTeacher === true || (typeof a?.score === 'number' && a.score > 0))
      );

      if (isQOE) {
        if (hasTeacherGraded && a?.score !== undefined && a?.score !== null && a?.score !== '') {
          scores[i] = Number(a.score);
        } else {
          // Open-ended and unevaluated -> 'empty' (pending)
          scores[i] = 'empty';
        }
      } else {
        // Multiple choice
        const hasAns = hasUserOption || (userAns !== undefined && userAns !== null && userAns !== '' && userAns !== 'empty');
        if (a?.score !== undefined && a?.score !== null && a?.score !== '') {
          scores[i] = Number(a.score);
        } else if (hasAns) {
          const resolvedCorrect = resolveQuestionCorrectAnswer(i, qObj, a, test, questions);
          const uLetter = formatAnswerLetter(userAns);
          const cLetter = formatAnswerLetter(resolvedCorrect);
          const isRight = (uLetter && cLetter) ? (uLetter === cLetter) : checkIsAnswerCorrect(userAns, qObj, test, i);
          scores[i] = isRight === true ? 10 : (isRight === false ? 0 : 'empty');
        } else {
          scores[i] = 'empty';
        }
      }
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

  const totalMaxScore = qCount * 10;
  const totalEarnedScore = useMemo(() => {
    let earned = 0;
    for (let i = 1; i <= qCount; i++) {
      const s = questionScores[i];
      if (s !== undefined && s !== null && s !== 'empty') {
        earned += Number(s);
      }
    }
    return earned;
  }, [qCount, questionScores]);

  const isTrulyEvaluated = useMemo(() => {
    if (submission.isEvaluatedByTeacher === true || submission.status === 'evaluated') {
      return (
        totalEarnedScore > 0 ||
        Boolean(submission.teacherFeedback || submission.teacherNote) ||
        Object.values(teacherNotes).some(n => n && n.trim() !== '') ||
        answers.some(a => a.evaluatedByTeacher === true && typeof a.score === 'number')
      );
    }
    return false;
  }, [submission, totalEarnedScore, teacherNotes, answers]);

  const stats = useMemo(() => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;

    Array.from({ length: qCount }).forEach((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || questions[0] || {};
      const ansObj = (Array.isArray(answers) ? answers.find(a => (
        Number(a?.questionNo) === qNo ||
        Number(a?.questionNoInSection) === qNo ||
        Number(a?.number) === qNo ||
        Number(a?.qNo) === qNo ||
        String(a?.questionId).includes(`_${qNo}`) ||
        String(a?.id).includes(`_${qNo}`)
      )) : null) || (Array.isArray(answers) ? answers[idx] : (typeof answers === 'object' ? (answers[qNo] || answers[String(qNo)]) : {})) || {};

      const userAns = ansObj.userAnswer;
      const textAns = ansObj.userAnswerText || ansObj.textAns || ansObj.text;
      const hasUserOption = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty' && (typeof userAns === 'number' || /^[A-Ea-e0-4]$/.test(String(userAns).trim())));
      const hasAnswer = hasUserOption || (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty') || Boolean(textAns && String(textAns).trim() !== '');
      const teacherSc = questionScores[qNo];

      if (isOpenEndedMode) {
        if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty') {
          const numSc = Number(teacherSc);
          if (numSc >= 5) cCount++;
          else wCount++;
        } else {
          bCount++;
        }
      } else {
        if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty') {
          const numSc = Number(teacherSc);
          if (numSc >= 5) cCount++;
          else wCount++;
        } else if (hasAnswer) {
          const resolvedCorrect = resolveQuestionCorrectAnswer(qNo, qObj, ansObj, test, questions);
          const uLetter = formatAnswerLetter(userAns);
          const cLetter = formatAnswerLetter(resolvedCorrect);
          const isRight = (uLetter && cLetter) ? (uLetter === cLetter) : checkIsAnswerCorrect(userAns, qObj, test, qNo);

          if (isRight === true) cCount++;
          else if (isRight === false) wCount++;
          else bCount++;
        } else {
          bCount++;
        }
      }
    });

    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount };
  }, [qCount, questions, answers, test, questionScores, isOpenEndedMode]);

  const { correctCount, wrongCount, blankCount } = stats;

  const scorePercentage = useMemo(() => {
    if (isOpenEndedMode) {
      return totalMaxScore > 0 ? Math.min(100, Math.round((totalEarnedScore / totalMaxScore) * 100)) : 0;
    }
    const totalScored = correctCount + wrongCount + blankCount;
    return totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : (submission?.score ?? 0);
  }, [isOpenEndedMode, totalMaxScore, totalEarnedScore, correctCount, wrongCount, blankCount, submission]);

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);
    try {
      const updatedAnswers = Array.from({ length: qCount }).map((_, idx) => {
        const qNo = idx + 1;
        const existingAns = answers[idx] || {};
        const teacherSc = questionScores[qNo];

        let score = 0;
        let isCorrect = null;
        let evalStatus = 'empty';

        if (teacherSc === 'empty') {
          score = 0;
          isCorrect = null;
          evalStatus = 'empty';
        } else if (teacherSc !== undefined && teacherSc !== null) {
          score = Number(teacherSc);
          isCorrect = score >= 5;
          evalStatus = score >= 5 ? (score === 5 ? 'half' : 'correct') : 'wrong';
        } else if (existingAns.score !== undefined && existingAns.score !== null) {
          score = Number(existingAns.score);
          isCorrect = score >= 5;
          evalStatus = score >= 5 ? 'correct' : 'wrong';
        } else if (existingAns.isCorrect === true) {
          score = 10;
          isCorrect = true;
          evalStatus = 'correct';
        } else if (existingAns.isCorrect === false) {
          score = 0;
          isCorrect = false;
          evalStatus = 'wrong';
        } else {
          score = 0;
          isCorrect = null;
          evalStatus = 'empty';
        }

        const note = teacherNotes[qNo] || '';

        return {
          ...existingAns,
          questionNo: qNo,
          score,
          isCorrect,
          evalStatus,
          teacherNote: note,
          evaluatedByTeacher: true
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        score: scorePercentage,
        isEvaluatedByTeacher: true,
        status: 'evaluated',
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      try {
        if (typeof updateSubmission === 'function') {
          await updateSubmission(submission.id, updatedSubPayload);
        }
      } catch (e) {
        console.warn('updateSubmission error:', e);
      }

      if (submission.homeworkId || submission.hwId) {
        const hwId = submission.homeworkId || submission.hwId;
        try {
          if (typeof updateHomeworkSubmission === 'function') {
            await updateHomeworkSubmission(hwId, submission.studentId || submission.id, updatedSubPayload);
          }
        } catch (e) {
          console.warn('updateHomeworkSubmission error:', e);
        }
      }

      setShowResultModal(true);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      setShowResultModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Header */}
      <header style={{
        padding: isMobile ? '0.55rem 0.75rem' : '0.75rem 1.5rem',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: isMobile ? '0.4rem' : '1rem',
        minHeight: isMobile ? '50px' : '62px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', minWidth: 0, flex: 1 }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.85rem',
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
            {!isMobile && "Kapat / Çık"}
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{
              fontSize: isMobile ? '0.88rem' : '1.05rem',
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
              🌐 {isOpenEndedMode ? 'Açık Uçlu / Yazılı HTML Sınavı' : 'Çoktan Seçmeli HTML Sınavı'} • Toplam {qCount} Soru
            </div>
          </div>
        </div>

        {/* Action & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {isOpenEndedMode ? (
            !isTrulyEvaluated ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: isMobile ? '0.3rem 0.65rem' : '0.45rem 1rem',
                borderRadius: '0.65rem',
                background: '#f5f3ff',
                border: '1.5px solid #ddd6fe',
                color: '#6b21a8',
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.88rem',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.12)'
              }}>
                <Clock size={16} color="#7c3aed" />
                <span>⏳ Değerlendirmede</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.75rem',
                  borderRadius: '0.55rem',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  color: '#6b21a8',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.74rem' : '0.82rem'
                }}>
                  <Award size={15} color="#7c3aed" />
                  <span>{totalEarnedScore} / {totalMaxScore} Puan</span>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#ffffff',
                  padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.85rem',
                  borderRadius: '0.55rem',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.76rem' : '0.84rem',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}>
                  %{scorePercentage} Başarı
                </div>
              </div>
            )
          ) : (
            <>
              {/* Doğru Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#15803d',
                fontWeight: 900,
                fontSize: isMobile ? '0.74rem' : '0.8rem'
              }}>
                <CheckCircle size={14} color="#16a34a" />
                <span>{correctCount} D</span>
              </div>

              {/* Yanlış Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                fontWeight: 900,
                fontSize: isMobile ? '0.74rem' : '0.8rem'
              }}>
                <XCircle size={14} color="#ef4444" />
                <span>{wrongCount} Y</span>
              </div>

              {/* Boş Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontWeight: 800,
                fontSize: isMobile ? '0.74rem' : '0.8rem'
              }}>
                <AlertCircle size={14} color="#64748b" />
                <span>{blankCount} B</span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.85rem',
                borderRadius: '0.55rem',
                fontWeight: 900,
                fontSize: isMobile ? '0.76rem' : '0.84rem',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
              }}>
                %{scorePercentage} Başarı
              </div>
            </>
          )}

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
                borderRadius: '0.55rem',
                padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 1rem',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.75rem' : '0.84rem',
                cursor: isSaving ? 'wait' : 'pointer',
                boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
              }}
            >
              <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Puanları Kaydet ✓'}
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
              const ansObj = (Array.isArray(answers) ? answers.find(a => (
                Number(a?.questionNo) === qNo ||
                Number(a?.questionNoInSection) === qNo ||
                Number(a?.number) === qNo ||
                Number(a?.qNo) === qNo ||
                String(a?.questionId).includes(`_${qNo}`) ||
                String(a?.id).includes(`_${qNo}`)
              )) : null) || (Array.isArray(answers) ? answers[idx] : (typeof answers === 'object' ? (answers[qNo] || answers[String(qNo)]) : {})) || {};

              const userAns = ansObj.userAnswer;
              const textCandidates = [
                ansObj.userAnswerText,
                ansObj.textAns,
                ansObj.text,
                ansObj.writtenAnswer,
                ansObj.studentAnswer,
                (typeof ansObj.userAnswer === 'string' && ansObj.userAnswer !== 'empty' ? ansObj.userAnswer : null),
                (typeof ansObj.answer === 'string' && ansObj.answer !== 'empty' ? ansObj.answer : null),
                submission?.openEndedText?.[qNo],
                submission?.openEndedText?.[String(qNo)],
                submission?.raw_data?.openEndedText?.[qNo],
                submission?.raw_data?.openEndedText?.[String(qNo)],
                (typeof submission?.answers?.[qNo] === 'string' ? submission.answers[qNo] : null),
                (typeof submission?.answers?.[String(qNo)] === 'string' ? submission.answers[String(qNo)] : null),
                qObj.userAnswerText,
                qObj.textAns
              ];
              const textAns = textCandidates.find(t => t !== undefined && t !== null && String(t).trim() !== '' && String(t).trim() !== 'empty');
              const hasUserOption = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty' && (typeof userAns === 'number' || /^[A-Ea-e0-4]$/.test(String(userAns).trim())));
              const hasAnswer = hasUserOption || (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty') || Boolean(textAns);
              const isText = Boolean(textAns && String(textAns).trim() !== '');
              const isItemOE = !hasUserOption && (isOpenEndedMode || isText || qObj.type === 'acik_uclu' || ansObj.isOpenEnded);

              const teacherSc = questionScores[qNo];
              const hasGradedScore = teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && isTrulyEvaluated;

              const resolvedCorrect = resolveQuestionCorrectAnswer(qNo, qObj, ansObj, test, questions);
              const uLetter = formatAnswerLetter(userAns);
              const displayCorrectKey = formatAnswerLetter(resolvedCorrect);

              let isCorrect;
              if (hasGradedScore) {
                isCorrect = Number(teacherSc) >= 5;
              } else if (hasAnswer && !isItemOE) {
                if (uLetter && displayCorrectKey) {
                  isCorrect = uLetter === displayCorrectKey;
                } else {
                  isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
                }
              } else {
                isCorrect = null;
              }

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
                      hasGradedScore ? (
                        <span style={{
                          color: Number(teacherSc) === 10 ? '#15803d' : Number(teacherSc) >= 5 ? '#d97706' : '#b91c1c',
                          background: Number(teacherSc) === 10 ? '#dcfce7' : Number(teacherSc) >= 5 ? '#fef3c7' : '#fee2e2',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '0.4rem',
                          fontWeight: 900,
                          fontSize: '0.82rem'
                        }}>
                          {teacherSc} / 10 Puan
                        </span>
                      ) : isText ? (
                        <span style={{
                          color: '#7c3aed',
                          background: '#f5f3ff',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '0.4rem',
                          border: '1px solid #ddd6fe',
                          fontWeight: 900,
                          fontSize: '0.8rem'
                        }}>
                          ⏳ Değerlendirme Bekliyor
                        </span>
                      ) : (
                        <span style={{
                          color: '#64748b',
                          background: '#f8fafc',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '0.4rem',
                          border: '1px solid #e2e8f0',
                          fontWeight: 800,
                          fontSize: '0.8rem'
                        }}>
                          ○ Yanıtlanmadı / Boş
                        </span>
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
                        <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                      )
                    ) : (
                      <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ</span>
                    )}
                  </div>

                  {/* Öğrenci Yazılı Yanıtı */}
                  {isItemOE ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>📝 ÖĞRENCİ YAZILI CEVABI:</div>
                      {isText ? (
                        <div style={{ fontSize: '0.88rem', background: '#ffffff', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: '#0f172a', fontWeight: 600 }}>
                          {textAns}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          Öğrenci bu soruya yanıt yazmadı.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>ÖĞRENCİ CEVABI: </span>
                        <span style={{ fontWeight: 900, color: isCorrect === true ? '#15803d' : isCorrect === false ? '#b91c1c' : '#64748b' }}>
                          {hasAnswer ? (uLetter || (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : userAns)) : 'Boş'}
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
                            border: teacherSc === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1',
                            background: teacherSc === 10 ? '#16a34a' : '#ffffff',
                            color: teacherSc === 10 ? '#ffffff' : '#15803d',
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          ✓ Doğru (10P)
                        </button>
                        {isItemOE && (
                          <button
                            type="button"
                            onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 5 }))}
                            style={{
                              padding: '0.4rem 0.25rem',
                              borderRadius: 6,
                              border: teacherSc === 5 ? '2px solid #d97706' : '1px solid #cbd5e1',
                              background: teacherSc === 5 ? '#d97706' : '#ffffff',
                              color: teacherSc === 5 ? '#ffffff' : '#b45309',
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
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                          style={{
                            padding: '0.4rem 0.25rem',
                            borderRadius: 6,
                            border: teacherSc === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                            background: teacherSc === 0 ? '#dc2626' : '#ffffff',
                            color: teacherSc === 0 ? '#ffffff' : '#b91c1c',
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          ✗ Yanlış (0P)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 'empty' }))}
                          style={{
                            padding: '0.4rem 0.25rem',
                            borderRadius: 6,
                            border: teacherSc === 'empty' ? '2px solid #64748b' : '1px solid #cbd5e1',
                            background: teacherSc === 'empty' ? '#64748b' : '#f8fafc',
                            color: teacherSc === 'empty' ? '#ffffff' : '#475569',
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          ○ Boş
                        </button>
                      </div>

                      <input
                        type="text"
                        value={teacherNotes[qNo] || ''}
                        onChange={(e) => setTeacherNotes(p => ({ ...p, [qNo]: e.target.value }))}
                        placeholder="Soruya özel geri bildirim notu..."
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '0.4rem',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}

                  {!isTeacherMode && teacherNotes[qNo] && (
                    <div style={{ marginTop: '0.5rem', background: '#f5f3ff', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #ddd6fe', fontSize: '0.8rem', color: '#6b21a8' }}>
                      <strong>💬 Öğretmen Notu:</strong> {teacherNotes[qNo]}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall Teacher Note Section */}
            {isTeacherMode ? (
              <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: '0.35rem' }}>
                  💬 Öğrenciye Genel Not / Geri Bildirim:
                </label>
                <textarea
                  rows="3"
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Sınavın geneli için öğrenciye tavsiyelerinizi yazabilirsiniz..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            ) : (
              overallFeedback && (
                <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '0.85rem', border: '1.5px solid #ddd6fe', marginTop: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.88rem', fontWeight: 900, color: '#6b21a8' }}>
                    💬 Öğretmeninizin Genel Notu:
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#1e1b4b', lineHeight: 1.5 }}>
                    {overallFeedback}
                  </p>
                </div>
              )
            )}
          </div>
        }
      />

      {showResultModal && (
        <ReviewResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            handleGoBack();
          }}
          test={test}
          submission={{
            ...submission,
            score: scorePercentage,
            correctCount,
            wrongCount,
            blankCount,
            totalCount: qCount
          }}
        />
      )}
    </div>
  );
}
