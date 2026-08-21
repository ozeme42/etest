import React, { memo, useMemo } from 'react';
import MultipleChoiceRunner from '../../runner/MultipleChoiceRunner';
import OpticalBubblePanel from '../../panels/OpticalBubblePanel';
import QuizPanelLayout from '../../runner/QuizPanelLayout';

/**
 * CompositeMultipleChoiceSection
 * Renders a Multiple-Choice section inside a composite homework.
 */
export default memo(function CompositeMultipleChoiceSection({
  section = {},
  answers = {},
  onSelectOption,
  isMobile = false
}) {
  const questions = section.resolvedQuestions || section.questions || [];
  const totalCount = section.qCount || questions.length || 1;

  const sectionImages = useMemo(() => {
    const list = [];
    if (Array.isArray(section.images) && section.images.length > 0) list.push(...section.images);
    if (Array.isArray(section.imageUrls) && section.imageUrls.length > 0) list.push(...section.imageUrls);
    if (section.imageUrl && typeof section.imageUrl === 'string') list.push(section.imageUrl);
    if (section.contentPayload && typeof section.contentPayload === 'string') {
      if (section.contentPayload.includes('\n\n') || section.contentPayload.includes('\n') || section.contentPayload.includes('|')) {
        const parts = section.contentPayload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
        list.push(...parts);
      } else if (section.contentPayload.startsWith('data:image') || section.contentPayload.startsWith('http')) {
        list.push(section.contentPayload);
      }
    }
    return Array.from(new Set(list.filter(Boolean)));
  }, [section]);

  return (
    <QuizPanelLayout
      panelTitle="Optik Form"
      panelSubtitle={section.title || 'Çoktan Seçmeli Bölüm'}
      icon="📋"
      defaultPosition="right"
      defaultSize={320}
      defaultOpenOnMobile={false}
      documentContent={
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {questions.map((q, idx) => {
            const qImages = [];
            if (Array.isArray(q.images) && q.images.length > 0) qImages.push(...q.images);
            if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) qImages.push(...q.imageUrls);
            if (q.imageUrl) qImages.push(q.imageUrl);
            if (q.contentPayload && typeof q.contentPayload === 'string') {
              if (q.contentPayload.includes('\n\n') || q.contentPayload.includes('\n') || q.contentPayload.includes('|')) {
                const parts = q.contentPayload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
                qImages.push(...parts);
              } else if (q.contentPayload.startsWith('data:image') || q.contentPayload.startsWith('http')) {
                qImages.push(q.contentPayload);
              }
            }

            if (qImages.length === 0 && sectionImages.length > 0) {
              if (sectionImages.length === totalCount && sectionImages[idx]) {
                qImages.push(sectionImages[idx]);
              } else if (sectionImages[idx]) {
                qImages.push(sectionImages[idx]);
              } else if (sectionImages[0]) {
                qImages.push(sectionImages[0]);
              }
            }

            return (
              <MultipleChoiceRunner
                key={q.id || idx}
                question={q}
                qNo={idx + 1}
                totalQuestions={totalCount}
                imageUrls={qImages}
                selectedOption={answers[idx + 1]}
                onSelectOption={(optIdx) => onSelectOption(section.id, idx + 1, optIdx)}
                isMobile={isMobile}
              />
            );
          })}
        </div>
      }
      answerContent={
        <OpticalBubblePanel
          qCount={totalCount}
          answers={answers}
          onSelectOption={(qNo, optIdx) => onSelectOption(section.id, qNo, optIdx)}
          resolvedQuestions={questions}
        />
      }
    />
  );
});
