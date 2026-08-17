import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, BookOpen, Target, BrainCircuit, Activity, BarChart3, 
  PieChart as PieChartIcon, Sparkles, Trophy, GraduationCap, 
  CheckCircle2, ArrowLeft, TrendingUp, Award, Search, Filter, 
  ChevronRight, Calendar, ArrowUpRight, Flame, ShieldAlert, Check
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCurriculum } from '../context/CurriculumContext';
import './StatisticsDashboard.css';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
];
const avatarBg = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

function Avatar({ name, index, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(index ?? 0),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.38,
      flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      border: '1.5px solid rgba(255,255,255,0.2)'
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

function StatHeroCard({ label, value, sub, icon: Icon, color, bg, border }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
      border: `1.5px solid ${border || 'rgba(255,255,255,0.14)'}`,
      borderRadius: '1.25rem',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '0.85rem',
        background: bg || 'rgba(99, 102, 241, 0.15)',
        color: color || '#818cf8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={24} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: '0.72rem', color: color || 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{sub}</span>}
      </div>
    </div>
  );
}

export default function StatisticsDashboard() {
  const navigate = useNavigate();
  const { users } = useUser() || { users: [] };
  const auth = useAuth() || {};
  const currentUser = auth.currentUser;
  const { submissions: allSubmissions } = useEvaluation() || { submissions: [] };
  const { homeworks: allHomeworks } = useHomework() || { homeworks: [] };
  const { studyAssignments: allStudyAssignments } = useStudyPlan() || { studyAssignments: [] };
  const curriculumContext = useCurriculum() || {};
  const curriculumData = curriculumContext.data || { grades: [], subjects: [] };
  
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [studentSearchQ, setStudentSearchQ] = useState('');

  const isTeacher = currentUser?.role === 'teacher';
  const teacherId = currentUser?.id;

  // Filter students based on teacher/admin role
  const allTeacherStudents = useMemo(() => {
    const all = (users || []).filter(u => u && u.role === 'student');
    if (!isTeacher || !teacherId) return all;
    return all.filter(u => u.teacherId === teacherId || !u.teacherId);
  }, [users, isTeacher, teacherId]);

  // Filter students based on grade selection
  const filteredStudents = useMemo(() => {
    if (selectedGradeFilter === 'ALL') return allTeacherStudents;
    return allTeacherStudents.filter(s => {
      const g = curriculumData.grades.find(gr => String(gr.id) === String(s.gradeId) || gr.name === s.gradeId || gr.name === s.grade || gr.name === s.className);
      return String(s.gradeId) === String(selectedGradeFilter) || (g && String(g.id) === String(selectedGradeFilter));
    });
  }, [allTeacherStudents, selectedGradeFilter, curriculumData]);

  const studentIdsSet = useMemo(() => new Set(filteredStudents.map(s => String(s.id))), [filteredStudents]);

  const homeworks = useMemo(() => {
    const all = allHomeworks || [];
    if (!isTeacher || !teacherId) return all;
    return all.filter(h => h.createdBy === teacherId || h.teacherId === teacherId || h.assignedBy === teacherId);
  }, [allHomeworks, isTeacher, teacherId]);

  const studyAssignments = useMemo(() => {
    const all = allStudyAssignments || [];
    return all.filter(a => studentIdsSet.has(String(a.studentId)));
  }, [allStudyAssignments, studentIdsSet]);

  const submissions = useMemo(() => {
    const all = allSubmissions || [];
    return all.filter(s => s && s.studentId && studentIdsSet.has(String(s.studentId)));
  }, [allSubmissions, studentIdsSet]);

  // --- KPI Calculations ---
  const totalStudents = filteredStudents.length;
  const totalHomeworksAssigned = homeworks.length;
  
  const validSubmissions = useMemo(() => submissions.filter(s => s && s.score !== undefined && s.score !== null && !isNaN(Number(s.score))), [submissions]);
  const avgScore = validSubmissions.length > 0 
    ? Math.round(validSubmissions.reduce((acc, sub) => acc + Number(sub.score), 0) / validSubmissions.length)
    : 0;

  const totalStudyAssignments = studyAssignments.length;
  const completedStudyAssignments = studyAssignments.filter(a => a.status === 'completed' || a.completed === true).length;
  const taskCompletionRate = totalStudyAssignments > 0 ? Math.round((completedStudyAssignments / totalStudyAssignments) * 100) : 0;

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

    const list = Object.values(grouped).map(item => ({
      date: item.date,
      'Ortalama Skor': Math.round(item.totalScore / item.count)
    }));

    if (list.length === 0) {
      return [
        { date: '1 Hafta Önce', 'Ortalama Skor': 65 },
        { date: 'Dün', 'Ortalama Skor': 72 },
        { date: 'Bugün', 'Ortalama Skor': avgScore || 75 }
      ];
    }
    return list;
  }, [submissions, avgScore]);

  // --- Chart 2: Assignments by Subject (Bar Chart) ---
  const finalSubjectData = useMemo(() => {
    const grouped = {};
    (studyAssignments || []).forEach(a => {
      const s = a.subject || 'Diğer';
      if (!grouped[s]) {
        grouped[s] = { subject: s, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[s].Atanan += 1;
      if (a.status === 'completed' || a.completed === true) {
        grouped[s].Tamamlanan += 1;
      }
    });

    const result = Object.values(grouped);
    if (result.length === 0) {
      return [
        { subject: 'Matematik', Atanan: 12, Tamamlanan: 9 },
        { subject: 'Fen Bilimleri', Atanan: 10, Tamamlanan: 8 },
        { subject: 'Türkçe', Atanan: 8, Tamamlanan: 7 },
        { subject: 'Sosyal Bilgiler', Atanan: 6, Tamamlanan: 5 },
        { subject: 'İngilizce', Atanan: 5, Tamamlanan: 4 },
      ];
    }
    return result;
  }, [studyAssignments]);

  // --- Chart 2.5: Assignments by Topic (Bar Chart) ---
  const finalTopicData = useMemo(() => {
    const grouped = {};
    (studyAssignments || []).forEach(a => {
      const t = a.topic || 'Belirtilmemiş';
      const label = t.length > 14 ? t.substring(0, 14) + '...' : t;
      if (!grouped[t]) {
        grouped[t] = { topic: label, fullTopic: t, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[t].Atanan += 1;
      if (a.status === 'completed' || a.completed === true) {
        grouped[t].Tamamlanan += 1;
      }
    });
    const res = Object.values(grouped).sort((a, b) => b.Atanan - a.Atanan).slice(0, 7);
    if (res.length === 0) {
      return [
        { topic: 'Çarpanlar & Katlar', fullTopic: 'Çarpanlar ve Katlar', Atanan: 8, Tamamlanan: 6 },
        { topic: 'Üslü İfadeler', fullTopic: 'Üslü İfadeler', Atanan: 7, Tamamlanan: 5 },
        { topic: 'Kareköklü Sayılar', fullTopic: 'Kareköklü Sayılar', Atanan: 6, Tamamlanan: 4 },
        { topic: 'Mevsimler & İklim', fullTopic: 'Mevsimler ve İklim', Atanan: 5, Tamamlanan: 4 },
        { topic: 'Sözcükte Anlam', fullTopic: 'Sözcükte Anlam', Atanan: 4, Tamamlanan: 4 },
      ];
    }
    return res;
  }, [studyAssignments]);

  // --- Chart 3: Study Plan Status (Donut Chart) ---
  const statusData = useMemo(() => {
    const completed = (studyAssignments || []).filter(a => a.status === 'completed' || a.completed === true).length;
    const pending = (studyAssignments || []).filter(a => a.status !== 'completed' && !a.completed).length;
    if (completed === 0 && pending === 0) {
      return [
        { name: 'Tamamlandı', value: 7 },
        { name: 'Bekliyor', value: 3 }
      ];
    }
    return [
      { name: 'Tamamlandı', value: completed },
      { name: 'Bekliyor', value: pending }
    ];
  }, [studyAssignments]);

  const PIE_COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#38bdf8'];

  // --- Student Leaderboard and Stats Table ---
  const studentStats = useMemo(() => {
    const gradesList = curriculumData?.grades || [];

    const list = filteredStudents.map((student, idx) => {
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
      
      let gradeName = '';
      const matched = gradesList.find(g => 
        String(g.id) === String(student.gradeId) || 
        String(g.id) === String(student.classId) || 
        g.name === student.gradeId || 
        g.name === student.grade || 
        g.name === student.className
      );

      if (matched) {
        gradeName = matched.name;
      } else {
        gradeName = student.grade || student.className || 'Sınıfsız';
      }

      return {
        id: student.id,
        name: student.name || 'İsimsiz Öğrenci',
        gradeName: gradeName || 'Sınıfsız',
        avgScore: studentAvgScore,
        solvedCount: studentSubmissions.length,
        completedTasks,
        totalTasks,
        progressPct: isNaN(progressPct) ? 0 : progressPct,
        idx
      };
    });

    return list.sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredStudents, submissions, studyAssignments, curriculumData]);

  const searchedStudentStats = useMemo(() => {
    if (!studentSearchQ) return studentStats;
    return studentStats.filter(s => s.name.toLowerCase().includes(studentSearchQ.toLowerCase()) || s.gradeName.toLowerCase().includes(studentSearchQ.toLowerCase()));
  }, [studentStats, studentSearchQ]);

  // Top 3 Podium
  const topPodium = useMemo(() => {
    return studentStats.slice(0, 3);
  }, [studentStats]);

  return (
    <div className="stats-dashboard-page">
      
      {/* ══════════ STICKY TOP CONTROL HEADER ══════════ */}
      <header className="stats-glass-card" style={{
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: '0.75rem',
              padding: '0.55rem 0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(165,180,252,0.35)', color: '#c7d2fe', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              <Sparkles size={13} /> LMS Akıllı Analitik & Performans Masası
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
              Gelişmiş İstatistikler & Başarı Analizi 📊
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
              Öğrenci gelişim eğrileri, soru çözüm grafikleri, ders tamamlama oranları ve sınıf karne dökümü.
            </p>
          </div>
        </div>

        {/* GRADE FILTER PILLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginRight: 4 }}>
            Sınıf Filtresi:
          </span>
          <button
            onClick={() => setSelectedGradeFilter('ALL')}
            style={{
              padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
              border: selectedGradeFilter === 'ALL' ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.1)',
              background: selectedGradeFilter === 'ALL' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
              color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: selectedGradeFilter === 'ALL' ? '0 4px 14px rgba(99,102,241,0.4)' : 'none'
            }}
          >
            Tüm Sınıflar
          </button>
          {curriculumData.grades.map(g => {
            const isSel = selectedGradeFilter === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGradeFilter(g.id)}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
                  border: isSel ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.1)',
                  background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
                  color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: isSel ? '0 4px 14px rgba(99,102,241,0.4)' : 'none'
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* ══════════ 5 LIVE KPI METRIC CARDS ══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <StatHeroCard 
          icon={Users} 
          label="Toplam Öğrenci" 
          value={`${totalStudents} Öğrenci`} 
          sub="Aktif analiz havuzu" 
          color="#38bdf8" 
          bg="rgba(56, 189, 248, 0.15)" 
          border="rgba(56, 189, 248, 0.35)" 
        />
        <StatHeroCard 
          icon={BookOpen} 
          label="Atanan Sınav / Ödev" 
          value={`${totalHomeworksAssigned} Ödev`} 
          sub="Sınıf & bireysel görev" 
          color="#fbbf24" 
          bg="rgba(251, 191, 36, 0.15)" 
          border="rgba(251, 191, 36, 0.35)" 
        />
        <StatHeroCard 
          icon={Trophy} 
          label="Genel Sınav Başarısı" 
          value={`%${avgScore}`} 
          sub={avgScore >= 70 ? '🔥 Yüksek Performans' : avgScore >= 50 ? '⚡ Orta Seviye' : '⚠️ Destek Gerekli'} 
          color={avgScore >= 70 ? '#34d399' : avgScore >= 50 ? '#fbbf24' : '#f87171'} 
          bg={avgScore >= 70 ? 'rgba(52, 211, 153, 0.15)' : avgScore >= 50 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)'} 
          border={avgScore >= 70 ? 'rgba(52, 211, 153, 0.35)' : avgScore >= 50 ? 'rgba(251, 191, 36, 0.35)' : 'rgba(239, 68, 68, 0.35)'} 
        />
        <StatHeroCard 
          icon={BrainCircuit} 
          label="Konu & Görev Durumu" 
          value={`${completedStudyAssignments} / ${totalStudyAssignments}`} 
          sub={`%${taskCompletionRate} Tamamlanma`} 
          color="#c084fc" 
          bg="rgba(192, 132, 252, 0.15)" 
          border="rgba(192, 132, 252, 0.35)" 
        />
        <StatHeroCard 
          icon={Activity} 
          label="Çözülen Sınav Kağıdı" 
          value={`${submissions.length} Kağıt`} 
          sub="Değerlendirilen sınav" 
          color="#f472b6" 
          bg="rgba(244, 114, 182, 0.15)" 
          border="rgba(244, 114, 182, 0.35)" 
        />
      </div>

      {/* ══════════ TOP 3 LEADERBOARD PODIUM ══════════ */}
      {topPodium.length > 0 && (
        <div className="stats-glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} color="#fbbf24" /> En Başarılı Öğrenciler Kürsüsü (Top 3)
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
              Sınav ortalamasına göre sıralanmıştır
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {topPodium.map((std, rank) => {
              const medals = [
                { title: '1. Birincilik', icon: '🥇', grad: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))', border: 'rgba(251, 191, 36, 0.4)', text: '#fbbf24' },
                { title: '2. İkincilik', icon: '🥈', grad: 'linear-gradient(135deg, rgba(148, 163, 184, 0.25), rgba(100, 116, 139, 0.15))', border: 'rgba(203, 213, 225, 0.4)', text: '#cbd5e1' },
                { title: '3. Üçüncülük', icon: '🥉', grad: 'linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(234, 88, 12, 0.15))', border: 'rgba(251, 146, 60, 0.4)', text: '#fb923c' },
              ];
              const m = medals[rank];
              return (
                <div key={std.id} style={{
                  background: m.grad,
                  border: `1.5px solid ${m.border}`,
                  borderRadius: '1.15rem', padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
                }}>
                  <div style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{m.icon}</div>
                  <Avatar name={std.name} index={std.idx} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: m.text, textTransform: 'uppercase' }}>{m.title}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>· {std.gradeName}</span>
                    </div>
                    <h4 style={{ margin: '2px 0 0', fontSize: '0.92rem', fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {std.name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#34d399' }}>
                      %{std.avgScore} Başarı · {std.solvedCount} Sınav
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ CHARTS GRID 1: AREA & DONUT ══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Main Area Chart */}
        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#818cf8" /> Genel Başarı İvmesi (Zaman Bazlı Trend)
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#818cf8', background: 'rgba(99,102,241,0.2)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
              Zaman Eğrisi
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={successOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    backdropFilter: 'blur(12px)',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#818cf8', fontWeight: 800 }}
                  labelStyle={{ color: '#c7d2fe', fontWeight: 900 }}
                />
                <Area type="monotone" dataKey="Ortalama Skor" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut Chart */}
        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', minHeight: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChartIcon size={18} color="#fbbf24" /> Konu & Görev Tamamlama Durumu
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399' }}>
              %{taskCompletionRate} Başarı
            </span>
          </div>

          <div style={{ height: 240, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    backdropFilter: 'blur(12px)',
                    fontSize: '12px'
                  }}
                  itemStyle={{ fontWeight: 800 }}
                  labelStyle={{ fontWeight: 900, color: '#c7d2fe' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ══════════ CHARTS GRID 2: SUBJECT & TOPIC BARS ══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Subject Bar Chart */}
        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="#f472b6" /> Ders Bazlı Görevler & Tamamlama
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
              Ders Dağılımı
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalSubjectData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    backdropFilter: 'blur(12px)',
                    fontSize: '12px'
                  }}
                  itemStyle={{ fontWeight: 800 }}
                  labelStyle={{ fontWeight: 900, color: '#c7d2fe' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="Atanan" fill="rgba(255,255,255,0.25)" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="Tamamlanan" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Bar Chart */}
        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} color="#38bdf8" /> Konu Bazlı Görev Yoğunluğu
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
              Top 7 Konu
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalTopicData} margin={{ top: 20, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)', fontWeight: 600, angle: -25, textAnchor: 'end' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    backdropFilter: 'blur(12px)',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value, payload) => payload?.[0]?.payload?.fullTopic || value}
                  itemStyle={{ fontWeight: 800 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="Atanan" fill="rgba(255,255,255,0.25)" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Tamamlanan" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ══════════ STUDENT PERFORMANCE TABLE & CARDS ══════════ */}
      <section className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="#34d399" /> Öğrenci Bazlı İstatistik ve Durum Tablosu
            <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.35)' }}>
              {searchedStudentStats.length} Öğrenci
            </span>
          </h3>

          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={15} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Öğrenci veya sınıf ara..."
              value={studentSearchQ}
              onChange={e => setStudentSearchQ(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci Adı</th>
                <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Sınav Başarısı</th>
                <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Tamamlanan Görev</th>
                <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>İlerleme Oranı</th>
                <th style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {searchedStudentStats.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontWeight: 700 }}>
                    Kayıtlı veya aramayla eşleşen öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                searchedStudentStats.map((student, idx) => {
                  const pct = student.progressPct;
                  const isHigh = student.avgScore >= 70;
                  const isMid = student.avgScore >= 50;
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Avatar name={student.name} index={student.idx} size={34} />
                          <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>{student.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 800, fontSize: '0.72rem' }}>
                          {student.gradeName}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem', borderRadius: '0.5rem',
                          background: isHigh ? 'rgba(5, 150, 105, 0.25)' : isMid ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isHigh ? '#34d399' : isMid ? '#fbbf24' : '#f87171',
                          border: `1px solid ${isHigh ? 'rgba(52, 211, 153, 0.4)' : isMid ? 'rgba(251, 191, 36, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          fontWeight: 900, fontSize: '0.82rem'
                        }}>
                          %{student.avgScore}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>
                        {student.completedTasks} / {student.totalTasks}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', minWidth: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 99, width: `${pct}%`,
                              background: pct >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
                                : pct >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                                : 'linear-gradient(90deg,#f43f5e,#e11d48)',
                              transition: 'width 0.6s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)', minWidth: 32 }}>%{pct}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
                          <button style={{
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(165, 180, 252, 0.35)',
                            borderRadius: '0.6rem', padding: '0.35rem 0.75rem',
                            cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                            color: '#c7d2fe', display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            Koçluk <ArrowUpRight size={13} />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
