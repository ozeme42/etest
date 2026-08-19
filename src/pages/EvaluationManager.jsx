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
  ClipboardCheck, Ruler, TestTube2, BookCopy, Zap, Plus, Minus, Maximize2
} from 'lucide-react';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';
import MultiHomeworkRunner, { resolveExactQuestionCount } from '../components/quiz/runner/MultiHomeworkRunner';
import ImageLightbox, { StandardImageFrame } from '../components/quiz/common/ImageLightbox';
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
  'Matematik': { bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.35)', icon: '📐' },
  'Fen Bilimleri': { bg: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: 'rgba(52, 211, 153, 0.35)', icon: '🔬' },
  'Türkçe': { bg: 'rgba(244, 114, 182, 0.18)', color: '#f472b6', border: 'rgba(244, 114, 182, 0.35)', icon: '📚' },
  'Sosyal Bilgiler': { bg: 'rgba(192, 132, 252, 0.18)', color: '#c084fc', border: 'rgba(192, 132, 252, 0.35)', icon: '🌍' },
  'İngilizce': { bg: 'rgba(251, 113, 133, 0.18)', color: '#fb7185', border: 'rgba(251, 113, 133, 0.35)', icon: '🇬🇧' },
  'Din Kültürü': { bg: 'rgba(45, 212, 191, 0.18)', color: '#2dd4bf', border: 'rgba(45, 212, 191, 0.35)', icon: '🌙' },
  'Genel Deneme': { bg: 'rgba(99, 102, 241, 0.18)', color: '#a5b4fc', border: 'rgba(165, 180, 252, 0.35)', icon: '🏛️' },
  'Genel Testler': { bg: 'rgba(148, 163, 184, 0.18)', color: '#cbd5e1', border: 'rgba(203, 213, 225, 0.35)', icon: '📝' }
};

const QUICK_FEEDBACK_PRESETS = [
  '👏 Çözüm yöntemi ve açıklama harika, tam puan!',
  '💡 Çözüm doğru ancak işlem adımlarına dikkat edilmeli.',
  '✍️ Açıklama biraz eksik kalmış, formülü belirtmelisin.',
  '⚠️ Yanlış formül veya kavram kullanılmış, tekrar gözden geçir.',
  '🌟 Gayet başarılı, tebrikler!'
];

// Helper to determine if a question item is Open-Ended / Written
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

// Helper to validate whether a payload string is a valid non-placeholder string
function isValidPayloadString(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  if (s.length === 0) return false;
  if (s === '[STORED_IN_INDEXEDDB]' || s === '[LOCALSTORAGE_CACHE]') return false;
  return true;
}

// ─── SIMPLE & CLEAR EVALUATION MODAL (SADE VE AKILLI DEĞERLENDİRME EKRANI) ────
// ─── SIMPLE & CLEAR EVALUATION MODAL (SADE VE AKILLI DEĞERLENDİRME EKRANI) ────
function SmartEvaluationModal({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active section for multi-section exams
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Local Grading States: { [qNo]: { status: 'correct'|'wrong'|'blank'|'half'|'custom', isCorrect: boolean, isBlank: boolean, score: number } }
  const [questionEvals, setQuestionEvals] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Filter in question evaluation panel ('all' | 'oe' | 'pending')
  const [filterMode, setFilterMode] = useState('all');

  const targetId = String(submission.testId || submission.homeworkId || submission.questionId || submission.id || '');
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

      let contentPayload = isValidPayloadString(submission.contentPayload) ? submission.contentPayload : (isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null);
      let pdfPayload = isValidPayloadString(submission.pdfPayload) ? submission.pdfPayload : (isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null);
      let htmlPayload = isValidPayloadString(submission.htmlPayload) ? submission.htmlPayload : (isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null);

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const rawCandidateIds = [
          targetId, normTargetId, submission.id, submission.testId,
          submission.homeworkId, submission.questionId, resolved?.id,
          resolved?.questionId, resolved?.testId, foundHw?.id,
          foundHw?.questionId, foundBankQ?.id, titleMatchBankQ?.id
        ];

        const expandedIds = new Set();
        rawCandidateIds.filter(Boolean).forEach(id => {
          const str = String(id);
          const clean = str.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
          expandedIds.add(str);
          expandedIds.add(clean);
          expandedIds.add(`q_${clean}`);
          expandedIds.add(`hw_${clean}`);
          expandedIds.add(`test_${clean}`);
        });

        for (const cid of expandedIds) {
          try {
            const val = await idbGetPayload(cid);
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

      if (contentPayload && !pdfPayload && (contentPayload.startsWith('data:application/pdf') || contentPayload.includes('.pdf') || contentPayload.startsWith('%PDF'))) {
        pdfPayload = contentPayload;
      }
      if (contentPayload && !htmlPayload && (contentPayload.includes('<html') || contentPayload.startsWith('<!DOCTYPE') || contentPayload.startsWith('data:text/html'))) {
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
          const secHtml = (isValidPayloadString(secBankQ?.htmlPayload) ? secBankQ.htmlPayload : null) || (secPayload && secPayload.includes('<html') ? secPayload : null) || htmlPayload;
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
              options: existingQ.options || ['A', 'B', 'C', 'D'],
              answerKey: existingQ.answerKey || (secBankQ?.answerKey ? secBankQ.answerKey[qIdx] : null)
            });
          }

          mappedSections.push({
            id: secQId || `sec_${i}`,
            title: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
            bankQ: secBankQ ? { ...secBankQ, contentPayload: secPayload || secBankQ.contentPayload } : { id: secQId, title: sec?.title },
            questions: secResolvedQs,
            questionCount: secCount,
            contentPayload: secPayload,
            pdfPayload: secPdf,
            htmlPayload: secHtml,
            imageUrls: secImages,
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
            questionText: existingQ.questionText && exactCount === 1 ? existingQ.questionText : `Soru ${i + 1}`,
            pdfPayload: existingQ.pdfPayload || pdfPayload,
            htmlPayload: existingQ.htmlPayload || htmlPayload,
            imageUrl: qImg,
            imageUrls: baseImages,
            isOpenEnded: isSingleOE || isItemOpenEnded(existingQ, ans),
            options: existingQ.options || ['A', 'B', 'C', 'D'],
            answerKey: existingQ.answerKey || (resolved?.answerKey ? resolved.answerKey[i] : null)
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

        const evals = {};
        const notes = {};
        const qCount = Math.max(1, generatedQuestions.length);
        for (let i = 1; i <= qCount; i++) {
          const ans = (submission.answers || []).find(a => (a.questionNo || i) === i) || (submission.answers || [])[i - 1];
          const qObj = generatedQuestions[i - 1] || {};
          const isOE = isItemOpenEnded(qObj, ans);

          if (ans) {
            notes[i] = ans.teacherNote || '';
            if (ans.isCorrect === true) {
              evals[i] = {
                status: 'correct',
                isCorrect: true,
                isBlank: false,
                score: ans.score !== undefined ? Number(ans.score) : 10
              };
            } else if (ans.isCorrect === false) {
              const isB = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
              if (isB && !isOE) {
                evals[i] = {
                  status: 'blank',
                  isCorrect: false,
                  isBlank: true,
                  score: 0
                };
              } else {
                evals[i] = {
                  status: 'wrong',
                  isCorrect: false,
                  isBlank: false,
                  score: 0
                };
              }
            } else {
              if (ans.score !== undefined && ans.score !== null) {
                const s = Number(ans.score);
                evals[i] = {
                  status: s >= 10 ? 'correct' : (s >= 5 ? 'half' : (s === 0 ? 'wrong' : 'custom')),
                  isCorrect: s >= 5,
                  isBlank: false,
                  score: s
                };
              } else {
                evals[i] = {
                  status: null,
                  isCorrect: null,
                  isBlank: false,
                  score: 0
                };
              }
            }
          } else {
            evals[i] = {
              status: null,
              isCorrect: null,
              isBlank: false,
              score: 0
            };
            notes[i] = '';
          }
        }

        setQuestionEvals(evals);
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
    const isHtmlStr = (val) => isValidPayloadString(val) && (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html'));

    let pdfSrc = null;
    if (isPdfStr(test?.pdfPayload)) pdfSrc = test.pdfPayload;
    else if (isPdfStr(test?.contentPayload)) pdfSrc = test.contentPayload;
    else if (test?.pdfUrl) pdfSrc = test.pdfUrl;

    let htmlSrc = null;
    if (!pdfSrc) {
      if (isHtmlStr(test?.htmlPayload)) htmlSrc = test.htmlPayload;
      else if (isHtmlStr(test?.contentPayload)) htmlSrc = test.contentPayload;
    }

    return { hasPdf: Boolean(pdfSrc), hasHtml: Boolean(htmlSrc), pdfSrc, htmlSrc };
  }, [test]);

  const activeSection = test?.sections && test.sections[activeSectionIndex];
  const activePdf = activeSection?.pdfPayload || activeSection?.bankQ?.pdfPayload || (activeSection?.contentPayload && (activeSection.contentPayload.startsWith('data:application/pdf') || activeSection.contentPayload.includes('.pdf')) ? activeSection.contentPayload : null) || globalMedia.pdfSrc;
  const activeHtml = activeSection?.htmlPayload || activeSection?.bankQ?.htmlPayload || (activeSection?.contentPayload && activeSection.contentPayload.includes('<html') ? activeSection.contentPayload : null) || globalMedia.htmlSrc;
  const activeImages = activeSection?.imageUrls || activeSection?.bankQ?.imageUrls || (activeSection?.imageUrl ? [activeSection.imageUrl] : []) || (test?.imageUrls && test.imageUrls.length > 0 ? test.imageUrls : (test?.imageUrl ? [test.imageUrl] : []));
  const activeTitle = activeSection?.title || test?.title || 'Sınav Dokümanı';

  const scoreStats = useMemo(() => {
    const totalQ = Math.max(1, questions.length);
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let unevaluatedCount = 0;
    let oeCount = 0;
    let mcCount = 0;
    let totalPoints = 0;

    questions.forEach((qObj, idx) => {
      const qNo = qObj.questionNo || (idx + 1);
      const isOE = qObj.isOpenEnded;
      if (isOE) oeCount++;
      else mcCount++;

      const ev = questionEvals[qNo] || {};
      if (ev.status === 'correct') {
        correctCount++;
        totalPoints += (ev.score !== undefined ? ev.score : 10);
      } else if (ev.status === 'half') {
        correctCount++;
        totalPoints += (ev.score !== undefined ? ev.score : 5);
      } else if (ev.status === 'wrong') {
        wrongCount++;
        totalPoints += (ev.score || 0);
      } else if (ev.status === 'blank') {
        blankCount++;
      } else if (ev.status === 'custom') {
        if (ev.score >= 5) correctCount++;
        else wrongCount++;
        totalPoints += (ev.score || 0);
      } else {
        unevaluatedCount++;
      }
    });

    const maxPoints = totalQ * 10;
    const percentage = maxPoints > 0 ? Math.min(100, Math.round((totalPoints / maxPoints) * 100)) : 0;

    return {
      totalQ,
      oeCount,
      mcCount,
      correctCount,
      wrongCount,
      blankCount,
      unevaluatedCount,
      totalPoints,
      maxPoints,
      percentage
    };
  }, [questions, questionEvals]);

  const setQuestionStatus = (qNo, status, customScore = null) => {
    setQuestionEvals(prev => {
      let isCorrect = false;
      let isBlank = false;
      let score = 0;

      if (status === 'correct') {
        isCorrect = true;
        isBlank = false;
        score = customScore !== null ? customScore : 10;
      } else if (status === 'wrong') {
        isCorrect = false;
        isBlank = false;
        score = 0;
      } else if (status === 'blank') {
        isCorrect = false;
        isBlank = true;
        score = 0;
      } else if (status === 'half') {
        isCorrect = true;
        isBlank = false;
        score = 5;
      } else if (status === 'custom') {
        score = Math.max(0, Math.min(10, customScore || 0));
        isCorrect = score >= 5;
        isBlank = false;
      }

      return {
        ...prev,
        [qNo]: {
          status,
          isCorrect,
          isBlank,
          score
        }
      };
    });
  };

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);

    try {
      const { totalQ, percentage, totalPoints, maxPoints, correctCount, wrongCount, blankCount } = scoreStats;

      const updatedAnswers = questions.map((qObj, idx) => {
        const qNo = qObj.questionNo || (idx + 1);
        const originalAns = (submission.answers || []).find(a => (a.questionNo || (idx + 1)) === qNo) || (submission.answers || [])[idx] || {};
        const qEval = questionEvals[qNo] || {};

        const isCorrect = qEval.status === 'correct' || (qEval.score >= 5) || (qEval.isCorrect === true);
        const isBlank = qEval.status === 'blank' || (qEval.isBlank === true);
        const score = qEval.score !== undefined ? qEval.score : (isCorrect ? 10 : 0);
        const note = teacherNotes[qNo] || originalAns.teacherNote || '';

        return {
          ...originalAns,
          questionNo: qNo,
          isCorrect,
          score,
          teacherNote: note,
          evaluatedAt: new Date().toISOString()
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        correctCount,
        wrongCount,
        emptyCount: blankCount,
        blankCount,
        totalQuestions: totalQ,
        score: percentage,
        scorePercentage: percentage,
        rawScore: totalPoints,
        maxScore: maxPoints,
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)', fontWeight: 800 }}>
        <Sparkles size={22} className="animate-spin" style={{ marginRight: 10, color: '#6366f1' }} />
        Sınav ve Değerlendirme Dokümanı Yükleniyor...
      </div>
    );
  }

  const filteredQuestions = questions.filter(q => {
    if (filterMode === 'oe') return q.isOpenEnded;
    if (filterMode === 'pending') {
      const ev = questionEvals[q.questionNo];
      return !ev || ev.status === null;
    }
    return true;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Soru Görseli" onClose={() => setLightboxSrc(null)} />
      )}

      {/* ── TOP CONTROL BAR ── */}
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1.5px solid var(--color-border)',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        zIndex: 20
      }}>
        {/* Left: Back & Student/Exam Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border)',
              borderRadius: '0.65rem', padding: '0.45rem 0.85rem',
              color: 'var(--color-text)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Geri
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(37,99,235,0.12)', color: '#60a5fa',
              padding: '0.2rem 0.6rem', borderRadius: 99, fontWeight: 900, fontSize: '0.78rem',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>
              🎓 {submission.studentName || 'Öğrenci'}
            </span>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              {submission.testTitle || test.title}
            </span>
          </div>
        </div>

        {/* Center: Live Summary Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border)',
            borderRadius: '0.65rem', padding: '0.25rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <span style={{
              fontSize: '1.05rem', fontWeight: 900,
              color: scoreStats.percentage >= 70 ? '#16a34a' : (scoreStats.percentage >= 50 ? '#d97706' : '#dc2626')
            }}>
              %{scoreStats.percentage} Başarı
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
              ({scoreStats.totalPoints}/{scoreStats.maxPoints} P)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 800 }}>
            <span style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
              ✓ {scoreStats.correctCount} D
            </span>
            <span style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
              ✗ {scoreStats.wrongCount} Y
            </span>
            <span style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
              ○ {scoreStats.blankCount} B
            </span>
            {scoreStats.unevaluatedCount > 0 && (
              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
                ⏳ {scoreStats.unevaluatedCount} Bekliyor
              </span>
            )}
          </div>
        </div>

        {/* Right: Save Action Button */}
        <button
          type="button"
          onClick={handleSaveEvaluation}
          disabled={isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1.15rem',
            color: 'white', fontWeight: 900, fontSize: '0.82rem',
            cursor: isSaving ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
          }}
        >
          <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Bitir ✓'}
        </button>
      </header>

      {/* ── MAIN UNIFIED BODY (SIDE BY SIDE: DOCUMENT & QUESTIONS) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 60px)', background: 'var(--color-bg)' }}>
        
        {/* ══════════ LEFT PANE: EXAM / DOCUMENT VIEWER (60%) ══════════ */}
        <div style={{
          flex: '1 1 60%',
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1.5px solid var(--color-border)',
          background: 'var(--color-surface)',
          overflow: 'hidden'
        }}>
          {/* Section Switcher Tabs (If Multi-Section Exam) */}
          {Array.isArray(test.sections) && test.sections.length > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              background: 'var(--color-surface-hover)',
              borderBottom: '1px solid var(--color-border)',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginRight: 4 }}>
                📑 Bölümler:
              </span>
              {test.sections.map((sec, sIdx) => {
                const isActive = activeSectionIndex === sIdx;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setActiveSectionIndex(sIdx)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      border: isActive ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                      background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--color-surface)',
                      color: isActive ? '#ffffff' : 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {sec.isOpenEnded ? '✍️' : '📝'} {sec.title || `${sIdx + 1}. Bölüm`}
                    <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({sec.questionCount || 1} Soru)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Media Container */}
          <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
            {activePdf ? (
              <PdfViewerWithControls payload={activePdf} title={activeTitle} height="100%" />
            ) : activeHtml ? (
              <HtmlViewerWithControls payload={activeHtml} title={activeTitle} height="100%" />
            ) : activeImages.length > 0 ? (
              <div style={{ height: '100%', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                {activeImages.map((imgUrl, imgIdx) => (
                  <div key={imgIdx} style={{ maxWidth: '850px', width: '100%', background: 'var(--color-surface-hover)', borderRadius: '0.85rem', padding: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#c084fc' }}>
                      <span>🖼️ Sayfa / Soru Görseli {imgIdx + 1}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>🔍 Büyütmek için tıkla</span>
                    </div>
                    <img
                      src={imgUrl}
                      alt={`Doküman Görseli ${imgIdx + 1}`}
                      style={{ width: '100%', height: 'auto', maxHeight: '680px', objectFit: 'contain', borderRadius: '0.5rem', display: 'block', cursor: 'zoom-in' }}
                      onClick={() => setLightboxSrc(imgUrl)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback Standard Question Cards */
              <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((qItem, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.85rem',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
                      ❓ Soru {qItem.questionNo || (idx + 1)}: {qItem.title || ''}
                    </div>
                    {qItem.questionText && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--color-text)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        {qItem.questionText}
                      </div>
                    )}
                    {qItem.imageUrl && (
                      <img
                        src={qItem.imageUrl}
                        alt="Soru Görseli"
                        style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '0.5rem', marginBottom: '0.5rem', cursor: 'zoom-in' }}
                        onClick={() => setLightboxSrc(qItem.imageUrl)}
                      />
                    )}
                    {Array.isArray(qItem.options) && qItem.options.length > 0 && !qItem.isOpenEnded && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        {qItem.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ fontSize: '0.78rem', background: 'var(--color-surface)', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)' }}>
                            <strong style={{ color: '#818cf8', marginRight: 4 }}>{String.fromCharCode(65 + oIdx)})</strong> {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT PANE: QUESTIONS & NOTLAMA (D / Y / B) (40%) ══════════ */}
        <div style={{
          flex: '0 0 40%',
          minWidth: '380px',
          maxWidth: '520px',
          height: '100%',
          overflowY: 'auto',
          background: 'var(--color-bg)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          boxSizing: 'border-box'
        }}>
          {/* Right Header & Filters */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)' }}>
                🎯 Notlama Listesi ({questions.length} Soru)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: 'none',
                  background: filterMode === 'all' ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                  color: filterMode === 'all' ? '#fff' : 'var(--color-text-muted)',
                  fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                Tümü
              </button>
              {scoreStats.oeCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('oe')}
                  style={{
                    padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: 'none',
                    background: filterMode === 'oe' ? '#d97706' : 'var(--color-surface-hover)',
                    color: filterMode === 'oe' ? '#fff' : 'var(--color-text-muted)',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  ✍️ Yazılı ({scoreStats.oeCount})
                </button>
              )}
              {scoreStats.unevaluatedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('pending')}
                  style={{
                    padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: 'none',
                    background: filterMode === 'pending' ? '#dc2626' : 'var(--color-surface-hover)',
                    color: filterMode === 'pending' ? '#fff' : 'var(--color-text-muted)',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  ⏳ Bekleyen ({scoreStats.unevaluatedCount})
                </button>
              )}
            </div>
          </div>

          {/* Question Cards List with D / Y / B */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredQuestions.map((qItem, idx) => {
              const qNo = qItem.questionNo || (idx + 1);
              const ans = (submission.answers || []).find(a => (a.questionNo || (idx + 1)) === qNo) || (submission.answers || [])[idx] || {};
              const ev = questionEvals[qNo] || {};
              const isOE = qItem.isOpenEnded;

              // Student answer string
              let studentAnsText = null;
              if (isOE) {
                studentAnsText = ans.userAnswerText || '(Yazılı yanıt verilmedi - Boş)';
              } else if (ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '') {
                if (typeof ans.userAnswer === 'number') {
                  studentAnsText = `Şık ${String.fromCharCode(65 + ans.userAnswer)}`;
                } else {
                  studentAnsText = `Şık ${ans.userAnswer}`;
                }
              } else {
                studentAnsText = 'Boş Bırakıldı';
              }

              // Answer key string
              let correctKeyText = null;
              if (!isOE && qItem.answerKey !== undefined && qItem.answerKey !== null && qItem.answerKey !== '') {
                if (typeof qItem.answerKey === 'number') {
                  correctKeyText = `Şık ${String.fromCharCode(65 + qItem.answerKey)}`;
                } else {
                  correctKeyText = `Şık ${qItem.answerKey}`;
                }
              }

              return (
                <div
                  key={qNo}
                  style={{
                    background: 'var(--color-surface)',
                    border: ev.status === 'correct' ? '1.5px solid rgba(16,185,129,0.4)' : (ev.status === 'wrong' ? '1.5px solid rgba(239,68,68,0.4)' : (ev.status === 'half' ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid var(--color-border)')),
                    borderRadius: '0.85rem',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Card Header: Soru No & Type & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        background: isOE ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                        color: isOE ? '#fbbf24' : '#60a5fa',
                        border: isOE ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(59,130,246,0.25)',
                        padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontWeight: 900, fontSize: '0.78rem'
                      }}>
                        {isOE ? '✍️ Soru' : '📋 Soru'} #{qNo}
                      </span>
                      {qItem.sectionTitle && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          {qItem.sectionTitle}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span style={{
                      padding: '0.15rem 0.55rem', borderRadius: 99, fontWeight: 900, fontSize: '0.72rem',
                      background: ev.status === 'correct' ? 'rgba(16,185,129,0.15)' : (ev.status === 'wrong' ? 'rgba(239,68,68,0.15)' : (ev.status === 'half' ? 'rgba(245,158,11,0.15)' : (ev.status === 'blank' ? 'rgba(100,116,139,0.15)' : 'rgba(234,179,8,0.15)'))),
                      color: ev.status === 'correct' ? '#34d399' : (ev.status === 'wrong' ? '#f87171' : (ev.status === 'half' ? '#fbbf24' : (ev.status === 'blank' ? '#94a3b8' : '#eab308'))),
                      border: `1px solid ${ev.status === 'correct' ? 'rgba(16,185,129,0.3)' : (ev.status === 'wrong' ? 'rgba(239,68,68,0.3)' : (ev.status === 'half' ? 'rgba(245,158,11,0.3)' : (ev.status === 'blank' ? 'rgba(100,116,139,0.3)' : 'rgba(234,179,8,0.3)')))}`
                    }}>
                      {ev.status === 'correct' ? '✓ Doğru (10P)' : (ev.status === 'wrong' ? '✗ Yanlış (0P)' : (ev.status === 'half' ? '½ Yarım (5P)' : (ev.status === 'blank' ? '○ Boş (0P)' : (ev.status === 'custom' ? `${ev.score} Puan` : '⏳ Değerlendirilmedi'))))}
                    </span>
                  </div>

                  {/* Student Response Display */}
                  {isOE ? (
                    <div style={{
                      background: 'rgba(37,99,235,0.06)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '0.55rem', padding: '0.6rem 0.75rem'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.25rem' }}>
                        📝 Öğrencinin Yazılı Yanıtı:
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {studentAnsText}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-hover)', padding: '0.45rem 0.65rem', borderRadius: '0.55rem', border: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Öğrenci Yanıtı: </span>
                        <strong style={{ color: ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '' ? 'var(--color-text)' : '#94a3b8' }}>
                          {studentAnsText}
                        </strong>
                      </div>
                      {correctKeyText && (
                        <div>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Cevap Anahtarı: </span>
                          <strong style={{ color: '#10b981' }}>{correctKeyText}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 3 QUICK ACTION BUTTONS: DOĞRU (✓), YANLIŞ (✗), BOŞ (○) ── */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                    gap: '0.35rem',
                    marginTop: '0.25rem'
                  }}>
                    {/* DOĞRU (D) */}
                    <button
                      type="button"
                      onClick={() => setQuestionStatus(qNo, 'correct')}
                      style={{
                        padding: '0.45rem 0.3rem',
                        borderRadius: '0.55rem',
                        border: ev.status === 'correct' ? '2px solid #16a34a' : '1px solid rgba(16,185,129,0.3)',
                        background: ev.status === 'correct' ? '#16a34a' : 'rgba(16,185,129,0.1)',
                        color: ev.status === 'correct' ? '#ffffff' : '#34d399',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        boxShadow: ev.status === 'correct' ? '0 2px 8px rgba(22,163,74,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✓ Doğru (D)
                    </button>

                    {/* YANLIŞ (Y) */}
                    <button
                      type="button"
                      onClick={() => setQuestionStatus(qNo, 'wrong')}
                      style={{
                        padding: '0.45rem 0.3rem',
                        borderRadius: '0.55rem',
                        border: ev.status === 'wrong' ? '2px solid #dc2626' : '1px solid rgba(239,68,68,0.3)',
                        background: ev.status === 'wrong' ? '#dc2626' : 'rgba(239,68,68,0.1)',
                        color: ev.status === 'wrong' ? '#ffffff' : '#f87171',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        boxShadow: ev.status === 'wrong' ? '0 2px 8px rgba(220,38,38,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✗ Yanlış (Y)
                    </button>

                    {/* BOŞ (B) */}
                    <button
                      type="button"
                      onClick={() => setQuestionStatus(qNo, 'blank')}
                      style={{
                        padding: '0.45rem 0.3rem',
                        borderRadius: '0.55rem',
                        border: ev.status === 'blank' ? '2px solid #64748b' : '1px solid rgba(100,116,139,0.3)',
                        background: ev.status === 'blank' ? '#64748b' : 'rgba(100,116,139,0.1)',
                        color: ev.status === 'blank' ? '#ffffff' : '#94a3b8',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        boxShadow: ev.status === 'blank' ? '0 2px 8px rgba(100,116,139,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ○ Boş (B)
                    </button>

                    {/* YARIM PUAN (Only for Open-Ended) */}
                    {isOE && (
                      <button
                        type="button"
                        onClick={() => setQuestionStatus(qNo, 'half')}
                        style={{
                          padding: '0.45rem 0.3rem',
                          borderRadius: '0.55rem',
                          border: ev.status === 'half' ? '2px solid #d97706' : '1px solid rgba(245,158,11,0.3)',
                          background: ev.status === 'half' ? '#d97706' : 'rgba(245,158,11,0.1)',
                          color: ev.status === 'half' ? '#ffffff' : '#fbbf24',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.2rem',
                          boxShadow: ev.status === 'half' ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ½ Yarım (5P)
                      </button>
                    )}
                  </div>

                  {/* Teacher Feedback Note for this Question */}
                  <input
                    type="text"
                    placeholder={`Soru #${qNo} için öğretmen geri bildirim notu...`}
                    value={teacherNotes[qNo] || ''}
                    onChange={e => setTeacherNotes(prev => ({ ...prev, [qNo]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '0.5rem',
                      background: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      fontSize: '0.76rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Overall Exam Feedback & Message */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '0.85rem',
            padding: '0.85rem',
            border: '1.5px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              💬 Sınavın Geneli İçin Öğrenciye Karne Mesajı:
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {QUICK_FEEDBACK_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => setOverallFeedback(preset)}
                  style={{
                    background: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    color: '#60a5fa', fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.2rem 0.5rem', borderRadius: 99, cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows="2"
              placeholder="Öğrencinin bu sınavdaki genel performansı ve tavsiyeleriniz..."
              value={overallFeedback}
              onChange={e => setOverallFeedback(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.65rem', borderRadius: '0.55rem',
                background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)',
                fontSize: '0.78rem', outline: 'none', resize: 'none', boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              style={{
                marginTop: '0.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: '0.65rem', padding: '0.65rem',
                color: 'white', fontWeight: 900, fontSize: '0.85rem',
                cursor: isSaving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
              }}
            >
              <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── MAIN EVALUATION MANAGER PAGE ─────────────────────────────────────────────
export default function EvaluationManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');

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
      if (Array.isArray(sub.answers)) {
        hasWrittenAnswers = sub.answers.some(a => a.userAnswerText && String(a.userAnswerText).trim().length > 0);
      }
      const isExplicitOpenEnded = sub.isOpenEnded || sub.questionType === 'acik_uclu' || sub.questionType === 'yazili' || sub.contentType === 'acik_uclu' || sub.contentType === 'yazili';
      const titleLower = String(title).toLowerCase();
      const hasOEKeywords = titleLower.includes('açık uçlu') || titleLower.includes('acik uclu') || titleLower.includes('yazılı') || titleLower.includes('yazili');

      const isPending = !isAlreadyEvaluated && (hasWrittenAnswers || isExplicitOpenEnded || hasOEKeywords);

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        totalQuestions: totalQ,
        score,
        isPending
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

  const avgEvaluatedScore = useMemo(() => {
    const scored = completedList.filter(s => s.score !== null && s.score !== undefined);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((acc, s) => acc + s.score, 0) / scored.length);
  }, [completedList]);

  const activeDisplayList = useMemo(() => {
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

      return matchesSearch && matchesSubject && matchesStudent;
    });
  }, [activeTab, pendingList, completedList, scopedSubmissions, search, subjectFilter, studentFilter]);

  const allSubjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü', 'Genel Deneme', 'Genel Testler'];
  const studentUsers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      padding: '1.25rem 1.5rem 5rem 1.5rem',
      background: 'var(--color-bg)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>

      {/* Smart Evaluation Modal */}
      {activeSubmission && (
        <SmartEvaluationModal
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

      {/* ══════════ STICKY TOP CONTROL HEADER ══════════ */}
      <header style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              borderRadius: '0.75rem',
              padding: '0.55rem 0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              <Sparkles size={13} /> LMS Sınav & Ödev Değerlendirme Merkezi
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
              Öğrenci Sınav & Ödev Değerlendirme Masası 🎯
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Çoktan seçmeli sorular otomatik puanlanır; açık uçlu yazılı yanıtları tek tıkla inceleyip puanlayın.
            </p>
          </div>
        </div>
      </header>

      {/* ══════════ 4 LIVE KPI HERO METRIC CARDS ══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Edit3 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Not Bekleyen</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{pendingList.length} Sınav</span>
            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>Açık uçlu yanıtlar</span>
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Tamamlanan</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{completedList.length} Sınav</span>
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>Puanlaması bitti</span>
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Toplam Teslim</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{scopedSubmissions.length} Sınav</span>
            <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700 }}>Öğrenci sınav kağıdı</span>
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(2,132,199,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Genel Ortalama</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>%{avgEvaluatedScore}</span>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>Değerlendirilen başarı</span>
          </div>
        </div>
      </div>

      {/* ══════════ TABS & FILTERS BAR ══════════ */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem', padding: '1rem 1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '0.7rem', border: 'none',
              background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-surface-hover)',
              color: activeTab === 'pending' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(245,158,11,0.25)' : 'none'
            }}
          >
            <Edit3 size={14} /> Not Bekleyenler ({pendingList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '0.7rem', border: 'none',
              background: activeTab === 'all' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--color-surface-hover)',
              color: activeTab === 'all' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: activeTab === 'all' ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
            }}
          >
            <ClipboardList size={14} /> Tüm Sınavlar ({scopedSubmissions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '0.7rem', border: 'none',
              background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--color-surface-hover)',
              color: activeTab === 'completed' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'
            }}
          >
            <CheckCircle2 size={14} /> Tamamlananlar ({completedList.length})
          </button>
        </div>

        {/* Search & Select Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Öğrenci veya sınav ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.85rem 0.5rem 2rem', borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.65rem',
              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none'
            }}
          >
            <option value="all">Tüm Dersler</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={studentFilter}
            onChange={e => setStudentFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.65rem',
              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none'
            }}
          >
            <option value="all">Tüm Öğrenciler</option>
            {studentUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* ══════════ SUBMISSIONS CARD GRID ══════════ */}
      {activeDisplayList.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '1.5rem', padding: '3.5rem 1.5rem', textAlign: 'center',
          border: '1.5px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem'
        }}>
          <Sparkles size={44} style={{ opacity: 0.35, color: '#6366f1' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {activeTab === 'pending' ? 'Not Bekleyen Sınav Bulunmuyor' : 'Kayıtlı Sınav Bulunamadı'}
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem', maxWidth: 380 }}>
            {activeTab === 'pending'
              ? 'Harika! Tüm öğrenci yazılı yanıtları başarıyla değerlendirilmiş durumda.'
              : 'Arama kriterlerinize uygun sınav kaydı bulunamadı.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {activeDisplayList.map((sub) => {
            const isPending = sub.isPending;
            const scoreVal = sub.score !== undefined && sub.score !== null ? sub.score : null;
            const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tamamlandı';
            const totalQ = sub.totalQuestions || 1;
            const subConf = subjectThemes[sub.subject] || subjectThemes['Genel Testler'];

            return (
              <div
                key={sub.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isPending ? '1.5px solid #fbbf24' : '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem', padding: '1.25rem',
                  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative', overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {isPending && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3.5,
                    background: 'linear-gradient(90deg, #f59e0b, #d97706)'
                  }} />
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: '0.88rem',
                        boxShadow: '0 2px 8px rgba(99,102,241,0.2)', border: '1.5px solid var(--color-surface)'
                      }}>
                        {sub.studentName?.charAt(0) || 'Ö'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {sub.studentName || 'Öğrenci'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock3 size={11} /> {dateStr}
                        </div>
                      </div>
                    </div>

                    {isPending ? (
                      <span style={{
                        background: 'rgba(245,158,11,0.12)', color: '#fbbf24',
                        border: '1px solid rgba(245,158,11,0.25)',
                        padding: '0.2rem 0.6rem', borderRadius: 99,
                        fontWeight: 900, fontSize: '0.68rem'
                      }}>
                        ✍️ Not Bekliyor
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(16,185,129,0.12)', color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.25)',
                        padding: '0.2rem 0.6rem', borderRadius: 99,
                        fontWeight: 900, fontSize: '0.68rem'
                      }}>
                        ✓ Tamamlandı
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.35, marginBottom: '0.45rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.testTitle || 'Ödev / Sınav'}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: '1px solid var(--color-border)' }}>
                      📝 {totalQ} Soru
                    </span>
                    <span style={{ background: subConf.bg, color: subConf.color, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 800, border: `1px solid ${subConf.border}` }}>
                      {subConf.icon} {sub.subject}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <div>
                    {scoreVal !== null && (
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: scoreVal >= 70 ? '#16a34a' : (scoreVal >= 50 ? '#d97706' : '#dc2626') }}>
                        %{scoreVal}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubmission(sub)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.7rem', border: 'none',
                      background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: '#ffffff',
                      fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      boxShadow: isPending ? '0 4px 12px rgba(245,158,11,0.25)' : '0 4px 12px rgba(99,102,241,0.25)'
                    }}
                  >
                    {isPending ? <Edit3 size={14} /> : <Eye size={14} />}
                    <span>{isPending ? 'Değerlendir & Not Ver' : 'Sınavı & Çözümü İncele'}</span>
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
