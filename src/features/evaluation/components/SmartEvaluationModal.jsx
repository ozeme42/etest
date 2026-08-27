import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import { toUUID } from '../../../services/supabaseService';
import { isItemOpenEnded, QUICK_FEEDBACK_PRESETS, isValidPayloadString } from '../constants/evaluationConstants';
import MultiHomeworkRunner, { resolveExactQuestionCount } from '../../../components/quiz/runner/MultiHomeworkRunner';
import PdfQuizReview from '../../../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../../../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../../../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../../../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../../../components/quiz/review/PhysicalQuizReview';
import ImageLightbox, { StandardImageFrame } from '../../../components/quiz/common/ImageLightbox';
import PdfViewerWithControls from '../../../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../../../components/HtmlViewerWithControls';
import {
  CheckCircle2, XCircle, Clock3, Eye, Save, ArrowLeft,
  ClipboardList, Users, BookOpen, Star, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  AlertCircle, Search, Filter, Layers, MessageSquare, Award,
  Sparkles, Check, Edit3, Send, FileText, Globe, Image as ImageIcon,
  RotateCcw, Trophy, ThumbsUp, ThumbsDown, CheckCircle, HelpCircle,
  ClipboardCheck, Ruler, TestTube2, BookCopy, Zap, Plus, Minus, Maximize2
} from 'lucide-react';

export default function SmartEvaluationModal({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 'focused_oe' (Sadece Puanlanacak Açık Uçlular) vs 'full_exam' (Tüm Sınavı İncele)
  const [viewTab, setViewTab] = useState('focused_oe');
  const [showTopMedia, setShowTopMedia] = useState(true);

  // Local Grading States
  const [questionScores, setQuestionScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const targetId = String(submission.testId || submission.homeworkId || submission.questionId || submission.id || '');
  const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
  const loadedTargetIdRef = React.useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTestData() {
      if (loadedTargetIdRef.current === targetId && test) {
        return;
      }
      setLoading(true);

      let foundHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission.id)))
      );

      let foundBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId)
      );

      let titleMatchBankQ = (allBankQuestions || []).find(q =>
        submission.testTitle && q.title &&
        String(q.title).toLowerCase().trim() === String(submission.testTitle).toLowerCase().trim()
      );

      let foundBookTest = (bookTests || []).find(bt =>
        String(bt.id) === targetId ||
        String(bt.id) === normTargetId ||
        toUUID(bt.id) === targetId
      );

      let foundCurTest = (curriculumData?.tests || []).find(t =>
        String(t.id) === targetId ||
        String(t.id) === normTargetId
      );

      let resolved = foundHw || foundBankQ || titleMatchBankQ || foundBookTest || foundCurTest || null;

      if (!resolved && (foundBankQ?.bankQId || foundHw?.bankQId)) {
        const altId = String(foundBankQ?.bankQId || foundHw?.bankQId);
        resolved = (allBankQuestions || []).find(q => String(q.id) === altId);
      }

      if (!resolved) {
        const idbTest = await idbGetPayload(targetId);
        if (idbTest && typeof idbTest === 'object') {
          resolved = idbTest;
        }
      }

      if (!resolved) {
        resolved = {
          id: targetId,
          title: submission.testTitle || submission.title || 'Ödev / Sınav',
          subject: submission.subject || 'Genel',
          totalQuestions: submission.answers?.length || 1,
          questionCount: submission.answers?.length || 1,
          questionsList: submission.answers || []
        };
      }

      let contentPayload = isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null;
      let pdfPayload = isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null;
      let htmlPayload = isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null;

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const rawKeys = [
          targetId,
          normTargetId,
          foundHw?.id,
          foundBankQ?.id,
          foundHw?.questionId,
          resolved?.id
        ].filter(Boolean);

        for (const k of rawKeys) {
          try {
            const val = await idbGetPayload(k);
            if (isValidPayloadString(val)) {
              contentPayload = val;
              if (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF')) {
                pdfPayload = val;
              } else if (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html')) {
                htmlPayload = val;
              }
              break;
            }
          } catch (e) {}
        }
      }

      let generatedQuestions = [];
      let sections = resolved?.sections || resolved?.tests || null;

      if (Array.isArray(sections) && sections.length > 0) {
        const mappedSections = [];
        let runningQIndex = 0;

        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const secBankQ = (allBankQuestions || []).find(q => String(q.id) === String(secQId));
          const secResolvedQs = secBankQ ? resolveTestQuestions(secBankQ, allBankQuestions) : [];
          const secImages = (secBankQ?.imageUrls && Array.isArray(secBankQ.imageUrls)) ? secBankQ.imageUrls : [];
          const secCount = resolveExactQuestionCount(sec, secBankQ, secBankQ, secResolvedQs, secImages);

          const secPdf = (isValidPayloadString(secBankQ?.pdfPayload) ? secBankQ.pdfPayload : null) || pdfPayload;
          const secHtml = (isValidPayloadString(secBankQ?.htmlPayload) ? secBankQ.htmlPayload : null) || htmlPayload;
          const isSecOE = isItemOpenEnded(secBankQ) || isItemOpenEnded(sec);

          for (let qIdx = 0; qIdx < secCount; qIdx++) {
            runningQIndex++;
            const existingQ = secResolvedQs[qIdx] || {};
            const qImg = secImages[qIdx] || (secImages.length === 1 ? secImages[0] : null) || existingQ.imageUrl || null;

            generatedQuestions.push({
              ...existingQ,
              id: existingQ.id || `${secQId}_q${qIdx + 1}`,
              globalIndex: runningQIndex,
              questionNo: runningQIndex,
              subIndex: qIdx,
              sectionIndex: i,
              sectionTitle: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
              sectionId: secQId,
              title: existingQ.title || existingQ.name || existingQ.questionText || `${sec?.title || `${i+1}. Bölüm`} — Soru ${qIdx + 1}`,
              questionText: existingQ.questionText || (secCount === 1 ? (secBankQ?.questionText || sec?.title) : `Soru ${qIdx + 1}`),
              pdfPayload: secPdf,
              htmlPayload: secHtml,
              imageUrl: qImg,
              isOpenEnded: isSecOE || existingQ.isOpenEnded,
              options: existingQ.options || (isSecOE ? [] : ['A', 'B', 'C', 'D']),
              correctAnswer: existingQ.correctAnswer ?? (isSecOE ? null : 0)
            });
          }

          mappedSections.push({
            ...sec,
            id: secQId,
            bankQ: secBankQ || sec,
            questionCount: secCount,
            pdfPayload: secPdf,
            htmlPayload: secHtml
          });
        }

        resolved = {
          ...resolved,
          sections: mappedSections,
          totalQuestions: runningQIndex,
          questionCount: runningQIndex
        };
      } else {
        const resolvedQs = resolveTestQuestions(resolved, allBankQuestions);
        const images = (resolved?.imageUrls && Array.isArray(resolved.imageUrls)) ? resolved.imageUrls : [];
        const count = resolveExactQuestionCount(resolved, resolved, resolved, resolvedQs, images);

        for (let qIdx = 0; qIdx < count; qIdx++) {
          const existingQ = resolvedQs[qIdx] || {};
          const qImg = images[qIdx] || (images.length === 1 ? images[0] : null) || existingQ.imageUrl || null;
          const isSingleOE = isItemOpenEnded(resolved) || existingQ.isOpenEnded;

          generatedQuestions.push({
            ...existingQ,
            id: existingQ.id || `${targetId}_q${qIdx + 1}`,
            globalIndex: qIdx + 1,
            questionNo: qIdx + 1,
            subIndex: qIdx,
            title: existingQ.title || existingQ.name || existingQ.questionText || `Soru ${qIdx + 1}`,
            questionText: existingQ.questionText || (count === 1 ? (resolved?.questionText || resolved?.title) : `Soru ${qIdx + 1}`),
            pdfPayload,
            htmlPayload,
            imageUrl: qImg,
            isOpenEnded: isSingleOE,
            options: existingQ.options || (isSingleOE ? [] : ['A', 'B', 'C', 'D']),
            correctAnswer: existingQ.correctAnswer ?? (isSingleOE ? null : 0)
          });
        }

        resolved = {
          ...resolved,
          totalQuestions: count,
          questionCount: count
        };
      }

      if (isMounted) {
        setTest(resolved);
        setQuestions(generatedQuestions);

        const scores = {};
        const notes = {};

        if (submission.answers && Array.isArray(submission.answers)) {
          submission.answers.forEach((a, idx) => {
            const qNo = a.questionNo || a.questionNoInSection || (idx + 1);
            // Only load scores that were explicitly set by teacher evaluation
            if (a.score !== undefined && a.score !== null && a.evaluatedByTeacher === true) {
              const isExplicitEmpty = a.evalStatus === 'empty' || a.score === 'empty' || (Number(a.score) === 0 && a.isCorrect === null);
              scores[qNo] = isExplicitEmpty ? 'empty' : Number(a.score);
            }
            if (a.teacherNote || a.teacher_note || a.feedback) {
              notes[qNo] = a.teacherNote || a.teacher_note || a.feedback;
            }
          });
        }

        setQuestionScores(scores);
        setTeacherNotes(notes);
        setOverallFeedback(submission.teacherFeedback || submission.teacherNote || '');
        loadedTargetIdRef.current = targetId;
        setLoading(false);
      }
    }

    loadTestData();
    return () => { isMounted = false; };
  }, [submission, targetId, normTargetId, allBankQuestions, homeworks, curriculumData, bookTests]);

  const globalMedia = useMemo(() => {
    const isPdfStr = (val) => isValidPayloadString(val) && (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF'));
    const isHtmlStr = (val) => isValidPayloadString(val) && (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html'));

    let pdfSrc = null;
    if (isPdfStr(test?.pdfPayload)) pdfSrc = test.pdfPayload;
    else if (isPdfStr(test?.contentPayload)) pdfSrc = test.contentPayload;
    else if (test?.pdfUrl) pdfSrc = test.pdfUrl;
    else if (Array.isArray(test?.sections)) {
      const secMatch = test.sections.find(s => isPdfStr(s.bankQ?.pdfPayload) || isPdfStr(s.contentPayload));
      if (secMatch) pdfSrc = secMatch.bankQ?.pdfPayload || secMatch.contentPayload;
    }

    let htmlSrc = null;
    if (!pdfSrc) {
      if (isHtmlStr(test?.htmlPayload)) htmlSrc = test.htmlPayload;
      else if (isHtmlStr(test?.contentPayload)) htmlSrc = test.contentPayload;
      else if (Array.isArray(test?.sections)) {
        const secMatch = test.sections.find(s => isHtmlStr(s.bankQ?.htmlPayload) || isHtmlStr(s.contentPayload));
        if (secMatch) htmlSrc = secMatch.bankQ?.htmlPayload || secMatch.contentPayload;
      }
    }

    const hasPdf = Boolean(pdfSrc);
    const hasHtml = Boolean(htmlSrc);

    return { hasPdf, hasHtml, pdfSrc, htmlSrc };
  }, [test]);

  const categorizedQuestions = useMemo(() => {
    const totalQ = Math.max(1, questions?.length || submission?.answers?.length || 1);
    const oeList = [];
    const mcList = [];

    for (let i = 1; i <= totalQ; i++) {
      const qObj = questions[i - 1] || {};
      const ans = (submission?.answers || [])[i - 1] || {};
      const isOE = isItemOpenEnded(qObj, ans);

      const itemInfo = {
        qNo: i,
        question: qObj,
        answer: ans,
        isOE,
        imageUrl: qObj.imageUrl || ans.imageUrl || null,
        title: qObj.title || `Soru ${i}`,
        sectionTitle: qObj.sectionTitle || test?.title || null
      };

      if (isOE) oeList.push(itemInfo);
      else mcList.push(itemInfo);
    }

    return { oeList, mcList, totalQ };
  }, [questions, submission, test]);

  useEffect(() => {
    if (!loading && categorizedQuestions.oeList.length === 0) {
      setViewTab('full_exam');
    }
  }, [loading, categorizedQuestions.oeList.length]);

  const scoreStats = useMemo(() => {
    const { oeList, mcList, totalQ } = categorizedQuestions;

    let mcCorrect = 0;
    mcList.forEach(m => {
      if (m.answer?.isCorrect === true) mcCorrect++;
    });

    let oeTotalScore = 0;
    oeList.forEach(o => {
      const s = questionScores[o.qNo] ?? (o.answer?.score !== undefined ? Number(o.answer.score) : 0);
      oeTotalScore += Math.max(0, Math.min(10, s));
    });

    const mcPoints = mcCorrect * 10;
    const totalPoints = mcPoints + oeTotalScore;
    const maxPoints = totalQ * 10;
    const percentage = maxPoints > 0 ? Math.min(100, Math.round((totalPoints / maxPoints) * 100)) : 0;

    return {
      mcCount: mcList.length,
      mcCorrect,
      oeCount: oeList.length,
      oeTotalScore,
      oeMaxScore: oeList.length * 10,
      totalPoints,
      maxPoints,
      percentage
    };
  }, [categorizedQuestions, questionScores]);

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);

    try {
      const { totalQ } = categorizedQuestions;
      const { percentage, totalPoints, maxPoints } = scoreStats;

      const updatedAnswers = (submission.answers || []).map((ans, idx) => {
        const qNo = ans.questionNo || (idx + 1);
        const hasScore = questionScores[qNo] !== undefined && questionScores[qNo] !== null;
        const rawScore = hasScore ? questionScores[qNo] : null;
        const isExplicitEmpty = rawScore === 'empty' || (rawScore === null && ans.userAnswer === null && !ans.userAnswerText);
        const score = isExplicitEmpty ? 'empty' : (rawScore !== null ? Number(rawScore) : null);
        const isCorrect = isExplicitEmpty ? null : (score !== null ? (score >= 5) : null);
        const evalStatus = isExplicitEmpty ? 'empty' : (isCorrect === true ? (score === 5 ? 'half' : 'correct') : (isCorrect === false ? 'wrong' : 'empty'));
        const note = teacherNotes[qNo] || '';
        return {
          ...ans,
          score: isExplicitEmpty ? 'empty' : (score !== null ? score : (ans.score ?? null)),
          isCorrect,
          evalStatus,
          evaluatedByTeacher: hasScore,
          teacherNote: note,
          evaluatedAt: new Date().toISOString()
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
        teacherScores: questionScores,
        teacherNotes: teacherNotes,
        score: percentage,
        scorePercentage: percentage,
        rawScore: totalPoints,
        maxScore: maxPoints,
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

      await updateSubmission(submission.id, updatedSubPayload);

      if (submission.homeworkId || submission.hwId) {
        const hwId = submission.homeworkId || submission.hwId;
        try {
          await updateHomeworkSubmission(hwId, submission.id, updatedSubPayload);
        } catch (e) {}
      }

      if (onSaveSuccess) onSaveSuccess(updatedSubPayload);
      onClose();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !test) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800 }}>
        <Sparkles size={20} className="animate-spin" style={{ marginRight: 8, color: '#6366f1' }} /> Sınav ve Değerlendirme Ekranı Hazırlanıyor...
      </div>
    );
  }

  const isMultiSection = Boolean(
    (test.sections && test.sections.length > 0) ||
    (test.tests && test.tests.length > 0) ||
    (test.items && test.items.length > 0) ||
    String(test?.id || '').startsWith('hw_') ||
    String(submission?.hwId || '').startsWith('hw_') ||
    test.isBulk ||
    test.isMulti ||
    test.isQuestionBank
  );
  const isPdf = Boolean(test.pdfPayload || test.pdfUrl || test.contentType === 'pdf');
  const isHtml = Boolean(test.htmlPayload || test.contentType === 'html');
  const isImageTest = !isHtml && !isPdf && Boolean(test.contentType === 'gorsel' || (test.imageUrls && test.imageUrls.length > 0) || test.imageUrl);

  const renderFullExamScreen = () => {
    if (isMultiSection) {
      return (
        <MultiHomeworkRunner
          test={test}
          questions={questions}
          isReviewMode={true}
          userAnswers={submission}
          onSubmit={onClose}
        />
      );
    }
    if (isPdf) {
      return <PdfQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />;
    }
    if (isHtml) {
      return <HtmlQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />;
    }
    if (isImageTest) {
      return <ImageQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />;
    }
    return <StandardQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-bg)' }}>
      {renderFullExamScreen()}
    </div>
  );
}
