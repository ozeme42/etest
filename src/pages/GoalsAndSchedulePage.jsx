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
  Brain, BookOpenCheck, BarChart3, Layers, CheckSquare, Square, Repeat, Zap, Award
} from 'lucide-react';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const WEEK_DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const MONTH_WEEKS = ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'];

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

/* ─── Helper to parse checklist items ─── */
export const parseCheckableGoalList = (val, defaultItems = []) => {
  if (Array.isArray(val) && val.length > 0) return val;
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').filter(Boolean).map((line, i) => ({
      id: `chk_${i}_${Date.now()}`,
      text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
      done: false
    }));
  }
  return defaultItems;
};

/* ─── Helper for Daily Habits with 7-Day Matrix ─── */
export const parseDailyHabitList = (val, defaultItems = []) => {
  if (Array.isArray(val) && val.length > 0) {
    return val.map(item => ({
      id: item.id || `d_${Math.random()}`,
      text: typeof item === 'string' ? item : item.text || '',
      days: item.days || { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false }
    }));
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').filter(Boolean).map((line, i) => ({
      id: `dh_${i}_${Date.now()}`,
      text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
      days: { Pzt: i % 2 === 0, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false }
    }));
  }
  return defaultItems;
};

/* ─── Helper for Weekly Habits with 4-Week Matrix ─── */
export const parseWeeklyHabitList = (val, defaultItems = []) => {
  if (Array.isArray(val) && val.length > 0) {
    return val.map(item => ({
      id: item.id || `w_${Math.random()}`,
      text: typeof item === 'string' ? item : item.text || '',
      weeks: item.weeks || { 'Hafta 1': true, 'Hafta 2': true, 'Hafta 3': true, 'Hafta 4': false }
    }));
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').filter(Boolean).map((line, i) => ({
      id: `wh_${i}_${Date.now()}`,
      text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
      weeks: { 'Hafta 1': true, 'Hafta 2': i % 2 === 0, 'Hafta 3': true, 'Hafta 4': false }
    }));
  }
  return defaultItems;
};

/* ─── Checkable Monthly Goal Checklist ─── */
function MonthlyChecklistSection({ title, icon: Icon, colorClass, badgeText, items, onToggleItem, onAddItem, onDeleteItem }) {
  const [newText, setNewText] = useState('');
  const completedCount = items.filter(i => i.done).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (newText.trim()) {
      onAddItem(newText.trim());
      setNewText('');
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className={cn("flex items-center gap-2 font-black text-xs uppercase tracking-wider", colorClass)}>
          <Icon className="w-4 h-4" /> {title}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400">
            {completedCount}/{totalCount} Tamamlandı (%{pct})
          </span>
          <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
            {badgeText}
          </span>
        </div>
      </div>

      {totalCount > 0 && <BarProgress value={pct} color={pct === 100 ? '#10b981' : '#6366f1'} />}

      <div className="space-y-2 pt-1">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => onToggleItem(item.id)}
            className={cn(
              'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group',
              item.done ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60' : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                className={cn('w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all', item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800')}
              >
                {item.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </button>
              <span className={cn('text-xs font-bold transition-all line-clamp-2', item.done ? 'line-through text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100')}>
                {item.text}
              </span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} className="p-1 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 pt-1">
        <input
          type="text"
          placeholder="+ Yeni aylık hedef maddesi..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
        />
        <button type="submit" className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-all shrink-0 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Ekle
        </button>
      </form>
    </div>
  );
}

/* ─── 🔥 GÜNLÜK RUTİN ALIŞKANLIK & SERİ TAKİBİ COMPONENT ─── */
function DailyHabitStreakSection({ items, onToggleDay, onAddItem, onDeleteItem }) {
  const [newText, setNewText] = useState('');

  // Calculate global daily streak (Count consecutive days completed)
  const totalDaysCompleted = useMemo(() => {
    let count = 0;
    WEEK_DAYS.forEach(day => {
      const allDone = items.length > 0 && items.every(i => i.days?.[day]);
      if (allDone) count++;
    });
    return count;
  }, [items]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newText.trim()) {
      onAddItem(newText.trim());
      setNewText('');
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-rose-200 dark:border-rose-900/50 p-4 space-y-3 shadow-sm">
      
      {/* Header with Flame & Streak Counter */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-wider">
          <Flame className="w-4 h-4 fill-rose-500 animate-bounce" /> 🔥 GÜNLÜK RUTİN & SERİ TAKİBİ
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[11px] shadow-sm">
            <Flame className="w-3 h-3 fill-white" /> {totalDaysCompleted} Günlük Seri!
          </span>
        </div>
      </div>

      {/* Daily Routine Items List with 7-Day Matrix */}
      <div className="space-y-3 pt-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium italic py-1">Henüz günlük rutin maddesi eklenmedi.</p>
        ) : (
          items.map(item => {
            const completedDaysCount = WEEK_DAYS.filter(d => item.days?.[d]).length;
            const pct = Math.round((completedDaysCount / 7) * 100);

            return (
              <div key={item.id} className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 space-y-2 group hover:border-rose-300 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {item.text}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-400">
                      {completedDaysCount}/7 Gün (%{pct})
                    </span>
                    <button type="button" onClick={() => onDeleteItem(item.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 7-Day Toggle Buttons Matrix */}
                <div className="grid grid-cols-7 gap-1">
                  {WEEK_DAYS.map(day => {
                    const done = item.days?.[day];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onToggleDay(item.id, day)}
                        className={cn(
                          'flex flex-col items-center justify-center py-1.5 rounded-lg border text-[10px] font-black transition-all active:scale-95',
                          done
                            ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-rose-300'
                        )}
                      >
                        <span>{day}</span>
                        <div className={cn('w-2.5 h-2.5 rounded-full mt-1 flex items-center justify-center', done ? 'bg-white' : 'bg-slate-200 dark:bg-slate-700')}>
                          {done && <Check className="w-2 h-2 text-rose-500" strokeWidth={4} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Routine Form */}
      <form onSubmit={handleAdd} className="flex gap-2 pt-1">
        <input
          type="text"
          placeholder="+ Yeni günlük rutin ekle (Örn: Günlük 20 Paragraf sorusu)..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
        />
        <button type="submit" className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-black hover:bg-rose-600 transition-all shrink-0 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Ekle
        </button>
      </form>
    </div>
  );
}

/* ─── ⚡ HAFTALIK HEDEF ALIŞKANLIK & SERİ TAKİBİ COMPONENT ─── */
function WeeklyHabitStreakSection({ items, onToggleWeek, onAddItem, onDeleteItem }) {
  const [newText, setNewText] = useState('');

  // Calculate global weekly streak (Count completed weeks)
  const totalWeeksCompleted = useMemo(() => {
    let count = 0;
    MONTH_WEEKS.forEach(w => {
      const allDone = items.length > 0 && items.every(i => i.weeks?.[w]);
      if (allDone) count++;
    });
    return count;
  }, [items]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newText.trim()) {
      onAddItem(newText.trim());
      setNewText('');
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-purple-200 dark:border-purple-900/50 p-4 space-y-3 shadow-sm">
      
      {/* Header with Lightning & Weekly Streak Counter */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-wider">
          <Zap className="w-4 h-4 fill-purple-500" /> ⚡ HAFTALIK HEDEF & SERİ TAKİBİ
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[11px] shadow-sm">
            <Trophy className="w-3 h-3 fill-white" /> {totalWeeksCompleted} Haftalık Seri!
          </span>
        </div>
      </div>

      {/* Weekly Habit Items List with 4-Week Matrix */}
      <div className="space-y-3 pt-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium italic py-1">Henüz haftalık hedef maddesi eklenmedi.</p>
        ) : (
          items.map(item => {
            const completedWeeksCount = MONTH_WEEKS.filter(w => item.weeks?.[w]).length;
            const pct = Math.round((completedWeeksCount / 4) * 100);

            return (
              <div key={item.id} className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 space-y-2 group hover:border-purple-300 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-500" />
                    {item.text}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-400">
                      {completedWeeksCount}/4 Hafta (%{pct})
                    </span>
                    <button type="button" onClick={() => onDeleteItem(item.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 4-Week Toggle Buttons Matrix */}
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTH_WEEKS.map(w => {
                    const done = item.weeks?.[w];
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => onToggleWeek(item.id, w)}
                        className={cn(
                          'flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-[10px] font-black transition-all active:scale-95',
                          done
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-purple-300'
                        )}
                      >
                        <span>{w}</span>
                        {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Weekly Goal Form */}
      <form onSubmit={handleAdd} className="flex gap-2 pt-1">
        <input
          type="text"
          placeholder="+ Yeni haftalık hedef ekle (Örn: Haftada 400 soru + 2 deneme)..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
        />
        <button type="submit" className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 transition-all shrink-0 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Ekle
        </button>
      </form>
    </div>
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
        <div className="relative shrink-0">
          <Ring value={pct} size={62} stroke={6} color={done ? '#10b981' : t.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xs font-black', done ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100')}>{pct}%</span>
          </div>
        </div>

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

      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] font-black text-slate-500 dark:text-slate-400">
          <span>İlerleme: <strong className="text-slate-800 dark:text-white">{goal.current || 0}</strong> / {goal.target} {t.unit}</span>
          <span style={{ color: done ? '#10b981' : t.color }}>{goal.target - (goal.current || 0) > 0 ? `${goal.target - (goal.current || 0)} ${t.unit} kaldı` : '🎉 Tamamlandı'}</span>
        </div>
        <BarProgress value={pct} color={done ? '#10b981' : t.color} />
      </div>

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
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function GoalsAndSchedulePage() {
  const { goals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const { users } = useUser();
  const { getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles } = useCoaching();

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 'u1');
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const coachingProfile = useMemo(() => getCoachingProfileForStudent(selectedStudent?.id) || {}, [selectedStudent?.id, coachingProfiles]);

  const [examGoalType, setExamGoalType] = useState(coachingProfile.examGoalType || 'LGS 2026');
  const [targetSchool, setTargetSchool] = useState(coachingProfile.targetSchool || '');
  const [targetScore, setTargetScore] = useState(coachingProfile.targetScore || '485');
  const [targetNet, setTargetNet] = useState(coachingProfile.targetNet || '90');

  // Monthly Goal Items List
  const [monthlyItems, setMonthlyItems] = useState(() => parseCheckableGoalList(coachingProfile.monthlyGoals, [
    { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
    { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
  ]));

  // Weekly Habit Goal Items List with 4-Week Matrix
  const [weeklyHabitItems, setWeeklyHabitItems] = useState(() => parseWeeklyHabitList(coachingProfile.weeklyGoals, [
    { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', weeks: { 'Hafta 1': true, 'Hafta 2': true, 'Hafta 3': true, 'Hafta 4': false } },
    { id: 'w2', text: 'Matematik yeni nesil problem kartları tekrarı', weeks: { 'Hafta 1': true, 'Hafta 2': false, 'Hafta 3': true, 'Hafta 4': false } }
  ]));

  // Daily Routine Habit Items List with 7-Day Matrix
  const [dailyHabitItems, setDailyHabitItems] = useState(() => parseDailyHabitList(coachingProfile.dailyGoals, [
    { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } },
    { id: 'd2', text: 'Günlük 20 Matematik yeni nesil problem', days: { Pzt: true, Sal: true, Çrş: false, Prş: true, Cum: true, Cts: true, Paz: false } }
  ]));

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Filter state for Custom Visual Goals Panel
  const [periodFilter, setPeriodFilter] = useState('Tümü');
  const [typeFilter, setTypeFilter] = useState('Tümü');

  useEffect(() => {
    if (coachingProfile) {
      if (coachingProfile.examGoalType) setExamGoalType(coachingProfile.examGoalType);
      if (coachingProfile.targetSchool) setTargetSchool(coachingProfile.targetSchool);
      if (coachingProfile.targetScore) setTargetScore(coachingProfile.targetScore);
      if (coachingProfile.targetNet) setTargetNet(coachingProfile.targetNet);

      setMonthlyItems(parseCheckableGoalList(coachingProfile.monthlyGoals, [
        { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
        { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
      ]));
      setWeeklyHabitItems(parseWeeklyHabitList(coachingProfile.weeklyGoals, [
        { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', weeks: { 'Hafta 1': true, 'Hafta 2': true, 'Hafta 3': true, 'Hafta 4': false } }
      ]));
      setDailyHabitItems(parseDailyHabitList(coachingProfile.dailyGoals, [
        { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } }
      ]));
    }
  }, [coachingProfile]);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50 });

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => String(g.studentId) === String(selectedStudent.id));
  }, [goals, selectedStudent]);

  const filteredVisualGoals = useMemo(() => {
    return studentGoals.filter(g => {
      const matchPeriod = periodFilter === 'Tümü' || g.period === periodFilter;
      const matchType = typeFilter === 'Tümü' || g.type === typeFilter;
      return matchPeriod && matchType;
    });
  }, [studentGoals, periodFilter, typeFilter]);

  const totalQuestionSolved = useMemo(() => studentGoals.filter(g => g.type === 'Soru').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);
  const totalPagesRead = useMemo(() => studentGoals.filter(g => g.type === 'Sayfa').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);
  const totalTopicsCompleted = useMemo(() => studentGoals.filter(g => g.type === 'Konu').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);
  const totalMinutesStudied = useMemo(() => studentGoals.filter(g => g.type === 'Dakika').reduce((acc, g) => acc + (g.current || 0), 0), [studentGoals]);

  const saveAllProfilesWithLists = async (mList, wList, dList) => {
    await saveCoachingProfile({
      ...coachingProfile,
      studentId: selectedStudent.id,
      examGoalType,
      targetSchool,
      targetScore,
      targetNet: Number(targetNet) || 0,
      monthlyGoals: mList,
      weeklyGoals: wList,
      dailyGoals: dList
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  // Handlers for Monthly Items
  const handleToggleMonthlyItem = (id) => {
    const next = monthlyItems.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setMonthlyItems(next);
    saveAllProfilesWithLists(next, weeklyHabitItems, dailyHabitItems);
  };
  const handleAddMonthlyItem = (text) => {
    const next = [...monthlyItems, { id: `m_${Date.now()}`, text, done: false }];
    setMonthlyItems(next);
    saveAllProfilesWithLists(next, weeklyHabitItems, dailyHabitItems);
  };
  const handleDeleteMonthlyItem = (id) => {
    const next = monthlyItems.filter(i => i.id !== id);
    setMonthlyItems(next);
    saveAllProfilesWithLists(next, weeklyHabitItems, dailyHabitItems);
  };

  // Handlers for Weekly Habit Matrix Items
  const handleToggleWeeklyMatrixDay = (id, weekKey) => {
    const next = weeklyHabitItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          weeks: {
            ...item.weeks,
            [weekKey]: !item.weeks?.[weekKey]
          }
        };
      }
      return item;
    });
    setWeeklyHabitItems(next);
    saveAllProfilesWithLists(monthlyItems, next, dailyHabitItems);
  };
  const handleAddWeeklyHabitItem = (text) => {
    const next = [...weeklyHabitItems, { id: `w_${Date.now()}`, text, weeks: { 'Hafta 1': false, 'Hafta 2': false, 'Hafta 3': false, 'Hafta 4': false } }];
    setWeeklyHabitItems(next);
    saveAllProfilesWithLists(monthlyItems, next, dailyHabitItems);
  };
  const handleDeleteWeeklyHabitItem = (id) => {
    const next = weeklyHabitItems.filter(i => i.id !== id);
    setWeeklyHabitItems(next);
    saveAllProfilesWithLists(monthlyItems, next, dailyHabitItems);
  };

  // Handlers for Daily Habit Matrix Items
  const handleToggleDailyMatrixDay = (id, dayKey) => {
    const next = dailyHabitItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          days: {
            ...item.days,
            [dayKey]: !item.days?.[dayKey]
          }
        };
      }
      return item;
    });
    setDailyHabitItems(next);
    saveAllProfilesWithLists(monthlyItems, weeklyHabitItems, next);
  };
  const handleAddDailyHabitItem = (text) => {
    const next = [...dailyHabitItems, { id: `d_${Date.now()}`, text, days: { Pzt: false, Sal: false, Çrş: false, Prş: false, Cum: false, Cts: false, Paz: false } }];
    setDailyHabitItems(next);
    saveAllProfilesWithLists(monthlyItems, weeklyHabitItems, next);
  };
  const handleDeleteDailyHabitItem = (id) => {
    const next = dailyHabitItems.filter(i => i.id !== id);
    setDailyHabitItems(next);
    saveAllProfilesWithLists(monthlyItems, weeklyHabitItems, next);
  };

  const handleSaveAllCoachingGoals = (e) => {
    if (e) e.preventDefault();
    saveAllProfilesWithLists(monthlyItems, weeklyHabitItems, dailyHabitItems);
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
            Öğrenci Özel Hedefler & Canlı Alışkanlık / Seri Takip Paneli
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Günlük & Haftalık Seri Takibi (Flame Streak Tracker) ve 7-Günlük Alışkanlık Matrisi</p>
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
          <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400">🔄 1-e-1 Birebir Alışkanlık & Seri Takip Senkronizasyonu</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Günlük (Pzt-Paz) ve Haftalık (1.Hafta-4.Hafta) seri takibi Öğrenci ve Koçluk panelleri arasında anlık senkronize çalışır.
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
        
        {/* LEFT COLUMN: 🏛️ UZUN VADELİ + ORTA VADELİ + GÜNLÜK & HAFTALIK ALIŞKANLIK & SERİ TAKİBİ */}
        <div className="lg:col-span-6 space-y-5">
          
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              1. Akademik Yapı & Seri Takip Matrisi
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

          {/* ORTA VADELİ HEDEFLER (AYLIK KAZANIMLAR CHECKLIST) */}
          <MonthlyChecklistSection
            title="📅 ORTA VADELİ HEDEFLER (AYLIK)"
            icon={Trophy}
            colorClass="text-indigo-600 dark:text-indigo-400"
            badgeText="Aylık Kazanımlar"
            items={monthlyItems}
            onToggleItem={handleToggleMonthlyItem}
            onAddItem={handleAddMonthlyItem}
            onDeleteItem={handleDeleteMonthlyItem}
          />

          {/* ⚡ HAFTALIK HEDEF ALIŞKANLIK & SERİ TAKİBİ (4-WEEK MATRIX) */}
          <WeeklyHabitStreakSection
            items={weeklyHabitItems}
            onToggleWeek={handleToggleWeeklyMatrixDay}
            onAddItem={handleAddWeeklyHabitItem}
            onDeleteItem={handleDeleteWeeklyHabitItem}
          />

          {/* 🔥 GÜNLÜK RUTİN ALIŞKANLIK & SERİ TAKİBİ (7-DAY MATRIX) */}
          <DailyHabitStreakSection
            items={dailyHabitItems}
            onToggleDay={handleToggleDailyMatrixDay}
            onAddItem={handleAddDailyHabitItem}
            onDeleteItem={handleDeleteDailyHabitItem}
          />

          <div className="flex items-center justify-between pt-1">
            {isSavedNotice ? (
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Tüm Hedefler & Seri Takibi Kaydedildi!
              </span>
            ) : <span />}
            <button
              onClick={handleSaveAllCoachingGoals}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all ml-auto"
            >
              <Save className="w-4 h-4" /> Tüm Seri & Hedefleri Kaydet
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
