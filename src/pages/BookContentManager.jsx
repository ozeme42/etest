import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { 
  ArrowLeft, BookMarked, Layers, FileText, CheckCircle, 
  ChevronDown, ChevronRight, Plus, Edit, Trash2, 
  ListX, Send, XCircle, FileOutput, Filter, AlertTriangle, FileJson, CheckSquare, Zap,
  Users, GraduationCap, Clock, Calendar, Award, BarChart2, Check, BookOpen, Settings
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

export default function BookContentManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books, bookTests, updateTrackedBook, deleteTrackedBookTest, addTrackedBookTest, updateTrackedBookTest } = useTrackedBooks();
  const { submissions, deleteSubmissionsByTestId } = useEvaluation();
  const { homeworks: allHomeworks, addHomework, updateHomework, deleteHomework } = useHomework();
  const [editDateHw, setEditDateHw] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [scheduleModalHw, setScheduleModalHw] = useState(null);
  const [scheduleDates, setScheduleDates] = useState({});
  const [autoStartDate, setAutoStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoIntervalDays, setAutoIntervalDays] = useState(2);
  const [scheduleSelectedTestIds, setScheduleSelectedTestIds] = useState([]);
  const [bulkApplyDate, setBulkApplyDate] = useState('');
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
  const [testFormData, setTestFormData] = useState({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' });
  
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
  const [assignTargetMode, setAssignTargetMode] = useState("class"); // "class" | "student"
  const [assignSelectedTargetIds, setAssignSelectedTargetIds] = useState([]);
  const [assignCustomTitle, setAssignCustomTitle] = useState("");
  const [assignAsBook, setAssignAsBook] = useState(false);
  const [assignDueDateDays, setAssignDueDateDays] = useState(7);
  const [assignExactDueDate, setAssignExactDueDate] = useState("");

  // Mistake Filter States
  const [mistakeFilterSubject, setMistakeFilterSubject] = useState("all");
  const [mistakeFilterTopic, setMistakeFilterTopic] = useState("all");

  const showToast = (msg, type = 'success') => {
    alert(`${type === 'success' ? '✅' : '❌'} ${msg}`);
  };

  // --- BOOK ASSIGNED HOMEWORKS ---
  const bookHomeworks = useMemo(() => {
    return (allHomeworks || []).filter(hw => {
      if (hw.bookId === id || hw.sourceType === 'trackedBook') return true;
      if (hw.tests && Array.isArray(hw.tests)) {
        return hw.tests.some(tId => tests.some(t => t.id === tId));
      }
      return false;
    });
  }, [allHomeworks, id, tests]);

  // Homework Analytics
  const homeworkAnalytics = useMemo(() => {
    let totalAssigned = bookHomeworks.length;
    let totalTargetStudents = 0;
    let completedCount = 0;

    bookHomeworks.forEach(hw => {
      let hwStudents = [];
      if (hw.targetType === 'grade' || hw.targetType === 'class') {
        hwStudents = students.filter(s => (hw.targetIds || []).some(tid => s.gradeId === tid || s.grade === tid || s.className === tid));
      } else {
        hwStudents = students.filter(s => (hw.targetIds || []).some(tid => s.id === tid));
      }
      totalTargetStudents += hwStudents.length;

      let hwTests = hw.tests || [];
      if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
        hwTests = tests.map(t => t.id);
      }

      hwStudents.forEach(st => {
        const solved = submissions.filter(s => s.studentId === st.id && hwTests.includes(s.testId) && s.status === 'completed');
        if (solved.length >= hwTests.length && hwTests.length > 0) completedCount++;
      });
    });

    const completionRate = totalTargetStudents > 0 ? Math.round((completedCount / totalTargetStudents) * 100) : 0;
    return { totalAssigned, totalTargetStudents, completedCount, completionRate };
  }, [bookHomeworks, students, submissions]);

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
    const solvedSubmissions = submissions.filter(s => tests.some(t => t.id === s.testId) && s.status === 'completed');

    for (const sub of solvedSubmissions) {
      const testDef = tests.find(t => t.id === sub.testId);
      if (!testDef) continue;
      
      const subject = book?.subjects?.find(s => String(s.id) === String(testDef.subjectId));
      const topic = subject?.topics?.find(t => String(t.id) === String(testDef.topicId));

      const subjName = subject?.name || 'Genel';
      const topName = topic?.name || 'Direkt Testler';

      sub.answers.forEach(ans => {
        if (!ans.isCorrect) {
          const isBlank = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
          if (!mistakesBySubject[subjName]) mistakesBySubject[subjName] = {};
          if (!mistakesBySubject[subjName][topName]) mistakesBySubject[subjName][topName] = [];
          
          mistakesBySubject[subjName][topName].push({ 
            submission: sub, 
            testDef, 
            questionNumber: ans.questionId,
            isBlank
          });
        }
      });
    }
    return mistakesBySubject;
  }, [submissions, tests, book]);

  const { filteredMistakes, subjectOptions, topicOptions } = useMemo(() => {
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
        return true;
    });

    const grouped = [];
    const map = new Map();
    filtered.forEach(m => {
        const key = `${m.submission.studentId}_${m.testDef.id}`;
        if (!map.has(key)) {
            map.set(key, {
                subjectName: m.subjectName,
                topicName: m.topicName,
                testDef: m.testDef,
                submission: m.submission,
                questionData: [{ num: parseInt(m.questionNumber), isBlank: m.isBlank }]
            });
            grouped.push(map.get(key));
        } else {
            if (!map.get(key).questionData.find(q => q.num === parseInt(m.questionNumber))) {
                map.get(key).questionData.push({ num: parseInt(m.questionNumber), isBlank: m.isBlank });
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

    return { filteredMistakes: grouped, subjectOptions: subjects, topicOptions: topics };
  }, [mistakeList, mistakeFilterSubject, mistakeFilterTopic]);

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

  const handleTestSave = async () => {
    if (!book || !currentSubject || !testFormData.name.trim()) return;
    
    const testPayload = {
      subjectId: String(currentSubject.id),
      topicId: currentTopic ? String(currentTopic.id) : null,
      name: testFormData.name,
      questionCount: testFormData.questionCount || 20,
      pdfUrl: testFormData.pdfUrl || '',
    };
    
    if (book.bookType !== 'open_ended') testPayload.answerKey = testFormData.answerKey;

    if (currentTest) updateTrackedBookTest(currentTest.id, testPayload);
    else addTrackedBookTest(book.id, testPayload);
    
    setIsTestDialogOpen(false);
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

  if (!book) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Yükleniyor...</div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem', paddingBottom: selectedTests.length > 0 ? '6rem' : '2rem' }}>
      
      {/* HEADER */}
      <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/books')} style={{ padding: '0.5rem', border: 'none', background: 'transparent' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: 'white', padding: '1rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-primary)' }}>{book.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>İçerik & Ödev Takip Yönetimi - {book.publisher}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 99, border: '1px solid #c7d2fe' }}>
                {book.optionCount === 4 ? '🎯 4 Seçenekli Optik (Ortaokul A-D)' : '🎯 5 Seçenekli Optik (Lise A-E)'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => { setBookSettingsForm({ title: book.title, publisher: book.publisher, optionCount: book.optionCount || 5, pdfUrl: book.pdfUrl || '' }); setIsBookSettingsDialogOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <Settings size={18} /> Kitap Ayarları
          </button>
          <button className="btn btn-secondary" onClick={handleAssignEntireBook} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <BookOpen size={18} /> Tüm Kitabı Ata
          </button>
          <button className="btn btn-secondary" onClick={() => setIsBulkWizardOpen(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <Zap size={18} /> Toplu Ekle & Yapılandır
          </button>
          <button className="btn btn-primary" onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }}>
            <Plus size={18} /> Ders Ekle
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab("contents")}
          style={{ 
            background: 'transparent', border: 'none', padding: '0.5rem 1rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: activeTab === "contents" ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: activeTab === "contents" ? '3px solid var(--color-primary)' : '3px solid transparent'
          }}
        >
          <BookOpen size={18} /> İçindekiler Yapısı
        </button>

        <button 
          onClick={() => setActiveTab("homeworks")}
          style={{ 
            background: 'transparent', border: 'none', padding: '0.5rem 1rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: activeTab === "homeworks" ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: activeTab === "homeworks" ? '3px solid var(--color-primary)' : '3px solid transparent'
          }}
        >
          <CheckSquare size={18} /> Atanan Ödevler & İlerleme
          {bookHomeworks.length > 0 && (
            <span style={{ background: '#6366f1', color: 'white', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 900 }}>
              {bookHomeworks.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("mistakes")}
          style={{ 
            background: 'transparent', border: 'none', padding: '0.5rem 1rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: activeTab === "mistakes" ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: activeTab === "mistakes" ? '3px solid var(--color-primary)' : '3px solid transparent'
          }}
        >
          <ListX size={18} /> Yanlış Analizi 
          {Object.keys(mistakeList).length > 0 && (
            <span style={{ background: 'var(--color-error)', color: 'white', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 900 }}>
              {Object.values(mistakeList).flatMap(Object.values).flat().length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: CONTENTS TAB ── */}
      {activeTab === "contents" && (
        <div className="card glass" style={{ padding: '2rem' }}>
          {book.subjects && book.subjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {book.subjects.map(subject => {
                const directTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subject.id) && (!t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subject.id))));
                const topicsList = subject.topics || [];
                const isExpanded = !collapsedSubjects[subject.id];

                return (
                  <div key={subject.id} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
                    
                    {/* Subject Header */}
                    <div style={{ background: 'rgba(124, 58, 237, 0.05)', display: 'flex', alignItems: 'center', borderBottom: isExpanded ? '1px solid rgba(0,0,0,0.1)' : 'none' }}>
                      <div 
                        onClick={() => toggleSubject(subject.id)}
                        style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', flexGrow: 1, cursor: 'pointer' }}
                      >
                        {isExpanded ? <ChevronDown size={20} style={{ marginRight: '0.5rem', color: 'var(--color-primary)' }} /> : <ChevronRight size={20} style={{ marginRight: '0.5rem', color: 'var(--color-primary)' }} />}
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={18} /> {subject.name}
                        </h3>
                        <span className="text-muted" style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
                          {topicsList.length > 0 ? `${topicsList.length} Konu` : ''} 
                          {directTests.length > 0 ? `${topicsList.length > 0 ? ' • ' : ''}${directTests.length} Direkt Test` : ''}
                          {topicsList.length === 0 && directTests.length === 0 ? 'İçerik Yok' : ''}
                        </span>
                      </div>
                      <div style={{ padding: '0 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleAssignSubject(subject); }} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-primary)' }} title="Tüm Dersi Ödev Olarak Ata"><BookOpen size={16} /></button>
                        <button onClick={() => { setCurrentSubject(subject); setNewSubjectName(subject.name); setIsSubjectDialogOpen(true); }} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }}><Edit size={16} /></button>
                        <button onClick={() => handleDeleteSubject(subject.id)} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                      </div>
                    </div>

                    {/* Expanded Subject Content */}
                    {isExpanded && (
                      <div style={{ padding: '1rem' }}>

                        {/* Direct Tests (when Ders > Test structure) */}
                        {directTests.length > 0 && (
                          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.03)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#4f46e5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <FileText size={16} /> Direkt Testler ({directTests.length})
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                              {directTests.map(test => (
                                <div key={test.id} className="card" style={{ padding: '0.75rem 1rem', background: 'white', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedTests.includes(test.id)} 
                                      onChange={() => toggleTestSelection(test.id)}
                                      style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                    />
                                    <div>
                                      <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{test.name}</h5>
                                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {test.questionCount} Soru
                                        {test.answerKey && Object.keys(test.answerKey).length > 0 && (
                                          <span style={{ marginLeft: '0.5rem', color: '#059669', fontWeight: 700 }}>• Cevap Anahtarlı ({Object.keys(test.answerKey).length})</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: '#4f46e5' }} onClick={() => handleAssignSingleTest(test)} title="Bu Teste Bitirme Tarihi / Ödev Ata">
                                      <Calendar size={14} />
                                    </button>
                                    <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setCurrentTest(test); setTestFormData({ name: test.name, questionCount: test.questionCount, answerKey: test.answerKey || {}, pdfUrl: test.pdfUrl || '' }); setIsTestDialogOpen(true); }}>
                                      <Edit size={14} />
                                    </button>
                                    <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
                                      <Trash2 size={14} />
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
                            <div key={topic.id} style={{ borderLeft: '3px solid var(--color-primary-light)', margin: '0.5rem 0.5rem 1.25rem 0.5rem', paddingLeft: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div 
                                  onClick={() => toggleTopic(topic.id)}
                                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexGrow: 1 }}
                                >
                                  {isTopicExpanded ? <ChevronDown size={16} style={{ marginRight: '0.5rem' }} /> : <ChevronRight size={16} style={{ marginRight: '0.5rem' }} />}
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={16} style={{ color: 'var(--color-secondary)' }} /> {topic.name}
                                  </h4>
                                  <span style={{ marginLeft: '1rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>{topicTests.length} Test</span>
                                </div>
                                <button onClick={() => handleAssignTopic(topic)} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: '#4f46e5' }} title="Bu Konudaki Testlere Bitirme Tarihi / Ödev Ata"><Calendar size={15} /></button>
                                <button onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setNewTopicName(topic.name); setIsTopicDialogOpen(true); }} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }}><Edit size={14} /></button>
                                <button onClick={() => handleDeleteTopic(subject.id, topic.id)} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                              </div>

                              {/* Tests under Topic */}
                              {isTopicExpanded && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {topicTests.length > 0 ? (
                                      topicTests.map(test => (
                                        <div key={test.id} className="card" style={{ padding: '0.75rem 1rem', background: 'var(--color-bg)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input 
                                              type="checkbox" 
                                              checked={selectedTests.includes(test.id)} 
                                              onChange={() => toggleTestSelection(test.id)}
                                              style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                            />
                                            <div>
                                              <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{test.name}</h5>
                                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                {test.questionCount} Soru
                                                {test.answerKey && Object.keys(test.answerKey).length > 0 && (
                                                  <span style={{ marginLeft: '0.5rem', color: '#059669', fontWeight: 700 }}>• Cevap Anahtarlı ({Object.keys(test.answerKey).length})</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: '#4f46e5' }} onClick={() => handleAssignSingleTest(test)} title="Bu Teste Bitirme Tarihi / Ödev Ata">
                                              <Calendar size={14} />
                                            </button>
                                            <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setCurrentTest(test); setTestFormData({ name: test.name, questionCount: test.questionCount, answerKey: test.answerKey || {}, pdfUrl: test.pdfUrl || '' }); setIsTestDialogOpen(true); }}>
                                              <Edit size={14} />
                                            </button>
                                            <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-muted" style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>Bu konuda henüz test bulunmuyor.</p>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' }); setIsTestDialogOpen(true); }}>
                                      <Plus size={14} /> Test Ekle
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Subject Level Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-outline" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true); }}>
                            <Plus size={15} /> Konu Ekle
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: '0.85rem', color: '#059669', border: '1px dashed #059669' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {}, pdfUrl: '' }); setIsTestDialogOpen(true); }}>
                            <Plus size={15} /> Direkt Test Ekle (Konusuz)
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: '0.85rem', color: '#4f46e5', border: '1px dashed #4f46e5' }} onClick={() => { setBulkSeriesData(p => ({ ...p, subjectName: subject.name })); setIsBulkWizardOpen(true); setBulkWizardTab("series"); }}>
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
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--border-radius-md)' }}>
              <p className="text-muted" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Bu kitaba henüz ders veya test eklenmemiş.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }}>
                  <Plus size={16} /> İlk Dersi Ekle
                </button>
                <button className="btn btn-secondary" onClick={() => setIsBulkWizardOpen(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none' }}>
                  <Zap size={16} /> Toplu İçerik Sihirbazı
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ATANAN ÖDEVLER & İLERLEME TAB ── */}
      {activeTab === "homeworks" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Atanan Ödevler</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)' }}>{homeworkAnalytics.totalAssigned} Adet</div>
              </div>
            </div>

            <div className="card glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Hedef Öğrenciler</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>{homeworkAnalytics.totalTargetStudents} Öğrenci</div>
              </div>
            </div>

            <div className="card glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#38bdf8,#0284c7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Kitap Tamamlama Oranı</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7' }}>%{homeworkAnalytics.completionRate}</div>
              </div>
            </div>
          </div>

          {/* HOMEWORKS LIST */}
          <div className="card glass" style={{ padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <CheckSquare size={22} /> Bu Kitaptan Atanan Ödevler & Öğrenci İlerlemeleri
            </h3>

            {bookHomeworks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bookHomeworks.map(hw => {
                  let targetStudents = [];
                  if (hw.targetType === 'grade' || hw.targetType === 'class') {
                    targetStudents = students.filter(s => (hw.targetIds || []).some(tid => s.gradeId === tid || s.grade === tid || s.className === tid));
                  } else {
                    targetStudents = students.filter(s => (hw.targetIds || []).some(tid => s.id === tid));
                  }

                  const hwTests = hw.tests || [];
                  const totalTestsInHw = hwTests.length || 1;

                  let completedStudentsCount = 0;
                  const studentProgressDetails = targetStudents.map(st => {
                    const solvedSubmissions = submissions.filter(s => 
                      s.studentId === st.id && 
                      s.status === 'completed' &&
                      (s.testId === hw.id || s.homeworkId === hw.id || s.hwId === hw.id || hwTests.includes(s.testId) || hwTests.includes(s.bookTestId))
                    );
                    
                    const isDone = solvedSubmissions.length > 0; // If any matching submission exists, they finished the homework
                    if (isDone) completedStudentsCount++;
                    
                    const pct = isDone ? 100 : 0;
                    return { student: st, solvedCount: isDone ? totalTestsInHw : 0, totalTestsInHw, isDone, pct, solvedSubmissions };
                  });

                  const overallHwPct = targetStudents.length > 0 ? Math.round((completedStudentsCount / targetStudents.length) * 100) : 0;
                  const isExpanded = expandedHomeworkDetails[hw.id];
                  const isExpired = new Date(hw.dueDate) < new Date();

                  return (
                    <div key={hw.id} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', overflow: 'hidden', background: 'white' }}>
                      
                      {/* HOMEWORK HEADER */}
                      <div style={{ padding: '1rem 1.25rem', background: 'rgba(99,102,241,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.6rem', borderRadius: '0.6rem', display: 'flex' }}>
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: 800 }}>{hw.title}</h4>
                              <span style={{ fontSize: '0.73rem', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontWeight: 800, background: isExpired ? '#fef2f2' : '#ecfdf5', color: isExpired ? '#ef4444' : '#10b981', border: `1px solid ${isExpired ? '#fca5a5' : '#a7f3d0'}` }}>
                                {isExpired ? 'Süresi Bitti' : 'Aktif'}
                              </span>
                              <span style={{ fontSize: '0.73rem', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontWeight: 800, background: '#f1f5f9', color: '#475569' }}>
                                {hw.targetType === 'class' || hw.targetType === 'grade' ? `🏫 Sınıf (${targetStudents.length} Öğrenci)` : `👤 ${targetStudents.length} Özel Öğrenci`}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                              <span>📝 {totalTestsInHw} Test ({hw.totalQuestions || '?'} Soru)</span>
                              <span>📅 Son Tarih: {new Date(hw.dueDate).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                        </div>

                        {/* PROGRESS BAR & ACTIONS */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                          <div style={{ minWidth: '150px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                              <span style={{ color: '#475569' }}>Tamamlanma</span>
                              <span style={{ color: overallHwPct === 100 ? '#059669' : '#4f46e5' }}>%{overallHwPct} ({completedStudentsCount}/{targetStudents.length})</span>
                            </div>
                            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                              <div style={{ width: `${overallHwPct}%`, background: overallHwPct === 100 ? '#10b981' : '#4f46e5', height: '100%', borderRadius: 99 }} />
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setEditDateHw(hw);
                              setEditDateValue(hw.dueDate ? hw.dueDate.split('T')[0] : '');
                            }}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#4f46e5', borderColor: '#c7d2fe' }}
                            title="Tüm Kitap İçin Bitirme Tarihini Güncelle"
                          >
                            <Calendar size={15} />
                            Genel Tarih
                          </button>

                          <button 
                            onClick={() => {
                              setScheduleModalHw(hw);
                              setScheduleDates(hw.testDueDates || {});
                              setAutoStartDate(new Date().toISOString().split('T')[0]);
                              setScheduleSelectedTestIds([]);
                              setBulkApplyDate('');
                            }}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                            title="Kitap İçindeki Her Teste Özel Tek Tek Tarih Belirle"
                          >
                            <Clock size={15} />
                            İçerik Tarihlerini Planla
                          </button>

                          <button 
                            onClick={() => toggleHwDetails(hw.id)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            Detaylı İlerleme
                          </button>

                          <button 
                            onClick={() => handleDeleteHomeworkItem(hw.id)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem', color: '#ef4444', border: 'none' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* EXPANDED STUDENT DETAILS */}
                      {isExpanded && (
                        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                          <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: '#475569', fontWeight: 800 }}>
                            Öğrenci Bazlı İlerleme Tablosu ({targetStudents.length} Öğrenci)
                          </h5>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                            {studentProgressDetails.map(item => (
                              <div key={item.student.id} style={{ background: 'white', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                                    {item.student.name}
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: '0.3rem', background: item.isDone ? '#ecfdf5' : '#fff7ed', color: item.isDone ? '#047857' : '#c2410c' }}>
                                    {item.isDone ? '✅ Tamamladı' : `⏳ %${item.pct}`}
                                  </span>
                                </div>

                                <div style={{ background: '#f1f5f9', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${item.pct}%`, background: item.isDone ? '#10b981' : '#38bdf8', height: '100%' }} />
                                </div>

                                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', alignItems: 'center' }}>
                                  <span>Çözülen: {item.solvedCount} / {item.totalTestsInHw} Test</span>
                                  {item.solvedSubmissions.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ color: '#059669', fontWeight: 800 }}>
                                        {item.solvedSubmissions.reduce((a, b) => a + (b.score || 0), 0) / item.solvedSubmissions.length}% Başarı
                                      </span>
                                      <button 
                                        onClick={() => navigate(`/review/${item.solvedSubmissions[item.solvedSubmissions.length - 1].id}`)}
                                        style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                                      >
                                        İncele
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {targetStudents.length === 0 && (
                              <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>Bu ödev için atanmış öğrenci bulunamadı.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--border-radius-md)' }}>
                <CheckSquare size={48} style={{ opacity: 0.25, margin: '0 auto 1rem auto' }} />
                <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Henüz Ödev Atanmamış</h4>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  İçindekiler sekmesinden testleri seçip <strong>"Ata"</strong> butonuna basarak sınıfa veya öğrencilere ödev atayabilirsiniz.
                </p>
                <button className="btn btn-primary" onClick={() => setActiveTab("contents")}>
                  İçindekiler Sekmesine Git
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: MISTAKES TAB ── */}
      {activeTab === "mistakes" && (
        <div className="card glass" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ListX size={28} style={{ color: 'var(--color-error)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Yanlış Analizi</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Kitaptaki hatalı cevapların dökümü.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {subjectOptions.length > 0 && (
                <select className="input-field" value={mistakeFilterSubject} onChange={e => setMistakeFilterSubject(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <option value="all">Tüm Dersler</option>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <select className="input-field" value={mistakeFilterTopic} onChange={e => setMistakeFilterTopic(e.target.value)} disabled={mistakeFilterSubject === 'all' && topicOptions.length === 0} style={{ padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}>
                <option value="all">Tüm Konular</option>
                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {Object.keys(mistakeList).length > 0 && (
                <button className="btn btn-outline" onClick={handleDownloadMistakes}><FileOutput size={16} /> İndir</button>
              )}
            </div>
          </div>

          {filteredMistakes.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Ders</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Konu</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Test</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Hatalı Sorular</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Öğrenci</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMistakes.map((mistake, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.85rem' }}>{mistake.subjectName}</span></td>
                      <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: 500 }}>{mistake.topicName}</td>
                      <td style={{ padding: '1rem', fontSize: '0.95rem' }}>{mistake.testDef.name}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {mistake.questionData.map((q, idx) => (
                            <span key={idx} style={{ color: q.isBlank ? 'var(--color-text-muted)' : 'var(--color-error)' }}>
                              {q.num}{idx < mistake.questionData.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{mistake.submission.studentName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              <CheckCircle size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <p>Yanlış soru bulunamadı. Öğrencileriniz harika iş çıkarıyor!</p>
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR SELECTED TESTS */}
      {selectedTests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'var(--color-primary)', color: 'white', padding: '1rem 2rem', borderRadius: '3rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedTests.length} Test Seçildi</span>
          <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.3)' }} />
          <button onClick={handleOpenAssignModal} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            Ata <Send size={18} />
          </button>
          <button onClick={() => setSelectedTests([])} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.3rem', cursor: 'pointer', display: 'flex' }}>
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* ⚡ UNIFIED BULK IMPORT WIZARD */}
      {isBulkWizardOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <Zap size={22} style={{ color: '#6366f1' }} /> Toplu İçerik & Test Sihirbazı
              </h3>
              <button onClick={() => setIsBulkWizardOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <XCircle size={22} />
              </button>
            </div>

            {/* Wizard Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.03)', padding: '0.35rem', borderRadius: '0.75rem' }}>
              <button
                onClick={() => setBulkWizardTab("text")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "text" ? 'white' : 'transparent',
                  color: bulkWizardTab === "text" ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: bulkWizardTab === "text" ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                📝 Hızlı Liste Yapıştır
              </button>
              <button
                onClick={() => setBulkWizardTab("series")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "series" ? 'white' : 'transparent',
                  color: bulkWizardTab === "series" ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: bulkWizardTab === "series" ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                ⚡ Seri Test Oluştur
              </button>
              <button
                onClick={() => setBulkWizardTab("json")}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: bulkWizardTab === "json" ? 'white' : 'transparent',
                  color: bulkWizardTab === "json" ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: bulkWizardTab === "json" ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
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
                <div style={{ background: 'rgba(99,102,241,0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(99,102,241,0.15)', fontSize: '0.8rem', color: '#4338ca', marginBottom: '1rem' }}>
                  <strong>Örnek Satırlar:</strong><br />
                  • <code>Matematik &gt; Çarpanlar ve Katlar &gt; Test 1 : ABCDEABCDE</code><br />
                  • <code>Türkçe &gt; Test 1 [ABCDEABCDE]</code><br />
                  • <code>Paragraf (5 Test)</code>
                </div>

                <textarea
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  placeholder={`Matematik > Üslü Sayılar > Test 1 : ABCDEABCDEAB\nMatematik > Üslü Sayılar > Test 2 [ABCDEABCDEAB]\nTürkçe > Test 1 : BACDEBACDE`}
                  rows={8}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />

                {/* Live Preview */}
                {parsedBulkStructure.totalTests > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(16,185,129,0.08)', borderRadius: '0.75rem', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: '#047857', fontSize: '0.9rem' }}>Önizleme Algılandı:</strong>
                      <div style={{ fontSize: '0.82rem', color: '#065f46', marginTop: '0.2rem' }}>
                        📘 {parsedBulkStructure.totalSubjects} Ders | 📑 {parsedBulkStructure.totalTopics} Konu | 📝 {parsedBulkStructure.totalTests} Test
                      </div>
                    </div>
                    <button onClick={handleExecuteBulkText} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontWeight: 900, background: '#10b981', border: 'none' }}>
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
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>Hedef Ders Adı</label>
                  <input
                    type="text"
                    className="input-field"
                    value={bulkSeriesData.subjectName}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, subjectName: e.target.value }))}
                    placeholder="Örn: Matematik, Fizik..."
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isDirectSubj"
                    checked={bulkSeriesData.isDirectSubject}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, isDirectSubject: e.target.checked }))}
                  />
                  <label htmlFor="isDirectSubj" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    Konusuz - Testleri doğrudan derse ekle
                  </label>
                </div>

                {!bulkSeriesData.isDirectSubject && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>Hedef Konu Adı (İsteğe Bağlı)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={bulkSeriesData.topicName}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, topicName: e.target.value }))}
                      placeholder="Örn: Çarpanlar ve Katlar"
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.82rem' }}>Test Ön Eki</label>
                    <input
                      type="text"
                      className="input-field"
                      value={bulkSeriesData.prefix}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, prefix: e.target.value }))}
                      placeholder="Test"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.82rem' }}>Test Sayısı</label>
                    <input
                      type="number"
                      className="input-field"
                      value={bulkSeriesData.testCount}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, testCount: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.82rem' }}>Soru Sayısı/Test</label>
                    <input
                      type="number"
                      className="input-field"
                      value={bulkSeriesData.questionCount}
                      onChange={(e) => setBulkSeriesData(p => ({ ...p, questionCount: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(5, 150, 105, 0.05)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#047857' }}>
                    🔑 Toplu Cevap Anahtarı (İsteğe Bağlı - Örn: ABCDEABCDE...)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={bulkSeriesData.rawAnswerKey || ''}
                    onChange={(e) => setBulkSeriesData(p => ({ ...p, rawAnswerKey: e.target.value.toUpperCase() }))}
                    placeholder="Örn: ABCDEABCDEABCDEABCDE"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1.5px solid #a7f3d0', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.08em' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button onClick={handleExecuteBulkSeries} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontWeight: 900 }}>
                    {bulkSeriesData.testCount} Testi Otomatik Oluştur
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: JSON IMPORT */}
            {bulkWizardTab === "json" && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
                  Ders, konu ve testlerinizi içeren JSON formatındaki yapıyı buraya yapıştırabilirsiniz.
                </p>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{\n  "subjects": [\n    {\n      "name": "Matematik",\n      "topics": [\n        { "name": "Üslü İfadeler", "tests": [{ "name": "Test 1", "questionCount": 12, "answerKey": ["A","B","C","D","E"] }] }\n      ]\n    }\n  ]\n}`}
                  rows={8}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button onClick={handleExecuteJsonImport} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontWeight: 900 }}>
                    JSON İçe Aktar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {isSubjectDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{currentSubject ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.5rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ders Adı</label>
              <input type="text" className="input-field" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Matematik, Fizik..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsSubjectDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSubjectSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {isTopicDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{currentTopic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.5rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Konu Adı</label>
              <input type="text" className="input-field" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Üslü Sayılar, Dinamik..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTopicDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleTopicSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {isTestDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{currentTest ? 'Testi Düzenle' : 'Yeni Test Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.5rem 0 1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Test Adı</label>
              <input type="text" className="input-field" value={testFormData.name} onChange={e => setTestFormData(p => ({...p, name: e.target.value}))} placeholder="Test 1, Zor Seviye..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Soru Sayısı</label>
              <input type="number" className="input-field" value={testFormData.questionCount} onChange={e => setTestFormData(p => ({...p, questionCount: parseInt(e.target.value)||0}))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                className="input-field"
                value={testFormData.pdfUrl || ''}
                onChange={e => setTestFormData(p => ({...p, pdfUrl: e.target.value}))}
                placeholder="https://drive.google.com/... veya PDF URL"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
              />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Google Drive paylaşım linki veya direkt PDF linki. Öğrenci bu testi çözerken PDF'yi görebilir.</div>
            </div>
            {book.bookType !== 'open_ended' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span>Cevap Anahtarı (İsteğe Bağlı)</span>
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
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)', width: '160px', outline: 'none' }}
                  />
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  {Array.from({ length: testFormData.questionCount }).map((_, i) => {
                    const qNum = i + 1;
                    const val = testFormData.answerKey?.[qNum] || '';
                    return (
                      <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '20px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{qNum}.</div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {['A','B','C','D','E'].map(opt => {
                            const isSelected = val === opt;
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setTestFormData(p => ({ ...p, answerKey: { ...p.answerKey, [qNum]: opt } }))}
                                style={{
                                  width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.2)',
                                  background: isSelected ? 'var(--color-primary)' : 'white',
                                  color: isSelected ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
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
                  {testFormData.questionCount === 0 && <span className="text-muted" style={{ fontSize: '0.8rem', gridColumn: '1 / -1', textAlign: 'center' }}>Önce soru sayısı girin.</span>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTestDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleTestSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* 🏫 ADVANCED ASSIGN HOMEWORK MODAL (CLASS & STUDENT SELECTION) */}
      {isAssignDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                <Send size={20} /> Ödev Ata ({selectedTests.length} Test Seçildi)
              </h3>
              <button onClick={() => setIsAssignDialogOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            {/* Custom Homework Title Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>Ödev Başlığı</label>
              <input
                type="text"
                className="input-field"
                value={assignCustomTitle}
                onChange={(e) => setAssignCustomTitle(e.target.value)}
                placeholder="Örn: LGS Matematik 1. Dönem Ödevi"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
            </div>

            {/* Target Type Selector (Class vs Student) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>Hedef Kitle Seçimi</label>
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => { setAssignTargetMode("class"); setAssignSelectedTargetIds([]); }}
                  style={{
                    flex: 1, padding: '0.55rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                    background: assignTargetMode === "class" ? 'var(--color-primary)' : 'transparent',
                    color: assignTargetMode === "class" ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <GraduationCap size={16} /> 🏫 Sınıfa Özel (Tüm Sınıf)
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignTargetMode("student"); setAssignSelectedTargetIds([]); }}
                  style={{
                    flex: 1, padding: '0.55rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                    background: assignTargetMode === "student" ? 'var(--color-primary)' : 'transparent',
                    color: assignTargetMode === "student" ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <Users size={16} /> 👤 Öğrenciye Özel
                </button>
              </div>
            </div>

            {/* Target Options Checklist */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>
                {assignTargetMode === "class" ? 'Hedef Sınıf(ları) Seçin:' : 'Hedef Öğrenci(leri) Seçin:'}
              </label>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', padding: '0.65rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                
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
                    <label key={cls.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: isChecked ? '#e0e7ff' : 'white', borderRadius: '0.5rem', border: `1px solid ${isChecked ? '#6366f1' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleTargetId(cls.id)} 
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--color-primary)', cursor: 'pointer' }} 
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isChecked ? '#3730a3' : '#1e293b' }}>
                          🏫 {cls.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', background: 'rgba(0,0,0,0.05)', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 700 }}>
                        {classStudentsCount} Öğrenci
                      </span>
                    </label>
                  );
                })}

                {/* STUDENT LIST */}
                {assignTargetMode === "student" && students.map(st => {
                  const isChecked = assignSelectedTargetIds.includes(st.id);
                  return (
                    <label key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: isChecked ? '#e0e7ff' : 'white', borderRadius: '0.5rem', border: `1px solid ${isChecked ? '#6366f1' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleTargetId(st.id)} 
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--color-primary)', cursor: 'pointer' }} 
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isChecked ? '#3730a3' : '#1e293b' }}>
                          👤 {st.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {st.grade || st.className || 'Öğrenci'}
                      </span>
                    </label>
                  );
                })}

                {assignTargetMode === "class" && availableClasses.length === 0 && (
                  <p className="text-muted" style={{ padding: '1rem', textAlign: 'center', margin: 0, fontSize: '0.85rem' }}>Tanımlı sınıf bulunamadı.</p>
                )}
                {assignTargetMode === "student" && students.length === 0 && (
                  <p className="text-muted" style={{ padding: '1rem', textAlign: 'center', margin: 0, fontSize: '0.85rem' }}>Tanımlı öğrenci bulunamadı.</p>
                )}
              </div>
            </div>

            {/* Due Date Selector (Hazır Günler veya Özel Takvim Tarihi) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>
                Ödev / Bitirme Tarihi veya Süresi
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>Hazır Gün Seçin:</label>
                  <select
                    className="input-field"
                    value={assignDueDateDays}
                    onChange={(e) => {
                      setAssignDueDateDays(parseInt(e.target.value) || 7);
                      setAssignExactDueDate("");
                    }}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 700 }}
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
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>Veya Takvimden Seçin:</label>
                  <input
                    type="date"
                    className="input-field"
                    value={assignExactDueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAssignExactDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  />
                </div>
              </div>
              {assignExactDueDate ? (
                <p style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700, marginTop: '0.35rem' }}>
                  🗓️ Seçilen Bitirme Tarihi: {new Date(assignExactDueDate).toLocaleDateString('tr-TR')}
                </p>
              ) : (
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Hedef Bitirme Tarihi: {new Date(Date.now() + (assignDueDateDays || 7) * 86400000).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsAssignDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleAssignSelectedTestsSubmit} style={{ padding: '0.6rem 1.5rem', fontWeight: 900 }}>
                Ödevi {assignTargetMode === 'class' ? 'Sınıfa' : 'Öğrenciye'} Ata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 EDIT ASSIGNED HOMEWORK DUE DATE MODAL */}
      {editDateHw && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Calendar size={20} /> Bitirme Tarihini Değiştir / Süre Uzat
              </h3>
              <button onClick={() => setEditDateHw(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{editDateHw.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                Mevcut Son Tarih: {editDateHw.dueDate ? new Date(editDateHw.dueDate).toLocaleDateString('tr-TR') : 'Yok'}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>Yeni Bitirme Tarihi Seçin:</label>
              <input
                type="date"
                className="input-field"
                value={editDateValue}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEditDateValue(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center', fontWeight: 700 }}>Hızlı Uzat:</span>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setEditDateValue(d.toISOString().split('T')[0]); }} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', fontWeight: 700 }}>+7 Gün</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 14); setEditDateValue(d.toISOString().split('T')[0]); }} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', fontWeight: 700 }}>+14 Gün</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 30); setEditDateValue(d.toISOString().split('T')[0]); }} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', fontWeight: 700 }}>+30 Gün (1 Ay)</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setEditDateHw(null)}>İptal</button>
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
                style={{ padding: '0.6rem 1.4rem', fontWeight: 900 }}
              >
                Yeni Tarihi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗓️ DETAILED PER-TEST SCHEDULER MODAL FOR ASSIGNED BOOK */}
      {scheduleModalHw && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 900 }}>
                  <Clock size={22} style={{ color: '#0284c7' }} /> İçerik Test Tarihlerini Planla
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {scheduleModalHw.title} — Kitaptaki her test için tek tek bitirme tarihi belirleyin veya otomatik dağıtın.
                </p>
              </div>
              <button onClick={() => setScheduleModalHw(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Quick Auto Distribute Box */}
              <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1.5px solid #7dd3fc', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={18} /> Otomatik Tarih Dağıtıcı (Hızlı Planlama)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, marginBottom: '0.25rem' }}>Başlangıç Tarihi:</label>
                    <input
                      type="date"
                      className="input-field"
                      value={autoStartDate}
                      onChange={(e) => setAutoStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #7dd3fc', fontWeight: 700, fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, marginBottom: '0.25rem' }}>Test Sıklığı (Aralık):</label>
                    <select
                      className="input-field"
                      value={autoIntervalDays}
                      onChange={(e) => setAutoIntervalDays(Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #7dd3fc', fontWeight: 700, fontSize: '0.85rem' }}
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
                          const subjTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id)));
                          subjTests.forEach(t => {
                            if (testCounter > 0) {
                              currDate.setDate(currDate.getDate() + autoIntervalDays);
                            }
                            datesMap[t.id] = currDate.toISOString().split('T')[0];
                            testCounter++;
                          });
                        });
                        setScheduleDates(datesMap);
                        showToast(`${testCounter} teste sırayla otomatik tarihler atandı! ✨`);
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.55rem', fontWeight: 900, fontSize: '0.82rem', background: '#0284c7', border: 'none', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <Zap size={15} /> Otomatik Tarihleri Dağıt
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky/Top Bulk Date Action Bar */}
              {scheduleSelectedTestIds.length > 0 && (
                <div style={{ background: '#e0e7ff', border: '1.5px solid #6366f1', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ fontWeight: 800, color: '#3730a3', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} /> {scheduleSelectedTestIds.length} Test Seçildi
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3730a3' }}>Toplu Tarih Seçin:</label>
                    <input
                      type="date"
                      className="input-field"
                      value={bulkApplyDate}
                      onChange={(e) => setBulkApplyDate(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1px solid #818cf8', fontWeight: 700, fontSize: '0.85rem' }}
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
                      className="btn btn-primary"
                      style={{ padding: '0.45rem 1rem', fontWeight: 900, fontSize: '0.82rem', background: '#4f46e5', border: 'none', borderRadius: '0.5rem' }}
                    >
                      SeçilenLere Uygula
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleSelectedTestIds([])}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', borderRadius: '0.5rem' }}
                    >
                      Seçimi Temizle
                    </button>
                  </div>
                </div>
              )}

              {/* Per-Test Date Settings List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 800 }}>
                    Kitap İçindekiler Yapısı & Test Bazlı Tarihler
                  </h4>
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
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem', fontWeight: 800 }}
                  >
                    {scheduleSelectedTestIds.length === tests.length ? '✅ Tüm Kitabı Kaldır' : '☑️ Tüm Kitabı Seç'}
                  </button>
                </div>

                {book.subjects?.map(subj => {
                  const subjTests = sortTestsNaturally(tests.filter(t => String(t.subjectId) === String(subj.id)));
                  if (subjTests.length === 0) return null;

                  const allSubjSelected = subjTests.every(t => scheduleSelectedTestIds.includes(t.id));

                  return (
                    <div key={subj.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Layers size={16} color="#6366f1" /> {subj.name} ({subjTests.length} Test)
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const subjTestIds = subjTests.map(t => t.id);
                            if (allSubjSelected) {
                              setScheduleSelectedTestIds(prev => prev.filter(id => !subjTestIds.includes(id)));
                            } else {
                              setScheduleSelectedTestIds(prev => Array.from(new Set([...prev, ...subjTestIds])));
                            }
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', fontWeight: 800, background: 'white' }}
                        >
                          {allSubjSelected ? '✅ Tüm Dersi Kaldır' : '☑️ Tüm Dersi Seç'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                        {subjTests.map(t => {
                          const testVal = scheduleDates[t.id] || '';
                          const isSelected = scheduleSelectedTestIds.includes(t.id);

                          return (
                            <div key={t.id} style={{ background: isSelected ? '#e0e7ff' : 'white', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: `1px solid ${isSelected ? '#6366f1' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', transition: 'all 0.15s' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setScheduleSelectedTestIds(prev =>
                                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                  );
                                }}
                                style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: '#4f46e5' }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {t.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {t.questionCount || 20} Soru
                                </div>
                              </div>
                              <input
                                type="date"
                                className="input-field"
                                value={testVal}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setScheduleDates(p => ({ ...p, [t.id]: v }));
                                }}
                                style={{ width: '135px', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setScheduleModalHw(null)}>İptal</button>
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
                style={{ padding: '0.6rem 1.6rem', fontWeight: 900, background: '#0284c7', border: 'none' }}
              >
                Tüm Test Tarihlerini Kaydet
              </button>
            </div>

          </div>
        </div>
      )}
      {/* BOOK SETTINGS MODAL */}
      {isBookSettingsDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '520px', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings /> Kitap Ayarlarını Düzenle
            </h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>Kitap başlığı, yayınevi, seviye ve optik seçenek sayısını güncelleyin.</p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Kitap Adı</label>
              <input
                type="text"
                className="input-field"
                value={bookSettingsForm.title}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, title: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Yayınevi</label>
              <input
                type="text"
                className="input-field"
                value={bookSettingsForm.publisher}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, publisher: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Optik Form Seçenek Sayısı (Seviye)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem', border: `1.5px solid ${bookSettingsForm.optionCount === 4 ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', background: bookSettingsForm.optionCount === 4 ? 'rgba(124, 58, 237, 0.05)' : 'white' }}>
                  <input
                    type="radio"
                    name="bookSettingOptionCount"
                    value={4}
                    checked={bookSettingsForm.optionCount === 4}
                    onChange={() => setBookSettingsForm({ ...bookSettingsForm, optionCount: 4 })}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>4 Seçenekli (A-D)</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ortaokul / LGS</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem', border: `1.5px solid ${bookSettingsForm.optionCount === 5 ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', background: bookSettingsForm.optionCount === 5 ? 'rgba(124, 58, 237, 0.05)' : 'white' }}>
                  <input
                    type="radio"
                    name="bookSettingOptionCount"
                    value={5}
                    checked={bookSettingsForm.optionCount === 5}
                    onChange={() => setBookSettingsForm({ ...bookSettingsForm, optionCount: 5 })}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>5 Seçenekli (A-E)</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Lise / YKS</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                className="input-field"
                value={bookSettingsForm.pdfUrl || ''}
                onChange={(e) => setBookSettingsForm({ ...bookSettingsForm, pdfUrl: e.target.value })}
                placeholder="https://drive.google.com/... veya direkt PDF URL"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsBookSettingsDialogOpen(false)}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  updateTrackedBook(book.id, bookSettingsForm);
                  setIsBookSettingsDialogOpen(false);
                  showToast("Kitap ayarları başarıyla güncellendi.");
                }}
                style={{ padding: '0.6rem 1.5rem', fontWeight: 900 }}
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
