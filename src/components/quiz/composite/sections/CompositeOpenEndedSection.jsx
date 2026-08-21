import React, { memo, useMemo } from 'react';
import OpenEndedRunner from '../../runner/OpenEndedRunner';
import OpenEndedStatusPanel from '../../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../../runner/QuizPanelLayout';
import { extractDirectImages } from '../../../../services/unifiedQuizAdapter';

/**
 * CompositeOpenEndedSection
 * Renders an Open-Ended (Written) section inside a composite homework.
 */
export default memo(function CompositeOpenEndedSection({
  section = {},
  openEndedText = {},
  onTextChange,
  onOpenDrawing,
  isMobile = false
}) {
  const questions = section.resolvedQuestions || section.questions || [];
  const totalCount = section.qCount || questions.length || 1;

  const sectionImages = useMemo(() => {
    return extractDirectImages(section);
  }, [section]);

  return (
    <QuizPanelLayout
      panelTitle="Yazılı Yanıtlar"
      panelSubtitle={section.title || 'Açık Uçlu Bölüm'}
      icon="✍️"
      defaultPosition="right"
      defaultSize={300}
      defaultOpenOnMobile={false}
      documentContent={
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {questions.map((q, idx) => {
            const qImages = extractDirectImages(q);

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
              <OpenEndedRunner
                key={q.id || idx}
                question={q}
                qNo={idx + 1}
                totalQuestions={totalCount}
                imageUrls={qImages}
                value={openEndedText[idx + 1] || ''}
                onChange={(val) => onTextChange(section.id, idx + 1, val)}
                onOpenDrawing={onOpenDrawing}
                isMobile={isMobile}
              />
            );
          })}
        </div>
      }
      answerContent={
        <OpenEndedStatusPanel
          qCount={totalCount}
          openEndedText={openEndedText}
          resolvedQuestions={questions}
        />
      }
    />
  );
});
