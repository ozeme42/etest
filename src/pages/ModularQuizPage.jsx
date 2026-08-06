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

export function resolveTestQuestions(foundTest, allBankQuestions = []) {
  if (!foundTest) return [];

  let rawQuestions = [];

  // 1. If test has questionIds (e.g. assigned homework referencing QuestionBank question IDs)
  if (foundTest.questionIds && Array.isArray(foundTest.questionIds) && foundTest.questionIds.length > 0) {
    foundTest.questionIds.forEach(qId => {
      const bankQ = allBankQuestions?.find(bq => String(bq.id) === String(qId));
      if (bankQ) {
        rawQuestions.push(bankQ);
      } else if (typeof qId === 'object' && qId !== null) {
        rawQuestions.push(qId);
      }
    });
  }

  // 2. If test has direct questions array
  if (rawQuestions.length === 0 && foundTest.questions && Array.isArray(foundTest.questions) && foundTest.questions.length > 0) {
    rawQuestions = foundTest.questions;
  }

  // 3. Fallback: use foundTest itself as the raw question object
  if (rawQuestions.length === 0) {
    rawQuestions = [foundTest];
  }

  let finalQuestions = [];

  rawQuestions.forEach((q, qIndex) => {
    // Sub-case A: Item has sub-questions list (questionsList)
    if (q.questionsList && Array.isArray(q.questionsList) && q.questionsList.length > 0) {
      q.questionsList.forEach((subQ, subIdx) => {
        const subImage = subQ.imageUrl || subQ.contentPayload || (q.imageUrls?.[subIdx] || q.imageUrls?.[0]);
        finalQuestions.push({
          ...subQ,
          id: subQ.id || `${q.id || 'q'}_sub_${subIdx}`,
          questionText: subQ.questionText || subQ.title || `Soru ${finalQuestions.length + 1}`,
          options: (subQ.options && subQ.options.length > 0) ? subQ.options : (q.options && q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D', 'E']),
          correctAnswer: subQ.correctAnswer !== undefined ? subQ.correctAnswer : (q.answerKey?.[subIdx] !== undefined ? q.answerKey[subIdx] : (q.correctAnswer || 0)),
          contentPayload: subImage,
          imageUrl: subImage,
          imageUrls: subQ.imageUrls && subQ.imageUrls.length > 0 ? subQ.imageUrls : (subImage ? [subImage] : [])
        });
      });
    }
    // Sub-case B: Item has multiple imageUrls
    else if (q.imageUrls && Array.isArray(q.imageUrls) && q.imageUrls.length > 0) {
      const allUrls = q.imageUrls.flatMap(url => typeof url === 'string' && url.includes('\n\n') ? url.split('\n\n').filter(Boolean) : [url]);
      allUrls.forEach((url, imgIdx) => {
        finalQuestions.push({
          id: `${q.id || 'q'}_img_${imgIdx}`,
          questionText: `Soru ${finalQuestions.length + 1}`,
          imageUrls: [url],
          imageUrl: url,
          contentPayload: url,
          options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E'],
          correctAnswer: q.answerKey?.[imgIdx] !== undefined ? q.answerKey[imgIdx] : (q.correctAnswer || 0)
        });
      });
    }
    // Sub-case C: Item has contentPayload with multiple concatenated image URLs/data strings (\n\n)
    else if (q.contentPayload && typeof q.contentPayload === 'string' && q.contentPayload.includes('\n\n')) {
      const splitUrls = q.contentPayload.split('\n\n').map(s => s.trim()).filter(Boolean);
      if (splitUrls.length > 1) {
        splitUrls.forEach((url, splitIdx) => {
          finalQuestions.push({
            id: `${q.id || 'q'}_split_${splitIdx}`,
            questionText: `Soru ${finalQuestions.length + 1}`,
            imageUrls: [url],
            imageUrl: url,
            contentPayload: url,
            options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: q.answerKey?.[splitIdx] !== undefined ? q.answerKey[splitIdx] : (q.correctAnswer || 0)
          });
        });
      } else {
        finalQuestions.push({
          ...q,
          id: q.id || `q_${qIndex + 1}`,
          questionText: q.questionText || q.title || `Soru ${finalQuestions.length + 1}`,
          options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E']
        });
      }
    }
    // Sub-case D: Single question item
    else {
      finalQuestions.push({
        ...q,
        id: q.id || `q_${qIndex + 1}`,
        questionText: q.questionText || q.title || `Soru ${finalQuestions.length + 1}`,
        options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E']
      });
    }
  });

  return finalQuestions;
}

export default function ModularQuizPage() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || 'u1';
  const navigate = useNavigate();

  const { homeworks } = useHomework();
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
      const resolved = resolveTestQuestions(foundTest, allBankQuestions);
      setQuestions(resolved);
    }
    setLoading(false);
  }, [testId, homeworks, curriculumData, allBankQuestions]);

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
    questions.some(q => q.contentType === 'gorsel' || (q.imageUrls && q.imageUrls.length > 0) || q.imageUrl || (q.contentPayload && (q.contentPayload.startsWith('data:image') || q.contentPayload.startsWith('http') || q.contentPayload.includes('\n\n'))));

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

