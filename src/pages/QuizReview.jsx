import React from 'react';
import { useParams } from 'react-router-dom';
import { useEvaluation } from '../context/EvaluationContext';
import QuizRunner from './QuizRunner';

export default function QuizReview() {
  const params = useParams();
  const id = params.submissionId || params.id || '';
  const { submissions } = useEvaluation();

  const submission = (submissions || []).find(s => String(s.id) === String(id) || String(s.submissionId) === String(id)) || null;

  return <QuizRunner reviewSubmission={submission} isReviewMode={true} submissionId={id} />;
}
