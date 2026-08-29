import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Award, CheckCircle2, AlertCircle, Clock, Search,
  ChevronRight, RotateCcw, Eye, Zap, Calendar, TrendingUp,
  Filter, BookOpen, Layers, Check, ArrowRight, UserCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useQuestionBank } from '../../context/QuestionBankContext';
import { useEvaluation } from '../../context/EvaluationContext';
import { useHomework } from '../../context/HomeworkContext';
import { useUser } from '../../context/UserContext';
import { getRemedialTestMasteryStatus } from '../../services/remedialSpacedRepetitionService';
import { toUUID } from '../../services/supabaseService';

export default function TeacherRemedialTracker({ isDark: propIsDark, targetStudentId = null }) {
  const themeContext = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : themeContext?.isDark;
  const navigate = useNavigate();

  const { tests = [], questions = [] } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { submissions = [] } = useEvaluation();
  const { users = [], students = [] } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('Tümü');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'mastered'

  // Identify all remedial tests assigned by or for students
  const remedialMasteryList = useMemo(() => {
    const allItems = [...tests, ...questions, ...homeworks];
    const candidateTests = allItems.filter(t => {
      if (!t) return false;
      return t.isRemedialTest === true ||
             t.isRemedial === true ||
             t.isTeacherRemedial === true ||
             t.sourceType === 'pdfSlicer' ||
             t.sourceType === 'pdfSlicerRemedial' ||
             t.type === 'remedial' ||
             t.type === 'remedialTest' ||
             (t.title && (t.title.includes('Telafi') || t.title.includes('Kırpılmış')));
    });

    // Deduplicate by ID
    const uniqueTests = Array.from(new Map(candidateTests.map(t => [String(t.id), t])).values());
    const rows = [];

    uniqueTests.forEach(t => {
      const targetStudentIds = new Set();
      if (t.studentId && t.studentId !== 'teacher') targetStudentIds.add(String(t.studentId));
      if (t.assignedStudentId && t.assignedStudentId !== 'teacher') targetStudentIds.add(String(t.assignedStudentId));
      if (t.targetStudentId && t.targetStudentId !== 'teacher') targetStudentIds.add(String(t.targetStudentId));
      if (t.targetStudent && t.targetStudent !== 'teacher') targetStudentIds.add(String(t.targetStudent));
      if (t.raw_data?.targetStudentId && t.raw_data.targetStudentId !== 'teacher') targetStudentIds.add(String(t.raw_data.targetStudentId));
      if (t.raw_data?.studentId && t.raw_data.studentId !== 'teacher') targetStudentIds.add(String(t.raw_data.studentId));
      if (Array.isArray(t.targetIds)) t.targetIds.forEach(id => id && id !== 'teacher' && targetStudentIds.add(String(id)));
      if (Array.isArray(t.studentIds)) t.studentIds.forEach(id => id && id !== 'teacher' && targetStudentIds.add(String(id)));
      if (Array.isArray(t.targetStudentIds)) t.targetStudentIds.forEach(id => id && id !== 'teacher' && targetStudentIds.add(String(id)));

      // Also check submissions for this test
      const testSubs = (submissions || []).filter(s => {
        if (!s) return false;
        return String(s.testId) === String(t.id) || String(s.realTestId) === String(t.id) || String(s.hwId) === String(t.id);
      });
      testSubs.forEach(s => {
        const sid = s.studentId || s.userId || s.student_id;
        if (sid && sid !== 'teacher') targetStudentIds.add(String(sid));
      });

      if (targetStudentIds.size > 0) {
        targetStudentIds.forEach(sid => {
          const studentObj = (students.length > 0 ? students : users).find(u => String(u.id) === sid || (toUUID(u.id) && String(toUUID(u.id)) === String(toUUID(sid))));
          const studentName = studentObj?.name || studentObj?.fullName || 'Öğrenci';
          const studentSubs = testSubs.filter(s => String(s.studentId || s.userId || s.student_id) === sid || (toUUID(s.studentId) && String(toUUID(s.studentId)) === String(toUUID(sid))));
          const statusInfo = getRemedialTestMasteryStatus(t, studentSubs.length > 0 ? studentSubs : submissions);

          rows.push({
            ...statusInfo,
            studentId: sid,
            studentName,
            studentObj,
            rawTest: t
          });
        });
      } else {
        const statusInfo = getRemedialTestMasteryStatus(t, submissions);
        rows.push({
          ...statusInfo,
          studentId: null,
          studentName: '🏢 Genel Telafi Havuzu',
          studentObj: null,
          rawTest: t
        });
      }
    });

    return rows;
  }, [tests, questions, homeworks, submissions, users, students]);

  // Filtered List
  const scopedList = useMemo(() => {
    if (!targetStudentId || targetStudentId === 'all') return remedialMasteryList;
    const targetStr = String(targetStudentId);
    const targetUuid = String(toUUID(targetStudentId) || '');
    return remedialMasteryList.filter(item => {
      if (!item.studentId) return false;
      const sid = String(item.studentId);
      return sid === targetStr || (targetUuid && (sid === targetUuid || toUUID(sid) === targetUuid));
    });
  }, [remedialMasteryList, targetStudentId]);

  // Filtered List
  const filteredList = useMemo(() => {
    return scopedList.filter(item => {
      const matchSearch = !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSubject = selectedSubjectFilter === 'Tümü' || item.subject === selectedSubjectFilter;

      const matchStatus = selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'mastered' && item.isMastered) ||
        (selectedStatusFilter === 'in_progress' && !item.isMastered);

      return matchSearch && matchSubject && matchStatus;
    });
  }, [scopedList, searchQuery, selectedSubjectFilter, selectedStatusFilter]);

  // Overview KPIs
  const stats = useMemo(() => {
    const total = scopedList.length;
    const mastered = scopedList.filter(i => i.isMastered).length;
    const inProgress = total - mastered;
    const totalSolves = scopedList.reduce((acc, i) => acc + i.solveCount, 0);

    return { total, mastered, inProgress, totalSolves };
  }, [scopedList]);

  if (remedialMasteryList.length === 0) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px dashed var(--color-border)',
        borderRadius: 20,
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        margin: '1.25rem 0'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✂️</div>
        <h4 style={{ margin: '0 0 6px', fontWeight: 900, color: 'var(--color-text)', fontSize: '1.05rem' }}>
          Henüz Atanmış Telafi Testi Bulunmuyor
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 450, marginInline: 'auto', lineHeight: 1.4 }}>
          Öğrencilerinizin yanlış yaptığı sorulardan PDF Soru Kırpıcı veya Hatalar Havuzundan aralıklı tekrar telafi testleri oluşturup atayabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)',
      borderRadius: 20,
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        paddingBottom: '0.9rem',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            fontSize: '1.25rem'
          }}>
            🎯
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
              ✂️ Atanan Telafi Testleri & %100 Ustalık Takip Paneli
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Öğrencilerinize atanan telafi testlerinin çözümlerini, aralıklı tekrar adımlarını ve %100 başarıya ulaşma süreçlerini canlı izleyin.
            </p>
          </div>
        </div>

        {/* Top KPI Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 99,
            background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
            color: '#6366f1',
            border: '1px solid rgba(99,102,241,0.3)'
          }}>
            📝 {stats.total} Toplam Telafi
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 99,
            background: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5',
            color: '#059669',
            border: '1px solid rgba(16,185,129,0.3)'
          }}>
            🏆 {stats.mastered} Mezun / %100 Tamamlanan
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 99,
            background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
            color: '#d97706',
            border: '1px solid rgba(245,158,11,0.3)'
          }}>
            🌱 {stats.inProgress} Devam Eden
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        flexWrap: 'wrap',
        marginBottom: '1rem'
      }}>
        <div style={{
          flex: '1 1 200px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğrenci adı, test başlığı veya ders ara..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: isDark ? '#1e293b' : '#f8fafc',
              color: 'var(--color-text)',
              fontSize: '0.78rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: isDark ? '#1e293b' : '#f8fafc',
            color: 'var(--color-text)',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="in_progress">🌱 Devam Edenler</option>
          <option value="mastered">🏆 %100 Ustalaşanlar</option>
        </select>
      </div>

      {/* Remedial List Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '0.85rem'
      }}>
        {filteredList.map(item => {
          return (
            <div
              key={`${item.testId}_${item.studentId || 'pool'}`}
              style={{
                background: isDark ? 'rgba(30,41,59,0.7)' : '#ffffff',
                border: item.isMastered
                  ? '1.5px solid rgba(16,185,129,0.5)'
                  : '1.5px solid var(--color-border)',
                borderRadius: 14,
                padding: '0.95rem 1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
                boxShadow: item.isMastered
                  ? '0 4px 14px rgba(16,185,129,0.1)'
                  : '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                {/* Student & Mastery Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.studentName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '0.84rem', color: 'var(--color-text)' }}>
                      {item.studentName}
                    </span>
                  </div>

                  {item.isMastered ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <CheckCircle2 size={11} /> %100 Ustalaştı 🏆
                    </span>
                  ) : item.isSolved ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7',
                      color: '#d97706'
                    }}>
                      🌱 Aşama {item.stageLevel} (%{item.currentScorePct})
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                      color: '#dc2626'
                    }}>
                      ⏳ Henüz Çözülmedi
                    </span>
                  )}
                </div>

                {/* Test Title & Subject */}
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: 'var(--color-text)',
                  lineHeight: 1.3
                }}>
                  {item.title}
                </h4>

                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📚 {item.subject}</span>
                  <span>•</span>
                  <span>📝 {item.totalQuestions} Soru</span>
                  <span>•</span>
                  <span>🔁 {item.solveCount} Kez Çözüldü</span>
                </div>

                {/* Score & Progression Bar */}
                {item.isSolved && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      marginBottom: 3
                    }}>
                      <span style={{ color: '#16a34a' }}>✓ {item.latestCorrect} Doğru</span>
                      <span style={{ color: '#dc2626' }}>✗ {item.latestWrong} Yanlış</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>— {item.latestBlank} Boş</span>
                      <span style={{ color: item.isMastered ? '#059669' : '#6366f1', fontWeight: 900 }}>
                        Başarı: %{item.currentScorePct}
                      </span>
                    </div>

                    <div style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 99,
                      background: isDark ? '#334155' : '#e2e8f0',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${item.currentScorePct}%`,
                        height: '100%',
                        borderRadius: 99,
                        background: item.isMastered
                          ? 'linear-gradient(90deg, #10b981, #059669)'
                          : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {item.submissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const latestSub = item.submissions[item.submissions.length - 1];
                      navigate(`/quiz-review/${item.testId}?studentId=${item.studentId}&submissionId=${latestSub.id}&teacher=true`, {
                        state: { from: '/teacher', isTeacher: true }
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 8,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <Eye size={12} /> <span>Son Çözümü İncele</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/coaching/${item.studentId}`);
                  }}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 8,
                    background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#6366f1',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title="Öğrencinin Haftalık Koçluk & Çalışma Programını Aç"
                >
                  <Calendar size={12} /> <span>Haftalık Programda Gör</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
