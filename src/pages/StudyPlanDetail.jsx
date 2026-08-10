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
  X
} from 'lucide-react';

export default function StudyPlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { studyPlans, updateStudyPlan, addStudyAssignment } = useStudyPlan();
  const { users } = useUser();

  const plan = studyPlans?.find((p) => p.id === planId);
  const subjects = plan?.subjects || [];

  const [expandedUnits, setExpandedUnits] = useState([]);

  // Modals
  const [unitModal, setUnitModal] = useState({ isOpen: false, unit: null }); // null = add, else edit
  const [topicModal, setTopicModal] = useState({ isOpen: false, unitId: null, topic: null }); // topic null = add, else edit
  const [assignModal, setAssignModal] = useState(false);
  const [jsonModal, setJsonModal] = useState(false);

  // Form states
  const [unitForm, setUnitForm] = useState({ name: '', dueDate: '' });
  const [topicForm, setTopicForm] = useState({ name: '', dueDate: '', resourceUrl: '' });
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
    setUnitForm(unit ? { name: unit.name, dueDate: unit.dueDate || '' } : { name: '', dueDate: '' });
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
    setTopicForm(topic ? { name: topic.name, dueDate: topic.dueDate || '', resourceUrl: topic.resourceUrl || '' } : { name: '', dueDate: '', resourceUrl: '' });
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

  // Assign Actions
  const handleAssign = () => {
    selectedStudents.forEach(studentId => {
      addStudyAssignment({ studentId, planId: plan.id, completedTopics: [] });
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

  // JSON Actions
  const handleJsonImport = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        const newSubjects = [...subjects, ...parsed.map(unit => ({
          ...unit,
          id: unit.id || `sub_${Math.random().toString(36).substring(2, 9)}`,
          topics: (unit.topics || []).map(t => ({
            ...t,
            id: t.id || `top_${Math.random().toString(36).substring(2, 9)}`
          }))
        }))];
        updateStudyPlan(plan.id, { subjects: newSubjects });
        setJsonModal(false);
        setJsonText('');
      } else {
        alert('Geçersiz JSON formatı. Bir dizi (array) olmalıdır.');
      }
    } catch (e) {
      alert('JSON parse hatası: ' + e.message);
    }
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
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setJsonModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm border border-slate-200"
            >
              <FileJson className="w-4 h-4" />
              <span className="font-medium text-sm">Toplu JSON Ekle</span>
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
            <div className="text-center p-12 bg-white/50 border border-dashed border-slate-300 rounded-2xl">
              <p className="text-slate-500 mb-4">Henüz bir ünite eklenmemiş.</p>
              <button
                onClick={() => openUnitModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ünite Ekle
              </button>
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
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
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
                                <span className="font-medium text-slate-700">{topic.name}</span>
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
                              <div className="flex items-center gap-1 self-end sm:self-auto">
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

      {/* JSON Modal */}
      {jsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Toplu JSON Ekle</h3>
                <p className="text-sm text-slate-500 mt-1">Ünite ve konu dizisini JSON formatında yapıştırın</p>
              </div>
              <button onClick={() => setJsonModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea
                className="w-full h-64 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                placeholder={'[\n  {\n    "name": "Yeni Ünite",\n    "dueDate": "2026-10-10",\n    "topics": [\n      { "name": "Konu 1" }\n    ]\n  }\n]'}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setJsonModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleJsonImport}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm"
              >
                İçe Aktar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
