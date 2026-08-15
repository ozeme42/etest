import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, BookOpen, Target, BrainCircuit, Activity, BarChart3, PieChart as PieChartIcon, Sparkles, Trophy, GraduationCap, CheckCircle2 } from 'lucide-react';

import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCurriculum } from '../context/CurriculumContext';
import './StatisticsDashboard.css';

function StatCard({ icon: Icon, label, value, grad }) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 text-white shadow-lg ${grad} flex items-center gap-3 min-w-0 flex-1 hover:scale-[1.02] active:scale-95 transition-all`}>
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg sm:text-2xl font-black leading-none">{value}</p>
        <p className="text-[10px] sm:text-xs font-bold text-white/90 truncate mt-0.5" title={label}>{label}</p>
      </div>
    </div>
  );
}

export default function StatisticsDashboard() {
  const { users } = useUser() || { users: [] };
  const auth = useAuth() || {};
  const currentUser = auth.currentUser;
  const { submissions: allSubmissions } = useEvaluation() || { submissions: [] };
  const { homeworks: allHomeworks } = useHomework() || { homeworks: [] };
  const { studyAssignments: allStudyAssignments } = useStudyPlan() || { studyAssignments: [] };
  const curriculumContext = useCurriculum() || {};
  const curriculumData = curriculumContext.data;
  
  const isTeacher = currentUser?.role === 'teacher';
  const teacherId = currentUser?.id;

  const students = useMemo(() => {
    const all = (users || []).filter(u => u && u.role === 'student');
    if (!isTeacher || !teacherId) return all;
    return all.filter(u => u.teacherId === teacherId || !u.teacherId);
  }, [users, isTeacher, teacherId]);

  const teacherStudentIds = useMemo(() => new Set(students.map(s => String(s.id))), [students]);

  const homeworks = useMemo(() => {
    const all = allHomeworks || [];
    if (!isTeacher || !teacherId) return all;
    return all.filter(h => h.createdBy === teacherId || h.teacherId === teacherId || h.assignedBy === teacherId);
  }, [allHomeworks, isTeacher, teacherId]);

  const studyAssignments = useMemo(() => {
    const all = allStudyAssignments || [];
    if (!isTeacher || !teacherId) return all;
    return all.filter(a => teacherStudentIds.has(String(a.studentId)) || a.teacherId === teacherId);
  }, [allStudyAssignments, isTeacher, teacherId, teacherStudentIds]);

  const submissions = useMemo(() => {
    const all = allSubmissions || [];
    if (!isTeacher || !teacherId) return all;
    return all.filter(s => s && s.studentId && teacherStudentIds.has(String(s.studentId)));
  }, [allSubmissions, isTeacher, teacherId, teacherStudentIds]);

  // --- KPI Calculations ---
  const totalStudents = students.length;
  const totalHomeworksAssigned = homeworks.length;
  
  const validSubmissions = useMemo(() => submissions.filter(s => s && s.score !== undefined && s.score !== null && !isNaN(Number(s.score))), [submissions]);
  const avgScore = validSubmissions.length > 0 
    ? Math.round(validSubmissions.reduce((acc, sub) => acc + Number(sub.score), 0) / validSubmissions.length)
    : 0;

  const totalStudyAssignments = studyAssignments.length;
  const completedStudyAssignments = studyAssignments.filter(a => a.status === 'completed' || a.completed === true).length;

  // --- Chart 1: Success Over Time (Area Chart) ---
  const successOverTimeData = useMemo(() => {
    const grouped = {};
    (submissions || []).forEach(sub => {
      if (!sub || sub.score === undefined || sub.score === null || isNaN(Number(sub.score))) return;
      const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }) : 'Genel';
      if (!grouped[dateStr]) grouped[dateStr] = { date: dateStr, totalScore: 0, count: 0 };
      grouped[dateStr].totalScore += Number(sub.score);
      grouped[dateStr].count += 1;
    });

    return Object.values(grouped)
      .map(item => ({
        date: item.date,
        'Ortalama Skor': Math.round(item.totalScore / item.count)
      }));
  }, [submissions]);

  const finalSuccessData = successOverTimeData;

  // --- Chart 2: Assignments by Subject (Bar Chart) ---
  const finalSubjectData = useMemo(() => {
    const grouped = {};
    (studyAssignments || []).forEach(a => {
      const s = a.subject || 'Belirtilmemiş';
      if (!grouped[s]) {
        grouped[s] = { subject: s, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[s].Atanan += 1;
      if (a.status === 'completed' || a.completed === true) {
        grouped[s].Tamamlanan += 1;
      }
    });
    return Object.values(grouped);
  }, [studyAssignments]);

  // --- Chart 2.5: Assignments by Topic (Bar Chart) ---
  const finalTopicData = useMemo(() => {
    const grouped = {};
    (studyAssignments || []).forEach(a => {
      const t = a.topic || 'Belirtilmemiş';
      const label = t.length > 12 ? t.substring(0, 12) + '...' : t;
      if (!grouped[t]) {
        grouped[t] = { topic: label, fullTopic: t, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[t].Atanan += 1;
      if (a.status === 'completed' || a.completed === true) {
        grouped[t].Tamamlanan += 1;
      }
    });
    return Object.values(grouped).sort((a, b) => b.Atanan - a.Atanan).slice(0, 8);
  }, [studyAssignments]);

  // --- Chart 3: Study Plan Status (Pie Chart) ---
  const statusData = useMemo(() => {
    const completed = (studyAssignments || []).filter(a => a.status === 'completed' || a.completed === true).length;
    const pending = (studyAssignments || []).filter(a => a.status !== 'completed' && !a.completed).length;
    return [
      { name: 'Tamamlandı', value: completed },
      { name: 'Bekliyor', value: pending }
    ];
  }, [studyAssignments]);

  const finalStatusData = (statusData[0].value === 0 && statusData[1].value === 0) 
    ? [{ name: 'Veri Yok', value: 1 }] 
    : statusData;

  const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

  // --- Chart 4: Student Stats Table Data ---
  const studentStats = useMemo(() => {
    const gradesList = curriculumData?.grades || [];

    return students.map(student => {
      const studentSubmissions = (submissions || []).filter(s => 
        s && String(s.studentId) === String(student.id) && 
        s.score !== undefined && s.score !== null && !isNaN(Number(s.score))
      );
      
      const rawAvg = studentSubmissions.length > 0 
        ? Math.round(studentSubmissions.reduce((acc, sub) => acc + Number(sub.score), 0) / studentSubmissions.length)
        : 0;
      const studentAvgScore = isNaN(rawAvg) ? 0 : rawAvg;
      
      const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(student.id));
      const completedTasks = studentAssignments.filter(a => a.status === 'completed' || a.completed === true).length;
      const totalTasks = studentAssignments.length;
      const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Robust Grade Name Matching
      let gradeName = '';
      if (student.grade && student.grade !== 'g1' && !student.grade.startsWith('g_')) {
        gradeName = student.grade;
      } else if (student.className) {
        gradeName = student.className;
      } else if (student.gradeName) {
        gradeName = student.gradeName;
      }

      if (!gradeName) {
        const target = String(student.gradeId || student.classId || student.grade || '').trim().toLowerCase();
        const matched = gradesList.find(g => 
          String(g.id).toLowerCase() === target || 
          g.name.toLowerCase() === target
        );

        if (matched) {
          gradeName = matched.name;
        } else if (student.gradeId === 'g1') {
          gradeName = '5. Sınıf';
        } else if (student.gradeId === 'g2') {
          gradeName = '6. Sınıf';
        } else if (student.gradeId === 'g3') {
          gradeName = '7. Sınıf';
        } else if (student.gradeId === 'g4') {
          gradeName = '8. Sınıf (LGS)';
        } else {
          gradeName = student.gradeId || student.grade || 'Sınıfsız';
        }
      }

      return {
        id: student.id,
        name: student.name || 'İsimsiz Öğrenci',
        gradeName: gradeName || 'Sınıfsız',
        avgScore: studentAvgScore,
        completedTasks,
        totalTasks,
        progressPct: isNaN(progressPct) ? 0 : progressPct
      };
    });
  }, [students, submissions, studyAssignments, curriculumData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0B1120] dark:via-[#0d1528] dark:to-[#0B1120] font-sans text-slate-800 dark:text-slate-200">
      
      {/* ── STICKY GLASS HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0d1528]/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest block">E-Test LMS Analytics</span>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                Gelişmiş İstatistikler ve Analiz 📊
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
        
        {/* KPI CARDS (RESPONSIVE GRID) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}          label="Toplam Öğrenci"      value={totalStudents} grad="bg-gradient-to-br from-pink-500 to-rose-600" />
          <StatCard icon={BookOpen}       label="Atanan Sınav/Ödev"   value={totalHomeworksAssigned} grad="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <StatCard icon={Trophy}         label="Sınav Başarı Ort."    value={`%${avgScore}`} grad="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <StatCard icon={BrainCircuit}   label="Tamamlanan Konu"     value={`${completedStudyAssignments}/${totalStudyAssignments}`} grad="bg-gradient-to-br from-amber-500 to-orange-600" />
        </section>

        {/* CHARTS GRID 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" /> Genel Başarı İvmesi (Zamanlı)
              </h3>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finalSuccessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="Ortalama Skor" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-500" /> Konu Görev Durumu
              </h3>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {finalStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>

        {/* CHARTS GRID 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Subject Bar Chart */}
          <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-500" /> Ders Bazlı Görevler
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalSubjectData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="Atanan" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="Tamamlanan" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic Bar Chart */}
          <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" /> Konu Bazlı Görevler
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalTopicData} margin={{ top: 20, right: 20, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500, angle: -30, textAnchor: 'end' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '12px' }}
                    labelFormatter={(value, payload) => payload?.[0]?.payload?.fullTopic || value}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="Atanan" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="Tamamlanan" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>

        {/* STUDENT STATS TABLE & CARDS */}
        <section className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Öğrenci Bazlı İstatistik ve Durum Tablosu
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold">
              {studentStats.length} Öğrenci
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-400 font-black uppercase tracking-wider">
                  <th className="py-3.5 px-4">Öğrenci Adı</th>
                  <th className="py-3.5 px-4">Sınıf</th>
                  <th className="py-3.5 px-4">Sınav Başarısı</th>
                  <th className="py-3.5 px-4">Tamamlanan Görev</th>
                  <th className="py-3.5 px-4">İlerleme Oranı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {studentStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 text-xs font-semibold">
                      Kayıtlı öğrenci bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  studentStats.map((student, idx) => {
                    const pct = student.progressPct;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">{student.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">
                            {student.gradeName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black">
                          <span className={student.avgScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : (student.avgScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
                            %{student.avgScore}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                          {student.completedTasks} / {student.totalTasks}
                        </td>
                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">%{pct}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {studentStats.map((student, i) => {
              const pct = student.progressPct;
              const avatarColors = ['bg-indigo-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-purple-500','bg-rose-500'];
              const av = avatarColors[i % avatarColors.length];

              return (
                <div key={student.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${av} text-white font-black flex items-center justify-center text-xs shrink-0`}>
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{student.name}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{student.gradeName}</span>
                      </div>
                    </div>
                    <span className={`font-black text-xs px-2 py-0.5 rounded-lg ${student.avgScore >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      %{student.avgScore} Ort
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Görev: {student.completedTasks}/{student.totalTasks}</span>
                      <span>%{pct}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </section>

      </main>

    </div>
  );
}
