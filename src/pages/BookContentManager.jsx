import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, BookMarked, Layers, FileText, CheckCircle, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp, Plus, Edit, Trash2, 
  ListX, Send, XCircle, X, FileOutput, Filter, AlertTriangle, FileJson, CheckSquare, Zap,
  Users, GraduationCap, Clock, Calendar, Award, BarChart2, Check, BookOpen, Settings, RotateCcw, RefreshCw,
  Search, Eye, Copy, AlertCircle
} from 'lucide-react';
import './BookManager.css';
import ManualTestModal from '../components/ManualTestModal';

import { parseAnswerKeyString, sortTestsNaturally, toUUID } from '../features/book-management/constants/bookHelpers';

export function formatSafeInputYMD(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes('.')) {
      const parts = trimmed.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return '';
}

export default function BookContentManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books, bookTests, refreshTrackedBooks, updateTrackedBook, deleteTrackedBookTest, addTrackedBookTest, batchSaveTrackedBookTests, updateTrackedBookTest } = useTrackedBooks();
  const { submissions, refreshSubmissions, isSyncing: isEvaluationSyncing, deleteSubmission, deleteSubmissionsByTestId, deleteStudentSubmissionsForBookOrHw, deleteBookSubmissionsForEveryone } = useEvaluation();
  const { homeworks: allHomeworks, addHomework, updateHomework, deleteHomework, clearHomeworkSubmissionsForStudent } = useHomework();
  const [editDateHw, setEditDateHw] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [scheduleModalHw, setScheduleModalHw] = useState(null);
  const [scheduleDates, setScheduleDates] = useState({});
  const [autoStartDate, setAutoStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoIntervalDays, setAutoIntervalDays] = useState(2);
  const [scheduleSelectedTestIds, setScheduleSelectedTestIds] = useState([]);
  const [bulkApplyDate, setBulkApplyDate] = useState('');
  const [scheduleCollapsedSubj, setScheduleCollapsedSubj] = useState({});
  const [scheduleCollapsedTopic, setScheduleCollapsedTopic] = useState({});
  const { users } = useUser();
  const { data: curData } = useCurriculum() || {};
  
  const [manualModalData, setManualModalData] = useState({ isOpen: false, data: null });
  const [localLiveBook, setLocalLiveBook] = useState(null);
  const [localLiveTests, setLocalLiveTests] = useState(null);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  const handleOpenManualTestForStudent = (student, testItem, hw) => {
    const testDef = testItem.testDef || (bookTests || []).find(bt => String(bt.id) === String(testItem.id)) || {};
    const parentSubject = book?.subjects?.find(s => s.id === testDef.subjectId || s.topics?.some(tp => tp.id === testDef.topicId));
    const parentTopic = parentSubject?.topics?.find(tp => tp.id === testDef.topicId);

    setManualModalData({
      isOpen: true,
      data: {
        studentId: student?.id,
        bookId: book?.id,
        bookTitle: book?.title,
        testId: testItem.id,
        testName: testDef.name || testItem.id,
        subject: parentSubject?.name || testItem.subjName || 'Genel',
        unitTopic: parentTopic?.name || testItem.topicName || '',
        totalQuestions: testDef.questionCount || testItem.questionCount || 12,
        correctCount: testItem.testSub?.correctCount || 0,
        wrongCount: testItem.testSub?.wrongCount || 0,
        emptyCount: testItem.testSub?.emptyCount ?? Math.max(0, (testDef.questionCount || 12) - ((testItem.testSub?.correctCount || 0) + (testItem.testSub?.wrongCount || 0))),
        hwId: hw?.id,
        submissionId: testItem.testSub?.id
      }
    });
  };

  const fetchLiveDirect = async () => {
    if (!id) return;
    setIsLiveLoading(true);
    try {
      const safeBookId = toUUID(id);
      const candidateBookIds = Array.from(new Set([safeBookId, String(id)].filter(Boolean)));

      const [bRes, tRes] = await Promise.all([
        supabase.from('tracked_books').select('*').in('id', candidateBookIds).limit(1),
        supabase.from('tracked_book_tests').select('*').in('book_id', candidateBookIds).order('created_at', { ascending: true })
      ]);

      const b = bRes?.data?.[0] || null;
      const tRows = tRes?.data || [];

      if (b) {
        const rawSubjects = (Array.isArray(b.subjects) && b.subjects.length > 0)
          ? b.subjects
          : (Array.isArray(b.raw_data?.subjects) ? b.raw_data.subjects : []);
        const metaObj = rawSubjects.find(s => s && (s.__meta === true || s.id === '__book_meta__'));
        
        const optCount = metaObj?.optionCount !== undefined
          ? Number(metaObj.optionCount)
          : (b.option_count !== undefined
            ? Number(b.option_count)
            : (b.optionCount !== undefined
              ? Number(b.optionCount)
              : (b.raw_data?.optionCount !== undefined ? Number(b.raw_data.optionCount) : 5)));

        const bType = metaObj?.bookType || b.book_type || b.bookType || b.raw_data?.bookType || (b.id === 'tb_07kzdf_1787267196768' ? 'exam' : 'standard');
        const pub = metaObj?.publisher || b.publisher || b.raw_data?.publisher || '';
        const pdf = metaObj?.pdfUrl || b.pdf_url || b.pdfUrl || b.raw_data?.pdfUrl || '';

        setLocalLiveBook({
          id: String(id),
          dbId: String(b.id),
          title: b.title || metaObj?.title || b.raw_data?.title || '',
          publisher: pub,
          bookType: bType,
          optionCount: Number(optCount) || 5,
          pdfUrl: pdf,
          subjects: rawSubjects.filter(s => !(s && (s.__meta === true || s.id === '__book_meta__'))),
          raw_data: b.raw_data || {}
        });
      }

      if (tRows && tRows.length > 0) {
        const mapped = tRows.map(t => {
          const ansKey = t.answer_key || {};
          const ansMeta = ansKey.__meta || {};
          const isOe = Boolean(
            t.is_open_ended === true ||
            t.isOpenEnded === true ||
            ansMeta.isOpenEnded === true ||
            t.question_type === 'acik_uclu' ||
            t.questionType === 'acik_uclu' ||
            ansMeta.questionType === 'acik_uclu' ||
            (b?.bookType === 'open_ended') ||
            (t.name && /açık uçlu|acik uclu|klasik|yazılı/i.test(t.name))
          );
          const qType = isOe ? 'acik_uclu' : (t.question_type || t.questionType || ansMeta.questionType || 'coktan_secmeli');
          const sId = t.subject_id || ansMeta.subjectId || null;
          const topId = t.topic_id || ansMeta.topicId || null;
          return {
            id: String(t.id),
            bookId: String(t.book_id || ''),
            subjectId: sId ? String(sId) : null,
            topicId: topId ? String(topId) : null,
            name: t.name,
            questionCount: t.question_count || 20,
            answerKey: ansKey,
            isOpenEnded: isOe,
            questionType: qType,
            optionCount: Number(t.option_count || t.optionCount || ansMeta.optionCount) || undefined,
            pdfUrl: t.pdf_url || ansMeta.pdfUrl || '',
            createdAt: t.created_at
          };
        });
        setLocalLiveTests(mapped);
      }
    } catch (err) {
      console.warn('[DirectLiveFetch] Error:', err);
    } finally {
      setIsLiveLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLiveDirect();
  }, [id]);

  const book = useMemo(() => {
    if (localLiveBook) return localLiveBook;
    const found = (books || []).find(b => String(b.id) === String(id) || toUUID(b.id) === toUUID(id));
    if (!found) return null;
    const subjects = (Array.isArray(found.subjects) && found.subjects.length > 0)
      ? found.subjects
      : (Array.isArray(found.raw_data?.subjects) ? found.raw_data.subjects : []);
    return {
      ...found,
      subjects: subjects.filter(s => !(s && (s.__meta === true || s.id === '__book_meta__')))
    };
  }, [books, id, localLiveBook]);

  const tests = useMemo(() => {
    const list = (localLiveTests && localLiveTests.length > 0) ? localLiveTests : (bookTests || []);
    const idStr = String(id || '');
    const idUuid = toUUID(idStr);

    const filtered = list.filter(t => {
      const tBookId = String(t.bookId || t.book_id || '');
      if (!tBookId) return false;
      const isIdMatch = tBookId === idStr || 
        (idUuid && tBookId === idUuid) ||
        (toUUID(tBookId) && toUUID(tBookId) === idUuid) ||
        (toUUID(tBookId) && toUUID(tBookId) === idStr);
      if (isIdMatch) return true;
      if (book?.title && t.bookTitle && String(t.bookTitle).toLowerCase().trim() === String(book.title).toLowerCase().trim()) return true;
      return false;
    });

    // Deduplicate duplicate tests in same subject & topic
    const deduplicatedMap = new Map();
    filtered.forEach(t => {
      const sKey = String(t.subjectId || t.subject_id || t.subjectName || t.subject || '').trim().toLowerCase();
      const topKey = String(t.topicId || t.topic_id || t.topicName || t.topic || 'direct').trim().toLowerCase();
      const nameKey = String(t.name || '').trim().toLowerCase();
      const key = `${sKey}___${topKey}___${nameKey}`;

      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, t);
      } else {
        const existing = deduplicatedMap.get(key);
        const existingAnsCount = Object.keys(existing.answerKey || {}).filter(k => k !== '__meta').length;
        const newAnsCount = Object.keys(t.answerKey || {}).filter(k => k !== '__meta').length;
        if (newAnsCount > existingAnsCount) {
          deduplicatedMap.set(key, t);
        }
      }
    });

    return Array.from(deduplicatedMap.values());
  }, [bookTests, id, book, localLiveTests]);
  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  React.useEffect(() => {
    if (refreshTrackedBooks) refreshTrackedBooks(true);
  }, []);

  // Book Settings Dialog State
  const [isBookSettingsDialogOpen, setIsBookSettingsDialogOpen] = useState(false);
  const [bookSettingsForm, setBookSettingsForm] = useState({ title: '', publisher: '', bookType: 'standard', optionCount: 5, pdfUrl: '' });

  // Extract classes from curriculum & students
  const availableClasses = useMemo(() => {
    const list = [];
    if (curData?.grades && Array.isArray(curData.grades)) {
      curData.grades.forEach(g => list.push({ id: g.id || g.name, name: g.name }));
    }
    students.forEach(s => {
      const clsName = s.grade || s.gradeId || s.className;
      if (clsName && !list.some(c => c.name === clsName || c.id === clsName)) {
        list.push({ id: clsName, name: clsName });
      }
    });
    if (list.length === 0) {
      list.push({ id: '8. Sınıf', name: '8. Sınıf' }, { id: '7. Sınıf', name: '7. Sınıf' }, { id: '6. Sınıf', name: '6. Sınıf' });
    }
    return list;
  }, [curData, students]);

  const [activeTab, setActiveTab] = useState("contents"); // "contents" | "homeworks" | "mistakes"
  
  // Accordion States (Expanded by default)
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const [collapsedTopics, setCollapsedTopics] = useState({});
  const [selectedTests, setSelectedTests] = useState([]);
  const [expandedHomeworkDetails, setExpandedHomeworkDetails] = useState({});
  const [expandedStudentTests, setExpandedStudentTests] = useState({});
  const [studentTestSearch, setStudentTestSearch] = useState({});
  const [studentTestFilter, setStudentTestFilter] = useState({});

  // Modal States
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isBulkWizardOpen, setIsBulkWizardOpen] = useState(false);
  const [bulkWizardTab, setBulkWizardTab] = useState("text"); // "text" | "series" | "json"

  // Form States
  const [currentSubject, setCurrentSubject] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  
  const [testFormData, setTestFormData] = useState({
    name: "",
    pdfUrl: "",
    questionCount: 20,
    answerKey: {},
    isOpenEnded: false,
    questionType: 'coktan_secmeli'
  });
  
  // Bulk Wizard Form States
  const [bulkTextInput, setBulkTextInput] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [sampleFormatTab, setSampleFormatTab] = useState("standard"); // "standard" | "direct" | "open_ended" | "mixed"
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [bulkSeriesData, setBulkSeriesData] = useState({
    subjectName: "",
    topicName: "",
    isDirectSubject: false,
    prefix: "Test",
    testCount: 10,
    questionCount: 20,
    rawAnswerKey: "",
    testType: "coktan_secmeli" // "coktan_secmeli" | "acik_uclu"
  });

  const sampleJsonFormats = {
    standard: `{
  "subjects": [
    {
      "name": "Matematik",
      "topics": [
        {
          "name": "Üslü Sayılar",
          "tests": [
            {
              "name": "Test 1",
              "questionType": "coktan_secmeli",
              "questionCount": 12,
              "answerKey": ["A", "B", "C", "D", "E", "A", "B", "C", "D", "A", "B", "C"]
            }
          ]
        }
      ]
    }
  ]
}`,
    direct: `{
  "subjects": [
    {
      "name": "Türkçe",
      "tests": [
        {
          "name": "Kazanım Testi 1",
          "questionType": "coktan_secmeli",
          "questionCount": 20,
          "answerKey": ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D"]
        },
        {
          "name": "Kazanım Testi 2",
          "questionType": "coktan_secmeli",
          "questionCount": 20,
          "answerKey": ["B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A"]
        }
      ]
    }
  ]
}`,
    open_ended: `{
  "subjects": [
    {
      "name": "Matematik",
      "topics": [
        {
          "name": "Problemler",
          "tests": [
            {
              "name": "7-8. Sayfa",
              "questionType": "acik_uclu",
              "questionCount": 8,
              "answerKey": {
                "1": "103959",
                "2": "2",
                "3": "503976",
                "4": "22",
                "5": "715392",
                "6": "34253",
                "7": "186149",
                "8": "153092"
              }
            },
            {
              "name": "11-12. Sayfa",
              "questionType": "acik_uclu",
              "questionCount": 5,
              "answerKey": {
                "1": "732705",
                "2": "0",
                "3": "700",
                "4": "77777",
                "5": "3"
              }
            }
          ]
        }
      ]
    }
  ]
}`,
    mixed: `{
  "subjects": [
    {
      "name": "Matematik",
      "tests": [
        {
          "name": "7-8. Sayfa (Açık Uçlu)",
          "questionType": "acik_uclu",
          "questionCount": 16,
          "answerKey": {
            "1": "103959",
            "2": "2",
            "3": "503976",
            "4": "22",
            "5": "715392",
            "6": "34253",
            "7": "186149",
            "8": "153092",
            "9": "910910",
            "10": "201030",
            "11": "69930",
            "12": "987615",
            "13": "176740",
            "14": "66",
            "15": "619250",
            "16": "148"
          }
        },
        {
          "name": "79-80. Sayfa (Çoktan Seçmeli)",
          "questionType": "coktan_secmeli",
          "questionCount": 16,
          "answerKey": {
            "1": "B",
            "2": "A",
            "3": "A",
            "4": "A",
            "5": "D",
            "6": "A",
            "7": "C",
            "8": "D",
            "9": "A",
            "10": "C",
            "11": "B",
            "12": "A",
            "13": "A",
            "14": "C",
            "15": "B",
            "16": "B"
          }
        },
        {
          "name": "83-84. Sayfa (Cevap Anahtarsız)",
          "questionType": "acik_uclu",
          "questionCount": 10
        }
      ]
    }
  ]
}`
  };

  const copyToClipboard = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(key);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Assign Homework Modal Form States
  const [assignTargetMode, setAssignTargetMode] = useState("student"); // "student" | "class"
  const [assignSelectedTargetIds, setAssignSelectedTargetIds] = useState([]);
  const [assignCustomTitle, setAssignCustomTitle] = useState("");
  const [assignDueDate, setAssignDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [assignAsBook, setAssignAsBook] = useState(false);
  const [assignDueDateDays, setAssignDueDateDays] = useState(7);
  const [assignExactDueDate, setAssignExactDueDate] = useState("");

  // Mistake Filter States
  const [mistakeFilterSubject, setMistakeFilterSubject] = useState("all");
  const [mistakeFilterTopic, setMistakeFilterTopic] = useState("all");
  const [mistakeFilterStudent, setMistakeFilterStudent] = useState("all");

  const showToast = (msg, type = 'success') => {
    alert(`${type === 'success' ? '✅' : '❌'} ${msg}`);
  };

  // --- BOOK ASSIGNED HOMEWORKS ---
  const bookHomeworks = useMemo(() => {
    const idStr = String(id || '');
    const idUuid = toUUID(idStr);
    const bookTitleClean = (book?.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim().toLowerCase();

    return allHomeworks.filter(hw => {
      const hwBId = String(hw.bookId || hw.book_id || hw.raw_data?.bookId || '');
      if (hwBId && (hwBId === idStr || (idUuid && hwBId === idUuid) || (idUuid && toUUID(hwBId) === idUuid) || toUUID(hwBId) === idStr)) return true;

      const hwTitleClean = (hw.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim().toLowerCase();
      if (bookTitleClean && hwTitleClean && (hwTitleClean.includes(bookTitleClean) || bookTitleClean.includes(hwTitleClean))) return true;

      if (hw.tests && hw.tests.length > 0) {
        return tests.some(t => hw.tests.includes(t.id) || (toUUID(t.id) && hw.tests.includes(toUUID(t.id))) || hw.tests.includes(String(t.id)));
      }
      return false;
    });
  }, [allHomeworks, id, tests, book]);

  // Combined submissions from context + embedded in homeworks
  const allCombinedSubmissions = useMemo(() => {
    const list = [...(submissions || [])];
    const seen = new Set();
    list.forEach(s => {
      if (s.id) seen.add(String(s.id));
      if (s.supabaseId) seen.add(String(s.supabaseId));
      if (s.studentId && s.testId) seen.add(`${s.studentId}_${s.testId}`);
      if (s.studentId && s.bookTestId) seen.add(`${s.studentId}_${s.bookTestId}`);
      if (s.studentId && s.realTestId) seen.add(`${s.studentId}_${s.realTestId}`);
    });

    (bookHomeworks || []).forEach(hw => {
      const embedded = hw.submissions || hw.raw_data?.submissions || hw.results || hw.raw_data?.results || [];
      if (Array.isArray(embedded)) {
        embedded.forEach(item => {
          if (!item) return;
          const tId = item.testId || item.test_id;
          const stId = item.studentId || item.student_id;
          if (!tId || !stId) return;
          const key1 = `${stId}_${tId}`;
          if (seen.has(key1)) return;
          seen.add(key1);

          list.push({
            id: item.id || `sub_emb_${hw.id}_${tId}_${stId}`,
            studentId: stId,
            testId: tId,
            realTestId: tId,
            bookTestId: tId,
            hwId: hw.id,
            homeworkId: hw.id,
            status: item.status || 'completed',
            score: item.score,
            correctCount: item.correctCount,
            wrongCount: item.wrongCount,
            emptyCount: item.emptyCount || item.blankCount || 0,
            blankCount: item.blankCount || item.emptyCount || 0,
            title: item.title || item.testTitle || hw.title,
            answers: item.studentAnswers ? Object.entries(item.studentAnswers).map(([k, v]) => ({ questionNo: Number(k), userAnswer: v, isCorrect: true })) : [],
            createdAt: item.completedAt || item.submittedAt || new Date().toISOString()
          });
        });
      }
    });
    return list;
  }, [submissions, bookHomeworks]);

  // Helper functions for matching submissions to book tests
  const getCandidateSubmissionFields = (s) => {
    if (!s) return [];
    const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a && a.type === 'metadata') : (s.metadata || s.extra_data || {});
    return [
      s.testId,
      s.test_id,
      s.bookTestId,
      s.realTestId,
      meta?.realTestId,
      meta?.bookTestId,
      meta?.realId,
      s.extra_data?.realTestId,
      s.extra_data?.bookTestId,
      ...(Array.isArray(s.bookTestIds) ? s.bookTestIds : [])
    ].filter(Boolean).map(String);
  };

  const isCandidateMatch = (fields, targetId) => {
    const tIdStr = String(targetId || '');
    const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
    const tUuidStr = String(toUUID(targetId) || '');
    return fields.some(cid => (
      cid === tIdStr ||
      cid === tCleanId ||
      cid.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
      (tUuidStr && cid === tUuidStr) ||
      toUUID(cid) === tIdStr ||
      (tUuidStr && toUUID(cid) === tUuidStr)
    ));
  };

  // 1. Pre-index tests for O(1) instant lookup
  const testLookup = useMemo(() => {
    const byId = new Map();
    const byCleanId = new Map();
    const byName = new Map();
    const bySubject = new Map(); // subjectId -> test[]
    const byTopic = new Map(); // topicId -> test[]
    const directBySubject = new Map(); // subjectId -> direct test[]

    (tests || []).forEach(t => {
      const idStr = String(t.id || '');
      const cleanId = idStr.replace(/^bt_/, '').replace(/^q_/, '');
      const uuidStr = toUUID(idStr);
      
      byId.set(idStr, t);
      if (uuidStr) byId.set(uuidStr, t);
      if (cleanId) byCleanId.set(cleanId, t);

      const nameKey = String(t.name || '').toLowerCase().trim();
      if (nameKey) {
        if (!byName.has(nameKey)) byName.set(nameKey, []);
        byName.get(nameKey).push(t);
      }

      const sId = String(t.subjectId || t.subject_id || '');
      const sUuid = sId ? toUUID(sId) : '';
      if (sId) {
        if (!bySubject.has(sId)) bySubject.set(sId, []);
        bySubject.get(sId).push(t);
        if (sUuid && sUuid !== sId) {
          if (!bySubject.has(sUuid)) bySubject.set(sUuid, []);
          bySubject.get(sUuid).push(t);
        }
      }

      const topId = String(t.topicId || t.topic_id || '');
      const topUuid = topId ? toUUID(topId) : '';
      if (topId && topId !== 'direct' && topId !== sId && topId !== 'null' && topId !== 'undefined') {
        if (!byTopic.has(topId)) byTopic.set(topId, []);
        byTopic.get(topId).push(t);
        if (topUuid && topUuid !== topId) {
          if (!byTopic.has(topUuid)) byTopic.set(topUuid, []);
          byTopic.get(topUuid).push(t);
        }
      } else if (sId) {
        if (!directBySubject.has(sId)) directBySubject.set(sId, []);
        directBySubject.get(sId).push(t);
      }
    });

    return { byId, byCleanId, byName, bySubject, byTopic, directBySubject };
  }, [tests]);

  // 2. Pre-index student submissions for O(1) matching
  const studentSolvedIndex = useMemo(() => {
    const solvedMap = new Map(); // studentId -> Set(testId)
    const submissionMap = new Map(); // `${studentId}_${testId}` -> submission

    (allCombinedSubmissions || []).forEach(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return;
      const stId = String(s.studentId || s.student_id || '');
      if (!stId) return;

      if (!solvedMap.has(stId)) solvedMap.set(stId, new Set());
      const stSet = solvedMap.get(stId);

      const stUuid = toUUID(stId);
      if (stUuid && !solvedMap.has(stUuid)) solvedMap.set(stUuid, stSet);

      let matchedTest = null;
      const fields = getCandidateSubmissionFields(s);
      for (const f of fields) {
        matchedTest = testLookup.byId.get(f) || testLookup.byCleanId.get(f.replace(/^bt_/, '').replace(/^q_/, ''));
        if (matchedTest) break;
      }

      if (!matchedTest) {
        const sTestName = String(s.testTitle || s.testName || s.title || '').toLowerCase().trim();
        if (sTestName && testLookup.byName.has(sTestName)) {
          const candidates = testLookup.byName.get(sTestName);
          const sSubj = String(s.subject || s.extra_data?.subject || '').toLowerCase().trim();
          matchedTest = candidates.find(c => {
            const cSubj = String(c.subjectName || c.subject || '').toLowerCase().trim();
            return !sSubj || !cSubj || sSubj === cSubj;
          }) || candidates[0];
        }
      }

      // Collect all key aliases for this test to guarantee 100% matching
      const testKeys = new Set();
      if (matchedTest) {
        testKeys.add(String(matchedTest.id));
        const mUuid = toUUID(matchedTest.id);
        if (mUuid) testKeys.add(mUuid);
        testKeys.add(String(matchedTest.id).replace(/^bt_/, '').replace(/^q_/, ''));
        if (matchedTest.name) {
          testKeys.add(`name_${String(matchedTest.name).toLowerCase().trim()}`);
        }
      }
      fields.forEach(f => {
        if (f) {
          testKeys.add(f);
          const fUuid = toUUID(f);
          if (fUuid) testKeys.add(fUuid);
          testKeys.add(f.replace(/^bt_/, '').replace(/^q_/, ''));
        }
      });
      if (s.testId) testKeys.add(String(s.testId));
      if (s.id) testKeys.add(String(s.id));

      testKeys.forEach(k => {
        stSet.add(k);
        submissionMap.set(`${stId}_${k}`, s);
        if (stUuid) submissionMap.set(`${stUuid}_${k}`, s);
      });
    });

    return { solvedMap, submissionMap };
  }, [allCombinedSubmissions, testLookup]);

  const isSubmissionMatchForTest = (s, targetTestOrId) => {
    if (!s) return false;
    const targetId = typeof targetTestOrId === 'object' ? targetTestOrId?.id : targetTestOrId;
    if (!targetId) return false;
    const targetIdStr = String(targetId);

    const fields = getCandidateSubmissionFields(s);
    for (const f of fields) {
      if (f === targetIdStr || f.replace(/^bt_/, '').replace(/^q_/, '') === targetIdStr.replace(/^bt_/, '').replace(/^q_/, '')) {
        return true;
      }
    }

    const testObj = typeof targetTestOrId === 'object' && targetTestOrId !== null
      ? targetTestOrId
      : testLookup.byId.get(targetIdStr);

    if (testObj) {
      const testName = String(testObj.name || '').toLowerCase().trim();
      const sTestName = String(s.testTitle || s.testName || s.title || '').toLowerCase().trim();
      if (testName && sTestName && (sTestName === testName || sTestName.includes(testName) || testName.includes(sTestName))) {
        return true;
      }
    }
    return false;
  };

  // Homework Analytics
  const homeworkAnalytics = useMemo(() => {
    let totalAssigned = bookHomeworks.length;
    let totalTargetStudents = 0;
    let totalAssignedTestSlots = 0;
    let totalSolvedTestSlots = 0;
    let completedCount = 0;

    bookHomeworks.forEach(hw => {
      let hwStudents = [];
      if (hw.targetType === 'grade' || hw.targetType === 'class') {
        hwStudents = students.filter(s => (hw.targetIds || []).some(tid => String(s.gradeId) === String(tid) || String(s.grade) === String(tid) || String(s.className) === String(tid)));
      } else {
        hwStudents = (hw.targetIds || []).map(tid => students.find(s => String(s.id) === String(tid) || toUUID(s.id) === toUUID(tid)) || { id: tid, name: 'Öğrenci' });
      }
      if (hwStudents.length === 0 && students.length > 0 && (hw.targetType === 'all' || !hw.targetType)) {
        hwStudents = students;
      }
      totalTargetStudents += hwStudents.length;

      let hwTests = (hw.tests && hw.tests.length > 0)
        ? hw.tests
        : (hw.testDueDates && Object.keys(hw.testDueDates).length > 0)
          ? Object.keys(hw.testDueDates)
          : tests.map(t => t.id);

      hwStudents.forEach(st => {
        totalAssignedTestSlots += hwTests.length;
        const stId = String(st.id);
        const stSet = studentSolvedIndex.solvedMap.get(stId) || new Set();

        let solvedInHw = 0;
        hwTests.forEach(tid => {
          if (stSet.has(String(tid))) solvedInHw++;
        });

        totalSolvedTestSlots += solvedInHw;
        if (solvedInHw >= hwTests.length && hwTests.length > 0) {
          completedCount++;
        }
      });
    });

    const completionRate = totalAssignedTestSlots > 0
      ? Math.round((totalSolvedTestSlots / totalAssignedTestSlots) * 100)
      : (totalTargetStudents > 0 ? Math.round((completedCount / totalTargetStudents) * 100) : 0);

    return { totalAssigned, totalTargetStudents, completedCount, completionRate, totalSolvedTestSlots, totalAssignedTestSlots };
  }, [bookHomeworks, students, studentSolvedIndex, tests]);

  // --- PARSE TEXT LINES FOR BULK WIZARD ---
  const parsedBulkStructure = useMemo(() => {
    if (!bulkTextInput.trim()) return { subjectsMap: {}, totalTests: 0, totalTopics: 0, totalSubjects: 0 };

    const lines = bulkTextInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const subjectsMap = {};
    let totalTestsCount = 0;

    lines.forEach(line => {
      let lineText = line;
      let rawAns = "";

      if (lineText.includes(':')) {
        const parts = lineText.split(':');
        lineText = parts[0].trim();
        rawAns = parts[1].trim();
      } else if (lineText.includes('[')) {
        const match = lineText.match(/^(.+?)\s*\[([A-Ea-e]+)\]$/);
        if (match) {
          lineText = match[1].trim();
          rawAns = match[2].trim();
        }
      }

      if (lineText.includes('>')) {
        const parts = lineText.split('>').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const sName = parts[0];
          const tName = parts[1];
          const testName = parts.slice(2).join(' - ');

          if (!subjectsMap[sName]) subjectsMap[sName] = { topics: {}, directTests: [] };
          if (!subjectsMap[sName].topics[tName]) subjectsMap[sName].topics[tName] = [];
          subjectsMap[sName].topics[tName].push({ name: testName, rawAns });
          totalTestsCount++;
        } else if (parts.length === 2) {
          const sName = parts[0];
          const testName = parts[1];

          if (!subjectsMap[sName]) subjectsMap[sName] = { topics: {}, directTests: [] };
          subjectsMap[sName].directTests.push({ name: testName, rawAns });
          totalTestsCount++;
        }
      } else {
        const countMatch = lineText.match(/^(.+?)\s*\((\d+)\s*(?:test|Test)?\)$/i);
        if (countMatch) {
          const title = countMatch[1].trim();
          const count = parseInt(countMatch[2], 10) || 1;
          const defaultSubj = "Genel";
          if (!subjectsMap[defaultSubj]) subjectsMap[defaultSubj] = { topics: {}, directTests: [] };
          if (!subjectsMap[defaultSubj].topics[title]) subjectsMap[defaultSubj].topics[title] = [];
          for (let i = 1; i <= count; i++) {
            subjectsMap[defaultSubj].topics[title].push({ name: `Test ${i}`, rawAns });
            totalTestsCount++;
          }
        } else {
          const defaultSubj = "Genel";
          if (!subjectsMap[defaultSubj]) subjectsMap[defaultSubj] = { topics: {}, directTests: [] };
          subjectsMap[defaultSubj].directTests.push({ name: lineText, rawAns });
          totalTestsCount++;
        }
      }
    });

    const totalSubjects = Object.keys(subjectsMap).length;
    let totalTopics = 0;
    Object.values(subjectsMap).forEach(s => {
      totalTopics += Object.keys(s.topics).length;
    });

    return { subjectsMap, totalTests: totalTestsCount, totalTopics, totalSubjects };
  }, [bulkTextInput]);

  // --- MISTAKE ANALYSIS LOGIC ---
  const mistakeList = useMemo(() => {
    const mistakesBySubject = {};
    const solvedSubmissions = (allCombinedSubmissions || []).filter(s => s && s.status !== 'in_progress' && s.status !== 'draft');

    for (const sub of solvedSubmissions) {
      const candidateFields = getCandidateSubmissionFields(sub);
      let testDef = null;
      for (const f of candidateFields) {
        testDef = testLookup.byId.get(f) || testLookup.byCleanId.get(f.replace(/^bt_/, '').replace(/^q_/, ''));
        if (testDef) break;
      }
      if (!testDef) {
        const sTestName = String(sub.testTitle || sub.testName || sub.title || '').toLowerCase().trim();
        if (sTestName && testLookup.byName.has(sTestName)) {
          testDef = testLookup.byName.get(sTestName)[0];
        }
      }
      if (!testDef) continue;
      
      const subject = book?.subjects?.find(s => String(s.id) === String(testDef.subjectId));
      const topic = subject?.topics?.find(t => String(t.id) === String(testDef.topicId));

      const subjName = subject?.name || 'Genel';
      const topName = topic?.name || 'Direkt Testler';
      const stName = students.find(st => String(st.id) === String(sub.studentId) || toUUID(st.id) === toUUID(sub.studentId))?.name || sub.studentName || 'Öğrenci';

      const answersArr = Array.isArray(sub.answers) ? sub.answers : [];
      answersArr.forEach((ans, ansIdx) => {
        if (!ans.isCorrect) {
          const isBlank = ans.isBlank || ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
          if (!mistakesBySubject[subjName]) mistakesBySubject[subjName] = {};
          if (!mistakesBySubject[subjName][topName]) mistakesBySubject[subjName][topName] = [];
          
          const rawNum = ans.questionNo || ans.qNo || ans.questionNumber || (ans.questionIndex !== undefined ? ans.questionIndex + 1 : null) || (ans.questionId ? parseInt(String(ans.questionId).replace(/\D/g, '')) : null) || (ansIdx + 1);
          const qNum = Number(rawNum) || (ansIdx + 1);

          mistakesBySubject[subjName][topName].push({ 
            submission: { ...sub, studentName: stName }, 
            studentId: String(sub.studentId),
            studentName: stName,
            testDef, 
            questionNumber: qNum,
            isBlank
          });
        }
      });
    }
    return mistakesBySubject;
  }, [allCombinedSubmissions, tests, book, students]);

  const { filteredMistakes, subjectOptions, topicOptions, studentOptions } = useMemo(() => {
    const flatList = [];
    Object.entries(mistakeList).forEach(([subjectName, topics]) => {
        Object.entries(topics).forEach(([topicName, mistakes]) => {
            mistakes.forEach(mistake => {
                flatList.push({ subjectName, topicName, ...mistake });
            });
        });
    });

    const filtered = flatList.filter(m => {
        if (mistakeFilterSubject !== 'all' && m.subjectName !== mistakeFilterSubject) return false;
        if (mistakeFilterTopic !== 'all' && m.topicName !== mistakeFilterTopic) return false;
        if (mistakeFilterStudent !== 'all' && String(m.studentId) !== String(mistakeFilterStudent)) return false;
        return true;
    });

    const grouped = [];
    const map = new Map();
    filtered.forEach(m => {
        const key = `${m.studentId}_${m.testDef.id}`;
        const qNum = Number(m.questionNumber) || 1;
        if (!map.has(key)) {
            map.set(key, {
                subjectName: m.subjectName,
                topicName: m.topicName,
                testDef: m.testDef,
                studentId: m.studentId,
                studentName: m.studentName,
                submission: m.submission,
                questionData: [{ num: qNum, isBlank: m.isBlank }]
            });
            grouped.push(map.get(key));
        } else {
            if (!map.get(key).questionData.find(q => q.num === qNum)) {
                map.get(key).questionData.push({ num: qNum, isBlank: m.isBlank });
            }
        }
    });

    grouped.forEach(g => {
        g.questionData.sort((a, b) => a.num - b.num);
    });

    const subjects = Array.from(new Set(flatList.map(m => m.subjectName))).sort();
    const topics = Array.from(new Set(
        flatList.filter(m => mistakeFilterSubject === 'all' || m.subjectName === mistakeFilterSubject).map(m => m.topicName)
    )).sort();

    const uniqueStudentIds = Array.from(new Set(flatList.map(m => m.studentId)));
    const studentOpts = uniqueStudentIds.map(stId => {
      const found = students.find(s => String(s.id) === String(stId));
      return { id: stId, name: found?.name || 'Öğrenci' };
    }).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    return { filteredMistakes: grouped, subjectOptions: subjects, topicOptions: topics, studentOptions: studentOpts };
  }, [mistakeList, mistakeFilterSubject, mistakeFilterTopic, mistakeFilterStudent, students]);

  // --- HANDLERS ---
  const toggleSubject = (subjId) => setCollapsedSubjects(p => ({ ...p, [subjId]: p[subjId] === false ? true : false }));
  const toggleTopic = (topicId) => setCollapsedTopics(p => ({ ...p, [topicId]: p[topicId] === false ? true : false }));
  const toggleTestSelection = (testId) => setSelectedTests(p => p.includes(testId) ? p.filter(id => id !== testId) : [...p, testId]);
  const toggleHwDetails = (hwId) => setExpandedHomeworkDetails(p => ({ ...p, [hwId]: !p[hwId] }));

  const handleSubjectSave = async () => {
    if (!book || !newSubjectName.trim()) return;
    const subjects = book.subjects || [];
    if (currentSubject) {
      const updatedSubjects = subjects.map(s => String(s.id) === String(currentSubject.id) ? { ...s, name: newSubjectName } : s);
      updateTrackedBook(book.id, { subjects: updatedSubjects });
    } else {
      const newSubject = { id: `subj_${Date.now()}`, name: newSubjectName, topics: [] };
      updateTrackedBook(book.id, { subjects: [...subjects, newSubject] });
    }
    setIsSubjectDialogOpen(false);
    setNewSubjectName("");
    setCurrentSubject(null);
  };

  const handleDeleteSubject = (subjId) => {
    if (window.confirm("Bu dersi ve içindeki tüm konuları/testleri silmek istediğinize emin misiniz?")) {
      const updatedSubjects = (book.subjects || []).filter(s => String(s.id) !== String(subjId));
      updateTrackedBook(book.id, { subjects: updatedSubjects });
    }
  };

  const handleTopicSave = async () => {
    if (!book || !currentSubject || !newTopicName.trim()) return;
    const subjects = (book.subjects || []).map(subject => {
        if(String(subject.id) === String(currentSubject.id)) {
            const topics = subject.topics || [];
            if (currentTopic) {
                return {...subject, topics: topics.map(t => String(t.id) === String(currentTopic.id) ? { ...t, name: newTopicName } : t)};
            } else {
                 const newTopic = { id: `topic_${Date.now()}`, name: newTopicName };
                 return {...subject, topics: [...topics, newTopic]};
            }
        }
        return subject;
    });
    updateTrackedBook(book.id, { subjects });
    setIsTopicDialogOpen(false);
    setNewTopicName("");
    setCurrentTopic(null);
  };

  const handleDeleteTopic = (subjId, topicId) => {
    if (window.confirm("Bu konuyu silmek istediğinize emin misiniz?")) {
      const subjects = (book.subjects || []).map(subject => {
        if (String(subject.id) === String(subjId)) {
          return { ...subject, topics: (subject.topics || []).filter(t => String(t.id) !== String(topicId)) };
        }
        return subject;
      });
      updateTrackedBook(book.id, { subjects });
    }
  };

  const handleCleanDuplicateTests = async () => {
    if (!window.confirm('Bu kitaptaki aynı isimli mükerrer (çift) testler taranıp fazla kayıtlar veritabanından silinecek. Onaylıyor musunuz?')) return;
    setIsLiveLoading(true);
    try {
      const safeBookId = toUUID(id);
      const candidateBookIds = Array.from(new Set([safeBookId, String(id)].filter(Boolean)));

      const { data: allDbTests, error: fetchErr } = await supabase
        .from('tracked_book_tests')
        .select('*')
        .in('book_id', candidateBookIds);

      if (fetchErr) throw fetchErr;

      const seenKeys = new Map();
      const duplicateIdsToDelete = [];

      (allDbTests || []).forEach(t => {
        const sKey = String(t.subject_id || '').trim().toLowerCase();
        const topKey = String(t.topic_id || 'direct').trim().toLowerCase();
        const nameKey = String(t.name || '').trim().toLowerCase();
        const key = `${sKey}___${topKey}___${nameKey}`;

        if (!seenKeys.has(key)) {
          seenKeys.set(key, t);
        } else {
          duplicateIdsToDelete.push(t.id);
        }
      });

      if (duplicateIdsToDelete.length === 0) {
        showToast('Mükerrer test bulunamadı, tüm testler benzersiz.', 'info');
      } else {
        for (let i = 0; i < duplicateIdsToDelete.length; i += 50) {
          const chunk = duplicateIdsToDelete.slice(i, i + 50);
          await supabase.from('tracked_book_tests').delete().in('id', chunk);
        }

        try {
          const localTests = JSON.parse(localStorage.getItem('eTestTrackedBookTests') || '[]');
          const delSet = new Set(duplicateIdsToDelete.map(String));
          const cleanedLocal = localTests.filter(t => !delSet.has(String(t.id)));
          safeSetItem('eTestTrackedBookTests', JSON.stringify(cleanedLocal));
        } catch {}

        await fetchLiveDirect();
        if (refreshTrackedBooks) await refreshTrackedBooks();
        showToast(`${duplicateIdsToDelete.length} adet mükerrer test veritabanından başarıyla temizlendi!`, 'success');
      }
    } catch (err) {
      console.error('Error cleaning duplicate tests:', err);
      showToast(`Hata: ${err.message}`, 'error');
    } finally {
      setIsLiveLoading(false);
    }
  };

  const handleOpenEditTest = (subject, topic, test) => {
    setCurrentSubject(subject || null);
    setCurrentTopic(topic || null);
    setCurrentTest(test);
    const qCount = Number(test.questionCount) || (test.answerKey ? Object.keys(test.answerKey).length : 0) || 20;

    // Test bazında tip tespiti (karma kitaplar için)
    const testIsOpenEnded = Boolean(
      test.isOpenEnded === true ||
      test.is_open_ended === true ||
      test.questionType === 'acik_uclu' ||
      test.question_type === 'acik_uclu' ||
      test.answerKey?.__meta?.isOpenEnded === true ||
      test.answerKey?.__meta?.questionType === 'acik_uclu' ||
      (book?.bookType === 'open_ended') ||
      (test.name && /açık uçlu|acik uclu|klasik|yazılı/i.test(test.name))
    );

    const testQuestionType = testIsOpenEnded ? 'acik_uclu' : (test.questionType || test.question_type || 'coktan_secmeli');

    setTestFormData({
      name: test.name || '',
      questionCount: qCount,
      answerKey: test.answerKey ? { ...test.answerKey } : {},
      pdfUrl: test.pdfUrl || '',
      isOpenEnded: testIsOpenEnded,
      questionType: testQuestionType
    });
    setIsTestDialogOpen(true);
  };

  const handleTestSave = async () => {
    if (!book || !testFormData.name?.trim()) {
      showToast('Lütfen test adını giriniz.', 'error');
      return;
    }
    
    const targetSubjectId = currentSubject?.id || currentTest?.subjectId || null;
    const targetTopicId = currentTopic ? String(currentTopic.id) : (currentTest?.topicId || null);

    const isOe = testFormData.isOpenEnded === true || testFormData.questionType === 'acik_uclu';
    const qType = isOe ? 'acik_uclu' : 'coktan_secmeli';

    const testPayload = {
      bookId: String(book.id),
      subjectId: targetSubjectId ? String(targetSubjectId) : null,
      topicId: targetTopicId,
      name: testFormData.name.trim(),
      questionCount: Number(testFormData.questionCount) || 20,
      pdfUrl: testFormData.pdfUrl || '',
      isOpenEnded: isOe,
      questionType: qType,
      answerKey: testFormData.answerKey || {},
    };

    try {
      if (currentTest) {
        setLocalLiveTests(prev => (prev || []).map(t => String(t.id) === String(currentTest.id) ? { ...t, ...testPayload } : t));
        await updateTrackedBookTest(currentTest.id, testPayload);
        showToast('Test başarıyla güncellendi.', 'success');
      } else {
        const added = await addTrackedBookTest(book.id, testPayload);
        if (added) {
          setLocalLiveTests(prev => [...(prev || []), added]);
        }
        showToast('Yeni test başarıyla eklendi.', 'success');
      }

      // If test is open-ended and book was standard, automatically update book to mixed
      if (isOe && book.bookType === 'standard') {
        setLocalLiveBook(prev => prev ? ({ ...prev, bookType: 'mixed' }) : prev);
        await updateTrackedBook(book.id, { bookType: 'mixed' });
      }

      setIsTestDialogOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Test kaydedilirken bir hata oluştu.', 'error');
    }
  };

  const handleBulkChangeSubjectTestType = async (subject, targetType) => {
    const isOe = targetType === 'acik_uclu';
    const typeLabel = isOe ? 'Açık Uçlu / Sayısal' : 'Çoktan Seçmeli';
    const subjTests = tests.filter(t => {
      const sIdMatch = String(t.subjectId || t.subject_id || '') === String(subject.id) ||
        String(t.subjectId || t.subject_id || t.subject || '').toLowerCase().trim() === String(subject.name || '').toLowerCase().trim();
      return sIdMatch;
    });

    if (subjTests.length === 0) {
      showToast(`"${subject.name}" dersinde test bulunmuyor.`, 'error');
      return;
    }

    if (!window.confirm(`"${subject.name}" dersindeki toplam ${subjTests.length} adet testin tipini "${typeLabel}" yapmak istediğinize emin misiniz?`)) {
      return;
    }

    const updatedSubjTests = subjTests.map(t => ({
      ...t,
      isOpenEnded: isOe,
      questionType: targetType
    }));

    const subjTestIdSet = new Set(subjTests.map(t => String(t.id)));
    setLocalLiveTests(prev => (prev || []).map(t => subjTestIdSet.has(String(t.id)) ? { ...t, isOpenEnded: isOe, questionType: targetType } : t));

    await batchSaveTrackedBookTests(updatedSubjTests);

    if (isOe && book.bookType === 'standard') {
      setLocalLiveBook(prev => prev ? ({ ...prev, bookType: 'mixed' }) : prev);
      await updateTrackedBook(book.id, { bookType: 'mixed' });
    }

    showToast(`"${subject.name}" dersindeki ${subjTests.length} test başarıyla "${typeLabel}" olarak güncellendi! 🎉`);
  };

  // --- BULK WIZARD EXECUTION ---
  const handleExecuteBulkText = async () => {
    const { subjectsMap, totalTests } = parsedBulkStructure;
    if (totalTests === 0) {
      showToast("Lütfen geçerli içerik satırları giriniz.", "error");
      return;
    }

    const updatedSubjects = JSON.parse(JSON.stringify(book.subjects || []));
    const testsToBatch = [];
    const genId = (prefix) => prefix + "_" + Date.now().toString() + Math.random().toString(36).substring(2, 7);

    Object.entries(subjectsMap).forEach(([sName, sData]) => {
      let subject = updatedSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === sName.toLocaleLowerCase('tr-TR'));
      if (!subject) {
        subject = { id: `subj_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`, name: sName, topics: [] };
        updatedSubjects.push(subject);
      }
      if (!subject.topics) subject.topics = [];

      sData.directTests.forEach((tObj) => {
        const testName = typeof tObj === 'string' ? tObj : tObj.name;
        const rawAns = typeof tObj === 'object' ? tObj.rawAns : "";
        const isOe = (book?.bookType === 'open_ended') ||
          testName.toLowerCase().includes('açık uçlu') ||
          testName.toLowerCase().includes('acik uclu') ||
          testName.toLowerCase().includes('klasik');

        let ansObj = {};
        if (rawAns) {
          if (isOe && (rawAns.includes(',') || !/^[A-Ea-e]+$/.test(rawAns))) {
            rawAns.split(/[,;\s]+/).filter(Boolean).forEach((p, idx) => {
              ansObj[String(idx + 1)] = p.trim();
            });
          } else {
            ansObj = parseAnswerKeyString(rawAns, 20);
          }
        }

        testsToBatch.push({
          id: genId("tbt"),
          bookId: String(book.id),
          subjectId: String(subject.id),
          topicId: null,
          name: testName,
          questionCount: 20,
          answerKey: ansObj,
          isOpenEnded: isOe,
          questionType: isOe ? 'acik_uclu' : 'coktan_secmeli'
        });
      });

      Object.entries(sData.topics).forEach(([tName, testObjs]) => {
        let topic = subject.topics.find(t => t.name?.toLocaleLowerCase('tr-TR') === tName.toLocaleLowerCase('tr-TR'));
        if (!topic) {
          topic = { id: `topic_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`, name: tName };
          subject.topics.push(topic);
        }

        testObjs.forEach((tObj) => {
          const testName = typeof tObj === 'string' ? tObj : tObj.name;
          const rawAns = typeof tObj === 'object' ? tObj.rawAns : "";
          const isOe = (book?.bookType === 'open_ended') ||
            testName.toLowerCase().includes('açık uçlu') ||
            testName.toLowerCase().includes('acik uclu') ||
            testName.toLowerCase().includes('klasik');

          let ansObj = {};
          if (rawAns) {
            if (isOe && (rawAns.includes(',') || !/^[A-Ea-e]+$/.test(rawAns))) {
              rawAns.split(/[,;\s]+/).filter(Boolean).forEach((p, idx) => {
                ansObj[String(idx + 1)] = p.trim();
              });
            } else {
              ansObj = parseAnswerKeyString(rawAns, 20);
            }
          }

          testsToBatch.push({
            id: genId("tbt"),
            bookId: String(book.id),
            subjectId: String(subject.id),
            topicId: String(topic.id),
            name: testName,
            questionCount: 20,
            answerKey: ansObj,
            isOpenEnded: isOe,
            questionType: isOe ? 'acik_uclu' : 'coktan_secmeli'
          });
        });
      });
    });

    setLocalLiveBook(prev => prev ? ({ ...prev, subjects: updatedSubjects }) : prev);
    await updateTrackedBook(book.id, { subjects: updatedSubjects });

    if (testsToBatch.length > 0) {
      setLocalLiveTests(prev => [...(prev || []), ...testsToBatch]);
      await batchSaveTrackedBookTests(testsToBatch);
    }

    showToast(`${totalTests} test ve içerik yapısı başarıyla eklendi! 🎉`);
    setIsBulkWizardOpen(false);
    setBulkTextInput("");
  };

  const handleExecuteBulkSeries = async () => {
    const { subjectName, topicName, isDirectSubject, prefix, testCount, questionCount, rawAnswerKey, testType } = bulkSeriesData;
    if (!subjectName.trim() || testCount <= 0) {
      showToast("Lütfen ders adı ve geçerli test sayısı giriniz.", "error");
      return;
    }

    const isOe = testType === 'acik_uclu' || book?.bookType === 'open_ended';
    let answerKeyObj = {};

    if (rawAnswerKey && rawAnswerKey.trim()) {
      if (isOe && (rawAnswerKey.includes(',') || !/^[A-Ea-e]+$/.test(rawAnswerKey.trim()))) {
        const parts = rawAnswerKey.split(/[,;\s]+/).filter(Boolean);
        parts.forEach((p, idx) => {
          if (idx < (questionCount || 20)) answerKeyObj[String(idx + 1)] = p.trim();
        });
      } else {
        answerKeyObj = parseAnswerKeyString(rawAnswerKey, questionCount || 20);
      }
    }

    const updatedSubjects = JSON.parse(JSON.stringify(book.subjects || []));
    let subject = updatedSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === subjectName.trim().toLocaleLowerCase('tr-TR'));

    if (!subject) {
      subject = { id: `subj_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`, name: subjectName.trim(), topics: [] };
      updatedSubjects.push(subject);
    }
    if (!subject.topics) subject.topics = [];

    let topicId = null;
    if (!isDirectSubject && topicName.trim()) {
      let topic = subject.topics.find(t => t.name?.toLocaleLowerCase('tr-TR') === topicName.trim().toLocaleLowerCase('tr-TR'));
      if (!topic) {
        topic = { id: `topic_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`, name: topicName.trim() };
        subject.topics.push(topic);
      }
      topicId = String(topic.id);
    }

    const testsToBatch = [];
    const genId = (prefixStr) => prefixStr + "_" + Date.now().toString() + Math.random().toString(36).substring(2, 7);

    for (let i = 1; i <= testCount; i++) {
      testsToBatch.push({
        id: genId("tbt"),
        bookId: String(book.id),
        subjectId: String(subject.id),
        topicId: topicId,
        name: `${prefix || 'Test'} ${i}`,
        questionCount: questionCount || 20,
        answerKey: answerKeyObj,
        isOpenEnded: isOe,
        questionType: isOe ? 'acik_uclu' : 'coktan_secmeli'
      });
    }

    setLocalLiveBook(prev => prev ? ({ ...prev, subjects: updatedSubjects }) : prev);
    await updateTrackedBook(book.id, { subjects: updatedSubjects });

    if (testsToBatch.length > 0) {
      setLocalLiveTests(prev => [...(prev || []), ...testsToBatch]);
      await batchSaveTrackedBookTests(testsToBatch);
    }

    showToast(`${testCount} adet test başarıyla eklendi! 🎉`);
    setIsBulkWizardOpen(false);
  };

  const handleExecuteJsonImport = async () => {
    if (!jsonInput.trim() || !book) return;
    try {
      const parsedData = JSON.parse(jsonInput);
      const subjectsList = parsedData.subjects || (Array.isArray(parsedData) ? parsedData : null);

      if (!subjectsList || !Array.isArray(subjectsList)) {
        throw new Error("Geçersiz format: JSON verisi bir 'subjects' dizisi içermelidir.");
      }

      const existingSubjects = book.subjects || [];
      const existingTestsList = [...(tests || [])];
      const usedExistingTestIds = new Set();
      const allTestsToSave = [];

      const genId = (prefix) => prefix + "_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);

      const updatedSubjects = [];

      let hasAnyOpenEnded = false;
      let hasAnyMultipleChoice = false;

      const formatTestPayload = (testData, subjectId, topicId = null) => {
        const testIsOpenEnded =
          testData.isOpenEnded === true ||
          testData.questionType === 'acik_uclu' ||
          (book.bookType === 'open_ended' && testData.questionType !== 'coktan_secmeli') ||
          String(testData.name || '').toLowerCase().includes('açık uçlu') ||
          String(testData.name || '').toLowerCase().includes('acik uclu') ||
          String(testData.name || '').toLowerCase().includes('klasik');

        const questionType = testData.questionType ||
          (testIsOpenEnded ? 'acik_uclu' : 'coktan_secmeli');

        if (testIsOpenEnded || questionType === 'acik_uclu') hasAnyOpenEnded = true;
        else hasAnyMultipleChoice = true;

        const testNameClean = String(testData.name || "İsimsiz Test").trim();

        // 1. Check if test already exists in this subject/topic or book with matching name or ID
        let existingTest = null;
        if (testData.id) {
          existingTest = existingTestsList.find(t => String(t.id) === String(testData.id));
        }
        if (!existingTest) {
          existingTest = existingTestsList.find(t => {
            if (usedExistingTestIds.has(String(t.id))) return false;
            const nameMatch = String(t.name || '').trim().toLowerCase() === testNameClean.toLowerCase();
            if (!nameMatch) return false;
            const sMatch = String(t.subjectId || '') === String(subjectId);
            const topMatch = topicId ? String(t.topicId || '') === String(topicId) : (!t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subjectId));
            return sMatch && topMatch;
          });
        }
        if (!existingTest) {
          existingTest = existingTestsList.find(t => {
            if (usedExistingTestIds.has(String(t.id))) return false;
            return String(t.name || '').trim().toLowerCase() === testNameClean.toLowerCase();
          });
        }

        let testId;
        if (existingTest) {
          testId = String(existingTest.id);
          usedExistingTestIds.add(testId);
        } else if (testData.id) {
          testId = String(testData.id);
          usedExistingTestIds.add(testId);
        } else {
          testId = genId("tbt");
        }

        const testPayload = {
          id: testId,
          bookId: String(book.id),
          subjectId: String(subjectId),
          topicId: topicId ? String(topicId) : null,
          name: testNameClean,
          questionCount: Number(testData.questionCount || testData.question_count) || (existingTest?.questionCount || 20),
          answerKey: {},
          isOpenEnded: testIsOpenEnded,
          questionType,
          pdfUrl: testData.pdfUrl || existingTest?.pdfUrl || '',
          updatedAt: new Date().toISOString()
        };

        if (testData.answerKey || testData.answer_key) {
          const rawAns = testData.answerKey || testData.answer_key;
          if (Array.isArray(rawAns)) {
            rawAns.forEach((ans, idx) => {
              if (ans !== undefined && ans !== null && ans !== "") {
                testPayload.answerKey[String(idx + 1)] = String(ans);
              }
            });
          } else if (typeof rawAns === 'object') {
            Object.entries(rawAns).forEach(([k, v]) => {
              if (v !== undefined && v !== null && v !== "" && k !== '__meta') {
                testPayload.answerKey[String(k)] = String(v);
              }
            });
          } else if (typeof rawAns === 'string') {
            testPayload.answerKey = parseAnswerKeyString(rawAns, testPayload.questionCount);
          }
        } else if (existingTest?.answerKey) {
          testPayload.answerKey = { ...existingTest.answerKey };
        }

        return testPayload;
      };

      for (const subjData of subjectsList) {
        if (!subjData.name) continue;

        const existingSub = existingSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === subjData.name.toLocaleLowerCase('tr-TR'));
        const subject = {
          id: existingSub?.id || genId("s"),
          name: subjData.name,
          topics: []
        };
        updatedSubjects.push(subject);

        // 1. Direct tests under subject (Ders > Test)
        if (subjData.tests && Array.isArray(subjData.tests)) {
          for (const testData of subjData.tests) {
            allTestsToSave.push(formatTestPayload(testData, subject.id, null));
          }
        }

        // 2. Topic-based tests (Ders > Konu > Test)
        if (subjData.topics && Array.isArray(subjData.topics)) {
          for (const topicData of subjData.topics) {
            if (!topicData.name) continue;

            const existingTop = (existingSub?.topics || []).find(t => t.name?.toLocaleLowerCase('tr-TR') === topicData.name.toLocaleLowerCase('tr-TR'));
            const topic = {
              id: existingTop?.id || genId("t"),
              name: topicData.name
            };
            subject.topics.push(topic);

            if (topicData.tests && Array.isArray(topicData.tests)) {
              for (const testData of topicData.tests) {
                allTestsToSave.push(formatTestPayload(testData, subject.id, topic.id));
              }
            }
          }
        }
      }

      let newBookType = book.bookType || 'standard';
      if (parsedData.bookType) {
        newBookType = parsedData.bookType;
      } else if (hasAnyOpenEnded && hasAnyMultipleChoice) {
        newBookType = 'mixed';
      } else if (hasAnyOpenEnded && !hasAnyMultipleChoice) {
        newBookType = 'open_ended';
      }

      setLocalLiveBook(prev => prev ? ({ ...prev, subjects: updatedSubjects, bookType: newBookType }) : prev);
      await updateTrackedBook(book.id, { subjects: updatedSubjects, bookType: newBookType, updatedAt: new Date().toISOString() });

      if (allTestsToSave.length > 0) {
        setLocalLiveTests(prev => {
          const map = new Map((prev || []).map(t => [String(t.id), t]));
          allTestsToSave.forEach(t => {
            const idStr = String(t.id);
            map.set(idStr, { ...(map.get(idStr) || {}), ...t });
          });
          return Array.from(map.values());
        });
        await batchSaveTrackedBookTests(allTestsToSave);
      }

      showToast(`${book.title} kitabına ${allTestsToSave.length} test başarıyla güncellendi/eklendi! 🎉`);
      setJsonInput("");
      setIsBulkWizardOpen(false);
    } catch (error) {
      console.error(error);
      showToast("Geçersiz JSON formatı: " + (error.message || "Lütfen verilen örnekleri inceleyin."), "error");
    }
  };

  // --- OPEN ASSIGN DIALOG PREPARATION ---
  const handleOpenAssignModal = () => {
    if (selectedTests.length === 0) return;
    const selectedTestObjs = tests.filter(t => selectedTests.includes(t.id));
    const testNames = selectedTestObjs.map(t => t.name).join(", ");
    setAssignCustomTitle(`${book.title} - ${testNames}`);
    setAssignTargetMode("class");
    setAssignSelectedTargetIds([]);
    setIsAssignDialogOpen(true);
  };

  const handleToggleTargetId = (targetId) => {
    setAssignSelectedTargetIds(prev => 
      prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
    );
  };

  const handleAssignSelectedTestsSubmit = async () => {
    if (selectedTests.length === 0 || assignSelectedTargetIds.length === 0) {
      showToast("Lütfen en az bir hedef kitle (Sınıf veya Öğrenci) seçiniz.", "error");
      return;
    }

    const selectedTestObjs = tests.filter(t => selectedTests.includes(t.id));
    const totalQCount = selectedTestObjs.reduce((acc, t) => acc + (t.questionCount || 20), 0);

    let dueDueDate = new Date();
    if (assignExactDueDate) {
      dueDueDate = new Date(assignExactDueDate);
      dueDueDate.setHours(23, 59, 59, 999);
    } else {
      dueDueDate.setDate(dueDueDate.getDate() + (assignDueDateDays || 7));
    }

    await addHomework({
      title: assignCustomTitle || `${book.title} - ${selectedTests.length} Test`,
      description: `${book.title} fiziki kitaptan ${selectedTestObjs.map(t => t.name).join(', ')} testleri çözülecektir.`,
      targetType: assignTargetMode, // 'class' or 'student'
      targetIds: assignSelectedTargetIds,
      dueDate: dueDueDate.toISOString(),
      tests: selectedTests,
      sourceType: 'trackedBook',
      bookId: book.id,
      isBookAssignment: assignAsBook,
      totalQuestions: totalQCount,
      subject: selectedTestObjs[0]?.subjectName || book.publisher || 'Kitap Takibi'
    });

    showToast(`${selectedTests.length} test ${assignTargetMode === 'class' ? 'sınıfa' : 'öğrenciye'} başarıyla ödev olarak atandı!`);
    setIsAssignDialogOpen(false);
    setSelectedTests([]);
    setAssignSelectedTargetIds([]);
    setAssignAsBook(false);
    setAssignExactDueDate("");
  };

  const handleAssignEntireBook = () => {
    setSelectedTests(tests.map(t => t.id));
    setAssignCustomTitle(`${book.title} (Tüm Kitap Görevi)`);
    setAssignAsBook(true);
    setAssignDueDateDays(90);
    setIsAssignDialogOpen(true);
  };

  const handleAssignSubject = (subject) => {
    const subjectTests = tests.filter(t => String(t.subjectId) === String(subject.id));
    if (subjectTests.length === 0) {
      showToast("Bu derse ait test bulunmamaktadır.", "error");
      return;
    }
    setSelectedTests(subjectTests.map(t => t.id));
    setAssignCustomTitle(`${book.title} - ${subject.name} (Görev)`);
    setAssignAsBook(true);
    setAssignDueDateDays(30);
    setIsAssignDialogOpen(true);
  };

  const handleAssignTopic = (topic) => {
    const topicTests = tests.filter(t => String(t.topicId) === String(topic.id));
    if (topicTests.length === 0) {
      showToast("Bu konuya ait test bulunmamaktadır.", "error");
      return;
    }
    setSelectedTests(topicTests.map(t => t.id));
    setAssignCustomTitle(`${book.title} - ${topic.name} (Görev)`);
    setAssignAsBook(false);
    setAssignDueDateDays(14);
    setIsAssignDialogOpen(true);
  };

  const handleAssignSingleTest = (test) => {
    setSelectedTests([test.id]);
    setAssignCustomTitle(`${book.title} - ${test.name}`);
    setAssignAsBook(false);
    setAssignDueDateDays(7);
    setIsAssignDialogOpen(true);
  };

  const handleDeleteHomeworkItem = (hwId) => {
    if (window.confirm("Bu ödevi ve ilgili kayıtları silmek istediğinize emin misiniz?")) {
      if (typeof deleteHomework === 'function') deleteHomework(hwId);
      if (typeof deleteSubmissionsByTestId === 'function') deleteSubmissionsByTestId(hwId);
      showToast("Ödev ve ilişkili değerlendirmeler silindi.");
    }
  };

  const handleResetStudentBookHomework = async (hw, stId, stName) => {
    if (!stId) return;
    if (!window.confirm(`${stName || 'Öğrenci'} adlı öğrencinin bu ödevdeki yanıtları sıfırlanacak ve testleri baştan çözebilecek. Emin misiniz?`)) {
      return;
    }
    try {
      const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(book?.id)).map(bt => bt.id);
      const hwTests = hw?.tests || allBookTests;
      const allTestIds = Array.from(new Set([...hwTests, ...allBookTests]));

      if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
        await deleteStudentSubmissionsForBookOrHw(stId, hw?.id, book?.id, allTestIds);
      }
      if (typeof clearHomeworkSubmissionsForStudent === 'function') {
        await clearHomeworkSubmissionsForStudent(hw?.id, stId, book?.id);
      }
      showToast(`${stName || 'Öğrenci'} yanıtları başarıyla sıfırlandı. Öğrenci artık testleri baştan çözebilir.`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Sıfırlama sırasında bir hata oluştu.', 'error');
    }
  };

  const handleResetSingleBookTestForStudent = async (hw, stId, testId, testName, stName, subId) => {
    if (!stId || !testId) return;
    if (!window.confirm(`${stName || 'Öğrenci'} adlı öğrencinin "${testName || 'Test'}" testindeki tüm yanıtlarını sıfırlamak istiyor musunuz? Öğrenci bu testi baştan çözebilecek.`)) {
      return;
    }
    try {
      if (subId && typeof deleteSubmission === 'function') {
        await deleteSubmission(subId);
      }
      if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
        await deleteStudentSubmissionsForBookOrHw(stId, hw?.id, book?.id, [testId]);
      }
      if (typeof clearHomeworkSubmissionsForStudent === 'function') {
        await clearHomeworkSubmissionsForStudent(hw?.id, stId, book?.id, [testId]);
      }
      showToast(`${stName || 'Öğrenci'} için "${testName}" testi başarıyla sıfırlandı.`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Sıfırlama sırasında bir hata oluştu.', 'error');
    }
  };

  const handleResetEntireHomework = async (hw) => {
    if (!window.confirm(`"${hw.title}" ödevine ait TÜM öğrencilerin çözümlerini ve yanıtlarını sıfırlamak istediğinize emin misiniz?`)) {
      return;
    }
    try {
      const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(book?.id)).map(bt => bt.id);
      const hwTests = hw?.tests || allBookTests;
      const allTestIds = Array.from(new Set([...hwTests, ...allBookTests]));

      if (typeof deleteBookSubmissionsForEveryone === 'function') {
        await deleteBookSubmissionsForEveryone(book?.id, hw?.id, allTestIds);
      }

      for (const st of (students || [])) {
        if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
          await deleteStudentSubmissionsForBookOrHw(st.id, hw?.id, book?.id, allTestIds);
        }
        if (typeof clearHomeworkSubmissionsForStudent === 'function') {
          await clearHomeworkSubmissionsForStudent(hw?.id, st.id, book?.id);
        }
      }
      showToast('Tüm öğrencilerin yanıtları başarıyla sıfırlandı.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Sıfırlama sırasında hata oluştu.', 'error');
    }
  };

  const handleResetMistakeSubmission = async (mistake) => {
    const stName = mistake.studentName || mistake.submission?.studentName || 'Öğrenci';
    const testName = mistake.testDef?.name || 'Test';
    if (!window.confirm(`${stName} adlı öğrencinin "${testName}" testindeki tüm yanıtlarını sıfırlamak istiyor musunuz? Öğrenci teste tekrar sonuç girebilecek.`)) {
      return;
    }
    try {
      const stId = mistake.studentId || mistake.submission?.studentId;
      const testId = mistake.testDef?.id;
      const hwId = mistake.submission?.hwId || mistake.submission?.homeworkId;

      if (typeof deleteSubmission === 'function' && mistake.submission?.id) {
        await deleteSubmission(mistake.submission.id);
      }
      if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
        await deleteStudentSubmissionsForBookOrHw(stId, hwId, book?.id, [testId]);
      }
      if (typeof clearHomeworkSubmissionsForStudent === 'function') {
        await clearHomeworkSubmissionsForStudent(hwId, stId, book?.id);
      }
      showToast(`${stName} için "${testName}" testi başarıyla sıfırlandı. Öğrenci artık teste tekrar sonuç girebilir.`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Sıfırlama sırasında bir hata oluştu.', 'error');
    }
  };

  const handleDownloadMistakes = () => {
    if (!book || filteredMistakes.length === 0) {
      showToast("İndirilecek yanlış bulunamadı.", "error");
      return;
    }
    
    let content = `"${book.title}" Kitabı Yanlış Analizi\n====================================\n\n`;
    
    const sorted = [...filteredMistakes].sort((a, b) => {
       if (a.subjectName !== b.subjectName) return a.subjectName.localeCompare(b.subjectName);
       if (a.topicName !== b.topicName) return a.topicName.localeCompare(b.topicName);
       return a.testDef.name.localeCompare(b.testDef.name);
    });

    let currentSubjectName = "";
    let currentTopicName = "";

    sorted.forEach(m => {
       if (m.subjectName !== currentSubjectName) {
           content += `\nDERS: ${m.subjectName}\n--------------------\n`;
           currentSubjectName = m.subjectName;
           currentTopicName = "";
       }
       if (m.topicName !== currentTopicName) {
           content += `  Konu: ${m.topicName}\n`;
           currentTopicName = m.topicName;
       }
       const questionsStr = m.questionData.map(q => q.num + (q.isBlank ? " (Boş)" : "")).join(", ");
       content += `    - Test: ${m.testDef.name} | Öğrenci: ${m.submission.studentName} | Hatalı Sorular: ${questionsStr}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yanlis-analizi-${book.title.replace(/ /g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Yanlış analizi indirildi.");
  };

  if (!book) return <div className="books-page-container" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text)', fontWeight: 800, fontSize: '1.2rem' }}>Yükleniyor...</div>;

  return (
    <div className="books-page-container" style={{ paddingBottom: selectedTests.length > 0 ? '7rem' : '4rem' }}>
      
      {/* ── TOP HERO HEADER BAR ── */}
      <div className="books-glass-card" style={{ marginBottom: '1.75rem', padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => navigate('/books')} 
            style={{ padding: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', borderRadius: '0.75rem', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Kitap Listesine Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '0.85rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
            <BookMarked size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>{book.title}</h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, background: book.bookType === 'mixed' ? 'rgba(8,145,178,0.15)' : book.bookType === 'open_ended' ? 'rgba(139,92,246,0.15)' : 'rgba(99,102,241,0.12)', color: book.bookType === 'mixed' ? '#0891b2' : book.bookType === 'open_ended' ? '#8b5cf6' : '#6366f1', padding: '0.2rem 0.65rem', borderRadius: '999px', border: `1.5px solid ${book.bookType === 'mixed' ? '#0891b2' : book.bookType === 'open_ended' ? '#8b5cf6' : '#6366f1'}` }}>
                {book.bookType === 'open_ended' ? '✍️ Açık Uçlu Kitap' : book.bookType === 'mixed' ? '🔀 Karma Kitap' : '🔘 Standart Soru Bankası'}
              </span>
              {book.bookType !== 'open_ended' && (
                <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', padding: '0.2rem 0.65rem', borderRadius: '999px', border: '1px solid #3b82f6' }}>
                  {book.optionCount === 4 ? '🎯 4 Şık Optik (Ortaokul / LGS)' : '🎯 5 Şık Optik (Lise / YKS)'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                İçerik &amp; Ödev Takip Yönetimi • <strong style={{ color: 'var(--color-text)' }}>{book.publisher}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setBookSettingsForm({ title: book.title, publisher: book.publisher, bookType: book.bookType || 'standard', optionCount: book.optionCount || 5, pdfUrl: book.pdfUrl || '' }); setIsBookSettingsDialogOpen(true); }} 
            style={{ padding: '0.65rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Settings size={17} /> Kitap Ayarları
          </button>
          <button 
            onClick={handleAssignEntireBook} 
            style={{ padding: '0.65rem 1.15rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(245,158,11,0.25)' }}
            className="hover:scale-105 active:scale-95"
          >
            <BookOpen size={17} /> Tüm Kitabı Ata
          </button>
          <button 
            onClick={() => setIsBulkWizardOpen(true)} 
            style={{ padding: '0.65rem 1.15rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
            className="hover:scale-105 active:scale-95"
          >
            <Zap size={17} /> Toplu Ekle &amp; Yapılandır
          </button>
          <button 
            onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }} 
            style={{ padding: '0.65rem 1.15rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}
            className="hover:scale-105 active:scale-95"
          >
            <Plus size={17} /> Ders Ekle
          </button>
        </div>
      </div>

      {/* ── MODERN GLASS TABS SWITCHER ── */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.75rem', background: 'var(--color-surface)', padding: '0.35rem', borderRadius: '1rem', border: '1.5px solid var(--color-border)', width: 'fit-content', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <button 
          onClick={() => setActiveTab("contents")}
          style={{ 
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'all 0.2s',
            background: activeTab === "contents" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: activeTab === "contents" ? '#ffffff' : 'var(--color-text-muted)',
            boxShadow: activeTab === "contents" ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
          }}
        >
          <BookOpen size={18} /> İçindekiler Yapısı
        </button>

        <button 
          onClick={() => setActiveTab("homeworks")}
          style={{ 
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'all 0.2s',
            background: activeTab === "homeworks" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: activeTab === "homeworks" ? '#ffffff' : 'var(--color-text-muted)',
            boxShadow: activeTab === "homeworks" ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
          }}
        >
          <CheckSquare size={18} /> Atanan Ödevler &amp; İlerleme
          {bookHomeworks.length > 0 && (
            <span style={{ background: activeTab === "homeworks" ? 'rgba(255,255,255,0.25)' : 'rgba(59,130,246,0.15)', color: activeTab === "homeworks" ? '#ffffff' : '#3b82f6', padding: '0.15rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 900 }}>
              {bookHomeworks.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("mistakes")}
          style={{ 
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'all 0.2s',
            background: activeTab === "mistakes" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: activeTab === "mistakes" ? '#ffffff' : 'var(--color-text-muted)',
            boxShadow: activeTab === "mistakes" ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
          }}
        >
          <ListX size={18} /> Yanlış Analizi 
          {filteredMistakes && filteredMistakes.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', padding: '0.15rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 900 }}>
              {filteredMistakes.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: CONTENTS TAB (İÇİNDEKİLER YAPISI) ── */}
      {activeTab === "contents" && (
        <div className="books-glass-card" style={{ padding: '1.75rem' }}>
          {book.subjects && book.subjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header Toolbar: Quick Expand/Collapse */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={20} style={{ color: '#6366f1' }} /> Kitap Ders &amp; Ünite Hiyerarşisi
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCleanDuplicateTests}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 800, borderRadius: '0.65rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1.5px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Kitap içerisindeki mükerrer/çift kayıtlı testleri bulup veritabanından temizler"
                  >
                    🧹 Mükerrerleri Temizle
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetchLiveDirect();
                      if (refreshTrackedBooks) {
                        await refreshTrackedBooks();
                      }
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 800, borderRadius: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1.5px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RefreshCw size={13} /> Verileri Yenile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allOpenSubj = {};
                      const allOpenTop = {};
                      book.subjects?.forEach(s => {
                        allOpenSubj[s.id] = false;
                        s.topics?.forEach(t => { allOpenTop[t.id] = false; });
                      });
                      setCollapsedSubjects(allOpenSubj);
                      setCollapsedTopics(allOpenTop);
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 800, borderRadius: '0.65rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', cursor: 'pointer' }}
                  >
                    📂 Tümünü Aç
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allClosedSubj = {};
                      const allClosedTop = {};
                      book.subjects?.forEach(s => {
                        allClosedSubj[s.id] = true;
                        s.topics?.forEach(t => { allClosedTop[t.id] = true; });
                      });
                      setCollapsedSubjects(allClosedSubj);
                      setCollapsedTopics(allClosedTop);
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 800, borderRadius: '0.65rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', cursor: 'pointer' }}
                  >
                    📁 Tümünü Kapat
                  </button>
                </div>
              </div>

              {book.subjects.map(subject => {
                const topicsList = subject.topics || [];
                const sId = String(subject.id || '');

                const directTests = sortTestsNaturally(
                  testLookup.directBySubject.get(sId) || 
                  (topicsList.length === 0 ? (testLookup.bySubject.get(sId) || []) : [])
                );

                let totalSubjectTopicTests = 0;
                topicsList.forEach(tp => {
                  const tList = testLookup.byTopic.get(String(tp.id)) || [];
                  totalSubjectTopicTests += tList.length;
                });

                // Closed by default unless explicitly toggled to false (open)
                const isExpanded = collapsedSubjects[subject.id] === false;

                return (
                  <div key={subject.id} style={{ border: '1.5px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden', background: 'var(--color-surface)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    
                    {/* Subject Header */}
                    <div style={{ background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', borderBottom: isExpanded ? '1.5px solid var(--color-border)' : 'none', padding: '0.85rem 1.25rem', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div 
                        onClick={() => toggleSubject(subject.id)}
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, gap: '0.5rem' }}
                      >
                        {isExpanded ? <ChevronDown size={20} style={{ color: '#6366f1' }} /> : <ChevronRight size={20} style={{ color: '#6366f1' }} />}
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900 }}>
                          <Layers size={18} style={{ color: '#6366f1' }} /> {subject.name}
                        </h3>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#60a5fa', background: 'rgba(37,99,235,0.12)', padding: '0.2rem 0.65rem', borderRadius: '1rem', fontWeight: 800, border: '1px solid #3b82f6' }}>
                          {topicsList.length > 0 ? `${topicsList.length} Konu • ${totalSubjectTopicTests + directTests.length} Test` : ''} 
                          {topicsList.length === 0 && directTests.length > 0 ? `${directTests.length} Test` : ''}
                          {topicsList.length === 0 && directTests.length === 0 ? 'İçerik Yok' : ''}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleBulkChangeSubjectTestType(subject, 'acik_uclu'); }} style={{ padding: '0.4rem 0.75rem', background: 'rgba(139, 92, 246, 0.12)', border: '1.5px solid rgba(139, 92, 246, 0.35)', borderRadius: '0.6rem', color: '#a78bfa', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Bu dersteki tüm testleri Açık Uçlu / Sayısal yap">
                          ✍️ Açık Uçlu Yap
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleBulkChangeSubjectTestType(subject, 'coktan_secmeli'); }} style={{ padding: '0.4rem 0.75rem', background: 'rgba(99, 102, 241, 0.12)', border: '1.5px solid rgba(99, 102, 241, 0.35)', borderRadius: '0.6rem', color: '#818cf8', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Bu dersteki tüm testleri Çoktan Seçmeli yap">
                          🔘 Çoktan Seçmeli Yap
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleAssignSubject(subject); }} style={{ padding: '0.4rem 0.85rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: '0.6rem', color: '#ffffff', cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }} title="Tüm Dersi Ödev Olarak Ata">
                          <BookOpen size={14} /> Dersi Ata
                        </button>
                        <button onClick={() => { setCurrentSubject(subject); setNewSubjectName(subject.name); setIsSubjectDialogOpen(true); }} style={{ padding: '0.4rem 0.65rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', borderRadius: '0.6rem', color: 'var(--color-text)', cursor: 'pointer' }} title="Dersi Düzenle">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteSubject(subject.id)} style={{ padding: '0.4rem 0.65rem', background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.6rem', color: '#ef4444', cursor: 'pointer' }} title="Dersi Sil">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Subject Content */}
                    {isExpanded && (
                      <div style={{ padding: '1.25rem' }}>

                        {/* Direct Tests (when Ders > Test structure) */}
                        {directTests.length > 0 && (
                          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: '#60a5fa', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <FileText size={16} /> Direkt Testler ({directTests.length})
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                              {directTests.map(test => (
                                <div key={test.id} style={{ padding: '0.85rem 1rem', background: 'var(--color-surface)', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedTests.includes(test.id)} 
                                      onChange={() => toggleTestSelection(test.id)}
                                      style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                    <div>
                                      <h5 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-text)', fontWeight: 800 }}>{test.name}</h5>
                                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                                        <span>{test.questionCount} Soru</span>
                                        {test.isOpenEnded || test.questionType === 'acik_uclu' ? (
                                          <span style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', padding: '0.05rem 0.4rem', borderRadius: '0.35rem', fontWeight: 800, border: '1px solid rgba(139,92,246,0.25)', fontSize: '0.72rem' }}>
                                            ✍️ Açık Uçlu
                                          </span>
                                        ) : (
                                          <span style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)', padding: '0.05rem 0.4rem', borderRadius: '0.35rem', fontWeight: 800, fontSize: '0.72rem' }}>
                                            🔘 Çoktan Seçmeli
                                          </span>
                                        )}
                                        {test.answerKey && Object.keys(test.answerKey).filter(k => k !== '__meta').length > 0 && (
                                          <span style={{ color: '#10b981', fontWeight: 800 }}>• Cevap Anahtarlı ({Object.keys(test.answerKey).filter(k => k !== '__meta').length})</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button style={{ padding: '0.35rem 0.6rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.45rem', color: '#60a5fa', cursor: 'pointer' }} onClick={() => handleAssignSingleTest(test)} title="Bu Teste Bitirme Tarihi / Ödev Ata">
                                      <Calendar size={13} />
                                    </button>
                                    <button style={{ padding: '0.35rem 0.6rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '0.45rem', color: 'var(--color-text)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleOpenEditTest(subject, null, test); }} title="Bu Testi Düzenle">
                                      <Edit size={13} />
                                    </button>
                                    <button style={{ padding: '0.35rem 0.6rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.45rem', color: '#ef4444', cursor: 'pointer' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Topics List (when Ders > Konu > Test structure) */}
                        {topicsList.map(topic => {
                          const topId = String(topic.id || '');
                          const topIdUuid = toUUID(topId);
                          const topicTests = sortTestsNaturally(
                            testLookup.byTopic.get(topId) || 
                            (topIdUuid ? testLookup.byTopic.get(topIdUuid) : null) || 
                            []
                          );
                          // Closed by default unless explicitly toggled to false (open)
                          const isTopicExpanded = collapsedTopics[topic.id] === false;

                          return (
                            <div key={topic.id} style={{ borderLeft: '3.5px solid #6366f1', margin: '0.5rem 0.25rem 1.25rem 0.25rem', paddingLeft: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div 
                                  onClick={() => toggleTopic(topic.id)}
                                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexGrow: 1, gap: '0.4rem' }}
                                >
                                  {isTopicExpanded ? <ChevronDown size={16} style={{ color: '#6366f1' }} /> : <ChevronRight size={16} style={{ color: '#6366f1' }} />}
                                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FileText size={16} style={{ color: '#7c3aed' }} /> {topic.name}
                                  </h4>
                                  <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-text-muted)', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontWeight: 800, border: '1px solid var(--color-border)' }}>{topicTests.length} Test</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button onClick={() => handleAssignTopic(topic)} style={{ padding: '0.35rem 0.75rem', background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', borderRadius: '0.45rem', color: '#60a5fa', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Bu Konudaki Testlere Bitirme Tarihi / Ödev Ata">
                                    <Calendar size={13} /> Ata
                                  </button>
                                  <button onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setNewTopicName(topic.name); setIsTopicDialogOpen(true); }} style={{ padding: '0.35rem 0.6rem', background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', borderRadius: '0.45rem', color: 'var(--color-text)', cursor: 'pointer' }}><Edit size={13} /></button>
                                  <button onClick={() => handleDeleteTopic(subject.id, topic.id)} style={{ padding: '0.35rem 0.6rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.45rem', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                                </div>
                              </div>

                              {/* Tests under Topic */}
                              {isTopicExpanded && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
                                    {topicTests.length > 0 ? (
                                      topicTests.map(test => (
                                        <div key={test.id} style={{ padding: '0.85rem 1rem', background: 'var(--color-surface)', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input 
                                              type="checkbox" 
                                              checked={selectedTests.includes(test.id)} 
                                              onChange={() => toggleTestSelection(test.id)}
                                              style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                            />
                                            <div>
                                              <h5 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-text)', fontWeight: 800 }}>{test.name}</h5>
                                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                <span>{test.questionCount} Soru</span>
                                                {test.isOpenEnded || test.questionType === 'acik_uclu' ? (
                                                  <span style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', padding: '0.05rem 0.4rem', borderRadius: '0.35rem', fontWeight: 800, border: '1px solid rgba(139,92,246,0.25)', fontSize: '0.72rem' }}>
                                                    ✍️ Açık Uçlu
                                                  </span>
                                                ) : (
                                                  <span style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)', padding: '0.05rem 0.4rem', borderRadius: '0.35rem', fontWeight: 800, fontSize: '0.72rem' }}>
                                                    🔘 Çoktan Seçmeli
                                                  </span>
                                                )}
                                                {test.answerKey && Object.keys(test.answerKey).filter(k => k !== '__meta').length > 0 && (
                                                  <span style={{ color: '#10b981', fontWeight: 800 }}>• Cevap Anahtarlı ({Object.keys(test.answerKey).filter(k => k !== '__meta').length})</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button style={{ padding: '0.35rem 0.6rem', background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', borderRadius: '0.45rem', color: '#60a5fa', cursor: 'pointer' }} onClick={() => handleAssignSingleTest(test)} title="Bu Teste Bitirme Tarihi / Ödev Ata">
                                              <Calendar size={13} />
                                            </button>
                                            <button style={{ padding: '0.35rem 0.6rem', background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', borderRadius: '0.45rem', color: 'var(--color-text)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleOpenEditTest(subject, topic, test); }} title="Bu Testi Düzenle">
                                              <Edit size={13} />
                                            </button>
                                            <button style={{ padding: '0.35rem 0.6rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.45rem', color: '#ef4444', cursor: 'pointer' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '0.5rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                        Bu konuda henüz test bulunmuyor.
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', borderRadius: '0.6rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' }); setIsTestDialogOpen(true); }}>
                                      <Plus size={14} /> Test Ekle
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Subject Level Actions */}
                        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                          <button style={{ fontSize: '0.85rem', color: '#6366f1', border: '1.5px dashed #6366f1', background: 'rgba(99, 102, 241, 0.12)', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true); }}>
                            <Plus size={15} /> Konu Ekle
                          </button>
                          <button style={{ fontSize: '0.85rem', color: '#10b981', border: '1.5px dashed #10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' }); setIsTestDialogOpen(true); }}>
                            <Plus size={15} /> Direkt Test Ekle (Konusuz)
                          </button>
                          <button style={{ fontSize: '0.85rem', color: '#ec4899', border: '1.5px dashed #ec4899', background: 'rgba(236, 72, 153, 0.12)', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setBulkSeriesData(p => ({ ...p, subjectName: subject.name })); setIsBulkWizardOpen(true); setBulkWizardTab("series"); }}>
                            <Zap size={15} /> Seri Test Ekle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-surface-hover)', borderRadius: '1rem', border: '1.5px dashed var(--color-border-input)' }}>
              <BookMarked size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem auto' }} />
              <p style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--color-text)', fontWeight: 800 }}>Bu kitaba henüz ders veya test eklenmemiş.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={16} /> İlk Dersi Ekle
                </button>
                <button onClick={() => setIsBulkWizardOpen(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={16} /> Toplu İçerik Sihirbazı
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ATANAN ÖDEVLER & İLERLEME TAB (BU KİTAPTAN ATANAN ÖDEVLER & ÖĞRENCİ İLERLEMELERİ) ── */}
      {activeTab === "homeworks" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* 4 STAT CARDS */}
          <div className="books-kpi-grid">
            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(99,102,241,0.25)' }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Atanan Ödevler</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-text)' }}>{homeworkAnalytics.totalAssigned} Adet</div>
              </div>
            </div>

            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(16,185,129,0.25)' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hedef Öğrenciler</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>{homeworkAnalytics.totalTargetStudents} Öğrenci</div>
              </div>
            </div>

            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(14,165,233,0.25)' }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kitap Tamamlama Oranı</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7' }}>%{homeworkAnalytics.completionRate}</div>
              </div>
            </div>

            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#ec4899,#db2777)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(236,72,153,0.25)' }}>
                <RotateCcw size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Canlı Veri Durumu</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#db2777' }}>
                  {isEvaluationSyncing ? 'Senkronize Ediliyor...' : '✓ Güncel'}
                </div>
              </div>
            </div>
          </div>

          {/* HOMEWORKS LIST CARD */}
          <div className="books-glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.3rem', fontWeight: 900 }}>
                <CheckSquare size={22} style={{ color: '#6366f1' }} /> Bu Kitaptan Atanan Ödevler &amp; Öğrenci İlerlemeleri
              </h3>
              <button
                onClick={async () => {
                  if (typeof refreshSubmissions === 'function') {
                    await refreshSubmissions();
                    showToast('Öğrenci verileri veritabanından güncellendi!', 'success');
                  }
                }}
                disabled={isEvaluationSyncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: isEvaluationSyncing ? 'var(--color-surface-hover)' : 'rgba(59, 130, 246, 0.15)',
                  border: '1.5px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: isEvaluationSyncing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Supabase'den en güncel öğrenci çözümlerini canlı çek"
              >
                <RotateCcw size={14} style={{ animation: isEvaluationSyncing ? 'spin 1s linear infinite' : 'none' }} />
                {isEvaluationSyncing ? 'Güncelleniyor...' : '🔄 Canlı Verileri Yenile'}
              </button>
            </div>

            {bookHomeworks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {bookHomeworks.map(hw => {
                  let targetStudents = [];
                  if (hw.targetType === 'grade' || hw.targetType === 'class') {
                    targetStudents = students.filter(s => (hw.targetIds || []).some(tid => String(s.gradeId) === String(tid) || String(s.grade) === String(tid) || String(s.className) === String(tid)));
                  } else {
                    targetStudents = (hw.targetIds || []).map(tid => {
                      return students.find(s => String(s.id) === String(tid)) || { id: tid, name: 'Öğrenci' };
                    });
                  }
                  if (targetStudents.length === 0 && students.length > 0) {
                    if (hw.targetType === 'all' || !hw.targetType) {
                      targetStudents = students;
                    }
                  }

                  const hwTests = (hw.tests && hw.tests.length > 0)
                    ? hw.tests
                    : (hw.testDueDates && Object.keys(hw.testDueDates).length > 0)
                      ? Object.keys(hw.testDueDates)
                      : tests.map(t => t.id);

                  const totalTestsInHw = hwTests.length || 1;
                  const hwTestsSet = new Set(hwTests.map(String));
                  const hwTestsUuidSet = new Set(hwTests.map(tid => toUUID(tid)).filter(Boolean));

                  let completedStudentsCount = 0;
                  const studentProgressDetails = (targetStudents || []).map(st => {
                    if (!st) return null;
                    const stId = String(st.id);
                    const stSet = studentSolvedIndex.solvedMap.get(stId) || new Set();

                    const solvedSubmissions = [];
                    const uniqueSolvedTests = new Set();

                    hwTests.forEach(tid => {
                      const tIdStr = String(tid);
                      if (stSet.has(tIdStr)) {
                        uniqueSolvedTests.add(tIdStr);
                        const sub = studentSolvedIndex.submissionMap.get(`${stId}_${tIdStr}`);
                        if (sub) solvedSubmissions.push(sub);
                      }
                    });

                    const solvedCount = uniqueSolvedTests.size;
                    const isDone = solvedCount >= totalTestsInHw && totalTestsInHw > 0;
                    if (isDone) completedStudentsCount++;
                    
                    const pct = totalTestsInHw > 0 ? Math.round((solvedCount / totalTestsInHw) * 100) : 0;
                    return { student: st, studentId: stId, solvedCount, totalTestsInHw, isDone, pct, solvedSubmissions };
                  }).filter(Boolean);

                  const totalSolvedInHw = studentProgressDetails.reduce((sum, item) => sum + (item.solvedCount || 0), 0);
                  const totalPossibleInHw = (targetStudents.length || 1) * totalTestsInHw;
                  const overallHwProgressPct = totalPossibleInHw > 0 ? Math.round((totalSolvedInHw / totalPossibleInHw) * 100) : 0;
                  const isExpanded = expandedHomeworkDetails[hw.id];
                  const isExpired = new Date(hw.dueDate) < new Date();

                  return (
                    <div key={hw.id} style={{ border: '1.5px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden', background: 'var(--color-surface)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      
                      {/* HOMEWORK HEADER */}
                      <div style={{ padding: '1.15rem 1.35rem', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: isExpanded ? '1.5px solid var(--color-border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '0.65rem', borderRadius: '0.75rem', display: 'flex', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)', fontWeight: 900 }}>{hw.title}</h4>
                              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 900, background: isExpired ? '#fef2f2' : '#f0fdf4', color: isExpired ? '#b91c1c' : '#15803d', border: `1px solid ${isExpired ? '#fecaca' : '#bbf7d0'}` }}>
                                {isExpired ? '⏳ Süresi Bitti' : '✓ Aktif'}
                              </span>
                              {hw.targetType === 'class' || hw.targetType === 'grade' ? (
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 800, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6' }}>
                                  🏫 Sınıf ({targetStudents.length} Öğrenci)
                                </span>
                              ) : targetStudents.length === 1 ? (
                                <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.65rem', borderRadius: '0.45rem', fontWeight: 900, background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                                  👤 Öğrenci: {targetStudents[0]?.name}
                                </span>
                              ) : targetStudents.length > 1 && targetStudents.length <= 3 ? (
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 800, background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                                  👤 {targetStudents.map(s => s.name).join(', ')}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 800, background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                  👤 {targetStudents.length} Öğrenci ({targetStudents.slice(0, 2).map(s => s.name).join(', ')}...)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span>📝 {totalTestsInHw} Test ({hw.totalQuestions || '?'} Soru)</span>
                              <span>📅 Genel Son Tarih: <strong style={{ color: 'var(--color-text)' }}>{new Date(hw.dueDate).toLocaleDateString('tr-TR')}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* PROGRESS BAR & ACTIONS */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                          <div style={{ minWidth: '160px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>İlerleme</span>
                              <span style={{ color: overallHwProgressPct === 100 ? '#16a34a' : '#4f46e5', fontWeight: 900 }}>%{overallHwProgressPct} ({totalSolvedInHw}/{totalPossibleInHw} Test)</span>
                            </div>
                            <div style={{ background: 'var(--color-border)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                              <div style={{ width: `${overallHwProgressPct}%`, background: overallHwProgressPct === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #0284c7)', height: '100%', borderRadius: 99 }} />
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setEditDateHw(hw);
                              setEditDateValue(hw.dueDate ? hw.dueDate.split('T')[0] : '');
                            }}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#60a5fa', background: 'rgba(37,99,235,0.12)', border: '1.5px solid #3b82f6', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Tüm Kitap İçin Bitirme Tarihini Güncelle"
                          >
                            <Calendar size={15} /> Genel Tarih
                          </button>

                          <button 
                            onClick={() => {
                              setScheduleModalHw(hw);
                              const initialDates = {};

                              const addDateEntry = (tid, dVal) => {
                                if (!tid || !dVal) return;
                                const formatted = formatSafeInputYMD(dVal);
                                if (!formatted) return;
                                const sId = String(tid);
                                const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
                                const sUuid = String(toUUID(sId) || '');

                                initialDates[sId] = formatted;
                                if (sClean) initialDates[sClean] = formatted;
                                if (sUuid) initialDates[sUuid] = formatted;
                                initialDates[`bt_${sClean}`] = formatted;
                              };

                              // 1. From this homework
                              const hwDates = hw.testDueDates || hw.raw_data?.testDueDates || hw.scheduleDates || hw.raw_data?.scheduleDates || {};
                              Object.entries(hwDates).forEach(([tid, d]) => addDateEntry(tid, d));

                              // 2. From other homeworks matching this book
                              (allHomeworks || []).filter(h => h.isBookAssignment && (String(h.bookId || h.book_id) === String(book?.id) || toUUID(h.bookId) === toUUID(book?.id))).forEach(h => {
                                const hDueDates = h.testDueDates || h.raw_data?.testDueDates || h.scheduleDates || h.raw_data?.scheduleDates || {};
                                Object.entries(hDueDates).forEach(([tid, d]) => addDateEntry(tid, d));
                              });

                              // 3. From bookTests
                              (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === String(book?.id) || toUUID(bt.bookId) === toUUID(book?.id)).forEach(bt => {
                                const d = bt.dueDate || bt.testDueDate || bt.date || bt.raw_data?.dueDate;
                                addDateEntry(bt.id, d);
                              });

                              // 4. From book.subjects & topics
                              (book?.subjects || []).forEach(s => {
                                (s.tests || []).forEach(t => {
                                  const d = t.dueDate || t.testDueDate || t.date;
                                  addDateEntry(t.id, d);
                                });
                                (s.topics || []).forEach(tp => {
                                  (tp.tests || []).forEach(t => {
                                    const d = t.dueDate || t.testDueDate || t.date;
                                    addDateEntry(t.id, d);
                                  });
                                });
                              });

                              setScheduleDates(initialDates);
                              setAutoStartDate(new Date().toISOString().split('T')[0]);
                              setScheduleSelectedTestIds([]);
                              setBulkApplyDate('');
                              const initialCollapsedSubj = {};
                              const initialCollapsedTopic = {};
                              book?.subjects?.forEach(s => {
                                initialCollapsedSubj[s.id] = true;
                                s.topics?.forEach(t => { initialCollapsedTopic[t.id] = true; });
                              });
                              setScheduleCollapsedSubj(initialCollapsedSubj);
                              setScheduleCollapsedTopic(initialCollapsedTopic);
                            }}
                            style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', background: 'rgba(2,132,199,0.12)', border: '1.5px solid #0284c7', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Kitap İçindeki Her Teste Özel Tek Tek Tarih Belirle"
                          >
                            <Clock size={16} /> İçerik Test Tarihlerini Planla
                          </button>

                          <button 
                            onClick={() => {
                              if (targetStudents.length === 1) {
                                navigate(`/student/books/${book?.id}?studentId=${targetStudents[0].id}&fromTeacher=true`);
                              } else {
                                toggleHwDetails(hw.id);
                              }
                            }}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text)', background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Öğrencinin gördüğü birebir kitap ekranında detaylı ilerlemeyi aç"
                          >
                            <BookOpen size={15} /> Detaylı İlerleme
                          </button>

                          <button 
                            onClick={() => handleResetEntireHomework(hw)}
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Bu ödeve ait tüm öğrencilerin çözümlerini ve yanıtlarını sıfırla"
                          >
                            <RotateCcw size={14} /> Tümünü Sıfırla
                          </button>

                          <button 
                            onClick={() => handleDeleteHomeworkItem(hw.id)}
                            style={{ padding: '0.45rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* EXPANDED STUDENT DETAILS */}
                      {isExpanded && (
                        <div style={{ padding: '1.25rem', borderTop: '1.5px solid var(--color-border)', background: 'var(--color-bg)' }}>
                          <h5 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', color: 'var(--color-text)', fontWeight: 900 }}>
                            Öğrenci Bazlı İlerleme Tablosu ({targetStudents.length} Öğrenci)
                          </h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {studentProgressDetails.map(item => {
                              const stKey = `${hw.id}_${item.student.id}`;
                              const isTestsOpen = expandedStudentTests[stKey];
                              const searchQuery = (studentTestSearch[stKey] || '').toLowerCase().trim();
                              const filterTab = studentTestFilter[stKey] || 'all';

                              const allHwTestsWithStatus = hwTests.map((tId, idx) => {
                                const testDef = bookTests.find(bt => String(bt.id) === String(tId)) || { id: tId, name: `Test ${idx + 1}` };
                                const parentSubject = book?.subjects?.find(s => s.id === testDef.subjectId || s.topics?.some(tp => tp.id === testDef.topicId));
                                const parentTopic = parentSubject?.topics?.find(tp => tp.id === testDef.topicId);
                                const subjName = testDef.subjectName || parentSubject?.name || '';
                                const topicName = testDef.topicName || parentTopic?.name || '';
                                const stUuid = toUUID(item.student?.id);

                                const testSub = studentSolvedIndex.submissionMap.get(`${item.student?.id}_${tId}`) || null;

                                const isSolved = Boolean(testSub && testSub.status !== 'in_progress' && testSub.status !== 'draft');
                                const isDraft = Boolean(testSub && (testSub.status === 'in_progress' || testSub.status === 'draft'));
                                const testDueDate = hw.testDueDates?.[tId] || null;
                                const questionCount = testDef.questionCount || (testDef.answerKey ? Object.keys(testDef.answerKey).length : null);

                                return {
                                  id: tId,
                                  testDef,
                                  subjName,
                                  topicName,
                                  testSub,
                                  isSolved,
                                  isDraft,
                                  testDueDate,
                                  questionCount
                                };
                              });

                              const solvedTestsCount = allHwTestsWithStatus.filter(t => t.isSolved).length;
                              const unsolvedTestsCount = allHwTestsWithStatus.length - solvedTestsCount;
                              const mistakeTestsCount = allHwTestsWithStatus.filter(t => t.isSolved && (t.testSub?.wrongCount > 0)).length;

                              const filteredHwTests = allHwTestsWithStatus.filter(t => {
                                if (searchQuery) {
                                  const nameMatch = (t.testDef?.name || '').toLowerCase().includes(searchQuery);
                                  const subjMatch = (t.subjName || '').toLowerCase().includes(searchQuery);
                                  const topicMatch = (t.topicName || '').toLowerCase().includes(searchQuery);
                                  if (!nameMatch && !subjMatch && !topicMatch) return false;
                                }
                                if (filterTab === 'solved') return t.isSolved;
                                if (filterTab === 'unsolved') return !t.isSolved;
                                if (filterTab === 'mistakes') return t.isSolved && (t.testSub?.wrongCount > 0);
                                return true;
                              });

                              return (
                                <div key={item.student.id} style={{ background: 'var(--color-surface)', padding: '1.15rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                  
                                  {/* Top Student Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <div style={{ width: '2.4rem', height: '2.4rem', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                                        {item.student.name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>
                                          {item.student.name}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                          Çözülen: <strong style={{ color: '#6366f1' }}>{item.solvedCount}</strong> / {item.totalTestsInHw} Test
                                          {item.solvedSubmissions.length > 0 && (
                                            <> • Ortalama Başarı: <strong style={{ color: '#10b981' }}>%{Math.round(item.solvedSubmissions.reduce((a, b) => {
                                              const c = b.correctCount ?? b.correct ?? 0;
                                              const w = b.wrongCount ?? b.wrong ?? 0;
                                              const bl = b.emptyCount ?? b.blankCount ?? 0;
                                              const q = b.totalQuestions || (c + w + bl);
                                              const bPct = q > 0 && (c > 0 || w > 0 || bl > 0)
                                                ? (c / q) * 100
                                                : (b.scorePercentage !== undefined && b.scorePercentage !== null
                                                  ? +b.scorePercentage
                                                  : (b.score || 0));
                                              return a + bPct;
                                            }, 0) / item.solvedSubmissions.length)}</strong></>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.45rem', background: item.isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: item.isDone ? '#10b981' : '#f59e0b', border: `1px solid ${item.isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}` }}>
                                        {item.isDone ? '✅ Tamamladı' : `⏳ %${item.pct}`}
                                      </span>

                                      {item.solvedCount > 0 && (
                                        <button 
                                          onClick={() => handleResetStudentBookHomework(hw, item.student.id, item.student.name)}
                                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                          title="Öğrencinin bu ödevdeki tüm yanıtlarını sıfırla ve yeniden çözmesini sağla"
                                        >
                                          <RotateCcw size={13} /> Tümünü Sıfırla
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div style={{ background: 'var(--color-border)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                                    <div style={{ width: `${item.pct}%`, background: item.isDone ? '#10b981' : '#0ea5e9', height: '100%', borderRadius: 99, transition: 'width 0.3s' }} />
                                  </div>

                                  {/* PROMINENT BUTTON: OPEN STUDENT BOOK SCREEN */}
                                  <button
                                    onClick={() => navigate(`/student/books/${book?.id}?studentId=${item.student.id}&fromTeacher=true`)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.5rem',
                                      padding: '0.75rem 1.25rem',
                                      borderRadius: '0.75rem',
                                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                      color: 'white',
                                      border: 'none',
                                      fontWeight: 900,
                                      fontSize: '0.9rem',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
                                      transition: 'all 0.2s'
                                    }}
                                    className="hover:scale-[1.02] active:scale-95"
                                    title="Öğrencinin gördüğü birebir kitap sayfasını açarak ünite, konu, test ve soru bazlı tüm sonuçları inceleyin"
                                  >
                                    <BookOpen size={16} />
                                    📖 Öğrencinin Birebir Kitap Ekranını Aç ({item.student.name})
                                  </button>

                                  {/* TOGGLE TEST BREAKDOWN BUTTON */}
                                  <button
                                    onClick={() => setExpandedStudentTests(prev => ({ ...prev, [stKey]: !prev[stKey] }))}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '0.6rem 0.95rem',
                                      borderRadius: '0.65rem',
                                      background: isTestsOpen ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface-hover)',
                                      border: `1px solid ${isTestsOpen ? 'rgba(59, 130, 246, 0.35)' : 'var(--color-border)'}`,
                                      color: isTestsOpen ? '#60a5fa' : 'var(--color-text)',
                                      fontWeight: 800,
                                      fontSize: '0.84rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <FileText size={15} style={{ color: '#6366f1' }} />
                                      <span>📋 Test Bazlı Başarı &amp; Durum Listesi ({allHwTestsWithStatus.length} Test)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 800 }}>
                                      <span>{isTestsOpen ? 'Listeyi Gizle' : 'Testleri İncele'}</span>
                                      {isTestsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                  </button>

                                  {/* EXPANDED TEST-BY-TEST BREAKDOWN */}
                                  {isTestsOpen && (
                                    <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                      
                                      {/* Filter and Search Bar */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                                          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                          <input
                                            type="text"
                                            placeholder="Test veya ünite ara..."
                                            value={studentTestSearch[stKey] || ''}
                                            onChange={e => setStudentTestSearch(prev => ({ ...prev, [stKey]: e.target.value }))}
                                            style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '0.5rem', border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', background: 'var(--color-surface)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                          <button
                                            onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'all' }))}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: '1px solid', borderColor: filterTab === 'all' ? '#6366f1' : 'var(--color-border-input)', cursor: 'pointer', background: filterTab === 'all' ? '#6366f1' : 'var(--color-surface)', color: filterTab === 'all' ? '#ffffff' : 'var(--color-text)' }}
                                          >
                                            Tümü ({allHwTestsWithStatus.length})
                                          </button>
                                          <button
                                            onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'solved' }))}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: '1px solid', borderColor: filterTab === 'solved' ? '#10b981' : 'var(--color-border-input)', cursor: 'pointer', background: filterTab === 'solved' ? '#10b981' : 'var(--color-surface)', color: filterTab === 'solved' ? '#ffffff' : 'var(--color-text)' }}
                                          >
                                            ✅ Çözülenler ({solvedTestsCount})
                                          </button>
                                          <button
                                            onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'unsolved' }))}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: '1px solid', borderColor: filterTab === 'unsolved' ? '#f59e0b' : 'var(--color-border-input)', cursor: 'pointer', background: filterTab === 'unsolved' ? '#f59e0b' : 'var(--color-surface)', color: filterTab === 'unsolved' ? '#ffffff' : 'var(--color-text)' }}
                                          >
                                            ⏳ Çözülmeyenler ({unsolvedTestsCount})
                                          </button>
                                          {mistakeTestsCount > 0 && (
                                            <button
                                              onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'mistakes' }))}
                                              style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: '1px solid', borderColor: filterTab === 'mistakes' ? '#ef4444' : 'rgba(239, 68, 68, 0.3)', cursor: 'pointer', background: filterTab === 'mistakes' ? '#ef4444' : 'rgba(239, 68, 68, 0.15)', color: filterTab === 'mistakes' ? '#ffffff' : '#ef4444' }}
                                            >
                                              ❌ Yanlışı Olanlar ({mistakeTestsCount})
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Scrollable Test List */}
                                      <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }} className="custom-scrollbar">
                                        {filteredHwTests.map((t, tIdx) => {
                                          return (
                                            <div 
                                              key={t.id}
                                              style={{
                                                background: 'var(--color-surface)',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.65rem',
                                                border: `1.5px solid ${t.isSolved ? 'rgba(16, 185, 129, 0.4)' : t.isDraft ? 'rgba(245, 158, 11, 0.4)' : 'var(--color-border)'}`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                                              }}
                                            >
                                              {/* Test Title & Subject */}
                                              <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                                                    {t.testDef?.name || `Test ${tIdx + 1}`}
                                                  </span>
                                                  {t.testDueDate && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(2, 132, 199, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                                                      📅 {new Date(t.testDueDate).toLocaleDateString('tr-TR')}
                                                    </span>
                                                  )}
                                                  {t.questionCount && (
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface-hover)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)' }}>
                                                      {t.questionCount} Soru
                                                    </span>
                                                  )}
                                                </div>
                                                {(t.subjName || t.topicName) && (
                                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                    {t.subjName}{t.topicName ? ` / ${t.topicName}` : ''}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Performance / Status Badges & Actions */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                {t.isSolved ? (
                                                  <>
                                                    <div style={{ textAlign: 'right' }}>
                                                      {(() => {
                                                        const c = t.testSub?.correctCount ?? 0;
                                                        const w = t.testSub?.wrongCount ?? 0;
                                                        const b = t.testSub?.emptyCount ?? 0;
                                                        const q = t.testSub?.totalQuestions || (c + w + b);
                                                        const pct = q > 0 && (c > 0 || w > 0 || b > 0)
                                                          ? Math.min(100, Math.max(0, Math.round((c / q) * 100)))
                                                          : Math.round(t.testSub?.scorePercentage ?? t.testSub?.score ?? 0);
                                                        const badgeBg = pct >= 70 ? 'rgba(16, 185, 129, 0.15)' : pct >= 50 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                                                        const badgeColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#60a5fa' : '#ef4444';
                                                        const badgeBorder = pct >= 70 ? 'rgba(16, 185, 129, 0.3)' : pct >= 50 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                                                        return (
                                                          <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '0.4rem', background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                                                            %{pct} Başarı
                                                          </span>
                                                        );
                                                      })()}
                                                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                        <strong style={{ color: '#10b981' }}>{t.testSub?.correctCount ?? 0}D</strong> • <strong style={{ color: '#ef4444' }}>{t.testSub?.wrongCount ?? 0}Y</strong> • <strong style={{ color: 'var(--color-text-muted)' }}>{t.testSub?.emptyCount ?? 0}B</strong>
                                                      </div>
                                                    </div>
                                                    <button
                                                       onClick={() => handleOpenManualTestForStudent(item.student, t, hw)}
                                                       style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', padding: '0.3rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                       title="Test sonucunu düzenle"
                                                     >
                                                       <Edit size={11} /> Düzenle
                                                     </button>

                                                     <button
                                                       onClick={() => navigate(`/review/${t.testSub.id}`)}
                                                       style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1.5px solid rgba(59, 130, 246, 0.3)', padding: '0.3rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                       title="Bu testin optik ve cevap detaylarını incele"
                                                     >
                                                       <Eye size={12} /> İncele
                                                     </button>

                                                     <button
                                                       onClick={() => handleResetSingleBookTestForStudent(hw, item.student.id, t.id, t.testDef?.name, item.student.name, t.testSub?.id)}
                                                       style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1.5px solid rgba(239, 68, 68, 0.3)', padding: '0.3rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                       title="Sadece bu testin yanıtını sıfırla"
                                                     >
                                                       <RotateCcw size={11} /> Sıfırla
                                                     </button>
                                                  </>
                                                ) : t.isDraft ? (
                                                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                     <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.45rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                                       🔄 Devam Ediyor
                                                     </span>
                                                     <button
                                                       onClick={() => handleOpenManualTestForStudent(item.student, t, hw)}
                                                       style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.28rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', boxShadow: '0 2px 6px rgba(16,185,129,0.25)' }}
                                                       title="Öğrenci adına test sonucunu gir / tamamla"
                                                     >
                                                       <Plus size={12} /> Sonuç Gir
                                                     </button>
                                                   </div>
                                                ) : (
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.45rem', background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                                      ⏳ Çözülmedi
                                                    </span>
                                                    <button
                                                      onClick={() => handleOpenManualTestForStudent(item.student, t, hw)}
                                                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.28rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', boxShadow: '0 2px 6px rgba(16,185,129,0.25)' }}
                                                      title="Bu test için öğrencinin sonucunu (Doğru/Yanlış/Boş) gir"
                                                    >
                                                      <Plus size={12} /> Sonuç Gir
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {filteredHwTests.length === 0 && (
                                          <div style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            Arama kriterine uygun test bulunamadı.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {targetStudents.length === 0 && (
                              <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--color-text-muted)' }}>Bu ödev için atanmış öğrenci bulunamadı.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-surface-hover)', borderRadius: '1rem', border: '1.5px dashed var(--color-border-input)' }}>
                <CheckSquare size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem auto' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text)', fontSize: '1.2rem', fontWeight: 900 }}>Henüz Ödev Atanmamış</h4>
                <p style={{ fontSize: '0.92rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                  İçindekiler sekmesinden testleri seçip <strong>"Ata"</strong> butonuna basarak sınıfa veya öğrencilere ödev atayabilirsiniz.
                </p>
                <button 
                  onClick={() => setActiveTab("contents")}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  İçindekiler Sekmesine Git
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: MISTAKES TAB (YANLIŞ ANALİZİ) ── */}
      {activeTab === "mistakes" && (
        <div className="books-glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ListX size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)' }}>Yanlış Analizi</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Kitaptaki hatalı cevapların detaylı dökümü.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {studentOptions.length > 0 && (
                <select 
                  value={mistakeFilterStudent} 
                  onChange={e => setMistakeFilterStudent(e.target.value)} 
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, minWidth: 160, fontSize: '0.85rem' }}
                >
                  <option value="all">👤 Tüm Öğrenciler ({studentOptions.length})</option>
                  {studentOptions.map(st => <option key={st.id} value={st.id}>👤 {st.name}</option>)}
                </select>
              )}
              {subjectOptions.length > 0 && (
                <select 
                  value={mistakeFilterSubject} 
                  onChange={e => setMistakeFilterSubject(e.target.value)} 
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <option value="all">Tüm Dersler</option>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <select 
                value={mistakeFilterTopic} 
                onChange={e => setMistakeFilterTopic(e.target.value)} 
                disabled={mistakeFilterSubject === 'all' && topicOptions.length === 0} 
                style={{ padding: '0.55rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 700, fontSize: '0.85rem' }}
              >
                <option value="all">Tüm Konular</option>
                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {Object.keys(mistakeList).length > 0 && (
                <button 
                  onClick={handleDownloadMistakes}
                  style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileOutput size={16} /> İndir
                </button>
              )}
            </div>
          </div>

          {filteredMistakes.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Ders</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Konu</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Test</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Hatalı Sorular</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Öğrenci</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800, textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMistakes.map((mistake, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.25rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.82rem', fontWeight: 800, border: '1px solid rgba(59, 130, 246, 0.3)' }}>{mistake.subjectName}</span></td>
                      <td style={{ padding: '1rem', color: 'var(--color-text)', fontWeight: 700 }}>{mistake.topicName}</td>
                      <td style={{ padding: '1rem', fontSize: '0.92rem', color: '#6366f1', fontWeight: 800 }}>{mistake.testDef.name}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {mistake.questionData.map((q, idx) => (
                            <span key={idx} style={{ color: q.isBlank ? 'var(--color-text-muted)' : '#ef4444', background: q.isBlank ? 'var(--color-surface-hover)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${q.isBlank ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.3)'}`, padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontSize: '0.82rem', fontWeight: 800 }}>
                              S.{q.num}{idx < mistake.questionData.length - 1 ? '' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        👤 {mistake.studentName || mistake.submission.studentName || 'Öğrenci'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleResetMistakeSubmission(mistake)}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1.5px solid rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Bu test sonucunu sil ve öğrencinin tekrar sonuç girmesine izin ver"
                        >
                          <RotateCcw size={12} /> Sıfırla
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4.5rem 2rem', color: 'var(--color-text-muted)' }}>
              <CheckCircle size={48} style={{ opacity: 0.8, margin: '0 auto 1rem auto', color: '#10b981' }} />
              <p style={{ fontSize: '1rem', color: 'var(--color-text)', fontWeight: 700 }}>Yanlış soru bulunamadı. Öğrencileriniz harika iş çıkarıyor!</p>
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR SELECTED TESTS */}
      {selectedTests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', padding: '0.85rem 1.75rem', borderRadius: '3rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: '0 12px 36px rgba(79,70,229,0.4)', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(16px)' }}>
          <span style={{ fontWeight: 900, fontSize: '1rem' }}>{selectedTests.length} Test Seçildi</span>
          <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.3)' }} />
          <button onClick={handleOpenAssignModal} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
            Ata <Send size={16} />
          </button>
          <button onClick={() => setSelectedTests([])} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}>
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* ── ⚡ UNIFIED BULK IMPORT WIZARD ── */}
      {isBulkWizardOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem', fontWeight: 900 }}>
                <Zap size={22} style={{ color: '#6366f1' }} /> Toplu İçerik &amp; Test Sihirbazı
              </h3>
              <button onClick={() => setIsBulkWizardOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <XCircle size={22} />
              </button>
            </div>

            {/* Wizard Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--color-surface-hover)', padding: '0.35rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setBulkWizardTab("text")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "text" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: bulkWizardTab === "text" ? '#ffffff' : 'var(--color-text-muted)',
                  boxShadow: bulkWizardTab === "text" ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}
              >
                📝 Hızlı Liste Yapıştır
              </button>
              <button
                onClick={() => setBulkWizardTab("series")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "series" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: bulkWizardTab === "series" ? '#ffffff' : 'var(--color-text-muted)',
                  boxShadow: bulkWizardTab === "series" ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}
              >
                ⚡ Seri Test Oluştur
              </button>
              <button
                onClick={() => setBulkWizardTab("json")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "json" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: bulkWizardTab === "json" ? '#ffffff' : 'var(--color-text-muted)',
                  boxShadow: bulkWizardTab === "json" ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}
              >
                📄 JSON Aktar
              </button>
            </div>

            {/* TAB 1: TEXT LIST IMPORT */}
            {bulkWizardTab === "text" && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
                  Aşağıdaki alana metin listesini yapıştırabilirsiniz. Sistem yapıyı ve cevap anahtarlarını otomatik algılar:
                </p>
                <div style={{ background: 'rgba(37,99,235,0.12)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #3b82f6', fontSize: '0.82rem', color: '#60a5fa', marginBottom: '1rem' }}>
                  <strong style={{ color: 'var(--color-text)' }}>Örnek Satırlar:</strong><br />
                  • <code>Matematik &gt; Çarpanlar ve Katlar &gt; Test 1 : ABCDEABCDE</code><br />
                  • <code>Türkçe &gt; Test 1 [ABCDEABCDE]</code><br />
                  • <code>Paragraf (5 Test)</code>
                </div>

                <textarea
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  placeholder={`Matematik > Üslü Sayılar > Test 1 : ABCDEABCDEAB\nMatematik > Üslü Sayılar > Test 2 [ABCDEABCDEAB]\nTürkçe > Test 1 : BACDEBACDE`}
                  rows={8}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />

                {/* Live Preview */}
                {parsedBulkStructure.totalTests > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#f0fdf4', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: '#15803d', fontSize: '0.9rem' }}>Önizleme Algılandı:</strong>
                      <div style={{ fontSize: '0.82rem', color: '#16a34a', marginTop: '0.2rem' }}>
                        📘 {parsedBulkStructure.totalSubjects} Ders | 📑 {parsedBulkStructure.totalTopics} Konu | 📝 {parsedBulkStructure.totalTests} Test
                      </div>
                    </div>
                    <button onClick={handleExecuteBulkText} style={{ padding: '0.5rem 1.25rem', fontWeight: 900, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }}>
                      Toplu Oluştur
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BULK SERIES GENERATOR */}
            {bulkWizardTab === "series" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Hedef Ders Adı</label>
                  <input
                    type="text"
                    value={bulkSeriesData.subjectName}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, subjectName: e.target.value }))}
                    placeholder="Örn: Matematik, Fizik..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isDirectSubj"
                    checked={bulkSeriesData.isDirectSubject}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, isDirectSubject: e.target.checked }))}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <label htmlFor="isDirectSubj" style={{ fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', color: 'var(--color-text)' }}>
                    Konusuz - Testleri doğrudan derse ekle
                  </label>
                </div>

                {!bulkSeriesData.isDirectSubject && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Hedef Konu Adı (İsteğe Bağlı)</label>
                    <input
                      type="text"
                      value={bulkSeriesData.topicName}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, topicName: e.target.value }))}
                      placeholder="Örn: Çarpanlar ve Katlar"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* Test Tipi Seçimi */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>Test Tipi</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem', border: `1.5px solid ${bulkSeriesData.testType !== 'acik_uclu' ? '#6366f1' : 'var(--color-border)'}`, borderRadius: '0.65rem', cursor: 'pointer', background: bulkSeriesData.testType !== 'acik_uclu' ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-hover)', flex: 1 }}>
                      <input
                        type="radio"
                        name="bulkTestType"
                        value="coktan_secmeli"
                        checked={bulkSeriesData.testType !== 'acik_uclu'}
                        onChange={() => setBulkSeriesData(p => ({ ...p, testType: 'coktan_secmeli' }))}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>🔘 Çoktan Seçmeli</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem', border: `1.5px solid ${bulkSeriesData.testType === 'acik_uclu' ? '#8b5cf6' : 'var(--color-border)'}`, borderRadius: '0.65rem', cursor: 'pointer', background: bulkSeriesData.testType === 'acik_uclu' ? 'rgba(139,92,246,0.1)' : 'var(--color-surface-hover)', flex: 1 }}>
                      <input
                        type="radio"
                        name="bulkTestType"
                        value="acik_uclu"
                        checked={bulkSeriesData.testType === 'acik_uclu'}
                        onChange={() => setBulkSeriesData(p => ({ ...p, testType: 'acik_uclu' }))}
                        style={{ accentColor: '#8b5cf6' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>✍️ Açık Uçlu / Sayısal</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>Test Ön Eki</label>
                    <input
                      type="text"
                      value={bulkSeriesData.prefix}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, prefix: e.target.value }))}
                      placeholder="Test"
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>Test Sayısı</label>
                    <input
                      type="number"
                      value={bulkSeriesData.testCount}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, testCount: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>Soru Sayısı/Test</label>
                    <input
                      type="number"
                      value={bulkSeriesData.questionCount}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, questionCount: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ background: bulkSeriesData.testType === 'acik_uclu' ? 'rgba(139,92,246,0.12)' : 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: '0.75rem', border: `1.5px solid ${bulkSeriesData.testType === 'acik_uclu' ? 'rgba(139,92,246,0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: bulkSeriesData.testType === 'acik_uclu' ? '#8b5cf6' : '#10b981' }}>
                    {bulkSeriesData.testType === 'acik_uclu' ? '✍️ Cevap Anahtarı (İsteğe Bağlı - Virgülle Ayrılmış Sayılar)' : '🔑 Toplu Cevap Anahtarı (İsteğe Bağlı - Örn: ABCDEABCDE...)'}
                  </label>
                  <input
                    type="text"
                    value={bulkSeriesData.rawAnswerKey || ''}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, rawAnswerKey: e.target.value }))}
                    placeholder={bulkSeriesData.testType === 'acik_uclu' ? "Örn: 103959, 2, 503976, 22... veya boş bırakın" : "Örn: ABCDEABCDEABCDEABCDE"}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: `1.5px solid ${bulkSeriesData.testType === 'acik_uclu' ? 'rgba(139,92,246,0.4)' : 'rgba(16, 185, 129, 0.4)'}`, background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', letterSpacing: bulkSeriesData.testType === 'acik_uclu' ? 'normal' : '0.08em', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button onClick={handleExecuteBulkSeries} style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.65rem', color: 'white', cursor: 'pointer' }}>
                    {bulkSeriesData.testCount} Testi Otomatik Oluştur
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: JSON IMPORT (FULL 4-FORMAT TEMPLATES) */}
            {bulkWizardTab === "json" && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '1rem' }}>
                  <strong style={{ color: '#60a5fa' }}>{book.title}</strong> kitabına ait dersleri, konuları ve testleri (çoktan seçmeli veya açık uçlu) JSON ile tek seferde ekleyin.
                </p>

                <div style={{ background: 'rgba(37,99,235,0.1)', border: '1.5px solid #3b82f6', padding: '1rem', borderRadius: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={16} /> Kopyalanabilir Örnek JSON Formatları:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sampleCode = sampleJsonFormats[sampleFormatTab];
                        copyToClipboard(sampleFormatTab, sampleCode);
                        setJsonInput(sampleCode);
                      }}
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {copiedFormat === sampleFormatTab ? <Check size={14} /> : <Copy size={14} />} 
                      {copiedFormat === sampleFormatTab ? 'Kopyalandı & Yapıştırıldı!' : 'Kopyala ve Kutuya Yapıştır'}
                    </button>
                  </div>

                  {/* Format Selection Sub-tabs */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSampleFormatTab("standard")}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                        background: sampleFormatTab === "standard" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                        color: sampleFormatTab === "standard" ? '#ffffff' : 'var(--color-text)',
                        boxShadow: sampleFormatTab === "standard" ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                      }}
                    >
                      📘 3 Kademeli (Ders &gt; Konu &gt; Test)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSampleFormatTab("direct")}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                        background: sampleFormatTab === "direct" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                        color: sampleFormatTab === "direct" ? '#ffffff' : 'var(--color-text)',
                        boxShadow: sampleFormatTab === "direct" ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                      }}
                    >
                      📗 2 Kademeli (Ders &gt; Test)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSampleFormatTab("open_ended")}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                        background: sampleFormatTab === "open_ended" ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'var(--color-surface)',
                        color: sampleFormatTab === "open_ended" ? '#ffffff' : 'var(--color-text)',
                        boxShadow: sampleFormatTab === "open_ended" ? '0 2px 8px rgba(139,92,246,0.2)' : 'none'
                      }}
                    >
                      ✍️ Açık Uçlu / Sayısal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSampleFormatTab("mixed")}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                        background: sampleFormatTab === "mixed" ? 'linear-gradient(135deg, #0891b2, #0e7490)' : 'var(--color-surface)',
                        color: sampleFormatTab === "mixed" ? '#ffffff' : 'var(--color-text)',
                        boxShadow: sampleFormatTab === "mixed" ? '0 2px 8px rgba(8,145,178,0.2)' : 'none'
                      }}
                    >
                      🔀 Karma (ÇS + Açık Uçlu)
                    </button>
                  </div>

                  <pre style={{ background: 'var(--color-surface)', color: '#38bdf8', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', overflowX: 'auto', margin: 0, maxHeight: '180px', border: '1px solid var(--color-border)' }}>
                    {sampleJsonFormats[sampleFormatTab]}
                  </pre>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>JSON Verisini Buraya Yapıştırın</label>
                  <textarea
                    autoFocus
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='Yukarıdaki "Kopyala ve Kutuya Yapıştır" butonuna basarak örnek veriyi buraya aktarabilir ve düzenleyebilirsiniz...'
                    style={{ width: '100%', minHeight: '180px', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    spellCheck={false}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                  <button className="btn btn-outline" onClick={() => setIsBulkWizardOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface-hover)', padding: '0.65rem 1.25rem', borderRadius: '0.5rem' }}>Vazgeç</button>
                  <button className="btn btn-primary" onClick={handleExecuteJsonImport} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 900, color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Verileri Aktar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBJECT MODAL ── */}
      {isSubjectDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '420px', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-text)', fontSize: '1.25rem', fontWeight: 900 }}>{currentSubject ? '✏️ Dersi Düzenle' : '➕ Yeni Ders Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.25rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Ders Adı</label>
              <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Matematik, Fizik..." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box', fontSize: '0.95rem' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={() => setIsSubjectDialogOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSubjectSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', fontWeight: 900, border: 'none', padding: '0.65rem 1.25rem', borderRadius: '0.5rem', color: 'white' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOPIC MODAL ── */}
      {isTopicDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '420px', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-text)', fontSize: '1.25rem', fontWeight: 900 }}>{currentTopic ? '✏️ Konuyu Düzenle' : '➕ Yeni Konu Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.25rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Konu Adı</label>
              <input type="text" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Üslü Sayılar, Dinamik..." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box', fontSize: '0.95rem' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTopicDialogOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleTopicSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', fontWeight: 900, border: 'none', padding: '0.65rem 1.25rem', borderRadius: '0.5rem', color: 'white' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEST MODAL ── */}
      {isTestDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1.25rem', fontWeight: 900 }}>
                {currentTest ? `✏️ Testi Düzenle: ${currentTest.name}` : '➕ Yeni Test Ekle'}
              </h3>
              <button onClick={() => setIsTestDialogOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Test Adı</label>
              <input 
                type="text" 
                value={testFormData.name} 
                onChange={e => setTestFormData(p => ({...p, name: e.target.value}))} 
                placeholder="Örn: Test 1, Kazanım Testi 1..." 
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.92rem', boxSizing: 'border-box' }} 
                autoFocus 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Soru Sayısı</label>
              <input 
                type="number" 
                min="1"
                max="100"
                value={testFormData.questionCount} 
                onChange={e => setTestFormData(p => ({...p, questionCount: parseInt(e.target.value) || 0}))} 
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.92rem', boxSizing: 'border-box' }} 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={testFormData.pdfUrl || ''}
                onChange={e => setTestFormData(p => ({...p, pdfUrl: e.target.value}))}
                placeholder="https://drive.google.com/... veya PDF URL"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* ── Test Tipi Seçimi ── */}
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Test Tipi</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', border: `1.5px solid ${!testFormData.isOpenEnded ? '#6366f1' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: !testFormData.isOpenEnded ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-hover)', flex: 1 }}>
                  <input type="radio" name="testType" value="coktan_secmeli"
                    checked={!testFormData.isOpenEnded}
                    onChange={() => setTestFormData(p => ({ ...p, isOpenEnded: false, questionType: 'coktan_secmeli' }))}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>🔘 Çoktan Seçmeli</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', border: `1.5px solid ${testFormData.isOpenEnded ? '#8b5cf6' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: testFormData.isOpenEnded ? 'rgba(139,92,246,0.1)' : 'var(--color-surface-hover)', flex: 1 }}>
                  <input type="radio" name="testType" value="acik_uclu"
                    checked={testFormData.isOpenEnded}
                    onChange={() => setTestFormData(p => ({ ...p, isOpenEnded: true, questionType: 'acik_uclu' }))}
                    style={{ accentColor: '#8b5cf6' }}
                  />
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>✍️ Açık Uçlu/Sayısal</span>
                </label>
              </div>
            </div>

            {/* ── Cevap Anahtarı ── */}
            {testFormData.isOpenEnded ? (
              /* Açık Uçlu: Sayısal/Metin cevap alanları */
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                  <span>✍️ Cevap Anahtarı (Sayısal / Boş Bırakılabilir)</span>
                  <button
                    type="button"
                    onClick={() => setTestFormData(p => ({ ...p, answerKey: {} }))}
                    style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Temizle
                  </button>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.4rem', maxHeight: '260px', overflowY: 'auto', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '0.65rem', border: '1.5px solid var(--color-border)' }}>
                  {Array.from({ length: testFormData.questionCount || 0 }).map((_, i) => {
                    const qNum = i + 1;
                    const val = testFormData.answerKey?.[qNum] ?? testFormData.answerKey?.[String(qNum)] ?? '';
                    return (
                      <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: val ? 'rgba(139,92,246,0.07)' : 'var(--color-surface)', padding: '0.35rem 0.55rem', borderRadius: '0.45rem', border: val ? '1px solid #c4b5fd' : '1px solid var(--color-border)' }}>
                        <div style={{ width: '22px', fontWeight: 800, fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{qNum}.</div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={val}
                          onChange={e => setTestFormData(p => ({
                            ...p,
                            answerKey: { ...p.answerKey, [qNum]: e.target.value, [String(qNum)]: e.target.value }
                          }))}
                          placeholder="—"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '0.25rem 0.4rem',
                            borderRadius: '0.35rem',
                            border: '1px solid var(--color-border-input)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            outline: 'none'
                          }}
                        />
                      </div>
                    );
                  })}
                  {(!testFormData.questionCount || testFormData.questionCount === 0) && (
                    <span style={{ fontSize: '0.8rem', gridColumn: '1 / -1', textAlign: 'center', padding: '1rem 0', color: 'var(--color-text-muted)' }}>Önce soru sayısı girin.</span>
                  )}
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  💡 Boş bırakılan sorular "öğretmen kontrolünde" olarak işaretlenir.
                </p>
              </div>
            ) : book.bookType !== 'open_ended' ? (
              /* Çoktan Seçmeli: ABCDE balonlar */
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                  <span>Cevap Anahtarı ({book.optionCount === 4 ? 'A, B, C, D' : 'A, B, C, D, E'})</span>
                  <input 
                    type="text" 
                    placeholder="Toplu Gir (Örn: ABC...)"
                    onChange={(e) => {
                      const str = e.target.value;
                      const newKey = {};
                      str.replace(/[^A-Ea-e]/g, '').toUpperCase().split('').forEach((char, idx) => {
                        if(idx < testFormData.questionCount) newKey[idx + 1] = char;
                      });
                      setTestFormData(p => ({...p, answerKey: newKey}));
                    }}
                    style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem', borderRadius: '0.5rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', width: '160px', fontWeight: 800 }}
                  />
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '0.65rem', border: '1.5px solid var(--color-border)' }}>
                  {Array.from({ length: testFormData.questionCount || 0 }).map((_, i) => {
                    const qNum = i + 1;
                    const val = testFormData.answerKey?.[qNum] || '';
                    const optList = book.optionCount === 4 ? ['A','B','C','D'] : ['A','B','C','D','E'];
                    return (
                      <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface)', padding: '0.4rem 0.6rem', borderRadius: '0.45rem', border: '1px solid var(--color-border)' }}>
                        <div style={{ width: '22px', fontWeight: 800, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{qNum}.</div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {optList.map(opt => {
                            const isSelected = val === opt;
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setTestFormData(p => ({ ...p, answerKey: { ...p.answerKey, [qNum]: opt } }))}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%', border: isSelected ? 'none' : '1px solid var(--color-border-input)',
                                  background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                                  color: isSelected ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 900, fontSize: '0.72rem',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {(!testFormData.questionCount || testFormData.questionCount === 0) && (
                    <span style={{ fontSize: '0.8rem', gridColumn: '1 / -1', textAlign: 'center', padding: '1rem 0', color: 'var(--color-text-muted)' }}>Önce soru sayısı girin.</span>
                  )}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1.5px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTestDialogOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleTestSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '0.65rem 1.4rem', fontWeight: 900, border: 'none', borderRadius: '0.5rem', color: 'white' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🏫 ADVANCED ASSIGN HOMEWORK MODAL ── */}
      {isAssignDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '560px', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 900 }}>
                <Send size={20} style={{ color: '#6366f1' }} /> Ödev Ata ({selectedTests.length} Test Seçildi)
              </h3>
              <button onClick={() => setIsAssignDialogOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            {/* Custom Homework Title Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Ödev Başlığı</label>
              <input
                type="text"
                value={assignCustomTitle}
                onChange={(e) => setAssignCustomTitle(e.target.value)}
                placeholder="Örn: LGS Matematik 1. Dönem Ödevi"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, boxSizing: 'border-box' }}
              />
            </div>

            {/* Target Type Selector (Class vs Student) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Hedef Kitle Seçimi</label>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface-hover)', padding: '0.35rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => { setAssignTargetMode("class"); setAssignSelectedTargetIds([]); }}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.55rem', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem',
                    background: assignTargetMode === "class" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: assignTargetMode === "class" ? 'white' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <GraduationCap size={16} /> 🏫 Sınıfa Özel (Tüm Sınıf)
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignTargetMode("student"); setAssignSelectedTargetIds([]); }}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.55rem', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem',
                    background: assignTargetMode === "student" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: assignTargetMode === "student" ? 'white' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <Users size={16} /> 👤 Öğrenciye Özel
                </button>
              </div>
            </div>

            {/* Target Options Checklist */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                {assignTargetMode === "class" ? 'Hedef Sınıf(ları) Seçin:' : 'Hedef Öğrenci(leri) Seçin:'}
              </label>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1.5px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.65rem', background: 'var(--color-surface-hover)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                
                {/* CLASS LIST */}
                {assignTargetMode === "class" && availableClasses.map(cls => {
                  const isChecked = assignSelectedTargetIds.includes(cls.id);
                  const classStudentsCount = students.filter(s => 
                    String(s.gradeId) === String(cls.id) || 
                    s.gradeId === cls.name || 
                    String(s.classId) === String(cls.id) || 
                    s.grade === cls.id || 
                    s.grade === cls.name || 
                    s.className === cls.name
                  ).length;

                  return (
                    <label key={cls.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface)', borderRadius: '0.55rem', border: `1.5px solid ${isChecked ? '#6366f1' : 'var(--color-border)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleTargetId(cls.id)} 
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: '#6366f1', cursor: 'pointer' }} 
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                          🏫 {cls.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontWeight: 800, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        {classStudentsCount} Öğrenci
                      </span>
                    </label>
                  );
                })}

                {/* STUDENT LIST */}
                {assignTargetMode === "student" && students.map(st => {
                  const isChecked = assignSelectedTargetIds.includes(st.id);
                  return (
                    <label key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface)', borderRadius: '0.55rem', border: `1.5px solid ${isChecked ? '#6366f1' : 'var(--color-border)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleTargetId(st.id)} 
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: '#6366f1', cursor: 'pointer' }} 
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                          👤 {st.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {st.grade || st.className || 'Öğrenci'}
                      </span>
                    </label>
                  );
                })}

                {assignTargetMode === "class" && availableClasses.length === 0 && (
                  <p style={{ padding: '1rem', textAlign: 'center', margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tanımlı sınıf bulunamadı.</p>
                )}
                {assignTargetMode === "student" && students.length === 0 && (
                  <p style={{ padding: '1rem', textAlign: 'center', margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tanımlı öğrenci bulunamadı.</p>
                )}
              </div>
            </div>

            {/* Due Date Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                Ödev / Bitirme Tarihi veya Süresi
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>Hazır Gün Seçin:</label>
                  <select
                    value={assignDueDateDays}
                    onChange={(e) => {
                      setAssignDueDateDays(parseInt(e.target.value) || 7);
                      setAssignExactDueDate("");
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, boxSizing: 'border-box' }}
                  >
                    {!assignAsBook && (
                      <>
                        <option value={3}>3 Gün</option>
                        <option value={5}>5 Gün</option>
                      </>
                    )}
                    <option value={7}>1 Hafta (7 Gün)</option>
                    <option value={14}>2 Hafta (14 Gün)</option>
                    <option value={30}>1 Ay (30 Gün)</option>
                    {assignAsBook && (
                      <>
                        <option value={60}>2 Ay (60 Gün)</option>
                        <option value={90}>Dönem Sonu (90 Gün)</option>
                        <option value={180}>Yıl Sonu (180 Gün)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>Veya Takvimden Seçin:</label>
                  <input
                    type="date"
                    value={assignExactDueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAssignExactDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              {assignExactDueDate ? (
                <p style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 800, marginTop: '0.45rem' }}>
                  🗓️ Seçilen Bitirme Tarihi: {new Date(assignExactDueDate).toLocaleDateString('tr-TR')}
                </p>
              ) : (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.45rem' }}>
                  Hedef Bitirme Tarihi: {new Date(Date.now() + (assignDueDateDays || 7) * 86400000).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1.5px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsAssignDialogOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleAssignSelectedTestsSubmit} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '0.65rem 1.5rem', fontWeight: 900, border: 'none', borderRadius: '0.5rem', color: 'white' }}>
                Ödevi {assignTargetMode === 'class' ? 'Sınıfa' : 'Öğrenciye'} Ata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 📅 EDIT ASSIGNED HOMEWORK DUE DATE MODAL ── */}
      {editDateHw && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '480px', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 900 }}>
                <Calendar size={20} style={{ color: '#6366f1' }} /> Bitirme Tarihini Değiştir / Süre Uzat
              </h3>
              <button onClick={() => setEditDateHw(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', background: 'var(--color-surface-hover)', padding: '0.95rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>{editDateHw.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Mevcut Son Tarih: <strong style={{ color: '#60a5fa' }}>{editDateHw.dueDate ? new Date(editDateHw.dueDate).toLocaleDateString('tr-TR') : 'Yok'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>Yeni Bitirme Tarihi Seçin:</label>
              <input
                type="date"
                value={editDateValue}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEditDateValue(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center', fontWeight: 800 }}>Hızlı Uzat:</span>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setEditDateValue(d.toISOString().split('T')[0]); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer' }}>+7 Gün</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 14); setEditDateValue(d.toISOString().split('T')[0]); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer' }}>+14 Gün</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 30); setEditDateValue(d.toISOString().split('T')[0]); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer' }}>+30 Gün (1 Ay)</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1.5px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setEditDateHw(null)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  if (!editDateValue) return;
                  const newDueDate = new Date(editDateValue);
                  newDueDate.setHours(23, 59, 59, 999);
                  if (typeof updateHomework === 'function') {
                    await updateHomework(editDateHw.id, { dueDate: newDueDate.toISOString() });
                  }
                  showToast('Ödev bitirme tarihi başarıyla güncellendi!');
                  setEditDateHw(null);
                }}
                style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.5rem', color: 'white' }}
              >
                Yeni Tarihi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🗓️ DETAILED PER-TEST SCHEDULER MODAL FOR ASSIGNED BOOK ── */}
      {scheduleModalHw && (() => {
        let modalTargetStudents = [];
        if (scheduleModalHw.targetType === 'grade' || scheduleModalHw.targetType === 'class') {
          modalTargetStudents = students.filter(s => (scheduleModalHw.targetIds || []).some(tid => String(s.gradeId) === String(tid) || String(s.grade) === String(tid) || String(s.className) === String(tid)));
        } else {
          modalTargetStudents = (scheduleModalHw.targetIds || []).map(tid => {
            return students.find(s => String(s.id) === String(tid)) || { id: tid, name: 'Öğrenci' };
          });
        }
        if (modalTargetStudents.length === 0 && students.length > 0) {
          if (scheduleModalHw.targetType === 'all' || !scheduleModalHw.targetType) {
            modalTargetStudents = students;
          }
        }

        // Helper to retrieve solved submissions for a specific test
        const getTestSolveDetails = (testIdOrObj) => {
          const tObj = typeof testIdOrObj === 'object' ? testIdOrObj : (testLookup.byId.get(String(testIdOrObj)) || { id: testIdOrObj });
          const tIdStr = String(tObj?.id || testIdOrObj || '');
          const tUuidStr = String(toUUID(tIdStr) || '');
          const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
          const tName = String(tObj?.name || '').toLowerCase().trim();

          const list = [];
          (modalTargetStudents || []).forEach(st => {
            const stId = String(st.id);
            const stUuid = String(toUUID(st.id) || '');

            const sub = 
              studentSolvedIndex.submissionMap.get(`${stId}_${tIdStr}`) ||
              (tUuidStr && studentSolvedIndex.submissionMap.get(`${stId}_${tUuidStr}`)) ||
              studentSolvedIndex.submissionMap.get(`${stId}_${tCleanId}`) ||
              (tName && studentSolvedIndex.submissionMap.get(`${stId}_name_${tName}`)) ||
              (stUuid && studentSolvedIndex.submissionMap.get(`${stUuid}_${tIdStr}`)) ||
              (stUuid && tUuidStr && studentSolvedIndex.submissionMap.get(`${stUuid}_${tUuidStr}`)) ||
              (stUuid && studentSolvedIndex.submissionMap.get(`${stUuid}_${tCleanId}`)) ||
              (stUuid && tName && studentSolvedIndex.submissionMap.get(`${stUuid}_name_${tName}`)) ||
              null;

            if (sub) {
              list.push(sub);
            } else {
              const stSet = studentSolvedIndex.solvedMap.get(stId) || (stUuid ? studentSolvedIndex.solvedMap.get(stUuid) : null);
              if (stSet && (stSet.has(tIdStr) || (tUuidStr && stSet.has(tUuidStr)) || stSet.has(tCleanId) || (tName && stSet.has(`name_${tName}`)))) {
                list.push({ isSolved: true, status: 'completed' });
              }
            }
          });
          return list;
        };

        const totalBookTests = tests.length;
        const totalSolvedBookTests = tests.filter(t => getTestSolveDetails(t.id).length > 0).length;
        const bookSolvePct = totalBookTests > 0 ? Math.round((totalSolvedBookTests / totalBookTests) * 100) : 0;

        const getScheduleDateVal = (tId) => {
          if (!tId) return '';
          const sId = String(tId);
          const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
          const sUuid = String(toUUID(sId) || '');

          const val = scheduleDates[sId] ||
            (sUuid && scheduleDates[sUuid]) ||
            scheduleDates[sClean] ||
            scheduleDates[`bt_${sClean}`] ||
            scheduleDates[`bt_${sId}`] ||
            '';

          return formatSafeInputYMD(val);
        };

        const setScheduleDateVal = (tId, dateVal) => {
          if (!tId) return;
          const formatted = formatSafeInputYMD(dateVal);
          const sId = String(tId);
          const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
          const sUuid = String(toUUID(sId) || '');

          setScheduleDates(prev => {
            const next = { ...prev, [sId]: formatted };
            if (sClean) next[sClean] = formatted;
            if (sUuid) next[sUuid] = formatted;
            next[`bt_${sClean}`] = formatted;
            return next;
          });
        };

        return (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1rem' }}>
            <div className="modal-content" style={{ width: '96vw', maxWidth: '880px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
              
              {/* Modal Header */}
              <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.35rem', fontWeight: 900 }}>
                      <Clock size={24} style={{ color: '#0284c7' }} /> İçerik Test Tarihlerini Planla
                    </h3>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, background: totalSolvedBookTests > 0 ? '#f0fdf4' : 'rgba(37,99,235,0.12)', color: totalSolvedBookTests > 0 ? '#15803d' : '#60a5fa', padding: '0.25rem 0.75rem', borderRadius: '1rem', border: `1px solid ${totalSolvedBookTests > 0 ? '#bbf7d0' : '#3b82f6'}` }}>
                      {totalSolvedBookTests > 0 ? `🟢 ${totalSolvedBookTests}/${totalBookTests} Test Çözüldü (%${bookSolvePct})` : `⏳ 0/${totalBookTests} Çözüldü`}
                    </span>
                  </div>
                  
                  <div style={{ margin: '0.35rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 800 }}>{scheduleModalHw.title}</span>
                    {modalTargetStudents.length === 1 ? (
                      <span style={{ background: '#faf5ff', color: '#7e22ce', padding: '0.15rem 0.55rem', borderRadius: '0.45rem', fontSize: '0.78rem', fontWeight: 900, border: '1px solid #e9d5ff' }}>
                        👤 Öğrenci: {modalTargetStudents[0].name}
                      </span>
                    ) : modalTargetStudents.length > 1 ? (
                      <span style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', padding: '0.15rem 0.55rem', borderRadius: '0.45rem', fontSize: '0.78rem', fontWeight: 900, border: '1px solid #3b82f6' }}>
                        👥 {modalTargetStudents.length} Öğrenci ({modalTargetStudents.slice(0, 2).map(s => s.name).join(', ')}...)
                      </span>
                    ) : null}
                  </div>
                </div>
                <button onClick={() => setScheduleModalHw(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <XCircle size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="custom-scrollbar">
                
                {/* Quick Auto Distribute Box */}
                <div style={{ background: 'var(--color-surface-hover)', padding: '1.15rem 1.35rem', borderRadius: '1rem', border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={18} /> Otomatik Tarih Dağıtıcı (Hızlı Planlama)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text)', fontWeight: 800, marginBottom: '0.35rem' }}>Başlangıç Tarihi:</label>
                      <input
                        type="date"
                        value={autoStartDate}
                        onChange={(e) => setAutoStartDate(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text)', fontWeight: 800, marginBottom: '0.35rem' }}>Test Sıklığı (Aralık):</label>
                      <select
                        value={autoIntervalDays}
                        onChange={(e) => setAutoIntervalDays(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.88rem', boxSizing: 'border-box' }}
                      >
                        <option value={1}>Her Gün 1 Test (+1 Gün)</option>
                        <option value={2}>2 Günde 1 Test (+2 Gün - Önerilen)</option>
                        <option value={3}>3 Günde 1 Test (+3 Gün)</option>
                        <option value={4}>4 Günde 1 Test (+4 Gün)</option>
                        <option value={7}>Haftada 1 Test (+7 Gün)</option>
                      </select>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!autoStartDate) return;
                          const datesMap = {};
                          let currDate = new Date(autoStartDate);
                          let testCounter = 0;

                          book.subjects?.forEach(subj => {
                            const directTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id) && (!t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subj.id))));
                            const topicsList = subj.topics || [];

                            if (topicsList.length > 0) {
                              directTests.forEach(t => {
                                if (testCounter > 0) currDate.setDate(currDate.getDate() + autoIntervalDays);
                                const dStr = formatSafeInputYMD(currDate);
                                const sId = String(t.id);
                                const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
                                const sUuid = String(toUUID(sId) || '');
                                datesMap[sId] = dStr;
                                if (sClean) datesMap[sClean] = dStr;
                                if (sUuid) datesMap[sUuid] = dStr;
                                datesMap[`bt_${sClean}`] = dStr;
                                testCounter++;
                              });
                              topicsList.forEach(topic => {
                                const topicTests = sortTestsNaturally(tests.filter(t => String(t.topicId || t.topic_id) === String(topic.id)));
                                topicTests.forEach(t => {
                                  if (testCounter > 0) currDate.setDate(currDate.getDate() + autoIntervalDays);
                                  const dStr = formatSafeInputYMD(currDate);
                                  const sId = String(t.id);
                                  const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
                                  const sUuid = String(toUUID(sId) || '');
                                  datesMap[sId] = dStr;
                                  if (sClean) datesMap[sClean] = dStr;
                                  if (sUuid) datesMap[sUuid] = dStr;
                                  datesMap[`bt_${sClean}`] = dStr;
                                  testCounter++;
                                });
                              });
                            } else {
                              const subjTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id)));
                              subjTests.forEach(t => {
                                if (testCounter > 0) currDate.setDate(currDate.getDate() + autoIntervalDays);
                                const dStr = formatSafeInputYMD(currDate);
                                const sId = String(t.id);
                                const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
                                const sUuid = String(toUUID(sId) || '');
                                datesMap[sId] = dStr;
                                if (sClean) datesMap[sClean] = dStr;
                                if (sUuid) datesMap[sUuid] = dStr;
                                datesMap[`bt_${sClean}`] = dStr;
                                testCounter++;
                              });
                            }
                          });
                          setScheduleDates(datesMap);
                          showToast(`${testCounter} teste sırayla otomatik tarihler atandı! ✨`);
                        }}
                        style={{ width: '100%', padding: '0.65rem 1rem', fontWeight: 900, fontSize: '0.88rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', border: 'none', borderRadius: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}
                      >
                        <Zap size={16} /> Otomatik Tarihleri Dağıt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sticky/Top Bulk Date Action Bar */}
                {scheduleSelectedTestIds.length > 0 && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1.5px solid rgba(59, 130, 246, 0.3)', padding: '0.95rem 1.35rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
                    <div style={{ fontWeight: 900, color: '#60a5fa', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckSquare size={18} style={{ color: '#6366f1' }} /> {scheduleSelectedTestIds.length} Test Seçildi
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)' }}>Toplu Tarih Seçin:</label>
                      <input
                        type="date"
                        value={bulkApplyDate}
                        onChange={(e) => setBulkApplyDate(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '0.55rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.88rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!bulkApplyDate) {
                            showToast('Lütfen önce bir tarih seçiniz!', 'error');
                            return;
                          }
                          const formattedBulk = formatSafeInputYMD(bulkApplyDate);
                          setScheduleDates(prev => {
                            const updated = { ...prev };
                            scheduleSelectedTestIds.forEach(tId => {
                              const sId = String(tId);
                              const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '');
                              const sUuid = String(toUUID(sId) || '');
                              updated[sId] = formattedBulk;
                              if (sClean) updated[sClean] = formattedBulk;
                              if (sUuid) updated[sUuid] = formattedBulk;
                              updated[`bt_${sClean}`] = formattedBulk;
                            });
                            return updated;
                          });
                          showToast(`${scheduleSelectedTestIds.length} teste seçilen tarih başarıyla uygulandı! ✅`);
                        }}
                        style={{ padding: '0.55rem 1.15rem', fontWeight: 900, fontSize: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '0.55rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
                      >
                        Seçilenlere Uygula
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleSelectedTestIds([])}
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '0.55rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer' }}
                      >
                        Seçimi Temizle
                      </button>
                    </div>
                  </div>
                )}

                {/* Per-Test Date Settings List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)', fontWeight: 900 }}>
                      Kitap İçindekiler Yapısı &amp; Test Bazlı Tarihler
                    </h4>
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const allOpenSubj = {};
                          const allOpenTop = {};
                          book.subjects?.forEach(s => {
                            allOpenSubj[s.id] = false;
                            s.topics?.forEach(t => { allOpenTop[t.id] = false; });
                          });
                          setScheduleCollapsedSubj(allOpenSubj);
                          setScheduleCollapsedTopic(allOpenTop);
                        }}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer' }}
                      >
                        📂 Tümünü Aç
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allClosedSubj = {};
                          const allClosedTop = {};
                          book.subjects?.forEach(s => {
                            allClosedSubj[s.id] = true;
                            s.topics?.forEach(t => { allClosedTop[t.id] = true; });
                          });
                          setScheduleCollapsedSubj(allClosedSubj);
                          setScheduleCollapsedTopic(allClosedTop);
                        }}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer' }}
                      >
                        📁 Tümünü Kapat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allTestIds = tests.map(t => t.id);
                          if (scheduleSelectedTestIds.length === allTestIds.length) {
                            setScheduleSelectedTestIds([]);
                          } else {
                            setScheduleSelectedTestIds(allTestIds);
                          }
                        }}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontWeight: 900, borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer' }}
                      >
                        {scheduleSelectedTestIds.length === tests.length ? '✅ Tüm Kitabı Kaldır' : '☑️ Tüm Kitabı Seç'}
                      </button>
                    </div>
                  </div>

                  {book.subjects?.map(subj => {
                    const sId = String(subj.id || '');
                    const sIdUuid = toUUID(sId);
                    const sName = String(subj.name || '').toLowerCase().trim();
                    const isSubjMatch = (t) => {
                      const tSubId = String(t.subjectId || t.subject_id || '');
                      return (tSubId && (tSubId === sId || (sIdUuid && toUUID(tSubId) === sIdUuid))) ||
                        String(t.subjectId || t.subject_id || t.subject || t.subjectName || '').toLowerCase().trim() === sName;
                    };

                    const allSubjTests = sortTestsNaturally(tests.filter(t => isSubjMatch(t)));
                    if (allSubjTests.length === 0) return null;

                    const topicsList = subj.topics || [];
                    const directTests = sortTestsNaturally(tests.filter(t => {
                      if (!isSubjMatch(t)) return false;
                      if (topicsList.length === 0) return true;
                      const tTopicId = String(t.topicId || t.topic_id || '');
                      if (!tTopicId || tTopicId === 'direct' || tTopicId === sId || tTopicId === 'null' || tTopicId === 'undefined') return true;
                      const matchesAnyTopic = topicsList.some(tp => {
                        const tpId = String(tp.id || '');
                        return tTopicId === tpId || (tpId && toUUID(tTopicId) === toUUID(tpId)) ||
                          (tp.name && t.topicName && String(t.topicName).toLowerCase().trim() === String(tp.name).toLowerCase().trim());
                      });
                      return !matchesAnyTopic;
                    }));
                    const allSubjSelected = allSubjTests.every(t => scheduleSelectedTestIds.includes(t.id));
                    
                    // Default to collapsed (true) if undefined
                    const isExpanded = scheduleCollapsedSubj[subj.id] === false;
                    const subjSolvedCount = allSubjTests.filter(t => getTestSolveDetails(t.id).length > 0).length;

                    return (
                      <div key={subj.id} style={{ border: '1.5px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden', background: 'var(--color-surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        {/* Subject Header (Collapsible) */}
                        <div style={{ background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.15rem', cursor: 'pointer', borderBottom: isExpanded ? '1.5px solid var(--color-border)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div 
                            onClick={() => setScheduleCollapsedSubj(p => ({ ...p, [subj.id]: p[subj.id] === false ? true : false }))}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}
                          >
                            {isExpanded ? <ChevronDown size={20} style={{ color: '#6366f1' }} /> : <ChevronRight size={20} style={{ color: '#6366f1' }} />}
                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 900 }}>
                              <Layers size={18} style={{ color: '#6366f1' }} /> {subj.name}
                            </h4>
                            <span style={{ fontSize: '0.78rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 800, marginLeft: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              {topicsList.length > 0 ? `${topicsList.length} Ünite / Konu • ` : ''}{allSubjTests.length} Test
                              {subjSolvedCount > 0 && (
                                <strong style={{ color: '#10b981', marginLeft: '0.4rem' }}>• 🟢 {subjSolvedCount} Çözüldü</strong>
                              )}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const subjTestIds = allSubjTests.map(t => t.id);
                                if (allSubjSelected) {
                                  setScheduleSelectedTestIds(prev => prev.filter(id => !subjTestIds.includes(id)));
                                } else {
                                  setScheduleSelectedTestIds(prev => Array.from(new Set([...prev, ...subjTestIds])));
                                }
                              }}
                              style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', fontWeight: 800, background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', borderRadius: '0.5rem', cursor: 'pointer' }}
                            >
                              {allSubjSelected ? '✅ Tüm Dersi Kaldır' : '☑️ Tüm Dersi Seç'}
                            </button>
                          </div>
                        </div>

                        {/* Subject Content (Expanded Only) */}
                        {isExpanded && (
                          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            {/* Direct Tests (if any exist directly under Subject) */}
                            {directTests.length > 0 && (
                              <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)' }}>
                                <h5 style={{ margin: '0 0 0.65rem 0', fontSize: '0.9rem', color: '#60a5fa', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <FileText size={15} /> Direkt Testler ({directTests.length})
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                                  {directTests.map(t => {
                                    const testVal = scheduleDates[t.id] || '';
                                    const isSelected = scheduleSelectedTestIds.includes(t.id);
                                    const matchedSubs = getTestSolveDetails(t.id);
                                    const isSolved = matchedSubs.length > 0;
                                    const primarySub = isSolved ? matchedSubs[0] : null;

                                    return (
                                      <div 
                                        key={t.id} 
                                        style={{ 
                                          background: isSelected ? 'rgba(99, 102, 241, 0.15)' : isSolved ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)', 
                                          padding: '0.75rem 0.95rem', 
                                          borderRadius: '0.75rem', 
                                          border: `1.5px solid ${isSelected ? '#6366f1' : isSolved ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border)'}`, 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'space-between', 
                                          gap: '0.65rem',
                                          boxShadow: isSolved ? '0 2px 10px rgba(16,185,129,0.08)' : 'none'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => setScheduleSelectedTestIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                            style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }}
                                          />
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {t.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.questionCount || 20} Soru</span>
                                              
                                              {isSolved ? (
                                                modalTargetStudents.length === 1 ? (
                                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.12rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {(() => {
                                                      const c = Number(primarySub?.correct_count ?? primarySub?.correctCount ?? primarySub?.correct ?? 0);
                                                      const w = Number(primarySub?.wrong_count ?? primarySub?.wrongCount ?? primarySub?.wrong ?? 0);
                                                      const b = Number(primarySub?.empty_count ?? primarySub?.blankCount ?? primarySub?.blank ?? 0);
                                                      const q = Number(primarySub?.total_questions ?? primarySub?.totalQuestions ?? (c + w + b));
                                                      const pct = q > 0 ? Math.round((c / q) * 100) : Math.round(primarySub?.score_percentage ?? primarySub?.scorePercentage ?? primarySub?.score ?? 0);
                                                      return `✅ Çözüldü (%${pct} • ${c}D ${w}Y)`;
                                                    })()}
                                                  </span>
                                                ) : (
                                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.12rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                    ✅ {matchedSubs.length}/{modalTargetStudents.length} Çözdü
                                                  </span>
                                                )
                                              ) : (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', padding: '0.1rem 0.45rem', borderRadius: '0.35rem' }}>
                                                  ⏳ Çözülmedi
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <input
                                          type="date"
                                          value={testVal}
                                          onChange={e => setScheduleDates(p => ({ ...p, [t.id]: e.target.value }))}
                                          style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 800, flexShrink: 0 }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Topics / Units List (Ders > Ünite / Konu > Testler) */}
                            {topicsList.length > 0 ? (
                              topicsList.map(topic => {
                                const topicTests = sortTestsNaturally(tests.filter(t => String(t.topicId || t.topic_id) === String(topic.id)));
                                if (topicTests.length === 0) return null;

                                // Default to collapsed (true) if undefined
                                const isTopicExpanded = scheduleCollapsedTopic[topic.id] === false;
                                const allTopicSelected = topicTests.every(t => scheduleSelectedTestIds.includes(t.id));
                                const topicSolvedCount = topicTests.filter(t => getTestSolveDetails(t.id).length > 0).length;

                                return (
                                  <div key={topic.id} style={{ borderLeft: '3.5px solid #6366f1', paddingLeft: '0.85rem', background: 'var(--color-surface)', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
                                    
                                    {/* Topic Header (Collapsible) */}
                                    <div 
                                      style={{ padding: '0.75rem 0.95rem', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isTopicExpanded ? '1.5px solid var(--color-border)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}
                                      onClick={() => setScheduleCollapsedTopic(p => ({ ...p, [topic.id]: p[topic.id] === false ? true : false }))}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                        {isTopicExpanded ? <ChevronDown size={16} style={{ color: '#6366f1' }} /> : <ChevronRight size={16} style={{ color: '#6366f1' }} />}
                                        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <FileText size={15} style={{ color: '#7c3aed' }} /> {topic.name}
                                        </h5>
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-text-muted)', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontWeight: 800 }}>
                                          {topicTests.length} Test
                                          {topicSolvedCount > 0 && (
                                            <strong style={{ color: '#10b981', marginLeft: '0.35rem' }}>• 🟢 {topicSolvedCount} Çözüldü</strong>
                                          )}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const topicTestIds = topicTests.map(t => t.id);
                                          if (allTopicSelected) {
                                            setScheduleSelectedTestIds(prev => prev.filter(id => !topicTestIds.includes(id)));
                                          } else {
                                            setScheduleSelectedTestIds(prev => Array.from(new Set([...prev, ...topicTestIds])));
                                          }
                                        }}
                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', fontWeight: 800, background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', borderRadius: '0.45rem', cursor: 'pointer' }}
                                      >
                                        {allTopicSelected ? '✅ Üniteyi Kaldır' : '☑️ Üniteyi Seç'}
                                      </button>
                                    </div>

                                    {/* Topic Tests Grid (Expanded Only) */}
                                    {isTopicExpanded && (
                                      <div style={{ padding: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                                        {topicTests.map(t => {
                                          const testVal = scheduleDates[t.id] || '';
                                          const isSelected = scheduleSelectedTestIds.includes(t.id);
                                          const matchedSubs = getTestSolveDetails(t.id);
                                          const isSolved = matchedSubs.length > 0;
                                          const primarySub = isSolved ? matchedSubs[0] : null;

                                          return (
                                            <div 
                                              key={t.id} 
                                              style={{ 
                                                background: isSelected ? 'rgba(99, 102, 241, 0.15)' : isSolved ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)', 
                                                padding: '0.75rem 0.95rem', 
                                                borderRadius: '0.75rem', 
                                                border: `1.5px solid ${isSelected ? '#6366f1' : isSolved ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border)'}`, 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between', 
                                                gap: '0.65rem', 
                                                transition: 'all 0.15s',
                                                boxShadow: isSolved ? '0 2px 10px rgba(16,185,129,0.08)' : 'none'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => {
                                                    setScheduleSelectedTestIds(prev =>
                                                      prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                                    );
                                                  }}
                                                  style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }}
                                                />
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.name}
                                                  </div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.questionCount || 20} Soru</span>
                                                    
                                                    {isSolved ? (
                                                      modalTargetStudents.length === 1 ? (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.12rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                          {(() => {
                                                            const c = Number(primarySub?.correct_count ?? primarySub?.correctCount ?? primarySub?.correct ?? 0);
                                                            const w = Number(primarySub?.wrong_count ?? primarySub?.wrongCount ?? primarySub?.wrong ?? 0);
                                                            const b = Number(primarySub?.empty_count ?? primarySub?.blankCount ?? primarySub?.blank ?? 0);
                                                            const q = Number(primarySub?.total_questions ?? primarySub?.totalQuestions ?? (c + w + b));
                                                            const pct = q > 0 ? Math.round((c / q) * 100) : Math.round(primarySub?.score_percentage ?? primarySub?.scorePercentage ?? primarySub?.score ?? 0);
                                                            return `✅ Çözüldü (%${pct} • ${c}D ${w}Y)`;
                                                          })()}
                                                        </span>
                                                      ) : (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.12rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                          ✅ {matchedSubs.length}/{modalTargetStudents.length} Çözdü
                                                        </span>
                                                      )
                                                    ) : (
                                                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', padding: '0.1rem 0.45rem', borderRadius: '0.35rem' }}>
                                                        ⏳ Çözülmedi
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              <input
                                                type="date"
                                                value={getScheduleDateVal(t.id)}
                                                onChange={(e) => setScheduleDateVal(t.id, e.target.value)}
                                                style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 800, flexShrink: 0 }}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              /* Fallback when no topics exist: show all tests under subject */
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                                {allSubjTests.map(t => {
                                  const testVal = scheduleDates[t.id] || '';
                                  const isSelected = scheduleSelectedTestIds.includes(t.id);
                                  const matchedSubs = getTestSolveDetails(t.id);
                                  const isSolved = matchedSubs.length > 0;
                                  const primarySub = isSolved ? matchedSubs[0] : null;

                                  return (
                                    <div 
                                      key={t.id} 
                                      style={{ 
                                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : isSolved ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)', 
                                        padding: '0.75rem 0.95rem', 
                                        borderRadius: '0.75rem', 
                                        border: `1.5px solid ${isSelected ? '#6366f1' : isSolved ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border)'}`, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        gap: '0.65rem', 
                                        transition: 'all 0.15s',
                                        boxShadow: isSolved ? '0 2px 10px rgba(16,185,129,0.08)' : 'none'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            setScheduleSelectedTestIds(prev =>
                                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                            );
                                          }}
                                          style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }}
                                        />
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {t.name}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.questionCount || 20} Soru</span>
                                            
                                            {isSolved ? (
                                              modalTargetStudents.length === 1 ? (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.12rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                  ✅ Çözüldü (%{(() => {
                                                      const c = primarySub?.correctCount ?? primarySub?.correct ?? 0;
                                                      const w = primarySub?.wrongCount ?? primarySub?.wrong ?? 0;
                                                      const b = primarySub?.emptyCount ?? primarySub?.blank ?? 0;
                                                      const q = primarySub?.totalQuestions || (c + w + b);
                                                      return q > 0 && (c > 0 || w > 0 || b > 0)
                                                        ? Math.min(100, Math.max(0, Math.round((c / q) * 100)))
                                                        : Math.round(primarySub?.scorePercentage ?? primarySub?.score ?? 0);
                                                    })()} • {primarySub?.correctCount ?? 0}D {primarySub?.wrongCount ?? 0}Y)
                                                </span>
                                              ) : (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.12rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                  ✅ {matchedSubs.length}/{modalTargetStudents.length} Çözdü
                                                </span>
                                              )
                                            ) : (
                                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', padding: '0.1rem 0.45rem', borderRadius: '0.35rem' }}>
                                                ⏳ Çözülmedi
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <input
                                        type="date"
                                        value={getScheduleDateVal(t.id)}
                                        onChange={(e) => setScheduleDateVal(t.id, e.target.value)}
                                        style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 800, flexShrink: 0 }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1.25rem 1.75rem', borderTop: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button className="btn btn-outline" onClick={() => setScheduleModalHw(null)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const cleanedScheduleDates = {};
                      Object.keys(scheduleDates).forEach((k) => {
                         const v = getScheduleDateVal(k);
                         const f = formatSafeInputYMD(v);
                         if (f) cleanedScheduleDates[k] = f;
                      });

                      // 1. Update homework in HomeworkContext (and Supabase homeworks table)
                      if (typeof updateHomework === 'function') {
                        const matchingHws = (allHomeworks || []).filter(h => 
                          h.id === scheduleModalHw?.id || 
                          (scheduleModalHw?.id && toUUID(h.id) === toUUID(scheduleModalHw.id)) ||
                          (h.isBookAssignment && (String(h.bookId) === String(book?.id) || toUUID(h.bookId) === toUUID(book?.id)))
                        );
                        if (matchingHws.length > 0) {
                          for (const h of matchingHws) {
                            await updateHomework(h.id, {
                              testDueDates: cleanedScheduleDates,
                              scheduleDates: cleanedScheduleDates
                            });
                          }
                        } else if (scheduleModalHw?.id) {
                          await updateHomework(scheduleModalHw.id, {
                            testDueDates: cleanedScheduleDates,
                            scheduleDates: cleanedScheduleDates
                          });
                        }
                      }

                      // 2. Save dates directly to tracked_book_tests in TrackedBookContext (and Supabase tracked_book_tests table)
                      if (typeof batchSaveTrackedBookTests === 'function' && Object.keys(cleanedScheduleDates).length > 0) {
                        const testsToUpdate = Object.entries(cleanedScheduleDates).map(([tId, dStr]) => {
                          const existingTest = (bookTests || []).find(bt => String(bt.id) === String(tId) || toUUID(bt.id) === toUUID(tId));
                          return {
                            ...(existingTest || {}),
                            id: tId,
                            bookId: book?.id,
                            dueDate: dStr,
                            testDueDate: dStr,
                            date: dStr
                          };
                        });
                        await batchSaveTrackedBookTests(testsToUpdate);
                      }

                      // 3. Update book.subjects tests inside the book object
                      if (typeof updateTrackedBook === 'function' && book?.id) {
                        const updatedSubjects = (book.subjects || []).map(s => ({
                          ...s,
                          tests: (s.tests || []).map(t => {
                            const d = getScheduleDateVal(t.id);
                            return d ? { ...t, dueDate: d, testDueDate: d } : t;
                          }),
                          topics: (s.topics || []).map(tp => ({
                            ...tp,
                            tests: (tp.tests || []).map(t => {
                              const d = getScheduleDateVal(t.id);
                              return d ? { ...t, dueDate: d, testDueDate: d } : t;
                            })
                          }))
                        }));
                        await updateTrackedBook(book.id, { subjects: updatedSubjects });
                      }

                      showToast('Test bazlı bitirme tarihleri veritabanına başarıyla kaydedildi! 🎉');
                      setScheduleModalHw(null);
                    } catch (err) {
                      console.error('Error saving schedule dates:', err);
                      showToast('Tarihler kaydedilirken hata oluştu!', 'error');
                    }
                  }}
                  style={{ padding: '0.65rem 1.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }}
                >
                  Tüm Test Tarihlerini Kaydet
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── BOOK SETTINGS MODAL ── */}
      {isBookSettingsDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '520px', padding: '1.75rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: 'var(--color-text)' }}>
            <h2 style={{ color: 'var(--color-text)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.35rem', fontWeight: 900 }}>
              <Settings style={{ color: '#6366f1' }} /> Kitap Ayarlarını Düzenle
            </h2>
            <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Kitap başlığı, yayınevi, seviye ve optik seçenek sayısını güncelleyin.</p>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>Kitap Adı</label>
              <input
                type="text"
                value={bookSettingsForm.title}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, title: e.target.value })}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>Yayınevi</label>
              <input
                type="text"
                value={bookSettingsForm.publisher}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, publisher: e.target.value })}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>Kitap Türü (Formatı)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.bookType === 'standard' ? '#6366f1' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.bookType === 'standard' ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-surface-hover)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="radio"
                      name="bookSettingBookType"
                      value="standard"
                      checked={bookSettingsForm.bookType === 'standard'}
                      onChange={() => setBookSettingsForm({ ...bookSettingsForm, bookType: 'standard' })}
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span style={{ fontWeight: 900, fontSize: '0.82rem', color: 'var(--color-text)' }}>🔘 Standart</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: '1.2rem' }}>Çoktan Seçmeli</span>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.bookType === 'open_ended' ? '#8b5cf6' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.bookType === 'open_ended' ? 'rgba(139, 92, 246, 0.12)' : 'var(--color-surface-hover)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="radio"
                      name="bookSettingBookType"
                      value="open_ended"
                      checked={bookSettingsForm.bookType === 'open_ended'}
                      onChange={() => setBookSettingsForm({ ...bookSettingsForm, bookType: 'open_ended' })}
                      style={{ accentColor: '#8b5cf6' }}
                    />
                    <span style={{ fontWeight: 900, fontSize: '0.82rem', color: 'var(--color-text)' }}>✍️ Açık Uçlu</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: '1.2rem' }}>Klasik / Sayısal</span>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.bookType === 'mixed' ? '#0891b2' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.bookType === 'mixed' ? 'rgba(8, 145, 178, 0.12)' : 'var(--color-surface-hover)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="radio"
                      name="bookSettingBookType"
                      value="mixed"
                      checked={bookSettingsForm.bookType === 'mixed'}
                      onChange={() => setBookSettingsForm({ ...bookSettingsForm, bookType: 'mixed' })}
                      style={{ accentColor: '#0891b2' }}
                    />
                    <span style={{ fontWeight: 900, fontSize: '0.82rem', color: 'var(--color-text)' }}>🔀 Karma</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: '1.2rem' }}>ÇS + Açık Uçlu</span>
                </label>
              </div>
            </div>

            {bookSettingsForm.bookType !== 'open_ended' && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>Optik Form Seçenek Sayısı (Seviye)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.optionCount === 4 ? '#10b981' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.optionCount === 4 ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-hover)' }}>
                    <input
                      type="radio"
                      name="bookSettingOptionCount"
                      value={4}
                      checked={bookSettingsForm.optionCount === 4}
                      onChange={() => setBookSettingsForm({ ...bookSettingsForm, optionCount: 4 })}
                      style={{ accentColor: '#10b981' }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>4 Şık (A-D)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>İlkokul / Ortaokul / LGS</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.optionCount === 5 ? '#8b5cf6' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.optionCount === 5 ? 'rgba(139, 92, 246, 0.12)' : 'var(--color-surface-hover)' }}>
                    <input
                      type="radio"
                      name="bookSettingOptionCount"
                      value={5}
                      checked={bookSettingsForm.optionCount === 5}
                      onChange={() => setBookSettingsForm({ ...bookSettingsForm, optionCount: 5 })}
                      style={{ accentColor: '#8b5cf6' }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>5 Şık (A-E)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={bookSettingsForm.pdfUrl || ''}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, pdfUrl: e.target.value })}
                placeholder="https://drive.google.com/... veya direkt PDF URL"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1.5px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsBookSettingsDialogOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface)' }}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const updatedData = {
                    ...bookSettingsForm,
                    optionCount: Number(bookSettingsForm.optionCount) || 5
                  };
                  setLocalLiveBook(prev => prev ? ({ ...prev, ...updatedData }) : prev);
                  await updateTrackedBook(book.id, updatedData);
                  setIsBookSettingsDialogOpen(false);
                  showToast("Kitap ayarları başarıyla güncellendi. 🎉");
                }}
                style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.5rem', color: 'white' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Test Score Entry Modal */}
      <ManualTestModal
        isOpen={manualModalData.isOpen}
        initialData={manualModalData.data}
        onClose={() => setManualModalData({ isOpen: false, data: null })}
      />
    </div>
  );
}
