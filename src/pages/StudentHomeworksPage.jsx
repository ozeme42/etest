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
  Layers, Trophy, Calendar, CheckSquare, Award, BookOpen, Brain, Zap, Target
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '1.25rem 1rem 5rem',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .hw-anim { animation: fadeIn 0.25s ease both; }
        @media (max-width: 640px) {
          .hw-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        
        {/* ─── TOP HEADER & ACTION BAR ─── */}
        <div className="hw-header-wrap hw-anim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '0.75rem',
                padding: '0.5rem 0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#1e293b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s'
              }}
            >
              <ArrowLeft size={16} /> Öğrenci Paneli
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.15rem',
                color: 'white',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                flexShrink: 0
              }}>
                📋
              </div>
              <div>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#0f172a', lineHeight: 1.2 }}>
                  Ödevlerim & Görevlerim
                </h1>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                  {selectedStudent?.name ? `${selectedStudent.name} · ` : ''}Öğretmeniniz veya koçunuz tarafından atanan ödevler
                </div>
              </div>
            </div>
          </div>

          {/* Teacher selector if viewed by teacher/admin */}
          {currentUser?.role !== 'student' && studentMembers.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto', maxWidth: '100%' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginLeft: 4 }}>👁️ Öğrenci:</span>
              <select
                value={selectedStudent?.id || ''}
                onChange={e => {
                  const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                  if (s) setSelectedStudent(s);
                }}
                style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.3rem 0.6rem', fontSize: '0.76rem', fontWeight: 700, outline: 'none' }}
              >
                {studentMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className || 'Sınıf'})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ─── 4 SUMMARY METRIC CARDS ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          {/* Card 1: Toplam Görev */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              📚
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Toplam Görev</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{allTests.length}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>({homeworkGroups.length} Set)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Bekleyen Ödev */}
          <div style={{
            background: '#ffffff',
            border: pendingTests.length > 0 ? '1.5px solid #fecdd3' : '1.5px solid #e2e8f0',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              ⏳
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Bekleyen Ödev</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e11d48' }}>{pendingTests.length}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>Çözüm bekliyor</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tamamlanan */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #bbf7d0',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              ✅
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Tamamlanan</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{completedTests.length}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>Bitti 🎉</span>
              </div>
            </div>
          </div>

          {/* Card 4: Genel Tamamlama % */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e9d5ff',
            borderRadius: '1.15rem',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              🎯
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İlerleme</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#7c3aed' }}>%{totalPct}</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalPct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB SWITCHER & FILTER CONTROLS ─── */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '1.15rem',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            {/* TABS */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 10, overflowX: 'auto', maxWidth: '100%' }}>
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  background: activeTab === 'pending' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                  color: activeTab === 'pending' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === 'pending' ? '0 2px 8px rgba(239,68,68,0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                ⏳ Bekleyenler ({pendingTests.length})
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                style={{
                  background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  color: activeTab === 'completed' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === 'completed' ? '0 2px 8px rgba(16,185,129,0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                ✅ Tamamlananlar ({completedTests.length})
              </button>

              <button
                onClick={() => setActiveTab('all')}
                style={{
                  background: activeTab === 'all' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                  color: activeTab === 'all' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === 'all' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                📑 Tümü ({allTests.length})
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 340 }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ödev veya test ara..."
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* SUBJECT FILTER PILLS */}
          {subjectsList.length > 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, flexShrink: 0, marginRight: 2 }}>Ders:</span>
              {subjectsList.map(subj => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  style={{
                    background: selectedSubject === subj ? '#4f46e5' : '#f1f5f9',
                    border: selectedSubject === subj ? '1.5px solid #4338ca' : '1px solid #e2e8f0',
                    color: selectedSubject === subj ? '#ffffff' : '#475569',
                    borderRadius: 99,
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s'
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
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '1.25rem',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '1rem', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {activeTab === 'pending' ? '🎉' : '📂'}
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {activeTab === 'pending' ? 'Bekleyen Ödeviniz Bulunmuyor!' : 'Bu kriterde ödev kaydı bulunamadı.'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 420, margin: 0, lineHeight: 1.4 }}>
              {activeTab === 'pending'
                ? 'Tüm ödevlerinizi başarıyla tamamladınız. Harika bir performans! 🌟'
                : 'Farklı bir filtre seçerek veya arama terimini değiştirerek tekrar deneyebilirsiniz.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                    background: '#ffffff',
                    border: task.isDone
                      ? '1.5px solid #bbf7d0'
                      : isOverdue
                      ? '1.5px solid #fecdd3'
                      : '1.5px solid #e2e8f0',
                    borderRadius: '1.15rem',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* SOL: BİLGİ ALANI */}
                  <div style={{ minWidth: 260, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                      {task.subject && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          color: '#1d4ed8',
                          background: '#eff6ff',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #bfdbfe'
                        }}>
                          {task.subject}
                        </span>
                      )}

                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: task.isBookAssignment ? '#047857' : '#6d28d9',
                        background: task.isBookAssignment ? '#ecfdf5' : '#faf5ff',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: task.isBookAssignment ? '1px solid #a7f3d0' : '1px solid #e9d5ff'
                      }}>
                        {task.isPhysical ? '📋 Fiziki Deneme' : task.isBookAssignment ? '📖 Kitap Testi' : '🎯 Dijital Ödev'}
                      </span>

                      {task.isDone ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, border: '1px solid #86efac' }}>
                          ✅ Tamamlandı
                        </span>
                      ) : isOverdue ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#fff1f2', color: '#e11d48', padding: '2px 8px', borderRadius: 99, border: '1px solid #fecdd3' }}>
                          ⚡ Gecikti
                        </span>
                      ) : isDueToday ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: 99, border: '1px solid #fde68a' }}>
                          ⚠️ Bugün Son
                        </span>
                      ) : null}
                    </div>

                    {/* BAŞLIK */}
                    <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.35, marginBottom: 4 }}>
                      {task.title || task.name || 'Ödev Görevi'}
                    </div>

                    {/* ALT DETAYLAR */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      {task.bookTitle && (
                        <span>📖 {task.bookTitle}</span>
                      )}
                      <span>• ❓ {task.questionCount || 20} Soru</span>
                      {dueLabel && (
                        <span>• ⏰ Son Teslim: {dueLabel}</span>
                      )}
                      {task.isDone && task.submittedAt && (
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>• 🗓️ Çözülme: {new Date(task.submittedAt).toLocaleDateString('tr-TR')}</span>
                      )}
                    </div>
                  </div>

                  {/* SAĞ: SKOR & BUTON */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 10,
                    flexShrink: 0
                  }}>
                    {task.isDone && task.scorePct !== null && (
                      <div style={{
                        background: task.scorePct >= 80 ? '#f0fdf4' : task.scorePct >= 50 ? '#eff6ff' : '#fff1f2',
                        border: task.scorePct >= 80 ? '1px solid #86efac' : task.scorePct >= 50 ? '1px solid #bfdbfe' : '1px solid #fecdd3',
                        padding: '0.4rem 0.8rem',
                        borderRadius: 10,
                        textAlign: 'right'
                      }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: task.scorePct >= 80 ? '#16a34a' : task.scorePct >= 50 ? '#2563eb' : '#e11d48' }}>
                          %{task.scorePct}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                          {task.correctAnswers} / {task.totalScoreQuestions} Doğru
                        </div>
                      </div>
                    )}

                    {task.isDone ? (
                      <button
                        type="button"
                        onClick={() => handleReviewTask(task)}
                        style={{
                          background: '#f8fafc',
                          color: '#2563eb',
                          border: '1.5px solid #bfdbfe',
                          borderRadius: 12,
                          padding: '0.6rem 1.15rem',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Eye size={15} /> Sonucu İncele
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartTask(task)}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #f97316)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 12,
                          padding: '0.65rem 1.35rem',
                          fontSize: '0.85rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 3px 12px rgba(239,68,68,0.3)',
                          transition: 'all 0.15s'
                        }}
                      >
                        <PlayCircle size={17} /> Hemen Çöz
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
