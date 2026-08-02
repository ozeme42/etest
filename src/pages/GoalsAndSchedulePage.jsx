import React, { useState, useMemo, useEffect } from 'react';
import { useGoal } from '../context/GoalContext';
import { useUser } from '../context/UserContext';
import { useCoaching } from '../context/CoachingContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Target, Plus, X, CalendarClock, CheckCircle2, BookOpen,
  Timer, Flame, Trophy, ChevronRight,
  Clock, Trash2, GraduationCap, Check, Sparkles, TrendingUp, Save, RefreshCw,
  Brain, BookOpenCheck, BarChart3, Layers
} from 'lucide-react';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const GOAL_TYPE_CONFIG = {
  Soru:   { color: '#f43f5e', bg: 'bg-rose-500',    light: 'bg-rose-50 dark:bg-rose-500/10',       text: 'text-rose-600 dark:text-rose-400',       border: 'border-rose-200 dark:border-rose-900/50',   icon: Target,        unit: 'soru'  },
  Sayfa:  { color: '#3b82f6', bg: 'bg-blue-500',    light: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       border: 'border-blue-200 dark:border-blue-900/50',   icon: BookOpen,      unit: 'sayfa' },
  Konu:   { color: '#a855f7', bg: 'bg-purple-500',  light: 'bg-purple-50 dark:bg-purple-500/10',   text: 'text-purple-600 dark:text-purple-400',   border: 'border-purple-200 dark:border-purple-900/50', icon: Brain,         unit: 'konu'  },
  Dakika: { color: '#10b981', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50', icon: Timer,        unit: 'dk'    },
  Net:    { color: '#06b6d4', bg: 'bg-cyan-500',     light: 'bg-cyan-50 dark:bg-cyan-500/10',       text: 'text-cyan-600 dark:text-cyan-400',       border: 'border-cyan-200 dark:border-cyan-900/50',   icon: TrendingUp,   unit: 'net'   },
  Puan:   { color: '#f59e0b', bg: 'bg-amber-500',    light: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-900/50',   icon: Trophy,        unit: 'puan'  },
};

const PERIOD_CONFIG = {
  'Günlük':     { icon: Flame,        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  'Haftalık':   { icon: CalendarClock,badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  'Aylık':      { icon: Trophy,       badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  'Uzun Vadeli':{ icon: GraduationCap,badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

/* ─── Mini progress bar ─── */
function BarProgress({ value, color }) {
  return (
    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

/* ─── Ring SVG ─── */
function Ring({ value, size = 64, stroke = 6, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(100, value)) / 100;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-100 dark:text-slate-800" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

/* ─── Visual Custom Goal Card ─── */
function VisualGoalCard({ goal, onDelete, onAddProgress }) {
  const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100));
  const done = pct >= 100;
  const t = GOAL_TYPE_CONFIG[goal.type] || GOAL_TYPE_CONFIG.Soru;
  const p = PERIOD_CONFIG[goal.period] || PERIOD_CONFIG['Günlük'];
  const PIcon = p.icon;
  const TIcon = t.icon;
  const [adding, setAdding] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const n = Number(adding);
    if (n > 0) { onAddProgress(goal.id, n); setAdding(''); }
  };

  const quickIncrementStep = goal.type === 'Soru' ? 10 : goal.type === 'Sayfa' ? 5 : goal.type === 'Dakika' ? 15 : 1;

  return (
    <div className={cn(
      'relative bg-white dark:bg-[#1E293B] rounded-2xl border shadow-sm flex flex-col gap-3 p-4 group transition-all hover:shadow-md',
      done ? 'border-emerald-400/60 dark:border-emerald-700/60 ring-1 ring-emerald-400/20' : 'border-slate-100 dark:border-slate-800'
    )}>
      {done && (
        <div className="absolute top-3 right-9 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
          <CheckCircle2 className="w-2.5 h-2.5" /> Tamam!
        </div>
      )}
      <button onClick={() => onDelete(goal.id)} className="absolute top-3 right-3 p-1 text-slate-300 dark:text-slate-600 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100">
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3.5">
        {/* Ring Chart */}
        <div className="relative shrink-0">
          <Ring value={pct} size={62} stroke={6} color={done ? '#10b981' : t.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xs font-black', done ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100')}>{pct}%</span>
          </div>
        </div>

        {/* Goal Meta Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', p.badge)}>
              <PIcon className="w-2.5 h-2.5" /> {goal.period}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border', t.light, t.text, t.border)}>
              <TIcon className="w-2.5 h-2.5" /> {goal.type}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">{goal.title}</h3>
        </div>
      </div>

      {/* Progress Numbers & Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] font-black text-slate-500 dark:text-slate-400">
          <span>İlerleme: <strong className="text-slate-800 dark:text-white">{goal.current || 0}</strong> / {goal.target} {t.unit}</span>
          <span style={{ color: done ? '#10b981' : t.color }}>{goal.target - (goal.current || 0) > 0 ? `${goal.target - (goal.current || 0)} ${t.unit} kaldı` : '🎉 Tamamlandı'}</span>
        </div>
        <BarProgress value={pct} color={done ? '#10b981' : t.color} />
      </div>

      {/* Quick Increment Controls */}
      {!done && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onAddProgress(goal.id, quickIncrementStep)}
            className={cn('px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all hover:scale-105 active:scale-95', t.light, t.text, t.border)}
          >
            +{quickIncrementStep} {t.unit}
          </button>

          <form onSubmit={handleAdd} className="flex-1 flex gap-1.5">
            <input
              type="number"
              min="1"
              placeholder={`Özel ekle (${t.unit})`}
              value={adding}
              onChange={e => setAdding(e.target.value)}
              className="flex-1 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-all shrink-0"
            >
              Ekle
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE: GOALS AND SCHEDULE (WITHOUT SCHEDULE PANEL)
═══════════════════════════════════════════════════════════ */
export default function GoalsAndSchedulePage() {
  const { goals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const { users } = useUser();
  const { getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles } = useCoaching();

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 'u1');
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const coachingProfile = useMemo(() => getCoachingProfileForStudent(selectedStudent?.id) || {}, [selectedStudent?.id, coachingProfiles]);

  // Sync state for 3-Level Goal Architecture
  const [examGoalType, setExamGoalType] = useState(coachingProfile.examGoalType || 'LGS 2026');
  const [targetSchool, setTargetSchool] = useState(coachingProfile.targetSchool || '');
  const [targetScore, setTargetScore] = useState(coachingProfile.targetScore || '485');
  const [targetNet, setTargetNet] = useState(coachingProfile.targetNet || '90');

  const [monthlyGoals, setMonthlyGoals] = useState(coachingProfile.monthlyGoals || '');
  const [weeklyGoals, setWeeklyGoals] = useState(coachingProfile.weeklyGoals || '');
  const [dailyGoals, setDailyGoals] = useState(coachingProfile.dailyGoals || '');

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Filter state for Custom Visual Goals Panel
  const [periodFilter, setPeriodFilter] = useState('Tümü'); // 'Tümü', 'Günlük', 'Haftalık', 'Aylık'
  const [typeFilter, setTypeFilter] = useState('Tümü'); // 'Tümü', 'Soru', 'Sayfa', 'Konu', 'Dakika'

  useEffect(() => {
    if (coachingProfile) {
      if (coachingProfile.examGoalType) setExamGoalType(coachingProfile.examGoalType);
      if (coachingProfile.targetSchool) setTargetSchool(coachingProfile.targetSchool);
      if (coachingProfile.targetScore) setTargetScore(coachingProfile.targetScore);
      if (coachingProfile.targetNet) setTargetNet(coachingProfile.targetNet);
      if (coachingProfile.monthlyGoals) setMonthlyGoals(coachingProfile.monthlyGoals);
      if (coachingProfile.weeklyGoals) setWeeklyGoals(coachingProfile.weeklyGoals);
      if (coachingProfile.dailyGoals) setDailyGoals(coachingProfile.dailyGoals);
    }
  }, [coachingProfile]);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50 });

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => String(g.studentId) === String(selectedStudent.id));
  }, [goals, selectedStudent]);

  // Filtered visual custom goals
  const filteredVisualGoals = useMemo(() => {
    return studentGoals.filter(g => {
      const matchPeriod = periodFilter === 'Tümü' || g.period === periodFilter;
      const matchType = typeFilter === 'Tümü' || g.type === typeFilter;
      return matchPeriod && matchType;
    });
  }, [studentGoals, periodFilter, typeFilter]);

  // Total Statistics for Visual Banner
  const totalQuestionSolved = useMemo(() => studentGoals.filter(g => g.type === 'Soru').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);
  const totalPagesRead = useMemo(() => studentGoals.filter(g => g.type === 'Sayfa').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);
  const totalTopicsCompleted = useMemo(() => studentGoals.filter(g => g.type === 'Konu').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);
  const totalMinutesStudied = useMemo(() => studentGoals.filter(g => g.type === 'Dakika').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);

  const handleSaveAllCoachingGoals = async (e) => {
    if (e) e.preventDefault();
    await saveCoachingProfile({
      ...coachingProfile,
      studentId: selectedStudent.id,
      examGoalType,
      targetSchool,
      targetScore,
      targetNet: Number(targetNet) || 0,
      monthlyGoals,
      weeklyGoals,
      dailyGoals
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (newGoal.title && newGoal.target > 0) {
      addGoal({ ...newGoal, studentId: selectedStudent?.id });
      setShowGoalModal(false);
      setNewGoal({ title: '', type: 'Soru', period: 'Günlük', target: 50 });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 p-4 sm:p-6 pb-20">
      
      {/* HEADER BAR */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Target className="w-7 h-7 text-rose-500" />
            Öğrenci Özel Hedefler & Canlı Takip Paneli
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Uzun, Orta ve Kısa vadeli hedefler, Soru çözme, Kitap okuma ve Konu takip matrisi</p>
        </div>

        {/* Student Selector */}
        {students.length > 1 && (
          <div className="flex items-center gap-2 bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {students.map(s => (
              <button key={s.id} onClick={() => setSelectedStudentId(s.id)} className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                s.id === selectedStudent?.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              )}>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LIVE SYNC NOTICE BANNER */}
      <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
        <RefreshCw className="w-7 h-7 text-emerald-500 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
        <div>
          <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400">🔄 1-e-1 Birebir Koçluk Dosyası Senkronizasyonu Aktif</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Aşağıdaki tüm Uzun, Orta (Aylık), Kısa (Haftalık & Günlük) ve Soru/Kitap/Konu özel hedefleri Öğrenci ve Koçluk panelleri arasında 1-e-1 eşitlenmektedir.
          </p>
        </div>
      </div>

      {/* TOP VISUAL TRACKING STATS BANNER */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Çözülen Soru</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{totalQuestionSolved} Soru</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-blue-200 dark:border-blue-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kitap Okuma</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{totalPagesRead} Sayfa</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-purple-200 dark:border-purple-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tamamlanan Konu</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{totalTopicsCompleted} Konu</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Çalışma Süresi</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{totalMinutesStudied} Dakika</span>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN LAYOUT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: 🏛️ AKADEMİK & HİYERARŞİK HEDEF BELİRLEME (UZUN, ORTA, KISA VADELİ) */}
        <div className="lg:col-span-6 space-y-5">
          
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              1. Akademik Hedef Yapısı (LGS/YKS & Stratejiler)
            </h2>
          </div>

          {/* UZUN VADELİ HEDEFLER */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" /> 🏛️ UZUN VADELİ HEDEFLER
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">Sınav & Okul</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Sınav Türü</label>
                <select
                  value={examGoalType}
                  onChange={e => setExamGoalType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="LGS 2026">🎓 LGS (Liselere Geçiş Sınavı)</option>
                  <option value="YKS (TYT/AYT) 2026">🏛️ YKS (TYT & AYT Sınavı)</option>
                  <option value="Ara Sınıf Başarı">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">İstenen Okul & Bölüm</label>
                <input
                  type="text"
                  placeholder="Örn: Kabataş Erkek Lisesi / Boğaziçi Müh."
                  value={targetSchool}
                  onChange={e => setTargetSchool(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Puan Hedefi</label>
                <input
                  type="text"
                  placeholder="Örn: 485 Puan"
                  value={targetScore}
                  onChange={e => setTargetScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Toplam Net Hedefi</label>
                <input
                  type="number"
                  placeholder="Örn: 90 Net"
                  value={targetNet}
                  onChange={e => setTargetNet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ORTA VADELİ HEDEFLER */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                <Trophy className="w-4 h-4" /> 📅 ORTA VADELİ HEDEFLER (AYLIK)
              </div>
              <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">Aylık Kazanımlar</span>
            </div>

            <div>
              <textarea
                rows="3"
                placeholder="Aylık stratejik hedefleriniz (Örn: Matematik Çarpanlar ve EKOK problemleri tamamlanacak)..."
                value={monthlyGoals}
                onChange={e => setMonthlyGoals(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* KISA VADELİ HEDEFLER */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-wider">
                <Flame className="w-4 h-4" /> ⚡ KISA VADELİ HEDEFLER (HAFTALIK & GÜNLÜK)
              </div>
              <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">Rutin & Çalışma</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">⚡ Haftalık Hedefler</label>
                <textarea
                  rows="3"
                  placeholder="Örn: Haftada 400 soru + 2 deneme..."
                  value={weeklyGoals}
                  onChange={e => setWeeklyGoals(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">🔥 Günlük Çalışma Rutini</label>
                <textarea
                  rows="3"
                  placeholder="Örn: Günlük 20 Paragraf sorusu..."
                  value={dailyGoals}
                  onChange={e => setDailyGoals(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {isSavedNotice ? (
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Akademik Hedefler Kaydedildi!
              </span>
            ) : <span />}
            <button
              onClick={handleSaveAllCoachingGoals}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all ml-auto"
            >
              <Save className="w-4 h-4" /> Tüm Hedefleri Kaydet & Senkronize Et
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: 📊 GÖRSEL TAKİP PANOSU (ÖZEL HEDEFLER: SORU, KİTAP, KONU, SÜRE) */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              2. Görsel Özel Hedef Takip Panosu
            </h2>
            <button
              onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-sm shadow-rose-500/30 hover:shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> + Özel Hedef Ekle
            </button>
          </div>

          {/* FILTER TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <div className="flex items-center gap-1 bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              {['Tümü', 'Günlük', 'Haftalık', 'Aylık'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                    periodFilter === p ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              {['Tümü', 'Soru', 'Sayfa', 'Konu', 'Dakika'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                    typeFilter === t ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* VISUAL CARDS GRID */}
          {filteredVisualGoals.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center mx-auto">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Seçilen Kriterlere Uygun Özel Hedef Bulunmuyor</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Günlük soru çözme, kitap okuma, konu tamamlama veya süre hedefleri ekleyerek görsel takibinizi başlatın!
              </p>
              <button
                onClick={() => setShowGoalModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Yeni Özel Hedef Tanımla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredVisualGoals.map(goal => (
                <VisualGoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={deleteGoal}
                  onAddProgress={updateGoalProgress}
                />
              ))}
            </div>
          )}

        </div>

      </div>

      {/* MODAL: ÖZEL HEDEF EKLE */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">Yeni Özel Hedef Tanımla</h3>
              </div>
              <button onClick={() => setShowGoalModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Hedef Tanımı / Başlığı</label>
                <input
                  type="text"
                  placeholder="Örn: Günlük 30 Paragraf Sorusu / 50 Sayfa Kitap"
                  value={newGoal.title}
                  onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Hedef Türü</label>
                  <select
                    value={newGoal.type}
                    onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Soru">🎯 Soru Çözme</option>
                    <option value="Sayfa">📖 Kitap Okuma</option>
                    <option value="Konu">🧠 Konu Tamamlama</option>
                    <option value="Dakika">⏱️ Çalışma Süresi (dk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Periyot</label>
                  <select
                    value={newGoal.period}
                    onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Günlük">⚡ Günlük</option>
                    <option value="Haftalık">📅 Haftalık</option>
                    <option value="Aylık">🏆 Aylık</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Hedef Miktar</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Örn: 50"
                  value={newGoal.target}
                  onChange={e => setNewGoal(p => ({ ...p, target: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowGoalModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">İptal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all">Hedef Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
