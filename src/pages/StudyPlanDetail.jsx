import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useUser } from '../context/UserContext';
import {
  ArrowLeft, Users, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ChevronRight,
  Link as LinkIcon, Calendar, FileJson, X, ListPlus, Sparkles, Hash,
  Layers, FileText, CheckCircle, Clock, Zap, BookOpen, Search, Globe, Check
} from 'lucide-react';
import './StudyPlan.css';

export default function StudyPlanDetail() {
  const { id: planId } = useParams();
  const navigate = useNavigate();
  const { studyPlans, updateStudyPlan, addStudyAssignment, studyAssignments } = useStudyPlan();
  const { users } = useUser();

  const plan = studyPlans?.find((p) => p.id === planId);
  const subjects = plan?.subjects || [];

  // Expanded Units State (default closed/collapsed for clarity, or user toggle)
  const [expandedUnits, setExpandedUnits] = useState([]);

  // Modals
  const [unitModal, setUnitModal] = useState({ isOpen: false, unit: null }); // null = add, else edit
  const [topicModal, setTopicModal] = useState({ isOpen: false, unitId: null, topic: null }); // topic null = add, else edit
  const [bulkTopicModal, setBulkTopicModal] = useState({ isOpen: false, unitId: null });
  const [assignModal, setAssignModal] = useState(false);
  const [jsonModal, setJsonModal] = useState(false);
  const [bulkMode, setBulkMode] = useState('text'); // 'text' or 'json'
  const [bulkText, setBulkText] = useState('');

  // Form states
  const [unitForm, setUnitForm] = useState({ name: '', dueDate: '', resourceUrl: '' });
  const [topicForm, setTopicForm] = useState({ name: '', day: '', dueDate: '', resourceUrl: '' });
  const [bulkTopicText, setBulkTopicText] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [jsonText, setJsonText] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  // Assigned student count for this plan
  const assignedCount = useMemo(() => {
    return (studyAssignments || []).filter(a => String(a.planId || a.studyPlanId) === String(planId)).length;
  }, [studyAssignments, planId]);

  const totalTopicsCount = useMemo(() => {
    return subjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
  }, [subjects]);

  if (!plan) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '460px' }}>
          <Compass size={48} style={{ color: '#818cf8', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.4rem' }}>Plan Bulunamadı</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            İstediğiniz çalışma yol haritası silinmiş veya taşınmış olabilir.
          </p>
          <button 
            onClick={() => navigate('/study-plans')}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
          >
            ← Yol Haritalarına Dön
          </button>
        </div>
      </div>
    );
  }

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => 
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const handleExpandAll = () => {
    setExpandedUnits(subjects.map(s => s.id));
  };

  const handleCollapseAll = () => {
    setExpandedUnits([]);
  };

  // Unit Actions
  const openUnitModal = (unit = null) => {
    setUnitForm(unit ? { name: unit.name, dueDate: unit.dueDate || '', resourceUrl: unit.resourceUrl || '' } : { name: '', dueDate: '', resourceUrl: '' });
    setUnitModal({ isOpen: true, unit });
  };

  const saveUnit = () => {
    if (!unitForm.name.trim()) return;
    
    let newSubjects = [...subjects];
    if (unitModal.unit) {
      newSubjects = newSubjects.map(s => s.id === unitModal.unit.id ? { ...s, ...unitForm } : s);
      showToast('Ünite başarıyla güncellendi.');
    } else {
      const newUnitId = `sub_${Date.now()}`;
      newSubjects.push({
        id: newUnitId,
        name: unitForm.name,
        dueDate: unitForm.dueDate,
        resourceUrl: unitForm.resourceUrl,
        topics: []
      });
      setExpandedUnits(prev => [...prev, newUnitId]);
      showToast('Yeni ünite başarıyla eklendi.');
    }
    
    updateStudyPlan(plan.id, { subjects: newSubjects });
    setUnitModal({ isOpen: false, unit: null });
  };

  const deleteUnit = (unitId) => {
    if (!window.confirm('Bu üniteyi ve altındaki tüm konuları silmek istediğinize emin misiniz?')) return;
    const newSubjects = subjects.filter(s => s.id !== unitId);
    updateStudyPlan(plan.id, { subjects: newSubjects });
    showToast('Ünite başarıyla silindi.');
  };

  // Topic Actions
  const openTopicModal = (unitId, topic = null) => {
    setTopicForm(topic ? { name: topic.name || '', day: topic.day || '', dueDate: topic.dueDate || '', resourceUrl: topic.resourceUrl || '' } : { name: '', day: '', dueDate: '', resourceUrl: '' });
    setTopicModal({ isOpen: true, unitId, topic });
  };

  const saveTopic = () => {
    if (!topicForm.name.trim()) return;

    const newSubjects = subjects.map(s => {
      if (s.id === topicModal.unitId) {
        let newTopics = [...(s.topics || [])];
        if (topicModal.topic) {
          newTopics = newTopics.map(t => t.id === topicModal.topic.id ? { ...t, ...topicForm } : t);
          showToast('Konu güncellendi.');
        } else {
          newTopics.push({
            id: `top_${Date.now()}`,
            ...topicForm
          });
          showToast('Yeni konu eklendi.');
        }
        return { ...s, topics: newTopics };
      }
      return s;
    });

    updateStudyPlan(plan.id, { subjects: newSubjects });
    setTopicModal({ isOpen: false, unitId: null, topic: null });
  };

  const saveBulkTopics = () => {
    if (!bulkTopicText.trim()) return;
    
    const lines = bulkTopicText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    let newSubjects = [...subjects];

    if (bulkTopicModal.unitId === 'auto_create') {
      const newTopics = lines.map((line, idx) => ({
        id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_${idx}`,
        name: line
      }));
      const newUnitId = `sub_${Date.now()}`;
      newSubjects.push({
        id: newUnitId,
        name: 'Genel Müfredat',
        topics: newTopics
      });
      setExpandedUnits(prev => [...prev, newUnitId]);
    } else {
      newSubjects = subjects.map(s => {
        if (s.id === bulkTopicModal.unitId) {
          let newTopics = [...(s.topics || [])];
          lines.forEach((line, idx) => {
            newTopics.push({
              id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_${idx}`,
              name: line
            });
          });
          return { ...s, topics: newTopics };
        }
        return s;
      });
    }

    updateStudyPlan(plan.id, { subjects: newSubjects });
    setBulkTopicModal({ isOpen: false, unitId: null });
    setBulkTopicText('');
    showToast(`${lines.length} konu başarıyla eklendi! 🚀`);
  };

  const deleteTopic = (unitId, topicId) => {
    if (!window.confirm('Bu konuyu silmek istediğinize emin misiniz?')) return;
    const newSubjects = subjects.map(s => {
      if (s.id === unitId) {
        return { ...s, topics: (s.topics || []).filter(t => t.id !== topicId) };
      }
      return s;
    });
    updateStudyPlan(plan.id, { subjects: newSubjects });
    showToast('Konu silindi.');
  };

  const handleAutoNumberDays = (targetUnitId = null) => {
    let dayCounter = 1;
    const newSubjects = subjects.map(unit => {
      if (targetUnitId && unit.id !== targetUnitId) return unit;
      const newTopics = (unit.topics || []).map(t => {
        const updated = { ...t, day: String(dayCounter) };
        dayCounter++;
        return updated;
      });
      return { ...unit, topics: newTopics };
    });

    updateStudyPlan(plan.id, { subjects: newSubjects });
    showToast(`Konular Gün 1'den Gün ${dayCounter - 1}'e kadar sırayla otomatik numaralandırıldı! ✨`);
  };

  const handleSetTopicDay = (unitId, topicId, newDayStr) => {
    const newSubjects = subjects.map(s => {
      if (s.id === unitId) {
        const newTopics = (s.topics || []).map(t => {
          if (t.id === topicId) {
            return { ...t, day: newDayStr };
          }
          return t;
        });
        return { ...s, topics: newTopics };
      }
      return s;
    });
    updateStudyPlan(plan.id, { subjects: newSubjects });
  };

  // Assign Actions
  const handleAssign = async () => {
    for (const studentId of selectedStudents) {
      await addStudyAssignment({ 
        studentId, 
        planId: plan.id, 
        studyPlanId: plan.id, 
        completedTopics: [] 
      });
    }
    setAssignModal(false);
    setSelectedStudents([]);
    showToast(`${selectedStudents.length} öğrenciye yol haritası başarıyla atandı! 🎉`);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Bulk Import Actions
  const parseBulkText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const units = [];
    let currentUnit = null;

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if ((lower.includes('gün') && lower.includes('içerik')) || /^gün\s*içerik/i.test(line)) {
        return;
      }

      const isUnitLine = (
        /^\d+[\.\s]*ünite/i.test(line) ||
        /^ünite\s*\d+/i.test(line) ||
        (line.toLowerCase().includes('ünite') && !line.includes('\t') && !line.includes('•')) ||
        (line.endsWith(':') && !line.includes('http'))
      );

      if (isUnitLine) {
        const unitName = line.replace(/:$/, '').trim();
        currentUnit = {
          id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          name: unitName,
          topics: []
        };
        units.push(currentUnit);
        return;
      }

      const tabParts = line.split(/\t+|\s{3,}/).map(p => p.trim()).filter(Boolean);
      if (tabParts.length >= 2 && (/^\d+$/.test(tabParts[0]) || /^gün\s*\d+/i.test(tabParts[0]))) {
        const dayStr = tabParts[0].toLowerCase().startsWith('gün') ? tabParts[0] : `Gün ${tabParts[0]}`;
        const content = tabParts[1];
        const pageInfo = tabParts[2] ? ` (s. ${tabParts[2]})` : '';
        const topicName = `${dayStr}: ${content}${pageInfo}`;

        if (!currentUnit) {
          currentUnit = {
            id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            name: '1. Ünite',
            topics: []
          };
          units.push(currentUnit);
        }

        currentUnit.topics.push({
          id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          name: topicName
        });
        return;
      }

      if (line.includes('>')) {
        const parts = line.split('>').map(p => p.trim());
        const uName = parts[0];
        const tName = parts.slice(1).join('>').trim();
        let uObj = units.find(u => u.name.toLowerCase() === uName.toLowerCase());
        if (!uObj) {
          uObj = { id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, name: uName, topics: [] };
          units.push(uObj);
        }
        if (tName) {
          uObj.topics.push({ id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, name: tName });
        }
        return;
      }

      const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
      const cleanLine = line.replace(/^[-*•\d+\.\s]+/, '').trim();

      if (cleanLine) {
        if (!currentUnit) {
          currentUnit = {
            id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            name: 'Genel Ünite',
            topics: []
          };
          units.push(currentUnit);
        }
        currentUnit.topics.push({
          id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          name: isBullet ? cleanLine : line
        });
      }
    });

    return units;
  };

  const handleBulkImport = () => {
    let importedSubjects = [];
    if (bulkMode === 'text') {
      if (!bulkText.trim()) return;
      importedSubjects = parseBulkText(bulkText);
    } else {
      if (!jsonText.trim()) return;
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          importedSubjects = parsed.map(unit => ({
            ...unit,
            id: unit.id || `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            topics: (unit.topics || []).map(t => typeof t === 'string' ? { id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, name: t } : {
              ...t,
              id: t.id || `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
            })
          }));
        } else {
          showToast('Geçersiz JSON formatı. Bir liste (dizi) olmalıdır.', 'error');
          return;
        }
      } catch (e) {
        showToast('JSON parse hatası: ' + e.message, 'error');
        return;
      }
    }

    if (importedSubjects.length === 0) {
      showToast('Hiç ünite veya konu okunamadı. Girişi kontrol edin.', 'error');
      return;
    }

    const newSubjects = [...subjects, ...importedSubjects];
    updateStudyPlan(plan.id, { subjects: newSubjects });
    setJsonModal(false);
    setBulkText('');
    setJsonText('');
    showToast(`${importedSubjects.length} ünite ve konuları başarıyla eklendi! 🎉`);
  };

  return (
    <div className="study-plans-page-container custom-scrollbar">
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          background: toast.type === 'error' 
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)' 
            : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '1rem',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 800,
          fontSize: '0.95rem',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* ── TOP HERO HEADER ── */}
      <div className="study-glass-card" style={{ padding: '1.5rem 1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/study-plans')}
            style={{
              padding: '0.7rem',
              borderRadius: '1rem',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1.5px solid rgba(255, 255, 255, 0.16)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}
            title="Yol Haritalarına Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {plan.title}
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', padding: '0.2rem 0.65rem', borderRadius: '1rem', border: '1px solid rgba(165,180,252,0.3)' }}>
                {subjects.length} Ünite • {totalTopicsCount} Konu Adımı
              </span>
              {assignedCount > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(236,72,153,0.2)', color: '#f472b6', padding: '0.2rem 0.65rem', borderRadius: '1rem', border: '1px solid rgba(244,114,182,0.3)' }}>
                  👥 {assignedCount} Öğrenciye Atandı
                </span>
              )}
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.88rem', fontWeight: 600 }}>
              {plan.description || 'Yol haritasındaki üniteleri, konuları, hedef tarihleri ve ders kaynaklarını düzenleyin.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {subjects.length > 0 && (
            <button
              onClick={() => handleAutoNumberDays()}
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '0.75rem',
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1.5px solid rgba(192, 132, 252, 0.4)',
                color: '#e9d5ff',
                fontWeight: 800,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
              title="Tüm konulara sırayla Gün 1, Gün 2, Gün 3... atar"
            >
              <Sparkles size={16} style={{ color: '#fbbf24' }} /> Günleri Otomatik Sırala (1..N)
            </button>
          )}

          <button
            onClick={() => setJsonModal(true)}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '0.75rem',
              background: 'rgba(56, 189, 248, 0.18)',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <ListPlus size={16} /> Toplu Ünite &amp; Konu Ekle
          </button>

          <button
            onClick={() => {
              const alreadyAssigned = (studyAssignments || [])
                .filter(a => String(a.planId || a.studyPlanId) === String(plan.id))
                .map(a => String(a.studentId));
              setSelectedStudents(alreadyAssigned);
              setAssignModal(true);
            }}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(236,72,153,0.35)'
            }}
          >
            <Users size={16} /> Öğrenciye Ata
          </button>
        </div>

      </div>

      {/* ── UNITS & TOPICS SECTION ── */}
      <div className="study-glass-card" style={{ padding: '1.75rem' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={19} style={{ color: '#818cf8' }} /> Üniteler ve Konu Takip Adımları
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', padding: '0.15rem 0.55rem', borderRadius: '0.5rem', fontWeight: 800 }}>
              {subjects.length} Ünite
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem' }}>
            {subjects.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', fontWeight: 800, borderRadius: '0.55rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}
                >
                  📂 Tümünü Aç
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', fontWeight: 800, borderRadius: '0.55rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}
                >
                  📁 Tümünü Kapat
                </button>
              </>
            )}
            <button
              onClick={() => openUnitModal()}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.95rem', fontWeight: 900, borderRadius: '0.55rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              <Plus size={15} /> Yeni Ünite Ekle
            </button>
          </div>
        </div>

        {/* Units List */}
        {subjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: '1rem', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>
              Bu yol haritasına henüz bir ünite veya konu eklenmemiş.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => openUnitModal()}
                style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.65rem', color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> Önce Ünite Ekle
              </button>
              <button
                onClick={() => { setBulkTopicModal({ isOpen: true, unitId: 'auto_create' }); setBulkTopicText(''); }}
                style={{ padding: '0.65rem 1.25rem', background: 'rgba(56,189,248,0.2)', border: '1.5px solid rgba(56,189,248,0.4)', borderRadius: '0.65rem', color: '#38bdf8', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ListPlus size={16} /> Direkt Satır Satır Konu Yapıştır
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {subjects.map((unit) => {
              const isExpanded = expandedUnits.includes(unit.id);
              const topics = unit.topics || [];

              return (
                <div key={unit.id} style={{ border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                  
                  {/* Unit Header */}
                  <div 
                    onClick={() => toggleUnit(unit.id)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      padding: '0.9rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      flexWrap: 'wrap',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
                      {isExpanded ? <ChevronDown size={20} style={{ color: '#818cf8' }} /> : <ChevronRight size={20} style={{ color: '#818cf8' }} />}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Layers size={17} style={{ color: '#a5b4fc' }} /> {unit.name}
                          </h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', padding: '0.15rem 0.55rem', borderRadius: '0.45rem', border: '1px solid rgba(165,180,252,0.3)' }}>
                            {topics.length} Konu Adımı
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                          {unit.dueDate && (
                            <span style={{ fontSize: '0.74rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800 }}>
                              <Calendar size={13} /> Hedef: {unit.dueDate}
                            </span>
                          )}
                          {unit.resourceUrl && (
                            <a
                              href={unit.resourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: '0.74rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800, textDecoration: 'none' }}
                            >
                              <Globe size={13} /> Genel Kaynak Linki ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unit Toolbar Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setBulkTopicModal({ isOpen: true, unitId: unit.id }); setBulkTopicText(''); }}
                        style={{ padding: '0.35rem 0.65rem', background: 'rgba(56,189,248,0.18)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.5rem', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Toplu Konu Ekle (Satır Satır)"
                      >
                        <ListPlus size={14} /> Toplu Ekle
                      </button>
                      <button
                        onClick={() => openTopicModal(unit.id)}
                        style={{ padding: '0.35rem 0.65rem', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '0.5rem', color: '#34d399', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Konu Ekle"
                      >
                        <Plus size={14} /> Konu Ekle
                      </button>
                      <button
                        onClick={() => openUnitModal(unit)}
                        style={{ padding: '0.35rem 0.55rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: '#ffffff', cursor: 'pointer' }}
                        title="Üniteyi Düzenle"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteUnit(unit.id)}
                        style={{ padding: '0.35rem 0.55rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer' }}
                        title="Üniteyi Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Topics List (Expanded Only) */}
                  {isExpanded && (
                    <div style={{ padding: '1.15rem', background: 'rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {topics.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.5rem 0' }}>
                          Bu ünitede henüz konu bulunmuyor. Yukarıdaki "Konu Ekle" butonunu kullanabilirsiniz.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                          {topics.map(topic => (
                            <div 
                              key={topic.id}
                              style={{
                                padding: '0.75rem 0.95rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.65rem'
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                  {topic.day && (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: '1px solid rgba(165,180,252,0.3)', flexShrink: 0 }}>
                                      {topic.day.toLowerCase().startsWith('gün') ? topic.day : `Gün ${topic.day}`}
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {topic.name}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                  {topic.dueDate && (
                                    <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800 }}>
                                      <Calendar size={12} /> {topic.dueDate}
                                    </span>
                                  )}
                                  {topic.resourceUrl && (
                                    <a
                                      href={topic.resourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '0.72rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 800 }}
                                    >
                                      <LinkIcon size={12} /> Link ↗
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Day Stepper & Actions */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '0.45rem', border: '1px solid rgba(255,255,255,0.12)', padding: '0.1rem 0.25rem' }}>
                                  <button
                                    onClick={() => {
                                      const cur = parseInt(String(topic.day || '1').replace(/\D/g, ''), 10) || 1;
                                      handleSetTopicDay(unit.id, topic.id, String(Math.max(1, cur - 1)));
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 900, padding: '0.15rem 0.35rem' }}
                                    title="Günü Azalt"
                                  >
                                    -
                                  </button>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#c7d2fe', padding: '0 0.2rem' }}>
                                    {topic.day ? (topic.day.toLowerCase().startsWith('gün') ? topic.day : `G${topic.day}`) : '+G'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const cur = parseInt(String(topic.day || '0').replace(/\D/g, ''), 10) || 0;
                                      handleSetTopicDay(unit.id, topic.id, String(cur + 1));
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 900, padding: '0.15rem 0.35rem' }}
                                    title="Günü Artır"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  onClick={() => openTopicModal(unit.id, topic)}
                                  style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.45rem', color: '#ffffff', cursor: 'pointer' }}
                                  title="Konuyu Düzenle"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => deleteTopic(unit.id, topic.id)}
                                  style={{ padding: '0.3rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.45rem', color: '#f87171', cursor: 'pointer' }}
                                  title="Konuyu Sil"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── MODAL: ÜNİTE EKLE / DÜZENLE ── */}
      {unitModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '480px', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                {unitModal.unit ? 'Üniteyi Düzenle' : 'Yeni Ünite Ekle'}
              </h3>
              <button onClick={() => setUnitModal({ isOpen: false, unit: null })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.35rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Ünite Adı *</label>
                <input
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({...unitForm, name: e.target.value})}
                  placeholder="Örn: 1. Ünite - Çarpanlar ve Katlar"
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Hedef Bitirme Tarihi (İsteğe Bağlı)</label>
                <input
                  type="date"
                  value={unitForm.dueDate}
                  onChange={(e) => setUnitForm({...unitForm, dueDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Genel Kaynak / Video Linki (İsteğe Bağlı)</label>
                <input
                  type="url"
                  value={unitForm.resourceUrl}
                  onChange={(e) => setUnitForm({...unitForm, resourceUrl: e.target.value})}
                  placeholder="https://youtube.com/..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setUnitModal({ isOpen: false, unit: null })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveUnit}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: KONU EKLE / DÜZENLE ── */}
      {topicModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '480px', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                {topicModal.topic ? 'Konuyu Düzenle' : 'Yeni Konu Adımı Ekle'}
              </h3>
              <button onClick={() => setTopicModal({ isOpen: false, unitId: null, topic: null })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.35rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Konu Adı *</label>
                <input
                  type="text"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({...topicForm, name: e.target.value})}
                  placeholder="Örn: Pozitif Tam Sayıların Çarpanları"
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Gün Numarası / Etiketi (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={topicForm.day || ''}
                  onChange={(e) => setTopicForm({...topicForm, day: e.target.value})}
                  placeholder="Örn: 1 veya Gün 1"
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Hedef Tarih (İsteğe Bağlı)</label>
                <input
                  type="date"
                  value={topicForm.dueDate}
                  onChange={(e) => setTopicForm({...topicForm, dueDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.35rem' }}>Kaynak Linki (İsteğe Bağlı)</label>
                <input
                  type="url"
                  value={topicForm.resourceUrl}
                  onChange={(e) => setTopicForm({...topicForm, resourceUrl: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setTopicModal({ isOpen: false, unitId: null, topic: null })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveTopic}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TOPLU KONU EKLE (SATIR SATIR) ── */}
      {bulkTopicModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '540px', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                  Toplu Konu Ekle
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                  Her satıra bir konu gelecek şekilde yapıştırın.
                </p>
              </div>
              <button onClick={() => setBulkTopicModal({ isOpen: false, unitId: null })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.35rem 1.6rem' }}>
              <textarea
                value={bulkTopicText}
                onChange={(e) => setBulkTopicText(e.target.value)}
                placeholder="Çarpanlar ve Asal Çarpanlar&#10;EBOB ve EKOK Problemleri&#10;Tam Sayıların Kuvvetleri&#10;Üslü İfadelerle İşlemler"
                rows={8}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.9rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none' }}
              />
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setBulkTopicModal({ isOpen: false, unitId: null })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveBulkTopics}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.35)' }}
              >
                Satırları Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TOPLU ÜNİTE & KONU İÇE AKTAR (TEXT / JSON) ── */}
      {jsonModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '680px', maxHeight: '90vh', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ListPlus size={22} style={{ color: '#38bdf8' }} /> Toplu Ünite &amp; Konu İçe Aktar
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                  Düz metin veya JSON şablonu ile tüm müfredatı tek seferde yükleyin.
                </p>
              </div>
              <button onClick={() => setJsonModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher & Example Buttons */}
            <div style={{ padding: '1rem 1.6rem 0.5rem 1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '0.65rem', padding: '0.25rem', border: '1px solid rgba(255,255,255,0.12)' }}>
                <button
                  onClick={() => setBulkMode('text')}
                  style={{ padding: '0.4rem 0.85rem', borderRadius: '0.5rem', background: bulkMode === 'text' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  📝 Düz Metin İle
                </button>
                <button
                  onClick={() => setBulkMode('json')}
                  style={{ padding: '0.4rem 0.85rem', borderRadius: '0.5rem', background: bulkMode === 'json' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {'{ }'} JSON İle
                </button>
              </div>

              {bulkMode === 'text' ? (
                <button
                  type="button"
                  onClick={() => setBulkText(`1. Ünite: Doğal Sayılar\n- Doğal Sayılarla İşlemler\n- Üslü Nicelikler\n- İşlem Önceliği\n\n2. Ünite: Çarpanlar ve Katlar\n- Asal Sayılar\n- Ortak Bölgenler ve Katlar`)}
                  style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  ⚡ Örnek Şablon Yükle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setJsonText(`[\n  {\n    "name": "1. Ünite: Doğal Sayılar",\n    "topics": [\n      { "name": "Doğal Sayılarla İşlemler" },\n      { "name": "Üslü Nicelikler" }\n    ]\n  }\n]`)}
                  style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  ⚡ Örnek JSON Yükle
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0.75rem 1.6rem', overflowY: 'auto', flex: 1 }}>
              {bulkMode === 'text' ? (
                <div>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`1. Ünite: Üslü İfadeler\n- Üslü Nicelikler\n- Üslü Sayılarda Çarpma\n\n2. Ünite: Kareköklü İfadeler\n- Tam Kare Sayılar\n- Karekök Alma\n\n(veya Ünite > Konu formatında satır satır yapıştırabilirsiniz)`}
                    rows={10}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.88rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.45rem', lineHeight: 1.4 }}>
                    💡 <strong>İpucu:</strong> <span style={{ color: '#c7d2fe' }}>Ünite İsmi:</span> yazdıktan sonra tire (-) veya yıldız (*) ile altındaki konuları yazabilirsiniz.
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder={'[\n  {\n    "name": "1. Ünite: Üslü Sayılar",\n    "dueDate": "2026-10-15",\n    "topics": [\n      { "name": "Konu 1", "dueDate": "2026-10-12" }\n    ]\n  }\n]'}
                    rows={10}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '0.88rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setJsonModal(false)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleBulkImport}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
              >
                İçeriği Aktar &amp; Ekle
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: ÖĞRENCİYE ATA ── */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '600px', maxHeight: '88vh', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={22} style={{ color: '#ec4899' }} /> Yol Haritasını Öğrenciye Ata
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#c7d2fe', fontSize: '0.84rem', fontWeight: 700 }}>
                  {plan.title}
                </p>
              </div>
              <button onClick={() => setAssignModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Search & Select All */}
            <div style={{ padding: '0.85rem 1.6rem 0.35rem 1.6rem', display: 'flex', gap: '0.65rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Öğrenci ara..."
                  style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.3rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = students
                    .filter(s => (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()))
                    .map(s => s.id);
                  const allSelected = filteredIds.every(id => selectedStudents.includes(id));
                  if (allSelected) {
                    setSelectedStudents(prev => prev.filter(id => !filteredIds.includes(id)));
                  } else {
                    setSelectedStudents(prev => Array.from(new Set([...prev, ...filteredIds])));
                  }
                }}
                style={{ padding: '0.6rem 0.85rem', borderRadius: '0.6rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Tümünü Seç / Kaldır
              </button>
            </div>

            <div style={{ padding: '0.75rem 1.6rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scrollbar">
              {students
                .filter(s => (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()))
                .map(student => {
                  const isChecked = selectedStudents.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      style={{
                        padding: '0.7rem 0.95rem',
                        borderRadius: '0.7rem',
                        background: isChecked ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${isChecked ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(student.id)}
                          style={{ width: '1.1rem', height: '1.1rem', accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>
                            {student.name} {student.surname || ''}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                            {student.className || student.grade || 'Öğrenci'}
                          </div>
                        </div>
                      </div>

                      {isChecked && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '0.12rem 0.45rem', borderRadius: '0.35rem' }}>
                          Seçildi
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#c7d2fe' }}>
                {selectedStudents.length} Öğrenci Seçildi
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => setAssignModal(false)}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  onClick={handleAssign}
                  disabled={selectedStudents.length === 0}
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #ec4899, #d946ef)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(236,72,153,0.35)', opacity: selectedStudents.length === 0 ? 0.5 : 1 }}
                >
                  Öğrencilere Ata ({selectedStudents.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
