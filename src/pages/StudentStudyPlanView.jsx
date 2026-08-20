import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { ArrowLeft, Target, CheckCircle2, Lock, PlayCircle, ExternalLink, Calendar, Check, Compass, Sparkles, Edit3 } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import ManualTestModal from '../components/ManualTestModal';
import './StudyPlan.css';

export default function StudentStudyPlanView() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();
  const [manualTestModalData, setManualTestModalData] = useState({ isOpen: false, data: null, topicId: null });

  const assignment = studyAssignments.find(a => String(a.id) === String(assignmentId));
  const plan = studyPlans.find(p => String(p.id) === String(assignment?.planId || assignment?.studyPlanId));

  const completedTopics = useMemo(() => new Set(assignment?.completedTopics || []), [assignment]);

  if (!assignment || !plan) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '460px' }}>
          <Target size={48} style={{ color: '#818cf8', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--color-text, #0f172a)', fontWeight: 900, fontSize: '1.4rem' }}>Görev Bulunamadı</h2>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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

            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2))', border: '1.5px solid rgba(165,180,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
              <Target size={28} />
            </div>
          </div>

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
                <div style={{ padding: '1rem 1.4rem', background: 'var(--color-surface-hover, #f8fafc)', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '0.55rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(165,180,252,0.3)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>
                      {sIdx + 1}
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                      {subject.name}
                    </h2>
                  </div>

                  {subject.dueDate && (
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: isSubjectOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(56,189,248,0.12)', color: isSubjectOverdue ? '#ef4444' : '#0284c7', border: `1px solid ${isSubjectOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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

                            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: isCompleted ? 'var(--color-text-muted, #64748b)' : 'var(--color-text, #0f172a)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {topic.name}
                            </h3>

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
                                  subject: subject.name,
                                  unitTopic: topic.name,
                                  testName: `${topic.name} Testi`,
                                  totalQuestions: 20
                                },
                                topicId: topic.id
                              });
                            }}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '0.65rem',
                              background: 'var(--color-surface, #ffffff)',
                              border: '1.5px solid #86efac',
                              color: '#166534',
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
          })}
        </div>

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
