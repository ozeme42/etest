import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import MultiHomeworkRunner from '../components/quiz/runner/MultiHomeworkRunner';
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
  'Matematik': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '📐' },
  'Fen Bilimleri': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: '🔬' },
  'Türkçe': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: '📚' },
  'Sosyal Bilgiler': { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: '🌍' },
  'İngilizce': { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: '🇬🇧' },
  'Din Kültürü': { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', icon: '🌙' },
  'Genel Deneme': { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: '🏛️' },
  'Genel Testler': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: '📝' }
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
  if (title.includes('açık uçlu') || title.includes('acik uclu') || title.includes('yazılı') || title.includes('yazili')) return true;
  if (Array.isArray(item.options) && item.options.length > 0 && !item.isOpenEnded) return false;
  return false;
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
  const [showTopMedia, setShowTopMedia] = useState(false);
  const [topMediaType, setTopMediaType] = useState('auto'); // 'pdf' | 'html' | 'image'

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

      let foundHw = homeworks?.find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission.id)))
      );

      let foundBankQ = allBankQuestions?.find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId)
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

      let resolved = foundHw || foundBankQ || foundBookTest || foundCurTest || null;

      let contentPayload = submission.contentPayload || resolved?.contentPayload || null;
      let pdfPayload = submission.pdfPayload || resolved?.pdfPayload || null;
      let htmlPayload = submission.htmlPayload || resolved?.htmlPayload || null;

      if (!contentPayload || contentPayload === '[STORED_IN_INDEXEDDB]') {
        const candidateIds = [targetId, normTargetId, submission.id, submission.testId, resolved?.id].filter(Boolean);
        for (const cid of candidateIds) {
          const val = await idbGetPayload(cid);
          if (val && val !== '[STORED_IN_INDEXEDDB]') {
            contentPayload = val;
            if (val.startsWith('data:application/pdf') || val.includes('.pdf')) pdfPayload = val;
            else if (val.includes('<html') || val.startsWith('<!DOCTYPE')) htmlPayload = val;
            break;
          }
        }
      }

      let sections = resolved?.sections || resolved?.tests || null;
      if (Array.isArray(sections) && sections.length > 0) {
        const mappedSections = [];
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const secBankQ = allBankQuestions?.find(q => String(q.id) === String(secQId));
          let secPayload = sec?.contentPayload || secBankQ?.contentPayload || null;
          if (!secPayload || secPayload === '[STORED_IN_INDEXEDDB]') {
            secPayload = await idbGetPayload(secQId);
          }
          const secResolvedQs = secBankQ ? resolveTestQuestions(secBankQ, allBankQuestions) : [];
          mappedSections.push({
            id: secQId || `sec_${i}`,
            title: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
            bankQ: secBankQ ? { ...secBankQ, contentPayload: secPayload || secBankQ.contentPayload } : { id: secQId, title: sec?.title },
            questions: secResolvedQs,
            questionCount: secBankQ?.questionCount || secResolvedQs.length || 1,
            contentPayload: secPayload,
            isOpenEnded: secBankQ ? isItemOpenEnded(secBankQ) : false
          });
        }
        sections = mappedSections;
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
        questionCount: submission.totalQuestions || resolved?.questionCount || (submission.answers?.length) || 1
      };

      const resolvedQuestionsList = resolveTestQuestions(finalTestObj, allBankQuestions);

      if (isMounted) {
        setTest(finalTestObj);
        setQuestions(resolvedQuestionsList.length > 0 ? resolvedQuestionsList : (submission.answers || []));

        const scores = {};
        const notes = {};
        const qCount = Math.max(1, resolvedQuestionsList.length || submission.answers?.length || 1);
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

  // Separate Open-Ended (Manual Teacher Grade) vs Multiple-Choice (Auto Graded)
  const categorizedQuestions = useMemo(() => {
    const totalQ = Math.max(1, questions?.length || submission?.answers?.length || 1);
    const oeList = [];
    const mcList = [];

    for (let i = 1; i <= totalQ; i++) {
      const qObj = questions[i - 1] || {};
      const ans = (submission?.answers || [])[i - 1] || {};
      const isOE = isItemOpenEnded(qObj, ans);

      const matchedSec = test?.sections?.find(s =>
        s.questions?.some(sq => sq.id === qObj.id) ||
        (Array.isArray(s.questions) && s.questions[ans.subIndex ?? (i - 1)]) ||
        s.id === qObj.sectionId
      ) || (test?.sections && test.sections[0]);

      let pdfPayload = qObj.pdfPayload || qObj.pdfUrl || matchedSec?.bankQ?.pdfPayload || matchedSec?.bankQ?.pdfUrl || (typeof matchedSec?.contentPayload === 'string' && (matchedSec.contentPayload.startsWith('data:application/pdf') || matchedSec.contentPayload.includes('.pdf')) ? matchedSec.contentPayload : null) || test?.pdfPayload || (typeof test?.contentPayload === 'string' && (test.contentPayload.startsWith('data:application/pdf') || test.contentPayload.includes('.pdf')) ? test.contentPayload : null) || null;

      let htmlPayload = qObj.htmlPayload || matchedSec?.bankQ?.htmlPayload || (typeof matchedSec?.contentPayload === 'string' && (matchedSec.contentPayload.startsWith('<!DOCTYPE') || matchedSec.contentPayload.includes('<html') || matchedSec.contentPayload.startsWith('data:text/html')) ? matchedSec.contentPayload : null) || test?.htmlPayload || (typeof test?.contentPayload === 'string' && (test.contentPayload.startsWith('<!DOCTYPE') || test.contentPayload.includes('<html') || test.contentPayload.startsWith('data:text/html')) ? test.contentPayload : null) || null;

      let imageUrl = qObj.imageUrl || ans.imageUrl || (qObj.imageUrls && qObj.imageUrls[0]) || (matchedSec?.bankQ?.imageUrls && (matchedSec.bankQ.imageUrls[ans.subIndex ?? (i - 1)] || matchedSec.bankQ.imageUrls[0])) || test?.imageUrl || (test?.imageUrls && test.imageUrls[0]) || (typeof test?.contentPayload === 'string' && test.contentPayload.startsWith('data:image') ? test.contentPayload : null) || null;

      const itemInfo = {
        qNo: i,
        question: qObj,
        answer: ans,
        isOE,
        imageUrl,
        pdfPayload,
        htmlPayload,
        title: qObj.title || qObj.name || qObj.questionText || `Soru ${i}`,
        sectionTitle: matchedSec?.title || null
      };

      if (isOE) oeList.push(itemInfo);
      else mcList.push(itemInfo);
    }

    return { oeList, mcList, totalQ };
  }, [questions, submission, test]);

  // Global Media available for whole test
  const globalMedia = useMemo(() => {
    const hasPdf = Boolean(test?.pdfPayload || test?.pdfUrl || (test?.sections && test.sections.some(s => s.bankQ?.pdfPayload || s.contentPayload?.startsWith('data:application/pdf'))));
    const hasHtml = Boolean(test?.htmlPayload || (test?.sections && test.sections.some(s => s.bankQ?.htmlPayload || s.contentPayload?.includes('<html'))));
    const pdfSrc = test?.pdfPayload || test?.pdfUrl || (test?.sections?.find(s => s.bankQ?.pdfPayload || s.contentPayload?.startsWith('data:application/pdf'))?.contentPayload);
    const htmlSrc = test?.htmlPayload || (test?.sections?.find(s => s.bankQ?.htmlPayload || s.contentPayload?.includes('<html'))?.contentPayload);
    return { hasPdf, hasHtml, pdfSrc, htmlSrc };
  }, [test]);

  // If there are NO open ended questions, default viewTab to 'full_exam'
  useEffect(() => {
    if (!loading && categorizedQuestions.oeList.length === 0) {
      setViewTab('full_exam');
    }
  }, [loading, categorizedQuestions.oeList.length]);

  // Live Score Breakdown
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Sınav ve Değerlendirme Ekranı Hazırlanıyor...
      </div>
    );
  }

  const isMultiSection = Boolean((test.sections && test.sections.length > 1) || test.isBulk || test.isMulti);
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#090d16', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* Lightbox for zooming question images */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Soru Görseli" onClose={() => setLightboxSrc(null)} />
      )}

      {/* ── TOP CONTROL BAR ── */}
      <div style={{
        background: '#131c2e',
        borderBottom: '1px solid #1e293b',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 10
      }}>
        {/* Left: Back + Student Badge + Test Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '0.6rem', padding: '0.45rem 0.85rem',
              color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Geri
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white', padding: '0.15rem 0.55rem', borderRadius: '50px',
                fontWeight: 900, fontSize: '0.75rem'
              }}>
                🎓 {submission.studentName || 'Öğrenci'}
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f8fafc' }}>
                {submission.testTitle || test.title}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div style={{ display: 'flex', background: '#090d16', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
          <button
            type="button"
            onClick={() => setViewTab('focused_oe')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              background: viewTab === 'focused_oe' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: viewTab === 'focused_oe' ? '#0f172a' : '#94a3b8',
              fontWeight: 900,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Zap size={14} /> Puanlanacak Açık Uçlular ({categorizedQuestions.oeList.length})
          </button>

          <button
            type="button"
            onClick={() => setViewTab('full_exam')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              background: viewTab === 'full_exam' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: viewTab === 'full_exam' ? 'white' : '#94a3b8',
              fontWeight: 900,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Eye size={14} /> Tüm Sınav &amp; Dokümanlar ({categorizedQuestions.totalQ})
          </button>
        </div>

        {/* Right: Score Breakdown & Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: '#090d16', border: '1px solid #1e293b',
            borderRadius: '0.75rem', padding: '0.35rem 0.75rem',
            display: 'flex', alignItems: 'center', gap: '0.6rem'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
              Çoktan Seçmeli: <span style={{ color: '#34d399', fontWeight: 900 }}>{scoreStats.mcCorrect}/{scoreStats.mcCount} D</span> (Oto)
            </div>
            <div style={{ width: 1, height: 16, background: '#334155' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: scoreStats.percentage >= 70 ? '#34d399' : (scoreStats.percentage >= 50 ? '#fbbf24' : '#f87171') }}>
              Toplam: %{scoreStats.percentage}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '0.75rem',
              padding: '0.5rem 1.25rem',
              color: 'white', fontWeight: 900, fontSize: '0.84rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Bitir'}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT BODY ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#090d16', position: 'relative' }}>
        
        {/* TAB 1: SADECE PUANLANACAK AÇIK UÇLU SORULAR */}
        {viewTab === 'focused_oe' ? (
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.25rem 1rem 5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Optional Global PDF/HTML Media Drawer Toggle */}
            {(globalMedia.hasPdf || globalMedia.hasHtml) && (
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden' }}>
                <div
                  onClick={() => setShowTopMedia(p => !p)}
                  style={{
                    padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', background: 'rgba(255,255,255,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', color: '#38bdf8' }}>
                    <BookOpen size={16} />
                    <span>📄 Sınavın Orijinal PDF / HTML Dokümanını Aç</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                    <span>{showTopMedia ? 'Gizle' : 'Dokümanı Görüntüle'}</span>
                    {showTopMedia ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {showTopMedia && (
                  <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid #1e293b', background: '#090d16' }}>
                    {globalMedia.pdfSrc ? (
                      <div style={{ height: '440px', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #334155' }}>
                        <PdfViewerWithControls payload={globalMedia.pdfSrc} title="Sınav PDF Dokümanı" height="100%" />
                      </div>
                    ) : globalMedia.htmlSrc ? (
                      <div style={{ height: '400px', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #334155' }}>
                        <HtmlViewerWithControls payload={globalMedia.htmlSrc} title="Sınav HTML Dokümanı" height="100%" />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Auto-Graded Summary Banner */}
            {scoreStats.mcCount > 0 && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                borderRadius: '1rem',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#f8fafc' }}>
                      {scoreStats.mcCount} Adet Çoktan Seçmeli Soru Otomatik Puanlandı
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Öğrenci bu sorulardan {scoreStats.mcCorrect} doğru yaptı ({scoreStats.mcCount > 0 ? Math.round((scoreStats.mcCorrect/scoreStats.mcCount)*100) : 0}%). Aşağıda sadece not vermeniz gereken açık uçlu sorular listelenmiştir.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewTab('full_exam')}
                  style={{
                    background: 'transparent', border: '1px solid #475569',
                    borderRadius: '0.5rem', padding: '0.35rem 0.75rem',
                    color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  Çoktan Seçmelileri İncele →
                </button>
              </div>
            )}

            {/* List of Open-Ended Questions to Grade */}
            {categorizedQuestions.oeList.length === 0 ? (
              <div style={{
                background: '#131c2e', borderRadius: '1.25rem', padding: '3.5rem 1.5rem',
                textAlign: 'center', border: '1px solid #1e293b'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                  Puanlama Gerektiren Açık Uçlu Soru Yok!
                </h3>
                <p style={{ margin: '0.5rem 0 1.25rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Bu sınavdaki tüm sorular çoktan seçmelidir ve sistem tarafından otomatik olarak puanlanmıştır.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('full_exam')}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', border: 'none', borderRadius: '0.75rem',
                    padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Sınavın Tamamını &amp; Cevapları Gör
                </button>
              </div>
            ) : (
              categorizedQuestions.oeList.map((oeItem, idx) => {
                const qNo = oeItem.qNo;
                const currentScore = questionScores[qNo] ?? (oeItem.answer?.score !== undefined ? Number(oeItem.answer.score) : 0);
                const currentNote = teacherNotes[qNo] ?? (oeItem.answer?.teacherNote || '');

                return (
                  <div
                    key={qNo}
                    style={{
                      background: '#131c2e',
                      border: '1.5px solid rgba(245,158,11,0.4)',
                      borderRadius: '1.25rem',
                      padding: '1.25rem',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    {/* Question Header & Section Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          background: '#f59e0b', color: '#0f172a',
                          padding: '0.2rem 0.6rem', borderRadius: '0.5rem',
                          fontWeight: 900, fontSize: '0.8rem'
                        }}>
                          ✍️ Açık Uçlu Soru {idx + 1} / {categorizedQuestions.oeList.length} (Soru #{qNo})
                        </span>
                        {oeItem.sectionTitle && (
                          <span style={{ background: '#1e293b', color: '#94a3b8', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                            {oeItem.sectionTitle}
                          </span>
                        )}
                      </div>

                      {/* Current Score Tag */}
                      <div style={{
                        background: currentScore === 10 ? 'rgba(16,185,129,0.2)' : (currentScore >= 5 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'),
                        color: currentScore === 10 ? '#34d399' : (currentScore >= 5 ? '#fbbf24' : '#f87171'),
                        border: `1px solid ${currentScore === 10 ? '#059669' : (currentScore >= 5 ? '#d97706' : '#dc2626')}`,
                        padding: '0.25rem 0.75rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.82rem'
                      }}>
                        Verilen Puan: {currentScore} / 10 Puan
                      </div>
                    </div>

                    {/* 1. PDF Dokümanı (Varsa) */}
                    {oeItem.pdfPayload && (
                      <div style={{ borderRadius: '0.85rem', overflow: 'hidden', border: '1px solid #334155', background: '#090d16' }}>
                        <div style={{ padding: '0.4rem 0.85rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 800, color: '#f43f5e' }}>
                          <FileText size={14} /> 📕 Soru PDF Dokümanı:
                        </div>
                        <div style={{ height: '380px' }}>
                          <PdfViewerWithControls payload={oeItem.pdfPayload} title={`Soru ${qNo} PDF Dokümanı`} height="100%" />
                        </div>
                      </div>
                    )}

                    {/* 2. HTML Web Dokümanı (Varsa) */}
                    {!oeItem.pdfPayload && oeItem.htmlPayload && (
                      <div style={{ borderRadius: '0.85rem', overflow: 'hidden', border: '1px solid #334155', background: '#090d16' }}>
                        <div style={{ padding: '0.4rem 0.85rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>
                          <Globe size={14} /> 🌐 Web (HTML) Dokümanı:
                        </div>
                        <div style={{ height: '340px' }}>
                          <HtmlViewerWithControls payload={oeItem.htmlPayload} title={`Soru ${qNo} HTML Dokümanı`} height="100%" />
                        </div>
                      </div>
                    )}

                    {/* 3. Question Visual Image / Content (Varsa) */}
                    {!oeItem.pdfPayload && !oeItem.htmlPayload && oeItem.imageUrl && (
                      <div style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto', background: '#090d16', borderRadius: '0.85rem', padding: '0.5rem', border: '1px solid #334155' }}>
                        <div style={{ padding: '0.2rem 0.5rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#c084fc' }}>
                          <span>🖼️ Soru Görseli</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>🔍 Büyütmek için tıkla</span>
                        </div>
                        <img
                          src={oeItem.imageUrl}
                          alt={`Soru ${qNo} Görseli`}
                          style={{ width: '100%', height: 'auto', maxHeight: '360px', objectFit: 'contain', borderRadius: '0.5rem', display: 'block', cursor: 'zoom-in' }}
                          onClick={() => setLightboxSrc(oeItem.imageUrl)}
                        />
                      </div>
                    )}

                    {/* Question Text Prompt */}
                    {oeItem.question?.questionText && (
                      <div style={{ background: '#090d16', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #1e293b', fontSize: '0.88rem', color: '#f1f5f9', fontWeight: 600 }}>
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>❓ Soru Metni: </span>
                        {oeItem.question.questionText}
                      </div>
                    )}

                    {/* Student Written Response Box */}
                    <div style={{
                      background: '#1e293b',
                      border: '1.5px solid #3b82f6',
                      borderRadius: '0.85rem',
                      padding: '1rem',
                      boxShadow: '0 4px 16px rgba(59,130,246,0.15)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        📝 Öğrencinin Yazılı Yanıtı:
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#ffffff', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {oeItem.answer?.userAnswerText || '(Öğrenci bu soruya yazılı yanıt vermedi - Boş)'}
                      </div>
                    </div>

                    {/* Teacher Quick Grading Controls (3 BIG BUTTONS) */}
                    <div style={{
                      background: '#090d16',
                      padding: '0.85rem',
                      borderRadius: '0.85rem',
                      border: '1px solid #1e293b',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fbbf24' }}>
                          🎯 Bu Soruya Puan Ver:
                        </span>

                        {/* Big 3 Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 10 }))}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: '0.65rem',
                              border: currentScore === 10 ? '2px solid #34d399' : '1px solid #059669',
                              background: currentScore === 10 ? '#059669' : 'rgba(6,78,59,0.35)',
                              color: 'white', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer',
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
                              border: currentScore === 5 ? '2px solid #fbbf24' : '1px solid #d97706',
                              background: currentScore === 5 ? '#d97706' : 'rgba(120,53,15,0.35)',
                              color: 'white', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer',
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
                              border: currentScore === 0 ? '2px solid #f87171' : '1px solid #dc2626',
                              background: currentScore === 0 ? '#dc2626' : 'rgba(127,29,29,0.35)',
                              color: 'white', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem'
                            }}
                          >
                            ✕ 0 Puan
                          </button>

                          {/* Custom Manual Stepper */}
                          <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: '0.65rem', border: '1px solid #334155', padding: '0.2rem' }}>
                            <button
                              type="button"
                              onClick={() => setQuestionScores(p => ({ ...p, [qNo]: Math.max(0, currentScore - 1) }))}
                              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', padding: '0.3rem', cursor: 'pointer' }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontWeight: 900, minWidth: '28px', textAlign: 'center', fontSize: '0.88rem', color: '#f8fafc' }}>
                              {currentScore}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuestionScores(p => ({ ...p, [qNo]: Math.min(10, currentScore + 1) }))}
                              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', padding: '0.3rem', cursor: 'pointer' }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Question Note Input */}
                      <input
                        type="text"
                        placeholder={`Soru ${qNo} için öğretmenin geri bildirim notu...`}
                        value={currentNote}
                        onChange={e => setTeacherNotes(p => ({ ...p, [qNo]: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                          background: '#131c2e', border: '1px solid #334155', color: '#f8fafc',
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
              background: '#131c2e',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
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
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#a5b4fc',
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '50px',
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
                  width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem',
                  background: '#090d16', border: '1px solid #334155', color: '#f8fafc',
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
                    border: 'none', borderRadius: '0.75rem',
                    padding: '0.65rem 1.5rem',
                    color: 'white', fontWeight: 900, fontSize: '0.9rem',
                    cursor: isSaving ? 'wait' : 'pointer',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.45)'
                  }}
                >
                  <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* TAB 2: TÜM SINAVI VE DOKÜMANLARI İNCELE */
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
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'completed'
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;

  // 1. COMBINE & DEDUPLICATE SUBMISSIONS
  const combinedSubmissions = useMemo(() => {
    const map = new Map();

    (allSubmissions || []).forEach(sub => {
      if (sub && sub.id) {
        map.set(String(sub.id), sub);
      }
    });

    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        if (!map.has(subKey)) {
          map.set(subKey, {
            ...sub,
            id: subKey,
            homeworkId: hw.id,
            testId: hw.id,
            testTitle: hw.title,
            subject: hw.subject,
            totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
            submittedAt: sub.completedAt || sub.submittedAt || new Date().toISOString()
          });
        }
      });
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks]);

  // 2. ENRICH EACH SUBMISSION
  const enrichedSubmissions = useMemo(() => {
    return combinedSubmissions.map(sub => {
      // A) Student Name
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

      // B) Test Title
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

      // C) Subject
      let subject = detectSubject(title, sub.subject || matchedHw?.subject || matchedBankQ?.subject || matchedCurTest?.subjectName);

      // D) Question Count
      let totalQ = sub.totalQuestions || matchedHw?.totalQuestions || matchedHw?.questionCount || matchedBankQ?.questionCount || (sub.answers?.length) || 1;

      // E) Score (0-100%)
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

      // F) Determine isPending
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

  // 3. FILTER BY TEACHER / ADMIN PERMISSION
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

  const pendingList = useMemo(() => {
    return scopedSubmissions.filter(s => s.isPending);
  }, [scopedSubmissions]);

  const completedList = useMemo(() => {
    return scopedSubmissions.filter(s => !s.isPending);
  }, [scopedSubmissions]);

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
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '1rem', fontFamily: "'Inter', sans-serif" }}>
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

      {/* Main Evaluations List Dashboard */}
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Header Title & Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '1.25rem',
          padding: '1.25rem 1.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                <ClipboardCheck size={22} color="white" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Öğrenci Sınav &amp; Ödev Değerlendirme Merkezi
              </h1>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', fontWeight: 500 }}>
              Çoktan seçmeli sorular otomatik puanlanır; PDF, HTML ve görsel soru dokümanlarını inceleyerek açık uçlu yanıtları tek tıkla puanlayın.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.85rem', padding: '0.55rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{pendingList.length}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fef3c7', textTransform: 'uppercase', marginTop: '0.2rem' }}>✍️ Not Bekleyen</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0.85rem', padding: '0.55rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{completedList.length}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d1fae5', textTransform: 'uppercase', marginTop: '0.2rem' }}>✅ Tamamlanan</div>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '0.85rem', padding: '0.55rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{scopedSubmissions.length}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e0e7ff', textTransform: 'uppercase', marginTop: '0.2rem' }}>📊 Toplam Sınav</div>
            </div>
          </div>
        </div>

        {/* Tabs & Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: '#1e293b',
          padding: '0.75rem 1rem',
          borderRadius: '1.1rem',
          border: '1px solid #334155'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '0.7rem',
                border: 'none',
                background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'pending' ? '#0f172a' : '#cbd5e1',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
              }}
            >
              <Edit3 size={14} /> Not Bekleyenler ({pendingList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '0.7rem',
                border: 'none',
                background: activeTab === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: activeTab === 'all' ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              <ClipboardList size={14} /> Tüm Sınavlar ({scopedSubmissions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '0.7rem',
                border: 'none',
                background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              <CheckCircle2 size={14} /> Tamamlananlar ({completedList.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Öğrenci / sınav ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.85rem 0.45rem 2rem',
                  borderRadius: '0.65rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: 'white',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '0.65rem',
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="all">Tüm Dersler</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '0.65rem',
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="all">Tüm Öğrenciler</option>
              {studentUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Submissions Card Grid */}
        {activeDisplayList.length === 0 ? (
          <div style={{
            background: '#1e293b',
            borderRadius: '1.25rem',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2.5rem' }}>✨</div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc' }}>
              {activeTab === 'pending' ? 'Not Bekleyen Sınav Bulunmuyor' : 'Kayıtlı Sınav Bulunamadı'}
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', maxWidth: 380 }}>
              {activeTab === 'pending'
                ? 'Harika! Tüm öğrenci yazılı yanıtları başarıyla değerlendirilmiş durumda.'
                : 'Arama kriterlerinize uygun sınav kaydı bulunamadı.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem'
          }}>
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
                    background: '#1e293b',
                    border: isPending ? '1.5px solid rgba(245,158,11,0.6)' : '1px solid #334155',
                    borderRadius: '1.1rem',
                    padding: '1.1rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isPending && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3.5,
                      background: 'linear-gradient(90deg, #f59e0b, #d97706)'
                    }} />
                  )}

                  <div>
                    {/* Student & Date Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 900, fontSize: '0.88rem',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                        }}>
                          {sub.studentName?.charAt(0) || 'Ö'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#f8fafc' }}>
                            {sub.studentName || 'Öğrenci'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock3 size={11} /> {dateStr}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {isPending ? (
                        <span style={{
                          background: 'rgba(245,158,11,0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245,158,11,0.4)',
                          padding: '0.18rem 0.55rem',
                          borderRadius: '50px',
                          fontWeight: 900,
                          fontSize: '0.68rem'
                        }}>
                          ✍️ Not Bekliyor
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(16,185,129,0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.4)',
                          padding: '0.18rem 0.55rem',
                          borderRadius: '50px',
                          fontWeight: 900,
                          fontSize: '0.68rem'
                        }}>
                          ✓ Tamamlandı
                        </span>
                      )}
                    </div>

                    {/* Exam Title */}
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9', lineHeight: 1.35, marginBottom: '0.45rem' }}>
                      {sub.testTitle || 'Ödev / Sınav'}
                    </div>

                    {/* Info Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <span style={{ background: '#0f172a', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: '1px solid #334155' }}>
                        📝 {totalQ} Soru
                      </span>
                      <span style={{ background: subConf.bg, color: subConf.color, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 800, border: `1px solid ${subConf.border}` }}>
                        {subConf.icon} {sub.subject}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action & Score Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                    <div>
                      {scoreVal !== null && (
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: scoreVal >= 70 ? '#34d399' : (scoreVal >= 50 ? '#fbbf24' : '#f87171') }}>
                          %{scoreVal}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubmission(sub)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.7rem',
                        border: 'none',
                        background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: isPending ? '#0f172a' : 'white',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: isPending ? '0 4px 12px rgba(245,158,11,0.35)' : '0 4px 12px rgba(99,102,241,0.3)'
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
    </div>
  );
}
