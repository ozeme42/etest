import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';

import PdfQuizRunner from '../components/quiz/runner/PdfQuizRunner';
import HtmlQuizRunner from '../components/quiz/runner/HtmlQuizRunner';
import ImageQuizRunner from '../components/quiz/runner/ImageQuizRunner';
import StandardQuizRunner from '../components/quiz/runner/StandardQuizRunner';
import PhysicalQuizRunner from '../components/quiz/runner/PhysicalQuizRunner';

export default function ModularQuizPage() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || 'u1';
  const navigate = useNavigate();

  const { homeworks, getQuestionsForTest } = useHomework();
  const { addSubmission } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { questions: allBankQuestions } = useQuestionBank();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let foundTest = homeworks.find(h => String(h.id) === String(testId));

    if (!foundTest && curriculumData?.tests) {
      foundTest = curriculumData.tests.find(t => String(t.id) === String(testId));
    }

    if (!foundTest && allBankQuestions) {
      foundTest = allBankQuestions.find(q => String(q.id) === String(testId));
    }

    if (foundTest) {
      setTest(foundTest);
      let testQs = getQuestionsForTest ? getQuestionsForTest(foundTest.id) : (foundTest.questions || []);

      // Fallback: If testQs is empty, check if foundTest itself contains questionsList, imageUrls, or payload
      if ((!testQs || testQs.length === 0) && foundTest) {
        if (foundTest.questionsList && foundTest.questionsList.length > 0) {
          testQs = foundTest.questionsList;
        } else if (foundTest.imageUrls && foundTest.imageUrls.length > 0) {
          testQs = foundTest.imageUrls.map((url, idx) => ({
            id: `${foundTest.id}_q${idx + 1}`,
            imageUrls: [url],
            questionText: `Soru ${idx + 1}`
          }));
        } else if (foundTest.questionCount > 0) {
          testQs = Array.from({ length: foundTest.questionCount }).map((_, idx) => ({
            id: `${foundTest.id}_q${idx + 1}`,
            contentPayload: foundTest.contentPayload,
            imageUrl: foundTest.imageUrl,
            imageUrls: foundTest.imageUrls,
            questionText: `Soru ${idx + 1}`
          }));
        } else if (foundTest.contentPayload || foundTest.imageUrl) {
          testQs = [{
            id: `${foundTest.id}_q1`,
            contentPayload: foundTest.contentPayload,
            imageUrl: foundTest.imageUrl,
            imageUrls: foundTest.imageUrls,
            questionText: foundTest.title || 'Soru 1'
          }];
        }
      }

      setQuestions(testQs || []);
    }
    setLoading(false);
  }, [testId, homeworks, curriculumData, allBankQuestions, getQuestionsForTest]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Sınav Yükleniyor...
      </div>
    );
  }

  if (!test) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', gap: '1rem' }}>
        <h2>Sınav Bulunamadı</h2>
        <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
          Geri Dön
        </button>
      </div>
    );
  }

  const handleSubmit = (formattedAnswers) => {
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    formattedAnswers.forEach(ans => {
      if (ans.isCorrect === true) correctCount++;
      else if (ans.isCorrect === false) wrongCount++;
      else if (ans.userAnswer === null && !ans.userAnswerText) blankCount++;
    });

    const totalQ = formattedAnswers.length;
    const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

    const submissionData = {
      id: `sub_${Date.now()}`,
      testId: test.id,
      studentId: studentId,
      answers: formattedAnswers,
      correctCount,
      wrongCount,
      blankCount,
      totalQuestions: totalQ,
      score,
      submittedAt: new Date().toISOString()
    };

    addSubmission(submissionData);

    // Redirect to review mode
    navigate(`/quiz-review/${test.id}?studentId=${studentId}`);
  };

  // Determine Source Format Mode
  const isPdf = test.pdfPayload || test.sourceFormat === 'pdf' || test.formatType === 'pdf';
  const isHtml = test.htmlPayload || test.sourceFormat === 'html' || test.formatType === 'html';
  const isPhysical = test.sourceFormat === 'physical' || test.questionType === 'optik_form';
  const isImageTest = 
    test.sourceFormat === 'image' || 
    test.formatType === 'image' || 
    test.questionType === 'gorsel_klasik' || 
    test.contentType === 'gorsel' || 
    test.type === 'gorsel' || 
    (test.title && test.title.toLowerCase().includes('görsel')) ||
    (test.imageUrls && test.imageUrls.length > 0) ||
    (questions.length > 0 && (questions[0].contentType === 'gorsel' || (questions[0].imageUrls && questions[0].imageUrls.length > 0) || (questions[0].contentPayload && !questions[0].options)));

  if (isPdf) {
    return <PdfQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  if (isHtml) {
    return <HtmlQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  if (isImageTest) {
    return <ImageQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  if (isPhysical) {
    return <PhysicalQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  return <StandardQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
}

