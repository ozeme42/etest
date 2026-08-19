import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, Clock3, Eye, Save, ArrowLeft,
  ClipboardList, Users, BookOpen, Star, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  AlertCircle, Search, Filter, Layers, MessageSquare, Award,
  Sparkles, Check, Edit3, Send, FileText, Globe, Image as ImageIcon,
  RotateCcw, Trophy, ThumbsUp, ThumbsDown, CheckCircle, HelpCircle,
  ClipboardCheck, Ruler, TestTube2, BookCopy, Zap, Plus, Minus, Maximize2,
  Trash2, ExternalLink, RefreshCw, Layout, CheckCheck
} from 'lucide-react';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import MultiHomeworkRunner, { resolveExactQuestionCount } from '../components/quiz/runner/MultiHomeworkRunner';
import ImageLightbox, { isValidImageUrl } from '../components/quiz/common/ImageLightbox';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';

import { resolveTestQuestions } from '../utils/testResolver';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';

// ─── SUBJECT HELPER & THEMES ──────────────────────────────────────────────────
function detectSubject(title = '', existingSubject = '') {
  if (existingSubject && !['genel', 'diğer', 'all', ''].includes(String(existingSubject).toLowerCase().trim())) {
    return existingSubject;
  }
  const t = (String(title) + ' ' + String(existingSubject || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak') || t.includes('ilmihal') || t.includes('fıkıh') || t.includes('siyer') || t.includes('kuran')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('lgs') || t.includes('tarama')) return 'Genel Deneme';
  return 'Genel Testler';
}

const subjectThemes = {
  'Matematik': { bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)', icon: '📐' },
  'Fen Bilimleri': { bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)', icon: '🔬' },
  'Türkçe': { bg: 'rgba(236, 72, 153, 0.14)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.3)', icon: '📚' },
  'Sosyal Bilgiler': { bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)', icon: '🌍' },
  'İngilizce': { bg: 'rgba(244, 63, 94, 0.14)', color: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)', icon: '🇬🇧' },
  'Din Kültürü': { bg: 'rgba(20, 184, 166, 0.14)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)', icon: '🌙' },
  'Genel Deneme': { bg: 'rgba(99, 102, 241, 0.14)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)', icon: '🏛️' },
  'Genel Testler': { bg: 'rgba(100, 116, 139, 0.14)', color: '#64748b', border: 'rgba(100, 116, 139, 0.3)', icon: '📝' }
};

const QUICK_FEEDBACK_PRESETS = [
  '👏 Çözüm yöntemi ve açıklama harika, tam puan!',
  '💡 Çözüm doğru ancak işlem adımlarına ve formüle dikkat edilmeli.',
  '✍️ Açıklama biraz eksik kalmış, gerekçelendirme yapılmalı.',
  '⚠️ Yanlış kavram kullanılmış, konuyu tekrar gözden geçirmelisin.',
  '🌟 Gayet başarılı bir çalışma, tebrikler!'
];

function isItemOpenEnded(item, ans) {
  if (ans?.userAnswerText && String(ans.userAnswerText).trim().length > 0) return true;
  if (!item) return false;
  if (item.isOpenEnded === true || item.openEnded === true) return true;
  const qType = String(item.questionType || item.type || item.contentType || item.formatType || '').toLowerCase();
  if (['acik_uclu', 'yazili', 'gorsel_klasik'].includes(qType)) return true;
  const title = String(item.title || item.name || item.questionText || item.text || '').toLowerCase();
  if (title.includes('açık uçlu') || title.includes('acik uclu') || title.includes('yazılı') || title.includes('yazili') || title.includes('klasik')) return true;
  if (Array.isArray(item.options) && item.options.length > 0 && !item.isOpenEnded) return false;
  return false;
}

function isValidPayloadString(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  if (s.length === 0) return false;
  if (s === '[STORED_IN_INDEXEDDB]' || s === '[LOCALSTORAGE_CACHE]') return false;
  return true;
}

function getExpandedIds(rawIds = []) {
  const expanded = new Set();
  rawIds.filter(Boolean).forEach(id => {
    const str = typeof id === 'object' ? String(id.id || id.questionId || '') : String(id);
    if (!str) return;
    const clean = str.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
    expanded.add(str);
    if (clean) {
      expanded.add(clean);
      expanded.add(`q_${clean}`);
      expanded.add(`hw_${clean}`);
      expanded.add(`test_${clean}`);
    }
  });
  return Array.from(expanded);
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── PRO EVALUATION STUDIO MODAL ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ProEvaluationStudio({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [studioMode, setStudioMode] = useState('split');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [questionScores, setQuestionScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const targetId = String(submission?.testId || submission?.homeworkId || submission?.hwId || submission?.questionId || submission?.id || '');
  const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

  useEffect(() => {
    let isMounted = true;

    async function loadTestData() {
      setLoading(true);

      let foundHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission.id)))
      );

      const hwQIds = [
        ...(Array.isArray(foundHw?.questionIds) ? foundHw.questionIds : []),
        ...(Array.isArray(foundHw?.tests) ? foundHw.tests : []),
        ...(Array.isArray(foundHw?.selectedQuestions) ? foundHw.selectedQuestions : []),
        ...(Array.isArray(foundHw?.sections) ? foundHw.sections : []),
        ...(Array.isArray(submission?.questionIds) ? submission.questionIds : []),
        ...(Array.isArray(submission?.tests) ? submission.tests : []),
        ...(Array.isArray(submission?.sections) ? submission.sections : [])
      ].map(x => typeof x === 'object' ? (x.id || x.questionId) : x).filter(Boolean);

      let foundBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId) ||
        hwQIds.some(qid => String(q.id) === String(qid) || String(q.id).replace(/^q_?/, '') === String(qid).replace(/^q_?/, ''))
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

      let resolved = (foundHw && foundBankQ)
        ? {
            ...foundBankQ,
            ...foundHw,
            contentPayload: foundBankQ.contentPayload || foundHw.contentPayload,
            htmlPayload: foundBankQ.htmlPayload || foundHw.htmlPayload,
            pdfPayload: foundBankQ.pdfPayload || foundHw.pdfPayload,
            imageUrl: foundBankQ.imageUrl || foundHw.imageUrl,
            imageUrls: (foundBankQ.imageUrls?.length ? foundBankQ.imageUrls : foundHw.imageUrls)
          }
        : (foundBankQ || foundHw || titleMatchBankQ || foundBookTest || foundCurTest || null);

      let contentPayload = isValidPayloadString(submission.contentPayload) ? submission.contentPayload : (isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null);
      let pdfPayload = isValidPayloadString(submission.pdfPayload) ? submission.pdfPayload : (isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null);
      let htmlPayload = isValidPayloadString(submission.htmlPayload) ? submission.htmlPayload : (isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null);

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const candidateIds = getExpandedIds([
          targetId, normTargetId, submission.id, submission.testId,
          submission.homeworkId, submission.questionId, resolved?.id,
          resolved?.questionId, resolved?.testId, foundHw?.id,
          foundHw?.questionId, foundBankQ?.id, titleMatchBankQ?.id,
          ...hwQIds
        ]);

        for (const cid of candidateIds) {
          try {
            const val = await idbGetPayload(cid);
            if (isValidPayloadString(val)) {
              contentPayload = val;
              if (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF')) {
                pdfPayload = val;
              } else if (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html') || val.includes('<body') || val.includes('<div') || val.includes('<p')) {
                htmlPayload = val;
              }
              break;
            }
          } catch (e) {}
        }
      }

      if (contentPayload && !pdfPayload && (contentPayload.startsWith('data:application/pdf') || contentPayload.includes('.pdf') || contentPayload.startsWith('%PDF'))) {
        pdfPayload = contentPayload;
      }
      if (contentPayload && !htmlPayload && (contentPayload.includes('<html') || contentPayload.startsWith('<!DOCTYPE') || contentPayload.startsWith('data:text/html') || contentPayload.includes('<body') || contentPayload.includes('<div') || contentPayload.includes('<p'))) {
        htmlPayload = contentPayload;
      }

      let sections = resolved?.sections || resolved?.tests || null;
      let generatedQuestions = [];

      if (Array.isArray(sections) && sections.length > 0) {
        const mappedSections = [];
        let runningQIndex = 0;

        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const secBankQ = (allBankQuestions || []).find(q => String(q.id) === String(secQId));
          let secPayload = isValidPayloadString(sec?.contentPayload) ? sec.contentPayload : (isValidPayloadString(secBankQ?.contentPayload) ? secBankQ.contentPayload : null);
          if (!secPayload) {
            secPayload = await idbGetPayload(secQId);
            if (!isValidPayloadString(secPayload)) secPayload = null;
          }

          const secResolvedQs = secBankQ ? resolveTestQuestions(secBankQ, allBankQuestions) : [];
          const secImages = (secBankQ?.imageUrls && Array.isArray(secBankQ.imageUrls)) ? secBankQ.imageUrls : [];
          const secCount = resolveExactQuestionCount(sec, secBankQ, secBankQ, secResolvedQs, secImages);

          const secPdf = (isValidPayloadString(secBankQ?.pdfPayload) ? secBankQ.pdfPayload : null) || (secPayload && (secPayload.startsWith('data:application/pdf') || secPayload.includes('.pdf')) ? secPayload : null) || pdfPayload;
          const secHtml = (isValidPayloadString(secBankQ?.htmlPayload) ? secBankQ.htmlPayload : null) || (secPayload && (secPayload.includes('<html') || secPayload.startsWith('<!DOCTYPE')) ? secPayload : null) || htmlPayload;
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
              imageUrls: secImages,
              isOpenEnded: isSecOE || isItemOpenEnded(existingQ),
              options: existingQ.options || ['A', 'B', 'C', 'D']
            });
          }

          mappedSections.push({
            id: secQId || `sec_${i}`,
            title: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
            bankQ: secBankQ ? { ...secBankQ, contentPayload: secPayload || secBankQ.contentPayload } : { id: secQId, title: sec?.title },
            questions: secResolvedQs,
            questionCount: secCount,
            contentPayload: secPayload,
            isOpenEnded: isSecOE
          });
        }
        sections = mappedSections;
      } else {
        const baseResolvedQs = resolveTestQuestions(resolved || submission, allBankQuestions);
        const ansList = Array.isArray(submission.answers) ? submission.answers : [];
        const baseImages = (resolved?.imageUrls && Array.isArray(resolved.imageUrls)) ? resolved.imageUrls : [];
        
        const exactCount = Math.max(
          resolveExactQuestionCount(resolved || {}, resolved || {}, resolved || {}, baseResolvedQs, baseImages),
          ansList.length,
          parseInt(submission.totalQuestions || resolved?.questionCount || 0, 10) || 0,
          1
        );

        const isSingleOE = isItemOpenEnded(resolved) || isItemOpenEnded(submission);

        for (let i = 0; i < exactCount; i++) {
          const existingQ = baseResolvedQs[i] || baseResolvedQs[0] || {};
          const ans = ansList[i] || {};
          const qImg = baseImages[i] || (baseImages.length === 1 ? baseImages[0] : null) || existingQ.imageUrl || (exactCount === 1 ? resolved?.imageUrl : null) || null;

          generatedQuestions.push({
            ...existingQ,
            id: existingQ.id ? `${existingQ.id}_q${i + 1}` : `q_${i + 1}`,
            globalIndex: i + 1,
            questionNo: i + 1,
            subIndex: i,
            sectionIndex: 0,
            sectionTitle: submission.testTitle || resolved?.title || 'Sınav',
            title: existingQ.title || existingQ.name || existingQ.questionText || `Soru ${i + 1}`,
            questionText: existingQ.questionText && exactCount === 1 ? existingQ.questionText : (existingQ.questionText || `Soru ${i + 1}`),
            pdfPayload: existingQ.pdfPayload || pdfPayload,
            htmlPayload: existingQ.htmlPayload || htmlPayload,
            imageUrl: qImg,
            imageUrls: baseImages,
            isOpenEnded: isSingleOE || isItemOpenEnded(existingQ, ans),
            options: existingQ.options || ['A', 'B', 'C', 'D']
          });
        }
      }

      const finalTestObj = {
        ...(resolved || {}),
        id: targetId,
        title: submission.testTitle || resolved?.title || resolved?.name || 'Sınav İncelemesi',
        contentType: submission.contentType || resolved?.contentType || (pdfPayload ? 'pdf' : (htmlPayload ? 'html' : 'standard')),
        sourceFormat: submission.sourceFormat || resolved?.sourceFormat || 'standard',
        contentPayload,
        pdfPayload,
        htmlPayload,
        imageUrl: submission.imageUrl || resolved?.imageUrl || null,
        imageUrls: submission.imageUrls || resolved?.imageUrls || [],
        sections,
        questionCount: generatedQuestions.length || 1
      };

      if (isMounted) {
        setTest(finalTestObj);
        setQuestions(generatedQuestions);

        const scores = {};
        const notes = {};
        const qCount = Math.max(1, generatedQuestions.length);
        for (let i = 1; i <= qCount; i++) {
          const ans = (submission.answers || [])[i - 1];
          if (ans) {
            scores[i] = ans.score !== undefined ? Number(ans.score) : (ans.isCorrect === true ? 10 : 0);
            notes[i] = ans.teacherNote || '';
          } else {
            scores[i] = 0;
            notes[i] = '';
          }
        }

        setQuestionScores(scores);
        setTeacherNotes(notes);
        setOverallFeedback(submission.teacherFeedback || submission.teacherNote || '');
        setLoading(false);
      }
    }

    loadTestData();
    return () => { isMounted = false; };
  }, [submission, targetId, normTargetId, allBankQuestions, homeworks, curriculumData, bookTests]);

  const globalMedia = useMemo(() => {
    const isPdfStr = (val) => isValidPayloadString(val) && (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF'));
    const isHtmlStr = (val) => isValidPayloadString(val) && (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html') || val.includes('<body') || val.includes('<p') || val.includes('<div') || val.includes('<h') || val.length > 50);

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
      else if (test?.htmlUrl || test?.url) htmlSrc = test.htmlUrl || test.url;
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
    const items = [];
    const oeList = [];
    const mcList = [];

    for (let i = 1; i <= totalQ; i++) {
      const qObj = questions[i - 1] || {};
      const ans = (submission?.answers || [])[i - 1] || {};
      const isOE = isItemOpenEnded(qObj, ans);

      const qImg = qObj.imageUrl || ans.imageUrl || (qObj.imageUrls && qObj.imageUrls[0]) || (test?.imageUrls && test?.imageUrls[i - 1]) || null;

      const itemInfo = {
        qNo: i,
        index: i - 1,
        question: qObj,
        answer: ans,
        isOE,
        imageUrl: isValidImageUrl(qImg) ? qImg : null,
        title: qObj.title || `Soru ${i}`,
        sectionTitle: qObj.sectionTitle || test?.title || null
      };

      items.push(itemInfo);
      if (isOE) oeList.push(itemInfo);
      else mcList.push(itemInfo);
    }

    return { items, oeList, mcList, totalQ };
  }, [questions, submission, test]);

  const scoreStats = useMemo(() => {
    const { items, totalQ } = categorizedQuestions;

    let totalEarned = 0;
    let maxPossible = totalQ * 10;
    let gradedCount = 0;

    items.forEach(it => {
      const s = questionScores[it.qNo] ?? (it.answer?.score !== undefined ? Number(it.answer.score) : (it.answer?.isCorrect === true ? 10 : 0));
      totalEarned += Math.max(0, Math.min(10, s));
      if (questionScores[it.qNo] !== undefined || it.answer?.score !== undefined || it.answer?.isCorrect !== undefined) {
        gradedCount++;
      }
    });

    const percentage = maxPossible > 0 ? Math.min(100, Math.round((totalEarned / maxPossible) * 100)) : 0;

    let gradeLetter = 'Geliştirilmeli 💡';
    let gradeColor = '#ef4444';
    if (percentage >= 85) { gradeLetter = 'Pekiyi 🌟'; gradeColor = '#10b981'; }
    else if (percentage >= 70) { gradeLetter = 'İyi 👏'; gradeColor = '#3b82f6'; }
    else if (percentage >= 50) { gradeLetter = 'Orta ⚖️'; gradeColor = '#f59e0b'; }

    return {
      totalEarned,
      maxPossible,
      percentage,
      gradedCount,
      totalQ,
      gradeLetter,
      gradeColor
    };
  }, [categorizedQuestions, questionScores]);

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);

    try {
      const { totalQ } = categorizedQuestions;
      const { percentage, totalEarned, maxPossible } = scoreStats;

      const updatedAnswers = (submission.answers || []).map((ans, idx) => {
        const qNo = ans.questionNo || (idx + 1);
        const score = questionScores[qNo] ?? (ans.isCorrect === true ? 10 : 0);
        const note = teacherNotes[qNo] || '';
        return {
          ...ans,
          score,
          isCorrect: score >= 5,
          teacherNote: note,
          evaluatedAt: new Date().toISOString()
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        score: percentage,
        rawScore: totalEarned,
        maxScore: maxPossible,
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: 'white', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Sınav Dokümanı ve Sorular Yükleniyor...</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>PDF, HTML ve soru bankası verileri çözümleniyor</p>
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
  const isPdf = Boolean(test.pdfPayload || test.pdfUrl || test.contentType === 'pdf' || globalMedia.hasPdf);
  const isHtml = Boolean(test.htmlPayload || test.contentType === 'html' || globalMedia.hasHtml);
  const isImageTest = !isHtml && !isPdf && Boolean(test.contentType === 'gorsel' || (test.imageUrls && test.imageUrls.length > 0) || test.imageUrl);

  const activeQuestionItem = categorizedQuestions.items[activeQuestionIndex] || categorizedQuestions.items[0];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'var(--color-bg, #0f172a)',
      color: 'var(--color-text, #f8fafc)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Soru Görseli" onClose={() => setLightboxSrc(null)} />
      )}

      {/* ── TOP STUDIO NAVBAR ── */}
      <header style={{
        background: 'var(--color-surface, #1e293b)',
        borderBottom: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        zIndex: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'var(--color-surface-hover, rgba(255,255,255,0.06))',
              border: '1.5px solid var(--color-border, rgba(255,255,255,0.12))',
              borderRadius: '0.75rem', padding: '0.5rem 0.9rem',
              color: 'inherit', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(59, 130, 246, 0.16)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                padding: '0.2rem 0.65rem',
                borderRadius: 99,
                fontWeight: 900,
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                🎓 {submission.studentName || 'Öğrenci'}
              </span>
              <span style={{
                fontWeight: 800,
                fontSize: '0.92rem',
                color: 'var(--color-text, #ffffff)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '380px'
              }}>
                {submission.testTitle || test.title}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>
              {isPdf ? '📄 PDF Doküman Sınavı' : isHtml ? '🌐 HTML İnteraktif Sınavı' : isImageTest ? '🖼️ Görsel Soru Sınavı' : '📝 Dijital Soru Bankası'} • Toplam {categorizedQuestions.totalQ} Soru
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          background: 'var(--color-surface-hover, rgba(255,255,255,0.06))',
          padding: '0.25rem',
          borderRadius: '0.85rem',
          border: '1.5px solid var(--color-border, rgba(255,255,255,0.1))'
        }}>
          <button
            type="button"
            onClick={() => setStudioMode('split')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: studioMode === 'split' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
              color: studioMode === 'split' ? '#ffffff' : 'var(--color-text-muted, #94a3b8)',
              fontWeight: 900,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Layout size={14} /> Bölünmüş Stüdyo
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('student_review')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: studioMode === 'student_review' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent',
              color: studioMode === 'student_review' ? '#ffffff' : 'var(--color-text-muted, #94a3b8)',
              fontWeight: 900,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Eye size={14} /> Öğrenci İnceleme Ekranı
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'var(--color-surface-hover, rgba(255,255,255,0.06))',
            border: '1.5px solid var(--color-border, rgba(255,255,255,0.12))',
            borderRadius: '0.85rem',
            padding: '0.35rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: scoreStats.gradeColor, lineHeight: 1 }}>
                %{scoreStats.percentage}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted, #94a3b8)', marginTop: 2 }}>
                {scoreStats.totalEarned} / {scoreStats.maxPossible} Puan
              </div>
            </div>
            <span style={{
              background: `${scoreStats.gradeColor}22`,
              color: scoreStats.gradeColor,
              border: `1px solid ${scoreStats.gradeColor}44`,
              padding: '0.2rem 0.55rem',
              borderRadius: 8,
              fontWeight: 900,
              fontSize: '0.72rem'
            }}>
              {scoreStats.gradeLetter}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '0.85rem',
              padding: '0.65rem 1.35rem',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 6px 20px rgba(16,185,129,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet ✓'}
          </button>
        </div>
      </header>

      {/* ── STUDIO WORKSPACE BODY ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {studioMode === 'student_review' ? (
          <div style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
            {isMultiSection ? (
              <MultiHomeworkRunner test={test} questions={questions} isReviewMode={true} userAnswers={submission} onSubmit={onClose} />
            ) : isPdf ? (
              <PdfQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />
            ) : isHtml ? (
              <HtmlQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />
            ) : isImageTest ? (
              <ImageQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />
            ) : (
              <StandardQuizReview submission={submission} test={test} questions={questions} onClose={onClose} />
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            
            {/* ── LEFT PANEL: DOCUMENT & QUESTION VIEWER ── */}
            <div style={{
              borderRight: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              background: 'var(--color-surface, #1e293b)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '0.65rem 1rem',
                borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                background: 'var(--color-surface-hover, rgba(255,255,255,0.03))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2, maxWidth: '100%' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text-muted, #94a3b8)', textTransform: 'uppercase', marginRight: 4 }}>
                    Sorular:
                  </span>
                  {categorizedQuestions.items.map((it, idx) => {
                    const isSel = idx === activeQuestionIndex;
                    const qScore = questionScores[it.qNo] ?? (it.answer?.score !== undefined ? Number(it.answer.score) : (it.answer?.isCorrect === true ? 10 : 0));
                    const isFull = qScore === 10;
                    const isZero = qScore === 0;
                    const isHalf = qScore > 0 && qScore < 10;

                    return (
                      <button
                        key={it.qNo}
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: isSel ? '2px solid #3b82f6' : '1px solid var(--color-border, rgba(255,255,255,0.12))',
                          background: isSel
                            ? '#3b82f6'
                            : (isFull ? 'rgba(16,185,129,0.18)' : isHalf ? 'rgba(245,158,11,0.18)' : isZero ? 'rgba(239,68,68,0.18)' : 'var(--color-surface, rgba(255,255,255,0.06))'),
                          color: isSel
                            ? '#ffffff'
                            : (isFull ? '#34d399' : isHalf ? '#fbbf24' : isZero ? '#f87171' : 'inherit'),
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Soru ${it.qNo} (${qScore} Puan)`}
                      >
                        {it.qNo}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, position: 'relative', overflowY: 'auto', background: '#0b1120' }}>
                {globalMedia.hasPdf ? (
                  <PdfViewerWithControls payload={globalMedia.pdfSrc} src={globalMedia.pdfSrc} title={test.title} height="100%" />
                ) : globalMedia.hasHtml ? (
                  <HtmlViewerWithControls payload={globalMedia.htmlSrc} htmlContent={globalMedia.htmlSrc} title={test.title} height="100%" />
                ) : activeQuestionItem?.imageUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '1.5rem' }}>
                    <div style={{ background: 'var(--color-surface, #1e293b)', borderRadius: '1rem', padding: '1rem', border: '1.5px solid var(--color-border, rgba(255,255,255,0.1))', maxWidth: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 800, color: '#a855f7' }}>
                        <span>🖼️ Soru {activeQuestionItem.qNo} Görseli</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>🔍 Büyütmek için üzerine tıklayın</span>
                      </div>
                      <img
                        src={activeQuestionItem.imageUrl}
                        alt={`Soru ${activeQuestionItem.qNo}`}
                        style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '0.5rem', cursor: 'zoom-in', display: 'block' }}
                        onClick={() => setLightboxSrc(activeQuestionItem.imageUrl)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 720, margin: '0 auto' }}>
                    <div style={{ background: 'var(--color-surface, #1e293b)', borderRadius: '1rem', padding: '1.5rem', border: '1.5px solid var(--color-border, rgba(255,255,255,0.1))', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '0.25rem 0.75rem', borderRadius: 8, fontWeight: 900, fontSize: '0.85rem' }}>
                          Soru {activeQuestionItem?.qNo}
                        </span>
                        {activeQuestionItem?.sectionTitle && (
                          <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.8rem', fontWeight: 700 }}>
                            {activeQuestionItem.sectionTitle}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '1rem', lineHeight: 1.7, fontWeight: 600, color: 'var(--color-text, #ffffff)', marginBottom: '1.25rem' }}>
                        {activeQuestionItem?.question?.questionText || activeQuestionItem?.question?.title || `Soru ${activeQuestionItem?.qNo}`}
                      </div>

                      {Array.isArray(activeQuestionItem?.question?.options) && activeQuestionItem.question.options.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {activeQuestionItem.question.options.map((opt, oIdx) => {
                            const optLetter = String.fromCharCode(65 + oIdx);
                            const optText = typeof opt === 'object' ? (opt.text || opt.label || '') : String(opt);
                            const isCorrectKey = activeQuestionItem.question.correctAnswer === optLetter || activeQuestionItem.question.correctAnswer === oIdx;

                            return (
                              <div
                                key={oIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.65rem 1rem',
                                  borderRadius: '0.65rem',
                                  background: isCorrectKey ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-hover, rgba(255,255,255,0.04))',
                                  border: `1.5px solid ${isCorrectKey ? 'rgba(16,185,129,0.4)' : 'var(--color-border, rgba(255,255,255,0.08))'}`
                                }}
                              >
                                <span style={{ fontWeight: 900, color: isCorrectKey ? '#34d399' : '#94a3b8', width: 24 }}>{optLetter})</span>
                                <span style={{ fontSize: '0.9rem', color: isCorrectKey ? '#34d399' : 'inherit' }}>{optText}</span>
                                {isCorrectKey && <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 900, color: '#34d399' }}>✓ Doğru Cevap</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT PANEL: STUDENT ANSWER & GRADING STATION ── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              background: 'var(--color-bg, #0f172a)',
              overflowY: 'auto',
              padding: '1.25rem',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface, #1e293b)', padding: '0.75rem 1rem', borderRadius: '1rem', border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={activeQuestionIndex === 0}
                    style={{
                      padding: '0.4rem 0.75rem', borderRadius: 8,
                      background: 'var(--color-surface-hover, rgba(255,255,255,0.06))',
                      border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                      color: 'inherit', fontWeight: 800, fontSize: '0.78rem',
                      cursor: activeQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                      opacity: activeQuestionIndex === 0 ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <ChevronLeft size={16} /> Önceki
                  </button>

                  <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#60a5fa' }}>
                    Soru {activeQuestionItem?.qNo} / {categorizedQuestions.totalQ}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex(prev => Math.min(categorizedQuestions.totalQ - 1, prev + 1))}
                    disabled={activeQuestionIndex === categorizedQuestions.totalQ - 1}
                    style={{
                      padding: '0.4rem 0.75rem', borderRadius: 8,
                      background: 'var(--color-surface-hover, rgba(255,255,255,0.06))',
                      border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                      color: 'inherit', fontWeight: 800, fontSize: '0.78rem',
                      cursor: activeQuestionIndex === categorizedQuestions.totalQ - 1 ? 'not-allowed' : 'pointer',
                      opacity: activeQuestionIndex === categorizedQuestions.totalQ - 1 ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    Sonraki <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{
                  background: activeQuestionItem?.isOE ? 'rgba(245,158,11,0.14)' : 'rgba(59,130,246,0.14)',
                  color: activeQuestionItem?.isOE ? '#fbbf24' : '#60a5fa',
                  border: `1px solid ${activeQuestionItem?.isOE ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
                  padding: '0.25rem 0.65rem',
                  borderRadius: 8,
                  fontWeight: 900,
                  fontSize: '0.75rem'
                }}>
                  {activeQuestionItem?.isOE ? '✍️ Açık Uçlu (Yazılı)' : '🔘 Çoktan Seçmeli'}
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface, #1e293b)',
                borderRadius: '1.25rem',
                padding: '1.25rem',
                border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}>
                {activeQuestionItem?.question?.questionText && activeQuestionItem.question.questionText !== `Soru ${activeQuestionItem.qNo}` && (
                  <div style={{ background: 'var(--color-surface-hover, rgba(255,255,255,0.04))', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border, rgba(255,255,255,0.08))', fontSize: '0.86rem', color: 'var(--color-text, #e2e8f0)', fontWeight: 600 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 800 }}>❓ Soru Metni: </span>
                    {activeQuestionItem.question.questionText}
                  </div>
                )}

                <div style={{
                  background: 'rgba(37,99,235,0.08)',
                  border: '1.5px solid rgba(59,130,246,0.3)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>📝 Öğrencinin Yanıtı:</span>
                    {activeQuestionItem?.answer?.userAnswer && (
                      <span style={{ background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: 6, fontWeight: 900 }}>
                        Şık: {String(activeQuestionItem.answer.userAnswer).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div style={{
                    fontSize: '0.96rem',
                    color: 'var(--color-text, #ffffff)',
                    fontWeight: 600,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    minHeight: '48px'
                  }}>
                    {activeQuestionItem?.answer?.userAnswerText || (activeQuestionItem?.answer?.userAnswer ? `Seçilen Seçenek: ${activeQuestionItem.answer.userAnswer}` : '(Öğrenci bu soruya yanıt vermedi - Boş)')}
                  </div>
                </div>

                <div style={{
                  background: 'var(--color-surface-hover, rgba(255,255,255,0.04))',
                  padding: '1rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#fbbf24' }}>
                      🎯 Soru {activeQuestionItem?.qNo} İçin Verilen Puan:
                    </span>
                    <span style={{
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      color: (questionScores[activeQuestionItem?.qNo] || 0) === 10 ? '#34d399' : ((questionScores[activeQuestionItem?.qNo] || 0) >= 5 ? '#fbbf24' : '#f87171')
                    }}>
                      {questionScores[activeQuestionItem?.qNo] ?? 0} / 10 Puan
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionItem?.qNo]: 10 }))}
                      style={{
                        flex: 1, minWidth: 100, padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                        border: (questionScores[activeQuestionItem?.qNo] === 10) ? '2px solid #16a34a' : '1px solid rgba(16,185,129,0.3)',
                        background: (questionScores[activeQuestionItem?.qNo] === 10) ? '#16a34a' : 'rgba(16,185,129,0.12)',
                        color: (questionScores[activeQuestionItem?.qNo] === 10) ? '#ffffff' : '#34d399',
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      ✓ Tam (10)
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionItem?.qNo]: 5 }))}
                      style={{
                        flex: 1, minWidth: 100, padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                        border: (questionScores[activeQuestionItem?.qNo] === 5) ? '2px solid #d97706' : '1px solid rgba(245,158,11,0.3)',
                        background: (questionScores[activeQuestionItem?.qNo] === 5) ? '#d97706' : 'rgba(245,158,11,0.12)',
                        color: (questionScores[activeQuestionItem?.qNo] === 5) ? '#ffffff' : '#fbbf24',
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      ½ Yarım (5)
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionItem?.qNo]: 0 }))}
                      style={{
                        flex: 1, minWidth: 80, padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                        border: (questionScores[activeQuestionItem?.qNo] === 0) ? '2px solid #dc2626' : '1px solid rgba(239,68,68,0.3)',
                        background: (questionScores[activeQuestionItem?.qNo] === 0) ? '#dc2626' : 'rgba(239,68,68,0.12)',
                        color: (questionScores[activeQuestionItem?.qNo] === 0) ? '#ffffff' : '#f87171',
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      ✕ 0
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface, #1e293b)', borderRadius: '0.65rem', border: '1.5px solid var(--color-border, rgba(255,255,255,0.15))', padding: '2px 4px' }}>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionItem?.qNo]: Math.max(0, (p[activeQuestionItem?.qNo] ?? 0) - 1) }))}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 900, minWidth: '24px', textAlign: 'center', fontSize: '0.88rem' }}>
                        {questionScores[activeQuestionItem?.qNo] ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionItem?.qNo]: Math.min(10, (p[activeQuestionItem?.qNo] ?? 0) + 1) }))}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {['👏 Harika Açıklama', '💡 İşlem Hatası Var', '✍️ Formül Eksik', '🌟 Mükemmel'].map((tag, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => setTeacherNotes(p => ({ ...p, [activeQuestionItem?.qNo]: tag }))}
                          style={{
                            background: 'var(--color-surface, rgba(255,255,255,0.06))',
                            border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                            color: 'var(--color-text-muted, #94a3b8)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder={`Soru ${activeQuestionItem?.qNo} için öğrenciye özel notunuz...`}
                      value={teacherNotes[activeQuestionItem?.qNo] || ''}
                      onChange={e => setTeacherNotes(p => ({ ...p, [activeQuestionItem?.qNo]: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '0.65rem',
                        background: 'var(--color-surface, #1e293b)',
                        border: '1.5px solid var(--color-border, rgba(255,255,255,0.12))',
                        color: 'inherit',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface, #1e293b)',
                borderRadius: '1.25rem',
                padding: '1.25rem',
                border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: 'auto'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  💬 Sınavın Geneli İçin Karne Mesajı:
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {QUICK_FEEDBACK_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setOverallFeedback(preset)}
                      style={{
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#a5b4fc',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 99,
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows="3"
                  placeholder="Öğrencinin bu sınavdaki genel performansı ve tavsiyeleriniz..."
                  value={overallFeedback}
                  onChange={e => setOverallFeedback(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    background: 'var(--color-surface-hover, rgba(255,255,255,0.04))',
                    border: '1.5px solid var(--color-border, rgba(255,255,255,0.12))',
                    color: 'inherit',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '0.85rem',
                    padding: '0.75rem 1.5rem',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: isSaving ? 'wait' : 'pointer',
                    boxShadow: '0 6px 20px rgba(16,185,129,0.3)',
                    marginTop: 4
                  }}
                >
                  <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Sonuçlandır ✓'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── MAIN EVALUATION MANAGER (DASHBOARD & LIST) ──────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function EvaluationManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions, deleteSubmission } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;

  const combinedSubmissions = useMemo(() => {
    const activeHws = (homeworks || []).filter(hw => hw && hw.id);
    const map = new Map();

    activeHws.forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        map.set(subKey, {
          ...sub,
          id: subKey,
          homeworkId: hw.id,
          hwId: hw.id,
          testId: hw.id,
          testTitle: hw.title,
          subject: hw.subject,
          totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
          submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
        });
      });

      (allSubmissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.id || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
        
        const matchesHw = String(hw.id) === targetId ||
          String(hw.id) === normTargetId ||
          String(hw.id) === String(sub.hwId) ||
          String(hw.id) === String(sub.homeworkId) ||
          (hw.submissions && hw.submissions.some(s => String(s.id) === String(sub.id)));

        if (matchesHw) {
          const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
          const existing = map.get(subKey);
          if (!existing || (sub.isEvaluatedByTeacher && !existing.isEvaluatedByTeacher) || new Date(sub.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
            map.set(subKey, {
              ...sub,
              id: subKey,
              homeworkId: hw.id,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              subject: hw.subject,
              totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
              submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
            });
          }
        }
      });
    });

    (allSubmissions || []).forEach(sub => {
      if (!sub || !sub.studentId) return;
      const subKey = String(sub.id || `sub_${Date.now()}`);
      if (!map.has(subKey)) {
        map.set(subKey, sub);
      }
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks]);

  const enrichedSubmissions = useMemo(() => {
    return combinedSubmissions.map(sub => {
      let studentName = sub.studentName;
      const sId = String(sub.studentId || sub.userId || sub.user_id || '');
      if (!studentName || studentName === 'Öğrenci' || !studentName.trim()) {
        const matchedUser = (users || []).find(u => String(u.id) === sId || String(u.studentId) === sId);
        if (matchedUser && matchedUser.name) {
          studentName = matchedUser.name;
        } else if (sId) {
          studentName = `Öğrenci (#${sId.slice(-4)})`;
        } else {
          studentName = 'Öğrenci';
        }
      }

      let targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.questionId || sub.id || '');
      let normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

      let matchedHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
      );

      let matchedBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId
      );

      let matchedBookTest = (bookTests || []).find(bt =>
        String(bt.id) === targetId ||
        String(bt.id) === normTargetId ||
        toUUID(bt.id) === targetId
      );

      let matchedCurTest = (curriculumData?.tests || []).find(t =>
        String(t.id) === targetId ||
        String(t.id) === normTargetId
      );

      let title = sub.testTitle || sub.homeworkTitle || sub.title;
      const isGeneric = !title || ['sınav', 'test', 'açık uçlu sınav kağıdı', 'değerlendirme dosyası', 'ödev', 'test sınavı'].includes(String(title).trim().toLowerCase());

      if (isGeneric) {
        if (matchedHw?.title) title = matchedHw.title;
        else if (matchedBankQ?.title || matchedBankQ?.questionText || matchedBankQ?.text) title = matchedBankQ.title || matchedBankQ.questionText || matchedBankQ.text;
        else if (matchedBookTest?.name || matchedBookTest?.title) title = matchedBookTest.name || matchedBookTest.title;
        else if (matchedCurTest?.title || matchedCurTest?.name) title = matchedCurTest.title || matchedCurTest.name;
        else title = 'Ödev / Sınav';
      }

      let subject = detectSubject(title, sub.subject || matchedHw?.subject || matchedBankQ?.subject || matchedCurTest?.subjectName);

      const ansList = Array.isArray(sub.answers) ? sub.answers : [];
      let totalQ = resolveExactQuestionCount(matchedHw || {}, matchedBankQ || {}, matchedBankQ || {}, [], matchedBankQ?.imageUrls || []);
      if (totalQ <= 1 && ansList.length > 1) totalQ = ansList.length;
      if (totalQ <= 1 && sub.totalQuestions) totalQ = sub.totalQuestions;

      let score = sub.score;
      if (score !== undefined && score !== null) {
        score = Number(score);
        if (score > 100) {
          const maxPossible = totalQ * 10;
          score = maxPossible > 0 ? Math.min(100, Math.round((score / maxPossible) * 100)) : 100;
        } else {
          score = Math.max(0, Math.min(100, Math.round(score)));
        }
      }

      const isAlreadyEvaluated = sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      let hasWrittenAnswers = false;
      let writtenCount = 0;
      if (Array.isArray(sub.answers)) {
        sub.answers.forEach(a => {
          if (a.userAnswerText && String(a.userAnswerText).trim().length > 0) {
            hasWrittenAnswers = true;
            writtenCount++;
          }
        });
      }

      const isExplicitOpenEnded = sub.isOpenEnded || sub.questionType === 'acik_uclu' || sub.questionType === 'yazili' || sub.contentType === 'acik_uclu' || sub.contentType === 'yazili';
      const titleLower = String(title).toLowerCase();
      const hasOEKeywords = titleLower.includes('açık uçlu') || titleLower.includes('acik uclu') || titleLower.includes('yazılı') || titleLower.includes('yazili');

      const isPending = !isAlreadyEvaluated && (hasWrittenAnswers || isExplicitOpenEnded || hasOEKeywords);

      const formatType = sub.pdfPayload || matchedBankQ?.pdfPayload || titleLower.includes('.pdf') ? 'pdf' : (sub.htmlPayload || matchedBankQ?.htmlPayload || titleLower.includes('.html') ? 'html' : (sub.imageUrls?.length || matchedBankQ?.imageUrls?.length ? 'image' : 'standard'));

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        totalQuestions: totalQ,
        score,
        isPending,
        isAlreadyEvaluated,
        writtenCount,
        formatType
      };
    });
  }, [combinedSubmissions, users, homeworks, allBankQuestions, bookTests, curriculumData]);

  const scopedSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (sub.status === 'draft' || sub.status === 'in_progress') return false;

      if (!isAdmin) {
        if (!teacherId) return false;
        if (sub.id && String(sub.id).startsWith('sub_sample')) return false;

        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

        const hwMatch = (homeworks || []).find(h =>
          String(h.id) === targetId ||
          String(h.id) === normTargetId ||
          String(h.testId) === targetId ||
          (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
        );

        const hwIsMine = hwMatch && (
          String(hwMatch.createdBy) === String(teacherId) ||
          String(hwMatch.teacherId) === String(teacherId) ||
          String(hwMatch.assignedBy) === String(teacherId)
        );

        const subIsMine =
          String(sub.createdBy) === String(teacherId) ||
          String(sub.teacherId) === String(teacherId) ||
          String(sub.assignedBy) === String(teacherId);

        if (!hwIsMine && !subIsMine) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [enrichedSubmissions, homeworks, isAdmin, teacherId]);

  const pendingList = useMemo(() => scopedSubmissions.filter(s => s.isPending), [scopedSubmissions]);
  const completedList = useMemo(() => scopedSubmissions.filter(s => !s.isPending), [scopedSubmissions]);

  const stats = useMemo(() => {
    const scored = completedList.filter(s => s.score !== null && s.score !== undefined);
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((acc, s) => acc + s.score, 0) / scored.length) : 0;
    return {
      pending: pendingList.length,
      completed: completedList.length,
      total: scopedSubmissions.length,
      avgScore
    };
  }, [pendingList, completedList, scopedSubmissions]);

  const filteredSubmissions = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingList;
    else if (activeTab === 'completed') list = completedList;
    else list = scopedSubmissions;

    return list.filter(sub => {
      const sName = String(sub.studentName || '').toLowerCase();
      const tTitle = String(sub.testTitle || sub.title || '').toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || sName.includes(query) || tTitle.includes(query);

      const matchesSubject = subjectFilter === 'all' || (sub.subject && sub.subject === subjectFilter) || tTitle.includes(subjectFilter.toLowerCase());
      const matchesStudent = studentFilter === 'all' || String(sub.studentId) === String(studentFilter);
      const matchesFormat = formatFilter === 'all' || sub.formatType === formatFilter;

      return matchesSearch && matchesSubject && matchesStudent && matchesFormat;
    });
  }, [activeTab, pendingList, completedList, scopedSubmissions, search, subjectFilter, studentFilter, formatFilter]);

  const allSubjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü', 'Genel Deneme', 'Genel Testler'];
  const studentUsers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return 'Tarih Yok';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Tarih Yok';
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      if (diffMins < 5) return 'Az önce';
      if (diffMins < 60) return `${diffMins} dakika önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays === 1) return 'Dün';
      if (diffDays < 7) return `${diffDays} gün önce`;
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'var(--color-bg, #0f172a)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text, #f8fafc)',
      padding: '1.5rem 2rem 5rem 2rem',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>

      {activeSubmission && (
        <ProEvaluationStudio
          submission={activeSubmission}
          allBankQuestions={allBankQuestions}
          homeworks={homeworks}
          curriculumData={curriculumData}
          bookTests={bookTests}
          books={books}
          onClose={() => setActiveSubmission(null)}
          onSaveSuccess={() => setActiveSubmission(null)}
        />
      )}

      {/* ── TOP HEADER ── */}
      <header style={{
        background: 'var(--color-surface, #1e293b)',
        border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: 'var(--color-surface-hover, rgba(255,255,255,0.06))',
              border: '1.5px solid var(--color-border, rgba(255,255,255,0.12))',
              borderRadius: '0.85rem',
              padding: '0.6rem 1rem',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              fontSize: '0.84rem'
            }}
          >
            <ArrowLeft size={16} /> Panel
          </button>

          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
              <span>📋</span> Sınav & Ödev Değerlendirme Merkezi
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted, #94a3b8)' }}>
              Öğrenci yanıtlarını, açık uçlu çözümleri ve test dokümanlarını stüdyo ortamında değerlendirin
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            background: 'rgba(59,130,246,0.14)',
            color: '#60a5fa',
            border: '1px solid rgba(59,130,246,0.3)',
            padding: '0.35rem 0.85rem',
            borderRadius: 99,
            fontWeight: 900,
            fontSize: '0.78rem'
          }}>
            ⚡ Toplam {stats.total} Teslimat
          </span>
        </div>
      </header>

      {/* ── METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-surface, #1e293b)',
            border: `1.5px solid ${activeTab === 'pending' ? '#f59e0b' : 'var(--color-border, rgba(255,255,255,0.08))'}`,
            borderRadius: '1.25rem', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fbbf24' }}>⏳ Bekleyen Değerlendirmeler</span>
            <span style={{ fontSize: '1.4rem' }}>✍️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.5rem' }}>
            {stats.pending}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>Öğretmen notlaması bekleyen sınavlar</span>
        </div>

        <div
          onClick={() => setActiveTab('completed')}
          style={{
            background: activeTab === 'completed' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface, #1e293b)',
            border: `1.5px solid ${activeTab === 'completed' ? '#10b981' : 'var(--color-border, rgba(255,255,255,0.08))'}`,
            borderRadius: '1.25rem', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34d399' }}>✅ Tamamlanan & Notlandırılan</span>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', marginTop: '0.5rem' }}>
            {stats.completed}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>Notlandırılmış ve karnesi hazır olanlar</span>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          style={{
            background: activeTab === 'all' ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-surface, #1e293b)',
            border: `1.5px solid ${activeTab === 'all' ? '#3b82f6' : 'var(--color-border, rgba(255,255,255,0.08))'}`,
            borderRadius: '1.25rem', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60a5fa' }}>📊 Toplam Teslimat</span>
            <span style={{ fontSize: '1.4rem' }}>📁</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#60a5fa', marginTop: '0.5rem' }}>
            {stats.total}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>Öğrencilerin çözdüğü tüm sınavlar</span>
        </div>

        <div style={{
          background: 'var(--color-surface, #1e293b)',
          border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
          borderRadius: '1.25rem', padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a855f7' }}>🎯 Ortalama Başarı</span>
            <span style={{ fontSize: '1.4rem' }}>🌟</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a855f7', marginTop: '0.5rem' }}>
            %{stats.avgScore}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>Değerlendirilen sınav puan ortalaması</span>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div style={{
        background: 'var(--color-surface, #1e293b)',
        border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
        borderRadius: '1.25rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', background: 'var(--color-surface-hover, rgba(255,255,255,0.04))', padding: '0.25rem', borderRadius: '0.85rem', border: '1px solid var(--color-border, rgba(255,255,255,0.08))' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', border: 'none',
              background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: activeTab === 'pending' ? '#ffffff' : 'var(--color-text-muted, #94a3b8)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            ⏳ Bekleyenler ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', border: 'none',
              background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'completed' ? '#ffffff' : 'var(--color-text-muted, #94a3b8)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            ✅ Tamamlananlar ({stats.completed})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', border: 'none',
              background: activeTab === 'all' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
              color: activeTab === 'all' ? '#ffffff' : 'var(--color-text-muted, #94a3b8)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            📁 Tümü ({stats.total})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px', maxWidth: '340px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted, #94a3b8)' }} />
            <input
              type="text"
              placeholder="Öğrenci veya sınav adı ile ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '0.75rem', background: 'var(--color-surface-hover, rgba(255,255,255,0.04))',
                border: '1.5px solid var(--color-border, rgba(255,255,255,0.1))',
                color: 'inherit', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '0.75rem',
              background: 'var(--color-surface-hover, rgba(255,255,255,0.04))',
              border: '1.5px solid var(--color-border, rgba(255,255,255,0.1))',
              color: 'inherit', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="all">📚 Tüm Dersler</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={studentFilter}
            onChange={e => setStudentFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '0.75rem',
              background: 'var(--color-surface-hover, rgba(255,255,255,0.04))',
              border: '1.5px solid var(--color-border, rgba(255,255,255,0.1))',
              color: 'inherit', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="all">🎓 Tüm Öğrenciler</option>
            {studentUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
        </div>
      </div>

      {/* ── SUBMISSIONS LIST / CARDS ── */}
      {filteredSubmissions.length === 0 ? (
        <div style={{
          background: 'var(--color-surface, #1e293b)',
          border: '1.5px solid var(--color-border, rgba(255,255,255,0.08))',
          borderRadius: '1.5rem',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: 'var(--color-text-muted, #94a3b8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <CheckCircle2 size={48} color="#10b981" />
          <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text, #ffffff)', fontSize: '1.2rem' }}>
            {activeTab === 'pending' ? 'Harika! Bekleyen Değerlendirme Yok' : 'Kayıt Bulunamadı'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', maxWidth: 450 }}>
            {activeTab === 'pending'
              ? 'Tüm açık uçlu ve notlandırma gerektiren öğrenci teslimleri başarıyla sonuçlandırılmıştır.'
              : 'Seçili filtrelere uygun sınav veya ödev teslimatı bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredSubmissions.map(sub => {
            const theme = subjectThemes[sub.subject] || subjectThemes['Genel Testler'];

            return (
              <div
                key={sub.id}
                style={{
                  background: 'var(--color-surface, #1e293b)',
                  border: `1.5px solid ${sub.isPending ? 'rgba(245,158,11,0.35)' : 'var(--color-border, rgba(255,255,255,0.08))'}`,
                  borderRadius: '1.25rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: sub.isPending ? '0 4px 20px rgba(245,158,11,0.06)' : '0 4px 16px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      color: 'white', fontWeight: 900, fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {(sub.studentName || 'Ö')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text, #ffffff)' }}>
                        {sub.studentName || 'Öğrenci'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                        {formatRelativeDate(sub.submittedAt)}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    background: sub.isPending ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: sub.isPending ? '#fbbf24' : '#34d399',
                    border: `1px solid ${sub.isPending ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'}`,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 99,
                    fontWeight: 900,
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {sub.isPending ? '⏳ Değerlendirme Bekliyor' : '✅ Değerlendirildi'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--color-text, #ffffff)', lineHeight: 1.4 }}>
                    {sub.testTitle}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <span style={{
                      background: theme.bg, color: theme.color,
                      border: `1px solid ${theme.border}`,
                      padding: '0.15rem 0.55rem', borderRadius: 6,
                      fontWeight: 800, fontSize: '0.72rem'
                    }}>
                      {theme.icon} {sub.subject}
                    </span>
                    <span style={{ background: 'var(--color-surface-hover, rgba(255,255,255,0.06))', color: 'var(--color-text-muted, #94a3b8)', padding: '0.15rem 0.55rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, border: '1px solid var(--color-border, rgba(255,255,255,0.08))' }}>
                      {sub.totalQuestions} Soru
                    </span>
                    {sub.writtenCount > 0 && (
                      <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '0.15rem 0.55rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, border: '1px solid rgba(245,158,11,0.3)' }}>
                        ✍️ {sub.writtenCount} Yazılı Cevap
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border, rgba(255,255,255,0.08))', paddingTop: '0.75rem', marginTop: 'auto' }}>
                  <div>
                    {sub.score !== null && sub.score !== undefined ? (
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: sub.score >= 70 ? '#34d399' : (sub.score >= 50 ? '#fbbf24' : '#f87171') }}>
                        %{sub.score} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted, #94a3b8)' }}>Puan</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 800 }}>
                        Puanlanmadı
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubmission(sub)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: sub.isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      borderRadius: '0.75rem',
                      padding: '0.5rem 1.1rem',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: sub.isPending ? '0 4px 14px rgba(245,158,11,0.3)' : '0 4px 14px rgba(59,130,246,0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {sub.isPending ? <><Edit3 size={14} /> Değerlendir & Puanla</> : <><Eye size={14} /> İncele & Düzenle</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
