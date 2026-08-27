import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import { toUUID } from '../../../services/supabaseService';
import { isItemOpenEnded, QUICK_FEEDBACK_PRESETS, isValidPayloadString } from '../constants/evaluationConstants';
import { resolveExactQuestionCount } from '../../../components/quiz/runner/MultiHomeworkRunner';
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
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTopMedia, setShowTopMedia] = useState(false);
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

      let foundHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission?.id)))
      );

      let foundBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId)
      );

      let titleMatchBankQ = (allBankQuestions || []).find(q =>
        submission?.testTitle && q.title &&
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
          title: submission?.testTitle || submission?.title || 'Ödev / Sınav',
          subject: submission?.subject || 'Genel',
          totalQuestions: submission?.answers?.length || 1,
          questionCount: submission?.answers?.length || 1,
          questionsList: submission?.answers || []
        };
      }

      let contentPayload = isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null;
      let pdfPayload = isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null;
      let htmlPayload = isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null;

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const rawKeys = [
          targetId,
          normTargetId,
          submission?.testId,
          submission?.homeworkId,
          submission?.questionId,
          resolved?.id,
          resolved?.pdfPayload,
          resolved?.htmlPayload,
          resolved?.contentPayload
        ].filter(Boolean);

        for (const rk of rawKeys) {
          const sK = String(rk);
          if (sK.startsWith('idb:') || sK.startsWith('data:') || sK.length > 50 || sK.includes('-')) {
            const raw = await idbGetPayload(sK);
            if (isValidPayloadString(raw)) {
              if (raw.startsWith('data:application/pdf') || raw.includes('.pdf') || raw.startsWith('%PDF')) {
                pdfPayload = raw;
              } else if (raw.includes('<html') || raw.startsWith('<!DOCTYPE') || raw.startsWith('data:text/html')) {
                htmlPayload = raw;
              } else {
                contentPayload = raw;
              }
              break;
            }
          }
        }
      }

      const generatedQuestions = [];
      const sections = resolved?.sections || resolved?.tests || resolved?.items || null;

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

        if (submission?.answers && Array.isArray(submission.answers)) {
          submission.answers.forEach((a, idx) => {
            const qNo = a.questionNo || a.questionNoInSection || (idx + 1);
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
        setOverallFeedback(submission?.teacherFeedback || submission?.teacherNote || '');
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
      const isOE = isItemOpenEnded(qObj, ans) || Boolean(ans.userAnswerText && String(ans.userAnswerText).trim().length > 0);

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
          evaluatedByTeacher: hasScore || ans.evaluatedByTeacher,
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

  const { oeList, mcList, totalQ } = categorizedQuestions;
  const { percentage, totalPoints, maxPoints, oeCount, oeGradedCount, mcCount, mcCorrect } = scoreStats;

  // Active Open-Ended Question
  const safeActiveIndex = Math.min(Math.max(0, activeOeIndex), Math.max(0, oeList.length - 1));
  const activeItem = oeList[safeActiveIndex] || null;

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
      {/* ── 1. TOP HEADER ── */}
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
        zIndex: 10
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

      {/* ── 2. QUESTION NAVIGATOR PILLS (TEK TEK SORU GEÇİŞ ÇUBUĞU) ── */}
      {oeList.length > 0 && (
        <div style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', marginRight: 4 }}>
            Sorular:
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
              badgeBg = 'rgba(124, 58, 237, 0.1)';
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
                  padding: '0.35rem 0.8rem',
                  borderRadius: '0.6rem',
                  border: isActive ? '2px solid #7c3aed' : `1.5px solid ${badgeBorder}`,
                  background: badgeBg,
                  color: badgeColor,
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 0 0 3px rgba(124, 58, 237, 0.2)' : 'none'
                }}
              >
                <span>Soru {qNo}</span>
                {isGraded && (
                  <span style={{ fontSize: '0.7rem' }}>
                    {score === 'empty' ? '○' : `(${score}P)`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 3. BODY: SINGLE QUESTION CARD CONTAINER ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem 1.5rem',
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>

        {/* Global Media (PDF / Document Preview if available) */}
        {globalMedia.hasPdf && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '0.75rem 1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTopMedia ? '0.75rem' : 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={15} color="#3b82f6" /> Sınav Dokümanı (PDF)
              </span>
              <button
                type="button"
                onClick={() => setShowTopMedia(!showTopMedia)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}
              >
                {showTopMedia ? 'Gizle ▲' : 'Dokümanı Göster ▼'}
              </button>
            </div>
            {showTopMedia && (
              <div style={{ height: '380px', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <PdfViewerWithControls payload={globalMedia.pdfSrc} title={test?.title} />
              </div>
            )}
          </div>
        )}

        {/* ACTIVE QUESTION CONTAINER */}
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
            const studentWritten = activeItem.answer?.userAnswerText || activeItem.answer?.studentAnswerText || activeItem.answer?.writtenAnswer || activeItem.answer?.text || (typeof activeItem.answer?.userAnswer === 'string' && isNaN(Number(activeItem.answer.userAnswer)) ? activeItem.answer.userAnswer : '');
            const studentImage = activeItem.answer?.imageUrl || activeItem.answer?.photoUrl || activeItem.answer?.fileUrl || null;
            const questionImage = activeItem.imageUrl || activeItem.question?.imageUrl || null;
            const modelAnswer = activeItem.question?.correctAnswerText || activeItem.question?.explanation || (activeItem.question?.correctAnswer && isNaN(Number(activeItem.question.correctAnswer)) ? activeItem.question.correctAnswer : null);

            return (
              <div
                key={qNo}
                style={{
                  background: 'var(--color-surface)',
                  border: currentScore !== null && currentScore !== undefined ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid var(--color-border)',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
                }}
              >
                {/* Question Header & Title */}
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
                        padding: '0.3rem 0.85rem',
                        borderRadius: '0.7rem',
                        fontWeight: 900,
                        fontSize: '0.85rem'
                      }}>
                        {currentScore === 'empty' ? '○ Boş Bırakıldı' : `Verilen Not: ${currentScore} / 10 Puan`}
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#b45309',
                        padding: '0.3rem 0.85rem',
                        borderRadius: '0.7rem',
                        fontWeight: 800,
                        fontSize: '0.8rem'
                      }}>
                        ⏳ Henüz Puanlanmadı
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Image (if any) */}
                {questionImage && (
                  <div style={{ maxWidth: '650px', borderRadius: '0.85rem', overflow: 'hidden', border: '1px solid var(--color-border)', margin: '0 auto', width: '100%' }}>
                    <img
                      src={questionImage}
                      alt={`Soru ${qNo}`}
                      style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', background: '#f8fafc', cursor: 'pointer' }}
                      onClick={() => setLightboxSrc(questionImage)}
                    />
                  </div>
                )}

                {/* Question Text */}
                {activeItem.question?.questionText && (
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
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Edit3 size={16} /> ÖĞRENCİNİN YAZILI YANITI:
                  </div>

                  {studentWritten ? (
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--color-text)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      padding: '0.5rem 0'
                    }}>
                      {studentWritten}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      ⚪ Öğrenci bu soruya yazılı metin yanıtı girmemiş.
                    </div>
                  )}

                  {/* Öğrencinin Çözüm Fotoğrafı */}
                  {studentImage && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(99, 102, 241, 0.2)' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5' }}>📷 Öğrencinin Çözüm Kağıdı / Fotoğrafı:</span>
                      <div style={{ maxWidth: '350px', marginTop: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <img
                          src={studentImage}
                          alt="Öğrenci Çözümü"
                          style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', cursor: 'pointer' }}
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
                    padding: '0.85rem 1.15rem',
                    fontSize: '0.85rem',
                    lineHeight: 1.55
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
                  gap: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1.5px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>Puan Ver:</span>

                    {[
                      { label: '✓ Tam Puan (10)', val: 10, bg: '#10b981', color: 'white' },
                      { label: '⚡ Yarım (5)', val: 5, bg: '#f59e0b', color: 'white' },
                      { label: '✗ Yanlış (0)', val: 0, bg: '#ef4444', color: 'white' },
                      { label: '○ Boş', val: 'empty', bg: '#64748b', color: 'white' }
                    ].map((btn) => {
                      const isSelected = String(currentScore) === String(btn.val);
                      return (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => setQuestionScores(prev => ({ ...prev, [qNo]: btn.val }))}
                          style={{
                            padding: '0.45rem 0.95rem',
                            borderRadius: '0.6rem',
                            border: isSelected ? `2px solid ${btn.bg}` : '1.5px solid var(--color-border)',
                            background: isSelected ? btn.bg : 'var(--color-surface-hover)',
                            color: isSelected ? btn.color : 'var(--color-text)',
                            fontWeight: 900,
                            fontSize: '0.82rem',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
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
                          width: '70px',
                          padding: '0.45rem 0.5rem',
                          borderRadius: '0.6rem',
                          border: '2px solid var(--color-border-input)',
                          fontSize: '0.85rem',
                          fontWeight: 900,
                          textAlign: 'center',
                          outline: 'none',
                          background: 'var(--color-surface)'
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>/ 10</span>
                    </div>
                  </div>
                </div>

                {/* 💬 ÖĞRETMEN NOTU & GERİ BİLDİRİM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>
                    💬 Bu Soru İçin Öğretmen Notu & Geri Bildirimi:
                  </span>
                  <input
                    type="text"
                    placeholder="Örn: Çözüm yolun doğru ama işlem sırasına dikkat etmelisin..."
                    value={currentNote}
                    onChange={(e) => setTeacherNotes(prev => ({ ...prev, [qNo]: e.target.value }))}
                    style={{
                      padding: '0.65rem 1rem',
                      borderRadius: '0.75rem',
                      border: '1.5px solid var(--color-border-input)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      width: '100%'
                    }}
                  />

                  {/* Preset Feedback Tags */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['⭐ Harika Çözüm!', '⚠️ İşlem Hatası Var', '💡 Çözüm Yolu Doğru', '🧠 Eksik Adım Bırakılmış', '📖 Tanım / Formül Unutulmuş'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTeacherNotes(prev => ({ ...prev, [qNo]: tag }))}
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: 6,
                          background: 'var(--color-surface-hover)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.72rem',
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

        {/* ── 4. PAGINATION CONTROLS (ÖNCEKİ / SONRAKİ BUTONLARI) ── */}
        {oeList.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.75rem 0'
          }}>
            <button
              type="button"
              disabled={safeActiveIndex === 0}
              onClick={() => setActiveOeIndex(prev => Math.max(0, prev - 1))}
              style={{
                padding: '0.75rem 1.4rem',
                borderRadius: '0.85rem',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: safeActiveIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: safeActiveIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: safeActiveIndex === 0 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={18} /> Önceki Soru
            </button>

            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>
              Soru {safeActiveIndex + 1} / {oeList.length}
            </span>

            {safeActiveIndex < oeList.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveOeIndex(prev => Math.min(oeList.length - 1, prev + 1))}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '0.85rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.88rem',
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
                  padding: '0.75rem 1.6rem',
                  borderRadius: '0.85rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.88rem',
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

        {/* ── 5. OVERALL GENERAL TEACHER FEEDBACK ── */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={16} color="#4f46e5" />
            Öğrenciye Genel Sınav Değerlendirmesi ve Tavsiyesi:
          </span>
          <textarea
            rows={3}
            placeholder="Öğrencinin bu sınavdaki genel performansını özetleyen bir mesaj yazın..."
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              border: '1.5px solid var(--color-border-input)',
              fontSize: '0.85rem',
              outline: 'none',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              lineHeight: 1.5
            }}
          />
        </div>

        {/* ── 6. AUTO-GRADED MULTIPLE CHOICE SUMMARY (IF MIXED TEST) ── */}
        {mcList.length > 0 && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#10b981" />
                Otomatik Değerlendirilen Çoktan Seçmeli Sorular ({mcCorrect}/{mcCount} Doğru)
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                Otomatik Puanlandı
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.45rem', marginTop: 2 }}>
              {mcList.map(m => {
                const isCorrect = m.answer?.isCorrect === true;
                const isWrong = m.answer?.isCorrect === false;
                return (
                  <div key={m.qNo} style={{
                    padding: '0.45rem 0.65rem',
                    borderRadius: '0.55rem',
                    background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : isWrong ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-hover)',
                    border: `1px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--color-border)'}`,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>Soru {m.qNo}</span>
                    <span style={{ color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : '#64748b' }}>
                      {isCorrect ? '✓ Doğru' : isWrong ? '✗ Yanlış' : '○ Boş'}
                    </span>
                  </div>
                );
              })}
            </div>
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
