import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Scissors, Upload, X, Check, Trash2, Plus, ArrowRight, ArrowLeft,
  ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, FileText,
  CheckCircle2, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  BookOpen, Sparkles, HelpCircle, Layers, CheckSquare, Square,
  ExternalLink, Save, Filter, ChevronDown, ChevronUp, Eye, Calendar, Users
} from 'lucide-react';
import { compressImageToWebP } from '../../services/imageCompressionService';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useTrackedBooks } from '../../context/TrackedBookContext';
import { useEvaluation } from '../../context/EvaluationContext';
import { useHomework } from '../../context/HomeworkContext';
import { useQuestionBank } from '../../context/QuestionBankContext';
import { useCurriculum } from '../../context/CurriculumContext';
import { useCoaching } from '../../context/CoachingContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getAllUnifiedStudentSubmissions } from '../../services/unifiedResultAdapter';
import { getEmbeddablePdfUrl } from '../../utils/pdfUtils';
import { toUUID, dbSaveRemedialRepetition } from '../../services/supabaseService';
import { scheduleRemedialTestInProgram, REPETITION_PRESETS } from '../../services/remedialSpacedRepetitionService';
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

export const parseTestNameInfo = (name) => {
  const str = String(name || '').trim();
  const lower = str.toLowerCase();

  let cat = 6;
  if (/^(yeni nesil|beceri|lgs)/i.test(lower)) {
    cat = 2;
  } else if (/^(ünite|ü\.|değerlendirme|ü\. değ|ü\.değ)/i.test(lower)) {
    cat = 3;
  } else if (/^(tarama|sarmal|tekrar|genel tekrar)/i.test(lower)) {
    cat = 4;
  } else if (/^(deneme|sınav|tatil)/i.test(lower)) {
    cat = 5;
  } else if (/^(test|kazanım|kavrama|etkinlik|konu)/i.test(lower) || /^t-\d+/i.test(lower) || /^test-\d+/i.test(lower)) {
    cat = 1;
  }

  const numMatch = str.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 0;

  return { cat, num, str };
};

export const compareBookTestsOrder = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const nameA = String(a.testName || a.name || a.title || '').trim();
  const nameB = String(b.testName || b.name || b.title || '').trim();

  const pA = parseTestNameInfo(nameA);
  const pB = parseTestNameInfo(nameB);

  // 1. Sort by Category (Test-1..12 first -> Yeni Nesil 1..10 second -> Ünite Değerlendirme third...)
  if (pA.cat !== pB.cat) {
    return pA.cat - pB.cat;
  }

  // 2. Within same category, sort numerically (1, 2, 3, 4 ... 10, 11, 12)
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

  const [isVisible, setIsVisible] = useState(pageNum === 1 || viewMode === 'single');
  const [isRendered, setIsRendered] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 800, height: 1130 });
  const [currentRect, setCurrentRect] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // IntersectionObserver for lazy page rendering in scroll mode
  useEffect(() => {
    if (viewMode === 'single' || isVisible || !containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible, viewMode]);

  // Doğrudan PDF.js donanım hızlandırmalı render (Ultra Hızlı ve Hafif)
  useEffect(() => {
    if (!doc || !isVisible) return;
    let renderTask = null;
    let isCancelled = false;

    const render = async () => {
      try {
        const page = await doc.getPage(pageNum);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.35 });
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
    const clientX = e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? e.clientX ?? 0;
    const clientY = e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? e.clientY ?? 0;
    return {
      x: (clientX - r.left) * scaleX,
      y: (clientY - r.top) * scaleY
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
            onTouchStart={(e) => { e.preventDefault(); handleMouseDown(e); }}
            onTouchMove={(e) => { e.preventDefault(); handleMouseMove(e); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
            onTouchCancel={() => { setIsDrawing(false); setCurrentRect(null); }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: pageSize.width,
              height: pageSize.height,
              cursor: 'crosshair',
              userSelect: 'none',
              touchAction: 'none',
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
  mode = 'general', // 'general' (Soru Bankası / Serbest PDF Kırpıcı) | 'mistakes' (Kitap Yanlışları Telafi Testi)
  isPageMode = false,
  initialBook = null,
  initialBookId = null,
  initialPdfUrl = null,
  initialMistakes = null,
  studentId = null,
  subject: initialSubject = 'Matematik',
  grade: initialGrade = '8. Sınıf'
}) {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const { users = [] } = useUser();
  const { data: curData } = useCurriculum();
  const studentList = useMemo(() => {
    return (users || []).filter(u => {
      if (!u) return false;
      return u.role === 'student' || (!u.role && u.role !== 'teacher' && u.role !== 'admin');
    });
  }, [users]);

  const getStudentGradeLabel = useCallback((st) => {
    if (!st) return '';
    if (st.className && !st.className.startsWith('g_')) return st.className;
    if (st.grade && !String(st.grade).startsWith('g_')) {
      return String(st.grade).includes('Sınıf') ? st.grade : `${st.grade}. Sınıf`;
    }
    const matchedGrade = curData?.grades?.find(g => 
      String(g.id) === String(st.gradeId) || 
      String(g.id) === String(st.classId) || 
      g.name === st.gradeId ||
      g.name === st.grade
    );
    if (matchedGrade?.name) return matchedGrade.name;
    if (st.gradeId) {
      const num = String(st.gradeId).replace(/[^0-9]/g, '');
      if (num && num.length <= 2) return `${num}. Sınıf`;
    }
    return '';
  }, [curData]);
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { homeworks = [], addHomework } = useHomework();
  const { addQuestion } = useQuestionBank();
  const { coachingProfiles = [], saveCoachingProfile } = useCoaching();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileActiveTab, setMobileActiveTab] = useState(() => mode === 'mistakes' ? 'guide' : 'pdf'); // 'guide' | 'pdf' | 'sliced'
  const [scheduleMode, setScheduleMode] = useState('spaced_leitner'); // 'spaced_leitner' | 'fast' | 'today' | 'none'
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);

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

  // 📚 Tüm Kitaplar ve Deneme Sınavları Birleşik Listesi (Dropdown ve Kılavuz için)
  const allAvailableBooks = useMemo(() => {
    const list = [...(books || [])];
    (homeworks || []).forEach(hw => {
      if (hw && (hw.isPhysical || hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || (hw.title && hw.title.toLowerCase().includes('deneme')) || (hw.title && hw.title.toLowerCase().includes('sınav')))) {
        if (!list.some(b => String(b.id) === String(hw.id) || (hw.title && b.title === hw.title))) {
          list.push({
            id: hw.id,
            title: hw.title || 'Deneme Sınavı',
            pdfUrl: hw.pdfUrl,
            subject: hw.subject || 'Deneme Sınavı',
            grade: hw.grade,
            isExam: true
          });
        }
      }
    });
    if (initialBook && !list.some(b => String(b.id) === String(initialBook.id) || (initialBook.title && b.title === initialBook.title))) {
      list.unshift(initialBook);
    }
    return list;
  }, [books, homeworks, initialBook]);

  const [selectedBookId, setSelectedBookId] = useState(() => {
    return initialBook?.id || initialBookId || (initialMistakes && initialMistakes[0]?.testId) || (mode === 'mistakes' && allAvailableBooks.length > 0 ? allAvailableBooks[0].id : null);
  });
  const [showMistakesGuide, setShowMistakesGuide] = useState(() => mode === 'mistakes');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeTargetQuestion, setActiveTargetQuestion] = useState(null);

  const [testTitle, setTestTitle] = useState('');
  const [targetStudentId, setTargetStudentId] = useState(() => studentId || (currentUser?.role === 'student' ? currentUser?.id : ''));
  const [customIntervals, setCustomIntervals] = useState([1, 3, 7, 15]);

  useEffect(() => {
    if (!targetStudentId && currentUser?.role !== 'student' && studentList.length > 0) {
      setTargetStudentId(studentList[0].id);
    }
  }, [targetStudentId, currentUser, studentList]);

  const effectiveStudentId = targetStudentId || studentId || (currentUser?.role === 'student' ? currentUser?.id : '');

  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageObjRef = useRef(null);

  const currentBook = useMemo(() => {
    if (initialBook && (!selectedBookId || String(initialBook.id) === String(selectedBookId) || (selectedBookId === initialBookId))) {
      return initialBook;
    }
    if (selectedBookId) {
      const found = allAvailableBooks.find(b => String(b.id) === String(selectedBookId) || toUUID(b.id) === toUUID(selectedBookId));
      if (found) return found;
    }
    if (initialMistakes && initialMistakes.length > 0) {
      const firstMistake = initialMistakes[0];
      const mTitle = firstMistake.name || firstMistake.testName || firstMistake.title;
      if (mTitle) {
        const found = allAvailableBooks.find(b => b.title && b.title.toLowerCase().trim() === mTitle.toLowerCase().trim());
        if (found) return found;
        return {
          id: selectedBookId || firstMistake.testId || 'custom_exam',
          title: mTitle,
          pdfUrl: initialPdfUrl || firstMistake.pdfUrl || null,
          subject: initialSubject || firstMistake.subjectName || 'Genel',
          grade: initialGrade || firstMistake.grade || null,
          isExam: true
        };
      }
    }
    return mode === 'mistakes' ? (allAvailableBooks[0] || null) : null;
  }, [selectedBookId, allAvailableBooks, initialBook, initialBookId, initialMistakes, initialPdfUrl, initialSubject, initialGrade, mode]);

  useEffect(() => {
    if (mode === 'mistakes' && currentBook?.title) {
      const cleanBook = currentBook.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
      setTestTitle(`${cleanBook} — Özel Telafi Testi`);
      if (currentBook.subject) setSelectedSubject(currentBook.subject);
      if (currentBook.grade) setSelectedGrade(`${currentBook.grade}. Sınıf`);
    } else {
      setTestTitle(`${selectedSubject || 'Özel'} PDF Testi`);
    }
  }, [currentBook, mode, selectedSubject]);

  const bookMistakesList = useMemo(() => {
    if (initialMistakes && Array.isArray(initialMistakes) && initialMistakes.length > 0) {
      return initialMistakes.map(item => {
        const wrongList = (item.wrongQuestionsList || item.wrongQuestions || []).map(q => typeof q === 'object' ? (q.qNo || q.qNum || 1) : Number(q));
        const akMap = item.answerKeyMap || {};
        if (Array.isArray(item.wrongQuestionsList)) {
          item.wrongQuestionsList.forEach(q => {
            const num = q.qNo || q.qNum || 1;
            const corr = q.correctOption || q.correctAns;
            if (corr && corr !== '?' && corr !== '—') akMap[num] = corr;
          });
        }
        return {
          ...item,
          testId: item.testId || item.id,
          testName: item.testName || item.name || item.title || 'Test',
          unitName: item.unitName || '1. Ünite',
          subjectName: item.subjectName || item.subject || 'Genel',
          pdfPage: item.pdfPage || item.page || 1,
          wrongQuestions: wrongList.length > 0 ? wrongList : (item.wrongCount ? Array.from({ length: item.wrongCount }, (_, i) => i + 1) : []),
          wrongCount: wrongList.length || item.wrongCount || 0,
          answerKeyMap: akMap
        };
      }).sort(compareBookTestsOrder);
    }
    if (!currentBook) return [];

    const bId = String(currentBook.id || '');
    const bUuid = String(toUUID(currentBook.id) || '');
    const studentIdStr = String(effectiveStudentId || '').trim();
    const studentUuidStr = String(toUUID(effectiveStudentId) || '').trim();

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

    // ⚡ O(1) Pre-built Submissions Index (Indexed by all test ID variants)
    const subsByTestId = new Map();
    const addSubToMap = (key, sub) => {
      if (!key) return;
      const kStr = String(key).trim();
      if (!kStr) return;
      if (!subsByTestId.has(kStr)) subsByTestId.set(kStr, []);
      subsByTestId.get(kStr).push(sub);

      const clean = kStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
      if (clean && clean !== kStr) {
        if (!subsByTestId.has(clean)) subsByTestId.set(clean, []);
        subsByTestId.get(clean).push(sub);
      }
      const u = toUUID(kStr);
      if (u && String(u) !== kStr) {
        const uStr = String(u);
        if (!subsByTestId.has(uStr)) subsByTestId.set(uStr, []);
        subsByTestId.get(uStr).push(sub);
      }
    };

    (submissions || []).forEach(s => {
      if (!s || isDeletedItem(s) || !isMatchStudent(s)) return;
      if (s.status === 'in_progress' || s.status === 'draft') return;
      const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
      const ids = [s.testId, s.test_id, s.realTestId, s.bookTestId, s.id, meta?.realTestId, meta?.bookTestId, meta?.realId];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) ids.push(...s.bookTestIds);
      ids.forEach(id => addSubToMap(id, s));
    });

    (homeworks || []).forEach(hw => {
      if (!hw) return;
      const hwSubs = Array.isArray(hw.submissions) && hw.submissions.length > 0
        ? hw.submissions
        : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);
      hwSubs.forEach(s => {
        if (!s || isDeletedItem(s) || !isMatchStudent(s)) return;
        if (s.status === 'in_progress' || s.status === 'draft') return;
        addSubToMap(s.testId || s.test_id || s.bookTestId || s.realTestId || s.id, s);
      });
    });

    // ⚡ O(1) Pre-built localStorage Mistake Reasons Index (Single fast scan)
    const localReasonsMap = new Map();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('mistake_reasons_')) {
          const val = localStorage.getItem(k);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (parsed && typeof parsed === 'object') {
                localReasonsMap.set(k, parsed);
              }
            } catch {}
          }
        }
      }
    } catch {}

    // 1. Build canonical list of tests strictly belonging to currentBook
    const rawSubjects = (currentBook.subjects && currentBook.subjects.length > 0)
      ? currentBook.subjects
      : (currentBook.raw_data?.subjects || []);

    const canonicalTests = [];
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

          let matchedTests = (bookTests || []).filter(bt => {
            const isMatchBook = String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid);
            if (!isMatchBook) return false;
            return String(bt.topicId || bt.topic_id) === tpId || (topics.length === 1 && String(bt.subjectId || bt.subject_id) === sId);
          });

          if (matchedTests.length === 0 && tp.tests && Array.isArray(tp.tests) && tp.tests.length > 0) {
            matchedTests = tp.tests;
          }

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
            canonicalTests.push({
              id: String(t.id),
              cleanId: String(t.id).replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''),
              uuid: toUUID(t.id),
              name: t.name || t.title || 'Test',
              subjectName: sName,
              unitName: uName,
              answerKey: t.answerKey || t.answer_key || currentBook.answerKey || {}
            });
          });
        });
      });
    } else {
      const bTests = (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid));
      const defaultSubj = resolveSubjectName(currentBook.subject, currentBook.title);

      if (bTests.length > 0) {
        bTests.forEach((bt) => {
          canonicalTests.push({
            id: String(bt.id),
            cleanId: String(bt.id).replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''),
            uuid: toUUID(bt.id),
            name: bt.name || bt.title || 'Test',
            subjectName: resolveSubjectName(bt.subject_name, bt.subjectName, bt.subject, defaultSubj),
            unitName: bt.unit_name || bt.unitName || bt.topic_name || bt.topicName || '1. Ünite',
            answerKey: bt.answerKey || bt.answer_key || currentBook.answerKey || {}
          });
        });
      }
    }

    // 2. For each canonical test, find mistakes using strict submission matching
    const list = [];

    const getCorrectLetter = (q, ak) => {
      const val = ak[q] ?? ak[String(q)] ?? (Array.isArray(ak) ? ak[q - 1] : null);
      if (typeof val === 'string' && /^[A-Ea-e]$/.test(val.trim())) return val.trim().toUpperCase();
      if (typeof val === 'number' && val >= 0 && val <= 4) return String.fromCharCode(65 + val);
      return null;
    };

    canonicalTests.forEach(testObj => {
      const tIdStr = String(testObj.id);
      const tCleanId = String(testObj.cleanId || '');
      const tUuidStr = String(testObj.uuid || '');

      const matchedSubs = (submissions || []).filter(s => {
        if (!s || isDeletedItem(s) || !isMatchStudent(s)) return false;
        if (s.status === 'in_progress' || s.status === 'draft') return false;

        const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
        const matchFields = [
          String(s.testId || ''),
          String(s.realTestId || ''),
          String(s.bookTestId || ''),
          String(s.id || ''),
          String(meta?.realTestId || ''),
          String(meta?.bookTestId || ''),
          String(meta?.realId || '')
        ].filter(f => Boolean(f) && f.length >= 2);
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          matchFields.push(...s.bookTestIds.map(String).filter(f => Boolean(f) && f.length >= 2));
        }

        return matchFields.some(f => (
          f === tIdStr ||
          (tCleanId && tCleanId.length >= 3 && f === tCleanId) ||
          (tUuidStr && f === tUuidStr) ||
          (toUUID(f) && toUUID(f) === tIdStr) ||
          (tUuidStr && toUUID(f) === tUuidStr)
        ));
      });

      if (matchedSubs.length === 0) return;

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
      });

      // ONLY include tests that ACTUALLY have wrong questions
      if (wrongQNos.size === 0) return;

      const wrongList = Array.from(wrongQNos).sort((a, b) => a - b);
      const akMap = {};
      wrongList.forEach(q => {
        const letter = getCorrectLetter(q, testObj.answerKey);
        if (letter) akMap[q] = letter;
      });

      list.push({
        testId: testObj.id,
        testName: testObj.name,
        unitName: testObj.unitName,
        subjectName: testObj.subjectName,
        wrongQuestions: wrongList,
        answerKeyMap: akMap
      });
    });

    list.sort(compareBookTestsOrder);
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

      const wCount = (testItem.wrongQuestions || []).length || testItem.wrongCount || 0;
      const sGroup = subjectMap.get(sName);
      sGroup.totalWrong += wCount;
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
      uGroup.totalWrong += wCount;
      uGroup.tests.push(testItem);
    });

    const result = [];
    subjectMap.forEach(sGroup => {
      const units = Array.from(sGroup.unitMap.values());
      // Sort units by natural unit number (1. Ünite, 2. Ünite, ...)
      units.sort(compareUnitOrder);

      // Sort tests within unit using book curriculum order
      units.forEach(u => {
        u.tests.sort(compareBookTestsOrder);
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

  // Hızlı Ders ve Ünite Seçimi
  const [activeGuideSubject, setActiveGuideSubject] = useState('');
  const [activeGuideUnit, setActiveGuideUnit] = useState('all');
  const [searchQueryGuide, setSearchQueryGuide] = useState('');

  // Otomatik ilk dersi seç
  useEffect(() => {
    if (groupedMistakesTree.length > 0 && !activeGuideSubject) {
      setActiveGuideSubject(groupedMistakesTree[0].subjectName);
    }
  }, [groupedMistakesTree, activeGuideSubject]);

  const currentSubjectGroup = useMemo(() => {
    if (!activeGuideSubject) return groupedMistakesTree[0] || null;
    return groupedMistakesTree.find(s => s.subjectName === activeGuideSubject) || groupedMistakesTree[0] || null;
  }, [groupedMistakesTree, activeGuideSubject]);

  const availableUnitsForSubject = useMemo(() => {
    return currentSubjectGroup?.units || [];
  }, [currentSubjectGroup]);

  const displayedGuideTests = useMemo(() => {
    if (!currentSubjectGroup) return [];
    let tests = [];
    if (activeGuideUnit === 'all') {
      currentSubjectGroup.units.forEach(u => {
        const sortedUnitTests = [...u.tests].sort(compareBookTestsOrder);
        tests.push(...sortedUnitTests);
      });
    } else {
      const uObj = currentSubjectGroup.units.find(u => String(u.unitName).trim().toLowerCase() === String(activeGuideUnit).trim().toLowerCase());
      if (uObj) {
        tests.push(...[...uObj.tests].sort(compareBookTestsOrder));
      } else {
        tests = [];
      }
    }

    if (searchQueryGuide.trim()) {
      const q = searchQueryGuide.toLowerCase().trim();
      tests = tests.filter(t => 
        (t.testName || '').toLowerCase().includes(q) ||
        (t.unitName || '').toLowerCase().includes(q) ||
        (t.wrongQuestions || []).some(qNo => String(qNo) === q || `s.${qNo}`.includes(q))
      );
    }

    return tests;
  }, [currentSubjectGroup, activeGuideUnit, searchQueryGuide]);

  // Tüm yanlış soruları düz bir liste olarak çıkaralım (Sonraki / Önceki geçiş için)
  const allFlattenedMistakeQuestions = useMemo(() => {
    const list = [];
    groupedMistakesTree.forEach(sGroup => {
      sGroup.units.forEach(uGroup => {
        const sortedTests = [...uGroup.tests].sort(compareBookTestsOrder);
        sortedTests.forEach(t => {
          const sortedWrongQNos = [...(t.wrongQuestions || [])].sort((a, b) => Number(a) - Number(b));
          sortedWrongQNos.forEach(qNo => {
            list.push({
              testId: t.testId,
              testName: t.testName || t.name || t.title,
              unitName: t.unitName,
              subjectName: t.subjectName,
              qNo: qNo,
              correctAnswer: (t.answerKeyMap && t.answerKeyMap[qNo]) || 'A'
            });
          });
        });
      });
    });
    return list;
  }, [groupedMistakesTree]);

  const handleNextMistakeQuestion = useCallback(() => {
    if (allFlattenedMistakeQuestions.length === 0) return;
    if (!activeTargetQuestion) {
      setActiveTargetQuestion(allFlattenedMistakeQuestions[0]);
      return;
    }
    const curIdx = allFlattenedMistakeQuestions.findIndex(
      item => item.testId === activeTargetQuestion.testId && item.qNo === activeTargetQuestion.qNo
    );
    if (curIdx === -1 || curIdx >= allFlattenedMistakeQuestions.length - 1) {
      setActiveTargetQuestion(allFlattenedMistakeQuestions[0]);
    } else {
      const nextQ = allFlattenedMistakeQuestions[curIdx + 1];
      setActiveTargetQuestion(nextQ);
      if (nextQ.subjectName) setActiveGuideSubject(nextQ.subjectName);
      if (nextQ.unitName) setActiveGuideUnit(nextQ.unitName);
    }
  }, [allFlattenedMistakeQuestions, activeTargetQuestion]);

  const handlePrevMistakeQuestion = useCallback(() => {
    if (allFlattenedMistakeQuestions.length === 0) return;
    if (!activeTargetQuestion) {
      setActiveTargetQuestion(allFlattenedMistakeQuestions[0]);
      return;
    }
    const curIdx = allFlattenedMistakeQuestions.findIndex(
      item => item.testId === activeTargetQuestion.testId && item.qNo === activeTargetQuestion.qNo
    );
    if (curIdx <= 0) {
      const prevQ = allFlattenedMistakeQuestions[allFlattenedMistakeQuestions.length - 1];
      setActiveTargetQuestion(prevQ);
      if (prevQ.subjectName) setActiveGuideSubject(prevQ.subjectName);
      if (prevQ.unitName) setActiveGuideUnit(prevQ.unitName);
    } else {
      const prevQ = allFlattenedMistakeQuestions[curIdx - 1];
      setActiveTargetQuestion(prevQ);
      if (prevQ.subjectName) setActiveGuideSubject(prevQ.subjectName);
      if (prevQ.unitName) setActiveGuideUnit(prevQ.unitName);
    }
  }, [allFlattenedMistakeQuestions, activeTargetQuestion]);

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
    const clientX = e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? e.clientX ?? 0;
    const clientY = e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? e.clientY ?? 0;
    return {
      x: (clientX - r.left) * scaleX,
      y: (clientY - r.top) * scaleY
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

      const isRemedial = mode === 'mistakes';
      const finalStudentId = isRemedial ? (targetStudentId || studentId || null) : null;

      const repetitionIntervals = isRemedial
        ? (scheduleMode === 'custom' ? customIntervals : (scheduleMode === 'spaced_leitner' ? [1, 3, 7, 15] : (scheduleMode === 'fast' ? [1, 2, 4, 7] : (scheduleMode === 'today' ? [1] : []))))
        : [];

      let savedTest = null;
      if (addQuestion) {
        savedTest = await addQuestion({
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
          isRemedialTest: isRemedial,
          isRemedial: isRemedial,
          isTeacherRemedial: Boolean(finalStudentId),
          sourceType: isRemedial ? 'pdfSlicerRemedial' : 'pdfSlicerGeneral',
          studentId: finalStudentId,
          assignedStudentId: finalStudentId,
          createdBy: finalStudentId || currentUser?.id || 'teacher',
          teacherAssigned: Boolean(finalStudentId),
          repetitionScheduleMode: isRemedial ? scheduleMode : 'none',
          repetitionIntervals,
          targetMasteryPct: (isRemedial && keepMasteryTracking) ? 100 : null
        });
      }

      let savedHw = null;
      if (isRemedial && addHomework) {
        savedHw = await addHomework({
          title: finalTitle,
          subject: selectedSubject,
          grade: selectedGrade,
          gradeId: selectedGrade.replace(/[^0-9]/g, '') || '8',
          targetStudentId: finalStudentId,
          studentId: finalStudentId,
          assignedStudentId: finalStudentId,
          targetType: 'student',
          targetStudentIds: finalStudentId ? [finalStudentId] : [],
          questionCount: slicedQuestions.length,
          totalQuestions: slicedQuestions.length,
          questionsList: subQuestions,
          questionIds: subQuestions.map(sq => sq.id),
          answerKey: answerKeyObj,
          imageAnswers: imageAnswersObj,
          contentPayload: base64List.join('\n\n'),
          imageUrl: base64List[0] || '',
          imageUrls: base64List,
          bookId: currentBook?.id || null,
          bookTitle: currentBook?.title || null,
          isRemedial: true,
          isRemedialTest: true,
          isTeacherRemedial: true,
          sourceType: 'pdfSlicerRemedial',
          repetitionScheduleMode: scheduleMode,
          repetitionIntervals,
          keepMasteryTracking,
          targetMasteryPct: keepMasteryTracking ? 100 : null,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      const assignedTestId = savedHw?.id || savedTest?.id || `test_${Date.now()}`;

      // Save to Supabase remedial_spaced_repetition table
      if (isRemedial && finalStudentId && repetitionIntervals.length > 0) {
        dbSaveRemedialRepetition({
          studentId: finalStudentId,
          testId: assignedTestId,
          homeworkId: savedHw?.id || null,
          intervals: repetitionIntervals,
          keepMasteryTracking,
          startDate: new Date()
        }).catch(e => console.warn('[Supabase] dbSaveRemedialRepetition error:', e));
      }

      if (isRemedial && scheduleMode !== 'none' && finalStudentId && saveCoachingProfile) {
        try {
          const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
          const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(finalStudentId)) || {
            studentId: finalStudentId,
            weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
          };

          const updatedProg = scheduleRemedialTestInProgram({
            currentWeeklyProgram: currentProfile.weeklyProgram || [],
            testItem: {
              id: assignedTestId,
              hwId: savedHw?.id || null,
              title: finalTitle,
              subject: selectedSubject,
              questionCount: slicedQuestions.length
            },
            intervals: repetitionIntervals,
            studentId: finalStudentId
          });

          await saveCoachingProfile({
            ...currentProfile,
            studentId: finalStudentId,
            weeklyProgram: updatedProg
          });
        } catch (schedErr) {
          console.error('Program ekleme hatası:', schedErr);
        }
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

      const scheduleMsg = scheduleMode === 'spaced_leitner'
        ? 've 1, 3, 7, 15 günlük aralıklı tekrar programına eklendi!'
        : (scheduleMode === 'fast'
            ? 've 1, 2, 4, 7 günlük hızlı pekiştirme programına eklendi!'
            : (scheduleMode === 'today' ? 've bugünün programına eklendi!' : '!'));

      setSaveSuccessMsg(`✓ "${finalTitle}" (${slicedQuestions.length} Soru) kaydedildi ${scheduleMsg}`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        onClose();
      }, 2500);
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
        zIndex: 99999,
        background: 'var(--color-surface, #ffffff)',
        color: 'var(--color-text, #0f172a)',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
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
            flexShrink: 0,
            gap: 8
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: mode === 'general' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
                  {mode === 'general' ? '📄 PDF / Görselden Soru Kırpıcı & Test Oluşturucu' : 'Akıllı PDF Soru Kırpıcı & Telafi Testi Birleştirici'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: mode === 'general' ? '#ecfdf5' : '#e0e7ff', color: mode === 'general' ? '#047857' : '#4338ca', padding: '1px 7px', borderRadius: 99 }}>
                  {mode === 'general' ? 'Soru Bankası Modu' : 'Smart Slicer 2.0'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                {mode === 'general'
                  ? 'Herhangi bir PDF veya görselden soru kırparak yeni bir test oluşturun ve doğrudan Soru Bankasına aktarın.'
                  : 'Kitap takibindeki yanlış soruları görerek PDF üzerinden tek tıkla kırpın ve yeni bir telafi testinde birleştirin.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {mode === 'general' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  title="Ders Seçin"
                >
                  {['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Din Kültürü', 'İngilizce', 'Genel'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  title="Sınıf Seçin"
                >
                  {['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf', 'LGS', 'TYT', 'AYT', 'Genel'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            ) : (
              allAvailableBooks.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Kitap:</span>
                  <select
                    value={selectedBookId || ''}
                    onChange={(e) => {
                      setSelectedBookId(e.target.value);
                      const b = allAvailableBooks.find(item => String(item.id) === e.target.value);
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
                    {allAvailableBooks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title || 'İsimsiz Kitap'} {b.subject ? `(${b.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            <button
              onClick={onClose}
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                color: 'var(--color-text)',
                padding: '5px 12px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                fontWeight: 800,
                transition: 'all 0.15s'
              }}
              title="Önceki Sayfaya Dön / Kapat"
            >
              <ArrowLeft size={15} />
              <span>Geri Dön</span>
            </button>
          </div>
        </div>

        {/* ── 🎯 1. ADIM: HEDEF ÖĞRENCİ, KİTAP & ARALIKLI TEKRAR DÖNGÜSÜ AYARLARI ── */}
        {mode === 'mistakes' && (
          <div style={{
            background: isDark ? '#1e293b' : '#f8fafc',
            borderBottom: '1.5px solid var(--color-border)',
            padding: '0.6rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            zIndex: 25
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              {/* 1. Hedef Öğrenci Seçimi */}
              {currentUser?.role !== 'student' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={14} className="text-indigo-500" />
                    <span>Öğrenci:</span>
                  </span>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1.5px solid #6366f1',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: 'var(--color-text)',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.15)'
                    }}
                  >
                    <option value="">🏢 Tüm Sınıf / Genel Test</option>
                    {studentList.map(st => {
                      const gradeLbl = getStudentGradeLabel(st);
                      return (
                        <option key={st.id} value={st.id}>
                          👤 {st.name || st.fullName} {gradeLbl ? `(${gradeLbl})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* 2. Kitap Seçimi */}
              {allAvailableBooks.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={14} className="text-emerald-500" />
                    <span>Kitap / Sınav:</span>
                  </span>
                  <select
                    value={selectedBookId || ''}
                    onChange={(e) => {
                      setSelectedBookId(e.target.value);
                      const b = allAvailableBooks.find(item => String(item.id) === e.target.value);
                      if (b?.pdfUrl) {
                        loadPdfFromUrlOrBuffer(b.pdfUrl, b.title);
                      }
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1.5px solid var(--color-border)',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: 'var(--color-text)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      maxWidth: 240,
                      cursor: 'pointer'
                    }}
                  >
                    {allAvailableBooks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.isExam ? '📌' : '📖'} {b.title || 'İsimsiz'} {b.subject ? `(${b.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Leitner Tekrar Modu & Gün Aralıkları */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Tekrar Planı:</span>
                </span>
                <select
                  value={scheduleMode}
                  onChange={(e) => setScheduleMode(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 8,
                    border: '1.5px solid var(--color-border)',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: 'var(--color-text)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <option value="spaced_leitner">🧠 Standart Leitner (1, 3, 7, 15 Gün)</option>
                  <option value="fast">⚡ Hızlı Pekiştirme (1, 2, 4, 7 Gün)</option>
                  <option value="today">📅 Sadece Bugün (1 Gün)</option>
                  <option value="custom">⚙️ Özel Gün Aralıkları...</option>
                  <option value="none">🚫 Programa Ekleme (Sadece Havuz)</option>
                </select>

                {/* Özel Gün Aralıkları Butonları */}
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
                            color: isSelected ? 'white' : 'var(--color-text-muted)',
                            transition: 'all 0.15s'
                          }}
                        >
                          {dayNum}g
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* %100 Ustalık Checkbox */}
            {scheduleMode !== 'none' && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.72rem',
                fontWeight: 900,
                color: '#059669',
                cursor: 'pointer',
                userSelect: 'none',
                background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid rgba(16,185,129,0.3)'
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
        )}

        {/* ── MOBİL SEKMELER (YANLIŞLAR | PDF & KIRPICI | KIRPILANLAR) ── */}
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDark ? '#1e293b' : '#f1f5f9',
            borderBottom: '1.5px solid var(--color-border)',
            padding: '4px 6px',
            gap: 5,
            flexShrink: 0,
            zIndex: 30
          }}>
            {mode === 'mistakes' && (
              <button
                type="button"
                onClick={() => setMobileActiveTab('guide')}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: 8,
                  border: mobileActiveTab === 'guide' ? '2px solid #ef4444' : '1px solid transparent',
                  background: mobileActiveTab === 'guide' ? (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2') : 'transparent',
                  color: mobileActiveTab === 'guide' ? '#dc2626' : 'var(--color-text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4
                }}
              >
                <AlertCircle size={13} />
                <span>Yanlışlar ({allFlattenedMistakeQuestions.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileActiveTab('pdf')}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 8,
                border: mobileActiveTab === 'pdf' ? '2px solid #6366f1' : '1px solid transparent',
                background: mobileActiveTab === 'pdf' ? (isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : 'transparent',
                color: mobileActiveTab === 'pdf' ? '#4f46e5' : 'var(--color-text-muted)',
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <FileText size={13} />
              <span>PDF & Kırpma</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileActiveTab('sliced')}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 8,
                border: mobileActiveTab === 'sliced' ? '2px solid #10b981' : '1px solid transparent',
                background: mobileActiveTab === 'sliced' ? (isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5') : 'transparent',
                color: mobileActiveTab === 'sliced' ? '#059669' : 'var(--color-text-muted)',
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Scissors size={13} />
              <span>Test ({slicedQuestions.length})</span>
            </button>
          </div>
        )}

        <div style={{ flex: '1 1 0%', minHeight: 0, height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {/* SOL PANEL: YANLIŞLAR KILAVUZU (DERS › ÜNİTE SEKME & TEST KARTLARI) */}
          {showMistakesGuide && (!isMobile || mobileActiveTab === 'guide') && (
            <div
              style={{
                width: isMobile ? '100%' : 340,
                minWidth: isMobile ? '100%' : 340,
                maxWidth: isMobile ? '100%' : 340,
                flex: isMobile ? '1 1 100%' : '0 0 340px',
                height: '100%',
                maxHeight: '100%',
                minHeight: 0,
                borderRight: isMobile ? 'none' : '1.5px solid var(--color-border)',
                background: isDark ? '#0c111d' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              {/* 1. Başlık & Toplam İstatistik */}
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
                  <AlertCircle size={14} className="text-red-500" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#dc2626' }}>
                    Yanlışlar Kılavuzu
                  </span>
                </div>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 6 }}>
                  {bookMistakesList.length} Test • {allFlattenedMistakeQuestions.length} Yanlış Soru
                </span>
              </div>

              {/* 2. Ders Seçimi Sekmeleri (Türkçe / Matematik / Fen / Sosyal vb.) */}
              {groupedMistakesTree.length > 0 && (
                <div
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    gap: 4,
                    overflowX: 'auto',
                    flexShrink: 0
                  }}
                >
                  {groupedMistakesTree.map(s => {
                    const isAct = (activeGuideSubject || groupedMistakesTree[0]?.subjectName) === s.subjectName;
                    const sStyle = getSubjectBadgeStyle(s.subjectName, isDark);
                    return (
                      <button
                        key={s.subjectName}
                        type="button"
                        onClick={() => {
                          setActiveGuideSubject(s.subjectName);
                          setActiveGuideUnit('all');
                          setSearchQueryGuide('');
                          const firstUnitTest = s.units?.[0]?.tests?.[0];
                          if (firstUnitTest && firstUnitTest.wrongQuestions?.length > 0) {
                            const qNo = firstUnitTest.wrongQuestions[0];
                            setActiveTargetQuestion({
                              testId: firstUnitTest.testId,
                              testName: firstUnitTest.testName,
                              unitName: firstUnitTest.unitName,
                              subjectName: firstUnitTest.subjectName,
                              qNo: qNo,
                              correctAnswer: firstUnitTest.answerKeyMap[qNo] || 'A'
                            });
                          }
                        }}
                        style={{
                          flex: '1 0 auto',
                          padding: '4px 8px',
                          borderRadius: 7,
                          border: isAct ? `1.5px solid ${sStyle.color}` : '1px solid var(--color-border)',
                          background: isAct ? sStyle.bg : 'transparent',
                          color: isAct ? sStyle.color : 'var(--color-text-muted)',
                          fontSize: '0.72rem',
                          fontWeight: isAct ? 900 : 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span>{sStyle.icon}</span>
                        <span>{s.subjectName}</span>
                        <span style={{ opacity: 0.8, fontSize: '0.62rem' }}>({s.totalTests})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. Ünite Seçimi Sekmeleri */}
              {availableUnitsForSubject.length > 0 && (
                <div
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9',
                    display: 'flex',
                    gap: 4,
                    overflowX: 'auto',
                    flexShrink: 0
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGuideUnit('all');
                      setSearchQueryGuide('');
                      const firstUnitTest = currentSubjectGroup?.units?.[0]?.tests?.[0];
                      if (firstUnitTest && firstUnitTest.wrongQuestions?.length > 0) {
                        const qNo = firstUnitTest.wrongQuestions[0];
                        setActiveTargetQuestion({
                          testId: firstUnitTest.testId,
                          testName: firstUnitTest.testName,
                          unitName: firstUnitTest.unitName,
                          subjectName: firstUnitTest.subjectName,
                          qNo: qNo,
                          correctAnswer: firstUnitTest.answerKeyMap[qNo] || 'A'
                        });
                      }
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: activeGuideUnit === 'all' ? '1.5px solid #6366f1' : '1px solid transparent',
                      background: activeGuideUnit === 'all' ? '#4f46e5' : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                      color: activeGuideUnit === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                      fontSize: '0.68rem',
                      fontWeight: activeGuideUnit === 'all' ? 900 : 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Tüm Üniteler ({availableUnitsForSubject.reduce((acc, u) => acc + u.tests.length, 0)})
                  </button>
                  {availableUnitsForSubject.map(u => {
                    const isAct = String(activeGuideUnit).trim() === String(u.unitName).trim();
                    return (
                      <button
                        key={u.unitName}
                        type="button"
                        onClick={() => {
                          setActiveGuideUnit(u.unitName);
                          setSearchQueryGuide('');
                          const firstTest = u.tests?.[0];
                          if (firstTest && firstTest.wrongQuestions?.length > 0) {
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
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: isAct ? '1.5px solid #6366f1' : '1px solid transparent',
                          background: isAct ? '#4f46e5' : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                          color: isAct ? '#ffffff' : 'var(--color-text-muted)',
                          fontSize: '0.68rem',
                          fontWeight: isAct ? 900 : 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {u.unitName} ({u.tests.length}T • {u.totalWrong}Y)
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 4. Hızlı Test Arama */}
              <div style={{ padding: '0.35rem 0.55rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
                <input
                  type="text"
                  value={searchQueryGuide}
                  onChange={(e) => setSearchQueryGuide(e.target.value)}
                  placeholder="🔍 Test veya soru no ara... (örn: Test-4, Yeni Nesil)"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                    color: 'var(--color-text)',
                    fontSize: '0.72rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* 5. Aktif Soru & Önceki / Sonraki Hızlı Butonlar */}
              {activeTargetQuestion && (
                <div style={{ padding: '0.45rem 0.65rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, gap: 6 }}>
                  <button
                    type="button"
                    onClick={handlePrevMistakeQuestion}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 900 }}
                    title="Önceki Yanlış Soru"
                  >
                    ◀ Önceki
                  </button>
                  <div style={{ textAlign: 'center', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    🎯 <strong>{activeTargetQuestion.subjectName} › {activeTargetQuestion.testName} › S.{activeTargetQuestion.qNo}</strong> ({activeTargetQuestion.correctAnswer})
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMistakeQuestion}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 900 }}
                    title="Sonraki Yanlış Soru"
                  >
                    Sonraki ▶
                  </button>
                </div>
              )}

              {/* 6. Testler & Sorular Listesi */}
              <div
                className="slicer-mistakes-scroll"
                style={{
                  flex: '1 1 0px',
                  minHeight: 0,
                  overflowY: 'scroll',
                  overflowX: 'hidden',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                {displayedGuideTests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                    Bu seçimde gösterilecek yanlış soru bulunamadı.
                  </div>
                ) : (
                  displayedGuideTests.map(t => (
                    <div
                      key={t.testId}
                      style={{
                        padding: '0.55rem 0.65rem',
                        borderRadius: 8,
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-text)' }}>
                          📌 {t.testName} {activeGuideUnit === 'all' ? `(${t.unitName})` : ''}
                        </span>
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#dc2626', background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>
                          {(t.wrongQuestions || []).length} Yanlış
                        </span>
                      </div>

                      {/* Soru Butonları */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(t.wrongQuestions || []).map(qNo => {
                          const isDone = slicedQuestions.some(sq => sq.sourceTestId === t.testId && sq.originalQuestionNo === qNo);
                          const isActive = activeTargetQuestion?.testId === t.testId && activeTargetQuestion?.qNo === qNo;
                          const cAns = t.answerKeyMap ? (t.answerKeyMap[qNo] || '') : '';

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
                                if (isMobile) setMobileActiveTab('pdf');
                              }}
                              style={{
                                padding: '3px 7px',
                                borderRadius: 6,
                                border: isActive ? '2px solid #4f46e5' : (isDone ? '1px solid #86efac' : '1px solid #fca5a5'),
                                background: isActive ? '#4f46e5' : (isDone ? (isDark ? 'rgba(34,197,94,0.15)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.12)' : '#fff1f2')),
                                color: isActive ? '#ffffff' : (isDone ? '#16a34a' : '#dc2626'),
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                transition: 'all 0.15s'
                              }}
                              title={isDone ? `Soru ${qNo} kırpıldı` : `Soru ${qNo} (Doğru: ${cAns || '?'})`}
                            >
                              {isDone ? <Check size={10} /> : null}
                              <span>S.{qNo}</span>
                              {cAns && <span style={{ opacity: 0.85, fontSize: '0.64rem' }}>({cAns})</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ORTA BÖLÜM: PDF / GÖRSEL GÖRÜNTÜLEYİCİ VE KIRPICI ÇALIŞMA ALANI */}
          {(!isMobile || mobileActiveTab === 'pdf') && (
            <div
              style={{
                flex: '1 1 0%',
                minWidth: 0,
                minHeight: 0,
                height: '100%',
                maxHeight: '100%',
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
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* Yanlışlar Panelini Aç/Kapat Butonu */}
                {mode === 'mistakes' && (
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
                    <span>{showMistakesGuide ? '◀ Kılavuzu Gizle' : '▶ Yanlışlar Kılavuzu'}</span>
                  </button>
                )}

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
                    onTouchStart={(e) => { e.preventDefault(); handleMouseDown(e); }}
                    onTouchMove={(e) => { e.preventDefault(); handleMouseMove(e); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
                    onTouchCancel={() => { setIsDrawing(false); setCurrentRect(null); }}
                    style={{
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                      borderRadius: 6,
                      maxWidth: 'none',
                      display: 'block',
                      userSelect: 'none',
                      touchAction: 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

          {/* SAĞ PANEL: KIRPILAN SORULAR & TEST OLUŞTURUCU */}
          {showRightPanel && (!isMobile || mobileActiveTab === 'sliced') && (
            <div
              style={{
                width: isMobile ? '100%' : 320,
                minWidth: isMobile ? '100%' : 320,
                maxWidth: isMobile ? '100%' : 320,
                flex: isMobile ? '1 1 100%' : '0 0 320px',
                height: '100%',
                maxHeight: '100%',
                minHeight: 0,
                borderLeft: isMobile ? 'none' : '1.5px solid var(--color-border)',
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

            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
  );
}
