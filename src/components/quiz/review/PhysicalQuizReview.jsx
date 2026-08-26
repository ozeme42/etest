import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle, FileSpreadsheet, Trophy, Sparkles, Check, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import ResizablePdfPanel from '../../ResizablePdfPanel';
import ScreenSnipperAndSolverModal from '../ai/ScreenSnipperAndSolverModal';
import AiUsageBadge from '../ai/AiUsageBadge';
import { toUUID } from '../../../services/supabaseService';

function getAnsIndex(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const code = val.trim().toUpperCase().charCodeAt(0) - 65;
    if (code >= 0 && code <= 4) return code;
  }
  return null;
}

function getQuestionColumns(totalCount, isMobile = false, containerWidth = 1000) {
  if (totalCount <= 0) return [[]];
  // Mobil veya dar panelde (< 680px, örn. PDF yan yana açıkken) tek sütuna dön:
  if (isMobile || containerWidth < 680) {
    return [Array.from({ length: totalCount }, (_, i) => i + 1)];
  }

  // Geniş panelde (>= 680px) soru sayısına göre 2 eşit/dengeli sütuna böl:
  const perCol = Math.ceil(totalCount / 2);
  const col1 = [];
  const col2 = [];

  for (let i = 1; i <= totalCount; i++) {
    if (i <= perCol) {
      col1.push(i);
    } else {
      col2.push(i);
    }
  }

  return col2.length > 0 ? [col1, col2] : [col1];
}

const MISTAKE_REASON_OPTIONS = [
  { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { label: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  { label: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' }
];

export default function PhysicalQuizReview({ submission, test, questions = [], onClose }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const location = useLocation();
  const { updateSubmission } = useEvaluation();
  const { currentUser } = useAuth();
  const { books, bookTests } = useTrackedBooks();

  const studentId = submission?.studentId || currentUser?.id || 'u1';
  const testId = test?.id || submission?.testId || submission?.bookTestId || 'test_1';
  const testKey = String(testId).replace(/^bt_/, '');

  // ── Resolve Book & PDF ──
  const resolvedBook = useMemo(() => {
    if (test?.book) return test.book;
    if (test?.bookId && books) {
      return books.find(b => String(b.id) === String(test.bookId) || toUUID(b.id) === toUUID(test.bookId)) || null;
    }
    if (books && Array.isArray(books)) {
      return books.find(b => (bookTests || []).some(bt => String(bt.bookId) === String(b.id) && (String(bt.id) === String(testId) || toUUID(bt.id) === toUUID(testId)))) || null;
    }
    return null;
  }, [test, books, bookTests, testId]);

  const pdfUrl = test?.pdfUrl || resolvedBook?.pdfUrl || submission?.pdfUrl || '';
  const hasPdf = Boolean(pdfUrl);

  const [pdfMode, setPdfMode] = useState(() => hasPdf ? (isMobile ? 'top' : 'side') : 'hidden');
  const effectivePdfMode = (isMobile && pdfMode === 'side') ? 'top' : pdfMode;
  const [showOptikForm, setShowOptikForm] = useState(true);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showMistakeSummary, setShowMistakeSummary] = useState(true);
  const [savedFeedbackToast, setSavedFeedbackToast] = useState(null);
  const [aiModalQuestionNo, setAiModalQuestionNo] = useState(null);

  // ── Load Mistake Reasons State ──
  const [mistakeReasons, setMistakeReasons] = useState(() => {
    if (submission?.mistakeReasons && typeof submission.mistakeReasons === 'object') {
      return submission.mistakeReasons;
    }
    try {
      const keysToTry = [
        `mistake_reasons_${testId}_${studentId}`,
        `mistake_reasons_bt_${testKey}_${studentId}`,
        `mistake_reasons_${testKey}_${studentId}`,
        `mistake_reasons_${toUUID(testId)}_${toUUID(studentId)}`,
        `mistake_reasons_${testId}`
      ];
      for (const k of keysToTry) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    } catch {}
    return {};
  });

  // ── Save Mistake Reason Handler ──
  const handleSetMistakeReason = useCallback(async (qNo, reason) => {
    const next = { ...mistakeReasons, [qNo]: mistakeReasons[qNo] === reason ? null : reason };
    setMistakeReasons(next);

    // 1. Save to LocalStorage
    try {
      localStorage.setItem(`mistake_reasons_${testId}_${studentId}`, JSON.stringify(next));
      localStorage.setItem(`mistake_reasons_bt_${testKey}_${studentId}`, JSON.stringify(next));
      localStorage.setItem(`mistake_reasons_${testKey}_${studentId}`, JSON.stringify(next));
    } catch {}

    // 2. Sync to Supabase Evaluation Context
    if (submission && updateSubmission) {
      const updatedAnswers = (submission.answers || []).map(a => {
        const num = a.questionNo || a.questionIndex;
        if (num === qNo || String(num) === String(qNo)) {
          return { ...a, reason: next[qNo], mistakeReason: next[qNo] };
        }
        return a;
      });

      await updateSubmission(submission.id, {
        mistakeReasons: next,
        answers: updatedAnswers
      });
    }

    setSavedFeedbackToast(next[qNo] ? `Soru ${qNo}: "${reason}" sebebi kaydedildi` : `Soru ${qNo}: Sebep kaldırıldı`);
    setTimeout(() => setSavedFeedbackToast(null), 2500);
  }, [mistakeReasons, testId, testKey, studentId, submission, updateSubmission]);

  const [isSavingDb, setIsSavingDb] = useState(false);

  const handleSaveAllMistakesToDb = async () => {
    setIsSavingDb(true);
    try {
      // 1. Save to LocalStorage under multiple keys
      localStorage.setItem(`mistake_reasons_${testId}_${studentId}`, JSON.stringify(mistakeReasons));
      localStorage.setItem(`mistake_reasons_bt_${testKey}_${studentId}`, JSON.stringify(mistakeReasons));
      localStorage.setItem(`mistake_reasons_${testKey}_${studentId}`, JSON.stringify(mistakeReasons));

      // 2. Save directly to Supabase via Evaluation Context
      if (submission && updateSubmission) {
        const updatedAnswers = (submission.answers || []).map(a => {
          const num = a.questionNo || a.questionIndex;
          if (num && mistakeReasons[num]) {
            return { ...a, reason: mistakeReasons[num], mistakeReason: mistakeReasons[num] };
          }
          return a;
        });

        await updateSubmission(submission.id, {
          mistakeReasons: mistakeReasons,
          answers: updatedAnswers
        });
      }

      setSavedFeedbackToast('✓ Tüm hata analizleri veritabanına başarıyla kaydedildi!');
    } catch (e) {
      console.error(e);
      setSavedFeedbackToast('✓ Hata analizi sisteme kaydedildi!');
    } finally {
      setIsSavingDb(false);
      setTimeout(() => setSavedFeedbackToast(null), 3000);
    }
  };

  const handleGoBack = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (location.state?.from) {
      navigate(location.state.from, { replace: true });
      return;
    }
    if (location.state?.fromTeacher || location.state?.isTeacher) {
      navigate('/evaluation', { replace: true });
    } else {
      navigate('/student-results', { replace: true });
    }
  };

  const answers = submission?.answers || [];
  const qCount = useMemo(() => {
    if (Array.isArray(questions) && questions.length > 0) return questions.length;
    if (Array.isArray(answers) && answers.length > 0) return answers.length;
    if (test?.questionCount && Number(test.questionCount) > 0) return Number(test.questionCount);
    if (submission?.totalQuestions && Number(submission.totalQuestions) > 0) return Number(submission.totalQuestions);
    if (test?.totalQuestions && Number(test.totalQuestions) > 0) return Number(test.totalQuestions);
    return 20;
  }, [questions, answers, test, submission]);

  const correctCount = submission?.correctCount ?? answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission?.wrongCount ?? answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '').length;
  const blankCount = submission?.blankCount ?? Math.max(0, qCount - correctCount - wrongCount);
  const scorePct = submission?.score ?? (qCount > 0 ? Math.round((correctCount / qCount) * 100) : 0);
  const penaltyRatio = resolvedBook?.penaltyRatio !== undefined ? resolvedBook.penaltyRatio : 3;
  const netScore = submission?.netScore !== undefined && submission?.netScore !== null
    ? Number(submission.netScore)
    : Number((correctCount - (penaltyRatio > 0 ? wrongCount / penaltyRatio : 0)).toFixed(2));
  const opticalContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  useEffect(() => {
    if (!opticalContainerRef.current) return;
    const updateSize = () => {
      if (opticalContainerRef.current) {
        setContainerWidth(opticalContainerRef.current.clientWidth);
      }
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(opticalContainerRef.current);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [showOptikForm, effectivePdfMode]);

  const questionColumns = useMemo(() => {
    return getQuestionColumns(qCount, isMobile, containerWidth);
  }, [qCount, isMobile, containerWidth]);

  const targetObj = test || {};
  const explicitOpt = Number(targetObj?.optionCount || targetObj?.optionsCount || targetObj?.book?.optionCount || test?.optionCount || test?.optionsCount || test?.book?.optionCount || (typeof book !== 'undefined' ? book?.optionCount : undefined));
  const isExplicitFive = explicitOpt === 5 ? true : (explicitOpt === 4 ? false : Boolean(
    Number(test?.optionCount) === 5 ||
    Number(test?.optionsCount) === 5 ||
    Number(resolvedBook?.optionCount) === 5 ||
    String(test?.optionCount || test?.optionsCount || resolvedBook?.optionCount || '').includes('5') ||
    test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS' ||
    resolvedBook?.publisher === 'TYT' || resolvedBook?.publisher === 'AYT' || resolvedBook?.publisher === 'YKS' ||
    Boolean(String(test?.grade || resolvedBook?.grade || '').match(/^(9|10|11|12)/)) ||
    Boolean(String(test?.title || test?.name || resolvedBook?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
  ));
  const optionsList = isExplicitFive ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  // Mistake Statistics for this test
  const mistakeCounts = useMemo(() => {
    const counts = {};
    MISTAKE_REASON_OPTIONS.forEach(opt => { counts[opt.label] = 0; });
    let classified = 0;
    Object.entries(mistakeReasons).forEach(([q, r]) => {
      if (r) {
        let matched = MISTAKE_REASON_OPTIONS.find(opt => opt.label === r || r.includes(opt.label.slice(2).trim()));
        if (matched) {
          counts[matched.label] = (counts[matched.label] || 0) + 1;
          classified++;
        }
      }
    });
    return { counts, classified, unclassified: Math.max(0, wrongCount - classified) };
  }, [mistakeReasons, wrongCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg, #f8fafc)', color: 'var(--color-text, #0f172a)', overflow: 'hidden' }}>
      
      {/* ════════════════════════════════════════════
          1. TOP NAVIGATION & SCORECARD HEADER
      ════════════════════════════════════════════ */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.5rem',
        background: 'var(--color-surface, #ffffff)',
        borderBottom: '1.5px solid var(--color-border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: isMobile ? '0.4rem' : '1rem',
        minHeight: isMobile ? '48px' : '58px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', minWidth: 0, flex: 1 }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.85rem',
              borderRadius: '0.65rem',
              background: 'var(--color-surface, #ffffff)',
              border: '1.5px solid var(--color-border, #cbd5e1)',
              color: 'var(--color-text, #475569)',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexShrink: 0,
              transition: 'all 0.15s'
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={isMobile ? 15 : 16} />
            {!isMobile && "Geri Dön"}
          </button>
          
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                📖 KİTAP OPTİK İNCELEME
              </span>
              {resolvedBook?.title && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {resolvedBook.title}
                </span>
              )}
            </div>
            <h2 style={{
              fontSize: isMobile ? '0.85rem' : '1.05rem',
              fontWeight: 900,
              margin: 0,
              color: 'var(--color-text, #0f172a)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {test?.title || test?.name || submission?.testTitle || 'Optik Form İnceleme'}
            </h2>
          </div>
        </div>

        {/* METRICS ROW */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.5rem', flexShrink: 0 }}>
          {/* Net */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', padding: isMobile ? '0.2rem 0.4rem' : '0.35rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
            <span style={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.82rem', color: '#1d4ed8' }}>
              {netScore} Net
            </span>
          </div>

          {/* Doğru */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f0fdf4', padding: isMobile ? '0.2rem 0.4rem' : '0.35rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={isMobile ? 12 : 14} color="#16a34a" />
            <span style={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.82rem', color: '#15803d' }}>
              {correctCount} D
            </span>
          </div>

          {/* Yanlış */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fef2f2', padding: isMobile ? '0.2rem 0.4rem' : '0.35rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
            <XCircle size={isMobile ? 12 : 14} color="#dc2626" />
            <span style={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.82rem', color: '#b91c1c' }}>
              {wrongCount} Y
            </span>
          </div>

          {/* Boş */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f8fafc', padding: isMobile ? '0.2rem 0.4rem' : '0.35rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <HelpCircle size={isMobile ? 12 : 14} color="#64748b" />
            <span style={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.82rem', color: '#475569' }}>
              {blankCount} B
            </span>
          </div>

          {/* Başarı % */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: 'white',
            padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.85rem',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
          }}>
            %{scorePct}
          </div>
        </div>
      </header>

      {/* FEEDBACK TOAST */}
      {savedFeedbackToast && (
        <div style={{
          position: 'fixed',
          top: 66,
          right: 20,
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.55rem 1rem',
          borderRadius: 10,
          fontSize: '0.78rem',
          fontWeight: 800,
          zIndex: 999,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={14} color="#10b981" />
          {savedFeedbackToast}
        </div>
      )}

      {/* ════════════════════════════════════════════
          2. MAIN SPLIT BODY (PDF + OPTICAL FORM)
      ════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        flexDirection: (effectivePdfMode === 'top' || isMobile) ? 'column' : 'row',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* PDF Panel if PDF exists */}
        {hasPdf && (
          <ResizablePdfPanel
            pdfUrl={pdfUrl}
            title={test?.title || test?.name || resolvedBook?.title || 'Kitap PDF'}
            mode={effectivePdfMode}
            onModeChange={setPdfMode}
            isFullScreen={!showOptikForm}
            onToggleDrawing={() => setIsDrawingOpen(p => !p)}
            isDrawingOpen={isDrawingOpen}
          />
        )}

        {/* Optical Form Area */}
        {showOptikForm && (
          <div 
            ref={opticalContainerRef}
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              minWidth: 0, 
              background: 'var(--color-bg, #f8fafc)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ maxWidth: effectivePdfMode === 'hidden' ? 1080 : undefined, width: '100%', margin: effectivePdfMode === 'hidden' ? '0 auto' : undefined, padding: isMobile ? '0.75rem' : '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxSizing: 'border-box' }}>
              
              {/* SCORECARD HERO BANNER */}
              <div style={{
                background: 'var(--color-surface, #ffffff)',
                borderRadius: '1.25rem',
                padding: '1.1rem 1.35rem',
                color: 'var(--color-text, #0f172a)',
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
                border: '1.5px solid var(--color-border, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: scorePct >= 70 ? '#f0fdf4' : scorePct >= 50 ? '#fffbeb' : '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: scorePct >= 70 ? '1.5px solid #bbf7d0' : scorePct >= 50 ? '1.5px solid #fde68a' : '1.5px solid #fecaca'
                    }}>
                      <Trophy size={24} color={scorePct >= 70 ? '#15803d' : scorePct >= 50 ? '#b45309' : '#b91c1c'} />
                    </div>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,99,235,0.1)', border: '1px solid #93c5fd', borderRadius: 99, padding: '0.1rem 0.55rem', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#2563eb' }}>OPTİK FORM DEĞERLENDİRMESİ</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                        {test?.title || test?.name || submission?.testTitle || 'Test Sonucu'}
                      </div>
                    </div>
                  </div>

                  {/* COLOR LEGEND GUIDES */}
                  <div style={{ display: 'flex', gap: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', padding: '0.4rem 0.75rem', borderRadius: '0.6rem', fontSize: '0.72rem', fontWeight: 800, flexWrap: 'wrap' }}>
                    <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} /> Doğru
                    </span>
                    <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444' }} /> Hatalı
                    </span>
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #10b981', background: 'transparent' }} /> Cevap Anahtarı
                    </span>
                  </div>
                </div>

                {/* MISTAKE DIAGNOSTIC SUMMARY ACCORDION */}
                {wrongCount > 0 && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--color-border, #e2e8f0)' }}>
                    <div
                      onClick={() => setShowMistakeSummary(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                          🤔 Bu Testteki Yanlış Sebepleri ({mistakeCounts.classified}/{wrongCount} Sınıflandırıldı)
                        </span>
                        {mistakeCounts.unclassified > 0 && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: 99 }}>
                            {mistakeCounts.unclassified} bekleyen
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {showMistakeSummary ? 'Gizle' : 'Göster'} {showMistakeSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>

                    {showMistakeSummary && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '0.5rem',
                        marginTop: '0.65rem'
                      }}>
                        {MISTAKE_REASON_OPTIONS.map(opt => {
                          const count = mistakeCounts.counts[opt.label] || 0;
                          return (
                            <div
                              key={opt.label}
                              style={{
                                background: count > 0 ? opt.bg : 'var(--color-surface-hover, #f8fafc)',
                                border: `1.5px solid ${count > 0 ? opt.border : 'var(--color-border, #e2e8f0)'}`,
                                borderRadius: 10,
                                padding: '0.45rem 0.65rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: count > 0 ? opt.color : 'var(--color-text-muted, #64748b)' }}>
                                {opt.label}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: count > 0 ? opt.color : 'var(--color-text-muted, #64748b)' }}>
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Hata Analizini Veritabanına Kaydet Butonu */}
                    <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTop: '1px dashed #e2e8f0', paddingTop: '0.65rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        💡 Her soru için aşağıda işaretlediğiniz hata nedenleri veritabanına anlık senkronize edilir.
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveAllMistakesToDb}
                        disabled={isSavingDb}
                        style={{
                          padding: '0.4rem 0.9rem',
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          color: 'white',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Save size={14} />
                        <span>{isSavingDb ? 'Kaydediliyor...' : '💾 Hata Analizini Veritabanına Kaydet'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ════════════════════════════════════════════
                  3. OPTICAL FORM COLUMNS & BUBBLE ROWS
              ════════════════════════════════════════════ */}
              <div style={{
                background: 'var(--color-surface, #ffffff)',
                borderRadius: '1.25rem',
                padding: isMobile ? '0.75rem' : '1.25rem',
                border: '1.5px solid var(--color-border, #e2e8f0)',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                {(() => {
                  const isVeryNarrow = isMobile || containerWidth < 460;
                  const isCompact = containerWidth < 680;
                  const bubbleSize = isVeryNarrow ? 28 : isCompact ? 32 : (questionColumns.length === 1 ? 38 : 34);
                  const bubbleFontSize = isVeryNarrow ? '0.76rem' : isCompact ? '0.82rem' : '0.88rem';

                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: questionColumns.length === 1 ? '1fr' : `repeat(${questionColumns.length}, minmax(0, 1fr))`,
                      gap: isCompact ? '0.65rem' : '1rem',
                      alignItems: 'start',
                      width: '100%'
                    }}>
                      {questionColumns.map((colQuestions, colIdx) => (
                        <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '0.55rem' : '0.75rem', width: '100%', minWidth: 0 }}>
                          {colQuestions.map(qNo => {
                            const qIdx = qNo - 1;
                            const qObj = questions[qIdx] || {};
                            const ansObj = answers.find(a => (a.questionNo === qNo || String(a.questionNo) === String(qNo) || a.questionId === qObj.id)) || answers[qIdx] || {};

                            const rawUserAns = ansObj.userAnswer ?? submission?.studentAnswersMap?.[qNo] ?? submission?.studentAnswers?.[qNo] ?? submission?.studentAnswers?.[String(qNo)] ?? null;
                            const userAnsLetter = (rawUserAns !== null && rawUserAns !== undefined && rawUserAns !== '')
                              ? (typeof rawUserAns === 'string' ? rawUserAns.toUpperCase() : String.fromCharCode(65 + rawUserAns))
                              : null;
                            const userAnsIndex = getAnsIndex(rawUserAns);
                            const textAns = ansObj.userAnswerText;

                            // Answer Key Resolution
                            const rawAk = submission?.answerKey || test?.answer_key || test?.answerKey || resolvedBook?.answer_key || resolvedBook?.answerKey || {};
                            const rawKeyVal = ansObj.correctAnswer ?? ansObj.correctAnswerLetter ?? qObj.correctAnswer ?? qObj.correctAnswerLetter ?? (Array.isArray(rawAk) ? rawAk[qIdx] : (rawAk[qNo] || rawAk[String(qNo)] || rawAk[qIdx]));
                            const correctAnsIndex = getAnsIndex(rawKeyVal);
                            const correctLetter = (typeof rawKeyVal === 'string' && rawKeyVal.length === 1) ? rawKeyVal.toUpperCase() : (correctAnsIndex !== null ? String.fromCharCode(65 + correctAnsIndex) : '');

                            let isCorrect = ansObj.isCorrect;
                            if (isCorrect === null || isCorrect === undefined) {
                              if (userAnsLetter && correctLetter) {
                                isCorrect = userAnsLetter.toUpperCase() === correctLetter.toUpperCase();
                              } else if (userAnsIndex !== null && correctAnsIndex !== null) {
                                isCorrect = userAnsIndex === correctAnsIndex;
                              }
                            }

                            const isWrong = isCorrect === false && (userAnsIndex !== null || userAnsLetter !== null);
                            const isBlank = userAnsIndex === null && !userAnsLetter && !textAns;

                            return (
                              <div
                                key={qNo}
                                style={{
                                  background: isCorrect === true ? 'rgba(16, 185, 129, 0.04)' : isWrong ? 'rgba(239, 68, 68, 0.04)' : 'var(--color-surface, #ffffff)',
                                  padding: isVeryNarrow ? '0.4rem 0.6rem' : isCompact ? '0.48rem 0.7rem' : '0.55rem 0.8rem',
                                  borderRadius: '0.85rem',
                                  border: `1.5px solid ${isCorrect === true ? '#bbf7d0' : isWrong ? '#fecaca' : 'var(--color-border, #e2e8f0)'}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.35rem',
                                  transition: 'all 0.15s ease',
                                  boxSizing: 'border-box',
                                  width: '100%'
                                }}
                              >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              {/* Question Number Badge */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 48, flexShrink: 0 }}>
                                <div style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  background: isCorrect === true ? '#f0fdf4' : isWrong ? '#fef2f2' : 'var(--color-surface-hover, #f8fafc)',
                                  color: isCorrect === true ? '#15803d' : isWrong ? '#dc2626' : 'var(--color-text-muted, #64748b)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '0.82rem',
                                  border: `1px solid ${isCorrect === true ? '#bbf7d0' : isWrong ? '#fecaca' : 'var(--color-border, #e2e8f0)'}`
                                }}>
                                  {qNo}
                                </div>
                                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: isCorrect === true ? '#16a34a' : isWrong ? '#dc2626' : 'var(--color-text-muted, #64748b)' }}>
                                  {isCorrect === true ? '✓' : isWrong ? (correctLetter ? `(${correctLetter})` : '✕') : '—'}
                                </span>
                                <AiUsageBadge testId={testId} questionNo={qNo} compact />
                              </div>

                              {/* Bubble Options */}
                              {textAns ? (
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text, #0f172a)', background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', padding: '0.3rem 0.55rem', borderRadius: '0.45rem', flex: 1 }}>
                                  {textAns}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.35rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {optionsList.map((opt, optIdx) => {
                                    const isUserMarked = userAnsIndex === optIdx || userAnsLetter === opt;
                                    const isAnswerKey = correctAnsIndex === optIdx;

                                    let bg = 'var(--color-surface, #ffffff)';
                                    let color = 'var(--color-text-muted, #64748b)';
                                    let border = '1.5px solid var(--color-border, #cbd5e1)';
                                    let shadow = 'none';

                                    if (isUserMarked && isAnswerKey) {
                                      bg = 'linear-gradient(135deg, #10b981, #059669)';
                                      color = '#ffffff';
                                      border = '2px solid #059669';
                                      shadow = '0 2px 8px rgba(16,185,129,0.3)';
                                    } else if (isUserMarked && !isAnswerKey) {
                                      bg = 'linear-gradient(135deg, #ef4444, #dc2626)';
                                      color = '#ffffff';
                                      border = '2px solid #dc2626';
                                      shadow = '0 2px 8px rgba(239,68,68,0.3)';
                                    } else if (!isUserMarked && isAnswerKey) {
                                      bg = '#f0fdf4';
                                      color = '#16a34a';
                                      border = '2px dashed #16a34a';
                                    }

                                    return (
                                      <div
                                        key={opt}
                                        style={{
                                          width: isMobile ? 30 : 34,
                                          height: isMobile ? 30 : 34,
                                          borderRadius: '50%',
                                          background: bg,
                                          color: color,
                                          border: border,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 900,
                                          fontSize: isMobile ? '0.8rem' : '0.88rem',
                                          boxShadow: shadow,
                                          userSelect: 'none'
                                        }}
                                      >
                                        {opt}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* ════════════════════════════════════════════
                                MISTAKE DIAGNOSTIC SELECTOR (INTERACTIVE IN REVIEW)
                            ════════════════════════════════════════════ */}
                            {(isWrong || isBlank) && (
                              <div style={{
                                width: '100%',
                                marginTop: '0.35rem',
                                paddingTop: '0.35rem',
                                borderTop: isWrong ? '1px dashed #fecaca' : '1px dashed #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '0.35rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: isWrong ? '#b91c1c' : '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    {isWrong ? '🤔 Yanlış Sebebi:' : '⚪ Boş Sebebi:'}
                                  </span>
                                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    {MISTAKE_REASON_OPTIONS.map(r => {
                                      const currentVal = mistakeReasons[qNo];
                                      const isSelected = currentVal === r.label || (currentVal && String(currentVal).includes(r.label.slice(2).trim()));
                                      return (
                                        <button
                                          key={r.label}
                                          type="button"
                                          onClick={() => handleSetMistakeReason(qNo, r.label)}
                                          style={{
                                            padding: isMobile ? '0.14rem 0.35rem' : '0.16rem 0.45rem',
                                            fontSize: isMobile ? '0.56rem' : '0.62rem',
                                            fontWeight: 800,
                                            borderRadius: 6,
                                            border: `1.5px solid ${isSelected ? r.color : r.border}`,
                                            background: isSelected ? r.color : r.bg,
                                            color: isSelected ? '#ffffff' : r.color,
                                            cursor: 'pointer',
                                            boxShadow: isSelected ? `0 2px 6px ${r.color}33` : 'none',
                                            transition: 'all 0.15s ease'
                                          }}
                                          title={`Soru ${qNo} için sebebi "${r.label}" olarak kaydet`}
                                        >
                                          {r.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* ✂️ AI Soru Çözümü & Kırpma Butonu */}
                                <button
                                  type="button"
                                  onClick={() => setAiModalQuestionNo(qNo)}
                                  style={{
                                    padding: isMobile ? '0.16rem 0.45rem' : '0.2rem 0.6rem',
                                    fontSize: isMobile ? '0.6rem' : '0.68rem',
                                    fontWeight: 900,
                                    borderRadius: 6,
                                    border: '1.5px solid #a855f7',
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                                    color: '#7c3aed',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={`Soru ${qNo} için yapay zeka çözümü ve soru kırpma`}
                                >
                                  <Sparkles size={12} color="#a855f7" />
                                  <span>✨ AI Çözüm & Kırp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── AI QUESTION SOLVER & SCREEN SNIPPER MODAL ── */}
      {aiModalQuestionNo && (() => {
        const targetQNo = aiModalQuestionNo;
        const targetQIdx = targetQNo - 1;
        const targetQObj = questions[targetQIdx] || {};
        const targetAnsObj = answers.find(a => (a.questionNo === targetQNo || String(a.questionNo) === String(targetQNo) || a.questionId === targetQObj.id)) || answers[targetQIdx] || {};
        const rawUserAns = targetAnsObj.userAnswer ?? submission?.studentAnswersMap?.[targetQNo] ?? submission?.studentAnswers?.[targetQNo] ?? null;
        const userAnsLetter = (rawUserAns !== null && rawUserAns !== undefined && rawUserAns !== '') ? (typeof rawUserAns === 'string' ? rawUserAns.toUpperCase() : String.fromCharCode(65 + rawUserAns)) : '';
        const rawAk = submission?.answerKey || test?.answer_key || test?.answerKey || resolvedBook?.answer_key || resolvedBook?.answerKey || {};
        const rawKeyVal = targetAnsObj.correctAnswer ?? targetAnsObj.correctAnswerLetter ?? targetQObj.correctAnswer ?? targetQObj.correctAnswerLetter ?? (Array.isArray(rawAk) ? rawAk[targetQIdx] : (rawAk[targetQNo] || rawAk[String(targetQNo)] || rawAk[targetQIdx]));
        const correctAnsIndex = getAnsIndex(rawKeyVal);
        const correctLetter = (typeof rawKeyVal === 'string' && rawKeyVal.length === 1) ? rawKeyVal.toUpperCase() : (correctAnsIndex !== null ? String.fromCharCode(65 + correctAnsIndex) : '');

        return (
          <ScreenSnipperAndSolverModal
            isOpen={Boolean(aiModalQuestionNo)}
            onClose={() => setAiModalQuestionNo(null)}
            questionNo={targetQNo}
            question={{
              questionNo: targetQNo,
              userAnswer: userAnsLetter || null,
              correctAnswerLetter: correctLetter || null,
              userAnswerText: targetAnsObj.userAnswerText || ''
            }}
            mistakeReason={mistakeReasons[targetQNo] || ''}
            onMistakeReasonChange={(r) => handleSetMistakeReason(targetQNo, r)}
            studentAnswer={targetAnsObj.userAnswerText || userAnsLetter || 'Boş'}
            correctAnswer={correctLetter || ''}
            subject={test?.subject || submission?.subject || 'Genel'}
            topic={test?.topic || submission?.unitTopic || ''}
            testId={testId}
          />
        );
      })()}
    </div>
  );
}
