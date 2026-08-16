import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { toUUID } from '../services/supabaseService';

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
  const location = useLocation();
  const studentId = searchParams.get('studentId');
  const navigate = useNavigate();

  const { homeworks, isLoading: hwLoading } = useHomework();
  const { submissions, isLoading: subLoading } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { questions: allBankQuestions } = useQuestionBank();
  const { bookTests, isLoading: booksLoading } = useTrackedBooks();

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
      // Check if targetId is composite (e.g. bt_hw_..._tbt_...)
      const compMatchLocal = String(targetId || '').match(/^(?:bt_|book_test_)?(hw_[^_]+)_(.+)$/);
      const subCandidateLocal = compMatchLocal ? compMatchLocal[2] : null;
      const effectiveSearchIds = [
        String(targetId),
        subCandidateLocal ? String(subCandidateLocal) : null,
        subCandidateLocal ? toUUID(subCandidateLocal) : null,
        toUUID(targetId)
      ].filter(Boolean);

      const candidates = submissions.filter(s => {
        if (studentId && String(s.studentId) !== String(studentId)) return false;
        const matchFields = [
          String(s.id || ''),
          String(s.testId || ''),
          String(s.realTestId || ''),
          String(s.bookTestId || '')
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          matchFields.push(...s.bookTestIds.map(String));
        }
        // Direct test match
        if (effectiveSearchIds.some(searchId => matchFields.includes(searchId))) return true;

        // Fallback to hwId ONLY if searchId was the hwId directly
        if (String(s.hwId) === String(targetId) || String(s.homeworkId) === String(targetId)) {
          return true;
        }
        return false;
      });

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const aEval = Boolean(a.isEvaluatedByTeacher || a.status === 'evaluated' || a.status === 'graded' || a.teacherFeedback);
          const bEval = Boolean(b.isEvaluatedByTeacher || b.status === 'evaluated' || b.status === 'graded' || b.teacherFeedback);
          if (aEval && !bEval) return -1;
          if (!aEval && bEval) return 1;
          return new Date(b.submittedAt || b.evaluatedAt || 0) - new Date(a.submittedAt || a.evaluatedAt || 0);
        });
        foundSubmission = candidates[0];
      }
    }

    // 2. Search in HomeworkContext (homeworks[].submissions)
    if ((!foundSubmission || (!foundSubmission.isEvaluatedByTeacher && foundSubmission.status !== 'evaluated')) && homeworks && Array.isArray(homeworks)) {
      for (const hw of homeworks) {
        if (String(hw.id) === String(targetId) || (hw.submissions && hw.submissions.some(s => String(s.id) === String(targetId) || String(s.submissionId) === String(targetId)))) {
          if (hw.submissions && Array.isArray(hw.submissions) && hw.submissions.length > 0) {
            const matched = hw.submissions.find(s =>
              String(s.id) === String(targetId) ||
              String(s.submissionId) === String(targetId) ||
              (studentId && String(s.studentId) === String(studentId) && (!s.testId || String(s.testId) === String(targetId)))
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

    // 3. Resolve testId from found submission or targetId
    const resolvedTestId = foundSubmission?.testId || foundSubmission?.homeworkId || targetId;
    const normalizeId = (id) => String(id || '').replace(/^hw_/, '').replace(/^q_?/, '').replace(/^bt_?/, '').replace(/^tbt_?/, '');

    // Extract composite IDs (e.g. bt_hw_..._tbt_...)
    let subCandidateId = null;
    let explicitHwId = null;
    const compMatch = String(resolvedTestId || '').match(/^(?:bt_|book_test_)?(hw_[^_]+)_(.+)$/);
    if (compMatch) {
      explicitHwId = compMatch[1];
      subCandidateId = compMatch[2];
    }

    // 5. Search in bookTests by subCandidateId or resolvedTestId
    if (!foundTest && bookTests) {
      if (subCandidateId) {
        foundTest = bookTests.find(t =>
          String(t.id) === subCandidateId ||
          toUUID(t.id) === subCandidateId ||
          String(t.id) === toUUID(subCandidateId) ||
          normalizeId(t.id) === normalizeId(subCandidateId)
        );
        if (foundTest && explicitHwId) {
          foundTest = { ...foundTest, hwId: explicitHwId };
        }
      }

      if (!foundTest) {
        foundTest = bookTests.find(t =>
          String(t.id) === String(resolvedTestId) ||
          String(t.id) === String(targetId) ||
          toUUID(t.id) === String(resolvedTestId) ||
          toUUID(t.id) === String(targetId) ||
          normalizeId(t.id) === normalizeId(resolvedTestId) ||
          normalizeId(t.id) === normalizeId(targetId)
        );
      }
    }

    // 6. Search test in homeworks
    if (!foundTest && homeworks && Array.isArray(homeworks)) {
      const searchHwId = explicitHwId || resolvedTestId;
      foundTest = homeworks.find(h =>
        String(h.id) === String(searchHwId) ||
        String(h.id) === String(targetId) ||
        toUUID(h.id) === String(searchHwId) ||
        toUUID(h.id) === String(targetId) ||
        normalizeId(h.id) === normalizeId(searchHwId) ||
        normalizeId(h.id) === normalizeId(targetId)
      );
    }

    // 6.5 Search if test is in any homework's tests list
    if (!foundTest && homeworks && Array.isArray(homeworks)) {
      const parentHw = homeworks.find(h => h.tests && Array.isArray(h.tests) && h.tests.some(t => {
        const tid = typeof t === 'object' ? t.id : String(t);
        return String(tid) === String(resolvedTestId) || String(tid) === String(targetId) || toUUID(tid) === String(resolvedTestId) || toUUID(tid) === String(targetId) || normalizeId(tid) === normalizeId(resolvedTestId);
      }));
      if (parentHw) {
        const specificTest = (bookTests || []).find(bt => String(bt.id) === String(resolvedTestId) || toUUID(bt.id) === String(resolvedTestId) || normalizeId(bt.id) === normalizeId(resolvedTestId));
        foundTest = specificTest ? { ...specificTest, hwId: parentHw.id } : parentHw;
      }
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

    // 8.2 Search by title matching if not found by ID
    if (!foundTest && foundSubmission) {
      const subTitle = (foundSubmission.testTitle || foundSubmission.title || '').trim().toLowerCase();
      if (subTitle && subTitle.length > 1) {
        const matchTitle = (t) => {
          const name = String(t?.name || t?.title || '').trim().toLowerCase();
          return name && (name === subTitle || name.includes(subTitle) || subTitle.includes(name));
        };
        foundTest = (bookTests || []).find(matchTitle)
          || (allBankQuestions || []).find(matchTitle)
          || (homeworks || []).find(matchTitle)
          || (curriculumData?.tests || []).find(matchTitle);
      }
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
            const bankQ = allBankQuestions?.find(q => String(q.id) === String(itemId)) || bookTests?.find(q => String(q.id) === String(itemId)) || (typeof item === 'object' ? item : null);
            const resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : [];
            const title = bankQ?.title || bankQ?.name || (typeof item === 'object' ? (item.title || item.name) : null) || `${idx + 1}. Bölüm`;
            const qCount = bankQ?.questionCount || bankQ?.totalQuestions || bankQ?.questionsList?.length || resolvedQuestions.length || 1;

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
            let expectedCount = currentSec.questionCount || currentSec.totalQuestions || currentSec.qCount || currentSec.bankQ?.questionCount || currentSec.bankQ?.totalQuestions || 1;
            
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
            let expectedCount = currentSec.questionCount || currentSec.totalQuestions || currentSec.qCount || currentSec.bankQ?.questionCount || currentSec.bankQ?.totalQuestions || 1;
            
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

  const isWritten = Boolean(
    test.questionType === 'yazili' ||
    test.type === 'yazili' ||
    test.contentType === 'yazili' ||
    test.questionType === 'acik_uclu' ||
    test.type === 'acik_uclu' ||
    test.contentType === 'acik_uclu' ||
    test.sourceFormat === 'yazili' ||
    test.formatType === 'yazili' ||
    test.isOpenEnded ||
    (test.questions && Array.isArray(test.questions) && test.questions.some(q => q.type === 'yazili' || q.type === 'acik_uclu' || q.contentType === 'yazili' || q.contentType === 'acik_uclu')) ||
    (questions && Array.isArray(questions) && questions.some(q => q.type === 'yazili' || q.type === 'acik_uclu' || q.contentType === 'yazili' || q.contentType === 'acik_uclu'))
  );

  const isRealStandardQuiz = Boolean(
    questions && Array.isArray(questions) && questions.length > 0 && questions.some(q => {
      if (!q.questionText) return false;
      const text = q.questionText.trim();
      if (text.length <= 10) return false;
      if (/^soru\s*\d+/i.test(text) || /^\d+\.\s*soru/i.test(text)) return false;
      return true;
    })
  );

  const hasExplicitHtmlQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'html' || q.questionType === 'html' || q.contentType === 'html' || q.formatType === 'html' || q.sourceFormat === 'html' || (q.htmlPayload && !q.options && q.type !== 'coktan_secmeli' && q.type !== 'yazili')
  ));

  const hasExplicitPdfQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'pdf' || q.questionType === 'pdf' || q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || (q.pdfPayload && !q.options && q.type !== 'coktan_secmeli' && q.type !== 'yazili')
  ));

  const isValidHtmlStr = (str) => typeof str === 'string' && (
    str.includes('<!DOCTYPE') ||
    str.includes('<html') ||
    str.includes('<body') ||
    str.includes('<div') ||
    str.includes('<script') ||
    str.includes('<style')
  );

  const isValidPdfStr = (str) => typeof str === 'string' && (
    str.startsWith('data:application/pdf') ||
    str.includes('.pdf') ||
    str.startsWith('%PDF')
  );

  const isHtml = Boolean(
    test.htmlPayload ||
    isValidHtmlStr(test.contentPayload) ||
    isValidHtmlStr(test.payload) ||
    test.sourceFormat === 'html' ||
    test.formatType === 'html' ||
    test.contentType === 'html' ||
    test.type === 'html' ||
    test.questionType === 'html' ||
    hasExplicitHtmlQuestions ||
    (test.title && String(test.title).toLowerCase().includes('html')) ||
    (test.name && String(test.name).toLowerCase().includes('html')) ||
    (submission?.testTitle && String(submission.testTitle).toLowerCase().includes('html'))
  );

  const isPdf = !isHtml && Boolean(
    test.pdfPayload ||
    test.pdfUrl ||
    isValidPdfStr(test.contentPayload) ||
    test.sourceFormat === 'pdf' ||
    test.formatType === 'pdf' ||
    test.contentType === 'pdf' ||
    test.type === 'pdf' ||
    test.questionType === 'pdf' ||
    hasExplicitPdfQuestions ||
    (test.title && String(test.title).toLowerCase().includes('pdf')) ||
    (test.name && String(test.name).toLowerCase().includes('pdf')) ||
    (submission?.testTitle && String(submission.testTitle).toLowerCase().includes('pdf'))
  );

  const isPhysical = Boolean(
    !String(test.id || '').startsWith('hw_') &&
    (
      test.sourceFormat === 'physical' ||
      test.formatType === 'physical' ||
      test.questionType === 'optik_form' ||
      test.type === 'optik_form' ||
      (test.sourceType === 'trackedBook' && !test.contentType && !test.contentPayload && !test.sections && !test.questionsList && !test.questions?.length) ||
      (submission && (submission.bookId || submission.sourceType === 'trackedBook') && !test.contentType && !test.contentPayload && !test.sections)
    )
  );

  const hasExplicitImageQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'gorsel' || q.type === 'gorsel_klasik' || q.questionType === 'gorsel_klasik' || q.contentType === 'gorsel' || q.formatType === 'image' || q.sourceFormat === 'image' || (q.imageUrls && !q.options && q.type !== 'coktan_secmeli' && q.type !== 'yazili')
  ));
  const isDefinitelyStandardForImage = isRealStandardQuiz && !hasExplicitImageQuestions;
  const isImageTest = !isHtml && !isPdf && !isPhysical && !isDefinitelyStandardForImage && Boolean(
    test.sourceFormat === 'image' || test.formatType === 'image' ||
    test.contentType === 'gorsel' || test.type === 'gorsel' || test.questionType === 'gorsel_klasik' || hasExplicitImageQuestions
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
    if (location.state?.from) {
      navigate(location.state.from, { replace: true });
      return;
    }
    const fromParam = searchParams.get('from');
    if (fromParam === 'teacher' || fromParam === 'evaluation' || searchParams.get('teacher')) {
      navigate('/evaluation', { replace: true });
    } else if (fromParam) {
      navigate(fromParam, { replace: true });
    } else {
      navigate('/student-results', { replace: true });
    }
  };

  // ── Render the correct review component based on test type ──────────────────
  // Multi-section composite homework → always MultiHomeworkRunner
  if (isMultiSection) {
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

  // Single-section tests → dispatch to the appropriate review component
  if (isPdf) {
    return (
      <PdfQuizReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={handleCloseReview}
      />
    );
  }

  if (isHtml) {
    return (
      <HtmlQuizReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={handleCloseReview}
      />
    );
  }

  if (isImageTest) {
    return (
      <ImageQuizReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={handleCloseReview}
      />
    );
  }

  if (isPhysical) {
    return (
      <PhysicalQuizReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={handleCloseReview}
      />
    );
  }

  // Default: Standard (JSON) quiz review
  return (
    <StandardQuizReview
      submission={submission}
      test={test}
      questions={questions}
      onClose={handleCloseReview}
    />
  );
}
