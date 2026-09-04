import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Clock3, Edit3, Trash2, Plus, BookOpen, Award,
  AlertCircle, CheckCircle2, Search, Sparkles, User,
  Calendar, Layers, ShieldCheck, CheckCheck, RefreshCw,
  FileText, BarChart3, TrendingUp, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useHomework } from '../context/HomeworkContext';
import { useTheme } from '../context/ThemeContext';
import ManualTestModal from '../components/ManualTestModal';

const subjectThemes = {
  'Türkçe': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', icon: '📖' },
  'Matematik': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)', icon: '📐' },
  'Fen Bilimleri': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)', icon: '🔬' },
  'Sosyal Bilgiler': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', icon: '🌍' },
  'İngilizce': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)', icon: '🔤' },
  'Din Kültürü': { bg: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)', icon: '🌙' },
  'Genel Deneme': { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)', icon: '🏛️' },
  'Genel Testler': { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)', icon: '📝' }
};

export default function ApprovalsPage() {
  const { isDark } = useTheme();
  const { currentUser, users = [] } = useAuth();
  const {
    submissions = [],
    approveSubmission,
    rejectSubmission,
    deleteSubmission,
    refreshSubmissions,
    isSyncing
  } = useEvaluation();
  const {
    mockExams = [],
    approveMockExam,
    rejectMockExam,
    deleteMockExam,
    updateMockExam
  } = useCoaching();
  const { homeworks = [] } = useHomework();
  const navigate = useNavigate();

  // ONLY 2 Primary Tabs: Manuel Testler & Manuel Denemeler (plus Geçmiş)
  const [activeMainTab, setActiveMainTab] = useState('manual_tests'); // 'manual_tests' | 'manual_mocks' | 'history'
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');

  const [processingId, setProcessingId] = useState(null);
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Manual Test Modal state for adding or editing
  const [manualModalData, setManualModalData] = useState({ isOpen: false, data: null });

  const teacherId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';

  // Student Users List
  const studentUsers = useMemo(() => {
    return (users || []).filter(u => u.role === 'student' || !u.role);
  }, [users]);

  // 1. MANUEL TESTLER (Sadece Elle Girilen Kitap / Konu / Ödev Testleri)
  const enrichedManualTests = useMemo(() => {
    return (submissions || [])
      .filter(sub => {
        if (!sub) return false;
        if (sub.status === 'draft' || sub.status === 'in_progress') return false;

        // Dijital/Online çözülen testleri ve optik sınavları kesinlikle dahil etme
        if (
          sub.sourceType === 'trackedBook' ||
          sub.sourceType === 'online_quiz' ||
          sub.sourceType === 'modular_quiz' ||
          sub.sourceType === 'physical_exam' ||
          sub.sourceType === 'exam'
        ) {
          return false;
        }

        // Sadece açıkça elle/manuel girilmiş testler
        const isManual = Boolean(
          sub.isManual === true ||
          sub.sourceType === 'manual_test' ||
          String(sub.id || '').startsWith('sub_manual') ||
          String(sub.testId || '').startsWith('sub_manual')
        );

        return isManual;
      })
      .map(sub => {
        const student = (users || []).find(u => String(u.id) === String(sub.studentId) || String(u.studentId) === String(sub.studentId));
        const studentName = student?.name || sub.studentName || sub.studentUsername || 'Öğrenci';
        let title = sub.title || sub.testTitle || sub.name || 'Manuel Test';
        let subject = sub.subject || 'Genel Testler';
        let totalQ = Number(sub.totalQuestions) || Number(sub.questionCount) || ((Number(sub.correctCount) || 0) + (Number(sub.wrongCount) || 0) + (Number(sub.emptyCount) || 0)) || 20;

        const isPending = sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected');
        const isApproved = sub.approvalStatus === 'approved' || sub.isApproved === true || sub.status === 'completed';
        const isRejected = sub.approvalStatus === 'rejected' || sub.status === 'rejected';

        return {
          ...sub,
          itemType: 'test',
          studentName,
          studentGrade: student?.grade,
          testTitle: title,
          subject,
          totalQuestions: totalQ,
          isPending,
          isApproved,
          isRejected,
          dateObj: new Date(sub.submittedAt || sub.createdAt || sub.date || 0)
        };
      })
      .filter(sub => {
        if (!isAdmin) {
          if (!teacherId) return false;
          if (sub.id && String(sub.id).startsWith('sub_sample')) return false;
          const sId = String(sub.studentId);
          const matchedStudent = (users || []).find(u => String(u.id) === sId || String(u.studentId) === sId);
          const teacherObj = (users || []).find(u => String(u.id) === String(teacherId));
          if (matchedStudent?.teacherId && String(matchedStudent.teacherId) === String(teacherId)) return true;
          if (teacherObj?.studentIds && teacherObj.studentIds.includes(sId)) return true;
          return false;
        }
        return true;
      })
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [submissions, users, isAdmin, teacherId]);

  // 2. MANUEL DENEME SINAVLARI (Genel Denemeler)
  const enrichedManualMocks = useMemo(() => {
    return (mockExams || [])
      .map(exam => {
        const student = (users || []).find(u => String(u.id) === String(exam.studentId) || String(u.studentId) === String(exam.studentId));
        const studentName = student?.name || exam.studentName || 'Öğrenci';
        const title = exam.title || exam.examName || 'Deneme Sınavı';

        const isPending = exam.approvalStatus === 'pending' || (exam.createdBy === 'student' && exam.approvalStatus !== 'approved' && exam.approvalStatus !== 'rejected');
        const isApproved = exam.approvalStatus === 'approved' || exam.isApproved === true || (!exam.approvalStatus && exam.createdBy !== 'student');
        const isRejected = exam.approvalStatus === 'rejected';

        // Calculate total questions, D, Y, B, Net from subjects
        let totalD = 0, totalY = 0, totalB = 0, totalNet = Number(exam.totalNet) || 0;
        const scoreEntries = Object.entries(exam.scores || {});
        if (scoreEntries.length > 0) {
          totalD = scoreEntries.reduce((acc, [, sc]) => acc + (Number(sc?.d) || 0), 0);
          totalY = scoreEntries.reduce((acc, [, sc]) => acc + (Number(sc?.y) || 0), 0);
          totalB = scoreEntries.reduce((acc, [, sc]) => acc + (Number(sc?.b) || 0), 0);
          if (!exam.totalNet) {
            totalNet = scoreEntries.reduce((acc, [, sc]) => acc + (Number(sc?.net) || 0), 0);
          }
        }
        const totalQ = totalD + totalY + totalB || 90;

        return {
          ...exam,
          itemType: 'mock',
          studentName,
          studentGrade: student?.grade,
          testTitle: title,
          subject: 'Genel Deneme',
          totalQuestions: totalQ,
          correctCount: totalD,
          wrongCount: totalY,
          emptyCount: totalB,
          totalNet: parseFloat(totalNet.toFixed(2)),
          isPending,
          isApproved,
          isRejected,
          dateObj: new Date(exam.date || exam.createdAt || 0)
        };
      })
      .filter(exam => {
        if (!isAdmin) {
          if (!teacherId) return false;
          const sId = String(exam.studentId);
          const matchedStudent = (users || []).find(u => String(u.id) === sId || String(u.studentId) === sId);
          const teacherObj = (users || []).find(u => String(u.id) === String(teacherId));
          if (matchedStudent?.teacherId && String(matchedStudent.teacherId) === String(teacherId)) return true;
          if (teacherObj?.studentIds && teacherObj.studentIds.includes(sId)) return true;
          return false;
        }
        return true;
      })
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [mockExams, users, isAdmin, teacherId]);

  // Pending counts
  const pendingManualTests = useMemo(() => enrichedManualTests.filter(t => t.isPending), [enrichedManualTests]);
  const pendingManualMocks = useMemo(() => enrichedManualMocks.filter(m => m.isPending), [enrichedManualMocks]);

  const totalPendingCount = pendingManualTests.length + pendingManualMocks.length;
  const totalApprovedCount = enrichedManualTests.filter(t => t.isApproved).length + enrichedManualMocks.filter(m => m.isApproved).length;

  // Filtered Display List
  const displayedList = useMemo(() => {
    let list = [];

    if (activeMainTab === 'manual_tests') {
      if (statusFilter === 'pending') list = enrichedManualTests.filter(t => t.isPending);
      else if (statusFilter === 'approved') list = enrichedManualTests.filter(t => t.isApproved);
      else if (statusFilter === 'rejected') list = enrichedManualTests.filter(t => t.isRejected);
      else list = enrichedManualTests;
    } else if (activeMainTab === 'manual_mocks') {
      if (statusFilter === 'pending') list = enrichedManualMocks.filter(m => m.isPending);
      else if (statusFilter === 'approved') list = enrichedManualMocks.filter(m => m.isApproved);
      else if (statusFilter === 'rejected') list = enrichedManualMocks.filter(m => m.isRejected);
      else list = enrichedManualMocks;
    } else if (activeMainTab === 'history') {
      const allApprovedOrRejected = [
        ...enrichedManualTests.filter(t => t.isApproved || t.isRejected),
        ...enrichedManualMocks.filter(m => m.isApproved || m.isRejected)
      ].sort((a, b) => b.dateObj - a.dateObj);
      list = allApprovedOrRejected;
    }

    return list.filter(item => {
      const sName = String(item.studentName || '').toLowerCase();
      const tTitle = String(item.testTitle || item.title || '').toLowerCase();
      const bTitle = String(item.bookTitle || '').toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || sName.includes(query) || tTitle.includes(query) || bTitle.includes(query);

      const matchesSubject = subjectFilter === 'all' || (item.subject && item.subject === subjectFilter) || tTitle.includes(subjectFilter.toLowerCase());
      const matchesStudent = studentFilter === 'all' || String(item.studentId) === String(studentFilter);

      return matchesSearch && matchesSubject && matchesStudent;
    });
  }, [activeMainTab, statusFilter, enrichedManualTests, enrichedManualMocks, search, subjectFilter, studentFilter]);

  // Action handlers
  const handleApproveItem = async (item) => {
    if (!item?.id) return;
    setProcessingId(item.id);
    try {
      if (item.itemType === 'mock') {
        if (typeof approveMockExam === 'function') {
          await approveMockExam(item.id);
        } else {
          await updateMockExam(item.id, { approvalStatus: 'approved', approvedAt: new Date().toISOString() });
        }
      } else {
        await approveSubmission(item.id, currentUser);
      }
    } catch (e) {
      console.error(e);
      alert('Onaylama sırasında hata oluştu: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectItem = async (item) => {
    if (!item?.id) return;
    const reason = window.prompt('Reddetme nedeni belirtmek ister misiniz? (Opsiyonel)', 'Öğretmen tarafından onaylanmadı');
    if (reason === null) return;
    setProcessingId(item.id);
    try {
      if (item.itemType === 'mock') {
        if (typeof rejectMockExam === 'function') {
          await rejectMockExam(item.id, reason);
        } else {
          await updateMockExam(item.id, { approvalStatus: 'rejected', rejectedReason: reason, rejectedAt: new Date().toISOString() });
        }
      } else {
        await rejectSubmission(item.id, reason, currentUser);
      }
    } catch (e) {
      console.error(e);
      alert('Reddetme sırasında hata oluştu: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!item?.id) return;
    if (!window.confirm(`"${item.testTitle || 'Bu kaydı'}" tamamen silmek istediğinize emin misiniz?`)) return;
    setProcessingId(item.id);
    try {
      if (item.itemType === 'mock') {
        await deleteMockExam(item.id);
      } else {
        await deleteSubmission(item.id);
      }
    } catch (e) {
      console.error(e);
      alert('Silme sırasında hata oluştu: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApproveTests = async () => {
    if (pendingManualTests.length === 0) return;
    if (!window.confirm(`Onay bekleyen ${pendingManualTests.length} adet manuel test sonucunun tümünü topluca onaylamak istiyor musunuz?`)) return;
    setIsBatchApproving(true);
    try {
      for (const sub of pendingManualTests) {
        await approveSubmission(sub.id, currentUser);
      }
    } catch (e) {
      console.error(e);
      alert('Toplu onaylama sırasında hata oluştu: ' + e.message);
    } finally {
      setIsBatchApproving(false);
    }
  };

  const handleBatchApproveMocks = async () => {
    if (pendingManualMocks.length === 0) return;
    if (!window.confirm(`Onay bekleyen ${pendingManualMocks.length} adet deneme sınavı sonucunun tümünü onaylamak istiyor musunuz?`)) return;
    setIsBatchApproving(true);
    try {
      for (const mock of pendingManualMocks) {
        if (typeof approveMockExam === 'function') {
          await approveMockExam(mock.id);
        } else {
          await updateMockExam(mock.id, { approvalStatus: 'approved', approvedAt: new Date().toISOString() });
        }
      }
    } catch (e) {
      console.error(e);
      alert('Toplu onaylama sırasında hata oluştu: ' + e.message);
    } finally {
      setIsBatchApproving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ═══ MODAL OVERLAY (MANUAL TEST) ═══ */}
      {manualModalData.isOpen && (
        <ManualTestModal
          isOpen={manualModalData.isOpen}
          initialData={manualModalData.data}
          onClose={() => setManualModalData({ isOpen: false, data: null })}
          onSaved={() => setManualModalData({ isOpen: false, data: null })}
        />
      )}

      {/* ═══ HEADER ═══ */}
      <header style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.5rem 1.75rem',
        boxShadow: '0 8px 30px -4px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '1.1rem',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 20px -2px rgba(124, 58, 237, 0.4)'
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Onay Merkezi
              </h1>
              <span style={{
                background: 'rgba(124, 58, 237, 0.15)',
                color: '#a855f7',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.65rem',
                borderRadius: 99,
                border: '1px solid rgba(168, 85, 247, 0.35)'
              }}>
                {isAdmin ? 'Yönetici Onayı' : 'Öğretmen Onay Portalı'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Öğrencilerinizin girdiği manuel test ve manuel deneme sınavı sonuçlarını onaylayın
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            background: pendingManualTests.length > 0 ? 'rgba(124, 58, 237, 0.12)' : 'var(--color-surface-hover)',
            border: pendingManualTests.length > 0 ? '1.5px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.5rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: pendingManualTests.length > 0 ? '#a855f7' : '#10b981' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: pendingManualTests.length > 0 ? '#a855f7' : 'var(--color-text)' }}>
              {pendingManualTests.length} Manuel Test Bekliyor
            </span>
          </div>

          <div style={{
            background: pendingManualMocks.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-surface-hover)',
            border: pendingManualMocks.length > 0 ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--color-border)',
            borderRadius: '0.85rem',
            padding: '0.5rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: pendingManualMocks.length > 0 ? '#fbbf24' : '#10b981' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: pendingManualMocks.length > 0 ? '#fbbf24' : 'var(--color-text)' }}>
              {pendingManualMocks.length} Manuel Deneme Bekliyor
            </span>
          </div>

          <button
            type="button"
            onClick={() => setManualModalData({ isOpen: true, data: null })}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
            }}
          >
            <Plus size={15} /> Manuel Test Ekle
          </button>

          <button
            type="button"
            onClick={() => refreshSubmissions && refreshSubmissions(true)}
            disabled={isSyncing}
            title="Yenile & Senkronize Et"
            style={{
              width: 38,
              height: 38,
              borderRadius: '0.85rem',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ═══ SADECE MANUEL TEST VE MANUEL DENEME SEKMELERİ ═══ */}
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* TAB 1: MANUEL TESTLER */}
          <button
            type="button"
            onClick={() => setActiveMainTab('manual_tests')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeMainTab === 'manual_tests' ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'var(--color-surface-hover)',
              color: activeMainTab === 'manual_tests' ? '#ffffff' : (pendingManualTests.length > 0 ? '#a855f7' : 'var(--color-text-muted)'),
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeMainTab === 'manual_tests' ? '0 4px 12px rgba(124,58,237,0.25)' : 'none'
            }}
          >
            <BookOpen size={16} /> 📝 Manuel Test Onayları ({pendingManualTests.length})
          </button>

          {/* TAB 2: MANUEL DENEME SINAVLARI */}
          <button
            type="button"
            onClick={() => setActiveMainTab('manual_mocks')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeMainTab === 'manual_mocks' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-surface-hover)',
              color: activeMainTab === 'manual_mocks' ? '#ffffff' : (pendingManualMocks.length > 0 ? '#f59e0b' : 'var(--color-text-muted)'),
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeMainTab === 'manual_mocks' ? '0 4px 12px rgba(245,158,11,0.25)' : 'none'
            }}
          >
            <BarChart3 size={16} /> 📊 Manuel Deneme Onayları ({pendingManualMocks.length})
          </button>

          {/* TAB 3: ONAY GEÇMİŞİ */}
          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeMainTab === 'history' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--color-surface-hover)',
              color: activeMainTab === 'history' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeMainTab === 'history' ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'
            }}
          >
            <CheckCircle2 size={16} /> 📋 Onay Geçmişi ({totalApprovedCount})
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Öğrenci, kitap veya deneme ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem 0.5rem 2rem',
                borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {activeMainTab === 'manual_tests' && (
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)',
                fontSize: '0.8rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">Tüm Dersler</option>
              {Object.keys(subjectThemes).map((s, idx) => (
                <option key={`${s}_${idx}`} value={s}>{s}</option>
              ))}
            </select>
          )}

          <select
            value={studentFilter}
            onChange={e => setStudentFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.65rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              fontSize: '0.8rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Tüm Öğrenciler</option>
            {studentUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══ SUB-FILTERS & BATCH APPROVE PILLS ═══ */}
      {activeMainTab !== 'history' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              {
                id: 'pending',
                label: '⏳ Onay Bekleyenler',
                count: activeMainTab === 'manual_tests' ? pendingManualTests.length : pendingManualMocks.length,
                color: activeMainTab === 'manual_tests' ? '#a855f7' : '#f59e0b'
              },
              {
                id: 'approved',
                label: '✓ Onaylananlar',
                count: activeMainTab === 'manual_tests' ? enrichedManualTests.filter(t => t.isApproved).length : enrichedManualMocks.filter(m => m.isApproved).length,
                color: '#10b981'
              },
              {
                id: 'rejected',
                label: '❌ Reddedilenler',
                count: activeMainTab === 'manual_tests' ? enrichedManualTests.filter(t => t.isRejected).length : enrichedManualMocks.filter(m => m.isRejected).length,
                color: '#ef4444'
              },
              {
                id: 'all',
                label: 'Tümü',
                count: activeMainTab === 'manual_tests' ? enrichedManualTests.length : enrichedManualMocks.length,
                color: '#6366f1'
              }
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: statusFilter === pill.id ? `1.5px solid ${pill.color}` : '1px solid var(--color-border)',
                  background: statusFilter === pill.id ? (isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc') : 'transparent',
                  color: statusFilter === pill.id ? pill.color : 'var(--color-text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {pill.label} ({pill.count})
              </button>
            ))}
          </div>

          {/* Toplu Onayla Butonları */}
          {activeMainTab === 'manual_tests' && pendingManualTests.length > 0 && statusFilter === 'pending' && (
            <button
              type="button"
              onClick={handleBatchApproveTests}
              disabled={isBatchApproving}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '0.65rem',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: isBatchApproving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              }}
            >
              <CheckCheck size={15} />
              {isBatchApproving ? 'Onaylanıyor...' : `⚡ Tüm Testleri Onayla (${pendingManualTests.length})`}
            </button>
          )}

          {activeMainTab === 'manual_mocks' && pendingManualMocks.length > 0 && statusFilter === 'pending' && (
            <button
              type="button"
              onClick={handleBatchApproveMocks}
              disabled={isBatchApproving}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '0.65rem',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: isBatchApproving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
              }}
            >
              <CheckCheck size={15} />
              {isBatchApproving ? 'Onaylanıyor...' : `⚡ Tüm Denemeleri Onayla (${pendingManualMocks.length})`}
            </button>
          )}
        </div>
      )}

      {/* ═══ CONTENT GRID / EMPTY STATE ═══ */}
      {displayedList.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '1.5rem',
          padding: '4rem 1.5rem',
          textAlign: 'center',
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <Sparkles size={46} style={{ opacity: 0.35, color: '#7c3aed' }} />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {activeMainTab === 'manual_tests'
              ? (statusFilter === 'pending' ? 'Onay Bekleyen Manuel Test Bulunmuyor' : 'Filtreye Uygun Manuel Test Bulunamadı')
              : activeMainTab === 'manual_mocks'
              ? (statusFilter === 'pending' ? 'Onay Bekleyen Manuel Deneme Sınavı Bulunmuyor' : 'Filtreye Uygun Deneme Bulunamadı')
              : 'Onay Geçmişinde Kayıt Bulunamadı'}
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.84rem', maxWidth: 460 }}>
            {statusFilter === 'pending'
              ? 'Tebrikler! İncelenmeyi bekleyen hiçbir sonuç bulunmuyor.'
              : 'Arama ve filtre kriterlerinize uygun kayıt bulunamadı.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.15rem' }}>
          {displayedList.map(item => {
            const isMock = item.itemType === 'mock';
            const isPending = item.isPending;
            const isApproved = item.isApproved;
            const isRejected = item.isRejected;

            const dateStr = item.dateObj && !isNaN(item.dateObj.getTime())
              ? item.dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Belirtilmedi';

            const subConf = subjectThemes[item.subject] || subjectThemes['Genel Testler'];
            const isBusy = processingId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isPending
                    ? (isMock ? '1.5px solid #f59e0b' : '1.5px solid #a855f7')
                    : '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem',
                  padding: '1.25rem',
                  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isBusy ? 0.6 : 1,
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Top Accent Stripe */}
                {isPending && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: isMock
                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(90deg, #7c3aed, #c084fc)'
                  }} />
                )}

                <div>
                  {/* Student & Status Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: isMock ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        {item.studentName?.charAt(0) || 'Ö'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                          {item.studentName || 'Öğrenci'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={11} /> {dateStr}
                          {item.studentGrade && <span style={{ opacity: 0.8 }}>• {item.studentGrade}. Sınıf</span>}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isPending ? (
                      <span style={{
                        background: isMock ? 'rgba(245, 158, 11, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                        color: isMock ? '#fbbf24' : '#c084fc',
                        border: isMock ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(168, 85, 247, 0.35)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: 99,
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        ⏳ Onay Bekliyor
                      </span>
                    ) : isRejected ? (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: 99,
                        fontWeight: 900,
                        fontSize: '0.68rem'
                      }}>
                        ❌ Reddedildi
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: 99,
                        fontWeight: 900,
                        fontSize: '0.68rem'
                      }}>
                        ✓ Onaylandı
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--color-text)', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                    {item.testTitle || (isMock ? 'Genel Deneme Sınavı' : 'Manuel Test')}
                  </div>

                  {/* Book & Topic details (if test) */}
                  {item.bookTitle && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <BookOpen size={13} color="#818cf8" />
                      <span>{item.bookTitle}</span>
                      {item.unitTopic && <span style={{ opacity: 0.8 }}>• 📌 {item.unitTopic}</span>}
                    </div>
                  )}

                  {/* Badges / Type Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.65rem' }}>
                    {isMock ? (
                      <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        📊 Genel Deneme Sınavı
                      </span>
                    ) : (
                      <>
                        <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.7rem', fontWeight: 700, border: '1px solid var(--color-border)' }}>
                          📝 {item.totalQuestions} Soru
                        </span>
                        <span style={{ background: subConf.bg, color: subConf.color, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.7rem', fontWeight: 800, border: `1px solid ${subConf.border}` }}>
                          {subConf.icon} {item.subject}
                        </span>
                        <span style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#a855f7', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                          ✏️ Manuel Test
                        </span>
                      </>
                    )}
                  </div>

                  {/* ── MANUEL TEST: 4-BOX METRIC SUMMARY ── */}
                  {!isMock && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 900 }}>DOĞRU</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#10b981' }}>{item.correctCount || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 900 }}>YANLIŞ</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ef4444' }}>{item.wrongCount || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(148, 163, 184, 0.12)', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 900 }}>BOŞ</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>{item.emptyCount || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 900 }}>NET</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#3b82f6' }}>
                          {item.totalNet ?? ((item.correctCount || 0) - ((item.wrongCount || 0) / 4)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── MANUEL DENEME: DERS DERS NET TABLOSU ── */}
                  {isMock && item.scores && Object.keys(item.scores).length > 0 && (
                    <div style={{
                      background: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.75rem',
                      padding: '0.5rem 0.65rem',
                      marginTop: '0.4rem',
                      marginBottom: '0.4rem'
                    }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                        Ders Bazlı Net Dağılımı:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                        {Object.entries(item.scores).map(([sName, sc]) => {
                          const netVal = sc?.net ?? ((Number(sc?.d) || 0) - ((Number(sc?.y) || 0) / 3)).toFixed(2);
                          return (
                            <div key={sName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                                {sName}
                              </span>
                              <span style={{ fontWeight: 900, color: '#3b82f6' }}>
                                {netVal} N
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mistake reasons chips if test */}
                  {!isMock && item.mistakeReasons && Object.keys(item.mistakeReasons).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {Object.entries(item.mistakeReasons).slice(0, 4).map(([qNo, rText], rIdx) => (
                        <span key={rIdx} style={{ fontSize: '0.65rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '2px 6px', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          S{qNo}: {rText}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rejection reason if any */}
                  {item.rejectedReason && (
                    <div style={{ marginTop: 6, padding: '0.4rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '0.5rem', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                      ⚠️ Neden: {item.rejectedReason}
                    </div>
                  )}
                </div>

                {/* Card Footer with Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', gap: 6, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                      TOPLAM NET
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#3b82f6' }}>
                      {item.totalNet ?? 0} Net
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveItem(item)}
                          disabled={isBusy}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '0.65rem',
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                          }}
                        >
                          <Check size={14} /> Onayla
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectItem(item)}
                          disabled={isBusy}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.65rem',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <X size={14} /> Reddet
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveItem(item)}
                        disabled={isBusy}
                        title="Yeniden Onayla"
                        style={{
                          background: 'var(--color-surface-hover)',
                          color: '#10b981',
                          border: '1px solid var(--color-border)',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '0.65rem',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Check size={13} /> Onay Durumu
                      </button>
                    )}

                    {!isMock && (
                      <button
                        type="button"
                        onClick={() => setManualModalData({ isOpen: true, data: item })}
                        title="Düzenle"
                        style={{
                          background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          padding: '0.4rem',
                          borderRadius: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      title="Sil"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '0.4rem',
                        borderRadius: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
