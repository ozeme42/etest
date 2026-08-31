import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertCircle, Trash2, Plus, Sparkles,
  BookOpen, Calculator, FileText, Check, X, RefreshCw, ChevronRight,
  TrendingUp, Trophy, Layers, Award, FileCode2, Copy, ArrowRight, CornerDownRight, BarChart3, Settings2,
  Eye, ArrowLeft, Calendar, FileSpreadsheet, KeyRound, Key, Edit3, Link2, Download, Search, Filter,
  Send, Save, ExternalLink
} from 'lucide-react';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { toUUID } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';
import './ExamManager.css';

const EXAM_PRESETS = {
  LGS: {
    title: '🎓 LGS Sınav Formatı (90 Soru · 3 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 3,
    subjects: [
      { name: 'Türkçe', count: 20, options: ['A', 'B', 'C', 'D'] },
      { name: 'Matematik', count: 20, options: ['A', 'B', 'C', 'D'] },
      { name: 'Fen Bilimleri', count: 20, options: ['A', 'B', 'C', 'D'] },
      { name: 'T.C. İnkılap Tarihi', count: 10, options: ['A', 'B', 'C', 'D'] },
      { name: 'Din Kültürü', count: 10, options: ['A', 'B', 'C', 'D'] },
      { name: 'İngilizce', count: 10, options: ['A', 'B', 'C', 'D'] },
    ]
  },
  TYT: {
    title: '🏛️ YKS TYT Sınav Formatı (120 Soru · 4 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 4,
    subjects: [
      { name: 'Türkçe', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Sosyal Bilimler', count: 20, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Temel Matematik', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Fen Bilimleri', count: 20, options: ['A', 'B', 'C', 'D', 'E'] },
    ]
  },
  AYT: {
    title: '🏛️ YKS AYT Sınav Formatı (80 Soru · 4 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 4,
    subjects: [
      { name: 'Matematik (AYT)', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Fen Bilimleri (AYT)', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
    ]
  },
  CUSTOM: {
    title: '📊 Özel / Boş Şablon (Elle veya Toplu JSON ile ders ekleyin)',
    penaltyRatio: 0,
    subjects: []
  }
};

const SAMPLE_JSON_TEMPLATE = {
  examTitle: "Özdebir LGS 1. Genel Deneme Sınavı",
  examType: "CUSTOM",
  examDate: new Date().toISOString().split('T')[0],
  penaltyRatio: 3,
  pdfUrl: "",
  answerKey: {
    "Türkçe": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Matematik": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Fen Bilimleri": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"]
  }
};

export default function ExamManager() {
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { questions } = useQuestionBank();
  const { homeworks, addHomework, updateHomework, deleteHomework } = useHomework();
  const { deleteSubmissionsByTestId, deleteBookSubmissionsForEveryone } = useEvaluation();
  const { data: curData } = useCurriculum();
  const { addTrackedBook, addTrackedBookTest, updateTrackedBook, updateTrackedBookTest, deleteTrackedBook, books, bookTests } = useTrackedBooks();
  const navigate = useNavigate();

  const students = useMemo(() => users.filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id)), [users, currentUser]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingExamDetails, setViewingExamDetails] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  
  // Edit Mode State for Existing Exams
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [editingExamMeta, setEditingExamMeta] = useState({});
  const [editingAnswerKey, setEditingAnswerKey] = useState({});
  const [inlineInputs, setInlineInputs] = useState({});

  // Quick Assign Modal State
  const [assignModalExam, setAssignModalExam] = useState(null);
  const [assignTargetMode, setAssignTargetMode] = useState('student');
  const [assignTargets, setAssignTargets] = useState([]);
  const [assignDueDate, setAssignDueDate] = useState('');

  const [examType, setExamType] = useState('LGS');
  const [examTitle, setExamTitle] = useState('Özdebir LGS Genel Deneme 1');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [examPdfUrl, setExamPdfUrl] = useState('');
  const [penaltyRatio, setPenaltyRatio] = useState(3);
  const [optionCount, setOptionCount] = useState(4);
  const [timePerQuestion, setTimePerQuestion] = useState(2);

  const [subjects, setSubjects] = useState(EXAM_PRESETS.LGS.subjects);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  const [answerKey, setAnswerKey] = useState(() => {
    const init = {};
    EXAM_PRESETS.LGS.subjects.forEach(sub => {
      init[sub.name] = Array(sub.count).fill('');
    });
    return init;
  });

  // Modal States
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCount, setNewSubCount] = useState(15);
  const [newSubOptions, setNewSubOptions] = useState(4);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');

  const physicalExamsDatabase = useMemo(() => {
    // 1. Gather all exam books from tracked books
    const examBooks = (books || []).filter(b => {
      if (!b) return false;
      const bType = String(b.bookType || b.book_type || b.raw_data?.bookType || b.type || '').toLowerCase();
      const bPub = String(b.publisher || '').toUpperCase();
      const isExamType = bType === 'exam' || bType === 'physical_exam' || b.isExam === true || b.id === 'tb_07kzdf_1787267196768';
      const isPresetPub = ['LGS', 'TYT', 'AYT', 'CUSTOM'].includes(bPub);
      return isExamType || isPresetPub;
    });

    const examMap = new Map();

    examBooks.forEach(b => {
      const bId = String(b.id);
      const bUuid = toUUID(b.id);

      const testsForBook = (bookTests || []).filter(t => {
        if (!t) return false;
        const tBId = String(t.bookId || t.book_id || '');
        return tBId === bId || (bUuid && tBId === bUuid) || (toUUID(tBId) && toUUID(tBId) === bUuid);
      });

      const builtAnswerKey = {};
      const subjectArray = [];
      
      testsForBook.forEach(t => {
        const subDef = (b.subjects || []).find(s => s && (String(s.id) === String(t.subjectId || t.subject_id)));
        const subName = subDef ? subDef.name : String(t.name || 'Ders').replace(' Testi', '');
        
        builtAnswerKey[subName] = [];
        if (t.answerKey && typeof t.answerKey === 'object') {
          for (let i = 1; i <= (t.questionCount || 20); i++) {
            builtAnswerKey[subName].push(t.answerKey[i] || '');
          }
        }
        subjectArray.push({ name: subName, count: Number(t.questionCount) || 20, testId: t.id });
      });

      const rawSubjects = (Array.isArray(b.subjects) && b.subjects.length > 0)
        ? b.subjects.map(s => typeof s === 'string' ? { name: s, count: 20 } : s)
        : [];

      const effectiveSubjects = subjectArray.length > 0 ? subjectArray : rawSubjects;
      const totalQuestions = effectiveSubjects.reduce((acc, curr) => acc + (Number(curr.count) || 20), 0);

      const examObj = {
        ...b,
        bookType: 'exam',
        answerKey: Object.keys(builtAnswerKey).length > 0 ? builtAnswerKey : (b.answerKey || {}),
        subjects: effectiveSubjects,
        totalQuestions: totalQuestions || b.totalQuestions || 90
      };

      examMap.set(bId, examObj);
      if (bUuid) examMap.set(bUuid, examObj);
    });

    // 2. ALSO include any physical exams that were created as homeworks
    (homeworks || []).forEach(hw => {
      if (!hw) return;
      const isPhysHw = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || hw.isPhysical === true || hw.isPhysicalExam === true;
      if (!isPhysHw) return;

      const hwBookId = String(hw.bookId || hw.id || '');
      const hwUuid = toUUID(hwBookId);

      if (!examMap.has(hwBookId) && (!hwUuid || !examMap.has(hwUuid))) {
        const hwSubs = Array.isArray(hw.subjects) ? hw.subjects.map(s => typeof s === 'string' ? { name: s, count: 20 } : s) : [];
        const hwTotalQ = Number(hw.totalQuestions) || hwSubs.reduce((acc, s) => acc + (Number(s.count) || 20), 0) || 90;

        const hwExam = {
          id: hwBookId,
          title: hw.title || 'Fiziki Deneme Sınavı',
          publisher: hw.examType || 'LGS',
          bookType: 'exam',
          subjects: hwSubs,
          totalQuestions: hwTotalQ,
          answerKey: hw.answerKey || {},
          penaltyRatio: hw.penaltyRatio !== undefined ? hw.penaltyRatio : 3,
          pdfUrl: hw.pdfUrl || '',
          createdBy: hw.assignedBy || hw.teacherId || currentUser?.id,
          teacherId: hw.teacherId || hw.assignedBy || currentUser?.id,
          createdAt: hw.createdAt || hw.date || new Date().toISOString()
        };

        examMap.set(hwBookId, hwExam);
        if (hwUuid) examMap.set(hwUuid, hwExam);
      }
    });

    // Return unique exams sorted newest first
    const uniqueExams = Array.from(new Set(Array.from(examMap.values())));
    return uniqueExams.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [books, bookTests, homeworks, currentUser]);

  const filteredExams = useMemo(() => {
    return physicalExamsDatabase.filter(exam => {
      const matchQuery = !searchFilter || exam.title.toLowerCase().includes(searchFilter.toLowerCase()) || (exam.publisher && exam.publisher.toLowerCase().includes(searchFilter.toLowerCase()));
      const matchFormat = formatFilter === 'ALL' || exam.publisher === formatFilter;
      return matchQuery && matchFormat;
    });
  }, [physicalExamsDatabase, searchFilter, formatFilter]);

  const totalQuestionsInPool = useMemo(() => {
    return physicalExamsDatabase.reduce((acc, e) => acc + (e.totalQuestions || 0), 0);
  }, [physicalExamsDatabase]);

  const [expandedAssignedExams, setExpandedAssignedExams] = useState({});
  const toggleAssignedAccordion = (examId) => setExpandedAssignedExams(prev => ({ ...prev, [examId]: !prev[examId] }));

  const examAssignmentsMap = useMemo(() => {
    const map = new Map();

    (physicalExamsDatabase || []).forEach(exam => {
      const eId = String(exam.id);
      const eUuid = toUUID(exam.id);
      const eTitleNorm = String(exam.title || '').trim().toLowerCase();

      // 1. Find all homeworks referencing this exam
      const linkedHws = (homeworks || []).filter(h => {
        if (!h) return false;
        const isPhys = h.type === 'physicalExam' || h.contentType === 'physicalExam' || h.isPhysical === true || h.isPhysicalExam === true;
        const hBookId = String(h.bookId || '');
        const hId = String(h.id || '');
        const hTitleNorm = String(h.title || '').trim().toLowerCase();

        const matchesId = hBookId === eId || hId === eId ||
          (eUuid && (hBookId === eUuid || hId === eUuid || toUUID(hBookId) === eUuid || toUUID(hId) === eUuid));
        const matchesTitle = isPhys && hTitleNorm === eTitleNorm;

        return matchesId || matchesTitle;
      });

      // 2. Expand every student target in these homeworks
      const assignedList = [];
      const now = new Date();

      linkedHws.forEach(hw => {
        const targetType = hw.targetType || 'student';
        const targetIds = Array.isArray(hw.targetIds) ? hw.targetIds.map(String) : (hw.studentId ? [String(hw.studentId)] : []);
        
        let targetStudents = [];
        if (targetType === 'grade' || targetType === 'class') {
          targetStudents = (students || []).filter(s => targetIds.includes(String(s.gradeId)) || targetIds.includes(String(s.class)));
        } else {
          targetStudents = (students || []).filter(s => {
            const sId = String(s.id);
            const sUuid = toUUID(s.id);
            return targetIds.includes(sId) || (sUuid && targetIds.includes(sUuid));
          });
        }

        // Also check if any other students from all users are assigned
        if (targetStudents.length === 0 && targetIds.length > 0) {
          targetStudents = (users || []).filter(u => u.role === 'student' && (targetIds.includes(String(u.id)) || (toUUID(u.id) && targetIds.includes(toUUID(u.id)))));
        }

        targetStudents.forEach(st => {
          const stId = String(st.id);
          const stUuid = toUUID(st.id);

          // Find submission for this student and homework/exam
          const sub = (evalSubmissions || []).find(s => {
            if (!s) return false;
            const subStId = String(s.studentId || s.userId || '');
            const isStudent = subStId === stId || (stUuid && subStId === stUuid);
            if (!isStudent) return false;

            const isHw = String(s.homeworkId || s.hwId || s.testId || '') === String(hw.id);
            const isBook = String(s.bookId || '') === eId || (eUuid && String(s.bookId || '') === eUuid);
            return isHw || isBook;
          });

          const isSolved = Boolean(sub && sub.status !== 'in_progress' && sub.status !== 'draft');
          const isOverdue = !isSolved && hw.dueDate && new Date(hw.dueDate) < now;

          assignedList.push({
            student: st,
            homework: hw,
            isSolved,
            isOverdue,
            submission: sub || null,
            score: sub ? (sub.score || sub.computedScore || sub.correctCount || 0) : null,
            correctCount: sub ? (sub.correctCount || sub.correct || 0) : null,
            wrongCount: sub ? (sub.wrongCount || sub.wrong || 0) : null,
            blankCount: sub ? (sub.emptyCount || sub.blankCount || sub.blank || 0) : null,
            submittedAt: sub ? (sub.submittedAt || sub.completedAt || sub.createdAt) : null
          });
        });
      });

      map.set(eId, assignedList);
      if (eUuid) map.set(eUuid, assignedList);
    });

    return map;
  }, [physicalExamsDatabase, homeworks, students, users, evalSubmissions]);

  const handleRemoveStudentAssignment = async (hw, studentId) => {
    if (!hw) return;
    const student = (students || []).find(u => String(u.id) === String(studentId)) || (users || []).find(u => String(u.id) === String(studentId));
    const stName = student?.name || 'Öğrenci';
    
    if (!window.confirm(`"${stName}" adlı öğrencinin bu deneme atamasını silmek istediğinize emin misiniz?`)) return;

    try {
      const currentTargetIds = Array.isArray(hw.targetIds) ? hw.targetIds.map(String) : (hw.studentId ? [String(hw.studentId)] : []);
      const strStId = String(studentId);
      const uuidStId = toUUID(studentId);

      const filteredTargets = currentTargetIds.filter(id => id !== strStId && (!uuidStId || id !== uuidStId));

      // If homework only had this student, or targetType is student with <= 1 targets, delete the whole homework
      if (filteredTargets.length === 0 || (hw.targetType === 'student' && currentTargetIds.length <= 1)) {
        if (typeof deleteHomework === 'function') await deleteHomework(hw.id);
      } else {
        // Otherwise update targetIds to remove this student
        if (typeof updateHomework === 'function') {
          await updateHomework(hw.id, { targetIds: filteredTargets });
        }
      }
      alert(`✅ "${stName}" için bu deneme ataması başarıyla kaldırıldı.`);
    } catch (err) {
      console.error('Error removing student assignment:', err);
      alert('Atama silinirken bir hata oluştu.');
    }
  };

  // Switch Preset Exam Format
  const handleExamTypeChange = (newType) => {
    setExamType(newType);
    const newPreset = EXAM_PRESETS[newType] || EXAM_PRESETS.LGS;
    setPenaltyRatio(newPreset.penaltyRatio);
    const optCount = newType === 'LGS' ? 4 : (newType === 'TYT' || newType === 'AYT' || newType === 'YKS' ? 5 : 4);
    setOptionCount(optCount);
    setTimePerQuestion(newType === 'TYT' ? 1.35 : 2);
    setSubjects(newPreset.subjects);
    setActiveSubjectIndex(0);

    const initKey = {};
    newPreset.subjects.forEach(sub => {
      initKey[sub.name] = Array(sub.count).fill('');
    });
    setAnswerKey(initKey);
  };

  const handleSubjectQuestionCountChange = (subjectName, newCount) => {
    const countNum = Math.max(1, Math.min(100, Number(newCount) || 1));
    setSubjects(prev => prev.map(s => s.name === subjectName ? { ...s, count: countNum } : s));
    setAnswerKey(prev => {
      const currentList = prev[subjectName] || [];
      if (countNum > currentList.length) {
        return { ...prev, [subjectName]: [...currentList, ...Array(countNum - currentList.length).fill('')] };
      }
      return { ...prev, [subjectName]: currentList.slice(0, countNum) };
    });
  };

  const handleAddCustomSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    const optArray = newSubOptions === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
    const newSubject = { name: newSubName.trim(), count: Number(newSubCount) || 10, options: optArray };
    setSubjects(prev => [...prev, newSubject]);
    setAnswerKey(prev => ({ ...prev, [newSubject.name]: Array(newSubject.count).fill('') }));
    setNewSubName('');
    setNewSubCount(15);
    setShowSettingsModal(false);
  };

  const handleDeleteSubject = (subjectName) => {
    setSubjects(prev => prev.filter(s => s.name !== subjectName));
    setActiveSubjectIndex(0);
  };

  const handleInlineInputChange = (subName, val, count) => {
    let cleaned = val.toUpperCase().replace(/[^A-E \-\*\_]/g, '');
    setInlineInputs(prev => ({ ...prev, [subName]: cleaned }));
    
    const chars = cleaned.split('');
    setEditingAnswerKey(prev => {
      const existing = Array(count).fill('');
      chars.forEach((char, idx) => {
        if (idx < count && /[A-E]/.test(char)) {
          existing[idx] = char;
        }
      });
      return { ...prev, [subName]: existing };
    });
  };

  const handleOptionClick = (subjectName, qIdx, option) => {
    if (isEditingExam) {
      setEditingAnswerKey(prev => {
        const currentList = [...(prev[subjectName] || [])];
        currentList[qIdx] = currentList[qIdx] === option ? '' : option;
        
        setInlineInputs(inlinePrev => {
           const newStr = currentList.map(a => a || ' ').join('').trimEnd();
           return { ...inlinePrev, [subjectName]: newStr };
        });

        return { ...prev, [subjectName]: currentList };
      });
      return;
    }
    setAnswerKey(prev => {
      const currentList = [...(prev[subjectName] || [])];
      currentList[qIdx] = currentList[qIdx] === option ? '' : option;
      return { ...prev, [subjectName]: currentList };
    });
  };

  const parsedBulkInput = useMemo(() => {
    if (!bulkInputText) return [];
    return bulkInputText.toUpperCase().match(/[A-E]/g) || [];
  }, [bulkInputText]);

  const handleApplyBulkInput = (e) => {
    e.preventDefault();
    if (isEditingExam && viewingExamDetails) {
       const currentSub = viewingExamDetails.subjects[activeSubjectIndex];
       if (!currentSub || parsedBulkInput.length === 0) return;
       setEditingAnswerKey(prev => {
          const existing = [...(prev[currentSub.name] || Array(currentSub.count).fill(''))];
          parsedBulkInput.forEach((ans, idx) => {
            if (idx < currentSub.count) existing[idx] = ans;
          });
          return { ...prev, [currentSub.name]: existing };
       });
       setShowBulkModal(false);
       setBulkInputText('');
       return;
    }

    const currentSub = subjects[activeSubjectIndex];
    if (!currentSub || parsedBulkInput.length === 0) return;
    setAnswerKey(prev => {
      const existing = [...(prev[currentSub.name] || Array(currentSub.count).fill(''))];
      parsedBulkInput.forEach((ans, idx) => {
        if (idx < currentSub.count) existing[idx] = ans;
      });
      return { ...prev, [currentSub.name]: existing };
    });
    setShowBulkModal(false);
    setBulkInputText('');
  };

  const handleImportJson = (e) => {
    e.preventDefault();
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonInputText.trim());
      if (parsed.examTitle) setExamTitle(parsed.examTitle);
      if (parsed.examType && EXAM_PRESETS[parsed.examType]) {
        setExamType(parsed.examType);
      } else {
        setExamType('CUSTOM');
      }

      if (parsed.penaltyRatio !== undefined) setPenaltyRatio(Number(parsed.penaltyRatio) || 0);
      if (parsed.examDate) setExamDate(parsed.examDate);
      if (parsed.pdfUrl) setExamPdfUrl(parsed.pdfUrl);

      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        const jsonSubjectNames = Object.keys(parsed.answerKey);
        if (jsonSubjectNames.length > 0) {
          const newSubjects = jsonSubjectNames.map(name => {
            const keyArr = parsed.answerKey[name] || [];
            const hasE = keyArr.includes('E');
            return { name, count: keyArr.length || 1, options: hasE ? ['A','B','C','D','E'] : ['A','B','C','D'] };
          });
          setSubjects(newSubjects);
          setActiveSubjectIndex(0);
        }
      }

      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        setAnswerKey(prev => ({ ...prev, ...parsed.answerKey }));
      }

      setShowJsonModal(false);
      setShowAddForm(true);
      setJsonInputText('');
    } catch (err) {
      setJsonError('Geçersiz JSON formatı! Lütfen kontrol edin.');
    }
  };

  const handleCopySampleJson = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const evaluationResults = useMemo(() => {
    const subjectStats = subjects.map(sub => {
      const keyArr = answerKey[sub.name] || [];
      const filled = keyArr.filter(Boolean).length;
      return { name: sub.name, count: sub.count, filled };
    });
    const totalFilled = subjectStats.reduce((a, s) => a + s.filled, 0);
    const totalQuestions = subjects.reduce((a, s) => a + s.count, 0);
    return { subjectStats, totalFilled, totalQuestions };
  }, [answerKey, subjects]);

  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert('Lütfen deneme sınavı için bir başlık giriniz.');
      return;
    }
    
    const createdBook = await addTrackedBook({
      title: examTitle.trim(),
      publisher: examType,
      subjects: subjects.map((s, idx) => ({ id: `sub_${idx}`, name: s.name })),
      bookType: 'exam',
      penaltyRatio,
      optionCount,
      timePerQuestion,
      pdfUrl: examPdfUrl.trim() || '',
      createdBy: currentUser?.id,
      teacherId: currentUser?.id
    });

    const testPromises = [];
    subjects.forEach((subject, idx) => {
       const subId = createdBook.subjects[idx].id;
       const ak = {};
       const srcAnswers = answerKey[subject.name] || [];
       srcAnswers.forEach((ans, i) => {
         if (ans) ak[i + 1] = ans;
       });

       testPromises.push(
          addTrackedBookTest(createdBook.id, {
             subjectId: subId,
             name: `${subject.name} Testi`,
             questionCount: subject.count,
             optionCount,
             timePerQuestion,
             isOpenEnded: false,
             answerKey: ak
          })
       );
    });
    
    await Promise.all(testPromises);

    setShowAddForm(false);
    alert('🎉 Fiziki deneme sisteme başarıyla eklendi! Ödevler sekmesinden veya doğrudan buradan öğrencilerinize atayabilirsiniz.');
  };

  const handleViewExamDetails = (exam) => {
    setViewingExamDetails(exam);
    setIsEditingExam(false);
    setEditingAnswerKey(exam.answerKey || {});
    setEditingExamMeta({
      title: exam.title || '',
      publisher: exam.publisher || 'LGS',
      pdfUrl: exam.pdfUrl || '',
      penaltyRatio: exam.penaltyRatio !== undefined ? exam.penaltyRatio : 3,
      optionCount: exam.optionCount || (exam.publisher === 'LGS' ? 4 : 5),
      timePerQuestion: Number(exam.timePerQuestion) || 2
    });
    
    const inlines = {};
    (exam.subjects || []).forEach(sub => {
       const ak = exam.answerKey?.[sub.name] || [];
       inlines[sub.name] = ak.map(a => a || ' ').join('').trimEnd();
    });
    setInlineInputs(inlines);
  };

  const handleSaveExamEdits = async () => {
    if (!viewingExamDetails) return;
    const finalPdfUrl = editingExamMeta.pdfUrl ? editingExamMeta.pdfUrl.trim() : '';
    const finalOptionCount = Number(editingExamMeta.optionCount) || 4;
    const finalTimePerQuestion = Number(editingExamMeta.timePerQuestion) || 2;
    const finalPenaltyRatio = editingExamMeta.penaltyRatio !== undefined ? Number(editingExamMeta.penaltyRatio) : 3;

    const testPromises = [];
    (viewingExamDetails.subjects || []).forEach(sub => {
       const ak = {};
       const srcAnswers = editingAnswerKey[sub.name] || [];
       srcAnswers.forEach((ans, i) => {
         if (ans && ans !== '-') ak[i + 1] = ans;
       });
       if (sub.testId) {
         testPromises.push(updateTrackedBookTest(sub.testId, { 
           answerKey: ak,
           pdfUrl: finalPdfUrl,
           optionCount: finalOptionCount,
           timePerQuestion: finalTimePerQuestion
         }));
       }
    });
    await Promise.all(testPromises);

    await updateTrackedBook(viewingExamDetails.id, {
      title: editingExamMeta.title,
      publisher: editingExamMeta.publisher,
      pdfUrl: finalPdfUrl,
      penaltyRatio: finalPenaltyRatio,
      optionCount: finalOptionCount,
      timePerQuestion: finalTimePerQuestion
    });

    // Also update any assigned homeworks for this book so students immediately get the new settings
    const relatedHws = (homeworks || []).filter(h => String(h.bookId) === String(viewingExamDetails.id));
    for (const rhw of relatedHws) {
      if (typeof updateHomework === 'function') {
        updateHomework(rhw.id, {
          title: editingExamMeta.title,
          pdfUrl: finalPdfUrl,
          penaltyRatio: finalPenaltyRatio,
          optionCount: finalOptionCount,
          timePerQuestion: finalTimePerQuestion
        });
      }
    }

    setViewingExamDetails(prev => prev ? {
      ...prev,
      title: editingExamMeta.title,
      publisher: editingExamMeta.publisher,
      pdfUrl: finalPdfUrl,
      penaltyRatio: finalPenaltyRatio,
      optionCount: finalOptionCount,
      timePerQuestion: finalTimePerQuestion
    } : null);

    setIsEditingExam(false);
    alert('✅ Deneme sınavı bilgileri başarıyla güncellendi!');
  };

  const handleQuickAssign = async () => {
    if (!assignDueDate || assignTargets.length === 0 || !assignModalExam) {
      alert("Lütfen tarih ve atanacak kişi/sınıf seçin.");
      return;
    }
    const testsForExam = bookTests.filter(t => t.bookId === assignModalExam.id).map(t => t.id);
    const subs = assignModalExam.subjects || [];

    const hwData = {
      title: assignModalExam.title,
      dueDate: assignDueDate,
      isBookAssignment: true,
      bookId: assignModalExam.id,
      targetType: assignTargetMode,
      targetIds: assignTargets,
      tests: testsForExam,
      assignedBy: currentUser?.id,
      type: 'physicalExam',
      contentType: 'physicalExam',
      isPhysical: true,
      examType: assignModalExam.publisher || 'LGS / YKS',
      subjects: subs,
      penaltyRatio: assignModalExam.penaltyRatio !== undefined ? assignModalExam.penaltyRatio : 3,
      totalQuestions: subs.reduce((acc, s) => acc + (Number(s.count) || 20), 0) || 90,
      pdfUrl: assignModalExam.pdfUrl || '',
      answerKey: assignModalExam.answerKey || {}
    };
    await addHomework(hwData);
    setAssignModalExam(null);
    setAssignTargets([]);
    setAssignDueDate('');
    alert("✅ Deneme ödevi başarıyla yayınlandı!");
  };

  const handleDeleteExam = async (exam) => {
    if (!exam) return;
    const title = exam.title || 'Deneme';
    if (!window.confirm(`"${title}" denemesini havuzdan, atanmış tüm ödevlerden ve öğrenci sonuçlarından tamamen silmek istediğinize emin misiniz?`)) return;

    try {
      // 1. Delete tracked book and its tests
      await deleteTrackedBook(exam.id);

      // 2. Delete associated homeworks
      const linkedHws = (homeworks || []).filter(h =>
        String(h.bookId) === String(exam.id) ||
        String(h.id) === String(exam.id) ||
        (toUUID(exam.id) && (String(toUUID(h.bookId)) === String(toUUID(exam.id)) || String(toUUID(h.id)) === String(toUUID(exam.id))))
      );
      for (const hw of linkedHws) {
        if (typeof deleteHomework === 'function') await deleteHomework(hw.id);
        if (typeof deleteSubmissionsByTestId === 'function') await deleteSubmissionsByTestId(hw.id);
      }

      // 3. Delete associated submissions
      if (typeof deleteSubmissionsByTestId === 'function') await deleteSubmissionsByTestId(exam.id);
      if (typeof deleteBookSubmissionsForEveryone === 'function') await deleteBookSubmissionsForEveryone(exam.id);
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  return (
    <div className="exam-container" style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: '1.25rem 1.5rem 5rem 1.5rem', boxSizing: 'border-box' }}>

      {/* ══════════ STICKY TOP CONTROL HEADER ══════════ */}
      <header className="exam-hero-header">
        <div className="exam-header-left">
          <button
            onClick={() => {
              if (showAddForm) setShowAddForm(false);
              else if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              borderRadius: '0.75rem',
              padding: '0.55rem 0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <ArrowLeft size={16} /> {showAddForm ? 'Deneme Havuzuna Dön' : 'Geri'}
          </button>
          
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              <Sparkles size={13} /> Fiziki Deneme & Dijital Optik Merkezi
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
              {showAddForm ? 'Yeni Fiziki Deneme Optik Kodlama 📝' : 'Fiziki Deneme Sınavları & Optik Havuzu 📋'}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {showAddForm ? 'Özdebir, Töder, Kurumsal vb. fiziki denemelerin cevap anahtarını dijital optik forma kodlayın.' : 'Kayıtlı fiziki deneme sınavları, cevap anahtarları ve öğrenci ödev atama yönetimi.'}
            </p>
          </div>
        </div>

        <div className="exam-header-actions">
          {!showAddForm ? (
            <>
              <button
                onClick={() => setShowJsonModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.55rem 1.1rem', borderRadius: '0.75rem',
                  background: 'rgba(16,185,129,0.12)',
                  border: '1.5px solid #10b981',
                  color: '#34d399', fontWeight: 800, fontSize: '0.8rem',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <FileCode2 size={15} /> Toplu JSON Aktar
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.55rem 1.2rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
                }}
              >
                <Plus size={15} /> + Yeni Deneme Ekle
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.55rem 1.1rem', borderRadius: '0.75rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)', fontWeight: 800, fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={15} /> İptal & Geri Dön
            </button>
          )}
        </div>
      </header>

      {/* ══════════ 4 LIVE KPI METRIC CARDS (2x2 ON MOBILE) ══════════ */}
      <div className="exam-kpi-grid">
        <div className="exam-kpi-card" style={{ border: '1.5px solid var(--color-card-border)' }}>
          <div className="exam-kpi-icon" style={{ background: 'rgba(2,132,199,0.15)', color: '#38bdf8', border: '1px solid rgba(2,132,199,0.3)' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Kayıtlı Fiziki Deneme</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{physicalExamsDatabase.length} Deneme</span>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>Havuzda hazır</span>
          </div>
        </div>

        <div className="exam-kpi-card" style={{ border: '1.5px solid var(--color-card-border)' }}>
          <div className="exam-kpi-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
            <Layers size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Toplam Soru Havuzu</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{totalQuestionsInPool} Soru</span>
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>Cevap anahtarlı</span>
          </div>
        </div>

        <div className="exam-kpi-card" style={{ border: '1.5px solid var(--color-card-border)' }}>
          <div className="exam-kpi-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Award size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Sınav Formatları</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>LGS · TYT · AYT</span>
            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>Özel şablon destekli</span>
          </div>
        </div>

        <div className="exam-kpi-card" style={{ border: '1.5px solid var(--color-card-border)' }}>
          <div className="exam-kpi-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Ödev & Optik Sync</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>1-Tıkla Atama</span>
            <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700 }}>Öğrenci & Sınıf</span>
          </div>
        </div>
      </div>

      {/* ══════════ VIEW MODE 1: KAYITLI DENEMELER HAVUZU ══════════ */}
      {!showAddForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* ALL EXAMS CUMULATIVE ANALYTICS HERO BANNER */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            borderRadius: '1.25rem',
            padding: '1.25rem 1.6rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 8px 24px rgba(67, 56, 202, 0.25)',
            border: '1.5px solid #6366f1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '1rem',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                flexShrink: 0
              }}>
                <BarChart3 size={26} color="#fbbf24" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.01em' }}>
                    Tüm Denemelerin Toplam Analizi &amp; Karneler
                  </h3>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#10b981', color: 'white', padding: '0.15rem 0.55rem', borderRadius: 99 }}>
                    GENEL RAPOR
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#c7d2fe', fontWeight: 500 }}>
                  Tüm denemelerin sınıf net ortalamaları, öğrenci karne sıralamaları, gelişim grafikleri ve soru madde analizleri.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/exam-analysis/all')}
              style={{
                padding: '0.7rem 1.35rem',
                borderRadius: '0.85rem',
                background: '#ffffff',
                color: '#312e81',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <TrendingUp size={16} color="#4f46e5" />
              Tüm Analizleri Görüntüle ↗
            </button>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="exam-filter-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Deneme adı veya yayın ile ara..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'LGS', 'TYT', 'AYT', 'CUSTOM'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  style={{
                    padding: '0.5rem 0.85rem', borderRadius: '0.65rem',
                    border: formatFilter === f ? '1px solid #818cf8' : '1.5px solid var(--color-border-input)',
                    background: formatFilter === f ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                    color: formatFilter === f ? '#ffffff' : 'var(--color-text)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: formatFilter === f ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
                  }}
                >
                  {f === 'ALL' ? 'Tüm Formatlar' : f === 'CUSTOM' ? 'Özel' : f}
                </button>
              ))}
            </div>
          </div>

          {/* EXAMS GRID */}
          <div className="exam-pool-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} color="#6366f1" />
                Fiziki Deneme Havuzu
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6' }}>
                  {filteredExams.length} Deneme
                </span>
              </h2>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.55rem 1.15rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)'
                }}
              >
                <Plus size={15} /> Yeni Deneme Girişi Yap
              </button>
            </div>

            {filteredExams.length === 0 ? (
              <div style={{
                border: '1.5px dashed var(--color-border-input)',
                borderRadius: '1.25rem', padding: '3.5rem 1.5rem', textAlign: 'center',
                color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem'
              }}>
                <ClipboardCheck size={48} style={{ opacity: 0.3 }} />
                <h3 style={{ margin: 0, color: 'var(--color-text)', fontWeight: 800, fontSize: '1.1rem' }}>Henüz Kaydedilmiş Fiziki Deneme Bulunmuyor</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: 460 }}>
                  Özdebir, Töder veya Kurumsal fiziki denemelerinizin cevap anahtarlarını dijital optik forma kodlayarak ilk kaydı oluşturun.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '0.65rem 1.35rem', borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                    border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)'
                  }}
                >
                  <Plus size={15} /> Yeni Fiziki Deneme Kodla
                </button>
              </div>
            ) : (
              <div className="exam-cards-grid">
                {filteredExams.map(m => (
                  <div key={m.id} className="exam-card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6', textTransform: 'uppercase' }}>
                            {m.publisher || 'LGS'}
                          </span>
                          {m.pdfUrl && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 99, background: 'rgba(2,132,199,0.15)', color: '#38bdf8', border: '1px solid rgba(2,132,199,0.3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Link2 size={10} /> PDF
                            </span>
                          )}
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                            {m.penaltyRatio ? `${m.penaltyRatio}Y = 1D` : 'Ceza Yok'}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.title}
                        </h3>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#34d399', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', flexShrink: 0 }}>
                        {m.totalQuestions || 0} Soru
                      </span>
                    </div>

                    {/* SUBJECT QUESTION BREAKDOWN */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                      {(m.subjects || []).slice(0, 4).map((s, sIdx) => (
                        <div key={sIdx} style={{ background: 'var(--color-surface-hover)', borderRadius: '0.6rem', padding: '0.4rem', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 800, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text)' }}>{s.count}S</span>
                        </div>
                      ))}
                    </div>

                    {/* ASSIGNED STUDENTS DRAWER */}
                    {(() => {
                      const asgs = examAssignmentsMap.get(m.id) || (toUUID(m.id) && examAssignmentsMap.get(toUUID(m.id))) || [];
                      const isAssignedOpen = Boolean(expandedAssignedExams[m.id]);

                      const studentCounts = new Map();
                      asgs.forEach(a => {
                        const sid = String(a.student?.id || '');
                        studentCounts.set(sid, (studentCounts.get(sid) || 0) + 1);
                      });
                      const duplicateStudentIds = new Set(
                        Array.from(studentCounts.entries()).filter(([sid, count]) => count > 1).map(([sid]) => sid)
                      );
                      const hasDuplicates = duplicateStudentIds.size > 0;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--color-border)' }}>
                          <button
                            type="button"
                            onClick={() => toggleAssignedAccordion(m.id)}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '0.65rem',
                              border: '1px solid var(--color-border)',
                              background: isAssignedOpen ? 'rgba(99,102,241,0.08)' : 'var(--color-surface-hover)',
                              color: 'var(--color-text)',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>👥 Atanan Öğrenciler</span>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                padding: '0.1rem 0.45rem',
                                borderRadius: 99,
                                background: asgs.length > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                                color: asgs.length > 0 ? '#10b981' : 'var(--color-text-muted)',
                                border: `1px solid ${asgs.length > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`
                              }}>
                                {asgs.length} Atama
                              </span>
                              {hasDuplicates && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.05rem 0.35rem', borderRadius: 99 }}>
                                  ⚠️ Çift Atama Var
                                </span>
                              )}
                            </span>
                            {isAssignedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isAssignedOpen && (
                            <div style={{
                              maxHeight: 200,
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                              padding: '0.45rem',
                              background: 'var(--color-surface)',
                              borderRadius: '0.65rem',
                              border: '1px solid var(--color-border)'
                            }}>
                              {asgs.length === 0 ? (
                                <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--color-text-muted)', padding: '0.4rem 0' }}>
                                  Henüz bu denemeyi alan öğrenci yok. "Ödev Ata" ile atayabilirsiniz.
                                </div>
                              ) : (
                                asgs.map((asg, aIdx) => {
                                  const isDup = duplicateStudentIds.has(String(asg.student.id));
                                  return (
                                    <div
                                      key={`${asg.homework.id}_${asg.student.id}_${aIdx}`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.4rem',
                                        padding: '0.35rem 0.5rem',
                                        borderRadius: '0.5rem',
                                        background: isDup ? 'rgba(245,158,11,0.07)' : 'var(--color-surface-hover)',
                                        border: `1px solid ${isDup ? 'rgba(245,158,11,0.35)' : 'var(--color-border)'}`,
                                        fontSize: '0.74rem'
                                      }}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                          <span style={{ fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            👤 {asg.student.name}
                                          </span>
                                          {isDup && (
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '0.05rem 0.3rem', borderRadius: 4 }}>
                                              Çift Atandı
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.67rem', color: 'var(--color-text-muted)' }}>
                                          <span>Son Teslim: {asg.homework.dueDate || 'Belirtilmedi'}</span>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                        {asg.isSolved ? (
                                          <span style={{
                                            fontSize: '0.67rem',
                                            fontWeight: 900,
                                            color: '#10b981',
                                            background: 'rgba(16,185,129,0.12)',
                                            border: '1px solid rgba(16,185,129,0.3)',
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '0.4rem'
                                          }}>
                                            ✅ Çözüldü {asg.correctCount !== null ? `(${asg.correctCount}D ${asg.wrongCount || 0}Y)` : ''}
                                          </span>
                                        ) : asg.isOverdue ? (
                                          <span style={{
                                            fontSize: '0.67rem',
                                            fontWeight: 900,
                                            color: '#ef4444',
                                            background: 'rgba(239,68,68,0.12)',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '0.4rem'
                                          }}>
                                            ⚠️ Gecikti
                                          </span>
                                        ) : (
                                          <span style={{
                                            fontSize: '0.67rem',
                                            fontWeight: 900,
                                            color: '#6366f1',
                                            background: 'rgba(99,102,241,0.12)',
                                            border: '1px solid rgba(99,102,241,0.3)',
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '0.4rem'
                                          }}>
                                            ⏳ Bekliyor
                                          </span>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveStudentAssignment(asg.homework, asg.student.id)}
                                          style={{
                                            background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            borderRadius: '0.4rem',
                                            padding: '0.2rem 0.4rem',
                                            cursor: 'pointer',
                                            color: '#dc2626',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            fontSize: '0.67rem',
                                            fontWeight: 800
                                          }}
                                          title="Bu öğrencinin atamasını sil"
                                        >
                                          <Trash2 size={11} /> Sil
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <button
                          onClick={() => navigate(`/exam-analysis/${m.id}`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <BarChart3 size={14} /> Analiz
                        </button>
                        <button
                          onClick={() => handleViewExamDetails(m)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={14} /> Detaylar
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => setAssignModalExam(m)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                            background: 'linear-gradient(135deg,#059669,#10b981)',
                            border: 'none', color: 'white', fontWeight: 900, fontSize: '0.72rem',
                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.25)'
                          }}
                        >
                          Ödev Ata
                        </button>
                        <button
                          onClick={() => handleDeleteExam(m)}
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.35rem', cursor: 'pointer', color: '#dc2626', display: 'flex' }}
                          title="Denemeyi Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ VIEW MODE 2: YENİ FİZİKİ DENEME VE OPTİK FORM GİRİŞİ ══════════ */}
      {showAddForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* TOP CONFIG BAR */}
          <div style={{
            background: 'var(--color-card-bg)',
            border: '1.5px solid var(--color-card-border)',
            borderRadius: '1.5rem', padding: '1.5rem',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#6366f1" /> Sınav Formatı Seçimi
            </h3>

            {/* PRESET SELECTOR (2x2 ON MOBILE) */}
            <div className="exam-preset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {Object.keys(EXAM_PRESETS).map(key => {
                const isSel = examType === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleExamTypeChange(key)}
                    className="exam-preset-btn"
                    style={{
                      padding: '0.85rem 1rem', borderRadius: '1rem',
                      border: isSel ? '1.5px solid #818cf8' : '1.5px solid var(--color-border)',
                      background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                      color: isSel ? '#ffffff' : 'var(--color-text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      boxShadow: isSel ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>{key === 'CUSTOM' ? 'Özel / Boş Şablon' : `${key} Sınavı`}</span>
                    <span style={{ fontSize: '0.7rem', color: isSel ? '#c7d2fe' : 'var(--color-text-muted)', fontWeight: 700 }}>
                      {subjects.length > 0 ? `${subjects.reduce((a, s) => a + s.count, 0)} Soru` : 'Boş (Elle / JSON)'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* INPUTS & OPTIONAL PENALTY RATIO SELECTOR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Fiziki Deneme Adı / Yayın *</label>
                <input
                  type="text"
                  placeholder="Örn: Özdebir LGS Genel Deneme 1"
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Deneme Tarihi</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>PDF Linki (İsteğe Bağlı)</label>
                <input
                  type="url"
                  value={examPdfUrl}
                  onChange={e => setExamPdfUrl(e.target.value)}
                  placeholder="https://drive.google.com/... veya PDF linki"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Değerlendirme (Ceza Kuralı)</label>
                <select
                  value={penaltyRatio}
                  onChange={e => setPenaltyRatio(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                >
                  <option value={3}>📐 3 Yanlış 1 Doğruyu Götürür (LGS Standart)</option>
                  <option value={4}>🏛️ 4 Yanlış 1 Doğruyu Götürür (YKS Standart)</option>
                  <option value={0}>✨ Yanlışlar Doğruyu Götürmüyor (0 Yanlış)</option>
                  <option value={2}>⚡ 2 Yanlış 1 Doğruyu Götürür</option>
                  <option value={5}>🎯 5 Yanlış 1 Doğruyu Götürür</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Şık Sayısı</label>
                <select
                  value={optionCount}
                  onChange={e => setOptionCount(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                >
                  <option value={4}>4 Şık (A, B, C, D — LGS & Ortaokul)</option>
                  <option value={5}>5 Şık (A, B, C, D, E — YKS & Lise)</option>
                  <option value={3}>3 Şık (A, B, C — İlkokul)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Soru Başına Süre</label>
                <select
                  value={timePerQuestion}
                  onChange={e => setTimePerQuestion(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                >
                  <option value={1}>1.0 dk / Soru</option>
                  <option value={1.35}>1.35 dk / Soru (TYT Standart)</option>
                  <option value={1.5}>1.5 dk / Soru</option>
                  <option value={2}>2.0 dk / Soru (LGS Standart)</option>
                  <option value={2.5}>2.5 dk / Soru</option>
                  <option value={3}>3.0 dk / Soru</option>
                </select>
              </div>
            </div>
          </div>

          {/* DERSLER VE CEVAP ANAHTARI OPTİK KODLAMA ALANI */}
          <div style={{
            background: 'var(--color-card-bg)',
            border: '1.5px solid var(--color-card-border)',
            borderRadius: '1.5rem', padding: '1.5rem',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="#d97706" />
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>
                  Dijital Optik Form & Cevap Anahtarı Kodlama
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                  {evaluationResults.totalFilled} / {evaluationResults.totalQuestions} Kodlandı
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.45rem 0.9rem', borderRadius: '0.65rem',
                    background: 'var(--color-surface-hover)',
                    border: '1.5px solid var(--color-border-input)',
                    color: 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <Settings2 size={14} /> Ders / Soru Düzenle
                </button>
                <button
                  onClick={() => { setBulkInputText(''); setShowBulkModal(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.45rem 0.9rem', borderRadius: '0.65rem',
                    background: 'rgba(245,158,11,0.15)',
                    border: '1.5px solid rgba(245,158,11,0.3)',
                    color: '#fbbf24', fontWeight: 800, fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <Key size={14} /> Toplu Cevap Yapıştır
                </button>
              </div>
            </div>

            {subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                <AlertCircle size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 800, color: 'var(--color-text)', margin: '0 0 0.5rem' }}>Şu an hiç ders tanımlı değil!</p>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>Özel Şablon seçtiniz. Devam etmek için en az bir ders ekleyin.</p>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  style={{
                    marginTop: 12, padding: '0.55rem 1.1rem', borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                    border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Ders Ekle
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* SUBJECT TABS */}
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: 4 }}>
                  {subjects.map((sub, sIdx) => {
                    const isAct = activeSubjectIndex === sIdx;
                    const filled = (answerKey[sub.name] || []).filter(Boolean).length;
                    return (
                      <button
                        key={sub.name}
                        onClick={() => setActiveSubjectIndex(sIdx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '0.55rem 1rem', borderRadius: '0.85rem',
                          border: isAct ? '1.5px solid #818cf8' : '1.5px solid var(--color-border)',
                          background: isAct ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                          color: isAct ? '#ffffff' : 'var(--color-text)', fontWeight: 800, fontSize: '0.8rem',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                          boxShadow: isAct ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
                        }}
                      >
                        <span>{sub.name}</span>
                        <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: 99, background: isAct ? 'rgba(255,255,255,0.25)' : 'var(--color-surface)', color: isAct ? '#ffffff' : 'var(--color-text-muted)' }}>
                          {filled}/{sub.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ACTIVE SUBJECT OPTICAL BUBBLES */}
                {subjects[activeSubjectIndex] && (
                  <div style={{
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '1.25rem', padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        {subjects[activeSubjectIndex].name} — Optik Kodlama ({subjects[activeSubjectIndex].count} Soru)
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        Şıklara tıklayarak veya "Toplu Cevap Yapıştır" ile doldurun
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.65rem', maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                      {Array.from({ length: subjects[activeSubjectIndex].count }).map((_, qIdx) => {
                        const curAns = (answerKey[subjects[activeSubjectIndex].name] || [])[qIdx] || '';
                        const opts = subjects[activeSubjectIndex].options || ['A', 'B', 'C', 'D'];
                        return (
                          <div key={qIdx} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: curAns ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)',
                            border: `1.5px solid ${curAns ? '#3b82f6' : 'var(--color-border)'}`,
                            borderRadius: '0.75rem', padding: '0.45rem 0.75rem'
                          }}>
                            <span style={{ fontWeight: 900, fontSize: '0.8rem', color: curAns ? '#60a5fa' : 'var(--color-text)', minWidth: 32 }}>
                              {qIdx + 1}. Soru
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              {opts.map(opt => {
                                const isSelected = curAns === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleOptionClick(subjects[activeSubjectIndex].name, qIdx, opt)}
                                    style={{
                                      width: 28, height: 28, borderRadius: '50%',
                                      border: isSelected ? '1.5px solid #818cf8' : '1.5px solid var(--color-border-input)',
                                      background: isSelected ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface)',
                                      color: isSelected ? '#ffffff' : 'var(--color-text)', fontWeight: 900, fontSize: '0.75rem',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      boxShadow: isSelected ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                                      transition: 'all 0.15s ease'
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
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SAVE BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveExam}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.65rem 1.5rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.25)'
                }}
              >
                <CheckCircle2 size={16} /> Denemeyi Sisteme Ekle
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ══════════ MODAL: TOPLU CEVAP YAPIŞTIR ══════════ */}
      {showBulkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 480, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontWeight: 900, fontSize: '1rem' }}>
                <Key size={18} /> {subjects[activeSubjectIndex]?.name} — Cevap Anahtarı Yapıştır
              </div>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={15} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Cevapları yapıştırın (Örn: <code style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '0.1rem 0.4rem', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)' }}>ABCDABCD</code> veya <code style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '0.1rem 0.4rem', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)' }}>A, B, C, D</code>).
              <br/><strong style={{ color: '#fbbf24' }}>✨ Kaç soru girerseniz o kadarı sırayla uygulanır.</strong>
            </p>

            <form onSubmit={handleApplyBulkInput} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <textarea
                rows={4}
                placeholder="Örn: A B C D A B C D A B C D A B C D A B C D"
                value={bulkInputText}
                onChange={e => setBulkInputText(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.1em' }}
              />

              {parsedBulkInput.length > 0 && (
                <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(37,99,235,0.12)', border: '1px solid #3b82f6', fontSize: '0.78rem', color: '#60a5fa', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} color="#34d399" />
                    {parsedBulkInput.length} Soru Cevabı Algılandı (1 - {Math.min(parsedBulkInput.length, subjects[activeSubjectIndex]?.count || 20)}):
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-text)', wordBreak: 'break-all' }}>
                    {parsedBulkInput.slice(0, subjects[activeSubjectIndex]?.count || 20).join(' - ')}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowBulkModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={parsedBulkInput.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.55rem 1.25rem', borderRadius: '0.65rem',
                    background: 'linear-gradient(135deg,#d97706,#f59e0b)',
                    border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900,
                    cursor: parsedBulkInput.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: parsedBulkInput.length === 0 ? 0.5 : 1,
                    boxShadow: '0 4px 14px rgba(245,158,11,0.25)'
                  }}
                >
                  <Sparkles size={14} /> Cevap Anahtarını Uygula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: DENEME DETAYLARI & CEVAP ANAHTARI ══════════ */}
      {viewingExamDetails && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 640, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ flex: 1, marginRight: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {isEditingExam ? (
                    <select
                      value={editingExamMeta.publisher}
                      onChange={(e) => setEditingExamMeta(p => ({ ...p, publisher: e.target.value }))}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 900, outline: 'none' }}
                    >
                      {['LGS', 'TYT', 'AYT', 'Özdebir', 'Töder', 'Sinan Kuzucu', 'Nartest', 'Okyanus', 'Özel'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 99, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6', textTransform: 'uppercase' }}>
                      {viewingExamDetails.publisher || 'LGS'} Sınav Önizlemesi
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    {viewingExamDetails.date || new Date(viewingExamDetails.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                {isEditingExam ? (
                  <input
                    type="text"
                    value={editingExamMeta.title}
                    onChange={(e) => setEditingExamMeta(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '1rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: 'var(--color-text)', lineHeight: 1.2 }}>{viewingExamDetails.title}</h3>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!isEditingExam ? (
                  <button onClick={() => setIsEditingExam(true)} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.6rem', padding: '0.4rem 0.75rem', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Edit3 size={13} /> Düzenle
                  </button>
                ) : (
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#fbbf24', animation: 'pulse 1.5s infinite' }}>Düzenleme Modu</span>
                )}
                <button onClick={() => setViewingExamDetails(null)} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* QUICK SPECS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.55rem', textAlign: 'center' }}>
              
              {/* Toplam Soru */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.65rem 0.5rem', borderRadius: '0.85rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Toplam Soru</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>{viewingExamDetails.totalQuestions} Soru</span>
              </div>

              {/* Ceza Kuralı */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.65rem 0.5rem', borderRadius: '0.85rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Ceza Kuralı</span>
                {isEditingExam ? (
                  <select
                    value={editingExamMeta.penaltyRatio}
                    onChange={(e) => setEditingExamMeta(p => ({ ...p, penaltyRatio: Number(e.target.value) }))}
                    style={{ marginTop: 4, width: '100%', padding: '0.25rem 0.1rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 900, outline: 'none' }}
                  >
                    <option value={3}>3Y = 1D (LGS)</option>
                    <option value={4}>4Y = 1D (YKS)</option>
                    <option value={0}>Ceza Yok</option>
                    <option value={2}>2Y = 1D</option>
                  </select>
                ) : (
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fbbf24' }}>{viewingExamDetails.penaltyRatio ? `${viewingExamDetails.penaltyRatio}Y = 1D` : 'Ceza Yok'}</span>
                )}
              </div>

              {/* Şık Sayısı */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.65rem 0.5rem', borderRadius: '0.85rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Şık Sayısı</span>
                {isEditingExam ? (
                  <select
                    value={editingExamMeta.optionCount || 4}
                    onChange={(e) => setEditingExamMeta(p => ({ ...p, optionCount: Number(e.target.value) }))}
                    style={{ marginTop: 4, width: '100%', padding: '0.25rem 0.1rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: '#60a5fa', fontSize: '0.72rem', fontWeight: 900, outline: 'none' }}
                  >
                    <option value={4}>4 Şık (A-D)</option>
                    <option value={5}>5 Şık (A-E)</option>
                    <option value={3}>3 Şık (A-C)</option>
                  </select>
                ) : (
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#60a5fa' }}>
                    {viewingExamDetails.optionCount ? `${viewingExamDetails.optionCount} Şık` : (viewingExamDetails.publisher === 'LGS' ? '4 Şık (A-D)' : '5 Şık (A-E)')}
                  </span>
                )}
              </div>

              {/* Soru Başına Süre */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.65rem 0.5rem', borderRadius: '0.85rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Soru Başı Süre</span>
                {isEditingExam ? (
                  <select
                    value={editingExamMeta.timePerQuestion || 2}
                    onChange={(e) => setEditingExamMeta(p => ({ ...p, timePerQuestion: Number(e.target.value) }))}
                    style={{ marginTop: 4, width: '100%', padding: '0.25rem 0.1rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: '#34d399', fontSize: '0.72rem', fontWeight: 900, outline: 'none' }}
                  >
                    <option value={1}>1.0 dk / Soru</option>
                    <option value={1.35}>1.35 dk / Soru</option>
                    <option value={1.5}>1.5 dk / Soru</option>
                    <option value={2}>2.0 dk / Soru</option>
                    <option value={2.5}>2.5 dk / Soru</option>
                    <option value={3}>3.0 dk / Soru</option>
                  </select>
                ) : (
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34d399' }}>
                    ~{viewingExamDetails.timePerQuestion || 2} dk
                  </span>
                )}
              </div>

              {/* Ders Sayısı */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.65rem 0.5rem', borderRadius: '0.85rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Ders Sayısı</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#818cf8' }}>{viewingExamDetails.subjects?.length || 0} Ders</span>
              </div>
            </div>

            {/* PDF / DRIVE DOCUMENT LINK */}
            {isEditingExam ? (
              <div style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', borderRadius: '0.85rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Link2 size={14} color="#38bdf8" /> Soru Kitapçığı / PDF Linki (Google Drive, Dropbox veya Direkt Link)
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... veya PDF linki yapıştırın"
                    value={editingExamMeta.pdfUrl || ''}
                    onChange={(e) => setEditingExamMeta(p => ({ ...p, pdfUrl: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.6rem',
                      border: '1px solid var(--color-border-input)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                  {editingExamMeta.pdfUrl && (
                    <a
                      href={editingExamMeta.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '0.6rem',
                        background: 'rgba(2,132,199,0.15)',
                        border: '1px solid rgba(2,132,199,0.3)',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <ExternalLink size={12} /> Test Et
                    </a>
                  )}
                </div>
              </div>
            ) : (
              viewingExamDetails.pdfUrl ? (
                <div style={{ background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.25)', borderRadius: '0.85rem', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>
                    <Link2 size={15} color="#38bdf8" /> Soru Kitapçığı PDF Linki Ekli
                  </div>
                  <a
                    href={viewingExamDetails.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(2,132,199,0.2)',
                      border: '1px solid #0284c7',
                      color: '#38bdf8',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ExternalLink size={12} /> PDF'i Aç
                  </a>
                </div>
              ) : null
            )}

            {/* SUBJECTS & ANSWER KEYS BREAKDOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
                <Key size={14} color="#fbbf24" /> Dersler ve Cevap Anahtarları:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(viewingExamDetails.subjects || []).map((sub, sIdx) => {
                  const subAnswers = isEditingExam ? (editingAnswerKey[sub.name] || []) : (viewingExamDetails.answerKey?.[sub.name] || []);
                  return (
                    <div key={sIdx} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
                          {sub.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isEditingExam && (
                            <input
                              type="text"
                              value={inlineInputs[sub.name] || ''}
                              onChange={(e) => handleInlineInputChange(sub.name, e.target.value, sub.count)}
                              placeholder="Cevaplar..."
                              style={{ width: 140, padding: '0.25rem 0.5rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.75rem', fontFamily: 'monospace', textTransform: 'uppercase', outline: 'none' }}
                            />
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            {sub.count} Soru
                          </span>
                        </div>
                      </div>

                      {/* Optical Answer Strip */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: 120, overflowY: 'auto', padding: '0.35rem', background: 'var(--color-surface)', borderRadius: '0.65rem', border: '1px solid var(--color-border)' }}>
                        {Array.from({ length: sub.count }).map((_, qIdx) => {
                          const ans = subAnswers[qIdx] || '-';
                          return (
                            <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 26, height: 32, borderRadius: '0.45rem', background: ans !== '-' ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)', border: `1px solid ${ans !== '-' ? '#3b82f6' : 'var(--color-border)'}`, fontSize: '0.7rem' }}>
                              <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{qIdx + 1}</span>
                              <span style={{ fontWeight: 900, color: ans !== '-' ? '#60a5fa' : 'var(--color-text-muted)' }}>{ans}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              {!isEditingExam ? (
                <button
                  onClick={() => {
                    const e = viewingExamDetails;
                    setViewingExamDetails(null);
                    setAssignModalExam(e);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}
                >
                  <Send size={15} /> Bu Denemeyi Öğrencilere Ata
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsEditingExam(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                    Vazgeç
                  </button>
                  <button onClick={handleSaveExamEdits} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.25rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}>
                    <Save size={14} /> Değişiklikleri Kaydet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: DERS & SORU SAYISI DÜZENLEME ══════════ */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 500, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto', color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontWeight: 900, fontSize: '1rem' }}>
                <Settings2 size={18} /> Ders Soru Sayıları & Özel Ders Ekle
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {subjects.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0, padding: '1rem' }}>Henüz tanımlı ders yok. Aşağıdan ekleyebilirsiniz.</p>
              ) : (
                subjects.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{s.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Soru Sayısı:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={s.count}
                        onChange={e => handleSubjectQuestionCountChange(s.name, e.target.value)}
                        style={{ width: 52, padding: '0.25rem 0.4rem', borderRadius: '0.45rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 900, textAlign: 'center', outline: 'none' }}
                      />
                      <button onClick={() => handleDeleteSubject(s.name)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ADD CUSTOM SUBJECT */}
            <form onSubmit={handleAddCustomSubject} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)' }}>+ Yeni Özel Ders Tanımla</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ders Adı (Örn: Geometri)"
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  style={{ padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                  required
                />
                <input
                  type="number"
                  placeholder="Soru Sayısı"
                  value={newSubCount}
                  onChange={e => setNewSubCount(e.target.value)}
                  style={{ padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none' }}
                  required
                />
                <select
                  value={newSubOptions}
                  onChange={e => setNewSubOptions(Number(e.target.value))}
                  style={{ padding: '0.55rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value={4}>4 Şıklı (A-D)</option>
                  <option value={5}>5 Şıklı (A-E)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  Kapat
                </button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.25rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}>
                  <Plus size={14} /> Dersi Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: TOPLU JSON AKTARIMI ══════════ */}
      {showJsonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 560, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 900, fontSize: '1rem' }}>
                <FileCode2 size={18} /> Toplu JSON ile Deneme Aktarımı
              </div>
              <button onClick={() => setShowJsonModal(false)} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={15} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Tüm deneme soru ve cevap anahtarlarını JSON formatında yapıştırarak optik formu tek tıkla saniyeler içinde doldurabilirsiniz.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(37,99,235,0.12)', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1px solid #3b82f6' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60a5fa' }}>📋 Örnek JSON Şablon Yapısı</span>
              <button
                type="button"
                onClick={handleCopySampleJson}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.4rem 0.85rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
              >
                <Copy size={13} /> {copiedNotice ? 'Şablon Kopyalandı!' : 'Şablonu Kopyala'}
              </button>
            </div>

            {jsonError && (
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={15} /> {jsonError}
              </div>
            )}

            <form onSubmit={handleImportJson} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <textarea
                rows={9}
                placeholder="Örnek JSON yapısını buraya yapıştırın..."
                value={jsonInputText}
                onChange={e => setJsonInputText(e.target.value)}
                style={{ width: '100%', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowJsonModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.55rem 1.25rem', borderRadius: '0.65rem',
                    background: 'linear-gradient(135deg,#059669,#10b981)',
                    border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900,
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)'
                  }}
                >
                  <Sparkles size={14} /> Optik Formu Doldur & İçe Aktar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: HIZLI ÖDEV ATA ══════════ */}
      {assignModalExam && (() => {
        const existingAssignedList = examAssignmentsMap.get(assignModalExam.id) || (toUUID(assignModalExam.id) && examAssignmentsMap.get(toUUID(assignModalExam.id))) || [];
        const assignedStudentMap = new Map();
        existingAssignedList.forEach(a => {
          assignedStudentMap.set(String(a.student.id), a);
        });

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '1.5rem', width: '100%', maxWidth: 520, padding: '1.75rem',
              border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 900, fontSize: '1rem' }}>
                  <CheckCircle2 size={18} /> "{assignModalExam.title}" Ödev Olarak Ata
                </div>
                <button onClick={() => setAssignModalExam(null)} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>📅 Son Teslim Tarihi *</label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={e => setAssignDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setAssignTargetMode('grade'); setAssignTargets([]); }}
                    style={{
                      flex: 1, padding: '0.55rem', borderRadius: '0.75rem',
                      border: assignTargetMode === 'grade' ? '1.5px solid #818cf8' : '1.5px solid var(--color-border-input)',
                      background: assignTargetMode === 'grade' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                      color: assignTargetMode === 'grade' ? '#ffffff' : 'var(--color-text)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
                    }}
                  >
                    Sınıf Bazlı ({curData.grades.length})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setAssignTargetMode('student'); setAssignTargets([]); }}
                    style={{
                      flex: 1, padding: '0.55rem', borderRadius: '0.75rem',
                      border: assignTargetMode === 'student' ? '1.5px solid #818cf8' : '1.5px solid var(--color-border-input)',
                      background: assignTargetMode === 'student' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--color-surface-hover)',
                      color: assignTargetMode === 'student' ? '#ffffff' : 'var(--color-text)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
                    }}
                  >
                    Öğrenci Bazlı ({students.length})
                  </button>
                </div>

                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem', borderRadius: '0.85rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                  {assignTargetMode === 'grade' ? (
                    curData.grades.map(g => {
                      const checked = assignTargets.includes(g.id);
                      return (
                        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.45rem 0.6rem', borderRadius: '0.6rem', background: checked ? 'rgba(37,99,235,0.12)' : 'var(--color-surface)', border: `1.5px solid ${checked ? '#818cf8' : 'var(--color-border)'}`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)' }}>
                          <input type="checkbox" checked={checked} onChange={() => setAssignTargets(p => p.includes(g.id) ? p.filter(id => id !== g.id) : [...p, g.id])} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎓 {g.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    students.map(s => {
                      const checked = assignTargets.includes(s.id);
                      const existingAsg = assignedStudentMap.get(String(s.id));
                      return (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0.45rem 0.6rem', borderRadius: '0.6rem', background: checked ? 'rgba(37,99,235,0.12)' : (existingAsg ? 'rgba(245,158,11,0.06)' : 'var(--color-surface)'), border: `1.5px solid ${checked ? '#818cf8' : (existingAsg ? 'rgba(245,158,11,0.3)' : 'var(--color-border)')}`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <input type="checkbox" checked={checked} onChange={() => setAssignTargets(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {s.name}</span>
                          </div>
                          {existingAsg && (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              color: existingAsg.isSolved ? '#10b981' : '#f59e0b',
                              background: existingAsg.isSolved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                              border: `1px solid ${existingAsg.isSolved ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                              padding: '0.1rem 0.4rem',
                              borderRadius: 4,
                              flexShrink: 0
                            }}>
                              {existingAsg.isSolved ? '✅ Çözüldü' : '⚠️ Zaten Atandı'}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => setAssignModalExam(null)} style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button onClick={handleQuickAssign} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.25rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}>
                  Ödevi Yayınla
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
