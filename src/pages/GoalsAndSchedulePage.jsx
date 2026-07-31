import React, { useState, useMemo } from 'react';
import { useGoal } from '../context/GoalContext';
import { useSchedule } from '../context/ScheduleContext';
import { useUser } from '../context/UserContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Target, Plus, X, CalendarClock, CheckCircle2, BookOpen,
  Timer, Flame, Trophy, ChevronRight,
  Clock, Trash2, GraduationCap, Check, Sparkles,
} from 'lucide-react';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const GOAL_TYPE_CONFIG = {
  Soru:   { color: '#f43f5e', bg: 'bg-rose-500',    light: 'bg-rose-50 dark:bg-rose-500/10',       text: 'text-rose-600 dark:text-rose-400',       border: 'border-rose-200 dark:border-rose-900/50',   icon: Target,   unit: 'soru'  },
  Sayfa:  { color: '#3b82f6', bg: 'bg-blue-500',    light: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       border: 'border-blue-200 dark:border-blue-900/50',   icon: BookOpen, unit: 'sayfa' },
  Dakika: { color: '#10b981', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50', icon: Timer, unit: 'dk' },
};

const PERIOD_CONFIG = {
  Günlük:  { icon: Flame,        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  Haftalık:{ icon: CalendarClock,badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  Aylık:   { icon: Trophy,       badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
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
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const done = pct >= 100;
  const t = GOAL_TYPE_CONFIG[goal.type] || GOAL_TYPE_CONFIG.Soru;
  const p = PERIOD_CONFIG[goal.period] || PERIOD_CONFIG.Günlük;
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
        {/* Ring */}
        <div className="relative shrink-0">
          <Ring value={pct} size={56} stroke={5} color={done ? '#10b981' : t.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xs font-black', done ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100')}>{pct}%</span>
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full', p.badge)}>
              <PIcon className="w-2.5 h-2.5" /> {goal.period}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', t.light, t.text, t.border)}>
              <TIcon className="w-2.5 h-2.5" /> {goal.type}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug mb-2 line-clamp-2">{goal.title}</h3>
          <BarProgress value={pct} color={done ? '#10b981' : t.color} />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{goal.current} {t.unit}</span>
            <span>/ {goal.target} {t.unit}</span>
          </div>
        </div>
      </div>

      {!done && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input type="number" min="1" value={adding} onChange={e => setAdding(e.target.value)}
            placeholder={`Ekle (${t.unit})`}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
          <button type="submit" className={cn('px-4 py-2 rounded-xl text-white text-xs font-black active:scale-95 shadow-sm', t.bg)}>+ Ekle</button>
        </form>
      )}
    </div>
  );
}

/* ─── Schedule Row ─── */
const ROW_COLORS = ['bg-blue-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500','bg-pink-500','bg-indigo-500'];

function ScheduleBlock({ schedule, onToggle, onDelete }) {
  const color = ROW_COLORS[schedule.title.charCodeAt(0) % ROW_COLORS.length];
  const isDone = schedule.done;

  return (
    <div
      onClick={() => onToggle(schedule.id)}
      className={cn(
        'flex items-center gap-2.5 p-3 rounded-xl border transition-all group cursor-pointer active:scale-[0.98]',
        isDone ? 'bg-slate-50/60 dark:bg-[#0F172A]/60 border-slate-100 dark:border-slate-800/40 opacity-65'
               : 'bg-white dark:bg-[#0F172A] border-slate-100 dark:border-slate-800/60 hover:shadow-sm hover:border-emerald-300'
      )}
    >
      {/* Checkbox */}
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
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

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 'u1');
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

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

  const studentGoals     = goals.filter(g => g.studentId === selectedStudent?.id);
  const studentSchedules = schedules.filter(s => s.studentId === selectedStudent?.id);
  const daySchedules     = studentSchedules.filter(s => s.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

  const completedGoals = studentGoals.filter(g => g.current >= g.target).length;
  const doneDayCount   = daySchedules.filter(s => s.done).length;
  const dayPct         = daySchedules.length ? Math.round((doneDayCount / daySchedules.length) * 100) : 0;

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

  /* ── shared panels ── */
  const GoalsPanel = (
    <div className="flex flex-col gap-4 h-full">
      {/* header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Hedeflerim</h2>
          {studentGoals.length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">{studentGoals.length}</span>
          )}
        </div>
        <button onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-sm shadow-rose-500/30 hover:shadow-md active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" /> Yeni Hedef
        </button>
      </div>

      {/* completed banner */}
      {completedGoals > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shrink-0">
          <Trophy className="w-6 h-6 text-amber-300 shrink-0" />
          <div>
            <p className="font-black text-sm leading-none">{completedGoals} hedef tamamlandı 🎉</p>
            <p className="text-emerald-100 text-[10px] mt-0.5">Harika gidiyorsun!</p>
          </div>
        </div>
      )}

      {/* cards */}
      {studentGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Target className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Henüz hedef belirlemedin</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Günlük, haftalık veya aylık hedefler ekleyerek ilerleni takip et!</p>
          <button onClick={() => setShowGoalModal(true)}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black shadow-md active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> İlk Hedefini Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {studentGoals.map(g => (
            <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onAddProgress={updateGoalProgress} />
          ))}
        </div>
      )}
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
                className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> {selectedDay} için ekle
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {daySchedules.map(s => <ScheduleBlock key={s.id} schedule={s} onToggle={toggleScheduleDone} onDelete={deleteSchedule} />)}
            </div>
          )}
        </div>
      </div>

      {/* Week overview */}
      {studentSchedules.length > 0 && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-3 shrink-0">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Hafta Özeti</h4>
          <div className="space-y-1">
            {DAYS.map(day => {
              const items = studentSchedules.filter(s => s.day === day);
              if (!items.length) return null;
              const doneC = items.filter(s => s.done).length;
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left">
                  <span className={cn('text-[9px] font-black w-8 shrink-0', selectedDay === day ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>{day.slice(0,3)}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', doneC === items.length ? 'bg-emerald-500' : 'bg-indigo-400')}
                      style={{ width: `${Math.round((doneC/items.length)*100)}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 shrink-0">{doneC}/{items.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex flex-col">

      {/* ── HEADER ── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-6 pt-8 pb-16 overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-12 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-12 w-56 h-56 rounded-full bg-pink-400/20 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* student pills */}
          {students.length > 1 && (
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 hide-scrollbar">
              {students.map(s => (
                <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all',
                    selectedStudentId === s.id ? 'bg-white text-purple-700 shadow-lg' : 'bg-white/20 text-white/80 hover:bg-white/30')}>
                  <GraduationCap className="w-4 h-4" /> {s.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black text-white leading-none">Hedeflerim &amp; Programım</h1>
                <p className="text-purple-200 text-sm mt-1">{selectedStudent?.name || 'Öğrenci'}</p>
              </div>
            </div>

            {/* desktop stat pills */}
            <div className="hidden md:flex items-center gap-3">
              {[
                { label: 'Aktif Hedef', value: studentGoals.length, icon: Target, color: 'text-rose-300' },
                { label: 'Tamamlanan', value: completedGoals, icon: Trophy, color: 'text-amber-300' },
                { label: 'Program Girişi', value: studentSchedules.length, icon: CalendarClock, color: 'text-emerald-300' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-center min-w-[90px]">
                  <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
                  <p className="text-xl font-black text-white leading-none">{value}</p>
                  <p className="text-[9px] text-purple-200 mt-1 font-bold uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* mobile stats */}
          <div className="grid grid-cols-3 gap-2 mt-5 md:hidden">
            {[
              { label: 'Hedef', value: studentGoals.length, icon: Target, color: 'text-rose-300' },
              { label: 'Bitti', value: completedGoals, icon: Trophy, color: 'text-amber-300' },
              { label: 'Program', value: studentSchedules.length, icon: CalendarClock, color: 'text-emerald-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center">
                <Icon className={cn('w-4 h-4 mx-auto mb-0.5', color)} />
                <p className="text-lg font-black text-white leading-none">{value}</p>
                <p className="text-[9px] text-purple-200 mt-0.5 font-bold uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE TAB SWITCHER (hidden on lg) ── */}
      <div className="lg:hidden sticky top-0 z-30 -mt-5 px-4 mb-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-1.5 flex gap-1.5">
          <button onClick={() => setActiveTab('goals')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all',
              activeTab === 'goals' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800')}>
            <Target className="w-4 h-4" /> Hedefler
          </button>
          <button onClick={() => setActiveTab('schedule')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all',
              activeTab === 'schedule' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800')}>
            <CalendarClock className="w-4 h-4" /> Haftalık
          </button>
        </div>
      </div>

      {/* ── DESKTOP: two-column, MOBILE: tabs ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-6 pb-10">

        {/* Desktop layout — side by side */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 lg:h-[calc(100vh-220px)]">
          {/* Left: Goals */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col overflow-hidden -mt-8 relative z-10">
            {GoalsPanel}
          </div>
          {/* Right: Schedule */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col overflow-hidden -mt-8 relative z-10">
            {SchedulePanel}
          </div>
        </div>

        {/* Mobile layout — tabs */}
        <div className="lg:hidden mt-2">
          {activeTab === 'goals' && GoalsPanel}
          {activeTab === 'schedule' && SchedulePanel}
        </div>
      </div>

      {/* ── GOAL MODAL ── */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-rose-400 via-pink-500 to-purple-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Yeni Hedef</h3>
                </div>
                <button onClick={() => setShowGoalModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hedef Adı</label>
                  <input type="text" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 dark:text-white"
                    placeholder="Örn: Günlük Matematik Soruları" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tür</label>
                    <div className="space-y-2">
                      {Object.entries(GOAL_TYPE_CONFIG).map(([key, cfg]) => (
                        <label key={key} className={cn('flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                          newGoal.type === key ? `${cfg.light} ${cfg.border} ${cfg.text}` : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')}>
                          <input type="radio" name="type" value={key} checked={newGoal.type === key} onChange={e => setNewGoal({ ...newGoal, type: e.target.value })} className="hidden" />
                          <cfg.icon className="w-4 h-4" /><span className="text-xs font-bold">{key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Periyot</label>
                      <div className="space-y-2">
                        {Object.entries(PERIOD_CONFIG).map(([key, cfg]) => (
                          <label key={key} className={cn('flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all',
                            newGoal.period === key ? cfg.badge + ' border-current' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')}>
                            <input type="radio" name="period" value={key} checked={newGoal.period === key} onChange={e => setNewGoal({ ...newGoal, period: e.target.value })} className="hidden" />
                            <cfg.icon className="w-4 h-4" /><span className="text-xs font-bold">{key}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hedef Sayı</label>
                      <input type="number" min="1" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-400 dark:text-white" required />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black rounded-xl text-sm shadow-lg shadow-rose-500/30 active:scale-95 transition-all">
                  HEDEFİ KAYDET
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE MODAL ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CalendarClock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Programa Ders Ekle</h3>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Gün Seç</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => (
                      <button key={d} type="button" onClick={() => setNewSchedule({ ...newSchedule, day: d })}
                        className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                          newSchedule.day === d ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                                                 : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400')}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Saat</label>
                  <input type="time" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:text-white" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ders / Çalışma Adı</label>
                  <input type="text" value={newSchedule.title} onChange={e => setNewSchedule({ ...newSchedule, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:text-white"
                    placeholder="Örn: Matematik - Türev Konusu" required />
                </div>
                <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
                  PROGRAMA EKLE
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
