import React, { memo } from 'react';
import PdfViewerWithControls from '../../../PdfViewerWithControls';
import OpticalBubblePanel from '../../panels/OpticalBubblePanel';
import OpenEndedStatusPanel from '../../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../../runner/QuizPanelLayout';

/**
 * CompositePdfSection
 * Renders a PDF document section inside a composite homework with side optical or written panel.
 */
export default memo(function CompositePdfSection({
  section = {},
  payload,
  answers = {},
  openEndedText = {},
  isOpenEnded = false,
  onSelectOption,
  onTextChange,
  onSelectQuestion,
  isReviewMode = false,
  isMobile = false
}) {
  const totalCount = section.qCount || (section.resolvedQuestions?.length) || 1;

  return (
    <QuizPanelLayout
      panelTitle={isOpenEnded ? 'Yazılı Yanıtlar' : 'Optik Form'}
      panelSubtitle={section.title || 'PDF Bölümü'}
      icon={isOpenEnded ? '✍️' : '📋'}
      defaultPosition="right"
      defaultSize={340}
      defaultOpenOnMobile={false}
      documentContent={
        <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
          <PdfViewerWithControls
            payload={payload || section.pdfUrl || section.contentPayload || section.pdfPayload}
            id={section.id || section.testId}
            testId={section.testId || section.sourceTestId || section.originalTestId}
            title={section.title || 'PDF Dokümanı'}
            height="100%"
          />
        </div>
      }
      answerContent={
        isOpenEnded ? (
          <OpenEndedStatusPanel
            qCount={totalCount}
            openEndedText={openEndedText}
            resolvedQuestions={section.resolvedQuestions || []}
            onSelectQuestion={onSelectQuestion}
            onTextChange={(qNo, val) => onTextChange && onTextChange(section.id, qNo, val)}
            isReviewMode={isReviewMode}
          />
        ) : (
          <OpticalBubblePanel
            qCount={totalCount}
            answers={answers}
            onSelectOption={(qNo, optIdx) => onSelectOption(section.id, qNo, optIdx)}
            resolvedQuestions={section.resolvedQuestions || []}
          />
        )
      }
    />
  );
});
