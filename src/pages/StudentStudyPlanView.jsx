import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { ArrowLeft, Target, CheckCircle2, Lock, PlayCircle, ExternalLink, Calendar, Check, Compass, Sparkles, Edit3, ChevronDown, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import ManualTestModal from '../components/ManualTestModal';
import { getSubjectTheme } from './StudyPlanDetail';
import './StudyPlan.css';

export default function StudentStudyPlanView() {
  const { assignmentId: paramAssignmentId } = useParams();
  const navigate = useNavigate();
  const { currentUser, users } = useAuth();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();
  const [manualTestModalData, setManualTestModalData] = useState({ isOpen: false, data: null, topicId: null });

  // Effective student (if student, currentUser; if teacher/admin, check selected student)
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
  const plan = (studyPlans || []).find(p => String(p.id) === String(assignment?.planId || assignment?.studyPlanId));

  const completedTopics = useMemo(() => {
    let list = assignment?.completedTopics || [];
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch {}
    }
    return new Set(Array.isArray(list) ? list : []);
  }, [assignment]);

  const [expandedDersler, setExpandedDersler] = useState({});

  const toggleDers = (dersName) => {
    setExpandedDersler(prev => ({
      ...prev,
      [dersName]: prev[dersName] === undefined ? false : !prev[dersName]
    }));
  };

  // Group units by Ders (Subject)
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
      const totalTopics = units.reduce((acc, u) => acc + (u.topics?.length || 0), 0);
      const completedTopicsCount = units.reduce((acc, u) => acc + (u.topics || []).filter(t => completedTopics.has(t.id)).length, 0);
      const progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;

      return {
        dersName,
        theme,
        units,
        totalUnits,
        totalTopics,
        completedTopicsCount,
        progress
      };
    });
  }, [plan, completedTopics]);

  if (!assignment || !plan) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '520px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <h2 style={{ color: 'var(--color-text, #0f172a)', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 0.5rem' }}>
            Yol Haritası
          </h2>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Öğretmeniniz tarafından adınıza özel atanmış bir yol haritası bulunmuyor veya görev süresi dolmuş olabilir.
            Tüm derslerin ünite ve konularını içeren genel müfredat yol haritanızı açabilirsiniz.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/my-program?tab=konular')}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Compass size={18} /> Müfredat Yol Haritasını Aç
            </button>
            <button 
              onClick={() => navigate('/student')}
              style={{ padding: '0.75rem 1.25rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1.5px solid var(--color-border, #cbd5e1)', borderRadius: '0.75rem', color: 'var(--color-text, #0f172a)', fontWeight: 800, cursor: 'pointer' }}
            >
              Ana Panele Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
  const progressPct = totalTopics > 0 ? (completedTopics.size / totalTopics) * 100 : 0;

  const handleMarkCompleted = async (topicId) => {
    if (!assignment) return;
    if (completedTopics.has(topicId)) return;
    let curr = assignment.completedTopics || [];
    if (typeof curr === 'string') {
      try { curr = JSON.parse(curr); } catch {}
    }
    const newCompleted = [...(Array.isArray(curr) ? curr : []), topicId];
    await updateStudyAssignment(assignment.id, { completedTopics: newCompleted });
  };

  const handleUnmarkCompleted = async (topicId) => {
    if (!assignment) return;
    let curr = assignment.completedTopics || [];
    if (typeof curr === 'string') {
      try { curr = JSON.parse(curr); } catch {}
    }
    const newCompleted = (Array.isArray(curr) ? curr : []).filter(id => id !== topicId);
    await updateStudyAssignment(assignment.id, { completedTopics: newCompleted });
  };

  return (
    <div className="study-plans-page-container custom-scrollbar">
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* ── TOP HERO CARD ── */}
        <div className="study-glass-card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => navigate(-1)}
                style={{
                  padding: '0.65rem',
                  borderRadius: '0.85rem',
                  background: 'var(--color-surface-hover, #f1f5f9)',
                  border: '1.5px solid var(--color-border, #cbd5e1)',
                  color: 'var(--color-text, #0f172a)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Geri Dön"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '0.2rem 0.65rem', borderRadius: '0.45rem', border: '1px solid rgba(165,180,252,0.3)', display: 'inline-block', marginBottom: '0.35rem' }}>
                  ÖĞRENCİ YOL HARİTASI
                </span>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', letterSpacing: '-0.02em' }}>
                  {plan.title}
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/my-program?tab=konular')}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(124, 58, 237, 0.12)',
                  border: '1.5px solid rgba(168, 85, 247, 0.35)',
                  color: '#8b5cf6',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <Compass size={15} /> Müfredat Haritası (Tüm Konular) ↗
              </button>

              <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2))', border: '1.5px solid rgba(165,180,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                <Target size={28} />
              </div>
            </div>
          </div>

          {/* Birden fazla yol haritası atanmışsa kolay geçiş sekmeleri */}
          {myAssignments.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)' }}>Haritalarım:</span>
              {myAssignments.map((asgn) => {
                const p = (studyPlans || []).find(sp => String(sp.id) === String(asgn.planId || asgn.studyPlanId));
                const isSelected = String(asgn.id) === String(assignment?.id);
                return (
                  <button
                    key={asgn.id}
                    type="button"
                    onClick={() => setActiveAssignmentId(asgn.id)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '0.65rem',
                      border: isSelected ? '1.5px solid #818cf8' : '1px solid var(--color-border, #cbd5e1)',
                      background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface, #ffffff)',
                      color: isSelected ? '#ffffff' : 'var(--color-text, #0f172a)',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                    }}
                  >
                    🗺️ {p?.title || 'Yol Haritası'}
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Progress Bar */}
          <div style={{ background: 'var(--color-surface-hover, #f8fafc)', padding: '1.25rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text, #0f172a)' }}>İlerleme Durumu</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: progressPct === 100 ? '#10b981' : '#6366f1' }}>
                %{Math.round(progressPct)}
              </span>
            </div>

            <div style={{ width: '100%', height: '10px', background: 'var(--color-border, #e2e8f0)', borderRadius: '1rem', overflow: 'hidden' }}>
              <div 
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: progressPct === 100 
                    ? 'linear-gradient(90deg, #10b981, #34d399)' 
                    : 'linear-gradient(90deg, #6366f1, #ec4899)',
                  borderRadius: '1rem',
                  transition: 'width 0.6s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginTop: '0.65rem' }}>
              <span>🟢 {completedTopics.size} Adım Tamamlandı</span>
              <span>📑 {totalTopics} Toplam Adım</span>
            </div>
          </div>
        </div>

        {/* ── DERSLER, ÜNİTELER & KONULAR ── */}
        {(() => {
          const showDersHeader = dersGroups.length > 1 || dersGroups.some(g => g.dersName !== 'Genel');
          let globalUnitIndex = 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {dersGroups.map((group) => {
                const isExpanded = expandedDersler[group.dersName] !== false;
                // ⭐ Her dersin ilk konusu açık olacak, konu tamamlandıkça o derste bir sonraki konu açılacak:
                let hasFoundIncompleteInDers = false;

                return (
                  <div 
                    key={group.dersName} 
                    style={{
                      borderRadius: '1.25rem',
                      background: 'var(--color-surface, #ffffff)',
                      border: `1.5px solid ${showDersHeader ? group.theme.border : 'var(--color-border, #e2e8f0)'}`,
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Ders Header (when multiple dersler or explicit ders set) */}
                    {showDersHeader && (
                      <div
                        onClick={() => toggleDers(group.dersName)}
                        style={{
                          padding: '1rem 1.4rem',
                          background: group.theme.bg,
                          borderBottom: isExpanded ? `1.5px solid ${group.theme.border}` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.4rem' }}>{group.theme.icon}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                                {group.dersName}
                              </h2>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '0.45rem', background: 'rgba(255,255,255,0.85)', color: group.theme.color, border: `1px solid ${group.theme.border}` }}>
                                {group.totalUnits} Ünite · {group.totalTopics} Adım
                              </span>
                            </div>
                            <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                              Tamamlanan: {group.completedTopicsCount} / {group.totalTopics} (%{group.progress})
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {/* Mini Progress Bar for this Ders */}
                          <div style={{ width: '100px', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '1rem', overflow: 'hidden', display: 'flex' }}>
                            <div 
                              style={{ 
                                width: `${group.progress}%`, 
                                background: group.theme.color, 
                                borderRadius: '1rem',
                                transition: 'width 0.4s ease'
                              }} 
                            />
                          </div>

                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--color-border, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text, #475569)' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Units List */}
                    {isExpanded && (
                      <div style={{ padding: showDersHeader ? '1.25rem' : '0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {group.units.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted, #94a3b8)', fontStyle: 'italic', fontSize: '0.88rem' }}>
                            Bu derse ait henüz ünite tanımlanmamış.
                          </div>
                        ) : (
                          group.units.map((subject) => {
                            globalUnitIndex += 1;
                            const uIdx = globalUnitIndex;

                            let isSubjectOverdue = false;
                            try {
                              isSubjectOverdue = subject.dueDate && isPast(parseISO(subject.dueDate));
                            } catch(e) {}

                            return (
                              <div 
                                key={subject.id} 
                                style={{ 
                                  borderRadius: '0.9rem',
                                  border: '1.5px solid var(--color-border, #e2e8f0)',
                                  background: 'var(--color-surface, #ffffff)',
                                  overflow: 'hidden' 
                                }}
                              >
                                {/* Unit Title Bar */}
                                <div style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface-hover, #f8fafc)', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '0.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(165,180,252,0.3)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 900 }}>
                                      {uIdx}
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                                      {subject.name}
                                    </h3>
                                  </div>

                                  {subject.dueDate && (
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: isSubjectOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(56,189,248,0.12)', color: isSubjectOverdue ? '#ef4444' : '#0284c7', border: `1px solid ${isSubjectOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      <Calendar size={13} /> Hedef: {subject.dueDate}
                                    </div>
                                  )}
                                </div>

                                {/* Topics Container */}
                                <div style={{ padding: '0.9rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                  {(subject.topics || []).map((topic, tIdx) => {
                                    const isCompleted = completedTopics.has(topic.id);
                                    let isLocked = false;
                                    let isCurrent = false;

                                    if (!isCompleted) {
                                      if (!hasFoundIncompleteInDers) {
                                        isCurrent = true;
                                        hasFoundIncompleteInDers = true;
                                      } else {
                                        isLocked = true;
                                      }
                                    }

                                    let isTopicOverdue = false;
                                    try {
                                      isTopicOverdue = topic.dueDate && isPast(parseISO(topic.dueDate)) && !isCompleted;
                                    } catch(e) {}

                                    return (
                                      <div
                                        key={topic.id}
                                        style={{
                                          padding: '0.85rem 1.1rem',
                                          borderRadius: '0.8rem',
                                          background: isCompleted 
                                            ? 'rgba(16, 185, 129, 0.08)' 
                                            : isCurrent 
                                            ? 'rgba(99, 102, 241, 0.1)' 
                                            : 'var(--color-surface-hover, #f8fafc)',
                                          border: `1.5px solid ${isCompleted ? 'rgba(52, 211, 153, 0.4)' : isCurrent ? 'rgba(165, 180, 252, 0.45)' : 'var(--color-border, #e2e8f0)'}`,
                                          opacity: isLocked ? 0.45 : 1,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: '0.75rem',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                                          
                                          {/* Checkbox / Lock */}
                                          <button
                                            onClick={() => {
                                              if (isLocked) return;
                                              if (isCompleted) handleUnmarkCompleted(topic.id);
                                              else handleMarkCompleted(topic.id);
                                            }}
                                            disabled={isLocked}
                                            style={{
                                              width: '32px',
                                              height: '32px',
                                              borderRadius: '50%',
                                              border: isCompleted 
                                                ? 'none' 
                                                : isCurrent 
                                                ? '2px solid #818cf8' 
                                                : '2px solid var(--color-border-input, #cbd5e1)',
                                              background: isCompleted 
                                                ? 'linear-gradient(135deg, #10b981, #059669)' 
                                                : isCurrent 
                                                ? 'rgba(99,102,241,0.15)' 
                                                : 'var(--color-surface, #ffffff)',
                                              color: '#ffffff',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: isLocked ? 'not-allowed' : 'pointer',
                                              flexShrink: 0,
                                              boxShadow: isCompleted ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
                                            }}
                                          >
                                            {isCompleted && <Check size={16} />}
                                            {isLocked && <Lock size={14} style={{ color: 'var(--color-text-muted, #94a3b8)' }} />}
                                          </button>

                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                              <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: isCompleted ? '#10b981' : isCurrent ? '#6366f1' : 'var(--color-text-muted, #64748b)' }}>
                                                {topic.day ? (topic.day.toLowerCase().startsWith('gün') ? topic.day : `Gün ${topic.day}`) : `Adım ${tIdx + 1}`}
                                              </span>
                                              {isCurrent && (
                                                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '0.3rem' }}>
                                                  ŞİMDİKİ ADIM
                                                </span>
                                              )}
                                              {isTopicOverdue && (
                                                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.1rem 0.45rem', borderRadius: '0.3rem' }}>
                                                  GECİKTİ
                                                </span>
                                              )}
                                            </div>

                                            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: isCompleted ? 'var(--color-text-muted, #64748b)' : 'var(--color-text, #0f172a)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                                              {topic.name}
                                            </h4>

                                            {topic.dueDate && (
                                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: '#0284c7', fontWeight: 700 }}>
                                                Son Tarih: {topic.dueDate}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Right Buttons */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                          {(topic.resourceUrl || subject.resourceUrl) && (
                                            <a
                                              href={topic.resourceUrl || subject.resourceUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={e => { if (isLocked) e.preventDefault(); }}
                                              style={{
                                                padding: '0.45rem 0.85rem',
                                                borderRadius: '0.65rem',
                                                background: isLocked ? 'var(--color-surface-hover, #f1f5f9)' : isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-hover, #f1f5f9)',
                                                border: '1px solid var(--color-border, #cbd5e1)',
                                                color: isLocked ? 'var(--color-text-muted, #94a3b8)' : isCurrent ? '#ffffff' : 'var(--color-text, #0f172a)',
                                                fontSize: '0.78rem',
                                                fontWeight: 800,
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                cursor: isLocked ? 'not-allowed' : 'pointer'
                                              }}
                                            >
                                              {isLocked ? <Lock size={13} /> : <PlayCircle size={14} />}
                                              Çalışma Kaynağı ↗
                                            </a>
                                          )}

                                          <button
                                            disabled={isLocked}
                                            onClick={() => {
                                              setManualTestModalData({
                                                isOpen: true,
                                                data: {
                                                  studentId: assignment.studentId,
                                                  bookTitle: plan.title,
                                                  subject: subject.subject || group.dersName || 'Genel',
                                                  unitTopic: `${subject.name} - ${topic.name}`,
                                                  testName: `${topic.name} Testi`,
                                                  totalQuestions: 20
                                                },
                                                topicId: topic.id
                                              });
                                            }}
                                            style={{
                                              padding: '0.45rem 0.85rem',
                                              borderRadius: '0.65rem',
                                              background: 'rgba(16, 185, 129, 0.12)',
                                              border: '1.5px solid rgba(52, 211, 153, 0.4)',
                                              color: '#10b981',
                                              fontSize: '0.78rem',
                                              fontWeight: 800,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.35rem',
                                              cursor: isLocked ? 'not-allowed' : 'pointer'
                                            }}
                                          >
                                            <Edit3 size={13} /> {isCompleted ? 'D/Y Düzenle' : '⚡ Test Sonucu Gir'}
                                          </button>

                                          {isCurrent && !isCompleted && (
                                            <button
                                              onClick={() => handleMarkCompleted(topic.id)}
                                              style={{
                                                padding: '0.45rem 0.95rem',
                                                borderRadius: '0.65rem',
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                border: 'none',
                                                color: '#ffffff',
                                                fontSize: '0.8rem',
                                                fontWeight: 900,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                                              }}
                                            >
                                              <CheckCircle2 size={15} /> Bitirdim
                                            </button>
                                          )}
                                        </div>

                                      </div>
                                    );
                                  })}

                                  {(!subject.topics || subject.topics.length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                      Bu üniteye henüz konu eklenmemiş.
                                    </div>
                                  )}
                                </div>

                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

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
