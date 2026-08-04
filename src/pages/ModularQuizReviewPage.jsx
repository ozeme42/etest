import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';

import { resolveTestQuestions } from './ModularQuizPage';

export default function ModularQuizReviewPage() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || 'u1';
  const navigate = useNavigate();

  const { homeworks, getQuestionsForTest } = useHomework();
  const { submissions } = useEvaluation();
  const { data: curriculumData } = useCurriculum();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let foundTest = homeworks.find(h => String(h.id) === String(testId));
    if (!foundTest && curriculumData?.tests) {
      foundTest = curriculumData.tests.find(t => String(t.id) === String(testId));
    }

    const foundSubmission = submissions.find(s => String(s.testId) === String(testId) && String(s.studentId) === String(studentId));

    if (foundTest) {
      setTest(foundTest);
      const testQs = resolveTestQuestions(foundTest);
      setQuestions(testQs);
    }

    if (foundSubmission) {
      setSubmission(foundSubmission);
    }

    setLoading(false);
  }, [testId, studentId, homeworks, submissions, curriculumData, getQuestionsForTest]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        İnceleme Raporu Yükleniyor...
      </div>
    );
  }

  if (!test || !submission) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', gap: '1rem' }}>
        <h2>İnceleme Raporu Bulunamadı</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Bu sınava ait herhangi bir tamamlanmış çözüm kaydı bulunamadı.</p>
        <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
          Geri Dön
        </button>
      </div>
    );
  }

  const sourceFormat = test.sourceFormat || test.formatType || (test.pdfPayload ? 'pdf' : test.htmlPayload ? 'html' : (test.imageUrls || test.contentPayload) ? 'image' : 'standard');

  if (sourceFormat === 'pdf' || test.pdfPayload) {
    return <PdfQuizReview submission={submission} test={test} questions={questions} />;
  }

  if (sourceFormat === 'html' || test.htmlPayload) {
    return <HtmlQuizReview submission={submission} test={test} questions={questions} />;
  }

  if (sourceFormat === 'image' || test.questionType === 'gorsel_klasik') {
    return <ImageQuizReview submission={submission} test={test} questions={questions} />;
  }

  if (sourceFormat === 'physical' || test.questionType === 'optik_form') {
    return <PhysicalQuizReview submission={submission} test={test} questions={questions} />;
  }

  return <StandardQuizReview submission={submission} test={test} questions={questions} />;
}
