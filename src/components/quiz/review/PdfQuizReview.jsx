import React, { useState, useEffect, useMemo, useRef } from 'react';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Save, Clock, Award, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter } from '../../../utils/answerEvaluation';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useAuth } from '../../../context/AuthContext';
import ReviewResultModal from './ReviewResultModal';
import ScreenSnipperAndSolverModal from '../ai/ScreenSnipperAndSolverModal';
import AiUsageBadge from '../ai/AiUsageBadge';

const MISTAKE_REASON_OPTIONS = [
  { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { label: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  { label: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' }
];

export default function PdfQuizReview({ submission, test, questions = [], onClose }) {
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
      test.contentPayload?.questionCount, test.pdfPayload?.questionCount, test.raw_data?.questionCount,
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

  const [idbPdf, setIdbPdf] = useState(null);
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
      const textVal = a?.userAnswerText || a?.textAns || a?.text || a?.writtenAnswer || submission?.openEndedText?.[i] || submission?.openEndedText?.[String(i)];
      const hasUserOption = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty' && (typeof userAns === 'number' || /^[A-Ea-e0-4]$/.test(String(userAns).trim())));
      const hasText = Boolean(textVal && String(textVal).trim() !== '' && String(textVal).trim() !== 'empty');
      const isQOE = !hasUserOption && (
        a?.isOpenEnded ||
        a?.type === 'acik_uclu' ||
        qObj?.type === 'acik_uclu' ||
        qObj?.isOpenEnded ||
        isOpenEndedMode ||
        hasText
      );

      if (isQOE) {
        if (!hasText) {
          scores[i] = 'empty';
        } else if (a?.score !== undefined && a?.score !== null && a?.score !== '' && a?.score !== 'empty' && !isNaN(Number(a.score))) {
          scores[i] = Number(a.score);
        } else {
          scores[i] = 'empty';
        }
      } else {
        // Multiple choice
        const hasAns = hasUserOption || (userAns !== undefined && userAns !== null && userAns !== '' && userAns !== 'empty');
        if (a?.score !== undefined && a?.score !== null && a?.score !== '' && a?.score !== 'empty' && !isNaN(Number(a.score))) {
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
  const [aiModalQuestionNo, setAiModalQuestionNo] = useState(null);

  const studentId = submission?.studentId || currentUser?.id || 'u1';
  const testId = test?.id || submission?.testId || submission?.bookTestId || 'test_1';
  const testKey = String(testId).replace(/^bt_/, '').replace(/^q_/, '');

  const [mistakeReasons, setMistakeReasons] = useState(() => {
    if (submission?.mistakeReasons && typeof submission.mistakeReasons === 'object') {
      return submission.mistakeReasons;
    }
    try {
      const keysToTry = [
        `mistake_reasons_${testId}_${studentId}`,
        `mistake_reasons_bt_${testKey}_${studentId}`,
        `mistake_reasons_${testKey}_${studentId}`,
        `mistake_reasons_${testId}`
      ];
      for (const k of keysToTry) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    } catch {}
    return {};
  });

  const handleSetMistakeReason = (qNo, reason) => {
    const next = { ...mistakeReasons, [qNo]: mistakeReasons[qNo] === reason ? null : reason };
    setMistakeReasons(next);
    try {
      localStorage.setItem(`mistake_reasons_${testId}_${studentId}`, JSON.stringify(next));
      localStorage.setItem(`mistake_reasons_${testKey}_${studentId}`, JSON.stringify(next));
      if (submission?.id && updateSubmission) {
        updateSubmission(submission.id, { mistakeReasons: next });
      }
    } catch {}
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchPdfPayload() {
      const direct = test.pdfPayload || test.contentPayload || questions[0]?.pdfPayload || questions[0]?.contentPayload;
      if (direct && direct !== '[STORED_IN_INDEXEDDB]' && direct !== '[LOCALSTORAGE_CACHE]') return;

      const candidates = [
        test.id,
        test.id?.replace(/^q_/, ''),
        questions[0]?.id,
        test.questionsList?.[0]?.id
      ].filter(Boolean);

      for (const id of candidates) {
        try {
          const val = await idbGetPayload(id);
          if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]' && isMounted) {
            setIdbPdf(val);
            break;
          }
        } catch (e) {}
      }
    }
    fetchPdfPayload();
    return () => { isMounted = false; };
  }, [test, questions, submission]);

  const pdfPayload = idbPdf || test.pdfPayload || test.contentPayload || questions[0]?.pdfPayload || questions[0]?.contentPayload || submission?.pdfPayload;

  const totalMaxScore = qCount * 10;
  const totalEarnedScore = useMemo(() => {
    let earned = 0;
    for (let i = 1; i <= qCount; i++) {
      const s = questionScores[i];
      if (s !== undefined && s !== null && s !== 'empty' && !isNaN(Number(s))) {
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
    let pCount = 0;

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
        qObj.userAnswerText,
        qObj.textAns
      ];
      const textAns = textCandidates.find(t => t !== undefined && t !== null && String(t).trim() !== '' && String(t).trim() !== 'empty');
      const hasText = Boolean(textAns && String(textAns).trim() !== '');

      const hasUserOption = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty' && (typeof userAns === 'number' || /^[A-Ea-e0-4]$/.test(String(userAns).trim())));
      const isItemOE = !hasUserOption && (isOpenEndedMode || hasText || qObj.type === 'acik_uclu' || ansObj.isOpenEnded);
      const teacherSc = questionScores[qNo];

      if (isItemOE) {
        const isExplicitEmpty = teacherSc === 'empty' || ansObj.evalStatus === 'empty' || ansObj.score === 'empty' || (!hasText && (teacherSc === undefined || teacherSc === null || teacherSc === 'empty' || (Number(teacherSc) === 0 && ansObj.isCorrect === null)));

        if (isExplicitEmpty || !hasText) {
          bCount++;
        } else if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && !isNaN(Number(teacherSc))) {
          const numSc = Number(teacherSc);
          if (numSc >= 5) cCount++;
          else wCount++;
        } else if (hasText) {
          pCount++;
          bCount++;
        } else {
          bCount++;
        }
      } else {
        const hasOption = hasUserOption || (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty');
        if (!hasOption) {
          bCount++;
        } else if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && !isNaN(Number(teacherSc))) {
          const numSc = Number(teacherSc);
          if (numSc >= 5) cCount++;
          else wCount++;
        } else {
          const resolvedCorrect = resolveQuestionCorrectAnswer(qNo, qObj, ansObj, test, questions);
          const uLetter = formatAnswerLetter(userAns);
          const cLetter = formatAnswerLetter(resolvedCorrect);
          const isRight = (uLetter && cLetter) ? (uLetter === cLetter) : checkIsAnswerCorrect(userAns, qObj, test, qNo);

          if (isRight === true) cCount++;
          else if (isRight === false) wCount++;
          else bCount++;
        }
      }
    });

    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount, pendingCount: pCount };
  }, [qCount, questions, answers, test, questionScores, isOpenEndedMode, submission]);

  const { correctCount, wrongCount, blankCount, pendingCount } = stats;

  const scorePercentage = useMemo(() => {
    const totalScored = correctCount + wrongCount + blankCount;
    if (totalScored > 0) {
      return Math.min(100, Math.round((correctCount / totalScored) * 100));
    }
    return 0;
  }, [correctCount, wrongCount, blankCount]);

  const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
  const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));

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

      let correct = 0;
      let wrong = 0;
      let blank = 0;
      updatedAnswers.forEach(a => {
        if (a.isCorrect === true) correct++;
        else if (a.isCorrect === false) wrong++;
        else blank++;
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        teacherScores,
        teacherNotes,
        score: scorePercentage,
        scorePercentage,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
        isEvaluated: true,
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
              {submission.studentName ? `🎓 ${submission.studentName} — ` : ''}{test.title || test.name || 'PDF Sınavı'}
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              📄 {isOpenEndedMode ? 'Açık Uçlu / Yazılı PDF Sınavı' : 'Çoktan Seçmeli PDF Sınavı'} • Toplam {qCount} Soru
            </div>
          </div>
        </div>

        {/* Action & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
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

          {/* Başarı & Net Pill */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#ffffff',
            padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.85rem',
            borderRadius: '0.55rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.76rem' : '0.84rem',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
          }}>
            %{scorePercentage} Başarı {netScore !== undefined && !isNaN(netScore) ? `(Net: ${netScore})` : ''}
          </div>

          {pendingCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
              borderRadius: '0.55rem',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              color: '#7c3aed',
              fontWeight: 800,
              fontSize: isMobile ? '0.74rem' : '0.8rem'
            }}>
              <Clock size={14} color="#7c3aed" />
              <span>{pendingCount} Bekliyor</span>
            </div>
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
          <div style={{ flex: 1, minWidth: 0, height: '100%', background: '#f8fafc', color: '#0f172a' }}>
            <PdfViewerWithControls payload={pdfPayload} title={test.title} height="100%" />
          </div>
        }
        answerContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const qObj = questions[idx] || (idx === 0 ? questions[0] : {}) || {};
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>Soru {qNo}</span>
                      <AiUsageBadge testId={testId} questionNo={qNo} compact />
                    </div>
                    {isItemOE ? (
                      (!isText || teacherSc === 'empty') ? (
                        <span style={{
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '0.4rem',
                          fontWeight: 900,
                          fontSize: '0.8rem'
                        }}>
                          ○ BOŞ
                        </span>
                      ) : (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && !isNaN(Number(teacherSc))) ? (
                        Number(teacherSc) >= 5 ? (
                          <span style={{
                            color: '#15803d',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <CheckCircle size={14} color="#16a34a" /> DOĞRU
                          </span>
                        ) : (
                          <span style={{
                            color: '#b91c1c',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <XCircle size={14} color="#ef4444" /> YANLIŞ
                          </span>
                        )
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
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '0.4rem',
                          fontWeight: 900,
                          fontSize: '0.8rem'
                        }}>
                          ○ BOŞ
                        </span>
                      )
                    ) : (
                      isCorrect === true ? (
                        <span style={{ color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={14} color="#16a34a" /> DOĞRU
                        </span>
                      ) : isCorrect === false ? (
                        <span style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <XCircle size={14} color="#ef4444" /> YANLIŞ
                        </span>
                      ) : (
                        <span style={{ color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.8rem' }}>
                          ○ BOŞ
                        </span>
                      )
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
                        {(() => {
                          const isT10 = Number(teacherSc) === 10;
                          const isT0 = teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && Number(teacherSc) === 0;
                          const isTEmpty = teacherSc === 'empty';
                          const isT5 = Number(teacherSc) === 5;

                          return (
                            <>
                              <button
                                type="button"
                                onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 10 }))}
                                style={{
                                  padding: '0.45rem 0.25rem',
                                  borderRadius: 6,
                                  border: isT10 ? '2px solid #15803d' : '1px solid #cbd5e1',
                                  background: isT10 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#ffffff',
                                  color: isT10 ? '#ffffff' : '#15803d',
                                  fontWeight: 900,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                  boxShadow: isT10 ? '0 2px 8px rgba(22,163,74,0.45)' : 'none',
                                  transform: isT10 ? 'scale(1.02)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                ✓ Doğru (10P) {isT10 ? '✓' : ''}
                              </button>
                              {isItemOE && (
                                <button
                                  type="button"
                                  onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 5 }))}
                                  style={{
                                    padding: '0.45rem 0.25rem',
                                    borderRadius: 6,
                                    border: isT5 ? '2px solid #b45309' : '1px solid #cbd5e1',
                                    background: isT5 ? 'linear-gradient(135deg, #d97706, #b45309)' : '#ffffff',
                                    color: isT5 ? '#ffffff' : '#b45309',
                                    fontWeight: 900,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 3,
                                    boxShadow: isT5 ? '0 2px 8px rgba(217,119,6,0.45)' : 'none',
                                    transform: isT5 ? 'scale(1.02)' : 'none',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  ½ Yarım (5P) {isT5 ? '✓' : ''}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                                style={{
                                  padding: '0.45rem 0.25rem',
                                  borderRadius: 6,
                                  border: isT0 ? '2px solid #991b1b' : '1px solid #cbd5e1',
                                  background: isT0 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#ffffff',
                                  color: isT0 ? '#ffffff' : '#b91c1c',
                                  fontWeight: 900,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                  boxShadow: isT0 ? '0 2px 8px rgba(220,38,38,0.5)' : 'none',
                                  transform: isT0 ? 'scale(1.02)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                ✗ Yanlış (0P) {isT0 ? '✓' : ''}
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 'empty' }))}
                                style={{
                                  padding: '0.45rem 0.25rem',
                                  borderRadius: 6,
                                  border: isTEmpty ? '2px solid #334155' : '1px solid #cbd5e1',
                                  background: isTEmpty ? 'linear-gradient(135deg, #475569, #334155)' : '#f8fafc',
                                  color: isTEmpty ? '#ffffff' : '#475569',
                                  fontWeight: 900,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                  boxShadow: isTEmpty ? '0 2px 8px rgba(71,85,105,0.45)' : 'none',
                                  transform: isTEmpty ? 'scale(1.02)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                ○ Boş {isTEmpty ? '✓' : ''}
                              </button>
                            </>
                          );
                        })()}
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

                  {/* ════════════════════════════════════════════
                      MISTAKE DIAGNOSTIC SELECTOR & AI CROP BUTTON
                  ════════════════════════════════════════════ */}
                  {(!isCorrect || isBlank) && (
                    <div style={{
                      marginTop: '0.65rem',
                      paddingTop: '0.65rem',
                      borderTop: !isCorrect ? '1px dashed #fecaca' : '1px dashed #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.4rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: !isCorrect ? '#b91c1c' : '#64748b' }}>
                          {!isCorrect ? '🤔 Hata Sebebi:' : '⚪ Boş Sebebi:'}
                        </span>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {MISTAKE_REASON_OPTIONS.map(r => {
                            const currentVal = mistakeReasons[qNo];
                            const isSelected = currentVal === r.label || (currentVal && String(currentVal).includes(r.label.slice(2).trim()));
                            return (
                              <button
                                key={r.label}
                                type="button"
                                onClick={() => handleSetMistakeReason(qNo, r.label)}
                                style={{
                                  padding: isMobile ? '0.14rem 0.35rem' : '0.16rem 0.45rem',
                                  fontSize: isMobile ? '0.56rem' : '0.62rem',
                                  fontWeight: 800,
                                  borderRadius: 6,
                                  border: `1.5px solid ${isSelected ? r.color : r.border}`,
                                  background: isSelected ? r.color : r.bg,
                                  color: isSelected ? '#ffffff' : r.color,
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? `0 2px 6px ${r.color}33` : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                title={`Soru ${qNo} için sebebi "${r.label}" olarak kaydet`}
                              >
                                {r.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ✂️ AI Soru Çözümü & Kırpma Butonu */}
                      <button
                        type="button"
                        onClick={() => setAiModalQuestionNo(qNo)}
                        style={{
                          padding: isMobile ? '0.18rem 0.5rem' : '0.22rem 0.65rem',
                          fontSize: isMobile ? '0.62rem' : '0.7rem',
                          fontWeight: 900,
                          borderRadius: 6,
                          border: '1.5px solid #a855f7',
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                          color: '#7c3aed',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Soru ${qNo} için yapay zeka çözümü ve soru kırpma`}
                      >
                        <Sparkles size={12} color="#a855f7" />
                        <span>✨ AI Çözüm & Kırp</span>
                      </button>
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

      {/* ── AI QUESTION SOLVER & SCREEN SNIPPER MODAL ── */}
      {aiModalQuestionNo && (
        <ScreenSnipperAndSolverModal
          isOpen={Boolean(aiModalQuestionNo)}
          onClose={() => setAiModalQuestionNo(null)}
          questionNo={aiModalQuestionNo}
          question={questions[aiModalQuestionNo - 1] || {
            questionNo: aiModalQuestionNo,
            userAnswer: answers[aiModalQuestionNo - 1]?.userAnswer,
            userAnswerText: answers[aiModalQuestionNo - 1]?.userAnswerText
          }}
          mistakeReason={mistakeReasons[aiModalQuestionNo] || ''}
          onMistakeReasonChange={(r) => handleSetMistakeReason(aiModalQuestionNo, r)}
          studentAnswer={answers[aiModalQuestionNo - 1]?.userAnswerText || (answers[aiModalQuestionNo - 1]?.userAnswer !== undefined ? (typeof answers[aiModalQuestionNo - 1]?.userAnswer === 'number' ? String.fromCharCode(65 + answers[aiModalQuestionNo - 1]?.userAnswer) : answers[aiModalQuestionNo - 1]?.userAnswer) : '')}
          correctAnswer={formatAnswerLetter(resolveQuestionCorrectAnswer(aiModalQuestionNo, questions[aiModalQuestionNo - 1], test)) || ''}
          subject={test?.subject || submission?.subject || 'Genel'}
          topic={test?.topic || submission?.unitTopic || ''}
          testId={testId}
        />
      )}

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
