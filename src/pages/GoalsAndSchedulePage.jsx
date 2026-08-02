import React, { useState, useMemo, useEffect } from 'react';
import { useGoal } from '../context/GoalContext';
import { useSchedule } from '../context/ScheduleContext';
import { useUser } from '../context/UserContext';
import { useCoaching } from '../context/CoachingContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Target, Plus, X, CalendarClock, CheckCircle2, BookOpen,
  Timer, Flame, Trophy, ChevronRight,
  Clock, Trash2, GraduationCap, Check, Sparkles, TrendingUp, Save, RefreshCw,
  CalendarDays, ListTodo
} from 'lucide-react';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const GOAL_TYPE_CONFIG = {
  Soru:   { color: '#f43f5e', bg: 'bg-rose-500',    light: 'bg-rose-50 dark:bg-rose-500/10',       text: 'text-rose-600 dark:text-rose-400',       border: 'border-rose-200 dark:border-rose-900/50',   icon: Target,   unit: 'soru'  },
  Sayfa:  { color: '#3b82f6', bg: 'bg-blue-500',    light: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       border: 'border-blue-200 dark:border-blue-900/50',   icon: BookOpen, unit: 'sayfa' },
  Dakika: { color: '#10b981', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50', icon: Timer, unit: 'dk' },
  Net:    { color: '#8b5cf6', bg: 'bg-purple-500',  light: 'bg-purple-50 dark:bg-purple-500/10',   text: 'text-purple-600 dark:text-purple-400',   border: 'border-purple-200 dark:border-purple-900/50', icon: TrendingUp, unit: 'net' },
  Puan:   { color: '#f59e0b', bg: 'bg-amber-500',   light: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-900/50',   icon: Trophy,   unit: 'puan' },
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
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

/* ─── Goal Card ─── */
function GoalCard({ goal, onDelete, onAddProgress }) {
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

      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Ring value={pct} size={56} stroke={5} color={done ? '#10b981' : t.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xs font-black', done ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100')}>{pct}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full', p.badge)}>
              <PIcon className="w-2.5 h-2.5" /> {goal.period}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', t.light, t.text, t.border)}>
              <TIcon className="w-2.5 h-2.5" /> {goal.type}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">{goal.title}</h3>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-black text-slate-400">
          <span>{goal.current || 0} / {goal.target} {t.unit}</span>
          <span>{goal.target - (goal.current || 0) > 0 ? `${goal.target - (goal.current || 0)} ${t.unit} kaldı` : 'Tamamlandı'}</span>
        </div>
        <BarProgress value={pct} color={done ? '#10b981' : t.color} />
      </div>

      {!done && (
        <form onSubmit={handleAdd} className="flex gap-2 pt-1">
          <input
            type="number"
            min="1"
            placeholder={`+ Ekle (${t.unit})`}
            value={adding}
            onChange={e => setAdding(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-all shrink-0"
          >
            Ekle
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── Schedule Item Card ─── */
function ScheduleItem({ schedule, onToggleDone, onDelete }) {
  const isDone = schedule.done;
  const category = schedule.subject || 'Diğer';
  const color = category === 'Matematik' ? 'bg-blue-500' : category === 'Fen Bilimleri' ? 'bg-teal-500' : category === 'Türkçe' ? 'bg-orange-500' : 'bg-indigo-500';

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all group',
      isDone ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
             : 'bg-white dark:bg-[#1E293B] border-slate-100 dark:border-slate-800 hover:shadow-sm'
    )}>
      <div onClick={() => onToggleDone(schedule.id)} className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer',
        isDone ? 'bg-emerald-500 border-emerald-500 shadow-sm' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
      )}>
        {isDone && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>

      <div className={cn('w-1 self-stretch rounded-full shrink-0', isDone ? 'bg-slate-300 dark:bg-slate-700' : color)} />

      <p className={cn('flex-1 text-sm font-semibold truncate transition-all min-w-0',
        isDone ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'
      )}>{schedule.title}</p>

      <div className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 flex items-center gap-1 transition-all',
        isDone ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
               : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
      )}>
        <Clock className="w-2.5 h-2.5" />{schedule.time}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(schedule.id); }}
        className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100 shrink-0"
        title="Sil"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function GoalsAndSchedulePage() {
  const { goals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = useSchedule();
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

  /* Mobile: tab state */
  const [activeTab, setActiveTab] = useState('goals');

  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return DAYS[d === 0 ? 6 : d - 1];
  });

  const [showGoalModal, setShowGoalModal]         = useState(false);
  const [newGoal, setNewGoal]                     = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50 });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule]             = useState({ day: selectedDay, time: '09:00', title: '' });

  const studentGoals     = goals.filter(g => String(g.studentId) === String(selectedStudent?.id));
  const studentSchedules = schedules.filter(s => String(s.studentId) === String(selectedStudent?.id));
  const daySchedules     = studentSchedules.filter(s => s.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

  const completedGoals = studentGoals.filter(g => g.current >= g.target).length;
  const doneDayCount   = daySchedules.filter(s => s.done).length;
  const dayPct         = daySchedules.length ? Math.round((doneDayCount / daySchedules.length) * 100) : 0;

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

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    if (newSchedule.title && newSchedule.time) {
      addSchedule({ ...newSchedule, studentId: selectedStudent?.id });
      setShowScheduleModal(false);
      setNewSchedule({ day: selectedDay, time: '09:00', title: '' });
    }
  };

  const GoalsPanel = (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1 custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Hedef Belirleme & Canlı Takip Paneli</h2>
        </div>
        <button onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-sm shadow-rose-500/30 hover:shadow-md active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" /> + Hedef Ekle
        </button>
      </div>

      {/* LIVE SYNC NOTICE */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
        <RefreshCw className="w-6 h-6 text-emerald-500 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
        <div>
          <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400">🔄 1-e-1 Birebir Koçluk Dosyası Senkronizasyonu</h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Aşağıdaki Uzun, Orta ve Kısa vadeli hedefler öğrenci ve koç arasında anlık senkronize çalışır. Yapılan tüm değişiklikler iki tarafta da anında güncellenir.
          </p>
        </div>
      </div>

      {/* 🏛️ 1. UZUN VADELİ HEDEFLER (LGS/YKS, İSTENEN OKUL, PUAN & NET) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" /> 🏛️ 1. UZUN VADELİ HEDEFLER
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

        {/* Uzun Vadeli Goal Cards */}
        {studentGoals.filter(g => g.period === 'Uzun Vadeli').length > 0 && (
          <div className="space-y-2 pt-2">
            {studentGoals.filter(g => g.period === 'Uzun Vadeli').map(g => (
              <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onAddProgress={updateGoalProgress} />
            ))}
          </div>
        )}
      </div>

      {/* 📅 2. ORTA VADELİ HEDEFLER (AYLIK HEDEFLER) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4" /> 📅 2. ORTA VADELİ HEDEFLER (AYLIK)
          </div>
          <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">Aylık Kazanımlar</span>
        </div>

        <div>
          <textarea
            rows="2"
            placeholder="Aylık stratejik hedefleriniz (Örn: Matematik Çarpanlar ve EKOK problemleri tamamlanacak)..."
            value={monthlyGoals}
            onChange={e => setMonthlyGoals(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Aylık Goal Cards */}
        {studentGoals.filter(g => g.period === 'Aylık').length > 0 && (
          <div className="space-y-2 pt-1">
            {studentGoals.filter(g => g.period === 'Aylık').map(g => (
              <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onAddProgress={updateGoalProgress} />
            ))}
          </div>
        )}
      </div>

      {/* ⚡ 3. KISA VADELİ HEDEFLER (HAFTALIK & GÜNLÜK HEDEFLER) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-wider">
            <Flame className="w-4 h-4" /> ⚡ 3. KISA VADELİ HEDEFLER (HAFTALIK & GÜNLÜK)
          </div>
          <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">Rutin & Çalışma</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">⚡ Haftalık Hedefler</label>
            <textarea
              rows="2"
              placeholder="Örn: Haftada 400 soru + 2 deneme..."
              value={weeklyGoals}
              onChange={e => setWeeklyGoals(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">🔥 Günlük Çalışma Rutini</label>
            <textarea
              rows="2"
              placeholder="Örn: Günlük 20 Paragraf sorusu..."
              value={dailyGoals}
              onChange={e => setDailyGoals(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
        </div>

        {/* Kısa Vadeli (Haftalık & Günlük) Goal Cards */}
        {studentGoals.filter(g => g.period === 'Haftalık' || g.period === 'Günlük' || !g.period).length > 0 && (
          <div className="space-y-2 pt-1">
            {studentGoals.filter(g => g.period === 'Haftalık' || g.period === 'Günlük' || !g.period).map(g => (
              <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onAddProgress={updateGoalProgress} />
            ))}
          </div>
        )}
      </div>

      {/* SAVE BUTTON FOR ALL HIERARCHICAL GOALS */}
      <div className="flex items-center justify-between pt-2">
        {isSavedNotice ? (
          <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Tüm Hedefler Kaydedildi ve Senkronize Edildi!
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
  );

  const SchedulePanel = (
    <div className="flex flex-col gap-4 h-full">
      {/* header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Haftalık Program</h2>
        </div>
        <button onClick={() => { setNewSchedule({ day: selectedDay, time: '09:00', title: '' }); setShowScheduleModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-sm shadow-emerald-500/30 hover:shadow-md active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" /> Ders Ekle
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar shrink-0">
        {DAYS.map(day => {
          const count   = studentSchedules.filter(s => s.day === day).length;
          const doneC   = studentSchedules.filter(s => s.day === day && s.done).length;
          const isSel   = selectedDay === day;
          return (
            <button key={day} onClick={() => setSelectedDay(day)} className={cn(
              'flex flex-col items-center min-w-[60px] px-2 py-2 rounded-xl border text-center transition-all shrink-0',
              isSel ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
            )}>
              <span className={cn('text-[9px] font-black uppercase tracking-widest', isSel ? 'text-emerald-200' : 'text-slate-400')}>{day.slice(0,3)}</span>
              {count > 0 ? (
                <span className={cn('mt-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center',
                  isSel ? 'bg-white text-emerald-600' : doneC === count ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                )}>{count}</span>
              ) : <span className="mt-1 w-4 h-4" />}
            </button>
          );
        })}
      </div>

      {/* Day card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Card header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">{selectedDay}</h3>
          <span className="text-[10px] text-slate-400 font-medium">
            {daySchedules.length > 0 ? `${daySchedules.length} ders/çalışma` : 'Boş gün'}
          </span>
        </div>

        {/* Progress */}
        {daySchedules.length > 0 && (
          <div className="px-4 pt-3 pb-2 shrink-0">
            <div className="flex justify-between text-[10px] font-black mb-1">
              <span className="text-slate-400 uppercase tracking-widest">Günlük İlerleme</span>
              <span className={dayPct === 100 ? 'text-emerald-500' : 'text-slate-400'}>{doneDayCount}/{daySchedules.length} tamamlandı</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', dayPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: `${dayPct}%` }} />
            </div>
            {dayPct === 100 && <p className="text-center text-[10px] font-black text-emerald-500 mt-1.5">🎉 Günün tamamlandı!</p>}
          </div>
        )}

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {daySchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center py-8">
              <CalendarClock className="w-8 h-8 text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-xs font-medium text-slate-400">Bu gün için program eklenmemiş</p>
              <button onClick={() => { setNewSchedule({ day: selectedDay, time: '09:00', title: '' }); setShowScheduleModal(true); }}
                className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                + Ders / Çalışma Ekle
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {daySchedules.map(s => (
                <ScheduleItem key={s.id} schedule={s} onToggleDone={toggleScheduleDone} onDelete={deleteSchedule} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 p-4 sm:p-6 pb-20">
      {/* Header bar */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Hedefler & Çalışma Programı</h1>
          <p className="text-xs text-slate-400 mt-0.5">Uzun, Orta ve Kısa vadeli hedefler ile günlük rutini tek yerden takip et</p>
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

      {/* Mobile Tab Switcher */}
      <div className="max-w-6xl mx-auto mb-4 md:hidden flex bg-white dark:bg-[#1E293B] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button onClick={() => setActiveTab('goals')} className={cn(
          'flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5',
          activeTab === 'goals' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
        )}>
          <Target className="w-3.5 h-3.5" /> Hedeflerim ({studentGoals.length})
        </button>
        <button onClick={() => setActiveTab('schedule')} className={cn(
          'flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5',
          activeTab === 'schedule' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
        )}>
          <CalendarClock className="w-3.5 h-3.5" /> Haftalık Plan
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="max-w-6xl mx-auto">
        <div className="hidden md:grid md:grid-cols-2 gap-6 items-stretch min-h-[550px]">
          {GoalsPanel}
          {SchedulePanel}
        </div>
        <div className="md:hidden">
          {activeTab === 'goals' ? GoalsPanel : SchedulePanel}
        </div>
      </div>

      {/* MODAL: HEDEF EKLE */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">Yeni Hedef Ekle</h3>
              </div>
              <button onClick={() => setShowGoalModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Hedef Tanımı</label>
                <input
                  type="text"
                  placeholder="Örn: Paragraf Soru Çözümü"
                  value={newGoal.title}
                  onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tür</label>
                  <select
                    value={newGoal.type}
                    onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Soru">🎯 Soru</option>
                    <option value="Sayfa">📖 Sayfa</option>
                    <option value="Dakika">⏱️ Dakika</option>
                    <option value="Net">📈 Net</option>
                    <option value="Puan">🏆 Puan</option>
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
                    <option value="Uzun Vadeli">🏛️ Uzun Vadeli</option>
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

      {/* MODAL: DERS EKLE */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">Programa Ekle</h3>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Gün</label>
                <select
                  value={newSchedule.day}
                  onChange={e => setNewSchedule(p => ({ ...p, day: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Saat</label>
                <input
                  type="time"
                  value={newSchedule.time}
                  onChange={e => setNewSchedule(p => ({ ...p, time: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Ders / Etkinlik Adı</label>
                <input
                  type="text"
                  placeholder="Örn: 18:00 Matematik Çözümü"
                  value={newSchedule.title}
                  onChange={e => setNewSchedule(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">İptal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all">Programa Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
