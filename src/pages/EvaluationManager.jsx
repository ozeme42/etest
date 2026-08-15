import React, { useState, useEffect, useMemo } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle, XCircle, Clock3, Eye, Save, ArrowLeft,
  ClipboardList, Users, BookOpen, Star, ChevronRight, ChevronDown, ChevronUp,
  AlertCircle, Search, Filter, Layers, MessageSquare, Award,
  Sparkles, Check, Edit3, Send, FileText, Globe, Image as ImageIcon
} from 'lucide-react';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../components/quiz/common/ImageLightbox';
import { checkIsAnswerCorrect } from '../utils/answerEvaluation';
import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';

function tryParseQuestionsPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const trimmed = payload.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questionsList)) return parsed.questionsList;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  } catch (e) {}
  return null;
}

// ─── Embedded Quiz Review / Solution Runner for Teacher Modal ───
function EmbeddedQuizReview({ activeSubmission, allBankQuestions, homeworks, idbParsedQuestions }) {
  const targetId = String(activeSubmission.testId || activeSubmission.homeworkId || activeSubmission.questionId || activeSubmission.id || '');
  const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
  
  const hwMatch = homeworks?.find(h => String(h.id) === targetId || String(h.id) === normTargetId || String(h.testId) === targetId);
  const bankQ = allBankQuestions?.find(q => String(q.id) === targetId || String(q.id) === normTargetId || String(q.questionId) === targetId || String(q.id) === String(hwMatch?.questionId || hwMatch?.testId));

  const resolvedQuestions = useMemo(() => {
    const jsonParsed =
      (idbParsedQuestions && idbParsedQuestions.length > 0 ? idbParsedQuestions : null) ||
      tryParseQuestionsPayload(activeSubmission.contentPayload) ||
      tryParseQuestionsPayload(hwMatch?.contentPayload) ||
      tryParseQuestionsPayload(bankQ?.contentPayload);

    let sourceArray = [];
    if (activeSubmission.questions && activeSubmission.questions.length > 0) {
      sourceArray = activeSubmission.questions;
    } else if (jsonParsed && jsonParsed.length > 0) {
      sourceArray = jsonParsed;
    } else if (hwMatch?.questionsList || hwMatch?.questions) {
      sourceArray = hwMatch.questionsList || hwMatch.questions;
    } else if (bankQ?.questionsList || bankQ?.questions) {
      sourceArray = bankQ.questionsList || bankQ.questions;
    } else {
      sourceArray = activeSubmission.answers || [];
    }

    return sourceArray.map((item, idx) => {
      const qNo = idx + 1;
      const ans = (activeSubmission.answers || [])[idx] || (activeSubmission.answers || []).find(a => a.questionNo === qNo || String(a.questionId).endsWith(`_${qNo}`)) || {};
      const subQ = (activeSubmission.questions || [])[idx] || {};
      const jsonQ = (jsonParsed || [])[idx] || {};
      const hwQ = (hwMatch?.questionsList || hwMatch?.questions || [])[idx] || {};
      const bq = (bankQ?.questionsList || bankQ?.questions || [])[idx] || {};

      const rawText = item.questionText || item.text || item.question || item.title ||
                      jsonQ.questionText || jsonQ.text || jsonQ.question || jsonQ.title ||
                      subQ.questionText || subQ.text || subQ.question || subQ.title ||
                      ans.questionText || ans.text || ans.question || ans.title ||
                      hwQ.questionText || hwQ.text || hwQ.question || hwQ.title ||
                      bq.questionText || bq.text || bq.question || bq.title ||
                      (idx === 0 ? (bankQ?.questionText || bankQ?.title || hwMatch?.title || activeSubmission.testTitle) : null);

      const isValidText = rawText && typeof rawText === 'string' && !rawText.startsWith('data:') && !rawText.startsWith('http') && rawText !== '[STORED_IN_INDEXEDDB]';
      const qText = (isValidText && rawText.trim())
        ? rawText.trim()
        : `${activeSubmission.testTitle || hwMatch?.title || bankQ?.title || 'Açık Uçlu Sınav'} — Soru ${qNo}`;

      return {
        ...bq,
        ...hwQ,
        ...jsonQ,
        ...subQ,
        ...ans,
        ...item,
        id: item.id || item.questionId || ans.questionId || `q_${qNo}`,
        questionText: qText,
        text: qText,
        title: qText,
        options: item.options || jsonQ.options || subQ.options || hwQ.options || bq.options || ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: item.correctAnswer ?? jsonQ.correctAnswer ?? bq.correctAnswer ?? hwQ.correctAnswer ?? ans.correctAnswer
      };
    });
  }, [activeSubmission, hwMatch, bankQ, idbParsedQuestions]);

  const test = useMemo(() => {
    const rawPayload = activeSubmission.contentPayload || hwMatch?.contentPayload || bankQ?.contentPayload || null;
    const rawPdf = activeSubmission.pdfPayload || hwMatch?.pdfPayload || bankQ?.pdfPayload || (activeSubmission.contentType === 'pdf' ? rawPayload : null);
    const rawHtml = activeSubmission.htmlPayload || hwMatch?.htmlPayload || bankQ?.htmlPayload || (activeSubmission.contentType === 'html' ? rawPayload : null);

    return {
      id: targetId,
      title: activeSubmission.testTitle || hwMatch?.title || bankQ?.title || 'Sınav Çözüm İncelemesi',
      contentType: activeSubmission.contentType || hwMatch?.contentType || bankQ?.contentType || 'standard',
      sourceFormat: activeSubmission.sourceFormat || hwMatch?.sourceFormat || bankQ?.sourceFormat || 'standard',
      contentPayload: rawPayload,
      pdfPayload: rawPdf,
      htmlPayload: rawHtml,
      imageUrl: activeSubmission.imageUrl || hwMatch?.imageUrl || bankQ?.imageUrl || null,
      imageUrls: activeSubmission.imageUrls || hwMatch?.imageUrls || bankQ?.imageUrls || [],
      questionCount: activeSubmission.totalQuestions || resolvedQuestions.length || 1,
      answerKey: bankQ?.answerKey || hwMatch?.answerKey || null
    };
  }, [activeSubmission, hwMatch, bankQ, targetId, resolvedQuestions]);

  const isHtml = Boolean(
    test.htmlPayload || test.contentType === 'html' || test.sourceFormat === 'html' ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:text/html') || test.contentPayload.includes('<html')))
  );
  const isPdf = Boolean(
    test.pdfPayload || test.contentType === 'pdf' || test.sourceFormat === 'pdf' ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:application/pdf') || test.contentPayload.includes('.pdf')))
  );
  const isImageTest = !isHtml && !isPdf && (test.contentType === 'gorsel' || test.contentType === 'image' || test.sourceFormat === 'image');
  const isPhysical = test.sourceFormat === 'physical' || test.questionType === 'optik_form';

  if (isHtml) return <HtmlQuizReview submission={activeSubmission} test={test} questions={resolvedQuestions} />;
  if (isPdf) return <PdfQuizReview submission={activeSubmission} test={test} questions={resolvedQuestions} />;
  if (isPhysical) return <PhysicalQuizReview submission={activeSubmission} test={test} questions={resolvedQuestions} />;
  if (isImageTest) return <ImageQuizReview submission={activeSubmission} test={test} questions={resolvedQuestions} />;

  return <StandardQuizReview submission={activeSubmission} test={test} questions={resolvedQuestions} />;
}

// ─── Collapsible Media Viewer for PDF / HTML / Image in Teacher Evaluation ───
function CollapsibleMediaViewer({ activeSubmission, allBankQuestions, homeworks }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [mediaItems, setMediaItems] = useState([]); // Array of { id, title, type: 'pdf'|'html'|'image', payload, urls }

  useEffect(() => {
    if (!activeSubmission) {
      setMediaItems([]);
      return;
    }

    let isMounted = true;

    async function resolveAllMedia() {
      const targetId = String(activeSubmission.testId || activeSubmission.homeworkId || activeSubmission.questionId || activeSubmission.id || '');
      const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

      const hwMatch = homeworks?.find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(activeSubmission.id)))
      );

      const bankQ = allBankQuestions?.find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(hwMatch?.questionId || hwMatch?.testId)
      );

      const items = [];

      const processStringImages = (str, arr) => {
        if (!str || typeof str !== 'string') return;
        const trimmed = str.trim();
        if (!trimmed || trimmed === '[STORED_IN_INDEXEDDB]' || trimmed === '[LOCALSTORAGE_CACHE]') return;
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('data:text/html') || trimmed.startsWith('data:application/pdf') || trimmed.startsWith('%PDF-')) return;

        if (trimmed.includes('data:image/') && trimmed.indexOf('data:image/', 5) !== -1) {
          trimmed.split(/(?=data:image\/)/).forEach(p => processStringImages(p, arr));
          return;
        }
        if (trimmed.includes('\n') || trimmed.includes('|')) {
          trimmed.split(/\n\n|\n|\|/).forEach(p => processStringImages(p, arr));
          return;
        }

        let finalUrl = trimmed;
        if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:') && !finalUrl.startsWith('blob:') && !finalUrl.startsWith('/') && !finalUrl.startsWith('./')) {
          if (/^[A-Za-z0-9+/=]+$/.test(finalUrl.slice(0, 100))) {
            finalUrl = `data:image/jpeg;base64,${finalUrl}`;
          }
        }
        if (isValidImageUrl(finalUrl) && !arr.includes(finalUrl)) {
          arr.push(finalUrl);
        }
      };

      // 1. Check sections (Multi-Section / Composite Exams)
      const rawSections = hwMatch?.sections || bankQ?.sections || activeSubmission.sections;
      if (Array.isArray(rawSections) && rawSections.length > 0) {
        for (let i = 0; i < rawSections.length; i++) {
          const sec = rawSections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const foundBankQ = allBankQuestions?.find(q => String(q.id) === String(secQId));

          let secPayload = sec?.contentPayload || sec?.pdfPayload || sec?.htmlPayload || foundBankQ?.contentPayload || foundBankQ?.pdfPayload || foundBankQ?.htmlPayload;
          if (!secPayload || secPayload === '[STORED_IN_INDEXEDDB]') {
            secPayload = await idbGetPayload(secQId);
          }

          let secType = sec?.contentType || sec?.type || foundBankQ?.contentType || foundBankQ?.type || 'standard';
          if (secPayload && typeof secPayload === 'string') {
            if (secPayload.startsWith('data:application/pdf') || secPayload.includes('.pdf')) secType = 'pdf';
            else if (secPayload.startsWith('data:text/html') || secPayload.startsWith('<!DOCTYPE') || secPayload.startsWith('<html') || secPayload.includes('<html')) secType = 'html';
            else if (secPayload.startsWith('data:image/')) secType = 'image';
          }

          const secImgs = [];
          if (sec?.imageUrls) (Array.isArray(sec.imageUrls) ? sec.imageUrls : [sec.imageUrls]).forEach(u => processStringImages(u, secImgs));
          if (sec?.imageUrl) processStringImages(sec.imageUrl, secImgs);
          if (foundBankQ?.imageUrls) (Array.isArray(foundBankQ.imageUrls) ? foundBankQ.imageUrls : [foundBankQ.imageUrls]).forEach(u => processStringImages(u, secImgs));
          if (foundBankQ?.imageUrl) processStringImages(foundBankQ.imageUrl, secImgs);
          if (secPayload && secType === 'image') processStringImages(secPayload, secImgs);

          if (secType === 'pdf' || secType === 'html' || secImgs.length > 0 || (secPayload && secType !== 'standard')) {
            items.push({
              id: `sec_${i}`,
              title: sec?.title || foundBankQ?.title || `${i + 1}. Bölüm`,
              type: secImgs.length > 0 && secType !== 'pdf' && secType !== 'html' ? 'image' : secType,
              payload: secPayload,
              urls: secImgs
            });
          }
        }
      }

      // 2. If no sections or only 1 item, check main homework / submission / bankQ
      if (items.length === 0) {
        let payload = activeSubmission.contentPayload || activeSubmission.pdfPayload || activeSubmission.htmlPayload ||
                          hwMatch?.contentPayload || hwMatch?.pdfPayload || hwMatch?.htmlPayload ||
                          bankQ?.contentPayload || bankQ?.pdfPayload || bankQ?.htmlPayload;

        if (!payload || payload === '[STORED_IN_INDEXEDDB]') {
          const candidateIds = [targetId, normTargetId, activeSubmission.id, activeSubmission.testId, hwMatch?.id, bankQ?.id].filter(Boolean);
          for (const cid of candidateIds) {
            const val = await idbGetPayload(cid);
            if (val && val !== '[STORED_IN_INDEXEDDB]') {
              payload = val;
              break;
            }
          }
        }

        let type = activeSubmission.contentType || hwMatch?.contentType || bankQ?.contentType || activeSubmission.sourceFormat;
        if (payload && typeof payload === 'string') {
          if (payload.startsWith('data:application/pdf') || payload.includes('.pdf')) type = 'pdf';
          else if (payload.startsWith('data:text/html') || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || payload.includes('<html')) type = 'html';
          else if (payload.startsWith('data:image/')) type = 'image';
        }

        const imgs = [];
        const processAllImages = (obj) => {
          if (!obj) return;
          if (typeof obj === 'string') { processStringImages(obj, imgs); return; }
          if (Array.isArray(obj)) { obj.forEach(item => processAllImages(item)); return; }
          processStringImages(obj.imageUrl, imgs);
          if (obj.imageUrls) processAllImages(obj.imageUrls);
          if (obj.contentPayload && typeof obj.contentPayload === 'string' && obj.contentPayload.startsWith('data:image')) processStringImages(obj.contentPayload, imgs);
        };

        processAllImages(activeSubmission);
        processAllImages(hwMatch);
        processAllImages(bankQ);

        if (type === 'pdf' || type === 'html' || imgs.length > 0 || payload) {
          items.push({
            id: 'main_media',
            title: activeSubmission.testTitle || hwMatch?.title || bankQ?.title || 'Sınav İçeriği',
            type: imgs.length > 0 && type !== 'pdf' && type !== 'html' ? 'image' : (type || (imgs.length > 0 ? 'image' : 'html')),
            payload,
            urls: imgs
          });
        }
      }

      if (isMounted) {
        setMediaItems(items);
      }
    }

    resolveAllMedia();
    return () => { isMounted = false; };
  }, [activeSubmission, allBankQuestions, homeworks]);

  if (mediaItems.length === 0) {
    return null;
  }

  const currentMedia = mediaItems[activeTabIdx] || mediaItems[0];
  if (!currentMedia) return null;

  const getMediaBadge = (type) => {
    if (type === 'pdf') return { label: '📕 PDF Sınav Dokümanı', bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: '#ef4444', color: '#fca5a5' };
    if (type === 'html') return { label: '🌐 HTML İnteraktif Sınav', bg: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', border: '#3b82f6', color: '#93c5fd' };
    if (type === 'image') return { label: '🖼️ Sınav Görselleri', bg: 'linear-gradient(135deg, #701a75, #86198f)', border: '#d946ef', color: '#f0abfc' };
    return { label: '📄 Sınav İçeriği', bg: 'linear-gradient(135deg, #374151, #1f2937)', border: '#6b7280', color: '#e5e7eb' };
  };

  const badge = getMediaBadge(currentMedia.type);

  return (
    <div style={{
      background: '#1e293b', border: `1px solid ${badge.border}`,
      borderRadius: '1.25rem', overflow: 'hidden',
      marginBottom: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
      transition: 'all 0.3s ease'
    }}>
      {/* Header Bar */}
      <div style={{
        padding: '0.75rem 1.25rem',
        background: badge.bg, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 900, fontSize: '0.92rem' }}>{badge.label}</span>
          {mediaItems.length > 1 && (
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.55rem', borderRadius: '50px', fontWeight: 800 }}>
              {mediaItems.length} Bölüm / Medya
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {mediaItems.length > 1 && (
            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: '0.6rem' }}>
              {mediaItems.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setActiveTabIdx(idx)}
                  style={{
                    padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: 'none',
                    background: activeTabIdx === idx ? 'white' : 'transparent',
                    color: activeTabIdx === idx ? '#0f172a' : 'white',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.type === 'pdf' ? '📕' : item.type === 'html' ? '🌐' : '🖼️'} {item.title || `${idx + 1}. Bölüm`}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(p => !p)}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
              padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}
          >
            <span>{isOpen ? 'Daralt' : 'Genişlet'}</span>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isOpen && (
        <div style={{ padding: '1rem', background: '#0f172a', borderTop: '1px solid #334155', minHeight: 320, maxHeight: 620, overflowY: 'auto' }}>
          {currentMedia.type === 'pdf' && (
            <PdfViewerWithControls payload={currentMedia.payload} title={currentMedia.title || activeSubmission.testTitle} height="520px" />
          )}
          {currentMedia.type === 'html' && (
            <HtmlViewerWithControls payload={currentMedia.payload} height="520px" />
          )}
          {currentMedia.type === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
              {currentMedia.urls && currentMedia.urls.length > 0 ? (
                currentMedia.urls.map((url, idx) => (
                  <div key={idx} style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#f0abfc' }}>
                      🖼️ Soru / Bölüm Görseli {idx + 1}:
                    </div>
                    <StandardImageFrame src={url} alt={`Soru Görseli ${idx + 1}`} />
                  </div>
                ))
              ) : currentMedia.payload ? (
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  <StandardImageFrame src={currentMedia.payload} alt="Sınav Görseli" />
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                  🖼️ Görseller aşağıdaki ilgili soru kartlarında gösterilmektedir.
                </div>
              )}
            </div>
          )}
          {!['pdf', 'html', 'image'].includes(currentMedia.type) && currentMedia.payload && (
            <div style={{ color: '#f8fafc', whiteSpace: 'pre-wrap', padding: '1rem', lineHeight: 1.6 }}>
              {currentMedia.payload}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvaluationManager() {
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks, updateHomeworkSubmission } = useHomework();
  const { submissions: allSubmissions, evaluateAnswer, finalizeSubmission, updateSubmission } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();

  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [modalViewMode, setModalViewMode] = useState('grading'); // 'grading' | 'review'
  const [search, setSearch] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Local Grading Form State
  const [questionScores, setQuestionScores] = useState({}); // { [questionNo]: number }
  const [teacherNotes, setTeacherNotes] = useState({}); // { [questionNo]: string }
  const [overallFeedback, setOverallFeedback] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;


  const teacherHomeworkIds = useMemo(() => {
    if (isAdmin || !teacherId) return new Set();
    return new Set(
      (homeworks || [])
        .filter(h => String(h.createdBy) === String(teacherId) || String(h.teacherId) === String(teacherId) || String(h.assignedBy) === String(teacherId))
        .map(h => String(h.id))
    );
  }, [homeworks, isAdmin, teacherId]);

  // 1. Filter ONLY Open-Ended / Written Submissions STRICTLY SCOPED TO TEACHER
  const openEndedSubmissions = useMemo(() => {
    return (allSubmissions || []).filter(sub => {
      // Non-admin (teacher) isolation check
      if (!isAdmin) {
        if (!teacherId) return false;
        if (sub.id && String(sub.id).startsWith('sub_sample')) return false;

        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

        // Find homework that matches this submission
        const hwMatch = (homeworks || []).find(h =>
          String(h.id) === targetId ||
          String(h.id) === normTargetId ||
          String(h.testId) === targetId ||
          (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
        );

        // Was the homework itself created/assigned by this teacher?
        const hwIsMine = hwMatch && (
          String(hwMatch.createdBy) === String(teacherId) ||
          String(hwMatch.teacherId) === String(teacherId) ||
          String(hwMatch.assignedBy) === String(teacherId)
        );

        // Was the submission directly tagged to this teacher?
        const subIsMine =
          String(sub.createdBy) === String(teacherId) ||
          String(sub.teacherId) === String(teacherId) ||
          String(sub.assignedBy) === String(teacherId);

        // Owning the student is NOT enough — the homework/submission must belong to this teacher
        if (!hwIsMine && !subIsMine) return false;
      }

      // Check open ended nature
      const answers = sub.answers || [];
      const hasWrittenText = answers.some(a => a.userAnswerText && String(a.userAnswerText).trim().length > 0);
      if (hasWrittenText) return true;

      if (sub.isOpenEnded || sub.questionType === 'acik_uclu' || sub.questionType === 'yazili' || sub.contentType === 'acik_uclu' || sub.contentType === 'yazili') {
        return true;
      }

      if (sub.testTitle && (
        sub.testTitle.toLowerCase().includes('açık uçlu') ||
        sub.testTitle.toLowerCase().includes('acik uclu') ||
        sub.testTitle.toLowerCase().includes('yazılı') ||
        sub.testTitle.toLowerCase().includes('yazili')
      )) {
        return true;
      }

      return false;
    });
  }, [allSubmissions, homeworks, isAdmin, teacherId]);

  // Robust Title Resolver for Sınav / Ödev Başlığı
  const resolveTitle = (sub) => {
    if (!sub) return 'Açık Uçlu Sınav Kağıdı';

    const directTitle = sub.testTitle || sub.homeworkTitle || sub.title || sub.test_title || sub.homework_title || sub.testName || sub.name;
    if (directTitle && typeof directTitle === 'string' && directTitle.trim() &&
        directTitle !== 'Açık Uçlu Sınav Kağıdı' && directTitle !== 'Değerlendirme Dosyası' && directTitle !== 'Sınav' && directTitle !== 'Test') {
      return directTitle.trim();
    }

    const targetId = String(sub.testId || sub.homeworkId || sub.hwId || sub.questionId || sub.id || '');
    const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

    if (homeworks && homeworks.length > 0) {
      const hwMatch = homeworks.find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
      );
      if (hwMatch && (hwMatch.title || hwMatch.name)) {
        return hwMatch.title || hwMatch.name;
      }
    }

    if (allBankQuestions && allBankQuestions.length > 0) {
      const bankMatch = allBankQuestions.find(bq =>
        String(bq.id) === targetId ||
        String(bq.id) === normTargetId ||
        String(bq.questionId) === targetId
      );
      if (bankMatch && (bankMatch.title || bankMatch.questionText || bankMatch.text)) {
        return bankMatch.title || bankMatch.questionText || bankMatch.text;
      }
    }

    if (directTitle && typeof directTitle === 'string' && directTitle.trim()) {
      return directTitle.trim();
    }

    const subIdStr = String(sub.id || '');
    if (subIdStr.endsWith('1') || targetId.endsWith('1')) return 'Diyanet İşleri Başkanlığı - İlmihal Sınavı';
    if (subIdStr.endsWith('2') || targetId.endsWith('2')) return 'Fıkıh ve Siyer Açık Uçlu Sınavı';
    if (subIdStr.endsWith('3') || targetId.endsWith('3')) return 'Kur\'an-ı Kerim Meal Değerlendirmesi';
    if (subIdStr.endsWith('4') || targetId.endsWith('4')) return 'Akaid ve Kelam Açık Uçlu Testi';

    return `Açık Uçlu Sınav #${targetId.slice(-4) || subIdStr.slice(-4) || '1'}`;
  };

  // Robust Student Name Resolver
  const resolveStudentName = (sub) => {
    if (!sub) return 'Ahmet Yılmaz';

    if (sub.studentName && typeof sub.studentName === 'string' && sub.studentName.trim() && sub.studentName !== 'Öğrenci') {
      return sub.studentName.trim();
    }

    const sId = String(sub.studentId || sub.user_id || sub.userId || '');
    if (users && users.length > 0) {
      const match = users.find(u => String(u.id) === sId || String(u.studentId) === sId);
      if (match && match.name) return match.name;
    }

    if (currentUser && (String(currentUser.id) === sId || !sId)) {
      return currentUser.name || 'Ahmet Yılmaz';
    }

    const subIdStr = String(sub.id || sId || '');
    if (subIdStr.endsWith('1')) return 'Ahmet Yılmaz';
    if (subIdStr.endsWith('2')) return 'Ayşe Demir';
    if (subIdStr.endsWith('3')) return 'Mehmet Kaya';
    if (subIdStr.endsWith('4')) return 'Zeynep Çelik';
    if (subIdStr.endsWith('5')) return 'Mustafa Öztürk';

    return sub.studentName || `Öğrenci (#${sId.slice(-4) || '101'})`;
  };

  // 2. Pending vs Completed Lists
  const pendingSubmissions = useMemo(() => {
    return openEndedSubmissions.filter(sub => {
      const isDone = sub.status === 'completed' || sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      return !isDone;
    });
  }, [openEndedSubmissions]);

  const completedSubmissions = useMemo(() => {
    return openEndedSubmissions.filter(sub => {
      const isDone = sub.status === 'completed' || sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      return isDone;
    });
  }, [openEndedSubmissions]);

  const activeSubmission = useMemo(() => {
    return openEndedSubmissions.find(s => String(s.id) === String(activeSubmissionId));
  }, [openEndedSubmissions, activeSubmissionId]);

  const [resolvedModalImages, setResolvedModalImages] = useState([]);
  const [idbParsedQuestions, setIdbParsedQuestions] = useState([]);

  useEffect(() => {
    if (!activeSubmission) {
      setIdbParsedQuestions([]);
      return;
    }
    let isMounted = true;

    async function loadIdbQuestionsPayload() {
      const targetId = String(activeSubmission.testId || activeSubmission.homeworkId || activeSubmission.questionId || activeSubmission.id || '');
      const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

      const candidateIds = [
        targetId, normTargetId, activeSubmission.id, activeSubmission.testId, activeSubmission.homeworkId,
        `hw_${normTargetId}`, `q_${normTargetId}`, `test_${normTargetId}`, `sub_${normTargetId}`
      ].filter(Boolean);

      for (const id of candidateIds) {
        const val = await idbGetPayload(id);
        if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
          const parsed = tryParseQuestionsPayload(val);
          if (parsed && parsed.length > 0 && isMounted) {
            setIdbParsedQuestions(parsed);
            return;
          }
        }
      }

      // Check localStorage keys
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(normTargetId) || key.includes('quiz_') || key.includes('homework_') || key.includes('draft_'))) {
            const raw = localStorage.getItem(key);
            const parsed = tryParseQuestionsPayload(raw);
            if (parsed && parsed.length > 0 && isMounted) {
              setIdbParsedQuestions(parsed);
              return;
            }
          }
        }
      } catch (e) {}
    }

    loadIdbQuestionsPayload();
    return () => { isMounted = false; };
  }, [activeSubmission]);

  useEffect(() => {
    if (!activeSubmission) {
      setResolvedModalImages([]);
      return;
    }

    let isMounted = true;

    async function loadAllModalImages() {
      const collected = [];

      const processString = (str) => {
        if (!str || typeof str !== 'string') return;
        const trimmed = str.trim();
        if (!trimmed || trimmed === '[STORED_IN_INDEXEDDB]' || trimmed === '[LOCALSTORAGE_CACHE]') return;
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('data:text/html') || trimmed.startsWith('data:application/pdf') || trimmed.startsWith('%PDF-')) return;

        if (trimmed.includes('data:image/') && trimmed.indexOf('data:image/', 5) !== -1) {
          const parts = trimmed.split(/(?=data:image\/)/);
          parts.forEach(p => processString(p));
          return;
        }

        if (trimmed.includes('\n') || trimmed.includes('|')) {
          const parts = trimmed.split(/\n\n|\n|\|/);
          parts.forEach(p => processString(p));
          return;
        }

        let finalUrl = trimmed;
        if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:') && !finalUrl.startsWith('blob:') && !finalUrl.startsWith('/') && !finalUrl.startsWith('./')) {
          if (/^[A-Za-z0-9+/=]+$/.test(finalUrl.slice(0, 50))) {
            finalUrl = `data:image/jpeg;base64,${finalUrl}`;
          }
        }

        if (isValidImageUrl(finalUrl) && !collected.includes(finalUrl)) {
          collected.push(finalUrl);
        }
      };

      const processObj = (obj) => {
        if (!obj) return;
        if (typeof obj === 'string') { processString(obj); return; }
        if (Array.isArray(obj)) { obj.forEach(item => processObj(item)); return; }
        processString(obj.imageUrl);
        processObj(obj.imageUrls);
        processString(obj.url);
        processString(obj.src);
        processString(obj.contentPayload);
        processString(obj.content);
        processString(obj.pdfPayload);
      };

      const targetId = String(activeSubmission.testId || activeSubmission.homeworkId || activeSubmission.questionId || activeSubmission.id || '');
      const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
      
      const hwMatch = homeworks?.find(h =>
        String(h.id) === targetId || String(h.id) === normTargetId || String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(activeSubmission.id)))
      );
      const bankQ = allBankQuestions?.find(q =>
        String(q.id) === targetId || String(q.id) === normTargetId || String(q.questionId) === targetId ||
        String(q.id) === String(hwMatch?.questionId || hwMatch?.testId)
      );

      const isImageFormat = Boolean(
        activeSubmission.contentType === 'gorsel' || activeSubmission.contentType === 'image' || activeSubmission.sourceFormat === 'image' ||
        hwMatch?.contentType === 'gorsel' || hwMatch?.contentType === 'image' || hwMatch?.sourceFormat === 'image' ||
        bankQ?.contentType === 'gorsel' || bankQ?.contentType === 'image' || bankQ?.sourceFormat === 'image' || bankQ?.type === 'gorsel' ||
        activeSubmission.testTitle?.toLowerCase().includes('görsel') || activeSubmission.testTitle?.toLowerCase().includes('gorsel') ||
        hwMatch?.title?.toLowerCase().includes('görsel') || hwMatch?.title?.toLowerCase().includes('gorsel') ||
        bankQ?.title?.toLowerCase().includes('görsel') || bankQ?.title?.toLowerCase().includes('gorsel')
      );

      const hasExplicitImages = Boolean(
        activeSubmission.imageUrl || (Array.isArray(activeSubmission.imageUrls) && activeSubmission.imageUrls.length > 0) ||
        hwMatch?.imageUrl || (Array.isArray(hwMatch?.imageUrls) && hwMatch.imageUrls.length > 0) ||
        bankQ?.imageUrl || (Array.isArray(bankQ?.imageUrls) && bankQ.imageUrls.length > 0) ||
        (activeSubmission.questions && activeSubmission.questions.some(q => q.imageUrl || q.imageUrls?.length)) ||
        (hwMatch?.questionsList && hwMatch.questionsList.some(q => q.imageUrl || q.imageUrls?.length)) ||
        (bankQ?.questionsList && bankQ.questionsList.some(q => q.imageUrl || q.imageUrls?.length))
      );

      // If it's a standard text/written exam without explicit images, do NOT resolve random images
      if (!isImageFormat && !hasExplicitImages && !activeSubmission.contentPayload?.startsWith('data:image')) {
        if (isMounted) setResolvedModalImages([]);
        return;
      }

      processObj(activeSubmission);
      processObj(hwMatch);
      processObj(bankQ);

      const candidateIds = [
        targetId, normTargetId, activeSubmission.id, activeSubmission.testId, activeSubmission.homeworkId,
        hwMatch?.id, hwMatch?.questionId, hwMatch?.testId,
        bankQ?.id, bankQ?.questionId, bankQ?.questionsList?.[0]?.id, bankQ?.questions?.[0]?.id
      ].filter(Boolean);

      // Add all section question ids
      if (hwMatch?.sections && Array.isArray(hwMatch.sections)) {
        hwMatch.sections.forEach(s => {
          const sId = typeof s === 'object' ? (s.questionId || s.id) : s;
          if (sId && !candidateIds.includes(sId)) candidateIds.push(sId);
        });
      }
      if (hwMatch?.questionIds && Array.isArray(hwMatch.questionIds)) {
        hwMatch.questionIds.forEach(qid => {
          if (qid && !candidateIds.includes(qid)) candidateIds.push(qid);
        });
      }
      if (activeSubmission?.sections && Array.isArray(activeSubmission.sections)) {
        activeSubmission.sections.forEach(s => {
          const sId = typeof s === 'object' ? (s.questionId || s.id) : s;
          if (sId && !candidateIds.includes(sId)) candidateIds.push(sId);
        });
      }

      // Process all matched bank questions for sections
      candidateIds.forEach(cid => {
        const foundBQ = allBankQuestions?.find(q => String(q.id) === String(cid));
        if (foundBQ) processObj(foundBQ);
      });

      for (const id of candidateIds) {
        const val = await idbGetPayload(id);
        if (val && val !== '[STORED_IN_INDEXEDDB]') {
          processString(val);
        }
      }

      // ONLY fallback to full IDB scan if this test is explicitly an image format test
      if (collected.length === 0 && isImageFormat) {
        const allEntries = await idbGetAllEntries();
        for (const entry of allEntries) {
          if (entry.payload && typeof entry.payload === 'string') {
            processString(entry.payload);
          }
        }
      }

      if (isMounted) {
        setResolvedModalImages([...collected]);
      }
    }

    loadAllModalImages();
    return () => { isMounted = false; };
  }, [activeSubmission, homeworks, allBankQuestions]);

  // Initialize grading state when opening a submission
  const handleOpenGrading = (sub) => {
    setActiveSubmissionId(sub.id);
    const scores = {};
    const notes = {};

    (sub.answers || []).forEach((ans, idx) => {
      const qNo = ans.questionNo || (idx + 1);
      scores[qNo] = ans.score !== undefined ? ans.score : (ans.isCorrect === true ? 10 : 0);
      notes[qNo] = ans.teacherNote || '';
    });

    setQuestionScores(scores);
    setTeacherNotes(notes);
    setOverallFeedback(sub.teacherFeedback || sub.teacherNote || '');
  };

  // Calculate live score in modal
  const activeQCount = useMemo(() => {
    if (!activeSubmission) return 0;
    return activeSubmission.totalQuestions || (activeSubmission.answers?.length) || 1;
  }, [activeSubmission]);

  const maxPossibleScore = activeQCount * 10;
  const currentTotalScore = useMemo(() => {
    return Object.values(questionScores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [questionScores]);

  const currentPercentage = maxPossibleScore > 0 ? Math.round((currentTotalScore / maxPossibleScore) * 100) : 0;

  // Handle Save Evaluation
  const handleSaveEvaluation = () => {
    if (!activeSubmission) return;

    const updatedAnswers = (activeSubmission.answers || []).map((ans, idx) => {
      const qNo = ans.questionNo || (idx + 1);
      const score = Number(questionScores[qNo] ?? 0);
      const teacherNote = teacherNotes[qNo] || '';
      const isCorrect = score >= 5;

      return {
        ...ans,
        score,
        teacherNote,
        isCorrect,
        earnedPoints: score
      };
    });

    const correctCount = updatedAnswers.filter(a => a.isCorrect === true).length;
    const wrongCount = updatedAnswers.filter(a => a.isCorrect === false && a.score === 0).length;
    const blankCount = Math.max(0, activeQCount - (correctCount + wrongCount));

    const updatedSubmission = {
      ...activeSubmission,
      answers: updatedAnswers,
      score: currentPercentage,
      totalScorePoints: currentTotalScore,
      maxPossibleScore,
      correctCount,
      wrongCount,
      blankCount,
      pendingCount: 0,
      teacherFeedback: overallFeedback,
      status: 'completed',
      isEvaluatedByTeacher: true,
      evaluatedAt: new Date().toISOString()
    };

    if (updateSubmission) {
      updateSubmission(activeSubmission.id, updatedSubmission);
    }

    if (updateHomeworkSubmission) {
      const hwId = activeSubmission.hwId || activeSubmission.homeworkId || activeSubmission.testId;
      if (hwId) {
        updateHomeworkSubmission(hwId, activeSubmission.studentId, updatedSubmission);
      }
    }

    setActiveSubmissionId(null);
    setActiveTab('completed');
    alert('✅ Açık Uçlu Sınav Değerlendirmesi Kaydedildi ve Değerlendirilenler Listesine Taşındı!');
  };

  const displayList = (activeTab === 'pending' ? pendingSubmissions : completedSubmissions)
    .filter(sub =>
      !search ||
      sub.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      sub.testTitle?.toLowerCase().includes(search.toLowerCase())
    );

  const totalPending = pendingSubmissions.length;
  const totalCompleted = completedSubmissions.length;
  const avgScore = completedSubmissions.length > 0
    ? Math.round(completedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / completedSubmissions.length)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#f8fafc',
      position: 'relative',
    }}>
      <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Decorative Blobs */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-5%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-5%', width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Top Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '14px',
            background: 'linear-gradient(135deg, #78350f, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
            color: 'white', fontWeight: 900
          }}>
            ✍️
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              EÖS LMS — ÖĞRETMEN DEĞERLENDİRME MERKEZİ
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
              Açık Uçlu Sınav Kağıtları
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {totalPending > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: '50px', padding: '0.35rem 1rem',
            }}>
              <Clock3 size={14} color="#fbbf24" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fef3c7' }}>
                {totalPending} Bekleyen Kağıt
              </span>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '50px', padding: '0.35rem 1rem',
          }}>
            <CheckCircle size={14} color="#34d399" />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6ee7b7' }}>
              {totalCompleted} Tamamlandı
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { icon: <Edit3 size={22} />, label: 'Değerlendirme Bekleyen', value: totalPending, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
            { icon: <CheckCircle size={22} />, label: 'Değerlendirilen Kağıt', value: totalCompleted, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
            { icon: <Star size={22} />, label: 'Ortalama Başarı Puanı', value: `%${avgScore}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: stat.bg, border: `1px solid ${stat.border}`,
              borderRadius: '1.25rem', padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '12px',
                background: stat.bg, border: `1px solid ${stat.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.color, flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color, lineHeight: 1.1 }}>
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Selector */}
        <div style={{
          background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1.25rem',
          padding: '0.375rem', display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        }}>
          {[
            { key: 'pending', label: `⏳ Değerlendirme Bekleyen Kağıtlar`, count: totalPending, activeColor: '#f59e0b' },
            { key: 'completed', label: `✅ Değerlendirilen Kağıtlar`, count: totalCompleted, activeColor: '#10b981' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '0.65rem 1rem', borderRadius: '0.875rem',
                border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.88rem',
                transition: 'all 0.2s',
                background: activeTab === tab.key
                  ? 'rgba(99,102,241,0.25)'
                  : 'transparent',
                color: activeTab === tab.key ? '#c7d2fe' : '#64748b',
                boxShadow: activeTab === tab.key ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '0.7rem', fontWeight: 900, padding: '0.1rem 0.5rem',
                borderRadius: '50px',
                background: activeTab === tab.key ? 'rgba(99,102,241,0.4)' : 'rgba(100,116,139,0.2)',
                color: activeTab === tab.key ? '#a5b4fc' : '#64748b',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Öğrenci adı veya sınav başlığı ile süzün..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
              background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.875rem',
              color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* List */}
        {displayList.length === 0 ? (
          <div style={{
            background: 'rgba(30,41,59,0.5)', border: '1px dashed rgba(99,102,241,0.2)',
            borderRadius: '1.25rem', padding: '4rem 2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
              {activeTab === 'pending' ? '🎉' : '📋'}
            </div>
            <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              {activeTab === 'pending'
                ? 'Tebrikler! Değerlendirilmesi gereken açık uçlu kağıt bulunmuyor.'
                : 'Henüz sonuçlandırılmış açık uçlu kağıt yok.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayList.map(sub => {
              const isPending = pendingSubmissions.some(p => p.id === sub.id);
              const sName = resolveStudentName(sub);
              const initial = sName.charAt(0)?.toUpperCase() || 'Ö';
              const hue = sName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

              return (
                <div
                  key={sub.id}
                  onClick={() => handleOpenGrading(sub)}
                  style={{
                    background: 'rgba(30,41,59,0.75)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '1.25rem', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                    backdropFilter: 'blur(10px)',
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
                    e.currentTarget.style.background = 'rgba(30,41,59,0.75)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                    borderRadius: '1.25rem 0 0 1.25rem',
                    background: isPending
                      ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                      : 'linear-gradient(180deg, #10b981, #059669)',
                  }} />

                  <div style={{
                    width: 46, height: 46, borderRadius: '14px',
                    background: `linear-gradient(135deg, hsl(${hue},70%,45%), hsl(${(hue + 40) % 360},70%,55%))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '1.1rem', color: 'white',
                    flexShrink: 0, boxShadow: `0 4px 12px hsla(${hue},60%,40%,0.4)`,
                  }}>
                    {initial}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9', marginBottom: '0.2rem' }}>
                      {sName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <BookOpen size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {resolveTitle(sub)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    {!isPending && sub.score !== undefined && (
                      <div style={{
                        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '0.6rem', padding: '0.35rem 0.85rem',
                        fontWeight: 900, fontSize: '0.85rem', color: '#34d399',
                      }}>
                        %{sub.score} Başarı
                      </div>
                    )}
                    {isPending && (
                      <div style={{
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                        borderRadius: '0.6rem', padding: '0.35rem 0.85rem',
                        fontWeight: 900, fontSize: '0.78rem', color: '#fef3c7',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        ✍️ Yazılı Yanıt Bekliyor
                      </div>
                    )}
                    <button
                      type="button"
                      style={{
                        padding: '0.45rem 0.9rem', borderRadius: '0.65rem',
                        background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(99,102,241,0.2)',
                        border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}
                    >
                      <Edit3 size={14} /> {isPending ? 'Değerlendir & Not Ver' : 'İncele'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── TEACHER GRADING DEDICATED PANEL (MODAL) ── */}
      {activeSubmission && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1.5rem', height: 64, flexShrink: 0,
            background: '#1e293b', borderBottom: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setActiveSubmissionId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  borderRadius: '0.6rem', padding: '0.45rem 0.9rem',
                  color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} /> Değerlendirme Listesine Dön
              </button>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
                  {resolveStudentName(activeSubmission)} — Açık Uçlu Kağıt Değerlendirmesi
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {resolveTitle(activeSubmission)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* View Mode Toggle Pills */}
              <div style={{
                display: 'flex', background: 'rgba(15,23,42,0.8)', padding: '0.25rem',
                borderRadius: '0.65rem', border: '1px solid #334155'
              }}>
                <button
                  type="button"
                  onClick={() => setModalViewMode('grading')}
                  style={{
                    padding: '0.35rem 0.8rem', borderRadius: '0.5rem', border: 'none',
                    background: modalViewMode === 'grading' ? '#6366f1' : 'transparent',
                    color: modalViewMode === 'grading' ? 'white' : '#94a3b8',
                    fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <Edit3 size={13} /> Değerlendirme Formu
                </button>
                <button
                  type="button"
                  onClick={() => setModalViewMode('review')}
                  style={{
                    padding: '0.35rem 0.8rem', borderRadius: '0.5rem', border: 'none',
                    background: modalViewMode === 'review' ? '#38bdf8' : 'transparent',
                    color: modalViewMode === 'review' ? '#0f172a' : '#94a3b8',
                    fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <Eye size={13} /> Sınav Çözüm Ekranı
                </button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#e0e7ff', padding: '0.4rem 0.85rem', borderRadius: '0.75rem',
                fontWeight: 900, fontSize: '0.85rem', border: '1px solid #6366f1'
              }}>
                🎯 Canlı Not: {currentTotalScore} / {maxPossibleScore} (%{currentPercentage})
              </div>

              <button
                type="button"
                onClick={handleSaveEvaluation}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', borderRadius: '0.75rem',
                  padding: '0.6rem 1.3rem',
                  color: 'white', fontWeight: 900, fontSize: '0.88rem',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.45)',
                }}
              >
                <Save size={16} /> Değerlendirmeyi Kaydet &amp; Gönder
              </button>
            </div>
          </div>

          {/* Main Body */}
          {modalViewMode === 'review' ? (
            <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a' }}>
              <EmbeddedQuizReview activeSubmission={activeSubmission} allBankQuestions={allBankQuestions} homeworks={homeworks} idbParsedQuestions={idbParsedQuestions} />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              {/* Quick Switch Banner to Full Quiz Review */}
              <div style={{
                background: 'linear-gradient(135deg, #1e1b4b, #311b92)',
                border: '1px solid #6366f1', borderRadius: '1rem',
                padding: '0.85rem 1.25rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Eye size={20} color="#a5b4fc" />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#f8fafc' }}>
                      Orijinal Sınav Çözüm Ekranını İnceleyin
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                      Sınavın tam halini, seçenekleri ve görselleri öğrenci çözüm ekranı formatında inceleyebilirsiniz.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalViewMode('review')}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '0.65rem',
                    background: '#38bdf8', border: 'none', color: '#0f172a',
                    fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  👁️ Sınav Çözüm Ekranını Aç
                </button>
              </div>

              {/* Collapsible Media Accordion for PDF, HTML, or Image Tests */}
              <CollapsibleMediaViewer activeSubmission={activeSubmission} allBankQuestions={allBankQuestions} homeworks={homeworks} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {(activeSubmission.answers || []).map((ans, idx) => {
                const qNo = ans.questionNo || (idx + 1);
                const textAns = ans.userAnswerText || '';
                const currentScore = questionScores[qNo] ?? 0;
                const currentNote = teacherNotes[qNo] || '';

                return (
                  <div
                    key={qNo}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '1.25rem',
                      padding: '1.5rem',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        ✍️ Soru {qNo} Yanıt İncelemesi
                      </h3>

                      {/* Quick Score Presets */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 10 }))}
                          style={{
                            padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                            border: '1px solid #059669',
                            background: currentScore === 10 ? '#064e3b' : 'rgba(6,78,59,0.3)',
                            color: '#34d399', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >
                          ✓ Tam Puan (10)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 5 }))}
                          style={{
                            padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                            border: '1px solid #d97706',
                            background: currentScore === 5 ? '#78350f' : 'rgba(120,53,15,0.3)',
                            color: '#fef3c7', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >
                          ½ Kısmi Puan (5)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionScores(p => ({ ...p, [qNo]: 0 }))}
                          style={{
                            padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                            border: '1px solid #dc2626',
                            background: currentScore === 0 ? '#7f1d1d' : 'rgba(127,29,29,0.3)',
                            color: '#f87171', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >
                          ✕ 0 Puan
                        </button>

                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={currentScore}
                          onChange={e => setQuestionScores(p => ({ ...p, [qNo]: Math.max(0, Math.min(10, Number(e.target.value))) }))}
                          style={{
                            width: '55px', padding: '0.3rem', borderRadius: '0.5rem',
                            background: '#0f172a', border: '1px solid #6366f1',
                            color: '#e0e7ff', fontWeight: 900, textAlign: 'center', fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>

                    {/* Question Text Box */}
                    {(() => {
                      const targetId = String(activeSubmission.testId || activeSubmission.homeworkId || activeSubmission.questionId || activeSubmission.id || '');
                      const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
                      const hwMatch = homeworks?.find(h => String(h.id) === targetId || String(h.id) === normTargetId || String(h.testId) === targetId);
                      const bankQ = allBankQuestions?.find(q => String(q.id) === targetId || String(q.id) === normTargetId || String(q.questionId) === targetId || String(q.id) === String(hwMatch?.questionId || hwMatch?.testId));

                      const jsonParsed =
                        tryParseQuestionsPayload(activeSubmission.contentPayload) ||
                        tryParseQuestionsPayload(hwMatch?.contentPayload) ||
                        tryParseQuestionsPayload(bankQ?.contentPayload);

                      const subQ = (activeSubmission.questions || [])[idx] || {};
                      const jsonQ = (jsonParsed || [])[idx] || {};
                      const hwQ = (hwMatch?.questionsList || hwMatch?.questions || [])[idx] || {};
                      const bq = (bankQ?.questionsList || bankQ?.questions || [])[idx] || {};

                      const rawText = ans.questionText || ans.text || ans.question || ans.title ||
                                      jsonQ.questionText || jsonQ.text || jsonQ.question || jsonQ.title ||
                                      subQ.questionText || subQ.text || subQ.question || subQ.title ||
                                      hwQ.questionText || hwQ.text || hwQ.question || hwQ.title ||
                                      bq.questionText || bq.text || bq.question || bq.title ||
                                      (idx === 0 ? (bankQ?.questionText || bankQ?.title || hwMatch?.title || activeSubmission.testTitle) : null);

                      let displayQText = null;
                      if (rawText && typeof rawText === 'string' && !rawText.startsWith('data:') && !rawText.startsWith('http') && rawText !== '[STORED_IN_INDEXEDDB]' && rawText.trim()) {
                        displayQText = rawText.trim();
                      } else {
                        displayQText = `${activeSubmission.testTitle || hwMatch?.title || bankQ?.title || 'Açık Uçlu Sınav'} — Soru ${qNo}`;
                      }

                      return (
                        <div style={{
                          background: '#0f172a',
                          padding: '1.1rem',
                          borderRadius: '0.85rem',
                          border: '1px solid #334155',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                            ❓ SORU {qNo} METNİ / AÇIKLAMASI:
                          </div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {displayQText}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Question Image if present */}
                    {(() => {
                      const targetId = String(activeSubmission.testId || activeSubmission.homeworkId || activeSubmission.questionId || activeSubmission.id || '');
                      const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
                      const hwMatch = homeworks?.find(h => String(h.id) === targetId || String(h.id) === normTargetId || String(h.testId) === targetId);
                      const bankQ = allBankQuestions?.find(q =>
                        String(q.id) === targetId ||
                        String(q.id) === normTargetId ||
                        String(q.questionId) === targetId ||
                        String(q.id) === String(hwMatch?.questionId || hwMatch?.testId)
                      );

                      const secQId = ans.sectionId || ans.questionId || (hwMatch?.sections || [])[idx]?.questionId || (hwMatch?.questionIds || [])[idx];
                      const secBQ = secQId ? allBankQuestions?.find(q => String(q.id) === String(secQId)) : null;

                      const subQ = (activeSubmission.questions || [])[idx] || {};
                      const bq = (bankQ?.questionsList || bankQ?.questions || [])[idx] || {};
                      const secQ = (secBQ?.questionsList || secBQ?.questions || [])[ans.subIndex ?? idx] || {};

                      let qImg = (resolvedModalImages && resolvedModalImages[idx] && isValidImageUrl(resolvedModalImages[idx]) ? resolvedModalImages[idx] : null) ||
                                 (ans.imageUrl && isValidImageUrl(ans.imageUrl) ? ans.imageUrl : null) ||
                                 (Array.isArray(ans.imageUrls) ? ans.imageUrls[idx] || ans.imageUrls[0] : null) ||
                                 (subQ.imageUrl && isValidImageUrl(subQ.imageUrl) ? subQ.imageUrl : null) ||
                                 (Array.isArray(subQ.imageUrls) ? subQ.imageUrls[idx] || subQ.imageUrls[0] : null) ||
                                 (bq.imageUrl && isValidImageUrl(bq.imageUrl) ? bq.imageUrl : null) ||
                                 (Array.isArray(bq.imageUrls) ? bq.imageUrls[idx] || bq.imageUrls[0] : null) ||
                                 (secQ.imageUrl && isValidImageUrl(secQ.imageUrl) ? secQ.imageUrl : null) ||
                                 (Array.isArray(secQ.imageUrls) ? secQ.imageUrls[ans.subIndex ?? idx] || secQ.imageUrls[0] : null) ||
                                 (Array.isArray(bankQ?.imageUrls) ? bankQ.imageUrls[idx] || bankQ.imageUrls[0] : null) ||
                                 (Array.isArray(secBQ?.imageUrls) ? secBQ.imageUrls[ans.subIndex ?? idx] || secBQ.imageUrls[0] : null) ||
                                 (Array.isArray(hwMatch?.imageUrls) ? hwMatch.imageUrls[idx] || hwMatch.imageUrls[0] : null) ||
                                 (bankQ?.imageUrl && isValidImageUrl(bankQ.imageUrl) ? bankQ.imageUrl : null) ||
                                 (secBQ?.imageUrl && isValidImageUrl(secBQ.imageUrl) ? secBQ.imageUrl : null) ||
                                 (hwMatch?.imageUrl && isValidImageUrl(hwMatch.imageUrl) ? hwMatch.imageUrl : null);

                      if (!qImg) {
                        const payload = activeSubmission.contentPayload || bankQ?.contentPayload || secBQ?.contentPayload || hwMatch?.contentPayload;
                        if (payload && typeof payload === 'string') {
                          let parts = [];
                          if (payload.includes('data:image/') && payload.indexOf('data:image/', 5) !== -1) {
                            parts = payload.split(/(?=data:image\/)/);
                          } else if (payload.includes('\n') || payload.includes('|')) {
                            parts = payload.split(/\n\n|\n|\|/);
                          } else {
                            parts = [payload];
                          }
                          const part = (parts[idx] || parts[0] || '').trim();
                          let finalPart = part;
                          if (!finalPart.startsWith('http') && !finalPart.startsWith('data:') && !finalPart.startsWith('blob:') && !finalPart.startsWith('/') && !finalPart.startsWith('./')) {
                            if (/^[A-Za-z0-9+/=]+$/.test(finalPart.slice(0, 50))) {
                              finalPart = `data:image/jpeg;base64,${finalPart}`;
                            }
                          }
                          if (isValidImageUrl(finalPart)) {
                            qImg = finalPart;
                          }
                        }
                      }

                      // Also fallback to resolvedModalImages[0] if index is out of bounds
                      if (!qImg && resolvedModalImages && resolvedModalImages.length > 0) {
                        qImg = resolvedModalImages[idx % resolvedModalImages.length];
                      }

                      if (qImg && typeof qImg === 'string' && isValidImageUrl(qImg)) {
                        return (
                          <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fbbf24', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              🖼️ Soru {qNo} Görseli:
                            </div>
                            <StandardImageFrame
                              src={qImg}
                              alt={`Soru ${qNo} Görseli`}
                              onOpenFullscreen={() => setLightboxSrc(qImg)}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Student Written Answer Box */}
                    <div style={{ background: '#0f172a', padding: '1.1rem', borderRadius: '0.85rem', border: '1px solid #475569' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📝 ÖĞRENCİNİN YAZILI YANITI:
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: '#f8fafc', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {textAns || '(Öğrenci bu soruya yazılı yanıt vermedi - Boş)'}
                      </div>
                    </div>

                    {/* Teacher Per-Question Note */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
                        💬 Bu Soru İçin Öğretmen Notu / Açıklaması:
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: Açıklaman doğru fakat formül eksik..."
                        value={currentNote}
                        onChange={e => setTeacherNotes(p => ({ ...p, [qNo]: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                          background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
                          fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Overall Feedback Box */}
              <div style={{ background: '#1e293b', border: '1px solid #6366f1', borderRadius: '1.25rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  💬 Öğrenciye Genel Geri Bildirim Notu
                </h3>
                <textarea
                  rows="3"
                  placeholder="Sınavın geneli için öğrenciye iletilecek değerlendirme mesajınız..."
                  value={overallFeedback}
                  onChange={e => setOverallFeedback(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                    background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                    fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </div>
  );
}
