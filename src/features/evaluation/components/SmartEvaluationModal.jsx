import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { resolveTestQuestions, extractQuestionText } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import { toUUID } from '../../../services/supabaseService';
import { isItemOpenEnded, QUICK_FEEDBACK_PRESETS, isValidPayloadString } from '../constants/evaluationConstants';
import { resolveExactQuestionCount } from '../../../components/quiz/runner/MultiHomeworkRunner';
import QuizPanelLayout from '../../../components/quiz/runner/QuizPanelLayout';
import ImageLightbox from '../../../components/quiz/common/ImageLightbox';
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
  const [resolvedImagesMap, setResolvedImagesMap] = useState({});
  const [resolvedPdfPayload, setResolvedPdfPayload] = useState(null);
  const [resolvedHtmlPayload, setResolvedHtmlPayload] = useState(null);
  const [isHtmlType, setIsHtmlType] = useState(false);
  const [isPdfType, setIsPdfType] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeOeIndex, setActiveOeIndex] = useState(0);

  // Local Grading States
  const [questionScores, setQuestionScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const targetId = String(submission?.testId || submission?.homeworkId || submission?.questionId || submission?.id || '');
  const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
  const loadedTargetIdRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTestData() {
      if (loadedTargetIdRef.current === targetId && test) {
        return;
      }
      setLoading(true);

      // 1. Match in homeworks
      let foundHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission?.id)))
      );

      // 2. Match in Question Bank
      let foundBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId)
      );

      // 3. Match in Book Tests
      let foundBookTest = (bookTests || []).find(bt =>
        String(bt.id) === targetId ||
        String(bt.id) === normTargetId ||
        toUUID(bt.id) === targetId
      );

      // 4. Match in Curriculum
      let foundCurTest = (curriculumData?.tests || []).find(t =>
        String(t.id) === targetId ||
        String(t.id) === normTargetId
      );

      // 5. Distinct Title Match fallback
      let titleMatchBankQ = null;
      if (!foundHw && !foundBankQ && !foundBookTest && !foundCurTest && submission?.testTitle) {
        titleMatchBankQ = (allBankQuestions || []).find(q =>
          q.title &&
          String(q.title).toLowerCase().trim() === String(submission.testTitle).toLowerCase().trim()
        );
      }

      let resolved = foundHw || foundBankQ || foundBookTest || foundCurTest || titleMatchBankQ || null;

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

      const submissionAnswers = Array.isArray(submission?.answers) ? submission.answers : [];
      const subAnsCount = submissionAnswers.length;

      if (!resolved) {
        resolved = {
          id: targetId,
          title: submission?.testTitle || submission?.title || 'Ödev / Sınav',
          subject: submission?.subject || 'Genel',
          totalQuestions: subAnsCount > 0 ? subAnsCount : (submission?.totalQuestions || 1),
          questionCount: subAnsCount > 0 ? subAnsCount : (submission?.totalQuestions || 1),
          questionsList: submissionAnswers
        };
      }

      const testTitleLower = String(submission?.testTitle || resolved?.title || foundHw?.title || foundBankQ?.title || '').toLowerCase();
      const isExplicitHtml = Boolean(
        resolved?.contentType === 'html' ||
        resolved?.formatType === 'html' ||
        resolved?.sourceFormat === 'html' ||
        resolved?.type === 'html' ||
        foundBankQ?.contentType === 'html' ||
        foundBankQ?.formatType === 'html' ||
        foundBankQ?.sourceFormat === 'html' ||
        foundBankQ?.type === 'html' ||
        foundHw?.contentType === 'html' ||
        foundHw?.type === 'html' ||
        submission?.contentType === 'html' ||
        submission?.formatType === 'html' ||
        submission?.type === 'html' ||
        testTitleLower.includes('html')
      );

      const isExplicitPdf = Boolean(
        resolved?.contentType === 'pdf' ||
        resolved?.formatType === 'pdf' ||
        resolved?.type === 'pdf' ||
        foundBankQ?.contentType === 'pdf' ||
        foundHw?.contentType === 'pdf' ||
        submission?.contentType === 'pdf' ||
        testTitleLower.includes('pdf') ||
        testTitleLower.includes('pdfaç')
      );

      // Resolve Payloads (PDF / HTML) from Objects & IndexedDB
      const isPdfStr = (val) => isValidPayloadString(val) && (
        val.startsWith('data:application/pdf') ||
        val.includes('.pdf') ||
        val.startsWith('%PDF') ||
        val.includes('drive.google.com') ||
        (val.startsWith('http') && val.includes('pdf'))
      );

      const isHtmlStr = (val) => {
        if (!isValidPayloadString(val)) return false;
        if (isPdfStr(val)) return false;
        if (val.startsWith('data:image') || val.startsWith('blob:image')) return false;
        const lower = val.toLowerCase().trim();
        if (isExplicitHtml) {
          return val.length > 5 && !val.startsWith('data:image');
        }
        return (
          lower.includes('<html') ||
          lower.includes('<!doctype') ||
          lower.includes('<div') ||
          lower.includes('<p') ||
          lower.includes('<table') ||
          lower.includes('<style') ||
          lower.includes('<section') ||
          lower.includes('<body') ||
          lower.includes('<span>') ||
          lower.includes('<h1') ||
          lower.includes('<h2') ||
          lower.includes('<h3') ||
          lower.includes('<h4') ||
          lower.includes('<ol') ||
          lower.includes('<ul') ||
          lower.startsWith('data:text/html') ||
          (lower.startsWith('<') && lower.endsWith('>'))
        );
      };

      let directPdf = [
        resolved?.pdfPayload, resolved?.pdfUrl, resolved?.contentPayload,
        foundBankQ?.pdfPayload, foundBankQ?.pdfUrl, foundBankQ?.contentPayload,
        foundHw?.pdfPayload, foundHw?.pdfUrl, foundHw?.contentPayload,
        submission?.pdfPayload, submission?.pdfUrl, submission?.contentPayload
      ].find(isPdfStr) || null;

      let directHtml = [
        resolved?.htmlPayload, (isExplicitHtml ? resolved?.contentPayload : null),
        foundBankQ?.htmlPayload, (isExplicitHtml ? foundBankQ?.contentPayload : null),
        foundHw?.htmlPayload, (isExplicitHtml ? foundHw?.contentPayload : null),
        submission?.htmlPayload, (isExplicitHtml ? submission?.contentPayload : null),
        resolved?.contentPayload,
        foundBankQ?.contentPayload,
        foundHw?.contentPayload,
        submission?.contentPayload
      ].find(isHtmlStr) || null;

      // If not found in memory, query IndexedDB across all possible candidate keys
      if (!directPdf && !directHtml) {
        const candidateKeys = [
          targetId,
          normTargetId,
          toUUID(targetId),
          toUUID(normTargetId),
          `q_${targetId}`,
          `q_${normTargetId}`,
          `pdf_${targetId}`,
          `pdf_${normTargetId}`,
          `hw_${targetId}`,
          `hw_${normTargetId}`,
          submission?.testId,
          toUUID(submission?.testId),
          submission?.realTestId,
          toUUID(submission?.realTestId),
          submission?.homeworkId,
          toUUID(submission?.homeworkId),
          submission?.questionId,
          toUUID(submission?.questionId),
          submission?.id,
          toUUID(submission?.id),
          foundBankQ?.id,
          toUUID(foundBankQ?.id),
          foundBankQ?.questionId,
          toUUID(foundBankQ?.questionId),
          foundHw?.id,
          toUUID(foundHw?.id),
          foundHw?.testId,
          toUUID(foundHw?.testId),
          foundHw?.questionId,
          toUUID(foundHw?.questionId),
          resolved?.id,
          toUUID(resolved?.id),
          resolved?.realTestId,
          resolved?.questionsList?.[0]?.id,
          foundBankQ?.questionsList?.[0]?.id,
          resolved?.pdfPayload,
          resolved?.htmlPayload,
          resolved?.contentPayload
        ].filter(Boolean);

        for (const k of candidateKeys) {
          const sK = String(k);
          if (sK === '[STORED_IN_INDEXEDDB]' || sK === '[LOCALSTORAGE_CACHE]') continue;
          try {
            const raw = await idbGetPayload(sK);
            if (raw && typeof raw === 'string') {
              if (isPdfStr(raw)) {
                directPdf = raw;
                break;
              } else if (isHtmlStr(raw)) {
                directHtml = raw;
                break;
              }
            }
          } catch (e) {}
        }
      }

      let generatedQuestions = [];
      const sections = resolved?.sections || resolved?.tests || resolved?.items || null;

      const resolvedImages = (isExplicitHtml || isExplicitPdf) ? [] : [
        ...(Array.isArray(resolved?.imageUrls) ? resolved.imageUrls : []),
        ...(Array.isArray(foundBankQ?.imageUrls) ? foundBankQ.imageUrls : []),
        ...(Array.isArray(foundHw?.imageUrls) ? foundHw.imageUrls : []),
        ...(resolved?.imageUrl ? [resolved.imageUrl] : []),
        ...(foundBankQ?.imageUrl ? [foundBankQ.imageUrl] : [])
      ].filter(u => u && typeof u === 'string' && (u.startsWith('data:image') || u.startsWith('http') || u.startsWith('blob:') || u.startsWith('idb:')));

      if (Array.isArray(sections) && sections.length > 0 && subAnsCount === 0) {
        let runningQIndex = 0;
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const secBankQ = (allBankQuestions || []).find(q => String(q.id) === String(secQId));
          const secResolvedQs = secBankQ ? resolveTestQuestions(secBankQ, allBankQuestions) : [];
          const secImages = (secBankQ?.imageUrls && Array.isArray(secBankQ.imageUrls)) ? secBankQ.imageUrls : [];
          const secCount = resolveExactQuestionCount(sec, secBankQ, secBankQ, secResolvedQs, secImages);

          const secPdf = (isValidPayloadString(secBankQ?.pdfPayload) ? secBankQ.pdfPayload : null) || directPdf;
          const secHtml = (isValidPayloadString(secBankQ?.htmlPayload) ? secBankQ.htmlPayload : null) || directHtml;
          const isSecOE = isItemOpenEnded(secBankQ) || isItemOpenEnded(sec);

          for (let qIdx = 0; qIdx < secCount; qIdx++) {
            runningQIndex++;
            const existingQ = secResolvedQs[qIdx] || {};
            const qImg = (isExplicitHtml || isExplicitPdf) ? null : (secImages[qIdx] || (secImages.length === 1 ? secImages[0] : null) || existingQ.imageUrl || null);

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
        }
      } else {
        const resolvedQs = resolveTestQuestions(resolved, allBankQuestions);
        let count = subAnsCount > 0 ? subAnsCount : (submission?.totalQuestions || resolveExactQuestionCount(resolved, resolved, resolved, resolvedQs, resolvedImages));
        count = Math.max(1, count);

        for (let qIdx = 0; qIdx < count; qIdx++) {
          const ans = submissionAnswers[qIdx] || {};
          const existingQ = resolvedQs[qIdx] || {};
          const qImg = (isExplicitHtml || isExplicitPdf) ? null : (
            existingQ.imageUrl ||
            resolvedImages[qIdx] ||
            (resolvedImages.length === 1 && count === 1 ? resolvedImages[0] : null) ||
            ans.imageUrl ||
            ans.photoUrl ||
            null
          );
          const isSingleOE = isItemOpenEnded(resolved, ans) || isItemOpenEnded(existingQ, ans) || existingQ.isOpenEnded;

          generatedQuestions.push({
            ...existingQ,
            id: existingQ.id || ans.questionId || `${targetId}_q${qIdx + 1}`,
            globalIndex: qIdx + 1,
            questionNo: ans.questionNo || (qIdx + 1),
            subIndex: qIdx,
            title: existingQ.title || existingQ.name || `Soru ${qIdx + 1}`,
            questionText: existingQ.questionText || extractQuestionText(existingQ, resolved, qIdx) || (count === 1 ? (resolved?.questionText || resolved?.title) : `Soru ${qIdx + 1}`),
            pdfPayload: directPdf,
            htmlPayload: directHtml,
            imageUrl: qImg,
            isOpenEnded: isSingleOE,
            options: existingQ.options || (isSingleOE ? [] : ['A', 'B', 'C', 'D']),
            correctAnswer: existingQ.correctAnswer ?? (isSingleOE ? null : 0)
          });
        }
      }

      // Strictly cap questions to the student's submission count if answers exist
      if (subAnsCount > 0 && generatedQuestions.length > subAnsCount) {
        generatedQuestions = generatedQuestions.slice(0, subAnsCount);
      }

      // Resolve question images from IndexedDB asynchronously (only for genuine image tests)
      const imgMap = {};
      if (!isExplicitHtml && !isExplicitPdf && !directPdf && !directHtml) {
        for (const q of generatedQuestions) {
          const rawImg = q.imageUrl;
          if (rawImg && typeof rawImg === 'string') {
            if (rawImg.startsWith('idb:') || rawImg.length > 50) {
              try {
                const loaded = await idbGetPayload(rawImg);
                if (loaded && typeof loaded === 'string' && (loaded.startsWith('data:image') || loaded.startsWith('http'))) {
                  imgMap[q.questionNo] = loaded;
                }
              } catch {}
            } else if (rawImg.startsWith('data:image') || rawImg.startsWith('http')) {
              imgMap[q.questionNo] = rawImg;
            }
          }
        }
      }

      if (isMounted) {
        setTest(resolved);
        setQuestions(generatedQuestions);
        setResolvedImagesMap(imgMap);
        setResolvedPdfPayload(directPdf);
        setResolvedHtmlPayload(directHtml);
        setIsHtmlType(isExplicitHtml || Boolean(directHtml));
        setIsPdfType(isExplicitPdf || Boolean(directPdf));

        const scores = {};
        const notes = {};

        if (submissionAnswers.length > 0) {
          submissionAnswers.forEach((a, idx) => {
            const qNo = a.questionNo || a.questionNoInSection || (idx + 1);
            if (a.score !== undefined && a.score !== null && (a.evaluatedByTeacher === true || submission.isEvaluatedByTeacher)) {
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
        setOverallFeedback(submission?.teacherFeedback || submission?.teacherNote || '');
        loadedTargetIdRef.current = targetId;
        setLoading(false);
      }
    }

    loadTestData();
    return () => { isMounted = false; };
  }, [submission, targetId, normTargetId, allBankQuestions, homeworks, curriculumData, bookTests]);

  const categorizedQuestions = useMemo(() => {
    const submissionAnswers = Array.isArray(submission?.answers) ? submission.answers : [];
    const totalQ = Math.max(1, questions?.length || submissionAnswers.length || submission?.totalQuestions || 1);
    const oeList = [];
    const mcList = [];

    for (let i = 1; i <= totalQ; i++) {
      const qObj = questions[i - 1] || {};
      const ans = submissionAnswers.find(a => Number(a?.questionNo) === i || Number(a?.questionNoInSection) === i || Number(a?.number) === i || Number(a?.qNo) === i) ||
                  submissionAnswers[i - 1] ||
                  (typeof submission?.answers === 'object' && !Array.isArray(submission?.answers) ? (submission.answers[i] || submission.answers[String(i)]) : null) ||
                  {};

      // Extract student written answer from all candidate locations
      const studentTextCandidates = [
        ans?.userAnswerText,
        ans?.studentAnswerText,
        ans?.writtenAnswer,
        ans?.textAns,
        ans?.text,
        ans?.studentAnswer,
        (typeof ans?.userAnswer === 'string' && isNaN(Number(ans.userAnswer)) && ans.userAnswer !== 'empty' && !/^[A-E]$/i.test(ans.userAnswer.trim()) ? ans.userAnswer : null),
        (typeof ans?.answer === 'string' && isNaN(Number(ans.answer)) && ans.answer !== 'empty' && !/^[A-E]$/i.test(ans.answer.trim()) ? ans.answer : null),
        submission?.openEndedText?.[i],
        submission?.openEndedText?.[String(i)],
        submission?.raw_data?.openEndedText?.[i],
        submission?.raw_data?.openEndedText?.[String(i)],
        (typeof submission?.answers?.[i] === 'string' ? submission.answers[i] : null),
        (typeof submission?.answers?.[String(i)] === 'string' ? submission.answers[String(i)] : null),
        submission?.raw_data?.answers?.[i - 1]?.userAnswerText,
        submission?.raw_data?.answers?.[i - 1]?.userAnswer,
        submission?.raw_data?.answers?.[i]?.userAnswerText,
        submission?.userAnswers?.[i],
        submission?.userAnswers?.[String(i)],
        submission?.studentAnswers?.[i],
        submission?.studentAnswers?.[String(i)]
      ];

      const studentWritten = (studentTextCandidates.find(t => t !== undefined && t !== null && typeof t === 'string' && t.trim() !== '' && t.trim() !== 'empty') || '').trim();

      // Extract student photo / image from all candidates
      const studentImageCandidates = [
        ans?.imageUrl,
        ans?.photoUrl,
        ans?.fileUrl,
        ans?.studentImageUrl,
        ans?.studentPhotoUrl,
        ans?.solutionImageUrl,
        submission?.openEndedImages?.[i],
        submission?.openEndedImages?.[String(i)],
        submission?.raw_data?.openEndedImages?.[i],
        submission?.raw_data?.openEndedImages?.[String(i)]
      ];
      const studentImage = studentImageCandidates.find(u => u && typeof u === 'string' && (u.startsWith('data:image') || u.startsWith('http') || u.startsWith('blob:') || u.startsWith('idb:'))) || null;

      const isOE = isItemOpenEnded(qObj, ans) ||
                   Boolean(studentWritten.length > 0) ||
                   Boolean(studentImage) ||
                   (test?.type === 'acik_uclu' || test?.contentType === 'acik_uclu' || test?.formatType === 'acik_uclu');

      const itemInfo = {
        qNo: i,
        question: qObj,
        answer: ans,
        studentWritten,
        studentImage,
        isOE,
        imageUrl: resolvedImagesMap[i] || (qObj.imageUrl && !qObj.imageUrl.startsWith('idb:') ? qObj.imageUrl : null),
        pdfPayload: qObj.pdfPayload || (!resolvedImagesMap[i] && !qObj.imageUrl ? resolvedPdfPayload : null),
        htmlPayload: qObj.htmlPayload || (!resolvedImagesMap[i] && !qObj.imageUrl ? resolvedHtmlPayload : null),
        title: qObj.title || `Soru ${i}`,
        sectionTitle: qObj.sectionTitle || test?.title || null
      };

      if (isOE) oeList.push(itemInfo);
      else mcList.push(itemInfo);
    }

    return { oeList, mcList, totalQ };
  }, [questions, submission, test, resolvedImagesMap, resolvedPdfPayload, resolvedHtmlPayload, isHtmlType, isPdfType]);

  const scoreStats = useMemo(() => {
    const { oeList, mcList, totalQ } = categorizedQuestions;

    let mcCorrect = 0;
    mcList.forEach(m => {
      if (m.answer?.isCorrect === true) mcCorrect++;
    });

    let oeTotalScore = 0;
    let oeGradedCount = 0;
    oeList.forEach(o => {
      const s = questionScores[o.qNo] ?? (o.answer?.score !== undefined && o.answer?.score !== null && o.answer?.score !== 'empty' ? Number(o.answer.score) : null);
      if (s !== null && s !== undefined) {
        oeGradedCount++;
        oeTotalScore += Math.max(0, Math.min(10, Number(s) || 0));
      }
    });

    const mcPoints = mcCorrect * 10;
    const totalPoints = mcPoints + oeTotalScore;
    const maxPoints = totalQ * 10;
    const percentage = maxPoints > 0 ? Math.min(100, Math.round((totalPoints / maxPoints) * 100)) : 0;

    return {
      mcCount: mcList.length,
      mcCorrect,
      oeCount: oeList.length,
      oeGradedCount,
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
        const isCorrect = isExplicitEmpty ? null : (score !== null ? (score >= 5) : ans.isCorrect);
        const evalStatus = isExplicitEmpty ? 'empty' : (isCorrect === true ? (score === 5 ? 'half' : 'correct') : (isCorrect === false ? 'wrong' : 'empty'));
        const note = teacherNotes[qNo] || '';
        return {
          ...ans,
          score: isExplicitEmpty ? 'empty' : (score !== null ? score : (ans.score ?? null)),
          isCorrect,
          evalStatus,
          evaluatedByTeacher: true,
          teacherNote: note || ans.teacherNote || '',
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
        evaluatedByTeacher: true,
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      // 1. Save to Database via EvaluationContext (Submissions Table)
      await updateSubmission(submission.id, updatedSubPayload);

      // 2. Save to Database via HomeworkContext (Homeworks Table)
      const hwId = submission.homeworkId || submission.hwId || submission.id;
      if (hwId) {
        try {
          await updateHomeworkSubmission(hwId, submission.studentId || submission.id, updatedSubPayload);
        } catch (e) {
          console.warn('updateHomeworkSubmission error:', e);
        }
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

  const { oeList, mcList, totalQ } = categorizedQuestions;
  const { percentage, totalPoints, maxPoints, oeCount, oeGradedCount, mcCount, mcCorrect } = scoreStats;

  // Active Open-Ended Question
  const safeActiveIndex = Math.min(Math.max(0, activeOeIndex), Math.max(0, oeList.length - 1));
  const activeItem = oeList[safeActiveIndex] || null;

  // Active Document Payload (PDF / HTML)
  const questionImage = activeItem?.imageUrl || activeItem?.question?.imageUrl || activeItem?.question?.image;
  const hasItemSpecificImage = Boolean(questionImage && typeof questionImage === 'string' && !questionImage.includes('[STORED_IN_INDEXEDDB]'));

  const isItemHtml = Boolean(activeItem?.htmlPayload || (!hasItemSpecificImage && resolvedHtmlPayload));
  const isItemPdf = Boolean(activeItem?.pdfPayload || (!hasItemSpecificImage && !isItemHtml && resolvedPdfPayload));

  const currentPdf = isItemPdf ? (activeItem?.pdfPayload || resolvedPdfPayload) : null;
  const currentHtml = isItemHtml ? (activeItem?.htmlPayload || resolvedHtmlPayload) : null;
  const hasDocument = Boolean((currentPdf && isItemPdf) || (currentHtml && isItemHtml));

  // ── Step-by-Step Evaluation Panel Content ──
  const evaluationPanelContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      padding: hasDocument ? '1rem 1.25rem 2.5rem' : '1.5rem',
      maxWidth: hasDocument ? '100%' : '900px',
      margin: '0 auto',
      width: '100%'
    }}>

      {/* ── QUESTION NAVIGATOR PILLS ── */}
      {oeList.length > 0 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '0.85rem',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', marginRight: 4 }}>
            Açık Uçlu Sorular ({oeList.length}):
          </span>

          {oeList.map((item, idx) => {
            const qNo = item.qNo;
            const score = questionScores[qNo] ?? (item.answer?.score !== undefined && item.answer?.score !== null ? item.answer.score : null);
            const isGraded = score !== null && score !== undefined;
            const isActive = idx === safeActiveIndex;

            let badgeBg = 'var(--color-surface-hover)';
            let badgeBorder = 'var(--color-border)';
            let badgeColor = 'var(--color-text)';

            if (isActive) {
              badgeBorder = '#7c3aed';
              badgeColor = '#7c3aed';
              badgeBg = 'rgba(124, 58, 237, 0.12)';
            } else if (isGraded) {
              if (score === 'empty') {
                badgeBg = 'rgba(100, 116, 139, 0.15)';
                badgeColor = '#64748b';
              } else if (Number(score) >= 8) {
                badgeBg = 'rgba(16, 185, 129, 0.15)';
                badgeColor = '#10b981';
                badgeBorder = 'rgba(16, 185, 129, 0.4)';
              } else if (Number(score) >= 5) {
                badgeBg = 'rgba(245, 158, 11, 0.15)';
                badgeColor = '#d97706';
                badgeBorder = 'rgba(245, 158, 11, 0.4)';
              } else {
                badgeBg = 'rgba(239, 68, 68, 0.15)';
                badgeColor = '#ef4444';
                badgeBorder = 'rgba(239, 68, 68, 0.4)';
              }
            }

            return (
              <button
                key={qNo}
                type="button"
                onClick={() => setActiveOeIndex(idx)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.6rem',
                  border: isActive ? '2px solid #7c3aed' : `1.5px solid ${badgeBorder}`,
                  background: badgeBg,
                  color: badgeColor,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 0 0 3px rgba(124, 58, 237, 0.2)' : 'none'
                }}
              >
                <span>Soru {qNo}</span>
                {isGraded && (
                  <span style={{ fontSize: '0.68rem' }}>
                    {score === 'empty' ? '○' : `(${score}P)`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── ACTIVE QUESTION CARD ── */}
      {oeList.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: '1rem',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)'
        }}>
          <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>
            Bu sınavda manuel puanlama gerektiren açık uçlu soru bulunmamaktadır.
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
            Çoktan seçmeli sorular cevap anahtarıyla otomatik olarak puanlanmıştır.
          </p>
        </div>
      ) : activeItem && (
        (() => {
          const qNo = activeItem.qNo;
          const currentScore = questionScores[qNo] ?? (activeItem.answer?.score !== undefined && activeItem.answer?.score !== null ? activeItem.answer.score : null);
          const currentNote = teacherNotes[qNo] ?? (activeItem.answer?.teacherNote || activeItem.answer?.feedback || '');
          const studentWritten = activeItem.studentWritten;
          const studentImage = activeItem.studentImage;
          const questionImage = activeItem.imageUrl;
          const modelAnswer = activeItem.question?.correctAnswerText || activeItem.question?.explanation || (activeItem.question?.correctAnswer && isNaN(Number(activeItem.question.correctAnswer)) ? activeItem.question.correctAnswer : null);

          return (
            <div
              key={qNo}
              style={{
                background: 'var(--color-surface)',
                border: currentScore !== null && currentScore !== undefined ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid var(--color-border)',
                borderRadius: '1.25rem',
                padding: '1.35rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#7c3aed',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {qNo}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem' }}>
                      {activeItem.title || `${qNo}. Soru`}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {safeActiveIndex + 1} / {oeList.length} Açık Uçlu Soru {activeItem.sectionTitle ? `• ${activeItem.sectionTitle}` : ''}
                    </span>
                  </div>
                </div>

                {/* Score Status Badge */}
                <div>
                  {currentScore !== null && currentScore !== undefined ? (
                    <span style={{
                      background: currentScore === 'empty' ? '#64748b' : Number(currentScore) >= 8 ? '#10b981' : Number(currentScore) >= 5 ? '#f59e0b' : '#ef4444',
                      color: 'white',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '0.7rem',
                      fontWeight: 900,
                      fontSize: '0.82rem'
                    }}>
                      {currentScore === 'empty' ? '○ Boş Bırakıldı' : `Verilen Not: ${currentScore} / 10 P`}
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#b45309',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '0.7rem',
                      fontWeight: 800,
                      fontSize: '0.78rem'
                    }}>
                      ⏳ Puan Bekliyor
                    </span>
                  )}
                </div>
              </div>

              {/* Question Image (Only show if genuine image is available and NOT in PDF/HTML mode) */}
              {questionImage && !hasDocument && (
                <div style={{ maxWidth: '650px', borderRadius: '0.85rem', overflow: 'hidden', border: '1.5px solid var(--color-border)', margin: '0 auto', width: '100%', background: '#f8fafc' }}>
                  <img
                    src={questionImage}
                    alt={`Soru ${qNo}`}
                    style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', cursor: 'pointer', display: 'block' }}
                    onClick={() => setLightboxSrc(questionImage)}
                  />
                </div>
              )}

              {/* Question Text (if standalone text without PDF/HTML) */}
              {!hasDocument && activeItem.question?.questionText && (
                <div style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  color: 'var(--color-text)',
                  fontWeight: 700,
                  background: 'var(--color-surface-hover)',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '0.85rem',
                  border: '1px solid var(--color-border)'
                }}>
                  {activeItem.question.questionText}
                </div>
              )}

              {/* 📝 ÖĞRENCİNİN YAZILI CEVABI */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(124, 58, 237, 0.05))',
                border: '2px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '1rem',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={16} /> ÖĞRENCİNİN YAZILI CEVABI:
                </div>

                {studentWritten ? (
                  <div style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: 'var(--color-text)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    padding: '0.4rem 0'
                  }}>
                    {studentWritten}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.4rem 0' }}>
                    ⚪ Öğrenci bu soruya yazılı metin yanıtı girmemiş.
                  </div>
                )}

                {/* Öğrencinin Çözüm Fotoğrafı */}
                {studentImage && (
                  <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px dashed rgba(99, 102, 241, 0.2)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5' }}>📷 Öğrencinin Çözüm Kağıdı / Fotoğrafı:</span>
                    <div style={{ maxWidth: '320px', marginTop: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img
                        src={studentImage}
                        alt="Öğrenci Çözümü"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => setLightboxSrc(studentImage)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 🔑 MODEL CEVAP / REHBER (Varsa) */}
              {modelAnswer && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1.5px dashed rgba(16, 185, 129, 0.35)',
                  borderRadius: '0.85rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  lineHeight: 1.5
                }}>
                  <span style={{ fontWeight: 900, color: '#15803d' }}>🔑 Cevap Anahtarı / Çözüm Kılavuzu: </span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>{modelAnswer}</span>
                </div>
              )}

              {/* 💯 PUAN VERME BUTONLARI & KUTUSU */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem',
                paddingTop: '0.75rem',
                borderTop: '1.5px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900 }}>Puan Ver:</span>

                  {[
                    { label: '✓ Tam (10)', val: 10, bg: '#10b981', color: 'white' },
                    { label: '⚡ Yarım (5)', val: 5, bg: '#f59e0b', color: 'white' },
                    { label: '✗ Sıfır (0)', val: 0, bg: '#ef4444', color: 'white' },
                    { label: '○ Boş', val: 'empty', bg: '#64748b', color: 'white' }
                  ].map((btn) => {
                    const isSelected = String(currentScore) === String(btn.val);
                    return (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setQuestionScores(prev => ({ ...prev, [qNo]: btn.val }))}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.6rem',
                          border: isSelected ? `2px solid ${btn.bg}` : '1.5px solid var(--color-border)',
                          background: isSelected ? btn.bg : 'var(--color-surface-hover)',
                          color: isSelected ? btn.color : 'var(--color-text)',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? `0 4px 10px ${btn.bg}40` : 'none'
                        }}
                      >
                        {btn.label}
                      </button>
                    );
                  })}

                  {/* Custom Input Box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      placeholder="Puan"
                      value={currentScore === 'empty' || currentScore === null || currentScore === undefined ? '' : currentScore}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setQuestionScores(prev => ({ ...prev, [qNo]: val }));
                      }}
                      style={{
                        width: '65px',
                        padding: '0.4rem 0.45rem',
                        borderRadius: '0.6rem',
                        border: '2px solid var(--color-border-input)',
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        textAlign: 'center',
                        outline: 'none',
                        background: 'var(--color-surface)'
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>/ 10</span>
                  </div>
                </div>
              </div>

              {/* 💬 ÖĞRETMEN NOTU & GERİ BİLDİRİM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>
                  💬 Bu Soru İçin Öğretmen Notu & Geri Bildirimi:
                </span>
                <input
                  type="text"
                  placeholder="Örn: Çözüm yolun doğru ama işlem sırasına dikkat etmelisin..."
                  value={currentNote}
                  onChange={(e) => setTeacherNotes(prev => ({ ...prev, [qNo]: e.target.value }))}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border-input)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    width: '100%'
                  }}
                />

                {/* Preset Feedback Tags */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {['⭐ Harika Çözüm!', '⚠️ İşlem Hatası Var', '💡 Çözüm Yolu Doğru', '🧠 Eksik Adım Bırakılmış'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTeacherNotes(prev => ({ ...prev, [qNo]: tag }))}
                      style={{
                        padding: '0.18rem 0.5rem',
                        borderRadius: 6,
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          );
        })()
      )}

      {/* ── PAGINATION CONTROLS (ÖNCEKİ / SONRAKİ BUTONLARI) ── */}
      {oeList.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          padding: '0.5rem 0'
        }}>
          <button
            type="button"
            disabled={safeActiveIndex === 0}
            onClick={() => setActiveOeIndex(prev => Math.max(0, prev - 1))}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: safeActiveIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: safeActiveIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: safeActiveIndex === 0 ? 0.4 : 1
            }}
          >
            <ChevronLeft size={18} /> Önceki Soru
          </button>

          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>
            Soru {safeActiveIndex + 1} / {oeList.length}
          </span>

          {safeActiveIndex < oeList.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveOeIndex(prev => Math.min(oeList.length - 1, prev + 1))}
              style={{
                padding: '0.65rem 1.45rem',
                borderRadius: '0.85rem',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
              }}
            >
              Sonraki Soru <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              style={{
                padding: '0.65rem 1.45rem',
                borderRadius: '0.85rem',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle size={18} /> Değerlendirmeyi Kaydet
            </button>
          )}
        </div>
      )}

      {/* ── OVERALL GENERAL TEACHER FEEDBACK ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1rem',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={16} color="#4f46e5" />
          Öğrenciye Genel Sınav Değerlendirmesi ve Tavsiyesi:
        </span>
        <textarea
          rows={2}
          placeholder="Öğrencinin bu sınavdaki genel performansını özetleyen bir mesaj yazın..."
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 0.85rem',
            borderRadius: '0.75rem',
            border: '1.5px solid var(--color-border-input)',
            fontSize: '0.82rem',
            outline: 'none',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            lineHeight: 1.5
          }}
        />
      </div>

      {/* ── AUTO-GRADED MULTIPLE CHOICE SUMMARY (IF MIXED TEST) ── */}
      {mcList.length > 0 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '1rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} color="#10b981" />
              Otomatik Değerlendirilen Çoktan Seçmeli Sorular ({mcCorrect}/{mcCount} Doğru)
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
              Otomatik Puanlandı
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.4rem', marginTop: 2 }}>
            {mcList.map(m => {
              const isCorrect = m.answer?.isCorrect === true;
              const isWrong = m.answer?.isCorrect === false;
              return (
                <div key={m.qNo} style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.55rem',
                  background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : isWrong ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-hover)',
                  border: `1px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--color-border)'}`,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Soru {m.qNo}</span>
                  <span style={{ color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : '#64748b' }}>
                    {isCorrect ? '✓' : isWrong ? '✗' : '○'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* ── TOP HEADER ── */}
      <header style={{
        padding: '0.85rem 1.5rem',
        background: 'var(--color-surface)',
        borderBottom: '1.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.6rem',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Kapat"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
                {test?.title || submission?.testTitle || 'Yazılı Sınav Değerlendirmesi'}
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '1rem',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#4f46e5'
              }}>
                {submission?.subject || test?.subject || 'Genel'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span>👤 Öğrenci: <strong>{submission?.studentName || 'Öğrenci'}</strong></span>
              <span>•</span>
              <span>📝 {oeCount} Açık Uçlu Soru ({oeGradedCount}/{oeCount} Puanlandı)</span>
            </div>
          </div>
        </div>

        {/* Score & Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))',
            border: '1.5px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.75rem',
            padding: '0.35rem 0.85rem',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
              Sınav Notu
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>
              %{percentage} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>({totalPoints}/{maxPoints} P)</span>
            </div>
          </div>

          <button
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.6rem 1.2rem',
              fontSize: '0.85rem',
              fontWeight: 900,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet & Yayınla'}</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT (SPLIT VIEW IF PDF/HTML EXISTS) ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {hasDocument ? (
          <QuizPanelLayout
            panelTitle="Yazılı Değerlendirme"
            panelSubtitle={`${activeOeIndex + 1}. Soru — Not ve Geri Bildirim`}
            icon="✍️"
            defaultPosition="right"
            defaultSize={480}
            documentContent={
              <div style={{ flex: 1, minWidth: 0, height: '100%', background: '#1e293b', color: '#ffffff' }}>
                {isPdfType && currentPdf ? (
                  <PdfViewerWithControls payload={currentPdf} title={test?.title} height="100%" />
                ) : (
                  <HtmlViewerWithControls
                    payload={currentHtml}
                    htmlContent={currentHtml}
                    htmlPayload={currentHtml}
                    title={test?.title}
                    height="100%"
                    id={targetId}
                    testId={targetId}
                    realTestId={test?.id || targetId}
                    test={test}
                  />
                )}
              </div>
            }
            answerContent={
              <div style={{ height: '100%', overflowY: 'auto' }}>
                {evaluationPanelContent}
              </div>
            }
          />
        ) : (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            {evaluationPanelContent}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={Boolean(lightboxSrc)}
        imageUrl={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
