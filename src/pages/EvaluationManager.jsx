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
function SmartEvaluationModal({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
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
        ? { ...foundBankQ, ...foundHw, contentPayload: foundBankQ.contentPayload || foundHw.contentPayload, htmlPayload: foundBankQ.htmlPayload || foundHw.htmlPayload, pdfPayload: foundBankQ.pdfPayload || foundHw.pdfPayload, imageUrl: foundBankQ.imageUrl || foundHw.imageUrl, imageUrls: (foundBankQ.imageUrls?.length ? foundBankQ.imageUrls : foundHw.imageUrls) }
        : (foundBankQ || foundHw || titleMatchBankQ || foundBookTest || foundCurTest || null);

      let contentPayload = isValidPayloadString(submission.contentPayload) ? submission.contentPayload : (isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null);
      let pdfPayload = isValidPayloadString(submission.pdfPayload) ? submission.pdfPayload : (isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null);
      let htmlPayload = isValidPayloadString(submission.htmlPayload) ? submission.htmlPayload : (isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null);

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const rawCandidateIds = [
          targetId, normTargetId, submission.id, submission.testId,
          submission.homeworkId, submission.questionId, resolved?.id,
          resolved?.questionId, resolved?.testId, foundHw?.id,
          foundHw?.questionId, foundBankQ?.id, titleMatchBankQ?.id,
          ...hwQIds
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
            questionText: existingQ.questionText && exactCount === 1 ? existingQ.questionText : `Soru ${i + 1}`,
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Soru Görseli" onClose={() => setLightboxSrc(null)} />
      )}

      {/* ── TOP CONTROL BAR ── */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1.5px solid var(--color-border)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
              borderRadius: '0.65rem', padding: '0.45rem 0.85rem',
              color: 'var(--color-text)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Geri
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(37,99,235,0.12)',
                color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: 99,
                fontWeight: 900, fontSize: '0.75rem', border: '1px solid rgba(59,130,246,0.3)'
              }}>
                🎓 {submission.studentName || 'Öğrenci'}
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                {submission.testTitle || test.title}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: '0.3rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setViewTab('focused_oe')}
            style={{
              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', border: 'none',
              background: viewTab === 'focused_oe' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: viewTab === 'focused_oe' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            <Edit3 size={14} /> Açık Uçlu Notlama ({categorizedQuestions.oeList.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab('full_exam')}
            style={{
              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', border: 'none',
              background: viewTab === 'full_exam' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
              color: viewTab === 'full_exam' ? '#ffffff' : 'var(--color-text-muted)', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            <Eye size={14} /> Tüm Sınav & Doküman ({categorizedQuestions.totalQ} Soru)
          </button>
        </div>

        {/* Right: Live Score & Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '0.75rem', padding: '0.4rem 0.85rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: scoreStats.percentage >= 70 ? '#16a34a' : (scoreStats.percentage >= 50 ? '#d97706' : '#dc2626'), lineHeight: 1 }}>
              %{scoreStats.percentage}
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {scoreStats.totalPoints} / {scoreStats.maxPoints} Puan
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.25rem',
              color: 'white', fontWeight: 900, fontSize: '0.85rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
            }}
          >
            <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet'}
          </button>
        </div>
      </div>

      {/* ── MODAL BODY CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-bg)' }}>
        
        {viewTab === 'focused_oe' ? (
          <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Global Media (PDF / HTML Document) Preview Card */}
            {(globalMedia.hasPdf || globalMedia.hasHtml) && (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem', padding: '1rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTopMedia ? '0.75rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#38bdf8' }}>
                      📄 Sınav Dokümanı ({globalMedia.hasPdf ? 'PDF Kitapçığı' : 'HTML Metni'})
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      Soruların tam metnini buradan görüntüleyebilirsiniz
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTopMedia(p => !p)}
                    style={{
                      background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)',
                      borderRadius: '0.5rem', padding: '0.3rem 0.65rem',
                      color: 'var(--color-text)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                    }}
                  >
                    {showTopMedia ? 'Gizle ▲' : 'Dokümanı Göster ▼'}
                  </button>
                </div>

                {showTopMedia && (
                  <div style={{ height: '420px', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    {globalMedia.hasPdf && <PdfViewerWithControls payload={globalMedia.pdfSrc} src={globalMedia.pdfSrc} title={test.title} />}
                    {globalMedia.hasHtml && <HtmlViewerWithControls payload={globalMedia.htmlSrc} htmlContent={globalMedia.htmlSrc} title={test.title} />}
                  </div>
                )}
              </div>
            )}

            {/* Open Ended Questions Cards List */}
            {categorizedQuestions.oeList.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem', padding: '3rem 1.5rem', textAlign: 'center',
                color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
              }}>
                <CheckCircle2 size={42} color="#10b981" />
                <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.1rem' }}>Açık Uçlu Soru Bulunmuyor</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: 420 }}>
                  Bu sınavdaki tüm sorular çoktan seçmeli formatta olduğundan sistem tarafından otomatik olarak puanlanmıştır.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('full_exam')}
                  style={{
                    marginTop: 6, padding: '0.55rem 1.25rem', borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                    border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer'
                  }}
                >
                  Tüm Sınav Çözümünü İncele
                </button>
              </div>
            ) : (
              categorizedQuestions.oeList.map((oeItem, idx) => {
                const qNo = oeItem.qNo;
                const currentScore = questionScores[qNo] ?? (oeItem.answer?.score !== undefined ? Number(oeItem.answer.score) : 0);
                const currentNote = teacherNotes[qNo] || '';

                return (
                  <div
                    key={qNo}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: '1.25rem', padding: '1.25rem',
                      display: 'flex', flexDirection: 'column', gap: '0.85rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          background: 'rgba(245,158,11,0.12)', color: '#fbbf24',
                          border: '1px solid rgba(245,158,11,0.25)',
                          padding: '0.2rem 0.65rem', borderRadius: '0.5rem',
                          fontWeight: 900, fontSize: '0.8rem'
                        }}>
                          ✍️ Açık Uçlu Soru {idx + 1} / {categorizedQuestions.oeList.length} (Soru #{qNo})
                        </span>
                        {oeItem.sectionTitle && (
                          <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 700, border: '1px solid var(--color-border)' }}>
                            {oeItem.sectionTitle}
                          </span>
                        )}
                      </div>

                      <div style={{
                        background: currentScore === 10 ? 'rgba(16,185,129,0.12)' : (currentScore >= 5 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'),
                        color: currentScore === 10 ? '#34d399' : (currentScore >= 5 ? '#fbbf24' : '#f87171'),
                        border: `1px solid ${currentScore === 10 ? 'rgba(16,185,129,0.25)' : (currentScore >= 5 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)')}`,
                        padding: '0.25rem 0.75rem', borderRadius: 99, fontWeight: 900, fontSize: '0.82rem'
                      }}>
                        Verilen Puan: {currentScore} / 10 Puan
                      </div>
                    </div>

                    {oeItem.imageUrl && (
                      <div style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto', background: 'var(--color-surface-hover)', borderRadius: '0.85rem', padding: '0.5rem', border: '1px solid var(--color-border)' }}>
                        <div style={{ padding: '0.2rem 0.5rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#c084fc' }}>
                          <span>🖼️ Soru {qNo} Görseli</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>🔍 Büyütmek için tıkla</span>
                        </div>
                        <img
                          src={oeItem.imageUrl}
                          alt={`Soru ${qNo} Görseli`}
                          style={{ width: '100%', height: 'auto', maxHeight: '360px', objectFit: 'contain', borderRadius: '0.5rem', display: 'block', cursor: 'zoom-in' }}
                          onClick={() => setLightboxSrc(oeItem.imageUrl)}
                        />
                      </div>
                    )}

                    {oeItem.question?.questionText && oeItem.question.questionText !== `Soru ${qNo}` && (
                      <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', fontSize: '0.88rem', color: 'var(--color-text)', fontWeight: 600 }}>
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>❓ Soru Metni: </span>
                        {oeItem.question.questionText}
                      </div>
                    )}

                    {/* Student Written Response */}
                    <div style={{
                      background: 'rgba(37,99,235,0.08)',
                      border: '1.5px solid rgba(59,130,246,0.3)',
                      borderRadius: '0.85rem', padding: '1rem',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.06)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        📝 Öğrencinin Soru {qNo} İçin Yazılı Yanıtı:
                      </div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {oeItem.answer?.userAnswerText || '(Öğrenci bu soruya yazılı yanıt vermedi - Boş)'}
                      </div>
                    </div>

                    {/* Grading Controls */}
                    <div style={{
                      background: 'var(--color-surface-hover)', padding: '0.85rem',
                      borderRadius: '0.85rem', border: '1px solid var(--color-border)',
                      display: 'flex', flexDirection: 'column', gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fbbf24' }}>
                          🎯 Soru {qNo} Puanı:
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 10 }))}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: '0.65rem',
                              border: currentScore === 10 ? '2px solid #16a34a' : '1px solid rgba(16,185,129,0.3)',
                              background: currentScore === 10 ? '#16a34a' : 'rgba(16,185,129,0.12)',
                              color: currentScore === 10 ? '#ffffff' : '#34d399', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            ✓ Tam Puan (10)
                          </button>

                          <button
                            type="button"
                            onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 5 }))}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: '0.65rem',
                              border: currentScore === 5 ? '2px solid #d97706' : '1px solid rgba(245,158,11,0.3)',
                              background: currentScore === 5 ? '#d97706' : 'rgba(245,158,11,0.12)',
                              color: currentScore === 5 ? '#ffffff' : '#fbbf24', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            ½ Yarım Puan (5)
                          </button>

                          <button
                            type="button"
                            onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: '0.65rem',
                              border: currentScore === 0 ? '2px solid #dc2626' : '1px solid rgba(239,68,68,0.3)',
                              background: currentScore === 0 ? '#dc2626' : 'rgba(239,68,68,0.12)',
                              color: currentScore === 0 ? '#ffffff' : '#f87171', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            ✕ 0 Puan
                          </button>

                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', borderRadius: '0.65rem', border: '1px solid var(--color-border-input)', padding: '0.2rem' }}>
                            <button
                              type="button"
                              onClick={() => setQuestionScores(p => ({ ...p, [qNo]: Math.max(0, currentScore - 1) }))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', padding: '0.3rem', cursor: 'pointer' }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontWeight: 900, minWidth: '28px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--color-text)' }}>
                              {currentScore}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuestionScores(p => ({ ...p, [qNo]: Math.min(10, currentScore + 1) }))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', padding: '0.3rem', cursor: 'pointer' }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder={`Soru ${qNo} için öğretmenin geri bildirim notu...`}
                        value={currentNote}
                        onChange={e => setTeacherNotes(p => ({ ...p, [qNo]: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                          background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)',
                          fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}

            {/* Overall Feedback Card */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '1.25rem', padding: '1.25rem',
              border: '1.5px solid var(--color-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex', flexDirection: 'column', gap: '0.65rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                💬 Sınavın Geneli İçin Öğrenciye Karne Mesajı:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {QUICK_FEEDBACK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOverallFeedback(preset)}
                    style={{
                      background: 'rgba(37,99,235,0.12)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      color: '#60a5fa', fontSize: '0.72rem', fontWeight: 700,
                      padding: '0.25rem 0.65rem', borderRadius: 99, cursor: 'pointer'
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
                  width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem',
                  background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)',
                  fontSize: '0.85rem', outline: 'none', resize: 'none', boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  disabled={isSaving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.5rem',
                    color: 'white', fontWeight: 900, fontSize: '0.9rem',
                    cursor: isSaving ? 'wait' : 'pointer',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)'
                  }}
                >
                  <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            {renderFullExamScreen()}
          </div>
        )}

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
