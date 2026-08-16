import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoal } from '../context/GoalContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Target, Plus, X, CalendarClock, CheckCircle2, BookOpen,
  Timer, Flame, Trophy, ChevronRight, ChevronDown,
  Clock, Trash2, GraduationCap, Check, Sparkles, TrendingUp, Save, RefreshCw,
  Brain, BookOpenCheck, BarChart3, Layers, CheckSquare, Square, Repeat, Zap, Award, ArrowLeft
} from 'lucide-react';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const WEEK_DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const MONTH_WEEKS = ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'];

const GOAL_TYPE_CONFIG = {
  Soru:   { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)',    light: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.35)', icon: Target,      unit: 'soru'  },
  Sayfa:  { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)',   light: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', icon: BookOpen,    unit: 'sayfa' },
  Konu:   { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.2)', light: 'rgba(192, 132, 252, 0.15)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.35)', icon: Brain,       unit: 'konu'  },
  Dakika: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.2)',  light: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: 'rgba(52, 211, 153, 0.35)', icon: Timer,       unit: 'dk'    },
  Net:    { color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.2)',   light: 'rgba(34, 211, 238, 0.15)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.35)', icon: TrendingUp, unit: 'net'   },
  Puan:   { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)',   light: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.35)', icon: Trophy,     unit: 'puan'  },
};

const PERIOD_CONFIG = {
  'Günlük':     { icon: Flame,        badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
  'Haftalık':   { icon: CalendarClock,badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  'Aylık':      { icon: Trophy,       badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' },
  'Uzun Vadeli':{ icon: GraduationCap,badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
};

/* ─── Mini progress bar ─── */
function BarProgress({ value, color }) {
  return (
    <div style={{ width: '100%', height: 7, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 99, transition: 'all 0.6s ease', width: `${Math.min(100, Math.max(0, value))}%`, background: color || 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
    </div>
  );
}

/* ─── Ring SVG ─── */
function Ring({ value, size = 64, stroke = 6, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(100, Math.max(0, value))) / 100;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
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

/* ─── Collapsible Monthly Goal Checklist ─── */
function MonthlyChecklistSection({ title, icon: Icon, colorClass, badgeText, items, onToggleItem, onAddItem, onDeleteItem }) {
  const [isOpen, setIsOpen] = useState(false);
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
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
      border: '1.5px solid rgba(255, 255, 255, 0.14)',
      borderRadius: '1.25rem',
      padding: '1.1rem',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#818cf8' }}>
          {isOpen ? <ChevronDown size={18} color="#a5b4fc" /> : <ChevronRight size={18} color="#a5b4fc" />}
          <Icon size={18} /> {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.6)' }}>
            {completedCount}/{totalCount} Tamamlandı (%{pct})
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', border: '1px solid rgba(165, 180, 252, 0.3)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
            {badgeText}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          {totalCount > 0 && <BarProgress value={pct} color={pct === 100 ? '#34d399' : '#818cf8'} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem' }}>
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => onToggleItem(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.85rem',
                  background: item.done ? 'rgba(5, 150, 105, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: item.done ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                  <button
                    type="button"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: item.done ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: item.done ? '#10b981' : 'transparent',
                      color: 'white',
                      flexShrink: 0,
                      cursor: 'pointer'
                    }}
                  >
                    {item.done && <Check size={14} strokeWidth={3} />}
                  </button>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.done ? '#6ee7b7' : '#f8fafc', textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.3 }}>
                    {item.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, cursor: 'pointer', borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
            <input
              type="text"
              placeholder="+ Yeni aylık hedef maddesi..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
            />
            <button
              type="submit"
              style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
            >
              <Plus size={14} /> Ekle
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ─── 🔥 GÜNLÜK RUTİN ALIŞKANLIK & SERİ TAKİBİ COMPONENT ─── */
function DailyHabitStreakSection({ items, onToggleDay, onAddItem, onDeleteItem }) {
  const [newText, setNewText] = useState('');

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
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
      border: '1.5px solid rgba(244, 63, 94, 0.35)',
      borderRadius: '1.25rem',
      padding: '1.1rem',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fb7185', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <Flame size={18} className="fill-rose-500 animate-pulse" /> 🔥 GÜNLÜK RUTİN & SERİ TAKİBİ
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'linear-gradient(135deg, #f59e0b, #f43f5e)', color: 'white', fontWeight: 900, fontSize: '0.72rem', boxShadow: '0 2px 10px rgba(244,63,94,0.4)' }}>
            <Flame size={12} className="fill-white" /> {totalDaysCompleted} Günlük Seri!
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.25rem' }}>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>Henüz günlük rutin maddesi eklenmedi.</p>
        ) : (
          items.map(item => {
            const completedDaysCount = WEEK_DAYS.filter(d => item.days?.[d]).length;
            const pct = Math.round((completedDaysCount / 7) * 100);

            return (
              <div key={item.id} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1rem', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#fbbf24" />
                    {item.text}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                      {completedDaysCount}/7 Gün (%{pct})
                    </span>
                    <button type="button" onClick={() => onDeleteItem(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {WEEK_DAYS.map(day => {
                    const done = item.days?.[day];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onToggleDay(item.id, day)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.4rem 0.2rem',
                          borderRadius: '0.65rem',
                          border: done ? '1.5px solid #f43f5e' : '1px solid rgba(255,255,255,0.12)',
                          background: done ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'rgba(255,255,255,0.06)',
                          color: done ? 'white' : 'rgba(255,255,255,0.7)',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: done ? '0 2px 8px rgba(244,63,94,0.35)' : 'none'
                        }}
                      >
                        <span>{day}</span>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'white' : 'rgba(255,255,255,0.15)' }}>
                          {done && <Check size={7} color="#f43f5e" strokeWidth={4} />}
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

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
        <input
          type="text"
          placeholder="+ Yeni günlük rutin ekle (Örn: Günlük 20 Paragraf sorusu)..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
        />
        <button
          type="submit"
          style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(244,63,94,0.35)' }}
        >
          <Plus size={14} /> Ekle
        </button>
      </form>
    </div>
  );
}

/* ─── ⚡ HAFTALIK HEDEF ALIŞKANLIK & SERİ TAKİBİ COMPONENT ─── */
function WeeklyHabitStreakSection({ items, onToggleWeek, onAddItem, onDeleteItem }) {
  const [newText, setNewText] = useState('');

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
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
      border: '1.5px solid rgba(168, 85, 247, 0.35)',
      borderRadius: '1.25rem',
      padding: '1.1rem',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <Zap size={18} className="fill-purple-500" /> ⚡ HAFTALIK HEDEF & SERİ TAKİBİ
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: 'white', fontWeight: 900, fontSize: '0.72rem', boxShadow: '0 2px 10px rgba(124,58,237,0.4)' }}>
            <Trophy size={12} className="fill-white" /> {totalWeeksCompleted} Haftalık Seri!
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.25rem' }}>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>Henüz haftalık hedef maddesi eklenmedi.</p>
        ) : (
          items.map(item => {
            const completedWeeksCount = MONTH_WEEKS.filter(w => item.weeks?.[w]).length;
            const pct = Math.round((completedWeeksCount / 4) * 100);

            return (
              <div key={item.id} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1rem', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={14} color="#a855f7" />
                    {item.text}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                      {completedWeeksCount}/4 Hafta (%{pct})
                    </span>
                    <button type="button" onClick={() => onDeleteItem(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {MONTH_WEEKS.map(w => {
                    const done = item.weeks?.[w];
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => onToggleWeek(item.id, w)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          padding: '0.45rem 0.5rem',
                          borderRadius: '0.65rem',
                          border: done ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.12)',
                          background: done ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'rgba(255,255,255,0.06)',
                          color: done ? 'white' : 'rgba(255,255,255,0.7)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: done ? '0 2px 8px rgba(168,85,247,0.35)' : 'none'
                        }}
                      >
                        <span>{w}</span>
                        {done && <Check size={12} color="white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
        <input
          type="text"
          placeholder="+ Yeni haftalık hedef ekle (Örn: Haftada 400 soru + 2 deneme)..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
        />
        <button
          type="submit"
          style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
        >
          <Plus size={14} /> Ekle
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
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
      border: done ? '1.5px solid rgba(52, 211, 153, 0.5)' : '1.5px solid rgba(255, 255, 255, 0.14)',
      borderRadius: '1.25rem',
      padding: '1rem',
      boxShadow: done ? '0 12px 36px rgba(16,185,129,0.2)' : '0 12px 36px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      transition: 'all 0.2s ease'
    }}>
      {done && (
        <div style={{ position: 'absolute', top: 12, right: 38, display: 'flex', alignItems: 'center', gap: 3, background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(16,185,129,0.4)' }}>
          <CheckCircle2 size={11} /> Tamam!
        </div>
      )}
      <button
        onClick={() => onDelete(goal.id)}
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
      >
        <Trash2 size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Ring value={pct} size={62} stroke={6} color={done ? '#34d399' : t.color} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: done ? '#4ade80' : '#ffffff' }}>{pct}%</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', p.badge)}>
              <PIcon className="w-2.5 h-2.5" /> {goal.period}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 8px', borderRadius: 99, background: t.bg, color: t.text, border: `1px solid ${t.border}` }}>
              <TIcon className="w-2.5 h-2.5" /> {goal.type}
            </span>
          </div>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3, margin: 0 }}>{goal.title}</h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>
          <span>İlerleme: <strong style={{ color: '#ffffff' }}>{goal.current || 0}</strong> / {goal.target} {t.unit}</span>
          <span style={{ color: done ? '#4ade80' : t.text }}>{goal.target - (goal.current || 0) > 0 ? `${goal.target - (goal.current || 0)} ${t.unit} kaldı` : '🎉 Tamamlandı'}</span>
        </div>
        <BarProgress value={pct} color={done ? '#34d399' : t.color} />
      </div>

      {!done && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: 2 }}>
          <button
            type="button"
            onClick={() => onAddProgress(goal.id, quickIncrementStep)}
            style={{ padding: '0.4rem 0.65rem', borderRadius: '0.65rem', background: t.light, color: t.text, border: `1px solid ${t.border}`, fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
          >
            +{quickIncrementStep} {t.unit}
          </button>

          <form onSubmit={handleAdd} style={{ flex: 1, display: 'flex', gap: 4 }}>
            <input
              type="number"
              min="1"
              placeholder={`Özel (${t.unit})`}
              value={adding}
              onChange={e => setAdding(e.target.value)}
              style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.75rem', outline: 'none' }}
            />
            <button
              type="submit"
              style={{ padding: '0.4rem 0.75rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
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
  const navigate = useNavigate();
  const { goals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles } = useCoaching();

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const defaultStudentId = currentUser?.role === 'student' ? currentUser?.id : (students[0]?.id || 'u1');
  const [selectedStudentId, setSelectedStudentId] = useState(defaultStudentId);
  const selectedStudent = students.find(s => s.id === selectedStudentId) || (currentUser?.role === 'student' ? currentUser : students[0]);

  const coachingProfile = useMemo(() => getCoachingProfileForStudent(selectedStudent?.id) || {}, [selectedStudent?.id, coachingProfiles]);

  // Collapsible Accordion States (Closed by default)
  const [isLongTermOpen, setIsLongTermOpen] = useState(false);
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);

  const [examGoalType, setExamGoalType] = useState(coachingProfile.examGoalType || coachingProfile.goals?.examGoalType || 'LGS 2026');
  const [customExamName, setCustomExamName] = useState(coachingProfile.customExamName || coachingProfile.goals?.customExamName || '');
  const [targetSchool, setTargetSchool] = useState(coachingProfile.targetSchool || coachingProfile.goals?.targetSchool || '');
  const [targetScore, setTargetScore] = useState(coachingProfile.targetScore || coachingProfile.goals?.targetScore || '485');
  const [targetNet, setTargetNet] = useState(coachingProfile.targetNet !== undefined ? String(coachingProfile.targetNet) : (coachingProfile.goals?.targetNet || '90'));
  const [gradeClass, setGradeClass] = useState(coachingProfile.gradeClass || coachingProfile.goals?.gradeClass || '');
  const [gradeTerm, setGradeTerm] = useState(coachingProfile.gradeTerm || coachingProfile.goals?.gradeTerm || '1');
  const [gradeTarget, setGradeTarget] = useState(coachingProfile.gradeTarget || coachingProfile.goals?.gradeTarget || 'Takçek');

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
      const g = coachingProfile.goals || {};
      const eType = coachingProfile.examGoalType || g.examGoalType || 'LGS 2026';
      setExamGoalType(eType === 'Ara Sınıf Başarı' ? 'Ara Sınıf Takip & Takdir Hedefi' : eType);
      setCustomExamName(coachingProfile.customExamName || g.customExamName || '');
      setTargetSchool(coachingProfile.targetSchool || g.targetSchool || '');
      setTargetScore(coachingProfile.targetScore || g.targetScore || '');
      setTargetNet(coachingProfile.targetNet !== undefined ? String(coachingProfile.targetNet) : (g.targetNet || ''));
      setGradeClass(coachingProfile.gradeClass || g.gradeClass || '');
      setGradeTerm(coachingProfile.gradeTerm || g.gradeTerm || '1');
      setGradeTarget(coachingProfile.gradeTarget || g.gradeTarget || 'Takçek');

      if (coachingProfile.monthlyGoals) {
        setMonthlyItems(parseCheckableGoalList(coachingProfile.monthlyGoals, []));
      }
      if (coachingProfile.weeklyGoals) {
        setWeeklyHabitItems(parseWeeklyHabitList(coachingProfile.weeklyGoals, []));
      }
      if (coachingProfile.dailyGoals) {
        setDailyHabitItems(parseDailyHabitList(coachingProfile.dailyGoals, []));
      }
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

  const saveAllProfilesWithLists = async (mList, wList, dList, overrides = {}) => {
    const nextExam = overrides.examGoalType !== undefined ? overrides.examGoalType : examGoalType;
    const nextCustomExam = overrides.customExamName !== undefined ? overrides.customExamName : customExamName;
    const nextSchool = overrides.targetSchool !== undefined ? overrides.targetSchool : targetSchool;
    const nextScore = overrides.targetScore !== undefined ? overrides.targetScore : targetScore;
    const nextNet = overrides.targetNet !== undefined ? overrides.targetNet : targetNet;
    const nextClass = overrides.gradeClass !== undefined ? overrides.gradeClass : gradeClass;
    const nextTerm = overrides.gradeTerm !== undefined ? overrides.gradeTerm : gradeTerm;
    const nextTarget = overrides.gradeTarget !== undefined ? overrides.gradeTarget : gradeTarget;

    const m = mList !== undefined ? mList : monthlyItems;
    const w = wList !== undefined ? wList : weeklyHabitItems;
    const d = dList !== undefined ? dList : dailyHabitItems;

    const updatedGoals = {
      ...(coachingProfile.goals || {}),
      examGoalType: nextExam,
      customExamName: nextCustomExam,
      targetSchool: nextSchool,
      targetScore: nextScore,
      targetNet: nextExam === 'Ara Sınıf Takip & Takdir Hedefi' ? 0 : (Number(nextNet) || 0),
      gradeClass: nextClass,
      gradeTerm: nextTerm,
      gradeTarget: nextTarget,
      monthlyGoals: m,
      weeklyGoals: w,
      dailyGoals: d,
    };

    await saveCoachingProfile({
      ...coachingProfile,
      studentId: selectedStudent?.id,
      examGoalType: nextExam,
      customExamName: nextCustomExam,
      targetSchool: nextSchool,
      targetScore: nextScore,
      targetNet: nextExam === 'Ara Sınıf Takip & Takdir Hedefi' ? 0 : (Number(nextNet) || 0),
      gradeClass: nextClass,
      gradeTerm: nextTerm,
      gradeTarget: nextTarget,
      monthlyGoals: m,
      weeklyGoals: w,
      dailyGoals: d,
      goals: updatedGoals
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
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.22) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.18) 0%, transparent 50%), linear-gradient(180deg, #070a12 0%, #0d1224 35%, #13112c 70%, #070a12 100%)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#f8fafc',
      padding: '1.25rem 1rem',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .goal-anim { animation: fadeIn 0.3s ease both; }
        @media (max-width: 768px) {
          .goal-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 80 }}>
        
        {/* HEADER BAR */}
        <div className="goal-header-wrap goal-anim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
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
              <ArrowLeft size={18} /> Öğrenci Paneli
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #f43f5e, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.15rem', color: 'white', border: '2px solid rgba(255,255,255,0.35)', boxShadow: '0 0 16px rgba(244,63,94,0.4)', flexShrink: 0 }}>
                🎯
              </div>
              <div>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.35rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
                  Hedeflerim & Alışkanlık Takibi
                </h1>
                <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 2 }}>
                  {selectedStudent?.name ? `${selectedStudent.name} için ` : ''}Günlük & Haftalık Seri Takibi (Flame Streak Tracker)
                </div>
              </div>
            </div>
          </div>

          {/* Student Selector (If teacher/admin has multiple students) */}
          {students.length > 1 && currentUser?.role !== 'student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(15,23,42,0.85)', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1.5px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', overflowX: 'auto', maxWidth: '100%' }}>
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.65rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    border: 'none',
                    background: s.id === selectedStudent?.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                    color: s.id === selectedStudent?.id ? 'white' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LIVE SYNC NOTICE BANNER */}
        <div style={{
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(30, 27, 75, 0.5) 100%)',
          border: '1.5px solid rgba(52, 211, 153, 0.35)',
          borderRadius: '1.1rem',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
        }}>
          <RefreshCw size={24} color="#34d399" className="animate-spin" style={{ animationDuration: '6s', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#34d399' }}>🔄 Birebir Alışkanlık & Seri Takip Senkronizasyonu</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 2 }}>
              Günlük (Pzt-Paz) ve Haftalık (1.Hafta-4.Hafta) seri takibi Öğrenci ve Koçluk panelleri arasında anlık senkronize çalışır.
            </div>
          </div>
        </div>

        {/* TOP VISUAL TRACKING STATS BANNER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Çözülen Soru', value: `${totalQuestionSolved} Soru`, icon: Target, color: '#fb7185', border: 'rgba(244,63,94,0.35)', bg: 'rgba(244,63,94,0.15)' },
            { label: 'Kitap Okuma', value: `${totalPagesRead} Sayfa`, icon: BookOpen, color: '#38bdf8', border: 'rgba(56,189,248,0.35)', bg: 'rgba(56,189,248,0.15)' },
            { label: 'Tamamlanan Konu', value: `${totalTopicsCompleted} Konu`, icon: Brain, color: '#c084fc', border: 'rgba(192,132,252,0.35)', bg: 'rgba(192,132,252,0.15)' },
            { label: 'Çalışma Süresi', value: `${totalMinutesStudied} Dk`, icon: Timer, color: '#34d399', border: 'rgba(52,211,153,0.35)', bg: 'rgba(52,211,153,0.15)' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
                border: `1.5px solid ${s.border}`,
                borderRadius: '1.15rem',
                padding: '0.85rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ width: 42, height: 42, borderRadius: '0.85rem', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{s.label}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>{s.value}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: 🏛️ UZUN VADELİ + ORTA VADELİ + GÜNLÜK & HAFTALIK ALIŞKANLIK & SERİ TAKİBİ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <GraduationCap size={20} color="#34d399" />
                1. Akademik Yapı & Seri Takip Matrisi
              </h2>
            </div>

            {/* UZUN VADELİ HEDEFLER (COLLAPSIBLE ACCORDION - CLOSED BY DEFAULT) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '1.25rem',
              padding: '1.1rem',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <button
                type="button"
                onClick={() => setIsLongTermOpen(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.65rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isLongTermOpen ? <ChevronDown size={18} color="#a5b4fc" /> : <ChevronRight size={18} color="#a5b4fc" />}
                  <GraduationCap size={18} /> 🏛️ UZUN VADELİ HEDEFLER
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(5, 150, 105, 0.25)', color: '#6ee7b7', border: '1px solid rgba(52, 211, 153, 0.35)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                  {isLongTermOpen ? 'Açık' : 'Sınav & Okul (Kapalı)'}
                </span>
              </button>

              {isLongTermOpen && (() => {
                const isStandardExam = ['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS', 'Ara Sınıf Takip & Takdir Hedefi'].includes(examGoalType);
                const isGradeTracking = examGoalType === 'Ara Sınıf Takip & Takdir Hedefi';
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', paddingTop: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Sınav / Hedef Türü</label>
                      <select
                        value={isStandardExam ? examGoalType : 'Özel Sınav'}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Özel Sınav') {
                            const customVal = customExamName || '';
                            setExamGoalType('Özel Sınav');
                            saveAllProfilesWithLists(undefined, undefined, undefined, { examGoalType: 'Özel Sınav', customExamName: customVal });
                          } else {
                            setExamGoalType(val);
                            saveAllProfilesWithLists(undefined, undefined, undefined, { examGoalType: val });
                          }
                        }}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="LGS 2026" style={{ background: '#0f172a', color: '#ffffff' }}>🎓 LGS (Liselere Geçiş Sınavı)</option>
                        <option value="YKS (TYT/AYT) 2026" style={{ background: '#0f172a', color: '#ffffff' }}>🏛️ YKS (TYT & AYT Sınavı)</option>
                        <option value="KPSS" style={{ background: '#0f172a', color: '#ffffff' }}>💼 KPSS (Kamu Personeli Seçme Sınavı)</option>
                        <option value="Ara Sınıf Takip & Takdir Hedefi" style={{ background: '#0f172a', color: '#ffffff' }}>📊 Ara Sınıf Takip & Takdir Hedefi</option>
                        <option value="Özel Sınav" style={{ background: '#0f172a', color: '#ffffff' }}>✏️ Özel Sınav (DGS, ALES, BİLSEM...)</option>
                      </select>
                    </div>

                    {(!isStandardExam || examGoalType === 'Özel Sınav') && (
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Özel Sınav Adı</label>
                        <input
                          type="text"
                          placeholder="Örn: DGS, ALES, BİLSEM..."
                          value={customExamName || (examGoalType !== 'Özel Sınav' ? examGoalType : '')}
                          onChange={e => {
                            const val = e.target.value;
                            setCustomExamName(val);
                            saveAllProfilesWithLists(undefined, undefined, undefined, { customExamName: val, examGoalType: val || 'Özel Sınav' });
                          }}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.1)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {isGradeTracking ? (
                      <>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Sınıf / Seviye</label>
                          <select
                            value={gradeClass}
                            onChange={e => {
                              const val = e.target.value;
                              setGradeClass(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { gradeClass: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>— Seçin —</option>
                            {['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf'].map(c => <option key={c} value={c} style={{ background: '#0f172a', color: '#ffffff' }}>{c}</option>)}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Dönem</label>
                          <select
                            value={gradeTerm}
                            onChange={e => {
                              const val = e.target.value;
                              setGradeTerm(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { gradeTerm: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="1" style={{ background: '#0f172a', color: '#ffffff' }}>1. Dönem</option>
                            <option value="2" style={{ background: '#0f172a', color: '#ffffff' }}>2. Dönem</option>
                            <option value="yıllık" style={{ background: '#0f172a', color: '#ffffff' }}>Yıllık</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Hedef Belgem</label>
                          <select
                            value={gradeTarget}
                            onChange={e => {
                              const val = e.target.value;
                              setGradeTarget(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { gradeTarget: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(52,211,153,0.4)', background: 'rgba(5,150,105,0.15)', color: '#6ee7b7', fontSize: '0.82rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="Takçek" style={{ background: '#0f172a', color: '#ffffff' }}>🟢 Takçek (Temel)</option>
                            <option value="Teşekkür" style={{ background: '#0f172a', color: '#ffffff' }}>🧡 Teşekkür (70–84)</option>
                            <option value="Takdir" style={{ background: '#0f172a', color: '#ffffff' }}>🏅 Takdir (85+)</option>
                            <option value="Onur" style={{ background: '#0f172a', color: '#ffffff' }}>⭐ Onur Belgesi (Tüm dersler Takdir)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Devamsızlık Hedefi (Maks Gün)</label>
                          <input
                            type="text"
                            placeholder="Maks. devamsızlık gün sayısı"
                            value={targetScore}
                            onChange={e => {
                              const val = e.target.value;
                              setTargetScore(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { targetScore: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>İstenen Okul & Bölüm</label>
                          <input
                            type="text"
                            placeholder="Örn: Kabataş Erkek Lisesi / Boğaziçi Müh."
                            value={targetSchool}
                            onChange={e => {
                              const val = e.target.value;
                              setTargetSchool(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { targetSchool: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Puan Hedefi</label>
                          <input
                            type="text"
                            placeholder="Örn: 485 Puan"
                            value={targetScore}
                            onChange={e => {
                              const val = e.target.value;
                              setTargetScore(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { targetScore: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>Toplam Net Hedefi</label>
                          <input
                            type="number"
                            placeholder="Örn: 90 Net"
                            value={targetNet}
                            onChange={e => {
                              const val = e.target.value;
                              setTargetNet(val);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { targetNet: val });
                            }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ORTA VADELİ HEDEFLER (AYLIK KAZANIMLAR CHECKLIST - COLLAPSIBLE ACCORDION) */}
            <MonthlyChecklistSection
              title="📅 ORTA VADELİ HEDEFLER (AYLIK)"
              icon={Trophy}
              colorClass="text-indigo-400"
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              {isSavedNotice ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} /> Tüm Hedefler & Seri Takibi Kaydedildi!
                </span>
              ) : <span />}
              <button
                onClick={handleSaveAllCoachingGoals}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.65rem 1.35rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                  transition: 'all 0.2s',
                  marginLeft: 'auto'
                }}
              >
                <Save size={16} /> Tüm Seri & Hedefleri Kaydet
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: 📊 GÖRSEL TAKİP PANOSU (ÖZEL HEDEFLER: SORU, KİTAP, KONU, SÜRE) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <BarChart3 size={20} color="#818cf8" />
                2. Görsel Özel Hedef Takip Panosu
              </h2>
              <button
                onClick={() => setShowGoalModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0.45rem 0.95rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  boxShadow: '0 4px 14px rgba(244,63,94,0.35)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> + Özel Hedef Ekle
              </button>
            </div>

            {/* FILTER TABS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(15,23,42,0.85)', padding: '0.3rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)', flexShrink: 0, backdropFilter: 'blur(10px)' }}>
                {['Tümü', 'Günlük', 'Haftalık', 'Aylık'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodFilter(p)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: 'none',
                      background: periodFilter === p ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: periodFilter === p ? 'white' : 'rgba(255,255,255,0.65)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(15,23,42,0.85)', padding: '0.3rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)', flexShrink: 0, backdropFilter: 'blur(10px)' }}>
                {['Tümü', 'Soru', 'Sayfa', 'Konu', 'Dakika'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: 'none',
                      background: typeFilter === t ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'transparent',
                      color: typeFilter === t ? 'white' : 'rgba(255,255,255,0.65)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* VISUAL CARDS GRID */}
            {filteredVisualGoals.length === 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
                border: '1.5px dashed rgba(255,255,255,0.2)',
                borderRadius: '1.25rem',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                backdropFilter: 'blur(16px)'
              }}>
                <div style={{ width: 56, height: 56, borderRadius: '1rem', background: 'rgba(244,63,94,0.15)', color: '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={28} />
                </div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Seçilen Kriterlere Uygun Özel Hedef Bulunmuyor</h3>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', maxWidth: 300, margin: 0, lineHeight: 1.4 }}>
                  Günlük soru çözme, kitap okuma, konu tamamlama veya süre hedefleri ekleyerek görsel takibinizi başlatın!
                </p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.25rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', color: 'white', border: 'none', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 16px rgba(244,63,94,0.35)' }}
                >
                  <Plus size={16} /> Yeni Özel Hedef Tanımla
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
              borderRadius: '1.5rem',
              padding: '1.5rem',
              width: '100%',
              maxWidth: 440,
              border: '1.5px solid rgba(255,255,255,0.18)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={22} color="#fb7185" />
                  <h3 style={{ fontWeight: 900, color: '#ffffff', fontSize: '1.05rem', margin: 0 }}>Yeni Özel Hedef Tanımla</h3>
                </div>
                <button onClick={() => setShowGoalModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Hedef Tanımı / Başlığı</label>
                  <input
                    type="text"
                    placeholder="Örn: Günlük 30 Paragraf Sorusu / 50 Sayfa Kitap"
                    value={newGoal.title}
                    onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Hedef Türü</label>
                    <select
                      value={newGoal.type}
                      onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.08)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Soru" style={{ background: '#0f172a', color: '#ffffff' }}>🎯 Soru Çözme</option>
                      <option value="Sayfa" style={{ background: '#0f172a', color: '#ffffff' }}>📖 Kitap Okuma</option>
                      <option value="Konu" style={{ background: '#0f172a', color: '#ffffff' }}>🧠 Konu Tamamlama</option>
                      <option value="Dakika" style={{ background: '#0f172a', color: '#ffffff' }}>⏱️ Çalışma Süresi (dk)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Periyot</label>
                    <select
                      value={newGoal.period}
                      onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.08)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Günlük" style={{ background: '#0f172a', color: '#ffffff' }}>⚡ Günlük</option>
                      <option value="Haftalık" style={{ background: '#0f172a', color: '#ffffff' }}>📅 Haftalık</option>
                      <option value="Aylık" style={{ background: '#0f172a', color: '#ffffff' }}>🏆 Aylık</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Hedef Miktar</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Örn: 50"
                    value={newGoal.target}
                    onChange={e => setNewGoal(p => ({ ...p, target: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowGoalModal(false)} style={{ padding: '0.65rem 1.1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>İptal</button>
                  <button type="submit" style={{ padding: '0.65rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.4)' }}>Hedef Ekle</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
