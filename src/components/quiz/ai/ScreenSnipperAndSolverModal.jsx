import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Camera, Crop, X, Check, RefreshCw, AlertCircle,
  BookOpen, Lightbulb, Key, HelpCircle, CheckCircle2, ChevronDown,
  ChevronUp, Copy, Eye, Upload, FileText, ArrowRight,
  Languages, Volume2, Bookmark, Globe
} from 'lucide-react';
import { solveQuestionWithAi, getResolvedAiApiKey, cleanAiMathText, extractTargetQuestionFromHtml, getHtmlFromActiveIframe, isGenericPlaceholderSolution } from '../../../services/aiSolutionService';
import { dbSaveUserAiApiKey, dbSaveSystemAiApiKey, toUUID } from '../../../services/supabaseService';
import { idbGetPayload } from '../../../services/indexedDbService';
import { recordAiUsageLog } from '../../../services/aiUsageLogService';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

/**
 * ScreenSnipperAndSolverModal
 * Universal Screen Crop + Camera Photo + Multi-format AI Question Solution Modal.
 * Zero database storage, 100% in-memory processing.
 */
export default function ScreenSnipperAndSolverModal({
  isOpen = false,
  onClose,
  questionNo = 1,
  question = {},
  htmlPayload = '',
  mistakeReason = '',
  onMistakeReasonChange,
  studentAnswer = '',
  correctAnswer = '',
  subject = 'Genel',
  grade = '',
  topic = '',
  testId = '',
  pdfCanvasRef = null, // Optional ref to PDF canvas for direct precision crop
  existingImageUrl = '', // Optional existing image from image-based quiz
  isPdf = false
}) {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();

  const isRealQuestionText = (txt) => {
    if (!txt || typeof txt !== 'string') return false;
    const clean = txt.trim();
    if (clean.length < 5) return false;
    if (/^(soru\s*\d+|\d+\.\s*soru|bölüm\s*\d+|\d+\.\s*bölüm|test\s*\d+|genel\s*test)/i.test(clean)) return false;
    return true;
  };

  const isPdfMode = Boolean(
    isPdf ||
    String(testId || '').toLowerCase().includes('pdf') ||
    question?.formatType === 'pdf' ||
    question?.contentType === 'pdf' ||
    question?.sourceFormat === 'pdf' ||
    Boolean(typeof document !== 'undefined' && (document.querySelector('.pdf-viewer-container') || document.querySelector('canvas.react-pdf__Page__canvas')))
  );

  const [activeTab, setActiveTab] = useState(() => {
    if (existingImageUrl) return 'image';
    if (isPdfMode) return 'crop';
    if (isRealQuestionText(question?.questionText) || htmlPayload) return 'auto';
    return 'crop';
  });
  const [croppedImage, setCroppedImage] = useState(existingImageUrl || null);
  const [snapshotCanvas, setSnapshotCanvas] = useState(null);
  const [isSnipping, setIsSnipping] = useState(false);
  const [snipRect, setSnipRect] = useState(null); // { startX, startY, currentX, currentY }
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSimilarQuestion, setShowSimilarQuestion] = useState(false);
  const [selectedSimilarAnswer, setSelectedSimilarAnswer] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const solvingRef = useRef(false);
  const autoSolvedRef = useRef(null);

  const speakEnglish = (text) => {
    try {
      if ('speechSynthesis' in window && text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {}
  };

  const cacheKey = `${testId || 'test'}_q${questionNo}_${currentUser?.id || 'u'}`;

  // Check cache or auto-solve on open
  useEffect(() => {
    if (!isOpen) {
      autoSolvedRef.current = null;
      return;
    }

    setError(null);
    getResolvedAiApiKey(currentUser?.id).catch(() => {});

    let cachedSolution = null;
    try {
      const cached = localStorage.getItem(`ai_sol_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const isEnglishSubj = /ingilizce|english|yks[\s-_]*dil/i.test(subject || '');
        const isStale = (parsed?.isEnglishQuestion && !isEnglishSubj) || isGenericPlaceholderSolution(parsed);
        if (isStale) {
          localStorage.removeItem(`ai_sol_${cacheKey}`);
        } else {
          cachedSolution = parsed;
          setSolution(cachedSolution);
        }
      } else {
        setSolution(null);
      }
    } catch {
      setSolution(null);
    }

    if (existingImageUrl) {
      setCroppedImage(existingImageUrl);
      setActiveTab('image');
    }

    async function tryAutoSolve() {
      // In PDF mode, questions are inside the PDF document. Auto-solve must NOT trigger with null/empty question!
      if (isPdfMode) return;

      let effectiveHtml = htmlPayload || question?.htmlPayload || getHtmlFromActiveIframe();
      if (!effectiveHtml || effectiveHtml === '[STORED_IN_INDEXEDDB]' || effectiveHtml === '[LOCALSTORAGE_CACHE]') {
        const candidateKeys = [
          testId,
          String(testId).replace(/^q_?|^hw_?|^test_?|^bt_?|^sub_?/, ''),
          `q_${String(testId).replace(/^q_?|^hw_?|^test_?|^bt_?|^sub_?/, '')}`,
          `hw_${String(testId).replace(/^q_?|^hw_?|^test_?|^bt_?|^sub_?/, '')}`,
          toUUID(testId),
          question?.id,
          toUUID(question?.id)
        ].filter(Boolean);
        for (const k of candidateKeys) {
          try {
            const val = await idbGetPayload(String(k));
            if (val && typeof val === 'string' && val.trim().length > 5 && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
              effectiveHtml = val;
              break;
            }
          } catch (e) {}
        }
      }

      const htmlQuestionText = extractTargetQuestionFromHtml(effectiveHtml, questionNo) || extractTargetQuestionFromHtml(getHtmlFromActiveIframe(), questionNo);
      const rawQText = question?.questionText;
      const effectiveText = isRealQuestionText(rawQText) ? rawQText : (isRealQuestionText(htmlQuestionText) ? htmlQuestionText : null);

      const hasValidContent = Boolean(existingImageUrl || (effectiveHtml && effectiveHtml.length > 50 && htmlQuestionText) || effectiveText);

      if (!cachedSolution && hasValidContent) {
        if (autoSolvedRef.current !== cacheKey) {
          autoSolvedRef.current = cacheKey;
          handleSolve(null, effectiveHtml, false);
        }
      }
    }
    tryAutoSolve();
  }, [isOpen, cacheKey, existingImageUrl, htmlPayload, question]);

  // Global clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target.result;
              setCroppedImage(base64);
              setActiveTab('image');
              handleSolve(base64, null, true);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleClipboardPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target.result;
                setCroppedImage(base64);
                setActiveTab('image');
                handleSolve(base64, null, true);
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
    setError('Panoda görsel bulunamadı. Lütfen Win+Shift+S ile soruyu kopyaladıktan sonra buraya Ctrl+V tuşlarına basarak yapıştırınız.');
  };

  // Browser Screen Capture API (1-Click screen grab)
  const handleCaptureScreen = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setError('Tarayıcınız doğrudan ekran yakalamayı desteklemiyor. Windows için Win+Shift+S ile soruyu kopyalayıp buraya Ctrl+V ile yapıştırabilirsiniz.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach(track => track.stop());
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCroppedImage(dataUrl);
      setActiveTab('image');
      try {
        localStorage.removeItem(`ai_sol_${cacheKey}`);
      } catch {}
      setSolution(null);
      handleSolve(dataUrl, null, true);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen capture error:', err);
        setError('Ekran yakalama başlatılamadı. Alternatif olarak Win+Shift+S ile kopyalayıp Ctrl+V tuşlarına basarak yapıştırabilirsiniz.');
      }
    }
  };

  // Force Re-solve Handler
  const handleReSolve = () => {
    try {
      localStorage.removeItem(`ai_sol_${cacheKey}`);
    } catch {}
    setSolution(null);
    setError(null);
    autoSolvedRef.current = null;
    handleSolve(croppedImage, null, true);
  };

  // Handle Solving with AI
  const handleSolve = async (overrideImage = null, overrideHtml = null, forceRefresh = false) => {
    if (solvingRef.current) return;
    const imgToSend = overrideImage || croppedImage || existingImageUrl;
    let htmlDoc = overrideHtml || htmlPayload || question?.htmlPayload || getHtmlFromActiveIframe() || '';
    if (!htmlDoc || htmlDoc === '[STORED_IN_INDEXEDDB]' || htmlDoc === '[LOCALSTORAGE_CACHE]') {
      const candidateKeys = [
        testId,
        String(testId).replace(/^q_?|^hw_?|^test_?|^bt_?|^sub_?/, ''),
        `q_${String(testId).replace(/^q_?|^hw_?|^test_?|^bt_?|^sub_?/, '')}`,
        `hw_${String(testId).replace(/^q_?|^hw_?|^test_?|^bt_?|^sub_?/, '')}`,
        toUUID(testId),
        question?.id,
        toUUID(question?.id)
      ].filter(Boolean);
      for (const k of candidateKeys) {
        try {
          const val = await idbGetPayload(String(k));
          if (val && typeof val === 'string' && val.trim().length > 5 && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
            htmlDoc = val;
            break;
          }
        } catch (e) {}
      }
    }
    const parsedHtmlText = extractTargetQuestionFromHtml(htmlDoc, questionNo) || extractTargetQuestionFromHtml(getHtmlFromActiveIframe(), questionNo);
    const qText = (isRealQuestionText(question?.questionText) ? question.questionText : '')
      || (parsedHtmlText || '');

    if (!imgToSend && !qText && (!htmlDoc || !parsedHtmlText)) {
      setError('Lütfen çözülmesi istenen sorunun ekran görüntüsünü kırpın, fotoğrafını yükleyin veya Ctrl+V ile yapıştırın.');
      return;
    }

    solvingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await solveQuestionWithAi({
        userId: currentUser?.id,
        imageBase64: imgToSend,
        questionText: qText,
        htmlPayload: htmlDoc,
        options: question?.options || [],
        studentAnswer: studentAnswer || question?.userAnswer || '',
        correctAnswer: correctAnswer || question?.correctAnswerLetter || question?.correctAnswer || '',
        mistakeReason: mistakeReason || '',
        subject: subject || question?.subject || '',
        grade: grade || question?.grade || '',
        topic: topic || question?.topic || '',
        questionNo,
        cacheKey,
        forceRefresh
      });

      setSolution(res);

      // Record AI usage log for teacher transparency
      recordAiUsageLog({
        studentId: currentUser?.id || 'anonymous',
        studentName: currentUser?.name || currentUser?.username || 'Öğrenci',
        testId: testId || 'test',
        questionNo,
        subject: subject || question?.subject || 'Genel',
        topic: topic || question?.topic || '',
        mistakeReason: mistakeReason || '',
        actionType: overrideImage || croppedImage ? 'crop' : 'solve'
      });
    } catch (err) {
      if (err.message === 'API_KEY_REQUIRED') {
        if (currentUser?.role === 'admin' || currentUser?.role === 'teacher') {
          setApiKeyModalOpen(true);
        } else {
          setError('Yapay zeka çözümü için sistem anahtarı hazırlanıyor. Lütfen tekrar "Çöz" butonuna basınız.');
        }
      } else {
        setError(err.message || 'Çözüm oluşturulurken bir hata oluştu.');
      }
    } finally {
      solvingRef.current = false;
      setLoading(false);
    }
  };

  // Image File Upload / Camera Capture Handler (Compressed in RAM)
  const handleImageFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 1024px in memory
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCroppedImage(dataUrl);
        setActiveTab('image');
        handleSolve(dataUrl, null, true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ESC Key listener to cancel snipping
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSnipping) {
          setIsSnipping(false);
          setSnipRect(null);
          setSnapshotCanvas(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSnipping, isOpen, onClose]);

  // ── Screen Snipping Tool Overlay Logic ──
  const startSnippingMode = async () => {
    setError(null);
    setSnipRect(null);

    const hasCanvas = Boolean(document.querySelector('canvas:not(#snip-snapshot-canvas)'));
    const hasIframe = Boolean(document.querySelector('iframe'));

    // If viewing an iframe (e.g. Google Drive PDF) where direct DOM pixel reading is blocked by CORS:
    if (hasIframe && !hasCanvas && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: false
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const snap = document.createElement('canvas');
        snap.id = 'snip-snapshot-canvas';
        snap.width = video.videoWidth;
        snap.height = video.videoHeight;
        const ctx = snap.getContext('2d');
        ctx.drawImage(video, 0, 0, snap.width, snap.height);
        stream.getTracks().forEach(t => t.stop());
        setSnapshotCanvas(snap);
        setIsSnipping(true);
        return;
      } catch (err) {
        if (err.name !== 'NotAllowedError') {
          console.warn('Screen capture failed:', err);
        }
        setIsSnipping(false);
        setError('Ekran görüntüsü yakalama izni verilmedi veya iptal edildi. Soruyu çözdürmek için klavyeden Windows Ekran Alıntısı (Win + Shift + S) ile soruyu seçip buraya Ctrl + V ile yapıştırabilir veya "Panodan Yapıştır" butonuna tıklayabilirsiniz.');
        return;
      }
    }

    setIsSnipping(true);
  };

  const handleSnipMouseDown = (e) => {
    setIsDragging(true);
    setSnipRect({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    });
  };

  const handleSnipMouseMove = (e) => {
    if (!isDragging) return;
    setSnipRect(prev => prev ? ({ ...prev, currentX: e.clientX, currentY: e.clientY }) : null);
  };

  const handleSnipMouseUp = async () => {
    if (!isDragging || !snipRect) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);

    const x1 = Math.min(snipRect.startX, snipRect.currentX);
    const y1 = Math.min(snipRect.startY, snipRect.currentY);
    const width = Math.abs(snipRect.currentX - snipRect.startX);
    const height = Math.abs(snipRect.currentY - snipRect.startY);

    if (width < 20 || height < 20) {
      setIsSnipping(false);
      setSnipRect(null);
      setSnapshotCanvas(null);
      return;
    }

    try {
      const cropCanvas = document.createElement('canvas');

      // 1. If we captured a snapshot of an iframe
      const snap = snapshotCanvas || document.getElementById('snip-snapshot-canvas');
      if (snap) {
        const scaleX = snap.width / window.innerWidth;
        const scaleY = snap.height / window.innerHeight;
        const srcX = Math.max(0, x1 * scaleX);
        const srcY = Math.max(0, y1 * scaleY);
        const srcW = Math.min(snap.width - srcX, width * scaleX);
        const srcH = Math.min(snap.height - srcY, height * scaleY);

        cropCanvas.width = srcW;
        cropCanvas.height = srcH;
        const ctx = cropCanvas.getContext('2d');
        ctx.drawImage(snap, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

        const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
        setCroppedImage(croppedDataUrl);
        setSnapshotCanvas(null);
        setIsSnipping(false);
        setSnipRect(null);
        setActiveTab('image');
        handleSolve(croppedDataUrl);
        return;
      }

      // 2. Search for any canvas elements in the viewport (e.g. PDF canvas)
      const allCanvases = Array.from(document.querySelectorAll('canvas:not(#snip-snapshot-canvas)')).filter(c => {
        const r = c.getBoundingClientRect();
        return r.width > 20 && r.height > 20 &&
               !(x1 > r.right || x1 + width < r.left || y1 > r.bottom || y1 + height < r.top);
      });

      if (pdfCanvasRef?.current || allCanvases.length > 0) {
        const targetCanvas = pdfCanvasRef?.current || allCanvases[0];
        const rect = targetCanvas.getBoundingClientRect();
        const scaleX = targetCanvas.width / rect.width;
        const scaleY = targetCanvas.height / rect.height;

        const srcX = Math.max(0, (x1 - rect.left) * scaleX);
        const srcY = Math.max(0, (y1 - rect.top) * scaleY);
        const srcW = Math.min(targetCanvas.width - srcX, width * scaleX);
        const srcH = Math.min(targetCanvas.height - srcY, height * scaleY);

        cropCanvas.width = srcW;
        cropCanvas.height = srcH;
        const ctx = cropCanvas.getContext('2d');
        ctx.drawImage(targetCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      } else {
        const allImages = Array.from(document.querySelectorAll('img')).filter(img => {
          const r = img.getBoundingClientRect();
          return r.width > 20 && r.height > 20 &&
                 !(x1 > r.right || x1 + width < r.left || y1 > r.bottom || y1 + height < r.top);
        });

        if (allImages.length > 0) {
          const img = allImages[0];
          const rect = img.getBoundingClientRect();
          const scaleX = (img.naturalWidth || img.width) / rect.width;
          const scaleY = (img.naturalHeight || img.height) / rect.height;

          const srcX = Math.max(0, (x1 - rect.left) * scaleX);
          const srcY = Math.max(0, (y1 - rect.top) * scaleY);
          const srcW = Math.min((img.naturalWidth || img.width) - srcX, width * scaleX);
          const srcH = Math.min((img.naturalHeight || img.height) - srcY, height * scaleY);

          cropCanvas.width = srcW;
          cropCanvas.height = srcH;
          const ctx = cropCanvas.getContext('2d');
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { displaySurface: 'browser' },
              audio: false
            });
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = video.videoWidth;
            fullCanvas.height = video.videoHeight;
            const fullCtx = fullCanvas.getContext('2d');
            fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
            stream.getTracks().forEach(track => track.stop());

            const scaleX = video.videoWidth / window.innerWidth;
            const scaleY = video.videoHeight / window.innerHeight;

            const srcX = Math.max(0, x1 * scaleX);
            const srcY = Math.max(0, y1 * scaleY);
            const srcW = Math.min(video.videoWidth - srcX, width * scaleX);
            const srcH = Math.min(video.videoHeight - srcY, height * scaleY);

            cropCanvas.width = srcW;
            cropCanvas.height = srcH;
            const ctx = cropCanvas.getContext('2d');
            ctx.drawImage(fullCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
          } catch (e) {
            setIsSnipping(false);
            setSnipRect(null);
            setError('Bu PDF Google Drive üzerinden açıldığı için tarayıcı güvenlik kuralı nedeniyle doğrudan kopyalanamadı. Lütfen klavyeden Windows Ekran Alıntısı (Win + Shift + S) ile soruyu seçip buraya Ctrl + V ile yapıştırın veya "Panodan Yapıştır" butonuna tıklayın.');
            return;
          }
        } else {
          setIsSnipping(false);
          setSnipRect(null);
          setError('Görsel yakalanamadı. Lütfen Windows Ekran Alıntısı (Win + Shift + S) ile soruyu seçip bu pencereye Ctrl + V tuşlarıyla yapıştırın veya "Panodan Yapıştır" butonuna tıklayın.');
          return;
        }
      }

      const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
      setCroppedImage(croppedDataUrl);
      setSnapshotCanvas(null);
      setIsSnipping(false);
      setSnipRect(null);
      setActiveTab('image');
      handleSolve(croppedDataUrl);
    } catch (err) {
      console.warn('Crop error:', err);
      setIsSnipping(false);
      setSnipRect(null);
      setSnapshotCanvas(null);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    const cleanKey = apiKeyInput.trim();
    localStorage.setItem('system_ai_api_key', cleanKey);
    localStorage.setItem('gemini_api_key', cleanKey);
    localStorage.setItem('eTestGeminiApiKey', cleanKey);
    try {
      await dbSaveSystemAiApiKey(cleanKey);
    } catch {}
    if (currentUser?.id) {
      try {
        await dbSaveUserAiApiKey(currentUser.id, cleanKey);
      } catch {}
    }
    setApiKeyModalOpen(false);
    handleSolve();
  };

  const copySolutionText = () => {
    if (!solution) return;
    const text = [
      `📌 Soru ${questionNo} - Doğru Cevap: ${cleanAiMathText(solution.correctAnswer) || ''}`,
      `Özet: ${cleanAiMathText(solution.summary) || ''}`,
      '',
      '📝 Adım Adım Çözüm:',
      ...((solution.steps || []).map((s, idx) => `${idx + 1}. ${cleanAiMathText(s)}`)),
      '',
      solution.goldenRule ? `💡 Altın Kural: ${cleanAiMathText(solution.goldenRule)}` : '',
      solution.mistakeAdvice ? `🎯 Hata Koçluğu: ${cleanAiMathText(solution.mistakeAdvice)}` : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── ✂️ FULL-SCREEN SNIPPING OVERLAY ── */}
      {isSnipping && (
        <div
          onMouseDown={handleSnipMouseDown}
          onMouseMove={handleSnipMouseMove}
          onMouseUp={handleSnipMouseUp}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            cursor: 'crosshair',
            background: snapshotCanvas ? '#0f172a' : 'rgba(0, 0, 0, 0.45)',
            userSelect: 'none'
          }}
        >
          {snapshotCanvas && (
            <img
              src={snapshotCanvas.toDataURL('image/jpeg', 0.92)}
              alt="Snapshot"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Header Banner */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: 'white',
            padding: '0.6rem 1.25rem',
            borderRadius: '99px',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            zIndex: 2
          }}>
            <Crop size={16} color="#a855f7" />
            <span>Fare veya parmağınızla {questionNo}. sorunun etrafını çerçeve içine alıp bırakın</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsSnipping(false); setSnapshotCanvas(null); }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.4rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              İptal (ESC)
            </button>
          </div>

          {/* Selection Box */}
          {snipRect && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(snipRect.startX, snipRect.currentX),
                top: Math.min(snipRect.startY, snipRect.currentY),
                width: Math.abs(snipRect.currentX - snipRect.startX),
                height: Math.abs(snipRect.currentY - snipRect.startY),
                border: '2.5px dashed #a855f7',
                background: 'rgba(168, 85, 247, 0.15)',
                boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: -24,
                left: 0,
                background: '#a855f7',
                color: 'white',
                padding: '0.15rem 0.5rem',
                borderRadius: '0.3rem',
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                Soru {questionNo}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN AI SOLUTION MODAL (Hidden during snipping so background document is fully visible) ── */}
      {!isSnipping && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderRadius: '1.5rem',
              border: '1.5px solid var(--color-border)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
          {/* Header */}
          <div style={{
            padding: '1.2rem 1.5rem',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                  Soru {questionNo} — Yapay Zeka Çözüm Asistanı
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>
                  {subject} {topic ? `• ${topic}` : ''} {mistakeReason ? `(Hata: ${mistakeReason})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Action Toolbar / Capture Options */}
          <div style={{
            padding: '0.85rem 1.5rem',
            background: 'var(--color-surface-hover)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Screen Snipping Button */}
              <button
                onClick={startSnippingMode}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.6rem',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(168,85,247,0.3)'
                }}
              >
                <Crop size={15} />
                <span>✂️ Ekrandan Soruyu Kırp</span>
              </button>

              {/* Camera Snap (Mobile Friendly) */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.6rem',
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border-input)',
                  color: 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Camera size={15} color="#3b82f6" />
                <span>📸 Fotoğraf Çek</span>
              </button>

              {/* 📸 Browser Screen Capture API */}
              <button
                onClick={handleCaptureScreen}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.6rem',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
                  border: '1.5px solid rgba(99, 102, 241, 0.4)',
                  color: '#4f46e5',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Tarayıcı ekran görüntüsü al ve anında çöz"
              >
                <Camera size={15} color="#4f46e5" />
                <span>📸 Ekranı Yakala</span>
              </button>

              {/* Clipboard Paste (Ctrl+V) */}
              <button
                onClick={handleClipboardPaste}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.6rem',
                  background: 'var(--color-surface)',
                  border: '1.5px solid #a855f7',
                  color: '#a855f7',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Panodaki görseli yapıştır (Ctrl+V)"
              >
                <Copy size={14} />
                <span>📋 Panodan Yapıştır (Ctrl+V)</span>
              </button>

              {/* File Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.6rem',
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border-input)',
                  color: 'var(--color-text-muted)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Upload size={14} />
                <span>Görsel Yükle</span>
              </button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleImageFile}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageFile}
              />
            </div>

            {/* Direct Re-solve / Refresh */}
            <button
              onClick={handleReSolve}
              disabled={loading}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.6rem',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Yeniden Çözülüyor...' : 'Yeniden Çöz'}</span>
            </button>
          </div>

          {/* Content Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Target Question Preview Badge */}
            {(isRealQuestionText(question?.questionText) || extractTargetQuestionFromHtml(htmlPayload, questionNo) || extractTargetQuestionFromHtml(getHtmlFromActiveIframe(), questionNo)) && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1.5px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ fontWeight: 800, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={15} />
                  <span>🎯 Algılanan Hedef Soru ({questionNo}. Soru):</span>
                </div>
                <div style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: 1.45, maxHeight: '90px', overflowY: 'auto', fontWeight: 600 }}>
                  {question?.questionText || extractTargetQuestionFromHtml(htmlPayload, questionNo) || extractTargetQuestionFromHtml(getHtmlFromActiveIframe(), questionNo)}
                </div>
              </div>
            )}

            {/* Cropped Preview (if any) */}
            {croppedImage && (
              <div style={{
                background: 'var(--color-surface-hover)',
                borderRadius: '0.85rem',
                border: '1px solid var(--color-border)',
                padding: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <img
                  src={croppedImage}
                  alt="Kırpılan Soru"
                  style={{
                    maxHeight: 90,
                    maxWidth: 160,
                    borderRadius: '0.5rem',
                    objectFit: 'contain',
                    border: '1px solid var(--color-border)'
                  }}
                />
                <div style={{ flex: 1, fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 800, color: '#a855f7' }}>✓ Soru Görseli Alındı</div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Görsel bellekte işlendi, Gemini Vision analiz ediyor. (0 Byte DB Kotası)
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCroppedImage(null);
                    handleReSolve();
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  title="Görseli Kaldır ve Metinden Çöz"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Error View */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.85rem',
                padding: '1rem',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>{error}</div>
                <button
                  onClick={() => handleSolve()}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={{
                padding: '3rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                color: 'var(--color-text-muted)'
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '3.5px solid #a855f7',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  Yapay Zeka Soruyu ve Hata Sebebini Analiz Ediyor...
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  MEB kazanımlarına uygun adım adım çözüm hazırlanıyor.
                </div>
              </div>
            )}

            {/* Solution Display */}
            {!loading && solution && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Header Badge: Correct Answer & Summary */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))',
                  border: '1.5px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '1rem',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '0.5rem',
                        fontWeight: 900,
                        fontSize: '0.85rem'
                      }}>
                        Doğru Cevap: {solution.correctAnswer || correctAnswer || 'Belirlendi'}
                      </span>
                    </div>
                    {solution.summary && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {cleanAiMathText(solution.summary)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={copySolutionText}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      padding: '0.4rem 0.65rem',
                      color: 'var(--color-text)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>

                {/* 🇬🇧 İNGİLİZCE DİL ÖĞRETİM MOTORU: CÜMLE ÇEVİRİLERİ, KELİME DAĞARCIĞI VE ŞIK ANALİZİ */}
                {Boolean(solution.isEnglishQuestion === true && ((Array.isArray(solution.vocabulary) && solution.vocabulary.length > 0) || (Array.isArray(solution.sentenceTranslations) && solution.sentenceTranslations.length > 0))) && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.06))',
                    border: '1.5px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '1rem',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {/* English Section Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '1.25rem' }}>🇬🇧</span>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#4f46e5' }}>
                          İngilizce Dil Öğrenim & Çeviri Rehberi
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '1rem',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Languages size={12} />
                        <span>Dil Öğretim Modülü</span>
                      </span>
                    </div>

                    {/* 1. Soru Cümleleri ve Çevirileri (Sentence Translations) */}
                    {Array.isArray(solution.sentenceTranslations) && solution.sentenceTranslations.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={14} color="#6366f1" />
                          <span>📝 Metin ve Soru Cümleleri Çevirisi (Satır Satır):</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {solution.sentenceTranslations.map((item, idx) => (
                            <div key={idx} style={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '0.65rem',
                              padding: '0.65rem 0.85rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 3
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>
                                  {item.english}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => speakEnglish(item.english)}
                                  style={{
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    color: '#6366f1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}
                                  title="Telaffuzu Dinle"
                                >
                                  <Volume2 size={12} />
                                  <span>Dinle</span>
                                </button>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                ↳ {item.turkish}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Önemli Kelime & Deyim Dağarcığı (Vocabulary Glossary) */}
                    {Array.isArray(solution.vocabulary) && solution.vocabulary.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Bookmark size={14} color="#a855f7" />
                          <span>📚 Kilit Kelimeler & Deyimler Sözlüğü (Vocabulary):</span>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                          gap: '0.5rem'
                        }}>
                          {solution.vocabulary.map((vocab, vIdx) => (
                            <div key={vIdx} style={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '0.65rem',
                              padding: '0.65rem 0.8rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#7c3aed' }}>
                                  {vocab.word}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {vocab.type && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      background: 'rgba(124, 58, 237, 0.1)',
                                      color: '#7c3aed'
                                    }}>
                                      {vocab.type}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => speakEnglish(vocab.word)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 2,
                                      cursor: 'pointer',
                                      color: '#7c3aed'
                                    }}
                                    title="Telaffuzu Dinle"
                                  >
                                    <Volume2 size={13} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                {vocab.meaning}
                              </span>
                              {vocab.clue && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                  💡 {vocab.clue}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Şıkların Türkçe Anlamları & Çeldirici Analizi (Option Translations) */}
                    {Array.isArray(solution.optionTranslations) && solution.optionTranslations.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HelpCircle size={14} color="#059669" />
                          <span>🔍 Şıkların Türkçe Anlamları & Çeldirici Analizi:</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {solution.optionTranslations.map((opt, oIdx) => (
                            <div key={oIdx} style={{
                              background: opt.isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface)',
                              border: `1px solid ${opt.isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border)'}`,
                              borderRadius: '0.65rem',
                              padding: '0.65rem 0.85rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 3
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: opt.isCorrect ? '#10b981' : '#64748b',
                                    color: 'white',
                                    fontWeight: 900,
                                    fontSize: '0.74rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {opt.letter || String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-text)' }}>
                                    {opt.english}
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  color: opt.isCorrect ? '#15803d' : '#94a3b8'
                                }}>
                                  {opt.isCorrect ? '✓ Doğru Şık' : '✗ Elenen Şık'}
                                </span>
                              </div>
                              <div style={{ paddingLeft: '1.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: '0.79rem', color: '#0369a1', fontWeight: 600 }}>
                                  ↳ Çevirisi: {opt.turkish}
                                </span>
                                {opt.reason && (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                                    • {opt.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Gramer & Dilbilgisi Püf Noktası (Grammar Notes) */}
                    {solution.grammarNotes && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '0.65rem',
                        padding: '0.8rem 0.95rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.6rem'
                      }}>
                        <Lightbulb size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#b45309' }}>
                            💡 Gramer & Dilbilgisi Püf Noktası:
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', marginTop: 2, lineHeight: 1.5 }}>
                            {solution.grammarNotes}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hata Sebebine Özel Koçluk Tavsiyesi (Eğer varsa) */}
                {solution.mistakeAdvice && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08))',
                    border: '1.5px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '1rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem'
                  }}>
                    <Lightbulb size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#b45309' }}>
                        🎯 Hata Sebebi Koçluğu ({mistakeReason || 'Özel Analiz'})
                      </div>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                        {cleanAiMathText(solution.mistakeAdvice)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Altın Kural / Formül Özeti */}
                {solution.goldenRule && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.06))',
                    border: '1.5px solid rgba(124, 58, 237, 0.25)',
                    borderRadius: '1rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem'
                  }}>
                    <BookOpen size={20} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#7c3aed' }}>
                        💡 Altın Kural & Formül Özeti
                      </div>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                        {cleanAiMathText(solution.goldenRule)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Adım Adım Ayrıntılı Çözüm */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} color="#3b82f6" />
                    <span>Adım Adım Çözüm Adımları</span>
                  </div>

                  {Array.isArray(solution.steps) ? (
                    solution.steps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '0.75rem',
                          padding: '0.85rem 1rem',
                          fontSize: '0.86rem',
                          lineHeight: 1.55,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#3b82f6',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {sIdx + 1}
                        </div>
                        <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{cleanAiMathText(step)}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem', fontSize: '0.86rem', lineHeight: 1.55 }}>
                      {cleanAiMathText(solution.explanation || JSON.stringify(solution))}
                    </div>
                  )}
                </div>

                {/* Pekiştirme Sorusu (Benzer İkiz Soru) */}
                {solution.similarQuestion && (
                  <div style={{
                    marginTop: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    overflow: 'hidden'
                  }}>
                    <button
                      onClick={() => setShowSimilarQuestion(!showSimilarQuestion)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1.25rem',
                        background: 'var(--color-surface-hover)',
                        border: 'none',
                        color: 'var(--color-text)',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={16} color="#a855f7" />
                        <span>🎯 Bu Konuyu Pekiştirmek İçin Benzer 1 Soru Çöz</span>
                      </span>
                      {showSimilarQuestion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showSimilarQuestion && (
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--color-surface)' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>
                          {cleanAiMathText(solution.similarQuestion.questionText)}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {(solution.similarQuestion.options || []).map((opt, oIdx) => {
                            const optLetter = String.fromCharCode(65 + oIdx);
                            const isSelected = selectedSimilarAnswer === optLetter;
                            const isCorrect = solution.similarQuestion.correctAnswerLetter === optLetter;

                            let bg = 'var(--color-surface-hover)';
                            let border = '1px solid var(--color-border)';
                            if (selectedSimilarAnswer) {
                              if (isCorrect) {
                                bg = 'rgba(16, 185, 129, 0.15)';
                                border = '1.5px solid #10b981';
                              } else if (isSelected) {
                                bg = 'rgba(239, 68, 68, 0.15)';
                                border = '1.5px solid #ef4444';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => setSelectedSimilarAnswer(optLetter)}
                                style={{
                                  padding: '0.6rem 0.85rem',
                                  borderRadius: '0.6rem',
                                  background: bg,
                                  border,
                                  color: 'var(--color-text)',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '0.84rem',
                                  fontWeight: 600
                                }}
                              >
                                {cleanAiMathText(opt)}
                              </button>
                            );
                          })}
                        </div>

                        {selectedSimilarAnswer && (
                          <div style={{
                            padding: '0.75rem',
                            borderRadius: '0.6rem',
                            background: selectedSimilarAnswer === solution.similarQuestion.correctAnswerLetter ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: selectedSimilarAnswer === solution.similarQuestion.correctAnswerLetter ? '#10b981' : '#ef4444'
                          }}>
                            {selectedSimilarAnswer === solution.similarQuestion.correctAnswerLetter ? '🎉 Tebrikler, doğru cevap!' : `❌ Yanlış. Doğru cevap: ${solution.similarQuestion.correctAnswerLetter}`}
                            {solution.similarQuestion.explanation && (
                              <div style={{ marginTop: 4, color: 'var(--color-text)', fontWeight: 500 }}>
                                {cleanAiMathText(solution.similarQuestion.explanation)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty State / Initial Prompt */}
            {!loading && !solution && !error && (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(124, 58, 237, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a855f7'
                }}>
                  <Crop size={28} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem' }}>
                    {isPdfMode ? `📄 ${questionNo}. Soruyu PDF'ten Kırpın veya Yapıştırın` : 'Soru Çözümü Almaya Hazır mısınız?'}
                  </h4>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 460, lineHeight: 1.45 }}>
                    {isPdfMode
                      ? `Ekrandaki PDF veya dijital kitaptan soruyu 2 pratik yöntemle anında çözdürebilirsiniz:`
                      : `Yukarıdaki butonlarla soruyu kırpabilir veya fotoğrafını yükleyebilirsiniz.`}
                  </p>
                  {isPdfMode && (
                    <div style={{
                      margin: '0.75rem auto 0 auto',
                      padding: '0.65rem 0.9rem',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1.5px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'var(--color-text)',
                      textAlign: 'left',
                      lineHeight: 1.5,
                      maxWidth: 460
                    }}>
                      <div style={{ fontWeight: 800, color: '#3b82f6', marginBottom: 3 }}>💡 En Hızlı 2 Seçenek:</div>
                      <div><b>1. En Hızlı:</b> Klavyeden <kbd style={{ background: '#334155', color: '#f8fafc', padding: '1px 5px', borderRadius: 4 }}>Win + Shift + S</kbd> ile soruyu seçin ve aşağıdaki <b>"📋 Panodan Yapıştır"</b> butonuna tıklayın (veya <kbd style={{ background: '#334155', color: '#f8fafc', padding: '1px 5px', borderRadius: 4 }}>Ctrl + V</kbd>).</div>
                      <div style={{ marginTop: 3 }}><b>2. Ekran Kırpma:</b> Aşağıdaki <b>"✂️ Ekrandan Kırp"</b> butonuna basıp sekmeyi onaylayarak soruyu doğrudan fareyle çerçeveye alın.</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    onClick={startSnippingMode}
                    style={{
                      padding: '0.75rem 1.4rem',
                      borderRadius: '0.85rem',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)'
                    }}
                  >
                    <Crop size={18} />
                    <span>✂️ {isPdfMode ? `${questionNo}. Soruyu PDF'ten Kırp` : 'Şimdi Soruyu Kırp & Çöz'}</span>
                  </button>

                  <button
                    onClick={handleClipboardPaste}
                    style={{
                      padding: '0.75rem 1.4rem',
                      borderRadius: '0.85rem',
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)'
                    }}
                    title="Windows'ta Win+Shift+S ile soruyu kopyaladıktan sonra yapıştırın"
                  >
                    <Copy size={18} />
                    <span>📋 Panodan Yapıştır (Ctrl+V)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* ── API KEY MODAL ── */}
      {apiKeyModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10001,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            maxWidth: 480,
            width: '100%',
            border: '1.5px solid var(--color-border)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: 'rgba(168,85,247,0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1rem' }}>Google Gemini API Anahtarı</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Yapay zeka çözümleri için gereklidir (Günde 1.500 istek ücretsiz)</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#a855f7', fontWeight: 800 }}>Google AI Studio</a> üzerinden 1 dakikada ücretsiz API anahtarınızı alabilirsiniz.
            </p>

            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
                fontFamily: 'monospace'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => setApiKeyModalOpen(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.6rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleSaveApiKey}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer' }}
              >
                Kaydet ve Çöz
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
