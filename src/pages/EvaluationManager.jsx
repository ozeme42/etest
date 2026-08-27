import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ClipboardCheck, Ruler, TestTube2, BookCopy, Zap, Plus, Minus, Maximize2
} from 'lucide-react';

import PdfQuizReview from '../components/quiz/review/PdfQuizReview';
import HtmlQuizReview from '../components/quiz/review/HtmlQuizReview';
import ImageQuizReview from '../components/quiz/review/ImageQuizReview';
import StandardQuizReview from '../components/quiz/review/StandardQuizReview';
import PhysicalQuizReview from '../components/quiz/review/PhysicalQuizReview';
import MultiHomeworkRunner, { resolveExactQuestionCount } from '../components/quiz/runner/MultiHomeworkRunner';
import ImageLightbox, { StandardImageFrame } from '../components/quiz/common/ImageLightbox';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';

import { resolveTestQuestions } from '../utils/testResolver';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';

import { detectSubject, subjectThemes, QUICK_FEEDBACK_PRESETS, isItemOpenEnded } from '../features/evaluation/constants/evaluationConstants';
import SmartEvaluationModal from '../features/evaluation/components/SmartEvaluationModal';
import { getAiUsageMapForTest } from '../services/aiUsageLogService';

export default function EvaluationManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions, approveSubmission, rejectSubmission, deleteSubmission } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Kitap takibi / "Tüm Kitap Görevi" tipindeki ödevleri gizle
  const isTrackedBookHw = (hw) => {
    if (!hw) return false;
    if (hw.isBookAssignment === true || hw.sourceType === 'trackedBook') return true;
    if (hw.bookId || hw.bookTestId) return true;
    const t = String(hw.title || '').toLowerCase();
    if (t.includes('(tüm kitap') || t.includes('(kendi eklediğim)')) return true;
    return false;
  };

  const isAdmin = currentUser?.role === 'admin';
  const teacherId = currentUser?.id;

  const combinedSubmissions = useMemo(() => {
    const activeHws = (homeworks || []).filter(hw => hw && hw.id && !isTrackedBookHw(hw));
    const map = new Map();

    activeHws.forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        map.set(subKey, {
          ...sub,
          id: subKey,
          homeworkId: hw.id,
          hwId: hw.id,
          testId: hw.id,
          testTitle: hw.title,
          subject: hw.subject,
          totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
          submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
        });
      });

      (allSubmissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.id || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
        
        const matchesHw = String(hw.id) === targetId ||
          String(hw.id) === normTargetId ||
          String(hw.id) === String(sub.hwId) ||
          String(hw.id) === String(sub.homeworkId) ||
          (hw.submissions && hw.submissions.some(s => String(s.id) === String(sub.id)));

        if (matchesHw) {
          const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
          const existing = map.get(subKey);
          if (!existing || (sub.isEvaluatedByTeacher && !existing.isEvaluatedByTeacher) || new Date(sub.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
            map.set(subKey, {
              ...sub,
              id: subKey,
              homeworkId: hw.id,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              subject: hw.subject,
              totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
              submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
            });
          }
        }
      });
    });

    // Also include all manual test submissions
    (allSubmissions || []).forEach(sub => {
      if (!sub || !sub.studentId) return;
      if (sub.isManual || sub.sourceType === 'manual_test') {
        const subKey = String(sub.id || `manual_sub_${sub.studentId}_${Date.now()}`);
        map.set(subKey, {
          ...sub,
          id: subKey,
          isManual: true,
          testTitle: sub.title || sub.testTitle || 'Manuel Test',
          bookTitle: sub.bookTitle || 'Kitap / Çalışma Kaynağı',
          subject: sub.subject || 'Genel',
          totalQuestions: sub.totalQuestions || ((sub.correctCount || 0) + (sub.wrongCount || 0) + (sub.emptyCount || 0)) || 20,
          submittedAt: sub.submittedAt || sub.completedAt || sub.createdAt || new Date().toISOString()
        });
      }
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks]);

  const enrichedSubmissions = useMemo(() => {
    return combinedSubmissions.map(sub => {
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

      let subject = detectSubject(title, sub.subject || matchedHw?.subject || matchedBankQ?.subject || matchedCurTest?.subjectName);

      const ansList = Array.isArray(sub.answers) ? sub.answers : [];
      let totalQ = resolveExactQuestionCount(matchedHw || {}, matchedBankQ || {}, matchedBankQ || {}, [], matchedBankQ?.imageUrls || []);
      if (totalQ <= 1 && ansList.length > 1) totalQ = ansList.length;
      if (totalQ <= 1 && sub.totalQuestions) totalQ = sub.totalQuestions;

      let score = sub.score;
      if (score === undefined || score === null) {
        score = sub.scorePercentage;
      }
      if (score !== undefined && score !== null) {
        score = Number(score);
        if (score > 100) {
          const maxPossible = totalQ * 10;
          score = maxPossible > 0 ? Math.min(100, Math.round((score / maxPossible) * 100)) : 100;
        } else {
          score = Math.max(0, Math.min(100, Math.round(score)));
        }
      }

      const isManual = Boolean(sub.isManual || sub.sourceType === 'manual_test');
      const isManualPending = isManual && (sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected'));
      const isManualApproved = isManual && (sub.approvalStatus === 'approved' || sub.isApproved === true || sub.status === 'completed');
      const isManualRejected = isManual && (sub.approvalStatus === 'rejected' || sub.status === 'rejected');

      const isAlreadyEvaluated = Boolean(
        sub.isEvaluatedByTeacher === true ||
        sub.isEvaluated === true ||
        sub.status === 'evaluated' ||
        sub.status === 'graded' ||
        sub.evaluatedByTeacher === true ||
        Boolean(sub.teacherFeedback || sub.teacherNote) ||
        Boolean(sub.teacherScores && Object.keys(sub.teacherScores).length > 0) ||
        Boolean(sub.evaluatedAt && (sub.teacherFeedback || sub.teacherNote || sub.isEvaluated || sub.status === 'evaluated')) ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.evaluatedByTeacher === true || (a.score !== undefined && a.score !== null && a.score !== 'empty' && a.score !== 'pending')))
      );

      let hasWrittenAnswers = false;
      if (Array.isArray(sub.answers)) {
        hasWrittenAnswers = sub.answers.some(a => 
          (a.userAnswerText && String(a.userAnswerText).trim().length > 0) ||
          a.isOpenEnded === true ||
          a.is_open_ended === true ||
          ['acik_uclu', 'yazili', 'open_ended'].includes(a.questionType || a.type)
        );
      }

      let hasOpenEndedSection = false;
      if (sub.sections && typeof sub.sections === 'object') {
        hasOpenEndedSection = Object.values(sub.sections).some(sec => 
          sec.type === 'open_ended' ||
          (sec.openEndedText && Object.values(sec.openEndedText).some(t => t && String(t).trim().length > 0))
        );
      }

      const isExplicitOpenEnded = Boolean(
        sub.isOpenEnded === true ||
        sub.questionType === 'acik_uclu' ||
        sub.questionType === 'yazili' ||
        sub.questionType === 'open_ended' ||
        sub.contentType === 'acik_uclu' ||
        sub.contentType === 'yazili' ||
        sub.contentType === 'open_ended' ||
        sub.type === 'open_ended' ||
        sub.type === 'acik_uclu' ||
        matchedBankQ?.type === 'open_ended' ||
        matchedBankQ?.type === 'acik_uclu' ||
        matchedHw?.type === 'open_ended' ||
        matchedBankQ?.isOpenEnded ||
        matchedHw?.isOpenEnded ||
        hasOpenEndedSection ||
        hasWrittenAnswers
      );

      const titleLower = String(title).toLowerCase();
      const hasOEKeywords = titleLower.includes('açık uçlu') ||
                            titleLower.includes('acik uclu') ||
                            titleLower.includes('klasik sınav') ||
                            titleLower.includes('yazılı sınav') ||
                            titleLower.includes('klasik yazılı') ||
                            titleLower.includes('yazılı kağıdı') ||
                            titleLower.includes('pdfaç') ||
                            titleLower.includes('görsel soru');

      const isPureMC = !hasWrittenAnswers && !hasOpenEndedSection && (
        sub.type === 'multiple_choice' ||
        sub.questionType === 'multiple_choice' ||
        sub.contentType === 'multiple_choice' ||
        sub.contentType === 'coktan_secmeli' ||
        matchedHw?.type === 'multiple_choice' ||
        matchedBankQ?.type === 'multiple_choice' ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.every(a => 
          typeof a === 'number' || typeof a === 'string' ||
          (!a.isOpenEnded && !a.is_open_ended && a.type !== 'open_ended' && a.questionType !== 'acik_uclu' &&
          (!a.userAnswerText || String(a.userAnswerText).trim().length === 0))
        ))
      );

      const isOpenEndedExam = !isPureMC && (isExplicitOpenEnded || (hasOEKeywords && !isPureMC) || hasWrittenAnswers);

      const isPending = isManual
        ? isManualPending
        : (!isAlreadyEvaluated && isOpenEndedExam);

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        totalQuestions: totalQ,
        score,
        isManual,
        isManualPending,
        isManualApproved,
        isManualRejected,
        isPending
      };
    });
  }, [combinedSubmissions, users, homeworks, allBankQuestions, bookTests, curriculumData]);

  const scopedSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (sub.status === 'draft' || sub.status === 'in_progress') return false;
      if (sub.isManual) return false; // Manuel testler Onay Merkezi sayfasında yönetilir

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
  }, [enrichedSubmissions, homeworks, isAdmin, teacherId, users]);

  const pendingExamList = useMemo(() => scopedSubmissions.filter(s => s.isPending), [scopedSubmissions]);
  const completedList = useMemo(() => scopedSubmissions.filter(s => !s.isPending), [scopedSubmissions]);

  // Manuel test onay sayısı bildirimi için (Onay Merkezi bağlantısı)
  const manualPendingCount = useMemo(() => {
    return enrichedSubmissions.filter(s => s.isManual && s.isManualPending).length;
  }, [enrichedSubmissions]);

  const avgEvaluatedScore = useMemo(() => {
    const scored = completedList.filter(s => s.score !== null && s.score !== undefined);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((acc, s) => acc + s.score, 0) / scored.length);
  }, [completedList]);

  const activeDisplayList = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingExamList;
    else if (activeTab === 'completed') list = completedList;
    else list = scopedSubmissions;

    return list.filter(sub => {
      const sName = String(sub.studentName || '').toLowerCase();
      const tTitle = String(sub.testTitle || sub.title || '').toLowerCase();
      const bTitle = String(sub.bookTitle || '').toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || sName.includes(query) || tTitle.includes(query) || bTitle.includes(query);

      const matchesSubject = subjectFilter === 'all' || (sub.subject && sub.subject === subjectFilter) || tTitle.includes(subjectFilter.toLowerCase());
      const matchesStudent = studentFilter === 'all' || String(sub.studentId) === String(studentFilter);

      return matchesSearch && matchesSubject && matchesStudent;
    });
  }, [activeTab, pendingExamList, completedList, scopedSubmissions, search, subjectFilter, studentFilter]);

  const allSubjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü', 'Genel Deneme', 'Genel Testler'];
  const studentUsers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      padding: '1.25rem 1.5rem 5rem 1.5rem',
      background: 'var(--color-bg)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>

      {activeSubmission && (
        <SmartEvaluationModal
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

      {/* Manuel Test Onay Merkezi Yönlendirme Bildirimi */}
      {manualPendingCount > 0 && (
        <div
          onClick={() => navigate('/approvals')}
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(168, 85, 247, 0.12))',
            border: '1.5px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '1.25rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.25rem' }}>⏳</span>
            <div>
              <strong style={{ color: '#7c3aed', fontSize: '0.88rem' }}>
                Öğrencilere ait {manualPendingCount} adet manuel test sonucu onay bekliyor!
              </strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Manuel test onaylarını ve incelemelerini <strong>Onay Merkezi</strong> sayfasından kolayca gerçekleştirebilirsiniz.
              </div>
            </div>
          </div>
          <button
            type="button"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: 'white',
              border: 'none',
              borderRadius: '0.65rem',
              padding: '0.45rem 0.9rem',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Onay Merkezi'ne Git →
          </button>
        </div>
      )}

      <header style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.75rem',
        boxShadow: '0 8px 30px -4px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '1.1rem',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 20px -2px rgba(79, 70, 229, 0.4)'
          }}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Sınav Değerlendirmeleri
              </h1>
              <span style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366f1',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: 99,
                border: '1px solid rgba(165, 180, 252, 0.35)'
              }}>
                {isAdmin ? 'Yönetici Modu' : 'Öğretmen Portalı'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Yazılı sınav kağıtlarını ve öğrenci cevaplarını inceleyip puanlayın
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pendingExamList.length > 0 ? '#f59e0b' : '#10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {pendingExamList.length} Yazılı Bekliyor
            </span>
          </div>

          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Trophy size={14} color="#f59e0b" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Ort. %{avgEvaluatedScore}
            </span>
          </div>
        </div>
      </header>

      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '0.7rem', border: 'none',
              background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-surface-hover)',
              color: activeTab === 'pending' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(245,158,11,0.25)' : 'none'
            }}
          >
            <Edit3 size={14} /> Yazılı Not Bekleyenler ({pendingExamList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '0.7rem', border: 'none',
              background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--color-surface-hover)',
              color: activeTab === 'completed' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'
            }}
          >
            <CheckCircle2 size={14} /> Değerlendirilenler ({completedList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '0.7rem', border: 'none',
              background: activeTab === 'all' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--color-surface-hover)',
              color: activeTab === 'all' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: activeTab === 'all' ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
            }}
          >
            <ClipboardList size={14} /> Tüm Sınavlar ({scopedSubmissions.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Öğrenci, kitap veya sınav ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.85rem 0.5rem 2rem', borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.65rem',
              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none'
            }}
          >
            <option value="all">Tüm Dersler</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={studentFilter}
            onChange={e => setStudentFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.65rem',
              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none'
            }}
          >
            <option value="all">Tüm Öğrenciler</option>
            {studentUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {activeDisplayList.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '1.5rem', padding: '3.5rem 1.5rem', textAlign: 'center',
          border: '1.5px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem'
        }}>
          <Sparkles size={44} style={{ opacity: 0.35, color: '#6366f1' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {activeTab === 'manual_pending'
              ? 'Onay Bekleyen Manuel Test Bulunmuyor'
              : (activeTab === 'pending' ? 'Not Bekleyen Yazılı Sınav Bulunmuyor' : 'Kayıtlı Sınav / Test Bulunamadı')}
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem', maxWidth: 420 }}>
            {activeTab === 'manual_pending'
              ? 'Harika! Öğrenciler tarafından eklenen tüm manuel testler onaylanmış veya incelenmiş durumda.'
              : (activeTab === 'pending'
                ? 'Tüm öğrenci yazılı yanıtları başarıyla değerlendirilmiş durumda.'
                : 'Arama kriterlerinize uygun kayıt bulunamadı.')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {activeDisplayList.map((sub) => {
            const isManual = sub.isManual;
            const isPending = sub.isPending;
            const isManualPending = sub.isManualPending;
            const isManualApproved = sub.isManualApproved;
            const isManualRejected = sub.isManualRejected;

            const scoreVal = sub.score !== undefined && sub.score !== null ? sub.score : null;
            const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tamamlandı';
            const totalQ = sub.totalQuestions || 1;
            const subConf = subjectThemes[sub.subject] || subjectThemes['Genel Testler'];
            const isBusy = processingId === sub.id;

            return (
              <div
                key={sub.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isPending ? (isManual ? '1.5px solid #a855f7' : '1.5px solid #fbbf24') : '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem', padding: '1.25rem',
                  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative', overflow: 'hidden',
                  opacity: isBusy ? 0.6 : 1
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {isPending && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3.5,
                    background: isManual ? 'linear-gradient(90deg, #7c3aed, #a855f7)' : 'linear-gradient(90deg, #f59e0b, #d97706)'
                  }} />
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: '0.88rem',
                        boxShadow: '0 2px 8px rgba(99,102,241,0.2)', border: '1.5px solid var(--color-surface)'
                      }}>
                        {sub.studentName?.charAt(0) || 'Ö'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {sub.studentName || 'Öğrenci'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock3 size={11} /> {dateStr}
                        </div>
                      </div>
                    </div>

                    {isManual ? (
                      isManualPending ? (
                        <span style={{
                          background: 'rgba(124, 58, 237, 0.15)', color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          padding: '0.2rem 0.6rem', borderRadius: 99,
                          fontWeight: 900, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3
                        }}>
                          ⏳ Onay Bekliyor
                        </span>
                      ) : isManualRejected ? (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          padding: '0.2rem 0.6rem', borderRadius: 99,
                          fontWeight: 900, fontSize: '0.68rem'
                        }}>
                          ❌ Reddedildi
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          padding: '0.2rem 0.6rem', borderRadius: 99,
                          fontWeight: 900, fontSize: '0.68rem'
                        }}>
                          ✓ Onaylandı
                        </span>
                      )
                    ) : isPending ? (
                      <span style={{
                        background: 'rgba(245,158,11,0.12)', color: '#fbbf24',
                        border: '1px solid rgba(245,158,11,0.25)',
                        padding: '0.2rem 0.6rem', borderRadius: 99,
                        fontWeight: 900, fontSize: '0.68rem'
                      }}>
                        ✍️ Not Bekliyor
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(16,185,129,0.12)', color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.25)',
                        padding: '0.2rem 0.6rem', borderRadius: 99,
                        fontWeight: 900, fontSize: '0.68rem'
                      }}>
                        ✓ Tamamlandı
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.35, marginBottom: '0.35rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.testTitle || 'Ödev / Sınav'}
                  </div>

                  {sub.bookTitle && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={12} color="#818cf8" />
                      <span>{sub.bookTitle}</span>
                      {sub.unitTopic && <span style={{ opacity: 0.8 }}>• 📌 {sub.unitTopic}</span>}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: '1px solid var(--color-border)' }}>
                      📝 {totalQ} Soru
                    </span>
                    <span style={{ background: subConf.bg, color: subConf.color, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.68rem', fontWeight: 800, border: `1px solid ${subConf.border}` }}>
                      {subConf.icon} {sub.subject}
                    </span>
                    {(() => {
                      const aiMap = getAiUsageMapForTest(sub.testId || sub.id, sub.studentId || sub.userId);
                      const aiQuestionCount = Object.keys(aiMap).length;
                      if (aiQuestionCount === 0) return null;
                      return (
                        <span
                          title={`Öğrenci bu sınavda ${aiQuestionCount} soruda yapay zeka çözümü incelemiştir.`}
                          style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.12))',
                            color: '#7c3aed',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.45rem',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            border: '1px solid #c084fc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <Sparkles size={11} color="#a855f7" />
                          <span>✨ {aiQuestionCount} Soru AI</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', gap: 6, flexWrap: 'wrap' }}>
                  <div>
                    {scoreVal !== null && (
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: scoreVal >= 70 ? '#10b981' : (scoreVal >= 50 ? '#f59e0b' : '#ef4444') }}>
                        %{scoreVal}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubmission(sub)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.7rem', border: 'none',
                      background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: '#ffffff',
                      fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      boxShadow: isPending ? '0 4px 12px rgba(245,158,11,0.25)' : '0 4px 12px rgba(99,102,241,0.25)'
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
  );
}
