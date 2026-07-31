import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { Plus, Edit, Trash2, ArrowLeft, BookHeart, ChevronRight, Target } from 'lucide-react';
import NewStudyPlanForm from '../components/NewStudyPlanForm';
import './StudyPlanManager.css';

export default function StudyPlanManager() {
  const navigate = useNavigate();
  const { studyPlans, addStudyPlan, updateStudyPlan, deleteStudyPlan } = useStudyPlan();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const handleFormSubmit = (data) => {
    if (editingPlan) {
      updateStudyPlan(editingPlan.id, data);
    } else {
      addStudyPlan(data);
    }
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bu planı silmek istediğinize emin misiniz?')) {
      deleteStudyPlan(id);
    }
  };

  return (
    <div className="study-plan-container">
      <header className="study-plan-header">
        <div className="study-plan-header-content">
          <div className="header-left">
            <button onClick={() => navigate(-1)} className="btn-icon text-muted hover:text-primary">
              <ArrowLeft size={24} />
            </button>
            <div className="icon-box-pink">
              <Target size={24} />
            </div>
            <div className="header-titles">
              <h1>Yol Haritaları</h1>
              <p>Konu Anlatım Planları</p>
            </div>
          </div>
          <button onClick={() => { setEditingPlan(null); setIsFormOpen(true); }} className="btn-pink">
            <Plus size={20} /> <span className="hide-on-mobile">Yeni Plan</span>
          </button>
        </div>
      </header>

      <main className="study-plan-main">
        {studyPlans.length > 0 ? (
          <div className="plan-grid">
            {studyPlans.map(plan => {
              const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
              return (
                <div key={plan.id} className="plan-card">
                  <div className="plan-card-header">
                    <div className="plan-card-top">
                      <span className="badge-plan">PLAN</span>
                      <div className="plan-actions">
                        <button className="btn-icon" onClick={() => { setEditingPlan(plan); setIsFormOpen(true); }} style={{ color: 'var(--color-text-muted)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                          <Edit size={16} />
                        </button>
                        <button className="btn-icon text-error" onClick={() => handleDelete(plan.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="plan-card-title" title={plan.title}>{plan.title}</h3>
                  </div>
                  <div className="plan-card-content">
                    <div className="plan-stats-grid">
                      <div className="plan-stat-box">
                        <span className="plan-stat-value">{plan.subjects?.length || 0}</span>
                        <span className="plan-stat-label">Ders</span>
                      </div>
                      <div className="plan-stat-box">
                        <span className="plan-stat-value">{totalTopics}</span>
                        <span className="plan-stat-label">Konu</span>
                      </div>
                    </div>
                  </div>
                  <div className="plan-card-footer">
                    <button className="btn-secondary-full" onClick={() => navigate(`/study-plans/${plan.id}`)}>
                      Detayları Yönet <ChevronRight size={16} style={{ marginLeft: '0.5rem' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <BookHeart size={40} />
            </div>
            <h3 className="empty-title">Yol Haritası Yok</h3>
            <p className="empty-desc">
              Ders veya ünite bazlı konu anlatım planları oluşturarak öğrencilere hedefler atayabilirsiniz.
            </p>
            <button onClick={() => setIsFormOpen(true)} className="btn-pink" style={{ marginTop: '1rem', padding: '0.75rem 2rem', fontSize: '1rem' }}>
              <Plus size={20} /> İlk Planı Oluştur
            </button>
          </div>
        )}
      </main>

      {isFormOpen && (
        <div className="study-plan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}>
          <div className="study-plan-modal">
            <div className="study-plan-modal-header">
              <h2>{editingPlan ? 'Planı Düzenle' : 'Yeni Yol Haritası'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="study-plan-modal-body">
              <NewStudyPlanForm 
                initialData={editingPlan} 
                onSubmit={handleFormSubmit} 
                onCancel={() => setIsFormOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper icon
function X({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
