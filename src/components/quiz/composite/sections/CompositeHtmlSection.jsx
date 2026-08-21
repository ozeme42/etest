import React, { memo } from 'react';
import HtmlViewerWithControls from '../../../HtmlViewerWithControls';
import OpticalBubblePanel from '../../panels/OpticalBubblePanel';
import OpenEndedStatusPanel from '../../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../../runner/QuizPanelLayout';

/**
 * CompositeHtmlSection
 * Renders an HTML document section inside a composite homework with side optical or written panel.
 */
export default memo(function CompositeHtmlSection({
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
      panelSubtitle={section.title || 'HTML Bölümü'}
      icon={isOpenEnded ? '✍️' : '📋'}
      defaultPosition="right"
      defaultSize={340}
      defaultOpenOnMobile={false}
      documentContent={
        <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
          <HtmlViewerWithControls
            payload={payload || section.htmlPayload || section.contentPayload}
            id={section.id || section.questionId}
            title={section.title || 'HTML Dokümanı'}
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
