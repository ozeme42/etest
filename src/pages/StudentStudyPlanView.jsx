import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { ArrowLeft, Target, CheckCircle2, Lock, PlayCircle, ExternalLink, Calendar, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isPast, parseISO } from 'date-fns';

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function StudentStudyPlanView() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();

  const assignment = studyAssignments.find(a => a.id === assignmentId);
  const plan = studyPlans.find(p => p.id === assignment?.planId);

  const completedTopics = useMemo(() => new Set(assignment?.completedTopics || []), [assignment]);

  if (!assignment || !plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-500">Görev bulunamadı.</div>
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
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-50 blur-3xl"></div>
          
          <div className="relative flex items-start gap-4 mb-8">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-md transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg mb-2 inline-block">
                Yol Haritası Görevi
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {plan.title}
              </h1>
            </div>
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border-4 border-white shadow-md">
              <Target className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div className="relative">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-slate-500">İlerleme Durumu</span>
              <span className="text-indigo-600">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
              <span>{completedTopics.size} Tamamlandı</span>
              <span>{totalTopics} Toplam Adım</span>
            </div>
          </div>
        </div>

        {/* Subjects & Topics */}
        <div className="space-y-6">
          {(plan.subjects || []).map((subject, sIdx) => {
            let isSubjectOverdue = false;
            try {
              isSubjectOverdue = subject.dueDate && isPast(parseISO(subject.dueDate));
            } catch(e) {}
            
            return (
              <div key={subject.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black shrink-0">
                      {sIdx + 1}
                    </div>
                    <h2 className="text-lg font-black text-slate-800">{subject.name}</h2>
                  </div>
                  {subject.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold",
                      isSubjectOverdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                    )}>
                      <Calendar className="w-3.5 h-3.5" /> 
                      Bitiş: {subject.dueDate}
                    </div>
                  )}
                </div>
                
                <div className="p-2">
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
                    } catch(e){}

                    return (
                      <div 
                        key={topic.id} 
                        className={cn(
                          "flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl transition-all mb-1",
                          isCompleted ? "bg-emerald-50/30 opacity-70 hover:opacity-100" :
                          isCurrent ? "bg-indigo-50/50 border border-indigo-100" :
                          "opacity-40 grayscale"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => {
                              if (isLocked) return;
                              if (isCompleted) handleUnmarkCompleted(topic.id);
                              else handleMarkCompleted(topic.id);
                            }}
                            disabled={isLocked}
                            className={cn(
                              "mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                              isCompleted ? "bg-emerald-500 text-white" :
                              isCurrent ? "border-2 border-indigo-400 bg-white cursor-pointer hover:bg-indigo-50" :
                              "bg-slate-200 text-slate-400"
                            )}
                          >
                            {isCompleted && <Check className="w-4 h-4" />}
                            {isLocked && <Lock className="w-3 h-3" />}
                          </button>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wider",
                                isCompleted ? "text-emerald-600" :
                                isCurrent ? "text-indigo-600" :
                                "text-slate-500"
                              )}>
                                Adım {tIdx + 1}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded">
                                  Sıradaki
                                </span>
                              )}
                              {isTopicOverdue && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-wider rounded">
                                  Gecikti
                                </span>
                              )}
                            </div>
                            <h3 className={cn(
                              "text-sm font-bold",
                              isCompleted ? "text-emerald-900 line-through decoration-emerald-200" :
                              isCurrent ? "text-indigo-950" :
                              "text-slate-700"
                            )}>
                              {topic.name}
                            </h3>
                            {topic.dueDate && (
                              <p className="text-xs font-medium text-slate-500 mt-0.5">
                                Son Teslim: {topic.dueDate}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-10 md:pl-0">
                          {(topic.resourceUrl || subject.resourceUrl) && (
                            <a 
                              href={topic.resourceUrl || subject.resourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none" :
                                isCurrent ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20" :
                                "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                              onClick={e => {
                                if (isLocked) e.preventDefault();
                              }}
                            >
                              {isLocked ? <Lock className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                              Çalışma Kaynağı
                              <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                          )}
                          
                          {isCurrent && (
                            <button
                              onClick={() => handleMarkCompleted(topic.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Bitirdim
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!subject.topics || subject.topics.length === 0) && (
                    <div className="p-8 text-center text-sm font-bold text-slate-400">
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
