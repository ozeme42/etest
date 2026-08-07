import React, { useState, useEffect, useMemo } from 'react';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet } from 'lucide-react';

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
  if (
    obj.questionType === 'acik_uclu' ||
    obj.questionType === 'yazili' ||
    obj.type === 'acik_uclu' ||
    obj.type === 'yazili' ||
    obj.contentType === 'yazili' ||
    obj.isOpenEnded === true
  ) {
    return true;
  }
  if (Array.isArray(questionsList) && questionsList.length > 0) {
    const isAllWritten = questionsList.every(q => q.type === 'acik_uclu' || q.type === 'yazili' || q.questionType === 'acik_uclu' || q.questionType === 'yazili' || q.isOpenEnded === true);
    if (isAllWritten) return true;
  }
  return false;
}

// ─── INLINE OPTIK PANEL COMPONENT ─────────────────────────────────────────────
function InlineOptikPanel({ qCount, answers, openEndedText, isOpenEndedMode, onOptionSelect, onTextChange }) {
  return (
    <div style={{ width: '320px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '0.85rem 1rem', background: '#0f172a', borderBottom: '1px solid #334155', fontWeight: 900, fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>📋 Optik Form</span>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Toplam {qCount} Soru</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          return (
            <div key={qNo} style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.8rem', color: '#f8fafc' }}>
                <span>Soru {qNo}</span>
                {userAns !== undefined || textVal ? (
                  <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 900 }}>✓ Kodlandı</span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>— Boş</span>
                )}
              </div>

              {isOpenEndedMode ? (
                <textarea
                  value={textVal}
                  onChange={(e) => onTextChange(qNo, e.target.value)}
                  placeholder={`Soru ${qNo} açık uçlu yanıt...`}
                  rows={2}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', fontFamily: 'inherit' }}
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
                          border: isSelected ? 'none' : '1px solid #334155',
                          background: isSelected ? '#059669' : '#1e293b',
                          color: isSelected ? 'white' : '#cbd5e1',
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
    </div>
  );
}

// ─── OPTIC / WRITTEN FORM SECTION RENDERER ────────────────────────────────────
function OpticSection({ bankQ, resolvedQuestions = [], sectionAnswers, onAnswerChange }) {
  const qCount = resolvedQuestions.length || bankQ.questionCount || (bankQ.questionsList?.length) || 20;
  const isOpenEndedMode = checkIsOE(bankQ, resolvedQuestions);

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};

  const handleSelect = (qNo, optIdx) => {
    onAnswerChange({
      ...sectionAnswers,
      answers: { ...answers, [qNo]: optIdx }
    });
  };

  const handleText = (qNo, val) => {
    onAnswerChange({
      ...sectionAnswers,
      openEndedText: { ...openEndedText, [qNo]: val }
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'auto', padding: '1.5rem', gap: '1.25rem' }}>
      
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
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '1.25rem', display: 'grid', gridTemplateColumns: isOpenEndedMode ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = resolvedQuestions[idx] || {};
          const qIsOE = isOpenEndedMode || checkIsOE(qObj);

          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          return (
            <div key={qNo} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>
                <span>{qObj.questionText && qObj.questionText !== 'Soru' && !/^Soru\s+\d+$/i.test(qObj.questionText.trim()) ? `Soru ${qNo}: ${qObj.questionText}` : `Soru ${qNo}`}</span>
                {userAns !== undefined || textVal ? (
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 900 }}>✓ Kodlandı</span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>— Boş</span>
                )}
              </div>

              {qIsOE ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 800 }}>
                    ✍️ Yazılı Yanıtınızı Giriniz:
                  </label>
                  <textarea
                    value={textVal}
                    onChange={(e) => handleText(qNo, e.target.value)}
                    placeholder={`Soru ${qNo} açık uçlu yanıtınızı buraya yazınız...`}
                    rows={3}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.55rem', background: '#1e293b', border: '1.5px solid #475569', color: '#f8fafc', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
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
                          border: isSelected ? 'none' : '1px solid #334155',
                          background: isSelected ? '#059669' : '#1e293b',
                          color: isSelected ? 'white' : '#cbd5e1',
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
}

// ─── PDF SECTION RENDERER ─────────────────────────────────────────────────────
function PdfSection({ bankQ, sectionAnswers, onAnswerChange, sectionOE }) {
  const qCount = bankQ.questionCount || (bankQ.questionsList?.length) || 1;
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
    onAnswerChange({ ...sectionAnswers, answers: { ...answers, [qNo]: optIdx } });
  };
  const handleText = (qNo, val) => {
    onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflow: 'hidden' }}>
        <PdfViewerWithControls payload={pdfPayload} title={bankQ.title} height="100%" />
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
}

// ─── HTML SECTION RENDERER ────────────────────────────────────────────────────
function HtmlSection({ bankQ, sectionAnswers, onAnswerChange, sectionOE }) {
  const qCount = bankQ.questionCount || (bankQ.questionsList?.length) || 1;
  const [idbPayload, setIdbPayload] = useState(null);
  const [iframeSrc, setIframeSrc] = useState(null);
  const loadedRef = React.useRef(null);

  useEffect(() => {
    const payload = bankQ.contentPayload;
    if (payload && payload !== '[STORED_IN_INDEXEDDB]' && payload !== '[LOCALSTORAGE_CACHE]') {
      if (payload.startsWith('http')) { setIframeSrc(payload); return; }
      if (payload.startsWith('data:text/html') || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || payload.includes('<html')) {
        const blob = new Blob([payload.startsWith('data:') ? atob(payload.split(',')[1] || '') : payload], { type: 'text/html' });
        setIframeSrc(URL.createObjectURL(blob));
        return;
      }
    }
    if (loadedRef.current === bankQ.id) return;
    async function load() {
      const val = await idbGetPayload(bankQ.id);
      if (val && val !== '[STORED_IN_INDEXEDDB]') {
        loadedRef.current = bankQ.id;
        setIdbPayload(val);
        if (val.startsWith('http')) { setIframeSrc(val); return; }
        const blob = new Blob([val.startsWith('data:') ? atob(val.split(',')[1] || '') : val], { type: 'text/html' });
        setIframeSrc(URL.createObjectURL(blob));
      }
    }
    load();
  }, [bankQ.id, bankQ.contentPayload]);

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};
  const handleSelect = (qNo, optIdx) => onAnswerChange({ ...sectionAnswers, answers: { ...answers, [qNo]: optIdx } });
  const handleText = (qNo, val) => onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflow: 'hidden' }}>
        {iframeSrc ? (
          <iframe src={iframeSrc} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} title={bankQ.title} sandbox="allow-scripts allow-same-origin" />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontWeight: 700 }}>İçerik Yükleniyor...</div>
        )}
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
}

// ─── IMAGE SECTION RENDERER ───────────────────────────────────────────────────
function ImageSection({ bankQ, resolvedQuestions, sectionAnswers, onAnswerChange }) {
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
    const correctAns = activeQ.correctAnswer;
    const isCorrect = (correctAns !== null && correctAns !== undefined) ? optIdx === correctAns : null;
    onAnswerChange({ ...sectionAnswers, answers: { ...answers, [qNo]: { userAnswer: optIdx, isCorrect, questionId: activeQ.id } } });
  };
  const handleText = (_qNo, val) => {
    const qNo = currentIdx + 1;
    onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
      <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {Array.from({ length: qCount }).map((_, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)} style={{
              width: 32, height: 32, borderRadius: '0.4rem', border: currentIdx === i ? '2px solid #38bdf8' : '1px solid #334155',
              background: currentIdx === i ? '#38bdf8' : '#1e293b', color: currentIdx === i ? '#0f172a' : '#94a3b8',
              fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem'
            }}>{i + 1}</button>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>Soru {currentIdx + 1} / {qCount}</div>
        {imageUrls.map((url, idx) => (
          <StandardImageFrame key={idx} src={url} alt={`Soru ${currentIdx + 1}`} onOpenFullscreen={() => setLightboxSrc(url)} />
        ))}
        {imageUrls.length === 0 && <div style={{ color: '#475569', fontWeight: 700, padding: '2rem', textAlign: 'center', border: '1px dashed #334155', borderRadius: '0.75rem' }}>Görsel bulunamadı</div>}
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
}

// ─── STANDARD / WRITTEN SECTION RENDERER ──────────────────────────────────────
function StandardSection({ bankQ, resolvedQuestions, sectionAnswers, onAnswerChange }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const qCount = resolvedQuestions.length || bankQ.questionCount || 1;
  const activeQ = resolvedQuestions[currentIdx] || bankQ || {};
  const sectionOE = checkIsOE(bankQ) || checkIsOE(activeQ);

  const answers = sectionAnswers.answers || {};
  const openEndedText = sectionAnswers.openEndedText || {};

  const handleSelect = (_qNo, optIdx) => {
    const qNo = currentIdx + 1;
    const correctAns = activeQ.correctAnswer;
    const isCorrect = (correctAns !== null && correctAns !== undefined) ? optIdx === correctAns : null;
    onAnswerChange({ ...sectionAnswers, answers: { ...answers, [qNo]: { userAnswer: optIdx, isCorrect, questionId: activeQ.id } } });
  };

  const handleText = (_qNo, val) => {
    const qNo = currentIdx + 1;
    onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });
  };

  const options = (activeQ.options && activeQ.options.length > 0) ? activeQ.options : ['A', 'B', 'C', 'D', 'E'];
  const qText = activeQ.questionText || activeQ.text || activeQ.title || activeQ.questionTitle || activeQ.name || (activeQ.contentPayload && !activeQ.contentPayload.startsWith('data:') ? activeQ.contentPayload : null) || bankQ.questionText || bankQ.text || bankQ.title || bankQ.name || `Soru ${currentIdx + 1}`;

  const rawImages = (activeQ.imageUrls && activeQ.imageUrls.length > 0)
    ? activeQ.imageUrls
    : (activeQ.imageUrl ? [activeQ.imageUrl] : (activeQ.contentPayload && activeQ.contentPayload.startsWith('data:image') ? [activeQ.contentPayload] : []));
  const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, background: '#f8fafc', overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {Array.from({ length: qCount }).map((_, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)} style={{
              width: 32, height: 32, borderRadius: '0.4rem', border: currentIdx === i ? '2px solid #6366f1' : '1px solid #cbd5e1',
              background: currentIdx === i ? '#6366f1' : 'white', color: currentIdx === i ? 'white' : '#374151',
              fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem'
            }}>{i + 1}</button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 900, color: '#6366f1', fontSize: '0.85rem' }}>SORU {currentIdx + 1}</span>
            {sectionOE && (
              <span style={{ padding: '0.2rem 0.6rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #c7d2fe' }}>
                ✍️ Açık Uçlu / Yazılı
              </span>
            )}
          </div>

          {imageUrls.map((url, imgIdx) => (
            <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${currentIdx + 1} Görsel`} />
          ))}

          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.65, marginBottom: '1.25rem' }}>
            {qText}
          </div>

          {!sectionOE ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {options.map((opt, optIdx) => {
                const isSelected = (typeof answers[currentIdx + 1] === 'object' ? answers[currentIdx + 1]?.userAnswer : answers[currentIdx + 1]) === optIdx;
                const optLetter = String.fromCharCode(65 + optIdx);
                let optText = '';
                if (typeof opt === 'string') {
                  optText = opt;
                } else if (opt && typeof opt === 'object') {
                  optText = opt.text || opt.optionText || opt.label || opt.title || opt.value || opt.content || '';
                }
                const showText = Boolean(optText && optText.trim() !== optLetter);

                return (
                  <button key={optIdx} onClick={() => handleSelect(null, optIdx)} style={{
                    padding: '0.9rem 1.25rem', borderRadius: '0.75rem', textAlign: 'left', cursor: 'pointer', fontWeight: isSelected ? 900 : 700,
                    border: isSelected ? '2px solid #6366f1' : '1.5px solid #cbd5e1',
                    background: isSelected ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)' : 'white',
                    color: isSelected ? '#3730a3' : '#1e293b', transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 900, color: isSelected ? '#6366f1' : '#475569', fontSize: '0.95rem', marginRight: '0.75rem', minWidth: '24px' }}>
                      {optLetter})
                    </span>
                    <span style={{ fontSize: '0.95rem', color: isSelected ? '#1e1b4b' : '#1e293b', fontWeight: 700 }}>
                      {showText ? optText : `Seçenek ${optLetter}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#475569' }}>
                ✍️ Açık Uçlu Yanıtınızı Buraya Yazınız:
              </label>
              <textarea
                value={openEndedText[currentIdx + 1] || ''}
                onChange={e => handleText(null, e.target.value)}
                placeholder="Yanıtınızı detaylı bir şekilde açıklayınız..."
                rows={5}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button onClick={() => setCurrentIdx(p => Math.max(0, p - 1))} disabled={currentIdx === 0} style={{ padding: '0.5rem 1rem', borderRadius: '0.65rem', background: currentIdx === 0 ? '#f1f5f9' : 'white', border: '1px solid #e2e8f0', cursor: currentIdx === 0 ? 'default' : 'pointer', fontWeight: 800, color: '#64748b' }}>← Önceki Soru</button>
          <button onClick={() => setCurrentIdx(p => Math.min(qCount - 1, p + 1))} disabled={currentIdx === qCount - 1} style={{ padding: '0.5rem 1rem', borderRadius: '0.65rem', background: currentIdx === qCount - 1 ? '#f1f5f9' : 'white', border: '1px solid #e2e8f0', cursor: currentIdx === qCount - 1 ? 'default' : 'pointer', fontWeight: 800, color: '#64748b' }}>Sonraki Soru →</button>
        </div>
      </div>
      <InlineOptikPanel
        qCount={qCount}
        answers={answers}
        openEndedText={openEndedText}
        isOpenEndedMode={sectionOE}
        onOptionSelect={(qNo, optIdx) => {
          const idx = qNo - 1;
          setCurrentIdx(idx);
          const qObj = resolvedQuestions[idx] || bankQ || {};
          const correctAns = qObj.correctAnswer;
          const isCorrect = (correctAns !== null && correctAns !== undefined) ? optIdx === correctAns : null;
          onAnswerChange({ ...sectionAnswers, answers: { ...answers, [qNo]: { userAnswer: optIdx, isCorrect, questionId: qObj.id } } });
        }}
        onTextChange={(qNo, val) => {
          const idx = qNo - 1;
          setCurrentIdx(idx);
          onAnswerChange({ ...sectionAnswers, openEndedText: { ...openEndedText, [qNo]: val } });
        }}
      />
    </div>
  );
}

// ─── MAIN COMPOSITE / MULTI-SECTION RUNNER ───────────────────────────────────
export default function CompositeQuizRunner({ test, questions, onSubmit }) {
  const { questions: allBankQuestions } = useQuestionBank();

  const sections = useMemo(() => {
    if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
      return test.sections.map((sec, idx) => {
        const bankQ = allBankQuestions?.find(q => String(q.id) === String(sec.questionId || sec.id)) || sec;
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (sec.questions || []);
        
        const qCount = bankQ?.questionCount || sec.questionCount || resolvedQuestions.length || 1;

        if (resolvedQuestions.length < qCount) {
          const filled = [...resolvedQuestions];
          for (let i = filled.length; i < qCount; i++) {
            const subQ = bankQ?.questionsList?.[i] || {};
            filled.push({
              ...subQ,
              id: subQ.id || `${bankQ?.id || sec.id || 'q'}_sub_${i + 1}`,
              questionText: subQ.questionText || subQ.text || subQ.title || `Soru ${i + 1}`,
              options: (subQ.options && subQ.options.length > 0) ? subQ.options : ['A', 'B', 'C', 'D', 'E'],
              correctAnswer: subQ.correctAnswer !== undefined ? subQ.correctAnswer : 0
            });
          }
          resolvedQuestions = filled;
        }

        return {
          ...sec,
          _idx: idx,
          bankQ: bankQ || sec,
          resolvedQuestions,
          _totalCount: qCount,
        };
      });
    }

    if (questions && questions.length > 0) {
      const groups = {};
      questions.forEach((q, idx) => {
        const secTitle = q.testName || q.sectionTitle || q.title || `Bölüm ${idx + 1}`;
        const secId = q.id || `sec_${idx}`;
        if (!groups[secId]) {
          groups[secId] = {
            id: secId,
            title: secTitle,
            bankQ: q,
            resolvedQuestions: [q],
            _totalCount: q.questionCount || 1
          };
        }
      });
      const res = Object.values(groups);
      if (res.length > 0) return res;
    }

    return [{
      id: test.id || 'sec_1',
      title: test.title || test.name || 'Bölüm 1',
      bankQ: test,
      resolvedQuestions: questions || [],
      _totalCount: questions.length || test.questionCount || 1
    }];
  }, [test.sections, test.id, test.title, test.name, test.questionCount, questions, allBankQuestions]);

  const totalSeconds = useMemo(() => {
    const perQuestionMins = Number(test.timePerQuestion || test.time_per_question) || 2;
    const total = sections.reduce((sum, s) => sum + (s._totalCount * perQuestionMins * 60), 0);
    return total || 1200;
  }, [sections, test.timePerQuestion]);

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [sectionAnswers, setSectionAnswers] = useState(() => Object.fromEntries(sections.map(s => [s.id, { answers: {}, openEndedText: {} }])));
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  useEffect(() => {
    if (timeLeft <= 0) { handleFinalSubmit(); return; }
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  const handleAnswerChange = (sectionId, newAnswers) => {
    setSectionAnswers(prev => ({ ...prev, [sectionId]: newAnswers }));
  };

  const handleFinalSubmit = () => {
    const allAnswers = [];
    let questionNoOffset = 0;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const bankQ = sec.bankQ || {};
      const totalQ = sec._totalCount;
      const sectionOE = checkIsOE(bankQ);

      Array.from({ length: totalQ }).forEach((_, idx) => {
        const qNo = idx + 1;
        const qObj = sec.resolvedQuestions[idx] || {};
        const ansObj = sa.answers?.[qNo] || {};
        const userAns = typeof ansObj === 'object' ? ansObj.userAnswer : ansObj;
        const textAns = sa.openEndedText?.[qNo] || null;
        const isCorrect = sectionOE ? null : (userAns !== undefined && userAns !== null ? (ansObj.isCorrect !== undefined ? ansObj.isCorrect : checkIsAnswerCorrect(userAns, qObj, bankQ, qNo)) : null);

        allAnswers.push({
          questionId: qObj.id || `${sec.id}_${qNo}`,
          questionNo: questionNoOffset + qNo,
          sectionId: sec.id,
          sectionTitle: sec.title,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns,
          isCorrect,
          correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
        });
      });
      questionNoOffset += totalQ;
    });

    onSubmit(allAnswers);
  };

  const currentSection = sections[currentSectionIdx];
  if (!currentSection) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>Bölümler Yükleniyor...</div>;

  const currentSA = sectionAnswers[currentSection.id] || {};
  const bankQ = currentSection.bankQ || {};
  const sectionType = detectTestType(bankQ, currentSection.resolvedQuestions);
  const sectionOE = checkIsOE(bankQ);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: 'white', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ padding: '0.65rem 1.25rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.28rem 0.6rem', background: '#7c3aed', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.7rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={13} /> BÖLÜMLÜ SORU BANKASI ÖDEVİ
          </span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, color: '#f1f5f9', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title || test.name}</h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>
            {getSectionIcon(bankQ?.contentType, bankQ?.type)} {currentSection.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.32rem 0.75rem', borderRadius: '0.5rem', background: timeLeft < 300 ? '#7f1d1d' : '#064e3b', color: timeLeft < 300 ? '#fca5a5' : '#6ee7b7', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: `1px solid ${timeLeft < 300 ? '#ef4444' : '#10b981'}` }}>
            <Clock size={14} /> {formatTime(timeLeft)}
          </div>
          <button onClick={handleFinalSubmit} style={{ padding: '0.4rem 1rem', borderRadius: '0.55rem', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 3px 10px rgba(16,185,129,0.3)' }}>
            <CheckCircle2 size={16} /> Sınavı Bitir ve Gönder
          </button>
        </div>
      </header>

      {/* ── Section Navigation Bar ── */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexShrink: 0, overflowX: 'auto' }}>
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
                  background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#1e293b',
                  border: isCurrent ? '2px solid #818cf8' : '1px solid #334155',
                  color: isCurrent ? 'white' : '#cbd5e1'
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
              padding: '0.35rem 0.85rem', borderRadius: '0.5rem', background: currentSectionIdx === 0 ? '#1e293b' : '#334155',
              border: '1px solid #475569', color: currentSectionIdx === 0 ? '#64748b' : 'white', fontWeight: 800, fontSize: '0.78rem',
              cursor: currentSectionIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'
            }}
          >
            <ChevronLeft size={16} /> Önceki Bölüm
          </button>
          <button
            onClick={() => setCurrentSectionIdx(p => Math.min(sections.length - 1, p + 1))}
            disabled={currentSectionIdx === sections.length - 1}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: '0.5rem', background: currentSectionIdx === sections.length - 1 ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              border: 'none', color: currentSectionIdx === sections.length - 1 ? '#64748b' : 'white', fontWeight: 800, fontSize: '0.78rem',
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
          <OpticSection bankQ={bankQ} sectionAnswers={currentSA} onAnswerChange={sa => handleAnswerChange(currentSection.id, sa)} />
        )}
        {sectionType === 'pdf' && (
          <PdfSection bankQ={bankQ} sectionAnswers={currentSA} onAnswerChange={sa => handleAnswerChange(currentSection.id, sa)} sectionOE={sectionOE} />
        )}
        {sectionType === 'html' && (
          <HtmlSection bankQ={bankQ} sectionAnswers={currentSA} onAnswerChange={sa => handleAnswerChange(currentSection.id, sa)} sectionOE={sectionOE} />
        )}
        {sectionType === 'image' && (
          <ImageSection bankQ={bankQ} resolvedQuestions={currentSection.resolvedQuestions} sectionAnswers={currentSA} onAnswerChange={sa => handleAnswerChange(currentSection.id, sa)} />
        )}
        {sectionType === 'standard' && (
          <StandardSection bankQ={bankQ} resolvedQuestions={currentSection.resolvedQuestions} sectionAnswers={currentSA} onAnswerChange={sa => handleAnswerChange(currentSection.id, sa)} />
        )}
      </div>
    </div>
  );
}
