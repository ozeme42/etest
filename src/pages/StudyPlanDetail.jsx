import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useUser } from '../context/UserContext';
import {
  ArrowLeft,
  Users,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Calendar,
  FileJson,
  X,
  ListPlus,
  Sparkles,
  Hash
} from 'lucide-react';

export default function StudyPlanDetail() {
  const { id: planId } = useParams();
  const navigate = useNavigate();
  const { studyPlans, updateStudyPlan, addStudyAssignment } = useStudyPlan();
  const { users } = useUser();

  const plan = studyPlans?.find((p) => p.id === planId);
  const subjects = plan?.subjects || [];

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
  const [jsonText, setJsonText] = useState('');

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <p className="text-lg mb-4">Plan bulunamadı.</p>
        <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">Geri Dön</button>
      </div>
    );
  }

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => 
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
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
    } else {
      newSubjects.push({
        id: `sub_${Date.now()}`,
        name: unitForm.name,
        dueDate: unitForm.dueDate,
        resourceUrl: unitForm.resourceUrl,
        topics: []
      });
    }
    
    updateStudyPlan(plan.id, { subjects: newSubjects });
    setUnitModal({ isOpen: false, unit: null });
  };

  const deleteUnit = (unitId) => {
    if (!window.confirm('Bu üniteyi silmek istediğinize emin misiniz?')) return;
    const newSubjects = subjects.filter(s => s.id !== unitId);
    updateStudyPlan(plan.id, { subjects: newSubjects });
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
        } else {
          newTopics.push({
            id: `top_${Date.now()}`,
            ...topicForm
          });
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
      const newTopics = lines.map(line => ({
        id: `top_${Math.random().toString(36).substring(2, 9)}`,
        name: line
      }));
      newSubjects.push({
        id: `sub_${Date.now()}`,
        name: 'Genel',
        topics: newTopics
      });
    } else {
      newSubjects = subjects.map(s => {
        if (s.id === bulkTopicModal.unitId) {
          let newTopics = [...(s.topics || [])];
          lines.forEach(line => {
            newTopics.push({
              id: `top_${Math.random().toString(36).substring(2, 9)}`,
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
    alert(`Konular Gün 1'den Gün ${dayCounter - 1}'e kadar sırayla otomatik numaralandırıldı! ✨`);
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
  const handleAssign = () => {
    selectedStudents.forEach(studentId => {
      addStudyAssignment({ studentId, planId: plan.id, studyPlanId: plan.id, completedTopics: [] });
    });
    setAssignModal(false);
    setSelectedStudents([]);
    alert('Plan başarıyla öğrencilere atandı!');
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
      // 1. Skip table headers like "Gün İçerik Sayfa"
      const lower = line.toLowerCase();
      if ((lower.includes('gün') && lower.includes('içerik')) || /^gün\s*içerik/i.test(line)) {
        return;
      }

      // 2. Unit Line Check (e.g. "1. Ünite – Okuma Kültürü / Doğal Sayılar (s. 5-28)")
      const isUnitLine = (
        /^\d+[\.\s]*ünite/i.test(line) ||
        /^ünite\s*\d+/i.test(line) ||
        (line.toLowerCase().includes('ünite') && !line.includes('\t') && !line.includes('•')) ||
        (line.endsWith(':') && !line.includes('http'))
      );

      if (isUnitLine) {
        const unitName = line.replace(/:$/, '').trim();
        currentUnit = {
          id: `sub_${Math.random().toString(36).substring(2, 9)}`,
          name: unitName,
          topics: []
        };
        units.push(currentUnit);
        return;
      }

      // 3. Tabbed or multi-column schedule lines (e.g. "1\tParagraf İnceleme...\t5-14")
      const tabParts = line.split(/\t+|\s{3,}/).map(p => p.trim()).filter(Boolean);
      if (tabParts.length >= 2 && (/^\d+$/.test(tabParts[0]) || /^gün\s*\d+/i.test(tabParts[0]))) {
        const dayStr = tabParts[0].toLowerCase().startsWith('gün') ? tabParts[0] : `Gün ${tabParts[0]}`;
        const content = tabParts[1];
        const pageInfo = tabParts[2] ? ` (s. ${tabParts[2]})` : '';
        const topicName = `${dayStr}: ${content}${pageInfo}`;

        if (!currentUnit) {
          currentUnit = {
            id: `sub_${Math.random().toString(36).substring(2, 9)}`,
            name: '1. Ünite',
            topics: []
          };
          units.push(currentUnit);
        }

        currentUnit.topics.push({
          id: `top_${Math.random().toString(36).substring(2, 9)}`,
          name: topicName
        });
        return;
      }

      // 4. Greater-than format: "Ünite Adı > Konu Adı"
      if (line.includes('>')) {
        const parts = line.split('>').map(p => p.trim());
        const uName = parts[0];
        const tName = parts.slice(1).join('>').trim();
        let uObj = units.find(u => u.name.toLowerCase() === uName.toLowerCase());
        if (!uObj) {
          uObj = { id: `sub_${Math.random().toString(36).substring(2, 9)}`, name: uName, topics: [] };
          units.push(uObj);
        }
        if (tName) {
          uObj.topics.push({ id: `top_${Math.random().toString(36).substring(2, 9)}`, name: tName });
        }
        return;
      }

      // 5. Standard bullet or text line
      const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
      const cleanLine = line.replace(/^[-*•\d+\.\s]+/, '').trim();

      if (cleanLine) {
        if (!currentUnit) {
          currentUnit = {
            id: `sub_${Math.random().toString(36).substring(2, 9)}`,
            name: 'Genel Ünite',
            topics: []
          };
          units.push(currentUnit);
        }
        currentUnit.topics.push({
          id: `top_${Math.random().toString(36).substring(2, 9)}`,
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
            id: unit.id || `sub_${Math.random().toString(36).substring(2, 9)}`,
            topics: (unit.topics || []).map(t => typeof t === 'string' ? { id: `top_${Math.random().toString(36).substring(2, 9)}`, name: t } : {
              ...t,
              id: t.id || `top_${Math.random().toString(36).substring(2, 9)}`
            })
          }));
        } else {
          alert('Geçersiz JSON formatı. Bir liste (dizi) olmalıdır.');
          return;
        }
      } catch (e) {
        alert('JSON parse hatası: ' + e.message);
        return;
      }
    }

    if (importedSubjects.length === 0) {
      alert('Hiç ünite veya konu korunamadı. Girişi kontrol edin.');
      return;
    }

    const newSubjects = [...subjects, ...importedSubjects];
    updateStudyPlan(plan.id, { subjects: newSubjects });
    setJsonModal(false);
    setBulkText('');
    setJsonText('');
    alert(`${importedSubjects.length} ünite ve konuları başarıyla eklendi!`);
  };

  const students = users?.filter(u => u.role === 'student') || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {plan.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">Çalışma Planı Detayı</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {subjects.length > 0 && (
              <button
                onClick={() => handleAutoNumberDays()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all shadow-sm border border-indigo-200/80 font-semibold text-sm"
                title="Tüm konulara sırayla Gün 1, Gün 2, Gün 3... atar"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Günleri Otomatik Sırala (1..N)</span>
              </button>
            )}
            <button
              onClick={() => setJsonModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm border border-slate-200"
            >
              <ListPlus className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">Toplu Ünite & Konu Ekle</span>
            </button>
            <button
              onClick={() => setAssignModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all shadow-md shadow-blue-500/20"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Öğrenciye Ata</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-semibold text-slate-700">Üniteler ve Konular</h2>
            <button
              onClick={() => openUnitModal()}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-blue-600 rounded-xl transition-all shadow-sm border border-blue-100"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">Ünite Ekle</span>
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center p-12 bg-white/50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center">
              <p className="text-slate-500 mb-6 font-medium">Henüz bir ünite eklenmemiş.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => openUnitModal()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Önce Ünite Ekle
                </button>
                <div className="text-slate-400 text-sm font-medium">veya</div>
                <button
                  onClick={() => { setBulkTopicModal({ isOpen: true, unitId: 'auto_create' }); setBulkTopicText(''); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <ListPlus className="w-5 h-5" />
                  Direkt Satır Satır Konuları Yapıştır
                </button>
              </div>
            </div>
          ) : (
            subjects.map((unit) => {
              const isExpanded = expandedUnits.includes(unit.id);
              return (
                <div key={unit.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                  {/* Unit Header */}
                  <div 
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-3"
                    onClick={() => toggleUnit(unit.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{unit.name}</h3>
                        {unit.dueDate && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Hedef: {unit.dueDate}</span>
                          </div>
                        )}
                        {unit.resourceUrl && (
                          <a 
                            href={unit.resourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 hover:underline mt-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>Genel Kaynak Linki</span>
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => { setBulkTopicModal({ isOpen: true, unitId: unit.id }); setBulkTopicText(''); }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Toplu Konu Ekle (Satır Satır)"
                      >
                        <ListPlus className="w-4 h-4" />
                        <span className="text-xs font-medium">Toplu Ekle</span>
                      </button>
                      <button 
                        onClick={() => openTopicModal(unit.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Konu Ekle"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-medium hidden sm:inline">Konu Ekle</span>
                      </button>
                      <button 
                        onClick={() => openUnitModal(unit)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Üniteyi Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteUnit(unit.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Üniteyi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Topics List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      {(!unit.topics || unit.topics.length === 0) ? (
                        <p className="text-sm text-slate-400 text-center py-4">Bu ünitede henüz konu yok.</p>
                      ) : (
                        <div className="space-y-3">
                          {unit.topics.map(topic => (
                            <div key={topic.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  {topic.day && (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                      {topic.day.toLowerCase().startsWith('gün') ? topic.day : `Gün ${topic.day}`}
                                    </span>
                                  )}
                                  <span className="font-medium text-slate-700">{topic.name}</span>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-1.5">
                                  {topic.dueDate && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {topic.dueDate}
                                    </div>
                                  )}
                                  {topic.resourceUrl && (
                                    <a 
                                      href={topic.resourceUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline bg-blue-50/50 px-2 py-0.5 rounded-md"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5" />
                                      Kaynak Linki
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
                                  <button
                                    onClick={() => {
                                      const cur = parseInt(String(topic.day || '1').replace(/\D/g, ''), 10) || 1;
                                      handleSetTopicDay(unit.id, topic.id, String(Math.max(1, cur - 1)));
                                    }}
                                    className="w-5 h-5 flex items-center justify-center font-bold text-slate-500 hover:bg-white rounded-md transition-all"
                                    title="Günü Azalt"
                                  >
                                    -
                                  </button>
                                  <span className="px-1 font-black text-indigo-700 text-xs whitespace-nowrap">
                                    {topic.day ? (topic.day.toLowerCase().startsWith('gün') ? topic.day : `Gün ${topic.day}`) : '+ Gün'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const cur = parseInt(String(topic.day || '0').replace(/\D/g, ''), 10) || 0;
                                      handleSetTopicDay(unit.id, topic.id, String(cur + 1));
                                    }}
                                    className="w-5 h-5 flex items-center justify-center font-bold text-slate-500 hover:bg-white rounded-md transition-all"
                                    title="Günü Artır"
                                  >
                                    +
                                  </button>
                                </div>

                                <button 
                                  onClick={() => openTopicModal(unit.id, topic)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Düzenle"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteTopic(unit.id, topic.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            })
          )}
        </div>
      </div>

      {/* Modals */}
      
      {/* Unit Modal */}
      {unitModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                {unitModal.unit ? 'Üniteyi Düzenle' : 'Yeni Ünite Ekle'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ünite Adı</label>
                  <input
                    type="text"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({...unitForm, name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Örn: 1. Ünite - Üslü Sayılar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hedef Tarih (İsteğe bağlı)</label>
                  <input
                    type="date"
                    value={unitForm.dueDate}
                    onChange={(e) => setUnitForm({...unitForm, dueDate: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kaynak Linki (İsteğe bağlı)</label>
                  <input
                    type="url"
                    value={unitForm.resourceUrl}
                    onChange={(e) => setUnitForm({...unitForm, resourceUrl: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700"
                    placeholder="Tüm konular için geçerli genel kaynak"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setUnitModal({ isOpen: false, unit: null })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={saveUnit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {topicModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                {topicModal.topic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Konu Adı</label>
                  <input
                    type="text"
                    value={topicForm.name}
                    onChange={(e) => setTopicForm({...topicForm, name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Örn: Pozitif Tam Sayıların Üsleri"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gün Numarası / Etiketi (İsteğe bağlı)</label>
                  <input
                    type="text"
                    value={topicForm.day || ''}
                    onChange={(e) => setTopicForm({...topicForm, day: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700"
                    placeholder="Örn: 1 veya Gün 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hedef Tarih (İsteğe bağlı)</label>
                  <input
                    type="date"
                    value={topicForm.dueDate}
                    onChange={(e) => setTopicForm({...topicForm, dueDate: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kaynak Linki (İsteğe bağlı)</label>
                  <input
                    type="url"
                    value={topicForm.resourceUrl}
                    onChange={(e) => setTopicForm({...topicForm, resourceUrl: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setTopicModal({ isOpen: false, unitId: null, topic: null })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={saveTopic}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Topic Add Modal */}
      {bulkTopicModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Toplu Konu Ekle</h3>
                <p className="text-sm text-slate-500 mt-1">Her satıra bir konu gelecek şekilde yazın</p>
              </div>
              <button onClick={() => setBulkTopicModal({ isOpen: false, unitId: null })} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea
                className="w-full h-64 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                placeholder="Kesirlerde Toplama&#10;Kesirlerde Çıkarma&#10;Kesirlerde Çarpma"
                value={bulkTopicText}
                onChange={(e) => setBulkTopicText(e.target.value)}
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setBulkTopicModal({ isOpen: false, unitId: null })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={saveBulkTopics}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium shadow-sm"
              >
                Satırları Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Öğrenciye Ata</h3>
                <p className="text-sm text-slate-500 mt-1">Bu planı atamak istediğiniz öğrencileri seçin</p>
              </div>
              <button onClick={() => setAssignModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              {students.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Kayıtlı öğrenci bulunamadı.</p>
              ) : (
                <div className="space-y-2">
                  {students.map(student => (
                    <label 
                      key={student.id} 
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedStudents.includes(student.id) 
                          ? 'bg-blue-50/50 border-blue-200' 
                          : 'hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{student.name} {student.surname}</span>
                        <span className="text-xs text-slate-500">{student.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setAssignModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedStudents.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Seçilenlere Ata ({selectedStudents.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Ünite & Konu Ekle Modal */}
      {jsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ListPlus className="w-6 h-6 text-blue-600" /> Toplu Ünite & Konu Ekle
                </h3>
                <p className="text-xs text-slate-500 mt-1">Düz metin yapıştırarak veya JSON ile tek seferde tüm müfredatı girin</p>
              </div>
              <button onClick={() => setJsonModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full border border-slate-200 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-4 flex items-center justify-between gap-4">
              <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-md border border-slate-200/80">
                <button
                  onClick={() => setBulkMode('text')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${bulkMode === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  📝 Düz Metin İle Ekle (Çok Pratik)
                </button>
                <button
                  onClick={() => setBulkMode('json')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${bulkMode === 'json' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {'{ }'} JSON İle Ekle (Gelişmiş)
                </button>
              </div>

              {bulkMode === 'text' ? (
                <button
                  type="button"
                  onClick={() => setBulkText(`1. Ünite: Doğal Sayılar\n- Doğal Sayılarla İşlemler\n- Üslü Nicelikler\n- İşlem Önceliği\n\n2. Ünite: Çarpanlar ve Katlar\n- Asal Sayılar\n- Ortak Bölgenler ve Katlar`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl whitespace-nowrap border border-blue-200/60"
                >
                  ⚡ Örnek Şablon Yükle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setJsonText(`[\n  {\n    "name": "1. Ünite: Doğal Sayılar",\n    "topics": [\n      { "name": "Doğal Sayılarla İşlemler" },\n      { "name": "Üslü Nicelikler" }\n    ]\n  }\n]`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl whitespace-nowrap border border-blue-200/60"
                >
                  ⚡ Örnek JSON Yükle
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              {bulkMode === 'text' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Ünite ve Konu Listesini Aşağıya Yapıştırın:
                  </label>
                  <textarea
                    className="w-full h-64 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    placeholder={`1. Ünite: Üslü İfadeler\n- Üslü Nicelikler\n- Üslü Sayılarda Çarpma\n\n2. Ünite: Kareköklü İfadeler\n- Tam Kare Sayılar\n- Karekök Alma\n\n(veya Ünite > Konu formatında yapıştırabilirsiniz)`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <p className="font-semibold text-slate-700">💡 İpucu Formatlar:</p>
                    <p>• <span className="font-mono">Ünite İsmi:</span> yazdıktan sonra tire (<span className="font-mono">-</span>) veya yıldız (<span className="font-mono">*</span>) ile altındaki konuları yazabilirsiniz.</p>
                    <p>• Veya <span className="font-mono">Ünite Adı &gt; Konu Adı</span> şeklinde her satıra bir konu yazabilirsiniz.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    JSON Kodunu Yapıştırın:
                  </label>
                  <textarea
                    className="w-full h-64 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    placeholder={'[\n  {\n    "name": "1. Ünite: Üslü Sayılar",\n    "dueDate": "2026-10-15",\n    "topics": [\n      { "name": "Konu 1", "dueDate": "2026-10-12" }\n    ]\n  }\n]'}
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setJsonModal(false)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-bold text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleBulkImport}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-colors font-bold text-sm shadow-md shadow-blue-500/20"
              >
                İçeriği Aktar & Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
