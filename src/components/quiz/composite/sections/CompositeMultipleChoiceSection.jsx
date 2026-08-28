import React, { memo, useMemo, useState, useEffect } from 'react';
import MultipleChoiceRunner from '../../runner/MultipleChoiceRunner';
import OpticalBubblePanel from '../../panels/OpticalBubblePanel';
import QuizPanelLayout from '../../runner/QuizPanelLayout';
import { Check, ChevronLeft, ChevronRight, LayoutList, Square } from 'lucide-react';

import { extractImageUrls, isValidImageUrl } from '../../common/ImageLightbox';

/**
 * CompositeMultipleChoiceSection
 * Renders a Multiple-Choice section inside a composite homework.
 * Supports Sequential Single-Question Stepper mode (default) and List mode.
 */
export default memo(function CompositeMultipleChoiceSection({
  section = {},
  payload = null,
  answers = {},
  onSelectOption,
  onOpenDrawing,
  isMobile = false
}) {
  const questions = (section.resolvedQuestions && section.resolvedQuestions.length > 0)
    ? section.resolvedQuestions
    : (section.questions && section.questions.length > 0
        ? section.questions
        : [section]);
  const totalCount = section.qCount || questions.length || 1;

  const [activeQIdx, setActiveQIdx] = useState(0);
  const [viewMode, setViewMode] = useState('single'); // 'single' (sequential) or 'list'

  // Reset active question index if section changes
  useEffect(() => {
    setActiveQIdx(0);
  }, [section.id]);

  const isVisualSection = Boolean(
    section.type === 'gorsel' ||
    section.type === 'gorsel_klasik' ||
    section.contentType === 'gorsel' ||
    section.contentType === 'image' ||
    section.format === 'image' ||
    section.formatType === 'image' ||
    section.sourceFormat === 'image' ||
    (Array.isArray(section.images) && section.images.length > 0) ||
    (Array.isArray(section.imageUrls) && section.imageUrls.length > 0) ||
    Boolean(section.imageUrl && typeof section.imageUrl === 'string' && !section.imageUrl.includes('[STORED_IN_INDEXEDDB]'))
  );

  const sectionImages = useMemo(() => {
    if (!isVisualSection) return [];
    const list = [];
    if (payload) {
      list.push(...extractImageUrls(payload));
    }
    if (Array.isArray(section.images) && section.images.length > 0) list.push(...section.images);
    if (Array.isArray(section.imageUrls) && section.imageUrls.length > 0) list.push(...section.imageUrls);
    if (section.imageUrl && typeof section.imageUrl === 'string') list.push(section.imageUrl);
    if (section.image && typeof section.image === 'string') list.push(section.image);
    if (section.contentPayload) {
      list.push(...extractImageUrls(section.contentPayload));
    }
    if (section.bankQ?.contentPayload) {
      list.push(...extractImageUrls(section.bankQ.contentPayload));
    }
    if (Array.isArray(section.bankQ?.imageUrls)) {
      list.push(...section.bankQ.imageUrls);
    }
    return Array.from(new Set(list.filter(isValidImageUrl)));
  }, [section, payload, isVisualSection]);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(v => v !== null && v !== undefined && v !== 'empty').length;
  }, [answers]);

  const getQuestionImages = (q, idx) => {
    const qImages = [];
    if (Array.isArray(q.images) && q.images.length > 0) qImages.push(...q.images);
    if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) qImages.push(...q.imageUrls);
    if (q.imageUrl && isValidImageUrl(q.imageUrl)) qImages.push(q.imageUrl);
    if (q.image && isValidImageUrl(q.image)) qImages.push(q.image);
    if (q.contentPayload && isValidImageUrl(q.contentPayload)) {
      qImages.push(...extractImageUrls(q.contentPayload));
    }

    // Yalnızca görsel tipindeki bölümlerde bölüm seviyesindeki görseller aktarılır
    if (qImages.length === 0 && isVisualSection && sectionImages.length > 0) {
      if (sectionImages.length === totalCount && sectionImages[idx]) {
        qImages.push(sectionImages[idx]);
      } else if (sectionImages[idx]) {
        qImages.push(sectionImages[idx]);
      } else if (sectionImages.length === 1 && totalCount === 1) {
        qImages.push(sectionImages[0]);
      }
    }
    return qImages.filter(isValidImageUrl);
  };

  const activeQuestion = questions[activeQIdx] || questions[0] || {};
  const activeQImages = getQuestionImages(activeQuestion, activeQIdx);

  return (
    <QuizPanelLayout
      panelTitle="Optik Form"
      panelSubtitle={section.title || 'Çoktan Seçmeli Bölüm'}
      icon="📋"
      defaultPosition="right"
      defaultSize={320}
      defaultOpenOnMobile={false}
      documentContent={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-bg)' }}>
          {/* ── TOP QUESTION NAVIGATOR STRIP ── */}
          <div style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: isMobile ? '0.45rem 0.65rem' : '0.55rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            zIndex: 10,
            flexShrink: 0
          }}>
            {/* Left: Progress info */}
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
              <b style={{ color: '#6366f1' }}>{activeQIdx + 1}</b> / {totalCount} Soru • <span style={{ color: answeredCount === totalCount ? '#10b981' : 'var(--color-text-muted)' }}>{answeredCount} Yanıtlandı</span>
            </div>

            {/* Center: Question Bubbles */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              padding: '0.1rem 0',
              flex: 1,
              justifyContent: isMobile ? 'flex-start' : 'center'
            }}>
              {Array.from({ length: totalCount }, (_, i) => i + 1).map((qNo) => {
                const isCurrent = activeQIdx === qNo - 1;
                const isAnswered = answers[qNo] !== null && answers[qNo] !== undefined && answers[qNo] !== 'empty';

                let bBg = 'var(--color-surface-hover)';
                let bBorder = '1px solid var(--color-border-input)';
                let bColor = 'var(--color-text-muted)';

                if (isCurrent) {
                  bBg = 'linear-gradient(135deg, #6366f1, #4f46e5)';
                  bBorder = '2px solid #6366f1';
                  bColor = '#ffffff';
                } else if (isAnswered) {
                  bBg = 'rgba(22, 163, 74, 0.15)';
                  bBorder = '1.5px solid #16a34a';
                  bColor = '#16a34a';
                }

                return (
                  <button
                    key={qNo}
                    type="button"
                    onClick={() => {
                      setActiveQIdx(qNo - 1);
                      if (viewMode === 'list') {
                        document.getElementById(`q-card-${qNo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    style={{
                      width: isMobile ? '28px' : '30px',
                      height: isMobile ? '28px' : '30px',
                      borderRadius: '50%',
                      border: bBorder,
                      background: bBg,
                      color: bColor,
                      fontWeight: 900,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Soru ${qNo}'e Geç`}
                  >
                    {isAnswered && !isCurrent ? <Check size={13} strokeWidth={3} /> : qNo}
                  </button>
                );
              })}
            </div>

            {/* Right: View Mode Switcher (Single / List) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setViewMode(prev => prev === 'single' ? 'list' : 'single')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-hover)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title={viewMode === 'single' ? 'Tüm Soruları Liste Halinde Göster' : 'Tek Tek Sırayla Göster'}
              >
                {viewMode === 'single' ? <LayoutList size={13} /> : <Square size={13} />}
                <span>{isMobile ? '' : (viewMode === 'single' ? 'Tüm Liste' : 'Tek Soru')}</span>
              </button>
            </div>
          </div>

          {/* ── MAIN QUESTION CONTAINER ── */}
          <div style={{ padding: isMobile ? '0.75rem 0.65rem' : '1.25rem 1.5rem', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {viewMode === 'single' ? (
              /* ── SINGLE QUESTION SEQUENTIAL VIEW ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <MultipleChoiceRunner
                  key={activeQuestion.id || activeQIdx}
                  question={activeQuestion}
                  qNo={activeQIdx + 1}
                  totalQuestions={totalCount}
                  imageUrls={activeQImages}
                  selectedOption={answers[activeQIdx + 1]}
                  onSelectOption={(optIdx) => onSelectOption(section.id, activeQIdx + 1, optIdx)}
                  onOpenDrawing={onOpenDrawing}
                  isMobile={isMobile}
                />

                {/* Question Stepper Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1.25rem',
                  marginTop: '0.25rem'
                }}>
                  <button
                    type="button"
                    disabled={activeQIdx === 0}
                    onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 1.1rem',
                      borderRadius: '0.7rem',
                      border: '1.5px solid var(--color-border-input)',
                      background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                      color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                      fontSize: isMobile ? '0.78rem' : '0.85rem',
                      fontWeight: 800,
                      cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                      opacity: activeQIdx === 0 ? 0.5 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Önceki Soru</span>
                  </button>

                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                    {activeQIdx + 1} / {totalCount}
                  </div>

                  <button
                    type="button"
                    disabled={activeQIdx >= totalCount - 1}
                    onClick={() => setActiveQIdx(prev => Math.min(totalCount - 1, prev + 1))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.2rem',
                      borderRadius: '0.7rem',
                      border: 'none',
                      background: activeQIdx >= totalCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: activeQIdx >= totalCount - 1 ? 'var(--color-text-muted)' : '#ffffff',
                      fontSize: isMobile ? '0.78rem' : '0.85rem',
                      fontWeight: 900,
                      cursor: activeQIdx >= totalCount - 1 ? 'not-allowed' : 'pointer',
                      opacity: activeQIdx >= totalCount - 1 ? 0.5 : 1,
                      boxShadow: activeQIdx >= totalCount - 1 ? 'none' : '0 2px 8px rgba(79,70,229,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Sonraki Soru</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* ── FULL LIST VIEW ── */
              questions.map((q, idx) => {
                const qImages = getQuestionImages(q, idx);
                return (
                  <MultipleChoiceRunner
                    key={q.id || idx}
                    question={q}
                    qNo={idx + 1}
                    totalQuestions={totalCount}
                    imageUrls={qImages}
                    selectedOption={answers[idx + 1]}
                    onSelectOption={(optIdx) => onSelectOption(section.id, idx + 1, optIdx)}
                    onOpenDrawing={onOpenDrawing}
                    isMobile={isMobile}
                  />
                );
              })
            )}
          </div>
        </div>
      }
      answerContent={
        <OpticalBubblePanel
          qCount={totalCount}
          answers={answers}
          onSelectOption={(qNo, optIdx) => {
            setActiveQIdx(qNo - 1);
            onSelectOption(section.id, qNo, optIdx);
          }}
          resolvedQuestions={questions}
        />
      }
    />
  );
});
