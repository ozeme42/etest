import React, { memo } from 'react';
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
  const questions = section.resolvedQuestions || [];
  const totalCount = section.qCount || questions.length || 1;

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
          {questions.map((q, idx) => (
            <MultipleChoiceRunner
              key={q.id || idx}
              question={q}
              qNo={idx + 1}
              totalQuestions={totalCount}
              selectedOption={answers[idx + 1]}
              onSelectOption={(optIdx) => onSelectOption(section.id, idx + 1, optIdx)}
              isMobile={isMobile}
            />
          ))}
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
