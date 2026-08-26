import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toUUID } from '../services/supabaseService';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';
import SingleMultipleChoiceReview from '../components/quiz/single/SingleMultipleChoiceReview';
import SingleOpenEndedReview from '../components/quiz/single/SingleOpenEndedReview';
import CompositeHomeworkReview from '../components/quiz/composite/CompositeHomeworkReview';
import { isSectionOpenEnded } from '../components/quiz/utils/quizTypeDetector';

import { resolveTestQuestions } from '../utils/testResolver';
import { findUnifiedSubmissionOrTest, normalizeUnifiedSubmission } from '../services/unifiedResultAdapter';

export default function ModularQuizReviewPage() {
  const params = useParams();
  const targetId = params.submissionId || params.testId || params.id;

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const studentId = searchParams.get('studentId') || location.state?.studentId;
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { currentUser } = useAuth();

  const { homeworks, isLoading: hwLoading } = useHomework();
  const { submissions, isLoading: subLoading } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { questions: allBankQuestions } = useQuestionBank();
  const { bookTests, books, isLoading: booksLoading } = useTrackedBooks();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    // 0. Single Source of Truth Resolution via Unified Result Adapter
    const effectiveStudentId = studentId || location.state?.submission?.studentId || currentUser?.id;
    const { submission: unifiedSub, test: unifiedTest } = findUnifiedSubmissionOrTest(targetId, {
      studentId: effectiveStudentId,
      submissions,
      homeworks,
      books,
      bookTests
    });

    let foundSubmission = location.state?.submission
      ? normalizeUnifiedSubmission(location.state.submission, { books, bookTests, homeworks })
      : unifiedSub;

    let foundTest = location.state?.test || null;

    const tbtMatch = String(targetId || '').match(/tbt_[a-zA-Z0-9_]+/);
    const extractedTbtId = tbtMatch ? tbtMatch[0] : null;
    const hwMatch = String(targetId || '').match(/hw_[a-zA-Z0-9_]+/);
    const extractedHwId = searchParams.get('hwId') || location.state?.hwId || (hwMatch ? hwMatch[0] : null);

    const normalizeId = (id) => String(id || '').replace(/^hw_/, '').replace(/^q_?/, '').replace(/^bt_?/, '').replace(/^tbt_?/, '');
    const cleanTargetId = normalizeId(targetId);

    const compMatchLocal = String(targetId || '').match(/^(?:bt_|book_test_)?(hw_[^_]+)_(.+)$/);
    const subCandidateLocal = compMatchLocal ? compMatchLocal[2] : null;
    const cleanSubCandidate = subCandidateLocal ? normalizeId(subCandidateLocal) : null;

    // 0. Check immediate local storage backups and add to pool
    const allCandidatePool = [];
    try {
      const backupKeys = [
        `sub_latest_${targetId}`,
        `sub_latest_${cleanTargetId}`,
        extractedTbtId ? `sub_latest_${extractedTbtId}` : null,
        subCandidateLocal ? `sub_latest_${subCandidateLocal}` : null,
        cleanSubCandidate ? `sub_latest_${cleanSubCandidate}` : null
      ].filter(Boolean);

      for (const k of backupKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (Array.isArray(parsed.answers) && parsed.answers.length > 0 || parsed.openEndedText)) {
            allCandidatePool.push(parsed);
          }
        }
      }
    } catch {}

    // Gather all submission sources
    if (submissions && Array.isArray(submissions)) allCandidatePool.push(...submissions);
    try {
      const l1 = JSON.parse(localStorage.getItem('eTestSubmissions') || '[]');
      const l2 = JSON.parse(localStorage.getItem('etest_submissions') || '[]');
      if (Array.isArray(l1)) allCandidatePool.push(...l1);
      if (Array.isArray(l2)) allCandidatePool.push(...l2);
    } catch {}

    if (homeworks && Array.isArray(homeworks)) {
      for (const hw of homeworks) {
        if (Array.isArray(hw.submissions)) allCandidatePool.push(...hw.submissions);
        if (Array.isArray(hw.raw_data?.submissions)) allCandidatePool.push(...hw.raw_data.submissions);
        if (hw.submission) allCandidatePool.push(hw.submission);
      }
    }

    const submissionIdParam = searchParams.get('submissionId');

    // 1. Search in all candidates pool
    if (!foundSubmission && allCandidatePool.length > 0) {
      const candidates = allCandidatePool.filter(s => {
        if (!s) return false;
        if (submissionIdParam && (String(s.id) === String(submissionIdParam) || String(s.submissionId) === String(submissionIdParam))) return true;
        if (studentId && s.studentId && String(s.studentId) !== String(studentId)) return false;

        const sId = String(s.id || '');
        const sTestId = String(s.testId || '');
        const sRealId = String(s.realTestId || '');
        const sBookTestId = String(s.bookTestId || '');
        const sHwId = String(s.hwId || s.homeworkId || '');
        const sBookTestIds = Array.isArray(s.bookTestIds) ? s.bookTestIds.map(String) : [];

        const allIds = [sId, sTestId, sRealId, sBookTestId, sHwId, ...sBookTestIds].filter(Boolean);
        const allCleanIds = allIds.map(normalizeId);

        if (allIds.includes(String(targetId))) return true;
        if (toUUID(targetId) && allIds.map(toUUID).includes(toUUID(targetId))) return true;
        if (allCleanIds.includes(cleanTargetId)) return true;
        if (extractedTbtId && (allIds.includes(extractedTbtId) || allCleanIds.includes(normalizeId(extractedTbtId)))) return true;
        if (cleanSubCandidate && allCleanIds.includes(cleanSubCandidate)) return true;
        if (subCandidateLocal && (allIds.includes(subCandidateLocal) || allCleanIds.includes(normalizeId(subCandidateLocal)))) return true;

        return false;
      });

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const aAnswers = Array.isArray(a.answers) ? a.answers.filter(x => x && x.type !== 'metadata') : [];
          const bAnswers = Array.isArray(b.answers) ? b.answers.filter(x => x && x.type !== 'metadata') : [];
          
          const aHasRealAnswers = aAnswers.length > 0;
          const bHasRealAnswers = bAnswers.length > 0;
          if (aHasRealAnswers && !bHasRealAnswers) return -1;
          if (!aHasRealAnswers && bHasRealAnswers) return 1;

          const aAnsCount = aAnswers.filter(x => (x.userAnswer !== null && x.userAnswer !== undefined && x.userAnswer !== '' && x.userAnswer !== 'empty') || (x.userAnswerText && String(x.userAnswerText).trim() !== '')).length;
          const bAnsCount = bAnswers.filter(x => (x.userAnswer !== null && x.userAnswer !== undefined && x.userAnswer !== '' && x.userAnswer !== 'empty') || (x.userAnswerText && String(x.userAnswerText).trim() !== '')).length;
          if (aAnsCount !== bAnsCount) return bAnsCount - aAnsCount;

          if (submissionIdParam) {
            const aMatch = String(a.id) === String(submissionIdParam) || String(a.submissionId) === String(submissionIdParam);
            const bMatch = String(b.id) === String(submissionIdParam) || String(b.submissionId) === String(submissionIdParam);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
          }

          const aExact = String(a.id) === String(targetId) || String(a.submissionId) === String(targetId);
          const bExact = String(b.id) === String(targetId) || String(b.submissionId) === String(targetId);
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          return new Date(b.submittedAt || b.evaluatedAt || 0) - new Date(a.submittedAt || a.evaluatedAt || 0);
        });
        foundSubmission = candidates[0];
      }
    }

    // 2. Search in HomeworkContext (homeworks[].submissions)
    if (!foundSubmission && extractedHwId && homeworks && Array.isArray(homeworks)) {
      const parentHw = homeworks.find(h => String(h.id) === extractedHwId || toUUID(h.id) === extractedHwId || normalizeId(h.id) === normalizeId(extractedHwId));
      if (parentHw) {
        const hwSubs = parentHw.submissions || parentHw.raw_data?.submissions || [];
        const matchSub = hwSubs.find(s => {
          const sid = String(s.studentId || s.student_id || s.userId || '');
          const matchStudent = !studentId || sid === String(studentId) || (toUUID(studentId) && toUUID(sid) === toUUID(studentId));
          const tid = String(s.testId || s.realTestId || s.bookTestId || '');
          const matchTest = !extractedTbtId || tid === extractedTbtId || (toUUID(extractedTbtId) && toUUID(tid) === toUUID(extractedTbtId));
          return matchStudent && matchTest;
        }) || hwSubs.find(s => String(s.id) === String(targetId) || String(s.submissionId) === String(targetId));
        if (matchSub) {
          foundSubmission = { ...matchSub, hwId: parentHw.id };
          if (!foundTest) foundTest = parentHw;
        }
      }
    }

    // 3. Resolve testId from found submission or targetId
    const resolvedTestId = foundSubmission?.testId || foundSubmission?.realTestId || foundSubmission?.bookTestId || foundSubmission?.homeworkId || targetId;

    // Extract composite IDs (e.g. bt_hw_..._tbt_...)
    let subCandidateId = null;
    let explicitHwId = null;
    const compMatch = String(resolvedTestId || '').match(/^(?:bt_|book_test_)?(hw_[^_]+)_(.+)$/);
    if (compMatch) {
      explicitHwId = compMatch[1];
      subCandidateId = compMatch[2];
    }

    // 4. Search test in homeworks
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

    // 5. Search if test is in any homework's tests list
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

    // 6. Search in allBankQuestions
    if (!foundTest && allBankQuestions && Array.isArray(allBankQuestions)) {
      foundTest = allBankQuestions.find(bq =>
        String(bq.id) === String(resolvedTestId) ||
        String(bq.id) === String(targetId) ||
        normalizeId(bq.id) === normalizeId(resolvedTestId)
      );
    }

    // 7. Search in bookTests and deep search in books
    if (!foundTest) {
      if (subCandidateId) {
        foundTest = (bookTests || []).find(t =>
          String(t.id) === subCandidateId ||
          toUUID(t.id) === subCandidateId ||
          String(t.id) === toUUID(subCandidateId) ||
          normalizeId(t.id) === normalizeId(subCandidateId)
        );
        if (foundTest && explicitHwId) {
          foundTest = { ...foundTest, hwId: explicitHwId };
        }
      }

      if (!foundTest && bookTests) {
        foundTest = bookTests.find(t =>
          String(t.id) === String(resolvedTestId) ||
          String(t.id) === String(targetId) ||
          toUUID(t.id) === String(resolvedTestId) ||
          toUUID(t.id) === String(targetId) ||
          normalizeId(t.id) === normalizeId(resolvedTestId) ||
          normalizeId(t.id) === normalizeId(targetId)
        );
      }

      if (!foundTest && books && Array.isArray(books)) {
        for (const b of books) {
          if (b.subjects && Array.isArray(b.subjects)) {
            for (const s of b.subjects) {
              if (s.tests && Array.isArray(s.tests)) {
                const ft = s.tests.find(t => String(t.id) === String(resolvedTestId) || toUUID(t.id) === String(resolvedTestId) || normalizeId(t.id) === normalizeId(resolvedTestId));
                if (ft) {
                  foundTest = { ...ft, bookId: b.id, bookTitle: b.title, subjectId: s.id, subject: s.name || b.subject };
                  break;
                }
              }
              if (s.topics && Array.isArray(s.topics)) {
                for (const tp of s.topics) {
                  if (tp.tests && Array.isArray(tp.tests)) {
                    const ft = tp.tests.find(t => String(t.id) === String(resolvedTestId) || toUUID(t.id) === String(resolvedTestId) || normalizeId(t.id) === normalizeId(resolvedTestId));
                    if (ft) {
                      foundTest = { ...ft, bookId: b.id, bookTitle: b.title, subjectId: s.id, topicId: tp.id, subject: s.name || b.subject, topic: tp.name };
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 8. Search test in curriculumData.tests
    if (!foundTest && curriculumData?.tests) {
      foundTest = curriculumData.tests.find(t =>
        String(t.id) === String(resolvedTestId) ||
        String(t.id) === String(targetId) ||
        normalizeId(t.id) === normalizeId(resolvedTestId)
      );
    }

    // 9. Search by title matching if not found by ID
    if (!foundTest && foundSubmission) {
      const subTitle = (foundSubmission.testTitle || foundSubmission.title || '').trim().toLowerCase();
      if (subTitle && subTitle.length > 1) {
        const matchTitle = (t) => {
          const name = String(t?.name || t?.title || '').trim().toLowerCase();
          return name && (name === subTitle || name.includes(subTitle) || subTitle.includes(name));
        };
        foundTest = (allBankQuestions || []).find(matchTitle)
          || (homeworks || []).find(matchTitle)
          || (curriculumData?.tests || []).find(matchTitle)
          || (bookTests || []).find(matchTitle);
      }
    }

    // 10. Check submission for embedded test object or sections
    if (!foundTest && foundSubmission) {
      const embedded = foundSubmission.test || foundSubmission.homework || foundSubmission.testDetails;
      if (embedded && (embedded.sections || embedded.questions || embedded.contentPayload || embedded.pdfPayload || embedded.questionsList)) {
        foundTest = embedded;
      }
    }

    if (!foundTest && unifiedTest) {
      foundTest = unifiedTest;
    }

    // 11. Synthetic test fallback if submission exists but test object was deleted/missing
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
        sourceFormat: foundSubmission.sourceFormat || 'digital',
        sourceType: foundSubmission.sourceType || 'questionBank'
      };
    }

    // 12. Synthetic submission fallback if test is found
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
      // 1. Resolve sections exactly like ModularQuizPage
      let sections = [];
      const questionIdList = foundTest.sections || foundTest.questionIds || foundTest.selectedQuestions || foundTest.tests || foundTest.items;

      if (Array.isArray(questionIdList) && questionIdList.length > 0) {
        sections = questionIdList.map((item, idx) => {
          const itemId = typeof item === 'object' ? (item.id || item.questionId) : item;
          const bankQ = allBankQuestions?.find(q => String(q.id) === String(itemId) || normalizeId(q.id) === normalizeId(itemId)) ||
                        bookTests?.find(q => String(q.id) === String(itemId) || normalizeId(q.id) === normalizeId(itemId)) ||
                        (typeof item === 'object' ? item : null);
          const resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (item?.questions || item?.questionsList || []);
          const title = (typeof item === 'object' ? (item.title || item.name) : null) || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`;
          const qCount = (typeof item === 'object' ? (item.questionCount || item.totalQuestions || item.qCount) : null) || bankQ?.questionCount || bankQ?.questionsList?.length || resolvedQuestions.length || 1;

          return {
            ...(bankQ || {}),
            ...(typeof item === 'object' ? item : {}),
            id: itemId || `sec_${idx}`,
            questionId: itemId,
            title,
            bankQ: bankQ || (typeof item === 'object' ? item : { id: itemId, title }),
            pdfPayload: bankQ?.pdfPayload || (typeof item === 'object' ? item.pdfPayload : null),
            contentPayload: bankQ?.contentPayload || (typeof item === 'object' ? item.contentPayload : null),
            pdfUrl: bankQ?.pdfUrl || (typeof item === 'object' ? item.pdfUrl : null),
            htmlPayload: bankQ?.htmlPayload || (typeof item === 'object' ? item.htmlPayload : null),
            contentType: (typeof item === 'object' ? item.contentType : null) || bankQ?.contentType,
            questionType: (typeof item === 'object' ? item.questionType : null) || bankQ?.questionType,
            questionCount: qCount,
            resolvedQuestions,
            questions: resolvedQuestions
          };
        });
      }

      if (sections.length > 0) {
        foundTest = { ...foundTest, sections };
      } else {
        const singleQId = (Array.isArray(questionIdList) && questionIdList.length === 1)
          ? (typeof questionIdList[0] === 'object' ? (questionIdList[0].id || questionIdList[0].questionId) : questionIdList[0])
          : (foundTest.questionIds?.[0] || foundTest.id);
        const bankQ = singleQId ? allBankQuestions?.find(q => String(q.id) === String(singleQId) || normalizeId(q.id) === normalizeId(singleQId)) : null;

        if (bankQ) {
          foundTest = {
            ...bankQ,
            ...foundTest,
            correctAnswer: bankQ.correctAnswer ?? foundTest.correctAnswer,
            answerKey: bankQ.answerKey ?? foundTest.answerKey,
            questionCount: bankQ.questionCount || bankQ.questionsList?.length || (Array.isArray(bankQ.answerKey) ? bankQ.answerKey.length : 1),
            totalQuestions: bankQ.questionCount || bankQ.questionsList?.length || (Array.isArray(bankQ.answerKey) ? bankQ.answerKey.length : 1),
            isOpenEnded: bankQ.isOpenEnded || bankQ.type === 'acik_uclu' || bankQ.contentType === 'acik_uclu' || foundTest.isOpenEnded
          };
        }
      }

      // 2. Resolve questions
      let testQs = resolveTestQuestions(foundTest, allBankQuestions);

      // 3. Fallback to submission.questionsList if available
      if ((!testQs || testQs.length === 0) && foundSubmission?.questionsList && Array.isArray(foundSubmission.questionsList) && foundSubmission.questionsList.length > 0) {
        testQs = foundSubmission.questionsList.map((q, idx) => ({
          ...q,
          questionNo: idx + 1,
          questionText: q.text || q.questionText || `Soru ${idx + 1}`
        }));
      }

      // 4. Fallback to submission.answers if still empty
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
            userAnswer: ans.userAnswer,
            userAnswerText: ans.userAnswerText
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
    } else if (foundSubmission && !foundTest) {
      const candidateTestId = foundSubmission.testId || foundSubmission.realTestId || foundSubmission.bookTestId || extractedTbtId || extractedHwId || targetId;
      const isSubWritten = Boolean(
        foundSubmission.isOpenEnded ||
        foundSubmission.questionType === 'yazili' ||
        foundSubmission.questionType === 'acik_uclu' ||
        foundSubmission.type === 'yazili' ||
        foundSubmission.type === 'acik_uclu' ||
        foundSubmission.sourceFormat === 'yazili' ||
        foundSubmission.formatType === 'yazili' ||
        foundSubmission.openEndedText ||
        foundSubmission.openEndedAnswers ||
        (foundSubmission.testTitle && (foundSubmission.testTitle.toLowerCase().includes('yazılı') || foundSubmission.testTitle.toLowerCase().includes('açık uçlu') || foundSubmission.testTitle.toLowerCase().includes('acik uclu'))) ||
        (Array.isArray(foundSubmission.answers) && foundSubmission.answers.some(a => a.isOpenEnded || a.userAnswerText || (typeof a.userAnswer === 'string' && a.userAnswer.length > 2)))
      );

      const resolvedT = (allBankQuestions || []).find(q => String(q.id) === String(candidateTestId) || toUUID(q.id) === String(candidateTestId) || normalizeId(q.id) === normalizeId(candidateTestId)) ||
                        (homeworks || []).find(h => String(h.id) === String(candidateTestId) || toUUID(h.id) === String(candidateTestId) || normalizeId(h.id) === normalizeId(candidateTestId)) ||
                        (bookTests || []).find(bt => String(bt.id) === String(candidateTestId) || toUUID(bt.id) === String(candidateTestId) || normalizeId(bt.id) === normalizeId(candidateTestId)) || {
                          id: candidateTestId,
                          title: foundSubmission.testTitle || foundSubmission.title || 'İnceleme Testi',
                          questionCount: foundSubmission.totalQuestions || (Array.isArray(foundSubmission.answers) ? foundSubmission.answers.length : 12),
                          type: isSubWritten ? 'acik_uclu' : (foundSubmission.sourceType === 'questionBank' ? 'coktan_secmeli' : (foundSubmission.sourceType === 'optik' ? 'optik_form' : 'coktan_secmeli')),
                          questionType: isSubWritten ? 'acik_uclu' : (foundSubmission.sourceType === 'questionBank' ? 'coktan_secmeli' : (foundSubmission.sourceType === 'optik' ? 'optik_form' : 'coktan_secmeli')),
                          sourceFormat: isSubWritten ? 'yazili' : (foundSubmission.sourceType === 'questionBank' ? 'digital' : (foundSubmission.sourceType === 'optik' ? 'physical' : 'digital')),
                          isOpenEnded: isSubWritten
                        };
      setTest(resolvedT);
      const fallbackQs = resolveTestQuestions(resolvedT, allBankQuestions);
      setQuestions(fallbackQs || []);
      foundTest = resolvedT;
    } else if (!foundSubmission && foundTest) {
      foundSubmission = {
        id: targetId,
        testId: foundTest.id,
        testTitle: foundTest.title || foundTest.name || 'Test İnceleme',
        studentId: studentId || currentUser?.id,
        answers: [],
        totalQuestions: foundTest.questionCount || 12
      };
    }

    if (foundSubmission) {
      if ((!foundSubmission.answers || foundSubmission.answers.length === 0) && (foundSubmission.studentAnswers || foundSubmission.answersMap)) {
        const sAnswers = foundSubmission.studentAnswers || foundSubmission.answersMap || {};
        const ak = foundTest?.answerKey || foundTest?.answers || {};
        const qCount = foundTest?.questionCount || Object.keys(sAnswers).length || 12;
        const generatedAnswers = [];
        for (let i = 1; i <= qCount; i++) {
          const uAns = sAnswers[i] ?? sAnswers[String(i)] ?? null;
          const cAns = ak[i] ?? ak[String(i)] ?? (Array.isArray(ak) ? ak[i - 1] : null);
          const isCorr = (uAns && cAns) ? String(uAns).trim().toUpperCase() === String(cAns).trim().toUpperCase() : null;
          generatedAnswers.push({
            questionNo: i,
            userAnswer: uAns,
            correctAnswer: cAns,
            isCorrect: isCorr
          });
        }
        foundSubmission = { ...foundSubmission, answers: generatedAnswers };
      }
      setSubmission(foundSubmission);
    }

    setLoading(false);
  }, [targetId, studentId, homeworks, submissions, curriculumData, allBankQuestions, bookTests]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 800 }}>
        İnceleme Raporu Yükleniyor...
      </div>
    );
  }

  if (!test || !submission) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>📋</div>
        <h2 style={{ margin: 0, color: 'var(--color-text)', fontWeight: 900 }}>İnceleme Raporu Bulunamadı</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0, maxWidth: 420 }}>Bu sınava ait herhangi bir tamamlanmış çözüm kaydı bulunamadı.</p>
        <button onClick={() => navigate('/student', { replace: true })} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
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
    submission?.isOpenEnded ||
    submission?.questionType === 'yazili' ||
    submission?.questionType === 'acik_uclu' ||
    submission?.type === 'yazili' ||
    submission?.type === 'acik_uclu' ||
    submission?.contentType === 'yazili' ||
    submission?.contentType === 'acik_uclu' ||
    submission?.openEndedText ||
    submission?.openEndedAnswers ||
    (test.title && (
      test.title.toLowerCase().includes('açık uçlu') ||
      test.title.toLowerCase().includes('acik uclu') ||
      test.title.toLowerCase().includes('yazılı') ||
      test.title.toLowerCase().includes('yazili') ||
      test.title.toLowerCase().includes('klasik')
    )) ||
    (test.name && (
      test.name.toLowerCase().includes('açık uçlu') ||
      test.name.toLowerCase().includes('acik uclu') ||
      test.name.toLowerCase().includes('yazılı') ||
      test.name.toLowerCase().includes('yazili') ||
      test.name.toLowerCase().includes('klasik')
    )) ||
    (submission?.testTitle && (
      submission.testTitle.toLowerCase().includes('açık uçlu') ||
      submission.testTitle.toLowerCase().includes('acik uclu') ||
      submission.testTitle.toLowerCase().includes('yazılı') ||
      submission.testTitle.toLowerCase().includes('yazili') ||
      submission.testTitle.toLowerCase().includes('klasik')
    )) ||
    (test.questions && Array.isArray(test.questions) && test.questions.some(q => q.type === 'yazili' || q.type === 'acik_uclu' || q.contentType === 'yazili' || q.contentType === 'acik_uclu' || q.isOpenEnded)) ||
    (questions && Array.isArray(questions) && questions.some(q => q.type === 'yazili' || q.type === 'acik_uclu' || q.contentType === 'yazili' || q.contentType === 'acik_uclu' || q.isOpenEnded)) ||
    (submission?.answers && Array.isArray(submission.answers) && submission.answers.some(a => a.isOpenEnded || a.userAnswerText || (typeof a.userAnswer === 'string' && a.userAnswer.length > 2)))
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

  const hasExplicitImageQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'gorsel' || q.type === 'gorsel_klasik' || q.questionType === 'gorsel_klasik' || q.contentType === 'gorsel' || q.formatType === 'image' || q.sourceFormat === 'image' || (q.imageUrls && q.imageUrls.length > 0) || (q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl !== '[STORED_IN_INDEXEDDB]')
  ));

  const isImageTest = !isHtml && !isPdf && Boolean(
    test.sourceFormat === 'image' || test.formatType === 'image' ||
    test.contentType === 'gorsel' || test.type === 'gorsel' || test.questionType === 'gorsel_klasik' || hasExplicitImageQuestions ||
    Boolean(test.imageUrl || (test.imageUrls && test.imageUrls.length > 0)) ||
    (typeof test.contentPayload === 'string' && test.contentPayload.startsWith('data:image'))
  );

  // Paper book tests, optical form tests, and tracked book tests (ONLY if not written / open-ended)
  const isBookOrOptical = !isWritten && !isSectionOpenEnded(test) && Boolean(
    test.sourceFormat === 'physical' ||
    test.formatType === 'physical' ||
    test.questionType === 'optik_form' ||
    test.type === 'optik_form' ||
    test.sourceType === 'trackedBook' ||
    test.sourceType === 'bookTest' ||
    test.isBookAssignment ||
    test.isPhysical ||
    (Boolean(test.bookId || test.bookTestId || submission?.bookId || submission?.bookTestId) && !test.questions?.length && (!questions || questions.length === 0)) ||
    submission?.sourceType === 'trackedBook' ||
    submission?.sourceType === 'bookTest' ||
    submission?.sourceType === 'optik' ||
    (test.title && (test.title.includes('(Tüm Kitap Görevi)') || test.title.includes('(Tüm Kitap)') || test.title.includes('(Kendi Eklediğim)')))
  );

  const isPhysical = !isHtml && !isPdf && !isImageTest && !isWritten && !isSectionOpenEnded(test) && isBookOrOptical;

  const hasMultipleDistinctSections = Boolean(
    (test.sections && Array.isArray(test.sections) && test.sections.length > 1) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 1) ||
    (test.questionIds && Array.isArray(test.questionIds) && test.questionIds.length > 1) ||
    (submission.sections && Array.isArray(submission.sections) && submission.sections.length > 1)
  );

  const isMultiSection = !isPhysical && (hasMultipleDistinctSections || Boolean(
    test.isBulk ||
    test.isMulti ||
    test.isComposite
  ));

  const isSingleOE = !isMultiSection && !isPdf && !isHtml && !isPhysical && !isImageTest && (isWritten || isSectionOpenEnded(test));

  const isTeacher = Boolean(
    currentUser?.role === 'teacher' ||
    currentUser?.role === 'admin' ||
    searchParams.get('teacher') === 'true' ||
    searchParams.get('from') === 'teacher' ||
    searchParams.get('from') === 'evaluation'
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
      navigate('/student', { replace: true });
    }
  };

  // ── Render the correct review component based on test type ──────────────────
  // 1. Multi-section composite homework
  if (isMultiSection) {
    return (
      <CompositeHomeworkReview
        test={test}
        questions={questions}
        submission={submission}
        isTeacher={isTeacher}
        onClose={handleCloseReview}
      />
    );
  }

  // 2. Single PDF Review
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

  // 3. Single HTML Review
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

  // 4. Single Image Review
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

  // 5. Single Open-Ended Review / Teacher Grading
  if (isSingleOE) {
    return (
      <SingleOpenEndedReview
        submission={submission}
        test={test}
        questions={questions}
        isTeacher={isTeacher}
        onClose={handleCloseReview}
      />
    );
  }

  // 6. Physical Exam Review
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

  // 7. Default: Single Multiple-Choice Review
  return (
    <SingleMultipleChoiceReview
      submission={submission}
      test={test}
      questions={questions}
      onClose={handleCloseReview}
    />
  );
}
