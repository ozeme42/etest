import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import CompositeHomeworkReview from '../components/quiz/composite/CompositeHomeworkReview';
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
            if (a.score !== undefined && a.score !== null) {
              scores[qNo] = Number(a.score);
            } else if (a.isCorrect === true) {
              scores[qNo] = 10;
            } else if (a.isCorrect === false) {
              scores[qNo] = 0;
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
        scorePercentage: percentage,
        rawScore: totalPoints,
        maxScore: maxPoints,
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
        <CompositeHomeworkReview
          test={test}
          questions={questions}
          submission={submission}
          isTeacher={true}
          onClose={onClose}
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

export default function EvaluationManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions, approveSubmission, rejectSubmission, deleteSubmission } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Kitap takibi / "Tüm Kitap Görevi" tipindeki ödevleri gizle
  const isTrackedBookHw = (hw) => {
    if (!hw) return false;
    if (hw.isBookAssignment === true || hw.sourceType === 'trackedBook') return true;
    if (hw.bookId || hw.bookTestId) return true;
    const t = String(hw.title || '').toLowerCase();
    if (t.includes('(tüm kitap') || t.includes('(kendi eklediğim)')) return true;
    return false;
  };

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;

  const combinedSubmissions = useMemo(() => {
    const map = new Map();

    // 1. Collect all submissions from EvaluationContext
    (allSubmissions || []).forEach(sub => {
      if (!sub) return;
      if (String(sub.id).startsWith('sub_sample')) return;
      const subKey = String(sub.id || `sub_${sub.testId || sub.homeworkId || sub.questionId}_${sub.studentId || sub.userId}`);
      map.set(subKey, {
        ...sub,
        id: subKey,
        studentId: sub.studentId || sub.userId,
        testId: sub.testId || sub.homeworkId || sub.questionId,
        testTitle: sub.testTitle || sub.title || sub.name || 'Sınav / Test',
        submittedAt: sub.submittedAt || sub.completedAt || sub.createdAt || new Date().toISOString()
      });
    });

    // 2. Collect submissions attached to homeworks
    (homeworks || []).forEach(hw => {
      if (!hw || !hw.id) return;
      (hw.submissions || []).forEach(sub => {
        if (!sub) return;
        if (String(sub.id).startsWith('sub_sample')) return;
        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        const existing = map.get(subKey);
        if (!existing || (sub.isEvaluatedByTeacher && !existing.isEvaluatedByTeacher) || new Date(sub.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
          map.set(subKey, {
            ...sub,
            id: subKey,
            homeworkId: hw.id,
            hwId: hw.id,
            testId: hw.id,
            testTitle: hw.title || sub.testTitle || 'Ödev Testi',
            subject: hw.subject || sub.subject,
            totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
            submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
          });
        }
      });
    });

    // 3. Collect submissions from localStorage caches
    const localKeys = [
      'eTestSubmissions',
      'eTest_modular_submissions',
      'quiz_submissions',
      'modular_quiz_submissions',
      'homework_submissions',
      'evaluation_submissions'
    ];
    localKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(sub => {
              if (!sub) return;
              if (String(sub.id).startsWith('sub_sample')) return;
              const subKey = String(sub.id || `loc_${sub.testId || sub.homeworkId || sub.questionId}_${sub.studentId || sub.userId}`);
              if (!map.has(subKey)) {
                map.set(subKey, {
                  ...sub,
                  id: subKey,
                  studentId: sub.studentId || sub.userId,
                  testId: sub.testId || sub.homeworkId || sub.questionId,
                  testTitle: sub.testTitle || sub.title || 'Sınav / Test',
                  submittedAt: sub.submittedAt || sub.completedAt || sub.createdAt || new Date().toISOString()
                });
              }
            });
          }
        }
      } catch (e) {}
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
      if (score === undefined || score === null) {
        score = sub.scorePercentage;
      }
      if (score !== undefined && score !== null) {
        score = Number(score);
        if (score > 100) {
          const maxPossible = totalQ * 10;
          score = maxPossible > 0 ? Math.min(100, Math.round((score / maxPossible) * 100)) : 100;
        } else {
          score = Math.max(0, Math.min(100, Math.round(score)));
        }
      }

      const isManual = Boolean(sub.isManual || sub.sourceType === 'manual_test');
      const isManualPending = isManual && (sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected'));
      const isManualApproved = isManual && (sub.approvalStatus === 'approved' || sub.isApproved === true || sub.status === 'completed');
      const isManualRejected = isManual && (sub.approvalStatus === 'rejected' || sub.status === 'rejected');

      const isAlreadyEvaluated = Boolean(
        sub.isEvaluatedByTeacher === true ||
        sub.isEvaluated === true ||
        sub.status === 'evaluated' ||
        sub.status === 'graded' ||
        (sub.evaluatedAt && (sub.teacherFeedback || sub.teacherNote))
      );

      // Check if this submission has any open-ended questions
      let hasWrittenAnswers = false;
      if (Array.isArray(sub.answers)) {
        hasWrittenAnswers = sub.answers.some(a => 
          (a.userAnswerText && String(a.userAnswerText).trim().length > 0) ||
          a.isOpenEnded === true ||
          a.is_open_ended === true ||
          ['acik_uclu', 'yazili', 'open_ended'].includes(a.questionType || a.type)
        );
      }

      // Check if sections have open-ended questions
      let hasOpenEndedSection = false;
      if (sub.sections && typeof sub.sections === 'object') {
        hasOpenEndedSection = Object.values(sub.sections).some(sec => 
          sec.type === 'open_ended' ||
          (sec.openEndedText && Object.values(sec.openEndedText).some(t => t && String(t).trim().length > 0))
        );
      }

      const isExplicitOpenEnded = sub.isOpenEnded ||
                                  sub.questionType === 'acik_uclu' ||
                                  sub.questionType === 'yazili' ||
                                  sub.contentType === 'acik_uclu' ||
                                  sub.contentType === 'yazili' ||
                                  matchedBankQ?.type === 'open_ended' ||
                                  matchedHw?.type === 'open_ended' ||
                                  matchedBankQ?.isOpenEnded ||
                                  hasOpenEndedSection;

      const titleLower = String(title).toLowerCase();
      const hasOEKeywords = titleLower.includes('açık uçlu') ||
                            titleLower.includes('acik uclu') ||
                            titleLower.includes('yazılı') ||
                            titleLower.includes('yazili') ||
                            titleLower.includes('yaztop') ||
                            titleLower.includes('metinaç') ||
                            titleLower.includes('metin') ||
                            titleLower.includes('klasik');

      const isPending = isManual
        ? isManualPending
        : (!isAlreadyEvaluated && (hasWrittenAnswers || isExplicitOpenEnded || hasOEKeywords));

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        totalQuestions: totalQ,
        score,
        isManual,
        isManualPending,
        isManualApproved,
        isManualRejected,
        isPending
      };
    });
  }, [combinedSubmissions, users, homeworks, allBankQuestions, bookTests, curriculumData]);

  const scopedSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (sub.status === 'draft' || sub.status === 'in_progress') return false;
      if (sub.isManual) return false; // Manuel testler Onay Merkezi sayfasında yönetilir
      if (sub.id && String(sub.id).startsWith('sub_sample')) return false;
      return true;
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [enrichedSubmissions]);

  const pendingExamList = useMemo(() => scopedSubmissions.filter(s => s.isPending), [scopedSubmissions]);
  const completedList = useMemo(() => scopedSubmissions.filter(s => !s.isPending), [scopedSubmissions]);

  // Manuel test onay sayısı bildirimi için (Onay Merkezi bağlantısı)
  const manualPendingCount = useMemo(() => {
    return enrichedSubmissions.filter(s => s.isManual && s.isManualPending).length;
  }, [enrichedSubmissions]);

  const avgEvaluatedScore = useMemo(() => {
    const scored = completedList.filter(s => s.score !== null && s.score !== undefined);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((acc, s) => acc + s.score, 0) / scored.length);
  }, [completedList]);

  const activeDisplayList = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingExamList;
    else if (activeTab === 'completed') list = completedList;
    else list = scopedSubmissions;

    return list.filter(sub => {
      const sName = String(sub.studentName || '').toLowerCase();
      const tTitle = String(sub.testTitle || sub.title || '').toLowerCase();
      const bTitle = String(sub.bookTitle || '').toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || sName.includes(query) || tTitle.includes(query) || bTitle.includes(query);

      const matchesSubject = subjectFilter === 'all' || (sub.subject && sub.subject === subjectFilter) || tTitle.includes(subjectFilter.toLowerCase());
      const matchesStudent = studentFilter === 'all' || String(sub.studentId) === String(studentFilter);

      return matchesSearch && matchesSubject && matchesStudent;
    });
  }, [activeTab, pendingExamList, completedList, scopedSubmissions, search, subjectFilter, studentFilter]);

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

      {/* Manuel Test Onay Merkezi Yönlendirme Bildirimi */}
      {manualPendingCount > 0 && (
        <div
          onClick={() => navigate('/approvals')}
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(168, 85, 247, 0.12))',
            border: '1.5px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '1.25rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.25rem' }}>⏳</span>
            <div>
              <strong style={{ color: '#7c3aed', fontSize: '0.88rem' }}>
                Öğrencilere ait {manualPendingCount} adet manuel test sonucu onay bekliyor!
              </strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Manuel test onaylarını ve incelemelerini <strong>Onay Merkezi</strong> sayfasından kolayca gerçekleştirebilirsiniz.
              </div>
            </div>
          </div>
          <button
            type="button"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: 'white',
              border: 'none',
              borderRadius: '0.65rem',
              padding: '0.45rem 0.9rem',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Onay Merkezi'ne Git →
          </button>
        </div>
      )}

      <header style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.75rem',
        boxShadow: '0 8px 30px -4px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '1.1rem',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 20px -2px rgba(79, 70, 229, 0.4)'
          }}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Sınav Değerlendirmeleri
              </h1>
              <span style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366f1',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: 99,
                border: '1px solid rgba(165, 180, 252, 0.35)'
              }}>
                {isAdmin ? 'Yönetici Modu' : 'Öğretmen Portalı'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Yazılı sınav kağıtlarını ve öğrenci cevaplarını inceleyip puanlayın
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pendingExamList.length > 0 ? '#f59e0b' : '#10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {pendingExamList.length} Yazılı Bekliyor
            </span>
          </div>

          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Trophy size={14} color="#f59e0b" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Ort. %{avgEvaluatedScore}
            </span>
          </div>
        </div>
      </header>

      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
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
            <Edit3 size={14} /> Yazılı Not Bekleyenler ({pendingExamList.length})
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
            <CheckCircle2 size={14} /> Değerlendirilenler ({completedList.length})
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Öğrenci, kitap veya sınav ara..."
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

      {activeDisplayList.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '1.5rem', padding: '3.5rem 1.5rem', textAlign: 'center',
          border: '1.5px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem'
        }}>
          <Sparkles size={44} style={{ opacity: 0.35, color: '#6366f1' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {activeTab === 'manual_pending'
              ? 'Onay Bekleyen Manuel Test Bulunmuyor'
              : (activeTab === 'pending' ? 'Not Bekleyen Yazılı Sınav Bulunmuyor' : 'Kayıtlı Sınav / Test Bulunamadı')}
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem', maxWidth: 420 }}>
            {activeTab === 'manual_pending'
              ? 'Harika! Öğrenciler tarafından eklenen tüm manuel testler onaylanmış veya incelenmiş durumda.'
              : (activeTab === 'pending'
                ? 'Tüm öğrenci yazılı yanıtları başarıyla değerlendirilmiş durumda.'
                : 'Arama kriterlerinize uygun kayıt bulunamadı.')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {activeDisplayList.map((sub) => {
            const isManual = sub.isManual;
            const isPending = sub.isPending;
            const isManualPending = sub.isManualPending;
            const isManualApproved = sub.isManualApproved;
            const isManualRejected = sub.isManualRejected;

            const scoreVal = sub.score !== undefined && sub.score !== null ? sub.score : null;
            const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tamamlandı';
            const totalQ = sub.totalQuestions || 1;
            const subConf = subjectThemes[sub.subject] || subjectThemes['Genel Testler'];
            const isBusy = processingId === sub.id;

            return (
              <div
                key={sub.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isPending ? (isManual ? '1.5px solid #a855f7' : '1.5px solid #fbbf24') : '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem', padding: '1.25rem',
                  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative', overflow: 'hidden',
                  opacity: isBusy ? 0.6 : 1
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {isPending && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3.5,
                    background: isManual ? 'linear-gradient(90deg, #7c3aed, #a855f7)' : 'linear-gradient(90deg, #f59e0b, #d97706)'
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

                    {isManual ? (
                      isManualPending ? (
                        <span style={{
                          background: 'rgba(124, 58, 237, 0.15)', color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          padding: '0.2rem 0.6rem', borderRadius: 99,
                          fontWeight: 900, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3
                        }}>
                          ⏳ Onay Bekliyor
                        </span>
                      ) : isManualRejected ? (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          padding: '0.2rem 0.6rem', borderRadius: 99,
                          fontWeight: 900, fontSize: '0.68rem'
                        }}>
                          ❌ Reddedildi
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          padding: '0.2rem 0.6rem', borderRadius: 99,
                          fontWeight: 900, fontSize: '0.68rem'
                        }}>
                          ✓ Onaylandı
                        </span>
                      )
                    ) : isPending ? (
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

                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.35, marginBottom: '0.35rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.testTitle || 'Ödev / Sınav'}
                  </div>

                  {sub.bookTitle && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={12} color="#818cf8" />
                      <span>{sub.bookTitle}</span>
                      {sub.unitTopic && <span style={{ opacity: 0.8 }}>• 📌 {sub.unitTopic}</span>}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: '1px solid var(--color-border)' }}>
                      📝 {totalQ} Soru
                    </span>
                    <span style={{ background: subConf.bg, color: subConf.color, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 800, border: `1px solid ${subConf.border}` }}>
                      {subConf.icon} {sub.subject}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', gap: 6, flexWrap: 'wrap' }}>
                  <div>
                    {scoreVal !== null && (
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: scoreVal >= 70 ? '#10b981' : (scoreVal >= 50 ? '#f59e0b' : '#ef4444') }}>
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

