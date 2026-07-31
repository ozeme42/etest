import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, BookHeart, FileText, CheckCircle, BookOpen, ChevronDown, ChevronUp, Check, AlertCircle, Clock } from "lucide-react";
import { useStudyPlan } from "../context/StudyPlanContext";
import { useUser } from "../context/UserContext";
import "./StudyPlanDetail.css";

export default function StudyPlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { studyPlans, studyAssignments, addStudyAssignment } = useStudyPlan();
  const { users } = useUser();
  
  const plan = studyPlans.find(p => p.id === id);
  const students = users.filter(u => u.role === 'student');

  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  
  // Assign Form state
  const [assignStudentIds, setAssignStudentIds] = useState([]);
  
  // Quick hack: Use today and +7 days instead of a calendar picker
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // NEW: State for student progress details modal
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

  if (!plan) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      Yükleniyor...
    </div>
  );

  const toggleTopicSelection = (topic) => {
    setSelectedTopics(prev => 
      prev.some(t => t.id === topic.id)
        ? prev.filter(t => t.id !== topic.id)
        : [...prev, topic]
    );
  };

  const toggleSubject = (subjId) => {
    setExpandedSubjects(prev => ({ ...prev, [subjId]: !prev[subjId] }));
  };
  
  const handleAssignSelectedTopics = (e) => {
    e.preventDefault();
    if (selectedTopics.length === 0 || assignStudentIds.length === 0) {
      alert("Lütfen en az bir konu ve bir öğrenci seçin.");
      return;
    }
    
    for (const topic of selectedTopics) {
      const subject = plan.subjects.find(s => s.topics.some(t => t.id === topic.id));
      if (!subject) continue;

      for (const studentId of assignStudentIds) {
        addStudyAssignment({
          studentId: studentId,
          studyPlanId: plan.id,
          subject: subject.name,
          topic: topic.name,
          topicId: topic.id,
          startDate: startDate,
          dueDate: endDate,
        });
      }
    }
    
    alert(`${selectedTopics.length} konu, ${assignStudentIds.length} öğrenciye başarıyla atandı.`);
    setIsAssignDialogOpen(false);
    setSelectedTopics([]);
    setAssignStudentIds([]);
  };

  const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;

  // Calculate Student Progress
  const planAssignments = studyAssignments.filter(a => a.studyPlanId === plan.id);
  const studentProgress = {};
  planAssignments.forEach(a => {
    if (!studentProgress[a.studentId]) {
      studentProgress[a.studentId] = { 
        total: 0, 
        completed: 0, 
        studentName: users.find(u => u.id === a.studentId)?.name || 'Öğrenci' 
      };
    }
    studentProgress[a.studentId].total += 1;
    if (a.status === 'completed') {
      studentProgress[a.studentId].completed += 1;
    }
  });
  const assignedStudentIds = Object.keys(studentProgress);

  return (
    <div className="study-plan-detail-container">
      <div className="sp-header-sticky">
        <div className="sp-header-content">
          <div className="sp-header-left">
            <button onClick={() => navigate('/study-plans')} className="btn-icon text-muted hover:text-primary">
              <ArrowLeft size={24} />
            </button>
            <div className="icon-box-pink">
              <BookHeart size={24} />
            </div>
            <div className="sp-header-titles">
              <h1 title={plan.title}>{plan.title}</h1>
              <p>Plan Detayları</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAssignDialogOpen(true)} 
            disabled={selectedTopics.length === 0} 
            className="btn-indigo"
          >
            <Send size={16} /> <span className="hide-on-mobile">Seçilenleri Ata ({selectedTopics.length})</span>
          </button>
        </div>
      </div>
      
      <main className="sp-main">
        <div className="sp-summary-card">
          <div className="sp-summary-titles">
            <h2>Plan Özeti</h2>
            <p>Toplam ders ve konu dağılımı.</p>
          </div>
          <div className="sp-summary-stats">
            <div className="sp-stat-item">
              <p className="sp-stat-number">{plan.subjects?.length || 0}</p>
              <p className="sp-stat-label">Ders</p>
            </div>
            <div className="sp-stat-item">
              <p className="sp-stat-number pink">{totalTopics}</p>
              <p className="sp-stat-label">Konu</p>
            </div>
          </div>
        </div>
        
        {/* PROGRESS CARDS */}
        {assignedStudentIds.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="#ec4899" />
              Atanan Öğrenciler ve İlerleme Durumu
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {assignedStudentIds.map(studentId => {
                const prog = studentProgress[studentId];
                const percentage = Math.round((prog.completed / prog.total) * 100);
                return (
                  <div 
                    key={studentId} 
                    style={{ background: 'white', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setSelectedStudentForDetails(studentId)}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(236,72,153,0.1)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>{prog.studentName}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: percentage === 100 ? '#10b981' : '#ec4899' }}>%{percentage}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: percentage === 100 ? '#10b981' : '#ec4899', width: `${percentage}%`, transition: 'width 0.3s ease' }}></div>
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{prog.completed} / {prog.total} Görev</span>
                      <span style={{ color: '#db2777', fontWeight: 600 }}>İncele &rarr;</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="sp-accordion">
          {(plan.subjects || []).map(subject => {
            const isExpanded = expandedSubjects[subject.id];
            
            return (
              <div key={subject.id} className="sp-accordion-item">
                <button className="sp-accordion-trigger" onClick={() => toggleSubject(subject.id)}>
                  <span className="sp-accordion-title">
                    <FileText size={20} color="#f472b6" /> {subject.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="sp-accordion-count">{(subject.topics || []).length} Konu</span>
                    {isExpanded ? <ChevronUp size={20} color="var(--color-text-muted)" /> : <ChevronDown size={20} color="var(--color-text-muted)" />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="sp-accordion-content">
                    {(subject.topics || []).map(topic => {
                      const allAssignedToTopic = studyAssignments.filter(sa => sa.topicId === topic.id);
                      const isAssigned = allAssignedToTopic.some(sa => sa.status === 'assigned');
                      const isCompleted = allAssignedToTopic.some(sa => sa.status === 'completed');
                      const isSelected = selectedTopics.some(t => t.id === topic.id);

                      return (
                        <div key={topic.id} className="sp-topic-item" onClick={() => toggleTopicSelection(topic)}>
                          <div className="sp-topic-left">
                            <div className={`sp-checkbox ${isSelected ? 'checked' : ''}`}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="sp-topic-label">{topic.name}</span>
                              <div className="sp-topic-badges">
                                {isAssigned && <span className="sp-badge sp-badge-assigned">ATANDI</span>}
                                {isCompleted && <span className="sp-badge sp-badge-completed">TAMAMLANDI</span>}
                              </div>
                            </div>
                          </div>
                          <CheckCircle className={`sp-topic-icon ${isSelected ? 'visible' : ''}`} size={16} />
                        </div>
                      )
                    })}
                    {(subject.topics || []).length === 0 && (
                      <div className="sp-empty-topics">Bu derste henüz konu yok.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {(plan.subjects || []).length === 0 && (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <div className="empty-icon-wrapper" style={{ background: '#f1f5f9' }}>
              <BookOpen size={40} color="#94a3b8" />
            </div>
            <h3 className="empty-title">Konu Yok</h3>
            <p className="empty-desc">Bu plana henüz hiç ders veya konu eklenmemiş.</p>
          </div>
        )}
      </main>

      {/* Assignment Modal */}
      {isAssignDialogOpen && (
        <div className="study-plan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAssignDialogOpen(false); }}>
          <div className="study-plan-modal" style={{ maxWidth: '500px' }}>
            <div className="study-plan-modal-header">
              <div>
                <h2>Konu Anlatımı Ata</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{selectedTopics.length} adet konu seçildi.</p>
              </div>
            </div>
            
            <form onSubmit={handleAssignSelectedTopics} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="study-plan-modal-body">
                <div className="modal-form-group">
                  <label className="modal-label">Öğrenci(ler)</label>
                  <div className="student-list">
                    {students.map(student => {
                      const isSelected = assignStudentIds.includes(student.id);
                      return (
                        <div key={student.id} className="student-item" onClick={() => {
                          setAssignStudentIds(prev => isSelected ? prev.filter(id => id !== student.id) : [...prev, student.id])
                        }}>
                          <div className={`sp-checkbox ${isSelected ? 'checked' : ''}`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="modal-form-group">
                    <label className="modal-label">Başlangıç Tarihi</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)' }}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label className="modal-label">Bitiş Tarihi</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="study-plan-modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAssignDialogOpen(false)}>İptal</button>
                <button type="submit" className="btn-indigo">Ata</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROGRESS DETAILS MODAL */}
      {selectedStudentForDetails && (
        <div className="study-plan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedStudentForDetails(null); }}>
          <div className="study-plan-modal" style={{ maxWidth: '600px' }}>
            <div className="study-plan-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {studentProgress[selectedStudentForDetails]?.studentName?.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>{studentProgress[selectedStudentForDetails]?.studentName}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Konu Çalışma İlerlemesi</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudentForDetails(null)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="study-plan-modal-body" style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {planAssignments.filter(a => a.studentId === selectedStudentForDetails).length === 0 ? (
                <p>Bu öğrenciye atanmış görev bulunmuyor.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {planAssignments.filter(a => a.studentId === selectedStudentForDetails).map(assignment => {
                    const isCompleted = assignment.status === 'completed';
                    const isOverdue = !isCompleted && new Date(assignment.dueDate) < new Date();
                    return (
                      <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid', borderColor: isCompleted ? '#bbf7d0' : (isOverdue ? '#fecaca' : 'rgba(0,0,0,0.05)'), borderRadius: '0.75rem', background: isCompleted ? '#f0fdf4' : (isOverdue ? '#fef2f2' : 'white') }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ color: isCompleted ? '#16a34a' : (isOverdue ? '#dc2626' : '#94a3b8') }}>
                            {isCompleted ? <CheckCircle size={20} /> : (isOverdue ? <AlertCircle size={20} /> : <Clock size={20} />)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{assignment.subject}</p>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>{assignment.topic}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isCompleted ? '#16a34a' : (isOverdue ? '#dc2626' : 'var(--color-text-muted)'), padding: '0.2rem 0.6rem', borderRadius: '1rem', background: isCompleted ? '#dcfce7' : (isOverdue ? '#fee2e2' : '#f1f5f9') }}>
                            {isCompleted ? 'Tamamlandı' : (isOverdue ? 'Gecikti' : 'Bekliyor')}
                          </span>
                          {!isCompleted && (
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: isOverdue ? '#dc2626' : 'var(--color-text-muted)' }}>Son: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper icons
function X({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
