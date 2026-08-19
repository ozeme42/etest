import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, BookOpen, Target, BrainCircuit, Activity, BarChart3, 
  PieChart as PieChartIcon, Sparkles, Trophy, GraduationCap, 
  CheckCircle2, ArrowLeft, TrendingUp, Award, Search, Filter, 
  ChevronRight, Calendar, ArrowUpRight, Flame, ShieldAlert, Check, Eye
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCurriculum } from '../context/CurriculumContext';
import StudentResultsPage from './StudentResultsPage';
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
      background: '#ffffff',
      border: `1.5px solid ${border || '#e2e8f0'}`,
      borderRadius: '1.25rem',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '0.85rem',
        background: bg || '#eff6ff',
        color: color || '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={24} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: '0.72rem', color: color || '#64748b', fontWeight: 700 }}>{sub}</span>}
      </div>
    </div>
  );
}

export default function StatisticsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

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

  const allTeacherStudents = useMemo(() => {
    const all = (users || []).filter(u => u && u.role === 'student');
    if (!isTeacher || !teacherId) return all;
    return all.filter(u => u.teacherId === teacherId || !u.teacherId);
  }, [users, isTeacher, teacherId]);

  const [activeView, setActiveView] = useState(() => studentIdParam ? 'student' : 'overview'); // 'overview' | 'student'
  const [selectedStudentId, setSelectedStudentId] = useState(() => studentIdParam || (allTeacherStudents[0]?.id || null));

  useEffect(() => {
    if (studentIdParam) {
      setSelectedStudentId(studentIdParam);
      setActiveView('student');
    }
  }, [studentIdParam]);

  const handleSelectStudentForResults = (stdId) => {
    setSelectedStudentId(stdId);
    setActiveView('student');
    setSearchParams({ studentId: stdId });
  };

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

  const totalStudents = filteredStudents.length;
  const totalHomeworksAssigned = homeworks.length;
  
  const validSubmissions = useMemo(() => submissions.filter(s => s && s.score !== undefined && s.score !== null && !isNaN(Number(s.score))), [submissions]);
  const avgScore = validSubmissions.length > 0 
    ? Math.round(validSubmissions.reduce((acc, sub) => acc + Number(sub.score), 0) / validSubmissions.length)
    : 0;

  const totalStudyAssignments = studyAssignments.length;
  const completedStudyAssignments = studyAssignments.filter(a => a.status === 'completed' || a.completed === true).length;
  const taskCompletionRate = totalStudyAssignments > 0 ? Math.round((completedStudyAssignments / totalStudyAssignments) * 100) : 0;

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

  const finalTopicData = useMemo(() => {
    const grouped = {};
    (studyAssignments || []).forEach(a => {
      const t = a.topic || a.topicName || a.title || 'Diğer';
      if (!grouped[t]) {
        grouped[t] = { topic: t.length > 14 ? t.slice(0, 12) + '...' : t, fullTopic: t, Atanan: 0, Tamamlanan: 0 };
      }
      grouped[t].Atanan += 1;
      if (a.status === 'completed' || a.completed === true) {
        grouped[t].Tamamlanan += 1;
      }
    });

    const result = Object.values(grouped).sort((a, b) => b.Atanan - a.Atanan).slice(0, 7);
    if (result.length === 0) {
      return [
        { topic: 'Çarpanlar', fullTopic: 'Çarpanlar ve Katlar', Atanan: 8, Tamamlanan: 6 },
        { topic: 'Üslü İfadeler', fullTopic: 'Üslü İfadeler', Atanan: 7, Tamamlanan: 5 },
        { topic: 'Karaköklü', fullTopic: 'Karaköklü İfadeler', Atanan: 6, Tamamlanan: 4 },
        { topic: 'Mevsimler', fullTopic: 'Mevsimler ve İklim', Atanan: 5, Tamamlanan: 4 },
        { topic: 'DNA & Gen', fullTopic: 'DNA ve Genetik Kod', Atanan: 4, Tamamlanan: 3 },
      ];
    }
    return result;
  }, [studyAssignments]);

  const statusData = useMemo(() => {
    const completed = completedStudyAssignments;
    const pending = totalStudyAssignments - completed;
    if (totalStudyAssignments === 0) {
      return [
        { name: 'Tamamlandı', value: 14 },
        { name: 'Bekliyor / Devam', value: 6 }
      ];
    }
    return [
      { name: 'Tamamlandı', value: completed },
      { name: 'Bekliyor / Devam', value: Math.max(0, pending) }
    ];
  }, [completedStudyAssignments, totalStudyAssignments]);

  const PIE_COLORS = ['#10b981', '#6366f1'];

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

  const topPodium = useMemo(() => {
    return studentStats.slice(0, 3);
  }, [studentStats]);

  if (activeView === 'student' && selectedStudentId) {
    return (
      <div className="stats-dashboard-page" style={{ padding: '1rem', maxWidth: 1400, margin: '0 auto' }}>
        <StudentResultsPage
          studentId={selectedStudentId}
          embedded={true}
          onBack={() => {
            setActiveView('overview');
            setSearchParams({});
          }}
        />
      </div>
    );
  }

  return (
    <div className="stats-dashboard-page">
      
      <header className="stats-glass-card" style={{
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '0.75rem',
              padding: '0.55rem 0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              color: '#334155',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              <Sparkles size={13} /> LMS Akıllı Analitik & Performans Masası
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              Gelişmiş İstatistikler & Başarı Analizi 📊
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Genel sınıf gelişim eğrileri, soru çözüm grafikleri ve öğrenci bazlı karne sonuçları.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Hızlı Öğrenci Sonuçları Seçici */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              value=""
              onChange={e => {
                if (e.target.value) handleSelectStudentForResults(e.target.value);
              }}
              style={{
                padding: '0.48rem 1.6rem 0.48rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1.5px solid #6366f1',
                background: '#f5f3ff',
                color: '#4f46e5',
                fontSize: '0.78rem',
                fontWeight: 900,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 10px rgba(99,102,241,0.12)'
              }}
            >
              <option value="">👤 Öğrenci Seç & Sonuçları Gör...</option>
              {allTeacherStudents.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} {st.className ? `(${st.className})` : st.grade ? `(${st.grade})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', borderLeft: '1.5px solid #e2e8f0', paddingLeft: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
              Sınıf:
            </span>
            <button
              onClick={() => setSelectedGradeFilter('ALL')}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '0.65rem',
                border: selectedGradeFilter === 'ALL' ? '1.5px solid #818cf8' : '1.5px solid #cbd5e1',
                background: selectedGradeFilter === 'ALL' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#ffffff',
                color: selectedGradeFilter === 'ALL' ? '#ffffff' : '#475569', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                boxShadow: selectedGradeFilter === 'ALL' ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
              }}
            >
              Tümü
            </button>
            {curriculumData.grades.map(g => {
              const isSel = selectedGradeFilter === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGradeFilter(g.id)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '0.65rem',
                    border: isSel ? '1.5px solid #818cf8' : '1.5px solid #cbd5e1',
                    background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#ffffff',
                    color: isSel ? '#ffffff' : '#475569', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: isSel ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <StatHeroCard 
          icon={Users} 
          label="Toplam Öğrenci" 
          value={`${totalStudents} Öğrenci`} 
          sub="Aktif analiz havuzu" 
          color="#0284c7" 
          bg="#f0f9ff" 
          border="#bae6fd" 
        />
        <StatHeroCard 
          icon={BookOpen} 
          label="Atanan Sınav / Ödev" 
          value={`${totalHomeworksAssigned} Ödev`} 
          sub="Sınıf & bireysel görev" 
          color="#d97706" 
          bg="#fffbeb" 
          border="#fde68a" 
        />
        <StatHeroCard 
          icon={Trophy} 
          label="Genel Sınav Başarısı" 
          value={`%${avgScore}`} 
          sub={avgScore >= 70 ? '🔥 Yüksek Performans' : avgScore >= 50 ? '⚡ Orta Seviye' : '⚠️ Destek Gerekli'} 
          color={avgScore >= 70 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#dc2626'} 
          bg={avgScore >= 70 ? '#f0fdf4' : avgScore >= 50 ? '#fffbeb' : '#fef2f2'} 
          border={avgScore >= 70 ? '#bbf7d0' : avgScore >= 50 ? '#fde68a' : '#fecaca'} 
        />
        <StatHeroCard 
          icon={BrainCircuit} 
          label="Konu & Görev Durumu" 
          value={`${completedStudyAssignments} / ${totalStudyAssignments}`} 
          sub={`%${taskCompletionRate} Tamamlanma`} 
          color="#7c3aed" 
          bg="#faf5ff" 
          border="#e9d5ff" 
        />
        <StatHeroCard 
          icon={Activity} 
          label="Çözülen Sınav Kağıdı" 
          value={`${submissions.length} Kağıt`} 
          sub="Değerlendirilen sınav" 
          color="#db2777" 
          bg="#fdf2f8" 
          border="#fbcfe8" 
        />
      </div>

      {topPodium.length > 0 && (
        <div className="stats-glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} color="#d97706" /> En Başarılı Öğrenciler Kürsüsü (Top 3)
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              Sınav ortalamasına göre sıralanmıştır
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {topPodium.map((std, rank) => {
              const medals = [
                { title: '1. Birincilik', icon: '🥇', grad: '#fffbeb', border: '#fde68a', text: '#b45309' },
                { title: '2. İkincilik', icon: '🥈', grad: '#f8fafc', border: '#cbd5e1', text: '#475569' },
                { title: '3. Üçüncülük', icon: '🥉', grad: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
              ];
              const m = medals[rank];
              return (
                <div
                  key={std.id}
                  onClick={() => handleSelectStudentForResults(std.id)}
                  style={{
                    background: m.grad,
                    border: `1.5px solid ${m.border}`,
                    borderRadius: '1.15rem', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={`${std.name} öğrencisinin tüm karne ve istatistik sonuçlarını incele`}
                >
                  <div style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{m.icon}</div>
                  <Avatar name={std.name} index={std.idx} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: m.text, textTransform: 'uppercase' }}>{m.title}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>· {std.gradeName}</span>
                    </div>
                    <h4 style={{ margin: '2px 0 0', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {std.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#16a34a' }}>
                        %{std.avgScore} Başarı · {std.solvedCount} Sınav
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        Sonuçları Gör <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#6366f1" /> Genel Başarı İvmesi (Zaman Bazlı Trend)
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
              Zaman Eğrisi
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={successOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    color: '#0f172a',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#6366f1', fontWeight: 800 }}
                  labelStyle={{ color: '#0f172a', fontWeight: 900 }}
                />
                <Area type="monotone" dataKey="Ortalama Skor" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', minHeight: 360, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChartIcon size={18} color="#d97706" /> Konu & Görev Tamamlama Durumu
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a' }}>
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
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    color: '#0f172a',
                    fontSize: '12px'
                  }}
                  itemStyle={{ fontWeight: 800 }}
                  labelStyle={{ fontWeight: 900, color: '#0f172a' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#0f172a' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="#db2777" /> Ders Bazlı Görevler & Tamamlama
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              Ders Dağılımı
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalSubjectData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    color: '#0f172a',
                    fontSize: '12px'
                  }}
                  itemStyle={{ fontWeight: 800 }}
                  labelStyle={{ fontWeight: 900, color: '#0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: '#0f172a' }} />
                <Bar dataKey="Atanan" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="Tamamlanan" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 360, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} color="#0284c7" /> Konu Bazlı Görev Yoğunluğu
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              Top 7 Konu
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalTopicData} margin={{ top: 20, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600, angle: -25, textAnchor: 'end' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    color: '#0f172a',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value, payload) => payload?.[0]?.payload?.fullTopic || value}
                  itemStyle={{ fontWeight: 800 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: '#0f172a' }} />
                <Bar dataKey="Atanan" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Tamamlanan" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <section className="stats-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="#16a34a" /> Öğrenci Bazlı İstatistik ve Durum Tablosu
            <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              {searchedStudentStats.length} Öğrenci
            </span>
          </h3>

          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Öğrenci veya sınıf ara..."
              value={studentSearchQ}
              onChange={e => setStudentSearchQ(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci Adı</th>
                <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Sınav Başarısı</th>
                <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Tamamlanan Görev</th>
                <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>İlerleme Oranı</th>
                <th style={{ padding: '0.85rem 1rem', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {searchedStudentStats.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
                    Kayıtlı veya aramayla eşleşen öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                searchedStudentStats.map((student, idx) => {
                  const pct = student.progressPct;
                  const isHigh = student.avgScore >= 70;
                  const isMid = student.avgScore >= 50;
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div
                          onClick={() => handleSelectStudentForResults(student.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                          title="Öğrencinin tüm sonuçlarını ve karne dökümünü incele"
                        >
                          <Avatar name={student.name} index={student.idx} size={34} />
                          <div>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', display: 'block' }}>{student.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#4f46e5', fontWeight: 700 }}>Sonuçları Gör ↗</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontWeight: 800, fontSize: '0.72rem' }}>
                          {student.gradeName}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem', borderRadius: '0.5rem',
                          background: isHigh ? '#f0fdf4' : isMid ? '#fffbeb' : '#fef2f2',
                          color: isHigh ? '#16a34a' : isMid ? '#d97706' : '#dc2626',
                          border: `1px solid ${isHigh ? '#bbf7d0' : isMid ? '#fde68a' : '#fecaca'}`,
                          fontWeight: 900, fontSize: '0.82rem'
                        }}>
                          %{student.avgScore}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>
                        {student.completedTasks} / {student.totalTasks}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', minWidth: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 99, width: `${pct}%`,
                              background: pct >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
                                : pct >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                                : 'linear-gradient(90deg,#f43f5e,#e11d48)',
                              transition: 'width 0.6s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', minWidth: 32 }}>%{pct}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleSelectStudentForResults(student.id)}
                            style={{
                              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                              border: 'none',
                              borderRadius: '0.6rem',
                              padding: '0.35rem 0.75rem',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                            }}
                            title="Öğrencinin tüm sınav, ödev ve karne verilerini detaylı incele"
                          >
                            <BarChart3 size={13} /> Sonuçları Gör
                          </button>
                          <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
                            <button style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '0.6rem', padding: '0.35rem 0.75rem',
                              cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem',
                              color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: 4
                            }}>
                              Koçluk <ArrowUpRight size={13} />
                            </button>
                          </Link>
                        </div>
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
