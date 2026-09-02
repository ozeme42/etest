import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Scissors, Sparkles, BookOpen,
  Filter, Search, CheckSquare, Square, Calendar, ChevronRight,
  BookMarked, Eye, Clock, ArrowRight, UserCheck, Layers, HelpCircle,
  Trash2
} from 'lucide-react';
import { useEvaluation } from '../../context/EvaluationContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useHomework } from '../../context/HomeworkContext';
import { useCurriculum } from '../../context/CurriculumContext';
import { toUUID, dbRecordDeletedItem } from '../../services/supabaseService';
import { isExamBook } from '../../utils/testResolver';

const SUBJECT_ICONS = {
  'Sosyal Bilgiler': '🏛️',
  'Sosyal': '🏛️',
  'İnkılap': '🏛️',
  'Türkçe': '📖',
  'Matematik': '📐',
  'Fen Bilimleri': '🔬',
  'Fen': '🔬',
  'İngilizce': '🇬🇧',
  'Din Kültürü': '🕌',
  'Din': '🕌',
  'Genel': '🎯'
};

const resolveSubjectName = (...candidates) => {
  for (const c of candidates) {
    if (!c) continue;
    const str = String(c).trim();
    if (!str || str === 'null' || str === 'undefined') continue;
    const lower = str.toLowerCase();
    if (lower.includes('türk') || lower.includes('turk') || lower.includes('paragraf')) return 'Türkçe';
    if (lower.includes('mat') || lower.includes('geometri') || lower.includes('problem')) return 'Matematik';
    if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyo')) return 'Fen Bilimleri';
    if (lower.includes('sosyal') || lower.includes('tarih') || lower.includes('coğraf') || lower.includes('cograf') || lower.includes('inkılap') || lower.includes('inkilap')) return 'Sosyal Bilgiler';
    if (lower.includes('ing') || lower.includes('yabancı') || lower.includes('dil')) return 'İngilizce';
    if (lower.includes('din') || lower.includes('ahlak')) return 'Din Kültürü';
  }
  return 'Genel';
};

const resolveUnitName = (title, metaUnit) => {
  if (metaUnit && typeof metaUnit === 'string' && metaUnit.trim()) {
    return metaUnit.trim();
  }
  const str = String(title || '');
  const match = str.match(/(\d+)\s*\.\s*(?:Ünite|Unite|Bölüm|Bolum)/i);
  if (match) {
    return `${match[1]}. Ünite`;
  }
  const matchPage = str.match(/(\d+[\-\.]\s*\d+|\d+)\s*\.\s*Sayfa/i);
  if (matchPage) {
    return `${matchPage[1]}. Sayfa`;
  }
  return '1. Ünite';
};

const cleanTestDisplayTitle = (name) => {
  if (!name) return 'Test';
  let str = String(name).trim();
  str = str.replace(/—\s*Özel Telafi Testi.*$/i, '').trim();
  str = str.replace(/—\s*Telafi Testi.*$/i, '').trim();
  return str || 'Test';
};

export const parseTestNameInfo = (name) => {
  const str = String(name || '').trim();
  const lower = str.toLowerCase();

  let cat = 6;
  if (/^(test|kazanım|kavrama|etkinlik|konu)/i.test(lower) || /^t-\d+/i.test(lower) || /^test-\d+/i.test(lower)) {
    cat = 1;
  } else if (/^(sayfa|problem sayfas|problem|paragraf)/i.test(lower) || /\d+[\.\-]\s*sayfa/i.test(lower)) {
    cat = 2;
  } else if (/^(ünite|ü\.|değerlendirme|ü\. değ|ü\.değ)/i.test(lower)) {
    cat = 3;
  } else if (/^(yeni nesil|beceri|lgs)/i.test(lower)) {
    cat = 4;
  } else if (/^(tarama|sarmal|tekrar|genel tekrar)/i.test(lower)) {
    cat = 5;
  } else if (/^(deneme|sınav|tatil)/i.test(lower)) {
    cat = 6;
  }

  const numMatch = str.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 0;

  return { cat, num, str };
};

export const compareBookTestsOrder = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const pageA = Number(a.pdfPage || a.page || 0);
  const pageB = Number(b.pdfPage || b.page || 0);
  if (pageA > 0 && pageB > 0 && pageA !== pageB) {
    return pageA - pageB;
  }

  const nameA = String(a.name || a.testName || a.title || a.fullTitle || '').trim();
  const nameB = String(b.name || b.testName || b.title || b.fullTitle || '').trim();

  const pA = parseTestNameInfo(nameA);
  const pB = parseTestNameInfo(nameB);

  if (pA.cat !== pB.cat) {
    return pA.cat - pB.cat;
  }

  if (pA.num !== pB.num) {
    return pA.num - pB.num;
  }

  return pA.str.localeCompare(pB.str, 'tr', { numeric: true, sensitivity: 'base' });
};

export const compareUnitOrder = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const nameA = String(a.unitName || a.name || a.title || '').trim();
  const nameB = String(b.unitName || b.name || b.title || '').trim();
  const numA = (nameA.match(/\d+/) ? parseInt(nameA.match(/\d+/)[0], 10) : 0);
  const numB = (nameB.match(/\d+/) ? parseInt(nameB.match(/\d+/)[0], 10) : 0);
  if (numA !== numB && numA > 0 && numB > 0) {
    return numA - numB;
  }
  return nameA.localeCompare(nameB, 'tr', { numeric: true, sensitivity: 'base' });
};

export default function TeacherStudentMistakesPool({
  student,
  isDark,
  onLaunchSlicer
}) {
  const navigate = useNavigate();
  const { submissions = [], deleteSubmission, deleteSubmissionsByTestId } = useEvaluation();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { homeworks = [] } = useHomework();
  const { data: curData } = useCurriculum();

  const [sourceTypeTab, setSourceTypeTab] = useState('books'); 
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [deletingId, setDeletingId] = useState(null);

  const [scheduleMode, setScheduleMode] = useState('spaced_leitner');
  const [customIntervals, setCustomIntervals] = useState([1, 3, 7, 15]);
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);

  const [selectedQuestions, setSelectedQuestions] = useState({});

  const { subjectNameMap, topicNameMap } = useMemo(() => {
    const sMap = new Map();
    const tMap = new Map();
    (books || []).forEach(b => {
      (b.subjects || []).forEach(s => {
        if (s && s.id) {
          sMap.set(String(s.id), s.name);
          (s.topics || []).forEach(top => {
            if (top && top.id) tMap.set(String(top.id), top.name);
          });
        }
      });
    });
    return { subjectNameMap: sMap, topicNameMap: tMap };
  }, [books]);

  const booksMistakesTree = useMemo(() => {
    if (!student?.id) return [];

    const studentIdStr = String(student.id).trim();
    const studentUuidStr = String(toUUID(student.id) || '').trim();

    const isMatchStudent = (s) => {
      if (!s) return false;
      const sid = String(s.studentId ?? s.userId ?? s.student_id ?? s.raw_data?.studentId ?? s.raw_data?.student_id ?? '').trim();
      if (!sid) return false;
      return sid === studentIdStr || sid.toLowerCase() === studentIdStr.toLowerCase() ||
        (studentUuidStr && (sid === studentUuidStr || toUUID(sid) === studentUuidStr));
    };

    let deletedIds = new Set();
    try {
      const savedDeleted = localStorage.getItem('eTestDeletedSubmissions');
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed.map(String));
      }
    } catch {}

    const isDeletedItem = (s) => {
      if (!s) return true;
      const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || {});
      const candidates = [
        s.id,
        s.submissionId,
        s.supabaseId,
        s.originalSubmissionId,
        meta?.realId,
        meta?.submissionId
      ];
      return candidates.some(c => {
        if (!c) return false;
        const str = String(c);
        const u = toUUID(str);
        return deletedIds.has(str) || (u && deletedIds.has(String(u)));
      });
    };

    const resolveIsExam = (s) => {
      if (!s) return false;
      const meta = (Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || null);
      const candidateIds = [s.testId, s.test_id, s.realTestId, s.bookTestId, meta?.realTestId, meta?.bookTestId, meta?.testId, s.id].filter(Boolean);

      const matchedBt = (bookTests || []).find(bt => {
        const btIdStr = String(bt.id || bt.testId || '');
        return candidateIds.some(cid => btIdStr === String(cid) || toUUID(btIdStr) === toUUID(String(cid)));
      });
      if (matchedBt) {
        const bTestBookId = String(matchedBt.bookId || matchedBt.book_id || '');
        const parentBook = books.find(b => String(b.id) === bTestBookId || toUUID(b.id) === bTestBookId || toUUID(b.id) === toUUID(bTestBookId));
        if (parentBook && !isExamBook(parentBook)) {
          return false;
        }
      }

      if (s.bookId && s.bookId !== 'other_tests') {
        const parentBook = books.find(b => String(b.id) === String(s.bookId) || toUUID(b.id) === String(s.bookId));
        if (parentBook && !isExamBook(parentBook)) {
          return false;
        }
      }

      const matchedHw = (homeworks || []).find(h =>
        String(h.id) === String(s.hwId || s.testId || s.id) ||
        toUUID(h.id) === String(s.hwId || s.testId || s.id) ||
        (s.title && h.title && s.title.toLowerCase().trim() === h.title.toLowerCase().trim())
      );
      if (matchedHw && (matchedHw.type === 'physicalExam' || matchedHw.contentType === 'physicalExam' || isExamBook(matchedHw) || matchedHw.examType)) {
        return true;
      }

      if (s.type === 'physicalExam' || s.contentType === 'physicalExam' || s.isPhysicalExam === true) {
        return true;
      }

      const matchedBook = (books || []).find(b =>
        String(b.id) === String(s.bookId || s.hwId || s.testId) ||
        toUUID(b.id) === String(s.bookId || s.hwId || s.testId) ||
        (s.title && b.title && s.title.toLowerCase().trim() === b.title.toLowerCase().trim())
      );
      if (matchedBook && isExamBook(matchedBook)) {
        return true;
      }

      return false;
    };

    const allStudentSubs = [...(submissions || [])];
    (homeworks || []).forEach(hw => {
      if (!hw || !Array.isArray(hw.submissions)) return;
      hw.submissions.forEach((hwSub, subIdx) => {
        if (!hwSub || !isMatchStudent(hwSub)) return;
        const subTestId = hwSub.testId || hwSub.bookTestId || (hw.type === 'physicalExam' ? hw.id : `${hw.id}_${subIdx}`);
        const subTestTitle = hwSub.testTitle || hwSub.testName || hw.title;
        const synthSub = {
          id: hwSub.id || `${hw.id}_${subTestId}_${student.id}`,
          submissionId: hwSub.id || `${hw.id}_${subTestId}_${student.id}`,
          hwId: hw.id,
          testId: subTestId,
          bookTestId: hwSub.bookTestId || subTestId,
          bookId: hw.bookId || hw.book_id || (hwSub.bookId || null),
          title: subTestTitle,
          testTitle: subTestTitle,
          testName: hwSub.testName || subTestTitle,
          type: hw.type || 'physicalExam',
          contentType: hw.contentType || hw.type,
          isPhysical: hw.isPhysical,
          studentId: student.id,
          studentAnswers: hwSub.studentAnswers || hwSub.answers || {},
          subjectStats: hwSub.subjectStats,
          wrongCount: hwSub.wrongCount,
          correctCount: hwSub.correctCount,
          blankCount: hwSub.blankCount,
          totalQuestions: hwSub.totalQuestions || hwSub.count,
          subjectName: hwSub.subjectName,
          unitTopic: hwSub.unitTopic || hwSub.topicName,
          topicName: hwSub.topicName || hwSub.unitTopic,
          created_at: hwSub.submittedAt || hwSub.completedAt || hwSub.createdAt || hw.createdAt,
          answerKey: hwSub.answerKey || hw.answerKey,
          subjects: hw.subjects,
          pdfUrl: hw.pdfUrl
        };
        allStudentSubs.push(synthSub);
      });
    });

    const studentSubs = allStudentSubs.filter(s => {
      if (!s || isDeletedItem(s) || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;
      const subIdStr = String(s.id || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return false;
      return true;
    });

    const subGroups = new Map();
    studentSubs.forEach(s => {
      const getRealAnswersCount = (item) => {
        let raw = item.answers || [];
        if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch {} }
        const ansCount = Array.isArray(raw) ? raw.filter(x => x && x.type !== 'metadata' && (x.userAnswer || x.selectedOption || x.answer || x.correctAnswer || x.qNo || x.questionNo)).length : 0;
        let stdAnsCount = 0;
        if (item.studentAnswers && typeof item.studentAnswers === 'object') {
          Object.values(item.studentAnswers).forEach(arr => {
            if (Array.isArray(arr)) stdAnsCount += arr.filter(Boolean).length;
            else if (typeof arr === 'string' && arr) stdAnsCount += 1;
          });
        }
        return Math.max(ansCount, stdAnsCount);
      };

      const meta = (Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || null);
      
      const isExam = resolveIsExam(s);
      const testKey = isExam
        ? `exam_${(s.title || s.testTitle || s.hwId || s.id).trim().toLowerCase()}`
        : String(s.testId || s.test_id || meta?.realTestId || meta?.bookTestId || s.id || '').trim();

      if (!subGroups.has(testKey)) {
        subGroups.set(testKey, s);
      } else {
        const existing = subGroups.get(testKey);
        const existingCount = getRealAnswersCount(existing);
        const currentCount = getRealAnswersCount(s);
        if (currentCount > existingCount) {
          subGroups.set(testKey, s);
        } else if (currentCount === existingCount && new Date(s.created_at || 0) > new Date(existing.created_at || 0)) {
          subGroups.set(testKey, s);
        }
      }
    });

    const activeSubsList = Array.from(subGroups.values());
    const bookTree = new Map();

    const resolveBookAndTestInfo = (s) => {
      const rawAnswers = s.answers || [];
      const meta = (Array.isArray(rawAnswers)) ? rawAnswers.find(a => a?.type === 'metadata') : (s.metadata || null);
      const title = (s.title || s.testTitle || '').trim();
      const metaBookTitle = (meta?.bookTitle || '').trim();

      const candidateIds = [
        s.testId, s.test_id, s.realTestId, s.bookTestId,
        meta?.realTestId, meta?.bookTestId, meta?.testId, s.id
      ].filter(Boolean);

      let matchedBookTest = null;
      for (const cid of candidateIds) {
        const cidStr = String(cid);
        const cidUuid = toUUID(cidStr);
        matchedBookTest = (bookTests || []).find(bt => {
          const btIdStr = String(bt.id || bt.testId || '');
          return btIdStr === cidStr || btIdStr === cidUuid || toUUID(btIdStr) === cidUuid ||
            (bt.answer_key?.__meta?.realTestId && String(bt.answer_key.__meta.realTestId) === cidStr) ||
            (bt.answerKey?.__meta?.realTestId && String(bt.answerKey.__meta.realTestId) === cidStr);
        });
        if (matchedBookTest) break;
      }

      let matchedBook = null;
      if (matchedBookTest) {
        const bTestBookId = String(matchedBookTest.bookId || matchedBookTest.book_id || '');
        matchedBook = books.find(b => String(b.id) === bTestBookId || toUUID(b.id) === bTestBookId || toUUID(b.id) === toUUID(bTestBookId));
      }

      if (!matchedBook && (s.bookId || meta?.bookId)) {
        const bIdCandidate = String(s.bookId || meta?.bookId);
        matchedBook = books.find(b => String(b.id) === bIdCandidate || toUUID(b.id) === bIdCandidate || toUUID(b.id) === toUUID(bIdCandidate));
      }

      if (!matchedBook && metaBookTitle) {
        matchedBook = books.find(b => {
          const bt = (b.title || '').toLowerCase().trim();
          const mt = metaBookTitle.toLowerCase().trim();
          return bt === mt || bt.includes(mt) || mt.includes(bt);
        });
      }

      if (!matchedBook) {
        const lowerTitle = title.toLowerCase();
        const lowerMeta = metaBookTitle.toLowerCase();
        if (lowerTitle.includes('paragraf') || lowerTitle.includes('problem') || lowerMeta.includes('paragraf') || lowerMeta.includes('problem')) {
          matchedBook = books.find(b => {
            const bt = (b.title || '').toLowerCase();
            return bt.includes('paragraf') || bt.includes('problem');
          });
        } else if (lowerTitle.includes('ünite ünite') || lowerTitle.includes('unite unite') || lowerMeta.includes('ünite ünite') || lowerMeta.includes('unite unite')) {
          matchedBook = books.find(b => {
            const bt = (b.title || '').toLowerCase();
            return bt.includes('ünite ünite') || bt.includes('unite unite');
          });
        }
      }

      if (!matchedBookTest && matchedBook) {
        const rawName = (s.testName || s.testTitle || s.title || '').trim();
        const m = rawName.match(/\((.*?)\)/);
        const searchName = m ? m[1].trim() : rawName;
        const targetSubj = resolveSubjectName(s.subjectName, s.subject, s.title, s.testTitle);

        matchedBookTest = (bookTests || []).find(bt => {
          const btBookId = String(bt.bookId || bt.book_id || '');
          const isSameBook = btBookId === String(matchedBook.id) || toUUID(btBookId) === toUUID(matchedBook.id);
          if (!isSameBook) return false;

          // Subject check: If book has multiple subjects, ensure subject matches!
          if (targetSubj && targetSubj !== 'Genel') {
            const btSubj = bt.subject_id ? subjectNameMap.get(String(bt.subject_id)) : (bt.subjectId ? subjectNameMap.get(String(bt.subjectId)) : (bt.subject || bt.subjectName));
            if (btSubj) {
              const normBtSubj = resolveSubjectName(btSubj);
              if (normBtSubj !== targetSubj) return false;
            }
          }

          const bName = String(bt.name || '').trim();
          return bName === searchName || bName.toLowerCase() === searchName.toLowerCase() ||
                 (searchName && (bName.includes(searchName) || searchName.includes(bName)));
        });
      }

      const bId = matchedBook ? matchedBook.id : (meta?.bookId || s.bookId || 'other_tests');
      const bTitle = matchedBook ? matchedBook.title : (metaBookTitle || (title ? 'Diğer Kitap & Testler' : 'Genel Testler'));
      const bPdfUrl = matchedBook?.pdfUrl || null;
      const bSubject = matchedBook?.subject || null;
      const bGrade = matchedBook?.grade || null;

      const testSubjFromId = matchedBookTest?.subject_id ? subjectNameMap.get(String(matchedBookTest.subject_id)) : (matchedBookTest?.subjectId ? subjectNameMap.get(String(matchedBookTest.subjectId)) : null);
      const testTopicFromId = matchedBookTest?.topic_id ? topicNameMap.get(String(matchedBookTest.topic_id)) : (matchedBookTest?.topicId ? topicNameMap.get(String(matchedBookTest.topicId)) : null);

      return {
        bookId: bId,
        bookTitle: bTitle,
        bookPdfUrl: bPdfUrl,
        bookSubject: bSubject,
        bookGrade: bGrade,
        matchedBook,
        matchedBookTest,
        testSubjFromId,
        testTopicFromId
      };
    };

    activeSubsList.forEach(s => {
      const isExam = resolveIsExam(s);

      if (isExam) {
        const matchedHw = (homeworks || []).find(h =>
          String(h.id) === String(s.hwId || s.testId || s.id) ||
          toUUID(h.id) === String(s.hwId || s.testId || s.id) ||
          (s.title && h.title && s.title.toLowerCase().trim() === h.title.toLowerCase().trim())
        );
        const matchedExamBook = (books || []).find(b => isExamBook(b) && (
          String(b.id) === String(s.bookId || s.hwId || s.testId || matchedHw?.bookId) ||
          toUUID(b.id) === String(s.bookId || s.hwId || s.testId || matchedHw?.bookId) ||
          (s.title && b.title && s.title.toLowerCase().trim() === b.title.toLowerCase().trim())
        ));

        const bId = matchedHw ? matchedHw.id : (matchedExamBook ? matchedExamBook.id : (s.hwId || s.bookId || s.testId || s.id));
        const bTitle = matchedHw?.title || matchedExamBook?.title || s.title || s.testTitle || 'Deneme Sınavı';
        const bPdfUrl = matchedHw?.pdfUrl || matchedExamBook?.pdfUrl || s.pdfUrl || null;

        const testsForExam = (bookTests || []).filter(t => {
          if (!t) return false;
          const tBId = String(t.bookId || t.book_id || '');
          return tBId === String(matchedExamBook?.id) || (toUUID(matchedExamBook?.id) && tBId === toUUID(matchedExamBook?.id));
        });

        const builtExamKeys = {};
        testsForExam.forEach(t => {
          const subDef = (matchedExamBook?.subjects || []).find(sub => sub && String(sub.id) === String(t.subjectId || t.subject_id));
          const subName = subDef ? subDef.name : String(t.name || 'Ders').replace(' Testi', '');
          builtExamKeys[subName] = [];
          if (t.answerKey && typeof t.answerKey === 'object') {
            for (let i = 1; i <= (t.questionCount || 20); i++) {
              builtExamKeys[subName].push(t.answerKey[i] || '');
            }
          }
        });

        const finalExamAnswerKey = Object.keys(builtExamKeys).length > 0
          ? builtExamKeys
          : (matchedHw?.answerKey || matchedExamBook?.answerKey || s.answerKey || s.raw_data?.answerKey || {});

        let examSubjectsList = [];
        if (matchedHw?.subjects && Array.isArray(matchedHw.subjects) && matchedHw.subjects.length > 0) {
          examSubjectsList = matchedHw.subjects.map(sub => typeof sub === 'string' ? { name: sub, count: 20 } : sub);
        } else if (matchedExamBook?.subjects && Array.isArray(matchedExamBook.subjects) && matchedExamBook.subjects.length > 0) {
          examSubjectsList = matchedExamBook.subjects.map(sub => typeof sub === 'string' ? { name: sub, count: 20 } : sub);
        } else if (s.subjectStats?.subjectStats && Array.isArray(s.subjectStats.subjectStats)) {
          examSubjectsList = s.subjectStats.subjectStats.map(st => ({ name: st.name, count: Number(st.count) || 20 }));
        } else if (s.subjectStats && Array.isArray(s.subjectStats)) {
          examSubjectsList = s.subjectStats.map(st => ({ name: st.name || st.subject, count: Number(st.count) || 20 }));
        } else if (s.studentAnswers && typeof s.studentAnswers === 'object' && Object.keys(s.studentAnswers).length > 0) {
          examSubjectsList = Object.keys(s.studentAnswers).map(name => ({ name, count: s.studentAnswers[name]?.length || 20 }));
        } else {
          examSubjectsList = [{ name: 'Genel', count: 20 }];
        }

        const studentAnswersMap = s.studentAnswers || s.raw_data?.studentAnswers || (matchedHw?.submissions?.find(sub => isMatchStudent(sub))?.studentAnswers) || {};

        examSubjectsList.forEach(subObj => {
          const rawSubName = subObj.name || 'Genel';
          const normSubName = resolveSubjectName(rawSubName);
          const subQCount = Number(subObj.count) || Number(subObj.questionCount) || (studentAnswersMap[rawSubName]?.length) || (studentAnswersMap[normSubName]?.length) || 20;

          const subStudentAns = studentAnswersMap[rawSubName] || studentAnswersMap[normSubName] || [];
          const subAnswersList = (Array.isArray(s.answers))
            ? s.answers.filter(a => a && a.type !== 'metadata' && (a.subject === rawSubName || a.subjectName === rawSubName || a.subject === normSubName || a.subjectName === normSubName || (!a.subject && normSubName === 'Genel')))
            : [];

          const subKey = finalExamAnswerKey[rawSubName] || finalExamAnswerKey[normSubName] || [];

          const subWrongList = [];
          for (let i = 0; i < subQCount; i++) {
            const qNo = i + 1;
            const userAns = (subStudentAns && subStudentAns[i] !== undefined)
              ? subStudentAns[i]
              : (subAnswersList?.[i]?.userAnswer ?? subAnswersList?.[i]?.selectedOption ?? '');
            const correctAns = (subKey && subKey[i] !== undefined && subKey[i] !== '')
              ? subKey[i]
              : (subAnswersList?.[i]?.correctAnswer ?? subAnswersList?.[i]?.correctOption ?? '—');

            const isExplicitCorrect = subAnswersList?.[i]?.isCorrect === true || subAnswersList?.[i]?.evalStatus === 'correct';
            const isMatchExact = Boolean(userAns && correctAns && correctAns !== '—' && String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase() && userAns !== 'EMPTY');
            const isCorrect = isExplicitCorrect || isMatchExact;

            if (isCorrect) continue;

            const isBlank = (subAnswersList?.[i]?.isCorrect === null && (!userAns || userAns === 'EMPTY' || userAns === 'Boş')) || subAnswersList?.[i]?.evalStatus === 'empty' || userAns === 'EMPTY' || userAns === 'Boş' || !userAns;
            const isWrong = subAnswersList?.[i]?.isCorrect === false || subAnswersList?.[i]?.evalStatus === 'wrong' || (!isCorrect && !isBlank && userAns && correctAns !== '—');

            if (isWrong || isBlank) {
              subWrongList.push({
                qNo,
                userAns: userAns || 'Boş',
                correctAns: (correctAns && correctAns !== '—') ? correctAns : '?',
                isWrong: Boolean(isWrong),
                isBlank: Boolean(isBlank),
                page: 1
              });
            }
          }

          if (subWrongList.length > 0) {
            if (!bookTree.has(bId)) {
              bookTree.set(bId, {
                bookId: bId,
                bookTitle: bTitle,
                bookPdfUrl: bPdfUrl,
                subject: 'Deneme Sınavı',
                grade: matchedHw?.grade || matchedExamBook?.grade || null,
                isExam: true,
                totalWrong: 0,
                totalTests: 0,
                subjectsMap: new Map()
              });
            }
            const bNode = bookTree.get(bId);
            bNode.totalWrong += subWrongList.length;
            bNode.totalTests += 1;

            if (!bNode.subjectsMap.has(normSubName)) {
              bNode.subjectsMap.set(normSubName, {
                subjectName: normSubName,
                totalWrong: 0,
                totalTests: 0,
                unitsMap: new Map()
              });
            }
            const sNode = bNode.subjectsMap.get(normSubName);
            sNode.totalWrong += subWrongList.length;
            sNode.totalTests += 1;

            const unitName = 'Deneme Sınavı';
            if (!sNode.unitsMap.has(unitName)) {
              sNode.unitsMap.set(unitName, {
                unitName,
                subjectName: normSubName,
                totalWrong: 0,
                tests: []
              });
            }
            const uNode = sNode.unitsMap.get(unitName);
            uNode.totalWrong += subWrongList.length;
            uNode.tests.push({
              id: `${s.id}_${normSubName}`,
              submissionId: String(s.id),
              supabaseId: s.supabaseId || s.id,
              testId: String(s.testId || s.hwId || s.id),
              hwId: String(matchedHw?.id || s.hwId || s.testId || s.id),
              name: bTitle,
              fullTitle: `${bTitle} (${normSubName})`,
              subjectName: normSubName,
              unitName,
              pdfPage: 1,
              wrongCount: subWrongList.length,
              wrongQuestions: subWrongList,
              rawSubmission: s,
              isExam: true
            });
          }
        });

        return; 
      }

      const rawAnswers = s.answers || [];
      const meta = (Array.isArray(rawAnswers)) ? rawAnswers.find(a => a?.type === 'metadata') : (s.metadata || null);
      const cleanAnswers = (Array.isArray(rawAnswers)) ? rawAnswers.filter(a => a?.type !== 'metadata') : [];

      const {
        bookId,
        bookTitle,
        bookPdfUrl,
        bookSubject,
        bookGrade,
        matchedBook,
        matchedBookTest,
        testSubjFromId,
        testTopicFromId
      } = resolveBookAndTestInfo(s);

      const matchedKey = matchedBookTest?.answerKey || matchedBookTest?.answer_key || s.answerKey || s.raw_data?.answerKey || {};
      const studentAnswersMap = s.studentAnswers || s.raw_data?.studentAnswers || {};

      const wrongList = [];

      if (cleanAnswers.length > 0) {
        cleanAnswers.forEach((ans, idx) => {
          const qNo = ans.questionNo || ans.qNum || (idx + 1);
          const userAns = ans.userAnswer ?? ans.selectedOption ?? ans.selectedAnswer ?? ans.answer ?? ans.textAns ?? '';
          let correctAns = ans.correctAnswer ?? ans.correctOption ?? ans.correct ?? '';
          if (!correctAns || correctAns === '—' || correctAns === '?') {
            correctAns = matchedKey[String(qNo)] || matchedKey[qNo] || '—';
          }
          
          const isExplicitCorrect = ans.isCorrect === true || ans.evalStatus === 'correct';
          const isMatchExact = Boolean(userAns && correctAns && correctAns !== '—' && String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase() && userAns !== 'EMPTY');
          const isCorrect = isExplicitCorrect || isMatchExact;

          if (isCorrect) return;

          const isBlank = (ans.isCorrect === null && (!userAns || userAns === 'EMPTY' || userAns === 'Boş')) || ans.evalStatus === 'empty' || userAns === 'EMPTY' || userAns === 'Boş' || !userAns;
          const isWrong = ans.isCorrect === false || ans.evalStatus === 'wrong' || (!isCorrect && !isBlank && userAns && correctAns !== '—');

          if (isWrong || isBlank) {
            wrongList.push({
              qNo,
              userAns: userAns || 'Boş',
              correctAns: (correctAns && correctAns !== '—') ? correctAns : '?',
              isWrong: Boolean(isWrong),
              isBlank: Boolean(isBlank),
              page: meta?.page || 1
            });
          }
        });
        wrongList.sort((a, b) => (Number(a.qNo) || 0) - (Number(b.qNo) || 0));
      } else if (Object.keys(studentAnswersMap).length > 0 && Object.keys(matchedKey).length > 0) {
        const qCount = Number(s.totalQuestions) || Number(matchedBookTest?.questionCount) || Number(matchedBookTest?.question_count) || Object.keys(matchedKey).filter(k => k !== '__meta').length || 20;
        for (let i = 1; i <= qCount; i++) {
          const userAns = studentAnswersMap[String(i)] ?? studentAnswersMap[i] ?? '';
          const correctAns = matchedKey[String(i)] ?? matchedKey[i] ?? '';
          if (correctAns && correctAns !== '__meta') {
            const isMatch = Boolean(userAns && String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase() && userAns !== 'EMPTY' && userAns !== 'Boş');
            if (!isMatch) {
              const isBlank = !userAns || userAns === 'EMPTY' || userAns === 'Boş';
              wrongList.push({
                qNo: i,
                userAns: userAns || 'Boş',
                correctAns: correctAns,
                isWrong: !isBlank,
                isBlank: isBlank,
                page: meta?.page || 1
              });
            }
          }
        }
      } else {
        const wCount = Number(s.wrongCount ?? s.wrong_count ?? s.wrong ?? 0);
        for (let i = 1; i <= wCount; i++) {
          const correctAns = matchedKey[String(i)] ?? matchedKey[i] ?? '?';
          wrongList.push({
            qNo: i,
            userAns: 'Yanlış',
            correctAns: (correctAns && correctAns !== '__meta') ? correctAns : '?',
            isWrong: true,
            isBlank: false,
            page: 1
          });
        }
      }

      if (wrongList.length === 0) return;

      const subjectName = resolveSubjectName(
        testSubjFromId,
        s.subjectName,
        s.title,
        s.testTitle,
        meta?.subject,
        s.subject,
        bookSubject
      );

      const unitName = resolveUnitName(
        s.title || s.testTitle,
        testTopicFromId || s.unitTopic || s.topicName || meta?.unitTopic || meta?.unit
      );

      const displayTitle = cleanTestDisplayTitle(s.title || s.testTitle || 'Test');

      if (!bookTree.has(bookId)) {
        bookTree.set(bookId, {
          bookId,
          bookTitle,
          bookPdfUrl,
          subject: bookSubject || subjectName,
          grade: bookGrade,
          isExam: false,
          totalWrong: 0,
          totalTests: 0,
          subjectsMap: new Map()
        });
      }

      const bNode = bookTree.get(bookId);
      bNode.totalWrong += wrongList.length;
      bNode.totalTests += 1;

      if (!bNode.subjectsMap.has(subjectName)) {
        bNode.subjectsMap.set(subjectName, {
          subjectName,
          totalWrong: 0,
          totalTests: 0,
          unitsMap: new Map()
        });
      }

      const sNode = bNode.subjectsMap.get(subjectName);
      sNode.totalWrong += wrongList.length;
      sNode.totalTests += 1;

      if (!sNode.unitsMap.has(unitName)) {
        sNode.unitsMap.set(unitName, {
          unitName,
          subjectName,
          totalWrong: 0,
          tests: []
        });
      }

      const uNode = sNode.unitsMap.get(unitName);
      uNode.totalWrong += wrongList.length;
      uNode.tests.push({
        id: String(s.id),
        submissionId: String(s.id),
        supabaseId: s.supabaseId || s.id,
        testId: String(s.testId || s.test_id || meta?.realTestId || meta?.bookTestId || s.id),
        name: displayTitle,
        fullTitle: s.title || s.testTitle,
        subjectName,
        unitName,
        pdfPage: meta?.page || 1,
        wrongCount: wrongList.length,
        wrongQuestions: wrongList,
        rawSubmission: s,
        isExam: false
      });
    });

    // Build book index map based on the official TrackedBooks array
    const bookOrderMap = new Map();
    (books || []).forEach((b, idx) => {
      if (b?.id) {
        bookOrderMap.set(String(b.id), idx);
        const u = toUUID(b.id);
        if (u) bookOrderMap.set(String(u), idx);
      }
    });

    // Build test index map based on bookTests array
    const testOrderMap = new Map();
    (bookTests || []).forEach((bt, idx) => {
      const btId = String(bt.id || bt.testId || '');
      if (btId) {
        testOrderMap.set(btId, idx);
        const u = toUUID(btId);
        if (u) testOrderMap.set(String(u), idx);
      }
    });

    const bookResults = [];
    bookTree.forEach(b => {
      const subjects = [];
      b.subjectsMap.forEach(s => {
        const units = Array.from(s.unitsMap.values());
        units.forEach(u => {
          u.tests.sort((a, bTest) => {
            const idA = String(a.testId || a.id || '');
            const idB = String(bTest.testId || bTest.id || '');
            const idxA = testOrderMap.has(idA) ? testOrderMap.get(idA) : (testOrderMap.has(toUUID(idA)) ? testOrderMap.get(toUUID(idA)) : 99999);
            const idxB = testOrderMap.has(idB) ? testOrderMap.get(idB) : (testOrderMap.has(toUUID(idB)) ? testOrderMap.get(toUUID(idB)) : 99999);
            if (idxA !== 99999 && idxB !== 99999 && idxA !== idxB) {
              return idxA - idxB;
            }
            return compareBookTestsOrder(a, bTest);
          });
        });
        units.sort(compareUnitOrder);
        subjects.push({
          subjectName: s.subjectName,
          totalWrong: s.totalWrong,
          totalTests: s.totalTests,
          units
        });
      });

      // Subject display ordering: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İnkılap Tarihi, İngilizce, Din Kültürü, Diğer
      const order = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İnkılap Tarihi', 'İngilizce', 'Din Kültürü', 'Genel'];
      subjects.sort((a, b) => {
        const idxA = order.indexOf(a.subjectName);
        const idxB = order.indexOf(b.subjectName);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

      bookResults.push({
        bookId: b.bookId,
        bookTitle: b.bookTitle,
        bookPdfUrl: b.bookPdfUrl,
        subject: b.subject,
        grade: b.grade,
        isExam: Boolean(b.isExam),
        totalWrong: b.totalWrong,
        totalTests: b.totalTests,
        subjects
      });
    });

    // Book sorting: strictly preserve book order as configured in TrackedBooks
    bookResults.sort((a, b) => {
      const idA = String(a.bookId || '');
      const idB = String(b.bookId || '');
      const orderA = bookOrderMap.has(idA) ? bookOrderMap.get(idA) : (bookOrderMap.has(toUUID(idA)) ? bookOrderMap.get(toUUID(idA)) : (idA === 'other_tests' ? 9999 : 500));
      const orderB = bookOrderMap.has(idB) ? bookOrderMap.get(idB) : (bookOrderMap.has(toUUID(idB)) ? bookOrderMap.get(toUUID(idB)) : (idB === 'other_tests' ? 9999 : 500));
      if (orderA !== orderB) return orderA - orderB;
      return String(a.bookTitle || '').localeCompare(String(b.bookTitle || ''), 'tr', { numeric: true, sensitivity: 'base' });
    });

    return bookResults;
  }, [student, submissions, books, bookTests, homeworks, subjectNameMap, topicNameMap]);

  // Split books and exams
  const bookMistakes = useMemo(() => booksMistakesTree.filter(b => !b.isExam), [booksMistakesTree]);
  const examMistakes = useMemo(() => booksMistakesTree.filter(b => b.isExam), [booksMistakesTree]);
  const totalBookWrongs = useMemo(() => bookMistakes.reduce((acc, b) => acc + b.totalWrong, 0), [bookMistakes]);
  const totalExamWrongs = useMemo(() => examMistakes.reduce((acc, b) => acc + b.totalWrong, 0), [examMistakes]);

  // Current active list based on sourceTypeTab
  const currentCategoryList = useMemo(() => {
    if (sourceTypeTab === 'exams') return examMistakes;
    return bookMistakes;
  }, [sourceTypeTab, examMistakes, bookMistakes]);

  // Auto-switch tab if one category is empty and the other has mistakes
  useEffect(() => {
    if (bookMistakes.length === 0 && examMistakes.length > 0 && sourceTypeTab === 'books') {
      setSourceTypeTab('exams');
    }
  }, [bookMistakes, examMistakes, sourceTypeTab]);

  // Auto-select first item in active category
  useEffect(() => {
    if (currentCategoryList.length > 0) {
      if (!selectedBookId || !currentCategoryList.some(b => b.bookId === selectedBookId)) {
        setSelectedBookId(currentCategoryList[0].bookId);
      }
    } else {
      setSelectedBookId(null);
    }
  }, [currentCategoryList, selectedBookId]);

  // Active book / exam object
  const activeBook = useMemo(() => {
    if (!selectedBookId) return currentCategoryList[0] || null;
    return currentCategoryList.find(b => b.bookId === selectedBookId) || currentCategoryList[0] || null;
  }, [currentCategoryList, selectedBookId]);

  // Auto-select first subject of active book / exam
  useEffect(() => {
    if (activeBook && activeBook.subjects.length > 0) {
      if (!selectedSubject || !activeBook.subjects.some(s => s.subjectName === selectedSubject)) {
        setSelectedSubject(activeBook.subjects[0].subjectName);
      }
    }
  }, [activeBook, selectedSubject]);

  // Active subject object
  const activeSubjectObj = useMemo(() => {
    if (!activeBook || !activeBook.subjects) return null;
    if (!selectedSubject) return activeBook.subjects[0] || null;
    return activeBook.subjects.find(s => s.subjectName === selectedSubject) || activeBook.subjects[0] || null;
  }, [activeBook, selectedSubject]);

  // Filtered tests under active subject & unit
  const visibleTests = useMemo(() => {
    if (!activeSubjectObj) return [];
    let tests = [];

    if (selectedUnit === 'all') {
      activeSubjectObj.units.forEach(u => {
        tests.push(...u.tests);
      });
    } else {
      const matchedUnit = activeSubjectObj.units.find(u => u.unitName === selectedUnit);
      if (matchedUnit) {
        tests.push(...matchedUnit.tests);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tests = tests.filter(t => t.name.toLowerCase().includes(q) || t.unitName.toLowerCase().includes(q) || (t.fullTitle && t.fullTitle.toLowerCase().includes(q)));
    }

    return tests;
  }, [activeSubjectObj, selectedUnit, searchQuery]);

  // Handle Deleting a single test submission
  const handleDeleteTestSubmission = async (test) => {
    const confirmMessage = `"${test.fullTitle || test.name}" testinin çözüm kaydını silmek istediğinize emin misiniz?\n\nBu işlem öğrencinin bu teste ait sınav sonucunu ve yanlış havuzundaki sorularını temizler.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(test.id);
    try {
      if (typeof deleteSubmission === 'function') {
        const sId = test.submissionId || test.id;
        if (sId) await deleteSubmission(sId);
        if (test.supabaseId && test.supabaseId !== sId) await deleteSubmission(test.supabaseId);
      }

      // Record in local & Supabase deletion cache for instant cloud response
      try {
        const savedDeleted = localStorage.getItem('eTestDeletedSubmissions');
        const parsed = savedDeleted ? JSON.parse(savedDeleted) : [];
        const toAdd = [String(test.submissionId || test.id), String(test.supabaseId || '')].filter(Boolean);
        localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(Array.from(new Set([...parsed, ...toAdd]))));

        // Sync deletion to Supabase deleted_records table
        toAdd.forEach(itemKey => {
          dbRecordDeletedItem(itemKey, 'submission', student?.id);
        });
      } catch {}
    } catch (err) {
      console.error('Error deleting test submission:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle selection for a single question
  const handleToggleQuestion = (test, q) => {
    const qKey = `${test.id}_${q.qNo}`;
    setSelectedQuestions(prev => {
      const next = { ...prev };
      if (next[qKey]) {
        delete next[qKey];
      } else {
        next[qKey] = {
          bookId: activeBook.bookId,
          bookTitle: activeBook.bookTitle,
          testId: test.id,
          testTitle: test.name,
          fullTitle: test.fullTitle,
          testPage: test.pdfPage || 1,
          testItem: test,
          qNo: q.qNo,
          userAns: q.userAns,
          selectedOption: q.userAns,
          correctOption: q.correctAns,
          isWrong: q.isWrong,
          isBlank: q.isBlank,
          subject: test.subjectName || activeBook.subject,
          grade: activeBook.grade
        };
      }
      return next;
    });
  };

  // Toggle all questions in a test
  const handleToggleTest = (test) => {
    const allSelected = test.wrongQuestions.every(q => selectedQuestions[`${test.id}_${q.qNo}`]);
    setSelectedQuestions(prev => {
      const next = { ...prev };
      test.wrongQuestions.forEach(q => {
        const qKey = `${test.id}_${q.qNo}`;
        if (allSelected) {
          delete next[qKey];
        } else {
          next[qKey] = {
            bookId: activeBook.bookId,
            bookTitle: activeBook.bookTitle,
            testId: test.id,
            testTitle: test.name,
            fullTitle: test.fullTitle,
            testPage: test.pdfPage || 1,
            testItem: test,
            qNo: q.qNo,
            userAns: q.userAns,
            selectedOption: q.userAns,
            correctOption: q.correctAns,
            isWrong: q.isWrong,
            isBlank: q.isBlank,
            subject: test.subjectName || activeBook.subject,
            grade: activeBook.grade
          };
        }
      });
      return next;
    });
  };

  // Select all visible questions in current unit/subject
  const handleSelectAllVisible = () => {
    const allVisibleSelected = visibleTests.every(t =>
      t.wrongQuestions.every(q => selectedQuestions[`${t.id}_${q.qNo}`])
    );

    setSelectedQuestions(prev => {
      const next = { ...prev };
      visibleTests.forEach(t => {
        t.wrongQuestions.forEach(q => {
          const qKey = `${t.id}_${q.qNo}`;
          if (allVisibleSelected) {
            delete next[qKey];
          } else {
            next[qKey] = {
              bookId: activeBook.bookId,
              bookTitle: activeBook.bookTitle,
              testId: t.id,
              testTitle: t.name,
              fullTitle: t.fullTitle,
              testPage: t.pdfPage || 1,
              testItem: t,
              qNo: q.qNo,
              userAns: q.userAns,
              selectedOption: q.userAns,
              correctOption: q.correctAns,
              isWrong: q.isWrong,
              isBlank: q.isBlank,
              subject: t.subjectName || activeBook.subject,
              grade: activeBook.grade
            };
          }
        });
      });
      return next;
    });
  };

  const selectedCount = Object.keys(selectedQuestions).length;

  const handleLaunchSlicerAction = () => {
    if (selectedCount === 0 || !activeBook) return;

    const selectedList = Object.values(selectedQuestions);

    // Group selected items for initialMistakes in Slicer
    const mistakesByTest = {};
    selectedList.forEach(item => {
      if (!mistakesByTest[item.testId]) {
        mistakesByTest[item.testId] = {
          ...item.testItem,
          id: item.testId,
          testId: item.testId,
          name: item.testTitle || item.name || 'Test',
          testName: item.testTitle || item.name || 'Test',
          title: item.fullTitle || item.testTitle,
          unitName: item.testItem?.unitName || '1. Ünite',
          subjectName: item.subject || activeSubjectObj?.subjectName || 'Genel',
          page: item.testPage,
          pdfPage: item.testPage,
          wrongQuestions: [],
          wrongQuestionsList: [],
          wrongCount: 0,
          answerKeyMap: {}
        };
      }
      mistakesByTest[item.testId].wrongQuestions.push(item.qNo);
      mistakesByTest[item.testId].wrongQuestionsList.push({
        qNum: item.qNo,
        qNo: item.qNo,
        selectedOption: item.selectedOption,
        correctOption: item.correctOption,
        page: item.testPage,
        pdfPage: item.testPage
      });
      if (item.correctOption && item.correctOption !== '?' && item.correctOption !== '—') {
        mistakesByTest[item.testId].answerKeyMap[item.qNo] = item.correctOption;
      }
      mistakesByTest[item.testId].wrongCount++;
    });

    const structuredMistakes = Object.values(mistakesByTest);
    structuredMistakes.forEach(sm => {
      sm.wrongQuestions.sort((a, b) => Number(a) - Number(b));
      sm.wrongQuestionsList.sort((a, b) => (Number(a.qNo || a.qNum) || 0) - (Number(b.qNo || b.qNum) || 0));
    });

    structuredMistakes.sort((a, b) => {
      const uDiff = compareUnitOrder(a, b);
      if (uDiff !== 0) return uDiff;
      return compareBookTestsOrder(a, b);
    });

    if (onLaunchSlicer) {
      onLaunchSlicer({
        studentId: student.id,
        bookId: activeBook.bookId,
        bookTitle: activeBook.bookTitle,
        pdfUrl: activeBook.bookPdfUrl,
        book: {
          id: activeBook.bookId,
          title: activeBook.bookTitle,
          pdfUrl: activeBook.bookPdfUrl,
          subject: activeSubjectObj?.subjectName || activeBook.subject,
          grade: activeBook.grade,
          isExam: activeBook.isExam
        },
        mistakes: structuredMistakes,
        scheduleMode,
        customIntervals,
        keepMasteryTracking,
        subject: activeSubjectObj?.subjectName || activeBook.subject,
        grade: activeBook.grade
      });
    }
  };

  if (booksMistakesTree.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        background: isDark ? 'rgba(30,41,59,0.3)' : '#f8fafc',
        borderRadius: '1.25rem',
        border: '1.5px dashed var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10
      }}>
        <CheckCircle2 size={40} style={{ color: '#10b981' }} />
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>
          Harika! Yanlış Soru Havuzu Tertemiz 🏆
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 460 }}>
          Bu öğrencinin çözdüğü kitaplarda henüz yanlış soru bulunmuyor veya çözülen tüm sorular başarıyla telafi edildi.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* ── 📚 / 📊 KAYNAK TÜRÜ SEKMELERİ (KİTAP TAKİBİ vs DENEME SINAVLARI) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 4,
        borderBottom: '1.5px solid var(--color-border)'
      }}>
        <button
          type="button"
          onClick={() => {
            setSourceTypeTab('books');
            if (bookMistakes.length > 0) {
              setSelectedBookId(bookMistakes[0].bookId);
              setSelectedSubject(null);
              setSelectedUnit('all');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 10,
            border: sourceTypeTab === 'books' ? '2px solid #10b981' : '1px solid var(--color-border)',
            background: sourceTypeTab === 'books' ? (isDark ? 'rgba(16,185,129,0.22)' : '#ecfdf5') : 'transparent',
            color: sourceTypeTab === 'books' ? '#059669' : 'var(--color-text-muted)',
            fontWeight: 900,
            fontSize: '0.86rem',
            cursor: 'pointer',
            boxShadow: sourceTypeTab === 'books' ? '0 3px 10px rgba(16,185,129,0.2)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <span>📚 Kitap Takibi Yanlışları</span>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 900,
            padding: '2px 7px',
            borderRadius: 6,
            background: sourceTypeTab === 'books' ? '#10b981' : (isDark ? '#334155' : '#e2e8f0'),
            color: sourceTypeTab === 'books' ? 'white' : 'var(--color-text-muted)'
          }}>
            {totalBookWrongs} Yanlış
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSourceTypeTab('exams');
            if (examMistakes.length > 0) {
              setSelectedBookId(examMistakes[0].bookId);
              setSelectedSubject(null);
              setSelectedUnit('all');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 10,
            border: sourceTypeTab === 'exams' ? '2px solid #6366f1' : '1px solid var(--color-border)',
            background: sourceTypeTab === 'exams' ? (isDark ? 'rgba(99,102,241,0.22)' : '#eef2ff') : 'transparent',
            color: sourceTypeTab === 'exams' ? '#4f46e5' : 'var(--color-text-muted)',
            fontWeight: 900,
            fontSize: '0.86rem',
            cursor: 'pointer',
            boxShadow: sourceTypeTab === 'exams' ? '0 3px 10px rgba(99,102,241,0.2)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <span>📊 Deneme Sınavları Yanlışları</span>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 900,
            padding: '2px 7px',
            borderRadius: 6,
            background: sourceTypeTab === 'exams' ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0'),
            color: sourceTypeTab === 'exams' ? 'white' : 'var(--color-text-muted)'
          }}>
            {totalExamWrongs} Yanlış
          </span>
        </button>
      </div>

      {/* ── 📚 / 📊 1. SEVİYE: KİTAP VEYA DENEME SEÇİM ALANI ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sourceTypeTab === 'exams' ? (
            <span style={{ fontSize: '1rem' }}>📊</span>
          ) : (
            <BookOpen size={15} className="text-emerald-500" />
          )}
          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {sourceTypeTab === 'exams'
              ? `1. Deneme Sınavı Seçin (${examMistakes.length} Denemede Yanlış Var):`
              : `1. Kitap Seçin (${bookMistakes.length} Kitapta Yanlış Var):`
            }
          </span>
        </div>

        {currentCategoryList.length === 0 ? (
          <div style={{
            padding: '1.25rem',
            borderRadius: 12,
            background: isDark ? 'rgba(30,41,59,0.3)' : '#f8fafc',
            border: '1px dashed var(--color-border)',
            color: 'var(--color-text-muted)',
            fontSize: '0.82rem',
            textAlign: 'center'
          }}>
            {sourceTypeTab === 'exams' ? 'Bu öğrenciye ait kayıtlı deneme sınavı yanlışı bulunmamaktadır.' : 'Bu öğrenciye ait kayıtlı kitap takibi yanlışı bulunmamaktadır.'}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {currentCategoryList.map(b => {
              const isSelected = selectedBookId === b.bookId;
              const isExamCard = Boolean(b.isExam);
              return (
                <button
                  key={b.bookId}
                  type="button"
                  onClick={() => {
                    setSelectedBookId(b.bookId);
                    setSelectedSubject(null);
                    setSelectedUnit('all');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0.65rem 1.1rem',
                    borderRadius: 12,
                    border: isSelected
                      ? (isExamCard ? '2px solid #6366f1' : '2px solid #10b981')
                      : '1.5px solid var(--color-border)',
                    background: isSelected
                      ? (isExamCard ? (isDark ? 'rgba(99,102,241,0.22)' : '#eef2ff') : (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5'))
                      : 'var(--color-surface)',
                    color: isSelected
                      ? (isExamCard ? '#4f46e5' : '#059669')
                      : 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? (isExamCard ? '0 4px 12px rgba(99,102,241,0.2)' : '0 4px 12px rgba(16,185,129,0.18)') : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{isExamCard ? '📊' : '📖'} {b.bookTitle}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '2px 7px',
                    borderRadius: 6,
                    background: isSelected
                      ? (isExamCard ? '#6366f1' : '#10b981')
                      : (isDark ? '#334155' : '#e2e8f0'),
                    color: isSelected ? 'white' : 'var(--color-text-muted)'
                  }}>
                    {b.totalWrong} Yanlış
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 📖 2. SEVİYE: DERS SEÇİM KARTLARI ── */}
      {activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
              2. Ders Seçin:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {activeBook.subjects.map(s => {
              const isSelected = (selectedSubject || activeBook.subjects[0]?.subjectName) === s.subjectName;
              const icon = SUBJECT_ICONS[s.subjectName] || '📚';
              return (
                <button
                  key={s.subjectName}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(s.subjectName);
                    setSelectedUnit('all');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '0.65rem 1.25rem',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                    background: isSelected ? (isDark ? 'rgba(99,102,241,0.22)' : '#e0e7ff') : 'var(--color-surface)',
                    color: isSelected ? '#4338ca' : 'var(--color-text)',
                    cursor: 'pointer',
                    minWidth: 105,
                    boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.2)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{s.subjectName}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: isSelected ? '#4f46e5' : 'var(--color-text-muted)' }}>
                    ({s.totalWrong} Yanlış)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 📁 3. SEVİYE: ÜNİTELER & ARAMA ── */}
      {activeSubjectObj && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
          borderRadius: 14,
          border: '1px solid var(--color-border)'
        }}>
          {/* Ünite Hap Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedUnit('all')}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: '0.76rem',
                fontWeight: 900,
                cursor: 'pointer',
                border: selectedUnit === 'all' ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                background: selectedUnit === 'all' ? '#6366f1' : 'transparent',
                color: selectedUnit === 'all' ? 'white' : 'var(--color-text-muted)'
              }}
            >
              Tüm Üniteler ({activeSubjectObj.units.reduce((acc, u) => acc + u.totalWrong, 0)})
            </button>

            {activeSubjectObj.units.map(u => (
              <button
                key={u.unitName}
                type="button"
                onClick={() => setSelectedUnit(u.unitName)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  border: selectedUnit === u.unitName ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                  background: selectedUnit === u.unitName ? '#6366f1' : 'transparent',
                  color: selectedUnit === u.unitName ? 'white' : 'var(--color-text-muted)'
                }}
              >
                {u.unitName} ({u.tests.length}T • {u.totalWrong}Y)
              </button>
            ))}
          </div>

          {/* Test / Soru Arama */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test veya soru ara..."
              style={{
                width: '100%',
                padding: '5px 10px 5px 28px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: isDark ? '#0f172a' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* ── ⚙️ ARALIKLI TEKRAR DÖNGÜSÜ & HIZLI AKSİYON ÇUBUĞU ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.09), rgba(244,63,94,0.09))',
        border: '1.5px solid rgba(99,102,241,0.28)',
        borderRadius: '1.25rem',
        padding: '0.9rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Tekrar Modu ve Günler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={15} className="text-amber-500" />
              <span>Tekrar Planı:</span>
            </span>
            <select
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--color-border)',
                background: isDark ? '#0f172a' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <option value="spaced_leitner">🧠 Standart Leitner (1, 3, 7, 15 Gün)</option>
              <option value="fast">⚡ Hızlı Pekiştirme (1, 2, 4, 7 Gün)</option>
              <option value="today">📅 Sadece Bugün (1 Gün)</option>
              <option value="custom">⚙️ Özel Günler...</option>
              <option value="none">🚫 Programa Ekleme (Sadece Havuz)</option>
            </select>
          </div>

          {scheduleMode === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map(dayNum => {
                const isSelected = customIntervals.includes(dayNum);
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      setCustomIntervals(prev => {
                        if (prev.includes(dayNum)) {
                          if (prev.length <= 1) return prev;
                          return prev.filter(d => d !== dayNum);
                        } else {
                          return [...prev, dayNum].sort((a, b) => a - b);
                        }
                      });
                    }}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                      background: isSelected ? '#6366f1' : 'transparent',
                      color: isSelected ? 'white' : 'var(--color-text-muted)'
                    }}
                  >
                    {dayNum}g
                  </button>
                );
              })}
            </div>
          )}

          {scheduleMode !== 'none' && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.74rem',
              fontWeight: 900,
              color: '#059669',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={keepMasteryTracking}
                onChange={(e) => setKeepMasteryTracking(e.target.checked)}
                style={{ accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span>🎯 %100 Doğru Yapılana Kadar Tekrar Et</span>
            </label>
          )}
        </div>

        {/* Seçim Sayısı ve Kırp Butonu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleSelectAllVisible}
            style={{
              fontSize: '0.76rem',
              fontWeight: 900,
              color: 'var(--color-text)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Görünen Tümünü Seç / Kaldır
          </button>

          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#6366f1' }}>
            📌 {selectedCount} Soru Seçildi
          </span>

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleLaunchSlicerAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.65rem 1.35rem',
              borderRadius: '0.85rem',
              background: selectedCount > 0 ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : '#94a3b8',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.84rem',
              border: 'none',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: selectedCount > 0 ? '0 4px 14px rgba(244,63,94,0.35)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Scissors size={15} />
            <span>✂️ Seçilen {selectedCount > 0 ? `(${selectedCount})` : ''} Soruyu PDF'ten Kırp &amp; Oluştur</span>
          </button>
        </div>
      </div>

      {/* ── 📌 4. SEVİYE: TESTLER & SORU ROZETLERİ IZGARASI ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {visibleTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
            Seçilen ünite veya filtrede yanlış soru bulunamadı.
          </div>
        ) : (
          visibleTests.map(test => {
            const allTestSelected = test.wrongQuestions.every(q => selectedQuestions[`${test.id}_${q.qNo}`]);
            const someTestSelected = test.wrongQuestions.some(q => selectedQuestions[`${test.id}_${q.qNo}`]);
            const isThisDeleting = deletingId === test.id;

            return (
              <div
                key={test.id}
                style={{
                  background: isDark ? 'rgba(30,41,59,0.7)' : '#ffffff',
                  border: someTestSelected ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '0.9rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  boxShadow: someTestSelected ? '0 3px 12px rgba(99,102,241,0.12)' : 'none',
                  opacity: isThisDeleting ? 0.45 : 1,
                  transition: 'all 0.15s'
                }}
              >
                {/* Test Başlığı & Ünite */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTest(test)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: allTestSelected ? '#6366f1' : 'var(--color-text)'
                    }}
                  >
                    {allTestSelected ? (
                      <CheckSquare size={19} className="text-indigo-600" />
                    ) : (
                      <Square size={19} className="text-gray-400" />
                    )}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        📌 {test.name}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2',
                        color: '#dc2626'
                      }}>
                        {test.wrongCount} Yanlış Soru
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {test.unitName} {test.pdfPage ? `• Sayfa ${test.pdfPage}` : ''}
                    </div>
                  </div>
                </div>

                {/* Soru Butonları ve Aksiyon Butonları (İncele & Sil) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Soru Butonları (S.1 (C), S.4 (A)...) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {test.wrongQuestions.map(q => {
                      const qKey = `${test.id}_${q.qNo}`;
                      const isQSelected = Boolean(selectedQuestions[qKey]);

                      return (
                        <button
                          key={q.qNo}
                          type="button"
                          onClick={() => handleToggleQuestion(test, q)}
                          title={`Soru ${q.qNo}: Doğru Cevap [${q.correctAns}], Öğrencinin Cevabı [${q.userAns}]`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: isQSelected ? '2px solid #6366f1' : (isDark ? '1.5px solid rgba(239,68,68,0.45)' : '1.5px solid #fecaca'),
                            background: isQSelected
                              ? '#6366f1'
                              : (isDark ? 'rgba(239,68,68,0.15)' : '#fff1f2'),
                            color: isQSelected ? 'white' : '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            minWidth: 56,
                            transition: 'all 0.15s',
                            boxShadow: isQSelected ? '0 2px 8px rgba(99,102,241,0.35)' : 'none'
                          }}
                        >
                          <span>S.{q.qNo}</span>
                          <span style={{ fontSize: '0.68rem', opacity: isQSelected ? 0.95 : 0.8 }}>
                            ({q.correctAns})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 👁️ İncele & 🗑️ Sil Butonları */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: '1.5px solid var(--color-border)', paddingLeft: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const rawSub = test.rawSubmission;
                        const isPhysExam = Boolean(
                          rawSub?.type === 'physicalExam' ||
                          rawSub?.contentType === 'physicalExam' ||
                          rawSub?.isPhysical ||
                          isExamBook(rawSub) ||
                          isExamBook(activeBook) ||
                          (test.fullTitle && (test.fullTitle.toLowerCase().includes('deneme') || test.fullTitle.toLowerCase().includes('hazır bulunuşluk') || test.fullTitle.toLowerCase().includes('hazir bulunusluk')))
                        );

                        if (isPhysExam) {
                          const examTargetId = rawSub?.hwId || rawSub?.bookId || test.testId || test.submissionId || test.id;
                          navigate(`/physical-exam/${examTargetId}?studentId=${student.id}`, {
                            state: { from: '/remedials', submission: rawSub }
                          });
                        } else {
                          const subId = test.submissionId || test.id || test.testId;
                          navigate(`/review/${subId}?studentId=${student.id}`, {
                            state: { from: '/remedials', submission: rawSub, test: test }
                          });
                        }
                      }}
                      title="Bu testi ve öğrencinin optik form / soru çözümlerini incele"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 11px',
                        borderRadius: 8,
                        border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #c7d2fe',
                        background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                        color: '#4f46e5',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Eye size={13} />
                      <span>İncele</span>
                    </button>

                    <button
                      type="button"
                      disabled={isThisDeleting}
                      onClick={() => handleDeleteTestSubmission(test)}
                      title="Bu testin çözüm kaydını ve yanlışlarını sil"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca',
                        background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                        color: '#dc2626',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        cursor: isThisDeleting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Sil</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
