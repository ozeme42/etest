import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { Plus, Edit, Trash2, ArrowLeft, Target, ChevronRight, Layers, FileText, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function StudyPlanManager() {
  const navigate = useNavigate();
  const { studyPlans, addStudyPlan, deleteStudyPlan } = useStudyPlan();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const plan = await addStudyPlan({ title: newTitle.trim(), subjects: [] });
    setIsAdding(false);
    setNewTitle('');
    navigate(`/study-plans/${plan.id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bu yol haritasını silmek istediğinize emin misiniz?')) {
      deleteStudyPlan(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Target className="w-7 h-7 text-indigo-500" />
                Yol Haritaları
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Öğrenciler için konu anlatım ve takip planları oluşturun.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-5 h-5" />
            Yeni Plan Oluştur
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/50 max-w-2xl">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" /> Yeni Yol Haritası Ekle
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Plan Adı (Örn: 5.Sınıf Matematik, LGS Hızlandırma...)"
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <button 
                  onClick={handleCreate}
                  className="px-6 py-3 bg-emerald-500 text-white text-sm font-bold rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                >
                  Oluştur
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid List */}
        {studyPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studyPlans.map(plan => {
              const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
              return (
                <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Target className="w-6 h-6" />
                      </div>
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-lg">
                        YOL HARİTASI
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-800 mb-2 line-clamp-2" title={plan.title}>
                      {plan.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 mt-4 py-4 border-t border-b border-slate-100">
                      <div className="flex-1 text-center border-r border-slate-100">
                        <div className="text-2xl font-black text-indigo-600">{plan.subjects?.length || 0}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Ünite / Ders</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-2xl font-black text-emerald-600">{totalTopics}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Konu / Adım</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <button 
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Planı Sil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <button 
                      onClick={() => navigate(`/study-plans/${plan.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-indigo-600 text-sm font-bold rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors shadow-sm"
                    >
                      İçeriği Yönet <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
              <Target className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Henüz Yol Haritası Yok</h3>
            <p className="text-slate-500 font-medium max-w-md mb-8">
              Öğrencilerinize adım adım takip edebilecekleri çalışma planları ve konu listeleri oluşturmak için yeni bir yol haritası ekleyin.
            </p>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-5 h-5" /> İlk Planı Oluştur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
