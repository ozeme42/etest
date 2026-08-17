import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useUser } from '../context/UserContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import {
  BookMarked, CheckCircle2, Clock, PlayCircle, AlertCircle,
  Search, ArrowLeft, ChevronRight, Eye, Sparkles, Filter,
  Layers, Trophy, Calendar, CheckSquare, Award
} from 'lucide-react';

export default function StudentHomeworksPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks } = useHomework();
  const { bookTests = [], books = [] } = useTrackedBooks() || {};
  const { submissions } = useEvaluation();
  const { data: curData } = useCurriculum();
  const { users } = useUser();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(() => {
    if (currentUser?.role === 'student') return currentUser;
    return studentMembers.length > 0 ? studentMembers[0] : null;
  });

  // Keep selectedStudent synced with currentUser
  React.useEffect(() => {
    if (currentUser?.role === 'student') setSelectedStudent(currentUser);
    else if (!selectedStudent && studentMembers.length > 0) setSelectedStudent(studentMembers[0]);
  }, [currentUser, studentMembers]);

  /* ─── Compute All Assigned Homeworks & Tests for Selected Student ─── */
  const allTests = useMemo(() => {
    if (!selectedStudent) return [];
    const gradesList = curData?.grades || [];

    const hwTests = (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      const bookObj = (books || []).find(b => String(b.id) === String(hw.bookId));
      const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || bookObj?.bookType === 'exam' || hw.isPhysical;
      const hwCreatedTime = hw.createdAt ? new Date(hw.createdAt).getTime() : 0;

      if (isExam) {
        const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && s.status !== 'draft') ||
          (submissions || []).find(s => {
            if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
            const matches = (
              String(s.hwId) === String(hw.id) ||
              String(s.homeworkId) === String(hw.id) ||
              String(s.testId) === String(hw.id) ||
              String(s.id) === String(hw.id) ||
              (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id)))
            );
            if (!matches) return false;
            if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
              return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
            }
            return true;
          });

        return [{
          ...hw,
          type: 'physicalExam',
          contentType: 'physicalExam',
          isPhysical: true,
          status: sub ? 'Sonuçlandı' : 'Atandı',
          isDone: !!sub,
          questionCount: hw.totalQuestions || (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 90,
          correctAnswers: sub ? (sub.score || sub.correctCount || 0) : 0,
          totalScoreQuestions: sub?.totalQuestions || hw.totalQuestions || 90,
          scorePct: sub ? Math.round(((sub.score || sub.correctCount || 0) / (sub.totalQuestions || hw.totalQuestions || 90)) * 100) : null,
          submissionId: sub?.id,
          submittedAt: sub?.submittedAt || sub?.createdAt,
          realTestId: hw.id,
          hwId: hw.id,
          bookId: hw.bookId || (bookObj ? bookObj.id : undefined)
        }];
      }

      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && bookObj);

      if (isBook) {
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        let testIdsList = [];
        const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

        if (hasTestDueDates) {
          testIdsList = Object.entries(hw.testDueDates)
            .filter(([_, dStr]) => dStr && String(dStr).trim() !== '')
            .map(([tId, _]) => tId);
        } else if (Array.isArray(hw.tests) && hw.tests.length > 0) {
          testIdsList = hw.tests;
        } else if (bookObj) {
          const allBookTests = (bookTests || []).filter(bt => String(bt.bookId) === String(bookObj.id));
          if (allBookTests.length > 0) testIdsList = allBookTests.map(bt => bt.id);
        }

        if (testIdsList.length > 0) {
          return testIdsList.map((testId, idx) => {
            const testObj = (bookTests || []).find(b => String(b.id) === String(testId));
            const tDateStr = hw.testDueDates?.[testId] || hw.dueDate || hw.assignedDueDate;
            const tIdStr = String(testId);
            const tUuidStr = String(toUUID(testId) || '');
            const studentIdStr = String(selectedStudent.id);
            const studentUuidStr = String(toUUID(selectedStudent.id) || '');

            const sub = (hw.submissions || []).find(s => {
              const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
              if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
              return String(s.testId) === tIdStr || String(s.bookTestId) === tIdStr || String(s.realTestId) === tIdStr || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr));
            }) || (submissions || []).find(s => {
              const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
              if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
              const matchFields = [
                String(s.testId || ''),
                String(s.realTestId || ''),
                String(s.bookTestId || ''),
                String(s.metadata?.realTestId || ''),
                String(s.metadata?.bookTestId || ''),
                String(s.metadata?.realId || '')
              ];
              if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
                matchFields.push(...s.bookTestIds.map(String));
              }
              const matches = matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr) || toUUID(f) === tIdStr || (tUuidStr && toUUID(f) === tUuidStr)));
              if (!matches) return false;
              if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
                return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
              }
              return true;
            });

            const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
            const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
            const testName = testObj?.name || (testIdsList.length > 1 ? `Test ${idx + 1}` : 'Test');
            const qCount = testObj?.questionCount || 20;
            const correctCount = sub ? (sub.score || sub.correctCount || 0) : 0;
            const scorePct = sub ? Math.round((correctCount / qCount) * 100) : null;

            return {
              ...hw,
              id: `bt_${hw.id}_${testId}`,
              realTestId: testId,
              testId: testId,
              bookTestId: testId,
              hwId: hw.id,
              bookId: hw.bookId || bookObj?.id,
              sourceType: 'trackedBook',
              isBookAssignment: true,
              subject: subjectName,
              bookTitle: cleanBookTitle,
              testName: testName,
              title: `${cleanBookTitle} — ${testName}`,
              dueDate: tDateStr,
              status: sub ? 'Sonuçlandı' : 'Atandı',
              isDone: !!sub,
              questionCount: qCount,
              correctAnswers: correctCount,
              totalScoreQuestions: qCount,
              scorePct,
              submissionId: sub?.id || sub?.supabaseId,
              submittedAt: sub?.submittedAt || sub?.createdAt
            };
          });
        }
      }

      if (Array.isArray(hw.tests) && hw.tests.length > 1) {
        return hw.tests.map((testId, idx) => {
          const tIdStr = String(testId);
          const tUuidStr = String(toUUID(testId) || '');

          const sub = (hw.submissions || []).find(s =>
            String(s.studentId) === String(selectedStudent.id) &&
            s.status !== 'in_progress' && s.status !== 'draft' &&
            (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
          ) || (submissions || []).find(s => {
            if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
            const matchFields = [
              String(s.testId || ''),
              String(s.realTestId || ''),
              String(s.metadata?.realTestId || ''),
              String(s.metadata?.realId || '')
            ];
            const matches = matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr)));
            if (!matches) return false;
            if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
              return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
            }
            return true;
          });

          const qCount = hw.totalQuestions ? Math.round(hw.totalQuestions / hw.tests.length) : 10;
          const correctCount = sub ? (sub.score || sub.correctCount || 0) : 0;
          const scorePct = sub ? Math.round((correctCount / qCount) * 100) : null;

          return {
            ...hw,
            id: `hw_${hw.id}_${testId}`,
            realTestId: testId,
            testId: testId,
            hwId: hw.id,
            title: `${hw.title || hw.name || 'Ödev'} (Test ${idx + 1})`,
            status: sub ? 'Sonuçlandı' : 'Atandı',
            isDone: !!sub,
            questionCount: qCount,
            correctAnswers: correctCount,
            totalScoreQuestions: qCount,
            scorePct,
            submissionId: sub?.id,
            submittedAt: sub?.submittedAt || sub?.createdAt
          };
        });
      }

      const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && s.status !== 'draft') ||
        (submissions || []).find(s => {
          if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
          const matches = (
            String(s.hwId) === String(hw.id) ||
            String(s.homeworkId) === String(hw.id) ||
            String(s.testId) === String(hw.id) ||
            String(s.id) === String(hw.id) ||
            (hw.questionIds && Array.isArray(hw.questionIds) && hw.questionIds.some(qid => String(s.testId) === String(qid) || String(s.realTestId) === String(qid))) ||
            (hw.sections && Array.isArray(hw.sections) && hw.sections.some(sec => String(s.testId) === String(sec.id || sec.questionId))) ||
            (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id)))
          );
          if (!matches) return false;
          if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
            return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
          }
          return true;
        });

      const qCount = hw.totalQuestions || 10;
      const correctCount = sub ? (sub.score || sub.correctCount || 0) : 0;
      const scorePct = sub ? Math.round((correctCount / qCount) * 100) : null;

      return [{
        ...hw,
        status: sub ? 'Sonuçlandı' : 'Atandı',
        isDone: !!sub,
        questionCount: qCount,
        correctAnswers: correctCount,
        totalScoreQuestions: qCount,
        scorePct,
        submissionId: sub?.id,
        submittedAt: sub?.submittedAt || sub?.createdAt
      }];
    });

    return hwTests;
  }, [homeworks, submissions, selectedStudent, curData, books, bookTests]);

  // Homework groups (by Book / Main Assignment)
  const homeworkGroups = useMemo(() => {
    const groups = {};
    allTests.forEach(item => {
      const groupKey = item.bookId ? `book_${item.bookId}` : `hw_${item.hwId || item.id}`;
      const groupTitle = item.bookTitle || item.title?.split('—')?.[0]?.trim() || item.name || 'Ödev Seti';
      const subject = item.subject || '';

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          title: groupTitle,
          subject,
          items: [],
          totalCount: 0,
          doneCount: 0,
          pendingCount: 0,
          pct: 0
        };
      }
      groups[groupKey].items.push(item);
      groups[groupKey].totalCount++;
      if (item.isDone) groups[groupKey].doneCount++;
      else groups[groupKey].pendingCount++;
    });

    return Object.values(groups).map(g => ({
      ...g,
      pct: g.totalCount > 0 ? Math.round((g.doneCount / g.totalCount) * 100) : 0
    }));
  }, [allTests]);

  // Stats
  const pendingTests = useMemo(() => allTests.filter(t => !t.isDone), [allTests]);
  const completedTests = useMemo(() => allTests.filter(t => t.isDone), [allTests]);
  const totalPct = allTests.length > 0 ? Math.round((completedTests.length / allTests.length) * 100) : 0;

  // Subjects list for filters
  const subjectsList = useMemo(() => {
    const set = new Set();
    allTests.forEach(t => { if (t.subject) set.add(t.subject); });
    return ['all', ...Array.from(set)];
  }, [allTests]);

  // Filtered List
  const filteredTests = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingTests;
    else if (activeTab === 'completed') list = completedTests;
    else list = allTests;

    if (selectedSubject !== 'all') {
      list = list.filter(t => t.subject === selectedSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.testName && t.testName.toLowerCase().includes(q)) ||
        (t.bookTitle && t.bookTitle.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allTests, pendingTests, completedTests, activeTab, selectedSubject, searchQuery]);

  const handleStartTask = (task) => {
    if (task.type === 'physicalExam' || task.isPhysical) {
      navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${selectedStudent.id}`);
    } else if (task.isBookAssignment || task.sourceType === 'trackedBook') {
      navigate(`/book-quiz/${task.bookTestId || task.realTestId || task.testId}?studentId=${selectedStudent.id}`);
    } else {
      navigate(`/quiz/${task.realTestId || task.hwId || task.id}?studentId=${selectedStudent.id}`);
    }
  };

  const handleReviewTask = (task) => {
    if (task.submissionId) {
      navigate(`/review/${task.submissionId}`);
    } else if (task.bookTestId || task.realTestId) {
      navigate(`/quiz-review/${task.bookTestId || task.realTestId}`);
    } else {
      navigate('/student-results');
    }
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      paddingBottom: '5rem'
    }}>
      {/* ─── TOP HEADER ─── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
        borderBottom: '1.5px solid rgba(255, 255, 255, 0.12)',
        padding: isMobile ? '1rem 1rem' : '1.25rem 1.5rem',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => navigate('/student')}
                className="sd-btn"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  borderRadius: 12,
                  padding: isMobile ? '0.4rem 0.7rem' : '0.5rem 0.85rem',
                  fontSize: isMobile ? '0.75rem' : '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <ArrowLeft size={15} /> {isMobile ? 'Geri' : 'Panele Dön'}
              </button>

              <div>
                <h1 style={{ fontSize: isMobile ? '1.15rem' : '1.45rem', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    📋 Ödevlerim & Görevlerim
                  </span>
                </h1>
                <span style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                  Öğretmeniniz veya koçunuz tarafından atanan ödevler
                </span>
              </div>
            </div>

            {/* Teacher selector if viewed by teacher/admin */}
            {currentUser?.role !== 'student' && studentMembers.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '0.3rem 0.65rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fde68a' }}>👁️ Öğrenci:</span>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={e => {
                    const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                    if (s) setSelectedStudent(s);
                  }}
                  style={{ background: '#1e293b', color: 'white', border: '1px solid #475569', borderRadius: 8, padding: '0.2rem 0.45rem', fontSize: '0.74rem', fontWeight: 700 }}
                >
                  {studentMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className || 'Sınıf'})</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '1rem 0.85rem' : '1.5rem 1.25rem' }}>

        {/* ─── 4 STATS OVERVIEW CARDS (2x2 MOBİLE, 4-KOLON DESKTOP) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '0.65rem' : '1rem',
          marginBottom: isMobile ? '1rem' : '1.5rem'
        }}>
          {/* Card 1: Toplam Görev */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1.5px solid rgba(99, 102, 241, 0.3)',
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? '0.85rem 0.9rem' : '1.1rem 1.25rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 8 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto' }}>
              <div style={{
                width: isMobile ? 36 : 46,
                height: isMobile ? 36 : 46,
                borderRadius: isMobile ? 10 : 14,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.05rem' : '1.3rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
              }}>
                📚
              </div>
              {isMobile && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#93c5fd', background: 'rgba(59,130,246,0.18)', padding: '2px 6px', borderRadius: 99 }}>
                  {homeworkGroups.length} Set
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: isMobile ? '1.35rem' : '1.55rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                {allTests.length}
              </div>
              <div style={{ fontSize: isMobile ? '0.66rem' : '0.74rem', fontWeight: 800, color: '#94a3b8', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Toplam Görev
              </div>
              {!isMobile && (
                <div style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 700, marginTop: 2 }}>
                  {homeworkGroups.length} Farklı Ödev Seti
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Bekleyen Ödev */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(69, 10, 10, 0.75) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? '0.85rem 0.9rem' : '1.1rem 1.25rem',
            boxShadow: '0 4px 20px rgba(239,68,68,0.2)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 8 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto' }}>
              <div style={{
                width: isMobile ? 36 : 46,
                height: isMobile ? 36 : 46,
                borderRadius: isMobile ? 10 : 14,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.05rem' : '1.3rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(239,68,68,0.35)'
              }}>
                ⏳
              </div>
              {isMobile && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#fca5a5', background: 'rgba(239,68,68,0.25)', padding: '2px 6px', borderRadius: 99 }}>
                  {pendingTests.length > 0 ? 'Aktif' : 'Yok'}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: isMobile ? '1.35rem' : '1.55rem', fontWeight: 900, color: '#fca5a5', lineHeight: 1.1 }}>
                {pendingTests.length}
              </div>
              <div style={{ fontSize: isMobile ? '0.66rem' : '0.74rem', fontWeight: 800, color: '#f87171', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Bekleyen Ödev
              </div>
              {!isMobile && (
                <div style={{ fontSize: '0.68rem', color: '#fca5a5', fontWeight: 700, marginTop: 2 }}>
                  Çözülmeyi bekliyor
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Tamamlanan */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.75) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1.5px solid rgba(52, 211, 153, 0.4)',
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? '0.85rem 0.9rem' : '1.1rem 1.25rem',
            boxShadow: '0 4px 20px rgba(16,185,129,0.2)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 8 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto' }}>
              <div style={{
                width: isMobile ? 36 : 46,
                height: isMobile ? 36 : 46,
                borderRadius: isMobile ? 10 : 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.05rem' : '1.3rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
              }}>
                ✅
              </div>
              {isMobile && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#86efac', background: 'rgba(34,197,94,0.2)', padding: '2px 6px', borderRadius: 99 }}>
                  Bitti
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: isMobile ? '1.35rem' : '1.55rem', fontWeight: 900, color: '#86efac', lineHeight: 1.1 }}>
                {completedTests.length}
              </div>
              <div style={{ fontSize: isMobile ? '0.66rem' : '0.74rem', fontWeight: 800, color: '#34d399', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tamamlanan
              </div>
              {!isMobile && (
                <div style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 700, marginTop: 2 }}>
                  Başarıyla bitti
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Genel Tamamlama % */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(49, 46, 129, 0.75) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1.5px solid rgba(165, 180, 252, 0.4)',
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? '0.85rem 0.9rem' : '1.1rem 1.25rem',
            boxShadow: '0 4px 20px rgba(99,102,241,0.2)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 8 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto' }}>
              <div style={{
                width: isMobile ? 36 : 46,
                height: isMobile ? 36 : 46,
                borderRadius: isMobile ? 10 : 14,
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.05rem' : '1.3rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(139,92,246,0.35)'
              }}>
                🎯
              </div>
              {isMobile && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#c084fc', background: 'rgba(168,85,247,0.2)', padding: '2px 6px', borderRadius: 99 }}>
                  {completedTests.length}/{allTests.length}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: isMobile ? '1.35rem' : '1.55rem', fontWeight: 900, color: '#c084fc', lineHeight: 1.1 }}>
                  %{totalPct}
                </span>
                {!isMobile && (
                  <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 800 }}>
                    {completedTests.length}/{allTests.length}
                  </span>
                )}
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalPct}%`, background: 'linear-gradient(90deg, #38bdf8, #a855f7)', borderRadius: 99, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ fontSize: isMobile ? '0.66rem' : '0.74rem', fontWeight: 800, color: '#c7d2fe', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Genel İlerleme
              </div>
            </div>
          </div>
        </div>

        {/* ─── ÖDEV SETLERİ İLERLEME KARTLARI (Yol Haritası Tarzı) ─── */}
        {homeworkGroups.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 22,
            padding: '1.25rem 1.4rem',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                  📊
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  Ödev Setleri & Kitap İlerlemeleri
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                {homeworkGroups.length} Atanmış Set
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
              {homeworkGroups.map(group => (
                <div
                  key={group.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1.5px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    padding: '0.9rem 1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
                      {group.title}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: group.pct === 100 ? '#4ade80' : '#38bdf8' }}>
                      %{group.pct}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${group.pct}%`,
                      background: group.pct === 100 ? 'linear-gradient(90deg, #22c55e, #10b981)' : 'linear-gradient(90deg, #38bdf8, #6366f1)',
                      borderRadius: 99,
                      transition: 'width 0.8s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                    <span>{group.doneCount} / {group.totalCount} Test Tamamlandı</span>
                    {group.pendingCount > 0 ? (
                      <span style={{ color: '#f87171', fontWeight: 800 }}>{group.pendingCount} Bekleyen</span>
                    ) : (
                      <span style={{ color: '#4ade80', fontWeight: 800 }}>Tümü Bitti 🎉</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB SWITCHER & FILTER CONTROLS ─── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            {/* TABS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 14 }}>
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  background: activeTab === 'pending' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                  color: activeTab === 'pending' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 10,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                ⏳ Bekleyenler ({pendingTests.length})
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                style={{
                  background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  color: activeTab === 'completed' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 10,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                ✅ Tamamlananlar ({completedTests.length})
              </button>

              <button
                onClick={() => setActiveTab('all')}
                style={{
                  background: activeTab === 'all' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: activeTab === 'all' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 10,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                📑 Tümü ({allTests.length})
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: 360 }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ödev veya test ara..."
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 12,
                  padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* SUBJECT FILTER PILLS */}
          {subjectsList.length > 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, flexShrink: 0, marginRight: 2 }}>Ders:</span>
              {subjectsList.map(subj => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  style={{
                    background: selectedSubject === subj ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: selectedSubject === subj ? '1.5px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: selectedSubject === subj ? '#ffffff' : '#94a3b8',
                    borderRadius: 99,
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {subj === 'all' ? 'Tüm Dersler' : subj}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── HOMEWORKS LIST ─── */}
        {filteredTests.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1.5px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: 22,
            padding: '3rem 1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>
              {activeTab === 'pending' ? '🎉' : '📂'}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0' }}>
              {activeTab === 'pending' ? 'Bekleyen Ödeviniz Bulunmuyor!' : 'Bu kriterde ödev kaydı bulunamadı.'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: 420, margin: '0 auto' }}>
              {activeTab === 'pending'
                ? 'Tüm ödevlerinizi başarıyla tamamladınız. Harika bir performans! 🌟'
                : 'Farklı bir filtre seçerek veya arama terimini değiştirerek tekrar deneyebilirsiniz.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredTests.map((task) => {
              const rawDue = task.dueDate || task.assignedDueDate;
              let dueLabel = '';
              let isOverdue = false;
              let isDueToday = false;

              if (rawDue) {
                const dueTime = new Date(rawDue).getTime();
                const nowTime = new Date().setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
                if (diffDays < 0 && !task.isDone) isOverdue = true;
                else if (diffDays === 0 && !task.isDone) isDueToday = true;
                try {
                  dueLabel = new Date(rawDue).toLocaleDateString('tr-TR');
                } catch {}
              }

              return (
                <div
                  key={task.id}
                  style={{
                    background: task.isDone
                      ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.35) 0%, rgba(15, 23, 42, 0.85) 100%)'
                      : 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    border: task.isDone
                      ? '1.5px solid rgba(52, 211, 153, 0.3)'
                      : '1.5px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 18,
                    padding: isMobile ? '0.95rem 1rem' : '1.1rem 1.3rem',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* SOL: BİLGİ ALANI */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      {task.subject && (
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          color: '#93c5fd',
                          background: 'rgba(59, 130, 246, 0.2)',
                          padding: '2px 7px',
                          borderRadius: 6
                        }}>
                          {task.subject}
                        </span>
                      )}

                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: task.isBookAssignment ? '#a7f3d0' : '#fbcfe8',
                        background: task.isBookAssignment ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                        padding: '2px 7px',
                        borderRadius: 6
                      }}>
                        {task.isPhysical ? '📋 Fiziki Deneme' : task.isBookAssignment ? '📖 Kitap Testi' : '🎯 Dijital Ödev'}
                      </span>

                      {task.isDone ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 7px', borderRadius: 99 }}>
                          ✅ Tamamlandı
                        </span>
                      ) : isOverdue ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '2px 7px', borderRadius: 99 }}>
                          ⚡ Gecikti
                        </span>
                      ) : isDueToday ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', padding: '2px 7px', borderRadius: 99 }}>
                          ⚠️ Bugün Son
                        </span>
                      ) : null}
                    </div>

                    {/* BAŞLIK */}
                    <div style={{ fontSize: isMobile ? '0.9rem' : '0.96rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.35, marginBottom: 4 }}>
                      {task.title || task.name || 'Ödev Görevi'}
                    </div>

                    {/* ALT DETAYLAR */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      {task.bookTitle && (
                        <span>📖 {task.bookTitle}</span>
                      )}
                      <span>• ❓ {task.questionCount || 20} Soru</span>
                      {dueLabel && (
                        <span>• ⏰ Son: {dueLabel}</span>
                      )}
                      {task.isDone && task.submittedAt && (
                        <span style={{ color: '#34d399' }}>• 🗓️ Çözülme: {new Date(task.submittedAt).toLocaleDateString('tr-TR')}</span>
                      )}
                    </div>
                  </div>

                  {/* SAĞ: SKOR & BUTON */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    gap: 10,
                    flexShrink: 0,
                    width: isMobile ? '100%' : 'auto',
                    borderTop: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    paddingTop: isMobile ? 8 : 0,
                    marginTop: isMobile ? 2 : 0
                  }}>
                    {task.isDone && task.scorePct !== null && (
                      <div style={{
                        background: task.scorePct >= 80 ? 'rgba(34, 197, 94, 0.2)' : task.scorePct >= 50 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: task.scorePct >= 80 ? '1px solid rgba(34, 197, 94, 0.4)' : task.scorePct >= 50 ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                        padding: '0.35rem 0.7rem',
                        borderRadius: 10,
                        textAlign: isMobile ? 'left' : 'right'
                      }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: task.scorePct >= 80 ? '#4ade80' : task.scorePct >= 50 ? '#60a5fa' : '#f87171' }}>
                          %{task.scorePct}
                        </div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8' }}>
                          {task.correctAnswers} / {task.totalScoreQuestions} Doğru
                        </div>
                      </div>
                    )}

                    {task.isDone ? (
                      <button
                        type="button"
                        onClick={() => handleReviewTask(task)}
                        className="sd-btn"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 12,
                          padding: isMobile ? '0.55rem 1rem' : '0.55rem 1.1rem',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                          flex: isMobile && !task.scorePct ? 1 : 'initial'
                        }}
                      >
                        <Eye size={15} /> Sonucu İncele
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartTask(task)}
                        className="sd-btn"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #f97316)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 12,
                          padding: isMobile ? '0.65rem 1.25rem' : '0.55rem 1.25rem',
                          fontSize: '0.85rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      >
                        <PlayCircle size={16} /> Hemen Çöz
                      </button>
                    )}
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
