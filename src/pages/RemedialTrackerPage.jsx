import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors, ArrowLeft, Users, AlertCircle, Sparkles,
  Trophy, BookOpen, CheckCircle2, Layers, Search
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { toUUID } from '../services/supabaseService';
import TeacherRemedialTracker from '../components/teacher/TeacherRemedialTracker';
import TeacherStudentMistakesPool from '../components/teacher/TeacherStudentMistakesPool';
import PdfQuestionSlicerModal from '../components/question-bank/PdfQuestionSlicerModal';

export default function RemedialTrackerPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { users = [], students = [] } = useUser();
  const { data: curData } = useCurriculum();
  const { tests = [], questions = [] } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { submissions = [] } = useEvaluation();
  const { books = [], bookTests = [] } = useTrackedBooks();

  const studentList = useMemo(() => {
    const raw = students.length > 0 ? students : users;
    return (raw || []).filter(u => {
      if (!u) return false;
      return u.role === 'student' || (!u.role && u.role !== 'teacher' && u.role !== 'admin');
    });
  }, [students, users]);

  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    return studentList[0]?.id || null;
  });

  const [activeTab, setActiveTab] = useState('mistakes_pool'); // 'mistakes_pool' | 'remedial_tests'
  const [studentSearch, setStudentSearch] = useState('');

  // Slicer Modal state & config
  const [isSlicerOpen, setIsSlicerOpen] = useState(false);
  const [slicerConfig, setSlicerConfig] = useState(null);

  const getStudentGradeLabel = (st) => {
    if (!st) return '';
    if (st.className && !st.className.startsWith('g_')) return st.className;
    if (st.grade && !String(st.grade).startsWith('g_')) {
      return String(st.grade).includes('Sınıf') ? st.grade : `${st.grade}. Sınıf`;
    }
    const matchedGrade = curData?.grades?.find(g =>
      String(g.id) === String(st.gradeId) ||
      String(g.id) === String(st.classId) ||
      g.name === st.gradeId ||
      g.name === st.grade
    );
    if (matchedGrade?.name) return matchedGrade.name;
    if (st.gradeId) {
      const num = String(st.gradeId).replace(/[^0-9]/g, '');
      if (num && num.length <= 2) return `${num}. Sınıf`;
    }
    return '';
  };

  // Student summary metrics (mistakes in pool & assigned remedial tests)
  const studentMetrics = useMemo(() => {
    const metricsMap = {};

    studentList.forEach(st => {
      const sid = String(st.id);
      const sUuid = String(toUUID(st.id) || '');

      // 1. Remedial tests count for this student
      const allRemedials = [...tests, ...questions, ...homeworks].filter(t => {
        if (!t) return false;
        const isRem = t.isRemedialTest === true || t.isRemedial === true || t.isTeacherRemedial === true || t.sourceType === 'pdfSlicerRemedial' || t.type === 'remedial' || t.type === 'remedialTest' || (t.title && t.title.includes('Telafi'));
        const isForSt = String(t.studentId) === sid || String(t.assignedStudentId) === sid || String(t.targetStudentId) === sid || (Array.isArray(t.targetIds) && t.targetIds.includes(sid)) || (Array.isArray(t.targetStudentIds) && t.targetStudentIds.includes(sid));
        return isRem && isForSt;
      });

      // 2. Mistakes count across all solved tests
      let mistakeCount = 0;
      const subsForSt = submissions.filter(s => {
        if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
        const subSid = String(s.studentId ?? s.userId ?? s.student_id ?? '');
        return subSid === sid || (sUuid && subSid === sUuid);
      });

      subsForSt.forEach(s => {
        const cleanAnswers = (Array.isArray(s.answers)) ? s.answers.filter(a => a?.type !== 'metadata') : [];
        if (cleanAnswers.length > 0) {
          cleanAnswers.forEach(ans => {
            const userAns = ans.userAnswer ?? ans.selectedOption ?? ans.selectedAnswer ?? ans.answer ?? ans.textAns ?? '';
            const correctAns = ans.correctAnswer ?? ans.correctOption ?? ans.correct ?? '—';
            const isExplicitCorrect = ans.isCorrect === true || ans.evalStatus === 'correct';
            const isMatchExact = Boolean(userAns && correctAns && correctAns !== '—' && String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase() && userAns !== 'EMPTY');
            const isCorrect = isExplicitCorrect || isMatchExact;

            if (isCorrect) return;

            const isBlank = (ans.isCorrect === null && (!userAns || userAns === 'EMPTY' || userAns === 'Boş')) || ans.evalStatus === 'empty' || userAns === 'EMPTY' || userAns === 'Boş' || !userAns;
            const isWrong = ans.isCorrect === false || ans.evalStatus === 'wrong' || (!isCorrect && !isBlank && userAns && correctAns !== '—');

            if (isWrong || isBlank) {
              mistakeCount++;
            }
          });
        } else {
          mistakeCount += Number(s.wrongCount ?? s.wrong_count ?? s.wrong ?? 0);
        }
      });

      metricsMap[sid] = {
        remedialCount: allRemedials.length,
        mistakeCount
      };
    });

    return metricsMap;
  }, [studentList, tests, questions, homeworks, submissions, books, bookTests]);

  const activeStudent = useMemo(() => {
    if (!selectedStudentId || selectedStudentId === 'all') return null;
    return studentList.find(s => String(s.id) === String(selectedStudentId)) || null;
  }, [selectedStudentId, studentList]);

  const filteredStudentList = useMemo(() => {
    if (!studentSearch.trim()) return studentList;
    const q = studentSearch.toLowerCase();
    return studentList.filter(s => {
      const name = (s.name || s.fullName || '').toLowerCase();
      const grade = getStudentGradeLabel(s).toLowerCase();
      return name.includes(q) || grade.includes(q);
    });
  }, [studentList, studentSearch, curData]);

  const handleLaunchSlicer = (config) => {
    setSlicerConfig(config);
    setIsSlicerOpen(true);
  };

  return (
    <div style={{
      maxWidth: 1440,
      margin: '0 auto',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      minHeight: '100vh'
    }}>
      {/* 🧭 SAYFA ÜST BAŞLIK ALANI */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 42,
              height: 42,
              borderRadius: '1rem',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(244,63,94,0.35)'
              }}>
                <Scissors size={20} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Telafi Testleri &amp; %100 Ustalık Yönetim Merkezi
              </h1>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Öğrenci seçin, kitap yanlışları havuzundan soruları işaretleyin ve PDF üzerinden tek tıkla telafi testi oluşturup aralıklı tekrara bağlayın.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSlicerConfig({
                studentId: activeStudent?.id || null,
                bookId: null,
                mistakes: null
              });
              setIsSlicerOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.65rem 1.25rem',
              borderRadius: '0.9rem',
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(244,63,94,0.35)',
              transition: 'transform 0.15s'
            }}
          >
            <Scissors size={16} />
            <span>✂️ PDF'ten Doğrudan Soru Kırp</span>
          </button>
        </div>
      </div>

      {/* 👥 ÖĞRENCİ SEÇİM ŞERİDİ */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.15rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} className="text-indigo-600" />
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
              Hedef Öğrenci Seçimi ({studentList.length} Öğrenci)
            </h3>
          </div>

          <div style={{ position: 'relative', width: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Öğrenci ara..."
              style={{
                width: '100%',
                padding: '5px 10px 5px 28px',
                borderRadius: 8,
                border: '1.5px solid var(--color-border)',
                background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.76rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Öğrenci Kartları (Scrollable Grid) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '0.65rem',
          maxHeight: 220,
          overflowY: 'auto',
          padding: '2px'
        }}>
          {/* Tüm Öğrenciler Seçeneği */}
          <button
            type="button"
            onClick={() => {
              setSelectedStudentId('all');
              setActiveTab('remedial_tests');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              borderRadius: 12,
              border: selectedStudentId === 'all' ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
              background: selectedStudentId === 'all' ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'var(--color-surface)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.78rem'
              }}>
                👥
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Tüm Öğrenciler
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Genel Telafi Paneli
                </div>
              </div>
            </div>
          </button>

          {/* Öğrenci Kartları */}
          {filteredStudentList.map(st => {
            const isSelected = selectedStudentId === st.id;
            const gradeLbl = getStudentGradeLabel(st);
            const m = studentMetrics[String(st.id)] || { remedialCount: 0, mistakeCount: 0 };

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStudentId(st.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 12,
                  border: isSelected ? '2px solid #f43f5e' : '1.5px solid var(--color-border)',
                  background: isSelected ? (isDark ? 'rgba(244,63,94,0.15)' : '#fff1f2') : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: isSelected ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : (isDark ? '#334155' : '#e2e8f0'),
                    color: isSelected ? 'white' : 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    flexShrink: 0
                  }}>
                    {(st.name || st.fullName || 'Ö')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {st.name || st.fullName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {gradeLbl || 'Öğrenci'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  {m.mistakeCount > 0 && (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: isDark ? 'rgba(239,68,68,0.25)' : '#fee2e2',
                      color: '#dc2626'
                    }}>
                      ⚠️ {m.mistakeCount} Yanlış
                    </span>
                  )}
                  {m.remedialCount > 0 && (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff',
                      color: '#4338ca'
                    }}>
                      📝 {m.remedialCount} Telafi
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🧭 SEKMELER (YANLIŞLAR HAVUZU | ATANAN TELAFİ TESTLERİ) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '2px solid var(--color-border)',
        paddingBottom: 2
      }}>
        {selectedStudentId !== 'all' && (
          <button
            type="button"
            onClick={() => setActiveTab('mistakes_pool')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem 0.85rem 0 0',
              border: 'none',
              borderBottom: activeTab === 'mistakes_pool' ? '3px solid #f43f5e' : '3px solid transparent',
              background: activeTab === 'mistakes_pool' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'mistakes_pool' ? '#f43f5e' : 'var(--color-text-muted)',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <AlertCircle size={16} />
            <span>⚠️ Yanlışlar Havuzu &amp; Telafi Oluşturucu</span>
            {studentMetrics[selectedStudentId]?.mistakeCount > 0 && (
              <span style={{
                background: isDark ? 'rgba(244,63,94,0.2)' : '#ffe4e6',
                color: '#f43f5e',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: '1rem'
              }}>
                {studentMetrics[selectedStudentId].mistakeCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('remedial_tests')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.85rem 0.85rem 0 0',
            border: 'none',
            borderBottom: activeTab === 'remedial_tests' ? '3px solid #6366f1' : '3px solid transparent',
            background: activeTab === 'remedial_tests' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'remedial_tests' ? '#6366f1' : 'var(--color-text-muted)',
            fontSize: '0.86rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s'
          }}
        >
          <Sparkles size={16} />
          <span>📊 Atanan Telafi Testleri &amp; %100 Ustalık Takibi</span>
          {selectedStudentId && studentMetrics[selectedStudentId]?.remedialCount > 0 && (
            <span style={{
              background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
              color: '#6366f1',
              fontSize: '0.72rem',
              fontWeight: 900,
              padding: '1px 6px',
              borderRadius: '1rem'
            }}>
              {studentMetrics[selectedStudentId].remedialCount}
            </span>
          )}
        </button>
      </div>

      {/* 📄 ANA İÇERİK ALANI */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
      }}>
        {activeTab === 'mistakes_pool' && activeStudent ? (
          <TeacherStudentMistakesPool
            student={activeStudent}
            isDark={isDark}
            onLaunchSlicer={handleLaunchSlicer}
          />
        ) : (
          <TeacherRemedialTracker
            isDark={isDark}
            targetStudentId={selectedStudentId !== 'all' ? selectedStudentId : null}
          />
        )}
      </div>

      {/* ✂️ AKILLI PDF TELAFİ TESTİ KIRPICI MODAL */}
      {isSlicerOpen && (
        <PdfQuestionSlicerModal
          isOpen={isSlicerOpen}
          onClose={() => {
            setIsSlicerOpen(false);
            setSlicerConfig(null);
          }}
          onSaveQuestions={() => {
            setActiveTab('remedial_tests');
          }}
          mode="mistakes"
          studentId={slicerConfig?.studentId || activeStudent?.id}
          initialBook={slicerConfig?.book}
          initialBookId={slicerConfig?.bookId}
          initialPdfUrl={slicerConfig?.pdfUrl}
          initialMistakes={slicerConfig?.mistakes}
          initialSubject={slicerConfig?.subject}
          initialGrade={slicerConfig?.grade}
        />
      )}
    </div>
  );
}
