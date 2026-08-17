import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { 
  ArrowLeft, BookMarked, Layers, FileText, CheckCircle, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp, Plus, Edit, Trash2, 
  ListX, Send, XCircle, X, FileOutput, Filter, AlertTriangle, FileJson, CheckSquare, Zap,
  Users, GraduationCap, Clock, Calendar, Award, BarChart2, Check, BookOpen, Settings, RotateCcw, RefreshCw,
  Search, Eye
} from 'lucide-react';

function parseAnswerKeyString(str, questionCount = 20, optionCount = 5) {
  if (!str || typeof str !== 'string') return {};
  const cleanRegex = optionCount === 4 ? /[^A-Da-d]/g : /[^A-Ea-e]/g;
  const cleaned = str.replace(cleanRegex, '').toUpperCase();
  const answerKey = {};
  const maxQ = questionCount || cleaned.length || 20;
  for (let i = 0; i < Math.min(cleaned.length, maxQ); i++) {
    answerKey[String(i + 1)] = cleaned[i];
  }
  return answerKey;
}

function sortTestsNaturally(testsArray) {
  if (!Array.isArray(testsArray)) return [];
  return [...testsArray].sort((a, b) => {
    return (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' });
  });
}

function toUUID(val) {
  if (!val) return null;
  const s = String(val);
  if (s.length === 36 && s.includes('-')) return s;
  return null;
}

export default function BookContentManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books, bookTests, updateTrackedBook, deleteTrackedBookTest, addTrackedBookTest, updateTrackedBookTest } = useTrackedBooks();
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
  
  const book = books.find(b => b.id === id);
  const tests = useMemo(() => bookTests.filter(t => t.bookId === id), [bookTests, id]);
  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  // Book Settings Dialog State
  const [isBookSettingsDialogOpen, setIsBookSettingsDialogOpen] = useState(false);
  const [bookSettingsForm, setBookSettingsForm] = useState({ title: '', publisher: '', optionCount: 5, pdfUrl: '' });

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
    answerKey: {}
  });
  
  // Bulk Wizard Form States
  const [bulkTextInput, setBulkTextInput] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [bulkSeriesData, setBulkSeriesData] = useState({
    subjectName: "",
    topicName: "",
    isDirectSubject: false,
    prefix: "Test",
    testCount: 10,
    questionCount: 20,
    rawAnswerKey: ""
  });

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
    return allHomeworks.filter(hw => {
      if (hw.bookId === id) return true;
      if (hw.tests && hw.tests.length > 0) {
        return tests.some(t => hw.tests.includes(t.id));
      }
      return false;
    });
  }, [allHomeworks, id, tests]);

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
        hwStudents = (hw.targetIds || []).map(tid => students.find(s => String(s.id) === String(tid)) || { id: tid, name: 'Öğrenci' });
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

      const hwTestsSet = new Set(hwTests.map(String));
      const hwTestsUuidSet = new Set(hwTests.map(tid => toUUID(tid)).filter(Boolean));

      hwStudents.forEach(st => {
        totalAssignedTestSlots += hwTests.length;
        const stUuid = toUUID(st.id);

        const solved = (submissions || []).filter(s => {
          const isMatchStudent = String(s.studentId) === String(st.id) || (stUuid && String(s.studentId) === String(stUuid)) || (stUuid && toUUID(s.studentId) === String(stUuid));
          if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;

          const candidateFields = [s.testId, s.bookTestId, s.realTestId, ...(s.bookTestIds || [])].filter(Boolean).map(String);
          return candidateFields.some(cid => hwTestsSet.has(cid) || hwTestsUuidSet.has(cid) || hwTestsSet.has(toUUID(cid)) || hwTestsUuidSet.has(toUUID(cid)));
        });

        const uniqueSolved = new Set();
        solved.forEach(s => {
          const matched = hwTests.find(tid => {
            const tu = toUUID(tid);
            const candidateFields = [s.testId, s.bookTestId, s.realTestId, ...(s.bookTestIds || [])].filter(Boolean).map(String);
            return candidateFields.some(cid => cid === String(tid) || (tu && cid === String(tu)) || (tu && toUUID(cid) === String(tu)) || toUUID(cid) === String(tid));
          });
          if (matched) uniqueSolved.add(String(matched));
        });

        totalSolvedTestSlots += uniqueSolved.size;
        if (uniqueSolved.size >= hwTests.length && hwTests.length > 0) {
          completedCount++;
        }
      });
    });

    const completionRate = totalAssignedTestSlots > 0
      ? Math.round((totalSolvedTestSlots / totalAssignedTestSlots) * 100)
      : (totalTargetStudents > 0 ? Math.round((completedCount / totalTargetStudents) * 100) : 0);

    return { totalAssigned, totalTargetStudents, completedCount, completionRate, totalSolvedTestSlots, totalAssignedTestSlots };
  }, [bookHomeworks, students, submissions, tests]);

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
    const solvedSubmissions = submissions.filter(s => tests.some(t => t.id === s.testId || t.id === s.bookTestId) && s.status === 'completed');

    for (const sub of solvedSubmissions) {
      const testDef = tests.find(t => t.id === sub.testId || t.id === sub.bookTestId);
      if (!testDef) continue;
      
      const subject = book?.subjects?.find(s => String(s.id) === String(testDef.subjectId));
      const topic = subject?.topics?.find(t => String(t.id) === String(testDef.topicId));

      const subjName = subject?.name || 'Genel';
      const topName = topic?.name || 'Direkt Testler';
      const stName = students.find(st => String(st.id) === String(sub.studentId))?.name || sub.studentName || 'Öğrenci';

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
  }, [submissions, tests, book, students]);

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
  const toggleSubject = (subjId) => setCollapsedSubjects(p => ({ ...p, [subjId]: !p[subjId] }));
  const toggleTopic = (topicId) => setCollapsedTopics(p => ({ ...p, [topicId]: !p[topicId] }));
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

  const handleOpenEditTest = (subject, topic, test) => {
    setCurrentSubject(subject || null);
    setCurrentTopic(topic || null);
    setCurrentTest(test);
    const qCount = Number(test.questionCount) || (test.answerKey ? Object.keys(test.answerKey).length : 0) || 20;
    setTestFormData({
      name: test.name || '',
      questionCount: qCount,
      answerKey: test.answerKey ? { ...test.answerKey } : {},
      pdfUrl: test.pdfUrl || ''
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

    const testPayload = {
      bookId: String(book.id),
      subjectId: targetSubjectId ? String(targetSubjectId) : null,
      topicId: targetTopicId,
      name: testFormData.name.trim(),
      questionCount: Number(testFormData.questionCount) || 20,
      pdfUrl: testFormData.pdfUrl || '',
    };
    
    if (book.bookType !== 'open_ended') {
      testPayload.answerKey = testFormData.answerKey || {};
    }

    try {
      if (currentTest) {
        await updateTrackedBookTest(currentTest.id, testPayload);
        showToast('Test başarıyla güncellendi.', 'success');
      } else {
        await addTrackedBookTest(book.id, testPayload);
        showToast('Yeni test başarıyla eklendi.', 'success');
      }
      setIsTestDialogOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Test kaydedilirken bir hata oluştu.', 'error');
    }
  };

  // --- BULK WIZARD EXECUTION ---
  const handleExecuteBulkText = () => {
    const { subjectsMap, totalTests } = parsedBulkStructure;
    if (totalTests === 0) {
      showToast("Lütfen geçerli içerik satırları giriniz.", "error");
      return;
    }

    const updatedSubjects = JSON.parse(JSON.stringify(book.subjects || []));

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
        addTrackedBookTest(book.id, {
          subjectId: String(subject.id),
          topicId: null,
          name: testName,
          questionCount: 20,
          answerKey: parseAnswerKeyString(rawAns, 20)
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
          addTrackedBookTest(book.id, {
            subjectId: String(subject.id),
            topicId: String(topic.id),
            name: testName,
            questionCount: 20,
            answerKey: parseAnswerKeyString(rawAns, 20)
          });
        });
      });
    });

    updateTrackedBook(book.id, { subjects: updatedSubjects });
    showToast(`${totalTests} test ve içerik yapısı başarıyla eklendi!`);
    setIsBulkWizardOpen(false);
    setBulkTextInput("");
  };

  const handleExecuteBulkSeries = () => {
    const { subjectName, topicName, isDirectSubject, prefix, testCount, questionCount, rawAnswerKey } = bulkSeriesData;
    if (!subjectName.trim() || testCount <= 0) {
      showToast("Lütfen ders adı ve geçerli test sayısı giriniz.", "error");
      return;
    }

    const answerKeyObj = parseAnswerKeyString(rawAnswerKey, questionCount);

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

    updateTrackedBook(book.id, { subjects: updatedSubjects });

    for (let i = 1; i <= testCount; i++) {
      addTrackedBookTest(book.id, {
        subjectId: String(subject.id),
        topicId: topicId,
        name: `${prefix || 'Test'} ${i}`,
        questionCount: questionCount || 20,
        answerKey: answerKeyObj
      });
    }

    showToast(`${testCount} adet test cevap anahtarı ile başarıyla eklendi!`);
    setIsBulkWizardOpen(false);
  };

  const handleExecuteJsonImport = () => {
    if (!jsonInput.trim()) return;
    try {
      const parsedData = JSON.parse(jsonInput);
      const subjectsList = parsedData.subjects || (Array.isArray(parsedData) ? parsedData : null);
      if (!subjectsList || !Array.isArray(subjectsList)) throw new Error("Geçersiz JSON formatı");

      const updatedSubjects = JSON.parse(JSON.stringify(book.subjects || []));

      for (const subjData of subjectsList) {
        if (!subjData.name) continue;
        let subject = updatedSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === subjData.name.toLocaleLowerCase('tr-TR'));
        if (!subject) {
          subject = { id: `subj_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`, name: subjData.name, topics: [] };
          updatedSubjects.push(subject);
        }

        if (subjData.tests && Array.isArray(subjData.tests)) {
          subjData.tests.forEach(testData => {
            let ansObj = {};
            if (testData.answerKey) {
              if (Array.isArray(testData.answerKey)) {
                testData.answerKey.forEach((ans, idx) => { if (ans) ansObj[String(idx + 1)] = String(ans); });
              } else if (typeof testData.answerKey === 'object') {
                ansObj = testData.answerKey;
              } else if (typeof testData.answerKey === 'string') {
                ansObj = parseAnswerKeyString(testData.answerKey, testData.questionCount || 20);
              }
            }
            addTrackedBookTest(book.id, {
              subjectId: String(subject.id),
              topicId: null,
              name: testData.name || "Test",
              questionCount: testData.questionCount || 20,
              answerKey: ansObj
            });
          });
        }

        if (subjData.topics && Array.isArray(subjData.topics)) {
          if (!subject.topics) subject.topics = [];
          for (const topicData of subjData.topics) {
            let topic = subject.topics.find(t => t.name?.toLocaleLowerCase('tr-TR') === topicData.name.toLocaleLowerCase('tr-TR'));
            if (!topic) {
              topic = { id: `topic_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`, name: topicData.name };
              subject.topics.push(topic);
            }
            if (topicData.tests && Array.isArray(topicData.tests)) {
              topicData.tests.forEach(testData => {
                let ansObj = {};
                if (testData.answerKey) {
                  if (Array.isArray(testData.answerKey)) {
                    testData.answerKey.forEach((ans, idx) => { if (ans) ansObj[String(idx + 1)] = String(ans); });
                  } else if (typeof testData.answerKey === 'object') {
                    ansObj = testData.answerKey;
                  } else if (typeof testData.answerKey === 'string') {
                    ansObj = parseAnswerKeyString(testData.answerKey, testData.questionCount || 20);
                  }
                }
                addTrackedBookTest(book.id, {
                  subjectId: String(subject.id),
                  topicId: String(topic.id),
                  name: testData.name || "Test",
                  questionCount: testData.questionCount || 20,
                  answerKey: ansObj
                });
              });
            }
          }
        }
      }

      updateTrackedBook(book.id, { subjects: updatedSubjects });
      showToast("JSON Verisi Başarıyla İçerik Yapısına Dönüştürüldü!");
      setIsBulkWizardOpen(false);
      setJsonInput("");
    } catch (e) {
      showToast("Geçersiz JSON formatı! Lütfen veriyi kontrol edin.", "error");
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

  const handleAssignSelectedTestsSubmit = () => {
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

    addHomework({
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

  if (!book) return <div className="books-page-container" style={{ padding: '4rem', textAlign: 'center', color: '#ffffff', fontWeight: 800, fontSize: '1.2rem' }}>Yükleniyor...</div>;

  return (
    <div className="books-page-container" style={{ paddingBottom: selectedTests.length > 0 ? '7rem' : '4rem' }}>
      
      {/* ── TOP HERO HEADER BAR ── */}
      <div className="books-glass-card" style={{ marginBottom: '1.75rem', padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => navigate('/books')} 
            style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Kitap Listesine Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '0.85rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(99,102,241,0.35)' }}>
            <BookMarked size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>{book.title}</h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', padding: '0.2rem 0.65rem', borderRadius: '999px', border: '1px solid rgba(165,180,252,0.3)' }}>
                {book.optionCount === 4 ? '🎯 4 Şık Optik (Ortaokul / LGS)' : '🎯 5 Şık Optik (Lise / YKS)'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                İçerik &amp; Ödev Takip Yönetimi • <strong style={{ color: '#ffffff' }}>{book.publisher}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setBookSettingsForm({ title: book.title, publisher: book.publisher, optionCount: book.optionCount || 5, pdfUrl: book.pdfUrl || '' }); setIsBookSettingsDialogOpen(true); }} 
            style={{ padding: '0.65rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Settings size={17} /> Kitap Ayarları
          </button>
          <button 
            onClick={handleAssignEntireBook} 
            style={{ padding: '0.65rem 1.15rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}
            className="hover:scale-105 active:scale-95"
          >
            <BookOpen size={17} /> Tüm Kitabı Ata
          </button>
          <button 
            onClick={() => setIsBulkWizardOpen(true)} 
            style={{ padding: '0.65rem 1.15rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
            className="hover:scale-105 active:scale-95"
          >
            <Zap size={17} /> Toplu Ekle &amp; Yapılandır
          </button>
          <button 
            onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }}
            style={{ padding: '0.65rem 1.15rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
            className="hover:scale-105 active:scale-95"
          >
            <Plus size={17} /> Ders Ekle
          </button>
        </div>
      </div>

      {/* ── MODERN GLASS TABS SWITCHER ── */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.35rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', width: 'fit-content', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab("contents")}
          style={{ 
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'all 0.2s',
            background: activeTab === "contents" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: activeTab === "contents" ? '#ffffff' : 'rgba(255,255,255,0.7)',
            boxShadow: activeTab === "contents" ? '0 4px 14px rgba(99,102,241,0.35)' : 'none'
          }}
        >
          <BookOpen size={18} /> İçindekiler Yapısı
        </button>

        <button 
          onClick={() => setActiveTab("homeworks")}
          style={{ 
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'all 0.2s',
            background: activeTab === "homeworks" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: activeTab === "homeworks" ? '#ffffff' : 'rgba(255,255,255,0.7)',
            boxShadow: activeTab === "homeworks" ? '0 4px 14px rgba(99,102,241,0.35)' : 'none'
          }}
        >
          <CheckSquare size={18} /> Atanan Ödevler &amp; İlerleme
          {bookHomeworks.length > 0 && (
            <span style={{ background: activeTab === "homeworks" ? 'rgba(255,255,255,0.25)' : '#6366f1', color: 'white', padding: '0.15rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 900 }}>
              {bookHomeworks.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("mistakes")}
          style={{ 
            padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', transition: 'all 0.2s',
            background: activeTab === "mistakes" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
            color: activeTab === "mistakes" ? '#ffffff' : 'rgba(255,255,255,0.7)',
            boxShadow: activeTab === "mistakes" ? '0 4px 14px rgba(99,102,241,0.35)' : 'none'
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
              {book.subjects.map(subject => {
                const directTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subject.id) && (!t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subject.id))));
                const topicsList = subject.topics || [];
                const isExpanded = !collapsedSubjects[subject.id];

                return (
                  <div key={subject.id} style={{ border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                    
                    {/* Subject Header */}
                    <div style={{ background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none', padding: '0.85rem 1.25rem', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div 
                        onClick={() => toggleSubject(subject.id)}
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, gap: '0.5rem' }}
                      >
                        {isExpanded ? <ChevronDown size={20} style={{ color: '#818cf8' }} /> : <ChevronRight size={20} style={{ color: '#818cf8' }} />}
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900 }}>
                          <Layers size={18} style={{ color: '#a5b4fc' }} /> {subject.name}
                        </h3>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#c7d2fe', background: 'rgba(99,102,241,0.25)', padding: '0.2rem 0.65rem', borderRadius: '1rem', fontWeight: 800, border: '1px solid rgba(165,180,252,0.3)' }}>
                          {topicsList.length > 0 ? `${topicsList.length} Konu` : ''} 
                          {directTests.length > 0 ? `${topicsList.length > 0 ? ' • ' : ''}${directTests.length} Direkt Test` : ''}
                          {topicsList.length === 0 && directTests.length === 0 ? 'İçerik Yok' : ''}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleAssignSubject(subject); }} style={{ padding: '0.4rem 0.75rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.3)', borderRadius: '0.5rem', color: '#c7d2fe', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Tüm Dersi Ödev Olarak Ata">
                          <BookOpen size={14} /> Dersi Ata
                        </button>
                        <button onClick={() => { setCurrentSubject(subject); setNewSubjectName(subject.name); setIsSubjectDialogOpen(true); }} style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: '#ffffff', cursor: 'pointer' }} title="Dersi Düzenle">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteSubject(subject.id)} style={{ padding: '0.4rem 0.6rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer' }} title="Dersi Sil">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Subject Content */}
                    {isExpanded && (
                      <div style={{ padding: '1.25rem' }}>

                        {/* Direct Tests (when Ders > Test structure) */}
                        {directTests.length > 0 && (
                          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '0.85rem', border: '1px solid rgba(165, 180, 252, 0.2)' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: '#a5b4fc', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <FileText size={16} /> Direkt Testler ({directTests.length})
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                              {directTests.map(test => (
                                <div key={test.id} style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedTests.includes(test.id)} 
                                      onChange={() => toggleTestSelection(test.id)}
                                      style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                    <div>
                                      <h5 style={{ margin: 0, fontSize: '0.92rem', color: '#ffffff', fontWeight: 800 }}>{test.name}</h5>
                                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.15rem' }}>
                                        {test.questionCount} Soru
                                        {test.answerKey && Object.keys(test.answerKey).length > 0 && (
                                          <span style={{ marginLeft: '0.5rem', color: '#34d399', fontWeight: 800 }}>• Cevap Anahtarlı ({Object.keys(test.answerKey).length})</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button style={{ padding: '0.35rem 0.55rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.3)', borderRadius: '0.4rem', color: '#c7d2fe', cursor: 'pointer' }} onClick={() => handleAssignSingleTest(test)} title="Bu Teste Bitirme Tarihi / Ödev Ata">
                                      <Calendar size={13} />
                                    </button>
                                    <button style={{ padding: '0.35rem 0.55rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#ffffff', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleOpenEditTest(subject, null, test); }} title="Bu Testi Düzenle">
                                      <Edit size={13} />
                                    </button>
                                    <button style={{ padding: '0.35rem 0.55rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', color: '#f87171', cursor: 'pointer' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
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
                          const topicTests = sortTestsNaturally(tests.filter(t => String(t.topicId) === String(topic.id)));
                          const isTopicExpanded = !collapsedTopics[topic.id];

                          return (
                            <div key={topic.id} style={{ borderLeft: '3px solid #818cf8', margin: '0.5rem 0.25rem 1.25rem 0.25rem', paddingLeft: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div 
                                  onClick={() => toggleTopic(topic.id)}
                                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexGrow: 1, gap: '0.4rem' }}
                                >
                                  {isTopicExpanded ? <ChevronDown size={16} style={{ color: '#c7d2fe' }} /> : <ChevronRight size={16} style={{ color: '#c7d2fe' }} />}
                                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FileText size={16} style={{ color: '#a855f7' }} /> {topic.name}
                                  </h4>
                                  <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontWeight: 800 }}>{topicTests.length} Test</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button onClick={() => handleAssignTopic(topic)} style={{ padding: '0.35rem 0.65rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.3)', borderRadius: '0.4rem', color: '#c7d2fe', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Bu Konudaki Testlere Bitirme Tarihi / Ödev Ata">
                                    <Calendar size={13} /> Ata
                                  </button>
                                  <button onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setNewTopicName(topic.name); setIsTopicDialogOpen(true); }} style={{ padding: '0.35rem 0.55rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#ffffff', cursor: 'pointer' }}><Edit size={13} /></button>
                                  <button onClick={() => handleDeleteTopic(subject.id, topic.id)} style={{ padding: '0.35rem 0.55rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', color: '#f87171', cursor: 'pointer' }}><Trash2 size={13} /></button>
                                </div>
                              </div>

                              {/* Tests under Topic */}
                              {isTopicExpanded && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
                                    {topicTests.length > 0 ? (
                                      topicTests.map(test => (
                                        <div key={test.id} style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input 
                                              type="checkbox" 
                                              checked={selectedTests.includes(test.id)} 
                                              onChange={() => toggleTestSelection(test.id)}
                                              style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                            />
                                            <div>
                                              <h5 style={{ margin: 0, fontSize: '0.92rem', color: '#ffffff', fontWeight: 800 }}>{test.name}</h5>
                                              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.15rem' }}>
                                                {test.questionCount} Soru
                                                {test.answerKey && Object.keys(test.answerKey).length > 0 && (
                                                  <span style={{ marginLeft: '0.5rem', color: '#34d399', fontWeight: 800 }}>• Cevap Anahtarlı ({Object.keys(test.answerKey).length})</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button style={{ padding: '0.35rem 0.55rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.3)', borderRadius: '0.4rem', color: '#c7d2fe', cursor: 'pointer' }} onClick={() => handleAssignSingleTest(test)} title="Bu Teste Bitirme Tarihi / Ödev Ata">
                                              <Calendar size={13} />
                                            </button>
                                            <button style={{ padding: '0.35rem 0.55rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#ffffff', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleOpenEditTest(subject, topic, test); }} title="Bu Testi Düzenle">
                                              <Edit size={13} />
                                            </button>
                                            <button style={{ padding: '0.35rem 0.55rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', color: '#f87171', cursor: 'pointer' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p style={{ fontSize: '0.85rem', fontStyle: 'italic', margin: 0, color: 'rgba(255,255,255,0.5)' }}>Bu konuda henüz test bulunmuyor.</p>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' }); setIsTestDialogOpen(true); }}>
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
                          <button style={{ fontSize: '0.85rem', color: '#c7d2fe', border: '1.5px dashed rgba(165,180,252,0.4)', background: 'rgba(99,102,241,0.12)', padding: '0.5rem 1rem', borderRadius: '0.65rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true); }}>
                            <Plus size={15} /> Konu Ekle
                          </button>
                          <button style={{ fontSize: '0.85rem', color: '#34d399', border: '1.5px dashed rgba(52,211,153,0.4)', background: 'rgba(16,185,129,0.12)', padding: '0.5rem 1rem', borderRadius: '0.65rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' }); setIsTestDialogOpen(true); }}>
                            <Plus size={15} /> Direkt Test Ekle (Konusuz)
                          </button>
                          <button style={{ fontSize: '0.85rem', color: '#fbcfe8', border: '1.5px dashed rgba(244,114,182,0.4)', background: 'rgba(236,72,153,0.12)', padding: '0.5rem 1rem', borderRadius: '0.65rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setBulkSeriesData(p => ({ ...p, subjectName: subject.name })); setIsBulkWizardOpen(true); setBulkWizardTab("series"); }}>
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
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', border: '1.5px dashed rgba(255,255,255,0.15)' }}>
              <BookMarked size={48} style={{ color: 'rgba(255,255,255,0.25)', margin: '0 auto 1rem auto' }} />
              <p style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff', fontWeight: 800 }}>Bu kitaba henüz ders veya test eklenmemiş.</p>
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
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(99,102,241,0.35)' }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Atanan Ödevler</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff' }}>{homeworkAnalytics.totalAssigned} Adet</div>
              </div>
            </div>

            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(16,185,129,0.35)' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hedef Öğrenciler</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399' }}>{homeworkAnalytics.totalTargetStudents} Öğrenci</div>
              </div>
            </div>

            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#38bdf8,#0284c7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(56,189,248,0.35)' }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kitap Tamamlama Oranı</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>%{homeworkAnalytics.completionRate}</div>
              </div>
            </div>

            <div className="books-kpi-card">
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'linear-gradient(135deg,#ec4899,#db2777)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(236,72,153,0.35)' }}>
                <RotateCcw size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Canlı Veri Durumu</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f472b6' }}>
                  {isEvaluationSyncing ? 'Senkronize Ediliyor...' : '✓ Güncel'}
                </div>
              </div>
            </div>
          </div>

          {/* HOMEWORKS LIST CARD */}
          <div className="books-glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.3rem', fontWeight: 900 }}>
                <CheckSquare size={22} style={{ color: '#818cf8' }} /> Bu Kitaptan Atanan Ödevler &amp; Öğrenci İlerlemeleri
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
                  background: isEvaluationSyncing ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.2)',
                  border: '1.5px solid rgba(165,180,252,0.3)',
                  color: '#c7d2fe',
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
                    const stId = st.id;
                    const stUuid = toUUID(stId);
                    const solvedSubmissions = (submissions || []).filter(s => {
                      const isMatchStudent = String(s.studentId) === String(stId) || (stUuid && String(s.studentId) === String(stUuid)) || (stUuid && toUUID(s.studentId) === String(stUuid));
                      if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;

                      const candidateFields = [s.testId, s.bookTestId, s.realTestId, ...(s.bookTestIds || [])].filter(Boolean).map(String);
                      const isMatchingTest = candidateFields.some(cid => hwTestsSet.has(cid) || hwTestsUuidSet.has(cid) || hwTestsSet.has(toUUID(cid)) || hwTestsUuidSet.has(toUUID(cid)));
                      const isMatchingHw = String(s.hwId) === String(hw.id) || String(s.homeworkId) === String(hw.id) || (toUUID(hw.id) && String(s.hwId) === String(toUUID(hw.id)));

                      return isMatchingTest || isMatchingHw;
                    });
                    
                    const uniqueSolvedTests = new Set();
                    solvedSubmissions.forEach(s => {
                      const matchedId = hwTests.find(tid => {
                        const tu = toUUID(tid);
                        const candidateFields = [s.testId, s.bookTestId, s.realTestId, ...(s.bookTestIds || [])].filter(Boolean).map(String);
                        return candidateFields.some(cid => cid === String(tid) || (tu && cid === String(tu)) || (tu && toUUID(cid) === String(tu)) || toUUID(cid) === String(tid));
                      });
                      if (matchedId) uniqueSolvedTests.add(String(matchedId));
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
                    <div key={hw.id} style={{ border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                      
                      {/* HOMEWORK HEADER */}
                      <div style={{ padding: '1.15rem 1.35rem', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '0.65rem', borderRadius: '0.75rem', display: 'flex', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: 900 }}>{hw.title}</h4>
                              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 900, background: isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: isExpired ? '#f87171' : '#34d399', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}` }}>
                                {isExpired ? '⏳ Süresi Bitti' : '✓ Aktif'}
                              </span>
                              {hw.targetType === 'class' || hw.targetType === 'grade' ? (
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 800, background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.3)' }}>
                                  🏫 Sınıf ({targetStudents.length} Öğrenci)
                                </span>
                              ) : targetStudents.length === 1 ? (
                                <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.65rem', borderRadius: '0.45rem', fontWeight: 900, background: 'rgba(168,85,247,0.25)', color: '#e9d5ff', border: '1px solid rgba(192,132,252,0.4)' }}>
                                  👤 Öğrenci: {targetStudents[0]?.name}
                                </span>
                              ) : targetStudents.length > 1 && targetStudents.length <= 3 ? (
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 800, background: 'rgba(168,85,247,0.25)', color: '#e9d5ff', border: '1px solid rgba(192,132,252,0.4)' }}>
                                  👤 {targetStudents.map(s => s.name).join(', ')}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.45rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>
                                  👤 {targetStudents.length} Öğrenci ({targetStudents.slice(0, 2).map(s => s.name).join(', ')}...)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.35rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span>📝 {totalTestsInHw} Test ({hw.totalQuestions || '?'} Soru)</span>
                              <span>📅 Genel Son Tarih: <strong style={{ color: '#ffffff' }}>{new Date(hw.dueDate).toLocaleDateString('tr-TR')}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* PROGRESS BAR & ACTIONS */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ minWidth: '160px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.7)' }}>İlerleme</span>
                              <span style={{ color: overallHwProgressPct === 100 ? '#34d399' : '#818cf8', fontWeight: 900 }}>%{overallHwProgressPct} ({totalSolvedInHw}/{totalPossibleInHw} Test)</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                              <div style={{ width: `${overallHwProgressPct}%`, background: overallHwProgressPct === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #38bdf8)', height: '100%', borderRadius: 99 }} />
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setEditDateHw(hw);
                              setEditDateValue(hw.dueDate ? hw.dueDate.split('T')[0] : '');
                            }}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c7d2fe', background: 'rgba(99,102,241,0.18)', border: '1.5px solid rgba(165,180,252,0.3)', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Tüm Kitap İçin Bitirme Tarihini Güncelle"
                          >
                            <Calendar size={15} /> Genel Tarih
                          </button>

                          <button 
                            onClick={() => {
                              setScheduleModalHw(hw);
                              setScheduleDates(hw.testDueDates || {});
                              setAutoStartDate(new Date().toISOString().split('T')[0]);
                              setScheduleSelectedTestIds([]);
                              setBulkApplyDate('');
                              const initialCollapsedSubj = {};
                              const initialCollapsedTopic = {};
                              book?.subjects?.forEach(s => {
                                initialCollapsedSubj[s.id] = false;
                                s.topics?.forEach(t => { initialCollapsedTopic[t.id] = false; });
                              });
                              setScheduleCollapsedSubj(initialCollapsedSubj);
                              setScheduleCollapsedTopic(initialCollapsedTopic);
                            }}
                            style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', background: 'rgba(2, 132, 199, 0.22)', border: '1.5px solid rgba(56, 189, 248, 0.4)', borderRadius: '0.6rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.25)' }}
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
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Öğrencinin gördüğü birebir kitap ekranında detaylı ilerlemeyi aç"
                          >
                            <BookOpen size={15} /> Detaylı İlerleme
                          </button>

                          <button 
                            onClick={() => handleResetEntireHomework(hw)}
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171', background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '0.6rem', cursor: 'pointer' }}
                            title="Bu ödeve ait tüm öğrencilerin çözümlerini ve yanıtlarını sıfırla"
                          >
                            <RotateCcw size={14} /> Tümünü Sıfırla
                          </button>

                          <button 
                            onClick={() => handleDeleteHomeworkItem(hw.id)}
                            style={{ padding: '0.45rem', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* EXPANDED STUDENT DETAILS */}
                      {isExpanded && (
                        <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.35)' }}>
                          <h5 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: '#c7d2fe', fontWeight: 900 }}>
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
                                const tUuid = toUUID(tId);
                                const stUuid = toUUID(item.student?.id);

                                const testSub = (submissions || []).find(s => {
                                  const isMatchStudent = String(s.studentId) === String(item.student?.id) || (stUuid && String(s.studentId) === String(stUuid)) || (stUuid && toUUID(s.studentId) === String(stUuid));
                                  if (!isMatchStudent) return false;

                                  const candidateFields = [s.testId, s.bookTestId, s.realTestId, ...(s.bookTestIds || [])].filter(Boolean).map(String);
                                  return candidateFields.some(cid => cid === String(tId) || (tUuid && cid === String(tUuid)) || (tUuid && toUUID(cid) === String(tUuid)) || toUUID(cid) === String(tId));
                                });

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
                                <div key={item.student.id} style={{ background: 'rgba(255,255,255,0.04)', padding: '1.15rem', borderRadius: '0.85rem', border: '1.5px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                  
                                  {/* Top Student Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <div style={{ width: '2.4rem', height: '2.4rem', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                                        {item.student.name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#ffffff' }}>
                                          {item.student.name}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.15rem' }}>
                                          Çözülen: <strong style={{ color: '#818cf8' }}>{item.solvedCount}</strong> / {item.totalTestsInHw} Test
                                          {item.solvedSubmissions.length > 0 && (
                                            <> • Ortalama Başarı: <strong style={{ color: '#34d399' }}>%{Math.round(item.solvedSubmissions.reduce((a, b) => a + (b.score || 0), 0) / item.solvedSubmissions.length)}</strong></>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.45rem', background: item.isDone ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: item.isDone ? '#34d399' : '#fde68a', border: `1px solid ${item.isDone ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)'}` }}>
                                        {item.isDone ? '✅ Tamamladı' : `⏳ %${item.pct}`}
                                      </span>

                                      {item.solvedCount > 0 && (
                                        <button 
                                          onClick={() => handleResetStudentBookHomework(hw, item.student.id, item.student.name)}
                                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                          title="Öğrencinin bu ödevdeki tüm yanıtlarını sıfırla ve yeniden çözmesini sağla"
                                        >
                                          <RotateCcw size={13} /> Tümünü Sıfırla
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                                    <div style={{ width: `${item.pct}%`, background: item.isDone ? '#10b981' : '#38bdf8', height: '100%', borderRadius: 99, transition: 'width 0.3s' }} />
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
                                      boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
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
                                      background: isTestsOpen ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                      border: `1px solid ${isTestsOpen ? 'rgba(165,180,252,0.35)' : 'rgba(255,255,255,0.1)'}`,
                                      color: isTestsOpen ? '#c7d2fe' : 'rgba(255,255,255,0.8)',
                                      fontWeight: 800,
                                      fontSize: '0.84rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <FileText size={15} style={{ color: '#818cf8' }} />
                                      <span>📋 Test Bazlı Başarı &amp; Durum Listesi ({allHwTestsWithStatus.length} Test)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 800 }}>
                                      <span>{isTestsOpen ? 'Listeyi Gizle' : 'Testleri İncele'}</span>
                                      {isTestsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                  </button>

                                  {/* EXPANDED TEST-BY-TEST BREAKDOWN */}
                                  {isTestsOpen && (
                                    <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                      
                                      {/* Filter and Search Bar */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                                          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                                          <input
                                            type="text"
                                            placeholder="Test veya ünite ara..."
                                            value={studentTestSearch[stKey] || ''}
                                            onChange={e => setStudentTestSearch(prev => ({ ...prev, [stKey]: e.target.value }))}
                                            style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                          <button
                                            onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'all' }))}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filterTab === 'all' ? '#6366f1' : 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                                          >
                                            Tümü ({allHwTestsWithStatus.length})
                                          </button>
                                          <button
                                            onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'solved' }))}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filterTab === 'solved' ? '#10b981' : 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                                          >
                                            ✅ Çözülenler ({solvedTestsCount})
                                          </button>
                                          <button
                                            onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'unsolved' }))}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filterTab === 'unsolved' ? '#d97706' : 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                                          >
                                            ⏳ Çözülmeyenler ({unsolvedTestsCount})
                                          </button>
                                          {mistakeTestsCount > 0 && (
                                            <button
                                              onClick={() => setStudentTestFilter(prev => ({ ...prev, [stKey]: 'mistakes' }))}
                                              style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filterTab === 'mistakes' ? '#dc2626' : 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
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
                                                background: 'rgba(255,255,255,0.04)',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.65rem',
                                                border: `1px solid ${t.isSolved ? 'rgba(52,211,153,0.35)' : t.isDraft ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.1)'}`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem'
                                              }}
                                            >
                                              {/* Test Title & Subject */}
                                              <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>
                                                    {t.testDef?.name || `Test ${tIdx + 1}`}
                                                  </span>
                                                  {t.testDueDate && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(2,132,199,0.2)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(56,189,248,0.35)' }}>
                                                      📅 {new Date(t.testDueDate).toLocaleDateString('tr-TR')}
                                                    </span>
                                                  )}
                                                  {t.questionCount && (
                                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                                                      {t.questionCount} Soru
                                                    </span>
                                                  )}
                                                </div>
                                                {(t.subjName || t.topicName) && (
                                                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.15rem' }}>
                                                    {t.subjName}{t.topicName ? ` / ${t.topicName}` : ''}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Performance / Status Badges & Actions */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                {t.isSolved ? (
                                                  <>
                                                    <div style={{ textAlign: 'right' }}>
                                                      <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '0.4rem', background: (t.testSub?.score >= 70) ? 'rgba(16,185,129,0.2)' : (t.testSub?.score >= 50) ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)', color: (t.testSub?.score >= 70) ? '#34d399' : (t.testSub?.score >= 50) ? '#60a5fa' : '#f87171', border: `1px solid ${(t.testSub?.score >= 70) ? 'rgba(52,211,153,0.35)' : (t.testSub?.score >= 50) ? 'rgba(96,165,250,0.35)' : 'rgba(248,113,113,0.35)'}` }}>
                                                        %{t.testSub?.score ?? 0} Başarı
                                                      </span>
                                                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.15rem' }}>
                                                        <strong style={{ color: '#34d399' }}>{t.testSub?.correctCount ?? 0}D</strong> • <strong style={{ color: '#f87171' }}>{t.testSub?.wrongCount ?? 0}Y</strong> • <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{t.testSub?.emptyCount ?? 0}B</strong>
                                                      </div>
                                                    </div>

                                                    <button
                                                      onClick={() => navigate(`/review/${t.testSub.id}`)}
                                                      style={{ background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.3)', padding: '0.3rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                      title="Bu testin optik ve cevap detaylarını incele"
                                                    >
                                                      <Eye size={12} /> İncele
                                                    </button>

                                                    <button
                                                      onClick={() => handleResetSingleBookTestForStudent(hw, item.student.id, t.id, t.testDef?.name, item.student.name, t.testSub?.id)}
                                                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.3rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                      title="Sadece bu testin yanıtını sıfırla"
                                                    >
                                                      <RotateCcw size={11} /> Sıfırla
                                                    </button>
                                                  </>
                                                ) : t.isDraft ? (
                                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.45rem', background: 'rgba(245,158,11,0.2)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.35)' }}>
                                                    🔄 Devam Ediyor
                                                  </span>
                                                ) : (
                                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.45rem', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                                    ⏳ Çözülmedi
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {filteredHwTests.length === 0 && (
                                          <div style={{ textAlign: 'center', padding: '1.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
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
                              <p style={{ fontSize: '0.88rem', margin: 0, color: 'rgba(255,255,255,0.6)' }}>Bu ödev için atanmış öğrenci bulunamadı.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', border: '1.5px dashed rgba(255,255,255,0.15)' }}>
                <CheckSquare size={48} style={{ color: 'rgba(255,255,255,0.25)', margin: '0 auto 1rem auto' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffffff', fontSize: '1.2rem', fontWeight: 900 }}>Henüz Ödev Atanmamış</h4>
                <p style={{ fontSize: '0.92rem', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.65)' }}>
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
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ListX size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#ffffff' }}>Yanlış Analizi</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>Kitaptaki hatalı cevapların detaylı dökümü.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {studentOptions.length > 0 && (
                <select 
                  value={mistakeFilterStudent} 
                  onChange={e => setMistakeFilterStudent(e.target.value)} 
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid rgba(165,180,252,0.3)', background: 'rgba(15,23,42,0.9)', color: '#c7d2fe', fontWeight: 800, minWidth: 160, fontSize: '0.85rem' }}
                >
                  <option value="all">👤 Tüm Öğrenciler ({studentOptions.length})</option>
                  {studentOptions.map(st => <option key={st.id} value={st.id}>👤 {st.name}</option>)}
                </select>
              )}
              {subjectOptions.length > 0 && (
                <select 
                  value={mistakeFilterSubject} 
                  onChange={e => setMistakeFilterSubject(e.target.value)} 
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(15,23,42,0.9)', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <option value="all">Tüm Dersler</option>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <select 
                value={mistakeFilterTopic} 
                onChange={e => setMistakeFilterTopic(e.target.value)} 
                disabled={mistakeFilterSubject === 'all' && topicOptions.length === 0} 
                style={{ padding: '0.55rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(15,23,42,0.9)', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}
              >
                <option value="all">Tüm Konular</option>
                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {Object.keys(mistakeList).length > 0 && (
                <button 
                  onClick={handleDownloadMistakes}
                  style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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
                  <tr style={{ borderBottom: '1.5px solid rgba(255,255,255,0.12)' }}>
                    <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Ders</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Konu</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Test</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Hatalı Sorular</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800 }}>Öğrenci</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 800, textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMistakes.map((mistake, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 800 }}>{mistake.subjectName}</span></td>
                      <td style={{ padding: '1rem', color: '#ffffff', fontWeight: 700 }}>{mistake.topicName}</td>
                      <td style={{ padding: '1rem', fontSize: '0.92rem', color: '#a5b4fc', fontWeight: 800 }}>{mistake.testDef.name}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {mistake.questionData.map((q, idx) => (
                            <span key={idx} style={{ color: q.isBlank ? 'rgba(255,255,255,0.5)' : '#f87171', background: q.isBlank ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.18)', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontSize: '0.82rem', fontWeight: 800 }}>
                              S.{q.num}{idx < mistake.questionData.length - 1 ? '' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                        👤 {mistake.studentName || mistake.submission.studentName || 'Öğrenci'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleResetMistakeSubmission(mistake)}
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.3rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
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
            <div style={{ textAlign: 'center', padding: '4.5rem 2rem', color: 'rgba(255,255,255,0.5)' }}>
              <CheckCircle size={48} style={{ opacity: 0.35, margin: '0 auto 1rem auto', color: '#34d399' }} />
              <p style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700 }}>Yanlış soru bulunamadı. Öğrencileriniz harika iş çıkarıyor!</p>
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR SELECTED TESTS */}
      {selectedTests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '0.85rem 1.75rem', borderRadius: '3rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: '0 12px 36px rgba(99,102,241,0.5)', border: '1.5px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(16px)' }}>
          <span style={{ fontWeight: 900, fontSize: '1rem' }}>{selectedTests.length} Test Seçildi</span>
          <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.3)' }} />
          <button onClick={handleOpenAssignModal} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
            Ata <Send size={16} />
          </button>
          <button onClick={() => setSelectedTests([])} style={{ background: 'rgba(0,0,0,0.25)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.35rem', cursor: 'pointer', display: 'flex' }}>
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* ── ⚡ UNIFIED BULK IMPORT WIZARD ── */}
      {isBulkWizardOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem', fontWeight: 900 }}>
                <Zap size={22} style={{ color: '#818cf8' }} /> Toplu İçerik &amp; Test Sihirbazı
              </h3>
              <button onClick={() => setIsBulkWizardOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <XCircle size={22} />
              </button>
            </div>

            {/* Wizard Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.3)', padding: '0.35rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setBulkWizardTab("text")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "text" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: bulkWizardTab === "text" ? '#ffffff' : 'rgba(255,255,255,0.6)',
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
                  color: bulkWizardTab === "series" ? '#ffffff' : 'rgba(255,255,255,0.6)',
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
                  color: bulkWizardTab === "json" ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  boxShadow: bulkWizardTab === "json" ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}
              >
                📄 JSON Aktar
              </button>
            </div>

            {/* TAB 1: TEXT LIST IMPORT */}
            {bulkWizardTab === "text" && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>
                  Aşağıdaki alana metin listesini yapıştırabilirsiniz. Sistem yapıyı ve cevap anahtarlarını otomatik algılar:
                </p>
                <div style={{ background: 'rgba(99,102,241,0.12)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid rgba(165,180,252,0.25)', fontSize: '0.82rem', color: '#c7d2fe', marginBottom: '1rem' }}>
                  <strong style={{ color: '#ffffff' }}>Örnek Satırlar:</strong><br />
                  • <code>Matematik &gt; Çarpanlar ve Katlar &gt; Test 1 : ABCDEABCDE</code><br />
                  • <code>Türkçe &gt; Test 1 [ABCDEABCDE]</code><br />
                  • <code>Paragraf (5 Test)</code>
                </div>

                <textarea
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  placeholder={`Matematik > Üslü Sayılar > Test 1 : ABCDEABCDEAB\nMatematik > Üslü Sayılar > Test 2 [ABCDEABCDEAB]\nTürkçe > Test 1 : BACDEBACDE`}
                  rows={8}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.4)', color: '#ffffff', fontFamily: 'monospace', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />

                {/* Live Preview */}
                {parsedBulkStructure.totalTests > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(16,185,129,0.12)', borderRadius: '0.75rem', border: '1px solid rgba(52,211,153,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>Önizleme Algılandı:</strong>
                      <div style={{ fontSize: '0.82rem', color: '#a7f3d0', marginTop: '0.2rem' }}>
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
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Hedef Ders Adı</label>
                  <input
                    type="text"
                    value={bulkSeriesData.subjectName}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, subjectName: e.target.value }))}
                    placeholder="Örn: Matematik, Fizik..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
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
                  <label htmlFor="isDirectSubj" style={{ fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', color: '#ffffff' }}>
                    Konusuz - Testleri doğrudan derse ekle
                  </label>
                </div>

                {!bulkSeriesData.isDirectSubject && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Hedef Konu Adı (İsteğe Bağlı)</label>
                    <input
                      type="text"
                      value={bulkSeriesData.topicName}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, topicName: e.target.value }))}
                      placeholder="Örn: Çarpanlar ve Katlar"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}>Test Ön Eki</label>
                    <input
                      type="text"
                      value={bulkSeriesData.prefix}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, prefix: e.target.value }))}
                      placeholder="Test"
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}>Test Sayısı</label>
                    <input
                      type="number"
                      value={bulkSeriesData.testCount}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, testCount: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}>Soru Sayısı/Test</label>
                    <input
                      type="number"
                      value={bulkSeriesData.questionCount}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, questionCount: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#34d399' }}>
                    🔑 Toplu Cevap Anahtarı (İsteğe Bağlı - Örn: ABCDEABCDE...)
                  </label>
                  <input
                    type="text"
                    value={bulkSeriesData.rawAnswerKey || ''}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, rawAnswerKey: e.target.value.toUpperCase() }))}
                    placeholder="Örn: ABCDEABCDEABCDEABCDE"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1.5px solid rgba(52,211,153,0.4)', background: 'rgba(0,0,0,0.4)', color: '#ffffff', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.08em', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button onClick={handleExecuteBulkSeries} style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.65rem', color: 'white', cursor: 'pointer' }}>
                    {bulkSeriesData.testCount} Testi Otomatik Oluştur
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: JSON IMPORT */}
            {bulkWizardTab === "json" && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>
                  Ders, konu ve testlerinizi içeren JSON formatındaki yapıyı buraya yapıştırabilirsiniz.
                </p>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{\n  "subjects": [\n    {\n      "name": "Matematik",\n      "topics": [\n        { "name": "Üslü İfadeler", "tests": [{ "name": "Test 1", "questionCount": 12, "answerKey": ["A","B","C","D","E"] }] }\n      ]\n    }\n  ]\n}`}
                  rows={8}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.4)', color: '#ffffff', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button onClick={handleExecuteJsonImport} style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '0.65rem', color: 'white', cursor: 'pointer' }}>
                    JSON İçe Aktar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBJECT MODAL ── */}
      {isSubjectDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '420px', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <h3 style={{ marginTop: 0, color: '#ffffff', fontSize: '1.25rem', fontWeight: 900 }}>{currentSubject ? '✏️ Dersi Düzenle' : '➕ Yeni Ders Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.25rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Ders Adı</label>
              <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Matematik, Fizik..." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box', fontSize: '0.95rem' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={() => setIsSubjectDialogOpen(false)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSubjectSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', fontWeight: 900, border: 'none', padding: '0.65rem 1.25rem', borderRadius: '0.5rem' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOPIC MODAL ── */}
      {isTopicDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '420px', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <h3 style={{ marginTop: 0, color: '#ffffff', fontSize: '1.25rem', fontWeight: 900 }}>{currentTopic ? '✏️ Konuyu Düzenle' : '➕ Yeni Konu Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.25rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Konu Adı</label>
              <input type="text" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Üslü Sayılar, Dinamik..." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box', fontSize: '0.95rem' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTopicDialogOpen(false)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleTopicSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', fontWeight: 900, border: 'none', padding: '0.65rem 1.25rem', borderRadius: '0.5rem' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEST MODAL ── */}
      {isTestDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.25rem', fontWeight: 900 }}>
                {currentTest ? `✏️ Testi Düzenle: ${currentTest.name}` : '➕ Yeni Test Ekle'}
              </h3>
              <button onClick={() => setIsTestDialogOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Test Adı</label>
              <input 
                type="text" 
                value={testFormData.name} 
                onChange={e => setTestFormData(p => ({...p, name: e.target.value}))} 
                placeholder="Örn: Test 1, Kazanım Testi 1..." 
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', boxSizing: 'border-box' }} 
                autoFocus 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Soru Sayısı</label>
              <input 
                type="number" 
                min="1"
                max="100"
                value={testFormData.questionCount} 
                onChange={e => setTestFormData(p => ({...p, questionCount: parseInt(e.target.value) || 0}))} 
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', boxSizing: 'border-box' }} 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={testFormData.pdfUrl || ''}
                onChange={e => setTestFormData(p => ({...p, pdfUrl: e.target.value}))}
                placeholder="https://drive.google.com/... veya PDF URL"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>

            {book.bookType !== 'open_ended' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>
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
                    style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem', borderRadius: '0.5rem', border: '1.5px solid rgba(165,180,252,0.3)', background: 'rgba(0,0,0,0.4)', color: '#ffffff', width: '160px', fontWeight: 800 }}
                  />
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {Array.from({ length: testFormData.questionCount || 0 }).map((_, i) => {
                    const qNum = i + 1;
                    const val = testFormData.answerKey?.[qNum] || '';
                    const optList = book.optionCount === 4 ? ['A','B','C','D'] : ['A','B','C','D','E'];
                    return (
                      <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ width: '22px', fontWeight: 800, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{qNum}.</div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {optList.map(opt => {
                            const isSelected = val === opt;
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setTestFormData(p => ({ ...p, answerKey: { ...p.answerKey, [qNum]: opt } }))}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%', border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                  background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)',
                                  color: isSelected ? 'white' : 'rgba(255,255,255,0.8)', cursor: 'pointer', fontWeight: 900, fontSize: '0.72rem',
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
                    <span style={{ fontSize: '0.8rem', gridColumn: '1 / -1', textAlign: 'center', padding: '1rem 0', color: 'rgba(255,255,255,0.5)' }}>Önce soru sayısı girin.</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTestDialogOpen(false)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleTestSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '0.65rem 1.4rem', fontWeight: 900, border: 'none', borderRadius: '0.5rem' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🏫 ADVANCED ASSIGN HOMEWORK MODAL ── */}
      {isAssignDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '560px', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 900 }}>
                <Send size={20} style={{ color: '#818cf8' }} /> Ödev Ata ({selectedTests.length} Test Seçildi)
              </h3>
              <button onClick={() => setIsAssignDialogOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <XCircle size={20} />
              </button>
            </div>

            {/* Custom Homework Title Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Ödev Başlığı</label>
              <input
                type="text"
                value={assignCustomTitle}
                onChange={(e) => setAssignCustomTitle(e.target.value)}
                placeholder="Örn: LGS Matematik 1. Dönem Ödevi"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, boxSizing: 'border-box' }}
              />
            </div>

            {/* Target Type Selector (Class vs Student) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Hedef Kitle Seçimi</label>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.35)', padding: '0.35rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => { setAssignTargetMode("class"); setAssignSelectedTargetIds([]); }}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.55rem', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem',
                    background: assignTargetMode === "class" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: assignTargetMode === "class" ? 'white' : 'rgba(255,255,255,0.6)',
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
                    color: assignTargetMode === "student" ? 'white' : 'rgba(255,255,255,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <Users size={16} /> 👤 Öğrenciye Özel
                </button>
              </div>
            </div>

            {/* Target Options Checklist */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>
                {assignTargetMode === "class" ? 'Hedef Sınıf(ları) Seçin:' : 'Hedef Öğrenci(leri) Seçin:'}
              </label>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '0.75rem', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                
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
                    <label key={cls.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isChecked ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', borderRadius: '0.55rem', border: `1px solid ${isChecked ? 'rgba(165,180,252,0.4)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleTargetId(cls.id)} 
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: '#6366f1', cursor: 'pointer' }} 
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>
                          🏫 {cls.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontWeight: 800 }}>
                        {classStudentsCount} Öğrenci
                      </span>
                    </label>
                  );
                })}

                {/* STUDENT LIST */}
                {assignTargetMode === "student" && students.map(st => {
                  const isChecked = assignSelectedTargetIds.includes(st.id);
                  return (
                    <label key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isChecked ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', borderRadius: '0.55rem', border: `1px solid ${isChecked ? 'rgba(165,180,252,0.4)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleTargetId(st.id)} 
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: '#6366f1', cursor: 'pointer' }} 
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>
                          👤 {st.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                        {st.grade || st.className || 'Öğrenci'}
                      </span>
                    </label>
                  );
                })}

                {assignTargetMode === "class" && availableClasses.length === 0 && (
                  <p style={{ padding: '1rem', textAlign: 'center', margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Tanımlı sınıf bulunamadı.</p>
                )}
                {assignTargetMode === "student" && students.length === 0 && (
                  <p style={{ padding: '1rem', textAlign: 'center', margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Tanımlı öğrenci bulunamadı.</p>
                )}
              </div>
            </div>

            {/* Due Date Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>
                Ödev / Bitirme Tarihi veya Süresi
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginBottom: '0.25rem' }}>Hazır Gün Seçin:</label>
                  <select
                    value={assignDueDateDays}
                    onChange={(e) => {
                      setAssignDueDateDays(parseInt(e.target.value) || 7);
                      setAssignExactDueDate("");
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontWeight: 800, boxSizing: 'border-box' }}
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
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginBottom: '0.25rem' }}>Veya Takvimden Seçin:</label>
                  <input
                    type="date"
                    value={assignExactDueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAssignExactDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              {assignExactDueDate ? (
                <p style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 800, marginTop: '0.45rem' }}>
                  🗓️ Seçilen Bitirme Tarihi: {new Date(assignExactDueDate).toLocaleDateString('tr-TR')}
                </p>
              ) : (
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.45rem' }}>
                  Hedef Bitirme Tarihi: {new Date(Date.now() + (assignDueDateDays || 7) * 86400000).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsAssignDialogOpen(false)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleAssignSelectedTestsSubmit} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '0.65rem 1.5rem', fontWeight: 900, border: 'none', borderRadius: '0.5rem' }}>
                Ödevi {assignTargetMode === 'class' ? 'Sınıfa' : 'Öğrenciye'} Ata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 📅 EDIT ASSIGNED HOMEWORK DUE DATE MODAL ── */}
      {editDateHw && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '480px', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 900 }}>
                <Calendar size={20} style={{ color: '#818cf8' }} /> Bitirme Tarihini Değiştir / Süre Uzat
              </h3>
              <button onClick={() => setEditDateHw(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.95rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#ffffff' }}>{editDateHw.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.25rem' }}>
                Mevcut Son Tarih: <strong style={{ color: '#c7d2fe' }}>{editDateHw.dueDate ? new Date(editDateHw.dueDate).toLocaleDateString('tr-TR') : 'Yok'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Yeni Bitirme Tarihi Seçin:</label>
              <input
                type="date"
                value={editDateValue}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEditDateValue(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', alignSelf: 'center', fontWeight: 800 }}>Hızlı Uzat:</span>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setEditDateValue(d.toISOString().split('T')[0]); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>+7 Gün</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 14); setEditDateValue(d.toISOString().split('T')[0]); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>+14 Gün</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 30); setEditDateValue(d.toISOString().split('T')[0]); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>+30 Gün (1 Ay)</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setEditDateHw(null)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
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
                style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.5rem' }}
              >
                Yeni Tarihi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🗓️ DETAILED PER-TEST SCHEDULER MODAL FOR ASSIGNED BOOK ── */}
      {scheduleModalHw && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '860px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.35rem', fontWeight: 900 }}>
                  <Clock size={24} style={{ color: '#38bdf8' }} /> İçerik Test Tarihlerini Planla
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem' }}>
                  <strong style={{ color: '#c7d2fe' }}>{scheduleModalHw.title}</strong> — Kitaptaki her test için tek tek bitirme tarihi belirleyin veya otomatik dağıtın.
                </p>
              </div>
              <button onClick={() => setScheduleModalHw(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="custom-scrollbar">
              
              {/* Quick Auto Distribute Box */}
              <div style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.18), rgba(14, 165, 233, 0.25))', padding: '1.15rem 1.35rem', borderRadius: '1rem', border: '1.5px solid rgba(56, 189, 248, 0.4)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={18} /> Otomatik Tarih Dağıtıcı (Hızlı Planlama)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c7d2fe', fontWeight: 800, marginBottom: '0.35rem' }}>Başlangıç Tarihi:</label>
                    <input
                      type="date"
                      value={autoStartDate}
                      onChange={(e) => setAutoStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid rgba(56,189,248,0.4)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c7d2fe', fontWeight: 800, marginBottom: '0.35rem' }}>Test Sıklığı (Aralık):</label>
                    <select
                      value={autoIntervalDays}
                      onChange={(e) => setAutoIntervalDays(Number(e.target.value))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid rgba(56,189,248,0.4)', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', boxSizing: 'border-box' }}
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
                              datesMap[t.id] = currDate.toISOString().split('T')[0];
                              testCounter++;
                            });
                            topicsList.forEach(topic => {
                              const topicTests = sortTestsNaturally(tests.filter(t => String(t.topicId) === String(topic.id)));
                              topicTests.forEach(t => {
                                if (testCounter > 0) currDate.setDate(currDate.getDate() + autoIntervalDays);
                                datesMap[t.id] = currDate.toISOString().split('T')[0];
                                testCounter++;
                              });
                            });
                          } else {
                            const subjTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id)));
                            subjTests.forEach(t => {
                              if (testCounter > 0) currDate.setDate(currDate.getDate() + autoIntervalDays);
                              datesMap[t.id] = currDate.toISOString().split('T')[0];
                              testCounter++;
                            });
                          }
                        });
                        setScheduleDates(datesMap);
                        showToast(`${testCounter} teste sırayla otomatik tarihler atandı! ✨`);
                      }}
                      style={{ width: '100%', padding: '0.65rem 1rem', fontWeight: 900, fontSize: '0.88rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', border: 'none', borderRadius: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }}
                    >
                      <Zap size={16} /> Otomatik Tarihleri Dağıt
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky/Top Bulk Date Action Bar */}
              {scheduleSelectedTestIds.length > 0 && (
                <div style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1.5px solid rgba(165, 180, 252, 0.4)', padding: '0.95rem 1.35rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
                  <div style={{ fontWeight: 900, color: '#c7d2fe', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} style={{ color: '#818cf8' }} /> {scheduleSelectedTestIds.length} Test Seçildi
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>Toplu Tarih Seçin:</label>
                    <input
                      type="date"
                      value={bulkApplyDate}
                      onChange={(e) => setBulkApplyDate(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '0.55rem', border: '1.5px solid rgba(165,180,252,0.4)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!bulkApplyDate) {
                          showToast('Lütfen önce bir tarih seçiniz!', 'error');
                          return;
                        }
                        setScheduleDates(prev => {
                          const updated = { ...prev };
                          scheduleSelectedTestIds.forEach(tId => {
                            updated[tId] = bulkApplyDate;
                          });
                          return updated;
                        });
                        showToast(`${scheduleSelectedTestIds.length} teste seçilen tarih başarıyla uygulandı! ✅`);
                      }}
                      style={{ padding: '0.55rem 1.15rem', fontWeight: 900, fontSize: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '0.55rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
                    >
                      Seçilenlere Uygula
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleSelectedTestIds([])}
                      style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '0.55rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
                    >
                      Seçimi Temizle
                    </button>
                  </div>
                </div>
              )}

              {/* Per-Test Date Settings List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid rgba(255,255,255,0.1)', paddingBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 900 }}>
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
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
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
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', fontWeight: 800, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
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
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontWeight: 900, borderRadius: '0.5rem', background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.3)', cursor: 'pointer' }}
                    >
                      {scheduleSelectedTestIds.length === tests.length ? '✅ Tüm Kitabı Kaldır' : '☑️ Tüm Kitabı Seç'}
                    </button>
                  </div>
                </div>

                {book.subjects?.map(subj => {
                  const allSubjTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id)));
                  if (allSubjTests.length === 0) return null;

                  const directTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id) && (!t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subj.id))));
                  const topicsList = subj.topics || [];
                  const allSubjSelected = allSubjTests.every(t => scheduleSelectedTestIds.includes(t.id));
                  const isExpanded = !scheduleCollapsedSubj[subj.id];

                  return (
                    <div key={subj.id} style={{ border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                      {/* Subject Header (Collapsible) */}
                      <div style={{ background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.15rem', cursor: 'pointer', borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div 
                          onClick={() => setScheduleCollapsedSubj(p => ({ ...p, [subj.id]: !p[subj.id] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}
                        >
                          {isExpanded ? <ChevronDown size={20} style={{ color: '#818cf8' }} /> : <ChevronRight size={20} style={{ color: '#818cf8' }} />}
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 900 }}>
                            <Layers size={18} style={{ color: '#a5b4fc' }} /> {subj.name}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: '#c7d2fe', background: 'rgba(99,102,241,0.25)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 800, marginLeft: '0.5rem', border: '1px solid rgba(165,180,252,0.3)' }}>
                            {topicsList.length > 0 ? `${topicsList.length} Ünite / Konu • ` : ''}{allSubjTests.length} Test
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
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '0.5rem', cursor: 'pointer' }}
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
                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '0.75rem', border: '1px solid rgba(165, 180, 252, 0.2)' }}>
                              <h5 style={{ margin: '0 0 0.65rem 0', fontSize: '0.9rem', color: '#a5b4fc', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <FileText size={15} /> Direkt Testler ({directTests.length})
                              </h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.65rem' }}>
                                {directTests.map(t => {
                                  const testVal = scheduleDates[t.id] || '';
                                  const isSelected = scheduleSelectedTestIds.includes(t.id);
                                  return (
                                    <div key={t.id} style={{ background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: `1px solid ${isSelected ? 'rgba(165,180,252,0.45)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => setScheduleSelectedTestIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                        style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                      />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>{t.questionCount || 20} Soru</div>
                                      </div>
                                      <input
                                        type="date"
                                        value={testVal}
                                        onChange={e => setScheduleDates(p => ({ ...p, [t.id]: e.target.value }))}
                                        style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.45rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.45)', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 800 }}
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
                              const topicTests = sortTestsNaturally(tests.filter(t => String(t.topicId) === String(topic.id)));
                              if (topicTests.length === 0) return null;

                              const isTopicExpanded = !scheduleCollapsedTopic[topic.id];
                              const allTopicSelected = topicTests.every(t => scheduleSelectedTestIds.includes(t.id));

                              return (
                                <div key={topic.id} style={{ borderLeft: '3.5px solid #818cf8', paddingLeft: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                  
                                  {/* Topic Header (Collapsible) */}
                                  <div 
                                    style={{ padding: '0.75rem 0.95rem', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isTopicExpanded ? '1px solid rgba(255,255,255,0.08)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}
                                    onClick={() => setScheduleCollapsedTopic(p => ({ ...p, [topic.id]: !p[topic.id] }))}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                      {isTopicExpanded ? <ChevronDown size={16} style={{ color: '#c7d2fe' }} /> : <ChevronRight size={16} style={{ color: '#c7d2fe' }} />}
                                      <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <FileText size={15} style={{ color: '#a855f7' }} /> {topic.name}
                                      </h5>
                                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontWeight: 800 }}>
                                        {topicTests.length} Test
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
                                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.45rem', cursor: 'pointer' }}
                                    >
                                      {allTopicSelected ? '✅ Üniteyi Kaldır' : '☑️ Üniteyi Seç'}
                                    </button>
                                  </div>

                                  {/* Topic Tests Grid (Expanded Only) */}
                                  {isTopicExpanded && (
                                    <div style={{ padding: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.65rem' }}>
                                      {topicTests.map(t => {
                                        const testVal = scheduleDates[t.id] || '';
                                        const isSelected = scheduleSelectedTestIds.includes(t.id);

                                        return (
                                          <div key={t.id} style={{ background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.03)', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: `1px solid ${isSelected ? 'rgba(165,180,252,0.45)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', transition: 'all 0.15s' }}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => {
                                                setScheduleSelectedTestIds(prev =>
                                                  prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                                );
                                              }}
                                              style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                            />
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.name}
                                              </div>
                                              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                                                {t.questionCount || 20} Soru
                                              </div>
                                            </div>
                                            <input
                                              type="date"
                                              value={testVal}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                setScheduleDates(p => ({ ...p, [t.id]: v }));
                                              }}
                                              style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.45rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.45)', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 800 }}
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.65rem' }}>
                              {allSubjTests.map(t => {
                                const testVal = scheduleDates[t.id] || '';
                                const isSelected = scheduleSelectedTestIds.includes(t.id);

                                return (
                                  <div key={t.id} style={{ background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.03)', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: `1px solid ${isSelected ? 'rgba(165,180,252,0.45)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', transition: 'all 0.15s' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setScheduleSelectedTestIds(prev =>
                                          prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                        );
                                      }}
                                      style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {t.name}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {t.questionCount || 20} Soru
                                      </div>
                                    </div>
                                    <input
                                      type="date"
                                      value={testVal}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setScheduleDates(p => ({ ...p, [t.id]: v }));
                                      }}
                                      style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.45rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.45)', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 800 }}
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
            <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={() => setScheduleModalHw(null)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (typeof updateHomework === 'function') {
                    await updateHomework(scheduleModalHw.id, {
                      testDueDates: scheduleDates
                    });
                  }
                  showToast('Test bazlı bitirme tarihleri başarıyla kaydedildi! 🎉');
                  setScheduleModalHw(null);
                }}
                style={{ padding: '0.65rem 1.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }}
              >
                Tüm Test Tarihlerini Kaydet
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── BOOK SETTINGS MODAL ── */}
      {isBookSettingsDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 18, 0.85)', backdropFilter: 'blur(16px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '520px', padding: '1.75rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff' }}>
            <h2 style={{ color: '#ffffff', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.35rem', fontWeight: 900 }}>
              <Settings style={{ color: '#818cf8' }} /> Kitap Ayarlarını Düzenle
            </h2>
            <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>Kitap başlığı, yayınevi, seviye ve optik seçenek sayısını güncelleyin.</p>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: '#ffffff' }}>Kitap Adı</label>
              <input
                type="text"
                value={bookSettingsForm.title}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, title: e.target.value })}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: '#ffffff' }}>Yayınevi</label>
              <input
                type="text"
                value={bookSettingsForm.publisher}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, publisher: e.target.value })}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: '#ffffff' }}>Optik Form Seçenek Sayısı (Seviye)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.optionCount === 4 ? '#34d399' : 'rgba(255,255,255,0.12)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.optionCount === 4 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)' }}>
                  <input
                    type="radio"
                    name="bookSettingOptionCount"
                    value={4}
                    checked={bookSettingsForm.optionCount === 4}
                    onChange={() => setBookSettingsForm({ ...bookSettingsForm, optionCount: 4 })}
                    style={{ accentColor: '#10b981' }}
                  />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#ffffff' }}>4 Şık (A-D)</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Ortaokul / LGS</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${bookSettingsForm.optionCount === 5 ? '#c084fc' : 'rgba(255,255,255,0.12)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: bookSettingsForm.optionCount === 5 ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)' }}>
                  <input
                    type="radio"
                    name="bookSettingOptionCount"
                    value={5}
                    checked={bookSettingsForm.optionCount === 5}
                    onChange={() => setBookSettingsForm({ ...bookSettingsForm, optionCount: 5 })}
                    style={{ accentColor: '#8b5cf6' }}
                  />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#ffffff' }}>5 Şık (A-E)</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Lise / YKS</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.88rem', color: '#ffffff' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={bookSettingsForm.pdfUrl || ''}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, pdfUrl: e.target.value })}
                placeholder="https://drive.google.com/... veya direkt PDF URL"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsBookSettingsDialogOpen(false)} style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  updateTrackedBook(book.id, bookSettingsForm);
                  setIsBookSettingsDialogOpen(false);
                  showToast("Kitap ayarları başarıyla güncellendi.");
                }}
                style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.5rem' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
