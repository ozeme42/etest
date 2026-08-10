import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Trophy, Target, TrendingUp, BarChart3, 
  Layers, ChevronRight, Check, X, Circle, User
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function ExamAnalysisPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const { books } = useTrackedBooks();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const exam = books.find(b => b.id === examId);
  const students = users.filter(u => u.role === 'student');

  const examSubmissions = useMemo(() => {
    const examHwIds = homeworks.filter(h => h.bookId === examId).map(h => h.id);
    return submissions.filter(s => examHwIds.includes(s.hwId) || s.bookId === examId);
  }, [submissions, homeworks, examId]);

  const { 
    totalParticipants, overallAvgScore, maxScore, 
    studentStats, subjectChartData, classChartData, questionAnalysisMap 
  } = useMemo(() => {
    const participantIds = new Set(examSubmissions.map(s => s.studentId));
    const tParticipants = participantIds.size;
    
    const stats = Array.from(participantIds).map(studentId => {
      const sSubmissions = examSubmissions.filter(s => s.studentId === studentId);
      const student = students.find(u => u.id === studentId);
      
      const tScore = sSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
      const aScore = sSubmissions.length ? tScore / sSubmissions.length : 0;
      
      const tCorrect = sSubmissions.reduce((sum, s) => sum + (s.correctCount || 0), 0);
      const tWrong = sSubmissions.reduce((sum, s) => sum + (s.wrongCount || 0), 0);
      const tEmpty = sSubmissions.reduce((sum, s) => sum + (s.emptyCount || 0), 0);
      
      return {
        studentId,
        studentName: student ? student.name : sSubmissions[0].studentName || 'Bilinmeyen Öğrenci',
        classId: student?.classId || student?.gradeId || 'Bilinmeyen Sınıf',
        avgScore: aScore,
        totalScore: tScore,
        totalCorrect: tCorrect,
        totalWrong: tWrong,
        totalEmpty: tEmpty,
        submissions: sSubmissions
      };
    });
    
    stats.sort((a, b) => b.avgScore - a.avgScore);
    
    const oAvgScore = stats.length ? stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length : 0;
    const mScore = stats.length ? Math.max(...stats.map(s => s.avgScore)) : 0;
    
    const subjStats = {};
    examSubmissions.forEach(sub => {
      const subj = sub.subject || 'Diğer';
      if (!subjStats[subj]) subjStats[subj] = { subject: subj, total: 0, count: 0 };
      subjStats[subj].total += (sub.score || 0);
      subjStats[subj].count += 1;
    });
    const subjChartData = Object.values(subjStats).map(s => ({
      name: s.subject,
      'Ortalama Puan': Number((s.total / s.count).toFixed(2))
    }));

    const cStatsMap = {};
    stats.forEach(s => {
      const cid = s.classId;
      if (!cStatsMap[cid]) cStatsMap[cid] = { classId: cid, total: 0, count: 0 };
      cStatsMap[cid].total += s.avgScore;
      cStatsMap[cid].count += 1;
    });
    const clsChartData = Object.values(cStatsMap).map(c => ({
      name: c.classId,
      'Ortalama Puan': Number((c.total / c.count).toFixed(2))
    }));

    const qMap = {};
    examSubmissions.forEach(sub => {
      const subj = sub.subject || 'Diğer';
      if (!qMap[subj]) qMap[subj] = {};
      
      if (sub.answers && Array.isArray(sub.answers)) {
        sub.answers.forEach((ans, idx) => {
          const qIndex = ans.questionNo || (idx + 1);
          if (!qMap[subj][qIndex]) {
             qMap[subj][qIndex] = { qIndex, correct: 0, wrong: 0, empty: 0 };
          }
          
          if (ans.isCorrect) {
            qMap[subj][qIndex].correct += 1;
          } else if (ans.userAnswer === '' || !ans.userAnswer) {
            qMap[subj][qIndex].empty += 1;
          } else {
            qMap[subj][qIndex].wrong += 1;
          }
        });
      }
    });

    return {
      totalParticipants: tParticipants,
      overallAvgScore: oAvgScore,
      maxScore: mScore,
      studentStats: stats,
      subjectChartData: subjChartData,
      classChartData: clsChartData,
      questionAnalysisMap: qMap
    };
  }, [examSubmissions, students]);

  const tabs = [
    { id: 'overview', label: 'Genel Durum', icon: BarChart3 },
    { id: 'class', label: 'Sınıf Analizi', icon: Layers },
    { id: 'students', label: 'Öğrenci Sıralaması', icon: Trophy },
    { id: 'questions', label: 'Soru Madde Analizi', icon: Target },
  ];

  const COLORS = ['#10b981', '#ef4444', '#e2e8f0'];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {exam ? exam.title : 'Sınav Analizi'}
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Detaylı performans ve istatistik raporu
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Katılım</span>
              <span className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" /> {totalParticipants}
              </span>
            </div>
            <div className="flex-1 md:flex-none bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ortalama</span>
              <span className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> {overallAvgScore.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-200" : "text-slate-400")} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 bg-indigo-50 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">Toplam Katılımcı</p>
                    <h3 className="text-3xl font-black text-slate-800">{totalParticipants}</h3>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 bg-emerald-50 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">Genel Ortalama</p>
                    <h3 className="text-3xl font-black text-slate-800">{overallAvgScore.toFixed(2)}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 bg-amber-50 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 text-amber-600">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">En Yüksek Skor</p>
                    <h3 className="text-3xl font-black text-slate-800">{maxScore.toFixed(2)}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Derslere Göre Ortalama Puanlar
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      />
                      <Bar dataKey="Ortalama Puan" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'class' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  Sınıflara Göre Başarı Ortalaması
                </h3>
                {classChartData.length > 0 ? (
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <RechartsTooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        />
                        <Bar dataKey="Ortalama Puan" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={80} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium">Sınıf verisi bulunamadı.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Başarı Sıralaması
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-16">Sıra</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Öğrenci</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sınıf</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Doğru</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Yanlış</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ort. Puan</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentStats.map((s, idx) => (
                      <tr 
                        key={s.studentId} 
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">{s.studentName}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">{s.classId}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600">{s.totalCorrect}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-red-500">{s.totalWrong}</td>
                        <td className="px-6 py-4 text-center text-sm font-black text-indigo-600">{s.avgScore.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 rounded-xl text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {studentStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          Henüz sınav teslimi bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8">
              {Object.keys(questionAnalysisMap).length > 0 ? (
                Object.entries(questionAnalysisMap).map(([subject, qData]) => {
                  const sortedQuestions = Object.values(qData).sort((a, b) => a.qIndex - b.qIndex);
                  return (
                    <div key={subject} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                        <Target className="w-5 h-5 text-indigo-500" />
                        {subject}
                      </h3>
                      <div className="space-y-4">
                        {sortedQuestions.map((q) => {
                          const total = q.correct + q.wrong + q.empty;
                          const correctPct = total > 0 ? (q.correct / total) * 100 : 0;
                          const wrongPct = total > 0 ? (q.wrong / total) * 100 : 0;
                          const emptyPct = total > 0 ? (q.empty / total) * 100 : 0;
                          
                          const isHard = correctPct < 30 && total > 0;
                          
                          return (
                            <div key={q.qIndex} className="flex flex-col md:flex-row md:items-center gap-4 group">
                              <div className="w-24 shrink-0 flex items-center gap-2">
                                <span className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
                                  isHard ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
                                )}>
                                  {q.qIndex}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Soru</span>
                              </div>
                              
                              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden flex">
                                <div style={{ width: `${correctPct}%` }} className="bg-emerald-500 transition-all duration-500"></div>
                                <div style={{ width: `${wrongPct}%` }} className="bg-red-400 transition-all duration-500"></div>
                                <div style={{ width: `${emptyPct}%` }} className="bg-slate-300 transition-all duration-500"></div>
                              </div>
                              
                              <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 text-xs font-bold shrink-0">
                                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                  <Check className="w-3.5 h-3.5" /> {q.correct} ({correctPct.toFixed(0)}%)
                                </div>
                                <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                                  <X className="w-3.5 h-3.5" /> {q.wrong} ({wrongPct.toFixed(0)}%)
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                  <Circle className="w-3 h-3" /> {q.empty} ({emptyPct.toFixed(0)}%)
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
                  <p className="text-slate-400 font-medium">Soru analiz verisi bulunamadı.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{selectedStudent.studentName}</h3>
                  <p className="text-sm font-medium text-slate-500">{selectedStudent.classId} - Öğrenci Karnesi</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="p-2 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <h4 className="text-sm font-bold text-slate-500 w-full text-center mb-2">Genel Başarı Oranı</h4>
                    <div className="h-48 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Doğru', value: selectedStudent.totalCorrect },
                              { name: 'Yanlış', value: selectedStudent.totalWrong },
                              { name: 'Boş', value: selectedStudent.totalEmpty },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={COLORS[0]} />
                            <Cell fill={COLORS[1]} />
                            <Cell fill={COLORS[2]} />
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-slate-800">
                          {selectedStudent.totalCorrect + selectedStudent.totalWrong + selectedStudent.totalEmpty > 0 
                            ? Math.round((selectedStudent.totalCorrect / (selectedStudent.totalCorrect + selectedStudent.totalWrong + selectedStudent.totalEmpty)) * 100) 
                            : 0}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Başarı</span>
                      </div>
                    </div>
                    
                    <div className="w-full grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-emerald-50 p-2 rounded-xl text-center">
                        <div className="text-lg font-black text-emerald-600">{selectedStudent.totalCorrect}</div>
                        <div className="text-[10px] font-bold text-emerald-600/70 uppercase">Doğru</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded-xl text-center">
                        <div className="text-lg font-black text-red-500">{selectedStudent.totalWrong}</div>
                        <div className="text-[10px] font-bold text-red-500/70 uppercase">Yanlış</div>
                      </div>
                      <div className="bg-slate-100 p-2 rounded-xl text-center">
                        <div className="text-lg font-black text-slate-500">{selectedStudent.totalEmpty}</div>
                        <div className="text-[10px] font-bold text-slate-500/70 uppercase">Boş</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500 mb-4">Puan Özeti</h4>
                    <div className="text-4xl font-black text-indigo-600 mb-1">{selectedStudent.avgScore.toFixed(2)}</div>
                    <div className="text-xs font-medium text-slate-400">Ortalama Sınav Puanı</div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-lg font-black text-slate-800 px-1">Ders Detayları & Optik Form</h4>
                  {selectedStudent.submissions.map((sub, idx) => (
                    <div key={sub.id || idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="font-bold text-slate-700">{sub.subject || 'Diğer'}</h5>
                          <p className="text-xs text-slate-400 font-medium">Puan: {sub.score?.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-3 text-xs font-bold">
                          <span className="text-emerald-500">{sub.correctCount} D</span>
                          <span className="text-red-500">{sub.wrongCount} Y</span>
                          <span className="text-slate-400">{sub.emptyCount} B</span>
                        </div>
                      </div>
                      
                      {sub.answers && Array.isArray(sub.answers) && sub.answers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sub.answers.map((ans, aIdx) => {
                            const qNo = ans.questionNo || (aIdx + 1);
                            const isEmpty = ans.userAnswer === '' || !ans.userAnswer;
                            const isCorrect = ans.isCorrect;
                            
                            return (
                              <div 
                                key={aIdx}
                                title={`Soru ${qNo} - ${isEmpty ? 'Boş' : isCorrect ? 'Doğru' : 'Yanlış'} (Cevap: ${ans.userAnswer || '-'})`}
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black cursor-default transition-all hover:scale-110",
                                  isCorrect 
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : isEmpty 
                                      ? "bg-slate-100 text-slate-400 border border-slate-200" 
                                      : "bg-red-100 text-red-600 border border-red-200"
                                )}
                              >
                                {qNo}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">Optik form verisi yok.</div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
