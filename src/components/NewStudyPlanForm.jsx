import React, { useState } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { Trash2, Plus, GripVertical, CheckCircle2, ChevronRight, BookOpen, Layers } from 'lucide-react';
import './NewStudyPlanForm.css';

export default function NewStudyPlanForm({ onSubmit, initialData, onCancel }) {
  const { data } = useCurriculum();
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedSubjects, setSelectedSubjects] = useState(initialData?.subjects || []);
  
  const [isAddingSubjectManually, setIsAddingSubjectManually] = useState(false);
  const [manualSubjectName, setManualSubjectName] = useState('');

  const [addingTopicManuallyTo, setAddingTopicManuallyTo] = useState(null); // subjectId
  const [manualTopicName, setManualTopicName] = useState('');

  const handleAddSubject = (e) => {
    const subjectId = e.target.value;
    if (!subjectId) return;
    
    if (subjectId === 'MANUAL_ADD') {
      setIsAddingSubjectManually(true);
      e.target.value = '';
      return;
    }
    
    const subjectDef = data.subjects.find(s => String(s.id) === String(subjectId));
    if (!subjectDef) return;
    
    if (selectedSubjects.some(s => String(s.id) === String(subjectId))) return;

    setSelectedSubjects(prev => [...prev, { 
      id: subjectDef.id, 
      name: subjectDef.name, 
      topics: [] 
    }]);
    
    e.target.value = '';
  };

  const handleManualSubjectSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (manualSubjectName.trim()) {
        setSelectedSubjects(prev => [...prev, {
          id: `manual_s_${Date.now()}`,
          name: manualSubjectName.trim(),
          topics: []
        }]);
      }
      setIsAddingSubjectManually(false);
      setManualSubjectName('');
    }
  };

  const handleRemoveSubject = (subjectId) => {
    setSelectedSubjects(prev => prev.filter(s => String(s.id) !== String(subjectId)));
  };

  const handleAddTopic = (subjectId, e) => {
    const topicId = e.target.value;
    if (!topicId) return;

    if (topicId === 'MANUAL_ADD') {
      setAddingTopicManuallyTo(subjectId);
      e.target.value = '';
      return;
    }

    const topicDef = data.topics.find(t => String(t.id) === String(topicId));
    if (!topicDef) return;

    setSelectedSubjects(prev => prev.map(subj => {
      if (String(subj.id) === String(subjectId)) {
        if (subj.topics.some(t => String(t.id) === String(topicId))) return subj;
        return {
          ...subj,
          topics: [...subj.topics, { id: topicDef.id, name: topicDef.name }]
        };
      }
      return subj;
    }));
    
    e.target.value = '';
  };

  const handleManualTopicSubmit = (subjectId, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (manualTopicName.trim()) {
        setSelectedSubjects(prev => prev.map(subj => {
          if (String(subj.id) === String(subjectId)) {
            return {
              ...subj,
              topics: [...subj.topics, { id: `manual_t_${Date.now()}`, name: manualTopicName.trim() }]
            };
          }
          return subj;
        }));
      }
      setAddingTopicManuallyTo(null);
      setManualTopicName('');
    }
  };

  const handleRemoveTopic = (subjectId, topicId) => {
    setSelectedSubjects(prev => prev.map(subj => {
      if (String(subj.id) === String(subjectId)) {
        return { ...subj, topics: subj.topics.filter(t => String(t.id) !== String(topicId)) };
      }
      return subj;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, subjects: selectedSubjects });
  };

  return (
    <form onSubmit={handleSubmit} className="nspf-form">
      <div className="nspf-header-input">
        <label>Plan Başlığı</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="Örn: YKS 2027 Sayısal Hedefleri..."
          required
          autoFocus
        />
      </div>

      <div className="nspf-add-subject">
        <div className="nspf-select-wrapper">
          <BookOpen className="nspf-select-icon" size={18} />
          {isAddingSubjectManually ? (
            <input 
              type="text" 
              value={manualSubjectName}
              onChange={e => setManualSubjectName(e.target.value)}
              onKeyDown={handleManualSubjectSubmit}
              onBlur={() => { setIsAddingSubjectManually(false); setManualSubjectName(''); }}
              placeholder="Ders adını yazın ve Enter'a basın..."
              autoFocus
              className="nspf-manual-input"
            />
          ) : (
            <select onChange={handleAddSubject} defaultValue="">
              <option value="" disabled>Planınıza Yeni Ders Ekleyin...</option>
              {data.subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="MANUAL_ADD" style={{ fontWeight: 'bold', color: '#db2777' }}>+ Listede Yok (Manuel Ekle)</option>
            </select>
          )}
          {!isAddingSubjectManually && <ChevronRight className="nspf-select-arrow" size={18} />}
        </div>
      </div>

      <div className="nspf-subjects-list custom-scrollbar">
        {selectedSubjects.length === 0 ? (
          <div className="nspf-empty">
            <Layers size={32} />
            <p>Henüz planınıza ders eklemediniz.</p>
            <span>Yukarıdaki menüden ders seçerek başlayın.</span>
          </div>
        ) : (
          selectedSubjects.map((subj, index) => {
            const subjectUnits = data.units.filter(u => String(u.subjectId) === String(subj.id));
            const unitIds = subjectUnits.map(u => u.id);
            const availableTopics = data.topics.filter(t => unitIds.includes(t.unitId));

            return (
              <div key={subj.id} className="nspf-subject-card">
                <div className="nspf-subject-header">
                  <div className="nspf-subject-title">
                    <span className="nspf-subject-number">{index + 1}</span>
                    <h4>{subj.name}</h4>
                  </div>
                  <button type="button" onClick={() => handleRemoveSubject(subj.id)} className="nspf-btn-remove" title="Dersi Çıkar">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="nspf-topic-add">
                  {addingTopicManuallyTo === subj.id ? (
                    <input 
                      type="text" 
                      value={manualTopicName}
                      onChange={e => setManualTopicName(e.target.value)}
                      onKeyDown={(e) => handleManualTopicSubmit(subj.id, e)}
                      onBlur={() => { setAddingTopicManuallyTo(null); setManualTopicName(''); }}
                      placeholder="Konu adını yazın ve Enter'a basın..."
                      autoFocus
                      className="nspf-manual-input-topic"
                    />
                  ) : (
                    <select onChange={(e) => handleAddTopic(subj.id, e)} defaultValue="">
                      <option value="" disabled>+ Bu derse yeni konu ekle</option>
                      {availableTopics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                      <option value="MANUAL_ADD" style={{ fontWeight: 'bold', color: '#db2777' }}>+ Listede Yok (Manuel Ekle)</option>
                    </select>
                  )}
                </div>

                {subj.topics.length > 0 && (
                  <div className="nspf-topics-list">
                    {subj.topics.map((t, i) => (
                      <div key={t.id} className="nspf-topic-item">
                        <div className="nspf-topic-item-left">
                          <GripVertical size={14} className="nspf-grip" />
                          <span className="nspf-topic-index">{i + 1}.</span>
                          <span className="nspf-topic-name">{t.name}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveTopic(subj.id, t.id)} className="nspf-btn-remove-topic">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="nspf-footer">
        <button type="button" onClick={onCancel} className="nspf-btn-cancel">İptal Et</button>
        <button type="submit" className="nspf-btn-submit">
          <CheckCircle2 size={18} />
          {initialData ? 'Değişiklikleri Kaydet' : 'Planı Oluştur'}
        </button>
      </div>
    </form>
  );
}

// Helper icon
function X({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
