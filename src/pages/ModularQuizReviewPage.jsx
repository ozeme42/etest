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
import RemedialQuizReview from '../components/quiz/remedial/RemedialQuizReview';
import { isSectionOpenEnded, isMultipleChoice } from '../components/quiz/utils/quizTypeDetector';

import { resolveTestQuestions, isExamBook } from '../utils/testResolver';
import { findUnifiedSubmissionOrTest, normalizeUnifiedSubmission } from '../services/unifiedResultAdapter';
import { extractImageUrls } from '../components/quiz/common/ImageLightbox';
import { idbGetPayload } from '../services/indexedDbService';

export default function ModularQuizReviewPage() {
  const params = useParams();
  const targetId = params.submissionId || params.testId || params.id;

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const studentId = searchParams.get('studentId') || location.state?.studentId;
  const fromPath = searchParams.get('from') || location.state?.from || '/student';
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
      const rawStored = localStorage.getItem('eTestSubmissions') || localStorage.getItem('etest_submissions');
      if (rawStored) {
        const l = JSON.parse(rawStored);
        if (Array.isArray(l)) allCandidatePool.push(...l);
      }
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
      const candidateHwId = explicitHwId || foundSubmission?.hwId || foundSubmission?.homeworkId || extractedHwId || (String(targetId || '').startsWith('hw_') ? targetId : null) || resolvedTestId;
      foundTest = homeworks.find(h =>
        String(h.id) === String(candidateHwId) ||
        String(h.id) === String(targetId) ||
        toUUID(h.id) === String(candidateHwId) ||
        toUUID(h.id) === String(targetId) ||
        normalizeId(h.id) === normalizeId(candidateHwId) ||
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

    // If foundTest has no sections, but foundSubmission has an associated parent homework with multiple sections, link to parent homework:
    if (foundTest && (!foundTest.sections || foundTest.sections.length <= 1) && homeworks && Array.isArray(homeworks)) {
      const parentHwId = foundSubmission?.hwId || foundSubmission?.homeworkId || extractedHwId;
      if (parentHwId) {
        const parentHw = homeworks.find(h =>
          String(h.id) === String(parentHwId) ||
          toUUID(h.id) === String(parentHwId) ||
          normalizeId(h.id) === normalizeId(parentHwId)
        );
        if (parentHw && (parentHw.sections?.length > 1 || parentHw.questionIds?.length > 1 || parentHw.tests?.length > 1)) {
          foundTest = parentHw;
        }
      }
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
        questionsList: foundSubmission.questionsList || [],
        imageUrl: foundSubmission.imageUrl || (foundSubmission.imageUrls && foundSubmission.imageUrls[0]) || '',
        imageUrls: foundSubmission.imageUrls || [],
        contentPayload: foundSubmission.contentPayload || '',
        questionCount: foundSubmission.totalQuestions || (foundSubmission.answers?.length) || 1,
        sourceFormat: foundSubmission.sourceFormat || 'digital',
        sourceType: foundSubmission.sourceType || 'questionBank',
        isRemedial: foundSubmission.isRemedial || false,
        isRemedialTest: foundSubmission.isRemedialTest || false
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

      // 2. Resolve questions from test structure
      let testQs = resolveTestQuestions(foundTest, allBankQuestions) || [];

      // Calculate target total questions count from all available clues
      const expectedQCount = Math.max(
        testQs.length,
        foundSubmission?.answers?.length || 0,
        foundSubmission?.questionsList?.length || 0,
        foundSubmission?.totalQuestions || 0,
        foundTest.questionCount || 0,
        foundTest.totalQuestions || 0,
        foundTest.questionsList?.length || 0
      );

      // Helper to check if text is empty or a placeholder
      const isPlaceholder = (txt) => !txt || typeof txt !== 'string' || txt.trim() === '' || /^(soru\s*\d+|\d+\.\s*bölüm|bölüm\s*\d+|genel test)/i.test(txt.trim());

      // 3. If testQs has fewer items than expected or is empty, build/expand from submission.questionsList or submission.answers
      if (testQs.length < expectedQCount) {
        const expanded = [];
        for (let i = 0; i < expectedQCount; i++) {
          const qNo = i + 1;
          const existingQ = testQs[i] || {};
          const subQ = (foundSubmission?.questionsList && foundSubmission.questionsList[i]) || (foundTest.questionsList && foundTest.questionsList[i]) || {};
          const subAns = (foundSubmission?.answers && (foundSubmission.answers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo) || foundSubmission.answers[i])) || {};

          let resolvedText = null;
          if (!isPlaceholder(existingQ.questionText)) resolvedText = existingQ.questionText;
          else if (!isPlaceholder(existingQ.text)) resolvedText = existingQ.text;
          else if (!isPlaceholder(subQ.questionText)) resolvedText = subQ.questionText;
          else if (!isPlaceholder(subQ.text)) resolvedText = subQ.text;
          else if (!isPlaceholder(subAns.questionText)) resolvedText = subAns.questionText;
          else if (!isPlaceholder(subAns.text)) resolvedText = subAns.text;
          else if (expectedQCount === 1 && !isPlaceholder(foundTest.questionText)) resolvedText = foundTest.questionText;
          else resolvedText = existingQ.questionText || `Soru ${qNo}`;

          const finalOptions = (existingQ.options && existingQ.options.length > 0)
            ? existingQ.options
            : ((subQ.options && subQ.options.length > 0)
                ? subQ.options
                : ((expectedQCount === 1 && foundTest.options && foundTest.options.length > 0) ? foundTest.options : (existingQ.options || [])));

          expanded.push({
            ...existingQ,
            ...subQ,
            ...subAns,
            id: existingQ.id || subQ.id || subAns.questionId || `q_${qNo}`,
            questionNo: qNo,
            questionText: resolvedText,
            options: finalOptions,
            userAnswer: subAns.userAnswer ?? existingQ.userAnswer,
            userAnswerText: subAns.userAnswerText || subAns.studentAnswerText || existingQ.userAnswerText || ''
          });
        }
        testQs = expanded;
      } else {
        // Even if length is sufficient, enrich questionText if placeholder
        testQs = testQs.map((q, idx) => {
          const qNo = idx + 1;
          const subQ = (foundSubmission?.questionsList && foundSubmission.questionsList[idx]) || (foundTest.questionsList && foundTest.questionsList[idx]) || {};
          const subAns = (foundSubmission?.answers && (foundSubmission.answers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo) || foundSubmission.answers[idx])) || {};

          let resolvedText = q.questionText;
          if (isPlaceholder(resolvedText)) {
            if (!isPlaceholder(q.text)) resolvedText = q.text;
            else if (!isPlaceholder(subQ.questionText)) resolvedText = subQ.questionText;
            else if (!isPlaceholder(subQ.text)) resolvedText = subQ.text;
            else if (!isPlaceholder(subAns.questionText)) resolvedText = subAns.questionText;
            else if (!isPlaceholder(subAns.text)) resolvedText = subAns.text;
            else if (expectedQCount === 1 && !isPlaceholder(foundTest.questionText)) resolvedText = foundTest.questionText;
          }

          const finalOptions = (q.options && q.options.length > 0)
            ? q.options
            : ((subQ.options && subQ.options.length > 0)
                ? subQ.options
                : ((expectedQCount === 1 && foundTest.options && foundTest.options.length > 0) ? foundTest.options : (q.options || [])));

          return {
            ...q,
            options: finalOptions,
            questionText: resolvedText || q.questionText || `Soru ${qNo}`,
            userAnswerText: q.userAnswerText || subAns.userAnswerText || subAns.studentAnswerText || ''
          };
        });
      }

      setTest(foundTest);
      setQuestions(testQs || []);
    } else if (foundSubmission && !foundTest) {
      const candidateTestId = foundSubmission.testId || foundSubmission.realTestId || foundSubmission.bookTestId || extractedTbtId || extractedHwId || targetId;
      const hasOptionAnswers = Array.isArray(foundSubmission.answers) && foundSubmission.answers.some(a => 
        typeof a.userAnswer === 'number' || (typeof a.userAnswer === 'string' && /^[A-Ea-e0-4]$/.test(a.userAnswer.trim()))
      );
      const isSubExplicitMC = (foundSubmission.questionType === 'coktan_secmeli' || foundSubmission.type === 'coktan_secmeli') && !foundSubmission.isOpenEnded;

      const isSubWritten = !isSubExplicitMC && (Boolean(
        foundSubmission.isOpenEnded ||
        foundSubmission.questionType === 'acik_uclu' ||
        foundSubmission.type === 'acik_uclu' ||
        foundSubmission.openEndedText ||
        foundSubmission.openEndedAnswers ||
        (foundSubmission.testTitle && (foundSubmission.testTitle.toLowerCase().includes('açık uçlu') || foundSubmission.testTitle.toLowerCase().includes('acik uclu') || foundSubmission.testTitle.toLowerCase().includes('klasik soru') || foundSubmission.testTitle.toLowerCase().includes('yazılı klasik'))) ||
        (Array.isArray(foundSubmission.answers) && foundSubmission.answers.some(a => a.isOpenEnded || (a.userAnswerText && String(a.userAnswerText).trim() !== '')))
      ) || !hasOptionAnswers);

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
      // If this submission belongs to a physical exam or deneme, redirect to /physical-exam/:hwId
      const isBookTest = Boolean(
        foundTest?.bookTestId ||
        foundSubmission.bookTestId ||
        foundTest?.book_id ||
        foundTest?.bookId ||
        foundSubmission.bookId
      );
      const isPhysicalExam = !isBookTest && Boolean(
        foundTest?.type === 'physicalExam' ||
        foundSubmission.type === 'physicalExam' ||
        foundSubmission.contentType === 'physicalExam' ||
        foundTest?.contentType === 'physicalExam' ||
        foundSubmission.isPhysical ||
        foundTest?.isPhysical ||
        (isExamBook(foundTest) && !foundTest?.bookId) ||
        (isExamBook(foundSubmission) && !foundSubmission?.bookId) ||
        (foundSubmission.title && !foundSubmission.bookId && (foundSubmission.title.toLowerCase().includes('deneme') || foundSubmission.title.toLowerCase().includes('hazır bulunuşluk') || foundSubmission.title.toLowerCase().includes('hazir bulunusluk')))
      );

      if (isPhysicalExam) {
        const physHwId = foundSubmission.hwId || foundSubmission.bookId || foundTest?.id || foundSubmission.testId || targetId;
        if (physHwId) {
          navigate(`/physical-exam/${physHwId}?studentId=${effectiveStudentId}&from=${fromPath || '/student'}`, {
            replace: true,
            state: { from: fromPath || '/student', submission: foundSubmission }
          });
          return;
        }
      }

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
  }, [targetId, studentId, homeworks, submissions, curriculumData, allBankQuestions, bookTests, navigate, fromPath, currentUser]);

  useEffect(() => {
    let isMounted = true;
    async function restoreTestPayload() {
      if (!test?.id) return;
      const isMissingPayload = !test.contentPayload || test.contentPayload === '[STORED_IN_INDEXEDDB]' || test.contentPayload === '[LOCALSTORAGE_CACHE]';
      const isMissingImage = (!test.imageUrl && (!test.imageUrls || test.imageUrls.length === 0)) || test.imageUrl === '[STORED_IN_INDEXEDDB]';
      const isMissingPdf = (!test.pdfPayload && !test.pdfUrl) || test.pdfPayload === '[STORED_IN_INDEXEDDB]';

      if (isMissingPayload || isMissingImage || isMissingPdf) {
        const idList = [
          test.id,
          test.id?.replace(/^q_/, ''),
          test.id?.replace(/^hw_/, ''),
          test.sourceTestId,
          test.testId,
          ...(test.questionIds || []),
          ...(test.selectedQuestions || [])
        ].filter(Boolean);

        for (const item of idList) {
          const strId = typeof item === 'object' ? (item.id || item.questionId) : String(item);
          const variants = [
            strId,
            `q_${strId.replace(/^q_|^hw_/, '')}`,
            `hw_${strId.replace(/^q_|^hw_/, '')}`
          ];

          for (const v of variants) {
            try {
              const val = await idbGetPayload(v);
              if (val && typeof val === 'string' && val.length > 20 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
                const isPdfData = val.startsWith('data:application/pdf') || val.startsWith('%PDF-');
                const isImgData = val.startsWith('data:image/') || val.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(val);
                const updatedTest = {
                  ...test,
                  contentPayload: val,
                  pdfPayload: isPdfData ? val : test.pdfPayload,
                  imageUrl: isImgData ? val : test.imageUrl,
                  imageUrls: isImgData ? (test.imageUrls?.length > 1 ? test.imageUrls : [val]) : test.imageUrls
                };
                setTest(updatedTest);
                const reResolved = resolveTestQuestions(updatedTest, allBankQuestions);
                if (reResolved && reResolved.length > 0) {
                  setQuestions(reResolved);
                }
                return;
              }
            } catch (e) {}
          }
        }
      }
    }

    restoreTestPayload();
    return () => { isMounted = false; };
  }, [test?.id, test?.contentPayload, allBankQuestions]);

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

  const isExplicitOpenEnded = Boolean(
    submission?.isOpenEnded === true ||
    submission?.is_open_ended === true ||
    test.isOpenEnded === true ||
    test.is_open_ended === true ||
    submission?.questionType === 'acik_uclu' ||
    submission?.type === 'acik_uclu' ||
    test.questionType === 'acik_uclu' ||
    test.type === 'acik_uclu' ||
    test.contentType === 'acik_uclu' ||
    test.type === 'gorsel_klasik' ||
    test.questionType === 'gorsel_klasik' ||
    test.answerKey?.__meta?.isOpenEnded === true ||
    test.answerKey?.__meta?.questionType === 'acik_uclu' ||
    test.answer_key?.__meta?.isOpenEnded === true ||
    test.answer_key?.__meta?.questionType === 'acik_uclu' ||
    isSectionOpenEnded(test) ||
    isSectionOpenEnded(submission) ||
    (submission?.openEndedText && typeof submission.openEndedText === 'object' && Object.values(submission.openEndedText).some(v => v && String(v).trim().length > 0)) ||
    (submission?.answers && Array.isArray(submission.answers) && submission.answers.some(a => a.isOpenEnded === true || (a.userAnswerText && typeof a.userAnswerText === 'string' && a.userAnswerText.trim() !== '' && (a.userAnswer === null || a.userAnswer === undefined))))
  );

  const isMultipleChoiceTest = !isExplicitOpenEnded && Boolean(
    isMultipleChoice(test) ||
    (Array.isArray(test.options) && test.options.filter(Boolean).length >= 2) ||
    test.questionType === 'coktan_secmeli' ||
    test.type === 'coktan_secmeli' ||
    (questions && questions.length > 0 && questions.some(q => isMultipleChoice(q) && hasMeaningfulOptions(q.options))) ||
    (test.questions && Array.isArray(test.questions) && test.questions.some(q => isMultipleChoice(q) && hasMeaningfulOptions(q.options)))
  );

  const isWritten = isExplicitOpenEnded || (!isMultipleChoiceTest && (
    isSectionOpenEnded(test) ||
    Boolean(
      test.questionType === 'acik_uclu' ||
      test.type === 'acik_uclu' ||
      test.contentType === 'acik_uclu' ||
      test.type === 'gorsel_klasik' ||
      test.questionType === 'gorsel_klasik' ||
      test.isOpenEnded === true ||
      test.is_open_ended === true ||
      submission?.isOpenEnded === true ||
      submission?.questionType === 'acik_uclu' ||
      submission?.type === 'acik_uclu' ||
      (submission?.openEndedText && typeof submission.openEndedText === 'object' && Object.values(submission.openEndedText).some(v => v && String(v).trim().length > 0)) ||
      (test.title && (
        test.title.toLowerCase().includes('açık uçlu') ||
        test.title.toLowerCase().includes('acik uclu')
      )) ||
      (test.name && (
        test.name.toLowerCase().includes('açık uçlu') ||
        test.name.toLowerCase().includes('acik uclu')
      )) ||
      (submission?.testTitle && (
        submission.testTitle.toLowerCase().includes('açık uçlu') ||
        submission.testTitle.toLowerCase().includes('acik uclu')
      ))
    )
  ));

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
    str.startsWith('JVBERi0') ||
    str.startsWith('%PDF') ||
    (str.includes('.pdf') && !str.includes('<html') && !str.includes('<!DOCTYPE'))
  );

  const isHtml = isValidHtmlStr(test.contentPayload) || isValidHtmlStr(test.payload) || Boolean(
    test.htmlPayload ||
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

  const isPdf = !isHtml && !isValidHtmlStr(test.contentPayload) && !isValidHtmlStr(test.payload) && Boolean(
    test.pdfPayload ||
    test.pdfUrl ||
    isValidPdfStr(test.contentPayload) ||
    test.sourceFormat === 'pdf' ||
    test.formatType === 'pdf' ||
    test.contentType === 'pdf' ||
    test.type === 'pdf' ||
    test.questionType === 'pdf' ||
    hasExplicitPdfQuestions ||
    (test.title && String(test.title).toLowerCase().includes('pdf') && !test.options?.length) ||
    (test.name && String(test.name).toLowerCase().includes('pdf') && !test.options?.length) ||
    (submission?.testTitle && String(submission.testTitle).toLowerCase().includes('pdf'))
  );

  const hasExplicitImageQuestions = Boolean(questions && Array.isArray(questions) && questions.some(q => 
    q.type === 'gorsel' || q.type === 'gorsel_klasik' || q.questionType === 'gorsel_klasik' || q.contentType === 'gorsel' || q.formatType === 'image' || q.sourceFormat === 'image' || (q.imageUrls && q.imageUrls.length > 0) || (q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl !== '[STORED_IN_INDEXEDDB]')
  ));

  const isImageTest = !isHtml && !isPdf && Boolean(
    test.isRemedialTest || test.sourceType === 'pdfSlicer' ||
    test.sourceFormat === 'image' || test.formatType === 'image' ||
    test.contentType === 'gorsel' || test.type === 'gorsel' || test.questionType === 'gorsel_klasik' || hasExplicitImageQuestions ||
    Boolean(test.imageUrl || (test.imageUrls && test.imageUrls.length > 0)) ||
    extractImageUrls(test).length > 0 ||
    (questions && questions.some(q => extractImageUrls(q).length > 0)) ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:image') || test.contentPayload.startsWith('http') || test.contentPayload.includes('.png') || test.contentPayload.includes('.jpg')))
  );

  const isExplicitImageOrDigital = Boolean(
    isImageTest ||
    test.isRemedialTest ||
    test.sourceType === 'pdfSlicer' ||
    test.contentType === 'gorsel' ||
    test.type === 'gorsel' ||
    (questions && questions.some(q => q.imageUrl || (q.imageUrls && q.imageUrls.length > 0) || q.contentPayload?.startsWith?.('data:image') || q.contentType === 'gorsel'))
  );

  const hasDigitalQuestions = Boolean(
    (questions && questions.length > 0 && questions.some(q => (q.questionText && q.questionText.trim().length > 0) || (Array.isArray(q.options) && q.options.length > 1))) ||
    test.questionText ||
    (Array.isArray(test.options) && test.options.length > 1) ||
    test.contentType === 'text' ||
    test.contentType === 'json' ||
    (test.questionsList && test.questionsList.length > 0)
  );

  const isHomework = Boolean(
    String(test.id || '').startsWith('hw_') ||
    String(submission?.testId || '').startsWith('hw_') ||
    String(submission?.hwId || '').startsWith('hw_') ||
    test.questionIds?.length > 0
  );

  // Paper book tests, optical form tests, and tracked book tests (ONLY if not written / open-ended, NOT homework, NO digital questions, and NOT digital/image/remedial/pdf)
  const isBookOrOptical = !isHomework && !hasDigitalQuestions && !isExplicitOpenEnded && !isExplicitImageOrDigital && !isWritten && !isPdf && !isHtml && !isSectionOpenEnded(test) && Boolean(
    test.isBookAssignment ||
    test.sourceType === 'trackedBook' ||
    test.sourceType === 'bookTest' ||
    test.sourceType === 'book' ||
    test.sourceType === 'study_room_optical' ||
    submission?.sourceType === 'trackedBook' ||
    submission?.sourceType === 'bookTest' ||
    submission?.sourceType === 'book' ||
    submission?.sourceType === 'study_room_optical' ||
    submission?.typeKey === 'book' ||
    submission?.type === 'book' ||
    submission?.isManual === true ||
    submission?.sourceType === 'manual_test' ||
    test.sourceFormat === 'physical' ||
    test.formatType === 'physical' ||
    test.questionType === 'optik_form' ||
    test.type === 'optik_form' ||
    test.isPhysical ||
    String(test.id || '').startsWith('bt_') ||
    String(test.id || '').startsWith('tbt_') ||
    String(submission?.testId || '').startsWith('bt_') ||
    String(submission?.testId || '').startsWith('tbt_') ||
    String(submission?.id || '').startsWith('bt_') ||
    String(submission?.id || '').startsWith('tbt_') ||
    (test.bookId && test.bookId !== null && String(test.bookId).trim() !== '' && !String(test.id).startsWith('hw_')) ||
    (submission?.bookId && submission?.bookId !== null && String(submission?.bookId).trim() !== '' && !String(submission?.testId).startsWith('hw_')) ||
    (bookTests && Array.isArray(bookTests) && bookTests.some(bt => 
      String(bt.id) === String(test.id) || 
      String(bt.id) === String(submission?.testId) || 
      (toUUID(bt.id) && (toUUID(bt.id) === toUUID(test.id) || toUUID(bt.id) === toUUID(submission?.testId)))
    ))
  );

  const isPhysical = !isHomework && !hasDigitalQuestions && !isExplicitOpenEnded && !isExplicitImageOrDigital && !isHtml && !isPdf && !isWritten && !isSectionOpenEnded(test) && (isBookOrOptical || Boolean(
    test.sourceFormat === 'physical' ||
    test.formatType === 'physical' ||
    test.questionType === 'optik_form' ||
    test.type === 'optik_form'
  ));

  const hasMultipleDistinctSections = Boolean(
    (test.sections && Array.isArray(test.sections) && test.sections.length > 1) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 1) ||
    (test.questionIds && Array.isArray(test.questionIds) && test.questionIds.length > 1) ||
    (test.items && Array.isArray(test.items) && test.items.length > 1) ||
    (test.selectedQuestions && Array.isArray(test.selectedQuestions) && test.selectedQuestions.length > 1) ||
    (submission.sections && Array.isArray(submission.sections) && submission.sections.length > 1) ||
    (submission.answers && Array.isArray(submission.answers) && new Set(submission.answers.map(a => a.sectionId || a.sectionIndex).filter(x => x !== undefined && x !== null)).size > 1)
  );

  const isMultiSection = !isPhysical && !isBookOrOptical && (hasMultipleDistinctSections || Boolean(
    test.isBulk ||
    test.isMulti ||
    test.isComposite
  ));

  const isSingleOE = isExplicitOpenEnded || (!isMultiSection && !isPhysical && !isBookOrOptical && !isPdf && !isHtml && !isImageTest && !isMultipleChoiceTest && (isWritten || isSectionOpenEnded(test)));

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
  const isRemedial = Boolean(
    test?.isRemedial === true ||
    test?.isRemedialTest === true ||
    test?.sourceType === 'pdfSlicerRemedial' ||
    submission?.isRemedial === true ||
    submission?.isRemedialTest === true ||
    /özel\s*telafi|telafi\s*testi/i.test(test?.title || '') ||
    /özel\s*telafi|telafi\s*testi/i.test(test?.name || '') ||
    /özel\s*telafi|telafi\s*testi/i.test(submission?.title || '') ||
    /özel\s*telafi|telafi\s*testi/i.test(submission?.testTitle || '')
  );

  // 0. Dedicated Remedial Test Review
  if (isRemedial) {
    return (
      <RemedialQuizReview
        test={test}
        questions={questions}
        submission={submission}
        onClose={handleCloseReview}
      />
    );
  }

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

  // 2. Single Open-Ended Review / Teacher Grading (For Digital Question Bank homework)
  if (isExplicitOpenEnded || isSingleOE) {
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

  // 3. Single PDF Review (Rendered with PDF Document viewer + questions/optical panel)
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

  // 4. Single HTML Review
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

  // 5. Single Image Review
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

  // 6. Single Digital Multiple Choice Review (For Question Bank questions/homeworks with text & options)
  if (hasDigitalQuestions || isMultipleChoiceTest) {
    return (
      <SingleMultipleChoiceReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={handleCloseReview}
      />
    );
  }

  // 7. Physical & Tracked Book Review (Supports Optical Multiple Choice for paper books)
  if (isPhysical || isBookOrOptical) {
    return (
      <PhysicalQuizReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={handleCloseReview}
      />
    );
  }

  // Default: Single Multiple-Choice Review
  return (
    <SingleMultipleChoiceReview
      submission={submission}
      test={test}
      questions={questions}
      onClose={handleCloseReview}
    />
  );
}
