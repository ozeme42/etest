import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import {
  Filter, Plus, Trash2, X, Image, FileText, Code, FileJson,
  Type, FolderTree, Edit2, Eye, CheckCircle2, Check, ExternalLink,
  Layers, ArrowLeft, Globe, BookOpen, LayoutGrid, List,
  Ruler, TestTube2, BookCopy, MessageSquare, Sparkles,
  ChevronRight, GraduationCap, School, Search, Calendar
} from 'lucide-react';
import './QuestionBank.css';
import { idbSetPayload } from '../services/indexedDbService';
import PdfViewerWithControls from '../components/PdfViewerWithControls';

const JSON_TEMPLATE = `[
  {
    "questionText": "1) Türkiye'nin başkenti hangi şehirdir?",
    "options": ["İstanbul", "Ankara", "İzmir", "Bursa"],
    "correctAnswer": "B"
  },
  {
    "questionText": "2) Aşağıdakilerden hangisi asal sayıdır?",
    "options": ["4", "9", "13", "15"],
    "correctAnswer": "C"
  }
]`;

const subjectThemes = {
  'all_subjects': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    icon: GraduationCap,
    color: '#4f46e5',
    shadow: '0 12px 28px -5px rgba(79,70,229,0.45)'
  },
  'Matematik': {
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    icon: Ruler,
    color: '#2563eb',
    shadow: '0 10px 25px -5px rgba(37,99,235,0.4)'
  },
  'Fen Bilimleri': {
    bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    icon: TestTube2,
    color: '#0d9488',
    shadow: '0 10px 25px -5px rgba(13,148,136,0.4)'
  },
  'Türkçe': {
    bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    icon: BookCopy,
    color: '#ea580c',
    shadow: '0 10px 25px -5px rgba(234,88,12,0.4)'
  },
  'Sosyal Bilgiler': {
    bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    icon: Globe,
    color: '#9333ea',
    shadow: '0 10px 25px -5px rgba(147,51,234,0.4)'
  },
  'T.C. İnkılap Tarihi ve Atatürkçülük': {
    bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    icon: Globe,
    color: '#7c3aed',
    shadow: '0 10px 25px -5px rgba(124,58,237,0.4)'
  },
  'İngilizce': {
    bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    icon: MessageSquare,
    color: '#e11d48',
    shadow: '0 10px 25px -5px rgba(225,29,72,0.4)'
  },
  'Din Kültürü ve Ahlak Bilgisi': {
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    icon: Sparkles,
    color: '#0284c7',
    shadow: '0 10px 25px -5px rgba(2,132,199,0.4)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    icon: Layers,
    color: '#475569',
    shadow: '0 10px 25px -5px rgba(71,85,105,0.4)'
  }
};

const gradeThemes = {
  '5. Sınıf': {
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    icon: Sparkles,
    color: '#0284c7',
    shadow: '0 10px 25px -5px rgba(2,132,199,0.4)'
  },
  '6. Sınıf': {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    icon: BookOpen,
    color: '#059669',
    shadow: '0 10px 25px -5px rgba(5,150,105,0.4)'
  },
  '7. Sınıf': {
    bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    icon: Layers,
    color: '#d97706',
    shadow: '0 10px 25px -5px rgba(217,119,6,0.4)'
  },
  '8. Sınıf': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
    icon: GraduationCap,
    color: '#4f46e5',
    shadow: '0 10px 25px -5px rgba(79,70,229,0.45)'
  },
  'LGS Hazırlık': {
    bg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    icon: School,
    color: '#7c3aed',
    shadow: '0 10px 25px -5px rgba(124,58,237,0.45)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    icon: School,
    color: '#475569',
    shadow: '0 10px 25px -5px rgba(71,85,105,0.4)'
  }
};

import { getEmbeddablePdfUrl as getEmbeddableUrl } from '../utils/pdfUtils';
import { useAuth } from '../context/AuthContext';

export default function QuestionBank() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { questions: allQuestions, addQuestion, updateQuestion, deleteQuestion } = useQuestionBank();

  // Teacher sees ONLY questions created by themselves, Admin sees all
  const questions = useMemo(() => {
    if (currentUser?.role === 'admin') return allQuestions || [];
    return (allQuestions || []).filter(q => q.createdBy === currentUser?.id);
  }, [allQuestions, currentUser]);
  
  // Portal Overview Active Tab is always grades now
  const [overviewTab, setOverviewTab] = useState('grades');

  // Active Subject Page State: null = Overview Grid, s.id = Subject Page, 'all_subjects' = Tüm Dersler
  const [activeSubjectId, setActiveSubjectId] = useState(null);

  // Active Grade Page State: null = Overview Grid, g.id = Grade Page
  const [activeGradeId, setActiveGradeId] = useState(null);

  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // Type Selection Wizard Step (1: Select Type, 2: Fill Form)
  const [creationStep, setCreationStep] = useState(1);

  // Preview State for Error Checking
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // View mode: 'card' (rich cards) | 'row' (compact table rows)
  const [viewMode, setViewMode] = useState('card');

  // Visual Written Test Editor State for JSON / Bundles
  const [editableQuestionsList, setEditableQuestionsList] = useState([]);
  const [jsonEditMode, setJsonEditMode] = useState('visual'); // 'visual' | 'code'
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'coktan_secmeli',
    contentType: 'text',
    contentPayload: '',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    questionCount: 1,
    bulkAnswerKey: ''
  });

  const [opticAnswers, setOpticAnswers] = useState({});
  const [imageUrls, setImageUrls] = useState([]);
  const [imageAnswers, setImageAnswers] = useState({});
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handlePdfUploadForPreview = (file, questionId) => {
    if (!file || !questionId) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Pdf = e.target.result;
      await idbSetPayload(questionId, base64Pdf);
      updateQuestion(questionId, { contentPayload: base64Pdf });
      setPreviewQuestion(prev => (prev ? { ...prev, contentPayload: base64Pdf } : null));
    };
    reader.readAsDataURL(file);
  };

  const handleMultipleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const imageFiles = files.filter(f => f.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f.name.split('.').pop().toLowerCase()));

    if (imageFiles.length === 0) {
      handleFileSelected(files[0]);
      return;
    }

    if (imageFiles.length === 1 && files.length === 1) {
      handleFileSelected(files[0]);
      return;
    }

    const readAsDataURL = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, data: e.target.result, size: file.size / 1024 });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    try {
      const results = await Promise.all(imageFiles.map(readAsDataURL));
      const base64List = results.map(r => r.data);
      const totalKb = results.reduce((sum, r) => sum + r.size, 0).toFixed(1);

      setUploadedFileInfo({
        name: `${results.length} Adet Görsel Soru Dosyası`,
        size: `${totalKb} KB`,
        type: 'gorsel',
        data: results[0].data,
        count: results.length
      });

      setFormData(prev => ({
        ...prev,
        contentType: 'gorsel',
        contentPayload: base64List.join('\n\n'),
        questionCount: results.length,
        title: prev.title || `Görsel Soru Seti (${results.length} Soru)`
      }));

      setImageUrls(base64List);
      if (creationStep === 1) setCreationStep(2);
    } catch (err) {
      console.error('Toplu görsel yükleme hatası:', err);
    }
  };

  const handleFileSelected = (file) => {
    if (!file) return;

    const fileSizeStr = (file.size / 1024).toFixed(1) + ' KB';
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();

    // 1. Image Files (.png, .jpg, .jpeg, .webp, .gif)
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt) || file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setUploadedFileInfo({ name: fileName, size: fileSizeStr, type: 'gorsel', data: base64Data });
        setFormData(prev => ({
          ...prev,
          contentType: 'gorsel',
          contentPayload: base64Data,
          title: prev.title || fileName.replace(/\.[^/.]+$/, '')
        }));
        setImageUrls([base64Data]);
        if (creationStep === 1) setCreationStep(2);
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. PDF Files (.pdf)
    if (fileExt === 'pdf' || file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Pdf = e.target.result;
        setUploadedFileInfo({ name: fileName, size: fileSizeStr, type: 'pdf', data: base64Pdf });
        setFormData(prev => ({
          ...prev,
          contentType: 'pdf',
          contentPayload: base64Pdf,
          title: prev.title || fileName.replace(/\.pdf$/i, '')
        }));
        if (creationStep === 1) setCreationStep(2);
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. HTML Files (.html, .htm)
    if (['html', 'htm'].includes(fileExt) || file.type === 'text/html') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const htmlText = e.target.result;
        setUploadedFileInfo({ name: fileName, size: fileSizeStr, type: 'html', data: htmlText });
        setFormData(prev => ({
          ...prev,
          contentType: 'html',
          contentPayload: htmlText,
          title: prev.title || fileName.replace(/\.html?$/i, '')
        }));
        if (creationStep === 1) setCreationStep(2);
      };
      reader.readAsText(file);
      return;
    }

    // 4. JSON Files (.json)
    if (fileExt === 'json' || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const jsonText = e.target.result;
        try {
          const parsed = JSON.parse(jsonText);
          let qArray = [];
          if (Array.isArray(parsed)) {
            qArray = parsed;
          } else if (parsed.questions && Array.isArray(parsed.questions)) {
            qArray = parsed.questions;
          }

          const formattedQs = qArray.map((q, i) => ({
            id: `q_${i}_${Date.now()}`,
            questionText: q.questionText || q.question || q.title || `Soru ${i+1}`,
            options: q.options || q.choices || ['', '', '', ''],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : (typeof q.correctAnswer === 'string' ? ['A','B','C','D','E'].indexOf(q.correctAnswer.toUpperCase()) : 0)
          }));

          setUploadedFileInfo({ name: fileName, size: fileSizeStr, type: 'json', data: jsonText, count: formattedQs.length });
          setEditableQuestionsList(formattedQs);
          setFormData(prev => ({
            ...prev,
            contentType: 'json',
            contentPayload: JSON.stringify(formattedQs, null, 2),
            title: prev.title || fileName.replace(/\.json$/i, '')
          }));
          if (creationStep === 1) setCreationStep(2);
        } catch (err) {
          alert('Yüklenen JSON dosyası geçerli bir soru paketi formatında değil.');
        }
      };
      reader.readAsText(file);
      return;
    }

    alert('Lütfen geçerli bir Görsel (PNG/JPG), PDF, HTML veya JSON dosyası seçiniz.');
  };

  const activeSubject = useMemo(() => {
    if (!activeSubjectId) return null;
    if (activeSubjectId === 'all_subjects') {
      return { id: 'all_subjects', name: 'Tüm Dersler (Genel Portföy)' };
    }
    return curData.subjects.find(s => s.id === activeSubjectId) || null;
  }, [activeSubjectId, curData]);

  const activeGrade = useMemo(() => {
    if (!activeGradeId) return null;
    return curData.grades.find(g => g.id === activeGradeId) || null;
  }, [activeGradeId, curData]);

  const activeSubjectTheme = useMemo(() => {
    if (!activeSubject) return subjectThemes['Diğer'];
    if (activeSubject.id === 'all_subjects') return subjectThemes['all_subjects'];
    return subjectThemes[activeSubject.name] || subjectThemes['Diğer'];
  }, [activeSubject]);

  const activeGradeTheme = useMemo(() => {
    if (!activeGrade) return gradeThemes['Diğer'];
    return gradeThemes[activeGrade.name] || gradeThemes['Diğer'];
  }, [activeGrade]);

  const filteredSubjects = useMemo(() => {
    if (activeGradeId) {
      return curData.subjects.filter(s => s.gradeId === activeGradeId);
    }
    if (selectedGrade === 'all') return curData.subjects;
    return curData.subjects.filter(s => s.gradeId === selectedGrade);
  }, [activeGradeId, selectedGrade, curData]);

  const filteredUnits = useMemo(() => {
    if (activeSubjectId && activeSubjectId !== 'all_subjects') {
      return curData.units.filter(u => u.subjectId === activeSubjectId);
    }
    if (selectedSubject === 'all') return curData.units;
    return curData.units.filter(u => u.subjectId === selectedSubject);
  }, [activeSubjectId, selectedSubject, curData]);

  const filteredTopics = useMemo(() => {
    if (selectedUnit === 'all') {
      const unitIds = filteredUnits.map(u => u.id);
      return curData.topics.filter(t => unitIds.includes(t.unitId));
    }
    return curData.topics.filter(t => t.unitId === selectedUnit);
  }, [selectedUnit, filteredUnits, curData]);

  const getCurrentCategoryId = () => {
    if (selectedTopic && selectedTopic !== 'all') return selectedTopic;
    if (selectedUnit && selectedUnit !== 'all') return `unit_${selectedUnit}_all`;
    if (selectedSubject && selectedSubject !== 'all') return `sub_${selectedSubject}_all`;
    if (activeSubjectId && activeSubjectId !== 'all_subjects') return `sub_${activeSubjectId}_all`;
    if (activeGradeId) return `grade_${activeGradeId}_all`;
    if (selectedGrade && selectedGrade !== 'all') return `grade_${selectedGrade}_all`;
    return 'global_all';
  };

  const categoryId = getCurrentCategoryId();

  // Filtered questions for active page (Subject Page or Grade Page)
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // 1. Content type filter
      const matchType = selectedContentType === 'all' ? true : q.contentType === selectedContentType;
      if (!matchType) return false;

      // 2. Active Subject Filter
      if (activeSubjectId && activeSubjectId !== 'all_subjects') {
        const sUnits = curData.units.filter(u => u.subjectId === activeSubjectId).map(u => u.id);
        const sTopics = curData.topics.filter(t => sUnits.includes(t.unitId)).map(t => t.id);

        const belongsToSubject = sTopics.includes(q.topicId) || 
          sUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
          q.topicId === `sub_${activeSubjectId}_all`;

        if (!belongsToSubject) return false;
      }

      // 3. Active Grade Filter
      if (activeGradeId) {
        const gSubjects = curData.subjects.filter(s => s.gradeId === activeGradeId).map(s => s.id);
        const gUnits = curData.units.filter(u => gSubjects.includes(u.subjectId)).map(u => u.id);
        const gTopics = curData.topics.filter(t => gUnits.includes(t.unitId)).map(t => t.id);

        const belongsToGrade = gTopics.includes(q.topicId) || 
          gUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
          gSubjects.some(sId => q.topicId === `sub_${sId}_all`) || 
          q.topicId === `grade_${activeGradeId}_all`;

        if (!belongsToGrade) return false;
      }

      // 4. Dropdown Grade Filter
      if (selectedGrade && selectedGrade !== 'all') {
        const gradeSubjects = curData.subjects.filter(s => s.gradeId === selectedGrade).map(s => s.id);
        const gradeUnits = curData.units.filter(u => gradeSubjects.includes(u.subjectId)).map(u => u.id);
        const gradeTopics = curData.topics.filter(t => gradeUnits.includes(t.unitId)).map(t => t.id);
        
        const belongsToGrade = gradeTopics.includes(q.topicId) || 
          gradeUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
          gradeSubjects.some(sId => q.topicId === `sub_${sId}_all`) || 
          q.topicId === `grade_${selectedGrade}_all`;

        if (!belongsToGrade) return false;
      }

      // 5. Dropdown Subject Filter
      if (selectedSubject && selectedSubject !== 'all') {
        const subjectUnits = curData.units.filter(u => u.subjectId === selectedSubject).map(u => u.id);
        const subjectTopics = curData.topics.filter(t => subjectUnits.includes(t.unitId)).map(t => t.id);
        const belongsToSubject = subjectTopics.includes(q.topicId) || subjectUnits.some(uId => q.topicId === `unit_${uId}_all`) || q.topicId === `sub_${selectedSubject}_all`;
        if (!belongsToSubject) return false;
      }

      // 6. Dropdown Unit Filter
      if (selectedUnit && selectedUnit !== 'all') {
        const unitTopics = curData.topics.filter(t => t.unitId === selectedUnit).map(t => t.id);
        const belongsToUnit = unitTopics.includes(q.topicId) || q.topicId === `unit_${selectedUnit}_all` || q.topicId === selectedUnit;
        if (!belongsToUnit) return false;
      }

      // 7. Dropdown Topic Filter
      if (selectedTopic && selectedTopic !== 'all') {
        if (q.topicId !== selectedTopic) return false;
      }

      // 8. Search Query Filter (Checks Title, Question Text, Payload, Topic Name, Unit Name, Subject Name, Grade Name)
      if (searchQuery.trim() !== '') {
        const qStr = searchQuery.toLowerCase().trim();

        let topicName = '';
        let unitName = '';
        let subjectName = '';
        let gradeName = '';

        const topicObj = curData.topics.find(t => t.id === q.topicId);
        if (topicObj) {
          topicName = topicObj.name.toLowerCase();
          const unitObj = curData.units.find(u => u.id === topicObj.unitId);
          if (unitObj) {
            unitName = unitObj.name.toLowerCase();
            const subjectObj = curData.subjects.find(s => s.id === unitObj.subjectId);
            if (subjectObj) {
              subjectName = subjectObj.name.toLowerCase();
              const gradeObj = curData.grades.find(g => g.id === subjectObj.gradeId);
              if (gradeObj) gradeName = gradeObj.name.toLowerCase();
            }
          }
        } else if (q.topicId?.startsWith('unit_')) {
          const uId = q.topicId.replace('unit_', '').replace('_all', '');
          const unitObj = curData.units.find(u => u.id === uId);
          if (unitObj) {
            unitName = unitObj.name.toLowerCase();
            const subjectObj = curData.subjects.find(s => s.id === unitObj.subjectId);
            if (subjectObj) {
              subjectName = subjectObj.name.toLowerCase();
              const gradeObj = curData.grades.find(g => g.id === subjectObj.gradeId);
              if (gradeObj) gradeName = gradeObj.name.toLowerCase();
            }
          }
        } else if (q.topicId?.startsWith('sub_')) {
          const sId = q.topicId.replace('sub_', '').replace('_all', '');
          const subjectObj = curData.subjects.find(s => s.id === sId);
          if (subjectObj) {
            subjectName = subjectObj.name.toLowerCase();
            const gradeObj = curData.grades.find(g => g.id === subjectObj.gradeId);
            if (gradeObj) gradeName = gradeObj.name.toLowerCase();
          }
        } else if (q.topicId?.startsWith('grade_')) {
          const gId = q.topicId.replace('grade_', '').replace('_all', '');
          const gradeObj = curData.grades.find(g => g.id === gId);
          if (gradeObj) gradeName = gradeObj.name.toLowerCase();
        }

        const titleMatch = (q.title || q.name || '').toLowerCase().includes(qStr);
        const textMatch = (q.questionText || '').toLowerCase().includes(qStr);
        const payloadMatch = (q.contentPayload || '').toLowerCase().includes(qStr);
        const bundleMatch = q.questionsList?.some(item => (item.questionText || '').toLowerCase().includes(qStr));

        const topicMatch = topicName.includes(qStr);
        const unitMatch = unitName.includes(qStr);
        const subjectMatch = subjectName.includes(qStr);
        const gradeMatch = gradeName.includes(qStr);

        if (!titleMatch && !textMatch && !payloadMatch && !bundleMatch && !topicMatch && !unitMatch && !subjectMatch && !gradeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [questions, activeSubjectId, activeGradeId, selectedGrade, selectedSubject, selectedUnit, selectedTopic, selectedContentType, searchQuery, curData]);

  // Calculate total question count per subject
  const subjectCounts = useMemo(() => {
    const counts = {};
    curData.subjects.forEach(s => {
      const sUnits = curData.units.filter(u => u.subjectId === s.id).map(u => u.id);
      const sTopics = curData.topics.filter(t => sUnits.includes(t.unitId)).map(t => t.id);

      const matchCount = questions.filter(q => 
        sTopics.includes(q.topicId) || 
        sUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
        q.topicId === `sub_${s.id}_all`
      ).length;

      counts[s.id] = matchCount;
    });
    return counts;
  }, [curData, questions]);

  // Calculate total question count per grade
  const gradeCounts = useMemo(() => {
    const counts = {};
    curData.grades.forEach(g => {
      const gSubjects = curData.subjects.filter(s => s.gradeId === g.id).map(s => s.id);
      const gUnits = curData.units.filter(u => gSubjects.includes(u.subjectId)).map(u => u.id);
      const gTopics = curData.topics.filter(t => gUnits.includes(t.unitId)).map(t => t.id);

      const matchCount = questions.filter(q => 
        gTopics.includes(q.topicId) || 
        gUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
        gSubjects.some(sId => q.topicId === `sub_${sId}_all`) || 
        q.topicId === `grade_${g.id}_all`
      ).length;

      counts[g.id] = matchCount;
    });
    return counts;
  }, [curData, questions]);

  // Grouping Logic for Active Page View
  const groupedPageQuestions = useMemo(() => {
    const groups = {};
    filteredQuestions.forEach(q => {
      const topicObj = curData.topics.find(t => t.id === q.topicId);
      const unitObj = topicObj ? curData.units.find(u => u.id === topicObj.unitId) : null;
      const subjectObj = unitObj ? curData.subjects.find(s => s.id === unitObj.subjectId) : null;
      const gradeObj = subjectObj ? curData.grades.find(g => g.id === subjectObj.gradeId) : null;

      let key = 'Genel / Kategori Belirtilmemiş';
      let title = 'Genel Sorular';
      let subtitle = 'Kategori Atanmamış İçerikler';

      if (topicObj) {
        key = `${gradeObj?.name || ''}_${subjectObj?.name || 'Ders'}_${unitObj?.name || 'Ünite'}_${topicObj.name}`;
        title = `${subjectObj?.name || 'Ders'} ➔ ${unitObj?.name || 'Ünite'}`;
        subtitle = `Konu: ${topicObj.name}`;
      } else if (q.topicId?.startsWith('unit_')) {
        const uId = q.topicId.replace('unit_', '').replace('_all', '');
        const uObj = curData.units.find(u => u.id === uId);
        const sObj = uObj ? curData.subjects.find(s => s.id === uObj.subjectId) : null;
        key = `unit_${uId}`;
        title = `${sObj?.name || 'Ders'} ➔ ${uObj?.name || 'Ünite Soruları'}`;
        subtitle = `Tüm Ünite İçerikleri`;
      } else if (q.topicId?.startsWith('sub_')) {
        const sId = q.topicId.replace('sub_', '').replace('_all', '');
        const sObj = curData.subjects.find(s => s.id === sId);
        key = `sub_${sId}`;
        title = `${sObj?.name || 'Ders Soruları'}`;
        subtitle = `Tüm Ders İçerikleri`;
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          title,
          subtitle,
          gradeName: gradeObj?.name,
          unitName: unitObj?.name,
          topicName: topicObj?.name,
          items: []
        };
      }
      groups[key].items.push(q);
    });

    return Object.values(groups);
  }, [filteredQuestions, curData]);

  const resetForm = () => {
    setEditingQuestionId(null);
    setCreationStep(1);
    setEditableQuestionsList([]);
    setJsonEditMode('visual');
    setUploadedFileInfo(null);

    if (activeSubjectId && activeSubjectId !== 'all_subjects') {
      setSelectedSubject(activeSubjectId);
    } else {
      setSelectedSubject('all');
    }

    if (activeGradeId) {
      setSelectedGrade(activeGradeId);
    } else {
      setSelectedGrade('all');
    }

    setFormData({
      title: '',
      type: 'coktan_secmeli',
      contentType: 'text',
      contentPayload: '',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      questionCount: 1,
      bulkAnswerKey: ''
    });
    setOpticAnswers({});
    setImageUrls([]);
    setImageAnswers({});
  };

  const openEditModal = (q) => {
    setEditingQuestionId(q.id);
    setCreationStep(2);
    
    let keyStr = '';
    if (q.answerKey && Array.isArray(q.answerKey)) {
      keyStr = q.answerKey.join('').trimEnd();
    }

    setFormData({
      title: q.title || q.name || '',
      type: q.type || 'coktan_secmeli',
      contentType: q.contentType,
      contentPayload: q.contentPayload || '',
      questionText: q.questionText || '',
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer || 0,
      questionCount: q.questionCount || 1,
      bulkAnswerKey: keyStr
    });

    if (q.contentType === 'json' || q.questionsList) {
      if (q.questionsList && q.questionsList.length > 0) {
        setEditableQuestionsList(JSON.parse(JSON.stringify(q.questionsList)));
      } else if (q.contentPayload) {
        try {
          const parsed = JSON.parse(q.contentPayload);
          if (Array.isArray(parsed)) {
            const list = parsed.map((item, idx) => {
              let cAns = item.correctAnswer !== undefined ? item.correctAnswer : item.correctAnswerLetter;
              if (typeof cAns === 'string') {
                const upper = cAns.trim().toUpperCase();
                if (upper === 'A') cAns = 0;
                else if (upper === 'B') cAns = 1;
                else if (upper === 'C') cAns = 2;
                else if (upper === 'D') cAns = 3;
                else if (upper === 'E') cAns = 4;
              }
              return {
                id: `sub_${idx}_${Date.now()}`,
                questionText: item.questionText || `Soru ${idx + 1}`,
                options: item.options || ['A', 'B', 'C', 'D'],
                correctAnswer: typeof cAns === 'number' ? cAns : 0,
                type: item.type || 'coktan_secmeli'
              };
            });
            setEditableQuestionsList(list);
          }
        } catch (e) {
          setEditableQuestionsList([]);
        }
      }
      setJsonEditMode('visual');
    }
    
    if (q.contentType === 'pdf' || q.contentType === 'html') {
      const newOptic = {};
      if (q.answerKey) {
        q.answerKey.forEach((k, idx) => {
          if (k && k !== ' ') {
            newOptic[idx] = k.charCodeAt(0) - 65;
          }
        });
      }
      setOpticAnswers(newOptic);
    } else if (q.contentType === 'gorsel') {
      const urls = Array.isArray(q.imageUrls) && q.imageUrls.length > 0 
        ? q.imageUrls 
        : (q.contentPayload ? q.contentPayload.split(/\n\n|\n|\|/).map(u => u.trim()).filter(Boolean) : []);

      setImageUrls(urls);
      
      const qCount = q.questionCount || (urls.length > 0 ? urls.length : 1);

      const ansMap = {};
      if (Array.isArray(q.answerKey)) {
        q.answerKey.forEach((k, idx) => {
          if (k && k !== ' ') {
            ansMap[idx] = typeof k === 'number' ? k : (k.charCodeAt(0) - 65);
          }
        });
      } else if (q.imageAnswers) {
        Object.assign(ansMap, q.imageAnswers);
      } else if (q.questionsList && Array.isArray(q.questionsList)) {
        q.questionsList.forEach((subQ, idx) => {
          if (subQ.correctAnswer !== undefined) {
            ansMap[idx] = subQ.correctAnswer;
          }
        });
      } else {
        ansMap[0] = q.correctAnswer || 0;
      }
      setImageAnswers(ansMap);

      setFormData(prev => ({
        ...prev,
        questionCount: qCount,
        contentPayload: urls.join('\n\n')
      }));
    }
    
    setShowModal(true);
  };

  const handleSelectType = (val) => {
    let initialPayload = '';
    if (val === 'json') {
      initialPayload = JSON_TEMPLATE;
      try {
        const parsed = JSON.parse(JSON_TEMPLATE);
        const list = parsed.map((item, idx) => ({
          id: `sub_${idx}_${Date.now()}`,
          questionText: item.questionText,
          options: item.options || ['A', 'B', 'C', 'D'],
          correctAnswer: item.correctAnswer === 'B' ? 1 : (item.correctAnswer === 'C' ? 2 : 0),
          type: 'coktan_secmeli'
        }));
        setEditableQuestionsList(list);
      } catch (e) {
        setEditableQuestionsList([]);
      }
    }
    
    setFormData({
      ...formData,
      contentType: val,
      contentPayload: initialPayload
    });
    setOpticAnswers({});
    setImageUrls([]);
    setImageAnswers({});
    setJsonEditMode('visual');
    setCreationStep(2);
  };

  const handleBulkAnswerKeyChange = (val) => {
    setFormData(prev => ({ ...prev, bulkAnswerKey: val }));
    const letters = val.toUpperCase().replace(/[^A-E]/g, '').split('');
    const newOptic = {};
    letters.forEach((l, idx) => {
      newOptic[idx] = l.charCodeAt(0) - 65;
    });
    setOpticAnswers(newOptic);
    if (letters.length > 0) {
      setFormData(prev => ({ ...prev, questionCount: Math.max(prev.questionCount, letters.length) }));
    }
  };

  const handleAddVisualQuestion = () => {
    setEditableQuestionsList(prev => [
      ...prev,
      {
        id: `sub_${prev.length + 1}_${Date.now()}`,
        questionText: `${prev.length + 1}) Soru metnini yazınız...`,
        options: ['Şık A', 'Şık B', 'Şık C', 'Şık D'],
        correctAnswer: 0,
        type: 'coktan_secmeli'
      }
    ]);
  };

  const handleRemoveVisualQuestion = (index) => {
    setEditableQuestionsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateVisualQuestionText = (index, text) => {
    setEditableQuestionsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], questionText: text };
      return copy;
    });
  };

  const handleUpdateVisualOptionText = (qIndex, optIndex, text) => {
    setEditableQuestionsList(prev => {
      const copy = [...prev];
      const opts = [...(copy[qIndex].options || ['', '', '', ''])];
      opts[optIndex] = text;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleUpdateVisualCorrectAnswer = (qIndex, correctIdx) => {
    setEditableQuestionsList(prev => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], correctAnswer: correctIdx };
      return copy;
    });
  };

  const handleImagePayloadChange = (e) => {
    const val = e.target.value;
    const urls = val.split(/\n\n|\n|\|/).map(u => u.trim()).filter(Boolean);
    setImageUrls(urls);
    const count = urls.length > 0 ? urls.length : 1;
    setFormData(prev => ({ ...prev, contentPayload: val, questionCount: count }));
  };

  const handleImageBulkAnswerKeyChange = (val) => {
    setFormData(prev => ({ ...prev, bulkAnswerKey: val }));
    const letters = val.toUpperCase().replace(/[^A-E]/g, '').split('');
    const newAnswers = {};
    letters.forEach((l, idx) => {
      newAnswers[idx] = l.charCodeAt(0) - 65;
    });
    setImageAnswers(newAnswers);
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!categoryId) return;

    // Determine correct subject and grade based on the current context
    let foundSubjectObj = null;

    if (categoryId && !categoryId.includes('_all')) {
      const selectedTopicObj = curData.topics.find(t => t.id === categoryId);
      const selectedUnitObj = selectedTopicObj ? curData.units.find(u => u.id === selectedTopicObj.unitId) : null;
      foundSubjectObj = selectedUnitObj ? curData.subjects.find(s => s.id === selectedUnitObj.subjectId) : null;
    }

    if (!foundSubjectObj && categoryId) {
      if (categoryId.startsWith('sub_')) {
        const sId = categoryId.split('_')[1];
        foundSubjectObj = curData.subjects.find(s => s.id === sId);
      } else if (categoryId.startsWith('unit_')) {
        const uId = categoryId.split('_')[1];
        const uObj = curData.units.find(u => u.id === uId);
        foundSubjectObj = uObj ? curData.subjects.find(s => s.id === uObj.subjectId) : null;
      }
    }

    if (!foundSubjectObj && selectedSubject && selectedSubject !== 'all') {
      foundSubjectObj = curData.subjects.find(s => s.id === selectedSubject);
    }
    if (!foundSubjectObj && activeSubjectId && activeSubjectId !== 'all_subjects') {
      foundSubjectObj = curData.subjects.find(s => s.id === activeSubjectId);
    }

    const foundSubject = foundSubjectObj ? foundSubjectObj.name : 'Genel Testler';
    const foundGradeId = foundSubjectObj ? foundSubjectObj.gradeId : (activeGradeId || 'g1');

    if (formData.contentType === 'json') {
      let questionsList = [];
      
      if (jsonEditMode === 'visual' && editableQuestionsList.length > 0) {
        questionsList = editableQuestionsList.map(q => ({
          ...q,
          type: q.type || 'coktan_secmeli'
        }));
      } else {
        try {
          const parsed = JSON.parse(formData.contentPayload);
          if (!Array.isArray(parsed)) throw new Error("JSON formatı bir dizi (array) olmalıdır.");
          
          questionsList = parsed.map((q, idx) => {
            let cAns = q.correctAnswer !== undefined ? q.correctAnswer : q.correctAnswerLetter;
            if (typeof cAns === 'string') {
              const upper = cAns.trim().toUpperCase();
              if (upper === 'A') cAns = 0;
              else if (upper === 'B') cAns = 1;
              else if (upper === 'C') cAns = 2;
              else if (upper === 'D') cAns = 3;
              else if (upper === 'E') cAns = 4;
            }
            return {
              id: `sub_${idx}_${Date.now()}`,
              questionText: q.questionText || `Soru ${idx + 1}`,
              options: q.options || ['A', 'B', 'C', 'D'],
              correctAnswer: typeof cAns === 'number' ? cAns : 0,
              type: q.type || 'coktan_secmeli'
            };
          });
        } catch (err) {
          alert("JSON Ayrıştırma Hatası: Lütfen formatı kontrol edin.\n\nDetay: " + err.message);
          return;
        }
      }

      const answerKey = questionsList.map(q => String.fromCharCode(65 + (q.correctAnswer || 0)));
      const payloadString = JSON.stringify(questionsList, null, 2);

      const bundleData = {
        title: formData.title || `Toplu Yazılı Test Paketi (${questionsList.length} Soru)`,
        topicId: categoryId,
        subject: foundSubject,
        gradeId: foundGradeId,
        contentType: 'json',
        type: formData.type || 'coktan_secmeli',
        isBundle: true,
        questionCount: questionsList.length,
        questionsList: questionsList,
        answerKey: answerKey,
        contentPayload: payloadString
      };

      if (editingQuestionId) {
        updateQuestion(editingQuestionId, bundleData);
      } else {
        addQuestion(bundleData);
      }

      setShowModal(false);
      resetForm();
      return;
    }

    const teacherId = currentUser?.id || 'admin';

    if (editingQuestionId) {
      if (formData.contentType === 'pdf' || formData.contentType === 'html') {
        const parsedKey = [];
        if (formData.type === 'coktan_secmeli') {
          for (let i = 0; i < formData.questionCount; i++) {
            if (opticAnswers[i] !== undefined) parsedKey.push(String.fromCharCode(65 + opticAnswers[i]));
            else parsedKey.push(' ');
          }
        }
        updateQuestion(editingQuestionId, {
          ...formData,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: true,
          answerKey: parsedKey,
          createdBy: formData.createdBy || teacherId
        });
      } else if (formData.contentType === 'gorsel') {
        const validUrls = imageUrls.length > 0 ? imageUrls : (formData.contentPayload ? formData.contentPayload.split(/\n\n|\n|\|/).map(u => u.trim()).filter(Boolean) : []);
        const totalQs = validUrls.length > 0 ? validUrls.length : (parseInt(formData.questionCount, 10) || 1);

        const parsedKey = [];
        for (let i = 0; i < totalQs; i++) {
          if (imageAnswers[i] !== undefined) {
            parsedKey.push(String.fromCharCode(65 + imageAnswers[i]));
          } else {
            parsedKey.push(' ');
          }
        }

        const isAcikUclu = formData.type === 'acik_uclu';
        const isSingleQuestion = totalQs <= 1;

        const subQuestions = isSingleQuestion ? [] : Array.from({ length: totalQs }).map((_, idx) => {
          const u = validUrls[idx] || validUrls[0] || formData.contentPayload || '';
          return {
            id: `subq_${idx}_${Date.now()}`,
            title: `Görsel Soru ${idx + 1}`,
            contentType: 'gorsel',
            contentPayload: u,
            type: formData.type || 'coktan_secmeli',
            options: isAcikUclu ? [] : ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: imageAnswers[idx] !== undefined ? imageAnswers[idx] : 0
          };
        });

        const finalPayload = validUrls.length > 0 ? validUrls.join('\n\n') : formData.contentPayload;

        updateQuestion(editingQuestionId, {
          ...formData,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: !isSingleQuestion,
          questionCount: totalQs,
          imageUrls: validUrls,
          contentPayload: finalPayload,
          questionsList: subQuestions,
          answerKey: parsedKey,
          imageAnswers: imageAnswers,
          createdBy: formData.createdBy || teacherId
        });
      } else {
        updateQuestion(editingQuestionId, {
          ...formData,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: false,
          createdBy: formData.createdBy || teacherId
        });
      }
    } else {
      if (formData.contentType === 'pdf' || formData.contentType === 'html') {
        const parsedKey = [];
        if (formData.type === 'coktan_secmeli') {
          for (let i = 0; i < formData.questionCount; i++) {
            if (opticAnswers[i] !== undefined) {
              parsedKey.push(String.fromCharCode(65 + opticAnswers[i]));
            } else {
              parsedKey.push(' ');
            }
          }
        }

        addQuestion({
          ...formData,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: true,
          answerKey: parsedKey,
          createdBy: teacherId
        });
      }
      else if (formData.contentType === 'gorsel') {
        const validUrls = imageUrls.length > 0 ? imageUrls : (formData.contentPayload ? formData.contentPayload.split(/\n\n|\n|\|/).map(u => u.trim()).filter(Boolean) : []);
        const totalQs = validUrls.length > 0 ? validUrls.length : (parseInt(formData.questionCount, 10) || 1);

        const parsedKey = [];
        for (let i = 0; i < totalQs; i++) {
          if (imageAnswers[i] !== undefined) {
            parsedKey.push(String.fromCharCode(65 + imageAnswers[i]));
          } else {
            parsedKey.push(' ');
          }
        }

        const isAcikUclu = formData.type === 'acik_uclu';
        const isSingleQuestion = totalQs <= 1;

        const subQuestions = isSingleQuestion ? [] : Array.from({ length: totalQs }).map((_, idx) => {
          const u = validUrls[idx] || validUrls[0] || formData.contentPayload || '';
          return {
            id: `subq_${idx}_${Date.now()}`,
            title: `Görsel Soru ${idx + 1}`,
            contentType: 'gorsel',
            contentPayload: u,
            type: formData.type || 'coktan_secmeli',
            options: isAcikUclu ? [] : ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: imageAnswers[idx] !== undefined ? imageAnswers[idx] : 0
          };
        });

        const finalPayload = validUrls.length > 0 ? validUrls.join('\n\n') : formData.contentPayload;

        addQuestion({
          ...formData,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: !isSingleQuestion,
          questionCount: totalQs,
          imageUrls: validUrls,
          contentPayload: finalPayload,
          questionsList: subQuestions,
          answerKey: parsedKey,
          imageAnswers: imageAnswers,
          createdBy: teacherId
        });
      }
      else {
        addQuestion({
          ...formData,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: false,
          createdBy: teacherId
        });
      }
    }
    
    setShowModal(false);
    resetForm();
  };

  const getTypeLabel = (q) => {
    if (q.isBundle) {
      if (q.contentType === 'pdf') return `PDF Test Paketi (${q.questionCount || 1} Soru)`;
      if (q.contentType === 'html') return `HTML Test Paketi (${q.questionCount || 1} Soru)`;
      return `Toplu Yazılı Test (${q.questionCount || 1} Soru)`;
    }
    switch(q.contentType) {
      case 'gorsel': return 'Görsel Soru';
      case 'pdf': return 'PDF Test Paketi';
      case 'html': return 'HTML Test Paketi';
      case 'json': return 'Yazılı Test Paketi';
      default: return 'Metin Sorusu';
    }
  };

  const getTypeIcon = (contentType, isBundle) => {
    if (contentType === 'pdf') return <FileText size={18} />;
    if (contentType === 'html') return <Globe size={18} />;
    if (isBundle) return <Layers size={18} />;
    switch(contentType) {
      case 'gorsel': return <Image size={18} />;
      case 'json': return <FileJson size={18} />;
      default: return <Type size={18} />;
    }
  };

  const showBundleFields = formData.contentType === 'pdf' || formData.contentType === 'html';

  const getQuestionHierarchyBadge = (q) => {
    let topicName = '';
    let unitName = '';
    let subjectName = '';

    const topicObj = curData.topics.find(t => t.id === q.topicId);
    if (topicObj) {
      topicName = topicObj.name;
      const unitObj = curData.units.find(u => u.id === topicObj.unitId);
      if (unitObj) {
        unitName = unitObj.name;
        const subjectObj = curData.subjects.find(s => s.id === unitObj.subjectId);
        if (subjectObj) subjectName = subjectObj.name;
      }
    } else if (q.topicId?.startsWith('unit_')) {
      const uId = q.topicId.replace('unit_', '').replace('_all', '');
      const unitObj = curData.units.find(u => u.id === uId);
      if (unitObj) {
        unitName = unitObj.name;
        const subjectObj = curData.subjects.find(s => s.id === unitObj.subjectId);
        if (subjectObj) subjectName = subjectObj.name;
      }
    } else if (q.topicId?.startsWith('sub_')) {
      const sId = q.topicId.replace('sub_', '').replace('_all', '');
      const subjectObj = curData.subjects.find(s => s.id === sId);
      if (subjectObj) subjectName = subjectObj.name;
    }

    const path = [subjectName, unitName, topicName].filter(Boolean).join(' ➔ ');
    return path ? `📌 ${path}` : null;
  };

  // ─── Content type config ────────────────────────────────────────────────────
  const contentConfig = {
    gorsel: { label: 'Görselli Test',   icon: '🖼️', bgFrom: '#f0fdf4', bgTo: '#dcfce7', border: '#86efac', accent: '#16a34a', badge: 'bg-green-100 text-green-800',  iconBg: 'linear-gradient(135deg,#22c55e,#16a34a)' },
    pdf:    { label: 'PDF Test',        icon: '📄', bgFrom: '#fff7ed', bgTo: '#ffedd5', border: '#fdba74', accent: '#ea580c', badge: 'bg-orange-100 text-orange-800', iconBg: 'linear-gradient(135deg,#f97316,#ea580c)' },
    html:   { label: 'Web Test',        icon: '🌐', bgFrom: '#f0f9ff', bgTo: '#e0f2fe', border: '#7dd3fc', accent: '#0284c7', badge: 'bg-sky-100 text-sky-800',        iconBg: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
    json:   { label: 'Metin Testi',     icon: '📚', bgFrom: '#faf5ff', bgTo: '#ede9fe', border: '#c4b5fd', accent: '#7c3aed', badge: 'bg-violet-100 text-violet-800',  iconBg: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
    text:   { label: 'Tek Soru',        icon: '📝', bgFrom: '#fefce8', bgTo: '#fef9c3', border: '#fde047', accent: '#ca8a04', badge: 'bg-yellow-100 text-yellow-800', iconBg: 'linear-gradient(135deg,#facc15,#ca8a04)' },
  };

const getAnswerKeyCount = (answerKey) => {
  if (!answerKey) return 0;
  if (Array.isArray(answerKey)) {
    return answerKey.filter(k => k && k !== ' ').length;
  }
  if (typeof answerKey === 'string') {
    return answerKey.replace(/\s+/g, '').length;
  }
  return 0;
};

  const renderQuestionCard = (q) => {
    const hierarchyBadge = getQuestionHierarchyBadge(q);
    const cfg = contentConfig[q.contentType] || contentConfig.text;

    // figure out image count
    const imgCount = Array.isArray(q.imageUrls) && q.imageUrls.length > 0
      ? q.imageUrls.length
      : (q.contentType === 'gorsel' ? 1 : 0);

    // question count label
    const qCount = q.questionsList?.length
      || q.questionCount
      || getAnswerKeyCount(q.answerKey)
      || (imgCount > 0 ? imgCount : null);

    // first image thumbnail
    const thumbUrl = Array.isArray(q.imageUrls) && q.imageUrls[0]
      ? q.imageUrls[0]
      : (q.contentType === 'gorsel' ? q.contentPayload : null);

    return (
      <div
        key={q.id}
        style={{
          background: `linear-gradient(145deg, ${cfg.bgFrom} 0%, ${cfg.bgTo} 100%)`,
          border: `1.5px solid ${cfg.border}`,
          borderRadius: '1.25rem',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        className="qbank-question-card hover:shadow-lg hover:-translate-y-0.5"
      >
        {/* ── TOP COLOURED STRIPE ── */}
        <div style={{ height: '4px', background: `linear-gradient(90deg,${cfg.accent},${cfg.border})` }} />

        {/* ── CARD BODY ── */}
        <div style={{ padding: '1.1rem 1.2rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>

          {/* ROW 1: icon + title + type badges */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>

            {/* Big content-type icon */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '1rem', flexShrink: 0,
              background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', boxShadow: `0 4px 12px ${cfg.accent}33`
            }}>
              {cfg.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title */}
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', lineHeight: 1.3, marginBottom: '0.35rem' }}>
                {q.title || q.name || cfg.label}
              </div>

              {/* Breadcrumb hierarchy */}
              {hierarchyBadge && (
                <div style={{ fontSize: '0.72rem', color: cfg.accent, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  {hierarchyBadge}
                </div>
              )}

              {/* Type badges row */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: cfg.iconBg, color: 'white',
                  fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '20px',
                  letterSpacing: '0.02em'
                }}>
                  {cfg.label}
                </span>
                <span style={{
                  background: q.type === 'coktan_secmeli' ? '#dcfce7' : '#fef3c7',
                  color: q.type === 'coktan_secmeli' ? '#166534' : '#92400e',
                  fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.55rem', borderRadius: '20px'
                }}>
                  {q.type === 'coktan_secmeli' ? '🔘 Çoktan Seçmeli' : '📝 Açık Uçlu'}
                </span>
              </div>
            </div>

            {/* Thumbnail (image tests only) */}
            {thumbUrl && (
              <div style={{ width: '56px', height: '56px', borderRadius: '0.75rem', overflow: 'hidden', border: `2px solid ${cfg.border}`, flexShrink: 0 }}>
                <img src={thumbUrl} alt="önizleme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>

          {/* ROW 2: STATS CHIPS */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {qCount && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.75)', border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: cfg.accent }}>
                <span>📊</span>
                <span>{qCount} Soru</span>
              </div>
            )}
            {q.contentType === 'gorsel' && imgCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.75)', border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: cfg.accent }}>
                <span>🖼️</span>
                <span>{imgCount} Görsel</span>
              </div>
            )}
            {getAnswerKeyCount(q.answerKey) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.75)', border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: cfg.accent }}>
                <span>🗝️</span>
                <span>Cevap Anahtarlı</span>
              </div>
            )}
            {q.contentType === 'text' && q.questionText && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, background: 'rgba(255,255,255,0.7)', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '0.25rem 0.7rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{q.questionText}"
              </div>
            )}
          </div>

          {/* ROW 3: ACTIONS */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: `1px solid ${cfg.border}55`, flexWrap: 'wrap' }}>
            <button
              onClick={() => setPreviewQuestion(q)}
              style={{ flex: 1, minWidth: '80px', background: cfg.iconBg, color: 'white', border: 'none', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: `0 3px 8px ${cfg.accent}33` }}
            >
              <Eye size={14} /> Önizle
            </button>
            <button
              onClick={() => navigate('/homeworks', { state: { autoSelectQuestionId: q.id } })}
              style={{ flex: 1, minWidth: '80px', background: '#10b981', color: 'white', border: 'none', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 3px 8px rgba(16,185,129,0.3)' }}
            >
              <Calendar size={14} /> Ödev Ata
            </button>
            <button
              onClick={() => openEditModal(q)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.8)', color: '#334155', border: `1.5px solid ${cfg.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, fontSize: '0.78rem' }}
            >
              <Edit2 size={14} /> Düzenle
            </button>
            <button
              onClick={() => deleteQuestion(q.id)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '0.75rem', background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, fontSize: '0.78rem' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── COMPACT ROW RENDERER (Table / Excel view) ──────────────────────────────
  const renderQuestionRow = (q, idx) => {
    const hierarchyBadge = getQuestionHierarchyBadge(q);
    const cfg = contentConfig[q.contentType] || contentConfig.text;
    const imgCount = Array.isArray(q.imageUrls) && q.imageUrls.length > 0 ? q.imageUrls.length : (q.contentType === 'gorsel' ? 1 : 0);
    const qCount = q.questionsList?.length || q.questionCount || getAnswerKeyCount(q.answerKey) || (imgCount > 0 ? imgCount : null);
    const thumbUrl = Array.isArray(q.imageUrls) && q.imageUrls[0] ? q.imageUrls[0] : (q.contentType === 'gorsel' ? q.contentPayload : null);

    return (
      <div key={q.id} style={{
        display: 'grid',
        gridTemplateColumns: '32px 44px 1fr auto auto auto auto auto',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 1rem',
        borderBottom: '1px solid #f1f5f9',
        background: idx % 2 === 0 ? 'white' : '#fafbff',
        transition: 'background 0.15s',
      }}
      className="qbank-row-item hover:bg-indigo-50/50"
      >
        {/* # */}
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textAlign: 'right' }}>{idx + 1}</span>

        {/* Type icon badge */}
        <div style={{ width: '36px', height: '36px', borderRadius: '0.6rem', background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
          {thumbUrl
            ? <img src={thumbUrl} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '0.6rem' }} onError={e => e.target.style.display='none'} />
            : cfg.icon}
        </div>

        {/* Title + breadcrumb */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {q.title || q.name || cfg.label}
          </div>
          {hierarchyBadge && (
            <div style={{ fontSize: '0.68rem', color: cfg.accent, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hierarchyBadge}
            </div>
          )}
        </div>

        {/* Content type chip */}
        <span style={{ background: cfg.iconBg, color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {cfg.icon} {cfg.label}
        </span>

        {/* Question type chip */}
        <span style={{ background: q.type === 'coktan_secmeli' ? '#dcfce7' : '#fef3c7', color: q.type === 'coktan_secmeli' ? '#166534' : '#92400e', fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {q.type === 'coktan_secmeli' ? '🔘 ÇS' : '📝 AÇ'}
        </span>

        {/* Soru sayısı */}
        {qCount
          ? <span style={{ fontSize: '0.72rem', fontWeight: 900, color: cfg.accent, background: `${cfg.border}55`, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>📊 {qCount}</span>
          : <span />
        }

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setPreviewQuestion(q)} title="Önizle" style={{ padding: '0.35rem 0.6rem', borderRadius: '0.5rem', background: cfg.iconBg, color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Eye size={13} /> Önizle
          </button>
          <button onClick={() => navigate('/homeworks', { state: { autoSelectQuestionId: q.id } })} title="Ödev Ata" style={{ padding: '0.35rem 0.6rem', borderRadius: '0.5rem', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={13} /> Ata
          </button>
          <button onClick={() => openEditModal(q)} title="Düzenle" style={{ padding: '0.35rem 0.5rem', borderRadius: '0.5rem', background: '#f1f5f9', color: '#334155', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => deleteQuestion(q.id)} title="Sil" style={{ padding: '0.35rem 0.5rem', borderRadius: '0.5rem', background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  // Helper: wraps items in either card grid or table
  const renderQList = (items, bgColor = '#fafafa') => {
    if (viewMode === 'row') {
      return (
        <div style={{ background: bgColor, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 44px 1fr auto auto auto auto', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textAlign: 'right' }}>#</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tür</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Başlık / Konu</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İçerik</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Format</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Soru</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İşlemler</span>
          </div>
          {items.map((q, idx) => renderQuestionRow(q, idx))}
        </div>
      );
    }
    return (
      <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', background: bgColor }}>
        {items.map(q => renderQuestionCard(q))}
      </div>
    );
  };


  const renderSearchResults = () => (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto 2.5rem auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', border: '1px solid #a5b4fc', padding: '1.25rem 1.75rem', borderRadius: '1.25rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 12px rgba(79,70,229,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, color: '#312e81', fontSize: '1.25rem' }}>
              "{searchQuery}" Arama Sonuçları
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#3730a3', fontWeight: 700 }}>
              {filteredQuestions.length} içerik/test bulundu.
            </p>
          </div>
        </div>
        <button onClick={() => setSearchQuery('')} style={{ background: 'white', border: '1.5px solid #818cf8', color: '#3730a3', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <X size={16} /> Aramayı Temizle
        </button>
      </div>
      {filteredQuestions.length === 0 ? (
        <div style={{ padding: '3.5rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '2px dashed #cbd5e1' }}>
          <Search size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>Sonuç bulunamadı.</h3>
        </div>
      ) : renderQList(filteredQuestions, 'transparent')}
    </div>
  );

  return (
    <div className="container dashboard">
      
      {/* ═════════════════════════════════════════════════════════════════════
          SCREEN A: MAIN PORTAL OVERVIEW (activeSubjectId === null && activeGradeId === null)
      ═════════════════════════════════════════════════════════════════════ */}
      {!activeSubjectId && !activeGradeId ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Centered Header */}
          <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', width: '100%' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0', textAlign: 'center' }}>
              Soru Bankası &amp; Ders Portalı 📚
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748b', margin: 0, fontWeight: 600, textAlign: 'center', maxWidth: '650px' }}>
              Soruları görüntülemek, yönetmek ve yeni içerik eklemek için bir ders veya sınıf kartına giriş yapın.
            </p>

            {currentUser?.role === 'teacher' && (
              <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af', padding: '0.35rem 0.85rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800 }}>
                <span>🔒 Öğretmen Özel Bankası: Sadece kendi eklediğiniz soru ve test içeriklerini görüyorsunuz.</span>
              </div>
            )}

            {/* SEARCH BAR ON MAIN PORTAL */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '540px', marginTop: '1.25rem' }}>
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#818cf8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Soru metni, test başlığı veya konuya göre ara..."
                style={{
                  width: '100%',
                  padding: '0.85rem 2.75rem 0.85rem 2.85rem',
                  borderRadius: '1rem',
                  border: '2px solid #a5b4fc',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  background: 'white',
                  boxShadow: '0 8px 20px -4px rgba(79,70,229,0.15)',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#64748b', padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </header>

          {/* IF SEARCH QUERY IS ACTIVE -> RENDER LINE-BY-LINE SEARCH RESULTS */}
          {searchQuery.trim() !== '' ? (
            renderSearchResults()
          ) : (
            <>
              {/* TAB: GRADE CARDS GRID (SINIF KARTLARI) */}
                <div className="qbank-grid">
                  <div
                    onClick={() => {
                      setActiveSubjectId('all_subjects');
                      setActiveGradeId(null);
                      setSelectedSubject('all');
                      setSelectedUnit('all');
                      setSelectedTopic('all');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                      borderRadius: '1.5rem',
                      padding: '1.75rem',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
                      border: '2px solid rgba(255,255,255,0.4)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      minHeight: '190px'
                    }}
                    className="qbank-card hover:scale-[1.03] hover:shadow-2xl transition-all"
                  >
                    <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.22, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                      <Layers size={130} />
                    </div>

                    <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                      <div className="card-icon-box" style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={28} color="white" />
                      </div>

                      <span className="card-badge" style={{ background: 'white', color: '#4f46e5', fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                        ⚡ {questions.length} İçerik / Test
                      </span>
                    </div>

                    <div className="card-bottom-row" style={{ position: 'relative', zIndex: 2, marginTop: '1.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.2 }}>🌟 Tüm İçerikler</h3>
                      <div className="card-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 800, opacity: 0.95 }}>
                        <span>Sistemdeki Tüm İçerikleri Göster</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>

                  {curData.grades.map(g => {
                    const theme = gradeThemes[g.name] || gradeThemes['Diğer'];
                    const Icon = theme.icon;
                    const count = gradeCounts[g.id] || 0;

                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          setActiveGradeId(g.id);
                          setSelectedSubject('all');
                          setSelectedUnit('all');
                          setSelectedTopic('all');
                        }}
                        style={{
                          background: theme.bg,
                          borderRadius: '1.5rem',
                          padding: '1.75rem',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: theme.shadow,
                          border: '1px solid rgba(255,255,255,0.2)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          minHeight: '190px'
                        }}
                        className="qbank-card hover:scale-[1.03] hover:shadow-2xl transition-all"
                      >
                        <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                          <Icon size={120} />
                        </div>

                        <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                          <div className="card-icon-box" style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={28} color="white" />
                          </div>

                          <span className="card-badge" style={{ background: 'white', color: theme.color, fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                            ⚡ {count} İçerik / Test
                          </span>
                        </div>

                        <div className="card-bottom-row" style={{ position: 'relative', zIndex: 2, marginTop: '1.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.2 }}>🎓 {g.name}</h3>
                          <div className="card-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 800, opacity: 0.9 }}>
                            <span>Sınıf Sayfasına Git</span>
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </>
          )}

        </div>
      ) : activeGradeId ? (
        /* ═════════════════════════════════════════════════════════════════════
            SCREEN B1: DEDICATED GRADE PAGE (activeGradeId !== null)
        ═════════════════════════════════════════════════════════════════════ */
        <div>
          
          {/* Top Bar with Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => setActiveGradeId(null)}
              style={{ background: 'white', border: '1.5px solid #cbd5e1', padding: '0.65rem 1.25rem', borderRadius: '0.85rem', fontWeight: 800, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}
            >
              <ArrowLeft size={18} /> Tüm Sınıf Portalı'na Dön
            </button>

            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{ background: activeGradeTheme.color, borderColor: activeGradeTheme.color, padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: activeGradeTheme.shadow }}
            >
              <Plus size={18} /> {activeGrade?.name} İçin Yeni Soru / Test Ekle
            </button>
          </div>

          {/* Dedicated Grade Hero Banner */}
          {(() => {
            const Icon = activeGradeTheme.icon;
            return (
              <div
                style={{
                  background: activeGradeTheme.bg,
                  borderRadius: '1.75rem',
                  padding: '2rem 2.5rem',
                  color: 'white',
                  marginBottom: '2rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: activeGradeTheme.shadow,
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem'
                }}
              >
                <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.18, transform: 'rotate(-10deg)', pointerEvents: 'none' }}>
                  <Icon size={180} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={34} color="white" />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
                      🎓 {activeGrade?.name} Dersleri
                    </h1>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                      Lütfen incelemek veya soru eklemek istediğiniz dersi seçin.
                    </p>
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <span style={{ background: 'white', color: activeGradeTheme.color, fontSize: '1rem', fontWeight: 900, padding: '0.5rem 1.25rem', borderRadius: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                    ⚡ {curData.subjects.filter(s => s.gradeId === activeGradeId).length} Ders Bulundu
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Subject Cards for this Grade */}
          <div className="qbank-grid">
            <div
              onClick={() => {
                setActiveSubjectId('all_subjects');
                setSelectedUnit('all');
                setSelectedTopic('all');
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '1.5rem',
                padding: '1.75rem',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                border: '2px solid rgba(255,255,255,0.4)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                minHeight: '190px'
              }}
              className="qbank-card hover:scale-[1.03] hover:shadow-2xl transition-all"
            >
              <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.22, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                <BookOpen size={130} />
              </div>

              <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                <div className="card-icon-box" style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={28} color="white" />
                </div>

                <span className="card-badge" style={{ background: 'white', color: '#10b981', fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                  ⚡ Tümünü Göster
                </span>
              </div>

              <div className="card-bottom-row" style={{ position: 'relative', zIndex: 2, marginTop: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.2 }}>📚 Tüm Dersler</h3>
                <div className="card-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 800, opacity: 0.95 }}>
                  <span>Bu Sınıfın Tüm İçerikleri</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>

            {curData.subjects.filter(s => s.gradeId === activeGradeId).map(s => {
              const theme = subjectThemes[s.name] || subjectThemes['Diğer'];
              const Icon = theme.icon;
              const count = subjectCounts[s.id] || 0;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSubjectId(s.id);
                    setSelectedUnit('all');
                    setSelectedTopic('all');
                  }}
                  style={{
                    background: theme.bg,
                    borderRadius: '1.5rem',
                    padding: '1.75rem',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: theme.shadow,
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    minHeight: '190px'
                  }}
                  className="qbank-card hover:scale-[1.03] hover:shadow-2xl transition-all"
                >
                  <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                    <Icon size={120} />
                  </div>

                  <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div className="card-icon-box" style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={28} color="white" />
                      </div>
                    </div>

                    <span className="card-badge" style={{ background: 'white', color: theme.color, fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                      ⚡ {count} İçerik / Test
                    </span>
                  </div>

                  <div className="card-bottom-row" style={{ position: 'relative', zIndex: 2, marginTop: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.2 }}>
                      {s.name}
                    </h3>
                    <div className="card-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 800, opacity: 0.95 }}>
                      <span>Ders Sayfasına Git</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
            
            {curData.subjects.filter(s => s.gradeId === activeGradeId).length === 0 && (
              <div style={{ padding: '3.5rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '2px dashed #cbd5e1', gridColumn: '1 / -1' }}>
                <BookOpen size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>Bu sınıfa ait ders bulunamadı.</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                  Yönetici panelinden bu sınıfa yeni dersler ekleyebilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════
            SCREEN B2: DEDICATED SUBJECT PAGE (activeSubjectId !== null)
        ═════════════════════════════════════════════════════════════════════ */
        <div>
          
          {/* Top Bar with Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => setActiveSubjectId(null)}
              style={{ background: 'white', border: '1.5px solid #cbd5e1', padding: '0.65rem 1.25rem', borderRadius: '0.85rem', fontWeight: 800, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}
            >
              <ArrowLeft size={18} /> Tüm Ders Portalı'na Dön
            </button>

            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{ background: activeSubjectTheme.color, borderColor: activeSubjectTheme.color, padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: activeSubjectTheme.shadow }}
            >
              <Plus size={18} /> {activeSubject?.name} İçin Yeni Soru / Test Ekle
            </button>
          </div>

          {/* Dedicated Subject Hero Banner */}
          {(() => {
            const Icon = activeSubjectTheme.icon;
            return (
              <div
                style={{
                  background: activeSubjectTheme.bg,
                  borderRadius: '1.75rem',
                  padding: '2rem 2.5rem',
                  color: 'white',
                  marginBottom: '2rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: activeSubjectTheme.shadow,
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem'
                }}
              >
                <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.18, transform: 'rotate(-10deg)', pointerEvents: 'none' }}>
                  <Icon size={180} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={34} color="white" />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
                      {activeSubject?.name} Soru Bankası &amp; Testleri
                    </h1>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                      Bu derse ait tüm özel üniteler, konular, sorular ve testler aşağıda listelenmiştir.
                    </p>
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <span style={{ background: 'white', color: activeSubjectTheme.color, fontSize: '1rem', fontWeight: 900, padding: '0.5rem 1.25rem', borderRadius: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                    ⚡ {filteredQuestions.length} İçerik Bulundu
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Subject Filter Bar */}
          <div className="card glass top-filter-bar" style={{ marginBottom: '1.75rem' }}>
            <div className="filter-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} /> {activeSubject?.name} Filtreleri
              </div>

              {/* SEARCH INPUT BAR */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Bu derste soru / test ara..."
                  style={{
                    width: '100%',
                    padding: '0.45rem 2rem 0.45rem 2.25rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'white'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.2rem' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="filter-grid">
              <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                <option value="all">Tüm Sınıflar (Genel)</option>
                {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              {activeSubjectId !== 'all_subjects' && (
                <>
                  <select value={selectedUnit} onChange={e => { setSelectedUnit(e.target.value); setSelectedTopic('all'); }}>
                    <option value="all">Tüm Üniteler (Genel)</option>
                    {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>

                  <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}>
                    <option value="all">Tüm Konular (Genel)</option>
                    {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </>
              )}

              <div className="filter-divider"></div>

              <select value={selectedContentType} onChange={e => setSelectedContentType(e.target.value)} style={{ background: 'var(--color-surface-hover)', borderColor: 'var(--color-primary-light)' }}>
                <option value="all">Tüm İçerik Türleri</option>
                <option value="text">Sadece Metin</option>
                <option value="json">Yazılı Test Paketleri</option>
                <option value="gorsel">Sadece Görsel</option>
                <option value="pdf">PDF Paketleri</option>
                <option value="html">HTML Paketleri</option>
              </select>

              {/* View toggle */}
              <div style={{ display: 'flex', gap: '0.3rem', background: '#f1f5f9', borderRadius: '0.65rem', padding: '0.25rem' }}>
                <button onClick={() => setViewMode('card')} title="Kart Görünümü" style={{ padding: '0.4rem 0.7rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', background: viewMode === 'card' ? 'white' : 'transparent', color: viewMode === 'card' ? '#4f46e5' : '#94a3b8', boxShadow: viewMode === 'card' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 900, fontSize: '0.78rem' }}>
                  <LayoutGrid size={15} /> Kart
                </button>
                <button onClick={() => setViewMode('row')} title="Satır Görünümü" style={{ padding: '0.4rem 0.7rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', background: viewMode === 'row' ? 'white' : 'transparent', color: viewMode === 'row' ? '#4f46e5' : '#94a3b8', boxShadow: viewMode === 'row' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 900, fontSize: '0.78rem' }}>
                  <List size={15} /> Satır
                </button>
              </div>
            </div>
          </div>

          {/* IF SEARCH QUERY IS ACTIVE -> RENDER LINE-BY-LINE SEARCH RESULTS */}
          {searchQuery.trim() !== '' ? (
            renderSearchResults()
          ) : (
            /* Categorical Grouping Inside Subject Page */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '2.5rem' }}>
              {groupedPageQuestions.map(group => (
                <div key={group.key} className="card glass" style={{ borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white' }}>
                  
                  {/* Category Header */}
                  <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1.15rem 1.5rem', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.65rem', background: activeSubjectTheme.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>
                          {group.title}
                        </h3>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
                          {group.subtitle}
                        </p>
                      </div>
                    </div>

                    <span style={{ background: 'white', color: activeSubjectTheme.color, fontWeight: 900, fontSize: '0.85rem', padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                      {group.items.length} İçerik / Test
                    </span>
                  </div>

                  {/* Question Cards - Card / Row toggle */}
                  {renderQList(group.items, '#fafafa')}

                </div>
              ))}

              {groupedPageQuestions.length === 0 && (
                <div className="card glass empty-state" style={{ padding: '3.5rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '2px dashed #cbd5e1' }}>
                  <BookOpen size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>
                    {activeSubject?.name} dersinde bu filtrelere uygun soru bulunamadı.
                  </h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                    Hemen yeni bir soru, PDF dokümanı veya test paketi ekleyebilirsiniz.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowModal(true); }}
                    style={{ background: activeSubjectTheme.color, borderColor: activeSubjectTheme.color, padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 900 }}
                  >
                    <Plus size={18} /> {activeSubject?.name} Dersine Soru Ekle
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          1. ULTRA WIDE & CENTERED EDIT / CREATE MODAL WINDOW
      ═════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
          <div className="modal-content card glass" style={{ width: '94vw', maxWidth: '1200px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '1.75rem', padding: '2.5rem', background: 'white', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {creationStep === 2 && !editingQuestionId && (
                  <button
                    type="button"
                    onClick={() => setCreationStep(1)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '0.6rem', fontSize: '0.85rem', fontWeight: 800, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ArrowLeft size={16} /> Tür Seçimine Dön
                  </button>
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {editingQuestionId ? '✏️ İçeriği / Testi Düzenle' : (creationStep === 1 ? '✨ İçerik Türü Seçiniz' : '➕ Soru / Test Detaylarını Giriniz')}
                </h3>
              </div>

              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }} style={{ borderRadius: '50%', padding: '0.6rem', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>
            
            {/* STEP 1: TYPE SELECTION WIZARD */}
            {creationStep === 1 && !editingQuestionId ? (
              <div>
                {/* FAST FILE UPLOAD DROPZONE */}
                <div style={{ background: '#f0f4ff', border: '2px dashed #6366f1', borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1.75rem', textAlign: 'center' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf,.html,.htm,.json"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleMultipleFilesSelected(e.target.files);
                        }
                      }}
                    />
                    <div style={{ width: 52, height: 52, borderRadius: '1rem', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
                      <Plus size={28} />
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e1b4b' }}>
                      📁 Bilgisayardan Doğrudan Dosya Yükleyin
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4338ca', fontWeight: 600 }}>
                      Görsel (PNG/JPG), PDF (.pdf), HTML (.html) veya JSON (.json) dosyanızı seçin veya buraya sürükleyin
                    </div>
                  </label>
                </div>

                <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600, marginBottom: '1.75rem', textAlign: 'center' }}>
                  Veya manuel içerik türü seçerek devam edin:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  
                  {/* Option 1: Single Text Question */}
                  <div
                    onClick={() => handleSelectType('text')}
                    style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      border: '2px solid #bfdbfe', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>
                      <Type size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e3a8a', margin: '0 0 0.35rem 0' }}>
                        📄 Sadece Metin (Tek Soru)
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Tek bir yazılı çoktan seçmeli veya açık uçlu soru metni ve şıklarını ekleyin.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Written Test Bundle */}
                  <div
                    onClick={() => handleSelectType('json')}
                    style={{
                      background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                      border: '2px solid #a5b4fc', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(79,70,229,0.3)' }}>
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#312e81', margin: '0 0 0.35rem 0' }}>
                        📝 Toplu Yazılı Test Paketi
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#3730a3', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Birden fazla yazılı sorudan oluşan toplu bir test ekleyin (Ekran üzerinden veya JSON ile).
                      </p>
                    </div>
                  </div>

                  {/* Option 3: Image Question */}
                  <div
                    onClick={() => handleSelectType('gorsel')}
                    style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      border: '2px solid #fcd34d', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: '#d97706', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(217,119,6,0.3)' }}>
                      <Image size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#78350f', margin: '0 0 0.35rem 0' }}>
                        🖼️ Görsel Soru (Tekli / Toplu)
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Bir veya birden fazla resim dosyası yükleyerek görsel soru veya sorular ekleyin.
                      </p>
                    </div>
                  </div>

                  {/* Option 4: PDF Test Bundle */}
                  <div
                    onClick={() => handleSelectType('pdf')}
                    style={{
                      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                      border: '2px solid #fca5a5', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: '#dc2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(220,38,38,0.3)' }}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#7f1d1d', margin: '0 0 0.35rem 0' }}>
                        📕 PDF Test Paketi
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Hazır bir PDF doküman dosyası yükleyin ve cevap anahtarını tanımlayın.
                      </p>
                    </div>
                  </div>

                  {/* Option 5: HTML Web Page / Code Test Bundle */}
                  <div
                    onClick={() => handleSelectType('html')}
                    style={{
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)',
                      border: '2px solid #6ee7b7', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.3)' }}>
                      <Globe size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#064e3b', margin: '0 0 0.35rem 0' }}>
                        🌐 HTML Web Sayfası / Testi
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#065f46', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        HTML dosyanızı doğrudan yükleyin veya canlı web adresi yapıştırın.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* STEP 2: TAILORED FORM & CONTENT INPUT DETAILS FOR SELECTED TYPE */
              <form onSubmit={handleSaveQuestion} className="q-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Header Banner indicating current selected type */}
                <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, color: '#3730a3', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getTypeIcon(formData.contentType, showBundleFields || formData.contentType === 'json')}
                    Seçili Tür: <strong>{getTypeLabel({ contentType: formData.contentType, isBundle: showBundleFields || formData.contentType === 'json' })}</strong>
                  </span>
                  {!editingQuestionId && (
                    <button
                      type="button"
                      onClick={() => setCreationStep(1)}
                      style={{ background: 'white', color: '#4f46e5', border: '1px solid #a5b4fc', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Değiştir
                    </button>
                  )}
                </div>

                {/* UPLOADED FILE BADGE DISPLAY IF ANY */}
                {uploadedFileInfo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '0.85rem 1.25rem', borderRadius: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ background: '#16a34a', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 99, textTransform: 'uppercase' }}>
                        {uploadedFileInfo.type} Yüklendi
                      </span>
                      <span style={{ fontWeight: 800, color: '#166534', fontSize: '0.9rem' }}>{uploadedFileInfo.name}</span>
                      <span style={{ color: '#15803d', fontSize: '0.75rem' }}>({uploadedFileInfo.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFileInfo(null)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Kaldır
                    </button>
                  </div>
                )}

                {/* Title & Soru Tipi Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div className="form-group" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.4rem', display: 'block' }}>
                      🏷️ Soru veya Test İsmi / Etiketi <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>(İsim verin)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Örn: 2024 LGS Matematik Denemesi A, Üslü Sayılar Testi..."
                      style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 600, background: 'white' }}
                    />
                  </div>

                  <div className="form-group" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.4rem', display: 'block' }}>
                      ✍️ Soru / Test Çözüm Tipi
                    </label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', width: '100%', fontSize: '0.95rem', fontWeight: 700, background: 'white' }}
                    >
                      <option value="coktan_secmeli">🔘 Çoktan Seçmeli (Optikli / Cevap Anahtarlı)</option>
                      <option value="acik_uclu">📝 Açık Uçlu (Metin Yanıtlı / Yazılı)</option>
                    </select>
                  </div>
                </div>

                {/* TYPE 1: PDF TEST BUNDLE FORM */}
                {formData.contentType === 'pdf' && (
                  <div className="form-group" style={{ background: '#fff5f5', border: '1.5px solid #fecaca', padding: '1.5rem', borderRadius: '1.25rem' }}>
                    <label style={{ fontWeight: 900, fontSize: '1rem', color: '#991b1b', marginBottom: '0.5rem', display: 'block' }}>
                      📕 PDF Dosyası Yükleyin veya Bağlantı Yapıştırın
                    </label>
                    
                    <div style={{ background: 'white', border: '2px dashed #fca5a5', padding: '1rem', borderRadius: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, color: '#dc2626', fontWeight: 800, fontSize: '0.9rem' }}>
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files && handleFileSelected(e.target.files[0])} />
                        📁 Bilgisayardan PDF Seç
                      </label>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 0.85rem 0' }}>
                      Veya PDF dosyasının doğrudan web linkini yapıştırın:
                    </p>
                    <input 
                      type="text" 
                      value={formData.contentPayload} 
                      onChange={e => setFormData({...formData, contentPayload: e.target.value})} 
                      placeholder="Örn: https://example.com/matematik-deneme.pdf veya Google Drive Linki" 
                      style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #fca5a5', width: '100%', fontSize: '0.95rem', background: 'white' }}
                      required 
                    />
                  </div>
                )}

                {/* TYPE 2: HTML FORM */}
                {formData.contentType === 'html' && (
                  <div className="form-group" style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', padding: '1.5rem', borderRadius: '1.25rem' }}>
                    <label style={{ fontWeight: 900, fontSize: '1rem', color: '#065f46', marginBottom: '0.5rem', display: 'block' }}>
                      🌐 HTML Dosyası Yükleyin veya Kod Yapıştırın
                    </label>

                    <div style={{ background: 'white', border: '2px dashed #6ee7b7', padding: '1rem', borderRadius: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, color: '#059669', fontWeight: 800, fontSize: '0.9rem' }}>
                        <input type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={e => e.target.files && handleFileSelected(e.target.files[0])} />
                        📁 Bilgisayardan HTML Dosyası Seç (.html)
                      </label>
                    </div>

                    <textarea 
                      rows="8" 
                      value={formData.contentPayload} 
                      onChange={e => setFormData({...formData, contentPayload: e.target.value})} 
                      placeholder="Canlı Web Adresi (https://...) veya HTML Kodları..." 
                      style={{ padding: '1rem', borderRadius: '0.75rem', border: '1.5px solid #6ee7b7', width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.5, background: '#0f172a', color: '#f8fafc' }}
                      required
                    ></textarea>
                  </div>
                )}

                {/* TYPE 3: VISUAL WRITTEN TEST EDITOR */}
                {formData.contentType === 'json' && (
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1.25rem', border: '1.5px solid #cbd5e1' }}>
                    
                    {/* Mode Switcher Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>
                          📝 Toplu Yazılı Test Düzenleme Alanı
                        </h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          Soruları görsel olarak ekran üzerinden rahatça düzenleyebilir veya yeni soru ekleyebilirsiniz.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ cursor: 'pointer', background: '#e0e7ff', color: '#3730a3', padding: '0.45rem 0.95rem', borderRadius: '0.6rem', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => e.target.files && handleFileSelected(e.target.files[0])} />
                          📁 JSON Dosyası Yükle
                        </label>
                        <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={() => setJsonEditMode('visual')}
                            style={{
                              padding: '0.45rem 0.95rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                              fontWeight: 800, fontSize: '0.85rem',
                              background: jsonEditMode === 'visual' ? '#4f46e5' : 'transparent',
                              color: jsonEditMode === 'visual' ? 'white' : '#475569'
                            }}
                          >
                            📝 Görsel Test Düzenleyici
                          </button>
                          <button
                            type="button"
                            onClick={() => setJsonEditMode('code')}
                            style={{
                              padding: '0.45rem 0.95rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                              fontWeight: 800, fontSize: '0.85rem',
                              background: jsonEditMode === 'code' ? '#0f172a' : 'transparent',
                              color: jsonEditMode === 'code' ? 'white' : '#475569'
                            }}
                          >
                            ⚡ Ham JSON Kodu
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VISUAL QUESTION CARDS EDIT MODE */}
                    {jsonEditMode === 'visual' ? (
                      <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                          {editableQuestionsList.map((qItem, qIdx) => (
                            <div key={qItem.id || qIdx} style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 900, fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: '6px' }}>
                                  Soru {qIdx + 1}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveVisualQuestion(qIdx)}
                                  style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Trash2 size={14} /> Soruyu Sil
                                </button>
                              </div>

                              {/* Question Text Input */}
                              <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>Soru Metni:</label>
                                <textarea
                                  rows="2"
                                  value={qItem.questionText || ''}
                                  onChange={e => handleUpdateVisualQuestionText(qIdx, e.target.value)}
                                  placeholder="Soru metnini buraya yazın..."
                                  style={{ padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '0.95rem' }}
                                />
                              </div>

                              {/* Option Inputs and Correct Answer Radio Buttons */}
                              {formData.type === 'coktan_secmeli' && (
                                <div>
                                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                                    Şıklar ve Doğru Cevap Seçimi:
                                  </label>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                    {(qItem.options || ['', '', '', '']).map((optText, oIdx) => {
                                      const isCorrect = qItem.correctAnswer === oIdx;
                                      return (
                                        <div 
                                          key={oIdx} 
                                          onClick={() => handleUpdateVisualCorrectAnswer(qIdx, oIdx)}
                                          style={{ 
                                            background: isCorrect ? '#ecfdf5' : '#f8fafc', 
                                            padding: '0.65rem 0.85rem', 
                                            borderRadius: '0.65rem', 
                                            border: isCorrect ? '2px solid #10b981' : '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.85rem', color: isCorrect ? '#059669' : '#475569' }}>
                                              {String.fromCharCode(65 + oIdx)}) Şıkkı
                                            </span>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: isCorrect ? '#059669' : '#94a3b8' }}>
                                              <input
                                                type="radio"
                                                name={`correct_${qIdx}`}
                                                checked={isCorrect}
                                                onChange={() => handleUpdateVisualCorrectAnswer(qIdx, oIdx)}
                                                style={{ cursor: 'pointer' }}
                                              />
                                              {isCorrect ? '✓ Doğru' : 'Seç'}
                                            </label>
                                          </div>
                                          <input
                                            type="text"
                                            value={optText}
                                            onChange={e => handleUpdateVisualOptionText(qIdx, oIdx, e.target.value)}
                                            placeholder={`${String.fromCharCode(65 + oIdx)} şıkkı metni`}
                                            style={{ padding: '0.45rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.85rem' }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddVisualQuestion}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '0.85rem', border: '2px dashed #818cf8', background: 'white', color: '#4f46e5', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <Plus size={18} /> Teste Yeni Soru Ekle
                        </button>
                      </div>
                    ) : (
                      /* CODE EDIT MODE */
                      <div>
                        <textarea
                          rows="12"
                          value={formData.contentPayload}
                          onChange={e => setFormData({...formData, contentPayload: e.target.value})}
                          placeholder="JSON verisini yapıştırın..."
                          style={{ padding: '1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.5, background: '#0f172a', color: '#f8fafc' }}
                        ></textarea>
                      </div>
                    )}

                  </div>
                )}

                {/* TYPE 4: IMAGE QUESTION FORM WITH CEVAP ANAHTARI */}
                {formData.contentType === 'gorsel' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group" style={{ background: '#fffbeb', border: '1.5px solid #fde68a', padding: '1.5rem', borderRadius: '1.25rem' }}>
                      <label style={{ fontWeight: 900, fontSize: '1rem', color: '#78350f', marginBottom: '0.5rem', display: 'block' }}>
                        🖼️ Resim / Görsel Yükleyin veya URL Yapıştırın
                      </label>

                      <div style={{ background: 'white', border: '2px dashed #fcd34d', padding: '1rem', borderRadius: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, color: '#d97706', fontWeight: 800, fontSize: '0.9rem' }}>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleMultipleFilesSelected(e.target.files);
                              }
                            }}
                          />
                          📁 Bilgisayardan Görsel Seç (PNG / JPG / WEBP)
                        </label>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0 0 0.85rem 0' }}>
                        Veya resim URL'lerini buraya alt alta yapıştırın:
                      </p>
                      <textarea 
                        rows={editingQuestionId ? "2" : "5"} 
                        value={formData.contentPayload} 
                        onChange={handleImagePayloadChange} 
                        placeholder="Resim URL'lerini buraya alt alta yapıştırın..." 
                        style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', width: '100%', fontFamily: 'inherit', fontSize: '0.95rem', background: 'white' }}
                        required
                      ></textarea>
                    </div>

                    {/* ANSWER KEY SECTION FOR MULTIPLE CHOICE IMAGE QUESTIONS */}
                    {formData.type === 'coktan_secmeli' ? (
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            <h4 style={{ margin: 0, fontWeight: 900, color: '#1e293b', fontSize: '1.05rem' }}>🔘 Görsel Sorular Cevap Anahtarı</h4>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Görsel soruların doğru cevap şıklarını belirleyin.</p>
                          </div>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 900, fontSize: '0.85rem', padding: '0.35rem 0.85rem', borderRadius: '20px' }}>
                            Toplam {imageUrls.length || 1} Görsel Soru
                          </span>
                        </div>
                        {/* FAST BULK ANSWER KEY STRING INPUT BOX FOR IMAGE QUESTIONS */}
                        <div style={{ marginBottom: '1.25rem', background: '#e0e7ff', padding: '1rem', borderRadius: '0.75rem', border: '1.5px solid #c7d2fe' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#3730a3', display: 'block', marginBottom: '0.35rem' }}>
                            ⚡ Hızlı Toplu Cevap Anahtarı Yapıştır / Gir:
                          </label>
                          <input
                            type="text"
                            value={formData.bulkAnswerKey}
                            onChange={e => handleImageBulkAnswerKeyChange(e.target.value)}
                            placeholder="Örn: ABCD veya A,B,C,D veya 1A 2B 3C 4D..."
                            style={{ padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid #818cf8', width: '100%', fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 800, background: 'white' }}
                          />
                        </div>

                        {/* LARGE READABLE VISUAL QUESTION CARDS WITH OPTIC BUBBLE BUTTONS */}
                        <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', padding: '0.25rem' }}>
                          {(imageUrls.length > 0 ? imageUrls : ['']).map((url, idx) => {
                            const selectedOpt = imageAnswers[idx];
                            return (
                              <div key={idx} style={{ background: 'white', padding: '1rem', borderRadius: '1rem', border: '1.5px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                  <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>🖼️ Görsel Soru {idx + 1}</span>
                                  {selectedOpt !== undefined && (
                                    <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 900, fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                                      ✓ Cevap: {String.fromCharCode(65 + selectedOpt)}
                                    </span>
                                  )}
                                </div>

                                {/* Large Readable Image Box */}
                                {url ? (
                                  <div
                                    onClick={() => setPreviewImage(url)}
                                    title="Görseli daha da büyütmek için tıklayın"
                                    style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '160px', maxHeight: '320px', overflow: 'hidden', cursor: 'pointer' }}
                                  >
                                    <img src={url} alt={`Görsel Soru ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.5rem' }} onError={e => { e.target.style.display = 'none'; }} />
                                  </div>
                                ) : (
                                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '0.75rem', fontSize: '0.85rem' }}>
                                    Resim yüklenmedi
                                  </div>
                                )}

                                {/* Optic Bubbles A B C D E */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9', alignItems: 'center' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', width: '100%' }}>Doğru Cevabı Seçin:</div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                    {['A', 'B', 'C', 'D', 'E'].map((letter, optIdx) => {
                                      const isSelected = selectedOpt === optIdx;
                                      return (
                                        <button
                                          key={letter}
                                          type="button"
                                          onClick={() => setImageAnswers({ ...imageAnswers, [idx]: isSelected ? undefined : optIdx })}
                                          style={{
                                            flex: 1,
                                            height: '42px',
                                            borderRadius: '0.65rem',
                                            border: isSelected ? '2px solid #059669' : '1.5px solid #cbd5e1',
                                            background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
                                            color: isSelected ? 'white' : '#334155',
                                            fontWeight: 900,
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.35)' : 'none',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center'
                                          }}
                                          className="hover:scale-105 active:scale-95"
                                          title={`Görsel Soru ${idx + 1} için ${letter} şıkkını seç`}
                                        >
                                          {letter}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    ) : (
                      /* OPEN-ENDED BANNER FOR IMAGE QUESTIONS */
                      <div style={{ background: '#fef3c7', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1.5px solid #fde68a' }}>
                        <p style={{ margin: 0, fontWeight: 800, color: '#78350f', fontSize: '0.85rem' }}>
                          📝 Görsel sorular "Açık Uçlu (Metin Yanıtlı)" olarak belirlenmiştir. Öğrenciler cevabı metin kutusuna yazacaklardır.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TYPE 5: SINGLE TEXT QUESTION FORM */}
                {formData.contentType === 'text' && (
                  <>
                    <div className="form-group">
                      <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#334155' }}>📝 Soru Metni</label>
                      <textarea 
                        rows="4" 
                        value={formData.questionText} 
                        onChange={e => setFormData({...formData, questionText: e.target.value})} 
                        placeholder="Soru metnini detaylıca yazın..." 
                        style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1.5 }}
                        required
                      ></textarea>
                    </div>

                    {formData.type === 'coktan_secmeli' && (
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '1rem', display: 'block' }}>
                          🔘 Soru Şıkları ve Doğru Cevap Seçimi:
                        </label>
                        <div className="options-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                          {formData.options.map((opt, idx) => {
                            const isSelected = formData.correctAnswer === idx;
                            return (
                              <div 
                                key={idx} 
                                onClick={() => setFormData({...formData, correctAnswer: idx})}
                                style={{ 
                                  background: isSelected ? '#ecfdf5' : 'white', 
                                  padding: '1rem', 
                                  borderRadius: '0.75rem', 
                                  border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                  <span style={{ fontWeight: 900, color: isSelected ? '#059669' : '#334155', fontSize: '0.95rem' }}>{String.fromCharCode(65 + idx)}) Şıkkı</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <input 
                                      type="radio" 
                                      name="correctAnswer" 
                                      checked={isSelected} 
                                      onChange={() => setFormData({...formData, correctAnswer: idx})}
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isSelected ? '#059669' : '#94a3b8' }}>
                                      {isSelected ? '✓ Doğru Şık' : 'Seç'}
                                    </span>
                                  </div>
                                </label>
                                <input 
                                  type="text" 
                                  value={opt} 
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    const newOpts = [...formData.options];
                                    newOpts[idx] = e.target.value;
                                    setFormData({...formData, options: newOpts});
                                  }} 
                                  placeholder={`${String.fromCharCode(65 + idx)} şıkkının metni`} 
                                  style={{ padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #cbd5e1', width: '100%', fontSize: '0.9rem' }}
                                  required
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* OPTIC ANSWER KEY & BULK STRING BUILDER FOR BUNDLE TESTS (PDF/HTML) */}
                {showBundleFields && (
                  formData.type === 'coktan_secmeli' ? (
                    <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontWeight: 900, color: '#1e293b', fontSize: '1.05rem' }}>🔘 Cevap Anahtarı Tablosu ve Soru Sayısı</h4>
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Paketteki her sorunun doğru şıkkını tek tek veya toplu olarak girin.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'white', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1' }}>
                          <label style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#334155' }}>Toplam Soru Sayısı:</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            value={formData.questionCount} 
                            onChange={e => setFormData({...formData, questionCount: parseInt(e.target.value, 10) || 1})}
                            style={{ width: '65px', padding: '0.35rem', borderRadius: '0.5rem', border: '1.5px solid #4f46e5', fontWeight: 900, textAlign: 'center', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      {/* 3-COLUMN INTERACTIVE OPTIC BUBBLE BUTTON GRID FOR PDF / HTML BUNDLES */}
                      <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', padding: '0.25rem' }}>
                        {Array.from({ length: formData.questionCount }).map((_, idx) => {
                          const selectedOpt = opticAnswers[idx];
                          return (
                            <div key={idx} style={{ background: 'white', padding: '0.65rem 1rem', borderRadius: '0.85rem', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                                Soru {idx + 1}
                              </div>

                              {/* Optic Bubbles A B C D E */}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {['A', 'B', 'C', 'D', 'E'].map((letter, optIdx) => {
                                  const isSelected = selectedOpt === optIdx;
                                  return (
                                    <button
                                      key={letter}
                                      type="button"
                                      onClick={() => setOpticAnswers({ ...opticAnswers, [idx]: isSelected ? undefined : optIdx })}
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        border: isSelected ? '2px solid #059669' : '1.5px solid #cbd5e1',
                                        background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                                        color: isSelected ? 'white' : '#334155',
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? '0 4px 10px rgba(16,185,129,0.35)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        lineHeight: '1',
                                        padding: 0
                                      }}
                                      className="hover:scale-110 active:scale-95"
                                      title={`Soru ${idx + 1} için ${letter} şıkkını doğru cevap olarak seç`}
                                    >
                                      {letter}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* OPEN-ENDED BUNDLE CONFIGURATION BANNER */
                    <div style={{ marginTop: '0.5rem', background: '#fef3c7', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #fde68a' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#92400e', fontSize: '1rem' }}>
                        📝 Açık Uçlu Test Yapılandırması
                      </h4>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#78350f' }}>
                        Bu test "Açık Uçlu (Yazılı Yanıtlı)" olarak belirlenmiştir. Öğrenciler şık işaretlemek yerine cevaplarını metin kutusuna yazacaklardır. Optik cevap anahtarı gerekmez.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'white', padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', width: 'fit-content' }}>
                        <label style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#78350f' }}>Toplam Soru Sayısı:</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          value={formData.questionCount} 
                          onChange={e => setFormData({...formData, questionCount: parseInt(e.target.value, 10) || 1})}
                          style={{ width: '65px', padding: '0.35rem', borderRadius: '0.5rem', border: '1.5px solid #d97706', fontWeight: 900, textAlign: 'center', fontSize: '0.95rem' }}
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Action Buttons */}
                <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '0.85rem', fontWeight: 800 }} onClick={() => { setShowModal(false); resetForm(); }}>İptal</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.95rem', fontSize: '1.05rem', fontWeight: 900 }}>
                    {editingQuestionId ? '✓ Değişiklikleri Kaydet' : '➕ İçeriği Kaydet ve Ekle'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* 2. RICH FULL QUESTION & TEST PREVIEW MODAL (HATA KONTROLÜ) */}
      {previewQuestion && (() => {
        const q = previewQuestion;
        const topicObj = curData.topics.find(t => t.id === q.topicId);
        const unitObj = topicObj ? curData.units.find(u => u.id === topicObj.unitId) : null;
        const subjectObj = unitObj ? curData.subjects.find(s => s.id === unitObj.subjectId) : null;
        const gradeObj = subjectObj ? curData.grades.find(g => g.id === subjectObj.gradeId) : null;

        return (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
            <div className="modal-content card glass" style={{ width: '94vw', maxWidth: '1150px', maxHeight: '92vh', overflowY: 'auto', padding: '2.5rem', borderRadius: '1.75rem', background: 'white' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    {(q.title || q.name) && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '8px', background: '#e0e7ff', color: '#3730a3' }}>
                        🏷️ {q.title || q.name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                      {getTypeLabel(q)}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '8px', background: q.type === 'coktan_secmeli' ? '#dcfce7' : '#fef3c7', color: q.type === 'coktan_secmeli' ? '#166534' : '#92400e' }}>
                      {q.type === 'coktan_secmeli' ? '🔘 Optikli / Çoktan Seçmeli' : '📝 Açık Uçlu (Yazılı)'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{gradeObj?.name || 'Genel'}</span> ➔ 
                    <span>{subjectObj?.name || 'Genel'}</span> ➔ 
                    <span>{unitObj?.name || 'Genel'}</span> ➔ 
                    <span style={{ color: '#4f46e5' }}>{topicObj?.name || 'Genel'}</span>
                  </div>
                </div>

                <button className="btn-icon" onClick={() => setPreviewQuestion(null)} style={{ borderRadius: '50%', padding: '0.5rem', background: '#f1f5f9' }}>
                  <X size={22} />
                </button>
              </div>

              {/* Status Banner */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '1rem', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#065f46', fontSize: '0.95rem', fontWeight: 800 }}>
                  <CheckCircle2 size={20} />
                  <span>Soru Önizleme &amp; Hata Kontrol Modu</span>
                </div>

                <button 
                  onClick={() => { const target = q; setPreviewQuestion(null); openEditModal(target); }} 
                  style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '0.65rem', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 6px rgba(79,70,229,0.2)' }}
                >
                  <Edit2 size={16} /> Soruyu Düzenle / Hata Düzelt
                </button>
              </div>

              {/* QUESTION BODY PREVIEW */}
              <div style={{ background: '#f8fafc', borderRadius: '1.25rem', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
                
                {/* 0. WRITTEN TEXT BUNDLE PREVIEW (questionsList for non-visual tests) */}
                {q.contentType !== 'gorsel' && (!q.imageUrls || q.imageUrls.length === 0) && q.questionsList && q.questionsList.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.25rem' }}>
                      📚 Toplu Yazılı Test Soruları ({q.questionsList.length} Soru - Art Arda Sıralı):
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                      {q.questionsList.map((qItem, iIdx) => (
                        <div key={iIdx} style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                            <span style={{ background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.8rem', padding: '0.2rem 0.65rem', borderRadius: '6px' }}>
                              Soru {iIdx + 1}
                            </span>
                          </div>

                          <h5 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                            {qItem.questionText}
                          </h5>

                          {qItem.options && qItem.options.length > 0 && q.type !== 'acik_uclu' && q.type !== 'yazili' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                              {qItem.options.map((opt, oIdx) => {
                                const isCorrect = qItem.correctAnswer === oIdx;
                                return (
                                  <div
                                    key={oIdx}
                                    style={{
                                      padding: '0.75rem 1rem', borderRadius: '0.75rem',
                                      border: isCorrect ? '2px solid #10b981' : '1px solid #e2e8f0',
                                      background: isCorrect ? '#ecfdf5' : 'white',
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ fontWeight: 900, width: '22px', height: '22px', borderRadius: '50%', background: isCorrect ? '#10b981' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isCorrect ? '#065f46' : '#334155' }}>{opt}</span>
                                    </div>
                                    {isCorrect && (
                                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}>
                                        <Check size={14} strokeWidth={3} /> Doğru
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. TEXT QUESTION PREVIEW */}
                {!q.questionsList && q.contentType === 'text' && (
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.25rem 0', lineHeight: 1.6 }}>
                      {q.questionText || 'Metin Sorusu'}
                    </h4>

                    {q.type === 'coktan_secmeli' && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctAnswer === oIdx;
                          return (
                            <div 
                              key={oIdx} 
                              style={{
                                padding: '0.95rem 1.15rem', borderRadius: '0.85rem', border: isCorrect ? '2px solid #10b981' : '1px solid #e2e8f0',
                                background: isCorrect ? '#ecfdf5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontWeight: 900, width: '26px', height: '26px', borderRadius: '50%', background: isCorrect ? '#10b981' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isCorrect ? '#065f46' : '#334155' }}>{opt}</span>
                              </div>
                              {isCorrect && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}>
                                  <Check size={14} strokeWidth={3} /> Doğru Şık
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. IMAGE QUESTION / BUNDLE PREVIEW */}
                {(q.contentType === 'gorsel' || (q.imageUrls && q.imageUrls.length > 0)) && (
                  <div style={{ textAlign: 'center' }}>
                    {q.questionText && (
                      <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', marginBottom: '1.25rem' }}>{q.questionText}</p>
                    )}

                    {/* RENDER ALL IMAGES WITH THEIR OPTIONS DIRECTLY UNDERNEATH */}
                    {(() => {
                      const rawList = [];
                      if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) {
                        q.imageUrls.forEach(u => {
                          if (u && typeof u === 'string') {
                            const parts = u.split(/\n\n|\n|\|/).map(p => p.trim()).filter(Boolean);
                            parts.forEach(p => { if (!rawList.includes(p)) rawList.push(p); });
                          }
                        });
                      }
                      if (rawList.length === 0 && q.contentPayload && typeof q.contentPayload === 'string') {
                        const parts = q.contentPayload.split(/\n\n|\n|\|/).map(p => p.trim()).filter(Boolean);
                        parts.forEach(p => { if (!rawList.includes(p)) rawList.push(p); });
                      }
                      const imageList = rawList.length > 0 ? rawList : (q.contentPayload ? [q.contentPayload] : []);

                      const getCorrectIdxForImg = (imgIdx) => {
                        if (Array.isArray(q.answerKey) && q.answerKey[imgIdx] && q.answerKey[imgIdx] !== ' ') {
                          return q.answerKey[imgIdx].toUpperCase().charCodeAt(0) - 65;
                        }
                        if (q.imageAnswers && q.imageAnswers[imgIdx] !== undefined) {
                          return q.imageAnswers[imgIdx];
                        }
                        if (imgIdx === 0 && q.correctAnswer !== undefined) {
                          return q.correctAnswer;
                        }
                        return -1;
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '1.5rem' }}>
                          {imageList.map((imgUrl, imgIdx) => {
                            const correctIdx = getCorrectIdxForImg(imgIdx);
                            return (
                              <div key={imgIdx} style={{ background: 'white', padding: '1.25rem', borderRadius: '1.25rem', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
                                <div style={{ fontWeight: 900, color: '#4f46e5', marginBottom: '0.85rem', fontSize: '0.95rem', textAlign: 'left' }}>
                                  🖼️ Görsel / Soru {imgIdx + 1} / {imageList.length}
                                </div>

                                <img 
                                  src={imgUrl} 
                                  alt={`Soru Görseli ${imgIdx + 1}`} 
                                  style={{ maxWidth: '100%', maxHeight: '550px', borderRadius: '0.75rem', objectFit: 'contain', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                                  onError={(e) => { e.target.alt = "Görsel yüklenemedi. Lütfen URL'yi kontrol edin."; }}
                                />

                                {/* OPTIONS DIRECTLY UNDER EACH IMAGE */}
                                {q.type === 'coktan_secmeli' && (
                                  <div style={{ marginTop: '1.15rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Soru {imgIdx + 1} Cevap Seçenekleri:
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                                      {['A', 'B', 'C', 'D', 'E'].map((letter, oIdx) => {
                                        const isCorrect = correctIdx === oIdx;
                                        const optText = (q.options && q.options[oIdx]) ? q.options[oIdx] : letter;

                                        return (
                                          <div
                                            key={letter}
                                            style={{
                                              padding: '0.55rem 0.95rem',
                                              borderRadius: '0.75rem',
                                              border: isCorrect ? '2px solid #10b981' : '1.5px solid #cbd5e1',
                                              background: isCorrect ? '#ecfdf5' : 'white',
                                              fontWeight: 800,
                                              fontSize: '0.9rem',
                                              color: isCorrect ? '#065f46' : '#334155',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.4rem',
                                              boxShadow: isCorrect ? '0 2px 8px rgba(16,185,129,0.2)' : 'none'
                                            }}
                                          >
                                            <span style={{
                                              width: '24px', height: '24px', borderRadius: '50%',
                                              background: isCorrect ? '#10b981' : '#cbd5e1',
                                              color: 'white', fontWeight: 900, fontSize: '0.8rem',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                              {letter}
                                            </span>
                                            <span>{optText !== letter ? `${letter}) ${optText}` : `${letter} Şıkkı`}</span>
                                            {isCorrect && (
                                              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.25rem' }}>
                                                <Check size={14} strokeWidth={3} /> Doğru
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 3. HTML DOCUMENT PREVIEW (LIVE RENDERED IFRAME) */}
                {!q.questionsList && q.contentType === 'html' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>
                        🌐 Görsel HTML Döküman / Test Önizlemesi:
                      </p>
                      {q.contentPayload?.startsWith('http') && (
                        <a href={q.contentPayload} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          Sekmede Aç <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    {/* Live Rendered HTML Frame */}
                    <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '1.25rem' }}>
                      {q.contentPayload?.startsWith('http') ? (
                        <iframe
                          src={q.contentPayload}
                          title="HTML Döküman"
                          style={{ width: '100%', height: '480px', border: 'none' }}
                        />
                      ) : (
                        <iframe
                          srcDoc={q.contentPayload}
                          title="HTML Görsel Önizleme"
                          style={{ width: '100%', height: '480px', border: 'none', background: 'white' }}
                        />
                      )}
                    </div>

                    {/* Optical Answer Key Grid */}
                    {q.type === 'coktan_secmeli' && (
                      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                        <h5 style={{ margin: '0 0 0.85rem 0', fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>
                          🔘 Cevap Anahtarı Tablosu ({q.questionCount || (q.answerKey ? q.answerKey.length : 1)} Soru):
                        </h5>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                          {Array.from({ length: q.questionCount || (q.answerKey ? q.answerKey.length : 1) }).map((_, idx) => {
                            const ans = q.answerKey ? q.answerKey[idx] : null;
                            return (
                              <div key={idx} style={{ padding: '0.4rem', borderRadius: '6px', background: ans && ans !== ' ' ? '#ecfdf5' : '#f8fafc', border: ans && ans !== ' ' ? '1px solid #a7f3d0' : '1px solid #e2e8f0', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>Soru {idx + 1}</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: ans && ans !== ' ' ? '#059669' : '#94a3b8' }}>
                                  {ans && ans !== ' ' ? ans : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. PDF BUNDLE PREVIEW */}
                {!q.questionsList && q.contentType === 'pdf' && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>📄 PDF Sınav Önizleme:</span>
                      <label style={{ cursor: 'pointer', background: '#dc2626', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.78rem' }}>
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files && handlePdfUploadForPreview(e.target.files[0], q.id)} />
                        📁 PDF Değiştir / Yükle
                      </label>
                    </div>
                    {getEmbeddableUrl(q.contentPayload) ? (
                      <iframe
                        src={getEmbeddableUrl(q.contentPayload)}
                        title="PDF Döküman"
                        style={{ width: '100%', height: '550px', border: '1px solid #cbd5e1', borderRadius: '0.5rem' }}
                      />
                    ) : (
                      <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626', background: '#fff5f5', border: '1px dashed #fca5a5', borderRadius: '0.5rem' }}>
                        📄 Bu test için henüz bir PDF dosyası yüklenmedi. Lütfen yukarıdaki butondan bir PDF seçin.
                      </div>
                    )}
                  </div>
                )}

                {/* Optical Answer Key Grid for PDF/HTML Tests */}
                {q.contentType !== 'gorsel' && (!q.imageUrls || q.imageUrls.length === 0) && q.type === 'coktan_secmeli' && (
                  <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: '0 0 0.85rem 0', fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>
                      🔘 Cevap Anahtarı Tablosu ({q.questionCount || (q.answerKey ? q.answerKey.length : 1)} Soru):
                    </h5>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {Array.from({ length: q.questionCount || (q.answerKey ? q.answerKey.length : 1) }).map((_, idx) => {
                        const ans = q.answerKey ? q.answerKey[idx] : null;
                        return (
                          <div key={idx} style={{ padding: '0.4rem', borderRadius: '6px', background: ans && ans !== ' ' ? '#ecfdf5' : '#f8fafc', border: ans && ans !== ' ' ? '1px solid #a7f3d0' : '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>Soru {idx + 1}</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: ans && ans !== ' ' ? '#059669' : '#94a3b8' }}>
                              {ans && ans !== ' ' ? ans : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setPreviewQuestion(null)} style={{ padding: '0.75rem 1.5rem', fontWeight: 800 }}>
                  Kapat
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', cursor: 'pointer' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={previewImage} alt="Büyük Görsel" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
            <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: -15, right: -15, background: 'white', color: '#0f172a', border: 'none', borderRadius: '50%', width: 36, height: 36, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      )}

    </div>
  );
}
