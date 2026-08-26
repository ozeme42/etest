import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, Sun, Moon } from 'lucide-react';
import QuizPanelLayout from './QuizPanelLayout';

function getSectionIcon(contentType, type) {
  if (contentType === 'pdf') return '📕';
  if (contentType === 'html') return '🌐';
  if (contentType === 'gorsel' || contentType === 'image') return '🖼️';
  if (contentType === 'json') return '📋';
  if (type === 'acik_uclu' || type === 'yazili') return '✍️';
  return '📝';
}

function detectTestType(testObj, questionsList = []) {
  if (!testObj) return 'standard';
  if (testObj.pdfPayload || testObj.contentType === 'pdf' || testObj.sourceFormat === 'pdf' || testObj.type === 'pdf') return 'pdf';
  if (testObj.htmlPayload || testObj.contentType === 'html' || testObj.sourceFormat === 'html' || testObj.type === 'html') return 'html';
  if (testObj.sourceFormat === 'image' || testObj.contentType === 'gorsel' || testObj.type === 'gorsel' || (testObj.imageUrls && testObj.imageUrls.length > 0)) return 'image';

  // Only return 'optic' for purely physical tracked books where questionsList is empty
  if ((testObj.sourceFormat === 'physical' || testObj.sourceType === 'trackedBook' || testObj.isPhysicalOptic) && (!questionsList || questionsList.length === 0)) {
    return 'optic';
  }

  return 'standard';
}

function checkIsOE(obj, questionsList = []) {
  if (!obj) return false;

  // 1. Explicit Multiple Choice Flags / Options / AnswerKey
  const hasOptions = Array.isArray(obj.options) && obj.options.length > 1;
  const hasKey = (Array.isArray(obj.answerKey) && obj.answerKey.length > 0) ||
                 (typeof obj.answerKey === 'string' && obj.answerKey.trim().length > 0) ||
                 (typeof obj.answerKey === 'object' && obj.answerKey !== null && Object.keys(obj.answerKey).length > 0 && obj.answerKey.__meta?.isOpenEnded !== true);

  if (
    obj.questionType === 'coktan_secmeli' ||
    obj.type === 'coktan_secmeli' ||
    obj.formatType === 'coktan_secmeli' ||
    hasOptions ||
    hasKey
  ) {
    return false;
  }

  // 2. Explicit Open-Ended Flags
  if (
    obj.questionType === 'acik_uclu' ||
    obj.type === 'acik_uclu' ||
    obj.type === 'gorsel_klasik' ||
    obj.questionType === 'gorsel_klasik' ||
    obj.isOpenEnded === true ||
    obj.is_open_ended === true
  ) {
    return true;
  }

  const titleStr = String(obj.title || obj.name || obj.questionText || obj.text || '').toLowerCase();
  if (titleStr && (
    titleStr.includes('açık uçlu') ||
    titleStr.includes('acik uclu') ||
    titleStr.includes('klasik soru') ||
    titleStr.includes('yazılı klasik')
  )) {
    return true;
  }

  if (Array.isArray(questionsList) && questionsList.length > 0) {
    const isAllWritten = questionsList.every(q => {
      if (!q) return false;
      if (q.questionType === 'coktan_secmeli' || q.type === 'coktan_secmeli' || (Array.isArray(q.options) && q.options.length > 1)) return false;
      if (q.type === 'acik_uclu' || q.questionType === 'acik_uclu' || q.isOpenEnded === true) return true;
      const qTitle = String(q.title || q.name || q.questionText || q.text || '').toLowerCase();
      if (qTitle && (qTitle.includes('açık uçlu') || qTitle.includes('acik uclu') || qTitle.includes('klasik soru') || qTitle.includes('yazılı klasik'))) return true;
      return false;
    });
    if (isAllWritten) return true;
  }
  return false;
}

// ─── INLINE OPTIK PANEL COMPONENT ─────────────────────────────────────────────
function InlineOptikPanel({ qCount, answers, openEndedText, isOpenEndedMode, onOptionSelect, onTextChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: qCount }).map((_, idx) => {
        const qNo = idx + 1;
        const userAnsObj = answers[qNo];
        const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
        const textVal = openEndedText[qNo] || '';

        return (
          <div key={qNo} style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-text)' }}>
              <span>Soru {qNo}</span>
              {userAns !== undefined || textVal ? (
                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 900 }}>✓ Kodlandı</span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>— Boş</span>
              )}
            </div>

            {isOpenEndedMode ? (
              <textarea
                value={textVal}
                onChange={(e) => onTextChange(qNo, e.target.value)}
                placeholder={`Soru ${qNo} açık uçlu yanıt...`}
                rows={2}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            ) : (
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                  const isSelected = userAns === optIdx;
                  return (
                    <button
                      key={opt}
                      onClick={() => onOptionSelect(qNo, optIdx)}
                      style={{
                        flex: 1,
                        height: '32px',
                        borderRadius: '0.4rem',
                        border: isSelected ? 'none' : '1px solid var(--color-border-input)',
                        background: isSelected ? '#059669' : 'var(--color-surface-hover)',
                        color: isSelected ? 'white' : 'var(--color-text-secondary)',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── OPTIC / WRITTEN FORM SECTION RENDERER ────────────────────────────────────
const OpticSection = React.memo(function OpticSection({ bankQ, resolvedQuestions = [], totalCount, sectionAnswers, onAnswerChange }) {
  const qCount = totalCount || resolvedQuestions.length || bankQ.questionCount || bankQ.totalQuestions || (bankQ.questionsList?.length) || 20;
  const isOpenEndedMode = checkIsOE(bankQ, resolvedQuestions);

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};

  const handleSelect = (qNo, optIdx) => {
    const current = answers[qNo];
    const newAnswers = { ...answers };
    if (current === optIdx) {
      delete newAnswers[qNo];
    } else {
      newAnswers[qNo] = optIdx;
    }
    onAnswerChange({
      ...sectionAnswers,
      answers: newAnswers
    });
  };

  const handleText = (qNo, val) => {
    onAnswerChange({
      ...sectionAnswers,
      openEndedText: { ...openEndedText, [qNo]: val }
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'auto', padding: '1.5rem', gap: '1.25rem' }}>
      
      {/* Banner */}
      <div style={{ background: isOpenEndedMode ? 'linear-gradient(135deg, #4f46e5, #3730a3)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '1rem', padding: '1.25rem 1.5rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 6px 20px rgba(79,70,229,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            {isOpenEndedMode ? '✍️' : '📋'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem' }}>{bankQ.title || (isOpenEndedMode ? 'Yazılı Sınav Formu' : 'Optik Form Kodlama')}</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
              {isOpenEndedMode ? `${qCount} soruluk yazılı sınav yanıtlarınızı aşağıdaki alanlara doldurarak tamamlayınız.` : `${qCount} soruluk optik formu aşağıdaki kabarcıkları işaretleyerek tamamlayınız.`}
            </p>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
          Toplam {qCount} Soru
        </div>
      </div>

      {/* Optik / Yazılı Grid */}
      <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1.25rem', display: 'grid', gridTemplateColumns: isOpenEndedMode ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = resolvedQuestions[idx] || {};
          const qIsOE = isOpenEndedMode || checkIsOE(qObj);

          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          return (
            <div key={qNo} style={{ background: 'var(--color-surface-hover)', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                <span>{qObj.questionText && qObj.questionText !== 'Soru' && !/^Soru\s+\d+$/i.test(qObj.questionText.trim()) ? `Soru ${qNo}: ${qObj.questionText}` : `Soru ${qNo}`}</span>
                {userAns !== undefined || textVal ? (
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 900 }}>✓ Kodlandı</span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>— Boş</span>
                )}
              </div>

              {qIsOE ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 800 }}>
                    ✍️ Yazılı Yanıtınızı Giriniz:
                  </label>
                  <textarea
                    value={textVal}
                    onChange={(e) => handleText(qNo, e.target.value)}
                    placeholder={`Soru ${qNo} açık uçlu yanıtınızı buraya yazınız...`}
                    rows={3}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.55rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                    const isSelected = userAns === optIdx;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelect(qNo, optIdx)}
                        style={{
                          flex: 1,
                          height: '34px',
                          borderRadius: '0.4rem',
                          border: isSelected ? 'none' : '1px solid var(--color-border-input)',
                          background: isSelected ? '#059669' : 'var(--color-surface)',
                          color: isSelected ? 'white' : 'var(--color-text-secondary)',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── PDF SECTION RENDERER ─────────────────────────────────────────────────────
const PdfSection = React.memo(function PdfSection({ bankQ, totalCount, sectionAnswers, onAnswerChange, sectionOE }) {
  const qCount = totalCount || bankQ.questionCount || bankQ.totalQuestions || (bankQ.questionsList?.length) || 1;
  const [idbPayload, setIdbPayload] = useState(null);
  const loadedRef = React.useRef(null);

  const extractPayload = (obj) => {
    const candidates = [obj?.contentPayload, obj?.pdfPayload, obj?.pdfUrl, obj?.url, obj?.content];
    return candidates.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  useEffect(() => {
    if (extractPayload(bankQ) || loadedRef.current === bankQ.id) return;
    async function load() {
      const val = await idbGetPayload(bankQ.id);
      if (val && val !== '[STORED_IN_INDEXEDDB]') { loadedRef.current = bankQ.id; setIdbPayload(val); }
    }
    load();
  }, [bankQ.id, bankQ.contentPayload]);

  const pdfPayload = extractPayload(bankQ) || idbPayload;

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};

  const handleSelect = (qNo, optIdx) => {
    const current = answers[qNo];
    const newAnswers = { ...answers };
    if (current === optIdx) {
      delete newAnswers[qNo];
    } else {
      newAnswers[qNo] = optIdx;
    }
    onAnswerChange({ ...sectionAnswers, answers: newAnswers });
  };
  const handleText = (qNo, val) => {
    onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });
  };

  return (
    <QuizPanelLayout
      panelTitle={sectionOE ? 'Açık Uçlu Cevap Paneli' : 'Optik Cevap Paneli'}
      panelSubtitle='Dokümanı okuyup soruları cevaplayınız.'
      icon={sectionOE ? '✍️' : '🎯'}
      documentContent={
        <div style={{ flex: 1, minWidth: 0, background: 'var(--color-bg)', overflow: 'hidden' }}>
          <PdfViewerWithControls payload={pdfPayload} title={bankQ.title} height='100%' />
        </div>
      }
      answerContent={
        <InlineOptikPanel
          qCount={qCount}
          answers={answers}
          openEndedText={openEndedText}
          isOpenEndedMode={sectionOE}
          onOptionSelect={handleSelect}
          onTextChange={handleText}
        />
      }
    />
  );
});

// ─── HTML SECTION RENDERER ────────────────────────────────────────────────────
const HtmlSection = React.memo(function HtmlSection({ bankQ, totalCount, sectionAnswers, onAnswerChange, sectionOE }) {
  const qCount = totalCount || bankQ.questionCount || bankQ.totalQuestions || (bankQ.questionsList?.length) || 1;
  const [idbPayload, setIdbPayload] = useState(null);
  const loadedRef = React.useRef(null);
  const extractPayload = (obj) => {
    return obj?.contentPayload && obj.contentPayload !== '[STORED_IN_INDEXEDDB]' && obj.contentPayload !== '[LOCALSTORAGE_CACHE]' 
      ? obj.contentPayload 
      : null;
  };

  useEffect(() => {
    if (extractPayload(bankQ) || loadedRef.current === bankQ.id) return;
    async function load() {
      const val = await idbGetPayload(bankQ.id);
      if (val && val !== '[STORED_IN_INDEXEDDB]') {
        loadedRef.current = bankQ.id;
        setIdbPayload(val);
      }
    }
    load();
  }, [bankQ.id, bankQ.contentPayload]);

  const htmlPayload = extractPayload(bankQ) || idbPayload;

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};
  const handleSelect = (qNo, optIdx) => {
    const current = answers[qNo];
    const newAnswers = { ...answers };
    if (current === optIdx) {
      delete newAnswers[qNo];
    } else {
      newAnswers[qNo] = optIdx;
    }
    onAnswerChange({ ...sectionAnswers, answers: newAnswers });
  };
  const handleText = (qNo, val) => onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });

  return (
    <QuizPanelLayout
      panelTitle={sectionOE ? 'Açık Uçlu Cevap Paneli' : 'Optik Cevap Paneli'}
      panelSubtitle='Dokümanı okuyup soruları cevaplayınız.'
      icon={sectionOE ? '✍️' : '🎯'}
      documentContent={
        <div style={{ flex: 1, minWidth: 0, background: 'var(--color-bg)', overflow: 'hidden' }}>
          <HtmlViewerWithControls payload={htmlPayload} title={bankQ.title} height='100%' />
        </div>
      }
      answerContent={
        <InlineOptikPanel
          qCount={qCount}
          answers={answers}
          openEndedText={openEndedText}
          isOpenEndedMode={sectionOE}
          onOptionSelect={handleSelect}
          onTextChange={handleText}
        />
      }
    />
  );
});

// ─── IMAGE SECTION RENDERER ───────────────────────────────────────────────────
const ImageSection = React.memo(function ImageSection({ bankQ, resolvedQuestions = [], sectionAnswers, onAnswerChange }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const qCount = resolvedQuestions.length || bankQ.questionCount || 1;
  const activeQ = resolvedQuestions[currentIdx] || {};
  const sectionOE = checkIsOE(bankQ);

  const rawImages = (activeQ.imageUrls?.length > 0) ? activeQ.imageUrls
    : (activeQ.imageUrl ? [activeQ.imageUrl] : (activeQ.contentPayload ? [activeQ.contentPayload] : []));
  const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};

  const handleSelect = (_qNo, optIdx) => {
    const qNo = currentIdx + 1;
    const current = answers[qNo]?.userAnswer !== undefined ? answers[qNo]?.userAnswer : answers[qNo];
    const newAnswers = { ...answers };
    if (current === optIdx) {
      delete newAnswers[qNo];
    } else {
      const correctAns = activeQ.correctAnswer;
      const isCorrect = (correctAns !== null && correctAns !== undefined) ? optIdx === correctAns : null;
      newAnswers[qNo] = { userAnswer: optIdx, isCorrect, questionId: activeQ.id };
    }
    onAnswerChange({ ...sectionAnswers, answers: newAnswers });
  };
  const handleText = (_qNo, val) => {
    const qNo = currentIdx + 1;
    onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
      <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div style={{ flex: 1, minWidth: 0, background: 'var(--color-bg)', overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {Array.from({ length: qCount }).map((_, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)} style={{
              width: 32, height: 32, borderRadius: '0.4rem', border: currentIdx === i ? '2px solid #6366f1' : '1px solid var(--color-border)',
              background: currentIdx === i ? '#6366f1' : 'var(--color-surface)', color: currentIdx === i ? 'white' : 'var(--color-text)',
              fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem'
            }}>{i + 1}</button>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Soru {currentIdx + 1} / {qCount}</div>
        {imageUrls.map((url, idx) => (
          <StandardImageFrame key={idx} src={url} alt={`Soru ${currentIdx + 1}`} onOpenFullscreen={() => setLightboxSrc(url)} />
        ))}
        {imageUrls.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontWeight: 700, padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.75rem', background: 'var(--color-surface)' }}>Görsel bulunamadı</div>}
      </div>
      <InlineOptikPanel
        qCount={qCount}
        answers={answers}
        openEndedText={openEndedText}
        isOpenEndedMode={sectionOE}
        onOptionSelect={handleSelect}
        onTextChange={handleText}
      />
    </div>
  );
});

// ─── STANDARD / WRITTEN SECTION RENDERER (ALL QUESTIONS STACKED ON 1 PAGE) ──────
const StandardSection = React.memo(function StandardSection({ bankQ, resolvedQuestions = [], sectionAnswers, onAnswerChange }) {
  const qCount = resolvedQuestions.length || bankQ.questionCount || 1;
  const sectionOE = checkIsOE(bankQ);

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};

  const handleSelect = (qNo, optIdx, qObj) => {
    const current = answers[qNo]?.userAnswer !== undefined ? answers[qNo]?.userAnswer : answers[qNo];
    const newAnswers = { ...answers };
    if (current === optIdx) {
      delete newAnswers[qNo];
    } else {
      const correctAns = qObj.correctAnswer;
      const isCorrect = (correctAns !== null && correctAns !== undefined) ? optIdx === correctAns : null;
      newAnswers[qNo] = { userAnswer: optIdx, isCorrect, questionId: qObj.id };
    }
    onAnswerChange({
      ...sectionAnswers,
      answers: newAnswers
    });
  };

  const handleText = (qNo, val) => {
    onAnswerChange({
      ...sectionAnswers,
      openEndedText: { ...openEndedText, [qNo]: val }
    });
  };

  return (
    <QuizPanelLayout
      panelTitle={sectionOE ? 'Açık Uçlu Cevap Paneli' : 'Optik Cevap Paneli'}
      panelSubtitle='Soruları okuyup cevaplarınızı işaretleyiniz.'
      icon={sectionOE ? '✍️' : '🎯'}
      documentContent={
        <div style={{ flex: 1, minWidth: 0, background: 'var(--color-bg)', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {Array.from({ length: qCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = resolvedQuestions[idx] || bankQ || {};
            const isQOpenEnded = sectionOE || checkIsOE(qObj);

            const qText = qObj.questionText || qObj.text || qObj.question || qObj.title || qObj.questionTitle || qObj.name || (qObj.contentPayload && !qObj.contentPayload.startsWith('data:') ? qObj.contentPayload : null) || bankQ.questionText || bankQ.text || bankQ.title || bankQ.name || `Soru ${qNo}`;

            let questionImageUrls = [];
            const isQObjActuallySection = String(qObj.id) === String(bankQ?.id);

            if (!isQObjActuallySection && qObj.imageUrls && qObj.imageUrls.length > 0) {
              questionImageUrls = qObj.imageUrls;
            } else if (!isQObjActuallySection && qObj.imageUrl) {
              questionImageUrls = [qObj.imageUrl];
            } else if (!isQObjActuallySection && qObj.contentPayload && qObj.contentPayload.startsWith('data:image')) {
              questionImageUrls = [qObj.contentPayload];
            }
            const imageUrls = (Array.isArray(questionImageUrls) ? questionImageUrls : [questionImageUrls]).filter(isValidImageUrl);

            const options = (qObj.options && Array.isArray(qObj.options) && qObj.options.length > 0) ? qObj.options : ['A', 'B', 'C', 'D', 'E'];
            const userAnsObj = answers[qNo];
            const selectedOpt = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
            const textVal = openEndedText[qNo] || '';

            return (
              <div key={qNo} style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    Soru {qNo}
                  </h4>
                  {isQOpenEnded && (
                    <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 800 }}>✍️ Yazılı</span>
                  )}
                </div>

                {imageUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                    {imageUrls.map((url, i) => (
                      <StandardImageFrame key={i} src={url} alt={`Soru ${qNo} Görsel ${i+1}`} onOpenFullscreen={() => {}} />
                    ))}
                  </div>
                )}

                {qText && qText !== `Soru ${qNo}` && (
                  <div style={{ fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.6, fontWeight: 700, marginBottom: '1.25rem' }}>
                    {qText}
                  </div>
                )}

                {!isQOpenEnded ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                    {options.map((optText, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      const optLetter = String.fromCharCode(65 + optIdx);
                      const showText = typeof optText === 'string' && optText.length > 1 && optText !== optLetter;

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelect(qNo, optIdx, qObj)}
                          style={{
                            padding: '0.85rem 1.25rem',
                            borderRadius: '0.85rem',
                            border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--color-border)',
                            background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'var(--color-surface-hover)',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontWeight: 900, color: isSelected ? '#3b82f6' : 'var(--color-text-secondary)', fontSize: '0.95rem', marginRight: '0.75rem', minWidth: '24px' }}>
                            {optLetter})
                          </span>
                          <span style={{ fontSize: '0.95rem', color: isSelected ? '#3b82f6' : 'var(--color-text)', fontWeight: 700 }}>
                            {showText ? optText : `Seçenek ${optLetter}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      ✍️ Açık Uçlu Yanıtınızı Buraya Yazınız:
                    </label>
                    <textarea
                      value={textVal}
                      onChange={e => handleText(qNo, e.target.value)}
                      placeholder={`Soru ${qNo} için yanıtınızı buraya yazınız...`}
                      rows={4}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      answerContent={
        <InlineOptikPanel
          qCount={qCount}
          answers={answers}
          openEndedText={openEndedText}
          isOpenEndedMode={sectionOE}
          onOptionSelect={(qNo, optIdx) => {
            const qObj = resolvedQuestions[qNo - 1] || bankQ || {};
            handleSelect(qNo, optIdx, qObj);
          }}
          onTextChange={(qNo, val) => handleText(qNo, val)}
        />
      }
    />
  );
});

// ─── MAIN COMPOSITE RUNNER EXPORT ─────────────────────────────────────────────
export default function CompositeQuizRunner({ test, onSubmit }) {
  const { isDark, toggleTheme } = useTheme();
  const [sections, setSections] = useState([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [sectionAnswers, setSectionAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);

  // Initialize Sections & Timer
  useEffect(() => {
    if (!test) return;

    let secList = [];
    if (Array.isArray(test.sections) && test.sections.length > 0) {
      secList = test.sections;
    } else if (Array.isArray(test.questions) && test.questions.length > 0) {
      secList = [{
        id: test.id || 'sec_default',
        title: test.title || test.name || 'Bölüm 1',
        bankQ: test,
        resolvedQuestions: test.questions,
        _totalCount: test.questions.length
      }];
    }

    const normalized = secList.map((sec, idx) => {
      const bq = sec.bankQ || sec;
      const resQ = sec.resolvedQuestions || bq.questions || bq.questionsList || [];
      const cnt = sec.questionCount || bq.questionCount || bq.totalQuestions || resQ.length || 1;
      return {
        ...sec,
        id: sec.id || `sec_${idx}`,
        title: sec.title || bq.title || `Bölüm ${idx + 1}`,
        bankQ: bq,
        resolvedQuestions: resQ,
        _totalCount: cnt
      };
    });

    setSections(normalized);

    const totalDurationMins = test.durationMinutes || (normalized.reduce((acc, s) => acc + s._totalCount, 0) * 2);
    setTimeLeft(totalDurationMins * 60);

    const initAnswers = {};
    normalized.forEach(sec => {
      initAnswers[sec.id] = { answers: {}, openEndedText: {} };
    });
    setSectionAnswers(initAnswers);
  }, [test]);

  // Timer Tick
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const onCurrentSectionAnswerChange = (newSecAns) => {
    const currentSection = sections[currentSectionIdx];
    if (!currentSection) return;
    setSectionAnswers(prev => ({
      ...prev,
      [currentSection.id]: newSecAns
    }));
  };

  const handleFinalSubmit = () => {
    const allAnswers = [];
    let questionNoOffset = 0;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const answers = sa.answers || {};
      const openEndedText = sa.openEndedText || {};
      const totalQ = sec._totalCount;

      Array.from({ length: totalQ }).map((_, idx) => {
        const qNo = idx + 1;
        const globalQNo = questionNoOffset + qNo;
        const qObj = sec.resolvedQuestions[idx] || sec.bankQ || {};

        const userAnsObj = answers[qNo];
        const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
        const textVal = openEndedText[qNo];

        let isCorrect = null;
        if (userAns !== undefined && userAns !== null) {
          if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
            isCorrect = Number(userAns) === Number(qObj.correctAnswer);
          }
        }

        allAnswers.push({
          sectionId: sec.id,
          sectionTitle: sec.title,
          questionId: qObj.id || `sec_${sec.id}_q_${qNo}`,
          questionNo: globalQNo,
          sectionQuestionNo: qNo,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textVal || null,
          isCorrect,
          correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
        });
      });
      questionNoOffset += totalQ;
    });

    onSubmit(allAnswers);
  };

  const currentSection = sections[currentSectionIdx];
  if (!currentSection) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800 }}>Bölümler Yükleniyor...</div>;

  const currentSA = sectionAnswers[currentSection.id] || {};
  const bankQ = currentSection.bankQ || {};
  const sectionType = detectTestType(bankQ, currentSection.resolvedQuestions);
  const sectionOE = checkIsOE(bankQ);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ padding: '0.65rem 1.25rem', background: 'var(--color-surface)', borderBottom: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.28rem 0.6rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.7rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={13} /> BÖLÜMLÜ SORU BANKASI ÖDEVİ
          </span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title || test.name}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            {getSectionIcon(bankQ?.contentType, bankQ?.type)} {currentSection.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
            style={{
              padding: '0.32rem 0.65rem',
              borderRadius: '0.5rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={14} color='#f59e0b' /> : <Moon size={14} color='#6366f1' />}
            <span>{isDark ? 'Açık' : 'Koyu'}</span>
          </button>

          <div style={{ padding: '0.32rem 0.75rem', borderRadius: '0.5rem', background: timeLeft < 300 ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2') : 'var(--color-surface-hover)', color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : 'var(--color-border-input)'}` }}>
            <Clock size={14} color={timeLeft < 300 ? '#dc2626' : '#059669'} /> {formatTime(timeLeft)}
          </div>
          <button onClick={handleFinalSubmit} style={{ padding: '0.4rem 1rem', borderRadius: '0.55rem', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 3px 10px rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={16} /> Sınavı Bitir ve Gönder
          </button>
        </div>
      </header>

      {/* ── Section Navigation Bar ── */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1.5px solid var(--color-border)', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {sections.map((sec, idx) => {
            const isCurrent = idx === currentSectionIdx;
            const bq = sec.bankQ;
            return (
              <button
                key={sec.id || idx}
                onClick={() => setCurrentSectionIdx(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.85rem',
                  borderRadius: '0.6rem', fontWeight: 800, fontSize: '0.78rem', whiteSpace: 'nowrap', cursor: 'pointer',
                  background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-hover)',
                  border: isCurrent ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                  color: isCurrent ? 'white' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {getSectionIcon(bq?.contentType, bq?.type)} {idx + 1}. Bölüm: {sec.title}
                <span style={{ opacity: 0.75 }}>({sec._totalCount}s)</span>
              </button>
            );
          })}
        </div>

        {/* Section Prev / Next Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setCurrentSectionIdx(p => Math.max(0, p - 1))}
            disabled={currentSectionIdx === 0}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: '0.5rem', background: currentSectionIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
              border: '1.5px solid var(--color-border-input)', color: currentSectionIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)', fontWeight: 800, fontSize: '0.78rem',
              cursor: currentSectionIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'
            }}
          >
            <ChevronLeft size={16} /> Önceki Bölüm
          </button>
          <button
            onClick={() => setCurrentSectionIdx(p => Math.min(sections.length - 1, p + 1))}
            disabled={currentSectionIdx === sections.length - 1}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: '0.5rem', background: currentSectionIdx === sections.length - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              border: currentSectionIdx === sections.length - 1 ? '1.5px solid var(--color-border-input)' : 'none', color: currentSectionIdx === sections.length - 1 ? 'var(--color-text-muted)' : 'white', fontWeight: 800, fontSize: '0.78rem',
              cursor: currentSectionIdx === sections.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'
            }}
          >
            Sonraki Bölüm <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Section Content (Optic Grid, PDF, HTML, Image, Standard) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {sectionType === 'optic' && (
          <OpticSection bankQ={bankQ} totalCount={currentSection._totalCount} sectionAnswers={currentSA} onAnswerChange={onCurrentSectionAnswerChange} />
        )}
        {sectionType === 'pdf' && (
          <PdfSection bankQ={bankQ} totalCount={currentSection._totalCount} sectionAnswers={currentSA} onAnswerChange={onCurrentSectionAnswerChange} sectionOE={sectionOE} />
        )}
        {sectionType === 'html' && (
          <HtmlSection bankQ={bankQ} totalCount={currentSection._totalCount} sectionAnswers={currentSA} onAnswerChange={onCurrentSectionAnswerChange} sectionOE={sectionOE} />
        )}
        {sectionType === 'image' && (
          <ImageSection bankQ={bankQ} resolvedQuestions={currentSection.resolvedQuestions} sectionAnswers={currentSA} onAnswerChange={onCurrentSectionAnswerChange} />
        )}
        {sectionType === 'standard' && (
          <StandardSection bankQ={bankQ} resolvedQuestions={currentSection.resolvedQuestions} sectionAnswers={currentSA} onAnswerChange={onCurrentSectionAnswerChange} />
        )}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const p = n => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}
