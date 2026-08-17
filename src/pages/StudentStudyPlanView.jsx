import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { ArrowLeft, Target, CheckCircle2, Lock, PlayCircle, ExternalLink, Calendar, Check, Compass, Sparkles } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import './StudyPlan.css';

export default function StudentStudyPlanView() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();

  const assignment = studyAssignments.find(a => String(a.id) === String(assignmentId));
  const plan = studyPlans.find(p => String(p.id) === String(assignment?.planId || assignment?.studyPlanId));

  const completedTopics = useMemo(() => new Set(assignment?.completedTopics || []), [assignment]);

  if (!assignment || !plan) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '460px' }}>
          <Target size={48} style={{ color: '#818cf8', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.4rem' }}>Görev Bulunamadı</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Atanan çalışma planı silinmiş veya süresi dolmuş olabilir.
          </p>
          <button 
            onClick={() => navigate(-1)}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
          >
            ← Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
  const progressPct = totalTopics > 0 ? (completedTopics.size / totalTopics) * 100 : 0;

  const handleMarkCompleted = async (topicId) => {
    if (completedTopics.has(topicId)) return;
    const newCompleted = [...(assignment.completedTopics || []), topicId];
    await updateStudyAssignment(assignmentId, { completedTopics: newCompleted });
  };

  const handleUnmarkCompleted = async (topicId) => {
    const newCompleted = (assignment.completedTopics || []).filter(id => id !== topicId);
    await updateStudyAssignment(assignmentId, { completedTopics: newCompleted });
  };

  let hasFoundLocked = false;

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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
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
                <span style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', padding: '0.2rem 0.65rem', borderRadius: '0.45rem', border: '1px solid rgba(165,180,252,0.3)', display: 'inline-block', marginBottom: '0.35rem' }}>
                  ÖĞRENCİ YOL HARİTASI
                </span>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {plan.title}
                </h1>
              </div>
            </div>

            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(236,72,153,0.3))', border: '1.5px solid rgba(165,180,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', flexShrink: 0 }}>
              <Target size={28} />
            </div>
          </div>

          {/* Live Progress Bar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem 1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>İlerleme Durumu</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: progressPct === 100 ? '#34d399' : '#818cf8' }}>
                %{Math.round(progressPct)}
              </span>
            </div>

            <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.35)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginTop: '0.65rem' }}>
              <span>🟢 {completedTopics.size} Adım Tamamlandı</span>
              <span>📑 {totalTopics} Toplam Adım</span>
            </div>
          </div>
        </div>

        {/* ── SUBJECTS & TOPICS LIST ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {(plan.subjects || []).map((subject, sIdx) => {
            let isSubjectOverdue = false;
            try {
              isSubjectOverdue = subject.dueDate && isPast(parseISO(subject.dueDate));
            } catch(e) {}

            return (
              <div key={subject.id} className="study-glass-card" style={{ overflow: 'hidden' }}>
                
                {/* Unit Title Bar */}
                <div style={{ padding: '1rem 1.4rem', background: 'rgba(99, 102, 241, 0.12)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '0.55rem', background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>
                      {sIdx + 1}
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                      {subject.name}
                    </h2>
                  </div>

                  {subject.dueDate && (
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: isSubjectOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.18)', color: isSubjectOverdue ? '#f87171' : '#38bdf8', border: `1px solid ${isSubjectOverdue ? 'rgba(239,68,68,0.35)' : 'rgba(56,189,248,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} /> Hedef: {subject.dueDate}
                    </div>
                  )}
                </div>

                {/* Topics Container */}
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(subject.topics || []).map((topic, tIdx) => {
                    const isCompleted = completedTopics.has(topic.id);
                    let isLocked = false;
                    let isCurrent = false;

                    if (!isCompleted) {
                      if (!hasFoundLocked) {
                        isCurrent = true;
                        hasFoundLocked = true;
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
                          padding: '0.9rem 1.15rem',
                          borderRadius: '0.85rem',
                          background: isCompleted 
                            ? 'rgba(16, 185, 129, 0.08)' 
                            : isCurrent 
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.18))' 
                            : 'rgba(255, 255, 255, 0.02)',
                          border: `1.5px solid ${isCompleted ? 'rgba(52, 211, 153, 0.4)' : isCurrent ? 'rgba(165, 180, 252, 0.45)' : 'rgba(255, 255, 255, 0.06)'}`,
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
                                : '2px solid rgba(255,255,255,0.2)',
                              background: isCompleted 
                                ? 'linear-gradient(135deg, #10b981, #059669)' 
                                : isCurrent 
                                ? 'rgba(99,102,241,0.2)' 
                                : 'rgba(255,255,255,0.05)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                              flexShrink: 0,
                              boxShadow: isCompleted ? '0 2px 8px rgba(16,185,129,0.4)' : 'none'
                            }}
                          >
                            {isCompleted && <Check size={16} />}
                            {isLocked && <Lock size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                          </button>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: isCompleted ? '#34d399' : isCurrent ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}>
                                {topic.day ? (topic.day.toLowerCase().startsWith('gün') ? topic.day : `Gün ${topic.day}`) : `Adım ${tIdx + 1}`}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '0.3rem' }}>
                                  ŞİMDİKİ ADIM
                                </span>
                              )}
                              {isTopicOverdue && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(239,68,68,0.25)', color: '#f87171', padding: '0.1rem 0.45rem', borderRadius: '0.3rem' }}>
                                  GECİKTİ
                                </span>
                              )}
                            </div>

                            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: isCompleted ? 'rgba(255,255,255,0.6)' : '#ffffff', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {topic.name}
                            </h3>

                            {topic.dueDate && (
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>
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
                                background: isLocked ? 'rgba(255,255,255,0.05)' : isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: isLocked ? 'rgba(255,255,255,0.4)' : '#ffffff',
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
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      Bu üniteye henüz konu eklenmemiş.
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
