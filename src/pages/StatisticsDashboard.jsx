import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, BookOpen, Target, BrainCircuit, Activity, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCurriculum } from '../context/CurriculumContext';
import './StatisticsDashboard.css';

export default function StatisticsDashboard() {
  const { users } = useUser();
  const { submissions } = useEvaluation();
  const { homeworks } = useHomework();
  const { studyAssignments } = useStudyPlan();
  const { data: curriculumData } = useCurriculum();
  
  const students = users.filter(u => u.role === 'student');

  // --- KPI Calculations ---
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalHomeworksAssigned = homeworks.length;
  
  const avgScore = submissions.length > 0 
    ? Math.round(submissions.reduce((acc, sub) => acc + sub.score, 0) / submissions.length)
    : 0;

  const totalStudyAssignments = studyAssignments.length;
  const completedStudyAssignments = studyAssignments.filter(a => a.status === 'completed').length;

  // --- Chart 1: Success Over Time (Area Chart) ---
  // Group submissions by Date and calculate average score
  const successOverTimeData = useMemo(() => {
    const grouped = {};
    submissions.forEach(sub => {
      const dateStr = new Date(sub.submittedAt).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
      if (!grouped[dateStr]) grouped[dateStr] = { date: dateStr, totalScore: 0, count: 0 };
      grouped[dateStr].totalScore += sub.score;
      grouped[dateStr].count += 1;
    });

    return Object.values(grouped)
      .map(item => ({
        date: item.date,
        'Ortalama Skor': Math.round(item.totalScore / item.count)
      }))
      // In a real app, you'd sort by actual date. Here we assume sequential for demo.
      .sort((a,b) => 1); 
  }, [submissions]);

  const finalSuccessData = successOverTimeData;

  // --- Chart 2: Assignments by Subject (Bar Chart) ---
  const finalSubjectData = useMemo(() => {
    const grouped = {};
    studyAssignments.forEach(a => {
      if (!grouped[a.subject]) {
        grouped[a.subject] = { subject: a.subject, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[a.subject].Atanan += 1;
      if (a.status === 'completed') {
        grouped[a.subject].Tamamlanan += 1;
      }
    });
    return Object.values(grouped);
  }, [studyAssignments]);

  // --- Chart 2.5: Assignments by Topic (Bar Chart) ---
  const finalTopicData = useMemo(() => {
    const grouped = {};
    studyAssignments.forEach(a => {
      const label = a.topic.length > 15 ? a.topic.substring(0, 15) + '...' : a.topic;
      if (!grouped[a.topic]) {
        grouped[a.topic] = { topic: label, fullTopic: a.topic, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[a.topic].Atanan += 1;
      if (a.status === 'completed') {
        grouped[a.topic].Tamamlanan += 1;
      }
    });
    return Object.values(grouped).sort((a, b) => b.Atanan - a.Atanan).slice(0, 10);
  }, [studyAssignments]);

  // --- Chart 3: Study Plan Status (Pie Chart) ---
  const statusData = useMemo(() => {
    const completed = studyAssignments.filter(a => a.status === 'completed').length;
    const pending = studyAssignments.filter(a => a.status !== 'completed').length;
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
    return students.map(student => {
      const studentSubmissions = submissions.filter(s => s.studentId === student.id);
      const studentAvgScore = studentSubmissions.length > 0 
        ? Math.round(studentSubmissions.reduce((acc, sub) => acc + sub.score, 0) / studentSubmissions.length)
        : 0;
      
      const studentAssignments = studyAssignments.filter(a => a.studentId === student.id);
      const studentCompletedAssignments = studentAssignments.filter(a => a.status === 'completed').length;
      
      const grade = curriculumData?.grades?.find(g => g.id === student.gradeId);
      const gradeName = grade ? grade.name : 'Sınıfsız';

      return {
        id: student.id,
        name: student.name,
        gradeName,
        avgScore: studentAvgScore,
        completedTasks: studentCompletedAssignments,
        totalTasks: studentAssignments.length,
      };
    });
  }, [students, submissions, studyAssignments, curriculumData]);

  return (
    <div className="container stats-dashboard">
      <div className="stats-header">
        <h1>Gelişmiş İstatistikler ve Analiz</h1>
        <p>Sistemdeki ödevler, sınavlar ve planlar bazında genel durumu inceleyin.</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass">
          <div className="kpi-icon-wrapper" style={{ background: '#fdf2f8', color: '#db2777' }}>
            <Users size={28} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{totalStudents}</span>
            <span className="kpi-label">Toplam Öğrenci</span>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <BookOpen size={28} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{totalHomeworksAssigned}</span>
            <span className="kpi-label">Atanan Sınav/Ödev</span>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon-wrapper" style={{ background: '#f0fdf4', color: '#10b981' }}>
            <Target size={28} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">%{avgScore}</span>
            <span className="kpi-label">Sınav Başarı Ortalaması</span>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
            <BrainCircuit size={28} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{completedStudyAssignments} / {totalStudyAssignments}</span>
            <span className="kpi-label">Tamamlanan Konu Görevi</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        
        {/* Main Chart (Area) */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><Activity size={20} color="#7c3aed" /> Genel Başarı İvmesi (Zamanlı)</h3>
          </div>
          <div className="chart-container" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={finalSuccessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="Ortalama Skor" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><PieChartIcon size={20} color="#f59e0b" /> Konu Görev Durumu</h3>
          </div>
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={finalStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {finalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* Subject Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><BarChart3 size={20} color="#ec4899" /> Ders Bazlı Görevler</h3>
          </div>
          <div className="chart-container" style={{ minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={finalSubjectData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px' }} />
                <Bar dataKey="Atanan" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="Tamamlanan" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><Target size={20} color="#3b82f6" /> Konu Bazlı Görevler (En Çok Atananlar)</h3>
          </div>
          <div className="chart-container" style={{ minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={finalTopicData} margin={{ top: 20, right: 30, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500, angle: -45, textAnchor: 'end' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  labelFormatter={(value, payload) => payload?.[0]?.payload?.fullTopic || value}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px' }} />
                <Bar dataKey="Atanan" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="Tamamlanan" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Student Stats Table */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr', marginTop: '1.5rem' }}>
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title"><Users size={20} color="#10b981" /> Sınıf ve Öğrenci Bazlı Durum Tablosu</h3>
          </div>
          <div className="stats-table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Öğrenci Adı</th>
                  <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sınıf</th>
                  <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sınav Başarısı</th>
                  <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Tamamlanan Görev</th>
                  <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Görev Durumu</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Kayıtlı öğrenci bulunmuyor.</td>
                  </tr>
                ) : (
                  studentStats.map((student, idx) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{student.name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                          {student.gradeName}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: student.avgScore >= 70 ? '#10b981' : (student.avgScore >= 50 ? '#f59e0b' : '#ef4444') }}>
                            %{student.avgScore}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {student.completedTasks} / {student.totalTasks}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: student.totalTasks === 0 ? '#cbd5e1' : (student.completedTasks === student.totalTasks ? '#10b981' : '#3b82f6'), 
                              width: student.totalTasks === 0 ? '0%' : `${Math.round((student.completedTasks / student.totalTasks) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
