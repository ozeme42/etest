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

// Ensure PDF.js worker is configured reliably with correct MIME type
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const detectSubject = (text = '') => {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase();
  if (t.includes('matematik') || t.includes('geometri') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen') || t.includes('fizik') || t.includes('kimya') || t.includes('biyoloji')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('edebiyat') || t.includes('paragraf') || t.includes('dil bilgisi')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('tarih') || t.includes('coğrafya') || t.includes('cografya') || t.includes('inkılap') || t.includes('inkilap')) return 'Sosyal Bilgiler';
  if (t.includes('din') || t.includes('ahlak') || t.includes('dkab')) return 'Din Kültürü';
  if (t.includes('ingilizce') || t.includes('ing') || t.includes('english')) return 'İngilizce';
  return null;
};

const resolveSubjectName = (...candidates) => {
  for (const c of candidates) {
    if (c && typeof c === 'string') {
      const trimmed = c.trim();
      const detected = detectSubject(trimmed);
      if (detected) return detected;
      const lower = trimmed.toLowerCase();
      if (
        lower !== '' &&
        lower !== 'ders' &&
        lower !== 'genel' &&
        lower !== 'null' &&
        lower !== 'undefined' &&
        lower !== 'standart' &&
        lower !== 'optik' &&
        !trimmed.includes('›') &&
        !trimmed.includes('—') &&
        !trimmed.includes('(') &&
        !trimmed.includes(':') &&
        trimmed.length <= 25
      ) {
        return trimmed;
      }
    }
  }
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

function SlicerPdfPageItem({
  doc,
  pageNum,
  zoom = 1,
  slicedQuestions = [],
  onSliceQuestion,
  viewMode = 'scroll',
  pdfNumPages = 1,
  isDark = false
}) {
  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  const [isVisible, setIsVisible] = useState(pageNum <= 2 || viewMode === 'single');
  const [isRendered, setIsRendered] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 800, height: 1130 });
  const [currentRect, setCurrentRect] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // IntersectionObserver for lazy page rendering in scroll mode (hızlı ve hafif pre-load)
  useEffect(() => {
    if (viewMode === 'single' || isVisible || !containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '500px' });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible, viewMode]);

  // Doğrudan PDF.js donanım hızlandırmalı render (Sıfır Base64, Sıfır Gecikme)
  useEffect(() => {
    if (!doc || !isVisible) return;
    let renderTask = null;
    let isCancelled = false;

    const render = async () => {
      try {
        const page = await doc.getPage(pageNum);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.8 });
        const width = Math.round(viewport.width);
        const height = Math.round(viewport.height);
        setPageSize({ width, height });

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try { renderTask.cancel(); } catch {}
      }
    };
  }, [doc, pageNum, isVisible]);

  // Şeffaf üst katman: soru dikdörtgenleri ve anlık fare çizimi (Ultra Hafif 60+ FPS)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    if (canvas.width !== pageSize.width || canvas.height !== pageSize.height) {
      canvas.width = pageSize.width;
      canvas.height = pageSize.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Kırpılmış soruların yeşil kutucukları
    slicedQuestions.forEach(sq => {
      if (sq.rect && (!sq.page || Number(sq.page) === Number(pageNum))) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
        ctx.fillRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);

        ctx.fillStyle = '#22c55e';
        const labelText = sq.title || `Soru ${sq.qNo}`;
        const labelWidth = Math.max(68, labelText.length * 8 + 16);
        ctx.fillRect(sq.rect.x, Math.max(0, sq.rect.y - 24), labelWidth, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(labelText, sq.rect.x + 8, Math.max(16, sq.rect.y - 7));
      }
    });

    // Aktif fare ile çizilen mavi seçim kutucuğu
    if (currentRect && currentRect.w && currentRect.h) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
      ctx.setLineDash([]);
    }
  }, [slicedQuestions, pageNum, currentRect, pageSize]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay, isRendered, slicedQuestions, currentRect]);

  const getCanvasCoords = (e) => {
    const canvas = overlayCanvasRef.current || pdfCanvasRef.current;
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
    if (!isRendered) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !isRendered) return;
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
    if (!isDrawing || !currentRect || currentRect.w < 20 || currentRect.h < 20) {
      setIsDrawing(false);
      setCurrentRect(null);
      return;
    }
    setIsDrawing(false);

    const pdfCanvas = pdfCanvasRef.current;
    if (!pdfCanvas) return;

    try {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = currentRect.w;
      cropCanvas.height = currentRect.h;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return;

      cropCtx.drawImage(
        pdfCanvas,
        currentRect.x, currentRect.y, currentRect.w, currentRect.h,
        0, 0, currentRect.w, currentRect.h
      );

      const base64Data = cropCanvas.toDataURL('image/png');
      const compressed = await compressImageToWebP(base64Data, 1400, 0.82);

      onSliceQuestion({
        rect: currentRect,
        page: pageNum,
        image: compressed.dataUrl || base64Data,
        sizeKb: compressed.sizeKb || 50
      });
    } catch (err) {
      console.error('Question slice error:', err);
    } finally {
      setCurrentRect(null);
    }
  };

  return (
    <div
      id={`slicer-page-${pageNum}`}
      ref={containerRef}
      style={{
        position: 'relative',
        marginBottom: viewMode === 'scroll' ? '1.5rem' : '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'transparent',
        width: '100%'
      }}
    >
      {viewMode === 'scroll' && pdfNumPages > 1 && (
        <div
          style={{
            alignSelf: 'center',
            marginBottom: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
            color: 'var(--color-text)',
            padding: '3px 10px',
            borderRadius: 8,
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}
        >
          <FileText size={12} className="text-indigo-500" />
          <span>Sayfa {pageNum} / {pdfNumPages}</span>
        </div>
      )}

      {/* Sayfa Boyutu ve Zoom Çerçevesi */}
      <div
        style={{
          width: Math.round(pageSize.width * zoom),
          height: Math.round(pageSize.height * zoom),
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: pageSize.width,
            height: pageSize.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            background: '#ffffff',
            borderRadius: 6,
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}
        >
          {/* Katman 1: PDF Render Canvas (Doğrudan donanım hızlandırmalı) */}
          <canvas
            ref={pdfCanvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: pageSize.width,
              height: pageSize.height,
              display: isRendered ? 'block' : 'none'
            }}
          />

          {/* Katman 2: Şeffaf Seçim ve Kırpma Overlay Canvas (60+ FPS Çizim) */}
          <canvas
            ref={overlayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: pageSize.width,
              height: pageSize.height,
              cursor: 'crosshair',
              userSelect: 'none',
              zIndex: 2
            }}
          />

          {!isRendered && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#6366f1', background: isDark ? '#1e293b' : '#f8fafc' }}>
              <Loader2 size={28} className="animate-spin" />
              <span style={{ fontSize: '0.74rem', fontWeight: 800 }}>Sayfa {pageNum} hazırlanıyor…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' (Sürekli Dikey Kaydırma) | 'single' (Tek Sayfa)

  const [selectedBookId, setSelectedBookId] = useState(() => {
    return initialBook?.id || initialBookId || (books.length > 0 ? books[0].id : null);
  });
  const [showMistakesGuide, setShowMistakesGuide] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
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

    const bId = String(currentBook.id || '');
    const bUuid = String(toUUID(currentBook.id) || '');
    const studentIdStr = String(studentId || '').trim();
    const studentUuidStr = String(toUUID(studentId) || '').trim();

    const isMatchStudent = (s) => {
      if (!studentIdStr) return true;
      if (!s) return false;
      const sid = String(s.studentId ?? s.userId ?? s.student_id ?? s.raw_data?.studentId ?? s.raw_data?.student_id ?? '').trim();
      if (!sid) return true;
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
      const candidates = [
        s.id, s.submissionId, s.supabaseId, s.testId, s.realTestId, s.bookTestId,
        s.metadata?.realTestId, s.metadata?.bookTestId, s.metadata?.testId
      ];
      return candidates.some(c => {
        if (!c) return false;
        const str = String(c);
        const clean = str.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
        const u = toUUID(str);
        return deletedIds.has(str) || deletedIds.has(clean) || (u && deletedIds.has(String(u)));
      });
    };

    // 1. Build canonical list of tests strictly belonging to currentBook
    const rawSubjects = (currentBook.subjects && currentBook.subjects.length > 0)
      ? currentBook.subjects
      : (currentBook.raw_data?.subjects || []);

    const canonicalTests = [];
    let globalIndex = 0;

    if (rawSubjects.length > 0) {
      rawSubjects.forEach((subj, sIdx) => {
        const sId = String(subj.id || `subj_${sIdx}`);
        const sName = resolveSubjectName(subj.name, currentBook.subject, currentBook.title);

        const topics = (subj.topics && Array.isArray(subj.topics) && subj.topics.length > 0)
          ? subj.topics
          : [{ id: `top_${sId}_1`, name: '1. Ünite' }];

        topics.forEach((tp, tpIdx) => {
          const tpId = String(tp.id || `tp_${tpIdx}`);
          const uName = tp.name || tp.title || `${tpIdx + 1}. Ünite`;

          // Find tests in bookTests matching this book & (subject or topic)
          let matchedTests = (bookTests || []).filter(bt => {
            const isMatchBook = String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid);
            if (!isMatchBook) return false;
            return String(bt.topicId || bt.topic_id) === tpId || String(bt.subjectId || bt.subject_id) === sId;
          });

          // If no tests in bookTests for this topic, check tp.tests
          if (matchedTests.length === 0 && tp.tests && Array.isArray(tp.tests) && tp.tests.length > 0) {
            matchedTests = tp.tests;
          }

          // Fallback: Default 5 tests per unit topic (same as Kitap Takibi)
          if (matchedTests.length === 0) {
            matchedTests = [];
            for (let i = 1; i <= 5; i++) {
              matchedTests.push({
                id: `tbt_${bId}_${sId}_${tpId}_${i}`,
                bookId: bId,
                subjectId: sId,
                topicId: tpId,
                name: i <= 3 ? `Test-${i}` : (i === 4 ? 'Yeni Nesil 1' : 'Yeni Nesil 2'),
                questionCount: 20,
                answerKey: {}
              });
            }
          }

          matchedTests.forEach((t) => {
            globalIndex++;
            canonicalTests.push({
              id: String(t.id),
              cleanId: String(t.id).replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''),
              uuid: toUUID(t.id),
              name: t.name || t.title || `Test ${globalIndex}`,
              subjectName: sName,
              unitName: uName,
              orderIndex: Number(t.order || t.order_index || globalIndex),
              answerKey: t.answerKey || t.answer_key || currentBook.answerKey || {}
            });
          });
        });
      });
    } else {
      // If book has no subjects array, check bookTests for this book
      const bTests = (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid));
      const defaultSubj = resolveSubjectName(currentBook.subject, currentBook.title);

      if (bTests.length > 0) {
        bTests.forEach((bt) => {
          globalIndex++;
          canonicalTests.push({
            id: String(bt.id),
            cleanId: String(bt.id).replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''),
            uuid: toUUID(bt.id),
            name: bt.name || bt.title || `Test ${globalIndex}`,
            subjectName: resolveSubjectName(bt.subject_name, bt.subjectName, bt.subject, defaultSubj),
            unitName: bt.unit_name || bt.unitName || bt.topic_name || bt.topicName || '1. Ünite',
            orderIndex: Number(bt.order || bt.order_index || globalIndex),
            answerKey: bt.answerKey || bt.answer_key || currentBook.answerKey || {}
          });
        });
      }
    }

    // 2. For each canonical test, find mistakes from submissions
    const list = [];

    const getCorrectLetter = (q, ak) => {
      const val = ak[q] ?? ak[String(q)] ?? (Array.isArray(ak) ? ak[q - 1] : null);
      if (typeof val === 'string' && /^[A-Ea-e]$/.test(val.trim())) return val.trim().toUpperCase();
      if (typeof val === 'number' && val >= 0 && val <= 4) return String.fromCharCode(65 + val);
      return null;
    };

    canonicalTests.forEach(testObj => {
      // Find matching submissions for this test
      const matchedSubs = [];

      (submissions || []).forEach(s => {
        if (!s || isDeletedItem(s) || !isMatchStudent(s)) return;
        if (s.status === 'in_progress' || s.status === 'draft') return;

        const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
        const matchFields = [
          String(s.testId || ''),
          String(s.test_id || ''),
          String(s.realTestId || ''),
          String(s.bookTestId || ''),
          String(s.id || ''),
          String(meta?.realTestId || ''),
          String(meta?.bookTestId || ''),
          String(meta?.realId || '')
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          matchFields.push(...s.bookTestIds.map(String));
        }

        const isMatch = matchFields.some(f => f && (
          f === testObj.id ||
          f === testObj.cleanId ||
          f.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '') === testObj.cleanId ||
          (testObj.uuid && f === testObj.uuid) ||
          (testObj.uuid && toUUID(f) === testObj.uuid)
        ));

        if (isMatch) matchedSubs.push(s);
      });

      (homeworks || []).forEach(hw => {
        if (!hw) return;
        const hwSubList = Array.isArray(hw.submissions) && hw.submissions.length > 0
          ? hw.submissions
          : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);

        hwSubList.forEach(s => {
          if (!s || isDeletedItem(s) || !isMatchStudent(s)) return;
          if (s.status === 'in_progress' || s.status === 'draft') return;

          const subTId = String(s.testId || s.test_id || s.bookTestId || s.realTestId || s.id || '');
          const isMatch = (
            subTId === testObj.id ||
            subTId === testObj.cleanId ||
            subTId.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '') === testObj.cleanId ||
            (testObj.uuid && subTId === testObj.uuid) ||
            (testObj.uuid && toUUID(subTId) === testObj.uuid)
          );

          if (isMatch) matchedSubs.push(s);
        });
      });

      if (matchedSubs.length === 0) return;

      // Extract wrong questions
      const wrongQNos = new Set();
      matchedSubs.forEach(sub => {
        if (Array.isArray(sub.answers) && sub.answers.length > 0) {
          sub.answers.forEach((ans, idx) => {
            const qNo = Number(ans.questionNo || ans.questionNoInSection || ans.qNum || ans.qNo || (idx + 1));
            const isWrong = ans.isCorrect === false ||
              (ans.userAnswer && ans.correctAnswer && String(ans.userAnswer).trim().toUpperCase() !== String(ans.correctAnswer).trim().toUpperCase()) ||
              (ans.score !== undefined && ans.score !== null && Number(ans.score) === 0 && ans.userAnswer && ans.userAnswer !== 'empty');
            if (isWrong && qNo > 0) wrongQNos.add(qNo);
          });
        }

        const rawWrongs = sub.wrongQuestions || sub.raw_data?.wrongQuestions;
        if (Array.isArray(rawWrongs) && rawWrongs.length > 0) {
          rawWrongs.forEach(q => {
            const qNo = typeof q === 'object' ? Number(q.qNum || q.qNo || q.questionNo || q.question) : Number(q);
            if (!isNaN(qNo) && qNo > 0) wrongQNos.add(qNo);
          });
        }

        const rawReasons = sub.mistakeReasons || sub.raw_data?.mistakeReasons;
        if (rawReasons && typeof rawReasons === 'object') {
          Object.keys(rawReasons).forEach(k => {
            const qNo = parseInt(k, 10);
            if (!isNaN(qNo) && qNo > 0) wrongQNos.add(qNo);
          });
        }
      });

      // Check localStorage for mistake reasons
      try {
        const keysToTry = [
          `mistake_reasons_${testObj.id}_${studentIdStr}`,
          `mistake_reasons_bt_${testObj.id}_${studentIdStr}`,
          `mistake_reasons_${testObj.id}`,
          `mistake_reasons_bt_${testObj.id}`
        ];
        for (const key of keysToTry) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
              Object.keys(parsed).forEach(qKey => {
                const qNo = parseInt(qKey, 10);
                if (!isNaN(qNo) && qNo > 0) wrongQNos.add(qNo);
              });
            }
          }
        }
      } catch {}

      // Fallback if wrongCount > 0 but no specific question numbers
      if (wrongQNos.size === 0) {
        const maxWrong = Math.max(...matchedSubs.map(s => s.wrongCount ?? s.wrong ?? s.raw_data?.wrongCount ?? s.raw_data?.wrong ?? 0));
        if (maxWrong > 0) {
          const totalQ = matchedSubs[0]?.totalQuestions || 10;
          const corr = matchedSubs[0]?.correctCount ?? 0;
          for (let i = corr + 1; i <= Math.min(totalQ, corr + maxWrong); i++) {
            wrongQNos.add(i);
          }
        }
      }

      const wrongList = Array.from(wrongQNos).sort((a, b) => a - b);
      if (wrongList.length === 0) return;

      const akMap = {};
      wrongList.forEach(q => {
        const letter = getCorrectLetter(q, testObj.answerKey);
        if (letter) akMap[q] = letter;
      });

      list.push({
        testId: testObj.id,
        testName: testObj.name,
        unitName: testObj.unitName,
        orderIndex: testObj.orderIndex,
        subjectName: testObj.subjectName,
        wrongQuestions: wrongList,
        answerKeyMap: akMap
      });
    });

    // Sort strictly by book test order
    list.sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.testName.localeCompare(b.testName, 'tr', { numeric: true });
    });

    return list;
  }, [currentBook, initialMistakes, studentId, submissions, homeworks, bookTests]);

  // 🌲 3-KADEMELİ HİYERARŞİK AĞAÇ (Ders › Ünite › Testler)
  const groupedMistakesTree = useMemo(() => {
    if (!bookMistakesList || bookMistakesList.length === 0) return [];

    const subjectMap = new Map();

    bookMistakesList.forEach(testItem => {
      const sName = testItem.subjectName || 'Genel';
      const uName = testItem.unitName || '1. Ünite';

      if (!subjectMap.has(sName)) {
        subjectMap.set(sName, {
          subjectName: sName,
          totalWrong: 0,
          totalTests: 0,
          unitMap: new Map()
        });
      }

      const sGroup = subjectMap.get(sName);
      sGroup.totalWrong += testItem.wrongQuestions.length;
      sGroup.totalTests += 1;

      if (!sGroup.unitMap.has(uName)) {
        sGroup.unitMap.set(uName, {
          unitName: uName,
          subjectName: sName,
          orderIndex: testItem.orderIndex,
          totalWrong: 0,
          tests: []
        });
      }

      const uGroup = sGroup.unitMap.get(uName);
      uGroup.totalWrong += testItem.wrongQuestions.length;
      uGroup.tests.push(testItem);
    });

    const result = [];
    subjectMap.forEach(sGroup => {
      const units = Array.from(sGroup.unitMap.values());
      // Sort units by their orderIndex
      units.sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
        return a.unitName.localeCompare(b.unitName, 'tr', { numeric: true });
      });

      // Sort tests within unit
      units.forEach(u => {
        u.tests.sort((a, b) => {
          if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
          return a.testName.localeCompare(b.testName, 'tr', { numeric: true });
        });
      });

      result.push({
        subjectName: sGroup.subjectName,
        totalWrong: sGroup.totalWrong,
        totalTests: sGroup.totalTests,
        units
      });
    });

    return result;
  }, [bookMistakesList]);

  // Akordiyon Açık/Kapalı Durumları (Varsayılan olarak kapalıdır)
  const [openSubjects, setOpenSubjects] = useState({});
  const [openUnits, setOpenUnits] = useState({});

  const toggleSubject = (sName) => {
    setOpenSubjects(prev => ({
      ...prev,
      [sName]: !prev[sName]
    }));
  };

  const toggleUnit = (uKey) => {
    setOpenUnits(prev => ({
      ...prev,
      [uKey]: !prev[uKey]
    }));
  };

  const expandAll = () => {
    const nextSubjs = {};
    const nextUnits = {};
    groupedMistakesTree.forEach(s => {
      nextSubjs[s.subjectName] = true;
      s.units.forEach(u => {
        nextUnits[`${s.subjectName}___${u.unitName}`] = true;
      });
    });
    setOpenSubjects(nextSubjs);
    setOpenUnits(nextUnits);
  };

  const collapseAll = () => {
    setOpenSubjects({});
    setOpenUnits({});
  };

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

  useEffect(() => {
    if (activeTargetQuestion) {
      const sName = activeTargetQuestion.subjectName || 'Genel';
      const uName = activeTargetQuestion.unitName || '1. Ünite';
      const uKey = `${sName}___${uName}`;
      setOpenSubjects(prev => ({ ...prev, [sName]: true }));
      setOpenUnits(prev => ({ ...prev, [uKey]: true }));
    }
  }, [activeTargetQuestion]);

  useEffect(() => {
    if (bookMistakesList.length > 0 && bookMistakesList[0]?.subjectName && bookMistakesList[0].subjectName !== 'Genel') {
      setSelectedSubject(bookMistakesList[0].subjectName);
    }
  }, [bookMistakesList]);

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

  const handleAutoFit = useCallback(async (mode = 'page') => {
    const container = containerRef.current;
    if (!container) return;

    let targetW = 0;
    let targetH = 0;

    if (pdfDoc) {
      try {
        const page = await pdfDoc.getPage(pdfCurrentPage || 1);
        const vp = page.getViewport({ scale: 1.8 });
        targetW = vp.width;
        targetH = vp.height;
      } catch {}
    } else if (imageObjRef.current?.width) {
      targetW = imageObjRef.current.width;
      targetH = imageObjRef.current.height;
    }

    if (!targetW || !targetH) {
      targetW = 1050;
      targetH = 1485;
    }

    const availW = container.clientWidth - 48;
    const availH = container.clientHeight - 48;
    if (availW <= 0 || availH <= 0) return;

    if (mode === 'width') {
      const z = Math.min(2.0, Math.max(0.2, Number((availW / targetW).toFixed(2))));
      setZoom(z);
    } else {
      const scaleX = availW / targetW;
      const scaleY = availH / targetH;
      const z = Math.min(1.5, Math.max(0.2, Number((Math.min(scaleX, scaleY) * 0.96).toFixed(2))));
      setZoom(z);
    }
  }, [pdfDoc, pdfCurrentPage]);

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
      setIsLoadingFile(false);

      // PDF açıldığında tam ekran sığdırma ölçeğini otomatik hesapla
      setTimeout(async () => {
        try {
          const p1 = await doc.getPage(1);
          const vp = p1.getViewport({ scale: 1.8 });
          if (containerRef.current && vp.width && vp.height) {
            const availW = containerRef.current.clientWidth - 48;
            const availH = containerRef.current.clientHeight - 48;
            if (availW > 0 && availH > 0) {
              const scaleX = availW / vp.width;
              const scaleY = availH / vp.height;
              const z = Math.min(1.5, Math.max(0.2, Number((Math.min(scaleX, scaleY) * 0.96).toFixed(2))));
              setZoom(z);
            }
          }
        } catch {}
      }, 60);
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
        setIsLoadingFile(false);

        // PDF açıldığında tam ekran sığdırma ölçeğini otomatik hesapla
        setTimeout(async () => {
          try {
            const p1 = await doc.getPage(1);
            const vp = p1.getViewport({ scale: 1.8 });
            if (containerRef.current && vp.width && vp.height) {
              const availW = containerRef.current.clientWidth - 48;
              const availH = containerRef.current.clientHeight - 48;
              if (availW > 0 && availH > 0) {
                const scaleX = availW / vp.width;
                const scaleY = availH / vp.height;
                const z = Math.min(1.5, Math.max(0.2, Number((Math.min(scaleX, scaleY) * 0.96).toFixed(2))));
                setZoom(z);
              }
            }
          } catch {}
        }, 60);
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

  const scrollToPage = (pageNum) => {
    if (!pageNum || pageNum < 1 || (pdfNumPages > 0 && pageNum > pdfNumPages)) return;
    setPdfCurrentPage(pageNum);
    setPageJumpInput(String(pageNum));

    if (viewMode === 'scroll') {
      const el = document.getElementById(`slicer-page-${pageNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (pdfDoc) {
      renderPdfPage(pdfDoc, pageNum);
    }
  };

  const handleNextPage = () => {
    scrollToPage(Math.min(pdfNumPages || 1, pdfCurrentPage + 1));
  };

  const handlePrevPage = () => {
    scrollToPage(Math.max(1, pdfCurrentPage - 1));
  };

  const handlePageJump = (e) => {
    e.preventDefault();
    const num = parseInt(pageJumpInput, 10);
    if (!isNaN(num)) {
      scrollToPage(num);
    }
  };

  // 📜 Dikey kaydırma modunda kullanıcının gördüğü aktif sayfayı otomatik takip et
  useEffect(() => {
    if (viewMode !== 'scroll' || !pdfDoc || pdfNumPages <= 1 || !containerRef.current) return;
    const container = containerRef.current;

    const handleScroll = () => {
      const pageElements = container.querySelectorAll('[id^="slicer-page-"]');
      const containerTop = container.scrollTop;
      const containerMiddle = containerTop + container.clientHeight / 3;

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i];
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (top <= containerMiddle && bottom >= containerMiddle) {
          const pageNum = parseInt(el.id.replace('slicer-page-', ''), 10);
          if (!isNaN(pageNum) && pageNum !== pdfCurrentPage) {
            setPdfCurrentPage(pageNum);
            setPageJumpInput(String(pageNum));
          }
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [viewMode, pdfDoc, pdfNumPages, pdfCurrentPage]);

  // Tekil görsel (PNG/JPG) yüklemeleri için standart çizim
  useEffect(() => {
    if (sourceImage && imageObjRef.current && !pdfDoc) {
      drawCanvas();
    }
  }, [sourceImage, zoom, currentRect, slicedQuestions, drawCanvas, pdfDoc]);

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

  const handleSliceQuestionOnPage = ({ rect, page, image, sizeKb }) => {
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
      image: image,
      sizeKb: sizeKb || 50,
      correctAnswer: assignedAnswer,
      optionCount: defaultOptionCount,
      subject: activeTargetQuestion?.subjectName || selectedSubject,
      grade: selectedGrade,
      page: page,
      rect: rect,
      sourceTestId: assignedTestId,
      originalQuestionNo: originalQNo
    };

    setSlicedQuestions(prev => [...prev, newQuestion]);

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

    handleSliceQuestionOnPage({
      rect: currentRect,
      page: pdfCurrentPage,
      image: compressed.dataUrl || croppedBase64,
      sizeKb: compressed.sizeKb || 50
    });

    setCurrentRect(null);
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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #0f172a)',
          width: '99vw',
          maxWidth: '99vw',
          height: '98vh',
          borderRadius: 14,
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)'
        }}
      >
        <div
          style={{
            padding: '0.6rem 1.1rem',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Akıllı PDF Soru Kırpıcı & Telafi Testi Birleştirici
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#e0e7ff', color: '#4338ca', padding: '1px 7px', borderRadius: 99 }}>
                  Smart Slicer 2.0
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                Kitap takibindeki yanlış soruları görerek PDF üzerinden tek tıkla kırpın ve yeni bir telafi testinde birleştirin.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {books.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Kitap:</span>
                <select
                  value={selectedBookId || ''}
                  onChange={(e) => {
                    setSelectedBookId(e.target.value);
                    const b = books.find(item => String(item.id) === e.target.value);
                    if (b?.pdfUrl) {
                      loadPdfFromUrlOrBuffer(b.pdfUrl, b.title);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    maxWidth: 220,
                    cursor: 'pointer'
                  }}
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title || 'İsimsiz Kitap'} {b.subject ? `(${b.subject})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: 5,
                borderRadius: 8
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {/* SOL PANEL: YANLIŞLAR KILAVUZU AKORDİYONU */}
          {showMistakesGuide && (
            <div
              style={{
                width: 290,
                height: '100%',
                maxHeight: '100%',
                minHeight: 0,
                borderRight: '1.5px solid var(--color-border)',
                background: isDark ? '#0c111d' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '0.55rem 0.75rem',
                  borderBottom: '1px solid var(--color-border)',
                  background: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={13} className="text-red-500" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#dc2626' }}>
                    Yanlışlar Kılavuzu
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={Object.keys(openSubjects).length > 0 ? collapseAll : expandAll}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      padding: '2px 5px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {Object.keys(openSubjects).length > 0 ? 'Kapat' : 'Aç'}
                  </button>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: 6 }}>
                    {bookMistakesList.length} Test
                  </span>
                </div>
              </div>

              {activeTargetQuestion && (
                <div style={{ padding: '0.45rem 0.75rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🎯 Sıradaki: <strong>{activeTargetQuestion.subjectName ? `${activeTargetQuestion.subjectName} › ` : ''}{activeTargetQuestion.unitName ? `${activeTargetQuestion.unitName} › ` : ''}{activeTargetQuestion.testName} › Soru {activeTargetQuestion.qNo}</strong>
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: 4, flexShrink: 0, marginLeft: 4 }}>
                    {activeTargetQuestion.correctAnswer}
                  </span>
                </div>
              )}

              {/* 🌲 AKORDİYON LİSTESİ: DERS › ÜNİTE › TESTLER */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5
                }}
              >
                {groupedMistakesTree.map(sGroup => {
                  const sStyle = getSubjectBadgeStyle(sGroup.subjectName, isDark);
                  const isSubjOpen = Boolean(openSubjects[sGroup.subjectName]);

                  return (
                    <div
                      key={sGroup.subjectName}
                      style={{
                        borderRadius: 10,
                        border: `1.5px solid ${isSubjOpen ? sStyle.border : 'var(--color-border)'}`,
                        background: 'var(--color-surface)',
                        overflow: 'hidden',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* 1. KADEME: DERS BAŞLIĞI */}
                      <button
                        type="button"
                        onClick={() => toggleSubject(sGroup.subjectName)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.65rem',
                          background: isSubjOpen ? sStyle.bg : 'var(--color-surface)',
                          border: 'none',
                          borderBottom: isSubjOpen ? `1px solid ${sStyle.border}` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 5,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                          <span style={{ color: sStyle.color, display: 'flex', alignItems: 'center' }}>
                            {isSubjOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: isSubjOpen ? sStyle.color : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{sStyle.icon}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sGroup.subjectName}</span>
                          </span>
                        </div>

                        <span style={{ fontSize: '0.64rem', fontWeight: 800, background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 6, flexShrink: 0 }}>
                          {sGroup.totalTests} Test • {sGroup.totalWrong} Y
                        </span>
                      </button>

                      {/* 2. KADEME: ÜNİTELER LİSTESİ */}
                      {isSubjOpen && (
                        <div style={{ padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: 5, background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(241,245,249,0.5)' }}>
                          {sGroup.units.map(uGroup => {
                            const uKey = `${sGroup.subjectName}___${uGroup.unitName}`;
                            const isUnitOpen = Boolean(openUnits[uKey]);

                            return (
                              <div
                                key={uKey}
                                style={{
                                  borderRadius: 8,
                                  border: isUnitOpen ? (isDark ? '1px solid rgba(168,85,247,0.4)' : '1px solid #e9d5ff') : '1px solid var(--color-border)',
                                  background: 'var(--color-surface)',
                                  overflow: 'hidden'
                                }}
                              >
                                {/* 2. KADEME: ÜNİTE BAŞLIĞI */}
                                <button
                                  type="button"
                                  onClick={() => toggleUnit(uKey)}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.55rem',
                                    background: isUnitOpen ? (isDark ? 'rgba(168,85,247,0.15)' : '#faf5ff') : 'var(--color-surface)',
                                    border: 'none',
                                    borderBottom: isUnitOpen ? (isDark ? '1px solid rgba(168,85,247,0.3)' : '1px solid #f3e8ff') : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 5,
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                    <span style={{ color: '#9333ea', display: 'flex', alignItems: 'center' }}>
                                      {isUnitOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: isUnitOpen ? '#9333ea' : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <Layers size={10} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uGroup.unitName}</span>
                                    </span>
                                  </div>

                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626', padding: '1px 4px', borderRadius: 4, flexShrink: 0 }}>
                                    {uGroup.tests.length} T • {uGroup.totalWrong} Y
                                  </span>
                                </button>

                                {/* 3. KADEME: TESTLER VE SORULAR */}
                                {isUnitOpen && (
                                  <div style={{ padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: 5, background: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc' }}>
                                    {uGroup.tests.map(t => {
                                      return (
                                        <div
                                          key={t.testId}
                                          style={{
                                            padding: '0.45rem 0.55rem',
                                            borderRadius: 7,
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-surface)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 3
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                                              📌 {t.testName}
                                            </span>
                                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ef4444', background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', padding: '1px 4px', borderRadius: 4, flexShrink: 0 }}>
                                              {t.wrongQuestions.length} Yanlış
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
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
                                                      subjectName: t.subjectName,
                                                      qNo: qNo,
                                                      correctAnswer: cAns || 'A'
                                                    });
                                                  }}
                                                  style={{
                                                    padding: '2px 5px',
                                                    borderRadius: 5,
                                                    border: isActive ? '1.5px solid #4f46e5' : (isDone ? '1px solid #bbf7d0' : '1px solid #fca5a5'),
                                                    background: isActive ? '#4f46e5' : (isDone ? (isDark ? 'rgba(34,197,94,0.15)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.15)' : '#fff1f2')),
                                                    color: isActive ? '#ffffff' : (isDone ? '#16a34a' : '#dc2626'),
                                                    fontSize: '0.66rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    transition: 'all 0.15s'
                                                  }}
                                                  title={isDone ? `Soru ${qNo} kırpıldı` : `Soru ${qNo} (Doğru: ${cAns || '?'})`}
                                                >
                                                  {isDone ? <Check size={9} /> : <X size={9} />}
                                                  <span>S.{qNo}</span>
                                                  {cAns && <span style={{ opacity: 0.8, fontSize: '0.6rem' }}>({cAns})</span>}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ORTA BÖLÜM: PDF / GÖRSEL GÖRÜNTÜLEYİCİ VE KIRPICI ÇALIŞMA ALANI */}
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
            {/* Üst Araç Çubuğu (Toolbar) */}
            <div
              style={{
                padding: '6px 10px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* Yanlışlar Panelini Aç/Kapat Butonu */}
                <button
                  type="button"
                  onClick={() => setShowMistakesGuide(p => !p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 7,
                    border: '1px solid var(--color-border)',
                    background: showMistakesGuide ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'var(--color-surface)',
                    color: showMistakesGuide ? '#4f46e5' : 'var(--color-text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  title={showMistakesGuide ? 'Yanlışlar Panelini Gizle' : 'Yanlışlar Panelini Göster'}
                >
                  <Layers size={13} />
                  <span>{showMistakesGuide ? '◀ Kılavuzu Gizle' : '▶ Yanlışlar'}</span>
                </button>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 7,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(99,102,241,0.25)'
                  }}
                >
                  <Upload size={13} />
                  <span>{sourceImage ? 'Başka Dosya Aç' : '📁 PDF / Görsel Seç'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                {sourceFileName && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sourceFileName}
                  </span>
                )}
              </div>

              {/* Görünüm Modu ve Sayfa Gezinme Butonları */}
              {pdfDoc && pdfNumPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Mod Seçici (Sürekli Dikey Kaydır / Tek Sayfa) */}
                  <div style={{ display: 'flex', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '2px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('scroll')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: viewMode === 'scroll' ? '#4f46e5' : 'transparent',
                        color: viewMode === 'scroll' ? 'white' : 'var(--color-text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s'
                      }}
                      title="Sürekli Dikey Kaydırma (Tüm Kitabı Aşağı Kaydırarak Gör)"
                    >
                      <Layers size={11} />
                      <span>Sürekli Kaydır</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('single')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: viewMode === 'single' ? '#4f46e5' : 'transparent',
                        color: viewMode === 'single' ? 'white' : 'var(--color-text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s'
                      }}
                      title="Tek Sayfa Modu (Sayfa Sayfa İlerlet)"
                    >
                      <FileText size={11} />
                      <span>Tek Sayfa</span>
                    </button>
                  </div>

                  {/* Sayfa Atlama & İleri/Geri */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '2px 6px', borderRadius: 7 }}>
                    <button
                      onClick={handlePrevPage}
                      disabled={pdfCurrentPage <= 1 || isLoadingFile}
                      style={{ background: 'transparent', border: 'none', cursor: pdfCurrentPage <= 1 ? 'not-allowed' : 'pointer', color: 'var(--color-text)', opacity: pdfCurrentPage <= 1 ? 0.4 : 1, padding: 2 }}
                      title="Önceki Sayfaya Git"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <form onSubmit={handlePageJump} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Sayfa</span>
                      <input
                        type="text"
                        value={pageJumpInput}
                        onChange={(e) => setPageJumpInput(e.target.value)}
                        style={{ width: 32, textAlign: 'center', fontSize: '0.72rem', fontWeight: 900, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, color: 'var(--color-text)', padding: '1px 0' }}
                        title="Sayfa numarası yazıp Enter'a basın"
                      />
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>/ {pdfNumPages}</span>
                    </form>
                    <button
                      onClick={handleNextPage}
                      disabled={pdfCurrentPage >= pdfNumPages || isLoadingFile}
                      style={{ background: 'transparent', border: 'none', cursor: pdfCurrentPage >= pdfNumPages ? 'not-allowed' : 'pointer', color: 'var(--color-text)', opacity: pdfCurrentPage >= pdfNumPages ? 0.4 : 1, padding: 2 }}
                      title="Sonraki Sayfaya Git"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Hızlı Görünüm ve Sığdırma Butonları */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {(sourceImage || pdfDoc) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAutoFit('page')}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        padding: '3px 7px',
                        borderRadius: 6,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title="Tüm Sayfayı Ekrana Sığdır (Tam Görünüm)"
                    >
                      📄 Sayfaya Sığdır
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoFit('width')}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        padding: '3px 7px',
                        borderRadius: 6,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title="Genişliğe Sığdır"
                    >
                      ↔️ Genişlik
                    </button>
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '2px 5px', borderRadius: 7 }}>
                  <button
                    onClick={() => setZoom(z => Math.max(0.25, Number((z - 0.1).toFixed(2))))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: 2 }}
                    title="Uzaklaş"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, minWidth: 32, textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: 2 }}
                    title="Yakınlaş"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={() => handleAutoFit('page')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: 2 }}
                    title="Sıfırla / Sığdır"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>

                {/* Sağ Kırpılanlar Panelini Aç/Kapat */}
                <button
                  type="button"
                  onClick={() => setShowRightPanel(p => !p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 7,
                    border: '1px solid var(--color-border)',
                    background: showRightPanel ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'var(--color-surface)',
                    color: showRightPanel ? '#4f46e5' : 'var(--color-text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  title={showRightPanel ? 'Kırpılanlar Panelini Gizle' : 'Kırpılanlar Panelini Göster'}
                >
                  <Scissors size={12} />
                  <span>{showRightPanel ? 'Kırpılanlar ▶' : '◀ Kırpılanlar'}</span>
                </button>
              </div>
            </div>

            {/* Canvas / Sayfa Görüntüleme Sahnesi */}
            <div
              ref={containerRef}
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '0.75rem',
                cursor: (sourceImage || pdfDoc) ? 'crosshair' : 'default',
                position: 'relative'
              }}
            >
              {isLoadingFile && !pdfDoc && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#6366f1', margin: 'auto' }}>
                  <Loader2 size={32} className="animate-spin" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>PDF Dokümanı hazırlanıyor…</span>
                </div>
              )}

              {loadError && !isLoadingFile && (
                <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: 360, background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', padding: '1.5rem', borderRadius: 14, border: '1px solid #fecaca', margin: 'auto' }}>
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

              {!sourceImage && !pdfDoc && !isLoadingFile && !loadError && (
                <div style={{ textAlign: 'center', maxWidth: 360, margin: 'auto' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <FileText size={28} className="text-indigo-500" />
                  </div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 900, margin: '0 0 4px 0' }}>PDF / Görsel Seçin</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                    Kırpmak istediğiniz kitap testini veya PDF dokümanını seçin. Farenizle soru etrafında dikdörtgen çizerek anında kırpın.
                  </p>
                </div>
              )}

              {/* PDF Çoklu Sayfa (Sürekli Dikey Kaydırma Modu) */}
              {pdfDoc && viewMode === 'scroll' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem', paddingBottom: '3rem' }}>
                  {Array.from({ length: pdfNumPages }, (_, i) => i + 1).map(pNum => (
                    <SlicerPdfPageItem
                      key={`slicer_page_item_${pNum}`}
                      doc={pdfDoc}
                      pageNum={pNum}
                      zoom={zoom}
                      slicedQuestions={slicedQuestions}
                      onSliceQuestion={handleSliceQuestionOnPage}
                      viewMode="scroll"
                      pdfNumPages={pdfNumPages}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}

              {/* PDF Tek Sayfa Modu */}
              {pdfDoc && viewMode === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <SlicerPdfPageItem
                    key={`slicer_page_single_${pdfCurrentPage}`}
                    doc={pdfDoc}
                    pageNum={pdfCurrentPage}
                    zoom={zoom}
                    slicedQuestions={slicedQuestions}
                    onSliceQuestion={handleSliceQuestionOnPage}
                    viewMode="single"
                    pdfNumPages={pdfNumPages}
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Tekil Görsel (PNG / JPG) Yüklemeleri için */}
              {sourceImage && !pdfDoc && (
                <div
                  style={{
                    display: !isLoadingFile ? 'inline-block' : 'none',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.08s ease-out'
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                      borderRadius: 6,
                      maxWidth: 'none',
                      display: 'block',
                      userSelect: 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SAĞ PANEL: KIRPILAN SORULAR & TEST OLUŞTURUCU */}
          {showRightPanel && (
            <div
              style={{
                width: 320,
                height: '100%',
                maxHeight: '100%',
                minHeight: 0,
                borderLeft: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '0.84rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Scissors size={14} className="text-indigo-500" />
                    <span>Kırpılan Sorular ({slicedQuestions.length})</span>
                  </h3>
                  {slicedQuestions.length > 0 && (
                    <button
                      onClick={() => setSlicedQuestions([])}
                      style={{ fontSize: '0.68rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800 }}
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

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        )}
      </div>
    </div>
  </div>
  );
}
