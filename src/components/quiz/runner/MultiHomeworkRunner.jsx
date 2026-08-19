import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useCurriculum } from '../../../context/CurriculumContext';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import { resolveTestQuestions, extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload, idbGetAllKeys } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl, extractImageUrls } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil, Eye } from 'lucide-react';
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

  const secDirectCount = getRawCount(sec);
  const parentRawCount = getRawCount(parentTest);
  const bankRawCount = Math.max(getRawCount(foundInBank), getRawCount(bankQ), getRawCount(bankQ?.bankQ), getRawCount(sec?.bankQ), 0);

  // 0. Direct assignment question count from the homework has TOP priority.
  // For single-section homeworks: parent homework totalQuestions (or section count).
  // For multi-section homeworks: the section's own direct assignment question count.
  if (isSingleSection && parentRawCount > 0) {
    return parentRawCount;
  }
  if (secDirectCount > 0) {
    return secDirectCount;
  }

  // 1. If we have resolved questions already with length > 1
  if (Array.isArray(resolvedQuestions) && resolvedQuestions.length > 1) {
    return resolvedQuestions.length;
  }

  // 2. Bank template question count
  if (bankRawCount > 0) {
    return bankRawCount;
  }

  // 3. Section-level questionsList length
  const secQListCount = Math.max(...sectionObjects.map(getQuestionsListCount), 0);
  if (secQListCount > 0) return secQListCount;
  if (isSingleSection) {
    const parentQListCount = getQuestionsListCount(parentTest);
    if (parentQListCount > 0) return parentQListCount;
  }

  // 4. Answer key count
  const secAkCount = Math.max(...sectionObjects.map(getAkCount), 0);
  if (secAkCount > 0) return secAkCount;
  if (isSingleSection) {
    const parentAkCount = getAkCount(parentTest);
    if (parentAkCount > 0) return parentAkCount;
  }

  // 5. Visual images count if image test
  const imgCount = Array.isArray(secImages) ? secImages.length : 0;
  if (imgCount > 1) return imgCount;
  for (const obj of sectionObjects) {
    if (Array.isArray(obj.imageUrls) && obj.imageUrls.length > 1) {
      return obj.imageUrls.length;
    }
  }

  // 6. Questions array
  for (const obj of sectionObjects) {
    if (Array.isArray(obj.questions) && obj.questions.length > 1) {
      return obj.questions.length;
    }
  }
  if (isSingleSection && Array.isArray(parentTest?.questions) && parentTest.questions.length > 1) {
    return parentTest.questions.length;
  }

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
  isReviewMode = false
}) {
  const isLastSec = activeSecIdx === totalSections - 1;
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Calculate answered count and progress percentage for this section
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
      
      {/* ── OPTIK HEADER WITH PROGRESS BAR ── */}
      <div style={{
        padding: isMobile ? '0.65rem 0.85rem' : '0.9rem 1.15rem',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{isReviewMode ? '🔍' : isOpenEnded ? '✍️' : '📋'}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                {isReviewMode ? 'Sınav İnceleme & Cevaplar' : isOpenEnded ? 'Açık Uçlu Cevap Paneli' : 'Optik Cevap Kağıdı'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                {totalSections > 1 ? `${activeSecIdx + 1}. Bölüm • ` : ''}{qCount} Soru
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background: progressPct === 100 ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${progressPct === 100 ? '#86efac' : '#bfdbfe'}`,
              color: progressPct === 100 ? '#15803d' : '#2563eb',
              fontSize: '0.72rem',
              fontWeight: 900
            }}>
              {answeredCount} / {qCount} Kodlandı
            </span>
          </div>
        </div>

        {/* Section Progress Bar */}
        <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
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
        padding: isMobile ? '0.5rem 0.65rem' : '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.45rem' : '0.65rem'
      }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = (resolvedQuestions && resolvedQuestions[idx]) || {};
          const isQOE = isOpenEnded || checkIsOE(qObj);

          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          const isAnswered = (userAns !== undefined && userAns !== null && userAns !== '') || Boolean(textVal);

          const isCorrect = (userAnsObj && userAnsObj.isCorrect !== undefined)
            ? userAnsObj.isCorrect
            : (userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo) : null);

          return (
            <div
              key={qNo}
              style={{
                background: '#ffffff',
                padding: isMobile ? '0.6rem 0.75rem' : '0.85rem 1rem',
                borderRadius: '0.85rem',
                border: isReviewMode
                  ? (isCorrect === true ? '1.5px solid #86efac' : isCorrect === false ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0')
                  : isAnswered ? '1.5px solid #c7d2fe' : '1.5px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.4rem' : '0.55rem',
                boxShadow: isAnswered ? '0 3px 12px rgba(99,102,241,0.06)' : '0 1px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Question Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.45rem',
                    background: isAnswered ? '#4f46e5' : '#f1f5f9',
                    color: isAnswered ? '#ffffff' : '#334155',
                    fontWeight: 900,
                    fontSize: isMobile ? '0.72rem' : '0.78rem',
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
                    isQOE ? (
                      <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>⏳ İnceleniyor</span>
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

                      let correctAns = (userAnsObj && userAnsObj.correctAnswer !== undefined && userAnsObj.correctAnswer !== null) 
                        ? userAnsObj.correctAnswer 
                        : qObj.correctAnswer;
                        
                      if (correctAns === undefined || correctAns === null) {
                        const keySource = bankQ?.answerKey;
                        if (keySource) {
                          const kaVal = keySource[qNo - 1] !== undefined ? keySource[qNo - 1] : keySource[String(qNo)];
                          if (kaVal !== undefined && kaVal !== null) {
                            if (typeof kaVal === 'number') correctAns = kaVal;
                            else if (typeof kaVal === 'string') {
                              const str = kaVal.trim().toUpperCase();
                              if (/^[A-E]$/.test(str)) correctAns = str.charCodeAt(0) - 65;
                              else if (!isNaN(Number(str))) correctAns = Number(str);
                            }
                          }
                        }
                      }
                      const isCorrectOpt = correctAns !== undefined && correctAns !== null && correctAns === optIdx;

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
                            height: isMobile ? '32px' : '38px',
                            borderRadius: '0.6rem',
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
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ACTIONS AT THE BOTTOM OF OPTIK PANEL ── */}
      <div style={{
        padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1.15rem',
        background: '#ffffff',
        borderTop: '1.5px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        flexShrink: 0,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
      }}>
        {totalSections > 1 && !isLastSec && (
          <button
            onClick={onNextSection}
            style={{
              width: '100%',
              padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            Sonraki Bölüme Geç <ChevronRight size={18} />
          </button>
        )}

        {(totalSections === 1 || isLastSec) && (
          <button
            onClick={onSubmit}
            style={{
              width: '100%',
              padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.25rem',
              borderRadius: '0.75rem',
              background: isReviewMode ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={18} /> {isReviewMode ? 'İncelemeyi Kapat' : 'Sınavı Bitir ve Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MULTI RESULT MODAL COMPONENT ─────────────────────────────────────────────
function MultiResultModal({ test, sections, sectionAnswers, onConfirmClose, onReview }) {
  let totalMCQuestions = 0;
  let totalMCDoğru = 0;
  let totalMCYanlış = 0;
  let totalMCBoş = 0;

  let totalOEQuestions = 0;
  let totalOECevaplanan = 0;

  const sectionStats = sections.map((sec, idx) => {
    const bankQ = sec.bankQ || {};
    const isSecOE = checkIsOE(bankQ);
    const sa = sectionAnswers[sec.id] || { answers: {}, openEndedText: {} };

    let mcDoğru = 0;
    let mcYanlış = 0;
    let mcBoş = 0;
    let oeCevaplanan = 0;
    let hasAnyOE = isSecOE;

    for (let i = 1; i <= sec.qCount; i++) {
      const qObj = (sec.resolvedQuestions && sec.resolvedQuestions[i - 1]) || {};
      const isQOE = isSecOE || checkIsOE(qObj);

      if (isQOE) {
        hasAnyOE = true;
        totalOEQuestions++;
        const textVal = sa.openEndedText?.[i] || '';
        if (textVal && textVal.trim() !== '') {
          oeCevaplanan++;
          totalOECevaplanan++;
        }
      } else {
        totalMCQuestions++;
        const userAnsObj = sa.answers?.[i];
        const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;

        if (userAns === undefined || userAns === null) {
          mcBoş++;
          totalMCBoş++;
        } else {
          const isCorrect = checkIsAnswerCorrect(userAns, qObj, bankQ, i);

          if (isCorrect) {
            mcDoğru++;
            totalMCDoğru++;
          } else {
            mcYanlış++;
            totalMCYanlış++;
          }
        }
      }
    }

    const mcNet = Math.max(0, mcDoğru - (mcYanlış * 0.25));

    return {
      title: sec.title || `${idx + 1}. Bölüm`,
      qCount: sec.qCount,
      isOE: hasAnyOE,
      mcDoğru,
      mcYanlış,
      mcBoş,
      mcNet,
      oeCevaplanan
    };
  });

  const totalMCNet = Math.max(0, totalMCDoğru - (totalMCYanlış * 0.25));
  const hasOE = totalOEQuestions > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.5rem', width: '100%', maxWidth: '750px', color: 'var(--color-text)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', margin: 'auto' }}>
        
        {/* TOP HEADER */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', border: '2px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--color-text)' }}>Sınav Başarıyla Gönderildi!</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>{test.title || test.name}</p>
        </div>

        {/* TEACHER EVALUATION ALERT BANNER */}
        {hasOE && (
          <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>⏳</div>
            <div>
              <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, color: '#7c3aed', fontSize: '0.95rem' }}>
                Yazılı / Açık Uçlu Cevaplarınız Öğretmen Değerlendirmesine Gönderildi
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                Çoktan seçmeli sorularınızın puan ve net hesaplaması tamamlanmıştır. Açık uçlu ({totalOEQuestions} soru) yanıtlarınız ise öğretmeniniz tarafından incelenip puanlandıktan sonra karnenize yansıyacaktır.
              </p>
            </div>
          </div>
        )}

        {/* OVERALL SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>ÇOKTAN SEÇMELİ NET</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', marginTop: '0.2rem' }}>{totalMCNet.toFixed(2)}</div>
          </div>
          <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>DOĞRU / YANLIŞ</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#16a34a', marginTop: '0.3rem' }}>
              {totalMCDoğru} <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>D / {totalMCYanlış} Y</span>
            </div>
          </div>
          <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>AÇIK UÇLU YANIT</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.3rem' }}>
              {totalOECevaplanan} / {totalOEQuestions}
            </div>
          </div>
        </div>

        {/* BÖLÜM BAZLI DETAYLAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#334155' }}>📊 Bölüm Bazlı Sonuç Özeti</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {sectionStats.map((secStat, sIdx) => (
              <div key={sIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ padding: '0.25rem 0.55rem', background: secStat.isOE ? '#7c3aed' : '#0284c7', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: 900, color: 'white' }}>
                    {secStat.isOE ? '✍️ Yazılı Bölüm' : '📝 Test Bölümü'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{secStat.title}</span>
                </div>

                {secStat.isOE ? (
                  <span style={{ padding: '0.3rem 0.75rem', borderRadius: '0.5rem', background: '#faf5ff', border: '1px solid #e9d5ff', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 900 }}>
                    ⏳ Öğretmen Değerlendirmesinde ({secStat.oeCevaplanan}/{secStat.qCount} Yanıt)
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.82rem', fontWeight: 800 }}>
                    <span style={{ color: '#16a34a' }}>{secStat.mcDoğru} Doğru</span>
                    <span style={{ color: '#dc2626' }}>{secStat.mcYanlış} Yanlış</span>
                    <span style={{ color: '#64748b' }}>{secStat.mcBoş} Boş</span>
                    <span style={{ padding: '0.2rem 0.6rem', background: '#0284c7', borderRadius: '0.4rem', color: 'white', fontWeight: 900 }}>
                      Net: {secStat.mcNet.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
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
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#334155',
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
export default function MultiHomeworkRunner({ test, questions, onSubmit, isReviewMode = false, userAnswers = null, onAutoSave, draftAnswers, bookPdfUrl = '' }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { questions: allBankQuestions } = useQuestionBank();
  const { homeworks } = useHomework();
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
                // If global qNo is larger than section size, offset it
                const localQNo = globalQNo - secStartIdx;
                qNo = (localQNo >= 1 && localQNo <= targetSec.qCount) ? localQNo : ((idx - secStartIdx) + 1);
              } else {
                qNo = (idx - secStartIdx) + 1;
              }
              // Clamp to valid range
              if (qNo < 1) qNo = 1;
              if (qNo > targetSec.qCount) qNo = ((idx - secStartIdx) % targetSec.qCount) + 1;
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

        for (let idx = 0; idx < sec.qCount; idx++) {
          const qNo = idx + 1;
          const qObj = secQs[idx] || {};
          const ansObj = sa.answers?.[qNo] || {};
          const userAns = typeof ansObj === 'object' ? ansObj.userAnswer : ansObj;
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

  const totalQuestionsCount = useMemo(() => {
    return sections.reduce((sum, s) => sum + s.qCount, 0);
  }, [sections]);

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

      for (let idx = 0; idx < sec.qCount; idx++) {
        const qNo = idx + 1;
        const qObj = secQs[idx] || {};
        const ansObj = sa.answers?.[qNo];
        const userAns = ansObj !== undefined ? (typeof ansObj === 'object' ? ansObj?.userAnswer : ansObj) : null;
        const textAns = sa.openEndedText?.[qNo] || null;
        const isCorrect = userAns !== undefined && userAns !== null
          ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo)
          : null;

        // Resolve correctAnswer letter for review display
        let correctAns = qObj.correctAnswer !== undefined ? qObj.correctAnswer : null;
        if (correctAns === null && qObj.correctAnswerLetter) {
          const letter = String(qObj.correctAnswerLetter).trim().toUpperCase();
          if (/^[A-E]$/.test(letter)) correctAns = letter.charCodeAt(0) - 65;
        }
        if (correctAns === null && bankQ?.answerKey) {
          const kaVal = Array.isArray(bankQ.answerKey)
            ? bankQ.answerKey[idx]
            : (bankQ.answerKey[qNo - 1] !== undefined ? bankQ.answerKey[qNo - 1] : bankQ.answerKey[String(qNo)]);
          if (kaVal !== undefined && kaVal !== null) {
            if (typeof kaVal === 'number') correctAns = kaVal;
            else if (typeof kaVal === 'string') {
              const s = kaVal.trim().toUpperCase();
              if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
              else if (!isNaN(Number(s))) correctAns = Number(s);
            }
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
          correctAnswerLetter: correctAns !== null && correctAns !== undefined ? String.fromCharCode(65 + correctAns) : null
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
      
      {/* ── TOP HEADER BAR (PERMANENT) ── */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        flexShrink: 0,
        gap: '0.6rem',
        zIndex: 10,
        minHeight: isMobile ? '48px' : '56px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
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
              <Layers size={14} /> {isReviewMode ? 'İNCELEME RAPORU' : 'ÖDEV TESTİ'}
            </div>
          )}
          <h2 style={{ fontSize: isMobile ? '0.88rem' : '1.1rem', fontWeight: 900, margin: 0, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {test.title || test.name}
          </h2>
          {!isMobile && sections.length > 1 && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', flexShrink: 0 }}>
              {sections.length} Bölüm
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', flexShrink: 0 }}>
          {isReviewMode ? (
            !isMobile && (
              <div style={{ padding: '0.4rem 0.85rem', borderRadius: '0.65rem', background: '#e0e7ff', border: '1.5px solid #c7d2fe', color: '#4338ca', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#4f46e5" />
                <span>🏁 İnceleme Modu</span>
              </div>
            )
          ) : (
            <div style={{
              padding: isMobile ? '0.3rem 0.55rem' : '0.4rem 0.85rem',
              borderRadius: '0.65rem',
              background: timeLeft < 300 ? '#fef2f2' : '#ffffff',
              border: `1.5px solid ${timeLeft < 300 ? '#fca5a5' : '#e2e8f0'}`,
              color: timeLeft < 300 ? '#dc2626' : '#0f172a',
              fontWeight: 900,
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
            }}>
              <Clock size={isMobile ? 13 : 16} color={timeLeft < 300 ? '#dc2626' : '#4f46e5'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.95rem',
              borderRadius: '0.65rem',
              background: isDrawingOpen ? '#f59e0b' : '#ffffff',
              border: `1.5px solid ${isDrawingOpen ? '#d97706' : '#e2e8f0'}`,
              color: isDrawingOpen ? 'white' : '#334155',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            title="Çizim Aracı"
          >
            <Pencil size={14} /> 
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim Tahtası")}
          </button>

          {isReviewMode ? (
            <button
              onClick={() => onSubmit && onSubmit()}
              style={{
                padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem',
                borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
              }}
            >
              <CheckCircle2 size={isMobile ? 14 : 18} /> 
              {!isMobile && "İncelemeyi Kapat"}
              {isMobile && "Kapat"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{
                padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem',
                borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={18} /> 
              {!isMobile && "Sınavı Bitir ve Gönder"}
              {isMobile && "Bitir"}
            </button>
          )}
        </div>
      </header>

      {/* ── TOP SECTION TABS BAR (PERMANENT) ── */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1.5px solid #e2e8f0',
        padding: isMobile ? '0.45rem 0.65rem' : '0.6rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.4rem',
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflowX: 'auto', flex: 1, paddingBottom: isMobile ? '2px' : '0' }}>
          {sections.map((sec, idx) => {
            const isCurrent = idx === activeSecIdx;
            const secAnsState = sectionAnswers[sec.id]?.answers || {};
            const secTxtState = sectionAnswers[sec.id]?.openEndedText || {};
            const ansCount = Object.keys(secAnsState).length + Object.keys(secTxtState).filter(k => secTxtState[k]).length;
            const isCompleted = ansCount === sec.qCount && sec.qCount > 0;

            let cleanTitle = sec.title || '';
            if (cleanTitle.match(/^(\d+\.?\s*(bölüm|blm)|bölüm\s*\d+)/i)) {
              cleanTitle = cleanTitle.replace(/^(\d+\.?\s*(bölüm|blm)|bölüm\s*\d+)[\s:•-]*/i, '').trim();
            }

            return (
              <button
                key={sec.id || idx}
                onClick={() => setActiveSecIdx(idx)}
                style={{
                  padding: isMobile ? '0.35rem 0.6rem' : '0.45rem 1rem',
                  borderRadius: '0.65rem',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.72rem' : '0.82rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: isCurrent
                    ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                    : isCompleted ? '#f0fdf4' : '#ffffff',
                  border: isCurrent
                    ? 'none'
                    : isCompleted ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                  color: isCurrent
                    ? '#ffffff'
                    : isCompleted ? '#15803d' : '#334155',
                  boxShadow: isCurrent
                    ? '0 4px 14px rgba(79, 70, 229, 0.35)'
                    : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0
                }}
              >
                <span>
                  {idx + 1}. Bölüm{cleanTitle && !isMobile ? ` • ${cleanTitle}` : ''}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '999px',
                  background: isCurrent
                    ? 'rgba(255,255,255,0.22)'
                    : isCompleted ? '#dcfce7' : '#f1f5f9',
                  color: isCurrent
                    ? '#ffffff'
                    : isCompleted ? '#15803d' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.15rem'
                }}>
                  {isCompleted && '✓ '}{ansCount}/{sec.qCount}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button
            onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
            disabled={activeSecIdx === 0}
            style={{
              padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.9rem',
              borderRadius: '0.6rem',
              background: activeSecIdx === 0 ? '#f1f5f9' : '#ffffff',
              border: '1.5px solid #e2e8f0',
              color: activeSecIdx === 0 ? '#94a3b8' : '#334155',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: activeSecIdx === 0 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              transition: 'all 0.15s ease'
            }}
            title="Önceki Bölüm"
          >
            <ChevronLeft size={isMobile ? 14 : 16} /> {!isMobile && "Önceki"}
          </button>
          <button
            onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
            disabled={activeSecIdx === sections.length - 1}
            style={{
              padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.9rem',
              borderRadius: '0.6rem',
              background: activeSecIdx === sections.length - 1 ? '#f1f5f9' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: activeSecIdx === sections.length - 1 ? '1.5px solid #e2e8f0' : 'none',
              color: activeSecIdx === sections.length - 1 ? '#94a3b8' : '#ffffff',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: activeSecIdx === sections.length - 1 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              boxShadow: activeSecIdx === sections.length - 1 ? 'none' : '0 2px 8px rgba(79,70,229,0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Sonraki Bölüm"
          >
            {!isMobile && "Sonraki"} <ChevronRight size={isMobile ? 14 : 16} />
          </button>
        </div>
      </div>

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
                  allowUpload={true} 
                  onUploadFile={handleManualPdfUpload} 
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
        ) : isImage ? (
          /* IMAGE SET VIEWER (DARK THEME & SINGLE LINE ABCDE BUTTONS) */
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
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#f8fafc', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                  {/* SECTION BANNER */}
                  <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 6px 20px rgba(2,132,199,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                        🖼️
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                          Görsel Soru Seti — Aşağıdaki soruları inceleyip şıkları işaretleyiniz.
                        </p>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
                      Bölüm {activeSecIdx + 1} / {sections.length}
                    </div>
                  </div>

                  {/* QUESTION CARDS IN LIGHT PASTEL THEME */}
                  {Array.from({ length: effectiveQCount }).map((_, idx) => {
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

                    // Review mode: resolve correctAnswer from multiple sources
                    let correctAns = userAnsObj?.correctAnswer;
                    if ((correctAns === undefined || correctAns === null) && qObj.correctAnswer !== undefined) correctAns = qObj.correctAnswer;
                    if ((correctAns === undefined || correctAns === null) && qObj.correctAnswerLetter) {
                      const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                      if (/^[A-E]$/.test(lt)) correctAns = lt.charCodeAt(0) - 65;
                    }
                    if ((correctAns === undefined || correctAns === null) && activeSec.bankQ?.answerKey) {
                      const ak = activeSec.bankQ.answerKey;
                      const kaVal = Array.isArray(ak) ? ak[idx] : (ak[idx] !== undefined ? ak[idx] : ak[String(qNo)]);
                      if (kaVal !== undefined && kaVal !== null) {
                        if (typeof kaVal === 'number') correctAns = kaVal;
                        else if (typeof kaVal === 'string') {
                          const s = kaVal.trim().toUpperCase();
                          if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                          else if (!isNaN(Number(s))) correctAns = Number(s);
                        }
                      }
                    }

                    const isQAnswered = selectedOpt !== undefined && selectedOpt !== null;
                    const isQCorrect = isReviewMode && isQAnswered
                      ? (userAnsObj?.isCorrect !== undefined ? userAnsObj.isCorrect : (correctAns !== null && correctAns !== undefined && selectedOpt === correctAns))
                      : null;

                    return (
                      <div key={qNo} style={{
                        background: '#ffffff',
                        borderRadius: '1.1rem',
                        border: isReviewMode && isQAnswered ? `1.5px solid ${isQCorrect ? '#bbf7d0' : '#fecaca'}` : '1.5px solid #e2e8f0',
                        padding: '1.5rem',
                        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        
                        {/* QUESTION HEADER */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ padding: '0.3rem 0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                              SORU {qNo}
                            </span>
                            {isQOpenEnded && (
                              <span style={{ padding: '0.2rem 0.6rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                                ✍️ Açık Uçlu / Yazılı
                              </span>
                            )}
                          </div>

                          {isReviewMode ? (
                            isQOpenEnded ? (
                              <span style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 900 }}>⏳ Öğretmen değerlendirmesinde</span>
                            ) : isQAnswered ? (
                              isQCorrect
                                ? <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 900 }}>✓ DOĞRU</span>
                                : <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 900 }}>✗ YANLIŞ</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>— BOŞ</span>
                            )
                          ) : (
                            isQAnswered || textVal ? (
                              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 900 }}>✓ Cevaplandı</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>— Yanıtlanmadı</span>
                            )
                          )}
                        </div>

                        {/* QUESTION IMAGES */}
                        {imageUrls.map((url, imgIdx) => (
                          <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${qNo} Görsel`} onOpenFullscreen={() => setLightboxSrc(url)} />
                        ))}

                        {/* SINGLE LINE HORIZONTAL ABCDE BUTTONS */}
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
                              const isCorrectOpt = correctAns !== null && correctAns !== undefined && correctAns === optIdx;

                              let bg = '#ffffff';
                              let border = '1px solid #cbd5e1';
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
                                    height: '42px',
                                    borderRadius: '0.65rem',
                                    border,
                                    background: bg,
                                    color,
                                    fontWeight: 900,
                                    fontSize: '1rem',
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
                      </div>
                    );
                  })}

                  {/* BOTTOM SECTION NAV BUTTONS */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <button
                      onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
                      disabled={activeSecIdx === 0}
                      style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#f1f5f9' : '#ffffff', border: '1.5px solid #cbd5e1', color: activeSecIdx === 0 ? '#94a3b8' : '#334155', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <ChevronLeft size={18} /> Önceki Bölüm
                    </button>

                    {activeSecIdx < sections.length - 1 ? (
                      <button
                        onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
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
                  let corrAns = userAnsObj?.correctAnswer;
                  if ((corrAns === undefined || corrAns === null) && qObj.correctAnswer !== undefined) corrAns = qObj.correctAnswer;
                  if ((corrAns === undefined || corrAns === null) && qObj.correctAnswerLetter) {
                    const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                    if (/^[A-E]$/.test(lt)) corrAns = lt.charCodeAt(0) - 65;
                  }
                  if ((corrAns === undefined || corrAns === null) && activeSec.bankQ?.answerKey) {
                    const ak = activeSec.bankQ.answerKey;
                    const kaVal = Array.isArray(ak) ? ak[idx] : (ak[idx] !== undefined ? ak[idx] : ak[String(qNo)]);
                    if (kaVal !== undefined && kaVal !== null) {
                      if (typeof kaVal === 'number') corrAns = kaVal;
                      else if (typeof kaVal === 'string') {
                        const s = kaVal.trim().toUpperCase();
                        if (/^[A-E]$/.test(s)) corrAns = s.charCodeAt(0) - 65;
                        else if (!isNaN(Number(s))) corrAns = Number(s);
                      }
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
                            const isCorrectOpt = corrAns !== null && corrAns !== undefined && corrAns === optIdx;
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
          onConfirmClose={handleConfirmCloseResult}
          onReview={handleReviewResult}
        />
      )}

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
