import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoal } from '../context/GoalContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { toUUID } from '../services/supabaseService';
import {
  Target, Plus, X, CalendarClock, CheckCircle2, BookOpen,
  Timer, Flame, Trophy, ChevronRight, ChevronDown,
  Trash2, GraduationCap, Check, Sparkles, TrendingUp, Save, RefreshCw,
  Brain, Award, ArrowLeft, Calendar, Zap, Compass, CheckCircle, BarChart3
} from 'lucide-react';

const WEEK_DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const MONTH_WEEKS = ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'];

const GOAL_TYPE_CONFIG = {
  Soru:   { color: '#e11d48', bg: '#ffe4e6', light: '#fff1f2', text: '#be123c', border: '#fecdd3', icon: Target,      unit: 'soru'  },
  Sayfa:  { color: '#0284c7', bg: '#e0f2fe', light: '#f0f9ff', text: '#0369a1', border: '#bae6fd', icon: BookOpen,    unit: 'sayfa' },
  Konu:   { color: '#7c3aed', bg: '#f3e8ff', light: '#faf5ff', text: '#6d28d9', border: '#e9d5ff', icon: Brain,       unit: 'konu'  },
  Dakika: { color: '#059669', bg: '#d1fae5', light: '#ecfdf5', text: '#047857', border: '#a7f3d0', icon: Timer,       unit: 'dk'    },
  Net:    { color: '#0891b2', bg: '#cffafe', light: '#ecfeff', text: '#0e7490', border: '#a5f3fc', icon: TrendingUp, unit: 'net'   },
  Puan:   { color: '#d97706', bg: '#fef3c7', light: '#fffbeb', text: '#b45309', border: '#fde68a', icon: Trophy,     unit: 'puan'  },
};

const PERIOD_CONFIG = {
  'Günlük':     { icon: Flame,        badgeBg: '#ffe4e6', badgeText: '#e11d48', border: '#fecdd3' },
  'Haftalık':   { icon: CalendarClock,badgeBg: '#f3e8ff', badgeText: '#7c3aed', border: '#e9d5ff' },
  'Aylık':      { icon: Trophy,       badgeBg: '#e0e7ff', badgeText: '#4338ca', border: '#c7d2fe' },
  'Uzun Vadeli':{ icon: GraduationCap,badgeBg: '#d1fae5', badgeText: '#047857', border: '#a7f3d0' },
};

/* ─── Mini Progress Bar ─── */
function BarProgress({ value, color }) {
  return (
    <div style={{ width: '100%', height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        borderRadius: 99,
        transition: 'all 0.5s ease',
        width: `${Math.min(100, Math.max(0, value))}%`,
        background: color || 'linear-gradient(90deg, #4f46e5, #7c3aed)'
      }} />
    </div>
  );
}

/* ─── Ring SVG ─── */
function Ring({ value, size = 60, stroke = 5, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(100, Math.max(0, value))) / 100;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

/* ─── Parsers ─── */
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

export const parseDailyHabitList = (val, defaultItems = []) => {
  if (Array.isArray(val) && val.length > 0) {
    return val.map(item => ({
      id: item.id || `d_${Math.random()}`,
      text: typeof item === 'string' ? item : item.text || '',
      days: item.days || { Pzt: false, Sal: false, Çrş: false, Prş: false, Cum: false, Cts: false, Paz: false }
    }));
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').filter(Boolean).map((line, i) => ({
      id: `dh_${i}_${Date.now()}`,
      text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
      days: { Pzt: i % 2 === 0, Sal: true, Çrş: false, Prş: false, Cum: true, Cts: false, Paz: false }
    }));
  }
  return defaultItems;
};

export const parseWeeklyHabitList = (val, defaultItems = []) => {
  if (Array.isArray(val) && val.length > 0) {
    return val.map(item => ({
      id: item.id || `w_${Math.random()}`,
      text: typeof item === 'string' ? item : item.text || '',
      weeks: item.weeks || { 'Hafta 1': false, 'Hafta 2': false, 'Hafta 3': false, 'Hafta 4': false }
    }));
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').filter(Boolean).map((line, i) => ({
      id: `wh_${i}_${Date.now()}`,
      text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
      weeks: { 'Hafta 1': true, 'Hafta 2': false, 'Hafta 3': false, 'Hafta 4': false }
    }));
  }
  return defaultItems;
};

/* ─── 1. GÜNLÜK RUTİN ALIŞKANLIK & SERİ TAKİBİ ─── */
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
      background: '#ffffff',
      border: '1.5px solid #e2e8f0',
      borderRadius: '1.25rem',
      padding: '1.25rem',
      boxShadow: '0 4px 20px rgba(100, 116, 139, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e11d48', fontWeight: 900, fontSize: '0.9rem' }}>
          <Flame size={20} color="#e11d48" /> 🔥 Günlük Rutinler & Seri Takibi (Pzt–Paz)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.8rem', borderRadius: 99, background: '#fff1f2', color: '#e11d48', fontWeight: 900, fontSize: '0.75rem', border: '1px solid #fecdd3' }}>
            <Flame size={13} color="#e11d48" /> {totalDaysCompleted} Günlük Tam Seri
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
            Henüz günlük rutin eklenmedi. Aşağıdan hemen ekleyin!
          </p>
        ) : (
          items.map(item => {
            const completedDaysCount = WEEK_DAYS.filter(d => item.days?.[d]).length;
            const pct = Math.round((completedDaysCount / 7) * 100);

            return (
              <div key={item.id} style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#f59e0b" />
                    {item.text}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: completedDaysCount === 7 ? '#16a34a' : '#64748b' }}>
                      {completedDaysCount}/7 Gün (%{pct})
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                      title="Rutini Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 7-Day Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
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
                          padding: '0.5rem 0.2rem',
                          borderRadius: '0.75rem',
                          border: done ? '1.5px solid #f43f5e' : '1px solid #cbd5e1',
                          background: done ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : '#ffffff',
                          color: done ? '#ffffff' : '#475569',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: done ? '0 3px 10px rgba(244,63,94,0.3)' : '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <span>{day}</span>
                        <div style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          marginTop: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: done ? '#ffffff' : '#f1f5f9'
                        }}>
                          {done ? <Check size={9} color="#e11d48" strokeWidth={4} /> : null}
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
          style={{
            flex: 1,
            padding: '0.65rem 0.95rem',
            borderRadius: '0.85rem',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
            border: 'none',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 3px 10px rgba(244,63,94,0.3)'
          }}
        >
          <Plus size={16} /> Ekle
        </button>
      </form>
    </div>
  );
}

/* ─── 2. HAFTALIK HEDEF ALIŞKANLIK & SERİ TAKİBİ (4-WEEK MATRIX) ─── */
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
      background: '#ffffff',
      border: '1.5px solid #e2e8f0',
      borderRadius: '1.25rem',
      padding: '1.25rem',
      boxShadow: '0 4px 20px rgba(100, 116, 139, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7c3aed', fontWeight: 900, fontSize: '0.9rem' }}>
          <Zap size={20} color="#7c3aed" /> ⚡ Haftalık Hedefler & Ay İçi Takip (1–4. Hafta)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.8rem', borderRadius: 99, background: '#f3e8ff', color: '#7c3aed', fontWeight: 900, fontSize: '0.75rem', border: '1px solid #e9d5ff' }}>
            <Trophy size={13} color="#7c3aed" /> {totalWeeksCompleted} Hafta Tamamlandı
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
            Henüz haftalık hedef eklenmedi.
          </p>
        ) : (
          items.map(item => {
            const completedWeeksCount = MONTH_WEEKS.filter(w => item.weeks?.[w]).length;
            const pct = Math.round((completedWeeksCount / 4) * 100);

            return (
              <div key={item.id} style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={15} color="#7c3aed" />
                    {item.text}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: completedWeeksCount === 4 ? '#16a34a' : '#64748b' }}>
                      {completedWeeksCount}/4 Hafta (%{pct})
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
                          gap: 5,
                          padding: '0.55rem 0.5rem',
                          borderRadius: '0.75rem',
                          border: done ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          background: done ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#ffffff',
                          color: done ? '#ffffff' : '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: done ? '0 3px 10px rgba(124,58,237,0.3)' : 'none'
                        }}
                      >
                        <span>{w}</span>
                        {done && <Check size={13} color="#ffffff" strokeWidth={3} />}
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
          style={{
            flex: 1,
            padding: '0.65rem 0.95rem',
            borderRadius: '0.85rem',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            border: 'none',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 3px 10px rgba(124,58,237,0.3)'
          }}
        >
          <Plus size={16} /> Ekle
        </button>
      </form>
    </div>
  );
}

/* ─── 3. ORTA VADELİ AYLIK KAZANIMLAR CHECKLIST ─── */
function MonthlyChecklistSection({ items, onToggleItem, onAddItem, onDeleteItem }) {
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
      background: '#ffffff',
      border: '1.5px solid #e2e8f0',
      borderRadius: '1.25rem',
      padding: '1.25rem',
      boxShadow: '0 4px 20px rgba(100, 116, 139, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '0.9rem', color: '#4338ca' }}>
          <Trophy size={20} color="#4f46e5" /> 📅 Bu Ayın Ana Kazanımları & Hedef Listesi
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 900, background: '#e0e7ff', color: '#4338ca', padding: '0.3rem 0.8rem', borderRadius: 99, border: '1px solid #c7d2fe' }}>
          {completedCount}/{totalCount} Tamamlandı (%{pct})
        </span>
      </div>

      {totalCount > 0 && <BarProgress value={pct} color={pct === 100 ? '#16a34a' : '#4f46e5'} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '0.75rem 0' }}>
            Henüz aylık hedef maddesi eklenmedi.
          </p>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => onToggleItem(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '0.85rem',
                background: item.done ? '#f0fdf4' : '#f8fafc',
                border: item.done ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: item.done ? 'none' : '1.5px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: item.done ? '#16a34a' : '#ffffff',
                    color: 'white',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                >
                  {item.done && <Check size={13} strokeWidth={3} />}
                </button>
                <span style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: item.done ? '#166534' : '#0f172a',
                  textDecoration: item.done ? 'line-through' : 'none',
                  lineHeight: 1.3
                }}>
                  {item.text}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 4, cursor: 'pointer' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
        <input
          type="text"
          placeholder="+ Yeni aylık hedef maddesi ekle..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          style={{
            flex: 1,
            padding: '0.65rem 0.95rem',
            borderRadius: '0.85rem',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            border: 'none',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 3px 10px rgba(79,70,229,0.3)'
          }}
        >
          <Plus size={16} /> Ekle
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
      background: '#ffffff',
      border: done ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
      borderRadius: '1.25rem',
      padding: '1.15rem',
      boxShadow: '0 4px 16px rgba(100, 116, 139, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      transition: 'all 0.15s ease'
    }}>
      {done && (
        <div style={{ position: 'absolute', top: 12, right: 36, display: 'flex', alignItems: 'center', gap: 3, background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, border: '1px solid #86efac' }}>
          <CheckCircle2 size={12} /> Tamamlandı
        </div>
      )}
      <button
        onClick={() => onDelete(goal.id)}
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#94a3b8', padding: 4, cursor: 'pointer' }}
        title="Hedefi Sil"
      >
        <Trash2 size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Ring value={pct} size={58} stroke={5} color={done ? '#16a34a' : t.color} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: done ? '#16a34a' : '#0f172a' }}>%{pct}</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: p.badgeBg, color: p.badgeText, border: `1px solid ${p.border}` }}>
              <PIcon size={10} /> {goal.period}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: t.bg, color: t.text, border: `1px solid ${t.border}` }}>
              <TIcon size={10} /> {goal.type}
            </span>
          </div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, margin: 0 }}>{goal.title}</h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>
          <span>İlerleme: <strong style={{ color: '#0f172a' }}>{goal.current || 0}</strong> / {goal.target} {t.unit}</span>
          <span style={{ color: done ? '#16a34a' : t.text }}>
            {goal.target - (goal.current || 0) > 0 ? `${goal.target - (goal.current || 0)} ${t.unit} kaldı` : '🎉 Tebrikler!'}
          </span>
        </div>
        <BarProgress value={pct} color={done ? '#16a34a' : t.color} />
      </div>

      {!done && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: 2 }}>
          <button
            type="button"
            onClick={() => onAddProgress(goal.id, quickIncrementStep)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.65rem',
              background: t.bg,
              color: t.text,
              border: `1px solid ${t.border}`,
              fontSize: '0.76rem',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            +{quickIncrementStep} {t.unit}
          </button>

          <form onSubmit={handleAdd} style={{ flex: 1, display: 'flex', gap: 4 }}>
            <input
              type="number"
              min="1"
              placeholder={`Miktar`}
              value={adding}
              onChange={e => setAdding(e.target.value)}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '0.65rem',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.76rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                border: 'none',
                color: 'white',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
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
   MAIN PAGE: GOALS AND SCHEDULE PAGE
═══════════════════════════════════════════════════════════ */
export default function GoalsAndSchedulePage() {
  const navigate = useNavigate();
  const { goals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles } = useCoaching();
  const { submissions } = useEvaluation();
  const { homeworks } = useHomework();

  // Active Tab: 'habits' (Alışkanlıklar & Rutinler) | 'visual' (Hedef Takibi) | 'academic' (Akademik & Sınav)
  const [activeTab, setActiveTab] = useState('habits');

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const defaultStudentId = currentUser?.role === 'student' ? currentUser?.id : (students[0]?.id || 'u1');
  const [selectedStudentId, setSelectedStudentId] = useState(defaultStudentId);
  const selectedStudent = students.find(s => s.id === selectedStudentId) || (currentUser?.role === 'student' ? currentUser : students[0]);

  const coachingProfile = useMemo(() => getCoachingProfileForStudent(selectedStudent?.id) || {}, [selectedStudent?.id, coachingProfiles]);

  /* ─── Real-Time Solved Questions Calculation ─── */
  const solvedQuestionsStats = useMemo(() => {
    if (!selectedStudent) return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };
    const studentIdStr = String(selectedStudent.id);
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');
    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let totalCount = 0;

    const countedSubIds = new Set();

    (submissions || []).forEach(s => {
      const isMatch = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
      if (!isMatch || s.status === 'in_progress' || s.status === 'draft') return;
      const subId = s.id || s.supabaseId || `${s.testId}_${s.submittedAt}`;
      if (countedSubIds.has(subId)) return;
      countedSubIds.add(subId);

      let qCount = Number(s.totalQuestions || s.questionCount || (Array.isArray(s.answers) ? s.answers.length : 0) || 20);
      const dateStr = s.submittedAt || s.completedAt || s.createdAt || s.date;
      const subDate = dateStr ? new Date(dateStr) : null;
      totalCount += qCount;
      if (subDate && !isNaN(subDate.getTime())) {
        const subYMD = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}-${String(subDate.getDate()).padStart(2, '0')}`;
        if (subYMD === todayYMD) todayCount += qCount;
        if (subDate >= startOfWeek) weekCount += qCount;
        if (subDate >= startOfMonth) monthCount += qCount;
      }
    });

    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        const isMatch = String(sub.studentId || sub.student_id || sub.user_id) === studentIdStr || (studentUuidStr && String(sub.studentId || sub.student_id || sub.user_id) === studentUuidStr);
        if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;
        const subId = sub.id || `hw_${hw.id}_${studentIdStr}`;
        if (countedSubIds.has(subId)) return;
        countedSubIds.add(subId);

        let qCount = Number(hw.totalQuestions || sub.totalQuestions || (Array.isArray(sub.answers) ? sub.answers.length : 0) || 10);
        const dateStr = sub.completedAt || sub.submittedAt || sub.createdAt || hw.createdAt;
        const subDate = dateStr ? new Date(dateStr) : null;
        totalCount += qCount;
        if (subDate && !isNaN(subDate.getTime())) {
          const subYMD = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}-${String(subDate.getDate()).padStart(2, '0')}`;
          if (subYMD === todayYMD) todayCount += qCount;
          if (subDate >= startOfWeek) weekCount += qCount;
          if (subDate >= startOfMonth) monthCount += qCount;
        }
      });
    });

    return { today: todayCount, thisWeek: weekCount, thisMonth: monthCount, total: totalCount };
  }, [selectedStudent, submissions, homeworks]);

  // Academic Targets States
  const [examGoalType, setExamGoalType] = useState(coachingProfile.examGoalType || coachingProfile.goals?.examGoalType || 'LGS 2026');
  const [customExamName, setCustomExamName] = useState(coachingProfile.customExamName || coachingProfile.goals?.customExamName || '');
  const [targetSchool, setTargetSchool] = useState(coachingProfile.targetSchool || coachingProfile.goals?.targetSchool || '');
  const [targetScore, setTargetScore] = useState(coachingProfile.targetScore || coachingProfile.goals?.targetScore || '485');
  const [targetNet, setTargetNet] = useState(coachingProfile.targetNet !== undefined ? String(coachingProfile.targetNet) : (coachingProfile.goals?.targetNet || '90'));
  const [gradeClass, setGradeClass] = useState(coachingProfile.gradeClass || coachingProfile.goals?.gradeClass || '');
  const [gradeTerm, setGradeTerm] = useState(coachingProfile.gradeTerm || coachingProfile.goals?.gradeTerm || '1');
  const [gradeTarget, setGradeTarget] = useState(coachingProfile.gradeTarget || coachingProfile.goals?.gradeTarget || 'Takçek');

  // Lists
  const [monthlyItems, setMonthlyItems] = useState(() => parseCheckableGoalList(coachingProfile.monthlyGoals, [
    { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
    { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
  ]));

  const [weeklyHabitItems, setWeeklyHabitItems] = useState(() => parseWeeklyHabitList(coachingProfile.weeklyGoals, [
    { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', weeks: { 'Hafta 1': true, 'Hafta 2': true, 'Hafta 3': false, 'Hafta 4': false } },
    { id: 'w2', text: 'Matematik yeni nesil problem kartları tekrarı', weeks: { 'Hafta 1': true, 'Hafta 2': false, 'Hafta 3': true, 'Hafta 4': false } }
  ]));

  const [dailyHabitItems, setDailyHabitItems] = useState(() => parseDailyHabitList(coachingProfile.dailyGoals, [
    { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } },
    { id: 'd2', text: 'Günlük 20 Matematik yeni nesil problem', days: { Pzt: true, Sal: true, Çrş: false, Prş: true, Cum: true, Cts: true, Paz: false } }
  ]));

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Filters for Visual Goals
  const [periodFilter, setPeriodFilter] = useState('Tümü');
  const [typeFilter, setTypeFilter] = useState('Tümü');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50 });

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

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    const raw = goals.filter(g => String(g.studentId) === String(selectedStudent.id));
    return raw.map(g => {
      if (g.type === 'Soru') {
        const autoVal = (
          g.period === 'Günlük' ? solvedQuestionsStats.today :
          g.period === 'Haftalık' ? solvedQuestionsStats.thisWeek :
          g.period === 'Aylık' ? solvedQuestionsStats.thisMonth :
          solvedQuestionsStats.total
        );
        const effectiveCurrent = Math.max(g.current || 0, autoVal);
        return { ...g, current: effectiveCurrent, autoSystemValue: autoVal };
      }
      return g;
    });
  }, [goals, selectedStudent, solvedQuestionsStats]);

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

  // Handlers for Weekly Habit Items
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

  // Handlers for Daily Habit Items
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
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#0f172a',
      padding: '1.25rem 1rem',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .goal-anim { animation: fadeIn 0.25s ease both; }
        @media (max-width: 640px) {
          .goal-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .goal-tabs-bar { overflow-x: auto !important; width: 100% !important; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', margin: 0, paddingBottom: 60 }}>
        
        {/* TOP ACTION BAR */}
        <div className="goal-header-wrap goal-anim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '0.75rem',
                padding: '0.5rem 0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#1e293b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s'
              }}
            >
              <ArrowLeft size={16} /> Öğrenci Paneli
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f43f5e, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.15rem',
                color: 'white',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 14px rgba(244,63,94,0.3)',
                flexShrink: 0
              }}>
                🎯
              </div>
              <div>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#0f172a', lineHeight: 1.2 }}>
                  Hedeflerim & Alışkanlık Takibi
                </h1>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                  {selectedStudent?.name ? `${selectedStudent.name} · ` : ''}Günlük & Haftalık Seri Takibi (Streak Tracker)
                </div>
              </div>
            </div>
          </div>

          {/* Student Selector for Teachers */}
          {students.length > 1 && currentUser?.role !== 'student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto', maxWidth: '100%' }}>
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: 'none',
                    background: s.id === selectedStudent?.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                    color: s.id === selectedStudent?.id ? 'white' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TOP SUMMARY STATS BANNER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Çözülen Soru (Bugün)', value: `${solvedQuestionsStats.today} Soru`, sub: `Bu Hafta: ${solvedQuestionsStats.thisWeek}`, icon: Target, color: '#e11d48', border: '#fecdd3', bg: '#ffe4e6' },
            { label: 'Kitap Okuma', value: `${totalPagesRead} Sayfa`, sub: 'Hedefe doğru', icon: BookOpen, color: '#0284c7', border: '#bae6fd', bg: '#e0f2fe' },
            { label: 'Tamamlanan Konu', value: `${totalTopicsCompleted} Konu`, sub: 'Aktif Müfredat', icon: Brain, color: '#7c3aed', border: '#e9d5ff', bg: '#f3e8ff' },
            { label: 'Çalışma Süresi', value: `${totalMinutesStudied} Dk`, sub: 'Zaman takibi', icon: Timer, color: '#059669', border: '#a7f3d0', bg: '#d1fae5' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{
                background: '#ffffff',
                border: `1.5px solid ${s.border}`,
                borderRadius: '1.15rem',
                padding: '0.85rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: 42, height: 42, borderRadius: '0.85rem', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>{s.label}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>{s.value}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🌟 3-TAB NAVIGATION BAR (CLEAR, ORGANIZED & INTUITIVE) */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '0.4rem',
          display: 'flex',
          gap: 6,
          marginBottom: '1.25rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'habits', label: '🔥 Günlük & Haftalık Alışkanlıklar', desc: 'Rutinler & Seri Matrisi' },
            { id: 'visual', label: '🎯 Hedeflerim & Göstergeler', desc: 'Soru, Kitap, Süre Kartları' },
            { id: 'academic', label: '🏛️ Akademik & Sınav Hedefleri', desc: 'LGS/YKS, Puan & Net' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 4px 12px rgba(79,70,229,0.25)' : 'none'
                }}
              >
                <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>{tab.label}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: isActive ? 0.9 : 0.7, marginTop: 2 }}>{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* ════════ TAB 1: GÜNLÜK & HAFTALIK ALIŞKANLIKLAR ════════ */}
        {activeTab === 'habits' && (
          <div className="goal-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            <DailyHabitStreakSection
              items={dailyHabitItems}
              onToggleDay={handleToggleDailyMatrixDay}
              onAddItem={handleAddDailyHabitItem}
              onDeleteItem={handleDeleteDailyHabitItem}
            />

            <WeeklyHabitStreakSection
              items={weeklyHabitItems}
              onToggleWeek={handleToggleWeeklyMatrixDay}
              onAddItem={handleAddWeeklyHabitItem}
              onDeleteItem={handleDeleteWeeklyHabitItem}
            />
          </div>
        )}

        {/* ════════ TAB 2: GÖRSEL ÖZEL HEDEF TAKİP PANOSU ════════ */}
        {activeTab === 'visual' && (
          <div className="goal-anim" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header + Add Goal + Filters Bar */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '1.15rem',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>Periyot:</span>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                  {['Tümü', 'Günlük', 'Haftalık', 'Aylık'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodFilter(p)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: 6,
                        border: 'none',
                        background: periodFilter === p ? '#4f46e5' : 'transparent',
                        color: periodFilter === p ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginLeft: 8 }}>Tür:</span>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                  {['Tümü', 'Soru', 'Sayfa', 'Konu', 'Dakika'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: 6,
                        border: 'none',
                        background: typeFilter === t ? '#e11d48' : 'transparent',
                        color: typeFilter === t ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowGoalModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0.55rem 1rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  boxShadow: '0 3px 10px rgba(244,63,94,0.3)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} /> + Yeni Hedef Ekle
              </button>
            </div>

            {/* Visual Cards Grid */}
            {filteredVisualGoals.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '1.25rem',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ width: 52, height: 52, borderRadius: '1rem', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={26} />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Seçilen Kriterlere Uygun Hedef Bulunmuyor</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 360, margin: 0, lineHeight: 1.4 }}>
                  Günlük soru çözme, kitap okuma veya konu hedefleri ekleyerek motivasyonunuzu artırın!
                </p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.25rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', border: 'none', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.3)' }}
                >
                  <Plus size={16} /> Yeni Hedef Tanımla
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
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
        )}

        {/* ════════ TAB 3: AKADEMİK HEDEFLER & SINAV / OKUL ════════ */}
        {activeTab === 'academic' && (
          <div className="goal-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            
            {/* Sınav & Okul & Puan Formu */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              boxShadow: '0 4px 20px rgba(100, 116, 139, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 900, fontSize: '0.9rem' }}>
                  <GraduationCap size={20} color="#059669" /> 🏛️ Uzun Vadeli Sınav & Okul Hedefleri
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#d1fae5', color: '#047857', padding: '0.2rem 0.65rem', borderRadius: 99, border: '1px solid #a7f3d0' }}>
                  Akademik
                </span>
              </div>

              {(() => {
                const isStandardExam = ['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS', 'Ara Sınıf Takip & Takdir Hedefi'].includes(examGoalType);
                const isGradeTracking = examGoalType === 'Ara Sınıf Takip & Takdir Hedefi';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sınav / Hedef Türü</label>
                      <select
                        value={isStandardExam ? examGoalType : 'Özel Sınav'}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Özel Sınav') {
                            setExamGoalType('Özel Sınav');
                            saveAllProfilesWithLists(undefined, undefined, undefined, { examGoalType: 'Özel Sınav', customExamName: customExamName || '' });
                          } else {
                            setExamGoalType(val);
                            saveAllProfilesWithLists(undefined, undefined, undefined, { examGoalType: val });
                          }
                        }}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="LGS 2026">🎓 LGS (Liselere Geçiş Sınavı)</option>
                        <option value="YKS (TYT/AYT) 2026">🏛️ YKS (TYT & AYT Sınavı)</option>
                        <option value="KPSS">💼 KPSS (Kamu Personeli Seçme Sınavı)</option>
                        <option value="Ara Sınıf Takip & Takdir Hedefi">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                        <option value="Özel Sınav">✏️ Özel Sınav (DGS, ALES, BİLSEM...)</option>
                      </select>
                    </div>

                    {(!isStandardExam || examGoalType === 'Özel Sınav') && (
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Özel Sınav Adı</label>
                        <input
                          type="text"
                          placeholder="Örn: DGS, ALES, BİLSEM..."
                          value={customExamName || (examGoalType !== 'Özel Sınav' ? examGoalType : '')}
                          onChange={e => {
                            const val = e.target.value;
                            setCustomExamName(val);
                            saveAllProfilesWithLists(undefined, undefined, undefined, { customExamName: val, examGoalType: val || 'Özel Sınav' });
                          }}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #c084fc', background: '#faf5ff', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {isGradeTracking ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sınıf / Seviye</label>
                            <select
                              value={gradeClass}
                              onChange={e => {
                                setGradeClass(e.target.value);
                                saveAllProfilesWithLists(undefined, undefined, undefined, { gradeClass: e.target.value });
                              }}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                            >
                              <option value="">— Seçin —</option>
                              {['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Dönem</label>
                            <select
                              value={gradeTerm}
                              onChange={e => {
                                setGradeTerm(e.target.value);
                                saveAllProfilesWithLists(undefined, undefined, undefined, { gradeTerm: e.target.value });
                              }}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                            >
                              <option value="1">1. Dönem</option>
                              <option value="2">2. Dönem</option>
                              <option value="yıllık">Yıllık</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Hedef Belgem</label>
                          <select
                            value={gradeTarget}
                            onChange={e => {
                              setGradeTarget(e.target.value);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { gradeTarget: e.target.value });
                            }}
                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: '0.85rem', fontWeight: 800, outline: 'none' }}
                          >
                            <option value="Takçek">🟢 Takçek (Temel Seviye)</option>
                            <option value="Teşekkür">🧡 Teşekkür Belgesi (70–84 Puan)</option>
                            <option value="Takdir">🏅 Takdir Belgesi (85+ Puan)</option>
                            <option value="Onur">⭐ Onur Belgesi (Tüm dersler yüksek)</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>İstenen Okul & Bölüm</label>
                          <input
                            type="text"
                            placeholder="Örn: Kabataş Erkek Lisesi / Boğaziçi Müh."
                            value={targetSchool}
                            onChange={e => {
                              setTargetSchool(e.target.value);
                              saveAllProfilesWithLists(undefined, undefined, undefined, { targetSchool: e.target.value });
                            }}
                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Hedef Puan</label>
                            <input
                              type="text"
                              placeholder="Örn: 485"
                              value={targetScore}
                              onChange={e => {
                                setTargetScore(e.target.value);
                                saveAllProfilesWithLists(undefined, undefined, undefined, { targetScore: e.target.value });
                              }}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Toplam Net Hedefi</label>
                            <input
                              type="number"
                              placeholder="Örn: 90"
                              value={targetNet}
                              onChange={e => {
                                setTargetNet(e.target.value);
                                saveAllProfilesWithLists(undefined, undefined, undefined, { targetNet: e.target.value });
                              }}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
                {isSavedNotice ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={16} /> Başarıyla Kaydedildi!
                  </span>
                ) : <span />}

                <button
                  onClick={() => saveAllProfilesWithLists(monthlyItems, weeklyHabitItems, dailyHabitItems)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.85rem',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                    marginLeft: 'auto'
                  }}
                >
                  <Save size={16} /> Bilgileri Kaydet
                </button>
              </div>
            </div>

            {/* Aylık Kazanımlar Checklist */}
            <MonthlyChecklistSection
              items={monthlyItems}
              onToggleItem={handleToggleMonthlyItem}
              onAddItem={handleAddMonthlyItem}
              onDeleteItem={handleDeleteMonthlyItem}
            />

          </div>
        )}

        {/* ════════ MODAL: ÖZEL HEDEF EKLE ════════ */}
        {showGoalModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '1.5rem',
              padding: '1.5rem',
              width: '100%',
              maxWidth: 440,
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={22} color="#e11d48" />
                  <h3 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem', margin: 0 }}>Yeni Özel Hedef Tanımla</h3>
                </div>
                <button
                  onClick={() => setShowGoalModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Hedef Tanımı / Başlığı</label>
                  <input
                    type="text"
                    placeholder="Örn: Günlük 30 Paragraf Sorusu / 50 Sayfa Kitap"
                    value={newGoal.title}
                    onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Hedef Türü</label>
                    <select
                      value={newGoal.type}
                      onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Soru">🎯 Soru Çözme</option>
                      <option value="Sayfa">📖 Kitap Okuma</option>
                      <option value="Konu">🧠 Konu Tamamlama</option>
                      <option value="Dakika">⏱️ Çalışma Süresi (dk)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Periyot</label>
                    <select
                      value={newGoal.period}
                      onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Günlük">⚡ Günlük</option>
                      <option value="Haftalık">📅 Haftalık</option>
                      <option value="Aylık">🏆 Aylık</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Hedef Miktar</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Örn: 50"
                    value={newGoal.target}
                    onChange={e => setNewGoal(p => ({ ...p, target: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    style={{ padding: '0.65rem 1.1rem', borderRadius: '0.75rem', background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '0.65rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.35)' }}
                  >
                    Hedef Ekle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
