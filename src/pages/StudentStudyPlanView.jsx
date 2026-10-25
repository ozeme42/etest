import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  ArrowLeft, Target, CheckCircle2, Lock, PlayCircle, ExternalLink,
  Calendar, Check, Compass, Sparkles, Edit3, ChevronDown, ChevronRight,
  BookOpen, Layers, Play, Trophy, Flame, Zap, Award, RotateCcw, Link2,
  CheckCircle, Filter, BookMarked
} from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import ManualTestModal from '../components/ManualTestModal';
import { getSubjectTheme } from './StudyPlanDetail';
import './StudyPlan.css';

export default function StudentStudyPlanView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { assignmentId: paramAssignmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, users } = useAuth();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();
  const { submissions = [] } = useEvaluation();
  const { coachingProfile } = useCoaching();
  const { theme } = useTheme() || {};
  const isDark = theme === 'dark';

  const [manualTestModalData, setManualTestModalData] = useState({ isOpen: false, data: null, topicId: null });
  const [selectedDersName, setSelectedDersName] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('ders');
      return q || null;
    } catch {
      return null;
    }
  });

  const [activeUnitFilter, setActiveUnitFilter] = useState('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'

  // Effective student
  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);
  const effectiveStudent = useMemo(() => {
    if (currentUser?.role === 'student') return currentUser;
    const savedStudentId = localStorage.getItem('etest_selected_student_id');
    if (savedStudentId) {
      const found = studentMembers.find(s => String(s.id) === String(savedStudentId));
      if (found) return found;
    }
    return studentMembers[0] || currentUser;
  }, [currentUser, studentMembers]);

  const studentId = effectiveStudent?.id;

  const myAssignments = useMemo(() => {
    return (studyAssignments || []).filter(a => String(a.studentId) === String(studentId));
  }, [studyAssignments, studentId]);

  const [activeAssignmentId, setActiveAssignmentId] = useState(paramAssignmentId || null);

  useEffect(() => {
    if (paramAssignmentId) {
      setActiveAssignmentId(paramAssignmentId);
    } else if (myAssignments.length > 0 && !activeAssignmentId) {
      setActiveAssignmentId(myAssignments[0].id);
    }
  }, [paramAssignmentId, myAssignments, activeAssignmentId]);

  const currentAssignmentId = activeAssignmentId || paramAssignmentId || myAssignments[0]?.id;
  const assignment = (studyAssignments || []).find(a => String(a.id) === String(currentAssignmentId));

  // Resolved Plan (fallback to first available plan if assignment has none)
  const plan = useMemo(() => {
    if (assignment) {
      const found = (studyPlans || []).find(p => String(p.id) === String(assignment?.planId || assignment?.studyPlanId));
      if (found) return found;
    }
    if (studyPlans && studyPlans.length > 0) {
      return studyPlans[0];
    }
    // Fallback virtual plan constructed from coachingProfile topicPool if available
    if (coachingProfile && Array.isArray(coachingProfile.topicPool) && coachingProfile.topicPool.length > 0) {
      return {
        id: 'coaching_plan',
        title: 'Müfredat Yol Haritası',
        description: 'Öğrencinin güncel müfredat ve konu havuzu',
        definedSubjects: coachingProfile.topicPool.map(s => s.name || s.subject).filter(Boolean),
        subjects: coachingProfile.topicPool.map((s, idx) => ({
          id: `c_unit_${idx}`,
          name: s.name || s.subject || `${idx + 1}. Ders`,
          subject: s.name || s.subject || 'Genel',
          topics: (s.topics || []).map((t, tIdx) => (
            typeof t === 'string'
              ? { id: `ct_${idx}_${tIdx}`, name: t }
              : { id: t.id || `ct_${idx}_${tIdx}`, name: t.name || `Konu ${tIdx + 1}` }
          ))
        }))
      };
    }
    return null;
  }, [assignment, studyPlans, coachingProfile]);

  // Set of completed topics
  const completedTopics = useMemo(() => {
    let list = assignment?.completedTopics || [];
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch {}
    }
    const planStudentCompletions = plan?.raw_data?.completedTopicsByStudent?.[studentId] ||
                                   plan?.completedTopicsByStudent?.[studentId] || [];
    const merged = new Set([
      ...(Array.isArray(list) ? list : []),
      ...(Array.isArray(planStudentCompletions) ? planStudentCompletions : [])
    ]);
    return merged;
  }, [assignment, plan, studentId]);

  // Map submissions to topics by topic name / ID
  const topicSubmissionMap = useMemo(() => {
    const map = new Map();
    (submissions || []).forEach(sub => {
      if (!sub) return;
      if (studentId && sub.studentId && String(sub.studentId) !== String(studentId)) return;
      const tName = sub.topic || sub.unitTopic || sub.testName || sub.title;
      if (tName) {
        const cleanName = String(tName).trim().toLowerCase();
        if (!map.has(cleanName) || new Date(sub.submittedAt || sub.createdAt || 0) > new Date(map.get(cleanName).submittedAt || 0)) {
          map.set(cleanName, sub);
        }
      }
      if (sub.topicId) {
        map.set(String(sub.topicId), sub);
      }
    });
    return map;
  }, [submissions, studentId]);

  const getTopicResult = (topic, groupDersName) => {
    if (!topic) return null;
    const cleanTopic = String(topic.name || '').trim().toLowerCase();
    const sub = topicSubmissionMap.get(String(topic.id)) ||
                topicSubmissionMap.get(cleanTopic) ||
                (groupDersName ? topicSubmissionMap.get(`${groupDersName} - ${cleanTopic}`.toLowerCase()) : null);

    if (!sub) return null;

    const c = Number(sub.correctCount ?? sub.correct_count ?? sub.correct ?? 0);
    const w = Number(sub.wrongCount ?? sub.wrong_count ?? sub.wrong ?? 0);
    const e = Number(sub.emptyCount ?? sub.empty_count ?? sub.blankCount ?? 0);
    const explicitQ = Number(sub.totalQuestions ?? sub.questionCount ?? 0);
    const q = (c + w + e > 0) ? (c + w + e) : (explicitQ > 0 ? explicitQ : 20);

    let scoreVal = 0;
    const explicitPct = sub.scorePercentage ?? sub.scorePct ?? sub.accuracy ?? sub.successRate;
    if (explicitPct !== undefined && explicitPct !== null && !isNaN(Number(explicitPct))) {
      scoreVal = Math.min(100, Math.max(0, Math.round(Number(explicitPct))));
    } else if (q > 0) {
      scoreVal = Math.min(100, Math.max(0, Math.round((c / q) * 100)));
    } else if (c > 0 && w === 0) {
      scoreVal = 100;
    }

    return {
      score: scoreVal,
      correctCount: c,
      wrongCount: w,
      emptyCount: e,
      totalQuestions: q
    };
  };

  // Group units and topics by Ders (Subject)
  const dersGroups = useMemo(() => {
    if (!plan) return [];
    const map = new Map();
    const defined = plan.definedSubjects || [];

    // First preserve defined subjects order
    defined.forEach(d => {
      if (!map.has(d)) map.set(d, []);
    });

    // Group units under their respective subject
    (plan.subjects || []).forEach(unit => {
      const ders = unit.subject || (defined.length === 1 ? defined[0] : null);
      const key = ders || (defined.length === 1 ? defined[0] : 'Genel');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(unit);
    });

    return Array.from(map.entries()).map(([dersName, units]) => {
      const theme = getSubjectTheme(dersName);
      const totalUnits = units.length;
      
      // Flatten topics with unit reference
      const allTopics = [];
      units.forEach((u, uIdx) => {
        (u.topics || []).forEach((t, tIdx) => {
          allTopics.push({
            ...t,
            unitId: u.id,
            unitName: u.name,
            unitIdx: uIdx + 1,
            unitDueDate: u.dueDate,
            unitResourceUrl: u.resourceUrl,
            subjectName: dersName,
            isCompleted: completedTopics.has(t.id)
          });
        });
      });

      const totalTopics = allTopics.length;
      const completedTopicsCount = allTopics.filter(t => t.isCompleted).length;
      const progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;
      const nextTopic = allTopics.find(t => !t.isCompleted) || null;

      return {
        dersName,
        theme,
        units,
        totalUnits,
        topics: allTopics,
        totalTopics,
        completedTopicsCount,
        progress,
        nextTopic,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
      };
    });
  }, [plan, completedTopics]);

  // Overall KPI
  const { totalPlanTopics, completedPlanTopics, overallPct } = useMemo(() => {
    let tot = 0;
    let comp = 0;
    dersGroups.forEach(g => {
      tot += g.totalTopics;
      comp += g.completedTopicsCount;
    });
    const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
    return { totalPlanTopics: tot, completedPlanTopics: comp, overallPct: pct };
  }, [dersGroups]);

  // Mark / Unmark completion
  const handleMarkCompleted = async (topicId) => {
    if (!assignment && !plan) return;
    if (completedTopics.has(topicId)) return;
    const curr = Array.from(completedTopics);
    const newCompleted = [...curr, topicId];
    if (assignment) {
      await updateStudyAssignment(assignment.id, {
        completedTopics: newCompleted,
        studyPlanId: plan?.id || assignment.studyPlanId || assignment.planId,
        studentId
      });
    }
  };

  const handleUnmarkCompleted = async (topicId) => {
    if (!assignment && !plan) return;
    const curr = Array.from(completedTopics);
    const newCompleted = curr.filter(id => String(id) !== String(topicId));
    if (assignment) {
      await updateStudyAssignment(assignment.id, {
        completedTopics: newCompleted,
        studyPlanId: plan?.id || assignment.studyPlanId || assignment.planId,
        studentId
      });
    }
  };

  // Selected Ders Object
  const currentDers = useMemo(() => {
    if (!selectedDersName) return null;
    return dersGroups.find(g => g.dersName === selectedDersName) || null;
  }, [dersGroups, selectedDersName]);

  // Filtered topics inside the selected course
  const filteredTopics = useMemo(() => {
    if (!currentDers) return [];
    let list = currentDers.topics || [];
    if (activeUnitFilter !== 'all') {
      list = list.filter(t => String(t.unitId) === String(activeUnitFilter));
    }
    if (activeStatusFilter === 'completed') {
      list = list.filter(t => t.isCompleted);
    } else if (activeStatusFilter === 'pending') {
      list = list.filter(t => !t.isCompleted);
    }
    return list;
  }, [currentDers, activeUnitFilter, activeStatusFilter]);

  if (!plan) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '520px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🗺️</div>
          <h2 style={{ color: 'var(--color-text, #0f172a)', fontWeight: 900, fontSize: '1.45rem', margin: '0 0 0.5rem' }}>
            Yol Haritası Hazırlanıyor
          </h2>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.55 }}>
            Şu an atanmış bir ders planı bulunmuyor. Haftalık ders programından ve konu havuzundan tüm çalışma hedeflerinizi yönetebilirsiniz.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/my-program?tab=konular')}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.85rem', color: '#ffffff', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
            >
              <Compass size={18} /> Müfredat Hedeflerini Aç
            </button>
            <button 
              onClick={() => navigate('/student')}
              style={{ padding: '0.75rem 1.25rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1.5px solid var(--color-border, #cbd5e1)', borderRadius: '0.85rem', color: 'var(--color-text, #0f172a)', fontWeight: 800, cursor: 'pointer' }}
            >
              Ana Panele Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="study-plans-page-container custom-scrollbar" style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      backgroundImage: isDark
        ? 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(168, 85, 247, 0.10) 0%, transparent 45%), var(--color-bg)'
        : 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(168, 85, 247, 0.05) 0%, transparent 45%), var(--color-bg)',
      padding: isMobile ? '0.75rem 0.65rem calc(75px + env(safe-area-inset-bottom, 0px))' : '1.25rem 1.25rem 70px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* ── TOP ACTION & BREADCRUMB BAR ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {selectedDersName ? (
              <button
                type="button"
                onClick={() => setSelectedDersName(null)}
                className="game-btn-3d"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                  borderRadius: 14,
                  padding: isMobile ? '0.45rem 0.85rem' : '0.52rem 1.15rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 900,
                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                  color: isDark ? '#ffffff' : '#1e293b',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <ArrowLeft size={16} />
                <span>Tüm Derslere Dön</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/student')}
                className="game-btn-3d"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                  borderRadius: 14,
                  padding: isMobile ? '0.45rem 0.85rem' : '0.52rem 1.15rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 900,
                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                  color: isDark ? '#ffffff' : '#1e293b',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <ArrowLeft size={16} />
                <span>Öğrenci Paneli</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/my-program?tab=konular')}
              className="game-btn-3d"
              style={{
                background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1.5px solid #c7d2fe',
                borderRadius: 14,
                padding: isMobile ? '0.45rem 0.85rem' : '0.52rem 1.15rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: '#6366f1'
              }}
            >
              <Compass size={15} />
              <span>Haftalık Program</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/study-room')}
            className="game-btn-3d"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: 14,
              padding: isMobile ? '0.45rem 0.85rem' : '0.52rem 1.15rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.84rem',
              color: '#ffffff',
              boxShadow: '0 3px 10px rgba(245,158,11,0.35)'
            }}
          >
            <Play size={13} fill="#ffffff" />
            <span>⏱️ Odak & Çalışma Odası</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════
            1. GÖRÜNÜM: TÜM DERSLERİN BENTO GRID GÖRÜNÜMÜ (DESKTOP ÇOKLU SÜTUN)
            ══════════════════════════════════════════════════════════ */}
        {!selectedDersName && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 🎯 GENEL HERO BENTO KART */}
            <div className="study-glass-card" style={{
              padding: isMobile ? '1.15rem 1rem' : '1.75rem 2rem',
              borderRadius: 22,
              position: 'relative',
              overflow: 'hidden',
              background: isDark
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
                : 'linear-gradient(135deg, #ffffff, #f8fafc)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0',
              boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 8px 24px rgba(99,102,241,0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: 'rgba(99,102,241,0.14)',
                      color: '#818cf8',
                      padding: '2px 8px',
                      borderRadius: 99,
                      border: '1px solid rgba(165,180,252,0.35)'
                    }}>
                      MÜFREDAT & ADIM ZİNCİRİ
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                      color: 'var(--color-text-muted)'
                    }}>
                      {dersGroups.length} Farklı Ders
                    </span>
                  </div>
                  <h1 style={{
                    margin: 0,
                    fontSize: isMobile ? '1.35rem' : '1.85rem',
                    fontWeight: 900,
                    color: 'var(--color-text)',
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '-0.025em'
                  }}>
                    Ders Yol Haritası 🗺️
                  </h1>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: isMobile ? '0.78rem' : '0.88rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: 600
                  }}>
                    Her dersin ünite ve konu adımlarını zincir şeklinde tamamla, hedeflerine ulaş!
                  </p>
                </div>

                {/* Multiple assignments selector */}
                {myAssignments.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {myAssignments.map((asgn) => {
                      const p = (studyPlans || []).find(sp => String(sp.id) === String(asgn.planId || asgn.studyPlanId));
                      const isSel = String(asgn.id) === String(assignment?.id);
                      return (
                        <button
                          key={asgn.id}
                          type="button"
                          onClick={() => setActiveAssignmentId(asgn.id)}
                          style={{
                            padding: '0.35rem 0.85rem',
                            borderRadius: 10,
                            border: isSel ? '1.5px solid #818cf8' : '1px solid var(--color-border)',
                            background: isSel ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                            color: isSel ? '#ffffff' : 'var(--color-text)',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🗺️ {p?.title || 'Yol Haritası'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bento KPI Pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: isMobile ? '0.65rem' : '0.9rem'
              }}>
                <div style={{
                  background: isDark ? 'rgba(99, 102, 241, 0.12)' : '#f0f4ff',
                  border: isDark ? '1px solid rgba(99, 102, 241, 0.28)' : '1px solid #dbeafe',
                  borderRadius: 16,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ fontSize: '1.6rem' }}>🎯</div>
                  <div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>
                      %{overallPct}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      Genel İlerleme
                    </div>
                  </div>
                </div>

                <div style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                  border: isDark ? '1px solid rgba(16, 185, 129, 0.28)' : '1px solid #bbf7d0',
                  borderRadius: 16,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ fontSize: '1.6rem' }}>✅</div>
                  <div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                      {completedPlanTopics} / {totalPlanTopics}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      Tamamlanan Konu
                    </div>
                  </div>
                </div>

                <div style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
                  border: isDark ? '1px solid rgba(245, 158, 11, 0.28)' : '1px solid #fde68a',
                  borderRadius: 16,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ fontSize: '1.6rem' }}>⭐</div>
                  <div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                      +{completedPlanTopics * 25} XP
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      Kazanılan Deneyim
                    </div>
                  </div>
                </div>

                <div style={{
                  background: isDark ? 'rgba(139, 92, 246, 0.12)' : '#faf5ff',
                  border: isDark ? '1px solid rgba(139, 92, 246, 0.28)' : '1px solid #e9d5ff',
                  borderRadius: 16,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ fontSize: '1.6rem' }}>📚</div>
                  <div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#8b5cf6', lineHeight: 1 }}>
                      {dersGroups.length} Ders
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      Aktif Müfredat
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BÜYÜK DERS KARTLARI (DESKTOP ÇOKLU SÜTUN BENTO GRID) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: isMobile ? '0.85rem' : '1.25rem'
            }}>
              {dersGroups.map((group) => {
                const isAllDone = group.progress === 100 && group.totalTopics > 0;
                const isInProgress = group.progress > 0 && !isAllDone;

                return (
                  <div
                    key={group.dersName}
                    onClick={() => setSelectedDersName(group.dersName)}
                    className="game-card-elevated"
                    style={{
                      background: isDark ? 'var(--color-surface, #1e293b)' : '#ffffff',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid #e2e8f0',
                      borderTop: `5px solid ${group.theme.color}`,
                      borderRadius: 20,
                      padding: isMobile ? '1.1rem' : '1.35rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: isDark
                        ? '0 6px 20px rgba(0,0,0,0.3)'
                        : '0 4px 18px rgba(0,0,0,0.04)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Top Row: Icon, Subject Title & Status Pill */}
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: isMobile ? 44 : 50,
                            height: isMobile ? 44 : 50,
                            borderRadius: 14,
                            background: group.theme.bg,
                            border: `1.5px solid ${group.theme.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: isMobile ? '1.5rem' : '1.75rem',
                            flexShrink: 0,
                            boxShadow: `0 4px 12px ${group.theme.border}`
                          }}>
                            {group.theme.icon}
                          </div>
                          <div>
                            <h3 style={{
                              margin: 0,
                              fontSize: isMobile ? '1.15rem' : '1.3rem',
                              fontWeight: 900,
                              color: 'var(--color-text)',
                              fontFamily: "'Outfit', sans-serif",
                              letterSpacing: '-0.02em'
                            }}>
                              {group.dersName}
                            </h3>
                            <span style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-text-muted)',
                              fontWeight: 700
                            }}>
                              {group.totalUnits} Ünite · {group.totalTopics} Konu Adımı
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isAllDone ? (
                          <span style={{
                            background: isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.35)',
                            padding: '3px 8px',
                            borderRadius: 99,
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            🏆 Tamamlandı
                          </span>
                        ) : isInProgress ? (
                          <span style={{
                            background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
                            color: '#4f46e5',
                            border: '1px solid rgba(99,102,241,0.35)',
                            padding: '3px 8px',
                            borderRadius: 99,
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            ⚡ Devam Ediyor
                          </span>
                        ) : (
                          <span style={{
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                            padding: '3px 8px',
                            borderRadius: 99,
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}>
                            ⏳ Başlanmadı
                          </span>
                        )}
                      </div>

                      {/* Progress Bar & Percent */}
                      <div style={{ marginTop: '0.65rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          marginBottom: 6
                        }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                            Ders Başarısı
                          </span>
                          <span style={{
                            fontSize: '1.25rem',
                            fontWeight: 900,
                            color: isAllDone ? '#10b981' : group.theme.color,
                            fontFamily: "'Outfit', sans-serif"
                          }}>
                            %{group.progress}
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: 9,
                          background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                          borderRadius: 99,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${group.progress}%`,
                            height: '100%',
                            background: isAllDone
                              ? 'linear-gradient(90deg, #10b981, #059669)'
                              : `linear-gradient(90deg, ${group.theme.color}, #a855f7)`,
                            borderRadius: 99,
                            transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }} />
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--color-text-muted)',
                          marginTop: 6
                        }}>
                          <span>{group.completedTopicsCount} / {group.totalTopics} Tamamlandı</span>
                          <span>+{group.completedTopicsCount * 25} XP</span>
                        </div>
                      </div>

                      {/* Sıradaki Hedef Sneak-Peek */}
                      {group.nextTopic ? (
                        <div style={{
                          marginTop: '0.85rem',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 12,
                          background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#f8faff',
                          border: isDark ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid #e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: '#6366f1',
                            color: '#ffffff'
                          }}>
                            SIRADAKİ
                          </span>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: 'var(--color-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {group.nextTopic.name}
                          </span>
                        </div>
                      ) : (
                        <div style={{
                          marginTop: '0.85rem',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 12,
                          background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                          border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: '#10b981'
                        }}>
                          <CheckCircle size={15} />
                          <span>Tüm konular başarıyla tamamlandı!</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Pill */}
                    <div style={{
                      paddingTop: '0.5rem',
                      borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        color: group.theme.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        Yol Haritasını Aç
                        <ChevronRight size={15} />
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: 'var(--color-text-muted)'
                      }}>
                        Zinciri İncele ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            2. GÖRÜNÜM: SEÇİLİ DERSİN DETAY SAYFASI & ZİNCİR BAĞLANTILI KONU KARTLARI
            ══════════════════════════════════════════════════════════ */}
        {selectedDersName && currentDers && (
          <div className="prog-anim-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 🎯 SEÇİLİ DERS BAŞLIK KARTI */}
            <div className="study-glass-card" style={{
              padding: isMobile ? '1.15rem 1rem' : '1.75rem 2rem',
              borderRadius: 22,
              borderTop: `6px solid ${currentDers.theme.color}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
                : 'linear-gradient(135deg, #ffffff, #f8fafc)',
              boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 8px 24px rgba(99,102,241,0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: isMobile ? 50 : 60,
                    height: isMobile ? 50 : 60,
                    borderRadius: 18,
                    background: currentDers.theme.bg,
                    border: `2px solid ${currentDers.theme.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '1.85rem' : '2.25rem',
                    flexShrink: 0,
                    boxShadow: `0 6px 16px ${currentDers.theme.border}`
                  }}>
                    {currentDers.theme.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        background: currentDers.theme.bg,
                        color: currentDers.theme.color,
                        padding: '2px 8px',
                        borderRadius: 99,
                        border: `1px solid ${currentDers.theme.border}`
                      }}>
                        DERS YOL HARİTASI
                      </span>
                    </div>
                    <h1 style={{
                      margin: 0,
                      fontSize: isMobile ? '1.35rem' : '1.85rem',
                      fontWeight: 900,
                      color: 'var(--color-text)',
                      fontFamily: "'Outfit', sans-serif",
                      letterSpacing: '-0.025em'
                    }}>
                      {currentDers.dersName}
                    </h1>
                    <p style={{
                      margin: '3px 0 0',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 700
                    }}>
                      {currentDers.totalUnits} Ünite · {currentDers.totalTopics} Konu Adımı
                    </p>
                  </div>
                </div>

                {/* Progress Pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                  padding: '0.65rem 1.15rem',
                  borderRadius: 16,
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: currentDers.theme.color, lineHeight: 1 }}>
                      %{currentDers.progress}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {currentDers.completedTopicsCount} / {currentDers.totalTopics} Tamamlandı
                    </div>
                  </div>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: currentDers.theme.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentDers.theme.color
                  }}>
                    <Award size={22} />
                  </div>
                </div>
              </div>

              {/* Subject Wide Progress Bar */}
              <div style={{
                width: '100%',
                height: 10,
                background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                borderRadius: 99,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${currentDers.progress}%`,
                  height: '100%',
                  background: currentDers.progress === 100
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : `linear-gradient(90deg, ${currentDers.theme.color}, #ec4899)`,
                  borderRadius: 99,
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} />
              </div>

              {/* Filters Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9'
              }}>
                {/* Ünite Seçici Filtre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveUnitFilter('all')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: 10,
                      border: activeUnitFilter === 'all' ? `1.5px solid ${currentDers.theme.color}` : '1px solid var(--color-border)',
                      background: activeUnitFilter === 'all' ? currentDers.theme.bg : 'transparent',
                      color: activeUnitFilter === 'all' ? currentDers.theme.color : 'var(--color-text)',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Tüm Üniteler ({currentDers.totalTopics})
                  </button>
                  {currentDers.units.map((u, idx) => {
                    const isUActive = String(activeUnitFilter) === String(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setActiveUnitFilter(u.id)}
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: 10,
                          border: isUActive ? `1.5px solid ${currentDers.theme.color}` : '1px solid var(--color-border)',
                          background: isUActive ? currentDers.theme.bg : 'transparent',
                          color: isUActive ? currentDers.theme.color : 'var(--color-text)',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {idx + 1}. Ünite ({u.topics?.length || 0})
                      </button>
                    );
                  })}
                </div>

                {/* Durum Filtresi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[
                    { id: 'all', label: 'Tümü' },
                    { id: 'pending', label: 'Devam Eden' },
                    { id: 'completed', label: 'Tamamlanan' }
                  ].map(st => {
                    const isStActive = activeStatusFilter === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setActiveStatusFilter(st.id)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: 8,
                          border: isStActive ? '1px solid #6366f1' : '1px solid transparent',
                          background: isStActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: isStActive ? '#6366f1' : 'var(--color-text-muted)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                🔗 ZİNCİR BAĞLANTILI KONU KARTLARI (CHAIN LEARNING PATH)
                ══════════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
              
              {filteredTopics.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  background: 'var(--color-surface, #ffffff)',
                  borderRadius: 18,
                  border: '1.5px dashed var(--color-border)'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Seçilen filtrede konu bulunamadı</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Filtreleri sıfırlayarak tüm müfredat zincirini görüntüleyebilirsiniz.
                  </p>
                </div>
              ) : (
                (() => {
                  let foundFirstIncomplete = false;

                  return filteredTopics.map((topic, tIdx) => {
                    const isCompleted = topic.isCompleted;
                    let isCurrent = false;
                    let isLocked = false;

                    if (!isCompleted) {
                      if (!foundFirstIncomplete) {
                        isCurrent = true;
                        foundFirstIncomplete = true;
                      } else {
                        isLocked = true;
                      }
                    }

                    const isLast = tIdx === filteredTopics.length - 1;
                    const testResult = getTopicResult(topic, currentDers.dersName);
                    const score = testResult?.score;

                    let isOverdue = false;
                    try {
                      isOverdue = topic.dueDate && isPast(parseISO(topic.dueDate)) && !isCompleted;
                    } catch {}

                    return (
                      <div
                        key={topic.id || tIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          gap: isMobile ? 12 : 18,
                          position: 'relative'
                        }}
                      >
                        {/* ── SOL SÜTUN: ZİNCİR ÇİZGİSİ VE DÜĞÜM (CHAIN TIMELINE NODE) ── */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: isMobile ? 36 : 46,
                          flexShrink: 0,
                          position: 'relative'
                        }}>
                          {/* Üst Bağlantı Zinciri */}
                          <div style={{
                            width: 3,
                            height: 18,
                            background: tIdx === 0
                              ? 'transparent'
                              : isCompleted
                              ? '#10b981'
                              : isCurrent
                              ? 'linear-gradient(to bottom, #10b981, #6366f1)'
                              : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                            borderRadius: 2
                          }} />

                          {/* Zincir Düğümü (Node Circle) */}
                          <div style={{
                            width: isMobile ? 34 : 42,
                            height: isMobile ? 34 : 42,
                            borderRadius: '50%',
                            background: isCompleted
                              ? 'linear-gradient(135deg, #10b981, #059669)'
                              : isCurrent
                              ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                              : isDark ? '#1e293b' : '#f1f5f9',
                            border: isCompleted
                              ? '3px solid #34d399'
                              : isCurrent
                              ? '3px solid #a5b4fc'
                              : isDark ? '2px solid rgba(255,255,255,0.15)' : '2px solid #cbd5e1',
                            color: isCompleted || isCurrent ? '#ffffff' : 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: isMobile ? '0.74rem' : '0.84rem',
                            boxShadow: isCompleted
                              ? '0 0 14px rgba(16, 185, 129, 0.45)'
                              : isCurrent
                              ? '0 0 18px rgba(99, 102, 241, 0.55)'
                              : 'none',
                            flexShrink: 0,
                            zIndex: 2,
                            transition: 'all 0.2s'
                          }}>
                            {isCompleted ? (
                              <Check size={isMobile ? 16 : 20} strokeWidth={3} />
                            ) : isCurrent ? (
                              <Zap size={isMobile ? 15 : 18} fill="#ffffff" />
                            ) : isLocked ? (
                              <Lock size={isMobile ? 13 : 15} />
                            ) : (
                              tIdx + 1
                            )}
                          </div>

                          {/* Alt Bağlantı Zinciri */}
                          {!isLast && (
                            <div style={{
                              width: 3,
                              flex: 1,
                              minHeight: 30,
                              background: isCompleted
                                ? '#10b981'
                                : isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
                              borderRadius: 2
                            }} />
                          )}
                        </div>

                        {/* ── SAĞ SÜTUN: TEST KARTI STİLİNDE KONU KARTI (QUEST TEST CARD) ── */}
                        <div
                          className="game-card-elevated"
                          style={{
                            flex: 1,
                            marginBottom: isMobile ? '0.85rem' : '1.15rem',
                            background: isCompleted
                              ? (isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)')
                              : isCurrent
                              ? (isDark ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.14), var(--color-surface))' : 'linear-gradient(145deg, rgba(99, 102, 241, 0.06), #ffffff)')
                              : (isDark ? 'var(--color-surface, #1e293b)' : '#ffffff'),
                            borderTop: `4px solid ${isCompleted ? '#10b981' : isCurrent ? '#6366f1' : currentDers.theme.color}`,
                            borderLeft: `1.5px solid ${isCompleted ? 'rgba(16,185,129,0.35)' : isCurrent ? '#818cf8' : 'var(--color-border)'}`,
                            borderRight: `1.5px solid ${isCompleted ? 'rgba(16,185,129,0.35)' : isCurrent ? '#818cf8' : 'var(--color-border)'}`,
                            borderBottom: `1.5px solid ${isCompleted ? 'rgba(16,185,129,0.35)' : isCurrent ? '#818cf8' : 'var(--color-border)'}`,
                            borderRadius: isMobile ? 14 : 18,
                            padding: isMobile ? '0.75rem 0.85rem' : '1rem 1.25rem',
                            opacity: isLocked ? 0.65 : 1,
                            boxShadow: isCurrent
                              ? '0 0 0 2px rgba(99, 102, 241, 0.35), 0 8px 24px rgba(99, 102, 241, 0.18)'
                              : isCompleted
                              ? '0 2px 10px rgba(16,185,129,0.08)'
                              : '0 2px 8px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.65rem',
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                        >
                          {/* 1. Satır: Ders Rozeti, XP, Adım No ve Başarı Rozeti */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                background: currentDers.theme.bg,
                                color: currentDers.theme.color,
                                border: `1px solid ${currentDers.theme.border}`,
                                borderRadius: 8,
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <span>{currentDers.theme.icon}</span>
                                <span>{currentDers.dersName}</span>
                              </span>

                              <span style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#d97706',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 8,
                                padding: '2px 7px',
                                fontSize: '0.7rem',
                                fontWeight: 900
                              }}>
                                +25 XP
                              </span>

                              <span style={{
                                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                                color: 'var(--color-text-muted)',
                                borderRadius: 8,
                                padding: '2px 7px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}>
                                ADIM {tIdx + 1}
                              </span>
                            </div>

                            {/* Durum / Test Başarı Rozeti */}
                            {testResult && score !== null && score !== undefined ? (
                              <span style={{
                                background: score >= 80 ? (isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7') : score >= 60 ? (isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7') : (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'),
                                color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444',
                                border: `1px solid ${score >= 80 ? 'rgba(16,185,129,0.35)' : score >= 60 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'}`,
                                borderRadius: 99,
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <span>{score >= 80 ? '🏆' : score >= 60 ? '📈' : '⚠️'}</span>
                                <span>%{score} • {score >= 80 ? 'Güçlü' : score >= 60 ? 'Gelişiyor' : 'Tekrar Etmeli'}</span>
                              </span>
                            ) : isCompleted ? (
                              <span style={{
                                background: isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7',
                                color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.35)',
                                borderRadius: 99,
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <Check size={12} strokeWidth={3} />
                                Tamamlandı
                              </span>
                            ) : isCurrent ? (
                              <span style={{
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff',
                                borderRadius: 99,
                                padding: '2px 9px',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                boxShadow: '0 2px 8px rgba(99,102,241,0.35)'
                              }}>
                                <Zap size={11} fill="#ffffff" />
                                ŞİMDİKİ HEDEF
                              </span>
                            ) : isLocked ? (
                              <span style={{
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                color: 'var(--color-text-muted)',
                                borderRadius: 99,
                                padding: '2px 8px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <Lock size={11} />
                                Kilitli
                              </span>
                            ) : null}
                          </div>

                          {/* 2. Satır: Konu Adı Başlığı */}
                          <div>
                            <h4 style={{
                              margin: 0,
                              fontSize: isMobile ? '0.98rem' : '1.12rem',
                              fontWeight: 900,
                              color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text)',
                              fontFamily: "'Outfit', sans-serif",
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              lineHeight: 1.3
                            }}>
                              {topic.name}
                            </h4>
                          </div>

                          {/* 3. Satır: Detay Hapları (Ünite, Soru Sayısı, Doğru/Yanlış ve Tarih) */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.45rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--color-text-muted)'
                          }}>
                            {/* Ünite Adı */}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <BookOpen size={12} />
                              <span>{topic.unitName}</span>
                            </span>

                            <span style={{ opacity: 0.4 }}>•</span>

                            {/* Soru Sayısı */}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Edit3 size={12} />
                              <span>{testResult?.totalQuestions || 20} Soru</span>
                            </span>

                            {/* Doğru / Yanlış Bilgisi (Eğer Test Çözüldüyse) */}
                            {testResult && (testResult.correctCount > 0 || testResult.wrongCount > 0) && (
                              <>
                                <span style={{ opacity: 0.4 }}>•</span>
                                <span style={{ color: '#10b981', fontWeight: 800 }}>
                                  ✅ {testResult.correctCount} Doğru
                                </span>
                                <span style={{ color: '#ef4444', fontWeight: 800 }}>
                                  ❌ {testResult.wrongCount} Yanlış
                                </span>
                              </>
                            )}

                            {/* Son Teslim / Hedef Tarihi */}
                            {(topic.dueDate || topic.unitDueDate) && (
                              <>
                                <span style={{ opacity: 0.4 }}>•</span>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: isOverdue ? '#ef4444' : 'var(--color-text-muted)',
                                  fontWeight: isOverdue ? 900 : 700
                                }}>
                                  <Calendar size={12} />
                                  <span>{isOverdue ? 'Gecikti:' : 'Hedef:'} {topic.dueDate || topic.unitDueDate}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* 4. Satır: Eylem Butonları */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 8,
                            flexWrap: 'wrap',
                            paddingTop: '0.4rem',
                            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9'
                          }}>
                            {/* Çalışma Kaynağı Bağlantısı */}
                            {(topic.resourceUrl || topic.unitResourceUrl) && (
                              <a
                                href={topic.resourceUrl || topic.unitResourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '0.38rem 0.75rem',
                                  borderRadius: 10,
                                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-text)',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <PlayCircle size={13} />
                                <span>Kaynak ↗</span>
                              </a>
                            )}

                            {/* Test Sonucu Gir / Düzenle Butonu */}
                            <button
                              type="button"
                              onClick={() => {
                                setManualTestModalData({
                                  isOpen: true,
                                  data: {
                                    studentId: studentId,
                                    bookTitle: plan.title,
                                    subject: currentDers.dersName,
                                    unitTopic: `${topic.unitName} - ${topic.name}`,
                                    testName: `${topic.name} Testi`,
                                    totalQuestions: testResult?.totalQuestions || 20
                                  },
                                  topicId: topic.id
                                });
                              }}
                              className="game-btn-3d"
                              style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: 10,
                                background: isCompleted
                                  ? (isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc')
                                  : 'rgba(16, 185, 129, 0.12)',
                                border: isCompleted
                                  ? '1px solid var(--color-border)'
                                  : '1.5px solid rgba(16, 185, 129, 0.4)',
                                color: isCompleted ? 'var(--color-text)' : '#10b981',
                                fontSize: '0.76rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={13} />
                              <span>{isCompleted ? 'D/Y Düzenle' : '⚡ Test Sonucu Gir'}</span>
                            </button>

                            {/* Bitirdim / Geri Al Butonu */}
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleUnmarkCompleted(topic.id)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: 10,
                                  background: 'transparent',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-text-muted)',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Tamamlanma durumunu geri al"
                              >
                                <RotateCcw size={12} />
                                <span>Geri Al</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkCompleted(topic.id)}
                                className="game-btn-3d game-btn-emerald"
                                style={{
                                  padding: '0.42rem 0.95rem',
                                  borderRadius: 10,
                                  fontSize: '0.78rem',
                                  fontWeight: 900,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  cursor: 'pointer'
                                }}
                              >
                                <CheckCircle2 size={14} />
                                <span>Bitirdim</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        )}

      </div>

      {/* Manuel Test Sonucu Ekleme Modalı */}
      <ManualTestModal
        isOpen={manualTestModalData.isOpen}
        initialData={manualTestModalData.data}
        onClose={() => setManualTestModalData({ isOpen: false, data: null, topicId: null })}
        onSaved={() => {
          if (manualTestModalData.topicId) {
            handleMarkCompleted(manualTestModalData.topicId);
          }
        }}
      />
    </div>
  );
}
