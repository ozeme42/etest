import React, { memo } from 'react';
import HtmlViewerWithControls from '../../../HtmlViewerWithControls';
import OpticalBubblePanel from '../../panels/OpticalBubblePanel';
import OpenEndedStatusPanel from '../../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../../runner/QuizPanelLayout';

/**
 * CompositeHtmlSection
 * Renders an HTML document section inside a composite homework with side optical panel.
 */
export default memo(function CompositeHtmlSection({
  section = {},
  payload,
  answers = {},
  openEndedText = {},
  isOpenEnded = false,
  onSelectOption,
  onSelectQuestion,
  isMobile = false
}) {
  const totalCount = section.qCount || 1;

  return (
    <QuizPanelLayout
      panelTitle={isOpenEnded ? 'Yazılı Yanıtlar' : 'Optik Form'}
      panelSubtitle={section.title || 'HTML Bölümü'}
      icon={isOpenEnded ? '✍️' : '📋'}
      defaultPosition="right"
      defaultSize={320}
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
            onSelectQuestion={onSelectQuestion}
          />
        ) : (
          <OpticalBubblePanel
            qCount={totalCount}
            answers={answers}
            onSelectOption={(qNo, optIdx) => onSelectOption(section.id, qNo, optIdx)}
          />
        )
      }
    />
  );
});
