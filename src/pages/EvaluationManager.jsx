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
  ClipboardList, Users, BookOpen, Star, ChevronRight, ChevronDown, ChevronUp,
  AlertCircle, Search, Filter, Layers, MessageSquare, Award,
  Sparkles, Check, Edit3, Send, FileText, Globe, Image as ImageIcon,
  RotateCcw, Trophy, ThumbsUp, ThumbsDown, CheckCircle, HelpCircle,
  ClipboardCheck
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

  const totalQuestions = questions?.length || submission?.answers?.length || 1;
  const questionsList = questions && questions.length > 0 ? questions : (submission?.answers || []);

  const totalScore = useMemo(() => {
    return Object.values(questionScores).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [questionScores]);

  const maxScore = totalQuestions * 10;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const currentAns = (submission?.answers || []).find(a => (a.questionNo || 0) === activeQNo) || (submission?.answers || [])[activeQNo - 1] || {};
  const currentQObj = questionsList[activeQNo - 1] || {};
  const currentScore = questionScores[activeQNo] ?? (currentAns.score !== undefined ? currentAns.score : (currentAns.isCorrect === true ? 10 : 0));
  const currentNote = teacherNotes[activeQNo] ?? (currentAns.teacherNote || '');

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.96)',
      backdropFilter: 'blur(20px)',
      borderTop: '2px solid #334155',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Top Toggle Bar */}
      <div style={{
        padding: '0.5rem 1.5rem',
        background: '#1e293b',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '0.6rem', padding: '0.4rem 0.85rem',
              color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Değerlendirmelere Dön
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#38bdf8' }}>
              ✍️ Öğretmen Değerlendirme &amp; Notlandırma Modu
            </span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.15rem 0.55rem', borderRadius: '50px', fontWeight: 800 }}>
              {submission.studentName || 'Öğrenci'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Live Score Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            color: '#e0e7ff', padding: '0.35rem 0.85rem', borderRadius: '0.75rem',
            fontWeight: 900, fontSize: '0.85rem', border: '1px solid #6366f1',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}>
            <span>🎯 Not:</span>
            <span style={{ color: '#34d399' }}>{totalScore} / {maxScore}</span>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>(%{percentage})</span>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '0.75rem',
              padding: '0.5rem 1.25rem',
              color: 'white', fontWeight: 900, fontSize: '0.86rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.45)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla'}
          </button>

          {/* Collapse/Expand toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(p => !p)}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: '0.5rem', padding: '0.4rem 0.65rem',
              color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.75rem', fontWeight: 700
            }}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isCollapsed ? 'Not Paneli' : 'Gizle'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Grading Details Body */}
      {!isCollapsed && (
        <div style={{
          padding: '1rem 1.5rem',
          maxHeight: '260px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 320px) 1fr 1fr',
          gap: '1.25rem',
          alignItems: 'start'
        }}>
          {/* 1. Question Navigator Pills */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Sorular ({totalQuestions})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
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
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>S.{qNo}</span>
                    {score !== undefined && (
                      <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>({score}p)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Active Question Scoring & Notes */}
          <div style={{ background: '#1e293b', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#fbbf24' }}>
                ✍️ Soru {activeQNo} Puanı &amp; Notu
              </span>

              {/* Quick Score Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setQuestionScores(p => ({ ...p, [activeQNo]: 10 }))}
                  style={{
                    padding: '0.25rem 0.55rem', borderRadius: '0.45rem',
                    border: '1px solid #059669',
                    background: currentScore === 10 ? '#064e3b' : 'rgba(6,78,59,0.3)',
                    color: '#34d399', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer'
                  }}
                >
                  ✓ 10 Puan
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionScores(p => ({ ...p, [activeQNo]: 5 }))}
                  style={{
                    padding: '0.25rem 0.55rem', borderRadius: '0.45rem',
                    border: '1px solid #d97706',
                    background: currentScore === 5 ? '#78350f' : 'rgba(120,53,15,0.3)',
                    color: '#fef3c7', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer'
                  }}
                >
                  ½ 5 Puan
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionScores(p => ({ ...p, [activeQNo]: 0 }))}
                  style={{
                    padding: '0.25rem 0.55rem', borderRadius: '0.45rem',
                    border: '1px solid #dc2626',
                    background: currentScore === 0 ? '#7f1d1d' : 'rgba(127,29,29,0.3)',
                    color: '#f87171', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer'
                  }}
                >
                  ✕ 0 Puan
                </button>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={currentScore}
                  onChange={e => setQuestionScores(p => ({ ...p, [activeQNo]: Math.max(0, Math.min(10, Number(e.target.value))) }))}
                  style={{
                    width: '46px', padding: '0.25rem', borderRadius: '0.45rem',
                    background: '#0f172a', border: '1px solid #6366f1',
                    color: '#e0e7ff', fontWeight: 900, textAlign: 'center', fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {/* Student Answer Snippet */}
            {currentAns.userAnswerText && (
              <div style={{ background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.6rem', fontSize: '0.8rem', color: '#e2e8f0', border: '1px solid #334155' }}>
                <span style={{ color: '#fbbf24', fontWeight: 800 }}>Öğrenci Yanıtı: </span>
                <span>{currentAns.userAnswerText}</span>
              </div>
            )}

            <input
              type="text"
              placeholder={`Soru ${activeQNo} için öğretmenin notu (Örn: Çözüm yöntemi doğru)...`}
              value={currentNote}
              onChange={e => setTeacherNotes(p => ({ ...p, [activeQNo]: e.target.value }))}
              style={{
                width: '100%', padding: '0.45rem 0.75rem', borderRadius: '0.55rem',
                background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 3. Overall Feedback Textarea */}
          <div style={{ background: '#1e293b', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#818cf8', marginBottom: '0.4rem' }}>
              💬 Sınavın Geneli İçin Öğrenciye Karne Mesajı
            </div>
            <textarea
              rows="3"
              placeholder="Öğrencinin bu sınavdaki genel başarısı ve önerileriniz..."
              value={overallFeedback}
              onChange={e => setOverallFeedback(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem',
                background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                fontSize: '0.8rem', outline: 'none', resize: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FULL QUIZ REVIEW CONTAINER (EXACT STUDENT SOLVER & REVIEW INTERFACE) ────
function FullQuizReviewContainer({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
  const { updateSubmission, evaluateAnswer, finalizeSubmission } = useEvaluation();
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
        (submission.answers || []).forEach((ans, idx) => {
          const qNo = ans.questionNo || (idx + 1);
          scores[qNo] = ans.score !== undefined ? ans.score : (ans.isCorrect === true ? 10 : (ans.isCorrect === false ? 0 : 0));
          notes[qNo] = ans.teacherNote || '';
        });

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
      const totalScore = Object.values(questionScores).reduce((sum, v) => sum + (Number(v) || 0), 0);
      const totalQ = questions?.length || submission?.answers?.length || 1;
      const maxPossible = totalQ * 10;
      const computedPercentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

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

  // Filter Submissions scoped to teacher / admin
  const scopedSubmissions = useMemo(() => {
    return (allSubmissions || []).filter(sub => {
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
    });
  }, [allSubmissions, homeworks, isAdmin, teacherId]);

  // Determine if a submission has open-ended written questions that need grading
  const isSubmissionPendingGrading = (sub) => {
    const isDone = sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
    if (isDone) return false;

    const answers = sub.answers || [];
    const hasWrittenText = answers.some(a => a.userAnswerText && String(a.userAnswerText).trim().length > 0);
    if (hasWrittenText) return true;

    if (sub.isOpenEnded || sub.questionType === 'acik_uclu' || sub.questionType === 'yazili' || sub.contentType === 'acik_uclu' || sub.contentType === 'yazili') {
      return true;
    }

    const titleLower = String(sub.testTitle || sub.title || '').toLowerCase();
    if (titleLower.includes('açık uçlu') || titleLower.includes('acik uclu') || titleLower.includes('yazılı') || titleLower.includes('yazili')) {
      return true;
    }

    return false;
  };

  const pendingList = useMemo(() => {
    return scopedSubmissions.filter(s => isSubmissionPendingGrading(s));
  }, [scopedSubmissions]);

  const completedList = useMemo(() => {
    return scopedSubmissions.filter(s => !isSubmissionPendingGrading(s));
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

  const allSubjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü'];
  const studentUsers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '1.5rem', fontFamily: "'Inter', sans-serif" }}>
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
          onSaveSuccess={(updated) => {
            setActiveSubmission(null);
          }}
        />
      )}

      {/* Main Evaluations List Dashboard */}
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header Title & Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '1.5rem',
          padding: '1.75rem 2rem',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.9rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                <ClipboardCheck size={24} color="white" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Öğrenci Sınav &amp; Ödev Değerlendirme Merkezi
              </h1>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', fontWeight: 500 }}>
              Öğrencilerin çözdüğü tüm testleri orijinal çözüm ekranında inceleyin, açık uçlu soruları puanlayıp notlandırın.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '1rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{pendingList.length}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fef3c7', textTransform: 'uppercase', marginTop: '0.25rem' }}>✍️ Not Bekleyen</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '1rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{completedList.length}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d1fae5', textTransform: 'uppercase', marginTop: '0.25rem' }}>✅ Tamamlanan</div>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '1rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{scopedSubmissions.length}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e0e7ff', textTransform: 'uppercase', marginTop: '0.25rem' }}>📊 Toplam Sınav</div>
            </div>
          </div>
        </div>

        {/* Tabs & Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#1e293b',
          padding: '0.85rem 1.25rem',
          borderRadius: '1.25rem',
          border: '1px solid #334155'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'pending' ? '#0f172a' : '#cbd5e1',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: activeTab === 'pending' ? '0 4px 14px rgba(245,158,11,0.3)' : 'none'
              }}
            >
              <Edit3 size={15} /> Not Bekleyenler ({pendingList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeTab === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: activeTab === 'all' ? '0 4px 14px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              <ClipboardList size={15} /> Tüm Sınavlar ({scopedSubmissions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: activeTab === 'completed' ? '0 4px 14px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              <CheckCircle2 size={15} /> Tamamlananlar ({completedList.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Öğrenci veya sınav ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '0.5rem 1rem 0.5rem 2.2rem',
                  borderRadius: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: 'white',
                  fontSize: '0.82rem',
                  outline: 'none',
                  minWidth: 200
                }}
              />
            </div>

            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '0.75rem',
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.82rem',
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
                padding: '0.5rem 0.85rem',
                borderRadius: '0.75rem',
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.82rem',
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
            borderRadius: '1.5rem',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '3rem' }}>✨</div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
              {activeTab === 'pending' ? 'Not Bekleyen Sınav Bulunmuyor' : 'Kayıtlı Sınav Bulunamadı'}
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', maxWidth: 420 }}>
              {activeTab === 'pending'
                ? 'Harika! Tüm öğrenci yazılı yanıtları ve açık uçlu sınavlar başarıyla değerlendirilmiş durumda.'
                : 'Arama kriterlerinize uygun öğrenci sınav kaydı bulunamadı.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {activeDisplayList.map((sub) => {
              const isPending = isSubmissionPendingGrading(sub);
              const scoreVal = sub.score !== undefined ? sub.score : null;
              const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tamamlandı';
              const totalQ = sub.totalQuestions || (sub.answers?.length) || 1;

              return (
                <div
                  key={sub.id}
                  style={{
                    background: '#1e293b',
                    border: isPending ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid #334155',
                    borderRadius: '1.25rem',
                    padding: '1.25rem',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
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
                      height: 4,
                      background: 'linear-gradient(90deg, #f59e0b, #d97706)'
                    }} />
                  )}

                  <div>
                    {/* Student & Date Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 900, fontSize: '0.9rem'
                        }}>
                          {sub.studentName?.charAt(0) || 'Ö'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#f8fafc' }}>
                            {sub.studentName || 'Öğrenci'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock3 size={12} /> {dateStr}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {isPending ? (
                        <span style={{
                          background: 'rgba(245,158,11,0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245,158,11,0.4)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '50px',
                          fontWeight: 900,
                          fontSize: '0.7rem'
                        }}>
                          ✍️ Not Bekliyor
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(16,185,129,0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.4)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '50px',
                          fontWeight: 900,
                          fontSize: '0.7rem'
                        }}>
                          ✓ Tamamlandı
                        </span>
                      )}
                    </div>

                    {/* Exam Title */}
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f1f5f9', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                      {sub.testTitle || sub.title || 'Sınav / Ödev'}
                    </div>

                    {/* Info Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ background: '#0f172a', color: '#94a3b8', padding: '0.15rem 0.55rem', borderRadius: '0.45rem', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #334155' }}>
                        📝 {totalQ} Soru
                      </span>
                      {sub.subject && (
                        <span style={{ background: '#0f172a', color: '#818cf8', padding: '0.15rem 0.55rem', borderRadius: '0.45rem', fontSize: '0.7rem', fontWeight: 800, border: '1px solid #334155' }}>
                          📚 {sub.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action & Score Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '0.85rem' }}>
                    <div>
                      {scoreVal !== null && (
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: scoreVal >= 70 ? '#34d399' : (scoreVal >= 50 ? '#fbbf24' : '#f87171') }}>
                          %{scoreVal}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubmission(sub)}
                      style={{
                        padding: '0.55rem 1.15rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: isPending ? '#0f172a' : 'white',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: isPending ? '0 4px 14px rgba(245,158,11,0.35)' : '0 4px 14px rgba(99,102,241,0.3)'
                      }}
                    >
                      {isPending ? <Edit3 size={15} /> : <Eye size={15} />}
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
