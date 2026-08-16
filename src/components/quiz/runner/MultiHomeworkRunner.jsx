import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useCurriculum } from '../../../context/CurriculumContext';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload, idbGetAllKeys } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl, extractImageUrls } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil } from 'lucide-react';
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

export function resolveExactQuestionCount(sec = {}, bankQ = {}, foundInBank = {}, resolvedQuestions = [], secImages = []) {
  // 1. Answer Key check (from all sources)
  const getAkCount = (obj) => {
    if (!obj || !obj.answerKey) return 0;
    const ak = obj.answerKey;
    if (Array.isArray(ak)) return ak.filter(x => x !== undefined && x !== null && x !== '').length || ak.length;
    if (typeof ak === 'string') return ak.trim().length;
    if (typeof ak === 'object') return Object.keys(ak).length;
    return 0;
  };
  const akCount = Math.max(
    getAkCount(sec),
    getAkCount(bankQ),
    getAkCount(foundInBank),
    getAkCount(bankQ?.bankQ)
  );

  // 2. Direct question lists
  const listCount = Math.max(
    Array.isArray(sec?.questionsList) ? sec.questionsList.length : 0,
    Array.isArray(bankQ?.questionsList) ? bankQ.questionsList.length : 0,
    Array.isArray(foundInBank?.questionsList) ? foundInBank.questionsList.length : 0,
    Array.isArray(sec?.questions) ? sec.questions.length : 0,
    Array.isArray(bankQ?.questions) ? bankQ.questions.length : 0,
    Array.isArray(foundInBank?.questions) ? foundInBank.questions.length : 0,
    Array.isArray(sec?.questionIds) ? sec.questionIds.length : 0,
    Array.isArray(bankQ?.questionIds) ? bankQ.questionIds.length : 0,
    Array.isArray(foundInBank?.questionIds) ? foundInBank.questionIds.length : 0,
    Array.isArray(resolvedQuestions) ? resolvedQuestions.length : 0
  );

  // 3. Question Count field (numeric)
  const getRawCount = (obj) => {
    if (!obj) return 0;
    const val = obj.questionCount ?? obj.totalQuestions ?? obj.questionsCount ?? obj.qCount ?? obj.soruSayisi;
    if (val !== undefined && val !== null) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };
  const countField = Math.max(
    getRawCount(sec),
    getRawCount(bankQ),
    getRawCount(foundInBank),
    getRawCount(bankQ?.bankQ)
  );

  // 4. Title regex (e.g. "(4 Soru)" or "4 Soru")
  const titleMatch = (() => {
    const titles = [sec?.title, bankQ?.title, bankQ?.name, foundInBank?.title, foundInBank?.name];
    for (const t of titles) {
      if (t) {
        const m = String(t).match(/(\d+)\s*Soru/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
    return 0;
  })();

  // 5. Visual images count
  const imgCount = Array.isArray(secImages) ? secImages.length : 0;

  // Final exact resolution (no hardcoded 10, exact count from test data)
  return Math.max(countField, akCount, listCount, titleMatch, imgCount, 1);
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

  return (
    <div style={{ width: '100%', background: '#1e293b', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.85rem 1rem', background: '#0f172a', borderBottom: '1px solid #334155', fontWeight: 900, fontSize: isMobile ? '0.8rem' : '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{isReviewMode ? '🔍 İnceleme & Cevaplar' : '📋 Optik Kodlama'}</span>
        <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', color: '#94a3b8' }}>Toplam {qCount} Soru</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.4rem' : '0.85rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.35rem' : '0.65rem' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = (resolvedQuestions && resolvedQuestions[idx]) || {};
          const isQOE = isOpenEnded || checkIsOE(qObj);

          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          const isCorrect = (userAnsObj && userAnsObj.isCorrect !== undefined)
            ? userAnsObj.isCorrect
            : (userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo) : null);

          return (
            <div key={qNo} style={{ background: '#0f172a', padding: isMobile ? '0.4rem 0.5rem' : '0.65rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: isMobile ? '0.72rem' : '0.78rem', color: '#f8fafc' }}>
                <span>Soru {qNo} {isQOE ? '(✍️ Yazılı)' : ''}</span>
                {isReviewMode ? (
                  isQOE ? (
                    <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 900 }}>⏳ Değerlendirmede</span>
                  ) : userAns !== undefined && userAns !== null ? (
                    isCorrect ? (
                      <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 900 }}>✓ DOĞRU</span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 900 }}>✗ YANLIŞ</span>
                    )
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>— BOŞ</span>
                  )
                ) : (
                  userAns !== undefined || textVal ? (
                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 900 }}>✓ {isQOE ? 'Yazıldı' : 'Kodlandı'}</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>— Boş</span>
                  )
                )}
              </div>

              {isQOE ? (
                <textarea
                  value={textVal}
                  onChange={(e) => !isReviewMode && onTextChange(qNo, e.target.value)}
                  readOnly={isReviewMode}
                  placeholder={isReviewMode ? "Öğrenci bu soruya yanıt yazmadı" : `Soru ${qNo} açık uçlu / yazılı yanıt...`}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 0.65rem',
                    borderRadius: '0.5rem',
                    background: '#1e293b',
                    border: textVal ? '1.5px solid #10b981' : '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.3rem' }}>
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

                    let bg = '#1e293b';
                    let border = '1px solid #334155';
                    let color = '#cbd5e1';

                    if (isReviewMode) {
                      if (isSelected && isCorrectOpt) {
                        bg = '#059669'; border = 'none'; color = 'white';
                      } else if (isSelected && !isCorrectOpt) {
                        bg = '#dc2626'; border = 'none'; color = 'white';
                      } else if (isCorrectOpt) {
                        bg = 'rgba(16,185,129,0.2)'; border = '1.5px solid #10b981'; color = '#34d399';
                      }
                    } else if (isSelected) {
                      bg = '#059669'; border = 'none'; color = 'white';
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => !isReviewMode && onOptionSelect(qNo, optIdx)}
                        disabled={isReviewMode}
                        style={{
                          flex: 1,
                          height: isMobile ? '26px' : '30px',
                          borderRadius: '0.4rem',
                          border,
                          background: bg,
                          color,
                          fontWeight: 900,
                          fontSize: isMobile ? '0.75rem' : '0.8rem',
                          cursor: isReviewMode ? 'default' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
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

      {/* FOOTER BUTTONS AT THE BOTTOM OF OPTIK PANEL */}
      <div style={{ padding: isMobile ? '0.5rem' : '0.75rem', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
        {totalSections > 1 && !isLastSec && (
          <button
            onClick={onNextSection}
            style={{
              width: '100%',
              padding: isMobile ? '0.5rem 0.75rem' : '0.65rem 1rem',
              borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 3px 12px rgba(99,102,241,0.3)'
            }}
          >
            Sonraki Bölüme Geç <ChevronRight size={isMobile ? 14 : 16} />
          </button>
        )}

        {(totalSections === 1 || isLastSec) && (
          <button
            onClick={onSubmit}
            style={{
              width: '100%',
              padding: isMobile ? '0.5rem 0.75rem' : '0.65rem 1rem',
              borderRadius: '0.65rem',
              background: isReviewMode ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 3px 12px rgba(16,185,129,0.3)'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 16} /> {isReviewMode ? 'İncelemeyi Kapat' : 'Sınavı Bitir ve Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MULTI RESULT MODAL COMPONENT ─────────────────────────────────────────────
function MultiResultModal({ test, sections, sectionAnswers, onConfirmClose }) {
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.5rem', width: '100%', maxWidth: '750px', color: '#f8fafc', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', margin: 'auto' }}>
        
        {/* TOP HEADER */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>Sınav Başarıyla Gönderildi!</h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>{test.title || test.name}</p>
        </div>

        {/* TEACHER EVALUATION ALERT BANNER */}
        {hasOE && (
          <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.15))', border: '1.5px solid #818cf8', borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>⏳</div>
            <div>
              <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, color: '#c084fc', fontSize: '0.95rem' }}>
                Yazılı / Açık Uçlu Cevaplarınız Öğretmen Değerlendirmesine Gönderildi
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                Çoktan seçmeli sorularınızın puan ve net hesaplaması tamamlanmıştır. Açık uçlu ({totalOEQuestions} soru) yanıtlarınız ise öğretmeniniz tarafından incelenip puanlandıktan sonra karnenize yansıyacaktır.
              </p>
            </div>
          </div>
        )}

        {/* OVERALL SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>ÇOKTAN SEÇMELİ NET</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>{totalMCNet.toFixed(2)}</div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>DOĞRU / YANLIŞ</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34d399', marginTop: '0.3rem' }}>
              {totalMCDoğru} <span style={{ fontSize: '0.85rem', color: '#f87171' }}>D / {totalMCYanlış} Y</span>
            </div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>AÇIK UÇLU YANIT</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#c084fc', marginTop: '0.3rem' }}>
              {totalOECevaplanan} / {totalOEQuestions}
            </div>
          </div>
        </div>

        {/* BÖLÜM BAZLI DETAYLAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#cbd5e1' }}>📊 Bölüm Bazlı Sonuç Özeti</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {sectionStats.map((secStat, sIdx) => (
              <div key={sIdx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ padding: '0.25rem 0.55rem', background: secStat.isOE ? '#7c3aed' : '#0284c7', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: 900, color: 'white' }}>
                    {secStat.isOE ? '✍️ Yazılı Bölüm' : '📝 Test Bölümü'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>{secStat.title}</span>
                </div>

                {secStat.isOE ? (
                  <span style={{ padding: '0.3rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(192,132,252,0.15)', border: '1px solid #c084fc', color: '#c084fc', fontSize: '0.8rem', fontWeight: 900 }}>
                    ⏳ Öğretmen Değerlendirmesinde ({secStat.oeCevaplanan}/{secStat.qCount} Yanıt)
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.82rem', fontWeight: 800 }}>
                    <span style={{ color: '#34d399' }}>{secStat.mcDoğru} Doğru</span>
                    <span style={{ color: '#f87171' }}>{secStat.mcYanlış} Yanlış</span>
                    <span style={{ color: '#94a3b8' }}>{secStat.mcBoş} Boş</span>
                    <span style={{ padding: '0.2rem 0.6rem', background: '#0369a1', borderRadius: '0.4rem', color: 'white', fontWeight: 900 }}>
                      Net: {secStat.mcNet.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CONFIRM BUTTON */}
        <button
          onClick={onConfirmClose}
          style={{
            marginTop: '0.5rem',
            padding: '0.9rem 1.5rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            color: 'white',
            fontWeight: 900,
            fontSize: '1rem',
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
  );
}

// ─── MAIN MULTI-HOMEWORK RUNNER COMPONENT ────────────────────────────────────
export default function MultiHomeworkRunner({ test, questions, onSubmit, isReviewMode = false, userAnswers = null, onAutoSave, draftAnswers }) {
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
        rawSections = ids.map((item, idx) => (typeof item === 'object' ? item : { id: item, questionId: item, title: `${idx + 1}. Bölüm` }));
      }
    }

    if (Array.isArray(rawSections) && rawSections.length > 0) {
      const isSingleSec = rawSections.length === 1;

      return rawSections.map((sec, idx) => {
        const qId = sec.questionId || sec.id || sec.testId || sec.bankQId;
        let foundInBank = qId ? findInAllSources(qId) : null;

        if (!foundInBank && (sec.id || sec.questionId)) {
          foundInBank = findInAllSources(sec.id) || findInAllSources(sec.questionId);
        }

        // Merge: foundInBank is base, sec fields override — this preserves sec.contentType/formatType saved in hwData.sections
        const bankQ = foundInBank
          ? { ...foundInBank, ...sec, bankQ: foundInBank }  // sec fields (contentType, etc.) win over foundInBank
          : (sec.bankQ || sec.test || sec);
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

        const qCount = resolveExactQuestionCount(sec, bankQ, foundInBank, resolvedQuestions, secImages);

        if (resolvedQuestions.length < qCount) {
          const filled = [...resolvedQuestions];
          for (let i = filled.length; i < qCount; i++) {
            filled.push({
              id: `${bankQ?.id || sec.id || 'q'}_sub_${i + 1}`,
              questionText: `Soru ${i + 1}`,
              imageUrl: secImages[i] || secImages[0] || null,
              options: ['A', 'B', 'C', 'D', 'E']
            });
          }
          resolvedQuestions = filled;
        }

        return {
          id: sec.id || sec.questionId || `sec_${idx}`,
          title: sec.title || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`,
          bankQ: bankQ || sec,
          resolvedQuestions,
          qCount: resolvedQuestions.length
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
    
    const resolvedQuestions = resolveTestQuestions(test, allBankQuestions);
    const finalQs = (resolvedQuestions && resolvedQuestions.length > 0) ? resolvedQuestions : (questions || []);
    return [{
      id: test.id || 'sec_1',
      title: test.title || test.name || '1. Bölüm',
      bankQ: test,
      resolvedQuestions: finalQs,
      qCount: test.questionCount || test.totalQuestions || finalQs.length || safeMaxAns(test) || 10
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
  const [saveTimeout, setSaveTimeout] = useState(null);

  const triggerAutoSave = useCallback((currentSectionAnswers) => {
    if (isReviewMode || !onAutoSave) return;
    
    if (saveTimeout) clearTimeout(saveTimeout);
    
    const timeoutId = setTimeout(() => {
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
    }, 500); // reduced from 2000 to 500ms for instant save
    setSaveTimeout(timeoutId);
  }, [isReviewMode, onAutoSave, saveTimeout, sections, test]);

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
      onSubmit(submissionAnswers);
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
      obj.contentPayload, obj.pdfPayload, obj.pdfUrl, obj.url
    ];
    const direct = candidates.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]');
    if (direct) return direct;

    const qId = obj.questionId || obj.id;
    if (qId && String(qId) !== String(test?.id)) {
      const found = findInAllSources(qId);
      if (found && String(found.id) !== String(test?.id)) {
        const foundCand = [found.contentPayload, found.pdfPayload, found.pdfUrl, found.url];
        const foundDirect = foundCand.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]');
        if (foundDirect) return foundDirect;
      }
    }
    return null;
  }, [findInAllSources, test?.id]);

  const activePdfPayload = extractPayload(activeBankQ) || extractPayload(activeSec) || test?.pdfPayload || test?.pdfUrl || idbPayload;

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
    return resolveExactQuestionCount(activeSec, activeBankQ, activeSec.bankQ, activeSec.resolvedQuestions, effectiveSecImages);
  }, [isImage, effectiveSecImages, activeSec, activeBankQ]);

  // IDB loader runs ALWAYS on section change regardless of isPdf.
  // This breaks the chicken-and-egg: isPdf can't be true without idbPayload,
  // and idbPayload was never loaded because isPdf was false.
  useEffect(() => {
    const targetObj = activeBankQ.id ? activeBankQ : activeSec;
    // If direct payload already available, no need to hit IDB
    if (extractPayload(targetObj)) return;
    if (test?.pdfPayload || test?.pdfUrl) return;
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ── HEADER BAR ── */}
      <header style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isMobile ? '0.5rem' : '0.75rem', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem', overflow: 'hidden' }}>
          {!isMobile && (
            <span style={{ padding: '0.35rem 0.65rem', background: isReviewMode ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={14} /> {isReviewMode ? '🔍 İNCELEME' : 'TOPLU ÖDEV RUNNER'}
            </span>
          )}
          <h2 style={{ fontSize: isMobile ? '0.9rem' : '1.05rem', fontWeight: 900, margin: 0, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {test.title || test.name}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexWrap: 'wrap' }}>
          {isReviewMode ? (
            <div style={{ padding: isMobile ? '0.3rem 0.5rem' : '0.4rem 0.85rem', borderRadius: '0.65rem', background: '#312e81', border: '1.5px solid #6366f1', color: '#c7d2fe', fontWeight: 900, fontSize: isMobile ? '0.75rem' : '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={isMobile ? 14 : 16} color="#818cf8" />
              {!isMobile && <span>🏁 İnceleme Raporu</span>}
            </div>
          ) : (
            <div style={{ padding: isMobile ? '0.3rem 0.5rem' : '0.4rem 0.85rem', borderRadius: '0.65rem', background: timeLeft < 300 ? '#7f1d1d' : '#0f172a', border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`, color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff', fontWeight: 900, fontSize: isMobile ? '0.75rem' : '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={isMobile ? 14 : 16} color={timeLeft < 300 ? '#ef4444' : '#059669'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{ padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', borderRadius: '0.75rem', background: isDrawingOpen ? '#eab308' : '#0f172a', border: '1px solid #334155', color: isDrawingOpen ? 'white' : '#e2e8f0', fontWeight: 800, fontSize: isMobile ? '0.75rem' : '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Çizim Aracı"
          >
            <Pencil size={isMobile ? 14 : 16} /> 
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı")}
          </button>

          {isReviewMode ? (
            <button
              onClick={() => onSubmit && onSubmit()}
              style={{ padding: isMobile ? '0.4rem 0.6rem' : '0.55rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: isMobile ? '0.75rem' : '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
            >
              <CheckCircle2 size={isMobile ? 14 : 18} /> 
              {!isMobile && "İncelemeyi Kapat"}
              {isMobile && "Kapat"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{ padding: isMobile ? '0.4rem 0.6rem' : '0.55rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: isMobile ? '0.75rem' : '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
            >
              <CheckCircle2 size={isMobile ? 14 : 18} /> 
              {!isMobile && "Sınavı Bitir ve Gönder"}
              {isMobile && "Bitir"}
            </button>
          )}
        </div>
      </header>

      {/* ── TOP SECTION TABS BAR (PERMANENT) ── */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: isMobile ? '0.4rem 0.5rem' : '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.3rem', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflowX: 'auto', flex: 1, paddingBottom: isMobile ? '2px' : '0' }}>
          {sections.map((sec, idx) => {
            const isCurrent = idx === activeSecIdx;
            const secAnsState = sectionAnswers[sec.id]?.answers || {};
            const secTxtState = sectionAnswers[sec.id]?.openEndedText || {};
            const ansCount = Object.keys(secAnsState).length + Object.keys(secTxtState).filter(k => secTxtState[k]).length;
            const isCompleted = ansCount === sec.qCount && sec.qCount > 0;

            return (
              <button
                key={sec.id || idx}
                onClick={() => setActiveSecIdx(idx)}
                style={{
                  padding: isMobile ? '0.25rem 0.4rem' : '0.5rem 1.1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.65rem' : '0.82rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : isCompleted ? 'rgba(16,185,129,0.15)' : '#1e293b',
                  border: isCurrent ? '2px solid #818cf8' : isCompleted ? '1px solid #10b981' : '1px solid #334155',
                  color: isCurrent ? 'white' : isCompleted ? '#34d399' : '#cbd5e1',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                <span>{idx + 1}. Blm{!isMobile && `: ${sec.title}`}</span>
                <span style={{ fontSize: isMobile ? '0.6rem' : '0.72rem', opacity: 0.85, padding: '0.1rem 0.2rem', borderRadius: '0.3rem', background: 'rgba(0,0,0,0.25)' }}>
                  {ansCount}/{sec.qCount}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
          <button
            onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
            disabled={activeSecIdx === 0}
            style={{ padding: isMobile ? '0.3rem 0.4rem' : '0.4rem 0.9rem', borderRadius: '0.5rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 800, fontSize: isMobile ? '0.7rem' : '0.8rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}
            title="Önceki Bölüm"
          >
            <ChevronLeft size={isMobile ? 14 : 16} /> {!isMobile && "Önceki"}
          </button>
          <button
            onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
            disabled={activeSecIdx === sections.length - 1}
            style={{ padding: isMobile ? '0.3rem 0.4rem' : '0.4rem 0.9rem', borderRadius: '0.5rem', background: activeSecIdx === sections.length - 1 ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: activeSecIdx === sections.length - 1 ? '#64748b' : 'white', fontWeight: 800, fontSize: isMobile ? '0.7rem' : '0.8rem', cursor: activeSecIdx === sections.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.9rem' }}>İçerik yükleniyor...</p>
          </div>
        ) : isPdf ? (
          /* PDF VIEWER + OPTIK PANEL ONLY */
          <QuizPanelLayout
            panelTitle="Optik Form"
            panelSubtitle={`${activeSecIdx + 1}. Bölüm`}
            icon="📋"
            defaultPosition="right"
            defaultSize={320}
            documentContent={
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#0f172a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <PdfViewerWithControls payload={activePdfPayload} title={activeSec.title} height="100%" />
              </div>
            }
            answerContent={
              <RightOptikPanel
                qCount={effectiveQCount}
                answers={activeSecState.answers || {}}
                openEndedText={activeSecState.openEndedText || {}}
                isOpenEnded={secOE}
                resolvedQuestions={activeSec.resolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
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
            documentContent={
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#0f172a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                resolvedQuestions={activeSec.resolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
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
            documentContent={
              <>
                <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#0f172a', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
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

                  {/* QUESTION CARDS IN DARK THEME */}
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
                        background: '#1e293b',
                        borderRadius: '1.1rem',
                        border: isReviewMode && isQAnswered ? `1.5px solid ${isQCorrect ? '#10b981' : '#ef4444'}` : '1px solid #334155',
                        padding: '1.5rem',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        
                        {/* QUESTION HEADER */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ padding: '0.3rem 0.75rem', background: '#38bdf8', color: '#0f172a', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                              SORU {qNo}
                            </span>
                            {isQOpenEnded && (
                              <span style={{ padding: '0.2rem 0.6rem', background: '#fef3c7', color: '#b45309', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                                ✍️ Açık Uçlu / Yazılı
                              </span>
                            )}
                          </div>

                          {isReviewMode ? (
                            isQOpenEnded ? (
                              <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 900 }}>⏳ Öğretmen değerlendirmesinde</span>
                            ) : isQAnswered ? (
                              isQCorrect
                                ? <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 900 }}>✓ DOĞRU</span>
                                : <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 900 }}>✗ YANLIŞ</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— BOŞ</span>
                            )
                          ) : (
                            isQAnswered || textVal ? (
                              <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 900 }}>✓ Cevaplandı</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— Yanıtlanmadı</span>
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

                              let bg = '#0f172a';
                              let border = '1px solid #475569';
                              let color = '#cbd5e1';

                              if (isReviewMode) {
                                if (isSelected && isCorrectOpt) { bg = '#059669'; border = 'none'; color = 'white'; }
                                else if (isSelected && !isCorrectOpt) { bg = '#dc2626'; border = 'none'; color = 'white'; }
                                else if (isCorrectOpt) { bg = 'rgba(16,185,129,0.15)'; border = '1.5px solid #10b981'; color = '#34d399'; }
                              } else if (isSelected) {
                                bg = 'linear-gradient(135deg, #059669, #10b981)';
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
                                    boxShadow: isSelected && !isReviewMode ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
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
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Öğrenci Yanıtı:</div>
                            )}
                            <textarea
                              value={textVal}
                              onChange={e => !isReviewMode && handleTextChange(activeSec.id, qNo, e.target.value)}
                              readOnly={isReviewMode}
                              placeholder={isReviewMode ? 'Öğrenci bu soruya yanıt yazmadı.' : `Soru ${qNo} için yanıtınızı buraya yazınız...`}
                              rows={4}
                              style={{
                                width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                                background: isReviewMode ? '#0f172a' : '#0f172a',
                                border: isReviewMode
                                  ? (textVal ? '1.5px solid #10b981' : '1px solid #475569')
                                  : '1px solid #475569',
                                color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.95rem',
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
                      style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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
                resolvedQuestions={activeSec.resolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
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
          /* STANDARD QUESTION CARDS + OPTIK PANEL (DARK THEME) */
          /* STANDARD QUESTION CARDS + OPTIK PANEL (DARK THEME) */
          <QuizPanelLayout
            panelTitle="Optik Form"
            panelSubtitle={`${activeSecIdx + 1}. Bölüm`}
            icon="📋"
            defaultPosition="right"
            defaultSize={320}
            documentContent={
              <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                {/* SECTION BANNER */}
                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3730a3)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 6px 20px rgba(79,70,229,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                        Bu bölümdeki {activeSec.qCount} sorunun tamamı aşağıda sıralanmıştır.
                      </p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
                    Bölüm {activeSecIdx + 1} / {sections.length}
                  </div>
                </div>

                {/* QUESTION CARDS STACKED VERTICALLY (DARK THEME) */}
                {Array.from({ length: activeSec.qCount }).map((_, idx) => {
                  const qNo = idx + 1;
                  const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[idx]) || {};
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
                      background: '#1e293b',
                      borderRadius: '1.1rem',
                      border: isReviewMode && !isQOpenEnded && isStdAnswered
                        ? `1.5px solid ${isStdCorrect ? '#10b981' : '#ef4444'}`
                        : '1px solid #334155',
                      padding: '1.5rem',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                      display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                      
                      {/* QUESTION HEADER */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ padding: '0.3rem 0.75rem', background: '#6366f1', color: 'white', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                            SORU {qNo}
                          </span>
                          {isQOpenEnded && (
                            <span style={{ padding: '0.2rem 0.6rem', background: '#fef3c7', color: '#b45309', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                              ✍️ Açık Uçlu / Yazılı
                            </span>
                          )}
                        </div>

                        {isReviewMode ? (
                          isQOpenEnded ? (
                            <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 900 }}>⏳ Öğretmen değerlendirmesinde</span>
                          ) : isStdAnswered ? (
                            isStdCorrect
                              ? <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 900 }}>✓ DOĞRU</span>
                              : <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 900 }}>✗ YANLIŞ</span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— BOŞ</span>
                          )
                        ) : (
                          isStdAnswered || textVal ? (
                            <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 900 }}>✓ Cevaplandı</span>
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
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.65 }}>
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

                            let bg = '#0f172a';
                            let border = '1.5px solid #334155';
                            let color = '#cbd5e1';

                            if (isReviewMode) {
                              if (isSelected && isCorrectOpt) { bg = 'linear-gradient(135deg,#059669,#10b981)'; border = 'none'; color = 'white'; }
                              else if (isSelected && !isCorrectOpt) { bg = 'linear-gradient(135deg,#dc2626,#b91c1c)'; border = 'none'; color = 'white'; }
                              else if (isCorrectOpt) { bg = 'rgba(16,185,129,0.12)'; border = '1.5px solid #10b981'; color = '#34d399'; }
                            } else if (isSelected) {
                              bg = 'linear-gradient(135deg, #4f46e5, #3730a3)'; border = 'none'; color = 'white';
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
                                <span style={{ fontWeight: 900, color: isSelected ? (isReviewMode ? 'rgba(255,255,255,0.8)' : '#a5b4fc') : (isCorrectOpt && isReviewMode ? '#34d399' : '#38bdf8'), fontSize: '0.95rem', marginRight: '0.75rem', minWidth: '24px' }}>
                                  {optLetter})
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                                  {showText ? optText : `Seçenek ${optLetter}`}
                                </span>
                                {isReviewMode && isCorrectOpt && !isSelected && (
                                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#34d399', fontWeight: 900 }}>✓ Doğru Yanıt</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.85rem', color: isReviewMode ? '#94a3b8' : '#a5b4fc' }}>
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
                              background: '#0f172a',
                              border: isReviewMode ? (textVal ? '1.5px solid #10b981' : '1px solid #475569') : '1.5px solid #475569',
                              color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.95rem',
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
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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
                qCount={activeSec.qCount}
                answers={activeSecState.answers || {}}
                openEndedText={activeSecState.openEndedText || {}}
                isOpenEnded={secOE}
                resolvedQuestions={activeSec.resolvedQuestions}
                bankQ={activeSec.bankQ || test}
                isReviewMode={isReviewMode}
                onOptionSelect={(qNo, optIdx) => {
                  const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
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
        />
      )}

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
