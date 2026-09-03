import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import {
  Filter, Plus, Trash2, X, Image, FileText, Code, FileJson,
  Type, FolderTree, Edit2, Eye, CheckCircle2, Check, ExternalLink,
  Layers, ArrowLeft, Globe, BookOpen, LayoutGrid, List,
  Ruler, TestTube2, BookCopy, MessageSquare, Sparkles,
  ChevronRight, ChevronDown, ChevronUp, FolderOpen, Folder, GraduationCap, School, Search, Calendar
} from 'lucide-react';
import './QuestionBank.css';
import { idbSetPayload, idbGetPayload } from '../services/indexedDbService';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';
import PdfQuestionSlicerModal from '../components/question-bank/PdfQuestionSlicerModal';
import AiQuestionGeneratorModal from '../components/question-bank/AiQuestionGeneratorModal';
import { compressImageToWebP, compressMultipleImages } from '../services/imageCompressionService';
import { Scissors } from 'lucide-react';
import { extractImageUrls, isValidImageUrl, normalizeImageUrl } from '../components/quiz/common/ImageLightbox';

import { JSON_TEMPLATE, subjectThemes, gradeThemes } from '../features/question-bank/constants/questionBankConstants';
import { getEmbeddablePdfUrl as getEmbeddableUrl } from '../utils/pdfUtils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function normalizeAnswerKey(rawKey) {
  if (!rawKey) return [];
  if (Array.isArray(rawKey)) return rawKey;
  if (typeof rawKey === 'string') {
    const trimmed = rawKey.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return Object.values(parsed);
      } catch {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    }
    return trimmed.split('');
  }
  if (typeof rawKey === 'object') {
    return Object.values(rawKey);
  }
  return [];
}

export default function QuestionBank() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { questions: allQuestions, addQuestion, updateQuestion, deleteQuestion } = useQuestionBank();

  // Teacher sees ONLY questions created by themselves, Admin sees all (EXCLUDE remedial tests)
  const questions = useMemo(() => {
    const rawList = (allQuestions || []).filter(q => {
      if (!q) return false;
      const isRem = q.isRemedialTest || q.isRemedial || q.isTeacherRemedial || q.type === 'remedial' || q.type === 'remedialTest' || q.sourceType === 'pdfSlicerRemedial' || /telafi/i.test(q.title || q.name || '');
      return !isRem;
    });
    if (currentUser?.role === 'admin') return rawList;
    return rawList.filter(q => q.createdBy === currentUser?.id);
  }, [allQuestions, currentUser]);
  
  // Portal Overview Active Tab is always grades now
  const [overviewTab, setOverviewTab] = useState('grades');
  const [isSlicerModalOpen, setIsSlicerModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [aiModalConfig, setAiModalConfig] = useState({ subject: '', grade: '', topic: '' });

  const toggleUnitExpand = (unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const toggleAllUnits = (subjectUnits) => {
    const allOpen = subjectUnits.every(u => expandedUnits[u.id]);
    const nextState = {};
    if (!allOpen) {
      subjectUnits.forEach(u => { nextState[u.id] = true; });
    }
    setExpandedUnits(nextState);
  };

  const handleLaunchAiWithTopic = (topicName, unitName, topicId = '', unitId = '') => {
    const currentGrade = curData.grades.find(g => g.id === activeGradeId) || activeGrade;
    const currentSubject = curData.subjects.find(s => s.id === activeSubjectId) || activeSubject;

    setAiModalConfig({
      subject: currentSubject?.name || 'Matematik',
      subjectId: currentSubject?.id || activeSubjectId || '',
      grade: currentGrade?.name || '8. Sınıf',
      gradeId: currentGrade?.id || activeGradeId || '',
      unitName: unitName || '',
      unitId: unitId || '',
      topic: topicName || '',
      topicId: topicId || ''
    });
    setIsAiModalOpen(true);
  };


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
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Type Selection Wizard Step (1: Select Type, 2: Fill Form)
  const [creationStep, setCreationStep] = useState(1);

  // Preview State for Error Checking
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const handlePreviewQuestion = async (q) => {
    let richPayload = q.contentPayload;
    const isMissing = !richPayload || (typeof richPayload === 'string' && (richPayload.includes('[STORED_IN_INDEXEDDB]') || richPayload.includes('[LOCALSTORAGE_CACHE]')));

    if (isMissing || q.contentType === 'pdf' || q.contentType === 'html' || q.contentType === 'gorsel') {
      const candidates = [
        q.id,
        String(q.id).replace(/^q_?/, ''),
        `q_${String(q.id).replace(/^q_?/, '')}`,
        `q${String(q.id).replace(/^q_?/, '')}`,
        q.realTestId,
        q.testId,
        ...(q.questionIds || [])
      ].filter(Boolean);

      for (const key of candidates) {
        try {
          const idbData = await idbGetPayload(key);
          if (idbData && typeof idbData === 'string' && idbData.length > 30 && !idbData.includes('[STORED_IN_INDEXEDDB]')) {
            richPayload = idbData;
            break;
          }
        } catch (e) {
          console.warn('[QuestionBank] idbGetPayload check error:', e);
        }
      }
    }

    if (richPayload) {
      setPreviewQuestion({ ...q, contentPayload: richPayload, htmlPayload: richPayload });
    } else {
      setPreviewQuestion(q);
    }
  };

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
  const [showHtmlCodeEditor, setShowHtmlCodeEditor] = useState(false);

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

  const handleMultipleFilesSelected = async (fileList, append = false) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const imageFiles = files.filter(f => f.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(f.name.split('.').pop().toLowerCase()));

    if (imageFiles.length === 0 && files.length === 1) {
      handleFileSelected(files[0]);
      return;
    }

    if (imageFiles.length === 0) return;

    try {
      // Compress all images to lightweight, high-quality WebP
      const compressedResults = await compressMultipleImages(imageFiles, 1600, 0.82);
      const newBase64List = compressedResults.map(r => r.dataUrl);

      const combinedList = append ? [...imageUrls, ...newBase64List] : newBase64List;

      const totalKb = compressedResults.reduce((sum, r) => sum + (r.sizeKb || 50), 0);

      setUploadedFileInfo({
        name: `${combinedList.length} Adet Görsel Soru Dosyası`,
        size: `${totalKb} KB`,
        type: 'gorsel',
        data: combinedList[0],
        count: combinedList.length
      });

      setFormData(prev => ({
        ...prev,
        contentType: 'gorsel',
        contentPayload: combinedList.join('\n\n'),
        questionCount: combinedList.length,
        title: prev.title || `Görsel Soru Seti (${combinedList.length} Soru)`
      }));

      setImageUrls(combinedList);
      if (creationStep === 1) setCreationStep(2);
    } catch (err) {
      console.error('Toplu görsel yükleme hatası:', err);
      // Fallback if canvas compression fails
      const readAsDataURL = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      const rawResults = (await Promise.all(imageFiles.map(readAsDataURL))).filter(Boolean);
      const combinedList = append ? [...imageUrls, ...rawResults] : rawResults;
      setImageUrls(combinedList);
      setFormData(prev => ({
        ...prev,
        contentType: 'gorsel',
        contentPayload: combinedList.join('\n\n'),
        questionCount: combinedList.length,
        title: prev.title || `Görsel Soru Seti (${combinedList.length} Soru)`
      }));
      if (creationStep === 1) setCreationStep(2);
    }
  };

  const handleRemoveImageAtIndex = (removeIdx) => {
    const updated = imageUrls.filter((_, idx) => idx !== removeIdx);
    setImageUrls(updated);

    const newAns = {};
    Object.keys(imageAnswers).forEach(k => {
      const numK = Number(k);
      if (numK < removeIdx) {
        newAns[numK] = imageAnswers[numK];
      } else if (numK > removeIdx) {
        newAns[numK - 1] = imageAnswers[numK];
      }
    });
    setImageAnswers(newAns);

    setFormData(prev => ({
      ...prev,
      contentPayload: updated.join('\n\n'),
      questionCount: Math.max(1, updated.length)
    }));

    if (updated.length === 0) {
      setUploadedFileInfo(null);
    } else {
      setUploadedFileInfo(prev => prev ? ({ ...prev, count: updated.length, data: updated[0] }) : null);
    }
  };

    
  const handleSaveAiQuestions = async (bundleQuestion) => {
    if (!bundleQuestion) return;
    try {
      await addQuestion({
        ...bundleQuestion,
        createdBy: currentUser?.id
      });
      alert(`✅ "${bundleQuestion.title}" başarıyla Soru Bankası'na eklendi!`);
    } catch (err) {
      console.error('Error saving AI generated questions:', err);
      alert('Soru paketi kaydedilirken bir hata oluştu: ' + err.message);
    }
  };

  const handleSaveSlicedQuestions = (slicedList) => {
    if (!slicedList || slicedList.length === 0) return;

    const base64List = slicedList.map(s => s.image);
    const totalKb = slicedList.reduce((sum, s) => sum + (s.sizeKb || 50), 0);

    const generatedQuestionsList = slicedList.map((s, idx) => {
      const optCount = Math.max(2, Math.min(5, Number(s.optionCount) || 4));
      const letters = Array.from({ length: optCount }, (_, i) => String.fromCharCode(65 + i));
      return {
        questionNo: idx + 1,
        questionText: `${idx + 1}. Soru`,
        imageUrl: s.image,
        correctAnswer: s.correctAnswer || 'A',
        optionCount: optCount,
        optionsCount: optCount,
        options: letters
      };
    });

    const firstOptCount = Math.max(2, Math.min(5, Number(slicedList[0]?.optionCount) || 4));

    setUploadedFileInfo({
      name: `${slicedList.length} Adet Kırpılmış Görsel Soru (WebP)`,
      size: `${totalKb} KB`,
      type: 'gorsel',
      data: base64List[0],
      count: slicedList.length
    });

    setFormData(prev => ({
      ...prev,
      contentType: 'gorsel',
      contentPayload: base64List.join('\n\n'),
      questionCount: slicedList.length,
      questionsList: generatedQuestionsList,
      optionCount: firstOptCount,
      optionsCount: firstOptCount,
      options: Array.from({ length: firstOptCount }, () => ''),
      title: prev.title || `Kırpılmış Test (${slicedList.length} Soru)`
    }));

    setImageUrls(base64List);
    setShowModal(true);
    setCreationStep(2);
  };

  const handleFileSelected = (file) => {
    if (!file) return;

    const fileSizeStr = (file.size / 1024).toFixed(1) + ' KB';
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();

    // 1. Image Files (.png, .jpg, .jpeg, .webp, .gif) - Automatically Compressed to WebP
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt) || file.type.startsWith('image/')) {
      compressImageToWebP(file, 1600, 0.82)
        .then(result => {
          const webpData = result.dataUrl;
          const sizeStr = `${result.sizeKb || Math.round(file.size / 1024)} KB (WebP Sıkıştırıldı)`;
          setUploadedFileInfo({ name: fileName, size: sizeStr, type: 'gorsel', data: webpData });
          setFormData(prev => ({
            ...prev,
            contentType: 'gorsel',
            contentPayload: webpData,
            title: prev.title || fileName.replace(/\.[^/.]+$/, '')
          }));
          setImageUrls([webpData]);
          if (creationStep === 1) setCreationStep(2);
        })
        .catch(err => {
          console.warn('Görsel sıkıştırma hatası, fallback uygulanıyor:', err);
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
        });
      return;
    }

    // 2. PDF Files (.pdf) - Directed to Link Based Input (Zero Egress)
    if (fileExt === 'pdf' || file.type === 'application/pdf') {
      alert(`ℹ️ "${fileName}" dosyası seçildi.\n\nSunucu kotanızı ve ağ trafiğini korumak için PDF'ler Google Drive veya web bağlantısı olarak eklenmektedir.\nLütfen dosyanızı Google Drive veya bir bulut alanına yükleyip linkini açılan forma yapıştırınız.`);
      setFormData(prev => ({
        ...prev,
        contentType: 'pdf',
        contentPayload: '',
        title: prev.title || fileName.replace(/\.pdf$/i, '')
      }));
      setUploadedFileInfo(null);
      if (creationStep === 1) setCreationStep(2);
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

        const currentSubjectObj = curData.subjects.find(s => s.id === activeSubjectId);
        const currentSubjectName = (currentSubjectObj?.name || '').toLowerCase().trim();
        const qSubName = (q.subject || '').toLowerCase().trim();

        const belongsToSubject = sTopics.includes(q.topicId) || 
          sUnits.some(uId => q.topicId === `unit_${uId}_all` || q.topicId === uId || q.unitId === uId) || 
          q.topicId === `sub_${activeSubjectId}_all` ||
          q.subjectId === activeSubjectId ||
          (currentSubjectName && qSubName && qSubName === currentSubjectName);

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
        const dropSubObj = curData.subjects.find(s => s.id === selectedSubject);
        const dropSubName = (dropSubObj?.name || '').toLowerCase().trim();
        const qSubName = (q.subject || '').toLowerCase().trim();

        const belongsToSubject = subjectTopics.includes(q.topicId) || 
          subjectUnits.some(uId => q.topicId === `unit_${uId}_all` || q.topicId === uId || q.unitId === uId) || 
          q.topicId === `sub_${selectedSubject}_all` ||
          q.subjectId === selectedSubject ||
          (dropSubName && qSubName && qSubName === dropSubName);
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
      let title = q.subject ? `${q.subject} Soru Paketi` : 'Genel Sorular';
      let subtitle = q.topic || 'Kategori Atanmamış İçerikler';

      // Fallback matching by unitId or topic name
      let effectiveTopicObj = topicObj;
      let effectiveUnitObj = unitObj;
      let effectiveSubjectObj = subjectObj;

      if (!effectiveTopicObj && q.topic) {
        effectiveTopicObj = curData.topics.find(t => t.name.toLowerCase().trim() === q.topic.toLowerCase().trim());
        if (effectiveTopicObj) {
          effectiveUnitObj = curData.units.find(u => u.id === effectiveTopicObj.unitId);
          effectiveSubjectObj = effectiveUnitObj ? curData.subjects.find(s => s.id === effectiveUnitObj.subjectId) : null;
        }
      }

      if (!effectiveUnitObj && q.unitId) {
        effectiveUnitObj = curData.units.find(u => u.id === q.unitId);
        effectiveSubjectObj = effectiveUnitObj ? curData.subjects.find(s => s.id === effectiveUnitObj.subjectId) : null;
      }

      if (effectiveTopicObj) {
        key = `${effectiveSubjectObj?.name || q.subject || 'Ders'}_${effectiveUnitObj?.name || 'Ünite'}_${effectiveTopicObj.name}`;
        title = `${effectiveSubjectObj?.name || q.subject || 'Ders'} ➔ ${effectiveUnitObj?.name || 'Ünite'}`;
        subtitle = `Konu: ${effectiveTopicObj.name}`;
      } else if (effectiveUnitObj) {
        key = `unit_${effectiveUnitObj.id}`;
        title = `${effectiveSubjectObj?.name || q.subject || 'Ders'} ➔ ${effectiveUnitObj.name}`;
        subtitle = q.topic ? `Konu: ${q.topic}` : `Tüm Ünite İçerikleri`;
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

  const isHighSchoolGrade = (gId) => {
    const targetGId = gId || selectedGrade || activeGradeId;
    if (!targetGId || targetGId === 'all') return false;
    const gObj = curData?.grades?.find(g => String(g.id) === String(targetGId) || g.name === targetGId);
    const gName = String(gObj ? gObj.name : targetGId).toLowerCase();
    return gName.includes('9') || gName.includes('10') || gName.includes('11') || gName.includes('12') || 
      gName.includes('lise') || gName.includes('yks') || gName.includes('tyt') || gName.includes('ayt') || gName.includes('mezun');
  };

  const getDefaultOptionCountForGrade = (gId) => {
    const targetGId = gId || selectedGrade || activeGradeId;
    if (!targetGId || targetGId === 'all') return 4;
    const gObj = curData?.grades?.find(g => String(g.id) === String(targetGId) || g.name === targetGId);
    const gName = String(gObj ? gObj.name : targetGId).toLowerCase();
    if (gName.includes('1.') || gName.includes('1. sınıf') || gName.includes('1.sınıf')) return 2;
    if (gName.includes('2.') || gName.includes('3.') || gName.includes('4.') || gName.includes('ilkokul')) return 3;
    if (isHighSchoolGrade(targetGId)) return 5;
    return 4;
  };

  const getDefaultOptionsForGrade = (gId) => {
    const count = getDefaultOptionCountForGrade(gId);
    return Array.from({ length: count }, () => '');
  };

  const getOptionLetters = (count = 4) => {
    const validCount = Math.max(2, Math.min(5, Number(count) || 4));
    return Array.from({ length: validCount }, (_, i) => String.fromCharCode(65 + i));
  };

  const currentOptionCount = useMemo(() => {
    if (formData.options && Array.isArray(formData.options) && formData.options.length >= 2) {
      return formData.options.length;
    }
    if (formData.optionCount && Number(formData.optionCount) >= 2) {
      return Number(formData.optionCount);
    }
    if (formData.optionsCount && Number(formData.optionsCount) >= 2) {
      return Number(formData.optionsCount);
    }
    return getDefaultOptionCountForGrade(selectedGrade || activeGradeId);
  }, [formData.options, formData.optionCount, formData.optionsCount, selectedGrade, activeGradeId, curData]);

  const handleOptionCountChange = (newCount) => {
    const count = Math.max(2, Math.min(5, Number(newCount) || 4));
    setFormData(prev => {
      const currentOpts = Array.isArray(prev.options) ? prev.options : [];
      let nextOpts = [];
      if (currentOpts.length > count) {
        nextOpts = currentOpts.slice(0, count);
      } else {
        nextOpts = [...currentOpts];
        while (nextOpts.length < count) {
          nextOpts.push('');
        }
      }
      const safeCorrectAnswer = Math.min(typeof prev.correctAnswer === 'number' ? prev.correctAnswer : 0, count - 1);
      return {
        ...prev,
        optionCount: count,
        optionsCount: count,
        options: nextOpts,
        correctAnswer: safeCorrectAnswer
      };
    });

    if (editableQuestionsList.length > 0) {
      setEditableQuestionsList(prevList =>
        prevList.map(qItem => {
          const qOpts = Array.isArray(qItem.options) ? qItem.options : [];
          let nextQOpts = [];
          if (qOpts.length > count) {
            nextQOpts = qOpts.slice(0, count);
          } else {
            nextQOpts = [...qOpts];
            while (nextQOpts.length < count) {
              nextQOpts.push('');
            }
          }
          const safeCAns = typeof qItem.correctAnswer === 'number' ? Math.min(qItem.correctAnswer, count - 1) : 0;
          return {
            ...qItem,
            optionCount: count,
            optionsCount: count,
            options: nextQOpts,
            correctAnswer: safeCAns
          };
        })
      );
    }
  };

  const resetForm = () => {
    setEditingQuestionId(null);
    setCreationStep(1);
    setEditableQuestionsList([]);
    setJsonEditMode('visual');
    setShowHtmlCodeEditor(false);
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

    const initialOpts = getDefaultOptionsForGrade(activeGradeId || selectedGrade);

    setFormData({
      title: '',
      type: 'coktan_secmeli',
      contentType: 'text',
      contentPayload: '',
      questionText: '',
      optionCount: initialOpts.length,
      optionsCount: initialOpts.length,
      options: initialOpts,
      correctAnswer: 0,
      questionCount: 1,
      bulkAnswerKey: ''
    });
    setOpticAnswers({});
    setImageUrls([]);
    setImageAnswers({});
  };

  const openEditModal = async (q) => {
    setEditingQuestionId(q.id);
    setCreationStep(2);
    
    // Safely extract answer key as both array and clean string
    const normalizedAnswerKey = normalizeAnswerKey(q.answerKey);
    const keyStr = normalizedAnswerKey.join('').trimEnd();

    let richPayload = q.contentPayload || '';
    if (!richPayload || (typeof richPayload === 'string' && (richPayload.includes('[STORED_IN_INDEXEDDB]') || richPayload.includes('[LOCALSTORAGE_CACHE]')))) {
      const candidateKeys = [
        q.id,
        String(q.id).replace(/^q_?/, ''),
        `q_${String(q.id).replace(/^q_?/, '')}`,
        `q${String(q.id).replace(/^q_?/, '')}`,
        q.realTestId,
        q.testId,
        ...(q.questionIds || [])
      ].filter(Boolean);

      for (const key of candidateKeys) {
        try {
          const idbData = await idbGetPayload(key);
          if (idbData && typeof idbData === 'string' && idbData.length > 30 && !idbData.includes('[STORED_IN_INDEXEDDB]')) {
            richPayload = idbData;
            break;
          }
        } catch (e) {}
      }
    }

    const resolvedOptCount = Number(q.optionCount || q.optionsCount) || (Array.isArray(q.options) && q.options.length >= 2 ? q.options.length : (isHighSchoolGrade(q.gradeId) ? 5 : 4));
    const initialLoadedOpts = (Array.isArray(q.options) && q.options.length >= 2) ? q.options : Array.from({ length: resolvedOptCount }, () => '');

    setFormData({
      title: q.title || q.name || '',
      type: q.type || 'coktan_secmeli',
      contentType: q.contentType,
      contentPayload: richPayload,
      questionText: q.questionText || '',
      optionCount: resolvedOptCount,
      optionsCount: resolvedOptCount,
      options: initialLoadedOpts,
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      questionCount: q.questionCount || 1,
      bulkAnswerKey: keyStr
    });

    if (q.contentType === 'json' || q.questionsList) {
      if (q.questionsList && q.questionsList.length > 0) {
        const list = q.questionsList.map(sq => {
          const sqOptCount = Number(sq.optionCount || sq.optionsCount) || (Array.isArray(sq.options) && sq.options.length >= 2 ? sq.options.length : resolvedOptCount);
          return {
            ...sq,
            optionCount: sqOptCount,
            optionsCount: sqOptCount,
            options: (Array.isArray(sq.options) && sq.options.length >= 2) ? sq.options : Array.from({ length: sqOptCount }, () => '')
          };
        });
        setEditableQuestionsList(list);
      } else if (richPayload) {
        try {
          const cleanPayload = typeof richPayload === 'string' ? richPayload.replace(/\|/g, '') : richPayload;
          const parsed = JSON.parse(cleanPayload);
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
              const itemOptCount = Number(item.optionCount || item.optionsCount) || (Array.isArray(item.options) && item.options.length >= 2 ? item.options.length : resolvedOptCount);
              return {
                id: `sub_${idx}_${Date.now()}`,
                questionText: item.questionText || `Soru ${idx + 1}`,
                optionCount: itemOptCount,
                optionsCount: itemOptCount,
                options: (Array.isArray(item.options) && item.options.length >= 2) ? item.options : Array.from({ length: itemOptCount }, (_, i) => String.fromCharCode(65 + i)),
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
      if (Array.isArray(normalizedAnswerKey) && normalizedAnswerKey.length > 0) {
        normalizedAnswerKey.forEach((k, idx) => {
          if (k !== undefined && k !== null && String(k).trim() !== '') {
            if (typeof k === 'number') {
              newOptic[idx] = k;
            } else {
              const letter = String(k).toUpperCase().trim();
              newOptic[idx] = letter.charCodeAt(0) - 65;
            }
          }
        });
      }
      setOpticAnswers(newOptic);
    } else if (q.contentType === 'gorsel') {
      let urls = [];
      if (q.questionsList && Array.isArray(q.questionsList) && q.questionsList.length > 0) {
        urls = q.questionsList.map(sq => sq.imageUrl || sq.contentPayload).filter(Boolean).filter(isValidImageUrl).map(normalizeImageUrl);
      }
      if (urls.length === 0 && Array.isArray(q.imageUrls) && q.imageUrls.length > 0) {
        urls = q.imageUrls.filter(Boolean).filter(isValidImageUrl).map(normalizeImageUrl);
      }
      if (urls.length === 0 && richPayload) {
        urls = extractImageUrls(richPayload);
      }
      if (urls.length === 0) {
        urls = extractImageUrls(q);
      }

      // Deduplicate without losing order
      const uniqueUrls = [];
      urls.forEach(u => {
        if (u && !uniqueUrls.includes(u)) uniqueUrls.push(u);
      });

      const qCount = Number(q.questionCount) || (uniqueUrls.length > 0 ? uniqueUrls.length : 1);
      const resolvedUrls = (q.questionCount && uniqueUrls.length > qCount) ? uniqueUrls.slice(0, qCount) : uniqueUrls;

      setImageUrls(resolvedUrls);

      const ansMap = {};
      if (Array.isArray(normalizedAnswerKey) && normalizedAnswerKey.length > 0) {
        normalizedAnswerKey.slice(0, qCount).forEach((k, idx) => {
          if (k !== undefined && k !== null && String(k).trim() !== '') {
            ansMap[idx] = typeof k === 'number' ? k : (String(k).toUpperCase().charCodeAt(0) - 65);
          }
        });
      } else if (q.imageAnswers) {
        Object.assign(ansMap, q.imageAnswers);
      } else if (q.questionsList && Array.isArray(q.questionsList)) {
        q.questionsList.slice(0, qCount).forEach((subQ, idx) => {
          if (subQ.correctAnswer !== undefined) {
            ansMap[idx] = typeof subQ.correctAnswer === 'number' ? subQ.correctAnswer : (typeof subQ.correctAnswer === 'string' && /^[A-E]$/i.test(subQ.correctAnswer.trim()) ? subQ.correctAnswer.trim().toUpperCase().charCodeAt(0) - 65 : 0);
          }
        });
      } else {
        ansMap[0] = q.correctAnswer || 0;
      }
      setImageAnswers(ansMap);

      setFormData(prev => ({
        ...prev,
        questionCount: resolvedUrls.length > 0 ? resolvedUrls.length : qCount,
        contentPayload: resolvedUrls.join('\n\n')
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

  const parseBulkAnswerString = (val, optionCount) => {
    if (!val || typeof val !== 'string') return { newOptic: {}, maxIndex: 0 };
    const maxLetter = String.fromCharCode(65 + optionCount - 1);
    const validRegex = new RegExp(`[A-${maxLetter}]`, 'i');

    const newOptic = {};

    // Check if numbered pairs exist like "1A 2B" or "1.A 2:B" or "1-A, 2-B"
    const numberedMatches = [...val.matchAll(/(\d+)[\s.:\-)_=]*([A-Za-z])/g)];
    if (numberedMatches.length >= 2) {
      numberedMatches.forEach(m => {
        const qNum = parseInt(m[1], 10);
        const letter = m[2].toUpperCase();
        if (validRegex.test(letter) && qNum >= 1 && qNum <= 200) {
          const idx = qNum - 1;
          newOptic[idx] = letter.charCodeAt(0) - 65;
        }
      });
    } else {
      // Direct sequence of letters
      const regex = new RegExp(`[^A-${maxLetter}]`, 'gi');
      const letters = val.toUpperCase().replace(regex, '').split('');
      letters.forEach((l, idx) => {
        newOptic[idx] = l.charCodeAt(0) - 65;
      });
    }

    const indices = Object.keys(newOptic).map(Number);
    const maxIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
    return { newOptic, maxIndex };
  };

  const handleBulkAnswerKeyChange = (val) => {
    const { newOptic, maxIndex } = parseBulkAnswerString(val, currentOptionCount);
    setOpticAnswers(newOptic);
    setFormData(prev => ({
      ...prev,
      bulkAnswerKey: val,
      questionCount: maxIndex > 0 ? Math.max(prev.questionCount || 1, maxIndex) : prev.questionCount
    }));
  };

  const handleAddVisualQuestion = () => {
    setEditableQuestionsList(prev => [
      ...prev,
      {
        id: `sub_${prev.length + 1}_${Date.now()}`,
        questionText: `${prev.length + 1}) Soru metnini yazınız...`,
        optionCount: currentOptionCount,
        optionsCount: currentOptionCount,
        options: Array.from({ length: currentOptionCount }, () => ''),
        correctAnswer: 0,
        type: formData.type || 'coktan_secmeli'
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
      const count = copy[qIndex].options?.length || currentOptionCount;
      const opts = [...(copy[qIndex].options || Array.from({ length: count }, () => ''))];
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
    const { newOptic } = parseBulkAnswerString(val, currentOptionCount);
    setImageAnswers(newOptic);
    setFormData(prev => ({ ...prev, bulkAnswerKey: val }));
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!categoryId || isSavingQuestion) return;
    setIsSavingQuestion(true);
    try {

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

    const isAcikUclu = formData.type === 'acik_uclu';
    const finalOptionCount = isAcikUclu ? 0 : (formData.options?.length || currentOptionCount || 4);
    const defaultOptionLetters = getOptionLetters(finalOptionCount);
    const finalOptions = isAcikUclu ? [] : (formData.options && formData.options.length > 0 ? formData.options : defaultOptionLetters);

    if (formData.contentType === 'json') {
      let questionsList = [];
      
      if (jsonEditMode === 'visual' && editableQuestionsList.length > 0) {
        questionsList = editableQuestionsList.map(q => {
          const qOptCount = isAcikUclu ? 0 : (q.options?.length || finalOptionCount);
          const qLetters = getOptionLetters(qOptCount);
          return {
            ...q,
            type: formData.type || q.type || 'coktan_secmeli',
            optionCount: qOptCount,
            optionsCount: qOptCount,
            options: isAcikUclu ? [] : (q.options && q.options.length > 0 ? q.options : qLetters)
          };
        });
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
            const qOptCount = isAcikUclu ? 0 : (q.options?.length || Number(q.optionCount) || finalOptionCount);
            const qLetters = getOptionLetters(qOptCount);
            return {
              id: `sub_${idx}_${Date.now()}`,
              questionText: q.questionText || `Soru ${idx + 1}`,
              optionCount: qOptCount,
              optionsCount: qOptCount,
              options: isAcikUclu ? [] : (q.options && q.options.length > 0 ? q.options : qLetters),
              correctAnswer: typeof cAns === 'number' ? cAns : 0,
              type: formData.type || q.type || 'coktan_secmeli'
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
        optionCount: finalOptionCount,
        optionsCount: finalOptionCount,
        options: finalOptions,
        questionCount: questionsList.length,
        questionsList: questionsList,
        answerKey: answerKey,
        contentPayload: payloadString
      };

      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, bundleData);
      } else {
        await addQuestion(bundleData);
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
        await updateQuestion(editingQuestionId, {
          ...formData,
          optionCount: finalOptionCount,
          optionsCount: finalOptionCount,
          options: finalOptions,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: true,
          answerKey: parsedKey,
          createdBy: formData.createdBy || teacherId
        });
      } else if (formData.contentType === 'gorsel') {
        const validUrls = imageUrls.length > 0 ? imageUrls : (formData.contentPayload ? formData.contentPayload.split(/\n\n|\n|\|/).map(u => u.trim()).filter(Boolean) : []);
        const totalQs = validUrls.length > 0 ? validUrls.length : 1;

        const parsedKey = [];
        for (let i = 0; i < totalQs; i++) {
          if (imageAnswers[i] !== undefined) {
            parsedKey.push(String.fromCharCode(65 + imageAnswers[i]));
          } else {
            parsedKey.push(' ');
          }
        }

        const isSingleQuestion = totalQs <= 1;

        const subQuestions = isSingleQuestion ? [] : validUrls.map((u, idx) => {
          return {
            id: `subq_${idx}_${Date.now()}`,
            questionNo: idx + 1,
            title: `Görsel Soru ${idx + 1}`,
            questionText: `${idx + 1}. Soru`,
            contentType: 'gorsel',
            contentPayload: u,
            imageUrl: u,
            type: formData.type || 'coktan_secmeli',
            optionCount: finalOptionCount,
            optionsCount: finalOptionCount,
            options: finalOptions,
            correctAnswer: imageAnswers[idx] !== undefined ? imageAnswers[idx] : 0
          };
        });

        const finalPayload = validUrls.length > 0 ? validUrls.join('\n\n') : formData.contentPayload;

        await updateQuestion(editingQuestionId, {
          ...formData,
          optionCount: finalOptionCount,
          optionsCount: finalOptionCount,
          options: finalOptions,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: !isSingleQuestion,
          questionCount: totalQs,
          imageUrl: validUrls[0] || formData.contentPayload || '',
          imageUrls: validUrls,
          contentPayload: finalPayload,
          questionsList: subQuestions,
          answerKey: parsedKey,
          imageAnswers: imageAnswers,
          createdBy: formData.createdBy || teacherId
        });
      } else {
        await updateQuestion(editingQuestionId, {
          ...formData,
          optionCount: finalOptionCount,
          optionsCount: finalOptionCount,
          options: finalOptions,
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

        await addQuestion({
          ...formData,
          optionCount: finalOptionCount,
          optionsCount: finalOptionCount,
          options: finalOptions,
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
        const totalQs = validUrls.length > 0 ? validUrls.length : 1;

        const parsedKey = [];
        for (let i = 0; i < totalQs; i++) {
          if (imageAnswers[i] !== undefined) {
            parsedKey.push(String.fromCharCode(65 + imageAnswers[i]));
          } else {
            parsedKey.push(' ');
          }
        }

        const isSingleQuestion = totalQs <= 1;

        const subQuestions = isSingleQuestion ? [] : validUrls.map((u, idx) => {
          return {
            id: `subq_${idx}_${Date.now()}`,
            questionNo: idx + 1,
            title: `Görsel Soru ${idx + 1}`,
            questionText: `${idx + 1}. Soru`,
            contentType: 'gorsel',
            contentPayload: u,
            imageUrl: u,
            type: formData.type || 'coktan_secmeli',
            optionCount: finalOptionCount,
            optionsCount: finalOptionCount,
            options: finalOptions,
            correctAnswer: imageAnswers[idx] !== undefined ? imageAnswers[idx] : 0
          };
        });

        const finalPayload = validUrls.length > 0 ? validUrls.join('\n\n') : formData.contentPayload;

        await addQuestion({
          ...formData,
          contentType: 'gorsel',
          type: formData.type || 'coktan_secmeli',
          optionCount: finalOptionCount,
          optionsCount: finalOptionCount,
          options: finalOptions,
          topicId: categoryId,
          subject: foundSubject,
          gradeId: foundGradeId,
          isBundle: !isSingleQuestion,
          contentPayload: finalPayload,
          imageUrl: validUrls[0] || formData.contentPayload || '',
          imageUrls: validUrls,
          questionsList: subQuestions,
          answerKey: parsedKey,
          imageAnswers: imageAnswers,
          questionCount: totalQs,
          createdBy: teacherId
        });
      }
      else {
        await addQuestion({
          ...formData,
          optionCount: finalOptionCount,
          optionsCount: finalOptionCount,
          options: finalOptions,
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
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const getTypeLabel = (q) => {
    if (q.isBundle) {
      if (q.contentType === 'pdf') return `PDF Test Paketi (${q.questionCount || 1} Soru)`;
      if (q.contentType === 'html') return `HTML Test Paketi (${q.questionCount || 1} Soru)`;
      if (q.contentType === 'gorsel') return `Görsel Soru Seti (${q.questionCount || 1} Soru)`;
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

  const handleDeleteConfirm = (q) => {
    const qTitle = q.title || q.name || 'Bu soru/testi';
    if (window.confirm(`⚠️ "${qTitle}" silinsin mi?\n\nBu işlem geri alınamaz ve ilgili tüm görseller/dosyalar veritabanından kalıcı olarak temizlenecektir.`)) {
      deleteQuestion(q.id);
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
    gorsel: { label: 'Görselli Test',   icon: '🖼️', bgFrom: '#f0fdf4', bgTo: '#dcfce7', border: '#bbf7d0', accent: '#15803d', badge: 'bg-emerald-50 text-emerald-700',  iconBg: 'linear-gradient(135deg,#10b981,#059669)' },
    pdf:    { label: 'PDF Test',        icon: '📄', bgFrom: '#fff1f2', bgTo: '#ffe4e6', border: '#fecdd3', accent: '#be123c', badge: 'bg-rose-50 text-rose-700', iconBg: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
    html:   { label: 'Web Test',        icon: '🌐', bgFrom: '#f0f9ff', bgTo: '#e0f2fe', border: '#bae6fd', accent: '#0369a1', badge: 'bg-sky-50 text-sky-700',        iconBg: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
    json:   { label: 'Metin Testi',     icon: '📚', bgFrom: '#faf5ff', bgTo: '#f3e8ff', border: '#e9d5ff', accent: '#6d28d9', badge: 'bg-violet-50 text-violet-700',  iconBg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
    text:   { label: 'Tek Soru',        icon: '📝', bgFrom: '#fffbeb', bgTo: '#fef3c7', border: '#fde68a', accent: '#b45309', badge: 'bg-amber-50 text-amber-700', iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  };

  const getAnswerKeyCount = (answerKey) => {
    if (!answerKey) return 0;
    const list = normalizeAnswerKey(answerKey);
    return list.filter(k => k && String(k).trim() !== '').length;
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
          background: 'var(--color-surface)',
          border: `1.5px solid ${cfg.border || 'var(--color-border)'}`,
          borderRadius: '1.25rem',
          overflow: 'hidden',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        className="qbank-question-card hover:shadow-xl hover:-translate-y-1"
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
              fontSize: '1.5rem', boxShadow: `0 4px 14px ${cfg.accent}33`
            }}>
              {cfg.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title */}
              <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.3, marginBottom: '0.35rem' }}>
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
                  fontSize: '0.7rem', fontWeight: 900, padding: '0.18rem 0.55rem', borderRadius: '20px',
                  letterSpacing: '0.02em'
                }}>
                  {cfg.label}
                </span>
                <span style={{
                  background: q.type === 'coktan_secmeli' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: q.type === 'coktan_secmeli' ? '#10b981' : '#f59e0b',
                  border: `1px solid ${q.type === 'coktan_secmeli' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  fontSize: '0.7rem', fontWeight: 900, padding: '0.18rem 0.55rem', borderRadius: '20px'
                }}>
                  {q.type === 'coktan_secmeli' ? '🔘 Çoktan Seçmeli' : '📝 Açık Uçlu'}
                </span>
              </div>
            </div>

            {/* Thumbnail (image tests only) */}
            {thumbUrl && (
              <div style={{ width: '56px', height: '56px', borderRadius: '0.75rem', overflow: 'hidden', border: `1.5px solid ${cfg.border || 'var(--color-border)'}`, flexShrink: 0 }}>
                <img src={thumbUrl} alt="önizleme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>

          {/* ROW 2: STATS CHIPS */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {qCount && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--color-surface-hover)', border: `1px solid ${cfg.border || 'var(--color-border)'}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: cfg.accent }}>
                <span>📊</span>
                <span>{qCount} Soru</span>
              </div>
            )}
            {q.contentType === 'gorsel' && imgCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--color-surface-hover)', border: `1px solid ${cfg.border || 'var(--color-border)'}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: cfg.accent }}>
                <span>🖼️</span>
                <span>{imgCount} Görsel</span>
              </div>
            )}
            {q.type !== 'acik_uclu' && q.type !== 'yazili' && getAnswerKeyCount(q.answerKey) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--color-surface-hover)', border: `1px solid ${cfg.border || 'var(--color-border)'}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: cfg.accent }}>
                <span>🗝️</span>
                <span>Cevap Anahtarlı</span>
              </div>
            )}
            {(q.type === 'acik_uclu' || q.type === 'yazili') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 900, color: '#f59e0b' }}>
                <span>👨‍🏫</span>
                <span>Öğretmen Değerlendirmeli</span>
              </div>
            )}
            {q.contentType === 'text' && q.questionText && (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '0.25rem 0.7rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{q.questionText}"
              </div>
            )}
          </div>

          {/* ROW 3: ACTIONS */}
          <div className="card-actions-row" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
            <button
              onClick={() => handlePreviewQuestion(q)}
              style={{ flex: 1, minWidth: '80px', background: cfg.iconBg, color: 'white', border: 'none', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: `0 3px 8px ${cfg.accent}33` }}
            >
              <Eye size={14} /> Önizle
            </button>
            <button
              onClick={() => navigate('/homeworks', { state: { autoSelectQuestionId: q.id } })}
              style={{ flex: 1, minWidth: '80px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 3px 8px rgba(16,185,129,0.3)' }}
            >
              <Calendar size={14} /> Ödev Ata
            </button>
            <button
              onClick={() => openEditModal(q)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, fontSize: '0.78rem' }}
            >
              <Edit2 size={14} /> Düzenle
            </button>
            <button
              onClick={() => handleDeleteConfirm(q)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, fontSize: '0.78rem' }}
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
        padding: '0.65rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)',
        transition: 'background 0.15s',
      }}
      className="qbank-row-item hover:bg-slate-100"
      >
        {/* # */}
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textAlign: 'right' }}>{idx + 1}</span>

        {/* Type icon badge */}
        <div style={{ width: '36px', height: '36px', borderRadius: '0.6rem', background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
          {thumbUrl
            ? <img src={thumbUrl} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '0.6rem' }} onError={e => e.target.style.display='none'} />
            : cfg.icon}
        </div>

        {/* Title + breadcrumb */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <span style={{ background: q.type === 'coktan_secmeli' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: q.type === 'coktan_secmeli' ? '#10b981' : '#f59e0b', border: `1px solid ${q.type === 'coktan_secmeli' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {q.type === 'coktan_secmeli' ? '🔘 ÇS' : '📝 AÇ'}
        </span>

        {/* Soru sayısı */}
        {qCount
          ? <span style={{ fontSize: '0.72rem', fontWeight: 900, color: cfg.accent, background: 'var(--color-surface-hover)', border: `1px solid ${cfg.border || 'var(--color-border)'}`, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>📊 {qCount}</span>
          : <span />
        }

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => handlePreviewQuestion(q)} title="Önizle" style={{ padding: '0.35rem 0.6rem', borderRadius: '0.5rem', background: cfg.iconBg, color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Eye size={13} /> Önizle
          </button>
          <button onClick={() => navigate('/homeworks', { state: { autoSelectQuestionId: q.id } })} title="Ödev Ata" style={{ padding: '0.35rem 0.6rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={13} /> Ata
          </button>
          <button onClick={() => openEditModal(q)} title="Düzenle" style={{ padding: '0.35rem 0.5rem', borderRadius: '0.5rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => handleDeleteConfirm(q)} title="Sil" style={{ padding: '0.35rem 0.5rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  // Helper: wraps items in either card grid or table
  const renderQList = (items, bgColor = 'transparent') => {
    if (viewMode === 'row') {
      return (
        <div style={{ background: 'var(--color-surface)', borderRadius: '1rem', overflow: 'hidden', border: '1.5px solid var(--color-border)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 44px 1fr auto auto auto auto', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', background: 'var(--color-surface-hover)', borderBottom: '1.5px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textAlign: 'right' }}>#</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tür</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Başlık / Konu</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İçerik</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Format</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Soru</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İşlemler</span>
          </div>
          {items.map((q, idx) => renderQuestionRow(q, idx))}
        </div>
      );
    }
    return (
      <div className="qbank-questions-grid" style={{ padding: '0.5rem 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {items.map(q => renderQuestionCard(q))}
      </div>
    );
  };

  const renderSearchResults = () => (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 2.5rem auto' }}>
      <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', padding: '1.25rem 1.75rem', borderRadius: '1.25rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.25rem' }}>
              "{searchQuery}" Arama Sonuçları
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              {filteredQuestions.length} içerik/test bulundu.
            </p>
          </div>
        </div>
        <button onClick={() => setSearchQuery('')} style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <X size={16} /> Aramayı Temizle
        </button>
      </div>
      {filteredQuestions.length === 0 ? (
        <div style={{ padding: '3.5rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '1.5rem', border: '1.5px dashed var(--color-border-input)' }}>
          <Search size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--color-text)' }}>Sonuç bulunamadı.</h3>
        </div>
      ) : renderQList(filteredQuestions, 'transparent')}
    </div>
  );

  return (
    <div className="qbank-page">
      
      {/* ═════════════════════════════════════════════════════════════════════
          SCREEN A: MAIN PORTAL OVERVIEW (activeSubjectId === null && activeGradeId === null)
      ═════════════════════════════════════════════════════════════════════ */}
      {!activeSubjectId && !activeGradeId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          
          {/* Top Sticky Header */}
          <header className="qbank-hero-header" style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1.5rem',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
          }}>
            <div className="header-left-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
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
                <ArrowLeft size={16} /> Geri Dön
              </button>

              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <Sparkles size={13} /> LMS Akıllı Soru Havuzu & Test Merkezi
                </div>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                  Soru Bankası &amp; Ders Portalı 📚
                </h1>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Soruları görüntülemek, yönetmek ve yeni içerik eklemek için bir ders veya sınıf kartına giriş yapın.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '0.75rem',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(139,92,246,0.35)'
                }}
              >
                <Sparkles size={16} />
                <span>🤖 AI ile Soru Üret</span>
              </button>

              <button
                type="button"
                onClick={() => { resetForm(); setShowModal(true); }}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '0.75rem',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                }}
              >
                <Plus size={16} />
                <span>Yeni Soru Ekle</span>
              </button>

              {currentUser?.role === 'teacher' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', padding: '0.4rem 0.9rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800 }}>
                  <span>🔒 Öğretmen Özel Bankası</span>
                </div>
              )}
            </div>
          </header>

          {/* 4 LIVE KPI HERO METRIC CARDS */}
          <div className="qbank-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            <div className="qbank-kpi-card" style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="qbank-kpi-icon" style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOpen size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Toplam İçerik</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{questions.length} Soru / Test</span>
                <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700 }}>Aktif soru havuzu</span>
              </div>
            </div>

            <div className="qbank-kpi-card" style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="qbank-kpi-icon" style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Sınıf Seviyeleri</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{curData.grades.length} Kademe</span>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>5, 6, 7, 8 & LGS</span>
              </div>
            </div>

            <div className="qbank-kpi-card" style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="qbank-kpi-icon" style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderTree size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Müfredat Dersleri</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{curData.subjects.length} Branş</span>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>Tüm ünite & konular</span>
              </div>
            </div>

            <div className="qbank-kpi-card" style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div className="qbank-kpi-icon" style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Format Desteği</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>5 Farklı Tür</span>
                <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 700 }}>Görsel, PDF, HTML, Metin</span>
              </div>
            </div>
          </div>

          {/* SEARCH BAR ON MAIN PORTAL */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1.25rem', padding: '0.85rem 1.25rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Soru metni, test başlığı, ünite veya konuya göre ara..."
                style={{
                  width: '100%',
                  padding: '0.75rem 2.75rem 0.75rem 2.85rem',
                  borderRadius: '0.85rem',
                  border: '1.5px solid var(--color-border-input)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  background: 'var(--color-surface-hover)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--color-surface)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

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
                    boxShadow: '0 12px 30px rgba(79, 70, 229, 0.4)',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '190px'
                  }}
                  className="qbank-card"
                >
                  <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.2, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
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
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '190px'
                      }}
                      className="qbank-card"
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
      ) : activeGradeId && !activeSubjectId ? (
        /* ═════════════════════════════════════════════════════════════════════
            SCREEN B1: DEDICATED GRADE PAGE (activeGradeId !== null)
        ═════════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          
          {/* Top Bar with Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => setActiveGradeId(null)}
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', padding: '0.6rem 1.25rem', borderRadius: '0.85rem', fontWeight: 800, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <ArrowLeft size={18} /> Tüm Sınıf Portalı'na Dön
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.7rem 1.25rem',
                  borderRadius: '0.85rem',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.35)'
                }}
              >
                <Sparkles size={18} /> 🤖 {activeGrade?.name} İçin AI ile Soru Üret
              </button>

              <button
                className="btn btn-primary"
                onClick={() => { resetForm(); setShowModal(true); }}
                style={{ background: activeGradeTheme.color, borderColor: activeGradeTheme.color, padding: '0.7rem 1.25rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: activeGradeTheme.shadow }}
              >
                <Plus size={18} /> {activeGrade?.name} İçin Yeni Soru / Test Ekle
              </button>
            </div>
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
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: activeGradeTheme.shadow,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  border: '1.5px solid rgba(255,255,255,0.25)'
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
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.4)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '190px'
              }}
              className="qbank-card"
            >
              <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.2, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
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
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '190px'
                  }}
                  className="qbank-card"
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
              <div style={{ padding: '3.5rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '1.5rem', border: '1.5px dashed var(--color-border-input)', gridColumn: '1 / -1' }}>
                <BookOpen size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--color-text)' }}>Bu sınıfa ait ders bulunamadı.</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          
          {/* Top Bar with Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => setActiveSubjectId(null)}
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', padding: '0.6rem 1.25rem', borderRadius: '0.85rem', fontWeight: 800, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <ArrowLeft size={18} /> Tüm Ders Portalı'na Dön
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.7rem 1.25rem',
                  borderRadius: '0.85rem',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.35)'
                }}
              >
                <Sparkles size={18} /> 🤖 {activeSubject?.name} İçin AI ile Soru Üret
              </button>

              <button
                className="btn btn-primary"
                onClick={() => { resetForm(); setShowModal(true); }}
                style={{ background: activeSubjectTheme.color, borderColor: activeSubjectTheme.color, padding: '0.7rem 1.25rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: activeSubjectTheme.shadow }}
              >
                <Plus size={18} /> {activeSubject?.name} İçin Yeni Soru / Test Ekle
              </button>
            </div>
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
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: activeSubjectTheme.shadow,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  border: '1.5px solid rgba(255,255,255,0.25)'
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

          {/* ═════════════════════════════════════════════════════════════════════
              CURRICULUM UNITS & TOPICS CARD EXPLORER (Kart Tabanlı Müfredat Gezgini)
          ═════════════════════════════════════════════════════════════════════ */}
          {activeSubjectId !== 'all_subjects' && (() => {
            const subjectUnits = curData.units.filter(u => u.subjectId === activeSubjectId);
            const activeUnitObj = curData.units.find(u => u.id === selectedUnit);
            const activeTopicObj = curData.topics.find(t => t.id === selectedTopic);
            const unitTopics = selectedUnit !== 'all' ? curData.topics.filter(t => t.unitId === selectedUnit) : [];

            // Unit Color Themes
            
            // Topic Color Themes (Matching Grade & Subject & Unit card palettes)
            const topicGradients = [
              { bg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', color: '#0284c7', shadow: '0 12px 30px rgba(2, 132, 199, 0.35)' },
              { bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#059669', shadow: '0 12px 30px rgba(16, 185, 129, 0.35)' },
              { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#7c3aed', shadow: '0 12px 30px rgba(139, 92, 246, 0.35)' },
              { bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', color: '#d97706', shadow: '0 12px 30px rgba(245, 158, 11, 0.35)' },
              { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: '#db2777', shadow: '0 12px 30px rgba(236, 72, 153, 0.35)' },
              { bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#4f46e5', shadow: '0 12px 30px rgba(99, 102, 241, 0.35)' },
              { bg: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', color: '#0d9488', shadow: '0 12px 30px rgba(20, 184, 166, 0.35)' },
              { bg: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', color: '#e11d48', shadow: '0 12px 30px rgba(244, 63, 94, 0.35)' },
              { bg: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: '#9333ea', shadow: '0 12px 30px rgba(168, 85, 247, 0.35)' }
            ];

            const unitGradients = [
              { bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#6366f1', shadow: '0 10px 25px rgba(99, 102, 241, 0.35)' },
              { bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#0284c7', shadow: '0 10px 25px rgba(2, 132, 199, 0.35)' },
              { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#10b981', shadow: '0 10px 25px rgba(16, 185, 129, 0.35)' },
              { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#f59e0b', shadow: '0 10px 25px rgba(245, 158, 11, 0.35)' },
              { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', color: '#ec4899', shadow: '0 10px 25px rgba(236, 72, 153, 0.35)' },
              { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: '#8b5cf6', shadow: '0 10px 25px rgba(139, 92, 246, 0.35)' },
              { bg: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', color: '#14b8a6', shadow: '0 10px 25px rgba(20, 184, 166, 0.35)' },
              { bg: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#f43f5e', shadow: '0 10px 25px rgba(244, 63, 94, 0.35)' }
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                {/* ── INTERACTIVE BREADCRUMB STRIP ── */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  flexWrap: 'wrap',
                  padding: '0.65rem 1.15rem',
                  background: 'var(--color-surface)',
                  borderRadius: '0.85rem',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <span
                    onClick={() => { setActiveGradeId(null); setActiveSubjectId(null); setSelectedUnit('all'); setSelectedTopic('all'); }}
                    style={{ cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Tüm Sınıflara Dön"
                  >
                    🏠 Soru Bankası
                  </span>
                  {activeGrade && (
                    <>
                      <ChevronRight size={14} color="var(--color-text-muted)" />
                      <span
                        onClick={() => { setActiveSubjectId(null); setSelectedUnit('all'); setSelectedTopic('all'); }}
                        style={{ cursor: 'pointer', color: '#6366f1' }}
                        title="Bu Sınıfın Derslerine Dön"
                      >
                        🎓 {activeGrade.name}
                      </span>
                    </>
                  )}
                  {activeSubject && (
                    <>
                      <ChevronRight size={14} color="var(--color-text-muted)" />
                      <span
                        onClick={() => { setSelectedUnit('all'); setSelectedTopic('all'); }}
                        style={{ cursor: 'pointer', color: selectedUnit === 'all' ? 'var(--color-text)' : '#6366f1' }}
                        title="Bu Derse Ait Tüm Ünitelere Dön"
                      >
                        📚 {activeSubject.name}
                      </span>
                    </>
                  )}
                  {activeUnitObj && (
                    <>
                      <ChevronRight size={14} color="var(--color-text-muted)" />
                      <span
                        onClick={() => setSelectedTopic('all')}
                        style={{ cursor: 'pointer', color: selectedTopic === 'all' ? 'var(--color-text)' : '#6366f1' }}
                        title="Bu Ünitenin Tüm Konularına Dön"
                      >
                        📖 {activeUnitObj.name}
                      </span>
                    </>
                  )}
                  {activeTopicObj && (
                    <>
                      <ChevronRight size={14} color="var(--color-text-muted)" />
                      <span style={{ color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        🏷️ {activeTopicObj.name}
                      </span>
                    </>
                  )}
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    LEVEL 3: UNIT CARDS GRID (When selectedUnit === 'all')
                ══════════════════════════════════════════════════════════════════ */}
                {selectedUnit === 'all' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          📖 {activeSubject?.name} Üniteleri
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', fontWeight: 800 }}>
                            {subjectUnits.length} Ünite
                          </span>
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          İncelemek, konularını görmek veya soru üretmek istediğiniz üniteyi seçin.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLaunchAiWithTopic('', activeSubject?.name || '', '', '')}
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '0.55rem 1.15rem',
                          borderRadius: '0.75rem',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 14px rgba(139,92,246,0.35)'
                        }}
                      >
                        <Sparkles size={15} />
                        <span>Tüm Ders İçin AI Soru Üret</span>
                      </button>
                    </div>

                    <div className="qbank-grid">
                      {/* Global Subject Questions Card */}
                      <div
                        onClick={() => {
                          setSelectedUnit('all');
                          setSelectedTopic('all');
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                          borderRadius: '1.5rem',
                          padding: '1.6rem',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: '0 12px 30px rgba(79, 70, 229, 0.35)',
                          border: '1.5px solid rgba(255,255,255,0.3)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '195px'
                        }}
                        className="qbank-card"
                      >
                        <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                          <BookOpen size={125} />
                        </div>

                        <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                          <div className="card-icon-box" style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={26} color="white" />
                          </div>

                          <span className="card-badge" style={{ background: 'white', color: '#4f46e5', fontSize: '0.82rem', fontWeight: 900, padding: '0.3rem 0.8rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                            ⚡ {filteredQuestions.length} Soru
                          </span>
                        </div>

                        <div className="card-bottom-row" style={{ position: 'relative', zIndex: 2, marginTop: '1.25rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, lineHeight: 1.2 }}>
                            🌟 Tüm Üniteler (Genel Liste)
                          </h3>
                          <div className="card-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem', fontSize: '0.82rem', fontWeight: 800, opacity: 0.95 }}>
                            <span>Tüm Soruları Aşağıda Listele</span>
                            <ChevronRight size={15} />
                          </div>
                        </div>
                      </div>

                      {/* Unit Cards */}
                      {subjectUnits.map((unit, uIdx) => {
                        const theme = unitGradients[uIdx % unitGradients.length];
                        const unitTopicsList = curData.topics.filter(t => t.unitId === unit.id);
                        const uTopicIds = unitTopicsList.map(t => t.id);
                        const unitQCount = questions.filter(q =>
                          uTopicIds.includes(q.topicId) ||
                          q.topicId === `unit_${unit.id}_all` ||
                          q.topicId === unit.id ||
                          (q.unitId && q.unitId === unit.id)
                        ).length;

                        return (
                          <div
                            key={unit.id}
                            style={{
                              background: theme.bg,
                              borderRadius: '1.5rem',
                              padding: '1.6rem',
                              color: 'white',
                              boxShadow: theme.shadow,
                              border: '1.5px solid rgba(255,255,255,0.25)',
                              transition: 'all 0.3s ease',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: '210px'
                            }}
                            className="qbank-card"
                          >
                            <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                              <FolderTree size={125} />
                            </div>

                            {/* Top row */}
                            <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, flexWrap: 'wrap', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.25)', fontWeight: 900, fontSize: '0.74rem', backdropFilter: 'blur(6px)' }}>
                                  {uIdx + 1}. ÜNİTE
                                </span>
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', fontWeight: 800, fontSize: '0.72rem' }}>
                                  📘 {unitTopicsList.length} Konu
                                </span>
                              </div>

                              <span className="card-badge" style={{ background: 'white', color: theme.color, fontSize: '0.82rem', fontWeight: 900, padding: '0.28rem 0.75rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                                ⚡ {unitQCount} Soru
                              </span>
                            </div>

                            {/* Title & Preview Topics */}
                            <div style={{ position: 'relative', zIndex: 2, margin: '1rem 0' }}>
                              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.25 }}>
                                {unit.name}
                              </h3>

                              {unitTopicsList.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.65rem' }}>
                                  {unitTopicsList.slice(0, 3).map((t, idx) => (
                                    <span key={t.id || idx} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                      {t.name}
                                    </span>
                                  ))}
                                  {unitTopicsList.length > 3 && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.25)' }}>
                                      +{unitTopicsList.length - 3} daha
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', position: 'relative', zIndex: 2, paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUnit(unit.id);
                                  setSelectedTopic('all');
                                }}
                                style={{
                                  flex: 1,
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '0.6rem',
                                  background: 'white',
                                  color: theme.color,
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                                }}
                              >
                                <span>Konuları Aç & İncele</span>
                                <ChevronRight size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchAiWithTopic('', unit.name, '', unit.id);
                                }}
                                style={{
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '0.6rem',
                                  background: 'rgba(0,0,0,0.3)',
                                  color: 'white',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Yapay zeka ile bu üniteye özel soru üret"
                              >
                                <Sparkles size={13} />
                                <span>AI</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ══════════════════════════════════════════════════════════════════
                      LEVEL 4: TOPIC CARDS GRID (When a specific Unit is selected)
                  ══════════════════════════════════════════════════════════════════ */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Active Unit Hero / Sub-Header */}
                    <div style={{
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: '1.25rem',
                      padding: '1.25rem 1.5rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '240px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnit('all');
                            setSelectedTopic('all');
                          }}
                          style={{
                            padding: '0.55rem 0.95rem',
                            borderRadius: '0.75rem',
                            border: '1.5px solid var(--color-border-input)',
                            background: 'var(--color-surface-hover)',
                            color: 'var(--color-text)',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <ArrowLeft size={17} />
                          <span>Tüm Ünitelere Dön</span>
                        </button>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>
                              📖 {activeUnitObj?.name}
                            </h3>
                            <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800 }}>
                              {unitTopics.length} Konu Kartı
                            </span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {activeSubject?.name} dersine ait bu ünitenin tüm konuları aşağıda kartlar olarak listelenmiştir.
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleLaunchAiWithTopic('', activeUnitObj?.name || '', '', activeUnitObj?.id || '')}
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '0.6rem 1.15rem',
                            borderRadius: '0.75rem',
                            fontWeight: 900,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 14px rgba(139,92,246,0.35)'
                          }}
                        >
                          <Sparkles size={16} />
                          <span>Bu Üniteye AI Soru Üret</span>
                        </button>
                      </div>
                    </div>

                    {/* TOPIC CARDS GRID (Sınıf, Ders ve Ünitelerle Birebir Aynı Tasarımda) */}
                    <div className="qbank-grid">
                      {/* Topic Card 0: All topics in this unit */}
                      <div
                        onClick={() => setSelectedTopic('all')}
                        style={{
                          background: selectedTopic === 'all'
                            ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
                            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          borderRadius: '1.5rem',
                          padding: '1.6rem',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: selectedTopic === 'all' ? '0 14px 35px rgba(79, 70, 229, 0.5)' : '0 10px 25px rgba(99, 102, 241, 0.35)',
                          border: selectedTopic === 'all' ? '2.5px solid #ffffff' : '1.5px solid rgba(255,255,255,0.3)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '195px'
                        }}
                        className="qbank-card"
                      >
                        <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                          <Layers size={125} />
                        </div>

                        <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="card-icon-box" style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={26} color="white" />
                            </div>
                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.25)', fontWeight: 900, fontSize: '0.74rem' }}>
                              GENEL LİSTE
                            </span>
                          </div>

                          <span className="card-badge" style={{ background: 'white', color: '#4f46e5', fontSize: '0.82rem', fontWeight: 900, padding: '0.3rem 0.8rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                            ⚡ {questions.filter(q => q.unitId === activeUnitObj?.id || curData.topics.filter(t => t.unitId === activeUnitObj?.id).map(t => t.id).includes(q.topicId)).length} Soru
                          </span>
                        </div>

                        <div className="card-bottom-row" style={{ position: 'relative', zIndex: 2, marginTop: '1.25rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.2 }}>
                            🌟 Ünitenin Tüm Soruları
                          </h3>
                          <div className="card-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem', fontSize: '0.82rem', fontWeight: 800, opacity: 0.95 }}>
                            <span>{selectedTopic === 'all' ? '✓ Aktif Olarak Gösteriliyor' : 'Bu Ünitedeki Tüm Soruları Listele'}</span>
                            <ChevronRight size={15} />
                          </div>
                        </div>
                      </div>

                      {/* Individual Topic Cards (Matching Grade & Subject Cards) */}
                      {unitTopics.map((topic, tIdx) => {
                        const theme = topicGradients[tIdx % topicGradients.length];
                        const isTopicSelected = selectedTopic === topic.id;
                        const topicQCount = questions.filter(q => q.topicId === topic.id).length;

                        return (
                          <div
                            key={topic.id}
                            style={{
                              background: theme.bg,
                              borderRadius: '1.5rem',
                              padding: '1.6rem',
                              color: 'white',
                              boxShadow: isTopicSelected ? '0 16px 40px rgba(0,0,0,0.45)' : theme.shadow,
                              border: isTopicSelected ? '2.5px solid #ffffff' : '1.5px solid rgba(255,255,255,0.25)',
                              transform: isTopicSelected ? 'scale(1.02)' : 'none',
                              transition: 'all 0.3s ease',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: '205px'
                            }}
                            className="qbank-card"
                          >
                            {/* Watermark floating icon */}
                            <div className="card-bg-icon" style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                              <Sparkles size={125} />
                            </div>

                            {/* Top row */}
                            <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, flexWrap: 'wrap', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="card-icon-box" style={{ width: '46px', height: '46px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Sparkles size={24} color="white" />
                                </div>
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.25)', fontWeight: 900, fontSize: '0.74rem', backdropFilter: 'blur(6px)' }}>
                                  {tIdx + 1}. KONU
                                </span>
                              </div>

                              <span className="card-badge" style={{ background: 'white', color: theme.color, fontSize: '0.82rem', fontWeight: 900, padding: '0.28rem 0.75rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                                ⚡ {topicQCount} Soru / Test
                              </span>
                            </div>

                            {/* Title */}
                            <div style={{ position: 'relative', zIndex: 2, margin: '1rem 0' }}>
                              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.25 }}>
                                {topic.name}
                              </h3>
                              {isTopicSelected && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.45rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', fontWeight: 800 }}>
                                  <Check size={13} /> Aktif Filtre
                                </div>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', position: 'relative', zIndex: 2, paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTopic(topic.id);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '0.6rem',
                                  background: isTopicSelected ? '#ffffff' : 'rgba(255,255,255,0.95)',
                                  color: theme.color,
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                                }}
                              >
                                <span>{isTopicSelected ? '✓ Soruları Listelendi' : 'Soruları Filtrele'}</span>
                                <ChevronRight size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchAiWithTopic(topic.name, activeUnitObj?.name || '', topic.id, activeUnitObj?.id || '');
                                }}
                                style={{
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '0.6rem',
                                  background: 'rgba(0,0,0,0.3)',
                                  color: 'white',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Bu konuya özel yapay zeka ile soru üret"
                              >
                                <Sparkles size={13} />
                                <span>AI</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {unitTopics.length === 0 && (
                      <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '1.5rem', border: '1.5px dashed var(--color-border-input)' }}>
                        <FolderTree size={44} color="var(--color-text-muted)" style={{ marginBottom: '0.75rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--color-text)' }}>Bu ünitede henüz alt konu tanımlanmamış.</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          Yukarıdaki "Bu Üniteye AI Soru Üret" butonu ile ünite genelinde sorular üretebilir veya yönetici panelinden alt konular tanımlayabilirsiniz.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Subject Filter Bar */}
          <div className="top-filter-bar">
            <div className="filter-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} /> {activeSubject?.name} Filtreleri
              </div>

              {/* SEARCH INPUT BAR */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Bu derste soru / test ara..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 2rem 0.55rem 2.25rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border-input)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.2rem' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="filter-grid">
              
              {!activeGradeId && (
                <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedSubject('all'); setSelectedUnit('all'); setSelectedTopic('all'); }}>
                  <option value="all">Tüm Sınıflar (Genel)</option>
                  {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              {activeSubjectId === 'all_subjects' && (
                <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedUnit('all'); setSelectedTopic('all'); }}>
                  <option value="all">Tüm Dersler (Genel)</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}

              {(activeSubjectId !== 'all_subjects' || (selectedSubject && selectedSubject !== 'all')) && (
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

              <select value={selectedContentType} onChange={e => setSelectedContentType(e.target.value)}>
                <option value="all">Tüm İçerik Türleri</option>
                <option value="text">Sadece Metin</option>
                <option value="json">Yazılı Test Paketleri</option>
                <option value="gorsel">Sadece Görsel</option>
                <option value="pdf">PDF Paketleri</option>
                <option value="html">HTML Paketleri</option>
              </select>

              {/* View toggle */}
              <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem', padding: '0.25rem', border: '1px solid var(--color-border-input)' }}>
                <button onClick={() => setViewMode('card')} title="Kart Görünümü" style={{ padding: '0.4rem 0.75rem', borderRadius: '0.55rem', border: 'none', cursor: 'pointer', background: viewMode === 'card' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent', color: viewMode === 'card' ? '#ffffff' : 'var(--color-text-muted)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 900, fontSize: '0.78rem' }}>
                  <LayoutGrid size={15} /> Kart
                </button>
                <button onClick={() => setViewMode('row')} title="Satır Görünümü" style={{ padding: '0.4rem 0.75rem', borderRadius: '0.55rem', border: 'none', cursor: 'pointer', background: viewMode === 'row' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent', color: viewMode === 'row' ? '#ffffff' : 'var(--color-text-muted)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 900, fontSize: '0.78rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {groupedPageQuestions.map(group => (
                <div key={group.key} className="qbank-glass-card" style={{ padding: '1.25rem' }}>
                  
                  {/* Category Header */}
                  <div style={{ background: 'var(--color-surface-hover)', padding: '1rem 1.25rem', borderRadius: '1rem', border: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.65rem', background: activeSubjectTheme.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.1rem' }}>
                          {group.title}
                        </h3>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          {group.subtitle}
                        </p>
                      </div>
                    </div>

                    <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', fontWeight: 900, fontSize: '0.82rem', padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                      {group.items.length} İçerik / Test
                    </span>
                  </div>

                  {/* Question Cards - Card / Row toggle */}
                  {renderQList(group.items, 'transparent')}

                </div>
              ))}

              {groupedPageQuestions.length === 0 && (
                <div className="card glass empty-state" style={{ padding: '3.5rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '1.5rem', border: '2px dashed var(--color-border-input)' }}>
                  <BookOpen size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--color-text)' }}>
                    {activeSubject?.name} dersinde bu filtrelere uygun soru bulunamadı.
                  </h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '1200px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '1.75rem', padding: '2.25rem', background: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0', boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,0,0,0.15)', color: isDark ? '#f8fafc' : '#0f172a' }}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {creationStep === 2 && !editingQuestionId && (
                  <button
                    type="button"
                    onClick={() => setCreationStep(1)}
                    style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ArrowLeft size={16} /> Tür Seçimine Dön
                  </button>
                )}
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {editingQuestionId ? '✏️ İçeriği / Testi Düzenle' : (creationStep === 1 ? '✨ İçerik Türü Seçiniz' : '➕ Soru / Test Detaylarını Giriniz')}
                </h3>
              </div>

              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }} style={{ borderRadius: '50%', padding: '0.6rem', background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1', color: isDark ? '#cbd5e1' : '#475569', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>
            
            {/* STEP 1: TYPE SELECTION WIZARD */}
            {creationStep === 1 && !editingQuestionId ? (
              <div>
                {/* FAST FILE UPLOAD DROPZONE */}
                <div style={{ background: isDark ? 'rgba(99,102,241,0.12)' : '#eff6ff', border: isDark ? '2px dashed rgba(165,180,252,0.4)' : '2px dashed #93c5fd', borderRadius: '1.25rem', padding: '1.75rem', marginBottom: '1.75rem', textAlign: 'center' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
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
                    <div style={{ width: 56, height: 56, borderRadius: '1.25rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(99,102,241,0.25)' }}>
                      <Plus size={30} />
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: isDark ? '#ffffff' : '#0f172a' }}>
                      📁 Bilgisayardan Doğrudan Dosya Yükleyin
                    </div>
                    <div style={{ fontSize: '0.85rem', color: isDark ? '#c7d2fe' : '#475569', fontWeight: 600 }}>
                      Görsel (PNG/JPG), PDF (.pdf), HTML (.html) veya JSON (.json) dosyanızı seçin veya buraya sürükleyin
                    </div>
                  </label>
                </div>

                
                {/* 🤖 AI QUESTION GENERATOR WIZARD CARD */}
                <div style={{ background: isDark ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))' : 'linear-gradient(135deg, #fdf4ff, #f5f3ff)', border: '1.5px solid #c084fc', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 14px rgba(139,92,246,0.4)' }}>
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🤖 Yapay Zeka ile Soru Paketi Üretici (Google Gemini)
                        <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 99, background: '#8b5cf6', color: '#ffffff', fontWeight: 800 }}>ÖNERİLEN ⚡</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Konu metni veya PDF yükleyerek MEB / ÖSYM formatında 4/5 şıklı soru paketleri üretin, düzenleyin ve tek tıkla aktarın.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setIsAiModalOpen(true); }}
                    className="btn-gradient"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: '0.65rem 1.25rem', fontSize: '0.85rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: 'none', color: '#ffffff', fontWeight: 900, boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}
                  >
                    <Sparkles size={16} /> AI Soru Üreticiyi Başlat
                  </button>
                </div>

                <div style={{ background: isDark ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' : 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1.5px solid #818cf8', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Scissors size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text)' }}>✂️ PDF / Görselden Akıllı Soru Kırpıcı (Smart Slicer)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PDF sayfasındaki soruları farenizle seçip kırparak anında soru bankasına aktarın.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); navigate('/pdf-slicer?mode=general'); }}
                    className="btn-gradient"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Scissors size={16} /> Soru Kırpıcıyı Başlat
                  </button>
                </div>

                <p style={{ fontSize: '0.95rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>
                  Veya manuel içerik türü seçerek devam edin:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  
                  {/* Option 1: Single Text Question */}
                  <div
                    onClick={() => handleSelectType('text')}
                    style={{
                      background: isDark ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.22) 100%)' : '#eff6ff',
                      border: isDark ? '1.5px solid rgba(96, 165, 250, 0.35)' : '1.5px solid #bfdbfe', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}>
                      <Type size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#93c5fd' : '#1d4ed8', margin: '0 0 0.35rem 0' }}>
                        📄 Sadece Metin (Tek Soru)
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#475569', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Tek bir yazılı çoktan seçmeli veya açık uçlu soru metni ve şıklarını ekleyin.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Written Test Bundle */}
                  <div
                    onClick={() => handleSelectType('json')}
                    style={{
                      background: isDark ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.22) 100%)' : '#f5f3ff',
                      border: isDark ? '1.5px solid rgba(167, 139, 250, 0.35)' : '1.5px solid #ddd6fe', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(139,92,246,0.4)' }}>
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#c4b5fd' : '#6d28d9', margin: '0 0 0.35rem 0' }}>
                        📝 Toplu Yazılı Test Paketi
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#475569', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Birden fazla yazılı sorudan oluşan toplu bir test ekleyin (Ekran üzerinden veya JSON ile).
                      </p>
                    </div>
                  </div>

                  {/* Option 3: Image Question */}
                  <div
                    onClick={() => handleSelectType('gorsel')}
                    style={{
                      background: isDark ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.22) 100%)' : '#fffbeb',
                      border: isDark ? '1.5px solid rgba(251, 191, 36, 0.35)' : '1.5px solid #fde68a', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}>
                      <Image size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#fde68a' : '#b45309', margin: '0 0 0.35rem 0' }}>
                        🖼️ Görsel Soru (Tekli / Toplu)
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#475569', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Bir veya birden fazla resim dosyası yükleyerek görsel soru veya sorular ekleyin.
                      </p>
                    </div>
                  </div>

                  {/* Option 4: PDF Test Bundle (Link Based) */}
                  <div
                    onClick={() => handleSelectType('pdf')}
                    style={{
                      background: isDark ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.22) 100%)' : '#fef2f2',
                      border: isDark ? '1.5px solid rgba(248, 113, 113, 0.35)' : '1.5px solid #fecaca', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#fca5a5' : '#b91c1c', margin: '0 0 0.35rem 0' }}>
                        🔗 PDF Test Bağlantısı
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#475569', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                        Google Drive, OneDrive veya web PDF linki yapıştırın (0 MB sunucu kotası).
                      </p>
                    </div>
                  </div>

                  {/* Option 5: HTML Web Page / Code Test Bundle */}
                  <div
                    onClick={() => handleSelectType('html')}
                    style={{
                      background: isDark ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.22) 100%)' : '#f0fdf4',
                      border: isDark ? '1.5px solid rgba(52, 211, 153, 0.35)' : '1.5px solid #bbf7d0', borderRadius: '1.25rem', padding: '1.5rem',
                      cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                    }}
                    className="hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                      <Globe size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#6ee7b7' : '#047857', margin: '0 0 0.35rem 0' }}>
                        🌐 HTML Web Sayfası / Testi
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#475569', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
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
                <div style={{ background: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eff6ff', border: isDark ? '1.5px solid rgba(165, 180, 252, 0.3)' : '1.5px solid #bfdbfe', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, color: isDark ? '#c7d2fe' : '#1e40af', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getTypeIcon(formData.contentType, showBundleFields || formData.contentType === 'json')}
                    Seçili Tür: <strong style={{ color: isDark ? '#ffffff' : '#1d4ed8' }}>{getTypeLabel({ contentType: formData.contentType, isBundle: showBundleFields || formData.contentType === 'json' })}</strong>
                  </span>
                  {!editingQuestionId && (
                    <button
                      type="button"
                      onClick={() => setCreationStep(1)}
                      style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff', color: isDark ? '#ffffff' : '#1e40af', border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #bfdbfe', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Değiştir
                    </button>
                  )}
                </div>

                {/* UPLOADED FILE BADGE DISPLAY IF ANY */}
                {uploadedFileInfo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', border: isDark ? '1.5px solid rgba(52, 211, 153, 0.35)' : '1.5px solid #a7f3d0', padding: '0.85rem 1.25rem', borderRadius: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ background: '#10b981', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 99, textTransform: 'uppercase' }}>
                        {uploadedFileInfo.type} Yüklendi
                      </span>
                      <span style={{ fontWeight: 800, color: isDark ? '#ffffff' : '#065f46', fontSize: '0.9rem' }}>{uploadedFileInfo.name}</span>
                      <span style={{ color: isDark ? '#34d399' : '#059669', fontSize: '0.75rem' }}>({uploadedFileInfo.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFileInfo(null)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Kaldır
                    </button>
                  </div>
                )}

                {/* Title & Soru Tipi Selector & Universal Option Count */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div className="form-group" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#ffffff' : '#0f172a', marginBottom: '0.4rem', display: 'block' }}>
                      🏷️ Soru veya Test İsmi / Etiketi <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>(İsim verin)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Örn: 2024 LGS Matematik Denemesi A, Üslü Sayılar Testi..."
                      style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#ffffff' : '#0f172a', marginBottom: '0.4rem', display: 'block' }}>
                      ✍️ Soru / Test Çözüm Tipi
                    </label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1', width: '100%', fontSize: '0.95rem', fontWeight: 700, background: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                    >
                      <option value="coktan_secmeli">🔘 Çoktan Seçmeli (Optikli / Cevap Anahtarlı)</option>
                      <option value="acik_uclu">📝 Açık Uçlu (Metin Yanıtlı / Yazılı)</option>
                    </select>
                  </div>

                  {formData.type === 'coktan_secmeli' && (
                    <div className="form-group" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label style={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#ffffff' : '#0f172a', margin: 0 }}>
                          🔘 Şık / Seçenek Sayısı
                        </label>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#6366f1' }}>
                          {currentOptionCount} Şık ({getOptionLetters(currentOptionCount).join('-')})
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginTop: '0.4rem' }}>
                        {[
                          { count: 2, label: '2 Şık', sub: 'A-B', color: '#3b82f6' },
                          { count: 3, label: '3 Şık', sub: 'A-C', color: '#f59e0b' },
                          { count: 4, label: '4 Şık', sub: 'A-D', color: '#10b981' },
                          { count: 5, label: '5 Şık', sub: 'A-E', color: '#8b5cf6' }
                        ].map(item => {
                          const isSel = currentOptionCount === item.count;
                          return (
                            <button
                              key={item.count}
                              type="button"
                              onClick={() => handleOptionCountChange(item.count)}
                              style={{
                                padding: '0.55rem 0.2rem',
                                borderRadius: '0.6rem',
                                border: isSel ? `2px solid ${item.color}` : (isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1'),
                                background: isSel ? (isDark ? `${item.color}25` : `${item.color}15`) : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                                color: isSel ? (isDark ? '#ffffff' : item.color) : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                                fontWeight: 900,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div>{item.label}</div>
                              <div style={{ fontSize: '0.68rem', opacity: isSel ? 1 : 0.7 }}>({item.sub})</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* TYPE 1: PDF TEST BUNDLE FORM (LINK ONLY - ZERO SUPABASE EGRESS) */}
                {formData.contentType === 'pdf' && (
                  <div className="form-group" style={{ background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', border: isDark ? '1.5px solid rgba(248, 113, 113, 0.3)' : '1.5px solid #fca5a5', padding: '1.5rem', borderRadius: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontWeight: 900, fontSize: '1.05rem', color: isDark ? '#fca5a5' : '#b91c1c', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🔗 PDF / Google Drive Bağlantısı
                      </label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7', color: isDark ? '#34d399' : '#15803d', padding: '3px 8px', borderRadius: '6px' }}>
                        ⚡ 0 MB Sunucu Trafiği (Limitsiz)
                      </span>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #fee2e2', padding: '0.85rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', lineHeight: 1.6, color: isDark ? 'rgba(255,255,255,0.8)' : '#7f1d1d' }}>
                      💡 <strong>Nasıl Eklenir?</strong> PDF dosyanızı <strong>Google Drive, OneDrive, Dropbox</strong> veya herhangi bir web alanına yükleyin. Drive için paylaşım ayarını <em>"Bağlantıya sahip olan herkes (Görüntüleyen)"</em> yapıp linkini yapıştırın.
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="url" 
                        value={formData.contentPayload} 
                        onChange={e => setFormData({...formData, contentPayload: e.target.value.trim()})} 
                        placeholder="Örn: https://drive.google.com/file/d/1A2B3C.../view veya https://site.com/test.pdf" 
                        style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1', fontSize: '0.95rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                        required 
                      />
                      {formData.contentPayload && (
                        <a
                          href={getEmbeddableUrl(formData.contentPayload) || formData.contentPayload}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
                        >
                          👁️ Yeni Sekmede Aç
                        </a>
                      )}
                    </div>

                    {/* Google Drive Specific Guidance Alert */}
                    {formData.contentPayload && formData.contentPayload.includes('drive.google.com') && (
                      <div style={{
                        marginTop: '0.75rem',
                        background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                        border: isDark ? '1px solid rgba(147, 197, 253, 0.3)' : '1px solid #bfdbfe',
                        borderRadius: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                        color: isDark ? '#bfdbfe' : '#1e40af',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        lineHeight: 1.5
                      }}>
                        <span style={{ fontSize: '1rem' }}>⚠️</span>
                        <div>
                          <strong>Google Drive Yetki Kontrolü:</strong> Önizleme açılmıyorsa veya giriş ekranı geliyorsa dosyanız Drive'da <em>"Kısıtlı"</em> kalmış olabilir. 
                          Google Drive'da dosyaya <strong>Sağ Tık ➔ Paylaş ➔ Genel Erişim ➔ "Bağlantıya sahip olan herkes" (Görüntüleyen)</strong> olarak ayarladığınızdan emin olun.
                        </div>
                      </div>
                    )}

                    {formData.contentPayload && getEmbeddableUrl(formData.contentPayload) && (
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#fca5a5' : '#b91c1c' }}>
                            📄 Canlı Önizleme:
                          </span>
                          <a
                            href={getEmbeddableUrl(formData.contentPayload) || formData.contentPayload}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textDecoration: 'underline' }}
                          >
                            Düzgün görünmüyorsa yeni sekmede aç ↗
                          </a>
                        </div>
                        <iframe
                          src={getEmbeddableUrl(formData.contentPayload)}
                          title="PDF Önizleme"
                          style={{ width: '100%', height: '350px', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1', borderRadius: '0.65rem', background: '#ffffff' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* TYPE 2: HTML FORM */}
                {formData.contentType === 'html' && (
                  <div className="form-group" style={{ background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4', border: isDark ? '1.5px solid rgba(52, 211, 153, 0.3)' : '1.5px solid #86efac', padding: '1.5rem', borderRadius: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontWeight: 900, fontSize: '1rem', color: isDark ? '#6ee7b7' : '#047857', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Globe size={18} /> HTML Dosyası Yükleyin veya Kod Yapıştırın
                      </label>

                      {formData.contentPayload && (
                        <button
                          type="button"
                          onClick={() => setShowHtmlCodeEditor(prev => !prev)}
                          style={{
                            background: showHtmlCodeEditor ? (isDark ? 'rgba(99,102,241,0.3)' : '#e0e7ff') : (isDark ? 'rgba(255,255,255,0.08)' : '#ffffff'),
                            color: showHtmlCodeEditor ? (isDark ? '#c7d2fe' : '#4338ca') : (isDark ? '#cbd5e1' : '#475569'),
                            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.65rem',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Code size={14} /> {showHtmlCodeEditor ? 'Kodu Gizle' : 'Kodu / URL Düzenle'}
                        </button>
                      )}
                    </div>

                    {/* File Picker */}
                    <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', border: isDark ? '2px dashed rgba(52,211,153,0.5)' : '2px dashed #34d399', padding: '1.25rem', borderRadius: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, color: isDark ? '#6ee7b7' : '#059669', fontWeight: 800, fontSize: '0.9rem' }}>
                        <input type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={e => e.target.files && handleFileSelected(e.target.files[0])} />
                        📁 Bilgisayardan HTML Dosyası Seç (.html)
                      </label>
                      {uploadedFileInfo && uploadedFileInfo.type === 'html' && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#34d399' : '#059669' }}>
                          ✓ Seçilen Dosya: {uploadedFileInfo.name} ({uploadedFileInfo.size})
                        </div>
                      )}
                    </div>

                    {/* Code / URL Input (Shown when empty or when user toggles 'Kodu Düzenle') */}
                    {(!formData.contentPayload || showHtmlCodeEditor) && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#a7f3d0' : '#065f46' }}>
                            HTML Kodu veya Canlı Web Bağlantısı (URL):
                          </span>
                          {formData.contentPayload && (
                            <span style={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
                              {formData.contentPayload.length.toLocaleString('tr-TR')} karakter
                            </span>
                          )}
                        </div>
                        <textarea 
                          rows="6" 
                          value={formData.contentPayload} 
                          onChange={e => setFormData({...formData, contentPayload: e.target.value})} 
                          placeholder="Canlı Web Adresi (https://...) veya HTML Kodları (<!DOCTYPE html>...)..." 
                          style={{ padding: '0.85rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(52,211,153,0.3)' : '1.5px solid #cbd5e1', width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5, background: isDark ? 'rgba(0,0,0,0.4)' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', boxSizing: 'border-box' }}
                        ></textarea>
                      </div>
                    )}

                    {/* LIVE HTML PREVIEW (Underneath, rendered beautifully like PDF) */}
                    {formData.contentPayload ? (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isDark ? '#6ee7b7' : '#047857', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Eye size={15} /> 📄 Canlı HTML Test Önizlemesi:
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (formData.contentPayload.startsWith('http://') || formData.contentPayload.startsWith('https://')) {
                                  window.open(formData.contentPayload, '_blank');
                                } else {
                                  const blob = new Blob([formData.contentPayload], { type: 'text/html;charset=utf-8' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  window.open(blobUrl, '_blank');
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: isDark ? '#34d399' : '#059669', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}
                            >
                              Yeni Sekmede Aç <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>

                        <div style={{
                          background: '#ffffff',
                          borderRadius: '0.85rem',
                          border: isDark ? '1.5px solid rgba(52, 211, 153, 0.4)' : '1.5px solid #cbd5e1',
                          overflow: 'hidden',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                          height: '460px'
                        }}>
                          <HtmlViewerWithControls
                            payload={formData.contentPayload}
                            title={formData.title || 'HTML Test Önizleme'}
                            height="460px"
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontSize: '0.85rem', background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderRadius: '0.75rem', border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed #cbd5e1' }}>
                        🌐 Yukarıdan bir HTML dosyası seçtiğinizde veya kod/link girdiğinizde canlı test önizlemesi burada açılacaktır.
                      </div>
                    )}
                  </div>
                )}

                {/* TYPE 3: VISUAL WRITTEN TEST EDITOR */}
                {formData.contentType === 'json' && (
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '1.5rem', borderRadius: '1.25rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0' }}>
                    
                    {/* Mode Switcher Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.1rem' }}>
                          📝 Toplu Yazılı Test Düzenleme Alanı
                        </h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                          Soruları görsel olarak ekran üzerinden rahatça düzenleyebilir veya yeni soru ekleyebilirsiniz.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {formData.type === 'coktan_secmeli' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '0.65rem', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginRight: '0.15rem' }}>Şık:</span>
                            {[2, 3, 4, 5].map(cnt => {
                              const isSel = currentOptionCount === cnt;
                              return (
                                <button
                                  key={cnt}
                                  type="button"
                                  onClick={() => handleOptionCountChange(cnt)}
                                  style={{
                                    padding: '0.2rem 0.45rem',
                                    borderRadius: '0.4rem',
                                    border: isSel ? '1.5px solid #6366f1' : '1px solid transparent',
                                    background: isSel ? (isDark ? 'rgba(99,102,241,0.3)' : '#eff6ff') : 'transparent',
                                    color: isSel ? (isDark ? '#c7d2fe' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                                    fontWeight: isSel ? 900 : 700,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {cnt} Şık
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <label style={{ cursor: 'pointer', background: isDark ? 'rgba(99,102,241,0.2)' : '#eff6ff', color: isDark ? '#c7d2fe' : '#4f46e5', border: isDark ? '1px solid rgba(165,180,252,0.3)' : '1px solid #bfdbfe', padding: '0.45rem 0.95rem', borderRadius: '0.6rem', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => e.target.files && handleFileSelected(e.target.files[0])} />
                          📁 JSON Dosyası Yükle
                        </label>
                        <div style={{ display: 'flex', gap: '0.25rem', background: isDark ? 'rgba(0,0,0,0.3)' : '#e2e8f0', padding: '0.25rem', borderRadius: '0.75rem', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1' }}>
                          <button
                            type="button"
                            onClick={() => setJsonEditMode('visual')}
                            style={{
                              padding: '0.45rem 0.95rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                              fontWeight: 800, fontSize: '0.85rem',
                              background: jsonEditMode === 'visual' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                              color: jsonEditMode === 'visual' ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')
                            }}
                          >
                            📝 Görsel Düzenleyici
                          </button>
                          <button
                            type="button"
                            onClick={() => setJsonEditMode('code')}
                            style={{
                              padding: '0.45rem 0.95rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                              fontWeight: 800, fontSize: '0.85rem',
                              background: jsonEditMode === 'code' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                              color: jsonEditMode === 'code' ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')
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
                          {editableQuestionsList.map((qItem, qIdx) => {
                            const itemOpts = (qItem.options && qItem.options.length > 0) ? qItem.options : Array.from({ length: currentOptionCount }, () => '');
                            return (
                            <div key={qItem.id || qIdx} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ background: isDark ? 'rgba(99,102,241,0.25)' : '#eff6ff', color: isDark ? '#c7d2fe' : '#4f46e5', fontWeight: 900, fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: '6px', border: isDark ? '1px solid rgba(165,180,252,0.3)' : '1px solid #bfdbfe' }}>
                                  Soru {qIdx + 1}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveVisualQuestion(qIdx)}
                                  style={{ background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#dc2626', border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid #fca5a5', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Trash2 size={14} /> Soruyu Sil
                                </button>
                              </div>

                              {/* Question Text Input */}
                              <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', display: 'block', marginBottom: '0.35rem' }}>Soru Metni:</label>
                                <textarea
                                  rows="2"
                                  value={qItem.questionText || ''}
                                  onChange={e => handleUpdateVisualQuestionText(qIdx, e.target.value)}
                                  placeholder="Soru metnini buraya yazın..."
                                  style={{ padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '0.95rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                                />
                              </div>

                              {/* Option Inputs and Correct Answer Radio Buttons */}
                              {formData.type === 'coktan_secmeli' && (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', margin: 0 }}>
                                      Şıklar ve Doğru Cevap Seçimi:
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                                      {[2, 3, 4, 5].map(cnt => {
                                        const curLen = itemOpts.length;
                                        const isSel = curLen === cnt;
                                        return (
                                          <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => {
                                              setEditableQuestionsList(prev => {
                                                const copy = [...prev];
                                                let nextOpts = copy[qIdx].options ? [...copy[qIdx].options] : [];
                                                if (nextOpts.length > cnt) nextOpts = nextOpts.slice(0, cnt);
                                                else while (nextOpts.length < cnt) nextOpts.push('');
                                                copy[qIdx] = {
                                                  ...copy[qIdx],
                                                  optionCount: cnt,
                                                  optionsCount: cnt,
                                                  options: nextOpts,
                                                  correctAnswer: Math.min(copy[qIdx].correctAnswer || 0, cnt - 1)
                                                };
                                                return copy;
                                              });
                                            }}
                                            style={{
                                              padding: '0.15rem 0.4rem',
                                              borderRadius: '0.35rem',
                                              border: isSel ? '1px solid #6366f1' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1'),
                                              background: isSel ? (isDark ? 'rgba(99,102,241,0.25)' : '#eff6ff') : 'transparent',
                                              color: isSel ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.5)' : '#64748b'),
                                              fontWeight: isSel ? 900 : 700,
                                              fontSize: '0.7rem',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {cnt} Şık
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                    {itemOpts.map((optText, oIdx) => {
                                      const isCorrect = qItem.correctAnswer === oIdx;
                                      return (
                                        <div 
                                          key={oIdx} 
                                          onClick={() => handleUpdateVisualCorrectAnswer(qIdx, oIdx)}
                                          style={{ 
                                            background: isCorrect ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'), 
                                            padding: '0.75rem 0.85rem', 
                                            borderRadius: '0.75rem', 
                                            border: isCorrect ? '1.5px solid #10b981' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1'),
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.85rem', color: isCorrect ? (isDark ? '#34d399' : '#047857') : (isDark ? '#c7d2fe' : '#4f46e5') }}>
                                              {String.fromCharCode(65 + oIdx)}) Şıkkı
                                            </span>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: isCorrect ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b') }}>
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
                                            style={{ padding: '0.45rem 0.65rem', borderRadius: '0.5rem', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1', width: '100%', fontSize: '0.85rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                                          />
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

                        <button
                          type="button"
                          onClick={handleAddVisualQuestion}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '0.85rem', border: isDark ? '2px dashed rgba(165,180,252,0.4)' : '2px dashed #93c5fd', background: isDark ? 'rgba(99,102,241,0.1)' : '#eff6ff', color: isDark ? '#c7d2fe' : '#4f46e5', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
                          style={{ padding: '1rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1', width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.5, background: isDark ? 'rgba(0,0,0,0.4)' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', boxSizing: 'border-box' }}
                        ></textarea>
                      </div>
                    )}

                  </div>
                )}

                {/* TYPE 4: IMAGE QUESTION FORM WITH ALL CARDS & CEVAP ANAHTARI */}
                {formData.contentType === 'gorsel' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group" style={{ background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', border: isDark ? '1.5px solid rgba(251, 191, 36, 0.3)' : '1.5px solid #fde68a', padding: '1.5rem', borderRadius: '1.25rem' }}>
                      <label style={{ fontWeight: 900, fontSize: '1rem', color: isDark ? '#fde68a' : '#b45309', marginBottom: '0.5rem', display: 'block' }}>
                        🖼️ Resim / Görsel Yükleyin veya URL Yapıştırın
                      </label>

                      <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', border: isDark ? '2px dashed rgba(251,191,36,0.5)' : '2px dashed #f59e0b', padding: '1.25rem', borderRadius: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, color: isDark ? '#fde68a' : '#b45309', fontWeight: 800, fontSize: '0.95rem' }}>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleMultipleFilesSelected(e.target.files, imageUrls.length > 0);
                              }
                            }}
                          />
                          📁 Bilgisayardan Görsel(ler) Seç (PNG / JPG / WEBP - Çoklu Seçim Desteklenir)
                        </label>
                      </div>

                      {imageUrls.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderRadius: '0.65rem', background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5', border: isDark ? '1px solid rgba(52,211,153,0.3)' : '1px solid #a7f3d0', color: isDark ? '#34d399' : '#047857', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                          <span>✅ Toplam {imageUrls.length} adet görsel hazırlandı</span>
                          <button
                            type="button"
                            onClick={() => {
                              setImageUrls([]);
                              setImageAnswers({});
                              setFormData(prev => ({ ...prev, contentPayload: '', questionCount: 1 }));
                              setUploadedFileInfo(null);
                            }}
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '0.45rem', padding: '0.2rem 0.55rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem' }}
                          >
                            Tümünü Temizle
                          </button>
                        </div>
                      )}

                      <p style={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', margin: '0 0 0.5rem 0' }}>
                        Veya resim web URL'lerini buraya alt alta yapıştırın:
                      </p>
                      <textarea 
                        rows={imageUrls.length > 0 ? "2" : "4"} 
                        value={formData.contentPayload && !formData.contentPayload.startsWith('data:') ? formData.contentPayload : ''} 
                        onChange={handleImagePayloadChange} 
                        placeholder={imageUrls.length > 0 ? "Görseller başarıyla yüklendi. Ek URL eklemek isterseniz buraya yazabilirsiniz..." : "Resim linklerini buraya alt alta yapıştırın (https://...)"} 
                        style={{ padding: '0.85rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '0.95rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                      ></textarea>
                    </div>

                    {/* BULK ANSWER KEY FOR MULTIPLE CHOICE */}
                    {formData.type === 'coktan_secmeli' && (
                      <div style={{ background: isDark ? 'rgba(99,102,241,0.12)' : '#eff6ff', padding: '1rem', borderRadius: '0.85rem', border: isDark ? '1.5px solid rgba(165,180,252,0.25)' : '1.5px solid #bfdbfe' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.85rem', color: isDark ? '#c7d2fe' : '#1e40af', margin: 0 }}>
                            ⚡ Hızlı Toplu Cevap Anahtarı Yapıştır / Gir:
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', padding: '0.2rem', borderRadius: '0.5rem', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #bfdbfe' }}>
                              {[
                                { count: 2, label: '2 Şık' },
                                { count: 3, label: '3 Şık' },
                                { count: 4, label: '4 Şık' },
                                { count: 5, label: '5 Şık' }
                              ].map(item => {
                                const isSel = currentOptionCount === item.count;
                                return (
                                  <button
                                    key={item.count}
                                    type="button"
                                    onClick={() => handleOptionCountChange(item.count)}
                                    style={{
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '0.4rem',
                                      border: isSel ? '1.5px solid #6366f1' : 'none',
                                      background: isSel ? (isDark ? 'rgba(99,102,241,0.3)' : '#eff6ff') : 'transparent',
                                      color: isSel ? (isDark ? '#c7d2fe' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                                      fontWeight: isSel ? 900 : 700,
                                      fontSize: '0.72rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                            <span style={{ background: isDark ? 'rgba(99,102,241,0.2)' : '#dbeafe', color: isDark ? '#c7d2fe' : '#1e40af', fontWeight: 900, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                              Toplam {imageUrls.length || 1} Soru
                            </span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={formData.bulkAnswerKey}
                          onChange={e => handleImageBulkAnswerKeyChange(e.target.value)}
                          placeholder={`Örn: ${getOptionLetters(currentOptionCount).join('')} veya ${getOptionLetters(currentOptionCount).join(',')} veya 1A 2B 3C... (${currentOptionCount} Şık: ${getOptionLetters(currentOptionCount).join('-')})`}
                          style={{ padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: isDark ? '1.5px solid rgba(165,180,252,0.4)' : '1.5px solid #93c5fd', width: '100%', fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 800, background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {/* OPEN-ENDED BANNER WHEN AÇIK UÇLU */}
                    {formData.type === 'acik_uclu' && (
                      <div style={{ background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', border: isDark ? '1.5px solid rgba(251, 191, 36, 0.3)' : '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ margin: 0, fontWeight: 800, color: isDark ? '#fde68a' : '#b45309', fontSize: '0.85rem' }}>
                          📝 Açık Uçlu Sınav: Öğrenciler her görsel soru için metin kutusuna yazılı yanıt girecektir.
                        </p>
                        <span style={{ background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7', color: isDark ? '#fde68a' : '#b45309', fontWeight: 900, fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '20px' }}>
                          Toplam {imageUrls.length || 1} Soru
                        </span>
                      </div>
                    )}

                    {/* LARGE READABLE VISUAL QUESTION CARDS FOR BOTH MULTIPLE-CHOICE & OPEN-ENDED */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                          🖼️ Yüklenen Görsel Sorular ({imageUrls.length || 1})
                        </h4>
                      </div>

                      <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', padding: '0.25rem' }}>
                        {(imageUrls.length > 0 ? imageUrls : ['']).map((url, idx) => {
                          const selectedOpt = imageAnswers[idx];
                          return (
                            <div key={idx} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '1rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 900, fontSize: '0.95rem', color: isDark ? '#ffffff' : '#0f172a' }}>🖼️ Görsel Soru {idx + 1}</span>
                                  {formData.type === 'coktan_secmeli' && selectedOpt !== undefined && (
                                    <span style={{ background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5', color: isDark ? '#34d399' : '#059669', border: isDark ? '1px solid rgba(52,211,153,0.35)' : '1px solid #a7f3d0', fontWeight: 900, fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                                      ✓ {String.fromCharCode(65 + selectedOpt)}
                                    </span>
                                  )}
                                </div>
                                {imageUrls.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImageAtIndex(idx)}
                                    title="Bu görsel soruyu kaldır"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '0.45rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    <Trash2 size={13} /> Kaldır
                                  </button>
                                )}
                              </div>

                              {/* Large Readable Image Box */}
                              {url ? (
                                <div
                                  onClick={() => setPreviewImage(url)}
                                  title="Görseli daha da büyütmek için tıklayın"
                                  style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc', borderRadius: '0.75rem', padding: '0.5rem', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '160px', maxHeight: '300px', overflow: 'hidden', cursor: 'pointer' }}
                                >
                                  <img src={url} alt={`Görsel Soru ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '0.5rem' }} onError={e => { e.target.style.display = 'none'; }} />
                                </div>
                              ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', background: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '0.75rem', fontSize: '0.85rem' }}>
                                  Resim yüklenmedi
                                </div>
                              )}

                              {/* Optic Bubbles Dynamic (2, 3, 4, 5 options) */}
                              {formData.type === 'coktan_secmeli' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.2rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doğru Cevabı Seçin:</div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366f1' }}>{currentOptionCount} Şık</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                    {getOptionLetters(currentOptionCount).map((letter, optIdx) => {
                                      const isSelected = selectedOpt === optIdx;
                                      return (
                                        <button
                                          key={letter}
                                          type="button"
                                          onClick={() => setImageAnswers({ ...imageAnswers, [idx]: isSelected ? undefined : optIdx })}
                                          style={{
                                            flex: 1,
                                            height: '40px',
                                            borderRadius: '0.65rem',
                                            border: isSelected ? '2px solid #10b981' : (isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1'),
                                            background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                                            color: isSelected ? '#ffffff' : (isDark ? '#ffffff' : '#334155'),
                                            fontWeight: 900,
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            boxShadow: isSelected ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
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
                              ) : (
                                <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.6rem', background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', border: isDark ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid #fde68a', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#fde68a' : '#b45309' }}>
                                  📝 Açık Uçlu (Metin Yanıtlı)
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* ADD MORE IMAGES BUTTON */}
                      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                        <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: isDark ? 'rgba(99,102,241,0.15)' : '#eff6ff', border: isDark ? '1.5px dashed rgba(165,180,252,0.4)' : '1.5px dashed #93c5fd', color: isDark ? '#c7d2fe' : '#2563eb', fontWeight: 800, fontSize: '0.9rem' }}>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleMultipleFilesSelected(e.target.files, true);
                              }
                            }}
                          />
                          <Plus size={18} /> ➕ Bu Sete Daha Fazla Görsel Soru Ekle
                        </label>
                      </div>
                    </div>

                  </div>
                )}

                {/* TYPE 5: SINGLE TEXT QUESTION FORM */}
                {formData.contentType === 'text' && (
                  <>
                    <div className="form-group">
                      <label style={{ fontWeight: 800, fontSize: '0.9rem', color: isDark ? '#ffffff' : '#0f172a' }}>📝 Soru Metni</label>
                      <textarea 
                        rows="4" 
                        value={formData.questionText} 
                        onChange={e => setFormData({...formData, questionText: e.target.value})} 
                        placeholder="Soru metnini detaylıca yazın..." 
                        style={{ padding: '0.85rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1', width: '100%', fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1.5, background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
                        required
                      ></textarea>
                    </div>

                    {formData.type === 'coktan_secmeli' && (
                      <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#ffffff' : '#0f172a' }}>
                            🔘 Soru Şıkları ve Doğru Cevap Seçimi:
                          </label>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {[
                              { count: 2, label: '2 Şık', sub: 'A-B • D/Y', color: '#3b82f6' },
                              { count: 3, label: '3 Şık', sub: 'A-C • İlkokul', color: '#f59e0b' },
                              { count: 4, label: '4 Şık', sub: 'A-D • Ortaokul', color: '#10b981' },
                              { count: 5, label: '5 Şık', sub: 'A-E • Lise', color: '#8b5cf6' }
                            ].map(btn => {
                              const isSel = currentOptionCount === btn.count;
                              return (
                                <button
                                  key={btn.count}
                                  type="button"
                                  onClick={() => handleOptionCountChange(btn.count)}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '0.55rem',
                                    border: isSel ? `2px solid ${btn.color}` : (isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid #cbd5e1'),
                                    background: isSel ? (isDark ? `${btn.color}30` : `${btn.color}15`) : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                                    color: isSel ? (isDark ? '#ffffff' : btn.color) : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                                    fontSize: '0.78rem',
                                    fontWeight: isSel ? 900 : 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {btn.label} ({btn.sub.split(' ')[0]})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="options-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                          {(formData.options && formData.options.length > 0 ? formData.options : Array.from({ length: currentOptionCount }, () => '')).map((opt, idx) => {
                            const isSelected = formData.correctAnswer === idx;
                            return (
                              <div 
                                key={idx} 
                                onClick={() => setFormData({...formData, correctAnswer: idx})}
                                style={{ 
                                  background: isSelected ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'), 
                                  padding: '1rem', 
                                  borderRadius: '0.75rem', 
                                  border: isSelected ? '2px solid #10b981' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1'),
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.02)'
                                }}
                              >
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                  <span style={{ fontWeight: 900, color: isSelected ? (isDark ? '#34d399' : '#047857') : (isDark ? '#c7d2fe' : '#4f46e5'), fontSize: '0.95rem' }}>{String.fromCharCode(65 + idx)}) Şıkkı</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <input 
                                      type="radio" 
                                      name="correctAnswer" 
                                      checked={isSelected} 
                                      onChange={() => setFormData({...formData, correctAnswer: idx})}
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isSelected ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b') }}>
                                      {isSelected ? '✓ Doğru Şık' : 'Seç'}
                                    </span>
                                  </div>
                                </label>
                                <input 
                                  type="text" 
                                  value={opt} 
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    const count = formData.options?.length || currentOptionCount;
                                    const newOpts = [...(formData.options || Array.from({ length: count }, () => ''))];
                                    newOpts[idx] = e.target.value;
                                    setFormData({...formData, options: newOpts});
                                  }} 
                                  placeholder={`${String.fromCharCode(65 + idx)} şıkkının metni`} 
                                  style={{ padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #cbd5e1', width: '100%', fontSize: '0.9rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', color: isDark ? '#ffffff' : '#0f172a', boxSizing: 'border-box' }}
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
                    <div style={{ marginTop: '0.5rem', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.05rem' }}>🔘 Cevap Anahtarı Tablosu ve Soru Sayısı</h4>
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>Paketteki her sorunun doğru şıkkını tek tek veya toplu olarak girin.</p>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                          {/* Option Count Selector (2, 3, 4, 5 Şık) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginRight: '0.15rem' }}>Şık Sayısı:</span>
                            {[
                              { count: 2, label: '2 Şık', sub: 'A-B', color: '#3b82f6' },
                              { count: 3, label: '3 Şık', sub: 'A-C', color: '#f59e0b' },
                              { count: 4, label: '4 Şık', sub: 'A-D', color: '#10b981' },
                              { count: 5, label: '5 Şık', sub: 'A-E', color: '#8b5cf6' }
                            ].map(btn => {
                              const isSel = currentOptionCount === btn.count;
                              return (
                                <button
                                  key={btn.count}
                                  type="button"
                                  onClick={() => handleOptionCountChange(btn.count)}
                                  style={{
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '0.5rem',
                                    border: isSel ? `2px solid ${btn.color}` : (isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1'),
                                    background: isSel ? (isDark ? `${btn.color}25` : `${btn.color}15`) : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                                    color: isSel ? (isDark ? '#ffffff' : btn.color) : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                                    fontWeight: 900,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1' }}>
                            <label style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: isDark ? '#ffffff' : '#0f172a' }}>Toplam Soru Sayısı:</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="100" 
                              value={formData.questionCount} 
                              onChange={e => setFormData({...formData, questionCount: parseInt(e.target.value, 10) || 1})}
                              style={{ width: '65px', padding: '0.35rem', borderRadius: '0.5rem', border: '1.5px solid #6366f1', fontWeight: 900, textAlign: 'center', fontSize: '0.95rem', background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* BULK QUICK ANSWER KEY INPUT FOR PDF / HTML BUNDLES */}
                      <div style={{
                        background: isDark ? 'rgba(99,102,241,0.12)' : '#eff6ff',
                        padding: '1rem',
                        borderRadius: '0.85rem',
                        border: isDark ? '1.5px solid rgba(165,180,252,0.25)' : '1.5px solid #bfdbfe',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.88rem', color: isDark ? '#c7d2fe' : '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>⚡ Hızlı Toplu Seçenek / Cevap Anahtarı Yaz veya Yapıştır:</span>
                          </label>
                          
                          {Object.keys(opticAnswers).length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpticAnswers({});
                                setFormData(prev => ({ ...prev, bulkAnswerKey: '' }));
                              }}
                              style={{
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: '#ef4444',
                                borderRadius: '0.5rem',
                                padding: '0.25rem 0.6rem',
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              🗑️ Şıkları Temizle
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.bulkAnswerKey || ''}
                          onChange={e => handleBulkAnswerKeyChange(e.target.value)}
                          placeholder={`Örn: ABCDABCD... veya A,B,C,D... veya 1A 2B 3C... (${currentOptionCount} Şık: ${getOptionLetters(currentOptionCount).join('-')})`}
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: '0.6rem',
                            border: isDark ? '1.5px solid rgba(165,180,252,0.4)' : '1.5px solid #93c5fd',
                            width: '100%',
                            fontSize: '0.95rem',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                            color: isDark ? '#ffffff' : '#0f172a',
                            boxSizing: 'border-box',
                            letterSpacing: '0.06em'
                          }}
                        />

                        {/* Live Detected Info & Preview */}
                        {Object.keys(opticAnswers).length > 0 && (
                          <div style={{
                            marginTop: '0.6rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            fontSize: '0.78rem'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5',
                              color: isDark ? '#34d399' : '#059669',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '0.5rem',
                              fontWeight: 800
                            }}>
                              <span>✅ Toplam <strong>{Object.keys(opticAnswers).length}</strong> soru cevabı otomatik işaretlendi</span>
                            </div>
                            <div style={{
                              color: isDark ? '#a5b4fc' : '#4f46e5',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              maxWidth: '100%',
                              overflowX: 'auto',
                              whiteSpace: 'nowrap'
                            }}>
                              {Object.keys(opticAnswers).map(Number).sort((a, b) => a - b).slice(0, 15).map(i => `${i + 1}:${String.fromCharCode(65 + opticAnswers[i])}`).join(' ')}
                              {Object.keys(opticAnswers).length > 15 ? ' ...' : ''}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3-COLUMN INTERACTIVE OPTIC BUBBLE BUTTON GRID FOR PDF / HTML BUNDLES */}
                      <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', padding: '0.25rem' }}>
                        {Array.from({ length: formData.questionCount }).map((_, idx) => {
                          const selectedOpt = opticAnswers[idx];
                          const currentBubbleLetters = getOptionLetters(currentOptionCount);

                          return (
                            <div key={idx} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '0.65rem 1rem', borderRadius: '0.85rem', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isDark ? '#ffffff' : '#0f172a' }}>
                                Soru {idx + 1}
                              </div>

                              {/* Optic Bubbles Dynamic */}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {currentBubbleLetters.map((letter, optIdx) => {
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
                                        border: isSelected ? '2px solid #10b981' : (isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1'),
                                        background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc'),
                                        color: isSelected ? '#ffffff' : (isDark ? '#ffffff' : '#334155'),
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
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
                    <div style={{ marginTop: '0.5rem', background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(251, 191, 36, 0.3)' : '1.5px solid #fde68a' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: isDark ? '#fde68a' : '#b45309', fontSize: '1rem' }}>
                        📝 Açık Uçlu Test Yapılandırması
                      </h4>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                        Bu test "Açık Uçlu (Yazılı Yanıtlı)" olarak belirlenmiştir. Öğrenciler şık işaretlemek yerine cevaplarını metin kutusuna yazacaklardır. Optik cevap anahtarı gerekmez.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', padding: '0.6rem 1rem', borderRadius: '0.75rem', border: isDark ? '1.5px solid rgba(251,191,36,0.4)' : '1.5px solid #fde68a', width: 'fit-content' }}>
                        <label style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: isDark ? '#fde68a' : '#b45309' }}>Toplam Soru Sayısı:</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          value={formData.questionCount} 
                          onChange={e => setFormData({...formData, questionCount: parseInt(e.target.value, 10) || 1})}
                          style={{ width: '65px', padding: '0.35rem', borderRadius: '0.5rem', border: '1.5px solid #d97706', fontWeight: 900, textAlign: 'center', fontSize: '0.95rem', background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a' }}
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Action Buttons */}
                <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-outline" disabled={isSavingQuestion} style={{ flex: 1, padding: '0.85rem', fontWeight: 800, color: isDark ? '#ffffff' : '#1e293b', borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} onClick={() => { setShowModal(false); resetForm(); }}>İptal</button>
                  <button type="submit" disabled={isSavingQuestion} className="btn btn-primary" style={{ flex: 2, padding: '0.95rem', fontSize: '1.05rem', fontWeight: 900, background: isSavingQuestion ? '#64748b' : 'linear-gradient(135deg, #6366f1, #4f46e5)', opacity: isSavingQuestion ? 0.7 : 1, cursor: isSavingQuestion ? 'not-allowed' : 'pointer' }}>
                    {isSavingQuestion ? '⏳ Kaydediliyor...' : (editingQuestionId ? '✓ Değişiklikleri Kaydet' : '➕ İçeriği Kaydet ve Ekle')}
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
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
            <div className="modal-content" style={{ width: '96vw', maxWidth: '1150px', maxHeight: '92vh', overflowY: 'auto', padding: '2.25rem', borderRadius: '1.75rem', background: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0', boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,0,0,0.15)', color: isDark ? '#f8fafc' : '#0f172a' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    {(q.title || q.name) && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '8px', background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff', color: isDark ? '#93c5fd' : '#1d4ed8', border: isDark ? '1px solid rgba(59,130,246,0.3)' : '1px solid #bfdbfe' }}>
                        🏷️ {q.title || q.name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '8px', background: isDark ? 'rgba(99,102,241,0.2)' : '#eff6ff', color: isDark ? '#a5b4fc' : '#4f46e5', border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid #bfdbfe' }}>
                      {getTypeLabel(q)}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '8px', background: q.type === 'coktan_secmeli' ? (isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4') : (isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb'), color: q.type === 'coktan_secmeli' ? (isDark ? '#34d399' : '#16a34a') : (isDark ? '#fbbf24' : '#d97706'), border: `1px solid ${q.type === 'coktan_secmeli' ? (isDark ? 'rgba(52,211,153,0.3)' : '#bbf7d0') : (isDark ? 'rgba(251,191,36,0.3)' : '#fde68a')}` }}>
                      {q.type === 'coktan_secmeli' ? '🔘 Optikli / Çoktan Seçmeli' : '📝 Açık Uçlu (Yazılı)'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{gradeObj?.name || 'Genel'}</span> ➔ 
                    <span>{subjectObj?.name || 'Genel'}</span> ➔ 
                    <span>{unitObj?.name || 'Genel'}</span> ➔ 
                    <span style={{ color: isDark ? '#818cf8' : '#4f46e5' }}>{topicObj?.name || 'Genel'}</span>
                  </div>
                </div>

                <button className="btn-icon" onClick={() => setPreviewQuestion(null)} style={{ borderRadius: '50%', padding: '0.5rem', background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1', color: isDark ? '#cbd5e1' : '#475569', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>

              {/* Status Banner */}
              <div style={{ background: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4', border: isDark ? '1px solid rgba(52,211,153,0.3)' : '1px solid #bbf7d0', borderRadius: '1rem', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: isDark ? '#34d399' : '#16a34a', fontSize: '0.95rem', fontWeight: 800 }}>
                  <CheckCircle2 size={20} />
                  <span>Soru Önizleme &amp; Hata Kontrol Modu</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => { const target = q; setPreviewQuestion(null); openEditModal(target); }} 
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '0.65rem', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                  >
                    <Edit2 size={16} /> Soruyu Düzenle / Hata Düzelt
                  </button>

                  <button 
                    onClick={() => {
                      setPreviewQuestion(null);
                      handleDeleteConfirm(q);
                    }}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.55rem 0.9rem', borderRadius: '0.65rem', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Trash2 size={16} /> Testi Sil
                  </button>
                </div>
              </div>

              {/* QUESTION BODY PREVIEW */}
              <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: '1.25rem', padding: '1.75rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', marginBottom: '1.5rem' }}>
                
                {/* 0. WRITTEN TEXT BUNDLE PREVIEW (questionsList for non-visual tests) */}
                {(() => {
                  const resolvedQuestionsList = (() => {
                    if (Array.isArray(q.questionsList) && q.questionsList.length > 0) return q.questionsList;
                    const payload = q.contentPayload || q.content_payload;
                    if (typeof payload === 'string' && (payload.includes('"questionText"') || payload.includes('"options"') || q.contentType === 'json')) {
                      try {
                        const clean = payload.replace(/\|/g, '').trim();
                        const parsed = JSON.parse(clean);
                        if (Array.isArray(parsed)) return parsed;
                        if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
                      } catch {}
                    }
                    return [];
                  })();

                  if (q.contentType === 'gorsel' || (q.imageUrls && q.imageUrls.length > 0)) {
                    return null;
                  }
                  if (resolvedQuestionsList.length === 0) {
                    return null;
                  }

                  const normKeyList = normalizeAnswerKey(q.answerKey);

                  return (
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '1.25rem' }}>
                        📚 Toplu Yazılı Test Soruları ({resolvedQuestionsList.length} Soru - Art Arda Sıralı):
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {resolvedQuestionsList.map((qItem, iIdx) => {
                          const kAns = normKeyList[iIdx];
                          const expectedIdx = typeof kAns === 'number' ? kAns : (typeof kAns === 'string' && /^[A-E]$/i.test(kAns.trim()) ? (kAns.trim().toUpperCase().charCodeAt(0) - 65) : (typeof qItem.correctAnswer === 'number' ? qItem.correctAnswer : (typeof qItem.correctAnswer === 'string' && /^[A-E]$/i.test(qItem.correctAnswer.trim()) ? (qItem.correctAnswer.trim().toUpperCase().charCodeAt(0) - 65) : -1)));

                          const isOpenEnded = q.type === 'acik_uclu' || q.type === 'yazili' || qItem.type === 'acik_uclu' || (!qItem.options || qItem.options.length === 0);

                          return (
                            <div key={iIdx} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '1.25rem', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                                <span style={{ background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.8rem', padding: '0.2rem 0.65rem', borderRadius: '6px' }}>
                                  Soru {iIdx + 1}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isOpenEnded ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#34d399' : '#16a34a') }}>
                                  {isOpenEnded ? '📝 Açık Uçlu (Yazılı)' : '🔘 Çoktan Seçmeli'}
                                </span>
                              </div>

                              <h5 style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                                {qItem.questionText || `Soru ${iIdx + 1}`}
                              </h5>

                              {/* Multiple Choice Options */}
                              {!isOpenEnded && qItem.options && qItem.options.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                  {qItem.options.map((opt, oIdx) => {
                                    const isCorrect = expectedIdx === oIdx;
                                    return (
                                      <div
                                        key={oIdx}
                                        style={{
                                          padding: '0.75rem 1rem', borderRadius: '0.75rem',
                                          border: isCorrect ? '2px solid #10b981' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0'),
                                          background: isCorrect ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <span style={{ fontWeight: 900, width: '24px', height: '24px', borderRadius: '50%', background: isCorrect ? '#10b981' : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'), color: isCorrect ? 'white' : (isDark ? '#ffffff' : '#334155'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                            {String.fromCharCode(65 + oIdx)}
                                          </span>
                                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isCorrect ? (isDark ? '#34d399' : '#047857') : (isDark ? '#ffffff' : '#0f172a') }}>{opt}</span>
                                        </div>
                                        {isCorrect && (
                                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDark ? '#34d399' : '#059669', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}>
                                            <Check size={14} strokeWidth={3} /> Doğru
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Open Ended Student Answer Placeholder Preview */}
                              {isOpenEnded && (
                                <div style={{ marginTop: '0.85rem', padding: '0.85rem 1.15rem', borderRadius: '0.75rem', background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDark ? '1.5px dashed rgba(255,255,255,0.18)' : '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                                    ✍️ <strong style={{ color: isDark ? '#fbbf24' : '#d97706' }}>Açık Uçlu Soru:</strong> Öğrenci serbest metin/yazılı olarak yanıtlayacaktır. Yanıtlar sınav veya ödev tamamlandıktan sonra öğretmen tarafından değerlendirilir.
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 1. TEXT QUESTION PREVIEW */}
                {!q.questionsList && q.contentType === 'text' && (
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', margin: '0 0 1.25rem 0', lineHeight: 1.6 }}>
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
                                padding: '0.95rem 1.15rem', borderRadius: '0.85rem',
                                border: isCorrect ? '2px solid #10b981' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0'),
                                background: isCorrect ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                                boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontWeight: 900, width: '28px', height: '28px', borderRadius: '50%', background: isCorrect ? '#10b981' : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'), color: isCorrect ? 'white' : (isDark ? '#ffffff' : '#334155'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isCorrect ? (isDark ? '#34d399' : '#047857') : (isDark ? '#ffffff' : '#0f172a') }}>{opt}</span>
                              </div>
                              {isCorrect && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDark ? '#34d399' : '#059669', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}>
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
                      <p style={{ fontWeight: 800, fontSize: '1.1rem', color: isDark ? '#ffffff' : '#0f172a', marginBottom: '1.25rem', textAlign: 'left' }}>{q.questionText}</p>
                    )}

                    {/* RENDER ALL IMAGES WITH THEIR OPTIONS DIRECTLY UNDERNEATH */}
                    {(() => {
                      // 1. Check if structured questionsList exists
                      const subQList = (q.questionsList && Array.isArray(q.questionsList) && q.questionsList.length > 0)
                        ? q.questionsList
                        : [];

                      // 2. Extract image URLs cleanly
                      let rawImages = [];
                      if (subQList.length > 0) {
                        rawImages = subQList.map(sq => normalizeImageUrl(sq.imageUrl || sq.contentPayload)).filter(isValidImageUrl);
                      } else if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) {
                        rawImages = q.imageUrls.filter(Boolean).filter(isValidImageUrl).map(normalizeImageUrl);
                      } else if (q.contentPayload) {
                        const splitted = q.contentPayload.split(/\n\n|\n|\|/).map(p => p.trim()).filter(isValidImageUrl).map(normalizeImageUrl);
                        rawImages = splitted.length > 0 ? splitted : [normalizeImageUrl(q.contentPayload)].filter(isValidImageUrl);
                      }

                      // Deduplicate keeping original order
                      const uniqueImages = [];
                      rawImages.forEach(url => {
                        if (url && !uniqueImages.includes(url)) uniqueImages.push(url);
                      });

                      // Restrict image count strictly to q.questionCount if specified
                      const targetCount = Number(q.questionCount) || (uniqueImages.length > 0 ? uniqueImages.length : 1);
                      const imageList = (uniqueImages.length > targetCount) ? uniqueImages.slice(0, targetCount) : (uniqueImages.length > 0 ? uniqueImages : (q.contentPayload ? [q.contentPayload] : ['']));

                      const normalizedKeys = normalizeAnswerKey(q.answerKey);
                      const getCorrectIdxForImg = (imgIdx) => {
                        if (normalizedKeys[imgIdx] !== undefined && normalizedKeys[imgIdx] !== ' ') {
                          return typeof normalizedKeys[imgIdx] === 'number' ? normalizedKeys[imgIdx] : (String(normalizedKeys[imgIdx]).toUpperCase().charCodeAt(0) - 65);
                        }
                        if (q.imageAnswers && q.imageAnswers[imgIdx] !== undefined) {
                          return q.imageAnswers[imgIdx];
                        }
                        if (subQList[imgIdx] && subQList[imgIdx].correctAnswer !== undefined) {
                          const subAns = subQList[imgIdx].correctAnswer;
                          return typeof subAns === 'number' ? subAns : (typeof subAns === 'string' && /^[A-E]$/i.test(subAns.trim()) ? subAns.trim().toUpperCase().charCodeAt(0) - 65 : -1);
                        }
                        if (imgIdx === 0 && q.correctAnswer !== undefined) {
                          return typeof q.correctAnswer === 'number' ? q.correctAnswer : (typeof q.correctAnswer === 'string' && /^[A-E]$/i.test(q.correctAnswer.trim()) ? q.correctAnswer.trim().toUpperCase().charCodeAt(0) - 65 : -1);
                        }
                        return -1;
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '1.5rem' }}>
                          {imageList.map((imgUrl, imgIdx) => {
                            const correctIdx = getCorrectIdxForImg(imgIdx);
                            return (
                              <div key={imgIdx} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '1.25rem', borderRadius: '1.25rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.04)' }}>
                                <div style={{ fontWeight: 900, color: isDark ? '#818cf8' : '#4f46e5', marginBottom: '0.85rem', fontSize: '0.95rem', textAlign: 'left' }}>
                                  🖼️ Görsel / Soru {imgIdx + 1} / {imageList.length}
                                </div>

                                <img 
                                  src={imgUrl} 
                                  alt={`Soru Görseli ${imgIdx + 1}`} 
                                  style={{ maxWidth: '100%', maxHeight: '550px', borderRadius: '0.75rem', objectFit: 'contain', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', background: isDark ? '#0f172a' : '#f8fafc', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} 
                                  onError={(e) => { e.target.alt = "Görsel yüklenemedi. Lütfen URL'yi kontrol edin."; }}
                                />

                                {/* OPTIONS DIRECTLY UNDER EACH IMAGE */}
                                {q.type === 'coktan_secmeli' && (
                                  <div style={{ marginTop: '1.15rem', paddingTop: '1rem', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Soru {imgIdx + 1} Cevap Seçenekleri:
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                                      {(() => {
                                        const optCount = Number(q.optionCount || q.optionsCount || (q.options ? q.options.length : 0)) || (isHighSchoolGrade(q.gradeId) ? 5 : 4);
                                        const letters = getOptionLetters(optCount);
                                        return letters.map((letter, oIdx) => {
                                          const isCorrect = correctIdx === oIdx;
                                          const optText = (q.options && q.options[oIdx]) ? q.options[oIdx] : letter;

                                          return (
                                            <div
                                              key={letter}
                                              style={{
                                                padding: '0.55rem 0.95rem',
                                                borderRadius: '0.75rem',
                                                border: isCorrect ? '2px solid #10b981' : (isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1'),
                                                background: isCorrect ? (isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                                                fontWeight: 800,
                                                fontSize: '0.9rem',
                                                color: isCorrect ? (isDark ? '#34d399' : '#047857') : (isDark ? '#ffffff' : '#1e293b'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                boxShadow: isCorrect ? '0 2px 8px rgba(16,185,129,0.25)' : 'none'
                                              }}
                                            >
                                              <span style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                background: isCorrect ? '#10b981' : (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'),
                                                color: isCorrect ? 'white' : (isDark ? '#ffffff' : '#334155'), fontWeight: 900, fontSize: '0.8rem',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                              }}>
                                                {letter}
                                              </span>
                                              <span>{optText !== letter ? `${letter}) ${optText}` : `${letter} Şıkkı`}</span>
                                              {isCorrect && (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDark ? '#34d399' : '#059669', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.25rem' }}>
                                                  <Check size={14} strokeWidth={3} /> Doğru
                                                </span>
                                              )}
                                            </div>
                                          );
                                        });
                                      })()}
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

                {/* 3. HTML DOCUMENT PREVIEW (LIVE RENDERED VIEWER) */}
                {!q.questionsList && (q.contentType === 'html' || q.contentType === 'htm' || (typeof q.contentPayload === 'string' && (q.contentPayload.includes('<html') || q.contentPayload.includes('<!DOCTYPE')))) && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: 800, color: isDark ? '#c7d2fe' : '#4338ca', fontSize: '0.95rem' }}>
                        🌐 Görsel HTML Döküman / Test Önizlemesi:
                      </p>
                      {q.contentPayload?.startsWith('http') && (
                        <a href={q.contentPayload} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#818cf8' : '#4f46e5', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          Sekmede Aç <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    {/* Live Rendered HTML Frame */}
                    <div style={{ background: 'white', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', marginBottom: '1.25rem', height: '520px' }}>
                      <HtmlViewerWithControls
                        payload={(q.contentPayload && q.contentPayload !== '[STORED_IN_INDEXEDDB]' && q.contentPayload !== '[LOCALSTORAGE_CACHE]') ? q.contentPayload : (q.htmlPayload && q.htmlPayload !== '[STORED_IN_INDEXEDDB]' ? q.htmlPayload : q.contentPayload)}
                        id={q.id}
                        testId={q.testId || q.realTestId || q.id}
                        title={q.title || 'HTML Test Paketi'}
                        height="520px"
                      />
                    </div>

                    {/* Optical Answer Key Grid */}
                    {q.type === 'coktan_secmeli' && (() => {
                      const keyList = normalizeAnswerKey(q.answerKey);
                      const totalQCount = Number(q.questionCount) || (keyList.length > 0 ? keyList.length : 1);

                      return (
                        <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '1.25rem', borderRadius: '0.85rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)' }}>
                          <h5 style={{ margin: '0 0 0.85rem 0', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.95rem' }}>
                            🔘 Cevap Anahtarı Tablosu ({totalQCount} Soru):
                          </h5>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                            {Array.from({ length: totalQCount }).map((_, idx) => {
                              const ans = keyList[idx];
                              const hasAns = ans && String(ans).trim() !== '' && ans !== ' ';
                              return (
                                <div key={idx} style={{ padding: '0.4rem', borderRadius: '6px', background: hasAns ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'), border: hasAns ? (isDark ? '1px solid rgba(52,211,153,0.35)' : '1px solid #a7f3d0') : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'), textAlign: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', display: 'block', fontWeight: 700 }}>Soru {idx + 1}</span>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: hasAns ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8') }}>
                                    {hasAns ? ans : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. PDF BUNDLE PREVIEW (LINK BASED) */}
                {!q.questionsList && q.contentType === 'pdf' && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: isDark ? '#fca5a5' : '#b91c1c', fontSize: '0.9rem' }}>📄 PDF Sınav Dokümanı:</span>
                      {q.contentPayload && q.contentPayload.startsWith('http') && (
                        <a
                          href={q.contentPayload}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#ffffff', color: '#b91c1c', border: '1.5px solid #fca5a5', padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.78rem', textDecoration: 'none' }}
                        >
                          🔗 Yeni Sekmede Aç
                        </a>
                      )}
                    </div>
                    {getEmbeddableUrl(q.contentPayload) ? (
                      <iframe
                        src={getEmbeddableUrl(q.contentPayload)}
                        title="PDF Döküman"
                        style={{ width: '100%', height: '550px', border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #e2e8f0', borderRadius: '0.75rem', background: 'white' }}
                      />
                    ) : (
                      <div style={{ padding: '2.5rem', textAlign: 'center', color: isDark ? '#fca5a5' : '#b91c1c', background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: isDark ? '1px dashed rgba(239,68,68,0.3)' : '1.5px dashed #fca5a5', borderRadius: '0.75rem' }}>
                        📄 Bu test için henüz geçerli bir PDF / Google Drive bağlantısı eklenmemiş.
                      </div>
                    )}
                  </div>
                )}

                {/* Optical Answer Key Grid for PDF Tests */}
                {!q.questionsList && q.contentType === 'pdf' && q.type === 'coktan_secmeli' && (() => {
                  const keyList = normalizeAnswerKey(q.answerKey);
                  const totalQCount = Number(q.questionCount) || (keyList.length > 0 ? keyList.length : 1);

                  return (
                    <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', padding: '1.25rem', borderRadius: '0.85rem', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)' }}>
                      <h5 style={{ margin: '0 0 0.85rem 0', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.95rem' }}>
                        🔘 Cevap Anahtarı Tablosu ({totalQCount} Soru):
                      </h5>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {Array.from({ length: totalQCount }).map((_, idx) => {
                          const ans = keyList[idx];
                          const hasAns = ans && String(ans).trim() !== '' && ans !== ' ';
                          return (
                            <div key={idx} style={{ padding: '0.4rem', borderRadius: '6px', background: hasAns ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'), border: hasAns ? (isDark ? '1px solid rgba(52,211,153,0.35)' : '1px solid #a7f3d0') : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'), textAlign: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', display: 'block', fontWeight: 700 }}>Soru {idx + 1}</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: hasAns ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8') }}>
                                {hasAns ? ans : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setPreviewQuestion(null)} style={{ padding: '0.75rem 1.5rem', fontWeight: 800, color: isDark ? '#ffffff' : '#1e293b', borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                  Kapat
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* AI QUESTION GENERATOR MODAL */}
      {isAiModalOpen && (
        <AiQuestionGeneratorModal
          isOpen={isAiModalOpen}
          onClose={() => {
            setIsAiModalOpen(false);
            setAiModalConfig({ subject: '', grade: '', topic: '', unitId: '', topicId: '', subjectId: '', gradeId: '' });
          }}
          onSaveQuestions={handleSaveAiQuestions}
          defaultSubject={aiModalConfig.subject || activeSubject?.name || 'Matematik'}
          defaultSubjectId={aiModalConfig.subjectId || activeSubjectId || ''}
          defaultGrade={aiModalConfig.grade || activeGrade?.name || '8. Sınıf'}
          defaultGradeId={aiModalConfig.gradeId || activeGradeId || ''}
          defaultTopic={aiModalConfig.topic || ''}
          defaultTopicId={aiModalConfig.topicId || ''}
          defaultUnitId={aiModalConfig.unitId || ''}
          curData={curData}
          availableGrades={curData?.grades || []}
          availableSubjects={curData?.subjects || []}
          availableUnits={curData?.units || []}
          availableTopics={curData?.topics || []}
        />
      )}

      {/* PDF QUESTION SLICER MODAL */}
      {isSlicerModalOpen && (
        <PdfQuestionSlicerModal
          isOpen={isSlicerModalOpen}
          onClose={() => setIsSlicerModalOpen(false)}
          onSaveQuestions={handleSaveSlicedQuestions}
          mode="general"
          subject={activeSubjectId || 'Matematik'}
          grade={activeGrade?.name || '8. Sınıf'}
        />
      )}

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,10,18,0.92)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '1rem', cursor: 'pointer' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={previewImage} alt="Büyük Görsel" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '1.25rem', border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)' }} />
            <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: -15, right: -15, background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 36, height: 36, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>✕</button>
          </div>
        </div>
      )}

    </div>
  );
}
