import React, { useState, useEffect, useMemo, useRef } from 'react';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Save, Clock, Award, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
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

function unwrapUserAnswer(val) {
  if (val === undefined || val === null) return null;
  let curr = val;
  while (curr && typeof curr === 'object' && !Array.isArray(curr)) {
    const next = curr.userAnswer ?? curr.user_answer ?? curr.userAns ?? curr.user_ans ?? curr.answer ?? curr.selectedOption ?? curr.selected_option ?? curr.selectedAnswer ?? curr.studentAnswer ?? curr.option ?? curr.value ?? curr.selected;
    if (next === undefined || next === curr) break;
    curr = next;
  }
  if (curr === undefined || curr === null || curr === '' || curr === 'empty' || curr === 'null' || curr === 'Boş' || curr === 'boş') return null;
  if (typeof curr === 'string' && /^[A-Ea-e]$/.test(curr.trim())) {
    return curr.trim().toUpperCase().charCodeAt(0) - 65;
  }
  if (typeof curr === 'number') return curr;
  if (!isNaN(Number(curr)) && String(curr).trim() !== '') {
    return Number(curr);
  }
  return curr;
}

export default function ImageQuizReview({ submission, test, questions = [], onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
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

  const isOpenEndedMode = useMemo(() => {
    if (test.questionType === 'coktan_secmeli' || test.type === 'coktan_secmeli' || (Array.isArray(test.answerKey) && test.answerKey.length > 0 && !test.isOpenEnded && test.type !== 'gorsel_klasik' && test.questionType !== 'gorsel_klasik')) {
      return false;
    }
    return Boolean(
      test.questionType === 'gorsel_klasik' || test.type === 'gorsel_klasik' || test.questionType === 'acik_uclu' || test.type === 'acik_uclu' || test.isOpenEnded ||
      (test.title && (test.title.toLowerCase().includes('açık uçlu') || test.title.toLowerCase().includes('klasik'))) ||
      questions.some(q => q.type === 'acik_uclu' || q.type === 'gorsel_klasik' || q.isOpenEnded) ||
      answers.some(a => a.isOpenEnded || (a.userAnswerText && String(a.userAnswerText).trim() !== ''))
    );
  }, [test, questions, answers]);

  const [questionScores, setQuestionScores] = useState(() => {
    const scores = {};
    for (let i = 1; i <= qCount; i++) {
      const a = answers.find(ans => (ans.questionNo === i || String(ans.questionId).includes(`_${i}`))) || answers[i - 1];
      const qObj = questions[i - 1] || bundleQ || {};
      const textVal = a?.userAnswerText || a?.textAns || a?.text || a?.writtenAnswer || submission?.openEndedText?.[i] || submission?.openEndedText?.[String(i)];
      const hasText = Boolean(textVal && String(textVal).trim() !== '' && String(textVal).trim() !== 'empty');
      const isQOE = Boolean(
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
          scores[i] = 'pending';
        }
      } else {
        const rawAns = unwrapUserAnswer(a?.userAnswer ?? a);
        const hasAns = (rawAns !== null && rawAns !== undefined && rawAns !== '' && rawAns !== 'empty');
        if (a?.score !== undefined && a?.score !== null && a?.score !== '' && a?.score !== 'empty' && !isNaN(Number(a.score))) {
          scores[i] = Number(a.score);
        } else if (hasAns) {
          const isRight = checkIsAnswerCorrect(rawAns, qObj, test, i);
          scores[i] = isRight === true ? 10 : (isRight === false ? 0 : 'empty');
        } else {
          scores[i] = 'empty';
        }
      }
    }
    return scores;
  });

  const isTrulyEvaluated = useMemo(() => {
    if (submission.isEvaluatedByTeacher === true || submission.status === 'evaluated') {
      return true;
    }
    const hasAnyGradedScore = Object.values(questionScores).some(s => s !== 'pending' && s !== 'empty' && typeof s === 'number');
    return hasAnyGradedScore;
  }, [submission, questionScores]);

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

  const activeQuestion = questions[currentIndex] || bundleQ || {};
  const activeAnsObj = answers.find(a => (a.questionNo === currentIndex + 1 || String(a.questionId).includes(`_${currentIndex + 1}`))) || answers[currentIndex] || {};

  const totalMaxScore = qCount * 10;
  const totalEarnedScore = useMemo(() => {
    let earned = 0;
    for (let i = 1; i <= qCount; i++) {
      const s = questionScores[i];
      if (s !== undefined && s !== null && s !== 'empty' && s !== 'pending' && !isNaN(Number(s))) {
        earned += Number(s);
      }
    }
    return earned;
  }, [qCount, questionScores]);

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
        scorePercentage: scorePercentage,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
        status: 'evaluated',
        isEvaluated: true,
        isEvaluatedByTeacher: true,
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

  const stats = useMemo(() => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;
    let pCount = 0;

    for (let i = 1; i <= qCount; i++) {
      const qObj = questions[i - 1] || bundleQ || {};
      const ansObj = answers.find(a => (a.questionNo === i || String(a.questionId).includes(`_${i}`))) || answers[i - 1] || {};
      const rawAns = unwrapUserAnswer(ansObj?.userAnswer ?? ansObj);
      const textVal = ansObj?.userAnswerText || ansObj?.textAns || ansObj?.text || ansObj?.writtenAnswer || submission?.openEndedText?.[i] || submission?.openEndedText?.[String(i)];
      const hasText = Boolean(textVal && String(textVal).trim() !== '' && String(textVal).trim() !== 'empty');
      const teacherSc = questionScores[i];
      const isItemOE = isOpenEndedMode || hasText || qObj.type === 'acik_uclu' || qObj.type === 'gorsel_klasik' || ansObj.isOpenEnded;

      if (isItemOE) {
        if (!hasText || teacherSc === 'empty') {
          bCount++;
        } else if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && teacherSc !== 'pending' && !isNaN(Number(teacherSc))) {
          const numSc = Number(teacherSc);
          if (numSc >= 5) cCount++;
          else wCount++;
        } else {
          pCount++;
        }
      } else {
        const hasOption = (rawAns !== null && rawAns !== undefined && rawAns !== '' && rawAns !== 'empty');
        if (!hasOption) {
          bCount++;
        } else if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && teacherSc !== 'pending' && !isNaN(Number(teacherSc))) {
          const numSc = Number(teacherSc);
          if (numSc >= 5) cCount++;
          else wCount++;
        } else {
          const isRight = checkIsAnswerCorrect(rawAns, qObj, test, i);
          if (isRight === true) cCount++;
          else if (isRight === false) wCount++;
          else bCount++;
        }
      }
    }
    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount, pendingCount: pCount };
  }, [qCount, questionScores, answers, questions, bundleQ, test, isOpenEndedMode, submission]);

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

  const imageUrls = useMemo(() => {
    const collected = [];
    if (activeQuestion.imageUrl && isValidImageUrl(activeQuestion.imageUrl)) collected.push(activeQuestion.imageUrl);
    if (Array.isArray(activeQuestion.imageUrls)) collected.push(...activeQuestion.imageUrls.filter(isValidImageUrl));
    if (activeQuestion.contentPayload && isValidImageUrl(activeQuestion.contentPayload)) collected.push(activeQuestion.contentPayload);
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
      const qObj = questions[i] || bundleQ || {};
      const ans = answers.find(a => (a.questionNo === qNo || String(a.questionId).includes(`_${qNo}`))) || answers[i];
      
      const rawAns = unwrapUserAnswer(ans?.userAnswer ?? ans);
      const userAns = typeof rawAns === 'number' ? rawAns : (rawAns || null);
      const textAns = typeof ans?.userAnswerText === 'string' ? ans.userAnswerText.trim() : '';
      const hasAns = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty') || textAns.length > 0;
      
      const teacherSc = questionScores[qNo];
      let isC = null;
      if (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty') {
        isC = Number(teacherSc) >= 5;
      } else if (hasAns) {
        if (isOpenEndedMode) {
          isC = null;
        } else {
          isC = checkIsAnswerCorrect(userAns, qObj, test, qNo);
        }
      } else {
        isC = null;
      }

      const item = {
        questionNo: qNo,
        userAnswer: userAns,
        userAnswerText: textAns,
        isCorrect: hasAns ? isC : null,
        hasAnswer: hasAns
      };

      map[qNo] = item;
      map[String(qNo)] = item;
    }
    return map;
  }, [qCount, answers, questionScores, questions, bundleQ, test, isOpenEndedMode]);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const currentQNo = currentIndex + 1;
  const teacherSc = questionScores[currentQNo];
  const hasGradedScore = teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && isTrulyEvaluated;

  const rawUserAns = unwrapUserAnswer(activeAnsObj);
  const userAns = typeof rawUserAns === 'number' ? rawUserAns : activeAnsObj.userAnswer;
  const textAns = activeAnsObj.userAnswerText;
  const hasAnswer = (userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty');
  const isText = Boolean(textAns && String(textAns).trim() !== '');
  const isItemOE = isOpenEndedMode || isText || activeQuestion?.type === 'acik_uclu' || activeQuestion?.type === 'gorsel_klasik';

  // Correct answer for the current question
  const keySource = test.answerKey || bundleQ.answerKey || questions[0]?.answerKey || null;
  let rawCorrectKey = null;
  if (Array.isArray(keySource)) {
    rawCorrectKey = keySource[currentQNo - 1];
  } else if (keySource && typeof keySource === 'object') {
    rawCorrectKey = keySource[currentQNo] ?? keySource[String(currentQNo)] ?? keySource[currentQNo - 1];
  } else if (typeof keySource === 'string') {
    const clean = keySource.replace(/[^A-Ea-e0-4]/g, '');
    rawCorrectKey = clean[currentQNo - 1];
  } else {
    rawCorrectKey = activeQuestion.correctAnswer;
  }

  const displayCorrectKey = (rawCorrectKey !== undefined && rawCorrectKey !== null && rawCorrectKey !== '')
    ? (typeof rawCorrectKey === 'number' ? String.fromCharCode(65 + rawCorrectKey) : String(rawCorrectKey).toUpperCase())
    : null;

  let isCurrentCorrect = null;
  if (hasGradedScore) {
    isCurrentCorrect = Number(teacherSc) >= 5;
  } else if (hasAnswer && !isItemOE) {
    isCurrentCorrect = checkIsAnswerCorrect(userAns, activeQuestion, test, currentQNo);
  }

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
            {!isMobile && "Kapat / Çık"}
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
              🖼️ {isOpenEndedMode ? 'Açık Uçlu / Yazılı Görsel Sınavı' : 'Çoktan Seçmeli Görsel Sınavı'} • Toplam {qCount} Soru
            </div>
          </div>
        </div>

        {/* Action & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {(!isTrulyEvaluated && pendingCount > 0) ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.3rem 0.65rem' : '0.4rem 0.9rem',
              borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.76rem' : '0.84rem',
              boxShadow: '0 3px 12px rgba(124, 58, 237, 0.3)'
            }}>
              <Clock size={15} color="#ffffff" />
              <span>⏳ {pendingCount} Soru Değerlendirme Bekliyor</span>
            </div>
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

      <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{
          background: isItemOE ? '#faf5ff' : (!hasAnswer ? '#ffffff' : (isCurrentCorrect === true ? '#f0fdf4' : '#fef2f2')),
          border: `1.5px solid ${isItemOE ? '#e9d5ff' : (!hasAnswer ? '#e2e8f0' : (isCurrentCorrect === true ? '#bbf7d0' : '#fecaca'))}`,
          borderRadius: '1.25rem',
          padding: '1.5rem',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                Soru {currentQNo} İncelemesi
              </h3>
              <AiUsageBadge testId={testId} questionNo={currentQNo} />
            </div>
            {isItemOE ? (
              (!isText || teacherSc === 'empty') ? (
                <span style={{
                  color: '#475569',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.45rem',
                  fontWeight: 900,
                  fontSize: '0.85rem'
                }}>
                  ○ BOŞ
                </span>
              ) : (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && !isNaN(Number(teacherSc))) ? (
                Number(teacherSc) >= 5 ? (
                  <span style={{
                    color: '#15803d',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.45rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <CheckCircle size={16} color="#16a34a" /> DOĞRU
                  </span>
                ) : (
                  <span style={{
                    color: '#b91c1c',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.45rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <XCircle size={16} color="#ef4444" /> YANLIŞ
                  </span>
                )
              ) : isText ? (
                <span style={{
                  color: '#7c3aed',
                  background: '#f5f3ff',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.45rem',
                  border: '1px solid #ddd6fe',
                  fontWeight: 900,
                  fontSize: '0.82rem'
                }}>
                  ⏳ Değerlendirme Bekliyor
                </span>
              ) : (
                <span style={{
                  color: '#475569',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.45rem',
                  fontWeight: 900,
                  fontSize: '0.85rem'
                }}>
                  ○ BOŞ
                </span>
              )
            ) : (
              isCurrentCorrect === true ? (
                <span style={{ color: '#15803d', background: '#dcfce7', padding: '0.25rem 0.75rem', borderRadius: '0.45rem', border: '1px solid #86efac', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={16} /> DOĞRU
                </span>
              ) : isCurrentCorrect === false ? (
                <span style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.25rem 0.75rem', borderRadius: '0.45rem', border: '1px solid #fca5a5', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <XCircle size={16} /> YANLIŞ
                </span>
              ) : (
                <span style={{ color: '#475569', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '0.45rem', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.85rem' }}>
                  ○ BOŞ
                </span>
              )
            )}
          </div>

          {/* Soru Görselleri */}
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

          {/* Öğrenci Yanıtı & Doğru Cevap Bölümü */}
          {isItemOE ? (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, marginBottom: '0.35rem' }}>
                📝 ÖĞRENCİ YAZILI CEVABI:
              </div>
              {isText ? (
                <div style={{ fontSize: '0.92rem', background: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', whiteSpace: 'pre-wrap', color: '#0f172a', fontWeight: 600 }}>
                  {textAns}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Öğrenci bu soruya yanıt yazmadı.
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              border: `1.5px solid ${!hasAnswer ? '#cbd5e1' : (isCurrentCorrect === true ? '#86efac' : '#fca5a5')}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 800 }}>ÖĞRENCİ CEVABI: </span>
                <span style={{
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  color: !hasAnswer ? '#64748b' : (isCurrentCorrect === true ? '#15803d' : '#b91c1c'),
                  background: !hasAnswer ? '#f1f5f9' : (isCurrentCorrect === true ? '#dcfce7' : '#fee2e2'),
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.45rem',
                  border: `1px solid ${!hasAnswer ? '#cbd5e1' : (isCurrentCorrect === true ? '#86efac' : '#fca5a5')}`
                }}>
                  {hasAnswer ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : String(userAns).toUpperCase()) : 'Boş'}
                </span>
              </div>

              {displayCorrectKey && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 800 }}>DOĞRU CEVAP: </span>
                  <span style={{
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.45rem',
                    border: '1px solid #86efac'
                  }}>
                    {displayCorrectKey}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Öğretmen Puanlama Bölümü */}
          {isTeacherMode && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isItemOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '0.5rem' }}>
                {(() => {
                  const isT10 = Number(teacherSc) === 10;
                  const isT0 = teacherSc !== undefined && teacherSc !== null && teacherSc !== 'empty' && Number(teacherSc) === 0;
                  const isTEmpty = teacherSc === 'empty';
                  const isT5 = Number(teacherSc) === 5;

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 10 }))}
                        style={{
                          padding: '0.5rem 0.5rem',
                          borderRadius: 6,
                          border: isT10 ? '2px solid #15803d' : '1px solid #cbd5e1',
                          background: isT10 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#ffffff',
                          color: isT10 ? '#ffffff' : '#15803d',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
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
                          onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 5 }))}
                          style={{
                            padding: '0.5rem 0.5rem',
                            borderRadius: 6,
                            border: isT5 ? '2px solid #b45309' : '1px solid #cbd5e1',
                            background: isT5 ? 'linear-gradient(135deg, #d97706, #b45309)' : '#ffffff',
                            color: isT5 ? '#ffffff' : '#b45309',
                            fontWeight: 900,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
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
                        onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 0 }))}
                        style={{
                          padding: '0.5rem 0.5rem',
                          borderRadius: 6,
                          border: isT0 ? '2px solid #991b1b' : '1px solid #cbd5e1',
                          background: isT0 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#ffffff',
                          color: isT0 ? '#ffffff' : '#b91c1c',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          boxShadow: isT0 ? '0 2px 8px rgba(220,38,38,0.5)' : 'none',
                          transform: isT0 ? 'scale(1.02)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ✗ Yanlış (0P) {isT0 ? '✓' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [currentQNo]: 'empty' }))}
                        style={{
                          padding: '0.5rem 0.5rem',
                          borderRadius: 6,
                          border: isTEmpty ? '2px solid #334155' : '1px solid #cbd5e1',
                          background: isTEmpty ? 'linear-gradient(135deg, #475569, #334155)' : '#f8fafc',
                          color: isTEmpty ? '#ffffff' : '#475569',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
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
                value={teacherNotes[currentQNo] || ''}
                onChange={(e) => setTeacherNotes(p => ({ ...p, [currentQNo]: e.target.value }))}
                placeholder="Bu soruya özel geri bildirim notu..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {!isTeacherMode && teacherNotes[currentQNo] && (
            <div style={{ background: '#f5f3ff', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd6fe', fontSize: '0.84rem', color: '#6b21a8' }}>
              <strong>💬 Öğretmen Notu:</strong> {teacherNotes[currentQNo]}
            </div>
          )}

          {/* ════════════════════════════════════════════
              MISTAKE DIAGNOSTIC SELECTOR & AI CROP BUTTON
          ════════════════════════════════════════════ */}
          {((!isItemOE && (!isCurrentCorrect || !hasAnswer)) || (isItemOE && (!isText || (hasGradedScore && !isCurrentCorrect)))) ? (
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: !isCurrentCorrect ? '1px dashed #fecaca' : '1px dashed #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: !isCurrentCorrect ? '#b91c1c' : '#64748b' }}>
                  {!isCurrentCorrect ? '🤔 Hata Sebebi:' : '⚪ Boş Sebebi:'}
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {MISTAKE_REASON_OPTIONS.map(r => {
                    const currentVal = mistakeReasons[currentQNo];
                    const isSelected = currentVal === r.label || (currentVal && String(currentVal).includes(r.label.slice(2).trim()));
                    return (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => handleSetMistakeReason(currentQNo, r.label)}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          borderRadius: 6,
                          border: `1.5px solid ${isSelected ? r.color : r.border}`,
                          background: isSelected ? r.color : r.bg,
                          color: isSelected ? '#ffffff' : r.color,
                          cursor: 'pointer',
                          boxShadow: isSelected ? `0 2px 6px ${r.color}33` : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Soru ${currentQNo} için sebebi "${r.label}" olarak kaydet`}
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
                onClick={() => setAiModalQuestionNo(currentQNo)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  borderRadius: 6,
                  border: '1.5px solid #a855f7',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
                  transition: 'all 0.15s ease'
                }}
                title={`Soru ${currentQNo} için yapay zeka çözümü ve soru kırpma`}
              >
                <Sparkles size={13} color="#a855f7" />
                <span>✨ AI Çözüm & Kırp</span>
              </button>
            </div>
          ) : isItemOE && isText && !hasGradedScore ? (
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px dashed #ddd6fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.76rem', color: '#7c3aed', fontWeight: 800 }}>
                ⏳ Öğretmen değerlendirmesi bekleniyor
              </span>
              <button
                type="button"
                onClick={() => setAiModalQuestionNo(currentQNo)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  borderRadius: 6,
                  border: '1.5px solid #a855f7',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
                  transition: 'all 0.15s ease'
                }}
                title={`Soru ${currentQNo} için yapay zeka çözümü ve soru inceleme`}
              >
                <Sparkles size={13} color="#a855f7" />
                <span>✨ AI Çözüm İncele</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Overall Teacher Feedback Box */}
        {isTeacherMode ? (
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #cbd5e1' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: '0.4rem' }}>
              💬 Öğrenciye Genel Not / Geri Bildirim:
            </label>
            <textarea
              rows="3"
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Sınavın geneli için tavsiyelerinizi yazabilirsiniz..."
              style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
          </div>
        ) : (
          overallFeedback && (
            <div style={{ background: '#f5f3ff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #ddd6fe' }}>
              <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.92rem', fontWeight: 900, color: '#6b21a8' }}>
                💬 Öğretmeninizin Genel Notu:
              </h4>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#1e1b4b', lineHeight: 1.5 }}>
                {overallFeedback}
              </p>
            </div>
          )
        )}
      </div>

      <ImageLightbox
        isOpen={Boolean(lightboxSrc)}
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />

      {/* ── AI QUESTION SOLVER & SCREEN SNIPPER MODAL ── */}
      {aiModalQuestionNo && (
        <ScreenSnipperAndSolverModal
          isOpen={Boolean(aiModalQuestionNo)}
          onClose={() => setAiModalQuestionNo(null)}
          questionNo={aiModalQuestionNo}
          question={activeQuestion}
          existingImageUrl={activeImgSrc}
          mistakeReason={mistakeReasons[aiModalQuestionNo] || ''}
          onMistakeReasonChange={(r) => handleSetMistakeReason(aiModalQuestionNo, r)}
          studentAnswer={hasAnswer ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : String(userAns)) : ''}
          correctAnswer={displayCorrectKey || ''}
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
