import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useCurriculum } from '../../../context/CurriculumContext';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useAuth } from '../../../context/AuthContext';
import { resolveTestQuestions, extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload, idbGetAllKeys } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl, extractImageUrls } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil, Eye, ArrowLeft, Save } from 'lucide-react';
import DrawingCanvas from '../common/DrawingCanvas';
import QuizPanelLayout from './QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { wrapInStyledHtmlDocument } from '../../HtmlViewerWithControls';
function checkIsOE(obj) {
  if (!obj) return false;

  const isExplicitlyMultipleChoice = obj.questionType === 'coktan_secmeli' || obj.type === 'coktan_secmeli' || obj.contentType === 'coktan_secmeli' || (Array.isArray(obj.options) && obj.options.length > 0 && !obj.isOpenEnded && obj.questionType !== 'acik_uclu' && obj.type !== 'acik_uclu' && obj.type !== 'gorsel_klasik' && obj.questionType !== 'gorsel_klasik');

  const isOE = Boolean(
    obj.questionType === 'acik_uclu' ||
    obj.type === 'acik_uclu' ||
    obj.contentType === 'acik_uclu' ||
    obj.questionType === 'gorsel_klasik' ||
    obj.type === 'gorsel_klasik' ||
    obj.contentType === 'gorsel_klasik' ||
    obj.questionType === 'yazili' ||
    obj.type === 'yazili' ||
    obj.contentType === 'yazili' ||
    obj.formatType === 'yazili' ||
    obj.sourceFormat === 'yazili' ||
    obj.formatType === 'gorsel_klasik' ||
    obj.sourceFormat === 'gorsel_klasik' ||
    obj.isOpenEnded === true ||
    obj.openEnded === true
  );

  const titleStr = String(obj.title || obj.name || obj.questionText || obj.text || '').toLowerCase();
  const hasOEWord = titleStr && (
    titleStr.includes('açık uçlu') ||
    titleStr.includes('acik uclu') ||
    titleStr.includes('yazılı') ||
    titleStr.includes('yazili') ||
    titleStr.includes('klasik')
  );
  
  return (isOE || hasOEWord) && !isExplicitlyMultipleChoice;
}

// Helper to check PDF section (always true if PDF payload/contentType exists, whether MC or Open-Ended)
function isPdfSection(bankQ) {
  if (!bankQ) return false;
  return Boolean(
    bankQ.contentType === 'pdf' ||
    bankQ.sourceFormat === 'pdf' ||
    bankQ.formatType === 'pdf' ||
    bankQ.type === 'pdf' ||
    bankQ.pdfPayload ||
    bankQ.pdfUrl ||
    (typeof bankQ.contentPayload === 'string' && (bankQ.contentPayload.includes('.pdf') || bankQ.contentPayload.startsWith('data:application/pdf')))
  );
}

// Helper to check HTML section (always true if HTML document/payload exists, whether MC or Open-Ended)
function isHtmlSection(bankQ) {
  if (!bankQ) return false;
  
  const hasHtmlContent = Boolean(
    bankQ.contentType === 'html' ||
    bankQ.sourceFormat === 'html' ||
    bankQ.formatType === 'html' ||
    bankQ.htmlPayload ||
    (typeof bankQ.contentPayload === 'string' && (bankQ.contentPayload.includes('<!DOCTYPE') || bankQ.contentPayload.includes('<html') || bankQ.contentPayload.startsWith('data:text/html')))
  );

  if (!hasHtmlContent) return false;

  // If it has a question bank question cards array and is NOT explicitly HTML contentType, render as cards
  if (Array.isArray(bankQ.questionsList) && bankQ.questionsList.length > 0 && bankQ.contentType !== 'html' && bankQ.formatType !== 'html') return false;
  if (Array.isArray(bankQ.questions) && bankQ.questions.length > 0 && bankQ.contentType !== 'html' && bankQ.formatType !== 'html') return false;

  return true;
}

// Helper to check Image section
function isImageSection(bankQ) {
  if (!bankQ) return false;
  return Boolean(
    bankQ.contentType === 'gorsel' ||
    bankQ.contentType === 'image' ||
    bankQ.sourceFormat === 'image' ||
    bankQ.formatType === 'image' ||
    bankQ.type === 'gorsel' ||
    bankQ.questionType === 'gorsel_klasik' ||
    (bankQ.imageUrls && Array.isArray(bankQ.imageUrls) && bankQ.imageUrls.length > 0)
  );
}

export function resolveExactQuestionCount(sec = {}, bankQ = {}, foundInBank = {}, resolvedQuestions = [], secImages = [], parentTest = {}) {
  // Determine if this is a single section test
  const parentSecs = parentTest?.sections || parentTest?.tests || parentTest?.selectedQuestions || parentTest?.questionIds || null;
  const isSingleSection = !parentSecs || !Array.isArray(parentSecs) || parentSecs.length <= 1;

  const sectionObjects = [foundInBank, bankQ, sec, bankQ?.bankQ, sec?.bankQ].filter(Boolean);

  // Helper to extract numeric question count from an object
  const getRawCount = (obj) => {
    if (!obj) return 0;
    const val = obj.questionCount ?? obj.totalQuestions ?? obj.questionsCount ?? obj.qCount ?? obj.soruSayisi ?? obj._qCountHint;
    if (val !== undefined && val !== null) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };

  // Helper to extract answer key count from an object
  const getAkCount = (obj) => {
    if (!obj || !obj.answerKey) return 0;
    const ak = obj.answerKey;
    if (Array.isArray(ak)) {
      const valid = ak.filter(x => x !== undefined && x !== null && String(x).trim() !== '');
      return valid.length || ak.length;
    }
    if (typeof ak === 'string') return ak.trim().length;
    if (typeof ak === 'object') return Object.keys(ak).length;
    return 0;
  };

  // Helper to extract questionsList count from an object
  const getQuestionsListCount = (obj) => {
    if (!obj || !Array.isArray(obj.questionsList)) return 0;
    return obj.questionsList.length;
  };

  // Extract all valid images from all section candidate sources
  const allImagesFromSources = [
    ...(Array.isArray(secImages) ? secImages : []),
    ...sectionObjects.flatMap(obj => [
      ...(Array.isArray(obj?.imageUrls) ? obj.imageUrls : []),
      ...extractImageUrls(obj?.contentPayload),
      ...extractImageUrls(obj?.raw_data?.contentPayload),
      ...extractImageUrls(obj?.raw_data?.imageUrls)
    ])
  ];
  const uniqueImages = extractImageUrls(allImagesFromSources);
  const realImgCount = uniqueImages.length;
  const realQListCount = Math.max(...sectionObjects.map(getQuestionsListCount), 0);
  const realAkCount = Math.max(...sectionObjects.map(getAkCount), 0);
  const resolvedCount = Array.isArray(resolvedQuestions) ? resolvedQuestions.length : 0;

  // 1. If section has multiple images or sub-questions, that MUST be the question count
  if (realImgCount > 1) return realImgCount;
  if (realQListCount > 1) return realQListCount;
  if (realAkCount > 1) return realAkCount;
  if (resolvedCount > 1) return resolvedCount;

  // 2. Direct assignment question count from section or homework
  const secDirectCount = getRawCount(sec);
  const parentRawCount = getRawCount(parentTest);
  const bankRawCount = Math.max(getRawCount(foundInBank), getRawCount(bankQ), getRawCount(bankQ?.bankQ), getRawCount(sec?.bankQ), 0);

  if (isSingleSection && parentRawCount > 0) {
    return parentRawCount;
  }
  if (secDirectCount > 0) {
    return secDirectCount;
  }
  if (bankRawCount > 0) {
    return bankRawCount;
  }
  if (realQListCount > 0) return realQListCount;
  if (realAkCount > 0) return realAkCount;
  if (realImgCount > 0) return realImgCount;

  // 7. Title regex (e.g. "(15 Soru)" or "15 Soru")
  for (const obj of sectionObjects) {
    const titles = [obj.title, obj.name];
    for (const t of titles) {
      if (t) {
        const m = String(t).match(/(\d+)\s*Soru/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
  }
  if (isSingleSection) {
    const parentTitles = [parentTest?.title, parentTest?.name];
    for (const t of parentTitles) {
      if (t) {
        const m = String(t).match(/(\d+)\s*Soru/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
  }

  // 8. Multi-section parentCount partitioning fallback
  if (parentRawCount > 0) {
    const numSections = Array.isArray(parentSecs) && parentSecs.length > 0 ? parentSecs.length : 1;
    return Math.max(1, Math.round(parentRawCount / numSections));
  }

  return 1;
}

// ─── STABLE HTML VIEWER — React.memo ile sarılmış, sectionAnswers değişiminden TAMAMEN izole ──────
// Bu bileşen sadece activeSec.id veya bankQ.id değiştiğinde yeniden yüklenir.
// sectionAnswers, optik panel cevapları gibi değişkenlerden etkilenmez, iframe titremez.
const StableHtmlViewer = memo(function StableHtmlViewer({ test, bankQ, secId, testId, title, idbPayload }) {
  const [iframeSrc, setIframeSrc] = useState(null);
  const loadedRef = useRef(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    // Temizleme: önceki blob URL'yi serbest bırak
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [secId]);

  useEffect(() => {
    let isMounted = true;

    const makeBlob = (raw) => {
      try {
        let html = raw.startsWith('data:') ? atob(raw.split(',')[1] || '') : raw;
        html = wrapInStyledHtmlDocument(html, title || 'Doküman');
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = url;
        return url;
      } catch {
        return null;
      }
    };

    const cacheKey = bankQ?.id || secId || testId;

    async function init() {
      const isHtmlContent = (str) => typeof str === 'string' && (str.includes('<!DOCTYPE') || str.includes('<html') || str.includes('<body') || str.includes('<head') || str.startsWith('data:text/html'));

      // 0. Önce MultiHomeworkRunner'ın bizim için fuzzy-match ile bulduğu idbPayload'ı dene
      if (idbPayload && typeof idbPayload === 'string' && idbPayload !== '[STORED_IN_INDEXEDDB]') {
        if (isHtmlContent(idbPayload) || idbPayload.startsWith('http')) {
          loadedRef.current = cacheKey;
          if (idbPayload.startsWith('http')) { setIframeSrc(idbPayload); return; }
          const url = makeBlob(idbPayload);
          if (url) { setIframeSrc(url); return; }
        }
      }

      // 1. Kendi IDB kontrolümüz (kullanıcı editlemiş olabilir)
      const idsToTry = [bankQ?.id, bankQ?.questionId, secId, testId].filter(Boolean);
      for (const id of idsToTry) {
        const val = await idbGetPayload(id);
        if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]' && isMounted) {
          // Eğer IDB'den gelen veri düz metin (eski veri) ise ama biz HTML arıyorsak, bunu atla.
          if (!isHtmlContent(val) && !val.startsWith('http')) {
            continue; // Atla ve diğer kimliklere bak, veya proplara düş
          }
          loadedRef.current = cacheKey;
          if (val.startsWith('http')) { setIframeSrc(val); return; }
          const url = makeBlob(val);
          if (url) { setIframeSrc(url); return; }
        }
      }

      // 2. IDB'de yoksa veya geçerli HTML değilse proplardan geleni kullan
      if (loadedRef.current === cacheKey) return;

      const candidates = [
        bankQ?.contentPayload, bankQ?.htmlPayload, bankQ?.pdfUrl, bankQ?.url,
        test?.contentPayload, test?.htmlPayload, test?.pdfUrl, test?.url
      ];
      const direct = candidates.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]');
      
      if (direct && isMounted) {
        if (direct.startsWith('http')) {
          setIframeSrc(direct);
          return;
        }
        const url = makeBlob(direct);
        if (url) { 
          setIframeSrc(url); 
          return; 
        }
      }
    }
    
    init();

    return () => { isMounted = false; };
  // Sadece bölüm kimliği değiştiğinde yeniden çalış — cevap state'i burada YOK
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secId, bankQ?.id, bankQ?.contentPayload, bankQ?.htmlPayload, idbPayload]);

  if (!iframeSrc) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontWeight: 700 }}>
        HTML İçerik Yükleniyor...
      </div>
    );
  }
  return (
    <iframe
      key={iframeSrc}  /* key sadece src gerçekten değiştiğinde iframe'i sıfırlar */
      src={iframeSrc}
      style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
      title={title}
      sandbox="allow-scripts allow-same-origin"
    />
  );
});

// ─── RIGHT OPTIK PANEL ────────────────────────────────────────────────────────
function RightOptikPanel({
  qCount,
  answers,
  openEndedText,
  isOpenEnded,
  resolvedQuestions,
  bankQ,
  onOptionSelect,
  onTextChange,
  onNextSection,
  onSubmit,
  activeSecIdx,
  totalSections,
  isReviewMode = false,
  teacherScores = {},
  onScoreChange,
  teacherNotes = {},
  onNoteChange
}) {
  const isLastSec = activeSecIdx === totalSections - 1;
  const isMobile = useMediaQuery('(max-width: 768px)');

const answeredCount = Array.from({ length: qCount }).filter((_, idx) => {
    const qNo = idx + 1;
    const ans = answers[qNo];
    const uAns = typeof ans === 'object' ? ans?.userAnswer : ans;
    const txt = openEndedText[qNo];
    return (uAns !== undefined && uAns !== null && uAns !== '') || Boolean(txt);
  }).length;

  const progressPct = qCount > 0 ? Math.round((answeredCount / qCount) * 100) : 0;

  return (
    <div style={{ width: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ── OPTIK HEADER WITH PROGRESS BAR (ULTRA-COMPACT ON MOBILE) ── */}
      <div style={{
        padding: isMobile ? '0.3rem 0.6rem' : '0.85rem 1.15rem',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.25rem' : '0.45rem',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', flexShrink: 0 }}>
              {isReviewMode ? '🔍' : isOpenEnded ? '✍️' : '📋'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden' }}>
              <span style={{ margin: 0, fontSize: isMobile ? '0.78rem' : '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {isMobile ? (isReviewMode ? 'Cevaplar' : isOpenEnded ? 'Yazılı Cevap' : 'Optik Form') : (isReviewMode ? 'Sınav İnceleme & Cevaplar' : isOpenEnded ? 'Açık Uçlu Cevap Paneli' : 'Optik Cevap Kağıdı')}
              </span>
              <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap' }}>
                • {qCount} Soru
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              padding: isMobile ? '0.12rem 0.45rem' : '0.2rem 0.6rem',
              borderRadius: '999px',
              background: progressPct === 100 ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${progressPct === 100 ? '#86efac' : '#bfdbfe'}`,
              color: progressPct === 100 ? '#15803d' : '#2563eb',
              fontSize: isMobile ? '0.68rem' : '0.72rem',
              fontWeight: 900
            }}>
              {answeredCount}/{qCount} Kodlandı
            </span>
          </div>
        </div>

        {/* Section Progress Bar */}
        <div style={{ width: '100%', height: isMobile ? '3px' : '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: progressPct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #4f46e5)',
            borderRadius: '999px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* ── QUESTION ITEMS LIST ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '0.35rem 0.5rem' : '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.35rem' : '0.65rem'
      }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = (resolvedQuestions && resolvedQuestions[idx]) || {};
          const isQOE = isOpenEnded || checkIsOE(qObj);

          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          const isAnswered = (userAns !== undefined && userAns !== null && userAns !== '') || Boolean(textVal);

          let isCorrect = null;
          if (isReviewMode && userAns !== undefined && userAns !== null && userAns !== '') {
            const evalResult = checkIsAnswerCorrect(userAns, qObj, bankQ || test, qNo);
            if (evalResult !== null) {
              isCorrect = evalResult;
            } else if (userAnsObj && userAnsObj.isCorrect !== undefined) {
              isCorrect = userAnsObj.isCorrect;
            }
          } else if (userAnsObj && userAnsObj.isCorrect !== undefined) {
            isCorrect = userAnsObj.isCorrect;
          }

          const teacherSc = teacherScores?.[qNo];
          const hasTeacherGraded = teacherSc !== undefined && teacherSc !== null;
          const currentTeacherScore = hasTeacherGraded ? teacherSc : (isCorrect === true ? 10 : (isCorrect === false ? 0 : undefined));

          return (
            <div
              key={qNo}
              style={{
                background: '#ffffff',
                padding: isMobile ? '0.35rem 0.55rem' : '0.75rem 0.85rem',
                borderRadius: isMobile ? '0.6rem' : '0.85rem',
                border: isReviewMode
                  ? (currentTeacherScore === 10 || isCorrect === true ? '1.5px solid #86efac' : currentTeacherScore === 5 ? '1.5px solid #fde68a' : (currentTeacherScore === 0 || isCorrect === false) ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0')
                  : isAnswered ? '1.5px solid #c7d2fe' : '1.5px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.3rem' : '0.55rem',
                boxShadow: isAnswered ? '0 2px 8px rgba(99,102,241,0.05)' : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Question Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    padding: isMobile ? '0.12rem 0.45rem' : '0.2rem 0.55rem',
                    borderRadius: '0.4rem',
                    background: isAnswered ? '#4f46e5' : '#f1f5f9',
                    color: isAnswered ? '#ffffff' : '#334155',
                    fontWeight: 900,
                    fontSize: isMobile ? '0.7rem' : '0.78rem',
                    letterSpacing: '0.02em'
                  }}>
                    SORU {qNo}
                  </span>
                  {isQOE && (
                    <span style={{ fontSize: '0.68rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', fontWeight: 800 }}>
                      ✍️ Yazılı
                    </span>
                  )}
                </div>

                <div>
                  {isReviewMode ? (
                    currentTeacherScore === 10 ? (
                      <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU (10P)</span>
                    ) : currentTeacherScore === 5 ? (
                      <span style={{ fontSize: '0.68rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>½ YARIM (5P)</span>
                    ) : currentTeacherScore === 0 ? (
                      <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ (0P)</span>
                    ) : isQOE ? (
                      <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✍️ Puan Ver</span>
                    ) : userAns !== undefined && userAns !== null ? (
                      isCorrect ? (
                        <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU</span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ</span>
                      )
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 800 }}>— BOŞ</span>
                    )
                  ) : (
                    isAnswered ? (
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                        {isQOE ? 'Yanıtlandı' : `Şık ${String.fromCharCode(65 + userAns)}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                        ○ Boş
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Input Area: Open-Ended or Optical Bubbles */}
              {isQOE ? (
                <textarea
                  value={textVal}
                  onChange={(e) => !isReviewMode && onTextChange(qNo, e.target.value)}
                  readOnly={isReviewMode}
                  placeholder={isReviewMode ? "Öğrenci bu soruya yanıt yazmadı" : `Soru ${qNo} için açık uçlu cevabınızı buraya yazınız...`}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 0.8rem',
                    borderRadius: '0.6rem',
                    background: '#ffffff',
                    border: textVal ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              ) : (
                <div style={{ display: 'flex', gap: isMobile ? '0.35rem' : '0.5rem' }}>
                  {(() => {
                    const targetObj = bankQ || {};
                    const isExplicitFive = Boolean(
                      Number(targetObj?.optionCount) === 5 ||
                      Number(targetObj?.optionsCount) === 5 ||
                      Number(targetObj?.book?.optionCount) === 5 ||
                      String(targetObj?.optionCount || targetObj?.optionsCount || targetObj?.book?.optionCount || '').includes('5') ||
                      targetObj?.examType === 'TYT' || targetObj?.examType === 'AYT' || targetObj?.examType === 'YKS' ||
                      targetObj?.book?.publisher === 'TYT' || targetObj?.book?.publisher === 'AYT' || targetObj?.book?.publisher === 'YKS' ||
                      Boolean(String(targetObj?.grade || targetObj?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                      Boolean(String(targetObj?.title || targetObj?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                    );
                    const isFourOptions = !isExplicitFive;
                    const optList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

                    return optList.map((opt, optIdx) => {
                      const isSelected = userAns === optIdx;

                      let correctAns = null;
                      const keySources = [
                        bankQ?.answerKey,
                        bankQ?.answer_key,
                        bankQ?.opticAnswers,
                        bankQ?.contentPayload?.answerKey,
                        bankQ?.contentPayload?.answer_key,
                        bankQ?.htmlPayload?.answerKey,
                        bankQ?.pdfPayload?.answerKey,
                        bankQ?.raw_data?.answerKey,
                        bankQ?.raw_data?.answer_key,
                        bankQ?.bankQ?.answerKey,
                        bankQ?.bankQ?.answer_key,
                        bankQ?.bankQ?.opticAnswers,
                        bankQ?.bankQ?.pdfPayload?.answerKey
                      ];

                      for (const ks of keySources) {
                        if (!ks) continue;
                        let val = null;
                        if (Array.isArray(ks)) {
                          val = ks[idx] ?? ks[qNo - 1];
                        } else if (typeof ks === 'object') {
                          val = ks[qNo] ?? ks[String(qNo)] ?? ks[idx] ?? ks[String(idx)];
                        } else if (typeof ks === 'string' && ks.trim().length > 0) {
                          const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
                          val = clean[idx] ?? clean[qNo - 1];
                        }
                        if (val !== undefined && val !== null && val !== '') {
                          if (typeof val === 'number') correctAns = val;
                          else if (typeof val === 'string') {
                            const s = val.trim().toUpperCase();
                            if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                            else if (!isNaN(Number(s))) correctAns = Number(s);
                          }
                          if (correctAns !== null) break;
                        }
                      }

                      if (correctAns === null) {
                        const rawSubCorr = userAnsObj?.correctAnswerLetter || userAnsObj?.correctAnswer;
                        if (rawSubCorr !== undefined && rawSubCorr !== null && rawSubCorr !== '') {
                          if (typeof rawSubCorr === 'number') correctAns = rawSubCorr;
                          else if (typeof rawSubCorr === 'string') {
                            const s = rawSubCorr.trim().toUpperCase();
                            if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                            else if (!isNaN(Number(s))) correctAns = Number(s);
                          }
                        }
                      }

                      if (correctAns === null) {
                        if (qObj.correctAnswerLetter) {
                          const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                          if (/^[A-E]$/.test(lt)) correctAns = lt.charCodeAt(0) - 65;
                        } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                          correctAns = qObj.correctAnswer;
                        }
                      }

                      const isCorrectOpt = (isReviewMode && isCorrect === true && isSelected)
                        ? true
                        : (correctAns !== undefined && correctAns !== null && correctAns === optIdx);

                      let bg = '#ffffff';
                      let border = '1.5px solid #cbd5e1';
                      let color = '#334155';
                      let shadow = 'none';

                      if (isReviewMode) {
                        if (isSelected && isCorrectOpt) {
                          bg = 'linear-gradient(135deg, #10b981, #059669)'; border = 'none'; color = 'white'; shadow = '0 3px 10px rgba(16,185,129,0.35)';
                        } else if (isSelected && !isCorrectOpt) {
                          bg = 'linear-gradient(135deg, #ef4444, #dc2626)'; border = 'none'; color = 'white'; shadow = '0 3px 10px rgba(239,68,68,0.35)';
                        } else if (isCorrectOpt) {
                          bg = '#f0fdf4'; border = '2px solid #16a34a'; color = '#15803d';
                        }
                      } else if (isSelected) {
                        bg = 'linear-gradient(135deg, #10b981, #059669)';
                        border = 'none';
                        color = 'white';
                        shadow = '0 4px 12px rgba(16,185,129,0.4)';
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => !isReviewMode && onOptionSelect(qNo, optIdx)}
                          disabled={isReviewMode}
                          style={{
                            flex: 1,
                            height: isMobile ? '30px' : '38px',
                            borderRadius: isMobile ? '0.45rem' : '0.6rem',
                            border,
                            background: bg,
                            color,
                            fontWeight: 900,
                            fontSize: isMobile ? '0.8rem' : '0.9rem',
                            cursor: isReviewMode ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: shadow,
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          className={!isReviewMode ? "hover:scale-105 active:scale-95" : ""}
                        >
                          {opt}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Öğretmen Puanlama Butonları (Review Modunda) */}
              {isReviewMode && (
                <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isQOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => onScoreChange && onScoreChange(qNo, 10)}
                      style={{
                        padding: '0.35rem 0.2rem',
                        borderRadius: 6,
                        border: currentTeacherScore === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: currentTeacherScore === 10 ? '#16a34a' : '#ffffff',
                        color: currentTeacherScore === 10 ? '#ffffff' : '#15803d',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2
                      }}
                    >
                      ✓ Doğru (D)
                    </button>
                    <button
                      type="button"
                      onClick={() => onScoreChange && onScoreChange(qNo, 0)}
                      style={{
                        padding: '0.35rem 0.2rem',
                        borderRadius: 6,
                        border: currentTeacherScore === 0 && (isAnswered || currentTeacherScore !== undefined) ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: currentTeacherScore === 0 ? '#dc2626' : '#ffffff',
                        color: currentTeacherScore === 0 ? '#ffffff' : '#b91c1c',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2
                      }}
                    >
                      ✗ Yanlış (Y)
                    </button>
                    <button
                      type="button"
                      onClick={() => onScoreChange && onScoreChange(qNo, 0)}
                      style={{
                        padding: '0.35rem 0.2rem',
                        borderRadius: 6,
                        border: currentTeacherScore === 0 && !isAnswered ? '2px solid #64748b' : '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2
                      }}
                    >
                      ○ Boş (B)
                    </button>
                    {isQOE && (
                      <button
                        type="button"
                        onClick={() => onScoreChange && onScoreChange(qNo, 5)}
                        style={{
                          padding: '0.35rem 0.2rem',
                          borderRadius: 6,
                          border: currentTeacherScore === 5 ? '2px solid #d97706' : '1px solid #cbd5e1',
                          background: currentTeacherScore === 5 ? '#d97706' : '#ffffff',
                          color: currentTeacherScore === 5 ? '#ffffff' : '#d97706',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2
                        }}
                      >
                        ½ Yarım (5P)
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={`Soru ${qNo} için öğretmen notu...`}
                    value={teacherNotes?.[qNo] || ''}
                    onChange={(e) => onNoteChange && onNoteChange(qNo, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.3rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.74rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ACTIONS AT THE BOTTOM OF OPTIK PANEL ── */}
      <div style={{
        padding: isMobile ? '0.35rem 0.6rem' : '0.85rem 1.15rem',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        flexShrink: 0,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
      }}>
        {totalSections > 1 && !isLastSec && (
          <button
            onClick={onNextSection}
            style={{
              width: '100%',
              padding: isMobile ? '0.45rem 0.8rem' : '0.75rem 1.25rem',
              borderRadius: isMobile ? '0.5rem' : '0.75rem',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            Sonraki Bölüm <ChevronRight size={isMobile ? 14 : 18} />
          </button>
        )}

        {(totalSections === 1 || isLastSec) && (
          <button
            onClick={onSubmit}
            style={{
              width: '100%',
              padding: isMobile ? '0.45rem 0.8rem' : '0.75rem 1.25rem',
              borderRadius: isMobile ? '0.5rem' : '0.75rem',
              background: isReviewMode
                ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: isReviewMode ? '0 2px 8px rgba(79,70,229,0.25)' : '0 2px 8px rgba(16,185,129,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} />
            {isReviewMode ? 'İncelemeyi Tamamla' : 'Sınavı Bitir ve Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MULTI RESULT MODAL COMPONENT ─────────────────────────────────────────────
function MultiResultModal({ test, sections, sectionAnswers, onConfirmClose, onReview, teacherScores = {}, teacherNotes = {}, overallFeedback = '', isReviewMode = false }) {
  let totalAllQuestions = 0;
  let totalAllEarnedPts = 0;
  let totalAllMaxPts = 0;
  let totalDoğru = 0;
  let totalYanlış = 0;
  let totalBoş = 0;

  let totalMCQuestions = 0;
  let totalMCDoğru = 0;
  let totalMCYanlış = 0;
  let totalMCBoş = 0;

  let totalOEQuestions = 0;
  let totalOECevaplanan = 0;
  let totalOEEvaluated = 0;

  const sectionStats = sections.map((sec, idx) => {
    const bankQ = sec.bankQ || {};
    const isSecOE = checkIsOE(bankQ);
    const sa = sectionAnswers[sec.id] || { answers: {}, openEndedText: {} };

    let secDoğru = 0;
    let secYanlış = 0;
    let secBoş = 0;
    let secEarnedPts = 0;
    let secMaxPts = 0;
    let oeCevaplanan = 0;
    let oeEvaluated = 0;
    let hasAnyOE = isSecOE;

    const answeredKeys = [
      ...Object.keys(sa.answers || {}).map(Number),
      ...Object.keys(sa.openEndedText || {}).map(Number)
    ].filter(n => !isNaN(n) && n > 0);
    const maxAnsweredNo = answeredKeys.length > 0 ? Math.max(...answeredKeys) : 0;
    const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
    const secQCount = Math.max(sec.qCount || 1, sec.resolvedQuestions?.length || 0, maxAnsweredNo, secImgCount);

    for (let i = 1; i <= secQCount; i++) {
      const qObj = (sec.resolvedQuestions && sec.resolvedQuestions[i - 1]) || {};
      const isQOE = isSecOE || checkIsOE(qObj);
      secMaxPts += 10;
      totalAllMaxPts += 10;
      totalAllQuestions++;

      const teacherSc = teacherScores[sec.id]?.[i];
      const hasTeacherScore = teacherSc !== undefined && teacherSc !== null;

      if (isQOE) {
        hasAnyOE = true;
        totalOEQuestions++;
        const textVal = sa.openEndedText?.[i] || '';
        if (textVal && textVal.trim() !== '') {
          oeCevaplanan++;
          totalOECevaplanan++;
        }
        if (hasTeacherScore) {
          oeEvaluated++;
          totalOEEvaluated++;
          secEarnedPts += teacherSc;
          totalAllEarnedPts += teacherSc;
          if (teacherSc >= 5) {
            secDoğru++;
            totalDoğru++;
          } else {
            secYanlış++;
            totalYanlış++;
          }
        } else {
          secBoş++;
          totalBoş++;
        }
      } else {
        totalMCQuestions++;
        const userAnsObj = sa.answers?.[i];
        const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;

        if (hasTeacherScore) {
          secEarnedPts += teacherSc;
          totalAllEarnedPts += teacherSc;
          if (teacherSc >= 5) {
            secDoğru++;
            totalDoğru++;
            totalMCDoğru++;
          } else {
            secYanlış++;
            totalYanlış++;
            totalMCYanlış++;
          }
        } else if (userAns === undefined || userAns === null) {
          secBoş++;
          totalBoş++;
          totalMCBoş++;
        } else {
          const isCorrect = checkIsAnswerCorrect(userAns, qObj, bankQ, i);
          if (isCorrect) {
            secDoğru++;
            totalDoğru++;
            totalMCDoğru++;
            secEarnedPts += 10;
            totalAllEarnedPts += 10;
          } else {
            secYanlış++;
            totalYanlış++;
            totalMCYanlış++;
          }
        }
      }
    }

    const mcNet = Math.max(0, secDoğru - (secYanlış * 0.25));
    const secSuccessRate = secMaxPts > 0 ? Math.round((secEarnedPts / secMaxPts) * 100) : 0;
    const isSecEvaluated = !hasAnyOE || (oeEvaluated > 0 && oeEvaluated >= oeCevaplanan);

    return {
      title: sec.title || `${idx + 1}. Bölüm`,
      qCount: secQCount,
      isOE: hasAnyOE,
      isSecEvaluated,
      secDoğru,
      secYanlış,
      secBoş,
      mcNet,
      secEarnedPts,
      secMaxPts,
      secSuccessRate,
      oeCevaplanan,
      oeEvaluated
    };
  });

  const totalMCNet = Math.max(0, totalDoğru - (totalYanlış * 0.25));
  const hasOE = totalOEQuestions > 0;
  const isAllGraded = !hasOE || totalOEEvaluated > 0;
  const overallAccuracy = totalAllMaxPts > 0 ? Math.round((totalAllEarnedPts / totalAllMaxPts) * 100) : 0;

  const getSuccessStatus = (rate) => {
    if (rate >= 85) return { label: 'Mükemmel 🌟', text: 'Mükemmel', color: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', badgeBorder: 'rgba(16,185,129,0.3)' };
    if (rate >= 70) return { label: 'Çok İyi 🎯', text: 'Çok İyi', color: '#0284c7', badgeBg: 'rgba(2,132,199,0.15)', badgeBorder: 'rgba(2,132,199,0.3)' };
    if (rate >= 50) return { label: 'Başarılı 👍', text: 'Başarılı', color: '#d97706', badgeBg: 'rgba(217,119,6,0.15)', badgeBorder: 'rgba(217,119,6,0.3)' };
    return { label: 'Geliştirilmeli 📈', text: 'Geliştirilmeli', color: '#dc2626', badgeBg: 'rgba(220,38,38,0.15)', badgeBorder: 'rgba(220,38,38,0.3)' };
  };

  const overallStatus = getSuccessStatus(overallAccuracy);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.75))', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <div style={{ background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', borderRadius: '1.5rem', width: '100%', maxWidth: '750px', color: 'var(--color-text, #0f172a)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', margin: 'auto' }}>
        
        {/* TOP HEADER */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: overallStatus.badgeBg, border: `2px solid ${overallStatus.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--color-text, #0f172a)' }}>
            {isReviewMode ? 'Değerlendirme Başarıyla Kaydedildi!' : 'Sınav Başarıyla Tamamlandı!'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #64748b)', margin: 0, fontWeight: 700 }}>{test.title || test.name}</p>
        </div>

        {/* TEACHER EVALUATION ALERT BANNER (If not yet graded) */}
        {hasOE && totalOEEvaluated === 0 && !isReviewMode && (
          <div style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1.5px solid rgba(167, 139, 250, 0.4)', borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>⏳</div>
            <div>
              <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, color: '#7c3aed', fontSize: '0.95rem' }}>
                Yazılı / Açık Uçlu Cevaplarınız Öğretmen Değerlendirmesine Gönderildi
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted, #475569)', lineHeight: 1.5 }}>
                Çoktan seçmeli sorularınızın puan ve başarı oranı hesaplanmıştır. Açık uçlu ({totalOEQuestions} soru) yanıtlarınız ise öğretmeniniz tarafından incelenip puanlandıktan sonra karnenize yansıyacaktır.
              </p>
            </div>
          </div>
        )}

        {/* TEACHER FEEDBACK NOTE */}
        {overallFeedback && (
          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              👨‍🏫 Öğretmen Değerlendirme Notu / Geri Bildirimi:
            </div>
            <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.5 }}>
              {overallFeedback}
            </div>
          </div>
        )}

        {/* OVERALL SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
          
          {/* Card 1: BAŞARI DURUMU */}
          <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: `1.5px solid ${overallStatus.badgeBorder}`, borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>BAŞARI DURUMU</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: overallStatus.color, lineHeight: 1.1 }}>%{overallAccuracy}</div>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: overallStatus.color, background: overallStatus.badgeBg, border: `1px solid ${overallStatus.badgeBorder}`, padding: '0.15rem 0.55rem', borderRadius: '12px', marginTop: '0.2rem' }}>
              {overallStatus.label}
            </span>
          </div>

          {/* Card 2: DOĞRU / YANLIŞ / BOŞ */}
          <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>DOĞRU / YANLIŞ</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', marginTop: '0.15rem' }}>
              {totalDoğru} <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>D / {totalYanlış} Y</span>
            </div>
            {totalBoş > 0 ? (
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>({totalBoş} Boş Soru)</span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>(Tümü Yanıtlandı)</span>
            )}
          </div>

          {/* Card 3: NET PUAN */}
          <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>NET PUAN</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', lineHeight: 1.1 }}>{totalMCNet.toFixed(2)}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Net</span>
          </div>

          {/* Card 4: AÇIK UÇLU YANIT (if any) */}
          {hasOE && (
            <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>AÇIK UÇLU YANIT</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.15rem' }}>
                {totalOEEvaluated > 0 ? `${totalOEEvaluated} / ${totalOEQuestions} Puanlandı` : `${totalOECevaplanan} / ${totalOEQuestions}`}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>
                {totalOEEvaluated > 0 ? '✓ Öğretmen Değerlendirdi' : 'Öğretmen Bekleniyor'}
              </span>
            </div>
          )}

        </div>

        {/* BÖLÜM BAZLI DETAYLAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text, #334155)' }}>📊 Bölüm Bazlı Sonuç Özeti</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {sectionStats.map((secStat, sIdx) => {
              const secStatus = getSuccessStatus(secStat.secSuccessRate);

              return (
                <div key={sIdx} style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ padding: '0.25rem 0.55rem', background: secStat.isOE ? '#7c3aed' : '#0284c7', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: 900, color: 'white' }}>
                      {secStat.isOE ? '✍️ Yazılı Bölüm' : '📝 Test Bölümü'}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text, #0f172a)' }}>{secStat.title}</span>
                  </div>

                  {secStat.isOE && !secStat.isSecEvaluated ? (
                    <span style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(167, 139, 250, 0.4)', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 900 }}>
                      ⏳ Öğretmen Değerlendirmesinde ({secStat.oeCevaplanan}/{secStat.qCount} Yanıt)
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.85rem', fontWeight: 800, flexWrap: 'wrap' }}>
                      <span style={{ color: '#16a34a' }}>{secStat.secDoğru} Doğru</span>
                      <span style={{ color: '#dc2626' }}>{secStat.secYanlış} Yanlış</span>
                      {secStat.secBoş > 0 && <span style={{ color: '#64748b' }}>{secStat.secBoş} Boş</span>}
                      
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        background: secStatus.badgeBg,
                        border: `1.5px solid ${secStatus.badgeBorder}`,
                        color: secStatus.color,
                        borderRadius: '0.5rem',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        %{secStat.secSuccessRate} Başarı
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {onReview && (
            <button
              onClick={onReview}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '0.85rem 1.25rem',
                borderRadius: '0.85rem',
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #cbd5e1)',
                color: 'var(--color-text, #334155)',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Eye size={18} /> Cevapları İncele
            </button>
          )}
          <button
            onClick={onConfirmClose}
            style={{
              flex: 1.5,
              minWidth: 180,
              padding: '0.85rem 1.5rem',
              borderRadius: '0.85rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={20} /> Sonuçları Onayla ve Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN MULTI-HOMEWORK RUNNER COMPONENT ────────────────────────────────────
export default function MultiHomeworkRunner({ test, questions, onSubmit, isReviewMode = false, userAnswers = null, onAutoSave, draftAnswers, bookPdfUrl = '', onExit }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { questions: allBankQuestions } = useQuestionBank();
  const { homeworks, updateHomeworkSubmission } = useHomework();
  const { updateSubmission } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { bookTests } = useTrackedBooks();
  const draftKey = useMemo(() => `draft_multi_hw_${test.id || 'test'}`, [test.id]);

  const findInAllSources = useMemo(() => (targetId) => {
    if (!targetId) return null;
    const strId = String(targetId);
    const normId = strId.replace(/^hw_/, '').replace(/^q_?/, '');

    let found = allBankQuestions?.find(q => String(q.id) === strId || normId === String(q.id).replace(/^q_?/, ''));
    if (!found && homeworks) {
      found = homeworks.find(h => String(h.id) === strId || normId === String(h.id).replace(/^hw_/, ''));
    }
    if (!found && curriculumData?.tests) {
      found = curriculumData.tests.find(t => String(t.id) === strId || normId === String(t.id).replace(/^q_?/, ''));
    }
    if (!found && bookTests) {
      found = bookTests.find(b => String(b.id) === strId || normId === String(b.id).replace(/^q_?/, ''));
    }
    return found || null;
  }, [allBankQuestions, homeworks, curriculumData, bookTests]);

  // 1. Build sections cleanly
  const sections = useMemo(() => {
    let rawSections = test.sections || test.tests || test.selectedQuestions || test.items || null;

    if (!rawSections || (Array.isArray(rawSections) && rawSections.length === 0)) {
      const ids = test.testIds || test.questionIds || test.selectedQuestionIds;
      if (Array.isArray(ids) && ids.length > 0) {
        // Provide a per-section questionCount hint so that when findInAllSources fails
        // or the bank question has no questionCount field, the section still knows its count.
        // Single section: use test.totalQuestions directly.
        // Multi-section: use test.totalQuestions / N as a rough hint (bankQ data will override).
        const perSecHint = (test.totalQuestions || test.questionCount || 0) > 0
          ? Math.round((test.totalQuestions || test.questionCount) / ids.length)
          : undefined;
        rawSections = ids.map((item, idx) => (typeof item === 'object'
          ? { ...item }
          : { id: item, questionId: item, title: `${idx + 1}. Bölüm`, ...(perSecHint ? { _qCountHint: perSecHint } : {}) }
        ));
      }
    }


    if (Array.isArray(rawSections) && rawSections.length > 0) {
      const isSingleSec = rawSections.length === 1;

      // Helper: returns real value if not a placeholder, else null
      const realVal = (v) => (v && v !== '[STORED_IN_INDEXEDDB]' && v !== '[LOCALSTORAGE_CACHE]') ? v : null;

      return rawSections.map((sec, idx) => {
        const qId = sec.questionId || sec.id || sec.testId || sec.bankQId;
        let foundInBank = qId ? findInAllSources(qId) : null;

        if (!foundInBank && (sec.id || sec.questionId)) {
          foundInBank = findInAllSources(sec.id) || findInAllSources(sec.questionId);
        }

        // Merge strategy:
        // 1. Start with foundInBank (real question data)
        // 2. Override with sec fields ONLY if they have real (non-placeholder) values
        //    — This ensures IDB placeholder strings don't wipe real bank data
        let bankQ;
        if (foundInBank) {
          const secOverrides = {};
          // Only take sec fields that are real values (not placeholders, not undefined)
          for (const key of Object.keys(sec)) {
            const v = sec[key];
            if (v === undefined || v === null) continue;
            if (typeof v === 'string' && (v === '[STORED_IN_INDEXEDDB]' || v === '[LOCALSTORAGE_CACHE]')) continue;
            // Don't let sec.questionCount=0 wipe foundInBank.questionCount
            if ((key === 'questionCount' || key === 'totalQuestions' || key === 'qCount') && !v) continue;
            secOverrides[key] = v;
          }
          bankQ = { ...foundInBank, ...secOverrides, bankQ: foundInBank };
        } else {
          bankQ = sec.bankQ || sec.test || sec;
        }

        // Resolve questions — try all sources in order
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (sec.questions || []);

        if ((!resolvedQuestions || resolvedQuestions.length === 0) && bankQ?.questionsList) {
          resolvedQuestions = bankQ.questionsList;
        }
        if ((!resolvedQuestions || resolvedQuestions.length === 0) && sec.questions) {
          resolvedQuestions = sec.questions;
        }

        // Check userAnswers/submission for answers for this section to build questions if empty
        if ((!resolvedQuestions || resolvedQuestions.length === 0) && isReviewMode && userAnswers) {
          const rawAns = userAnswers.answers || userAnswers.formattedAnswers || userAnswers;
          if (Array.isArray(rawAns)) {
            const secAns = isSingleSec ? rawAns : rawAns.filter(a =>
              String(a.sectionId) === String(sec.id) ||
              String(a.sectionId) === String(qId) ||
              (a.questionId && (String(a.questionId).startsWith(String(sec.id)) || String(a.questionId).startsWith(String(qId)))) ||
              a.sectionTitle === sec.title
            );
            if (secAns.length > 0) {
              resolvedQuestions = secAns.map((a, aIdx) => ({
                id: a.questionId || `${sec.id}_${a.questionNo || aIdx + 1}`,
                questionText: a.questionText || a.text || `Soru ${a.questionNo || aIdx + 1}`,
                options: a.options || ['A', 'B', 'C', 'D', 'E'],
                correctAnswer: a.correctAnswer !== undefined ? a.correctAnswer : 0
              }));
            }
          }
        }

        // Check questions prop if still empty
        if ((!resolvedQuestions || resolvedQuestions.length === 0) && questions && questions.length > 0) {
          const secQs = isSingleSec ? questions : questions.filter(q =>
            String(q.sectionId) === String(sec.id) ||
            String(q.sectionId) === String(qId) ||
            q.sectionTitle === sec.title
          );
          if (secQs && secQs.length > 0) {
            resolvedQuestions = secQs;
          }
        }

        const getFirstValidImages = (sources) => {
          for (const s of sources) {
            const list = extractImageUrls(s);
            if (list && list.length > 0) return list;
          }
          return [];
        };

        const secImages = getFirstValidImages([
          bankQ?.imageUrls,
          sec.imageUrls,
          bankQ?.imageUrl,
          sec.imageUrl,
          bankQ?.contentPayload,
          sec.contentPayload,
          bankQ?.bankQ?.imageUrls,
          bankQ?.bankQ?.imageUrl
        ]);

        if (secImages.length > 1) {
          resolvedQuestions = secImages.map((imgUrl, imgIdx) => {
            const existingQ = (resolvedQuestions && resolvedQuestions[imgIdx]) || {};
            return {
              ...existingQ,
              id: `${bankQ?.id || sec.id || 'q'}_sub_${imgIdx + 1}`,
              questionNo: imgIdx + 1,
              questionText: existingQ.questionText || `Soru ${imgIdx + 1}`,
              imageUrl: imgUrl,
              imageUrls: [imgUrl],
              options: existingQ.options || ['A', 'B', 'C', 'D'],
              correctAnswer: existingQ.correctAnswer,
              correctAnswerLetter: existingQ.correctAnswerLetter
            };
          });
        }

        const qCount = resolveExactQuestionCount(sec, bankQ, foundInBank, resolvedQuestions, secImages, test);

        if (resolvedQuestions.length < qCount) {
          const filled = [...resolvedQuestions];
          for (let i = filled.length; i < qCount; i++) {
            filled.push({
              id: `${bankQ?.id || sec.id || 'q'}_sub_${i + 1}`,
              questionNo: i + 1,
              questionText: `Soru ${i + 1}`,
              imageUrl: secImages[i] || secImages[0] || null,
              options: ['A', 'B', 'C', 'D', 'E']
            });
          }
          resolvedQuestions = filled;
        } else if (resolvedQuestions.length > qCount && qCount > 0) {
          resolvedQuestions = resolvedQuestions.slice(0, qCount);
        }

        return {
          id: sec.id || sec.questionId || `sec_${idx}`,
          title: sec.title || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`,
          bankQ: bankQ || sec,
          resolvedQuestions,
          qCount: qCount
        };
      });
    }

    // Fallback: Group questions ONLY by sectionId or sectionTitle if explicitly present
    if (questions && questions.length > 0) {
      const hasExplicitSections = questions.some(q => q.sectionId || q.sectionTitle);
      if (hasExplicitSections) {
        const groups = {};
        questions.forEach((q) => {
          const groupKey = q.sectionId || q.sectionTitle || 'sec_main';
          const groupTitle = q.sectionTitle || '1. Bölüm';

          if (!groups[groupKey]) {
            groups[groupKey] = {
              id: groupKey,
              title: groupTitle,
              bankQ: test,
              resolvedQuestions: [],
              qCount: 0
            };
          }
          groups[groupKey].resolvedQuestions.push(q);
          groups[groupKey].qCount += 1;
        });
        const res = Object.values(groups);
        if (res.length > 0) return res;
      }
    }

    // Fallback: Check if userAnswers has sections array or answers grouped by section
    if (isReviewMode && userAnswers) {
      const rawAns = userAnswers.answers || userAnswers.formattedAnswers || userAnswers;
      if (Array.isArray(rawAns) && rawAns.length > 0) {
        const groups = {};
        rawAns.forEach(a => {
          const sTitle = a.sectionTitle || '1. Bölüm';
          const sId = a.sectionId || 'sec_1';
          if (!groups[sId]) {
            groups[sId] = { id: sId, title: sTitle, bankQ: test, resolvedQuestions: [], qCount: 0 };
          }
          groups[sId].resolvedQuestions.push({
            id: a.questionId || `${sId}_${a.questionNo}`,
            questionText: a.questionText || `Soru ${a.questionNo || 1}`,
            options: a.options || ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: a.correctAnswer !== undefined ? a.correctAnswer : 0
          });
          groups[sId].qCount += 1;
        });
        const res = Object.values(groups);
        if (res.length > 0) return res;
      }
    }

    const safeMaxAns = (obj) => {
      if (!obj || !obj.answerKey) return 0;
      if (Array.isArray(obj.answerKey) || typeof obj.answerKey === 'string') return obj.answerKey.length;
      if (typeof obj.answerKey === 'object') return Object.keys(obj.answerKey).length;
      return 0;
    };
    
    const rawFallbackCount = test.questionCount || test.totalQuestions || test.questionsCount || test.qCount || 0;
    const directAnsCount = safeMaxAns(test);
    const resolvedQuestions = resolveTestQuestions(test, allBankQuestions);
    let finalQs = (resolvedQuestions && resolvedQuestions.length > 0) ? resolvedQuestions : (questions || []);
    
    const countToUse = rawFallbackCount > 0 
      ? rawFallbackCount 
      : (directAnsCount > 0 ? directAnsCount : (finalQs.length > 1 ? finalQs.length : 1));

    if (finalQs.length < countToUse) {
      const filled = [...finalQs];
      for (let i = filled.length; i < countToUse; i++) {
        filled.push({
          id: `${test.id || 'q'}_sub_${i + 1}`,
          questionNo: i + 1,
          questionText: `Soru ${i + 1}`,
          options: ['A', 'B', 'C', 'D', 'E']
        });
      }
      finalQs = filled;
    }

    return [{
      id: test.id || 'sec_1',
      title: test.title || test.name || '1. Bölüm',
      bankQ: test,
      resolvedQuestions: finalQs,
      qCount: countToUse
    }];
  }, [test, questions, allBankQuestions, findInAllSources, isReviewMode, userAnswers]);

  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const activeSec = sections[activeSecIdx] || sections[0];

  // 2. Initialize answer state cleanly per section
  const [sectionAnswers, setSectionAnswers] = useState(() => {
    // A) If Review Mode, populate from userAnswers (which holds the completed submission)
    if (isReviewMode && userAnswers) {
      const rawAns = userAnswers.answers || userAnswers.formattedAnswers || userAnswers.answersMap || userAnswers.userAnswers || userAnswers;
      const initialMap = {};
      sections.forEach(s => { initialMap[s.id] = { answers: {}, openEndedText: {} }; });

      if (Array.isArray(rawAns) && rawAns.length > 0) {
        // Build lookup maps for fast section matching
        const secById = {};
        const secByBankId = {};
        const secByTitle = {};
        sections.forEach(s => {
          secById[String(s.id)] = s;
          if (s.bankQ?.id) secByBankId[String(s.bankQ.id)] = s;
          if (s.bankQ?.questionId) secByBankId[String(s.bankQ.questionId)] = s;
          if (s.title) secByTitle[s.title] = s;
        });

        // Precompute cumulative offsets for sequential fallback
        const secOffsets = [];
        let acc = 0;
        sections.forEach(s => { secOffsets.push(acc); acc += s.qCount; });

        rawAns.forEach((item, idx) => {
          // 1. Try direct ID match
          let targetSec =
            secById[String(item.sectionId)] ||
            secByBankId[String(item.sectionId)] ||
            secByTitle[item.sectionTitle];

          // 2. If no match, try normalized IDs (strip prefixes)
          if (!targetSec && item.sectionId) {
            const normItemSecId = String(item.sectionId).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
            targetSec = sections.find(s => {
              const normSecId = String(s.id).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
              const normBankId = String(s.bankQ?.id || '').replace(/^hw_/, '').replace(/^q_?/, '');
              return normSecId === normItemSecId || normBankId === normItemSecId;
            });
          }

          // 3. Fallback: assign sequentially based on global question index
          if (!targetSec) {
            for (let si = sections.length - 1; si >= 0; si--) {
              if (idx >= secOffsets[si]) {
                targetSec = sections[si];
                break;
              }
            }
            if (!targetSec) targetSec = sections[0];
          }

          if (targetSec) {
            const secId = targetSec.id;
            if (!initialMap[secId]) initialMap[secId] = { answers: {}, openEndedText: {} };

            // Resolve question number within section
            let qNo = item.questionNoInSection ? Number(item.questionNoInSection) : null;
            if (!qNo || isNaN(qNo) || qNo < 1) {
              const globalQNo = item.questionNo || item.qNo;
              const secStartIdx = secOffsets[sections.indexOf(targetSec)];
              if (globalQNo && globalQNo > 0) {
                const localQNo = globalQNo - secStartIdx;
                qNo = localQNo >= 1 ? localQNo : ((idx - secStartIdx) + 1);
              } else {
                qNo = (idx - secStartIdx) + 1;
              }
              if (qNo < 1) qNo = 1;
            }

            // Populate open-ended text
            const oeText = item.userAnswerText || item.textAns || item.openEndedText || item.writtenAnswer || null;
            if (oeText) {
              initialMap[secId].openEndedText[qNo] = oeText;
            }

            // Populate multiple-choice answer
            const userAns = item.userAnswer !== undefined ? item.userAnswer : item.userAns;
            if (userAns !== undefined && userAns !== null) {
              // Resolve correctAnswer - try multiple sources
              let correctAns = item.correctAnswer;
              if ((correctAns === undefined || correctAns === null) && item.correctAnswerLetter) {
                const letter = String(item.correctAnswerLetter).trim().toUpperCase();
                if (/^[A-E]$/.test(letter)) correctAns = letter.charCodeAt(0) - 65;
              }
              initialMap[secId].answers[qNo] = {
                userAnswer: typeof userAns === 'string' && /^[A-Ea-e]$/.test(userAns.trim())
                  ? userAns.trim().toUpperCase().charCodeAt(0) - 65
                  : userAns,
                isCorrect: item.isCorrect,
                correctAnswer: correctAns,
                questionId: item.questionId
              };
            } else if (oeText) {
              // Open-ended: store a marker so we know it was answered
              initialMap[secId].answers[qNo] = {
                userAnswer: null,
                isCorrect: item.isCorrect,
                correctAnswer: null,
                questionId: item.questionId,
                isOpenEnded: true
              };
            }
          }
        });
        return initialMap;
      } else if (rawAns && typeof rawAns === 'object' && !Array.isArray(rawAns)) {
        const secId = sections[0]?.id || 'sec_1';
        if (rawAns[secId] && (rawAns[secId].answers || rawAns[secId].openEndedText)) {
          return rawAns;
        } else {
          initialMap[secId] = { answers: {}, openEndedText: {} };
          Object.keys(rawAns).forEach(k => {
            const qNo = Number(k);
            if (!isNaN(qNo)) {
              const val = rawAns[k];
              if (typeof val === 'object' && val !== null) {
                const oeText = val.userAnswerText || val.textAns || val.openEndedText;
                if (oeText) initialMap[secId].openEndedText[qNo] = oeText;
                if (val.userAnswer !== undefined && val.userAnswer !== null) {
                  initialMap[secId].answers[qNo] = { userAnswer: val.userAnswer !== undefined ? val.userAnswer : val.userAns, isCorrect: val.isCorrect, correctAnswer: val.correctAnswer };
                }
              } else if (typeof val === 'string') {
                initialMap[secId].openEndedText[qNo] = val;
              } else if (typeof val === 'number') {
                initialMap[secId].answers[qNo] = { userAnswer: val };
              }
            }
          });
          return initialMap;
        }
      }
    }

    // B) If Solver Mode, check DB draft (draftAnswers) FIRST
    let initSa = null;
    if (!isReviewMode && draftAnswers && draftAnswers.length > 0) {
      initSa = {};
      sections.forEach(sec => {
        const secAns = draftAnswers.filter(a =>
          String(a.sectionId) === String(sec.id) ||
          String(a.sectionId) === String(sec.questionId) ||
          (a.questionId && (String(a.questionId).startsWith(String(sec.id)) || String(a.questionId).startsWith(String(sec.questionId)))) ||
          a.sectionTitle === sec.title
        );

        if (secAns.length > 0) {
          const ansMap = {};
          const txtMap = {};
          secAns.forEach((a, aIdx) => {
            let qNo = a.questionNoInSection;
            if (!qNo) {
              qNo = Number(a.questionNo);
              let accumulated = 0;
              const sIdx = sections.findIndex(s => s.id === sec.id);
              for(let i=0; i<sIdx; i++) accumulated += sections[i].qCount;
              
              if (qNo > accumulated && qNo <= accumulated + sec.qCount) {
                qNo = qNo - accumulated;
              } else if (qNo > sec.qCount) {
                qNo = ((qNo - 1) % sec.qCount) + 1;
              } else if (isNaN(qNo)) {
                qNo = aIdx + 1;
              }
            }

            if (a.userAnswer !== null && a.userAnswer !== undefined) {
              ansMap[qNo] = { userAnswer: a.userAnswer, isCorrect: a.isCorrect, questionId: a.questionId };
            }
            if (a.userAnswerText) {
              txtMap[qNo] = a.userAnswerText;
            }
          });
          initSa[sec.id] = { answers: ansMap, openEndedText: txtMap };
        }
      });
    }

    // Merge with localStorage
    if (!isReviewMode) {
      try {
        const saved = localStorage.getItem(`${draftKey}_ans`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!initSa) initSa = {};
          Object.keys(parsed).forEach(secId => {
            if (!initSa[secId]) initSa[secId] = { answers: {}, openEndedText: {} };
            const pAns = parsed[secId].answers || {};
            Object.keys(pAns).forEach(qNo => {
               // LocalStorage answers format: { userAnswer: val } or val directly depending on version. Handle both.
               const val = pAns[qNo];
               if (typeof val === 'object' && val !== null) {
                 initSa[secId].answers[qNo] = { userAnswer: val.userAnswer !== undefined ? val.userAnswer : val.userAns, isCorrect: val.isCorrect };
               } else {
                 initSa[secId].answers[qNo] = { userAnswer: val };
               }
            });
            const pTxt = parsed[secId].openEndedText || {};
            Object.keys(pTxt).forEach(qNo => {
               initSa[secId].openEndedText[qNo] = pTxt[qNo];
            });
          });
        }
      } catch {}
    }
    
    if (initSa) {
      sections.forEach(sec => {
        if (!initSa[sec.id]) initSa[sec.id] = { answers: {}, openEndedText: {} };
      });
      return initSa;
    }

    // Default empty
    return Object.fromEntries(sections.map(s => [s.id, { answers: {}, openEndedText: {} }]));
  });

  // Debounced Auto-Save trigger
  const saveTimeoutRef = useRef(null);

  const triggerAutoSave = useCallback((currentSectionAnswers) => {
    if (isReviewMode || !onAutoSave) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      const formattedAnswers = [];
      let globalNo = 1;

      sections.forEach(sec => {
        const sa = currentSectionAnswers[sec.id] || {};
        const secQs = sec.resolvedQuestions || [];
        const bankQ = sec.bankQ || test;

        const answeredKeys = [
          ...Object.keys(sa.answers || {}).map(Number),
          ...Object.keys(sa.openEndedText || {}).map(Number)
        ].filter(n => !isNaN(n) && n > 0);
        const maxAnsweredNo = answeredKeys.length > 0 ? Math.max(...answeredKeys) : 0;
        const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
        const secQCount = Math.max(sec.qCount || 1, sec.resolvedQuestions?.length || 0, maxAnsweredNo, secImgCount);

        for (let idx = 0; idx < secQCount; idx++) {
          const qNo = idx + 1;
          const qObj = secQs[idx] || {};
          const ansObj = sa.answers?.[qNo];
          const userAns = ansObj !== undefined ? (typeof ansObj === 'object' ? ansObj?.userAnswer : ansObj) : null;
          const textAns = sa.openEndedText?.[qNo] || null;
          
          const isCorrect = userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo) : null;

          formattedAnswers.push({
            questionId: qObj.id || `${sec.id}_${qNo}`,
            questionNo: globalNo++,
            questionNoInSection: qNo,
            sectionId: sec.id,
            sectionTitle: sec.title,
            userAnswer: userAns !== undefined ? userAns : null,
            userAnswerText: textAns,
            isCorrect,
            correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
          });
        }
      });
      onAutoSave(formattedAnswers);
    }, 1000);
  }, [isReviewMode, onAutoSave, sections, test]);

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [activeImageQIdx, setActiveImageQIdx] = useState(0);

  useEffect(() => {
    setActiveImageQIdx(0);
  }, [activeSecIdx]);

  const totalQuestionsCount = useMemo(() => {
    return sections.reduce((sum, s) => {
      const sa = sectionAnswers[s.id] || {};
      const answeredKeys = [
        ...Object.keys(sa.answers || {}).map(Number),
        ...Object.keys(sa.openEndedText || {}).map(Number)
      ].filter(n => !isNaN(n) && n > 0);
      const maxAns = answeredKeys.length > 0 ? Math.max(...answeredKeys) : 0;
      const imgCount = Array.isArray(s.bankQ?.imageUrls) ? s.bankQ.imageUrls.length : (Array.isArray(s.imageUrls) ? s.imageUrls.length : 0);
      const effectiveCount = Math.max(s.qCount || 1, s.resolvedQuestions?.length || 0, maxAns, imgCount);
      return sum + effectiveCount;
    }, 0);
  }, [sections, sectionAnswers]);

  const perQuestionMins = Number(test.timePerQuestion || test.time_per_question) || 2;
  const totalSeconds = useMemo(() => totalQuestionsCount * perQuestionMins * 60 || 1200, [totalQuestionsCount, perQuestionMins]);

  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_time`);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= totalSeconds) return val;
      }
    } catch {}
    return totalSeconds;
  });

  useEffect(() => {
    if (isReviewMode) return;
    try {
      localStorage.setItem(`${draftKey}_ans`, JSON.stringify(sectionAnswers));
    } catch {}
  }, [sectionAnswers, draftKey, isReviewMode]);

  useEffect(() => {
    if (isReviewMode) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    try { localStorage.setItem(`${draftKey}_time`, String(timeLeft)); } catch {}

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [draftKey, isReviewMode]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  const handleSelectOption = useCallback((secId, qNo, optIdx, qObj) => {
    if (isReviewMode) return;
    setSectionAnswers(prev => {
      const secState = prev[secId] || { answers: {}, openEndedText: {} };
      const newAnswers = { ...secState.answers, [qNo]: optIdx };
      const updated = { ...prev, [secId]: { ...secState, answers: newAnswers } };
      
      try { localStorage.setItem(`${draftKey}_ans`, JSON.stringify(updated)); } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  }, [draftKey, isReviewMode, triggerAutoSave]);

  const handleTextChange = (secId, qNo, val) => {
    setSectionAnswers(prev => {
      const currentSecState = prev[secId] || { answers: {}, openEndedText: {} };
      const updated = {
        ...prev,
        [secId]: {
          ...currentSecState,
          openEndedText: {
            ...currentSecState.openEndedText,
            [qNo]: val
          }
        }
      };
      
      try { localStorage.setItem(`${draftKey}_ans`, JSON.stringify(updated)); } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  };

  const [showResultModal, setShowResultModal] = useState(false);
  const [submissionAnswers, setSubmissionAnswers] = useState(null);

  const [teacherScores, setTeacherScores] = useState(() => {
    const map = {};
    if (isReviewMode && userAnswers) {
      const rawAns = userAnswers.answers || userAnswers.formattedAnswers || [];
      if (Array.isArray(rawAns)) {
        rawAns.forEach(a => {
          const sId = a.sectionId || 'sec_1';
          const qNo = a.questionNoInSection || a.questionNo;
          if (!map[sId]) map[sId] = {};
          if (a.score !== undefined && a.score !== null) map[sId][qNo] = Number(a.score);
          else if (a.isCorrect === true) map[sId][qNo] = 10;
          else if (a.isCorrect === false) map[sId][qNo] = 0;
        });
      }
    }
    return map;
  });

  const [teacherNotes, setTeacherNotes] = useState(() => {
    const map = {};
    if (isReviewMode && userAnswers) {
      const rawAns = userAnswers.answers || userAnswers.formattedAnswers || [];
      if (Array.isArray(rawAns)) {
        rawAns.forEach(a => {
          const sId = a.sectionId || 'sec_1';
          const qNo = a.questionNoInSection || a.questionNo;
          if (!map[sId]) map[sId] = {};
          if (a.teacherNote) map[sId][qNo] = a.teacherNote;
        });
      }
    }
    return map;
  });

  const [overallFeedback, setOverallFeedback] = useState(userAnswers?.teacherFeedback || userAnswers?.teacherNote || '');
  const [isSavingTeacherGrading, setIsSavingTeacherGrading] = useState(false);

  const liveReviewStats = useMemo(() => {
    let totalPts = 0;
    let maxPts = 0;
    let correct = 0;
    let wrong = 0;
    let blank = 0;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.resolvedQuestions || [];
      const bankQ = sec.bankQ || test;
      const count = sec.qCount || secQs.length || 1;

      for (let i = 1; i <= count; i++) {
        maxPts += 10;
        const teacherSc = teacherScores[sec.id]?.[i];
        if (teacherSc !== undefined && teacherSc !== null) {
          totalPts += teacherSc;
          if (teacherSc >= 5) correct++;
          else wrong++;
        } else {
          const userAns = sa.answers?.[i];
          const textAns = sa.openEndedText?.[i];
          const hasAns = (userAns !== undefined && userAns !== null && userAns !== '') || Boolean(textAns);
          const qObj = secQs[i - 1] || {};
          const isCorr = checkIsAnswerCorrect(userAns, qObj, bankQ, i);
          if (isCorr === true) {
            totalPts += 10;
            correct++;
          } else if (hasAns) {
            wrong++;
          } else {
            blank++;
          }
        }
      }
    });

    const pct = maxPts > 0 ? Math.min(100, Math.round((totalPts / maxPts) * 100)) : 0;
    const net = Math.max(0, correct - (wrong * 0.25));

    return { totalPts, maxPts, pct, correct, wrong, blank, net };
  }, [sections, sectionAnswers, teacherScores, test]);

  const handleSaveTeacherGrading = async () => {
    setIsSavingTeacherGrading(true);
    try {
      const rawAns = userAnswers?.answers || userAnswers?.formattedAnswers || [];
      let totalPts = 0;
      let maxPts = 0;

      const updatedAnswers = sections.flatMap((sec) => {
        const sa = sectionAnswers[sec.id] || {};
        const secQs = sec.resolvedQuestions || [];
        const count = sec.qCount || secQs.length || 1;

        return Array.from({ length: count }).map((_, idx) => {
          const qNo = idx + 1;
          const existingAns = (Array.isArray(rawAns) ? rawAns.find(a => (a.sectionId === sec.id && (a.questionNoInSection === qNo || a.questionNo === qNo))) : null) || {};
          
          const userAns = sa.answers?.[qNo] !== undefined ? sa.answers[qNo] : existingAns.userAnswer;
          const textAns = sa.openEndedText?.[qNo] !== undefined ? sa.openEndedText[qNo] : existingAns.userAnswerText;
          
          const teacherSc = teacherScores[sec.id]?.[qNo];
          let score = teacherSc !== undefined ? teacherSc : (existingAns.score !== undefined ? Number(existingAns.score) : (existingAns.isCorrect === true ? 10 : 0));
          let isCorrect = score >= 5;

          totalPts += score;
          maxPts += 10;

          return {
            ...existingAns,
            sectionId: sec.id,
            sectionTitle: sec.title,
            questionNo: qNo,
            questionNoInSection: qNo,
            userAnswer: userAns,
            userAnswerText: textAns,
            score,
            isCorrect,
            teacherNote: teacherNotes[sec.id]?.[qNo] || existingAns.teacherNote || '',
            evaluatedAt: new Date().toISOString()
          };
        });
      });

      const percentage = maxPts > 0 ? Math.min(100, Math.round((totalPts / maxPts) * 100)) : 0;

      if (userAnswers && userAnswers.id) {
        const updatedSubPayload = {
          ...userAnswers,
          answers: updatedAnswers,
          score: percentage,
          rawScore: totalPts,
          maxScore: maxPts,
          status: 'evaluated',
          isEvaluatedByTeacher: true,
          teacherFeedback: overallFeedback,
          teacherNote: overallFeedback,
          evaluatedAt: new Date().toISOString()
        };

        await updateSubmission(userAnswers.id, updatedSubPayload);

        const hwId = userAnswers.homeworkId || userAnswers.hwId || test.id;
        if (hwId) {
          try {
            await updateHomeworkSubmission(hwId, userAnswers.id, updatedSubPayload);
          } catch (e) {}
        }
      }

      setSubmissionAnswers(updatedAnswers);
      setShowResultModal(true);
    } catch (err) {
      console.error('Error saving teacher grading:', err);
      alert('Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSavingTeacherGrading(false);
    }
  };

  const handleSubmit = () => {
    if (isReviewMode) {
      if (onSubmit) onSubmit(submissionAnswers || []);
      return;
    }

    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = [];
    let globalNo = 1;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.resolvedQuestions || [];
      const bankQ = sec.bankQ || test;

      const answeredKeys = [
        ...Object.keys(sa.answers || {}).map(Number),
        ...Object.keys(sa.openEndedText || {}).map(Number)
      ].filter(n => !isNaN(n) && n > 0);
      const maxAnsweredNo = answeredKeys.length > 0 ? Math.max(...answeredKeys) : 0;
      const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
      const secQCount = Math.max(sec.qCount || 1, sec.resolvedQuestions?.length || 0, maxAnsweredNo, secImgCount);

      for (let idx = 0; idx < secQCount; idx++) {
        const qNo = idx + 1;
        const qObj = secQs[idx] || {};
        const ansObj = sa.answers?.[qNo];
        const userAns = ansObj !== undefined ? (typeof ansObj === 'object' ? ansObj?.userAnswer : ansObj) : null;
        const textAns = sa.openEndedText?.[qNo] || null;
        const isCorrect = userAns !== undefined && userAns !== null
          ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo)
          : null;

        // Resolve correctAnswer letter for review display - prioritize bankQ / section answerKey first
        let correctAns = null;
        const keySources = [
          bankQ?.answerKey,
          sec?.answerKey,
          bankQ?.opticAnswers,
          sec?.opticAnswers,
          bankQ?.contentPayload?.answerKey,
          test?.answerKey,
          test?.opticAnswers
        ];

        for (const ks of keySources) {
          if (!ks) continue;
          let val = null;
          if (Array.isArray(ks)) {
            val = ks[idx] ?? ks[qNo - 1];
          } else if (typeof ks === 'object') {
            val = ks[qNo] ?? ks[String(qNo)] ?? ks[idx] ?? ks[String(idx)];
          } else if (typeof ks === 'string' && ks.trim().length > 0) {
            const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
            val = clean[idx] ?? clean[qNo - 1];
          }
          if (val !== undefined && val !== null && val !== '') {
            if (typeof val === 'number') correctAns = val;
            else if (typeof val === 'string') {
              const s = val.trim().toUpperCase();
              if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
              else if (!isNaN(Number(s))) correctAns = Number(s);
            }
            if (correctAns !== null) break;
          }
        }

        if (correctAns === null) {
          if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
            correctAns = qObj.correctAnswer;
          } else if (qObj.correctAnswerLetter) {
            const letter = String(qObj.correctAnswerLetter).trim().toUpperCase();
            if (/^[A-E]$/.test(letter)) correctAns = letter.charCodeAt(0) - 65;
          }
        }

        formattedAnswers.push({
          questionId: qObj.id || `${sec.id}_${qNo}`,
          questionNo: globalNo++,
          questionNoInSection: qNo,
          sectionId: sec.id,
          sectionTitle: sec.title,
          userAnswer: userAns !== null && userAns !== undefined ? userAns : null,
          userAnswerText: textAns,
          isCorrect,
          correctAnswer: correctAns,
          correctAnswerLetter: correctAns !== null && correctAns !== undefined && typeof correctAns === 'number' && correctAns >= 0 && correctAns <= 4
            ? String.fromCharCode(65 + correctAns)
            : (correctAns !== null && correctAns !== undefined ? String(correctAns) : null)
        });
      }
    });

    setSubmissionAnswers(formattedAnswers);
    setShowResultModal(true);
  };

  const handleConfirmCloseResult = () => {
    if (submissionAnswers && onSubmit) {
      onSubmit(submissionAnswers, { review: false });
    }
  };

  const handleReviewResult = () => {
    if (submissionAnswers && onSubmit) {
      onSubmit(submissionAnswers, { review: true });
    }
  };

  const activeSecState = sectionAnswers[activeSec.id] || { answers: {}, openEndedText: {} };
  const secOE = checkIsOE(activeSec.bankQ) || checkIsOE(activeSec) || Boolean(activeSec.resolvedQuestions && activeSec.resolvedQuestions.some(checkIsOE));
  const activeBankQ = activeSec.bankQ || {};

  const [idbPayload, setIdbPayload] = useState(null);
  const [idbLoading, setIdbLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Reset section-specific payloads when active section changes
  useEffect(() => {
    setIdbPayload(null);
    setIdbLoading(false);
    // Note: HTML iframe src is managed inside StableHtmlViewer (keyed by section id)
  }, [activeSec.id]);

  const extractPayload = useCallback((obj) => {
    if (!obj) return null;
    const candidates = [
      obj.contentPayload, obj.pdfPayload, obj.pdfUrl, obj.url,
      obj.raw_data?.contentPayload, obj.raw_data?.pdfPayload, obj.raw_data?.pdfUrl
    ];
    const direct = candidates.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]');
    if (direct) return direct;

    const qId = obj.questionId || obj.id;
    if (qId && String(qId) !== String(test?.id)) {
      const found = findInAllSources(qId);
      if (found && String(found.id) !== String(test?.id)) {
        const foundCand = [
          found.contentPayload, found.pdfPayload, found.pdfUrl, found.url,
          found.raw_data?.contentPayload, found.raw_data?.pdfPayload, found.raw_data?.pdfUrl
        ];
        const foundDirect = foundCand.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]');
        if (foundDirect) return foundDirect;
      }
    }
    return null;
  }, [findInAllSources, test?.id]);

  const activePdfPayload = extractPayload(activeBankQ) || extractPayload(activeSec) || extractPayload(test) || test?.pdfPayload || test?.pdfUrl || test?.contentPayload || bookPdfUrl || idbPayload;

  const handleManualPdfUpload = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setIdbPayload(dataUrl);
      const targetId = activeSec.id || activeBankQ?.id || test?.id;
      if (targetId) {
        try {
          await idbSetPayload(targetId, dataUrl);
          await idbSetPayload(`q_${targetId}`, dataUrl);
          await idbSetPayload(`hw_${targetId}`, dataUrl);
        } catch (err) {}
      }
    };
    reader.readAsDataURL(file);
  }, [activeSec.id, activeBankQ?.id, test?.id]);

  // Section type MUST be determined strictly for the ACTIVE SECTION (not parent container)
  const isPdf = isPdfSection(activeBankQ) || isPdfSection(activeSec) || isPdfSection(test) || Boolean(activePdfPayload && typeof activePdfPayload === 'string' && (activePdfPayload.startsWith('data:application/pdf') || activePdfPayload.includes('.pdf')));
  
  // Güçlü HTML Tespiti - Herhangi bir kaynakta HTML varsa zorla HTML moduna geç
  const stringToSearch = [
    activeBankQ?.contentPayload, activeSec?.contentPayload, test?.contentPayload,
    activeBankQ?.htmlPayload, activeSec?.htmlPayload, test?.htmlPayload,
    idbPayload
  ].filter(c => typeof c === 'string' && c.length > 10).join(' ');

  const isHtml = !isPdf && (
    isHtmlSection(activeBankQ) || 
    isHtmlSection(activeSec) || 
    isHtmlSection(test) || 
    stringToSearch.includes('<!DOCTYPE') || 
    stringToSearch.includes('<html') || 
    stringToSearch.includes('<body') || 
    stringToSearch.includes('<head') ||
    stringToSearch.startsWith('data:text/html') ||
    test?.contentType === 'html' ||
    activeBankQ?.contentType === 'html'
  );

  const isImage = !isPdf && !isHtml && (isImageSection(activeBankQ) || isImageSection(activeSec) || isImageSection(test) || Boolean(idbPayload && typeof idbPayload === 'string' && idbPayload.startsWith('data:image')));

  const effectiveSecImages = useMemo(() => {
    const candidates = [
      activeSec.imageUrls,
      activeSec.bankQ?.imageUrls,
      activeBankQ?.imageUrls,
      activeSec.imageUrl,
      activeSec.bankQ?.imageUrl,
      activeBankQ?.imageUrl,
      activeSec.contentPayload,
      activeSec.bankQ?.contentPayload,
      activeBankQ?.contentPayload,
      idbPayload
    ];
    for (const c of candidates) {
      const list = extractImageUrls(c);
      if (list && list.length > 0) return list;
    }
    return [];
  }, [activeSec, activeBankQ, idbPayload]);

  const effectiveQCount = useMemo(() => {
    if (isImage && effectiveSecImages.length > 0) {
      return effectiveSecImages.length;
    }
    return resolveExactQuestionCount(activeSec, activeBankQ, activeSec.bankQ, activeSec.resolvedQuestions, effectiveSecImages, test);
  }, [isImage, effectiveSecImages, activeSec, activeBankQ, test]);

  const effectiveResolvedQuestions = useMemo(() => {
    let baseQs = activeSec.resolvedQuestions || [];

    // Check if we have valid real questions with text or options
    const hasRealQs = baseQs.some(q => q.questionText && q.questionText !== `Soru ${q.questionNo || 1}` && (q.options?.length > 0 || q.questionText.length > 10));
    if (hasRealQs && baseQs.length >= effectiveQCount) return baseQs;

    // Try parsing JSON payload from activeSec, activeBankQ, test, or idbPayload
    const payloadSources = [
      activeSec.contentPayload,
      activeBankQ?.contentPayload,
      test?.contentPayload,
      idbPayload,
      activeSec.raw_data?.contentPayload,
      activeBankQ?.raw_data?.contentPayload
    ];

    for (const p of payloadSources) {
      if (typeof p === 'string' && (p.trim().startsWith('[') || p.trim().startsWith('{')) && p !== '[STORED_IN_INDEXEDDB]' && p !== '[LOCALSTORAGE_CACHE]') {
        try {
          const parsed = JSON.parse(p);
          const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items || null);
          if (list && Array.isArray(list) && list.length > 0) {
            return list.map((item, idx) => ({
              ...item,
              id: item.id || `${activeSec.id || 'q'}_sub_${idx + 1}`,
              questionNo: idx + 1,
              questionText: extractQuestionText(item, activeSec, idx),
              options: extractQuestionOptions(item, activeSec)
            }));
          }
        } catch {}
      }
    }

    // Try questionsList from activeSec, activeBankQ, or test
    const listSources = [activeSec.questionsList, activeBankQ?.questionsList, test?.questionsList, activeSec.questions, activeBankQ?.questions, test?.questions];
    for (const list of listSources) {
      if (Array.isArray(list) && list.length > 0 && typeof list[0] === 'object') {
        return list.map((item, idx) => ({
          ...item,
          id: item.id || `${activeSec.id || 'q'}_sub_${idx + 1}`,
          questionNo: idx + 1,
          questionText: extractQuestionText(item, activeSec, idx),
          options: extractQuestionOptions(item, activeSec)
        }));
      }
    }

    let finalQs = baseQs;
    if (finalQs.length < effectiveQCount) {
      const filled = [...finalQs];
      for (let i = filled.length; i < effectiveQCount; i++) {
        filled.push({
          id: `${activeBankQ?.id || activeSec.id || 'q'}_sub_${i + 1}`,
          questionNo: i + 1,
          questionText: `Soru ${i + 1}`,
          options: ['A', 'B', 'C', 'D', 'E']
        });
      }
      finalQs = filled;
    }

    return finalQs;
  }, [activeSec, activeBankQ, test, idbPayload, effectiveQCount]);

  // IDB loader runs ALWAYS on section change regardless of isPdf.
  // This breaks the chicken-and-egg: isPdf can't be true without idbPayload,
  // and idbPayload was never loaded because isPdf was false.
  useEffect(() => {
    const targetObj = activeBankQ.id ? activeBankQ : activeSec;
    // If direct payload already available for THIS section, no need to hit IDB
    if (extractPayload(targetObj)) return;
    // Bug 1 Fix: Do NOT early-exit on test?.pdfPayload — that's from the FIRST section only
    // and would prevent IDB loading for section 2, 3, etc. in bundled homeworks.
    // Only skip if the CURRENT section's own URL/payload is directly available.
    if (activeBankQ?.pdfUrl && !activeBankQ.pdfUrl.startsWith('data:')) return;
    if (idbPayload) return;


    let isMounted = true;
    async function load() {
      setIdbLoading(true);
      const baseIds = [
        targetObj.id,
        activeBankQ?.id,
        activeSec?.id,
        activeBankQ?.questionId,
        activeSec?.questionId,
        test?.id,
        ...(test?.questionIds || []),
        ...(test?.questions || []).map(q => q.id),
        ...(test?.questionsList || []).map(q => q.id)
      ].filter(Boolean);
      const idsToTry = [];
      
      baseIds.forEach(id => {
        const strId = String(id);
        idsToTry.push(strId);
        idsToTry.push(strId.replace(/^q_?/, ''));
        idsToTry.push(strId.replace(/^q_?/, 'q'));
        idsToTry.push(strId.replace(/^q_?/, 'q_'));
        idsToTry.push(strId.replace(/^hw_/, ''));
        idsToTry.push(strId.replace(/^hw_/, 'q'));
        idsToTry.push(strId.replace(/^hw_/, 'q_'));
        idsToTry.push(`q_${strId}`);
        idsToTry.push(`q${strId}`);
      });

      const uniqueIds = [...new Set(idsToTry)];

      // 1st pass: try specific IDs
      for (const idToTry of uniqueIds) {
        try {
          const val = await idbGetPayload(idToTry);
          if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]' && isMounted) {
            setIdbPayload(val);
            setIdbLoading(false);
            return;
          }
        } catch (e) {}
      }

      // 2nd pass: scan ALL IDB keys and fuzzy-match against our IDs
      // This catches cases where the stored key doesn't exactly match any known ID variant
      try {
        const allKeys = await idbGetAllKeys();
        const normIds = uniqueIds.map(id => String(id).replace(/^(hw_|q_|q)/, '').toLowerCase());
        for (const key of allKeys) {
          const normKey = String(key).replace(/^(hw_|q_|q)/, '').toLowerCase();
          const isMatch = normIds.some(nid => nid === normKey || normKey.includes(nid) || nid.includes(normKey));
          if (isMatch) {
            const val = await idbGetPayload(key);
            if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]' && isMounted) {
              setIdbPayload(val);
              setIdbLoading(false);
              return;
            }
          }
        }
      } catch (e) {}

      if (isMounted) setIdbLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [activeSec.id, activeBankQ?.id, extractPayload]);

  // HTML yükleme artık StableHtmlViewer içinde yapılıyor — burada useEffect yok

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a', overflow: 'hidden' }}>
      
      {/* ── TOP HEADER BAR (PERMANENT & ULTRA-COMPACT ON MOBILE) ── */}
      <header style={{
        padding: isMobile ? '0.25rem 0.6rem' : '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        flexShrink: 0,
        gap: isMobile ? '0.35rem' : '0.6rem',
        zIndex: 10,
        minHeight: isMobile ? '38px' : '56px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              title="Sınavdan Çıkış Yap"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: isMobile ? '0.22rem 0.5rem' : '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
                fontSize: isMobile ? '0.72rem' : '0.8rem',
                fontWeight: 800,
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={isMobile ? 13 : 16} />
              <span>Çıkış Yap</span>
            </button>
          )}

          {!isMobile && (
            <div style={{
              padding: '0.35rem 0.75rem',
              background: isReviewMode ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              borderRadius: '0.65rem',
              fontWeight: 900,
              fontSize: '0.76rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(79,70,229,0.25)'
            }}>
              <Layers size={14} /> {isReviewMode ? 'İNCELEME' : 'ÖDEV TESTİ'}
            </div>
          )}
          <h2 style={{ fontSize: isMobile ? '0.8rem' : '1.05rem', fontWeight: 900, margin: 0, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {test.title || test.name}
          </h2>
          {!isMobile && sections.length > 1 && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', flexShrink: 0 }}>
              {sections.length} Bölüm
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.65rem', flexShrink: 0 }}>
          {isReviewMode ? (
            !isMobile && (
              <div style={{ padding: '0.4rem 0.85rem', borderRadius: '0.65rem', background: '#e0e7ff', border: '1.5px solid #c7d2fe', color: '#4338ca', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#4f46e5" />
                <span>🏁 İnceleme Modu</span>
              </div>
            )
          ) : (
            <div style={{
              padding: isMobile ? '0.2rem 0.45rem' : '0.4rem 0.85rem',
              borderRadius: '0.5rem',
              background: timeLeft < 300 ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${timeLeft < 300 ? '#fca5a5' : '#cbd5e1'}`,
              color: timeLeft < 300 ? '#dc2626' : '#0f172a',
              fontWeight: 900,
              fontSize: isMobile ? '0.72rem' : '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Clock size={isMobile ? 12 : 16} color={timeLeft < 300 ? '#dc2626' : '#4f46e5'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.25rem 0.45rem' : '0.45rem 0.95rem',
              borderRadius: '0.5rem',
              background: isDrawingOpen ? '#f59e0b' : '#f8fafc',
              border: `1px solid ${isDrawingOpen ? '#d97706' : '#cbd5e1'}`,
              color: isDrawingOpen ? 'white' : '#334155',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
            title="Çizim Aracı"
          >
            <Pencil size={isMobile ? 12 : 14} /> 
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim Tahtası")}
          </button>

          {isReviewMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.3rem' : '0.65rem' }}>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '0.65rem',
                padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{ fontSize: isMobile ? '0.78rem' : '0.92rem', fontWeight: 900, color: liveReviewStats.pct >= 70 ? '#16a34a' : (liveReviewStats.pct >= 50 ? '#d97706' : '#dc2626') }}>
                  %{liveReviewStats.pct}
                </span>
                <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 800, color: '#64748b' }}>
                  ({liveReviewStats.correct} D / {liveReviewStats.wrong} Y)
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveTeacherGrading}
                disabled={isSavingTeacherGrading}
                style={{
                  padding: isMobile ? '0.3rem 0.6rem' : '0.45rem 1.15rem',
                  borderRadius: '0.65rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.72rem' : '0.85rem',
                  cursor: isSavingTeacherGrading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Save size={isMobile ? 12 : 15} /> 
                {isSavingTeacherGrading ? 'Kaydediliyor...' : isMobile ? 'Kaydet' : 'Değerlendirmeyi Kaydet & Sonucu Gör'}
              </button>

              <button
                type="button"
                onClick={() => onSubmit && onSubmit()}
                style={{
                  padding: isMobile ? '0.3rem 0.5rem' : '0.45rem 0.95rem',
                  borderRadius: '0.65rem',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.72rem' : '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                Kapat
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              style={{
                padding: isMobile ? '0.25rem 0.6rem' : '0.5rem 1.25rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.72rem' : '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={isMobile ? 13 : 18} /> 
              {!isMobile && "Sınavı Bitir ve Gönder"}
              {isMobile && "Bitir"}
            </button>
          )}
        </div>
      </header>

      {/* ── TOP SECTION TABS BAR (HIDDEN ON MOBILE IF SINGLE SECTION) ── */}
      {(!isMobile || sections.length > 1) && (
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: isMobile ? '0.2rem 0.5rem' : '0.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.35rem',
          flexShrink: 0,
          width: '100%',
          boxSizing: 'border-box',
          minHeight: isMobile ? '30px' : 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', flex: 1, paddingBottom: isMobile ? '1px' : '0' }}>
            {sections.map((sec, idx) => {
              const isCurrent = idx === activeSecIdx;
              const secAnsState = sectionAnswers[sec.id]?.answers || {};
              const secTxtState = sectionAnswers[sec.id]?.openEndedText || {};
              const answeredKeys = [
                ...Object.keys(secAnsState).map(Number),
                ...Object.keys(secTxtState).filter(k => secTxtState[k]).map(Number)
              ].filter(n => !isNaN(n) && n > 0);
              const uniqueAnsCount = new Set(answeredKeys).size;
              const maxAnsweredNo = answeredKeys.length > 0 ? Math.max(...answeredKeys) : 0;
              const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
              const targetCount = Math.max(sec.qCount || 1, sec.resolvedQuestions?.length || 0, maxAnsweredNo, secImgCount);
              const isCompleted = uniqueAnsCount >= targetCount && targetCount > 0;

              let cleanTitle = sec.title || '';
              if (cleanTitle.match(/^(\d+\.?\s*(bölüm|blm)|bölüm\s*\d+)/i)) {
                cleanTitle = cleanTitle.replace(/^(\d+\.?\s*(bölüm|blm)|bölüm\s*\d+)[\s:•-]*/i, '').trim();
              }

              return (
                <button
                  key={sec.id || idx}
                  onClick={() => setActiveSecIdx(idx)}
                  style={{
                    padding: isMobile ? '0.2rem 0.45rem' : '0.45rem 1rem',
                    borderRadius: isMobile ? '0.4rem' : '0.65rem',
                    fontWeight: 900,
                    fontSize: isMobile ? '0.68rem' : '0.82rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '0.25rem' : '0.4rem',
                    background: isCurrent
                      ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                      : isCompleted ? '#f0fdf4' : '#ffffff',
                    border: isCurrent
                      ? 'none'
                      : isCompleted ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                    color: isCurrent
                      ? '#ffffff'
                      : isCompleted ? '#15803d' : '#334155',
                    boxShadow: isCurrent
                      ? '0 2px 8px rgba(79, 70, 229, 0.3)'
                      : 'none',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0
                  }}
                >
                  <span>
                    {idx + 1}. Bölüm{cleanTitle && !isMobile ? ` • ${cleanTitle}` : ''}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    padding: '0.08rem 0.35rem',
                    borderRadius: '999px',
                    background: isCurrent
                      ? 'rgba(255,255,255,0.22)'
                      : isCompleted ? '#dcfce7' : '#f1f5f9',
                    color: isCurrent
                      ? '#ffffff'
                      : isCompleted ? '#15803d' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.1rem'
                  }}>
                    {isCompleted && '✓ '}{uniqueAnsCount}/{targetCount}
                  </span>
                </button>
              );
            })}
          </div>

          {sections.length > 1 && (
            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
              <button
                onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
                disabled={activeSecIdx === 0}
                style={{
                  padding: isMobile ? '0.2rem 0.4rem' : '0.45rem 0.9rem',
                  borderRadius: isMobile ? '0.4rem' : '0.6rem',
                  background: activeSecIdx === 0 ? '#f1f5f9' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: activeSecIdx === 0 ? '#94a3b8' : '#334155',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.68rem' : '0.8rem',
                  cursor: activeSecIdx === 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.15rem'
                }}
                title="Önceki Bölüm"
              >
                <ChevronLeft size={isMobile ? 12 : 16} /> {!isMobile && "Önceki"}
              </button>
              <button
                onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                disabled={activeSecIdx === sections.length - 1}
                style={{
                  padding: isMobile ? '0.2rem 0.4rem' : '0.45rem 0.9rem',
                  borderRadius: isMobile ? '0.4rem' : '0.6rem',
                  background: activeSecIdx === sections.length - 1 ? '#f1f5f9' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  border: activeSecIdx === sections.length - 1 ? '1px solid #e2e8f0' : 'none',
                  color: activeSecIdx === sections.length - 1 ? '#94a3b8' : '#ffffff',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.68rem' : '0.8rem',
                  cursor: activeSecIdx === sections.length - 1 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.15rem',
                  boxShadow: activeSecIdx === sections.length - 1 ? 'none' : '0 2px 6px rgba(79,70,229,0.25)'
                }}
                title="Sonraki Bölüm"
              >
                {!isMobile && "Sonraki"} <ChevronRight size={isMobile ? 12 : 16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        
        {idbLoading ? (
          /* Loading spinner while checking IDB for PDF/Image content */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>İçerik yükleniyor...</p>
          </div>
        ) : isPdf ? (
          /* PDF VIEWER + OPTIK PANEL ONLY */
          <QuizPanelLayout
            panelTitle="Optik Form"
            panelSubtitle={`${activeSecIdx + 1}. Bölüm`}
            icon="📋"
            defaultPosition="right"
            defaultSize={320}
            defaultOpenOnMobile={false}
            documentContent={
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#f8fafc', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <PdfViewerWithControls 
                  payload={activePdfPayload} 
                  title={activeSec.title} 
                  height="100%" 
                />
              </div>
            }
            answerContent={
              <RightOptikPanel
                qCount={effectiveQCount}
                answers={activeSecState.answers || {}}
                openEndedText={activeSecState.openEndedText || {}}
                isOpenEnded={secOE}
                resolvedQuestions={effectiveResolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                teacherScores={teacherScores[activeSec.id] || {}}
                onScoreChange={(qNo, sc) => {
                  setTeacherScores(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: sc
                    }
                  }));
                }}
                teacherNotes={teacherNotes[activeSec.id] || {}}
                onNoteChange={(qNo, nt) => {
                  setTeacherNotes(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: nt
                    }
                  }));
                }}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (effectiveResolvedQuestions && effectiveResolvedQuestions[qNo - 1]) || {};
                  handleSelectOption(activeSec.id, qNo, optIdx, qObj);
                }}
                onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
                onNextSection={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                onSubmit={handleSubmit}
                activeSecIdx={activeSecIdx}
                totalSections={sections.length}
              />
            }
          />
        ) : isHtml ? (
          /* HTML VIEWER + OPTIK PANEL ONLY — StableHtmlViewer sayesinde titreme yok */
          <QuizPanelLayout
            panelTitle="Optik Form"
            panelSubtitle={`${activeSecIdx + 1}. Bölüm`}
            icon="📋"
            defaultPosition="right"
            defaultSize={320}
            defaultOpenOnMobile={false}
            documentContent={
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#f8fafc', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <StableHtmlViewer
                  test={test}
                  bankQ={activeBankQ}
                  secId={activeSec.id}
                  testId={test?.id}
                  title={activeSec.title || activeBankQ?.title || 'Doküman / Soru'}
                  idbPayload={idbPayload}
                />
              </div>
            }
            answerContent={
              <RightOptikPanel
                qCount={effectiveQCount}
                answers={activeSecState.answers || {}}
                openEndedText={activeSecState.openEndedText || {}}
                isOpenEnded={secOE}
                resolvedQuestions={effectiveResolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                teacherScores={teacherScores[activeSec.id] || {}}
                onScoreChange={(qNo, sc) => {
                  setTeacherScores(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: sc
                    }
                  }));
                }}
                teacherNotes={teacherNotes[activeSec.id] || {}}
                onNoteChange={(qNo, nt) => {
                  setTeacherNotes(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: nt
                    }
                  }));
                }}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (effectiveResolvedQuestions && effectiveResolvedQuestions[qNo - 1]) || {};
                  handleSelectOption(activeSec.id, qNo, optIdx, qObj);
                }}
                onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
                onNextSection={() => { setActiveSecIdx(p => Math.min(sections.length - 1, p + 1)); setActiveImageQIdx(0); }}
                onSubmit={handleSubmit}
                activeSecIdx={activeSecIdx}
                totalSections={sections.length}
              />
            }
          />
        ) : isImage ? (
          /* IMAGE SET VIEWER (ONE-BY-ONE SEQUENTIAL DISPLAY WITH QUESTION CHIPS) */
          <QuizPanelLayout
            panelTitle="Optik Form"
            panelSubtitle={`${activeSecIdx + 1}. Bölüm`}
            icon="📋"
            defaultPosition="right"
            defaultSize={320}
            defaultOpenOnMobile={false}
            documentContent={
              <>
                <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#f8fafc', overflowY: 'auto', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                  
                  {/* SECTION BANNER */}
                  <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '1.25rem', padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.5rem', color: 'white', boxShadow: '0 6px 20px rgba(2,132,199,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                        🖼️
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.95rem' : '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                          Görsel Soru Seti ({effectiveQCount} Soru) — Soru {activeImageQIdx + 1} / {effectiveQCount}
                        </p>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
                      Bölüm {activeSecIdx + 1} / {sections.length}
                    </div>
                  </div>

                  {/* QUESTION QUICK-JUMP PALETTE (CHIPS) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginRight: '0.25rem' }}>Sorular:</span>
                    {Array.from({ length: effectiveQCount }).map((_, qIdx) => {
                      const qNum = qIdx + 1;
                      const isCurrent = qIdx === activeImageQIdx;
                      const userAns = activeSecState.answers?.[qNum];
                      const hasAns = userAns !== undefined && userAns !== null;
                      const txt = activeSecState.openEndedText?.[qNum];
                      const isDone = hasAns || Boolean(txt);

                      let chipBg = '#f1f5f9';
                      let chipColor = '#475569';
                      let chipBorder = '1px solid #cbd5e1';

                      if (isCurrent) {
                        chipBg = 'linear-gradient(135deg, #0284c7, #0369a1)';
                        chipColor = '#ffffff';
                        chipBorder = 'none';
                      } else if (isDone) {
                        chipBg = '#ecfdf5';
                        chipColor = '#059669';
                        chipBorder = '1.5px solid #a7f3d0';
                      }

                      return (
                        <button
                          key={qNum}
                          onClick={() => setActiveImageQIdx(qIdx)}
                          style={{
                            minWidth: '34px',
                            height: '34px',
                            padding: '0 0.45rem',
                            borderRadius: '0.55rem',
                            background: chipBg,
                            color: chipColor,
                            border: chipBorder,
                            fontWeight: 900,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isCurrent ? '0 4px 10px rgba(2,132,199,0.3)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isDone && !isCurrent ? '✓ ' : ''}{qNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* ACTIVE QUESTION CARD */}
                  {(() => {
                    const idx = Math.min(Math.max(0, activeImageQIdx), Math.max(0, effectiveQCount - 1));
                    const qNo = idx + 1;
                    const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[idx]) || {};
                    const isQOpenEnded = secOE || checkIsOE(qObj);

                    let questionImageUrls = [];
                    if (effectiveSecImages.length > 0) {
                      if (effectiveSecImages[idx]) {
                        questionImageUrls = [effectiveSecImages[idx]];
                      } else {
                        questionImageUrls = [effectiveSecImages[0]];
                      }
                    }
                    const imageUrls = extractImageUrls(questionImageUrls);

                    const userAnsObj = activeSecState.answers?.[qNo];
                    const selectedOpt = userAnsObj !== undefined ? (typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj) : undefined;
                    const textVal = activeSecState.openEndedText?.[qNo] || '';

                    let correctAns = null;
                    const keySources = [
                      activeSec?.bankQ?.answerKey,
                      activeSec?.answerKey,
                      activeSec?.bankQ?.opticAnswers,
                      activeSec?.opticAnswers,
                      activeSec?.bankQ?.contentPayload?.answerKey,
                      test?.answerKey,
                      test?.opticAnswers
                    ];

                    for (const ks of keySources) {
                      if (!ks) continue;
                      let val = null;
                      if (Array.isArray(ks)) {
                        val = ks[idx] ?? ks[qNo - 1];
                      } else if (typeof ks === 'object') {
                        val = ks[qNo] ?? ks[String(qNo)] ?? ks[idx] ?? ks[String(idx)];
                      } else if (typeof ks === 'string') {
                        const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
                        val = clean[idx] ?? clean[qNo - 1];
                      }
                      if (val !== undefined && val !== null && val !== '') {
                        if (typeof val === 'number') correctAns = val;
                        else if (typeof val === 'string') {
                          const s = val.trim().toUpperCase();
                          if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                          else if (!isNaN(Number(s))) correctAns = Number(s);
                        }
                        if (correctAns !== null) break;
                      }
                    }

                    if (correctAns === null) {
                      const rawSubCorr = userAnsObj?.correctAnswerLetter || userAnsObj?.correctAnswer;
                      if (rawSubCorr !== undefined && rawSubCorr !== null && rawSubCorr !== '') {
                        if (typeof rawSubCorr === 'number') correctAns = rawSubCorr;
                        else if (typeof rawSubCorr === 'string') {
                          const s = rawSubCorr.trim().toUpperCase();
                          if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                          else if (!isNaN(Number(s))) correctAns = Number(s);
                        }
                      }
                    }

                    if (correctAns === null) {
                      if (qObj.correctAnswerLetter) {
                        const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                        if (/^[A-E]$/.test(lt)) correctAns = lt.charCodeAt(0) - 65;
                      } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                        correctAns = qObj.correctAnswer;
                      }
                    }

                    const isQAnswered = selectedOpt !== undefined && selectedOpt !== null;
                    const isQCorrect = isReviewMode && isQAnswered
                      ? (userAnsObj?.isCorrect !== undefined ? userAnsObj.isCorrect : (correctAns !== null && correctAns !== undefined && selectedOpt === correctAns))
                      : null;

                    const teacherSc = teacherScores[activeSec.id]?.[qNo];
                    const hasTeacherGraded = teacherSc !== undefined && teacherSc !== null;
                    const currentTeacherScore = hasTeacherGraded ? teacherSc : (isQCorrect === true ? 10 : (isQCorrect === false ? 0 : undefined));

                    return (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '1.25rem',
                        border: isReviewMode
                          ? (currentTeacherScore === 10 || isQCorrect === true ? '1.5px solid #86efac' : currentTeacherScore === 5 ? '1.5px solid #fde68a' : (currentTeacherScore === 0 || isQCorrect === false) ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0')
                          : '1.5px solid #e2e8f0',
                        padding: isMobile ? '1rem' : '1.5rem',
                        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                      }}>
                        
                        {/* QUESTION HEADER */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ padding: '0.35rem 0.85rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.9rem' }}>
                              SORU {qNo} / {effectiveQCount}
                            </span>
                            {isQOpenEnded && (
                              <span style={{ padding: '0.2rem 0.6rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                                ✍️ Açık Uçlu / Yazılı
                              </span>
                            )}
                          </div>

                          {isReviewMode ? (
                            currentTeacherScore === 10 ? (
                              <span style={{ fontSize: '0.78rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU (10P)</span>
                            ) : currentTeacherScore === 5 ? (
                              <span style={{ fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>½ YARIM (5P)</span>
                            ) : currentTeacherScore === 0 ? (
                              <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ (0P)</span>
                            ) : isQOpenEnded ? (
                              <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>✍️ Puan Ver</span>
                            ) : isQAnswered ? (
                              isQCorrect
                                ? <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 900 }}>✓ DOĞRU</span>
                                : <span style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 900 }}>✗ YANLIŞ</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— BOŞ</span>
                            )
                          ) : (
                            isQAnswered || textVal ? (
                              <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 900 }}>✓ Cevaplandı</span>
                            ) : (
                              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>— Yanıtlanmadı</span>
                            )
                          )}
                        </div>

                        {/* QUESTION IMAGES */}
                        {imageUrls.map((url, imgIdx) => (
                          <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${qNo} Görsel`} onOpenFullscreen={() => setLightboxSrc(url)} />
                        ))}

                        {/* MULTIPLE CHOICE OPTIONS OR WRITTEN INPUT */}
                        {!isQOpenEnded ? (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {(() => {
                              const isExplicitFive = Boolean(
                                Number(test?.optionCount) === 5 ||
                                Number(test?.optionsCount) === 5 ||
                                Number(test?.book?.optionCount) === 5 ||
                                String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                                test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS' ||
                                test?.book?.publisher === 'TYT' || test?.book?.publisher === 'AYT' || test?.book?.publisher === 'YKS' ||
                                Boolean(String(test?.grade || test?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                                Boolean(String(test?.title || test?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                              );
                              const isFourOptions = !isExplicitFive;
                              const optList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
                              return optList.map((opt, optIdx) => {
                                const isSelected = selectedOpt === optIdx;
                                const isCorrectOpt = (isReviewMode && isQCorrect && isSelected)
                                  ? true
                                  : (correctAns !== null && correctAns !== undefined && correctAns === optIdx);

                                let bg = '#ffffff';
                                let border = '1.5px solid #cbd5e1';
                                let color = '#334155';

                                if (isReviewMode) {
                                  if (isSelected && isCorrectOpt) { bg = '#059669'; border = 'none'; color = 'white'; }
                                  else if (isSelected && !isCorrectOpt) { bg = '#dc2626'; border = 'none'; color = 'white'; }
                                  else if (isCorrectOpt) { bg = '#f0fdf4'; border = '1.5px solid #16a34a'; color = '#16a34a'; }
                                } else if (isSelected) {
                                  bg = '#059669';
                                  border = 'none'; color = 'white';
                                }

                                return (
                                  <button
                                    key={opt}
                                    onClick={() => !isReviewMode && handleSelectOption(activeSec.id, qNo, optIdx, qObj)}
                                    disabled={isReviewMode}
                                    style={{
                                      flex: 1,
                                      height: '46px',
                                      borderRadius: '0.75rem',
                                      border,
                                      background: bg,
                                      color,
                                      fontWeight: 900,
                                      fontSize: '1.05rem',
                                      cursor: isReviewMode ? 'default' : 'pointer',
                                      transition: 'all 0.15s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: isSelected && !isReviewMode ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {isReviewMode && textVal && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Öğrenci Yanıtı:</div>
                            )}
                            <textarea
                              value={textVal}
                              onChange={e => !isReviewMode && handleTextChange(activeSec.id, qNo, e.target.value)}
                              readOnly={isReviewMode}
                              placeholder={isReviewMode ? 'Öğrenci bu soruya yanıt yazmadı.' : `Soru ${qNo} için yanıtınızı buraya yazınız...`}
                              rows={4}
                              style={{
                                width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                                background: '#ffffff',
                                border: isReviewMode
                                  ? (textVal ? '1.5px solid #10b981' : '1px solid #cbd5e1')
                                  : '1px solid #cbd5e1',
                                color: '#0f172a', fontFamily: 'inherit', fontSize: '0.95rem',
                                resize: isReviewMode ? 'none' : 'vertical',
                                boxSizing: 'border-box', outline: 'none',
                                cursor: isReviewMode ? 'default' : 'text'
                              }}
                            />
                          </div>
                        )}

                        {/* Öğretmen Puanlama Butonları (Review Modunda) */}
                        {isReviewMode && (
                          <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                                🎯 Öğretmen Puanlaması (Soru {qNo}):
                              </span>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTeacherScores(p => ({
                                      ...p,
                                      [activeSec.id]: {
                                        ...(p[activeSec.id] || {}),
                                        [qNo]: 10
                                      }
                                    }));
                                  }}
                                  style={{
                                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
                                    border: currentTeacherScore === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1',
                                    background: currentTeacherScore === 10 ? '#16a34a' : '#ffffff',
                                    color: currentTeacherScore === 10 ? '#ffffff' : '#15803d',
                                    fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
                                  }}
                                >
                                  ✓ Doğru (D)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTeacherScores(p => ({
                                      ...p,
                                      [activeSec.id]: {
                                        ...(p[activeSec.id] || {}),
                                        [qNo]: 0
                                      }
                                    }));
                                  }}
                                  style={{
                                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
                                    border: currentTeacherScore === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                    background: currentTeacherScore === 0 ? '#dc2626' : '#ffffff',
                                    color: currentTeacherScore === 0 ? '#ffffff' : '#b91c1c',
                                    fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
                                  }}
                                >
                                  ✗ Yanlış (Y)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTeacherScores(p => ({
                                      ...p,
                                      [activeSec.id]: {
                                        ...(p[activeSec.id] || {}),
                                        [qNo]: 0
                                      }
                                    }));
                                  }}
                                  style={{
                                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
                                    border: currentTeacherScore === 0 && !isQAnswered ? '2px solid #64748b' : '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    color: '#64748b',
                                    fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
                                  }}
                                >
                                  ○ Boş (B)
                                </button>
                                {isQOpenEnded && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTeacherScores(p => ({
                                        ...p,
                                        [activeSec.id]: {
                                          ...(p[activeSec.id] || {}),
                                          [qNo]: 5
                                        }
                                      }));
                                    }}
                                    style={{
                                      padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
                                      border: currentTeacherScore === 5 ? '2px solid #d97706' : '1px solid #cbd5e1',
                                      background: currentTeacherScore === 5 ? '#d97706' : '#ffffff',
                                      color: currentTeacherScore === 5 ? '#ffffff' : '#d97706',
                                      fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                  >
                                    ½ Yarım (5P)
                                  </button>
                                )}
                              </div>
                            </div>
                            <input
                              type="text"
                              placeholder={`Soru ${qNo} için geri bildirim notu...`}
                              value={teacherNotes[activeSec.id]?.[qNo] || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setTeacherNotes(p => ({
                                  ...p,
                                  [activeSec.id]: {
                                    ...(p[activeSec.id] || {}),
                                    [qNo]: v
                                  }
                                }));
                              }}
                              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* BOTTOM STEP NAVIGATION BUTTONS */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {/* PREVIOUS BUTTON */}
                    {activeImageQIdx > 0 ? (
                      <button
                        onClick={() => setActiveImageQIdx(p => Math.max(0, p - 1))}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
                      >
                        <ChevronLeft size={18} /> Önceki Soru
                      </button>
                    ) : activeSecIdx > 0 ? (
                      <button
                        onClick={() => {
                          setActiveSecIdx(p => Math.max(0, p - 1));
                          setActiveImageQIdx(0);
                        }}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
                      >
                        <ChevronLeft size={18} /> Önceki Bölüm
                      </button>
                    ) : (
                      <button
                        disabled
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: '#f1f5f9', border: '1.5px solid #cbd5e1', color: '#94a3b8', fontWeight: 900, fontSize: '0.9rem', cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <ChevronLeft size={18} /> Önceki Soru
                      </button>
                    )}

                    {/* NEXT / FINISH BUTTON */}
                    {activeImageQIdx < effectiveQCount - 1 ? (
                      <button
                        onClick={() => setActiveImageQIdx(p => Math.min(effectiveQCount - 1, p + 1))}
                        style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(2,132,199,0.35)' }}
                      >
                        Sonraki Soru <ChevronRight size={18} />
                      </button>
                    ) : activeSecIdx < sections.length - 1 ? (
                      <button
                        onClick={() => {
                          setActiveSecIdx(p => Math.min(sections.length - 1, p + 1));
                          setActiveImageQIdx(0);
                        }}
                        style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
                      >
                        Sonraki Bölüm <ChevronRight size={18} />
                      </button>
                    ) : isReviewMode ? (
                      <button
                        onClick={() => onSubmit && onSubmit()}
                        style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}
                      >
                        <CheckCircle2 size={18} /> İncelemeyi Kapat
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                      >
                        <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
                      </button>
                    )}
                  </div>
                </div>
              </>
            }
            answerContent={
              <RightOptikPanel
                qCount={effectiveQCount}
                answers={activeSecState.answers || {}}
                openEndedText={activeSecState.openEndedText || {}}
                isOpenEnded={secOE}
                resolvedQuestions={effectiveResolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                teacherScores={teacherScores[activeSec.id] || {}}
                onScoreChange={(qNo, sc) => {
                  setTeacherScores(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: sc
                    }
                  }));
                }}
                teacherNotes={teacherNotes[activeSec.id] || {}}
                onNoteChange={(qNo, nt) => {
                  setTeacherNotes(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: nt
                    }
                  }));
                }}
                onOptionSelect={(qNo, optIdx) => {
                  setActiveImageQIdx(qNo - 1);
                  const qObj = (effectiveResolvedQuestions && effectiveResolvedQuestions[qNo - 1]) || {};
                  handleSelectOption(activeSec.id, qNo, optIdx, qObj);
                }}
                onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
                onNextSection={() => { setActiveSecIdx(p => Math.min(sections.length - 1, p + 1)); setActiveImageQIdx(0); }}
                onSubmit={handleSubmit}
                activeSecIdx={activeSecIdx}
                totalSections={sections.length}
              />
            }
          />
        ) : (
          /* STANDARD QUESTION CARDS + OPTIK PANEL */
          <QuizPanelLayout
            panelTitle="Optik Form"
            panelSubtitle={`${activeSecIdx + 1}. Bölüm`}
            icon="📋"
            defaultPosition="right"
            defaultSize={320}
            defaultOpenOnMobile={false}
            documentContent={
              <div style={{ flex: 1, minWidth: 0, background: '#f8fafc', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                {/* SECTION BANNER */}
                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3730a3)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 4px 16px rgba(79,70,229,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                        Bu bölümdeki {effectiveQCount} sorunun tamamı aşağıda sıralanmıştır.
                      </p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
                    Bölüm {activeSecIdx + 1} / {sections.length}
                  </div>
                </div>

                {/* QUESTION CARDS STACKED VERTICALLY */}
                {Array.from({ length: effectiveQCount }).map((_, idx) => {
                  const qNo = idx + 1;
                  const qObj = (effectiveResolvedQuestions && effectiveResolvedQuestions[idx]) || {};
                  const isQOpenEnded = secOE || checkIsOE(qObj);

                  const qText = qObj.questionText || qObj.text || qObj.question || qObj.title || qObj.questionTitle || qObj.name || (qObj.contentPayload && !qObj.contentPayload.startsWith('data:') ? qObj.contentPayload : null) || `Soru ${qNo}`;

                  const rawImages = [qObj.imageUrls, qObj.imageUrl, qObj.image, qObj.contentPayload];
                  const imageUrls = extractImageUrls(rawImages);

                  const isExplicitFive = Boolean(
                    Number(test?.optionCount) === 5 ||
                    Number(test?.optionsCount) === 5 ||
                    Number(test?.book?.optionCount) === 5 ||
                    String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                    test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS' ||
                    test?.book?.publisher === 'TYT' || test?.book?.publisher === 'AYT' || test?.book?.publisher === 'YKS' ||
                    Boolean(String(test?.grade || test?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                    Boolean(String(test?.title || test?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                  );
                  const isFourOpts = !isExplicitFive;
                  const options = (qObj.options && Array.isArray(qObj.options) && qObj.options.length > 0)
                    ? (isFourOpts && qObj.options.length > 4 ? qObj.options.slice(0, 4) : qObj.options)
                    : (isFourOpts ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']);

                  const userAnsObj = activeSecState.answers?.[qNo];
                  const selectedOpt = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
                  const textVal = activeSecState.openEndedText?.[qNo] || '';

                  // Review mode: resolve correctAnswer
                  let corrAns = null;
                  const keySources = [
                    activeSec?.bankQ?.answerKey,
                    activeSec?.answerKey,
                    activeSec?.bankQ?.opticAnswers,
                    activeSec?.opticAnswers,
                    activeSec?.bankQ?.contentPayload?.answerKey,
                    test?.answerKey,
                    test?.opticAnswers
                  ];

                  for (const ks of keySources) {
                    if (!ks) continue;
                    let val = null;
                    if (Array.isArray(ks)) {
                      val = ks[idx] ?? ks[qNo - 1];
                    } else if (typeof ks === 'object') {
                      val = ks[qNo] ?? ks[String(qNo)] ?? ks[idx] ?? ks[String(idx)];
                    } else if (typeof ks === 'string') {
                      const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
                      val = clean[idx] ?? clean[qNo - 1];
                    }
                    if (val !== undefined && val !== null && val !== '') {
                      if (typeof val === 'number') corrAns = val;
                      else if (typeof val === 'string') {
                        const s = val.trim().toUpperCase();
                        if (/^[A-E]$/.test(s)) corrAns = s.charCodeAt(0) - 65;
                        else if (!isNaN(Number(s))) corrAns = Number(s);
                      }
                      if (corrAns !== null) break;
                    }
                  }

                  if (corrAns === null) {
                    const rawSubCorr = userAnsObj?.correctAnswerLetter || userAnsObj?.correctAnswer;
                    if (rawSubCorr !== undefined && rawSubCorr !== null && rawSubCorr !== '') {
                      if (typeof rawSubCorr === 'number') corrAns = rawSubCorr;
                      else if (typeof rawSubCorr === 'string') {
                        const s = rawSubCorr.trim().toUpperCase();
                        if (/^[A-E]$/.test(s)) corrAns = s.charCodeAt(0) - 65;
                        else if (!isNaN(Number(s))) corrAns = Number(s);
                      }
                    }
                  }

                  if (corrAns === null) {
                    if (qObj.correctAnswerLetter) {
                      const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                      if (/^[A-E]$/.test(lt)) corrAns = lt.charCodeAt(0) - 65;
                    } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                      corrAns = qObj.correctAnswer;
                    }
                  }

                  const isStdAnswered = selectedOpt !== undefined && selectedOpt !== null;
                  const isStdCorrect = isReviewMode && isStdAnswered
                    ? (userAnsObj?.isCorrect !== undefined ? userAnsObj.isCorrect : (corrAns !== null && corrAns !== undefined && selectedOpt === corrAns))
                    : null;

                  return (
                    <div key={qNo} style={{
                      background: '#ffffff',
                      borderRadius: '1.1rem',
                      border: isReviewMode && !isQOpenEnded && isStdAnswered
                        ? `1.5px solid ${isStdCorrect ? '#bbf7d0' : '#fecaca'}`
                        : '1.5px solid #e2e8f0',
                      padding: '1.5rem',
                      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
                      display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                      
                      {/* QUESTION HEADER */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ padding: '0.3rem 0.75rem', background: '#4f46e5', color: 'white', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                            SORU {qNo}
                          </span>
                          {isQOpenEnded && (
                            <span style={{ padding: '0.2rem 0.6rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                              ✍️ Açık Uçlu / Yazılı
                            </span>
                          )}
                        </div>

                        {isReviewMode ? (
                          isQOpenEnded ? (
                            <span style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 900 }}>⏳ Öğretmen değerlendirmesinde</span>
                          ) : isStdAnswered ? (
                            isStdCorrect
                              ? <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 900 }}>✓ DOĞRU</span>
                              : <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 900 }}>✗ YANLIŞ</span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— BOŞ</span>
                          )
                        ) : (
                          isStdAnswered || textVal ? (
                            <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 900 }}>✓ Cevaplandı</span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— Yanıtlanmadı</span>
                          )
                        )}
                      </div>

                      {/* QUESTION IMAGES */}
                      {imageUrls.map((url, imgIdx) => (
                        <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${qNo} Görsel`} />
                      ))}

                      {/* QUESTION TEXT */}
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.65 }}>
                        {qText}
                      </div>

                      {/* MULTIPLE CHOICE OPTIONS OR WRITTEN INPUT */}
                      {!isQOpenEnded ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                          {options.map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx;
                            const isCorrectOpt = (isReviewMode && isStdCorrect && isSelected)
                              ? true
                              : (corrAns !== null && corrAns !== undefined && corrAns === optIdx);
                            const optLetter = String.fromCharCode(65 + optIdx);
                            let optText = '';
                            if (typeof opt === 'string') optText = opt;
                            else if (opt && typeof opt === 'object') optText = opt.text || opt.optionText || opt.label || opt.title || opt.value || opt.content || '';
                            const showText = Boolean(optText && optText.trim() !== optLetter);

                            let bg = '#ffffff';
                            let border = '1.5px solid #cbd5e1';
                            let color = '#334155';

                            if (isReviewMode) {
                              if (isSelected && isCorrectOpt) { bg = '#f0fdf4'; border = '2px solid #22c55e'; color = '#15803d'; }
                              else if (isSelected && !isCorrectOpt) { bg = '#fef2f2'; border = '2px solid #ef4444'; color = '#b91c1c'; }
                              else if (isCorrectOpt) { bg = '#f0fdf4'; border = '1.5px solid #86efac'; color = '#15803d'; }
                            } else if (isSelected) {
                              bg = '#eff6ff'; border = '2px solid #2563eb'; color = '#1d4ed8';
                            }

                            return (
                              <button key={optIdx}
                                onClick={() => !isReviewMode && handleSelectOption(activeSec.id, qNo, optIdx, qObj)}
                                disabled={isReviewMode}
                                style={{
                                  padding: '0.9rem 1.25rem', borderRadius: '0.75rem', textAlign: 'left',
                                  cursor: isReviewMode ? 'default' : 'pointer',
                                  fontWeight: (isSelected || isCorrectOpt) ? 900 : 700,
                                  border, background: bg, color, transition: 'all 0.15s ease',
                                  display: 'flex', alignItems: 'center'
                                }}>
                                <span style={{ fontWeight: 900, color: isSelected ? '#2563eb' : (isCorrectOpt && isReviewMode ? '#15803d' : '#64748b'), fontSize: '0.95rem', marginRight: '0.75rem', minWidth: '24px' }}>
                                  {optLetter})
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                                  {showText ? optText : `Seçenek ${optLetter}`}
                                </span>
                                {isReviewMode && isCorrectOpt && !isSelected && (
                                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#15803d', fontWeight: 900 }}>✓ Doğru Yanıt</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.85rem', color: isReviewMode ? '#64748b' : '#4f46e5' }}>
                            {isReviewMode ? '📝 Öğrenci Yanıtı:' : '✍️ Açık Uçlu Yanıtınızı Buraya Yazınız:'}
                          </label>
                          <textarea
                            value={textVal}
                            onChange={e => !isReviewMode && handleTextChange(activeSec.id, qNo, e.target.value)}
                            readOnly={isReviewMode}
                            placeholder={isReviewMode ? 'Öğrenci bu soruya yanıt yazmadı.' : `Soru ${qNo} için yanıtınızı buraya yazınız...`}
                            rows={4}
                            style={{
                              width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                              background: '#ffffff',
                              border: isReviewMode ? (textVal ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0') : '1.5px solid #cbd5e1',
                              color: '#0f172a', fontFamily: 'inherit', fontSize: '0.95rem',
                              resize: isReviewMode ? 'none' : 'vertical',
                              boxSizing: 'border-box', outline: 'none',
                              cursor: isReviewMode ? 'default' : 'text'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* BOTTOM SECTION NAV BUTTONS */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <button
                    onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
                    disabled={activeSecIdx === 0}
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#f1f5f9' : '#ffffff', border: '1.5px solid #cbd5e1', color: activeSecIdx === 0 ? '#94a3b8' : '#475569', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <ChevronLeft size={18} /> Önceki Bölüm
                  </button>

                  {activeSecIdx < sections.length - 1 ? (
                    <button
                      onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                      style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
                    >
                      Sonraki Bölüm <ChevronRight size={18} />
                    </button>
                  ) : isReviewMode ? (
                    <button
                      onClick={() => onSubmit && onSubmit()}
                      style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}
                    >
                      <CheckCircle2 size={18} /> İncelemeyi Kapat
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                    >
                      <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
                    </button>
                  )}
                </div>
              </div>
            }
            answerContent={
              <RightOptikPanel
                qCount={effectiveQCount}
                answers={activeSecState.answers || {}}
                openEndedText={activeSecState.openEndedText || {}}
                isOpenEnded={secOE}
                resolvedQuestions={effectiveResolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                teacherScores={teacherScores[activeSec.id] || {}}
                onScoreChange={(qNo, sc) => {
                  setTeacherScores(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: sc
                    }
                  }));
                }}
                teacherNotes={teacherNotes[activeSec.id] || {}}
                onNoteChange={(qNo, nt) => {
                  setTeacherNotes(p => ({
                    ...p,
                    [activeSec.id]: {
                      ...(p[activeSec.id] || {}),
                      [qNo]: nt
                    }
                  }));
                }}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (effectiveResolvedQuestions && effectiveResolvedQuestions[qNo - 1]) || {};
                  handleSelectOption(activeSec.id, qNo, optIdx, qObj);
                }}
                onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
                onNextSection={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                onSubmit={handleSubmit}
                activeSecIdx={activeSecIdx}
                totalSections={sections.length}
              />
            }
          />
        )}
      </div>

      {showResultModal && (
        <MultiResultModal
          test={test}
          sections={sections}
          sectionAnswers={sectionAnswers}
          teacherScores={teacherScores}
          teacherNotes={teacherNotes}
          overallFeedback={overallFeedback}
          isReviewMode={isReviewMode}
          onConfirmClose={handleConfirmCloseResult}
          onReview={handleReviewResult}
        />
      )}

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
