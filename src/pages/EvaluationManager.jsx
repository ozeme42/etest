import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, Clock3, Eye, Save, ArrowLeft,
  ClipboardList, Users, BookOpen, Star, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  AlertCircle, Search, Filter, Layers, MessageSquare, Award,
  Sparkles, Check, Edit3, Send, FileText, Globe, Image as ImageIcon,
  RotateCcw, Trophy, ThumbsUp, ThumbsDown, CheckCircle, HelpCircle,
  ClipboardCheck, Ruler, TestTube2, BookCopy, Zap, Plus, Minus
} from 'lucide-react';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';
import MultiHomeworkRunner from '../components/quiz/runner/MultiHomeworkRunner';

import { resolveTestQuestions } from '../utils/testResolver';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';

// ─── SUBJECT HELPER & THEMES ──────────────────────────────────────────────────
function detectSubject(title = '', existingSubject = '') {
  if (existingSubject && !['genel', 'diğer', 'all', ''].includes(String(existingSubject).toLowerCase().trim())) {
    return existingSubject;
  }
  const t = (String(title) + ' ' + String(existingSubject || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak') || t.includes('ilmihal') || t.includes('fıkıh') || t.includes('siyer') || t.includes('kuran')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('lgs') || t.includes('tarama')) return 'Genel Deneme';
  return 'Genel Testler';
}

const subjectThemes = {
  'Matematik': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '📐' },
  'Fen Bilimleri': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: '🔬' },
  'Türkçe': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: '📚' },
  'Sosyal Bilgiler': { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: '🌍' },
  'İngilizce': { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: '🇬🇧' },
  'Din Kültürü': { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', icon: '🌙' },
  'Genel Deneme': { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: '🏛️' },
  'Genel Testler': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: '📝' }
};

const QUICK_FEEDBACK_PRESETS = [
  '👏 Çözüm yöntemi ve açıklama harika, tam puan!',
  '💡 Çözüm doğru ancak işlem adımlarına dikkat edilmeli.',
  '✍️ Açıklama biraz eksik kalmış, formülü belirtmelisin.',
  '⚠️ Yanlış formül veya kavram kullanılmış, tekrar gözden geçir.',
  '🌟 Gayet başarılı, tebrikler!'
];

// ─── TEACHER GRADING BOTTOM BAR ───────────────────────────────────────────────
function TeacherGradingBar({
  submission,
  test,
  questions,
  questionScores,
  setQuestionScores,
  teacherNotes,
  setTeacherNotes,
  overallFeedback,
  setOverallFeedback,
  onSave,
  onClose,
  isSaving
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeQNo, setActiveQNo] = useState(1);

  const totalQuestions = Math.max(1, questions?.length || submission?.answers?.length || 1);
  const questionsList = questions && questions.length > 0 ? questions : (submission?.answers || []);

  // Strict calculation for 1..totalQuestions only
  const totalScore = useMemo(() => {
    let sum = 0;
    for (let i = 1; i <= totalQuestions; i++) {
      const s = questionScores[i];
      if (s !== undefined && s !== null) {
        sum += Math.max(0, Math.min(10, Number(s) || 0));
      } else {
        const a = (submission?.answers || [])[i - 1];
        if (a) {
          sum += a.score !== undefined ? Number(a.score) : (a.isCorrect === true ? 10 : 0);
        }
      }
    }
    return Math.min(totalQuestions * 10, sum);
  }, [questionScores, totalQuestions, submission]);

  const maxScore = totalQuestions * 10;
  const percentage = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0;

  const currentAns = (submission?.answers || []).find(a => (a.questionNo || 0) === activeQNo) || (submission?.answers || [])[activeQNo - 1] || {};
  const currentScore = questionScores[activeQNo] ?? (currentAns.score !== undefined ? currentAns.score : (currentAns.isCorrect === true ? 10 : 0));
  const currentNote = teacherNotes[activeQNo] ?? (currentAns.teacherNote || '');

  const handleScoreChange = (newScore) => {
    const clamped = Math.max(0, Math.min(10, newScore));
    setQuestionScores(p => ({ ...p, [activeQNo]: clamped }));
  };

  const handleNextQ = () => {
    if (activeQNo < totalQuestions) {
      setActiveQNo(p => p + 1);
    }
  };

  const handlePrevQ = () => {
    if (activeQNo > 1) {
      setActiveQNo(p => p - 1);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.98)',
      backdropFilter: 'blur(24px)',
      borderTop: '2px solid #334155',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Top Header / Control Strip */}
      <div style={{
        padding: '0.6rem 1rem',
        background: '#1e293b',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem'
      }}>
        {/* Left: Back & Student Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '0.6rem', padding: '0.45rem 0.8rem',
              color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> <span style={{ display: 'inline' }}>Kapat</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#38bdf8' }}>
              ✍️ Puanlama
            </span>
            <span style={{
              fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '0.15rem 0.6rem', borderRadius: '50px', fontWeight: 800
            }}>
              {submission.studentName || 'Öğrenci'}
            </span>
          </div>
        </div>

        {/* Right: Live Score & Save & Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Live Score Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #312e81, #1e1b4b)',
            color: '#e0e7ff', padding: '0.35rem 0.75rem', borderRadius: '0.75rem',
            fontWeight: 900, fontSize: '0.85rem', border: '1px solid #4f46e5',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}>
            <span>🎯 Not:</span>
            <span style={{ color: percentage >= 70 ? '#34d399' : (percentage >= 50 ? '#fbbf24' : '#f87171') }}>
              {totalScore} / {maxScore}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>(%{percentage})</span>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '0.75rem',
              padding: '0.45rem 1.1rem',
              color: 'white', fontWeight: 900, fontSize: '0.82rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Kaydet & Bitir'}
          </button>

          {/* Toggle View */}
          <button
            type="button"
            onClick={() => setIsCollapsed(p => !p)}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: '0.55rem', padding: '0.45rem 0.65rem',
              color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.75rem', fontWeight: 700
            }}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isCollapsed ? 'Aç' : 'Gizle'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Grading Drawer */}
      {!isCollapsed && (
        <div style={{
          padding: '0.85rem 1rem',
          maxHeight: '280px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Question Navigator Carousel / Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <button
              type="button"
              onClick={handlePrevQ}
              disabled={activeQNo === 1}
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none',
                borderRadius: '0.5rem', padding: '0.35rem 0.5rem',
                color: activeQNo === 1 ? '#475569' : 'white',
                cursor: activeQNo === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'nowrap' }}>
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNo => {
                const score = questionScores[qNo];
                const isActive = activeQNo === qNo;
                return (
                  <button
                    key={qNo}
                    type="button"
                    onClick={() => setActiveQNo(qNo)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.6rem',
                      border: isActive ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                      background: isActive ? 'linear-gradient(135deg, #0284c7, #0369a1)' : score !== undefined ? (score > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(255,255,255,0.05)',
                      color: isActive ? 'white' : score !== undefined ? (score > 0 ? '#34d399' : '#f87171') : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>S.{qNo}</span>
                    {score !== undefined && (
                      <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>({score}p)</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextQ}
              disabled={activeQNo === totalQuestions}
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none',
                borderRadius: '0.5rem', padding: '0.35rem 0.5rem',
                color: activeQNo === totalQuestions ? '#475569' : 'white',
                cursor: activeQNo === totalQuestions ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Active Question Grading Panel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.75rem',
            alignItems: 'start'
          }}>
            {/* Card 1: Question Score & Student Answer */}
            <div style={{ background: '#1e293b', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#fbbf24' }}>
                  ✍️ Soru {activeQNo} Puanı: <span style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{currentScore} / 10</span>
                </span>

                {/* Quick Score Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => handleScoreChange(10)}
                    style={{
                      padding: '0.3rem 0.6rem', borderRadius: '0.45rem',
                      border: '1px solid #059669',
                      background: currentScore === 10 ? '#059669' : 'rgba(6,78,59,0.3)',
                      color: 'white', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer'
                    }}
                  >
                    ✓ 10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScoreChange(5)}
                    style={{
                      padding: '0.3rem 0.6rem', borderRadius: '0.45rem',
                      border: '1px solid #d97706',
                      background: currentScore === 5 ? '#d97706' : 'rgba(120,53,15,0.3)',
                      color: 'white', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer'
                    }}
                  >
                    ½ 5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScoreChange(0)}
                    style={{
                      padding: '0.3rem 0.6rem', borderRadius: '0.45rem',
                      border: '1px solid #dc2626',
                      background: currentScore === 0 ? '#dc2626' : 'rgba(127,29,29,0.3)',
                      color: 'white', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer'
                    }}
                  >
                    ✕ 0
                  </button>
                  
                  {/* Stepper */}
                  <button
                    type="button"
                    onClick={() => handleScoreChange(currentScore - 1)}
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '0.4rem', padding: '0.25rem 0.4rem', cursor: 'pointer' }}
                  >
                    <Minus size={13} />
                  </button>
                  <span style={{ fontWeight: 900, minWidth: '22px', textAlign: 'center', fontSize: '0.85rem' }}>{currentScore}</span>
                  <button
                    type="button"
                    onClick={() => handleScoreChange(currentScore + 1)}
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '0.4rem', padding: '0.25rem 0.4rem', cursor: 'pointer' }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Student Written Response Snippet */}
              <div style={{ background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '0.55rem', marginBottom: '0.5rem', fontSize: '0.78rem', color: '#e2e8f0', border: '1px solid #334155', maxHeight: '60px', overflowY: 'auto' }}>
                <span style={{ color: '#fbbf24', fontWeight: 800 }}>Öğrenci Yanıtı: </span>
                <span>{currentAns.userAnswerText || '(Yazılı yanıt girilmedi / Boş)'}</span>
              </div>

              {/* Question Feedback Note */}
              <input
                type="text"
                placeholder={`Soru ${activeQNo} için öğretmen notu (Örn: Çözüm yöntemi doğru)...`}
                value={currentNote}
                onChange={e => setTeacherNotes(p => ({ ...p, [activeQNo]: e.target.value }))}
                style={{
                  width: '100%', padding: '0.45rem 0.75rem', borderRadius: '0.55rem',
                  background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                  fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Card 2: Overall Feedback & Quick Presets */}
            <div style={{ background: '#1e293b', padding: '0.75rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#818cf8', marginBottom: '0.4rem' }}>
                💬 Sınavın Geneli İçin Öğrenciye Karne Mesajı
              </div>

              {/* Quick Feedback Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.45rem' }}>
                {QUICK_FEEDBACK_PRESETS.slice(0, 3).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOverallFeedback(preset)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#a5b4fc',
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {preset.slice(0, 22)}...
                  </button>
                ))}
              </div>

              <textarea
                rows="2"
                placeholder="Öğrencinin bu sınavdaki genel performansı ve tavsiyeleriniz..."
                value={overallFeedback}
                onChange={e => setOverallFeedback(e.target.value)}
                style={{
                  width: '100%', padding: '0.45rem 0.75rem', borderRadius: '0.55rem',
                  background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                  fontSize: '0.78rem', outline: 'none', resize: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FULL QUIZ REVIEW CONTAINER (EXACT STUDENT SOLVER & REVIEW INTERFACE) ────
function FullQuizReviewContainer({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Local Grading States
  const [questionScores, setQuestionScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');

  const targetId = String(submission.testId || submission.homeworkId || submission.questionId || submission.id || '');
  const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

  useEffect(() => {
    let isMounted = true;

    async function loadTestAndQuestions() {
      setLoading(true);

      let foundHw = homeworks?.find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission.id)))
      );

      let foundBankQ = allBankQuestions?.find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId)
      );

      let foundBookTest = (bookTests || []).find(bt =>
        String(bt.id) === targetId ||
        String(bt.id) === normTargetId ||
        toUUID(bt.id) === targetId
      );

      let foundCurTest = (curriculumData?.tests || []).find(t =>
        String(t.id) === targetId ||
        String(t.id) === normTargetId
      );

      let resolved = foundHw || foundBankQ || foundBookTest || foundCurTest || null;

      // Check IDB payload if content is stored in indexedDb
      let contentPayload = submission.contentPayload || resolved?.contentPayload || null;
      let pdfPayload = submission.pdfPayload || resolved?.pdfPayload || null;
      let htmlPayload = submission.htmlPayload || resolved?.htmlPayload || null;

      if (!contentPayload || contentPayload === '[STORED_IN_INDEXEDDB]') {
        const candidateIds = [targetId, normTargetId, submission.id, submission.testId, resolved?.id].filter(Boolean);
        for (const cid of candidateIds) {
          const val = await idbGetPayload(cid);
          if (val && val !== '[STORED_IN_INDEXEDDB]') {
            contentPayload = val;
            if (val.startsWith('data:application/pdf') || val.includes('.pdf')) pdfPayload = val;
            else if (val.includes('<html') || val.startsWith('<!DOCTYPE')) htmlPayload = val;
            break;
          }
        }
      }

      // Check sections for multi-section tests
      let sections = resolved?.sections || resolved?.tests || null;
      if (Array.isArray(sections) && sections.length > 0) {
        const mappedSections = [];
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const secBankQ = allBankQuestions?.find(q => String(q.id) === String(secQId));
          let secPayload = sec?.contentPayload || secBankQ?.contentPayload || null;
          if (!secPayload || secPayload === '[STORED_IN_INDEXEDDB]') {
            secPayload = await idbGetPayload(secQId);
          }
          const secResolvedQs = secBankQ ? resolveTestQuestions(secBankQ, allBankQuestions) : [];
          mappedSections.push({
            id: secQId || `sec_${i}`,
            title: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
            bankQ: secBankQ ? { ...secBankQ, contentPayload: secPayload || secBankQ.contentPayload } : { id: secQId, title: sec?.title },
            questions: secResolvedQs,
            questionCount: secBankQ?.questionCount || secResolvedQs.length || 1,
            contentPayload: secPayload
          });
        }
        sections = mappedSections;
      }

      const finalTestObj = {
        ...(resolved || {}),
        id: targetId,
        title: submission.testTitle || resolved?.title || resolved?.name || 'Sınav İncelemesi',
        contentType: submission.contentType || resolved?.contentType || (pdfPayload ? 'pdf' : (htmlPayload ? 'html' : 'standard')),
        sourceFormat: submission.sourceFormat || resolved?.sourceFormat || 'standard',
        contentPayload,
        pdfPayload,
        htmlPayload,
        imageUrl: submission.imageUrl || resolved?.imageUrl || null,
        imageUrls: submission.imageUrls || resolved?.imageUrls || [],
        sections,
        questionCount: submission.totalQuestions || resolved?.questionCount || (submission.answers?.length) || 1
      };

      const resolvedQuestionsList = resolveTestQuestions(finalTestObj, allBankQuestions);

      if (isMounted) {
        setTest(finalTestObj);
        setQuestions(resolvedQuestionsList.length > 0 ? resolvedQuestionsList : (submission.answers || []));

        // Initialize question scores and notes
        const scores = {};
        const notes = {};
        const qCount = Math.max(1, resolvedQuestionsList.length || submission.answers?.length || 1);
        for (let i = 1; i <= qCount; i++) {
          const ans = (submission.answers || [])[i - 1];
          if (ans) {
            scores[i] = ans.score !== undefined ? Number(ans.score) : (ans.isCorrect === true ? 10 : 0);
            notes[i] = ans.teacherNote || '';
          } else {
            scores[i] = 0;
            notes[i] = '';
          }
        }

        setQuestionScores(scores);
        setTeacherNotes(notes);
        setOverallFeedback(submission.teacherFeedback || submission.teacherNote || '');
        setLoading(false);
      }
    }

    loadTestAndQuestions();
    return () => { isMounted = false; };
  }, [submission, targetId, normTargetId, allBankQuestions, homeworks, curriculumData, bookTests]);

  const handleSaveGrading = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);

    try {
      const totalQ = Math.max(1, questions?.length || submission?.answers?.length || 1);
      let totalScore = 0;
      for (let i = 1; i <= totalQ; i++) {
        totalScore += Math.max(0, Math.min(10, Number(questionScores[i]) || 0));
      }
      const maxPossible = totalQ * 10;
      const computedPercentage = maxPossible > 0 ? Math.min(100, Math.round((totalScore / maxPossible) * 100)) : 0;

      const updatedAnswers = (submission.answers || []).map((ans, idx) => {
        const qNo = ans.questionNo || (idx + 1);
        const score = questionScores[qNo] ?? 0;
        const note = teacherNotes[qNo] || '';
        return {
          ...ans,
          score,
          isCorrect: score >= 5,
          teacherNote: note,
          evaluatedAt: new Date().toISOString()
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        score: computedPercentage,
        rawScore: totalScore,
        maxScore: maxPossible,
        status: 'evaluated',
        isEvaluatedByTeacher: true,
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      // 1. Update EvaluationContext
      await updateSubmission(submission.id, updatedSubPayload);

      // 2. Update HomeworkContext if linked to a homework
      if (submission.homeworkId || submission.hwId) {
        const hwId = submission.homeworkId || submission.hwId;
        try {
          await updateHomeworkSubmission(hwId, submission.id, updatedSubPayload);
        } catch (e) {}
      }

      if (onSaveSuccess) onSaveSuccess(updatedSubPayload);
      onClose();
    } catch (err) {
      console.error('Error saving teacher evaluation:', err);
      alert('Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !test) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Sınav ve Çözüm Ekranı Yükleniyor...
      </div>
    );
  }

  // Determine Runner / Review Type exactly like ModularQuizReviewPage & Student Quiz Runner
  const isMultiSection = Boolean(
    (test.sections && Array.isArray(test.sections) && test.sections.length > 1) ||
    (test.tests && Array.isArray(test.tests) && test.tests.length > 1) ||
    test.isBulk ||
    test.isMulti
  );

  const isPdf = Boolean(
    test.pdfPayload || test.pdfUrl || test.contentType === 'pdf' || test.sourceFormat === 'pdf' ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:application/pdf') || test.contentPayload.includes('.pdf')))
  );

  const isHtml = Boolean(
    test.htmlPayload || test.contentType === 'html' || test.sourceFormat === 'html' ||
    (typeof test.contentPayload === 'string' && (test.contentPayload.startsWith('data:text/html') || test.contentPayload.includes('<html') || test.contentPayload.startsWith('<!DOCTYPE')))
  );

  const isImageTest = !isHtml && !isPdf && Boolean(
    test.contentType === 'gorsel' || test.contentType === 'image' || test.sourceFormat === 'image' || test.type === 'gorsel' ||
    (test.imageUrls && test.imageUrls.length > 0) || test.imageUrl ||
    (typeof test.contentPayload === 'string' && test.contentPayload.startsWith('data:image'))
  );

  const isPhysical = Boolean(
    !String(test.id || '').startsWith('hw_') &&
    (test.sourceFormat === 'physical' || test.questionType === 'optik_form' || (test.sourceType === 'trackedBook' && !test.contentPayload && !test.sections))
  );

  const renderReviewScreen = () => {
    if (isMultiSection) {
      return (
        <MultiHomeworkRunner
          test={test}
          questions={questions}
          isReviewMode={true}
          userAnswers={submission}
          onSubmit={onClose}
        />
      );
    }

    if (isPdf) {
      return (
        <PdfQuizReview
          submission={submission}
          test={test}
          questions={questions}
          onClose={onClose}
        />
      );
    }

    if (isHtml) {
      return (
        <HtmlQuizReview
          submission={submission}
          test={test}
          questions={questions}
          onClose={onClose}
        />
      );
    }

    if (isImageTest) {
      return (
        <ImageQuizReview
          submission={submission}
          test={test}
          questions={questions}
          onClose={onClose}
        />
      );
    }

    if (isPhysical) {
      return (
        <PhysicalQuizReview
          submission={submission}
          test={test}
          questions={questions}
          onClose={onClose}
        />
      );
    }

    return (
      <StandardQuizReview
        submission={submission}
        test={test}
        questions={questions}
        onClose={onClose}
      />
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Main Review Screen (Scrollable, 100% Student View) */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '160px', background: '#0f172a' }}>
        {renderReviewScreen()}
      </div>

      {/* Floating Bottom Grading Bar */}
      <TeacherGradingBar
        submission={submission}
        test={test}
        questions={questions}
        questionScores={questionScores}
        setQuestionScores={setQuestionScores}
        teacherNotes={teacherNotes}
        setTeacherNotes={setTeacherNotes}
        overallFeedback={overallFeedback}
        setOverallFeedback={setOverallFeedback}
        onSave={handleSaveGrading}
        onClose={onClose}
        isSaving={isSaving}
      />
    </div>
  );
}

// ─── MAIN EVALUATION MANAGER PAGE ─────────────────────────────────────────────
export default function EvaluationManager() {
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'completed'
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;

  // 1. COMBINE & DEDUPLICATE SUBMISSIONS
  const combinedSubmissions = useMemo(() => {
    const map = new Map();

    (allSubmissions || []).forEach(sub => {
      if (sub && sub.id) {
        map.set(String(sub.id), sub);
      }
    });

    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        if (!map.has(subKey)) {
          map.set(subKey, {
            ...sub,
            id: subKey,
            homeworkId: hw.id,
            testId: hw.id,
            testTitle: hw.title,
            subject: hw.subject,
            totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
            submittedAt: sub.completedAt || sub.submittedAt || new Date().toISOString()
          });
        }
      });
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks]);

  // 2. ENRICH EACH SUBMISSION
  const enrichedSubmissions = useMemo(() => {
    return combinedSubmissions.map(sub => {
      // A) Student Name
      let studentName = sub.studentName;
      const sId = String(sub.studentId || sub.userId || sub.user_id || '');
      if (!studentName || studentName === 'Öğrenci' || !studentName.trim()) {
        const matchedUser = (users || []).find(u => String(u.id) === sId || String(u.studentId) === sId);
        if (matchedUser && matchedUser.name) {
          studentName = matchedUser.name;
        } else if (sId) {
          studentName = `Öğrenci (#${sId.slice(-4)})`;
        } else {
          studentName = 'Öğrenci';
        }
      }

      // B) Test Title
      let targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.questionId || sub.id || '');
      let normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

      let matchedHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
      );

      let matchedBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId
      );

      let matchedBookTest = (bookTests || []).find(bt =>
        String(bt.id) === targetId ||
        String(bt.id) === normTargetId ||
        toUUID(bt.id) === targetId
      );

      let matchedCurTest = (curriculumData?.tests || []).find(t =>
        String(t.id) === targetId ||
        String(t.id) === normTargetId
      );

      let title = sub.testTitle || sub.homeworkTitle || sub.title;
      const isGeneric = !title || ['sınav', 'test', 'açık uçlu sınav kağıdı', 'değerlendirme dosyası', 'ödev', 'test sınavı'].includes(String(title).trim().toLowerCase());

      if (isGeneric) {
        if (matchedHw?.title) title = matchedHw.title;
        else if (matchedBankQ?.title || matchedBankQ?.questionText || matchedBankQ?.text) title = matchedBankQ.title || matchedBankQ.questionText || matchedBankQ.text;
        else if (matchedBookTest?.name || matchedBookTest?.title) title = matchedBookTest.name || matchedBookTest.title;
        else if (matchedCurTest?.title || matchedCurTest?.name) title = matchedCurTest.title || matchedCurTest.name;
        else title = 'Ödev / Sınav';
      }

      // C) Subject
      let subject = detectSubject(title, sub.subject || matchedHw?.subject || matchedBankQ?.subject || matchedCurTest?.subjectName);

      // D) Question Count
      let totalQ = sub.totalQuestions || matchedHw?.totalQuestions || matchedHw?.questionCount || matchedBankQ?.questionCount || (sub.answers?.length) || 1;

      // E) Score (0-100%)
      let score = sub.score;
      if (score !== undefined && score !== null) {
        score = Number(score);
        if (score > 100) {
          const maxPossible = totalQ * 10;
          score = maxPossible > 0 ? Math.min(100, Math.round((score / maxPossible) * 100)) : 100;
        } else {
          score = Math.max(0, Math.min(100, Math.round(score)));
        }
      }

      // F) Determine isPending
      const isAlreadyEvaluated = sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      let hasWrittenAnswers = false;
      if (Array.isArray(sub.answers)) {
        hasWrittenAnswers = sub.answers.some(a => a.userAnswerText && String(a.userAnswerText).trim().length > 0);
      }
      const isExplicitOpenEnded = sub.isOpenEnded || sub.questionType === 'acik_uclu' || sub.questionType === 'yazili' || sub.contentType === 'acik_uclu' || sub.contentType === 'yazili';
      const titleLower = String(title).toLowerCase();
      const hasOEKeywords = titleLower.includes('açık uçlu') || titleLower.includes('acik uclu') || titleLower.includes('yazılı') || titleLower.includes('yazili');

      const isPending = !isAlreadyEvaluated && (hasWrittenAnswers || isExplicitOpenEnded || hasOEKeywords);

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        totalQuestions: totalQ,
        score,
        isPending
      };
    });
  }, [combinedSubmissions, users, homeworks, allBankQuestions, bookTests, curriculumData]);

  // 3. FILTER BY TEACHER / ADMIN PERMISSION
  const scopedSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (sub.status === 'draft' || sub.status === 'in_progress') return false;

      if (!isAdmin) {
        if (!teacherId) return false;
        if (sub.id && String(sub.id).startsWith('sub_sample')) return false;

        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

        const hwMatch = (homeworks || []).find(h =>
          String(h.id) === targetId ||
          String(h.id) === normTargetId ||
          String(h.testId) === targetId ||
          (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
        );

        const hwIsMine = hwMatch && (
          String(hwMatch.createdBy) === String(teacherId) ||
          String(hwMatch.teacherId) === String(teacherId) ||
          String(hwMatch.assignedBy) === String(teacherId)
        );

        const subIsMine =
          String(sub.createdBy) === String(teacherId) ||
          String(sub.teacherId) === String(teacherId) ||
          String(sub.assignedBy) === String(teacherId);

        if (!hwIsMine && !subIsMine) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [enrichedSubmissions, homeworks, isAdmin, teacherId]);

  const pendingList = useMemo(() => {
    return scopedSubmissions.filter(s => s.isPending);
  }, [scopedSubmissions]);

  const completedList = useMemo(() => {
    return scopedSubmissions.filter(s => !s.isPending);
  }, [scopedSubmissions]);

  const activeDisplayList = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingList;
    else if (activeTab === 'completed') list = completedList;
    else list = scopedSubmissions;

    return list.filter(sub => {
      const sName = String(sub.studentName || '').toLowerCase();
      const tTitle = String(sub.testTitle || sub.title || '').toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || sName.includes(query) || tTitle.includes(query);

      const matchesSubject = subjectFilter === 'all' || (sub.subject && sub.subject === subjectFilter) || tTitle.includes(subjectFilter.toLowerCase());
      const matchesStudent = studentFilter === 'all' || String(sub.studentId) === String(studentFilter);

      return matchesSearch && matchesSubject && matchesStudent;
    });
  }, [activeTab, pendingList, completedList, scopedSubmissions, search, subjectFilter, studentFilter]);

  const allSubjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü', 'Genel Deneme', 'Genel Testler'];
  const studentUsers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '1rem', fontFamily: "'Inter', sans-serif" }}>
      {/* If an active submission is opened, render the FULL QUIZ REVIEW CONTAINER */}
      {activeSubmission && (
        <FullQuizReviewContainer
          submission={activeSubmission}
          allBankQuestions={allBankQuestions}
          homeworks={homeworks}
          curriculumData={curriculumData}
          bookTests={bookTests}
          books={books}
          onClose={() => setActiveSubmission(null)}
          onSaveSuccess={() => setActiveSubmission(null)}
        />
      )}

      {/* Main Evaluations List Dashboard */}
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Header Title & Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '1.25rem',
          padding: '1.25rem 1.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                <ClipboardCheck size={22} color="white" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Öğrenci Sınav &amp; Ödev Değerlendirme Merkezi
              </h1>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', fontWeight: 500 }}>
              Öğrencilerin çözdüğü tüm testleri orijinal sınav ekranında inceleyin, açık uçlu soruları puanlayın.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.85rem', padding: '0.55rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{pendingList.length}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fef3c7', textTransform: 'uppercase', marginTop: '0.2rem' }}>✍️ Not Bekleyen</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0.85rem', padding: '0.55rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{completedList.length}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d1fae5', textTransform: 'uppercase', marginTop: '0.2rem' }}>✅ Tamamlanan</div>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '0.85rem', padding: '0.55rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{scopedSubmissions.length}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e0e7ff', textTransform: 'uppercase', marginTop: '0.2rem' }}>📊 Toplam Sınav</div>
            </div>
          </div>
        </div>

        {/* Tabs & Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: '#1e293b',
          padding: '0.75rem 1rem',
          borderRadius: '1.1rem',
          border: '1px solid #334155'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '0.7rem',
                border: 'none',
                background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'pending' ? '#0f172a' : '#cbd5e1',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
              }}
            >
              <Edit3 size={14} /> Not Bekleyenler ({pendingList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '0.7rem',
                border: 'none',
                background: activeTab === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: activeTab === 'all' ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              <ClipboardList size={14} /> Tüm Sınavlar ({scopedSubmissions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: '0.7rem',
                border: 'none',
                background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              <CheckCircle2 size={14} /> Tamamlananlar ({completedList.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Öğrenci / sınav ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.85rem 0.45rem 2rem',
                  borderRadius: '0.65rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: 'white',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '0.65rem',
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="all">Tüm Dersler</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '0.65rem',
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="all">Tüm Öğrenciler</option>
              {studentUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Submissions Card Grid */}
        {activeDisplayList.length === 0 ? (
          <div style={{
            background: '#1e293b',
            borderRadius: '1.25rem',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2.5rem' }}>✨</div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc' }}>
              {activeTab === 'pending' ? 'Not Bekleyen Sınav Bulunmuyor' : 'Kayıtlı Sınav Bulunamadı'}
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', maxWidth: 380 }}>
              {activeTab === 'pending'
                ? 'Harika! Tüm öğrenci yazılı yanıtları başarıyla değerlendirilmiş durumda.'
                : 'Arama kriterlerinize uygun sınav kaydı bulunamadı.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem'
          }}>
            {activeDisplayList.map((sub) => {
              const isPending = sub.isPending;
              const scoreVal = sub.score !== undefined && sub.score !== null ? sub.score : null;
              const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tamamlandı';
              const totalQ = sub.totalQuestions || 1;
              const subConf = subjectThemes[sub.subject] || subjectThemes['Genel Testler'];

              return (
                <div
                  key={sub.id}
                  style={{
                    background: '#1e293b',
                    border: isPending ? '1.5px solid rgba(245,158,11,0.6)' : '1px solid #334155',
                    borderRadius: '1.1rem',
                    padding: '1.1rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isPending && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3.5,
                      background: 'linear-gradient(90deg, #f59e0b, #d97706)'
                    }} />
                  )}

                  <div>
                    {/* Student & Date Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 900, fontSize: '0.88rem',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                        }}>
                          {sub.studentName?.charAt(0) || 'Ö'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#f8fafc' }}>
                            {sub.studentName || 'Öğrenci'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock3 size={11} /> {dateStr}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {isPending ? (
                        <span style={{
                          background: 'rgba(245,158,11,0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245,158,11,0.4)',
                          padding: '0.18rem 0.55rem',
                          borderRadius: '50px',
                          fontWeight: 900,
                          fontSize: '0.68rem'
                        }}>
                          ✍️ Not Bekliyor
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(16,185,129,0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.4)',
                          padding: '0.18rem 0.55rem',
                          borderRadius: '50px',
                          fontWeight: 900,
                          fontSize: '0.68rem'
                        }}>
                          ✓ Tamamlandı
                        </span>
                      )}
                    </div>

                    {/* Exam Title */}
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9', lineHeight: 1.35, marginBottom: '0.45rem' }}>
                      {sub.testTitle || 'Ödev / Sınav'}
                    </div>

                    {/* Info Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <span style={{ background: '#0f172a', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: '1px solid #334155' }}>
                        📝 {totalQ} Soru
                      </span>
                      <span style={{ background: subConf.bg, color: subConf.color, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 800, border: `1px solid ${subConf.border}` }}>
                        {subConf.icon} {sub.subject}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action & Score Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                    <div>
                      {scoreVal !== null && (
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: scoreVal >= 70 ? '#34d399' : (scoreVal >= 50 ? '#fbbf24' : '#f87171') }}>
                          %{scoreVal}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubmission(sub)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.7rem',
                        border: 'none',
                        background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: isPending ? '#0f172a' : 'white',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: isPending ? '0 4px 12px rgba(245,158,11,0.35)' : '0 4px 12px rgba(99,102,241,0.3)'
                      }}
                    >
                      {isPending ? <Edit3 size={14} /> : <Eye size={14} />}
                      <span>{isPending ? 'Değerlendir & Not Ver' : 'Sınavı & Çözümü İncele'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
