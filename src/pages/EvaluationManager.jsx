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
  CheckCircle, XCircle, Clock3, Eye, Save, ArrowLeft,
  CheckCircle2, Search, Filter, Layers, MessageSquare,
  Sparkles, Check, Edit3, Send, FileText, Globe, Image as ImageIcon,
  RotateCcw, Trophy, ThumbsUp, ThumbsDown, HelpCircle,
  Plus, Minus, Maximize2, Trash2, Layout, Award, FileCode, ZoomIn
} from 'lucide-react';

import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';
import ImageLightbox, { isValidImageUrl } from '../components/quiz/common/ImageLightbox';

import { resolveTestQuestions } from '../utils/testResolver';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';
import { resolveExactQuestionCount } from '../components/quiz/runner/MultiHomeworkRunner';

// ─── DERS TESPİTİ ─────────────────────────────────────────────────────────────
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
  if (t.includes('din') || t.includes('ahlak') || t.includes('ilmihal')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('lgs') || t.includes('tarama')) return 'Genel Deneme';
  return 'Genel Ödevler';
}

function isValidPayloadString(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  if (s.length === 0) return false;
  if (s === '[STORED_IN_INDEXEDDB]' || s === '[LOCALSTORAGE_CACHE]') return false;
  return true;
}

// Format bilgisine göre kategori tespiti
function getOpenEndedCategory(sub, testObj, questionsList = []) {
  const isPdf = Boolean(
    sub?.pdfPayload || testObj?.pdfPayload ||
    (typeof sub?.contentPayload === 'string' && (sub.contentPayload.startsWith('data:application/pdf') || sub.contentPayload.includes('.pdf') || sub.contentPayload.startsWith('%PDF'))) ||
    (typeof testObj?.contentPayload === 'string' && (testObj.contentPayload.startsWith('data:application/pdf') || testObj.contentPayload.includes('.pdf') || testObj.contentPayload.startsWith('%PDF'))) ||
    sub?.formatType === 'pdf' || testObj?.formatType === 'pdf' || testObj?.contentType === 'pdf'
  );
  if (isPdf) return 'pdf';

  const isHtml = Boolean(
    sub?.htmlPayload || testObj?.htmlPayload ||
    (typeof sub?.contentPayload === 'string' && (sub.contentPayload.includes('<html') || sub.contentPayload.startsWith('<!DOCTYPE') || sub.contentPayload.startsWith('data:text/html'))) ||
    (typeof testObj?.contentPayload === 'string' && (testObj.contentPayload.includes('<html') || testObj.contentPayload.startsWith('<!DOCTYPE') || testObj.contentPayload.startsWith('data:text/html'))) ||
    sub?.formatType === 'html' || testObj?.formatType === 'html' || testObj?.contentType === 'html'
  );
  if (isHtml) return 'html';

  const hasImages = Boolean(
    sub?.imageUrl || (sub?.imageUrls && sub.imageUrls.length > 0) ||
    testObj?.imageUrl || (testObj?.imageUrls && testObj.imageUrls.length > 0) ||
    (questionsList && questionsList.some(q => q?.imageUrl || (q?.imageUrls && q.imageUrls.length > 0))) ||
    sub?.contentType === 'gorsel' || sub?.questionType === 'gorsel_klasik' || testObj?.contentType === 'gorsel'
  );
  if (hasImages) return 'image';

  return 'text';
}

const CATEGORY_META = {
  text: { label: 'Yazılı / Metin', icon: '📝', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  image: { label: 'Görselli Soru', icon: '🖼️', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  pdf: { label: 'PDF Sınavı', icon: '📄', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  html: { label: 'HTML Sınavı', icon: '🌐', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
};

// ══════════════════════════════════════════════════════════════════════════════
// ─── DEĞERLENDİRME MODALI (4 KATEGORİYE ÖZEL ÇÖZÜM MODU) ──────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function OpenEndedEvaluationStudio({ submission, allBankQuestions, homeworks, curriculumData, bookTests, onClose, onSaveSuccess }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
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
        : (foundBankQ || foundHw || titleMatchBankQ || null);

      let contentPayload = isValidPayloadString(submission.contentPayload) ? submission.contentPayload : (isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null);
      let pdfPayload = isValidPayloadString(submission.pdfPayload) ? submission.pdfPayload : (isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null);
      let htmlPayload = isValidPayloadString(submission.htmlPayload) ? submission.htmlPayload : (isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null);

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const candidateIds = [
          targetId, normTargetId, submission.id, submission.testId,
          submission.homeworkId, submission.questionId, resolved?.id,
          resolved?.questionId, resolved?.testId, foundHw?.id,
          foundHw?.questionId, foundBankQ?.id, titleMatchBankQ?.id,
          ...hwQIds
        ];

        const expanded = new Set();
        candidateIds.filter(Boolean).forEach(id => {
          const str = String(id);
          const clean = str.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
          expanded.add(str);
          expanded.add(`q_${clean}`);
          expanded.add(`hw_${clean}`);
          expanded.add(`test_${clean}`);
        });

        for (const cid of expanded) {
          try {
            const val = await idbGetPayload(cid);
            if (isValidPayloadString(val)) {
              contentPayload = val;
              if (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF')) {
                pdfPayload = val;
              } else if (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html') || val.includes('<body') || val.includes('<p') || val.includes('<div')) {
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
      if (contentPayload && !htmlPayload && (contentPayload.includes('<html') || contentPayload.startsWith('<!DOCTYPE') || contentPayload.startsWith('data:text/html') || contentPayload.includes('<body') || contentPayload.includes('<p') || contentPayload.includes('<div'))) {
        htmlPayload = contentPayload;
      }

      const baseResolvedQs = resolveTestQuestions(resolved || submission, allBankQuestions);
      const ansList = Array.isArray(submission.answers) ? submission.answers : [];
      const baseImages = (resolved?.imageUrls && Array.isArray(resolved.imageUrls)) ? resolved.imageUrls : [];
      
      const exactCount = Math.max(
        resolveExactQuestionCount(resolved || {}, resolved || {}, resolved || {}, baseResolvedQs, baseImages),
        ansList.length,
        parseInt(submission.totalQuestions || resolved?.questionCount || 0, 10) || 0,
        1
      );

      const generatedQuestions = [];
      for (let i = 0; i < exactCount; i++) {
        const existingQ = baseResolvedQs[i] || baseResolvedQs[0] || {};
        const ans = ansList[i] || {};
        const qImg = ans.imageUrl || baseImages[i] || (baseImages.length === 1 ? baseImages[0] : null) || existingQ.imageUrl || (exactCount === 1 ? resolved?.imageUrl : null) || null;

        const qText = ans.questionText || existingQ.questionText || existingQ.text || existingQ.title || (exactCount === 1 ? (resolved?.questionText || resolved?.title) : `Soru ${i + 1}`);

        generatedQuestions.push({
          ...existingQ,
          id: existingQ.id ? `${existingQ.id}_q${i + 1}` : `q_${i + 1}`,
          questionNo: i + 1,
          title: existingQ.title || existingQ.name || qText || `Soru ${i + 1}`,
          questionText: qText,
          pdfPayload: existingQ.pdfPayload || pdfPayload,
          htmlPayload: existingQ.htmlPayload || htmlPayload,
          imageUrl: qImg,
          imageUrls: baseImages,
          options: existingQ.options || ['A', 'B', 'C', 'D']
        });
      }

      const finalTestObj = {
        ...(resolved || {}),
        id: targetId,
        title: submission.testTitle || resolved?.title || resolved?.name || 'Açık Uçlu Ödev',
        contentPayload,
        pdfPayload,
        htmlPayload,
        imageUrl: submission.imageUrl || resolved?.imageUrl || null,
        imageUrls: submission.imageUrls || resolved?.imageUrls || [],
        questionCount: generatedQuestions.length || 1
      };

      if (isMounted) {
        setTest(finalTestObj);
        setQuestions(generatedQuestions);

        const scores = {};
        const notes = {};
        for (let i = 1; i <= exactCount; i++) {
          const ans = ansList[i - 1];
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

  const category = useMemo(() => {
    return getOpenEndedCategory(submission, test, questions);
  }, [submission, test, questions]);

  const meta = CATEGORY_META[category] || CATEGORY_META.text;
  const answers = submission?.answers || [];
  const qCount = questions.length || 1;

  const { totalEarned, maxPossible, scorePercentage } = useMemo(() => {
    let earned = 0;
    let max = qCount * 10;
    for (let i = 1; i <= qCount; i++) {
      const s = questionScores[i] ?? (answers[i - 1]?.score !== undefined ? Number(answers[i - 1].score) : 0);
      earned += Math.max(0, Math.min(10, s));
    }
    const pct = max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;
    return { totalEarned: earned, maxPossible: max, scorePercentage: pct };
  }, [qCount, questionScores, answers]);

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);

    try {
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
        score: scorePercentage,
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
      alert('Değerlendirme kaydedilirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !test) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'white' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Ödev ve Sorular Yükleniyor...</span>
      </div>
    );
  }

  const activeQ = questions[activeQuestionIdx] || questions[0] || {};
  const activeAns = answers[activeQuestionIdx] || answers.find(a => a.questionNo === (activeQuestionIdx + 1)) || {};

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Soru Görseli" onClose={() => setLightboxSrc(null)} />
      )}

      {/* ── TOP HEADER ── */}
      <header style={{
        padding: '0.75rem 1.5rem',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '1rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.65rem',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>
                🎓 {submission.studentName || 'Öğrenci'}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#4f46e5' }}>
                {submission.testTitle || test.title}
              </span>
              <span style={{
                background: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.border}`,
                padding: '2px 8px',
                borderRadius: 99,
                fontWeight: 900,
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {meta.icon} {meta.label}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
              Toplam {qCount} Soru • Açık Uçlu / Yazılı Değerlendirme
            </div>
          </div>
        </div>

        {/* Live Score & Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#ffffff',
            padding: '0.4rem 0.95rem',
            borderRadius: '0.65rem',
            fontWeight: 900,
            fontSize: '0.92rem',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
          }}>
            %{scorePercentage} ({totalEarned}/{maxPossible} Puan)
          </div>

          <button
            type="button"
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              border: 'none',
              borderRadius: '0.65rem',
              padding: '0.6rem 1.25rem',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.86rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
            }}
          >
            <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet ✓'}
          </button>
        </div>
      </header>

      {/* ── WORKSPACE BASED ON 4 CATEGORIES ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* 1. PDF / 2. HTML MODU (Bölünmüş Doküman + Yan Panel) ─────────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {(category === 'pdf' || category === 'html') ? (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Sol: PDF / HTML Görüntüleyici */}
            <div style={{ borderRight: '1.5px solid #e2e8f0', background: '#ffffff', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {category === 'pdf' ? (
                <PdfViewerWithControls payload={test.pdfPayload || test.contentPayload} title={test.title} height="100%" />
              ) : (
                <HtmlViewerWithControls payload={test.htmlPayload || test.contentPayload} title={test.title} height="100%" />
              )}
            </div>

            {/* Sağ: Soru Soru Öğrenci Cevapları & Puanlama */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f8fafc', overflowY: 'auto', padding: '1.25rem', gap: '1rem' }}>
              <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✍️</span> Öğrencinin Soru Yanıtları & Puanlama:
              </div>

              {questions.map((q, idx) => {
                const qNo = idx + 1;
                const ans = answers[idx] || answers.find(a => a.questionNo === qNo) || {};
                const textAns = ans.userAnswerText || ans.userAnswer || '';
                const currentScore = questionScores[qNo] ?? (ans.score !== undefined ? Number(ans.score) : 0);

                return (
                  <div key={qNo} style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#4f46e5' }}>Soru {qNo}</span>
                      <span style={{ fontWeight: 900, fontSize: '0.85rem', color: currentScore === 10 ? '#15803d' : (currentScore >= 5 ? '#d97706' : '#b91c1c') }}>
                        {currentScore} / 10 Puan
                      </span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Öğrencinin Yanıtı:</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {textAns || '(Öğrenci bu soruya yazılı yanıt vermedi - Boş)'}
                      </div>
                    </div>

                    {/* Puanlama Butonları */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 10 }))}
                        style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: currentScore === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1', background: currentScore === 10 ? '#16a34a' : '#ffffff', color: currentScore === 10 ? '#ffffff' : '#15803d', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        ✓ 10 Puan
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 5 }))}
                        style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: currentScore === 5 ? '2px solid #d97706' : '1px solid #cbd5e1', background: currentScore === 5 ? '#d97706' : '#ffffff', color: currentScore === 5 ? '#ffffff' : '#d97706', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        ½ 5 Puan
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                        style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: currentScore === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1', background: currentScore === 0 ? '#dc2626' : '#ffffff', color: currentScore === 0 ? '#ffffff' : '#b91c1c', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        ✕ 0 Puan
                      </button>
                    </div>

                    {/* Not */}
                    <input
                      type="text"
                      placeholder="Bu soru için öğrenciye notunuz..."
                      value={teacherNotes[qNo] || ''}
                      onChange={e => setTeacherNotes(p => ({ ...p, [qNo]: e.target.value }))}
                      style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                );
              })}

              {/* Genel Karne */}
              <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '1rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#4f46e5' }}>💬 Genel Değerlendirme / Karne Notu:</div>
                <textarea
                  rows="2"
                  placeholder="Öğrencinin ödevi için genel notunuz..."
                  value={overallFeedback}
                  onChange={e => setOverallFeedback(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  disabled={isSaving}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: '0.88rem', border: 'none', cursor: isSaving ? 'wait' : 'pointer' }}
                >
                  <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla'}
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════════ */
          /* 3. GÖRSELLİ / 4. YAZILI METİN MODU (Soru - Cevap Net Düzen) ──────── */
          /* ════════════════════════════════════════════════════════════════════ */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflowY: 'auto', padding: '1.5rem', maxWidth: 960, margin: '0 auto', width: '100%', boxSizing: 'border-box', gap: '1.5rem' }}>
            
            {/* Soru Navigasyon Hapları (Birden fazla soru varsa) */}
            {questions.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '0.65rem 1rem', borderRadius: '1rem', border: '1.5px solid #e2e8f0', overflowX: 'auto' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Sorular:</span>
                {questions.map((_, qIdx) => {
                  const qNum = qIdx + 1;
                  const isSel = qIdx === activeQuestionIdx;
                  const sc = questionScores[qNum] ?? 0;
                  return (
                    <button
                      key={qNum}
                      type="button"
                      onClick={() => setActiveQuestionIdx(qIdx)}
                      style={{
                        minWidth: 36, height: 36, borderRadius: 8,
                        border: isSel ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        background: isSel ? '#4f46e5' : (sc === 10 ? '#ecfdf5' : (sc > 0 ? '#fffbeb' : '#ffffff')),
                        color: isSel ? '#ffffff' : (sc === 10 ? '#047857' : (sc > 0 ? '#b45309' : '#334155')),
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer'
                      }}
                    >
                      {qNum}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Soru Kartı */}
            <div style={{ background: '#ffffff', borderRadius: '1.25rem', padding: '1.5rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: 'rgba(79,70,229,0.12)', color: '#4f46e5', fontWeight: 900, fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: 8 }}>
                    Soru {activeQuestionIdx + 1}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#334155' }}>
                    {category === 'image' ? '🖼️ Görselli Açık Uçlu Soru' : '📝 Yazılı Soru Metni'}
                  </span>
                </div>

                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: (questionScores[activeQuestionIdx + 1] ?? 0) === 10 ? '#15803d' : ((questionScores[activeQuestionIdx + 1] ?? 0) >= 5 ? '#d97706' : '#b91c1c') }}>
                  Verilen Puan: {questionScores[activeQuestionIdx + 1] ?? 0} / 10
                </div>
              </div>

              {/* 1. Soru Görseli (Varsa) */}
              {activeQ.imageUrl && (
                <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ZoomIn size={14} /> Büyütmek için görselin üzerine tıklayın
                  </div>
                  <img
                    src={activeQ.imageUrl}
                    alt={`Soru ${activeQuestionIdx + 1} Görseli`}
                    style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: 8, cursor: 'zoom-in', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
                    onClick={() => setLightboxSrc(activeQ.imageUrl)}
                  />
                </div>
              )}

              {/* 2. Soru Metni */}
              {activeQ.questionText && (
                <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>
                    ❓ SORU METNİ:
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {activeQ.questionText}
                  </div>
                </div>
              )}

              {/* 3. Öğrencinin Yazılı Yanıtı */}
              <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 900, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✍️</span> ÖĞRENCİNİN YAZILI YANITI:
                </div>
                <div style={{ fontSize: '1.02rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 48 }}>
                  {activeAns.userAnswerText || activeAns.userAnswer || '(Öğrenci bu soruya yazılı yanıt vermedi - Boş)'}
                </div>
              </div>

              {/* 4. Puanlama & Not Paneli */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#334155' }}>
                    🎯 Bu Soru İçin Notlandırma:
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionIdx + 1]: 10 }))}
                      style={{
                        padding: '0.45rem 1rem', borderRadius: 8,
                        border: (questionScores[activeQuestionIdx + 1] === 10) ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: (questionScores[activeQuestionIdx + 1] === 10) ? '#16a34a' : '#ffffff',
                        color: (questionScores[activeQuestionIdx + 1] === 10) ? '#ffffff' : '#15803d',
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer'
                      }}
                    >
                      ✓ Tam Puan (10)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionIdx + 1]: 5 }))}
                      style={{
                        padding: '0.45rem 1rem', borderRadius: 8,
                        border: (questionScores[activeQuestionIdx + 1] === 5) ? '2px solid #d97706' : '1px solid #cbd5e1',
                        background: (questionScores[activeQuestionIdx + 1] === 5) ? '#d97706' : '#ffffff',
                        color: (questionScores[activeQuestionIdx + 1] === 5) ? '#ffffff' : '#d97706',
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer'
                      }}
                    >
                      ½ Yarım Puan (5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionScores(p => ({ ...p, [activeQuestionIdx + 1]: 0 }))}
                      style={{
                        padding: '0.45rem 1rem', borderRadius: 8,
                        border: (questionScores[activeQuestionIdx + 1] === 0) ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: (questionScores[activeQuestionIdx + 1] === 0) ? '#dc2626' : '#ffffff',
                        color: (questionScores[activeQuestionIdx + 1] === 0) ? '#ffffff' : '#b91c1c',
                        fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer'
                      }}
                    >
                      ✕ 0 Puan
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Bu soru için öğrenciye özel geri bildiriminiz..."
                  value={teacherNotes[activeQuestionIdx + 1] || ''}
                  onChange={e => setTeacherNotes(p => ({ ...p, [activeQuestionIdx + 1]: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Soru İleri/Geri */}
              {questions.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIdx(p => Math.max(0, p - 1))}
                    disabled={activeQuestionIdx === 0}
                    style={{ padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: activeQuestionIdx === 0 ? 'not-allowed' : 'pointer', opacity: activeQuestionIdx === 0 ? 0.4 : 1 }}
                  >
                    ← Önceki Soru
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIdx(p => Math.min(questions.length - 1, p + 1))}
                    disabled={activeQuestionIdx === questions.length - 1}
                    style={{ padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: activeQuestionIdx === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: activeQuestionIdx === questions.length - 1 ? 0.4 : 1 }}
                  >
                    Sonraki Soru →
                  </button>
                </div>
              )}
            </div>

            {/* Genel Karne & Kaydet */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '1.25rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4f46e5' }}>💬 Genel Değerlendirme & Karne Mesajı:</div>
              <textarea
                rows="2"
                placeholder="Öğrencinin bu ödevi için genel karne mesajınız..."
                value={overallFeedback}
                onChange={e => setOverallFeedback(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
              />
              <button
                type="button"
                onClick={handleSaveEvaluation}
                disabled={isSaving}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── ANA DEĞERLENDİRME MERKEZİ (KATEGORİ SEKMELİ DASHBOARD) ───────────────────
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
  const [formatTab, setFormatTab] = useState('all'); // 'all' | 'text' | 'image' | 'pdf' | 'html'
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'pending' | 'completed'
  const [search, setSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;

  const openEndedSubmissions = useMemo(() => {
    const activeHws = (homeworks || []).filter(hw => hw && hw.id);
    const map = new Map();

    const isBookTaskOrBookTest = (item) => {
      if (!item) return false;
      if (item.bookId || item.bookTestId || item.isBookTask || item.isBookTest) return true;
      const sId = String(item.id || '');
      const tId = String(item.testId || '');
      const hwId = String(item.homeworkId || item.hwId || '');
      if (sId.startsWith('bt_') || sId.startsWith('book_') || sId.startsWith('tbt_')) return true;
      if (tId.startsWith('bt_') || tId.startsWith('book_') || tId.startsWith('tbt_')) return true;
      if (hwId.startsWith('bt_') || hwId.startsWith('book_') || hwId.startsWith('tbt_')) return true;
      return false;
    };

    const isStrictlyOpenEnded = (sub, hw, bankQ) => {
      if (Array.isArray(sub?.answers) && sub.answers.some(a => a.userAnswerText && String(a.userAnswerText).trim().length > 0)) {
        return true;
      }
      if (sub?.isOpenEnded || sub?.openEnded || sub?.contentType === 'acik_uclu' || sub?.contentType === 'yazili' || sub?.questionType === 'acik_uclu' || sub?.questionType === 'yazili') {
        return true;
      }
      if (hw?.isOpenEnded || hw?.openEnded || hw?.contentType === 'acik_uclu' || hw?.contentType === 'yazili' || hw?.type === 'acik_uclu' || hw?.type === 'yazili') {
        return true;
      }
      if (bankQ?.isOpenEnded || bankQ?.openEnded || bankQ?.contentType === 'acik_uclu' || bankQ?.questionType === 'acik_uclu' || bankQ?.type === 'acik_uclu' || bankQ?.type === 'gorsel_klasik') {
        return true;
      }
      const titleStr = (String(sub?.testTitle || sub?.title || hw?.title || bankQ?.title || '')).toLowerCase();
      if (titleStr.includes('açık uçlu') || titleStr.includes('acik uclu') || titleStr.includes('yazılı') || titleStr.includes('yazili') || titleStr.includes('klasik')) {
        return true;
      }
      return false;
    };

    activeHws.forEach(hw => {
      if (isBookTaskOrBookTest(hw)) return;

      (hw.submissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        if (isBookTaskOrBookTest(sub)) return;

        const matchedBankQ = (allBankQuestions || []).find(q => String(q.id) === String(hw.questionId || hw.testId || hw.id));
        if (!isStrictlyOpenEnded(sub, hw, matchedBankQ)) return;

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
        if (isBookTaskOrBookTest(sub)) return;

        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.id || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
        
        const matchesHw = String(hw.id) === targetId ||
          String(hw.id) === normTargetId ||
          String(hw.id) === String(sub.hwId) ||
          String(hw.id) === String(sub.homeworkId) ||
          (hw.submissions && hw.submissions.some(s => String(s.id) === String(sub.id)));

        if (matchesHw) {
          const matchedBankQ = (allBankQuestions || []).find(q => String(q.id) === String(hw.questionId || hw.testId || hw.id));
          if (!isStrictlyOpenEnded(sub, hw, matchedBankQ)) return;

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
      if (isBookTaskOrBookTest(sub)) return;

      const targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.questionId || sub.id || '');
      const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
      const matchedHw = activeHws.find(h => String(h.id) === targetId || String(h.id) === normTargetId);
      const matchedBankQ = (allBankQuestions || []).find(q => String(q.id) === targetId || String(q.id) === normTargetId);

      if (matchedHw && isBookTaskOrBookTest(matchedHw)) return;
      if (!isStrictlyOpenEnded(sub, matchedHw, matchedBankQ)) return;

      const subKey = String(sub.id || `sub_${Date.now()}`);
      if (!map.has(subKey)) {
        map.set(subKey, sub);
      }
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks, allBankQuestions]);

  const enrichedSubmissions = useMemo(() => {
    return openEndedSubmissions.map(sub => {
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

      let title = sub.testTitle || sub.homeworkTitle || sub.title;
      if (!title || ['sınav', 'test', 'ödev'].includes(String(title).trim().toLowerCase())) {
        if (matchedHw?.title) title = matchedHw.title;
        else if (matchedBankQ?.title) title = matchedBankQ.title;
        else title = 'Açık Uçlu Ödev';
      }

      let subject = detectSubject(title, sub.subject || matchedHw?.subject || matchedBankQ?.subject);

      let score = sub.score;
      if (score !== undefined && score !== null) {
        score = Math.max(0, Math.min(100, Math.round(Number(score))));
      }

      const isAlreadyEvaluated = sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      const isPending = !isAlreadyEvaluated;
      const category = getOpenEndedCategory(sub, matchedHw || matchedBankQ);

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        score,
        isPending,
        isAlreadyEvaluated,
        category
      };
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [openEndedSubmissions, users, homeworks, allBankQuestions]);

  const filteredSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (formatTab !== 'all' && sub.category !== formatTab) return false;
      if (statusTab === 'pending' && !sub.isPending) return false;
      if (statusTab === 'completed' && sub.isPending) return false;

      const q = search.toLowerCase().trim();
      if (q) {
        const sName = String(sub.studentName || '').toLowerCase();
        const tTitle = String(sub.testTitle || '').toLowerCase();
        if (!sName.includes(q) && !tTitle.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSubmissions, formatTab, statusTab, search]);

  const counts = useMemo(() => {
    return {
      all: enrichedSubmissions.length,
      text: enrichedSubmissions.filter(s => s.category === 'text').length,
      image: enrichedSubmissions.filter(s => s.category === 'image').length,
      pdf: enrichedSubmissions.filter(s => s.category === 'pdf').length,
      html: enrichedSubmissions.filter(s => s.category === 'html').length,
      pending: enrichedSubmissions.filter(s => s.isPending).length,
      completed: enrichedSubmissions.filter(s => !s.isPending).length
    };
  }, [enrichedSubmissions]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '1.5rem 2rem 5rem 2rem', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {activeSubmission && (
        <OpenEndedEvaluationStudio
          submission={activeSubmission}
          allBankQuestions={allBankQuestions}
          homeworks={homeworks}
          curriculumData={curriculumData}
          bookTests={bookTests}
          onClose={() => setActiveSubmission(null)}
          onSaveSuccess={() => setActiveSubmission(null)}
        />
      )}

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              borderRadius: '0.65rem', padding: '0.5rem 0.95rem',
              color: '#334155', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <ArrowLeft size={16} /> Panel
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✍️</span> Açık Uçlu Ödev Değerlendirme Merkezi
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Yazılı, görselli, PDF ve HTML formatındaki açık uçlu ödevleri kategorilerine göre inceleyin ve puanlayın
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {counts.pending > 0 && (
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.4rem 0.85rem', borderRadius: 99, fontWeight: 900, fontSize: '0.8rem' }}>
              ⏳ {counts.pending} Ödev Notlama Bekliyor
            </span>
          )}
        </div>
      </div>

      {/* ── 4 KATEGORİ SEKMELERİ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setFormatTab('all')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'all' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
            background: formatTab === 'all' ? '#ffffff' : '#ffffff',
            boxShadow: formatTab === 'all' ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'all' ? '#4f46e5' : '#334155' }}>Tüm Ödevler</span>
          </div>
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('text')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'text' ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
            background: formatTab === 'text' ? '#eff6ff' : '#ffffff',
            boxShadow: formatTab === 'text' ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'text' ? '#2563eb' : '#334155' }}>Yazılı / Metin</span>
          </div>
          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.text}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('image')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'image' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
            background: formatTab === 'image' ? '#faf5ff' : '#ffffff',
            boxShadow: formatTab === 'image' ? '0 4px 12px rgba(124, 58, 237, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>🖼️</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'image' ? '#7c3aed' : '#334155' }}>Görselli Sorular</span>
          </div>
          <span style={{ background: '#f3e8ff', color: '#6d28d9', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.image}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('pdf')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'pdf' ? '2px solid #dc2626' : '1.5px solid #e2e8f0',
            background: formatTab === 'pdf' ? '#fef2f2' : '#ffffff',
            boxShadow: formatTab === 'pdf' ? '0 4px 12px rgba(220, 38, 38, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'pdf' ? '#dc2626' : '#334155' }}>PDF Sınavları</span>
          </div>
          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.pdf}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('html')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'html' ? '2px solid #059669' : '1.5px solid #e2e8f0',
            background: formatTab === 'html' ? '#ecfdf5' : '#ffffff',
            boxShadow: formatTab === 'html' ? '0 4px 12px rgba(5, 150, 105, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>🌐</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'html' ? '#059669' : '#334155' }}>HTML Sınavları</span>
          </div>
          <span style={{ background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.html}
          </span>
        </button>
      </div>

      {/* Durum & Arama Filtresi */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setStatusTab('all')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'all' ? '#334155' : '#f8fafc',
              color: statusTab === 'all' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'pending' ? '#d97706' : '#f8fafc',
              color: statusTab === 'pending' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            ⏳ Bekleyenler ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('completed')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'completed' ? '#059669' : '#f8fafc',
              color: statusTab === 'completed' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            ✅ Tamamlananlar ({counts.completed})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Öğrenci veya ödev ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem',
              borderRadius: '0.5rem', background: '#f8fafc',
              border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.82rem',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: '1.25rem', padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
          <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>
            {statusTab === 'pending' ? 'Tebrikler! Değerlendirme Bekleyen Açık Uçlu Ödev Yok' : 'Bu Kategoride Ödev Bulunamadı'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            {statusTab === 'pending' ? 'Tüm açık uçlu ödev teslimleri başarıyla sonuçlandırılmıştır.' : 'Seçili filtre ve kategoriye uygun açık uçlu ödev kaydı bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredSubmissions.map(sub => {
            const cardMeta = CATEGORY_META[sub.category] || CATEGORY_META.text;

            return (
              <div
                key={sub.id}
                style={{
                  background: '#ffffff',
                  border: `1.5px solid ${sub.isPending ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: '1rem',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>
                    🎓 {sub.studentName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      background: cardMeta.bg, color: cardMeta.color,
                      border: `1px solid ${cardMeta.border}`,
                      padding: '2px 7px', borderRadius: 6, fontWeight: 800, fontSize: '0.7rem'
                    }}>
                      {cardMeta.icon} {cardMeta.label}
                    </span>
                    <span style={{
                      background: sub.isPending ? '#fef3c7' : '#ecfdf5',
                      color: sub.isPending ? '#b45309' : '#047857',
                      border: `1px solid ${sub.isPending ? '#fde68a' : '#a7f3d0'}`,
                      padding: '2px 8px', borderRadius: 99, fontWeight: 800, fontSize: '0.72rem'
                    }}>
                      {sub.isPending ? '⏳ Bekliyor' : `%${sub.score || 0}`}
                    </span>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.4 }}>
                  {sub.testTitle}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    📚 {sub.subject}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveSubmission(sub)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: sub.isPending ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #059669, #10b981)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.95rem',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} /> {sub.isPending ? 'Puanla & Değerlendir' : 'İncele'}
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
