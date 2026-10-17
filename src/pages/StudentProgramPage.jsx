import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  ArrowLeft,
  Sparkles,
  Plus,
  Play,
  Layers,
  BookOpen,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  Compass,
  Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCurriculum } from '../context/CurriculumContext';
import { toUUID } from '../services/supabaseService';

import { useStudentWeeklySchedule } from '../features/dashboard/hooks/useStudentWeeklySchedule';
import DashboardWeeklyCalendar from '../features/dashboard/components/DashboardWeeklyCalendar';
import DashboardTodayTasks from '../features/dashboard/components/DashboardTodayTasks';
import AddTaskModal from '../components/program/AddTaskModal';
import CurriculumRoadmapView from '../components/roadmap/CurriculumRoadmapView';
import PrintableWeeklyDocument from '../components/program/PrintableWeeklyDocument';
import { MonthlyListPanel } from '../components/ProgramCenter';
import './StudentDashboard.css';

function getWeekDateRange() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt) => `${dt.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][dt.getMonth()]}`;
  return `${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}`;
}

export default function StudentProgramPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, users } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Student resolution
  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  const effectiveStudent = useMemo(() => {
    if (currentUser?.role === 'student') return currentUser;
    const queryStudentId = searchParams.get('studentId');
    if (queryStudentId) {
      const found = studentMembers.find(s => String(s.id) === String(queryStudentId) || toUUID(s.id) === toUUID(queryStudentId));
      if (found) return found;
    }
    const savedStudentId = localStorage.getItem('etest_selected_student_id');
    if (savedStudentId) {
      const found = studentMembers.find(s => String(s.id) === String(savedStudentId) || toUUID(s.id) === toUUID(savedStudentId));
      if (found) return found;
    }
    return studentMembers[0] || currentUser;
  }, [currentUser, searchParams, studentMembers]);

  const studentId = effectiveStudent?.id || currentUser?.id;

  // Integrated Weekly Schedule Hook
  const {
    daysOfWeek,
    weekInfo,
    todayDayKey,
    activeDayKey,
    setActiveDayKey,
    activeDayConfig,
    dayProgramInfo,
    weekTasksCountMap,
    catchUpTasks,
    handleToggleTask,
    handleTaskAction,
    handleAddScheduleTask,
    handleDeleteScheduleTask,
    getRowTheme,
    coachingProfile,
    topicPool,
    rawWeeklyProgram
  } = useStudentWeeklySchedule(studentId, effectiveStudent);

  // Contexts needed for Monthly and Roadmap panels
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { studyPlans = [], studyAssignments = [] } = useStudyPlan();
  const { curData } = useCurriculum();
  const { saveCoachingProfile, refreshCoaching } = useCoaching();

  // Tab State
  const [activeTab, setActiveTab] = useState('haftalik'); // 'haftalik' | 'aylik' | 'konular'
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [showAllDayTasks, setShowAllDayTasks] = useState(false);
  const [printMode, setPrintMode] = useState('standard'); // 'standard' | 'overdue'

  const handlePrintWeekly = useCallback((mode = 'standard') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 120);
  }, []);

  const weekRange = useMemo(() => getWeekDateRange(), []);

  // Compute Overall Weekly Progress
  const { totalWeekTasks, doneWeekTasks, weekPct } = useMemo(() => {
    let total = 0;
    let done = 0;
    (rawWeeklyProgram || []).forEach(dayRow => {
      (dayRow.items || []).forEach(it => {
        total++;
        if (it.done) done++;
      });
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { totalWeekTasks: total, doneWeekTasks: done, weekPct: pct };
  }, [rawWeeklyProgram]);

  // Selected Day Progress
  const dayItems = dayProgramInfo.items || [];
  const dayTotal = dayItems.length;
  const dayDone = dayItems.filter(i => i.done).length;
  const dayPct = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0;

  // Topic Pool Progress
  const totalTopics = useMemo(() => (topicPool || []).reduce((acc, sub) => acc + (sub.topics?.length || 0), 0), [topicPool]);
  const doneTopics = useMemo(() => (topicPool || []).reduce((acc, sub) => acc + (sub.topics?.filter(t => t.status === 'Tamamlandı')?.length || 0), 0), [topicPool]);

  // Handle Save Topic Pool for CurriculumRoadmapView
  const handleSaveTopicPool = useCallback(async (newPoolOrFn) => {
    const nextPool = typeof newPoolOrFn === 'function' ? newPoolOrFn(topicPool) : newPoolOrFn;
    await saveCoachingProfile({
      ...coachingProfile,
      studentId,
      weeklyProgram: rawWeeklyProgram,
      topicPool: nextPool
    });
    refreshCoaching?.(true);
  }, [coachingProfile, studentId, rawWeeklyProgram, topicPool, saveCoachingProfile, refreshCoaching]);

  const studentDisplayName = effectiveStudent?.name || effectiveStudent?.username || currentUser?.name || 'Öğrenci';

  if (!currentUser) return null;

  return (
    <div
      className="student-dashboard-page"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.10) 0%, transparent 45%), var(--color-bg)'
          : 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.05) 0%, transparent 45%), var(--color-bg)',
        color: 'var(--color-text)',
        padding: isMobile ? '0.75rem 0.65rem calc(80px + env(safe-area-inset-bottom))' : '1.25rem 1.25rem 100px',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .prog-anim-in {
          animation: fadeInSlide 0.22s ease-out both;
        }
        .tab-btn-pill {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-btn-pill:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* ── Top Bar Navigation ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              className="game-btn-3d"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.42rem 0.75rem' : '0.5rem 1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: isDark ? '#ffffff' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Öğrenci Paneli</span>
            </button>

            <button
              onClick={() => navigate('/study-room')}
              className="game-btn-3d"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.42rem 0.75rem' : '0.5rem 1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: '#ffffff',
                boxShadow: '0 3px 10px rgba(245,158,11,0.35)'
              }}
            >
              <Play size={13} fill="#ffffff" />
              <span>Çalışma Odası</span>
            </button>

            <button
              onClick={() => handlePrintWeekly('standard')}
              className="game-btn-3d"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.42rem 0.75rem' : '0.5rem 1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: isDark ? '#ffffff' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
              title="Haftalık Programı Yazdır / PDF İndir"
            >
              <Printer size={15} />
              <span>{isMobile ? 'Yazdır' : '🖨️ Haftalık Yazdır'}</span>
            </button>

            {currentUser?.role !== 'student' && studentMembers.length > 0 && (
              <select
                value={effectiveStudent?.id || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  localStorage.setItem('etest_selected_student_id', newId);
                  setSearchParams({ studentId: newId });
                }}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.75rem',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                  background: 'var(--color-surface, #ffffff)',
                  color: 'var(--color-text, #1e293b)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {studentMembers.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.username || s.email}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
            border: isDark ? '1px solid rgba(165, 180, 252, 0.35)' : '1px solid #c7d2fe',
            padding: '0.35rem 0.85rem',
            borderRadius: '99px',
            fontSize: '0.76rem',
            fontWeight: 800,
            color: isDark ? '#a5b4fc' : '#4338ca'
          }}>
            <Calendar size={13} />
            <span>{weekRange}</span>
          </div>
        </div>

        {/* ── Rich Hero Header Card ── */}
        <div
          className="game-card-elevated prog-anim-in"
          style={{
            background: 'var(--color-surface, #ffffff)',
            border: '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: 22,
            padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
            boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(99, 102, 241, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Title & Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                flexShrink: 0
              }}>
                {studentDisplayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h1 style={{
                    margin: 0,
                    fontSize: isMobile ? '1.15rem' : '1.45rem',
                    fontWeight: 900,
                    color: 'var(--color-text)',
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}>
                    Haftalık Ders & Çalışma Programı 📅
                  </h1>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                  }}>
                    ODAKLI MOD
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 3 }}>
                  Merhaba <strong>{studentDisplayName.split(' ')[0]}</strong> 👋 · Kişisel Çalışma Takvimi ve Hedeflerin
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => handlePrintWeekly('standard')}
                className="game-btn-3d"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                  borderRadius: 14,
                  padding: isMobile ? '0.48rem 0.85rem' : '0.55rem 1.15rem',
                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: isDark ? '#ffffff' : '#334155',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
                title="Haftalık Programı Yazdır veya PDF olarak kaydet"
              >
                <Printer size={16} />
                <span>{isMobile ? 'Yazdır' : 'Haftalık Yazdır'}</span>
              </button>

              <button
                onClick={() => setIsAddTaskModalOpen(true)}
                className="game-btn-3d game-btn-emerald"
                style={{
                  borderRadius: 14,
                  padding: isMobile ? '0.48rem 0.85rem' : '0.55rem 1.15rem',
                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={16} strokeWidth={2.8} />
                <span>Yeni Görev Ekle</span>
              </button>
            </div>
          </div>

          {/* Bento KPI Pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, minmax(0, 1fr))',
            gap: isMobile ? '0.5rem' : '0.85rem'
          }}>
            {/* 1. Haftalık İlerleme */}
            <div style={{
              background: isDark ? 'rgba(99, 102, 241, 0.1)' : '#f0f4ff',
              border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #dbeafe',
              borderRadius: 14,
              padding: isMobile ? '0.55rem 0.45rem' : '0.75rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.1rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#a5b4fc' : '#4f46e5',
                lineHeight: 1
              }}>
                %{weekPct}
              </div>
              <div style={{
                fontSize: isMobile ? '0.64rem' : '0.72rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Haftalık İlerleme
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                {doneWeekTasks} / {totalWeekTasks} Görev
              </div>
            </div>

            {/* 2. Seçili Gün Görevleri */}
            <div style={{
              background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #bbf7d0',
              borderRadius: 14,
              padding: isMobile ? '0.55rem 0.45rem' : '0.75rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.1rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#34d399' : '#059669',
                lineHeight: 1
              }}>
                %{dayPct}
              </div>
              <div style={{
                fontSize: isMobile ? '0.64rem' : '0.72rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {activeDayConfig?.name || 'Seçili Gün'}
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                {dayDone} / {dayTotal} Görev
              </div>
            </div>

            {/* 3. Konu Havuzu */}
            <div style={{
              background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
              border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid #fde68a',
              borderRadius: 14,
              padding: isMobile ? '0.55rem 0.45rem' : '0.75rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.1rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#fbbf24' : '#d97706',
                lineHeight: 1
              }}>
                {doneTopics}
              </div>
              <div style={{
                fontSize: isMobile ? '0.64rem' : '0.72rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Konu İlerleme
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                {totalTopics} Toplam Konu
              </div>
            </div>
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          padding: '0.4rem',
          borderRadius: 16,
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1.5px solid #e2e8f0',
          boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          {[
            { id: 'haftalik', label: isMobile ? 'Haftalık Odak' : '📅 Haftalık Odak Programı', icon: CalendarDays },
            { id: 'aylik', label: isMobile ? 'Aylık Takvim' : '📆 Aylık Takvim & Liste', icon: Calendar },
            { id: 'konular', label: isMobile ? 'Konu Havuzu' : '📚 Konu & Hedef Havuzu', icon: Layers }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="tab-btn-pill"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: isMobile ? '0.55rem 0.6rem' : '0.65rem 1rem',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.78rem' : '0.86rem',
                  fontFamily: "'Outfit', sans-serif",
                  background: isActive
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : (isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b'),
                  boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <Icon size={isMobile ? 14 : 16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'haftalik' && (
          <div className="prog-anim-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. 7-Günlük Bento Takvim Şeridi */}
            <DashboardWeeklyCalendar
              isMobile={isMobile}
              isDark={isDark}
              daysOfWeek={daysOfWeek}
              activeDayKey={activeDayKey}
              todayDayKey={todayDayKey}
              weekTasksCountMap={weekTasksCountMap}
              weekInfo={weekInfo}
              onSelectDay={setActiveDayKey}
              onAddTask={() => setIsAddTaskModalOpen(true)}
              onPrint={() => handlePrintWeekly('standard')}
              showProgramButton={false}
            />

            {/* 2. Seçili Günün Büyük & Renkli Görev Panosu */}
            <DashboardTodayTasks
              isMobile={isMobile}
              isDark={isDark}
              activeDayConfig={activeDayConfig}
              dayProgramInfo={dayProgramInfo}
              catchUpTasks={catchUpTasks}
              showAllDayTasks={showAllDayTasks}
              setShowAllDayTasks={setShowAllDayTasks}
              onToggleTask={handleToggleTask}
              onTaskClick={handleTaskAction}
              getRowTheme={getRowTheme}
              onAddTask={() => setIsAddTaskModalOpen(true)}
              onNavigateRemedial={() => navigate('/student/wrong-answers')}
              onNavigateBooks={() => navigate('/student/books')}
            />
          </div>
        )}

        {activeTab === 'aylik' && (
          <div className="prog-anim-in game-card-elevated" style={{
            background: 'var(--color-surface, #ffffff)',
            border: '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: 22,
            padding: isMobile ? '1rem 0.85rem' : '1.5rem',
            boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(99, 102, 241, 0.08)'
          }}>
            <MonthlyListPanel
              weeklyProgram={rawWeeklyProgram}
              allHomeworks={homeworks}
              currentUser={currentUser}
              studentId={studentId}
              submissions={submissions}
              curData={curData}
              books={books}
              bookTests={bookTests}
              studyPlans={studyPlans}
              studyAssignments={studyAssignments}
              onToggle={handleToggleTask}
              onDelete={(taskId, dayKey) => handleDeleteScheduleTask(taskId, dayKey)}
              isDark={isDark}
            />
          </div>
        )}

        {activeTab === 'konular' && (
          <div className="prog-anim-in game-card-elevated" style={{
            background: 'var(--color-surface, #ffffff)',
            border: '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: 22,
            padding: isMobile ? '1rem 0.85rem' : '1.5rem',
            boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(99, 102, 241, 0.08)'
          }}>
            <CurriculumRoadmapView
              topicPool={topicPool}
              setTopicPool={handleSaveTopicPool}
              onAssignTopic={(topic, dayKey) => {
                handleAddScheduleTask({
                  subject: topic.subject || 'Genel',
                  topic: topic.name,
                  targetQuestionCount: 20,
                  type: 'soru',
                  targetDayKey: dayKey || activeDayKey
                });
              }}
              isDark={isDark}
            />
          </div>
        )}
      </div>

      {/* ── Görev Ekleme Modalı ── */}
      {isAddTaskModalOpen && (
        <AddTaskModal
          dayKey={activeDayKey}
          onAdd={handleAddScheduleTask}
          onClose={() => setIsAddTaskModalOpen(false)}
          topicPool={topicPool}
          isDark={isDark}
        />
      )}

      {/* ── Yazdırılabilir A4 Haftalık Program Belgesi (Sadece Yazdırmada Görünür) ── */}
      <PrintableWeeklyDocument
        studentName={studentDisplayName}
        weekRange={weekRange}
        fullProcessedWeekMap={fullProcessedWeekMap}
        weekInfo={weekInfo}
        catchUpTasks={catchUpTasks}
        books={books}
        bookTests={bookTests}
        totalItems={totalWeekTasks}
        doneItems={doneWeekTasks}
        pct={weekPct}
        printMode={printMode}
      />
    </div>
  );
}