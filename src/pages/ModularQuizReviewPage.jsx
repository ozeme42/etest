import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';
import MultiHomeworkRunner from '../components/quiz/runner/MultiHomeworkRunner';

import { resolveTestQuestions } from '../utils/testResolver';

export default function ModularQuizReviewPage() {
  const params = useParams();
  const targetId = params.submissionId || params.testId || params.id;

  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const navigate = useNavigate();

  const { homeworks } = useHomework();
  const { submissions } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { questions: allBankQuestions } = useQuestionBank();
  const { bookTests } = useTrackedBooks();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    let foundSubmission = null;
    let foundTest = null;

    // 1. Search in EvaluationContext (global submissions)
    if (submissions && Array.isArray(submissions)) {
      foundSubmission = submissions.find(s =>
        String(s.id) === String(targetId) ||
        String(s.testId) === String(targetId) ||
        String(s.homeworkId) === String(targetId) ||
        (studentId && String(s.studentId) === String(studentId) && (
          String(s.testId) === String(targetId) ||
          String(s.homeworkId) === String(targetId) ||
          String(s.id) === String(targetId)
        ))
      );
    }

    // 2. Search in HomeworkContext (homeworks[].submissions)
    if (!foundSubmission && homeworks && Array.isArray(homeworks)) {
      for (const hw of homeworks) {
        if (String(hw.id) === String(targetId) || (hw.submissions && hw.submissions.some(s => String(s.id) === String(targetId) || String(s.submissionId) === String(targetId)))) {
          if (hw.submissions && Array.isArray(hw.submissions) && hw.submissions.length > 0) {
            const matched = hw.submissions.find(s =>
              String(s.id) === String(targetId) ||
              String(s.submissionId) === String(targetId) ||
              (studentId && String(s.studentId) === String(studentId))
            ) || hw.submissions[hw.submissions.length - 1];

            if (matched) {
              foundSubmission = { ...matched, testId: matched.testId || hw.id };
              foundTest = hw;
              break;
            }
          }
        }
      }
    }

    // 3. Search in localStorage fallbacks
    if (!foundSubmission) {
      try {
        const localKeys = [`quiz_submission_${targetId}`, `homework_sub_${targetId}`, `submission_${targetId}`, `draft_quiz_${targetId}_ans`];
        for (const k of localKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            foundSubmission = parsed.answers ? parsed : { answers: parsed };
            break;
          }
        }
      } catch (e) {
        console.error('LocalStorage load error:', e);
      }
    }

    // 4. Resolve testId from found submission or targetId
    const resolvedTestId = foundSubmission?.testId || foundSubmission?.homeworkId || targetId;
    const normalizeId = (id) => String(id || '').replace(/^hw_/, '').replace(/^q_?/, '');

    // 5. Search test in homeworks
    if (!foundTest && homeworks && Array.isArray(homeworks)) {
      foundTest = homeworks.find(h =>
        String(h.id) === String(resolvedTestId) ||
        String(h.id) === String(targetId) ||
        normalizeId(h.id) === normalizeId(resolvedTestId) ||
        normalizeId(h.id) === normalizeId(targetId)
      );
    }

    // 6. Search test in bookTests
    if (!foundTest && bookTests) {
      foundTest = bookTests.find(t =>
        String(t.id) === String(resolvedTestId) ||
        String(t.id) === String(targetId) ||
        normalizeId(t.id) === normalizeId(resolvedTestId)
      );
    }

    // 7. Search test in curriculumData.tests
    if (!foundTest && curriculumData?.tests) {
      foundTest = curriculumData.tests.find(t =>
        String(t.id) === String(resolvedTestId) ||
        String(t.id) === String(targetId) ||
        normalizeId(t.id) === normalizeId(resolvedTestId)
      );
    }

    // 8. Search test in allBankQuestions
    if (!foundTest && allBankQuestions && Array.isArray(allBankQuestions)) {
      foundTest = allBankQuestions.find(bq =>
        String(bq.id) === String(resolvedTestId) ||
        String(bq.id) === String(targetId) ||
        normalizeId(bq.id) === normalizeId(resolvedTestId)
      );
    }

    // 8.5 Check submission for embedded test object or sections
    if (!foundTest && foundSubmission) {
      const embedded = foundSubmission.test || foundSubmission.homework || foundSubmission.testDetails;
      if (embedded && (embedded.sections || embedded.questions || embedded.contentPayload || embedded.pdfPayload)) {
        foundTest = embedded;
      }
    }

    // 9. Synthetic test fallback if submission exists but test object was deleted/missing
    if (!foundTest && foundSubmission) {
      let sectionsArr = foundSubmission.sections || null;
      if (!sectionsArr && foundSubmission.answers && Array.isArray(foundSubmission.answers) && foundSubmission.answers.length > 0) {
        const groups = {};
        foundSubmission.answers.forEach(ans => {
          const sTitle = ans.sectionTitle || '1. Bölüm';
          const sId = ans.sectionId || 'sec_1';
          if (!groups[sId]) {
            groups[sId] = { id: sId, title: sTitle, questionId: ans.questionId || sId, questions: [] };
          }
          groups[sId].questions.push(ans);
        });
        sectionsArr = Object.values(groups);
      }

      foundTest = {
        id: resolvedTestId,
        title: foundSubmission.testTitle || foundSubmission.title || 'Ödev / Test İnceleme',
        sections: sectionsArr || [],
        questions: foundSubmission.questions || foundSubmission.answers || [],
        questionCount: foundSubmission.totalQuestions || (foundSubmission.answers?.length) || 1,
        sourceFormat: foundSubmission.sourceFormat || 'physical',
        sourceType: foundSubmission.sourceType || 'trackedBook'
      };
    }

    // 10. Synthetic submission fallback if test is found
    if (foundTest && !foundSubmission) {
      foundSubmission = {
        id: `mock_${targetId}`,
        testId: foundTest.id,
        answers: [],
        correctCount: 0,
        wrongCount: 0,
        blankCount: foundTest.questionCount || 1,
        score: 0
      };
    }

    if (foundTest) {
      const isTrackedBook = Boolean(
        foundTest.sourceType === 'trackedBook' ||
        foundTest.bookId ||
        foundTest.sourceFormat === 'physical' ||
        (foundSubmission && (foundSubmission.bookId || foundSubmission.sourceType === 'trackedBook'))
      );

      if (isTrackedBook) {
        let testQs = resolveTestQuestions(foundTest, allBankQuestions);
        if ((!testQs || testQs.length === 0) && foundSubmission?.answers && Array.isArray(foundSubmission.answers) && foundSubmission.answers.length > 0) {
          testQs = foundSubmission.answers.map((ans, idx) => ({
            id: ans.questionId || `q_${idx + 1}`,
            questionNo: ans.questionNo || (idx + 1),
            testName: ans.testName || foundTest.title || 'Test',
            questionText: ans.questionText || `Soru ${idx + 1}`,
            options: ans.options || ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: ans.correctAnswer !== undefined ? ans.correctAnswer : null,
            correctAnswerLetter: ans.correctAnswerLetter || null,
            userAnswer: ans.userAnswer
          }));
        }
        setTest(foundTest);
        setQuestions(testQs || []);
      } else {
        // Exact section resolution from ModularQuizPage.jsx
        let sections = [];
        const questionIdList = foundTest.sections || foundTest.questionIds || foundTest.selectedQuestions || foundTest.tests || foundTest.items;

        if (Array.isArray(questionIdList) && questionIdList.length > 1) {
          sections = questionIdList.map((item, idx) => {
            const itemId = typeof item === 'object' ? (item.id || item.questionId) : item;
            const bankQ = allBankQuestions?.find(q => String(q.id) === String(itemId)) || (typeof item === 'object' ? item : null);
            const resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : [];
            const title = bankQ?.title || bankQ?.name || (typeof item === 'object' ? (item.title || item.name) : null) || `${idx + 1}. Bölüm`;
            const qCount = bankQ?.questionCount || bankQ?.questionsList?.length || resolvedQuestions.length || 1;

            return {
              id: itemId || `sec_${idx}`,
              questionId: itemId,
              title,
              bankQ: bankQ || { id: itemId, title },
              questionCount: qCount,
              questions: resolvedQuestions
            };
          });
        }

        if (sections.length > 0) {
          foundTest = { ...foundTest, sections };
        }

        let testQs = resolveTestQuestions(foundTest, allBankQuestions);

        // Fallback for missing questions in submission
        if ((!testQs || testQs.length === 0) && foundSubmission?.answers && Array.isArray(foundSubmission.answers) && foundSubmission.answers.length > 0) {
          const sectionsArr = foundTest.sections || foundTest.tests || foundTest.items || [];
          let sectionIndex = 0;
          let qCountInSection = 0;
          
          testQs = foundSubmission.answers.map((ans, idx) => {
            let currentSec = sectionsArr[sectionIndex] || {};
            let expectedCount = currentSec.questionCount || currentSec.qCount || (currentSec.bankQ?.questionCount) || 1;
            
            let correctOpt = ans.correctAnswer;
            if (correctOpt === null || correctOpt === undefined) {
              const letter = ans.correctAnswerLetter;
              if (letter && typeof letter === 'string') {
                correctOpt = letter.toUpperCase().charCodeAt(0) - 65;
              }
            }
            
            const qObj = {
              id: ans.questionId || `q_${idx + 1}`,
              questionNo: ans.questionNo || (idx + 1),
              sectionId: ans.sectionId || currentSec.id || `sec_${sectionIndex + 1}`,
              sectionTitle: ans.sectionTitle || currentSec.title || `${sectionIndex + 1}. Bölüm`,
              testName: ans.testName || foundTest.title || 'Test',
              questionText: ans.questionText || `Soru ${idx + 1}`,
              options: ans.options || ['A', 'B', 'C', 'D', 'E'],
              correctAnswer: correctOpt !== undefined ? correctOpt : null,
              correctAnswerLetter: ans.correctAnswerLetter || (correctOpt !== null && correctOpt !== undefined ? String.fromCharCode(65 + correctOpt) : null),
              userAnswer: ans.userAnswer
            };

            qCountInSection++;
            if (qCountInSection >= expectedCount && sectionIndex < sectionsArr.length - 1) {
              sectionIndex++;
              qCountInSection = 0;
            }
            
            return qObj;
          });
        }

        setTest(foundTest);
        setQuestions(testQs || []);
      }
    }

    if (foundSubmission) {
      if (foundSubmission.answers && Array.isArray(foundSubmission.answers) && foundTest) {
        const sectionsArr = foundTest.sections || foundTest.tests || foundTest.items || [];
        if (sectionsArr.length > 0) {
          let sectionIndex = 0;
          let qCountInSection = 0;
          foundSubmission.answers = foundSubmission.answers.map((ans) => {
            if (ans.sectionId) return ans; // Zaten sectionId varsa atla
            
            let currentSec = sectionsArr[sectionIndex] || {};
            let expectedCount = currentSec.questionCount || currentSec.qCount || (currentSec.bankQ?.questionCount) || 1;
            
            const enriched = {
              ...ans,
              sectionId: currentSec.id || `sec_${sectionIndex + 1}`,
              sectionTitle: currentSec.title || `${sectionIndex + 1}. Bölüm`
            };

            qCountInSection++;
            if (qCountInSection >= expectedCount && sectionIndex < sectionsArr.length - 1) {
              sectionIndex++;
              qCountInSection = 0;
            }
            return enriched;
          });
        }
      }
      setSubmission(foundSubmission);
    }

    setLoading(false);
  }, [targetId, studentId, homeworks, submissions, curriculumData, allBankQuestions, bookTests]);

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
        <button onClick={() => navigate('/student', { replace: true })} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
          Geri Dön
        </button>
      </div>
    );
  }

  const isHtml = Boolean(
    test.htmlPayload ||
    test.sourceFormat === 'html' ||
    test.formatType === 'html' ||
    test.contentType === 'html' ||
    test.type === 'html' ||
    test.questionType === 'html'
  );

  const isPdf = Boolean(
    test.pdfPayload ||
    test.sourceFormat === 'pdf' ||
    test.formatType === 'pdf' ||
    test.contentType === 'pdf' ||
    test.type === 'pdf' ||
    test.questionType === 'pdf'
  );

  const isPhysical = Boolean(
    test.sourceFormat === 'physical' ||
    test.formatType === 'physical' ||
    test.questionType === 'optik_form' ||
    test.type === 'optik_form' ||
    test.sourceType === 'trackedBook' ||
    test.bookId ||
    (submission && (submission.bookId || submission.sourceType === 'trackedBook'))
  );

  const isImageTest = !isHtml && !isPdf && !isPhysical && (
    test.sourceFormat === 'image' || 
    test.formatType === 'image' || 
    test.questionType === 'gorsel_klasik' || 
    test.contentType === 'gorsel' || 
    test.type === 'gorsel'
  );

  const isMultiSection = Boolean(
    (test.sections && Array.isArray(test.sections) && test.sections.length > 1) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 1) ||
    (test.questionIds && Array.isArray(test.questionIds) && test.questionIds.length > 1) ||
    (test.selectedQuestions && Array.isArray(test.selectedQuestions) && test.selectedQuestions.length > 1) ||
    (test.items && Array.isArray(test.items) && test.items.length > 1) ||
    test.isBulk ||
    test.isMulti
  );

  const handleCloseReview = () => {
    if (searchParams.get('from') === 'teacher' || searchParams.get('teacher')) {
      navigate('/evaluation', { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  };

  return (
    <MultiHomeworkRunner
      test={test}
      questions={questions}
      isReviewMode={true}
      userAnswers={submission}
      onSubmit={handleCloseReview}
    />
  );
}
