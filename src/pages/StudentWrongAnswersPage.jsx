import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, Calendar, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, FolderOpen, Check, Clock
} from 'lucide-react';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';

const subjectThemes = {
  'all_subjects': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    icon: GraduationCap,
    color: '#4f46e5',
    shadow: '0 12px 28px -5px rgba(79,70,229,0.45)'
  },
  'Matematik': {
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    icon: Ruler,
    color: '#2563eb',
    shadow: '0 10px 25px -5px rgba(37,99,235,0.4)'
  },
  'Fen Bilimleri': {
    bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    icon: TestTube2,
    color: '#0d9488',
    shadow: '0 10px 25px -5px rgba(13,148,136,0.4)'
  },
  'Türkçe': {
    bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    icon: BookCopy,
    color: '#ea580c',
    shadow: '0 10px 25px -5px rgba(234,88,12,0.4)'
  },
  'Sosyal Bilgiler': {
    bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    icon: Globe,
    color: '#9333ea',
    shadow: '0 10px 25px -5px rgba(147,51,234,0.4)'
  },
  'İngilizce': {
    bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    icon: MessageSquare,
    color: '#e11d48',
    shadow: '0 10px 25px -5px rgba(225,29,72,0.4)'
  },
  'Genel Deneme Sınavları': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    icon: Trophy,
    color: '#4f46e5',
    shadow: '0 10px 25px -5px rgba(79,70,229,0.4)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    icon: BookOpen,
    color: '#475569',
    shadow: '0 10px 25px -5px rgba(71,85,105,0.4)'
  }
};

export default function StudentWrongAnswersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { questions: bankQuestions } = useQuestionBank();
  const { data: curData } = useCurriculum();

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(studentMembers[0] || null);

  // selectedSubject: null (Level 1: Subject Cards Portal) | 'Matematik' / 'Fen' / 'all' (Level 2: Inside Subject Folder)
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Restore selectedSubject if returning from review page
  useEffect(() => {
    if (location.state?.subject !== undefined) {
      setSelectedSubject(location.state.subject);
    }
  }, [location.state]);

  const handleOpenReview = (subId, e) => {
    if (e) e.stopPropagation();
    navigate(`/review/${subId}`, {
      state: { from: '/wrong-answers', subject: selectedSubject }
    });
  };

  // Persistent Whole-Test Review State in localStorage ('eTestReviewedSubmissions')
  const [reviewedSubSet, setReviewedSubSet] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestReviewedSubmissions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const toggleSubmissionReviewed = (subId, e) => {
    if (e) e.stopPropagation();
    setReviewedSubSet(prev => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      try {
        localStorage.setItem('eTestReviewedSubmissions', JSON.stringify(Array.from(next)));
      } catch (err) {}
      return next;
    });
  };

  // View Mode inside subject folder: 'table' (Excel single row table) | 'cards' (Test cards)
  const [viewMode, setViewMode] = useState('table');

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ansTypeFilter, setAnsTypeFilter] = useState('all'); // 'all', 'wrong', 'blank'
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'unreviewed', 'reviewed'

  // Group submissions with wrong & blank question numbers & test-level review status
  const testGroupedSubmissions = useMemo(() => {
    if (!selectedStudent) return [];

    const studentSubs = submissions.filter(s => s.studentId === selectedStudent.id);

    return studentSubs.map(sub => {
      const wrongQuestions = [];
      const blankQuestions = [];
      let correctCount = 0;

      (sub.answers || []).forEach((ans, idx) => {
        const qNum = ans.subIndex !== undefined ? ans.subIndex + 1 : idx + 1;
        if (ans.isCorrect === true) {
          correctCount++;
        } else if (ans.isCorrect === false) {
          const isBlank = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '' || (typeof ans.userAnswer === 'string' && ans.userAnswer.trim() === '');
          if (isBlank) {
            blankQuestions.push({ qNum, questionId: ans.questionId, subIndex: ans.subIndex });
          } else {
            wrongQuestions.push({ qNum, questionId: ans.questionId, subIndex: ans.subIndex });
          }
        }
      });

      // Infer subject
      let subject = 'Genel';
      const titleLower = (sub.testTitle || '').toLowerCase();
      if (titleLower.includes('mat')) subject = 'Matematik';
      else if (titleLower.includes('fen')) subject = 'Fen Bilimleri';
      else if (titleLower.includes('türk') || titleLower.includes('turk')) subject = 'Türkçe';
      else if (titleLower.includes('sosyal')) subject = 'Sosyal Bilgiler';
      else if (titleLower.includes('ing')) subject = 'İngilizce';
      else if (titleLower.includes('deneme')) subject = 'Genel Deneme Sınavları';

      const isReviewed = reviewedSubSet.has(sub.id);

      return {
        ...sub,
        subject,
        wrongQuestions,
        blankQuestions,
        correctCount,
        totalQuestions: sub.answers?.length || 0,
        isReviewed,
        hasErrors: wrongQuestions.length > 0 || blankQuestions.length > 0
      };
    }).filter(s => s.hasErrors)
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [submissions, selectedStudent, reviewedSubSet]);

  // Calculate per-subject statistics for Subject Cards (Ders Kartları)
  const subjectCardStats = useMemo(() => {
    const statsMap = {};

    // 1. Add all user-registered subjects from Curriculum
    (curData?.subjects || []).forEach(s => {
      if (s.name) {
        statsMap[s.name] = { testCount: 0, wrongCount: 0, blankCount: 0, reviewedCount: 0 };
      }
    });

    // 2. Populate stats from actual test submissions with wrong answers
    testGroupedSubmissions.forEach(sub => {
      const subj = sub.subject || 'Diğer';
      if (!statsMap[subj]) {
        statsMap[subj] = { testCount: 0, wrongCount: 0, blankCount: 0, reviewedCount: 0 };
      }
      statsMap[subj].testCount += 1;
      statsMap[subj].wrongCount += sub.wrongQuestions.length;
      statsMap[subj].blankCount += sub.blankQuestions.length;
      if (sub.isReviewed) statsMap[subj].reviewedCount += 1;
    });

    return statsMap;
  }, [testGroupedSubmissions, curData]);

  // Global counts
  const globalWrongCount = useMemo(() => {
    return testGroupedSubmissions.reduce((acc, sub) => acc + sub.wrongQuestions.length, 0);
  }, [testGroupedSubmissions]);

  const globalBlankCount = useMemo(() => {
    return testGroupedSubmissions.reduce((acc, sub) => acc + sub.blankQuestions.length, 0);
  }, [testGroupedSubmissions]);

  const globalReviewedCount = useMemo(() => {
    return testGroupedSubmissions.filter(sub => sub.isReviewed).length;
  }, [testGroupedSubmissions]);

  // Filtered Test-based list for Level 2 (Inside Subject)
  const filteredTestSubmissions = useMemo(() => {
    if (!selectedSubject) return [];

    return testGroupedSubmissions.filter(sub => {
      const textMatch = 
        (sub.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject || '').toLowerCase().includes(searchQuery.toLowerCase());

      const subjectMatch = selectedSubject === 'all' || sub.subject === selectedSubject;

      let sourceMatch = true;
      if (sourceFilter === 'homework') sourceMatch = !!sub.isHomework;
      else if (sourceFilter === 'quiz') sourceMatch = !sub.isHomework;

      let typeMatch = true;
      if (ansTypeFilter === 'wrong') typeMatch = sub.wrongQuestions.length > 0;
      else if (ansTypeFilter === 'blank') typeMatch = sub.blankQuestions.length > 0;

      let reviewMatch = true;
      if (reviewFilter === 'unreviewed') reviewMatch = !sub.isReviewed;
      else if (reviewFilter === 'reviewed') reviewMatch = sub.isReviewed;

      return textMatch && subjectMatch && sourceMatch && typeMatch && reviewMatch;
    });
  }, [testGroupedSubmissions, selectedSubject, searchQuery, sourceFilter, ansTypeFilter, reviewFilter]);

  const currentSubjectInfo = useMemo(() => {
    if (!selectedSubject || selectedSubject === 'all') return { title: 'Tüm Dersler', count: testGroupedSubmissions.length };
    const st = subjectCardStats[selectedSubject] || { testCount: 0, wrongCount: 0, blankCount: 0, reviewedCount: 0 };
    return { title: selectedSubject, ...st };
  }, [selectedSubject, subjectCardStats, testGroupedSubmissions]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.75rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                if (selectedSubject !== null) {
                  setSelectedSubject(null);
                } else {
                  navigate('/student');
                }
              }}
              style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.6rem 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#334155', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
            >
              <ArrowLeft size={18} /> {selectedSubject !== null ? 'Ders Portalı / Kartlara Dön' : 'Öğrenci Paneli'}
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle color="#ef4444" size={28} /> Yanlışlarım & Sınav Kontrol Takibi
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {selectedSubject === null
                  ? 'Ders kartlarına tıklayarak içerisine girin, hangi sınavların yanlışlarını kontrol ettiğinizi görün.'
                  : `${currentSubjectInfo.title} dersine ait tüm sınavları ve kontrol durumlarını inceliyorsunuz.`}
              </p>
            </div>
          </div>

          {/* Student Selector Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: active ? '#ef4444' : 'transparent',
                    color: active ? 'white' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <GraduationCap size={16} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* LEVEL 1: COLORFUL SUBJECT CARDS PORTAL */}
        {selectedSubject === null && (
          <div>
            <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={22} color="#4f46e5" /> İncelemek İstediğiniz Ders Kartına Tıklayın:
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #fca5a5', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                  ❌ Yanlış: {globalWrongCount}
                </span>
                <span style={{ background: '#f8fafc', color: '#475569', border: '1.5px solid #cbd5e1', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                  ⚪ Boş: {globalBlankCount}
                </span>
                <span style={{ background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                  ✅ Kontrol Edilen Sınav: {globalReviewedCount} / {testGroupedSubmissions.length}
                </span>
              </div>
            </div>

            {/* VIBRANT COLORFUL SUBJECT CARDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              
              {/* SPECIAL "TÜM DERSLER" CARD */}
              <div
                onClick={() => setSelectedSubject('all')}
                style={{
                  background: subjectThemes['all_subjects'].bg,
                  borderRadius: '1.5rem',
                  padding: '1.75rem',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: subjectThemes['all_subjects'].shadow,
                  border: '1px solid rgba(255,255,255,0.3)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  minHeight: '220px'
                }}
              >
                <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.2, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                  <GraduationCap size={130} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={28} color="white" />
                  </div>

                  <span style={{ background: 'white', color: '#4f46e5', fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                    📄 {testGroupedSubmissions.length} Test / Sınav
                  </span>
                </div>

                <div style={{ position: 'relative', zIndex: 2, marginTop: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.2 }}>📚 Tüm Dersler (Genel Portföy)</h3>
                  
                  {/* High-Contrast Badges Bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ background: '#ffffff', color: '#b91c1c', border: '1.5px solid #fca5a5', padding: '0.3rem 0.65rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <XCircle size={14} color="#ef4444" />
                      <span>{globalWrongCount} Yanlış</span>
                    </div>

                    <div style={{ background: '#ffffff', color: '#334155', border: '1.5px solid #cbd5e1', padding: '0.3rem 0.65rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <HelpCircle size={14} color="#64748b" />
                      <span>{globalBlankCount} Boş</span>
                    </div>

                    <div style={{ background: '#ffffff', color: '#15803d', border: '1.5px solid #86efac', padding: '0.3rem 0.65rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>{globalReviewedCount}/{testGroupedSubmissions.length} Kontrol Edildi</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.85rem', fontSize: '0.88rem', fontWeight: 900 }}>
                    <span>Tüm Derslerin İçine Gir</span>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {/* INDIVIDUAL COLORFUL SUBJECT CARDS */}
              {Object.entries(subjectCardStats).map(([subjName, sStats]) => {
                const theme = subjectThemes[subjName] || subjectThemes['Diğer'];
                const Icon = theme.icon;

                return (
                  <div
                    key={subjName}
                    onClick={() => setSelectedSubject(subjName)}
                    style={{
                      background: theme.bg,
                      borderRadius: '1.5rem',
                      padding: '1.75rem',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: theme.shadow,
                      border: '1px solid rgba(255,255,255,0.25)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      minHeight: '220px'
                    }}
                  >
                    <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.18, transform: 'rotate(-12px)', pointerEvents: 'none' }}>
                      <Icon size={120} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={28} color="white" />
                      </div>

                      <span style={{ background: 'white', color: theme.color, fontSize: '0.85rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        📄 {sStats.testCount} Test / Sınav
                      </span>
                    </div>

                    <div style={{ position: 'relative', zIndex: 2, marginTop: '1.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{subjName}</h3>
                      
                      {/* High-Contrast Badges Bar */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                        <div style={{ background: '#ffffff', color: '#b91c1c', border: '1.5px solid #fca5a5', padding: '0.3rem 0.65rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <XCircle size={14} color="#ef4444" />
                          <span>{sStats.wrongCount} Yanlış</span>
                        </div>

                        <div style={{ background: '#ffffff', color: '#334155', border: '1.5px solid #cbd5e1', padding: '0.3rem 0.65rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <HelpCircle size={14} color="#64748b" />
                          <span>{sStats.blankCount} Boş</span>
                        </div>

                        <div style={{ background: '#ffffff', color: '#15803d', border: '1.5px solid #86efac', padding: '0.3rem 0.65rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={14} color="#10b981" />
                          <span>{sStats.reviewedCount}/{sStats.testCount} Kontrol Edildi</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.85rem', fontSize: '0.88rem', fontWeight: 900, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        <span>Dersin İçine Gir</span>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* LEVEL 2: INSIDE THE SELECTED SUBJECT FOLDER */}
        {selectedSubject !== null && (
          <div>
            
            {/* BREADCRUMB & SUBJECT FOLDER HEADER */}
            <div style={{ background: 'white', padding: '1.15rem 1.35rem', borderRadius: '1.25rem', border: '1.5px solid #c7d2fe', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setSelectedSubject(null)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.65rem', padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <ArrowLeft size={16} /> Tüm Ders Kartlarına Dön
                </button>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FolderOpen color="#4f46e5" size={20} />
                  <span>Yanlışlarım</span>
                  <ChevronRight size={16} color="#94a3b8" />
                  <span style={{ color: '#4f46e5' }}>{currentSubjectInfo.title} ({filteredTestSubmissions.length} Sınav)</span>
                </div>
              </div>

              {/* View Switcher inside folder */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '0.85rem' }}>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: viewMode === 'table' ? '#4f46e5' : 'transparent',
                    color: viewMode === 'table' ? 'white' : '#64748b',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Table size={16} /> 📊 Excel Tablo Görünümü
                </button>

                <button
                  onClick={() => setViewMode('cards')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: viewMode === 'cards' ? '#4f46e5' : 'transparent',
                    color: viewMode === 'cards' ? 'white' : '#64748b',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <List size={16} /> 📑 Kart Görünümü
                </button>
              </div>

            </div>

            {/* SEARCH & FILTERS BAR INSIDE FOLDER */}
            <div style={{ background: 'white', padding: '1.15rem 1.35rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              
              {/* Live Search Bar */}
              <div style={{ flex: '1 1 280px', position: 'relative' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`${currentSubjectInfo.title} içinde sınav adı ara...`}
                  style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                {/* REVIEWED TRACKING FILTER */}
                <select
                  value={reviewFilter}
                  onChange={e => setReviewFilter(e.target.value)}
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#334155', background: 'white', cursor: 'pointer' }}
                >
                  <option value="all">Tüm İnceleme Durumları</option>
                  <option value="unreviewed">⚠️ Kontrol Edilmeyen Sınavlar</option>
                  <option value="reviewed">✅ Kontrol Edilen Sınavlar</option>
                </select>

                {/* Answer Type Filter */}
                <select
                  value={ansTypeFilter}
                  onChange={e => setAnsTypeFilter(e.target.value)}
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#334155', background: 'white', cursor: 'pointer' }}
                >
                  <option value="all">Tüm Yanlış ve Boşlar</option>
                  <option value="wrong">❌ Sadece Yanlış Yapılanlar</option>
                  <option value="blank">⚪ Sadece Boş Bırakılanlar</option>
                </select>

                {/* Source Filter */}
                <select
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#334155', background: 'white', cursor: 'pointer' }}
                >
                  <option value="all">Tüm Sınav Kaynakları</option>
                  <option value="homework">📝 Ödev Sınavları</option>
                  <option value="quiz">⚡ Test / Bireysel Sınavlar</option>
                </select>
              </div>

            </div>

            {/* INSIDE FOLDER MODE 1: EXCEL SINGLE-ROW TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ background: 'white', borderRadius: '1.25rem', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', fontSize: '0.82rem', color: '#334155' }}>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>SINAV / ÖDEV BAŞLIĞI</th>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>DERS</th>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>TARİH</th>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>TÜR</th>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>❌ YANLIŞ SORULAR</th>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>⚪ BOŞ SORULAR</th>
                      <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>KONTROL DURUMU</th>
                      <th style={{ padding: '1rem 1.15rem', textAlign: 'right', fontWeight: 900 }}>EYLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTestSubmissions.map((sub, idx) => {
                      const theme = subjectThemes[sub.subject] || subjectThemes['Diğer'];
                      const SubjectIcon = theme.icon;
                      const isZebra = idx % 2 === 1;

                      return (
                        <tr key={sub.id || idx} style={{ borderBottom: '1px solid #e2e8f0', background: isZebra ? '#f8fafc' : 'white', transition: 'background 0.15s' }}>
                          
                          {/* Title */}
                          <td style={{ padding: '0.9rem 1.15rem' }}>
                            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                              {sub.testTitle || 'Test Sınavı'}
                            </div>
                          </td>

                          {/* Subject */}
                          <td style={{ padding: '0.9rem 1.15rem' }}>
                            <span style={{ background: theme.bg, color: 'white', fontSize: '0.75rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                              <SubjectIcon size={13} color="white" /> {sub.subject}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '0.9rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', whitespace: 'nowrap' }}>
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </td>

                          {/* Type */}
                          <td style={{ padding: '0.9rem 1.15rem', whitespace: 'nowrap' }}>
                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                              {sub.isHomework ? '📝 Ödev' : '⚡ Bireysel'}
                            </span>
                          </td>

                          {/* Wrong Question Numbers */}
                          <td style={{ padding: '0.9rem 1.15rem' }}>
                            {sub.wrongQuestions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                {sub.wrongQuestions.map(qObj => (
                                  <button
                                    key={qObj.qNum}
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    title="Sınav Kağıdında İncele"
                                    style={{
                                      background: '#fef2f2',
                                      color: '#b91c1c',
                                      border: '1.5px solid #fca5a5',
                                      padding: '0.15rem 0.55rem',
                                      borderRadius: '0.45rem',
                                      fontWeight: 900,
                                      fontSize: '0.78rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    S{qObj.qNum}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>-</span>
                            )}
                          </td>

                          {/* Blank Question Numbers */}
                          <td style={{ padding: '0.9rem 1.15rem' }}>
                            {sub.blankQuestions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                {sub.blankQuestions.map(qObj => (
                                  <button
                                    key={qObj.qNum}
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    title="Sınav Kağıdında İncele"
                                    style={{
                                      background: '#ffffff',
                                      color: '#475569',
                                      border: '1.5px solid #cbd5e1',
                                      padding: '0.15rem 0.55rem',
                                      borderRadius: '0.45rem',
                                      fontWeight: 900,
                                      fontSize: '0.78rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    S{qObj.qNum}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>-</span>
                            )}
                          </td>

                          {/* Whole-Test Review Status Badge */}
                          <td style={{ padding: '0.9rem 1.15rem', whitespace: 'nowrap' }}>
                            <button
                              onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                              title={sub.isReviewed ? "Kontrol Edildi (Değiştirmek İçin Tıklayın)" : "Kontrol Edilmedi (İşaretlemek İçin Tıklayın)"}
                              style={{
                                background: sub.isReviewed ? '#dcfce7' : '#fffbe6',
                                color: sub.isReviewed ? '#166534' : '#92400e',
                                border: sub.isReviewed ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.65rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              {sub.isReviewed ? <CheckCircle2 size={14} color="#10b981" /> : <Clock size={14} color="#d97706" />}
                              <span>{sub.isReviewed ? '✓ Kontrol Edildi' : '⚠️ Kontrol Et'}</span>
                            </button>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', whitespace: 'nowrap' }}>
                            <button
                              onClick={(e) => handleOpenReview(sub.id, e)}
                              style={{
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                padding: '0.45rem 0.9rem',
                                borderRadius: '0.65rem',
                                fontWeight: 900,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 2px 6px rgba(79,70,229,0.25)'
                              }}
                            >
                              <Eye size={14} /> Sınavı Aç
                            </button>
                          </td>

                        </tr>
                      );
                    })}

                    {filteredTestSubmissions.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b', background: 'white' }}>
                          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
                          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>Bu Filtrelerde Sınav Bulunmuyor</h4>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>Filtreleri veya arama kelimenizi değiştirebilirsiniz.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* INSIDE FOLDER MODE 2: TEST CARDS VIEW */}
            {viewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.25rem' }}>
                {filteredTestSubmissions.map((sub, idx) => {
                  const theme = subjectThemes[sub.subject] || subjectThemes['Diğer'];
                  const SubjectIcon = theme.icon;

                  return (
                    <div
                      key={sub.id || idx}
                      style={{
                        background: 'white',
                        borderRadius: '1.25rem',
                        padding: '1.35rem',
                        border: '1.5px solid #e2e8f0',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        gap: '1.15rem',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: theme.color }} />

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                          <span style={{ background: theme.bg, color: 'white', fontSize: '0.75rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <SubjectIcon size={14} color="white" /> {sub.subject}
                          </span>

                          <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                            {sub.isHomework ? '📝 Ödev Sınavı' : '⚡ Bireysel Sınav'}
                          </span>
                        </div>

                        <h3 style={{ margin: '0.35rem 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.35 }}>
                          {sub.testTitle || 'Test Sınavı'}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginTop: '0.4rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={14} /> {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </span>
                          <span>✓ {sub.correctCount} / {sub.totalQuestions} Doğru</span>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {sub.wrongQuestions.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#b91c1c', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <XCircle size={14} color="#ef4444" /> Yanlış Yapılan Sorular:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {sub.wrongQuestions.map(qObj => (
                                <button
                                  key={qObj.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  style={{
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    border: '1.5px solid #fca5a5',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 900,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Soru {qObj.qNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {sub.blankQuestions.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#475569', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <HelpCircle size={14} color="#64748b" /> Boş Bırakılan Sorular:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {sub.blankQuestions.map(qObj => (
                                <button
                                  key={qObj.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  style={{
                                    background: '#ffffff',
                                    color: '#475569',
                                    border: '1.5px solid #cbd5e1',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 900,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Soru {qObj.qNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                        <button
                          onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                          style={{
                            background: sub.isReviewed ? '#dcfce7' : '#fffbe6',
                            color: sub.isReviewed ? '#166534' : '#92400e',
                            border: sub.isReviewed ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            padding: '0.3rem 0.75rem',
                            borderRadius: '0.65rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {sub.isReviewed ? <CheckCircle2 size={14} color="#10b981" /> : <Clock size={14} color="#d97706" />}
                          <span>{sub.isReviewed ? '✓ Kontrol Edildi' : '⚠️ Kontrol Et'}</span>
                        </button>

                        <button
                          onClick={(e) => handleOpenReview(sub.id, e)}
                          style={{
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            padding: '0.55rem 1.15rem',
                            borderRadius: '0.75rem',
                            fontWeight: 900,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 4px 10px rgba(79,70,229,0.25)'
                          }}
                        >
                          <Eye size={16} /> Sınavı Aç
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
