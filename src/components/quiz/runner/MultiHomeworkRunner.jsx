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
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl, extractImageUrls } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil, Eye, ArrowLeft, Save } from 'lucide-react';
import DrawingCanvas from '../common/DrawingCanvas';
import QuizPanelLayout from './QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import MultipleChoiceRunner from './MultipleChoiceRunner';
import OpenEndedRunner from './OpenEndedRunner';
import MultipleChoiceReview from '../review/MultipleChoiceReview';
import OpenEndedReview from '../review/OpenEndedReview';

export function resolveTestContext(test = {}, sec = {}, bankQ = {}) {
  const bq = bankQ?.bankQ ? { ...bankQ.bankQ, ...bankQ } : (bankQ || {});
  const secBq = sec?.bankQ ? { ...sec.bankQ } : {};
  const testBq = test?.bankQ ? { ...test.bankQ } : {};

  return {
    ...test,
    ...sec,
    ...bq,
    answerKey: sec?.answerKey || bq?.answerKey || secBq?.answerKey || testBq?.answerKey || test?.answerKey,
    answer_key: sec?.answer_key || bq?.answer_key || secBq?.answer_key || testBq?.answer_key || test?.answer_key,
    opticAnswers: sec?.opticAnswers || bq?.opticAnswers || secBq?.opticAnswers || testBq?.opticAnswers || test?.opticAnswers,
    htmlPayload: sec?.htmlPayload || bq?.htmlPayload || test?.htmlPayload,
    pdfPayload: sec?.pdfPayload || bq?.pdfPayload || test?.pdfPayload,
    bankQ: {
      ...testBq,
      ...secBq,
      ...bq
    }
  };
}

export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || test?.bankQ || {};

  // 1. TOP PRIORITY: Explicit Open-Ended Flags on Section or Bank Question
  if (
    sec?.type === 'acik_uclu' ||
    sec?.questionType === 'acik_uclu' ||
    sec?.formatType === 'yazili' ||
    sec?.sourceFormat === 'yazili' ||
    sec?.type === 'yazili' ||
    sec?.questionType === 'yazili' ||
    sec?.formatType === 'gorsel_klasik' ||
    sec?.sourceFormat === 'gorsel_klasik' ||
    sec?.type === 'gorsel_klasik' ||
    sec?.questionType === 'gorsel_klasik' ||
    sec?.isOpenEnded === true ||
    sec?.is_open_ended === true ||
    sec?.openEnded === true ||
    bankQ?.type === 'acik_uclu' ||
    bankQ?.questionType === 'acik_uclu' ||
    bankQ?.formatType === 'yazili' ||
    bankQ?.sourceFormat === 'yazili' ||
    bankQ?.type === 'yazili' ||
    bankQ?.questionType === 'yazili' ||
    bankQ?.formatType === 'gorsel_klasik' ||
    bankQ?.sourceFormat === 'gorsel_klasik' ||
    bankQ?.type === 'gorsel_klasik' ||
    bankQ?.questionType === 'gorsel_klasik' ||
    bankQ?.isOpenEnded === true ||
    bankQ?.is_open_ended === true ||
    bankQ?.openEnded === true
  ) {
    return true;
  }

  // 2. Explicit Multiple-Choice Flags on Section or Bank Question
  if (
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Test-level flags for single-test assignments (where test IS the section)
  if (!sec?.id || sec?.id === test?.id || !test?.sections?.length) {
    if (
      test?.type === 'acik_uclu' ||
      test?.questionType === 'acik_uclu' ||
      test?.examType === 'acik_uclu' ||
      test?.formatType === 'yazili' ||
      test?.sourceFormat === 'yazili' ||
      test?.type === 'yazili' ||
      test?.questionType === 'yazili' ||
      test?.formatType === 'gorsel_klasik' ||
      test?.sourceFormat === 'gorsel_klasik' ||
      test?.isOpenEnded === true ||
      test?.openEnded === true ||
      test?.is_open_ended === true
    ) {
      return true;
    }
  }

  // 4. Check resolved questions for any explicit open-ended question
  const resQs = Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0
    ? sec.resolvedQuestions
    : (Array.isArray(test?.questions) ? test.questions : []);

  if (resQs.length > 0 && resQs.some(q => (
    q?.type === 'acik_uclu' ||
    q?.questionType === 'acik_uclu' ||
    q?.contentType === 'acik_uclu' ||
    q?.type === 'yazili' ||
    q?.questionType === 'yazili' ||
    q?.isOpenEnded === true
  ))) {
    return true;
  }

  return false;
}

export function isQuestionOE(qObj, sec = {}, test = {}, userAnsObj = null) {
  const bankQ = sec?.bankQ || test?.bankQ || {};

  // 1. HIGHEST PRIORITY: If question, section, bank question, or single-test container is marked as Open-Ended
  const isSectionOE = isSectionOpenEnded(sec, test);
  const isQExplicitOE = Boolean(
    qObj?.type === 'acik_uclu' ||
    qObj?.questionType === 'acik_uclu' ||
    qObj?.contentType === 'acik_uclu' ||
    qObj?.type === 'yazili' ||
    qObj?.questionType === 'yazili' ||
    qObj?.contentType === 'yazili' ||
    qObj?.type === 'gorsel_klasik' ||
    qObj?.questionType === 'gorsel_klasik' ||
    qObj?.isOpenEnded === true ||
    qObj?.openEnded === true ||
    qObj?.is_open_ended === true
  );

  if (isSectionOE || isQExplicitOE) {
    return true;
  }

  // 2. Explicit Multiple-Choice Flags
  if (
    qObj?.type === 'coktan_secmeli' ||
    qObj?.questionType === 'coktan_secmeli' ||
    qObj?.contentType === 'coktan_secmeli' ||
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Fallback: If student wrote open-ended answer text
  if (userAnsObj?.userAnswerText || userAnsObj?.textAns) {
    return true;
  }

  return false;
}

function checkIsOE(obj) {
  if (!obj) return false;
  return isSectionOpenEnded(obj, null) || isQuestionOE(obj, obj, null, null);
}

// Safely unwraps user answer to a primitive number index (0, 1, 2, 3...) or null
function unwrapUserAnswer(val) {
  if (val === undefined || val === null) return null;
  let curr = val;
  while (curr && typeof curr === 'object' && !Array.isArray(curr)) {
    const next = curr.userAnswer ?? curr.user_answer ?? curr.userAns ?? curr.user_ans ?? curr.answer ?? curr.selectedOption ?? curr.selected_option ?? curr.selectedAnswer ?? curr.studentAnswer ?? curr.option ?? curr.value ?? curr.selected;
    if (next === undefined || next === curr) break;
    curr = next;
  }
  if (curr === undefined || curr === null || curr === '') return null;
  if (typeof curr === 'string' && /^[A-Ea-e]$/.test(curr.trim())) {
    return curr.trim().toUpperCase().charCodeAt(0) - 65;
  }
  if (!isNaN(Number(curr)) && String(curr).trim() !== '') {
    return Number(curr);
  }
  return curr;
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

  // 1. Check Title Regex FIRST (e.g. "(4 Soru)", "4 Soru")
  for (const obj of sectionObjects) {
    const titles = [obj?.title, obj?.name];
    for (const t of titles) {
      if (t) {
        const m = String(t).match(/\((\d+)\s*Soru\)/i) || String(t).match(/(\d+)\s*Soru/i);
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
        const m = String(t).match(/\((\d+)\s*Soru\)/i) || String(t).match(/(\d+)\s*Soru/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
  }

  // 2. Answer key count (Most reliable for test questions)
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
  const realAkCount = Math.max(...sectionObjects.map(getAkCount), 0);
  if (realAkCount > 0) return realAkCount;

  // 3. Direct numeric questionCount on section or bank question
  const getRawCount = (obj) => {
    if (!obj) return 0;
    const val = obj.questionCount ?? obj.totalQuestions ?? obj.questionsCount ?? obj.qCount ?? obj.soruSayisi ?? obj._qCountHint;
    if (val !== undefined && val !== null) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };
  const secDirectCount = getRawCount(sec);
  const bankRawCount = Math.max(getRawCount(foundInBank), getRawCount(bankQ), getRawCount(bankQ?.bankQ), getRawCount(sec?.bankQ), 0);
  if (secDirectCount > 0) return secDirectCount;
  if (bankRawCount > 0) return bankRawCount;

  // 4. Questions list count
  const getQuestionsListCount = (obj) => {
    if (!obj) return 0;
    if (Array.isArray(obj.questionsList) && obj.questionsList.length > 0) return obj.questionsList.length;
    if (Array.isArray(obj.questions) && obj.questions.length > 0 && typeof obj.questions[0] === 'object') return obj.questions.length;
    return 0;
  };
  const realQListCount = Math.max(...sectionObjects.map(getQuestionsListCount), 0);
  if (realQListCount > 0) return realQListCount;

  // 5. Resolved questions array count
  const resolvedCount = Array.isArray(resolvedQuestions) ? resolvedQuestions.length : 0;
  if (resolvedCount > 0) return resolvedCount;

  // 6. Only for Image section: count valid image files
  const isImageSec = sectionObjects.some(obj => 
    obj?.contentType === 'gorsel' || obj?.formatType === 'image' || obj?.sourceFormat === 'image' || obj?.type === 'gorsel' || obj?.questionType === 'gorsel_klasik'
  );

  if (isImageSec) {
    const allImagesFromSources = [
      ...(Array.isArray(secImages) ? secImages : []),
      ...sectionObjects.flatMap(obj => [
        ...(Array.isArray(obj?.imageUrls) ? obj.imageUrls : []),
        obj?.imageUrl,
        obj?.image,
        obj?.url
      ]).filter(Boolean)
    ];
    const uniqueImages = extractImageUrls(allImagesFromSources);
    if (uniqueImages.length > 0) return uniqueImages.length;
  }

  // 7. Single section fallback to parentTest
  const parentRawCount = getRawCount(parentTest);
  if (isSingleSection && parentRawCount > 0) return parentRawCount;

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
  const activeBankQ = bankQ || {};
  const candidates = [
    activeBankQ?.contentPayload,
    activeBankQ?.htmlPayload,
    activeBankQ?.url,
    activeBankQ?.pdfUrl,
    idbPayload,
    test?.htmlPayload,
    test?.contentPayload,
    test?.url
  ];
  const directPayload = candidates.find(c => typeof c === 'string' && c.length > 50 && !c.includes('[STORED_IN_INDEXEDDB]') && !c.includes('[LOCALSTORAGE_CACHE]'));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', minHeight: 0 }}>
      <HtmlViewerWithControls
        payload={directPayload || idbPayload || activeBankQ?.contentPayload || activeBankQ?.htmlPayload || test?.htmlPayload || test?.contentPayload}
        id={activeBankQ?.id || secId || testId || test?.id}
        testId={testId || test?.id}
        realTestId={test?.realTestId || activeBankQ?.realTestId}
        qId={activeBankQ?.questionId || activeBankQ?.id}
        title={title || activeBankQ?.title || 'HTML Dokümanı'}
        height="100%"
      />
    </div>
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
  test = {},
  onOptionSelect,
  onTextChange,
  onNextSection,
  onSubmit,
  onSaveEvaluation,
  activeSecIdx,
  totalSections,
  isReviewMode = false,
  isTeacherMode = false,
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

          const userAnsObj = Array.isArray(answers)
            ? (answers[qNo] ?? answers[idx])
            : (answers?.[qNo] ?? answers?.[String(qNo)]);
          const rawUserAns = unwrapUserAnswer(userAnsObj);
          const numericUserAns = typeof rawUserAns === 'number' ? rawUserAns : null;
          const hasUserAns = numericUserAns !== null && !isNaN(numericUserAns);
          const rawTextVal = openEndedText?.[qNo] ?? openEndedText?.[String(qNo)] ?? (typeof userAnsObj === 'object' ? (userAnsObj?.userAnswerText ?? userAnsObj?.user_answer_text ?? userAnsObj?.textAns) : undefined);
          const textVal = (rawTextVal !== undefined && rawTextVal !== null) ? String(rawTextVal) : '';
          const hasUserText = textVal.trim() !== '';
          const isAnswered = hasUserAns || hasUserText;
          const isQOE = isQuestionOE(qObj, bankQ || test, test, userAnsObj);

          let isCorrect = null;
          if (isReviewMode && isAnswered) {
            if (isQOE) {
              isCorrect = null;
            } else if (hasUserAns) {
              const testCtx = resolveTestContext(test, null, bankQ);
              const evalResult = checkIsAnswerCorrect(numericUserAns, qObj, testCtx, qNo);
              if (evalResult !== null) {
                isCorrect = evalResult;
              } else if (userAnsObj && userAnsObj.isCorrect !== undefined && userAnsObj.isCorrect !== null) {
                isCorrect = userAnsObj.isCorrect;
              }
            } else if (hasUserText) {
              isCorrect = null;
            }
          } else if (!isQOE && isAnswered && userAnsObj && userAnsObj.isCorrect !== undefined && userAnsObj.isCorrect !== null) {
            isCorrect = userAnsObj.isCorrect;
          }

          const teacherSc = teacherScores?.[qNo];
          const hasTeacherGraded = teacherSc !== undefined && teacherSc !== null && teacherSc !== 'pending' && teacherSc !== 'unevaluated';
          const currentTeacherScore = hasTeacherGraded
            ? teacherSc
            : (isQOE ? undefined : (!isAnswered ? 'empty' : (isCorrect === true ? 10 : (isCorrect === false ? 0 : undefined))));

          return (
            <div
              key={qNo}
              style={{
                background: '#ffffff',
                padding: isMobile ? '0.35rem 0.55rem' : '0.75rem 0.85rem',
                borderRadius: isMobile ? '0.6rem' : '0.85rem',
                border: isReviewMode
                  ? (isQOE
                      ? (hasTeacherGraded
                          ? (currentTeacherScore === 10 ? '1.5px solid #86efac' : currentTeacherScore === 5 ? '1.5px solid #fde68a' : currentTeacherScore === 'empty' ? '1.5px solid #e2e8f0' : currentTeacherScore === 0 ? '1.5px solid #fca5a5' : '1.5px solid #ddd6fe')
                          : '1.5px solid #ddd6fe')
                      : (currentTeacherScore === 10 || isCorrect === true ? '1.5px solid #86efac' : currentTeacherScore === 5 ? '1.5px solid #fde68a' : currentTeacherScore === 'empty' ? '1.5px solid #e2e8f0' : (currentTeacherScore === 0 || isCorrect === false) ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0'))
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
                    isQOE ? (
                      hasTeacherGraded ? (
                        currentTeacherScore === 10 ? (
                          <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU (10P)</span>
                        ) : currentTeacherScore === 5 ? (
                          <span style={{ fontSize: '0.68rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>½ YARIM (5P)</span>
                        ) : currentTeacherScore === 'empty' ? (
                          <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>○ BOŞ (0P)</span>
                        ) : currentTeacherScore === 0 ? (
                          <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ (0P)</span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>{currentTeacherScore} Puan</span>
                        )
                      ) : isTeacherMode ? (
                        <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✍️ Puan Ver</span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>⏳ Değerlendirmede</span>
                      )
                    ) : (
                      !isAnswered ? (
                        <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>○ BOŞ</span>
                      ) : isCorrect === true ? (
                        <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU</span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ</span>
                      )
                    )
                  ) : (
                    isAnswered ? (
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                        {isQOE ? 'Yanıtlandı' : `Şık ${String.fromCharCode(65 + (numericUserAns ?? 0))}`}
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
                      const isSelected = hasUserAns && numericUserAns === optIdx;

                      let correctAns = null;

                      // 1. Direct question-level correct answer (highest priority)
                      if (qObj.correctAnswerLetter) {
                        const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                        if (/^[A-E]$/.test(lt)) correctAns = lt.charCodeAt(0) - 65;
                      } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                        correctAns = qObj.correctAnswer;
                      } else if (qObj.correct_answer !== undefined && qObj.correct_answer !== null) {
                        correctAns = qObj.correct_answer;
                      }

                      if (correctAns === null && Array.isArray(qObj.options) && qObj.options.length > 0) {
                        const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true)));
                        if (cIdx !== -1) correctAns = cIdx;
                      }

                      // 2. Section-level candidate key sources
                      if (correctAns === null) {
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
                            val = ks[qNo - 1] ?? ks[idx];
                          } else if (typeof ks === 'object') {
                            val = ks[qNo] ?? ks[String(qNo)] ?? ks[idx] ?? ks[String(idx)];
                          } else if (typeof ks === 'string' && ks.trim().length > 0) {
                            const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
                            val = clean[qNo - 1] ?? clean[idx];
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
                      }

                      // 3. User answer object fallback
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

                      // 4. Global test-level answerKey (with proper section offset)
                      if (correctAns === null && test?.answerKey) {
                        const ak = test.answerKey;
                        const secStart = secOffsets[activeSecIdx] || 0;
                        let val = null;
                        if (Array.isArray(ak)) {
                          val = ak[secStart + (qNo - 1)] ?? (sections.length === 1 ? ak[qNo - 1] : null);
                        } else if (typeof ak === 'object') {
                          val = ak[secStart + qNo] ?? ak[String(secStart + qNo)];
                        }
                        if (val !== undefined && val !== null && val !== '') {
                          if (typeof val === 'number') correctAns = val;
                          else if (typeof val === 'string') {
                            const s = val.trim().toUpperCase();
                            if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                            else if (!isNaN(Number(s))) correctAns = Number(s);
                          }
                        }
                      }

                      if (correctAns === null && Array.isArray(qObj.options)) {
                        const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect || o.is_correct)));
                        if (cIdx !== -1) correctAns = cIdx;
                      }

                      const numericCorrectAns = (typeof correctAns === 'string' && /^[A-Ea-e]$/.test(correctAns.trim()))
                        ? correctAns.trim().toUpperCase().charCodeAt(0) - 65
                        : (correctAns !== undefined && correctAns !== null && !isNaN(Number(correctAns)) && String(correctAns).trim() !== '' ? Number(correctAns) : correctAns);

                      const isCorrectOpt = (isReviewMode && isCorrect === true && isSelected)
                        ? true
                        : (numericCorrectAns !== undefined && numericCorrectAns !== null && numericCorrectAns === optIdx);

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
                          if (hasUserAns) {
                            bg = '#f0fdf4'; border = '2px solid #16a34a'; color = '#15803d'; shadow = '0 2px 6px rgba(22,163,74,0.15)';
                          } else {
                            bg = '#f0f9ff'; border = '1.5px dashed #0284c7'; color = '#0369a1'; shadow = 'none';
                          }
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
                          }}
                          className={!isReviewMode ? "hover:scale-105 active:scale-95" : ""}
                          title={isReviewMode && isCorrectOpt && !hasUserAns ? `Cevap Anahtarı: ${opt}` : undefined}
                        >
                          {isReviewMode && isSelected && isCorrectOpt ? `${opt} ✓` : isReviewMode && isSelected && !isCorrectOpt ? `${opt} ✗` : isReviewMode && isCorrectOpt ? (hasUserAns ? `${opt} ✓` : `${opt} 🔑`) : opt}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Öğretmen Puanlama Butonları (Sadece Öğretmen Modunda) */}
              {isTeacherMode && (
                <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isQOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 4 }}>
                    {(() => {
                      const isT10 = Number(currentTeacherScore) === 10;
                      const isT0 = currentTeacherScore !== undefined && currentTeacherScore !== null && currentTeacherScore !== 'empty' && Number(currentTeacherScore) === 0;
                      const isTEmpty = currentTeacherScore === 'empty';
                      const isT5 = Number(currentTeacherScore) === 5;

                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => onScoreChange && onScoreChange(qNo, 10)}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: 6,
                              border: isT10 ? '2px solid #15803d' : '1px solid #cbd5e1',
                              background: isT10 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#ffffff',
                              color: isT10 ? '#ffffff' : '#15803d',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              boxShadow: isT10 ? '0 2px 8px rgba(22,163,74,0.45)' : 'none',
                              transform: isT10 ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✓ Doğru (D) {isT10 ? '✓' : ''}
                          </button>
                          <button
                            type="button"
                            onClick={() => onScoreChange && onScoreChange(qNo, 0)}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: 6,
                              border: isT0 ? '2px solid #991b1b' : '1px solid #cbd5e1',
                              background: isT0 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#ffffff',
                              color: isT0 ? '#ffffff' : '#b91c1c',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              boxShadow: isT0 ? '0 2px 8px rgba(220,38,38,0.5)' : 'none',
                              transform: isT0 ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✗ Yanlış (Y) {isT0 ? '✓' : ''}
                          </button>
                          <button
                            type="button"
                            onClick={() => onScoreChange && onScoreChange(qNo, 'empty')}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: 6,
                              border: isTEmpty ? '2px solid #334155' : '1px solid #cbd5e1',
                              background: isTEmpty ? 'linear-gradient(135deg, #475569, #334155)' : '#f8fafc',
                              color: isTEmpty ? '#ffffff' : '#64748b',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              boxShadow: isTEmpty ? '0 2px 8px rgba(71,85,105,0.45)' : 'none',
                              transform: isTEmpty ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ○ Boş (B) {isTEmpty ? '✓' : ''}
                          </button>
                          {isQOE && (
                            <button
                              type="button"
                              onClick={() => onScoreChange && onScoreChange(qNo, 5)}
                              style={{
                                padding: '0.45rem 0.2rem',
                                borderRadius: 6,
                                border: isT5 ? '2px solid #b45309' : '1px solid #cbd5e1',
                                background: isT5 ? 'linear-gradient(135deg, #d97706, #b45309)' : '#ffffff',
                                color: isT5 ? '#ffffff' : '#d97706',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                boxShadow: isT5 ? '0 2px 8px rgba(217,119,6,0.45)' : 'none',
                                transform: isT5 ? 'scale(1.02)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              ½ Yarım (5P) {isT5 ? '✓' : ''}
                            </button>
                          )}
                        </>
                      );
                    })()}
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

              {/* Öğrenci için Öğretmen Notu (Salt Okunur) */}
              {!isTeacherMode && isReviewMode && teacherNotes?.[qNo] && (
                <div style={{ marginTop: '0.45rem', padding: '0.45rem 0.65rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.45rem', fontSize: '0.74rem', color: '#1e40af' }}>
                  <strong style={{ color: '#1d4ed8' }}>💬 Öğretmen Notu: </strong> {teacherNotes[qNo]}
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
            onClick={isReviewMode ? (isTeacherMode ? (onSaveEvaluation || onSubmit) : onSubmit) : onSubmit}
            style={{
              width: '100%',
              padding: isMobile ? '0.45rem 0.8rem' : '0.75rem 1.25rem',
              borderRadius: isMobile ? '0.5rem' : '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} />
            {isReviewMode ? (isTeacherMode ? '💾 Değerlendirmeyi Kaydet & Sonucu Gör' : '📊 Sınav Sonuç Raporunu Gör') : 'Sınavı Bitir ve Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MULTI RESULT MODAL COMPONENT ─────────────────────────────────────────────
function MultiResultModal({ test, sections, sectionAnswers, onConfirmClose, onReview, teacherScores = {}, teacherNotes = {}, overallFeedback = '', isReviewMode = false, isTeacher = false }) {
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

    const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
    const secQCount = sec.qCount || (sec.resolvedQuestions?.length > 0 ? sec.resolvedQuestions.length : (secImgCount > 0 ? secImgCount : 1));

    for (let i = 1; i <= secQCount; i++) {
      const qObj = (sec.resolvedQuestions && sec.resolvedQuestions[i - 1]) || {};
      const isQOE = isQuestionOE(qObj, sec, null, sa.answers?.[i]);
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
          if (teacherSc === 'empty') {
            secBoş++;
            totalBoş++;
          } else {
            const numSc = Number(teacherSc);
            secEarnedPts += numSc;
            totalAllEarnedPts += numSc;
            if (numSc >= 5) {
              secDoğru++;
              totalDoğru++;
            } else {
              secYanlış++;
              totalYanlış++;
            }
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
          if (teacherSc === 'empty') {
            secBoş++;
            totalBoş++;
            totalMCBoş++;
          } else {
            const numSc = Number(teacherSc);
            secEarnedPts += numSc;
            totalAllEarnedPts += numSc;
            if (numSc >= 5) {
              secDoğru++;
              totalDoğru++;
              totalMCDoğru++;
            } else {
              secYanlış++;
              totalYanlış++;
              totalMCYanlış++;
            }
          }
        } else if (userAns === undefined || userAns === null || userAns === '') {
          secBoş++;
          totalBoş++;
          totalMCBoş++;
        } else {
          const testCtx = resolveTestContext(test, sec, bankQ);
          const isCorrect = checkIsAnswerCorrect(userAns, qObj, testCtx, i);
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
            {isReviewMode ? (isTeacher ? 'Değerlendirme Başarıyla Kaydedildi!' : 'Sınav Sonuç Raporu') : 'Sınav Başarıyla Tamamlandı!'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #64748b)', margin: 0, fontWeight: 700 }}>{test.title || test.name}</p>
        </div>

        {/* TEACHER EVALUATION ALERT BANNER (If not yet graded) */}
        {hasOE && totalOEEvaluated === 0 && (!isReviewMode || !isTeacher) && (
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
          
          {hasOE && totalMCQuestions === 0 && totalOEEvaluated === 0 && (!isReviewMode || !isTeacher) ? (
            <>
              {/* Pure Open-Ended Pending Evaluation Cards */}
              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid rgba(124, 58, 237, 0.3)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>DURUM</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1.1 }}>⏳</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#7c3aed', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.25)', padding: '0.15rem 0.55rem', borderRadius: '12px', marginTop: '0.2rem' }}>
                  Değerlendirmede
                </span>
              </div>

              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>AÇIK UÇLU YANIT</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.15rem' }}>
                  {totalOECevaplanan} / {totalOEQuestions}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                  (Öğretmen İncelemesinde)
                </span>
              </div>

              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>SONUÇ / PUAN</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#64748b', lineHeight: 1.1 }}>—</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                  Puanlama Sonrası
                </span>
              </div>
            </>
          ) : (
            <>
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

              {/* Card 4: AÇIK UÇLU YANIT (if mixed) */}
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
            </>
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
                      <span style={{ color: '#64748b' }}>{secStat.secBoş} Boş</span>
                      
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
              <Eye size={18} /> Cevapları Kaydet ve İncele
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
            <CheckCircle2 size={20} /> {isReviewMode ? (isTeacher ? 'Değerlendirmeyi Onayla & Tamamla' : 'Kapat & Öğrenci Paneline Dön') : 'Sınavı Tamamla & Listeye Dön'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN MULTI-HOMEWORK RUNNER COMPONENT ────────────────────────────────────
export default function MultiHomeworkRunner({ test, questions, onSubmit, isReviewMode = false, userAnswers = null, onAutoSave, draftAnswers, bookPdfUrl = '', onExit }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { currentUser } = useAuth();
  const isTeacherMode = isReviewMode && Boolean(currentUser?.role === 'teacher' || currentUser?.role === 'admin');
  const { questions: allBankQuestions } = useQuestionBank();
  const { homeworks, updateHomeworkSubmission } = useHomework();
  const { updateSubmission } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { bookTests } = useTrackedBooks();
  const draftKey = useMemo(() => `draft_multi_hw_${test.id || 'test'}`, [test.id]);

  const findInAllSources = useMemo(() => (targetId) => {
    if (!targetId) return null;
    const strId = String(targetId);
    // Never match the parent homework ID or generic section IDs
    if (strId === String(test?.id) || strId === String(test?.hwId) || strId.startsWith('sec_') || strId.startsWith('section_')) {
      return null;
    }
    const normId = strId.replace(/^hw_/, '').replace(/^q_?/, '');

    let found = allBankQuestions?.find(q => String(q.id) === strId || (normId && normId.length > 2 && normId === String(q.id).replace(/^q_?/, '')));
    if (!found && curriculumData?.tests) {
      found = curriculumData.tests.find(t => String(t.id) === strId || (normId && normId.length > 2 && normId === String(t.id).replace(/^q_?/, '')));
    }
    if (!found && bookTests) {
      found = bookTests.find(b => String(b.id) === strId || (normId && normId.length > 2 && normId === String(b.id).replace(/^q_?/, '')));
    }
    if (!found && homeworks) {
      found = homeworks.find(h => String(h.id) !== String(test?.id) && (String(h.id) === strId || (normId && normId.length > 2 && normId === String(h.id).replace(/^hw_/, ''))));
    }
    return found || null;
  }, [allBankQuestions, homeworks, curriculumData, bookTests, test?.id, test?.hwId]);

  // 1. Build sections cleanly
  const sections = useMemo(() => {
    let rawSections = test.sections || test.tests || test.selectedQuestions || test.items || null;

    if (!rawSections || (Array.isArray(rawSections) && rawSections.length === 0)) {
      const ids = test.testIds || test.questionIds || test.selectedQuestionIds;
      if (Array.isArray(ids) && ids.length > 0) {
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
        const isGenericSecId = typeof qId === 'string' && (qId.startsWith('sec_') || qId.startsWith('section_') || qId === String(test?.id) || qId === String(test?.hwId));
        let foundInBank = (!isGenericSecId && qId) ? findInAllSources(qId) : null;

        if (!foundInBank && sec.id && !String(sec.id).startsWith('sec_') && String(sec.id) !== String(test?.id)) {
          foundInBank = findInAllSources(sec.id);
        }
        if (!foundInBank && sec.questionId && !String(sec.questionId).startsWith('sec_') && String(sec.questionId) !== String(test?.id)) {
          foundInBank = findInAllSources(sec.questionId);
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

        // ONLY unbundle images if this section is explicitly an image question/set
        const isImageSection = Boolean(
          sec.contentType === 'gorsel' || sec.formatType === 'image' || sec.sourceFormat === 'image' ||
          bankQ?.contentType === 'gorsel' || bankQ?.formatType === 'image' || bankQ?.sourceFormat === 'image' ||
          (sec.imageUrls && Array.isArray(sec.imageUrls) && sec.imageUrls.length > 0 && !sec.questionText && (!sec.options || sec.options.length === 0)) ||
          (bankQ?.imageUrls && Array.isArray(bankQ?.imageUrls) && bankQ?.imageUrls.length > 0 && !bankQ?.questionText && (!bankQ?.options || bankQ?.options.length === 0))
        );

        const secImages = isImageSection ? getFirstValidImages([
          bankQ?.imageUrls,
          sec.imageUrls,
          bankQ?.imageUrl,
          sec.imageUrl,
          bankQ?.contentPayload,
          sec.contentPayload,
          bankQ?.bankQ?.imageUrls,
          bankQ?.bankQ?.imageUrl
        ]) : [];

        if (isImageSection && secImages.length > 1) {
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

    const resolvedQuestions = resolveTestQuestions(test, allBankQuestions);
    let finalQs = (resolvedQuestions && resolvedQuestions.length > 0) ? resolvedQuestions : (questions || []);

    const secImages = extractImageUrls([
      test.imageUrls,
      test.imageUrl,
      test.contentPayload,
      test.raw_data?.contentPayload,
      test.raw_data?.imageUrls
    ]);

    const countToUse = resolveExactQuestionCount({}, test, test, finalQs, secImages, test);

    if (finalQs.length < countToUse) {
      const filled = [...finalQs];
      for (let i = filled.length; i < countToUse; i++) {
        filled.push({
          id: `${test.id || 'q'}_sub_${i + 1}`,
          questionNo: i + 1,
          questionText: `Soru ${i + 1}`,
          imageUrl: secImages[i] || secImages[0] || null,
          options: ['A', 'B', 'C', 'D', 'E']
        });
      }
      finalQs = filled;
    } else if (finalQs.length > countToUse && countToUse > 0) {
      finalQs = finalQs.slice(0, countToUse);
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
        // Precompute cumulative offsets for sequential matching
        const secOffsets = [];
        let acc = 0;
        sections.forEach(s => { secOffsets.push(acc); acc += (s.qCount || 1); });

        const findTargetSec = (item, itemIdx) => {
          // 1. Direct ID match
          if (item.sectionId) {
            const byId = sections.find(s => String(s.id) === String(item.sectionId) || (s.bankQ?.id && String(s.bankQ.id) === String(item.sectionId)));
            if (byId) return byId;
            const normItemSecId = String(item.sectionId).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
            const byNormId = sections.find(s => {
              const normSecId = String(s.id).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
              const normBankId = String(s.bankQ?.id || '').replace(/^hw_/, '').replace(/^q_?/, '');
              return (normSecId && normSecId === normItemSecId) || (normBankId && normBankId === normItemSecId);
            });
            if (byNormId) return byNormId;
          }

          // 2. Sequential range match based on global questionNo
          const isItemOE = Boolean(item.isOpenEnded || item.is_open_ended || item.userAnswerText || item.user_answer_text || item.textAns);
          const globalQNo = item.questionNo ? Number(item.questionNo) : (item.qNo ? Number(item.qNo) : null);
          if (globalQNo && globalQNo > 0) {
            const byGNo = sections.find((s, si) => (globalQNo - 1) >= secOffsets[si] && (globalQNo - 1) < (secOffsets[si] + (s.qCount || 1)));
            if (byGNo) return byGNo;
          }

          // 3. Sequential index range match
          const byIdx = sections.find((s, si) => itemIdx >= secOffsets[si] && itemIdx < (secOffsets[si] + (s.qCount || 1)));
          if (byIdx) return byIdx;

          // 4. Title AND question-type match (ensure written doesn't match MCQ with same title)
          if (item.sectionTitle) {
            const byTitleType = sections.find(s => s.title === item.sectionTitle && Boolean(s.isOpenEnded || s.is_open_ended || s.bankQ?.isOpenEnded) === isItemOE);
            if (byTitleType) return byTitleType;
            const byTitle = sections.find(s => s.title === item.sectionTitle);
            if (byTitle) return byTitle;
          }

          return sections[0];
        };

        rawAns.forEach((item, idx) => {
          const targetSec = findTargetSec(item, idx);

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
                qNo = (localQNo >= 1 && localQNo <= (targetSec.qCount || 1)) ? localQNo : ((idx - secStartIdx) + 1);
              } else {
                qNo = (idx - secStartIdx) + 1;
              }
              if (qNo < 1) qNo = 1;
            }

            // Populate open-ended text
            const oeText = item.userAnswerText || item.user_answer_text || item.textAns || item.openEndedText || item.writtenAnswer || null;
            if (oeText) {
              initialMap[secId].openEndedText[qNo] = oeText;
            }

            // Populate multiple-choice answer
            const numUserAns = unwrapUserAnswer(item);

            if (numUserAns !== null && typeof numUserAns === 'number') {
              let correctAns = item.correctAnswer ?? item.correct_answer ?? item.correctAns;
              if ((correctAns === undefined || correctAns === null) && (item.correctAnswerLetter || item.correct_answer_letter)) {
                const letter = String(item.correctAnswerLetter || item.correct_answer_letter).trim().toUpperCase();
                if (/^[A-E]$/.test(letter)) correctAns = letter.charCodeAt(0) - 65;
              }

              initialMap[secId].answers[qNo] = {
                userAnswer: numUserAns,
                isCorrect: item.isCorrect ?? item.is_correct,
                correctAnswer: correctAns,
                questionId: item.questionId || item.id
              };
            } else if (oeText) {
              // Open-ended: store a marker so we know it was answered
              initialMap[secId].answers[qNo] = {
                userAnswer: null,
                isCorrect: item.isCorrect ?? item.is_correct,
                correctAnswer: null,
                questionId: item.questionId || item.id,
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
                const oeText = val.userAnswerText || val.user_answer_text || val.textAns || val.openEndedText;
                if (oeText) initialMap[secId].openEndedText[qNo] = oeText;
                const uAns = val.userAnswer ?? val.user_answer ?? val.userAns ?? val.answer ?? val.selectedOption ?? val.selectedAnswer ?? val.studentAnswer;
                if (uAns !== undefined && uAns !== null && uAns !== '') {
                  const numUAns = (typeof uAns === 'string' && /^[A-Ea-e]$/.test(uAns.trim()))
                    ? uAns.trim().toUpperCase().charCodeAt(0) - 65
                    : (!isNaN(Number(uAns)) && String(uAns).trim() !== '' ? Number(uAns) : uAns);

                  initialMap[secId].answers[qNo] = {
                    userAnswer: numUAns,
                    isCorrect: val.isCorrect ?? val.is_correct,
                    correctAnswer: val.correctAnswer ?? val.correct_answer
                  };
                }
              } else if (typeof val === 'string' && /^[A-Ea-e]$/.test(val.trim())) {
                initialMap[secId].answers[qNo] = { userAnswer: val.trim().toUpperCase().charCodeAt(0) - 65 };
              } else if (typeof val === 'number') {
                initialMap[secId].answers[qNo] = { userAnswer: val };
              } else if (typeof val === 'string') {
                initialMap[secId].openEndedText[qNo] = val;
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
        initSa[sec.id] = { answers: {}, openEndedText: {} };
      });

      draftAnswers.forEach((a, idx) => {
        const targetSec = findTargetSec(a, idx);
        if (targetSec) {
          const secId = targetSec.id;
          let qNo = a.questionNoInSection ? Number(a.questionNoInSection) : null;
          if (!qNo || isNaN(qNo) || qNo < 1) {
            const globalQNo = a.questionNo || a.qNo;
            const secStartIdx = secOffsets[sections.indexOf(targetSec)];
            if (globalQNo && globalQNo > 0) {
              const localQNo = globalQNo - secStartIdx;
              qNo = (localQNo >= 1 && localQNo <= (targetSec.qCount || 1)) ? localQNo : ((idx - secStartIdx) + 1);
            } else {
              qNo = (idx - secStartIdx) + 1;
            }
            if (qNo < 1) qNo = 1;
          }

          if (a.userAnswer !== null && a.userAnswer !== undefined) {
            const unwrapped = unwrapUserAnswer(a);
            initSa[secId].answers[qNo] = { userAnswer: unwrapped, isCorrect: a.isCorrect, questionId: a.questionId };
          }
          if (a.userAnswerText) {
            initSa[secId].openEndedText[qNo] = a.userAnswerText;
          }
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

        const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
        const secQCount = sec.qCount || (sec.resolvedQuestions?.length > 0 ? sec.resolvedQuestions.length : (secImgCount > 0 ? secImgCount : 1));

        for (let idx = 0; idx < secQCount; idx++) {
          const qNo = idx + 1;
          const qObj = secQs[idx] || {};
          const ansObj = sa.answers?.[qNo];
          const userAns = ansObj !== undefined ? (typeof ansObj === 'object' ? ansObj?.userAnswer : ansObj) : null;
          const textAns = sa.openEndedText?.[qNo] || null;
          
          const isOE = isQuestionOE(qObj, sec, test, { userAnswerText: textAns, userAnswer: userAns });
          const testCtx = resolveTestContext(test, sec, bankQ);
          const isCorrect = isOE ? null : (userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, testCtx, qNo) : null);

          formattedAnswers.push({
            questionId: qObj.id || `${sec.id}_${qNo}`,
            questionNo: globalNo++,
            questionNoInSection: qNo,
            sectionId: sec.id,
            sectionTitle: sec.title,
            userAnswer: userAns !== undefined ? userAns : null,
            userAnswerText: textAns,
            isOpenEnded: isOE,
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
      const currentAns = secState.answers?.[qNo];
      const newAnswers = { ...secState.answers };
      if (currentAns === optIdx) {
        // İki kez tıklanınca seçimi geri al (boş bırak)
        delete newAnswers[qNo];
      } else {
        newAnswers[qNo] = optIdx;
      }
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
        const secOffsets = [];
        let acc = 0;
        sections.forEach(s => { secOffsets.push(acc); acc += (s.qCount || 1); });

        const findTargetSec = (item, itemIdx) => {
          if (item.sectionId) {
            const byId = sections.find(s => String(s.id) === String(item.sectionId) || (s.bankQ?.id && String(s.bankQ.id) === String(item.sectionId)));
            if (byId) return byId;
            const normItemSecId = String(item.sectionId).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
            const byNormId = sections.find(s => {
              const normSecId = String(s.id).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
              const normBankId = String(s.bankQ?.id || '').replace(/^hw_/, '').replace(/^q_?/, '');
              return (normSecId && normSecId === normItemSecId) || (normBankId && normBankId === normItemSecId);
            });
            if (byNormId) return byNormId;
          }

          const isItemOE = Boolean(item.isOpenEnded || item.is_open_ended || item.userAnswerText || item.user_answer_text || item.textAns);
          const globalQNo = item.questionNo ? Number(item.questionNo) : (item.qNo ? Number(item.qNo) : null);
          if (globalQNo && globalQNo > 0) {
            const byGNo = sections.find((s, si) => (globalQNo - 1) >= secOffsets[si] && (globalQNo - 1) < (secOffsets[si] + (s.qCount || 1)));
            if (byGNo) return byGNo;
          }

          const byIdx = sections.find((s, si) => itemIdx >= secOffsets[si] && itemIdx < (secOffsets[si] + (s.qCount || 1)));
          if (byIdx) return byIdx;

          if (item.sectionTitle) {
            const byTitleType = sections.find(s => s.title === item.sectionTitle && Boolean(s.isOpenEnded || s.is_open_ended || s.bankQ?.isOpenEnded) === isItemOE);
            if (byTitleType) return byTitleType;
            const byTitle = sections.find(s => s.title === item.sectionTitle);
            if (byTitle) return byTitle;
          }

          return sections[0];
        };

        rawAns.forEach((a, idx) => {
          const targetSec = findTargetSec(a, idx);
          const sId = targetSec ? targetSec.id : (a.sectionId || 'sec_1');
          
          let qNo = a.questionNoInSection ? Number(a.questionNoInSection) : null;
          if (!qNo || isNaN(qNo) || qNo < 1) {
            const secStartIdx = targetSec ? secOffsets[sections.indexOf(targetSec)] : 0;
            const globalQNo = a.questionNo || a.qNo;
            if (globalQNo && globalQNo > 0) {
              const localQNo = globalQNo - secStartIdx;
              qNo = (localQNo >= 1 && localQNo <= (targetSec.qCount || 1)) ? localQNo : ((idx - secStartIdx) + 1);
            } else {
              qNo = (idx - secStartIdx) + 1;
            }
            if (qNo < 1) qNo = 1;
          }

          if (!map[sId]) map[sId] = {};

          const qObj = targetSec.resolvedQuestions?.[qNo - 1];
          const isItemOE = isQuestionOE(qObj, targetSec, test, a);

          if (isItemOE) {
            // OE: only load score if teacher explicitly graded this answer
            const hasTeacherGrade = Boolean(
              a.evaluatedByTeacher === true ||
              (a.evaluatedAt && a.evaluatedByTeacher !== false) ||
              a.teacherNote || a.teacher_note || a.feedback ||
              (a.evalStatus === 'graded' && (a.evaluatedByTeacher === true || a.evaluatedAt)) ||
              (a.evalStatus === 'evaluated' && (a.evaluatedByTeacher === true || a.evaluatedAt)) ||
              userAnswers?.isEvaluatedByTeacher === true ||
              userAnswers?.raw_data?.isEvaluatedByTeacher === true
            );
            if (hasTeacherGrade && a.score !== undefined && a.score !== null && a.score !== '') {
              map[sId][qNo] = typeof a.score === 'number' ? Number(a.score) : (typeof a.earnedScore === 'number' ? Number(a.earnedScore) : 10);
            }
            // else: not yet graded → undefined → shows as pending
          }
          // MC: leave undefined — liveReviewStats computes via checkIsAnswerCorrect live
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
        const secOffsets = [];
        let acc = 0;
        sections.forEach(s => { secOffsets.push(acc); acc += (s.qCount || 1); });

        const findTargetSec = (item, itemIdx) => {
          if (item.sectionId) {
            const byId = sections.find(s => String(s.id) === String(item.sectionId) || (s.bankQ?.id && String(s.bankQ.id) === String(item.sectionId)));
            if (byId) return byId;
            const normItemSecId = String(item.sectionId).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
            const byNormId = sections.find(s => {
              const normSecId = String(s.id).replace(/^hw_/, '').replace(/^q_?/, '').replace(/^sec_/, '');
              const normBankId = String(s.bankQ?.id || '').replace(/^hw_/, '').replace(/^q_?/, '');
              return (normSecId && normSecId === normItemSecId) || (normBankId && normBankId === normItemSecId);
            });
            if (byNormId) return byNormId;
          }

          const isItemOE = Boolean(item.isOpenEnded || item.is_open_ended || item.userAnswerText || item.user_answer_text || item.textAns);
          const globalQNo = item.questionNo ? Number(item.questionNo) : (item.qNo ? Number(item.qNo) : null);
          if (globalQNo && globalQNo > 0) {
            const byGNo = sections.find((s, si) => (globalQNo - 1) >= secOffsets[si] && (globalQNo - 1) < (secOffsets[si] + (s.qCount || 1)));
            if (byGNo) return byGNo;
          }

          const byIdx = sections.find((s, si) => itemIdx >= secOffsets[si] && itemIdx < (secOffsets[si] + (s.qCount || 1)));
          if (byIdx) return byIdx;

          if (item.sectionTitle) {
            const byTitleType = sections.find(s => s.title === item.sectionTitle && Boolean(s.isOpenEnded || s.is_open_ended || s.bankQ?.isOpenEnded) === isItemOE);
            if (byTitleType) return byTitleType;
            const byTitle = sections.find(s => s.title === item.sectionTitle);
            if (byTitle) return byTitle;
          }

          return sections[0];
        };

        rawAns.forEach((a, idx) => {
          const targetSec = findTargetSec(a, idx);
          const sId = targetSec ? targetSec.id : (a.sectionId || 'sec_1');
          
          let qNo = a.questionNoInSection ? Number(a.questionNoInSection) : null;
          if (!qNo || isNaN(qNo) || qNo < 1) {
            const secStartIdx = targetSec ? secOffsets[sections.indexOf(targetSec)] : 0;
            const globalQNo = a.questionNo || a.qNo;
            if (globalQNo && globalQNo > 0) {
              const localQNo = globalQNo - secStartIdx;
              qNo = (localQNo >= 1 && localQNo <= (targetSec.qCount || 1)) ? localQNo : ((idx - secStartIdx) + 1);
            } else {
              qNo = (idx - secStartIdx) + 1;
            }
            if (qNo < 1) qNo = 1;
          }

          if (!map[sId]) map[sId] = {};
          if (a.teacherNote || a.teacher_note || a.feedback) {
            map[sId][qNo] = a.teacherNote || a.teacher_note || a.feedback;
          }
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
    let pending = 0;
    let totalOE = 0;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.resolvedQuestions || [];
      const bankQ = sec.bankQ || test;
      const count = sec.qCount || secQs.length || 1;
      for (let i = 1; i <= count; i++) {
        maxPts += 10;
        const qObj = secQs[i - 1] || {};
        const isQOE = isQuestionOE(qObj, sec, test, sa.answers?.[i]);

        const teacherSc = teacherScores[sec.id]?.[i];
        const hasTeacherGraded = isQOE
          ? (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'pending')
          : (teacherSc !== undefined && teacherSc !== null);

        if (isQOE && hasTeacherGraded) {
          if (teacherSc === 'empty') {
            blank++;
          } else {
            const numSc = Number(teacherSc);
            totalPts += numSc;
            if (numSc >= 5) correct++;
            else wrong++;
          }
        } else if (isQOE) {
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)];
          const hasText = Boolean(textVal && String(textVal).trim());
          if (hasText) {
            totalOE++;
            pending++;
          } else {
            blank++;
          }
        } else {
          const userAnsObj = sa.answers?.[i];
          const numUAns = unwrapUserAnswer(userAnsObj);
          const hasAns = typeof numUAns === 'number';
          const testCtx = resolveTestContext(test, sec, bankQ);
          const isCorr = hasAns ? checkIsAnswerCorrect(numUAns, qObj, testCtx, i) : null;
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

    const isPending = totalOE > 0 && pending > 0;
    const pct = maxPts > 0 ? Math.min(100, Math.round((totalPts / maxPts) * 100)) : 0;
    const net = Math.max(0, correct - (wrong * 0.25));

    return { totalPts, maxPts, pct, correct, wrong, blank, net, pending, isPending, totalOE };
  }, [sections, sectionAnswers, teacherScores, test, userAnswers]);

  const handleSaveTeacherGrading = async () => {
    setIsSavingTeacherGrading(true);
    try {
      const rawAns = userAnswers?.answers || userAnswers?.formattedAnswers || [];
      let totalPts = 0;
      let maxPts = 0;

      const secOffsets = [];
      let acc = 0;
      sections.forEach(s => { secOffsets.push(acc); acc += (s.qCount || 1); });

      let globalNo = 1;
      const updatedAnswers = sections.flatMap((sec, sIdx) => {
        const sa = sectionAnswers[sec.id] || {};
        const secQs = sec.resolvedQuestions || [];
        const count = sec.qCount || secQs.length || 1;
        const secStartIdx = secOffsets[sIdx];

        return Array.from({ length: count }).map((_, idx) => {
          const qNo = idx + 1;
          const currentGlobalNo = globalNo++;
          const existingAns = (Array.isArray(rawAns) ? rawAns.find(a => 
            (String(a.sectionId) === String(sec.id) && Number(a.questionNoInSection || a.questionNo) === qNo) ||
            Number(a.questionNo) === (secStartIdx + qNo)
          ) : null) || {};
          
          const rawSaAns = sa.answers?.[qNo];
          const userAns = rawSaAns !== undefined 
            ? (typeof rawSaAns === 'object' ? rawSaAns.userAnswer : rawSaAns)
            : existingAns.userAnswer;
          const textAns = sa.openEndedText?.[qNo] !== undefined 
            ? sa.openEndedText[qNo] 
            : (existingAns.userAnswerText || null);
          
          const isQOE = isQuestionOE(secQs[idx] || {}, sec, test, existingAns);
          const teacherSc = teacherScores[sec.id]?.[qNo];
          let score = 0;
          let isCorrect = null;
          let evalStatus = 'empty';

          if (isQOE) {
            if (teacherSc === 'empty') {
              score = 0;
              isCorrect = null;
              evalStatus = 'empty';
            } else if (teacherSc !== undefined && teacherSc !== null) {
              score = Number(teacherSc);
              isCorrect = score >= 5;
              evalStatus = score >= 5 ? (score === 5 ? 'half' : 'correct') : 'wrong';
              totalPts += score;
            } else {
              score = 0;
              isCorrect = null;
              evalStatus = textAns ? 'pending' : 'empty';
            }
          } else {
            // Multiple Choice: evaluate against answer key
            const numUAns = unwrapUserAnswer(userAns);
            const hasAns = typeof numUAns === 'number';
            if (hasAns) {
              const testCtx = resolveTestContext(test, sec, sec.bankQ || test);
              const isCorr = checkIsAnswerCorrect(numUAns, secQs[idx] || {}, testCtx, qNo);
              if (isCorr === true) {
                score = 10;
                isCorrect = true;
                evalStatus = 'correct';
                totalPts += 10;
              } else {
                score = 0;
                isCorrect = false;
                evalStatus = 'wrong';
              }
            } else {
              // Student left MC question blank
              score = 0;
              isCorrect = null;
              evalStatus = 'empty';
            }
          }

          maxPts += 10;

          return {
            ...existingAns,
            questionId: existingAns.questionId || (secQs[idx]?.id || `${sec.id}_${qNo}`),
            sectionId: sec.id,
            sectionTitle: sec.title,
            questionNo: currentGlobalNo,
            questionNoInSection: qNo,
            userAnswer: userAns !== undefined ? userAns : null,
            userAnswerText: textAns,
            score,
            isCorrect,
            evalStatus,
            teacherNote: teacherNotes[sec.id]?.[qNo] || existingAns.teacherNote || '',
            evaluatedByTeacher: true,
            evaluatedAt: new Date().toISOString()
          };
        });
      });

      const percentage = maxPts > 0 ? Math.min(100, Math.round((totalPts / maxPts) * 100)) : 0;

      const subId = userAnswers?.id || userAnswers?.submissionId || `sub_${test.id}_${Date.now()}`;
      const hwId = userAnswers?.homeworkId || userAnswers?.hwId || test.id;
      const studentId = userAnswers?.studentId || userAnswers?.userId || userAnswers?.user_id;

      const updatedSubPayload = {
        ...(userAnswers || {}),
        id: subId,
        testId: test.id,
        hwId: hwId,
        homeworkId: hwId,
        studentId: studentId,
        answers: updatedAnswers,
        teacherScores: teacherScores,
        teacherNotes: teacherNotes,
        correctCount: liveReviewStats.correct,
        wrongCount: liveReviewStats.wrong,
        blankCount: liveReviewStats.blank,
        score: percentage,
        scorePercentage: percentage,
        rawScore: totalPts,
        maxScore: maxPts,
        status: 'evaluated',
        isEvaluated: true,
        isEvaluatedByTeacher: true,
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      try {
        if (typeof updateSubmission === 'function') {
          await updateSubmission(subId, updatedSubPayload);
        }
      } catch (e) {
        console.warn('updateSubmission error:', e);
      }

      if (hwId) {
        try {
          if (typeof updateHomeworkSubmission === 'function') {
            await updateHomeworkSubmission(hwId, studentId || subId, updatedSubPayload);
          }
        } catch (e) {
          console.warn('updateHomeworkSubmission error:', e);
        }
      }

      setSubmissionAnswers(updatedAnswers);
      setShowResultModal(true);
    } catch (err) {
      console.error('Error saving teacher grading:', err);
      setShowResultModal(true);
    } finally {
      setIsSavingTeacherGrading(false);
    }
  };

  const handleSubmit = () => {
    if (isReviewMode) {
      handleSaveTeacherGrading();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
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
      const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
      const secQCount = sec.qCount || (sec.resolvedQuestions?.length > 0 ? sec.resolvedQuestions.length : (secImgCount > 0 ? secImgCount : 1));

      for (let idx = 0; idx < secQCount; idx++) {
        const qNo = idx + 1;
        const qObj = secQs[idx] || {};
        const ansObj = sa.answers?.[qNo];
        const userAns = ansObj !== undefined ? (typeof ansObj === 'object' ? ansObj?.userAnswer : ansObj) : null;
        const textAns = sa.openEndedText?.[qNo] || null;

        const isQOE = isQuestionOE(qObj, sec, test, ansObj || (textAns ? { userAnswerText: textAns } : null));
        const testCtx = resolveTestContext(test, sec, bankQ);

        const isCorrect = isQOE
          ? null
          : (userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, testCtx, qNo) : null);

        // Resolve correctAnswer letter for review display - prioritize question object / section answerKey
        let correctAns = null;

        // 1. Direct question-level correct answer (highest priority)
        if (qObj.correctAnswerLetter) {
          const letter = String(qObj.correctAnswerLetter).trim().toUpperCase();
          if (/^[A-E]$/.test(letter)) correctAns = letter.charCodeAt(0) - 65;
        } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
          correctAns = qObj.correctAnswer;
        } else if (qObj.correct_answer !== undefined && qObj.correct_answer !== null) {
          correctAns = qObj.correct_answer;
        }

        if (correctAns === null && Array.isArray(qObj.options) && qObj.options.length > 0) {
          const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true)));
          if (cIdx !== -1) correctAns = cIdx;
        }

        // 2. Section-level candidate key sources
        if (correctAns === null) {
          const keySources = [
            bankQ?.answerKey,
            sec?.answerKey,
            bankQ?.opticAnswers,
            sec?.opticAnswers,
            bankQ?.contentPayload?.answerKey,
            bankQ?.htmlPayload?.answerKey,
            bankQ?.pdfPayload?.answerKey,
            bankQ?.raw_data?.answerKey,
            bankQ?.bankQ?.answerKey,
            bankQ?.bankQ?.opticAnswers
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
        }

        // 3. Global test-level answerKey fallback
        if (correctAns === null && test?.answerKey) {
          const ak = test.answerKey;
          const secStart = secOffsets[sections.indexOf(sec)] || 0;
          let val = null;
          if (Array.isArray(ak)) {
            val = ak[secStart + idx] ?? (sections.length === 1 ? ak[idx] : null);
          } else if (typeof ak === 'object') {
            val = ak[secStart + qNo] ?? ak[String(secStart + qNo)];
          }
          if (val !== undefined && val !== null && val !== '') {
            if (typeof val === 'number') correctAns = val;
            else if (typeof val === 'string') {
              const s = val.trim().toUpperCase();
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
          isOpenEnded: isQOE,
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
    setShowResultModal(false);
    if (onSubmit) {
      onSubmit(submissionAnswers || [], { isCloseAction: true });
    }
  };

  const handleReviewResult = () => {
    setShowResultModal(false);
    if (onSubmit) {
      onSubmit(submissionAnswers || [], { isReviewAction: true });
    }
  };

  const activeSecState = sectionAnswers[activeSec.id] || { answers: {}, openEndedText: {} };
  const secOE = isSectionOpenEnded(activeSec, test);
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

  const activePdfPayload = extractPayload(activeBankQ) || extractPayload(activeSec) || (sections.length === 1 ? (extractPayload(test) || test?.pdfPayload || test?.pdfUrl || test?.contentPayload) : null) || bookPdfUrl || idbPayload;

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
  const isPdf = isPdfSection(activeBankQ) || isPdfSection(activeSec) || (sections.length === 1 && isPdfSection(test)) || Boolean(activePdfPayload && typeof activePdfPayload === 'string' && (activePdfPayload.startsWith('data:application/pdf') || activePdfPayload.includes('.pdf')));
  
  // Güçlü HTML Tespiti - Herhangi bir kaynakta HTML varsa zorla HTML moduna geç
  const stringToSearch = [
    activeBankQ?.contentPayload, activeSec?.contentPayload,
    activeBankQ?.htmlPayload, activeSec?.htmlPayload,
    idbPayload,
    ...(sections.length === 1 ? [test?.contentPayload, test?.htmlPayload] : [])
  ].filter(c => typeof c === 'string' && c.length > 10).join(' ');

  const isHtml = !isPdf && (
    isHtmlSection(activeBankQ) || 
    isHtmlSection(activeSec) || 
    (sections.length === 1 && isHtmlSection(test)) || 
    stringToSearch.includes('<!DOCTYPE') || 
    stringToSearch.includes('<html') || 
    stringToSearch.includes('<body') || 
    stringToSearch.includes('<head') ||
    stringToSearch.startsWith('data:text/html') ||
    activeBankQ?.contentType === 'html' ||
    activeSec?.contentType === 'html' ||
    (sections.length === 1 && test?.contentType === 'html')
  );

  const isImage = !isPdf && !isHtml && (
    isImageSection(activeBankQ) || 
    isImageSection(activeSec) || 
    (sections.length === 1 && isImageSection(test)) || 
    Boolean(idbPayload && typeof idbPayload === 'string' && idbPayload.startsWith('data:image'))
  );

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
      idbPayload,
      activeSec.raw_data?.contentPayload,
      activeBankQ?.raw_data?.contentPayload,
      ...(sections.length === 1 ? [test?.contentPayload] : [])
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

    // Try questionsList from activeSec, activeBankQ, or test (single-sec only)
    const listSources = [
      activeSec.questionsList,
      activeBankQ?.questionsList,
      activeSec.questions,
      activeBankQ?.questions,
      ...(sections.length === 1 ? [test?.questionsList, test?.questions] : [])
    ];
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
    } else if (finalQs.length > effectiveQCount && effectiveQCount > 0) {
      finalQs = finalQs.slice(0, effectiveQCount);
    }

    return finalQs;
  }, [activeSec, activeBankQ, test, idbPayload, effectiveQCount, sections.length]);

  // IDB loader runs ALWAYS on section change regardless of isPdf.
  // This breaks the chicken-and-egg: isPdf can't be true without idbPayload,
  // and idbPayload was never loaded because isPdf was false.
  useEffect(() => {
    const targetObj = activeBankQ.id ? activeBankQ : activeSec;
    // If direct payload already available for THIS section, no need to hit IDB
    if (extractPayload(targetObj)) return;
    
    // If this section is explicitly a standard text/MCQ question (has options/text and not an image/pdf/html type), do not load IDB
    const isExplicitTextSec = Boolean(
      (activeSec.questionText || activeBankQ?.questionText) &&
      (activeSec.options?.length > 0 || activeBankQ?.options?.length > 0) &&
      activeSec.contentType !== 'gorsel' && activeSec.contentType !== 'pdf' && activeSec.contentType !== 'html' &&
      activeBankQ?.contentType !== 'gorsel' && activeBankQ?.contentType !== 'pdf' && activeBankQ?.contentType !== 'html'
    );
    if (isExplicitTextSec) return;

    if (activeBankQ?.pdfUrl && !activeBankQ.pdfUrl.startsWith('data:')) return;
    if (idbPayload) return;

    let isMounted = true;
    async function load() {
      setIdbLoading(true);
      const isMulti = sections.length > 1;
      const baseIds = [
        targetObj.id,
        activeBankQ?.id,
        activeSec?.id,
        activeBankQ?.questionId,
        activeSec?.questionId,
        ...(!isMulti ? [
          test?.id,
          ...(test?.questionIds || []),
          ...(test?.questions || []).map(q => q?.id),
          ...(test?.questionsList || []).map(q => q?.id)
        ] : [])
      ].filter(Boolean);
      const idsToTry = [];
      
      baseIds.forEach(id => {
        const strId = String(id);
        if (strId.startsWith('sec_') || strId.startsWith('section_')) return;
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

      const uniqueIds = [...new Set(idsToTry)].filter(id => id && id.length > 1);

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

      // 2nd pass: scan ALL IDB keys and match against our IDs (single section only)
      if (!isMulti) {
        try {
          const allKeys = await idbGetAllKeys();
          const normIds = uniqueIds.map(id => String(id).replace(/^(hw_|q_|q)/, '').toLowerCase()).filter(id => id.length >= 4);
          for (const key of allKeys) {
            const normKey = String(key).replace(/^(hw_|q_|q)/, '').toLowerCase();
            const isMatch = normIds.some(nid => nid === normKey);
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
      }

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
                background: (liveReviewStats.isPending && !isTeacherMode) ? '#f5f3ff' : '#f8fafc',
                border: (liveReviewStats.isPending && !isTeacherMode) ? '1.5px solid #ddd6fe' : '1.5px solid #cbd5e1',
                borderRadius: '0.65rem',
                padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {liveReviewStats.isPending && !isTeacherMode ? (
                  <span style={{ fontSize: isMobile ? '0.72rem' : '0.84rem', fontWeight: 900, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    ⏳ Öğretmen Değerlendirmesinde
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: isMobile ? '0.78rem' : '0.92rem', fontWeight: 900, color: liveReviewStats.pct >= 70 ? '#16a34a' : (liveReviewStats.pct >= 50 ? '#d97706' : '#dc2626') }}>
                      %{liveReviewStats.pct}
                    </span>
                    <span style={{ fontSize: isMobile ? '0.65rem' : '0.74rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      (<span style={{ color: '#16a34a', fontWeight: 900 }}>{liveReviewStats.correct} D</span>
                      <span>/</span>
                      <span style={{ color: '#dc2626', fontWeight: 900 }}>{liveReviewStats.wrong} Y</span>
                      <span>/</span>
                      <span style={{ color: '#64748b', fontWeight: 900 }}>{liveReviewStats.blank} B</span>
                      {liveReviewStats.pending > 0 && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span style={{ color: '#7c3aed', fontWeight: 900 }}>⏳ {liveReviewStats.pending} Bekleyen</span>
                        </>
                      )})
                    </span>
                  </>
                )}
              </div>

              {isTeacherMode && (
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
              )}

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
                {isReviewMode && !isTeacherMode ? 'Kapat / Sonuç' : 'Kapat'}
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
                test={test}
                isReviewMode={isReviewMode}
                isTeacherMode={isTeacherMode}
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
                onSaveEvaluation={handleSaveTeacherGrading}
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
                test={test}
                isReviewMode={isReviewMode}
                isTeacherMode={isTeacherMode}
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
                onSaveEvaluation={handleSaveTeacherGrading}
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
                    const userAnsObj = Array.isArray(activeSecState.answers)
                      ? (activeSecState.answers[qNo] ?? activeSecState.answers[idx])
                      : (activeSecState.answers?.[qNo] ?? activeSecState.answers?.[String(qNo)]);
                    const isQOpenEnded = isQuestionOE(qObj, activeSec, test, userAnsObj);

                    let questionImageUrls = [];
                    if (effectiveSecImages.length > 0) {
                      if (effectiveSecImages[idx]) {
                        questionImageUrls = [effectiveSecImages[idx]];
                      } else {
                        questionImageUrls = [effectiveSecImages[0]];
                      }
                    }
                    const imageUrls = extractImageUrls(questionImageUrls);

                    const rawSelectedOpt = unwrapUserAnswer(userAnsObj);
                    const numericSelectedOpt = typeof rawSelectedOpt === 'number' ? rawSelectedOpt : null;
                    const hasVisualAns = numericSelectedOpt !== null && !isNaN(numericSelectedOpt);
                    const rawTextVal = activeSecState.openEndedText?.[qNo] ?? activeSecState.openEndedText?.[String(qNo)] ?? (typeof userAnsObj === 'object' ? (userAnsObj?.userAnswerText ?? userAnsObj?.user_answer_text ?? userAnsObj?.textAns) : undefined);
                    const textVal = (rawTextVal !== undefined && rawTextVal !== null) ? String(rawTextVal) : '';
                    const hasVisualText = textVal.trim() !== '';
                    const isQAnswered = hasVisualAns || hasVisualText;

                    let correctAns = null;

                    // 1. Direct question-level correct answer (highest priority)
                    if (qObj.correctAnswerLetter) {
                      const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                      if (/^[A-E]$/.test(lt)) correctAns = lt.charCodeAt(0) - 65;
                    } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                      correctAns = qObj.correctAnswer;
                    } else if (qObj.correct_answer !== undefined && qObj.correct_answer !== null) {
                      correctAns = qObj.correct_answer;
                    }

                    if (correctAns === null && Array.isArray(qObj.options) && qObj.options.length > 0) {
                      const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true)));
                      if (cIdx !== -1) correctAns = cIdx;
                    }

                    // 2. Section-level candidate key sources
                    if (correctAns === null) {
                      const keySources = [
                        activeSec?.bankQ?.answerKey,
                        activeSec?.answerKey,
                        activeSec?.bankQ?.opticAnswers,
                        activeSec?.opticAnswers,
                        activeSec?.bankQ?.contentPayload?.answerKey,
                        activeSec?.bankQ?.htmlPayload?.answerKey,
                        activeSec?.bankQ?.pdfPayload?.answerKey,
                        activeSec?.bankQ?.raw_data?.answerKey,
                        activeSec?.bankQ?.bankQ?.answerKey,
                        activeSec?.bankQ?.bankQ?.opticAnswers
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
                    }

                    // 3. User answer object fallback
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

                    // 4. Global test-level answerKey (with proper section offset)
                    if (correctAns === null && test?.answerKey) {
                      const ak = test.answerKey;
                      const secStart = secOffsets[activeSecIdx] || 0;
                      let val = null;
                      if (Array.isArray(ak)) {
                        val = ak[secStart + idx] ?? (sections.length === 1 ? ak[idx] : null);
                      } else if (typeof ak === 'object') {
                        val = ak[secStart + qNo] ?? ak[String(secStart + qNo)];
                      }
                      if (val !== undefined && val !== null && val !== '') {
                        if (typeof val === 'number') correctAns = val;
                        else if (typeof val === 'string') {
                          const s = val.trim().toUpperCase();
                          if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                          else if (!isNaN(Number(s))) correctAns = Number(s);
                        }
                      }
                    }

                    const numericCorrectAns = (typeof correctAns === 'string' && /^[A-Ea-e]$/.test(correctAns.trim()))
                      ? correctAns.trim().toUpperCase().charCodeAt(0) - 65
                      : (correctAns !== undefined && correctAns !== null && !isNaN(Number(correctAns)) && String(correctAns).trim() !== '' ? Number(correctAns) : correctAns);

                    const testCtx = resolveTestContext(test, activeSec, activeBankQ);
                    const evalRes = isReviewMode && hasVisualAns ? checkIsAnswerCorrect(numericSelectedOpt, qObj, testCtx, qNo) : null;
                    const isQCorrect = evalRes !== null ? evalRes : (userAnsObj?.isCorrect !== undefined ? userAnsObj.isCorrect : (numericCorrectAns !== null && numericCorrectAns !== undefined && hasVisualAns ? numericSelectedOpt === numericCorrectAns : null));

                    const teacherSc = teacherScores[activeSec.id]?.[qNo];

                    const optionsCount = (
                      Number(test?.optionCount) === 5 ||
                      Number(test?.optionsCount) === 5 ||
                      Number(test?.book?.optionCount) === 5 ||
                      String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                      test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS'
                    ) ? 5 : 4;

                    if (isReviewMode) {
                      if (isQOpenEnded) {
                        return (
                          <OpenEndedReview
                            question={qObj}
                            qNo={qNo}
                            totalQuestions={effectiveQCount}
                            studentAnswerText={textVal}
                            teacherScore={teacherSc}
                            teacherNote={teacherNotes[activeSec.id]?.[qNo] || ''}
                            onSetTeacherScore={(sc) => setTeacherScores(p => ({
                              ...p,
                              [activeSec.id]: { ...(p[activeSec.id] || {}), [qNo]: sc }
                            }))}
                            onSetTeacherNote={(note) => setTeacherNotes(p => ({
                              ...p,
                              [activeSec.id]: { ...(p[activeSec.id] || {}), [qNo]: note }
                            }))}
                            isTeacherMode={isTeacherMode}
                            imageUrls={imageUrls}
                            onOpenLightbox={(src) => setLightboxSrc(src)}
                            isMobile={isMobile}
                          />
                        );
                      }
                      return (
                        <MultipleChoiceReview
                          question={qObj}
                          qNo={qNo}
                          totalQuestions={effectiveQCount}
                          selectedOption={hasVisualAns ? numericSelectedOpt : null}
                          correctOption={numericCorrectAns}
                          isCorrect={isQCorrect}
                          optionsCount={optionsCount}
                          imageUrls={imageUrls}
                          onOpenLightbox={(src) => setLightboxSrc(src)}
                          isMobile={isMobile}
                        />
                      );
                    }

                    if (isQOpenEnded) {
                      return (
                        <OpenEndedRunner
                          question={qObj}
                          qNo={qNo}
                          totalQuestions={effectiveQCount}
                          answerText={textVal}
                          onChangeAnswerText={(val) => handleTextChange(activeSec.id, qNo, val)}
                          imageUrls={imageUrls}
                          onOpenLightbox={(src) => setLightboxSrc(src)}
                          onOpenDrawing={() => setIsDrawingOpen(true)}
                          isMobile={isMobile}
                        />
                      );
                    }

                    return (
                      <MultipleChoiceRunner
                        question={qObj}
                        qNo={qNo}
                        totalQuestions={effectiveQCount}
                        selectedOption={hasVisualAns ? numericSelectedOpt : null}
                        onSelectOption={(optIdx) => handleSelectOption(activeSec.id, qNo, optIdx, qObj)}
                        optionsCount={optionsCount}
                        imageUrls={imageUrls}
                        onOpenLightbox={(src) => setLightboxSrc(src)}
                        isMobile={isMobile}
                      />
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
                      isTeacherMode ? (
                        <button
                          onClick={handleSaveTeacherGrading}
                          disabled={isSavingTeacherGrading}
                          style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: isSavingTeacherGrading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                        >
                          <Save size={18} /> {isSavingTeacherGrading ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Sonucu Gör'}
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                        >
                          <CheckCircle2 size={18} /> 📊 Sınav Sonuç Raporunu Gör
                        </button>
                      )
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
                test={test}
                isReviewMode={isReviewMode}
                isTeacherMode={isTeacherMode}
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
                onSaveEvaluation={handleSaveTeacherGrading}
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
                  const userAnsObj = Array.isArray(activeSecState.answers)
                    ? (activeSecState.answers[qNo] ?? activeSecState.answers[idx])
                    : (activeSecState.answers?.[qNo] ?? activeSecState.answers?.[String(qNo)]);
                  const isQOpenEnded = isQuestionOE(qObj, activeSec, test, userAnsObj);

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
                  const rawSelectedOpt = unwrapUserAnswer(userAnsObj);
                  const numericSelectedOpt = typeof rawSelectedOpt === 'number' ? rawSelectedOpt : null;
                  const hasStdAns = numericSelectedOpt !== null && !isNaN(numericSelectedOpt);
                  const rawTextVal = activeSecState.openEndedText?.[qNo] ?? activeSecState.openEndedText?.[String(qNo)] ?? (typeof userAnsObj === 'object' ? (userAnsObj?.userAnswerText ?? userAnsObj?.user_answer_text ?? userAnsObj?.textAns) : undefined);
                  const textVal = (rawTextVal !== undefined && rawTextVal !== null) ? String(rawTextVal) : '';
                  const hasStdText = textVal !== undefined && textVal !== null && String(textVal).trim() !== '';
                  const isStdAnswered = hasStdAns || hasStdText;

                  // Review mode: resolve correctAnswer
                  let corrAns = null;

                  // 1. Direct question-level correct answer (highest priority)
                  if (qObj.correctAnswerLetter) {
                    const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                    if (/^[A-E]$/.test(lt)) corrAns = lt.charCodeAt(0) - 65;
                  } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                    corrAns = qObj.correctAnswer;
                  } else if (qObj.correct_answer !== undefined && qObj.correct_answer !== null) {
                    corrAns = qObj.correct_answer;
                  }

                  if (corrAns === null && Array.isArray(qObj.options) && qObj.options.length > 0) {
                    const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true)));
                    if (cIdx !== -1) corrAns = cIdx;
                  }

                  // 2. Section-level candidate key sources
                  if (corrAns === null) {
                    const keySources = [
                      activeSec?.bankQ?.answerKey,
                      activeSec?.answerKey,
                      activeSec?.bankQ?.opticAnswers,
                      activeSec?.opticAnswers,
                      activeSec?.bankQ?.contentPayload?.answerKey,
                      activeSec?.bankQ?.htmlPayload?.answerKey,
                      activeSec?.bankQ?.pdfPayload?.answerKey,
                      activeSec?.bankQ?.raw_data?.answerKey,
                      activeSec?.bankQ?.bankQ?.answerKey,
                      activeSec?.bankQ?.bankQ?.opticAnswers
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
                  }

                  // 3. User answer object fallback
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

                  // 4. Global test-level answerKey (with proper section offset)
                  if (corrAns === null && test?.answerKey) {
                    const ak = test.answerKey;
                    const secStart = secOffsets[activeSecIdx] || 0;
                    let val = null;
                    if (Array.isArray(ak)) {
                      val = ak[secStart + idx] ?? (sections.length === 1 ? ak[idx] : null);
                    } else if (typeof ak === 'object') {
                      val = ak[secStart + qNo] ?? ak[String(secStart + qNo)];
                    }
                    if (val !== undefined && val !== null && val !== '') {
                      if (typeof val === 'number') corrAns = val;
                      else if (typeof val === 'string') {
                        const s = val.trim().toUpperCase();
                        if (/^[A-E]$/.test(s)) corrAns = s.charCodeAt(0) - 65;
                        else if (!isNaN(Number(s))) corrAns = Number(s);
                      }
                    }
                  }

                  const numericCorrAns = (typeof corrAns === 'string' && /^[A-Ea-e]$/.test(corrAns.trim()))
                    ? corrAns.trim().toUpperCase().charCodeAt(0) - 65
                    : (corrAns !== undefined && corrAns !== null && !isNaN(Number(corrAns)) && String(corrAns).trim() !== '' ? Number(corrAns) : corrAns);

                  const testCtx = resolveTestContext(test, activeSec, activeBankQ);
                  const evalRes = isReviewMode && hasStdAns ? checkIsAnswerCorrect(numericSelectedOpt, qObj, testCtx, qNo) : null;
                  const isStdCorrect = evalRes !== null ? evalRes : (userAnsObj?.isCorrect !== undefined ? userAnsObj.isCorrect : (numericCorrAns !== null && numericCorrAns !== undefined && hasStdAns ? numericSelectedOpt === numericCorrAns : null));

                  const teacherSc = teacherScores[activeSec.id]?.[qNo];

                  const optionsCount = (
                    Number(test?.optionCount) === 5 ||
                    Number(test?.optionsCount) === 5 ||
                    Number(test?.book?.optionCount) === 5 ||
                    String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                    test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS'
                  ) ? 5 : 4;

                  if (isReviewMode) {
                    if (isQOpenEnded) {
                      return (
                        <OpenEndedReview
                          key={qNo}
                          question={qObj}
                          qNo={qNo}
                          totalQuestions={effectiveQCount}
                          studentAnswerText={textVal}
                          teacherScore={teacherSc}
                          teacherNote={teacherNotes[activeSec.id]?.[qNo] || ''}
                          onSetTeacherScore={(sc) => setTeacherScores(p => ({
                            ...p,
                            [activeSec.id]: { ...(p[activeSec.id] || {}), [qNo]: sc }
                          }))}
                          onSetTeacherNote={(note) => setTeacherNotes(p => ({
                            ...p,
                            [activeSec.id]: { ...(p[activeSec.id] || {}), [qNo]: note }
                          }))}
                          isTeacherMode={isTeacherMode}
                          imageUrls={imageUrls}
                          onOpenLightbox={(src) => setLightboxSrc(src)}
                          isMobile={isMobile}
                        />
                      );
                    }
                    return (
                      <MultipleChoiceReview
                        key={qNo}
                        question={qObj}
                        qNo={qNo}
                        totalQuestions={effectiveQCount}
                        selectedOption={hasStdAns ? numericSelectedOpt : null}
                        correctOption={numericCorrAns}
                        isCorrect={isStdCorrect}
                        optionsCount={optionsCount}
                        imageUrls={imageUrls}
                        onOpenLightbox={(src) => setLightboxSrc(src)}
                        isMobile={isMobile}
                      />
                    );
                  }

                  if (isQOpenEnded) {
                    return (
                      <OpenEndedRunner
                        key={qNo}
                        question={qObj}
                        qNo={qNo}
                        totalQuestions={effectiveQCount}
                        answerText={textVal}
                        onChangeAnswerText={(val) => handleTextChange(activeSec.id, qNo, val)}
                        imageUrls={imageUrls}
                        onOpenLightbox={(src) => setLightboxSrc(src)}
                        onOpenDrawing={() => setIsDrawingOpen(true)}
                        isMobile={isMobile}
                      />
                    );
                  }

                  return (
                    <MultipleChoiceRunner
                      key={qNo}
                      question={qObj}
                      qNo={qNo}
                      totalQuestions={effectiveQCount}
                      selectedOption={hasStdAns ? numericSelectedOpt : null}
                      onSelectOption={(optIdx) => handleSelectOption(activeSec.id, qNo, optIdx, qObj)}
                      optionsCount={optionsCount}
                      imageUrls={imageUrls}
                      onOpenLightbox={(src) => setLightboxSrc(src)}
                      isMobile={isMobile}
                    />
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
                    isTeacherMode ? (
                      <button
                        onClick={handleSaveTeacherGrading}
                        disabled={isSavingTeacherGrading}
                        style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: isSavingTeacherGrading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                      >
                        <Save size={18} /> {isSavingTeacherGrading ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Sonucu Gör'}
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                      >
                        <CheckCircle2 size={18} /> 📊 Sınav Sonuç Raporunu Gör
                      </button>
                    )
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
                test={test}
                isReviewMode={isReviewMode}
                isTeacherMode={isTeacherMode}
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
                onSaveEvaluation={handleSaveTeacherGrading}
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
          isTeacher={isTeacherMode}
          onConfirmClose={handleConfirmCloseResult}
          onReview={handleReviewResult}
        />
      )}

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
