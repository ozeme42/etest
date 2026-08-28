import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Scissors, Upload, X, Check, Trash2, Plus, ArrowRight,
  ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, FileText,
  CheckCircle2, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  BookOpen, Sparkles, HelpCircle, Layers, CheckSquare, Square,
  ExternalLink, Save, Filter, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { compressImageToWebP } from '../../services/imageCompressionService';
import { useTheme } from '../../context/ThemeContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useEvaluation } from '../../context/EvaluationContext';
import { useHomework } from '../../context/HomeworkContext';
import { useQuestionBank } from '../../context/QuestionBankContext';
import { useCurriculum } from '../../context/CurriculumContext';
import { getAllUnifiedStudentSubmissions } from '../../services/unifiedResultAdapter';
import { getEmbeddablePdfUrl } from '../../utils/pdfUtils';
import { toUUID } from '../../services/supabaseService';
import { pdfjs } from 'react-pdf';

// Ensure PDF.js worker is configured
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

const detectSubject = (text = '') => {
  const t = String(text).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen') || t.includes('fizik') || t.includes('kimya') || t.includes('biyoloji')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('edebiyat')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('tarih') || t.includes('coğrafya') || t.includes('cografya') || t.includes('inkılap') || t.includes('inkilap')) return 'Sosyal Bilgiler';
  if (t.includes('din') || t.includes('ahlak')) return 'Din Kültürü';
  if (t.includes('ingilizce') || t.includes('ing') || t.includes('english')) return 'İngilizce';
  return 'Genel';
};

const getSubjectBadgeStyle = (subj = '', isDark = false) => {
  const s = String(subj).toLowerCase();
  if (s.includes('matematik')) {
    return {
      icon: '📐',
      bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
      color: isDark ? '#93c5fd' : '#1d4ed8',
      border: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe'
    };
  }
  if (s.includes('fen')) {
    return {
      icon: '🔬',
      bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4',
      color: isDark ? '#6ee7b7' : '#047857',
      border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#bbf7d0'
    };
  }
  if (s.includes('türkçe') || s.includes('turkce')) {
    return {
      icon: '📖',
      bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb',
      color: isDark ? '#fcd34d' : '#b45309',
      border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'
    };
  }
  if (s.includes('sosyal') || s.includes('tarih') || s.includes('inkılap')) {
    return {
      icon: '🏛️',
      bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
      color: isDark ? '#fca5a5' : '#b91c1c',
      border: isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca'
    };
  }
  if (s.includes('din')) {
    return {
      icon: '🕌',
      bg: isDark ? 'rgba(6, 182, 212, 0.2)' : '#ecfeff',
      color: isDark ? '#67e8f9' : '#0e7490',
      border: isDark ? 'rgba(6, 182, 212, 0.4)' : '#a5f3fc'
    };
  }
  if (s.includes('ingilizce')) {
    return {
      icon: '🌍',
      bg: isDark ? 'rgba(168, 85, 247, 0.2)' : '#faf5ff',
      color: isDark ? '#d8b4fe' : '#7e22ce',
      border: isDark ? 'rgba(168, 85, 247, 0.4)' : '#e9d5ff'
    };
  }
  return {
    icon: '📚',
    bg: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff',
    color: isDark ? '#a5b4fc' : '#4338ca',
    border: isDark ? 'rgba(99, 102, 241, 0.4)' : '#c7d2fe'
  };
};

export default function PdfQuestionSlicerModal({
  isOpen,
  onClose,
  onSaveQuestions,
  initialBook = null,
  initialBookId = null,
  initialPdfUrl = null,
  initialMistakes = null,
  studentId = null,
  subject: initialSubject = 'Matematik',
  grade: initialGrade = '8. Sınıf'
}) {
  const { isDark } = useTheme();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { homeworks = [] } = useHomework();
  const { addQuestion } = useQuestionBank();
  const { data: curData } = useCurriculum();

  const [sourceImage, setSourceImage] = useState(null);
  const [sourceFileName, setSourceFileName] = useState('');
  const [slicedQuestions, setSlicedQuestions] = useState([]);
  const [defaultOptionCount, setDefaultOptionCount] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pageJumpInput, setPageJumpInput] = useState('1');

  const [selectedBookId, setSelectedBookId] = useState(() => {
    return initialBook?.id || initialBookId || (books.length > 0 ? books[0].id : null);
  });
  const [showMistakesGuide, setShowMistakesGuide] = useState(true);
  const [activeTargetQuestion, setActiveTargetQuestion] = useState(null);

  const [testTitle, setTestTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageObjRef = useRef(null);

  const currentBook = useMemo(() => {
    if (initialBook && (!selectedBookId || String(initialBook.id) === String(selectedBookId))) {
      return initialBook;
    }
    return books.find(b => String(b.id) === String(selectedBookId) || toUUID(b.id) === toUUID(selectedBookId)) || books[0] || null;
  }, [selectedBookId, books, initialBook]);

  useEffect(() => {
    if (currentBook?.title) {
      const cleanBook = currentBook.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
      setTestTitle(`${cleanBook} — Özel Telafi Testi`);
      if (currentBook.subject) setSelectedSubject(currentBook.subject);
      if (currentBook.grade) setSelectedGrade(`${currentBook.grade}. Sınıf`);
    } else {
      setTestTitle(`Özel Yanlışlar Telafi Testi`);
    }
  }, [currentBook]);

  const bookMistakesList = useMemo(() => {
    if (initialMistakes && Array.isArray(initialMistakes) && initialMistakes.length > 0) {
      return initialMistakes;
    }
    if (!currentBook) return [];

    const bId = String(currentBook.id);
    const bUuid = toUUID(bId);

    // 1. Build comprehensive structural mapping from the book
    const bookStructureMap = new Map();
    let globalIndex = 0;

    if (currentBook?.subjects && Array.isArray(currentBook.subjects)) {
      currentBook.subjects.forEach((subj) => {
        const sName = subj.name || currentBook.subject || 'Ders';
        (subj.topics || []).forEach((top) => {
          const uName = top.name || top.title || top.unit || '';
          (top.tests || []).forEach((t) => {
            globalIndex++;
            const tId = String(t.id);
            const structObj = {
              index: globalIndex,
              unitName: uName,
              subjectName: sName,
              testName: t.name || t.title || `Test ${globalIndex}`
            };
            bookStructureMap.set(tId, structObj);
            if (toUUID(tId)) bookStructureMap.set(toUUID(tId), structObj);
          });
        });
      });
    }

    if (bookTests && Array.isArray(bookTests)) {
      const bTests = bookTests.filter(bt => String(bt.book_id || bt.bookId) === bId || (bUuid && toUUID(bt.book_id || bt.bookId) === bUuid));
      bTests.forEach((bt) => {
        const tId = String(bt.id);
        if (!bookStructureMap.has(tId)) {
          globalIndex++;
          const uName = bt.unit_name || bt.unitName || bt.topic_name || bt.topicName || '';
          const sName = bt.subject_name || bt.subjectName || currentBook.subject || 'Ders';
          const structObj = {
            index: Number(bt.order || bt.order_index || globalIndex),
            unitName: uName,
            subjectName: sName,
            testName: bt.name || bt.title || `Test ${globalIndex}`
          };
          bookStructureMap.set(tId, structObj);
          if (toUUID(tId)) bookStructureMap.set(toUUID(tId), structObj);
        }
      });
    }

    const bookDefaultSubj = currentBook?.subject || 
      (currentBook?.subjects && currentBook.subjects[0]?.name) || 
      detectSubject(currentBook?.title || '') || 'Ders';

    const allSubs = getAllUnifiedStudentSubmissions({
      studentId: studentId || '',
      submissions,
      homeworks,
      books,
      bookTests
    });

    const relevantSubs = allSubs.filter(s => {
      const isSameBook = String(s.bookId) === bId || (bUuid && toUUID(s.bookId) === bUuid) ||
        (s.bookTitle && currentBook.title && s.bookTitle.toLowerCase().includes(currentBook.title.toLowerCase()));
      return isSameBook && (s.wrongCount > 0 || (Array.isArray(s.answers) && s.answers.some(a => a.isCorrect === false)));
    });

    const list = [];
    relevantSubs.forEach(sub => {
      const tId = sub.realTestId || sub.testId || sub.bookTestId || sub.id;
      const tName = sub.testName || sub.testTitle || sub.title || 'Test';
      const subjName = sub.subjectName || sub.subject || bookDefaultSubj;
      
      const bTest = (bookTests || []).find(bt => String(bt.id) === String(tId) || toUUID(bt.id) === toUUID(tId));
      const ak = bTest?.answerKey || bTest?.answer_key || sub.answerKey || currentBook.answerKey || {};

      const wrongQNos = [];
      if (Array.isArray(sub.answers) && sub.answers.length > 0) {
        sub.answers.forEach((ans, idx) => {
          const qNo = Number(ans.questionNo || ans.questionNoInSection || (idx + 1));
          if (ans.isCorrect === false || (ans.userAnswer && ans.userAnswer !== ans.correctAnswer)) {
            if (!wrongQNos.includes(qNo)) wrongQNos.push(qNo);
          }
        });
      }

      if (wrongQNos.length === 0 && sub.wrongCount > 0) {
        const totalQ = sub.totalQuestions || 10;
        const corr = sub.correctCount || 0;
        for (let i = corr + 1; i <= Math.min(totalQ, corr + sub.wrongCount); i++) {
          wrongQNos.push(i);
        }
      }

      if (wrongQNos.length > 0) {
        const getCorrectLetter = (q) => {
          const val = ak[q] ?? ak[String(q)] ?? (Array.isArray(ak) ? ak[q - 1] : null);
          if (typeof val === 'string' && /^[A-Ea-e]$/.test(val.trim())) return val.trim().toUpperCase();
          if (typeof val === 'number' && val >= 0 && val <= 4) return String.fromCharCode(65 + val);
          return null;
        };

        const struct = bookStructureMap.get(String(tId)) || (toUUID(tId) ? bookStructureMap.get(toUUID(tId)) : null);
        const unitName = struct?.unitName || sub.unit || sub.unitName || sub.topicName || sub.unitTopic || '';
        const cleanTestName = struct?.testName || tName;
        const orderIndex = struct?.index ?? (parseInt(cleanTestName.replace(/\D/g, ''), 10) || 9999);

        list.push({
          testId: tId,
          testName: cleanTestName,
          unitName: unitName,
          orderIndex: orderIndex,
          subjectName: struct?.subjectName || subjName || bookDefaultSubj,
          wrongQuestions: wrongQNos.sort((a, b) => a - b),
          answerKeyMap: wrongQNos.reduce((acc, q) => {
            const letter = getCorrectLetter(q);
            if (letter) acc[q] = letter;
            return acc;
          }, {})
        });
      }
    });

    // Sort strictly by book test order
    list.sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.testName.localeCompare(b.testName, 'tr', { numeric: true });
    });

    return list;
  }, [currentBook, initialMistakes, studentId, submissions, homeworks, books, bookTests]);

  useEffect(() => {
    if (bookMistakesList.length > 0 && !activeTargetQuestion) {
      const firstTest = bookMistakesList[0];
      if (firstTest && firstTest.wrongQuestions.length > 0) {
        const qNo = firstTest.wrongQuestions[0];
        setActiveTargetQuestion({
          testId: firstTest.testId,
          testName: firstTest.testName,
          unitName: firstTest.unitName,
          subjectName: firstTest.subjectName,
          qNo: qNo,
          correctAnswer: firstTest.answerKeyMap[qNo] || 'A'
        });
      }
    }
  }, [bookMistakesList, activeTargetQuestion]);

  const drawCanvas = useCallback((img = imageObjRef.current, rect = currentRect) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    slicedQuestions.forEach((sq) => {
      if (sq.rect && (!sq.page || sq.page === pdfCurrentPage)) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);

        ctx.fillStyle = '#22c55e';
        const labelText = sq.title || `Soru ${sq.qNo}`;
        const labelWidth = Math.max(68, labelText.length * 8 + 14);
        ctx.fillRect(sq.rect.x, Math.max(0, sq.rect.y - 24), labelWidth, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(labelText, sq.rect.x + 8, Math.max(16, sq.rect.y - 7));
      }
    });

    if (rect && rect.w && rect.h) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
    }
  }, [slicedQuestions, currentRect, pdfCurrentPage]);

  const renderPdfPage = async (doc, pageNum) => {
    try {
      setIsLoadingFile(true);
      setLoadError(null);
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const offCanvas = document.createElement('canvas');
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext('2d');

      await page.render({ canvasContext: offCtx, viewport }).promise;

      const dataUrl = offCanvas.toDataURL('image/png');
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setSourceImage(dataUrl);
        setIsLoadingFile(false);
      };
      img.src = dataUrl;
    } catch (err) {
      console.error('PDF sayfa render hatası:', err);
      setLoadError('PDF sayfası açılırken bir hata oluştu.');
      setIsLoadingFile(false);
    }
  };

  const loadPdfFromUrlOrBuffer = async (pdfSource, name = 'PDF Test Dokümanı') => {
    if (!pdfSource) return;
    setIsLoadingFile(true);
    setLoadError(null);
    setSourceFileName(name);

    try {
      let loadingTask;
      if (typeof pdfSource === 'string') {
        if (pdfSource.startsWith('data:application/pdf;base64,')) {
          const base64Data = pdfSource.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          loadingTask = pdfjs.getDocument({ data: bytes.buffer });
        } else {
          const embedUrl = getEmbeddablePdfUrl(pdfSource) || pdfSource;
          loadingTask = pdfjs.getDocument(embedUrl);
        }
      } else if (pdfSource instanceof ArrayBuffer || pdfSource instanceof Uint8Array) {
        loadingTask = pdfjs.getDocument({ data: pdfSource });
      }

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPdfNumPages(doc.numPages);
      setPdfCurrentPage(1);
      setPageJumpInput('1');
      await renderPdfPage(doc, 1);
    } catch (err) {
      console.error('PDF URL yükleme hatası:', err);
      setLoadError('PDF bağlantısı doğrudan açılamadı. Lütfen PDF dosyanızı aşağıdaki butondan seçiniz.');
      setIsLoadingFile(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const targetUrl = initialPdfUrl || currentBook?.pdfUrl || currentBook?.pdf_url || '';
    if (targetUrl && !sourceImage && !pdfDoc) {
      loadPdfFromUrlOrBuffer(targetUrl, currentBook?.title || 'Kitap PDF Dokümanı');
    }
  }, [isOpen, initialPdfUrl, currentBook]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceFileName(file.name);
    setLoadError(null);
    setIsLoadingFile(true);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setPdfNumPages(doc.numPages);
        setPdfCurrentPage(1);
        setPageJumpInput('1');
        await renderPdfPage(doc, 1);
      } catch (err) {
        console.error('PDF yükleme hatası:', err);
        setLoadError('PDF dosyası açılamadı. Lütfen geçerli bir PDF veya görsel dosyası seçin.');
        setIsLoadingFile(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setSourceImage(dataUrl);
        setPdfDoc(null);
        setPdfNumPages(0);
        setIsLoadingFile(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleNextPage = async () => {
    if (!pdfDoc || pdfCurrentPage >= pdfNumPages) return;
    const nextPage = pdfCurrentPage + 1;
    setPdfCurrentPage(nextPage);
    setPageJumpInput(String(nextPage));
    await renderPdfPage(pdfDoc, nextPage);
  };

  const handlePrevPage = async () => {
    if (!pdfDoc || pdfCurrentPage <= 1) return;
    const prevPage = pdfCurrentPage - 1;
    setPdfCurrentPage(prevPage);
    setPageJumpInput(String(prevPage));
    await renderPdfPage(pdfDoc, prevPage);
  };

  const handlePageJump = async (e) => {
    e.preventDefault();
    if (!pdfDoc) return;
    const num = parseInt(pageJumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= pdfNumPages) {
      setPdfCurrentPage(num);
      await renderPdfPage(pdfDoc, num);
    }
  };

  useEffect(() => {
    if (sourceImage && imageObjRef.current) {
      drawCanvas();
    }
  }, [sourceImage, zoom, currentRect, slicedQuestions, drawCanvas]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!sourceImage) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !sourceImage) return;
    const coords = getCanvasCoords(e);
    const rect = {
      x: Math.min(startPos.x, coords.x),
      y: Math.min(startPos.y, coords.y),
      w: Math.abs(coords.x - startPos.x),
      h: Math.abs(coords.y - startPos.y)
    };
    setCurrentRect(rect);
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !currentRect || currentRect.w < 25 || currentRect.h < 25) {
      setIsDrawing(false);
      setCurrentRect(null);
      return;
    }

    setIsDrawing(false);

    const img = imageObjRef.current;
    if (!img) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = currentRect.w;
    cropCanvas.height = currentRect.h;
    const cropCtx = cropCanvas.getContext('2d');

    cropCtx.drawImage(
      img,
      currentRect.x, currentRect.y, currentRect.w, currentRect.h,
      0, 0, currentRect.w, currentRect.h
    );

    const croppedBase64 = cropCanvas.toDataURL('image/png');
    const compressed = await compressImageToWebP(croppedBase64, 1200, 0.85);

    const nextQNo = slicedQuestions.length + 1;
    let assignedTitle = `${nextQNo}. Soru`;
    let assignedAnswer = 'A';
    let assignedTestId = null;
    let originalQNo = null;

    if (activeTargetQuestion) {
      const sPrefix = activeTargetQuestion.subjectName ? `${activeTargetQuestion.subjectName} › ` : '';
      const uPrefix = activeTargetQuestion.unitName ? `${activeTargetQuestion.unitName} › ` : '';
      assignedTitle = `${sPrefix}${uPrefix}${activeTargetQuestion.testName} — Soru ${activeTargetQuestion.qNo}`;
      assignedAnswer = activeTargetQuestion.correctAnswer || 'A';
      assignedTestId = activeTargetQuestion.testId;
      originalQNo = activeTargetQuestion.qNo;
    }

    const newQuestion = {
      id: `sq_${Date.now()}_${nextQNo}`,
      qNo: nextQNo,
      title: assignedTitle,
      image: compressed.dataUrl || croppedBase64,
      sizeKb: compressed.sizeKb || 50,
      correctAnswer: assignedAnswer,
      optionCount: defaultOptionCount,
      subject: activeTargetQuestion?.subjectName || selectedSubject,
      grade: selectedGrade,
      page: pdfCurrentPage,
      rect: currentRect,
      sourceTestId: assignedTestId,
      originalQuestionNo: originalQNo
    };

    setSlicedQuestions(prev => [...prev, newQuestion]);
    setCurrentRect(null);

    if (activeTargetQuestion && bookMistakesList.length > 0) {
      let foundNext = false;
      for (const t of bookMistakesList) {
        for (const q of t.wrongQuestions) {
          const isAlreadyDone = [...slicedQuestions, newQuestion].some(sq => sq.sourceTestId === t.testId && sq.originalQuestionNo === q);
          if (!isAlreadyDone) {
            setActiveTargetQuestion({
              testId: t.testId,
              testName: t.testName,
              unitName: t.unitName,
              subjectName: t.subjectName,
              qNo: q,
              correctAnswer: t.answerKeyMap[q] || 'A'
            });
            foundNext = true;
            break;
          }
        }
        if (foundNext) break;
      }
      if (!foundNext) setActiveTargetQuestion(null);
    }
  };

  const handleDeleteQuestion = (id) => {
    setSlicedQuestions(prev => prev.filter(q => q.id !== id).map((q, idx) => ({ ...q, qNo: idx + 1 })));
  };

  const handleUpdateAnswer = (id, ans) => {
    setSlicedQuestions(prev => prev.map(q => q.id === id ? { ...q, correctAnswer: ans } : q));
  };

  const handleUpdateOptionCount = (id, count) => {
    setSlicedQuestions(prev => prev.map(q => q.id === id ? { ...q, optionCount: count, correctAnswer: (q.correctAnswer && q.correctAnswer.charCodeAt(0) - 65 >= count) ? 'A' : q.correctAnswer } : q));
  };

  const handleSetGlobalOptionCount = (count) => {
    setDefaultOptionCount(count);
    setSlicedQuestions(prev => prev.map(q => ({
      ...q,
      optionCount: count,
      correctAnswer: (q.correctAnswer && q.correctAnswer.charCodeAt(0) - 65 >= count) ? 'A' : q.correctAnswer
    })));
  };

  const handleSaveAll = async () => {
    if (slicedQuestions.length === 0) return;
    setIsSavingTest(true);

    try {
      const base64List = slicedQuestions.map(s => s.image);
      const answerKeyObj = {};
      const imageAnswersObj = {};

      const subQuestions = slicedQuestions.map((s, idx) => {
        const optCount = Math.max(2, Math.min(5, Number(s.optionCount) || defaultOptionCount));
        const letters = Array.from({ length: optCount }, (_, i) => String.fromCharCode(65 + i));
        const ansLetter = s.correctAnswer || 'A';
        answerKeyObj[idx + 1] = ansLetter;
        imageAnswersObj[idx] = ansLetter.charCodeAt(0) - 65;

        return {
          id: `subq_${idx}_${Date.now()}`,
          questionNo: idx + 1,
          title: s.title || `${idx + 1}. Soru`,
          questionText: s.title || `${idx + 1}. Soru`,
          contentType: 'gorsel',
          contentPayload: s.image,
          imageUrl: s.image,
          type: 'coktan_secmeli',
          optionCount: optCount,
          optionsCount: optCount,
          options: letters,
          correctAnswer: ansLetter,
          sourceTestId: s.sourceTestId || null,
          originalQuestionNo: s.originalQuestionNo || null
        };
      });

      const finalTitle = testTitle.trim() || `Kırpılmış Telafi Testi (${slicedQuestions.length} Soru)`;

      if (addQuestion) {
        await addQuestion({
          title: finalTitle,
          testTitle: finalTitle,
          subject: selectedSubject,
          gradeId: selectedGrade.replace(/[^0-9]/g, '') || '8',
          grade: selectedGrade,
          contentType: 'gorsel',
          type: 'coktan_secmeli',
          isBundle: true,
          questionCount: slicedQuestions.length,
          totalQuestions: slicedQuestions.length,
          contentPayload: base64List.join('\n\n'),
          imageUrl: base64List[0] || '',
          imageUrls: base64List,
          questionsList: subQuestions,
          answerKey: answerKeyObj,
          imageAnswers: imageAnswersObj,
          bookId: currentBook?.id || null,
          bookTitle: currentBook?.title || null,
          isRemedialTest: true
        });
      }

      if (onSaveQuestions) {
        onSaveQuestions(slicedQuestions, {
          title: finalTitle,
          subject: selectedSubject,
          grade: selectedGrade,
          bookId: currentBook?.id,
          questionsList: subQuestions
        });
      }

      setSaveSuccessMsg(`✓ "${finalTitle}" (${slicedQuestions.length} Soru) Soru Bankası'na başarıyla kaydedildi!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Test kaydetme hatası:', err);
      alert('Test kaydedilirken bir hata oluştu: ' + (err.message || err));
    } finally {
      setIsSavingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #0f172a)',
          width: '98vw',
          maxWidth: 1380,
          height: '94vh',
          borderRadius: 20,
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)'
        }}
      >
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}
            >
              <Scissors size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>
                  Akıllı PDF Soru Kırpıcı & Telafi Testi Birleştirici
                </h2>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 6 }}>
                  Smart Slicer 2.0
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Kitap takibindeki yanlış soruları görerek PDF üzerinden tek tıkla kırpın ve yeni bir telafi testinde birleştirin.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {books.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', padding: '4px 8px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <BookOpen size={14} className="text-indigo-500" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Kitap:</span>
                <select
                  value={selectedBookId || ''}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBookId(bId);
                    const bObj = books.find(b => String(b.id) === String(bId));
                    if (bObj?.pdfUrl) {
                      loadPdfFromUrlOrBuffer(bObj.pdfUrl, bObj.title);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    maxWidth: 220,
                    outline: 'none'
                  }}
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.subject || 'Genel'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bookMistakesList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMistakesGuide(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: showMistakesGuide ? '1.5px solid #ef4444' : '1px solid var(--color-border)',
                  background: showMistakesGuide ? (isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2') : 'transparent',
                  color: showMistakesGuide ? '#ef4444' : 'var(--color-text)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <AlertCircle size={14} />
                <span>Yanlışlar Kılavuzu ({bookMistakesList.reduce((sum, t) => sum + t.wrongQuestions.length, 0)} Soru)</span>
                {showMistakesGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: 6,
                borderRadius: 8
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {showMistakesGuide && bookMistakesList.length > 0 && (
            <div
              style={{
                width: 310,
                borderRight: '1.5px solid var(--color-border)',
                background: isDark ? '#0c111d' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--color-border)',
                  background: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} className="text-red-500" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#dc2626' }}>
                    Yanlış Yapılan Testler
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 6 }}>
                  {bookMistakesList.length} Test
                </span>
              </div>

              {activeTargetQuestion && (
                <div style={{ padding: '0.5rem 0.85rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🎯 Sıradaki: <strong>{activeTargetQuestion.subjectName ? `${activeTargetQuestion.subjectName} › ` : ''}{activeTargetQuestion.unitName ? `${activeTargetQuestion.unitName} › ` : ''}{activeTargetQuestion.testName} › Soru {activeTargetQuestion.qNo}</strong>
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginLeft: 6 }}>
                    Cevap: {activeTargetQuestion.correctAnswer}
                  </span>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookMistakesList.map(t => {
                  const sStyle = getSubjectBadgeStyle(t.subjectName || currentBook?.subject || 'Ders', isDark);

                  return (
                    <div
                      key={t.testId}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: 12,
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Top row: Ders Rozeti + Ünite Rozeti + Yanlış Sayısı */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          {/* 📘 DERS ROZETİ */}
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            background: sStyle.bg,
                            color: sStyle.color,
                            border: `1px solid ${sStyle.border}`,
                            padding: '2px 6px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            {sStyle.icon} {t.subjectName || currentBook?.subject || 'Ders'}
                          </span>

                          {/* 📚 ÜNİTE ROZETİ */}
                          {t.unitName && (
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              background: isDark ? 'rgba(168,85,247,0.2)' : '#f3e8ff',
                              color: '#9333ea',
                              border: isDark ? '1px solid rgba(168,85,247,0.4)' : '1px solid #e9d5ff',
                              padding: '2px 6px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              <Layers size={10} /> {t.unitName}
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ef4444', background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          {t.wrongQuestions.length} Yanlış
                        </span>
                      </div>

                      {/* Test Name */}
                      <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.25, marginTop: 1 }}>
                        {t.testName}
                      </div>

                      {/* Question Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {t.wrongQuestions.map(qNo => {
                          const isDone = slicedQuestions.some(sq => sq.sourceTestId === t.testId && sq.originalQuestionNo === qNo);
                          const isActive = activeTargetQuestion?.testId === t.testId && activeTargetQuestion?.qNo === qNo;
                          const cAns = t.answerKeyMap[qNo] || '';

                          return (
                            <button
                              key={qNo}
                              type="button"
                              onClick={() => {
                                setActiveTargetQuestion({
                                  testId: t.testId,
                                  testName: t.testName,
                                  unitName: t.unitName,
                                  qNo: qNo,
                                  correctAnswer: cAns || 'A'
                                });
                              }}
                              style={{
                                padding: '3px 7px',
                                borderRadius: 6,
                                border: isActive ? '1.5px solid #4f46e5' : (isDone ? '1px solid #bbf7d0' : '1px solid #fca5a5'),
                                background: isActive ? '#4f46e5' : (isDone ? (isDark ? 'rgba(34,197,94,0.15)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.15)' : '#fff1f2')),
                                color: isActive ? '#ffffff' : (isDone ? '#16a34a' : '#dc2626'),
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                transition: 'all 0.15s'
                              }}
                              title={isDone ? `Soru ${qNo} kırpıldı` : `Soru ${qNo} (Doğru Cevap: ${cAns || 'Bilinmiyor'})`}
                            >
                              {isDone ? <Check size={11} /> : <X size={11} />}
                              <span>Soru {qNo}</span>
                              {cAns && <span style={{ opacity: 0.8, fontSize: '0.64rem' }}>({cAns})</span>}
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

          <div
            style={{
              flex: 1,
              background: isDark ? '#090d16' : '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(99,102,241,0.25)'
                  }}
                >
                  <Upload size={14} />
                  <span>{sourceImage ? 'Başka PDF / Dosya Aç' : '📁 PDF veya Görsel Seç'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                {sourceFileName && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sourceFileName}
                  </span>
                )}
              </div>

              {pdfNumPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '3px 8px', borderRadius: 8 }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={pdfCurrentPage <= 1 || isLoadingFile}
                    style={{ background: 'transparent', border: 'none', cursor: pdfCurrentPage <= 1 ? 'not-allowed' : 'pointer', color: 'var(--color-text)', opacity: pdfCurrentPage <= 1 ? 0.4 : 1, padding: 2 }}
                    title="Önceki Sayfa"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <form onSubmit={handlePageJump} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <input
                      type="text"
                      value={pageJumpInput}
                      onChange={(e) => setPageJumpInput(e.target.value)}
                      style={{ width: 32, textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text)' }}
                    />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>/ {pdfNumPages}</span>
                  </form>
                  <button
                    onClick={handleNextPage}
                    disabled={pdfCurrentPage >= pdfNumPages || isLoadingFile}
                    style={{ background: 'transparent', border: 'none', cursor: pdfCurrentPage >= pdfNumPages ? 'not-allowed' : 'pointer', color: 'var(--color-text)', opacity: pdfCurrentPage >= pdfNumPages ? 0.4 : 1, padding: 2 }}
                    title="Sonraki Sayfa"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '3px 6px', borderRadius: 8 }}>
                <button
                  onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: 3 }}
                  title="Uzaklaş"
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, minWidth: 36, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: 3 }}
                  title="Yakınlaş"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: 3 }}
                  title="Sıfırla"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                cursor: sourceImage ? 'crosshair' : 'default',
                position: 'relative'
              }}
            >
              {isLoadingFile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#6366f1' }}>
                  <Loader2 size={32} className="animate-spin" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>Sayfa hazırlanıyor…</span>
                </div>
              )}

              {loadError && !isLoadingFile && (
                <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: 360, background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', padding: '1.5rem', borderRadius: 14, border: '1px solid #fecaca' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ margin: '0 0 10px 0', fontWeight: 700, fontSize: '0.82rem' }}>{loadError}</p>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 14px',
                      borderRadius: 8,
                      background: '#4f46e5',
                      color: 'white',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={14} />
                    <span>Bilgisayardan PDF Seç</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}

              {!sourceImage && !isLoadingFile && !loadError && (
                <div style={{ textAlign: 'center', maxWidth: 360 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <FileText size={28} className="text-indigo-500" />
                  </div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 900, margin: '0 0 4px 0' }}>PDF / Görsel Seçin</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                    Kırpmak istediğiniz kitap testini veya PDF dokümanını seçin. Farenizle soru etrafında dikdörtgen çizerek anında kırpın.
                  </p>
                </div>
              )}

              <div style={{ display: sourceImage && !isLoadingFile ? 'block' : 'none', transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    borderRadius: 6,
                    maxWidth: 'none',
                    userSelect: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              width: 360,
              borderLeft: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0
            }}
          >
            <div
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Scissors size={15} className="text-indigo-500" />
                  <span>Kırpılan Sorular ({slicedQuestions.length})</span>
                </h3>
                {slicedQuestions.length > 0 && (
                  <button
                    onClick={() => setSlicedQuestions([])}
                    style={{ fontSize: '0.7rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                  >
                    Temizle
                  </button>
                )}
              </div>

              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Test Başlığı (Örn: Sosyal Bilgiler Telafi Testi)"
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  color: 'var(--color-text)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: 6 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Varsayılan Şık:</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[2, 3, 4, 5].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleSetGlobalOptionCount(cnt)}
                      style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        border: defaultOptionCount === cnt ? '1.5px solid #6366f1' : '1px solid transparent',
                        background: defaultOptionCount === cnt ? (isDark ? 'rgba(99,102,241,0.3)' : '#e0e7ff') : 'transparent',
                        color: defaultOptionCount === cnt ? (isDark ? '#c7d2fe' : '#4f46e5') : 'var(--color-text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: defaultOptionCount === cnt ? 900 : 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cnt} Şık
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slicedQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  PDF üzerinde farenizle soruyu seçip bırakın. Seçtiğiniz sorular otomatik olarak doğru cevaplarıyla buraya eklenecektir. ✂️
                </div>
              ) : (
                slicedQuestions.map(q => {
                  const optCount = q.optionCount || defaultOptionCount;
                  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, optCount);
                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '0.65rem',
                        borderRadius: 12,
                        border: '1.5px solid var(--color-border)',
                        background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSlicedQuestions(prev => prev.map(item => item.id === q.id ? { ...item, title: val } : item));
                          }}
                          style={{
                            fontWeight: 900,
                            fontSize: '0.78rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text)',
                            flex: 1,
                            outline: 'none'
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 800 }}>~{q.sizeKb} KB</span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div style={{ width: '100%', maxHeight: 95, overflow: 'hidden', borderRadius: 6, border: '1px solid var(--color-border)', background: '#ffffff' }}>
                        <img src={q.image} alt={`Soru ${q.qNo}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Cevap:</span>
                          {letters.map(opt => (
                            <button
                              key={opt}
                              onClick={() => handleUpdateAnswer(q.id, opt)}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                border: q.correctAnswer === opt ? 'none' : '1px solid var(--color-border)',
                                background: q.correctAnswer === opt ? '#6366f1' : 'transparent',
                                color: q.correctAnswer === opt ? 'white' : 'var(--color-text)',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                cursor: 'pointer'
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>

                        <select
                          value={optCount}
                          onChange={(e) => handleUpdateOptionCount(q.id, Number(e.target.value))}
                          style={{
                            padding: '2px 4px',
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                            fontSize: '0.68rem',
                            background: 'transparent',
                            color: 'var(--color-text)'
                          }}
                        >
                          <option value={2}>2 Şık</option>
                          <option value={3}>3 Şık</option>
                          <option value={4}>4 Şık</option>
                          <option value={5}>5 Şık</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saveSuccessMsg && (
                <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#16a34a', textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px', borderRadius: 8 }}>
                  {saveSuccessMsg}
                </div>
              )}

              <button
                onClick={handleSaveAll}
                disabled={slicedQuestions.length === 0 || isSavingTest}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  fontSize: '0.84rem',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: slicedQuestions.length === 0 || isSavingTest ? 0.5 : 1,
                  cursor: slicedQuestions.length === 0 || isSavingTest ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 900,
                  boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
                }}
              >
                {isSavingTest ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{slicedQuestions.length > 0 ? `${slicedQuestions.length} Soruluk Testi Oluştur & Kaydet` : 'Testi Kaydet'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
