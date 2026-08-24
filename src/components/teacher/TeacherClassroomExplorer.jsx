import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, Filter, ChevronDown, ChevronUp, ChevronRight,
  TrendingUp, TrendingDown, BookOpen, Layers, Key, Check,
  Copy, Calendar, Award, Activity, BarChart3, MessageSquare,
  Sparkles, Clock, Edit2, Target, CheckCircle2, AlertCircle,
  BookMarked, FileText, Printer, ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAvatarBg, getSubjectTheme } from '../../config/subjectThemes';
import { getSubmissionScorePct } from '../../pages/TeacherDashboard';
import { computeStudentAnalyticsData } from '../../utils/testResolver';
import { timeAgo } from '../../utils/dateHelpers';

export default function TeacherClassroomExplorer({
  students = [],
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  grades = [],
  coachedIds = [],
  onUpdateUser,
  onOpenEditStudent,
  onSelectStudentReport,
  onToggleCoaching,
  onAddStudentClick
}) {
  const { isDark } = useTheme();

  // Filters State
  const [selectedGradeId, setSelectedGradeId] = useState('all'); // 'all' | gradeId
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'week' | 'month' | 'all'
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [copiedPwdId, setCopiedPwdId] = useState(null);

  // 1. Class / Grade Tabs Data
  const gradeTabs = useMemo(() => {
    const list = [{ id: 'all', name: 'Tüm Sınıflar', count: students.length }];

    grades.forEach(g => {
      const count = students.filter(s =>
        String(s.gradeId) === String(g.id) || s.gradeId === g.name ||
        String(s.classId) === String(g.id) || s.grade === g.name || s.className === g.name
      ).length;
      list.push({ id: g.id, name: g.name, count });
    });

    const unassignedCount = students.filter(s => !s.gradeId && !s.classId && !s.grade && !s.className).length;
    if (unassignedCount > 0) {
      list.push({ id: 'unassigned', name: 'Sınıfsız', count: unassignedCount });
    }

    return list;
  }, [grades, students]);

  // 2. Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Grade match
      if (selectedGradeId !== 'all') {
        if (selectedGradeId === 'unassigned') {
          if (s.gradeId || s.classId || s.grade || s.className) return false;
        } else {
          const isMatch = String(s.gradeId) === String(selectedGradeId) ||
                          s.gradeId === selectedGradeId ||
                          String(s.classId) === String(selectedGradeId) ||
                          s.grade === selectedGradeId ||
                          s.className === selectedGradeId;
          if (!isMatch) return false;
        }
      }

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.name?.toLowerCase().includes(q);
        const emailMatch = s.email?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [students, selectedGradeId, searchQuery]);

  // Helper to normalize subjects reliably
  const normalizeSubjectName = (rawName) => {
    if (!rawName) return 'Genel';
    const s = String(rawName).trim();
    const l = s.toLowerCase();
    if (l.includes('matematik') || l.includes('geometri')) return 'Matematik';
    if (l.includes('türkçe') || l.includes('paragraf') || l.includes('edebiyat') || l.includes('dil bilgisi')) return 'Türkçe';
    if (l.includes('fen') || l.includes('fizik') || l.includes('kimya') || l.includes('biyoloji')) return 'Fen Bilimleri';
    if (l.includes('sosyal') || l.includes('tarih') || l.includes('coğrafya') || l.includes('inkılap')) return 'Sosyal Bilgiler';
    if (l.includes('ingilizce') || l.includes('english')) return 'İngilizce';
    if (l.includes('din') || l.includes('ahlak')) return 'Din Kültürü';
    return s || 'Genel';
  };

  // 3. Compute Deep Performance Stats per Student (using complete computeStudentAnalyticsData)
  const studentStatsMap = useMemo(() => {
    const map = {};
    const now = Date.now();
    const timeThreshold = timeFilter === 'week' ? now - 7 * 86400000 : timeFilter === 'month' ? now - 30 * 86400000 : 0;

    students.forEach(std => {
      // Complete analytics resolution including Tracked Books, Homeworks, and Optical Tests
      const { generalTrialExams = [], otherHomeworkSubmissions = [] } = computeStudentAnalyticsData({
        studentId: std.id,
        targetStudent: std,
        submissions,
        homeworks,
        books,
        bookTests
      });

      const allResolvedSubs = [...generalTrialExams, ...otherHomeworkSubmissions]
        .filter(sub => {
          if (!timeThreshold) return true;
          const subDateMs = new Date(sub.date || sub.submittedAt || sub.createdAt || 0).getTime();
          return subDateMs >= timeThreshold;
        })
        .sort((a, b) => new Date(a.date || a.submittedAt || 0) - new Date(b.date || b.submittedAt || 0));

      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      let totalNet = 0;
      let bookTestsCount = 0;

      const subjectMap = {};
      const topicMap = {};
      const historyPoints = [];

      allResolvedSubs.forEach((sub, idx) => {
        const correct = Number(sub.correctCount ?? sub.correct ?? 0);
        const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
        const blank = Number(sub.emptyCount ?? sub.blankCount ?? 0);
        const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);
        const net = Number(sub.totalNet ?? (correct - (wrong * 0.25)) ?? 0);

        totalQuestions += qCount;
        totalCorrect += correct;
        totalWrong += wrong;
        totalBlank += blank;
        totalNet += net;

        if (sub.parentBookId || sub.isExamBook || sub.sourceType === 'bookTest') {
          bookTestsCount++;
        }

        const scorePct = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;
        historyPoints.push({
          score: scorePct,
          title: sub.title || `Test ${idx + 1}`,
          date: sub.date,
          correct,
          wrong,
          blank,
          net: Number(net.toFixed(1))
        });

        // ── Subject Resolution ──
        let subjName = normalizeSubjectName(sub.subject);
        if (subjName === 'Genel' && sub.parentBookId) {
          const parentBook = books.find(b => String(b.id) === String(sub.parentBookId));
          if (parentBook) {
            subjName = normalizeSubjectName(parentBook.subject || parentBook.title);
          }
        }

        if (!subjectMap[subjName]) {
          subjectMap[subjName] = { name: subjName, questions: 0, correct: 0, wrong: 0, blank: 0, netSum: 0, testCount: 0 };
        }
        subjectMap[subjName].questions += qCount;
        subjectMap[subjName].correct += correct;
        subjectMap[subjName].wrong += wrong;
        subjectMap[subjName].blank += blank;
        subjectMap[subjName].netSum += net;
        subjectMap[subjName].testCount += 1;

        // ── Topic Resolution ──
        let topicName = sub.topic || sub.topicName;
        if (!topicName) {
          const rawTitle = sub.title || '';
          topicName = rawTitle
            .replace(/^[0-9]+[a-zA-ZçğıöşüÇĞİÖŞÜ\s\-\.\:]*—\s*/, '')
            .replace(/^Test\s*[0-9]+[\:\-\s]*/i, '')
            .trim();
          if (!topicName || topicName.length < 3) {
            topicName = rawTitle || 'Genel Konu';
          }
        }

        if (!topicMap[topicName]) {
          topicMap[topicName] = { name: topicName, subject: subjName, questions: 0, correct: 0, wrong: 0, blank: 0, testCount: 0 };
        }
        topicMap[topicName].questions += qCount;
        topicMap[topicName].correct += correct;
        topicMap[topicName].wrong += wrong;
        topicMap[topicName].blank += blank;
        topicMap[topicName].testCount += 1;
      });

      // Homework completion stats
      const assignedHw = (homeworks || []).filter(h => {
        const tIds = h.targetIds || [];
        return tIds.includes(std.id) || tIds.includes(String(std.id));
      });
      const completedHw = assignedHw.filter(h => {
        return (h.submissions || []).some(s => String(s.studentId) === String(std.id) || s.studentId === std.id);
      }).length;

      const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const avgNet = allResolvedSubs.length > 0 ? Number((totalNet / allResolvedSubs.length).toFixed(1)) : 0;

      const subjects = Object.values(subjectMap).map(s => ({
        ...s,
        avgScore: s.questions > 0 ? Math.round((s.correct / s.questions) * 100) : 0,
        avgNet: s.testCount > 0 ? Number((s.netSum / s.testCount).toFixed(1)) : 0,
        theme: getSubjectTheme(s.name)
      })).sort((a, b) => b.questions - a.questions);

      const topics = Object.values(topicMap).map(t => ({
        ...t,
        avgScore: t.questions > 0 ? Math.round((t.correct / t.questions) * 100) : 0
      })).sort((a, b) => b.questions - a.questions);

      // Trend calculation
      let trendDirection = 'flat';
      if (historyPoints.length >= 4) {
        const mid = Math.floor(historyPoints.length / 2);
        const firstAvg = historyPoints.slice(0, mid).reduce((acc, p) => acc + p.score, 0) / mid;
        const secondAvg = historyPoints.slice(mid).reduce((acc, p) => acc + p.score, 0) / (historyPoints.length - mid);
        if (secondAvg - firstAvg >= 5) trendDirection = 'up';
        else if (firstAvg - secondAvg >= 5) trendDirection = 'down';
      }

      // Saved teacher note from localStorage
      const savedNote = localStorage.getItem(`teacher_note_${std.id}`) || '';

      map[std.id] = {
        totalQuestions,
        totalCorrect,
        totalWrong,
        totalBlank,
        totalNet: Number(totalNet.toFixed(1)),
        avgScore,
        avgNet,
        testCount: allResolvedSubs.length,
        bookTestsCount,
        hwTotal: assignedHw.length,
        hwCompleted: completedHw,
        subjects,
        topics,
        historyPoints,
        trendDirection,
        savedNote,
        recentSubs: [...allResolvedSubs].reverse().slice(0, 5)
      };
    });

    return map;
  }, [students, submissions, homeworks, books, bookTests, timeFilter]);

  // Copy password helper
  const handleCopyPassword = (stdId, pwd) => {
    navigator.clipboard.writeText(pwd || '123456');
    setCopiedPwdId(stdId);
    setTimeout(() => setCopiedPwdId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* ── 1. TOP HEADER & ACTION BAR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.1rem 1.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="#6366f1" />
            Sınıfım &amp; Öğrenci Profil &amp; Başarı Listesi
            <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              {filteredStudents.length} / {students.length} Öğrenci
            </span>
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Öğrenci karnesi oluşturma, konu başarıları, ödev durumu, öğretmen notları ve gelişim grafikleri.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Time Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
            {[
              { id: 'week', label: 'Son 7 Gün' },
              { id: 'month', label: 'Son 30 Gün' },
              { id: 'all', label: 'Tüm Zamanlar' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: 'none',
                  background: timeFilter === t.id ? '#6366f1' : 'transparent',
                  color: timeFilter === t.id ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={onAddStudentClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.55rem 1.15rem', borderRadius: '0.75rem',
              background: 'linear-gradient(135deg,#059669,#10b981)',
              border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem',
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)'
            }}
          >
            <Users size={15} /> + Öğrenci Ekle
          </button>
        </div>
      </div>

      {/* ── 2. CLASS / GRADE LIST TABS & SEARCH BAR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.15rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Class Filter Horizontal Scroll Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {gradeTabs.map(g => {
            const isActive = String(selectedGradeId) === String(g.id);
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGradeId(g.id)}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '0.75rem',
                  border: isActive ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface-hover)',
                  color: isActive ? '#6366f1' : 'var(--color-text)',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{g.name}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: isActive ? '#6366f1' : 'var(--color-border)',
                  color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: 800
                }}>
                  {g.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Öğrenci adı veya e-posta ile arayın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              borderRadius: '0.65rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              fontSize: '0.82rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* ── 3. EMPTY STATE ── */}
      {filteredStudents.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px dashed var(--color-border-input)',
          borderRadius: '1.25rem', padding: '3rem 1.5rem', textAlign: 'center',
          color: 'var(--color-text-muted)'
        }}>
          <Users size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-text)' }}>Bu filtreye uygun öğrenci bulunamadı.</p>
          <span style={{ fontSize: '0.78rem' }}>Farklı bir sınıf seçebilir veya yeni öğrenci ekleyebilirsiniz.</span>
        </div>
      ) : (
        /* ── 4. RICH STUDENT LIST WITH PROFILE & REPORT CARDS ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
          {filteredStudents.map((student, i) => {
            const st = studentStatsMap[student.id] || { totalQuestions: 0, avgScore: 0, testCount: 0, bookTestsCount: 0, hwTotal: 0, hwCompleted: 0, subjects: [], topics: [], historyPoints: [], recentSubs: [] };
            const isExpanded = expandedStudentId === student.id;
            const isCoached = coachedIds.includes(student.id);
            const gObj = grades.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                      || grades.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);

            return (
              <div
                key={student.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isExpanded ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem',
                  padding: '1.15rem 1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                  boxShadow: isExpanded ? '0 8px 24px -4px rgba(99, 102, 241, 0.12)' : '0 4px 16px -2px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* ── TOP ROW: STUDENT AVATAR, FULL NAME, CLASS, PASSWORD & MAIN ACTIONS ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {/* Left: Avatar & Name & Password */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: getAvatarBg(i),
                      color: '#fff', fontWeight: 900, fontSize: '1.15rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
                    }}>
                      {(student.name || 'Ö').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <h4
                          onClick={() => onSelectStudentReport && onSelectStudentReport(student)}
                          style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text)', cursor: 'pointer' }}
                          title="Öğrencinin Karnesini Aç"
                        >
                          {student.name}
                        </h4>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '2px 7px', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                          {gObj ? gObj.name : (student.grade || 'Sınıfsız')}
                        </span>
                        {isCoached && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                            🎯 Koçlukta
                          </span>
                        )}
                        {st.savedNote && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            📝 Notu Var
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 3 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{student.email}</span>
                        {/* Password pill */}
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(student.id, student.password)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '1px 6px', borderRadius: '0.4rem',
                            background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#fbbf24', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800,
                            cursor: 'pointer'
                          }}
                          title="Şifreyi Kopyala"
                        >
                          <Key size={10} />
                          <span>{student.password || '123456'}</span>
                          {copiedPwdId === student.id ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Class Selector & Primary Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <select
                      value={gObj ? gObj.id : (student.gradeId || '')}
                      onChange={async (e) => {
                        const gId = e.target.value;
                        const gName = grades.find(g => String(g.id) === String(gId))?.name || gId;
                        if (onUpdateUser) {
                          await onUpdateUser(student.id, { gradeId: gId, classId: gId, grade: gName, className: gName });
                        }
                      }}
                      style={{
                        padding: '0.4rem 0.65rem', borderRadius: '0.6rem',
                        border: '1.5px solid var(--color-border-input)',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem',
                        cursor: 'pointer', outline: 'none'
                      }}
                    >
                      <option value="">— Sınıf Seç</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>

                    {/* 📜 ÖĞRENCİ KARNESİ OLUŞTUR BUTONU */}
                    <button
                      type="button"
                      onClick={() => onSelectStudentReport && onSelectStudentReport(student)}
                      style={{
                        padding: '0.45rem 0.95rem', borderRadius: '0.65rem',
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                        border: 'none', color: '#ffffff',
                        fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        boxShadow: '0 3px 12px rgba(99,102,241,0.3)'
                      }}
                    >
                      <Award size={14} /> 📜 Öğrenci Karnesi
                    </button>

                    <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
                      <button
                        type="button"
                        style={{
                          padding: '0.45rem 0.8rem', borderRadius: '0.65rem',
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1.5px solid rgba(139, 92, 246, 0.3)',
                          color: '#c084fc', fontWeight: 800, fontSize: '0.75rem',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Calendar size={13} /> Program
                      </button>
                    </Link>

                    <button
                      type="button"
                      onClick={() => onOpenEditStudent && onOpenEditStudent(student)}
                      style={{
                        padding: '0.45rem 0.65rem', borderRadius: '0.65rem',
                        background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                        color: 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <Edit2 size={12} /> Düzenle
                    </button>
                  </div>
                </div>

                {/* ── MIDDLE ROW: CORE STATS RIBBON (SORU, BAŞARI, ÖDEV, GELİŞİM BARLARI) ── */}
                <div style={{
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '0.85rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '0.85rem',
                  alignItems: 'center'
                }}>
                  {/* Soru Sayısı & D/Y/B */}
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
                      Çözülen Soru Sayısı
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      {st.totalQuestions} Soru
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>{st.totalCorrect}D</span> · <span style={{ color: '#ef4444', fontWeight: 800 }}>{st.totalWrong}Y</span> · <span>{st.totalBlank}B</span>
                    </span>
                  </div>

                  {/* Genel Başarı & Net */}
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
                      Genel Başarı Puanı
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: st.avgScore >= 70 ? '#10b981' : st.avgScore >= 45 ? '#f59e0b' : '#ef4444' }}>
                        %{st.avgScore}
                      </span>
                      {st.trendDirection === 'up' && (
                        <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <TrendingUp size={13} /> Yükselişte
                        </span>
                      )}
                      {st.trendDirection === 'down' && (
                        <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <TrendingDown size={13} /> Düşüşte
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                      Ortalama {st.avgNet} Net
                    </span>
                  </div>

                  {/* Ödev Durumu & Kitap Testleri */}
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
                      Ödev &amp; Kitap Durumu
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={14} /> {st.hwCompleted}/{st.hwTotal} Ödev Tamam
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      📖 {st.bookTestsCount} Kitap Testi Çözüldü
                    </span>
                  </div>

                  {/* Tarihsel Gelişim Mini Çubuğu */}
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Gelişim Grafiği (Son Sınavlar)
                    </span>
                    {st.historyPoints.length === 0 ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Henüz sınav çözmedi</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24 }}>
                        {st.historyPoints.slice(-8).map((pt, pIdx) => {
                          const h = Math.max(4, Math.round((pt.score / 100) * 24));
                          const c = pt.score >= 70 ? '#10b981' : pt.score >= 45 ? '#f59e0b' : '#ef4444';
                          return (
                            <div
                              key={pIdx}
                              title={`${pt.title}: %${pt.score} Başarı (${pt.date ? new Date(pt.date).toLocaleDateString('tr-TR') : ''})`}
                              style={{
                                width: 14,
                                height: h,
                                background: c,
                                borderRadius: 3,
                                cursor: 'help',
                                transition: 'height 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SUBJECT BREAKDOWN CHIPS (BRANŞ DAĞILIMI) ── */}
                {st.subjects.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginRight: 4 }}>
                      📚 Branşlar:
                    </span>
                    {st.subjects.map(subj => {
                      const sc = subj.theme;
                      return (
                        <div
                          key={subj.name}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '0.25rem 0.55rem', borderRadius: '0.55rem',
                            background: sc.darkBg || 'rgba(99, 102, 241, 0.1)',
                            border: `1px solid ${sc.darkBorder || 'rgba(99, 102, 241, 0.25)'}`,
                            fontSize: '0.72rem', fontWeight: 800, color: sc.accent || '#6366f1'
                          }}
                        >
                          <span>{subj.name}:</span>
                          <span style={{ color: 'var(--color-text)' }}>{subj.questions} Soru</span>
                          <span style={{ padding: '1px 5px', borderRadius: 99, background: subj.avgScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: subj.avgScore >= 70 ? '#10b981' : '#f59e0b', fontWeight: 900 }}>
                            %{subj.avgScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── EXPAND/COLLAPSE FULL DETAILS BUTTON ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {st.savedNote && (
                      <span style={{ fontStyle: 'italic', color: 'var(--color-text)' }}>
                        📝 Not: "{st.savedNote.length > 50 ? st.savedNote.slice(0, 50) + '...' : st.savedNote}"
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                    style={{
                      background: 'none', border: 'none',
                      color: isExpanded ? '#6366f1' : 'var(--color-text-muted)',
                      fontWeight: 800, fontSize: '0.76rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span>{isExpanded ? 'Detayları Gizle' : `📖 Konu Başarıları, Sınavlar ve Notlar (${st.topics.length} Konu)`}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* ── 5. EXPANDABLE ACCORDION: TOPIC MASTERY + RECENT EXAMS + NOTES ── */}
                {isExpanded && (
                  <div style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '1rem',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {/* Header with Quick Karne Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Layers size={16} color="#6366f1" />
                        {student.name} — Detaylı Konu ve Sınav Karnesi
                      </h5>
                      <button
                        onClick={() => onSelectStudentReport && onSelectStudentReport(student)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '0.55rem',
                          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          border: 'none', color: 'white', fontWeight: 900, fontSize: '0.72rem',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Award size={12} /> Tam Karne &amp; Veli Paylaşımı
                      </button>
                    </div>

                    {/* 1. Konu Konu Başarı Kartları */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        📚 Konu Başarıları ({st.topics.length} Konu)
                      </span>
                      {st.topics.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                          Henüz çözülen konu verisi bulunmuyor.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.55rem' }}>
                          {st.topics.map((top, tIdx) => {
                            const tc = top.avgScore >= 70 ? '#10b981' : top.avgScore >= 45 ? '#f59e0b' : '#ef4444';
                            return (
                              <div
                                key={top.name || tIdx}
                                style={{
                                  background: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '0.75rem',
                                  padding: '0.65rem 0.85rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.35rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--color-text)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {top.name}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: tc, padding: '1px 6px', borderRadius: 99, background: `${tc}22`, flexShrink: 0 }}>
                                    %{top.avgScore}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                  <span>{top.questions} Soru</span>
                                  <span style={{ color: '#10b981', fontWeight: 700 }}>{top.correct}D</span>
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>{top.wrong}Y</span>
                                </div>

                                <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${top.avgScore}%`, background: tc, borderRadius: 4 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Son Çözülen Sınavlar */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        🧪 Son Sınav &amp; Test Sonuçları
                      </span>
                      {st.recentSubs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '0.75rem 0', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                          Sınav kaydı bulunmuyor.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {st.recentSubs.map((sub, sIdx) => {
                            const correct = Number(sub.correctCount ?? sub.correct ?? 0);
                            const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
                            const blank = Number(sub.emptyCount ?? sub.blankCount ?? 0);
                            const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);
                            const scorePct = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;
                            const net = Number(sub.totalNet ?? (correct - (wrong * 0.25)) ?? 0);

                            return (
                              <div
                                key={sub.id || sIdx}
                                style={{
                                  padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap'
                                }}
                              >
                                <div>
                                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-text)' }}>{sub.title || 'Sınav'}</p>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{sub.subject} · {sub.date ? new Date(sub.date).toLocaleDateString('tr-TR') : 'Tarih yok'}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem' }}>
                                  <span style={{ color: '#10b981', fontWeight: 800 }}>{correct}D</span>
                                  <span style={{ color: '#ef4444', fontWeight: 800 }}>{wrong}Y</span>
                                  <span style={{ color: '#6366f1', fontWeight: 900 }}>{net.toFixed(1)} Net</span>
                                  <span style={{ fontWeight: 900, color: scorePct >= 70 ? '#10b981' : scorePct >= 45 ? '#f59e0b' : '#ef4444' }}>%{scorePct}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
