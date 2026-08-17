import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle, Target, AlertCircle, Timer, BookOpen, Check,
  Sparkles, Trophy, Flame, GraduationCap, BarChart3, Clock,
  Calendar, CheckCircle2, X, Plus, ExternalLink, Zap,
  ChevronRight, ChevronDown, ChevronUp, Star, TrendingUp, BookMarked, CalendarDays,
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, ArrowRight, RefreshCw, ClipboardCheck, Eye, RotateCcw
} from 'lucide-react';
import { parse, isPast, isToday, differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useGoal } from '../context/GoalContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

/* ─── helpers ──────────────────────────────────────────────────── */
const parseSafeDate = (d) => {
  if (!d) return new Date();
  const iso = new Date(d);
  if (!isNaN(iso)) return iso;
  return parse(d, 'dd MMMM yyyy', new Date(), { locale: tr });
};
export const getCategoryName = (t) => t.subject || 'Diğer';

const renderGoalList = (goalsData) => {
  if (!goalsData) return null;
  if (typeof goalsData === 'string') return goalsData;
  if (Array.isArray(goalsData)) {
    if (goalsData.length === 0) return null;
    return goalsData.map(item => {
      if (typeof item === 'object' && item !== null) {
        const text = item.text || item.title || item.name || '';
        return text ? (item.done ? `✓ ${text}` : text) : null;
      }
      return String(item);
    }).filter(Boolean).join(' • ');
  }
  if (typeof goalsData === 'object') {
    return goalsData.text || goalsData.title || goalsData.name || null;
  }
  return String(goalsData);
};

/* ─── Subject Config ────────────────────────────────────────────── */
const subjectConfig = {
  'Matematik':            { icon: Ruler,        color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', badge: '#2563eb' },
  'Fen Bilimleri':        { icon: TestTube2,     color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', badge: '#059669' },
  'Türkçe':               { icon: BookCopy,      color: '#f97316', bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c' },
  'Sosyal Bilgiler':      { icon: Globe,         color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', badge: '#9333ea' },
  'İngilizce':            { icon: MessageSquare, color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', badge: '#e11d48' },
  'Genel Testler':{ icon: ClipboardList, color: '#6366f1', bg: '#eff6ff', border: '#c7d2fe', badge: '#4f46e5' },
  'Diğer':                { icon: FileText,      color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', badge: '#475569' },
};
const getSubConf = (s) => subjectConfig[s] || subjectConfig['Diğer'];

const getThemeKey = (cat) => {
  if (!cat) return 'Diğer';
  const c = cat.toLowerCase();
  if (c.includes('matematik')) return 'Matematik';
  if (c.includes('fen')) return 'Fen Bilimleri';
  if (c.includes('türkçe') || c.includes('turkce')) return 'Türkçe';
  if (c.includes('sosyal')) return 'Sosyal Bilgiler';
  if (c.includes('ingilizce')) return 'İngilizce';
  if (c.includes('deneme') || c.includes('genel')) return 'Genel Testler';
  return 'Diğer';
};

/* ─── Atom Components ──────────────────────────────────────────── */
function Avatar({ name, size = 44, color = '#6366f1' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900, color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      {name?.charAt(0) || 'Ö'}
    </div>
  );
}

function Pill({ children, color = '#6366f1', bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontWeight: 800, background: bg || `${color}18`, color, border: `1px solid ${border || `${color}33`}`, borderRadius: 99, padding: '0.18rem 0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </span>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, bg, glow, isMobile }) {
  if (isMobile) {
    const shortLabel = label === 'Toplam Ödev' ? 'Toplam'
      : label === 'Tamamlanan' ? 'Biten'
      : label === 'Bekleyen' ? 'Bekleyen'
      : label === 'Gecikmiş' ? 'Geciken'
      : label === 'Tamamlanma' ? 'Oran' : label;

    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)',
          border: `1.5px solid ${color}30`,
          borderRadius: '0.75rem',
          padding: '0.5rem 0.2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          minWidth: 0
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3, border: `1px solid ${color}33` }}>
          <Icon size={12} color={color} />
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', marginTop: 1, textTransform: 'uppercase' }}>{shortLabel}</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `1.5px solid ${color}25`, borderRadius: '1.1rem', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: bg, border: `1.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

  // Homework LogicCard ─────────────────────────────────────────────── */
function HomeworkCard({ task, selectedStudent, isMobile }) {
  const navigate = useNavigate();
  const category = task.subject;
  const conf = getSubConf(getThemeKey(category));
  const Icon = conf.icon;
  const dueDate = task.dueDateObj;
  const overdue = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  const daysDiff = differenceInDays(dueDate, new Date());

  const urgencyPill = overdue ? (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.6rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #fca5a5', boxShadow: '0 2px 8px rgba(185,28,28,0.15)' }}>
      <Flame size={12} fill="#ef4444" color="#ef4444" /> {differenceInDays(new Date(), dueDate)}g Gecikti
    </span>
  ) : dueToday ? (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #fde68a', boxShadow: '0 2px 8px rgba(217,119,6,0.15)' }}>
      <Zap size={12} fill="#f59e0b" color="#f59e0b" /> Bugün Son
    </span>
  ) : (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #86efac' }}>
      <Clock size={12} color="#16a34a" /> {daysDiff + 1} Gün Kaldı
    </span>
  );

  const typeTag = (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f3f4f6', color: '#4b5563', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 3 }}>
      {task.type === 'acik_uclu' ? '📝 Açık Uçlu' : task.type === 'physicalExam' ? '📖 Optik Form' : task.type === 'coktan_secmeli' ? '🔘 Çoktan Seçmeli' : '📄 Sınav / Test'}
    </span>
  );

  const sourceTag = task.sourceType === 'trackedBook' ? (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f5f3ff', color: '#6d28d9', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 3 }}>
      📚 Kitap Testi
    </span>
  ) : task.sourceType === 'pdf' ? (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#fff1f2', color: '#be123c', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: 3 }}>
      📕 PDF
    </span>
  ) : task.sourceType === 'html' ? (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#ecfdf5', color: '#047857', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 3 }}>
      🌐 Web Testi
    </span>
  ) : null;

  const handleStart = () => {
    const targetId = task.realTestId || task.testId || task.id;
    let path = `/quiz/${targetId}?studentId=${selectedStudent.id}`;
    const matchingBook = books?.find(b => String(b.id) === String(task.bookId));
    const isExam = task.type === 'physicalExam' || task.contentType === 'physicalExam' || task.bookType === 'exam' || matchingBook?.bookType === 'exam' || task.isPhysical;

    if (isExam) {
      path = `/physical-exam/${task.hwId || task.bookId || targetId}?studentId=${selectedStudent.id}`;
    } else if (task.sourceType === 'trackedBook' || task.isBookAssignment) {
      path = `/book-quiz/${targetId}?studentId=${selectedStudent.id}`;
    }
    navigate(path);
  };

  if (isMobile) {
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `1.5px solid ${conf.border}`, borderRadius: '1rem', padding: '0.85rem', display: 'flex', gap: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative', alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={conf.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: conf.badge, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category}</div>
            {sourceTag}
            {typeTag}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
             {urgencyPill}
             <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={12} color="#94a3b8" /> {task.dueDateStr}</span>
             <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>• {task.questionCount || 0} Soru</span>
          </div>
        </div>
        <button
          onClick={handleStart}
          style={{ width: 38, height: 38, borderRadius: '50%', background: conf.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: `0 4px 10px ${conf.color}40`, transition: 'transform 0.15s' }}
        >
          <PlayCircle size={18} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `1.5px solid ${conf.border}`, borderRadius: '1.25rem', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: 4, background: conf.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: conf.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: conf.badge, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{category}</span>
            {sourceTag}
            {typeTag}
          </div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {task.title}
          </h3>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={conf.color} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {urgencyPill}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255,255,255,1)', borderRadius: '0.5rem', padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>
          <Calendar size={12} color="#94a3b8" /> {task.dueDateStr}
        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.75rem', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Soru</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>{task.questionCount || '—'}</div>
        </div>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Süre</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>{task.durationMinutes}dk</div>
        </div>
      </div>

      <button
        onClick={handleStart}
        style={{ width: '100%', padding: '0.65rem', borderRadius: '0.75rem', background: conf.color, color: 'white', fontWeight: 800, fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 12px ${conf.color}40`, transition: 'transform 0.15s' }}
      >
        <PlayCircle size={16} /> {task.type === 'physicalExam' ? 'Optik Formu Doldur' : 'Ödevi Çöz'}
      </button>
    </div>
  );
}

/* ─── Goal Mini ─────────────────────────────────────────────────── */
function GoalMini({ goal, onDelete, onUpdateProgress, onNavigate }) {
  const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100));
  const done = pct >= 100;
  return (
    <div style={{ background: done ? '#f0fdf4' : '#fafafa', border: `1.5px solid ${done ? '#86efac' : '#f1f5f9'}`, borderRadius: '0.85rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#eff6ff', color: '#2563eb', padding: '0.1rem 0.45rem', borderRadius: 99, textTransform: 'uppercase' }}>{goal.period}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.45rem', borderRadius: 99 }}>{goal.type}</span>
        </div>
        <button onClick={() => onDelete(goal.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}><X size={14} /></button>
      </div>
      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{goal.title}</div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
          <span>{goal.current || 0} / {goal.target}</span>
          <span style={{ color: done ? '#16a34a' : '#4f46e5', fontWeight: 900 }}>%{pct}</span>
        </div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: done ? '#22c55e' : '#6366f1', borderRadius: 99, transition: 'width 0.6s' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Link Card ───────────────────────────────────────────── */
function QuickCard({ icon: Icon, label, sub, to, gradient, shadow }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)}
      style={{ background: gradient, borderRadius: '1.1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: 'none', cursor: 'pointer', boxShadow: `0 4px 18px ${shadow}`, transition: 'all 0.2s', textAlign: 'left' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 12px 28px ${shadow}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 18px ${shadow}`; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────────── */
function ProgressBar({ value, color = '#6366f1', bg = '#eff6ff', height = 8 }) {
  return (
    <div style={{ background: bg, borderRadius: 99, height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f97316', '#a855f7', '#f43f5e'];

const DASHBOARD_QUOTES = [
  /* ─── Disiplin ─── */
  { quote: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier", category: "Disiplin", emoji: "🔥" },
  { quote: "Disiplin, motivasyon bittiğinde devreye giren şeydir.", author: "Jim Rohn", category: "Disiplin", emoji: "🔥" },
  { quote: "Bugün yapabileceğini yarına bırakma — yarın daha çok işin olacak.", author: "Benjamin Franklin", category: "Disiplin", emoji: "🔥" },
  { quote: "Sınavı kazandıran zeka değil, bıkmadan gösterilen sürekliliktir.", author: "Koçluk Mottosu", category: "Disiplin", emoji: "🔥" },
  { quote: "Her gün birkaç soru çözmek, sınavda binlerce soruya hazır olmanı sağlar.", author: "Anonim", category: "Disiplin", emoji: "🔥" },
  { quote: "Küçük adımlar, büyük hedeflere götüren tek yoldur.", author: "Lao Tzu", category: "Disiplin", emoji: "🔥" },

  /* ─── Odak ─── */
  { quote: "Disiplin, ne istediğin ile en çok ne istediğin arasındaki seçimdir.", author: "Abraham Lincoln", category: "Odak", emoji: "🎯" },
  { quote: "Dağınık bir zihin, hiçbir zaman hedefe ulaşamaz. Odaklan.", author: "Anonim", category: "Odak", emoji: "🎯" },
  { quote: "Bir seferde bir şeye konsantre ol — gücün çarpıcı hale gelir.", author: "Orison Swett Marden", category: "Odak", emoji: "🎯" },
  { quote: "Telefonu bir kenara bırak. Geleceğini şekillendirecek saatler bunlar.", author: "Günün Hatırlatması", category: "Odak", emoji: "🎯" },
  { quote: "Şu an çalışmak istemiyorsan, gelecekte daha çok çalışmak zorunda kalırsın.", author: "Anonim", category: "Odak", emoji: "🎯" },

  /* ─── Mücadele ─── */
  { quote: "Zorluklar, başarının değerini artıran süslerdir.", author: "Molière", category: "Mücadele", emoji: "💪" },
  { quote: "Rüzgar ne kadar sert eserse esin, sağlam ağaç köklerinden kopmaz.", author: "Konfüçyüs", category: "Mücadele", emoji: "💪" },
  { quote: "Hayat seni yere vurduğunda sayılmayı bırak, kalk.", author: "Rocky Balboa", category: "Mücadele", emoji: "💪" },
  { quote: "En karanlık gece bile sabahla biter.", author: "Victor Hugo", category: "Mücadele", emoji: "💪" },
  { quote: "Yanlış yapmak seni geride bırakmaz — aynı yanlışı tekrarlamak bırakır.", author: "Pedagoji Notu", category: "Mücadele", emoji: "💪" },
  { quote: "Zorlu yollar genellikle güzel yerlere çıkar.", author: "Hazrat Ali", category: "Mücadele", emoji: "💪" },

  /* ─── İnanç ─── */
  { quote: "Zafer, 'vazgeçmeyenlerindir'.", author: "Mustafa Kemal Atatürk", category: "İnanç", emoji: "⭐" },
  { quote: "Güçlü ol — hem zihnin hem bedenin bu mücadeleye değer.", author: "Marcus Aurelius", category: "İnanç", emoji: "⭐" },
  { quote: "Kendine inan. Dünya, kendine inanan insanların peşinden gider.", author: "Oprah Winfrey", category: "İnanç", emoji: "⭐" },
  { quote: "İmkânsız diye bir şey yoktur; kelime bile 'I'm possible' (Ben yapabilirim) der.", author: "Audrey Hepburn", category: "İnanç", emoji: "⭐" },
  { quote: "Sen düşündüğünden çok daha güçlüsün, bildiğinden çok daha zekisin.", author: "A.A. Milne", category: "İnanç", emoji: "⭐" },
  { quote: "Bir şeyin zor olması onu yapmamak için değil, daha değerli hale getirmek için bir nedendir.", author: "Seneca", category: "İnanç", emoji: "⭐" },

  /* ─── Eylem ─── */
  { quote: "Gelecek, bugün ne yaptığına bağlıdır.", author: "Mahatma Gandhi", category: "Eylem", emoji: "⚡" },
  { quote: "Hayal kurmak güzeldir; ama hayalini gerçeğe dönüştürmek daha güzeldir.", author: "Thomas Edison", category: "Eylem", emoji: "⚡" },
  { quote: "Bir adım atmak, dünya hakkında düşünmekten daha değerlidir.", author: "Johann W. von Goethe", category: "Eylem", emoji: "⚡" },
  { quote: "Yarın başlamak, sonsuza kadar ertelemenin başlangıcıdır.", author: "Anonim", category: "Eylem", emoji: "⚡" },
  { quote: "Şu anda uyuyabileceğin saatler, yarın uyanık geçireceğin saatlerin temelidir.", author: "Anonim", category: "Eylem", emoji: "⚡" },
  { quote: "Bir test daha çöz. Bir konu daha oku. Farkı o an yaratırsın.", author: "Günün Önerisi", category: "Eylem", emoji: "⚡" },

  /* ─── Zafer ─── */
  { quote: "Zirveye tırmanmak yorucudur ama oradaki manzara her şeye değer.", author: "Anonim", category: "Zafer", emoji: "🏆" },
  { quote: "Başarı, hazırlık ile fırsatın buluştuğu andır.", author: "Seneca", category: "Zafer", emoji: "🏆" },
  { quote: "Düşüp kalkmak zayıflık değildir — kalkmayı bırakmak öyledir.", author: "Anonim", category: "Zafer", emoji: "🏆" },
  { quote: "Sınav sonucu seni tanımlamaz; nasıl hazırlandığın seni tanımlar.", author: "Koçluk Mottosu", category: "Zafer", emoji: "🏆" },
  { quote: "Yorgunluk geçicidir; pişmanlık kalıcıdır.", author: "Anonim", category: "Zafer", emoji: "🏆" },
  { quote: "Bugün neden çalıştığını yarın anlayacaksın.", author: "Anonim", category: "Zafer", emoji: "🏆" },

  /* ─── Gelişim ─── */
  { quote: "Sınırlarını zorlamayan biri, potansiyelinin ne olduğunu asla öğrenemez.", author: "Kobe Bryant", category: "Gelişim", emoji: "🌱" },
  { quote: "Başarı, her gün biraz daha iyi olmakla gelir.", author: "Günün Mottosu", category: "Gelişim", emoji: "🌱" },
  { quote: "Dün senden daha iyi ol. Bugün kendini geç.", author: "Miyamoto Musashi", category: "Gelişim", emoji: "🌱" },
  { quote: "Bilgi, hiçbir zaman sırt çantandan daha ağır gelmez.", author: "Anonim", category: "Gelişim", emoji: "🌱" },
  { quote: "Okumak, yerinde duran bir zihin için tek seyahattir.", author: "Gustave Flaubert", category: "Gelişim", emoji: "🌱" },

  /* ─── Özgüven ─── */
  { quote: "Başkası sana inanmak zorunda değil; ama sen kendine inanmak zorundasın.", author: "Anonim", category: "Özgüven", emoji: "✨" },
  { quote: "Her uzman, bir zamanlar acemiydi. Devam et.", author: "Helen Hayes", category: "Özgüven", emoji: "✨" },
  { quote: "Hata yapmak başarısızlık değildir; hatadan ders çıkarmamak öyledir.", author: "John Dewey", category: "Özgüven", emoji: "✨" },
  { quote: "Zekâ kalıtsal değil, çabadır. Her gün biraz daha zeki olursun.", author: "Carol Dweck", category: "Özgüven", emoji: "✨" },
  { quote: "Kendinle karşılaştırman gereken tek kişi, dünkü sensin.", author: "Jordan B. Peterson", category: "Özgüven", emoji: "✨" },

  /* ─── Sabır ─── */
  { quote: "Sabır, en tatlı meyveleri veren ağacı sular.", author: "Fransız Atasözü", category: "Sabır", emoji: "🌊" },
  { quote: "Büyük şeyler zaman alır. Vazgeçme.", author: "Anonim", category: "Sabır", emoji: "🌊" },
  { quote: "Bir tohum ilkbaharda çiçek açar; ama tüm kış boyunca beslenmesi gerekir.", author: "Türk Atasözü", category: "Sabır", emoji: "🌊" },
  { quote: "Kaybetmek korkusu kazanma heyecanından daha güçlü olmamalıdır.", author: "Phil Jackson", category: "Sabır", emoji: "🌊" },
  { quote: "Bir adım at. Sonra bir adım daha. Merdiven budur.", author: "Martin Luther King Jr.", category: "Sabır", emoji: "🌊" },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [dashQuoteIdx, setDashQuoteIdx] = useState(0);
  const { data: curData } = useCurriculum();
  const { questions: allQuestions } = useQuestionBank();
  const { homeworks } = useHomework();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = useSchedule();
  const { currentUser } = useAuth();
  const { bookTests = [], books = [] } = useTrackedBooks() || {};
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent, coachingLinks, saveCoachingProfile } = useCoaching();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [showAllTodayTasks, setShowAllTodayTasks] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const myStudyAssignments = useMemo(() => {
    return (studyAssignments || []).filter(a => String(a.studentId) === String(selectedStudent?.id));
  }, [studyAssignments, selectedStudent]);

  const myRoadmaps = useMemo(() => {
    return (myStudyAssignments || []).map(assignment => {
      const targetPlanId = assignment.planId || assignment.studyPlanId;
      const plan = (studyPlans || []).find(p => String(p.id) === String(targetPlanId));
      if (!plan) return null;
      return { assignment, plan };
    }).filter(Boolean);
  }, [myStudyAssignments, studyPlans]);

  const coachingNote = getCoachingNoteForStudent(selectedStudent?.id);
  const coachingProfile = getCoachingProfileForStudent(selectedStudent?.id);
  const studentMeetings = getMeetingsForStudent(selectedStudent?.id);
  const upcomingMeeting = studentMeetings.find(m => m.nextMeetingDate);
  const hasCoach = coachingLinks?.some(l => String(l.studentId) === String(selectedStudent?.id));

  useEffect(() => {
    if (currentUser?.role === 'student') setSelectedStudent(currentUser);
    else if (studentMembers.length > 0) setSelectedStudent(studentMembers[0]);
    else setSelectedStudent(null);
  }, [currentUser, studentMembers]);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50, linkPreset: '', customLink: '' });

  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (newGoal.title && newGoal.target > 0) {
      const link = newGoal.linkPreset === 'custom' ? newGoal.customLink : newGoal.linkPreset;
      addGoal({ title: newGoal.title, type: newGoal.type, period: newGoal.period, target: +newGoal.target, link, studentId: selectedStudent?.id });
      setShowGoalModal(false);
      setNewGoal({ title: '', type: 'Soru', period: 'Günlük', target: 50, linkPreset: '', customLink: '' });
    }
  };

  /* ── Computed Data ── */
  const tests = useMemo(() => {
    if (!selectedStudent) return [];

    const gradesList = curData?.grades || [];

    const hwTests = (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      const bookObj = books.find(b => String(b.id) === String(hw.bookId));
      const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || bookObj?.bookType === 'exam' || hw.isPhysical;

      const hwCreatedTime = hw.createdAt ? new Date(hw.createdAt).getTime() : 0;

      if (isExam) {
        const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && s.status !== 'draft') ||
          submissions.find(s => {
            if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
            const matches = (
              String(s.hwId) === String(hw.id) ||
              String(s.homeworkId) === String(hw.id) ||
              String(s.testId) === String(hw.id) ||
              String(s.id) === String(hw.id) ||
              (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id)))
            );
            if (!matches) return false;
            if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
              return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
            }
            return true;
          });

        return [{
          ...hw,
          type: 'physicalExam',
          contentType: 'physicalExam',
          isPhysical: true,
          status: sub ? 'Sonuçlandı' : 'Atandı',
          questionCount: hw.totalQuestions || (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 90,
          correctAnswers: sub ? (sub.score || 0) : 0,
          submissionId: sub?.id,
          realTestId: hw.id,
          hwId: hw.id,
          bookId: hw.bookId || (bookObj ? bookObj.id : undefined)
        }];
      }

      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && bookObj);

      if (isBook) {
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        // 1. Gather all assigned test IDs for this book assignment
        let testIdsList = [];
        const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

        if (hasTestDueDates) {
          // Kitap takibinden planlanan testler: Sadece tarihi girilmiş olanlar öğrenciye görünsün
          testIdsList = Object.entries(hw.testDueDates)
            .filter(([_, dStr]) => dStr && String(dStr).trim() !== '')
            .map(([tId, _]) => tId);
        } else if (Array.isArray(hw.tests) && hw.tests.length > 0) {
          testIdsList = hw.tests;
        } else if (bookObj) {
          const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(bookObj.id));
          if (allBookTests.length > 0) {
            testIdsList = allBookTests.map(bt => bt.id);
          }
        }

        if (testIdsList.length > 0) {
          return testIdsList.map((testId, idx) => {
            const testObj = bookTests.find(b => String(b.id) === String(testId));
            const tDateStr = hw.testDueDates?.[testId] || hw.dueDate || hw.assignedDueDate;

            const tIdStr = String(testId);
            const tUuidStr = String(toUUID(testId) || '');
            const studentIdStr = String(selectedStudent.id);
            const studentUuidStr = String(toUUID(selectedStudent.id) || '');

            const sub = (hw.submissions || []).find(s => {
              const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
              if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
              return String(s.testId) === tIdStr || String(s.bookTestId) === tIdStr || String(s.realTestId) === tIdStr || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr));
            }) || submissions.find(s => {
              const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
              if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
              const matchFields = [
                String(s.testId || ''),
                String(s.realTestId || ''),
                String(s.bookTestId || ''),
                String(s.metadata?.realTestId || ''),
                String(s.metadata?.bookTestId || ''),
                String(s.metadata?.realId || '')
              ];
              if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
                matchFields.push(...s.bookTestIds.map(String));
              }
              const matches = matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr) || toUUID(f) === tIdStr || (tUuidStr && toUUID(f) === tUuidStr)));
              if (!matches) return false;
              if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
                return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
              }
              return true;
            });

            const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
            const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
            const testName = testObj?.name || (testIdsList.length > 1 ? `Test ${idx + 1}` : 'Test');

            return {
              ...hw,
              id: `bt_${hw.id}_${testId}`,
              realTestId: testId,
              testId: testId,
              bookTestId: testId,
              hwId: hw.id,
              bookId: hw.bookId || bookObj?.id,
              sourceType: 'trackedBook',
              isBookAssignment: true,
              subject: subjectName,
              bookTitle: cleanBookTitle,
              testName: testName,
              title: `${cleanBookTitle} — ${testName}`,
              dueDate: tDateStr,
              status: sub ? 'Sonuçlandı' : 'Atandı',
              questionCount: testObj?.questionCount || 20,
              correctAnswers: sub ? (sub.score || 0) : 0,
              submissionId: sub?.id || sub?.supabaseId
            };
          });
        }
      }

      // Check if standard homework has multiple tests assigned
      if (Array.isArray(hw.tests) && hw.tests.length > 1) {
        return hw.tests.map((testId, idx) => {
          const tIdStr = String(testId);
          const tUuidStr = String(toUUID(testId) || '');

          const sub = (hw.submissions || []).find(s =>
            String(s.studentId) === String(selectedStudent.id) &&
            s.status !== 'in_progress' && s.status !== 'draft' &&
            (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
          ) || submissions.find(s => {
            if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
            const matchFields = [
              String(s.testId || ''),
              String(s.realTestId || ''),
              String(s.metadata?.realTestId || ''),
              String(s.metadata?.realId || '')
            ];
            const matches = matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr)));
            if (!matches) return false;
            if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
              return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
            }
            return true;
          });

          return {
            ...hw,
            id: `hw_${hw.id}_${testId}`,
            realTestId: testId,
            testId: testId,
            hwId: hw.id,
            title: `${hw.title || hw.name || 'Ödev'} (Test ${idx + 1})`,
            status: sub ? 'Sonuçlandı' : 'Atandı',
            questionCount: hw.totalQuestions ? Math.round(hw.totalQuestions / hw.tests.length) : 10,
            correctAnswers: sub ? (sub.score || 0) : 0,
            submissionId: sub?.id
          };
        });
      }

      const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && s.status !== 'draft') ||
        submissions.find(s => {
          if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status !== 'draft') return false;
          const matches = (
            String(s.hwId) === String(hw.id) ||
            String(s.homeworkId) === String(hw.id) ||
            String(s.testId) === String(hw.id) ||
            String(s.id) === String(hw.id) ||
            (hw.questionIds && Array.isArray(hw.questionIds) && hw.questionIds.some(qid => String(s.testId) === String(qid) || String(s.realTestId) === String(qid))) ||
            (hw.sections && Array.isArray(hw.sections) && hw.sections.some(sec => String(s.testId) === String(sec.id || sec.questionId))) ||
            (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id)))
          );
          if (!matches) return false;
          if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
            return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
          }
          return true;
        });

      return [{
        ...hw,
        status: sub ? 'Sonuçlandı' : 'Atandı',
        questionCount: hw.totalQuestions || 10,
        correctAnswers: sub ? (sub.score || 0) : 0,
        submissionId: sub?.id
      }];
    });

    // Also include completed standalone tracked book tests (Kitap takibindeki gerçek çözümler)
    const existingTestIds = new Set(hwTests.map(t => String(t.realTestId || t.testId || t.id)));
    const standaloneBookTests = [];

    (submissions || []).forEach(sub => {
      if (!sub) return;
      const studentIdStr = String(selectedStudent.id);
      const studentUuidStr = String(toUUID(selectedStudent.id) || '');
      const isMatchStudent = String(sub.studentId) === studentIdStr || (studentUuidStr && String(sub.studentId) === studentUuidStr) || (studentUuidStr && toUUID(sub.studentId) === studentUuidStr);
      if (!isMatchStudent) return;

      // Filter out drafts & in-progress
      const subIdStr = String(sub.id || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
      if (sub.status === 'draft' || sub.status === 'in_progress') return;
      const raw = sub.raw_data || {};
      if (raw.status === 'draft' || raw.status === 'in_progress') return;

      if (sub.sourceType !== 'trackedBook' && !sub.bookId && !sub.bookTestId) return;

      const correct = sub.correctCount ?? raw.correctCount ?? 0;
      const wrong = sub.wrongCount ?? raw.wrongCount ?? 0;
      const blank = sub.blankCount ?? raw.blankCount ?? 0;
      if (correct === 0 && wrong === 0 && blank === 0 && (!sub.answers || sub.answers.length === 0)) return;

      const bTestId = String(sub.bookTestId || sub.testId || raw.bookTestId || raw.testId || '');
      if (bTestId && existingTestIds.has(bTestId)) return;

      const testObj = bookTests.find(b => String(b.id) === bTestId || (toUUID(b.id) && String(toUUID(b.id)) === bTestId));
      const bookObj = books.find(b => String(b.id) === String(sub.bookId || raw.bookId || testObj?.bookId));
      const cleanBookTitle = (bookObj?.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();
      const testName = testObj?.name || raw.testTitle || sub.testTitle || 'Test';

      const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
      const subjectName = subjObj?.name || bookObj?.subject || cleanBookTitle;
      const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(testObj?.topicId || raw.topicId));
      const topicName = topicObj?.name || '';

      const fullTestTitle = topicName
        ? `${cleanBookTitle} — ${subjectName} · ${topicName} (${testName})`
        : `${cleanBookTitle} — ${subjectName} (${testName})`;

      const total = Math.max(sub.totalQuestions || raw.totalQuestions || testObj?.questionCount || 0, correct + wrong + blank, 1);
      const scorePct = sub.scorePercentage !== undefined && sub.scorePercentage !== null
        ? Math.round(sub.scorePercentage)
        : (raw.scorePercentage !== undefined && raw.scorePercentage !== null
          ? Math.round(raw.scorePercentage)
          : Math.min(100, Math.round((correct / total) * 100)));

      if (bTestId) existingTestIds.add(bTestId);
      standaloneBookTests.push({
        id: `tracked_sub_${bTestId}_${selectedStudent.id}`,
        realTestId: bTestId,
        testId: bTestId,
        bookTestId: bTestId,
        bookId: sub.bookId || raw.bookId || bookObj?.id,
        sourceType: 'trackedBook',
        isBookAssignment: true,
        subject: subjectName,
        bookTitle: cleanBookTitle,
        subjectName,
        topicName,
        testName,
        title: fullTestTitle,
        dueDate: sub.submittedAt || sub.completedAt || raw.submittedAt || new Date().toISOString(),
        status: 'Sonuçlandı',
        questionCount: total,
        correctAnswers: scorePct,
        submissionId: sub.id || sub.supabaseId
      });
    });

    return [...hwTests, ...standaloneBookTests];
  }, [homeworks, submissions, selectedStudent, curData, books, bookTests]);

  const assignments = useMemo(() => {
    if (!selectedStudent) return [];
    return studyAssignments.filter(s => s.studentId === selectedStudent?.id).map(a => ({ ...a, planName: 'Ders Planı', planLink: '#' }));
  }, [studyAssignments, selectedStudent]);

  const pendingTasks = useMemo(() => {
    const tTasks = tests.filter(t => t.status === 'Atandı').map(t => {
      const dueDateObj = parseSafeDate(t.dueDate);
      
      let resolvedType = t.type;
      let resolvedSourceType = t.sourceType || t.contentType;
      
      if (!resolvedType || resolvedType === 'test') {
        if (t.isOpenEnded || t.questionType === 'acik_uclu') {
          resolvedType = 'acik_uclu';
        } else if (t.questionType === 'coktan_secmeli') {
          resolvedType = 'coktan_secmeli';
        } else {
          const firstQId = t.questionIds?.[0];
          const firstQ = allQuestions?.find(q => q.id === firstQId);
          if (firstQ) {
            resolvedType = firstQ.type || 'coktan_secmeli';
            if (!resolvedSourceType) {
              resolvedSourceType = firstQ.sourceType || firstQ.contentType;
            }
          }
        }
      }
      
      return { 
        ...t,
        id: t.id, 
        realTestId: t.realTestId || t.testId,
        testId: t.testId || t.realTestId,
        hwId: t.hwId,
        type: resolvedType || t.type || 'test', 
        title: t.title,
        bookTitle: t.bookTitle,
        testName: t.testName,
        subject: getCategoryName(t), 
        dueDateStr: dueDateObj.toLocaleDateString('tr-TR'), 
        dueDateObj, 
        questionCount: t.questionCount, 
        durationMinutes: (t.questionCount || 0) * 2 || 30, 
        sourceType: resolvedSourceType || t.sourceType 
      };
    });
    return [...tTasks].sort((a, b) => a.dueDateObj - b.dueDateObj);
  }, [tests, assignments, allQuestions]);

  const stats = useMemo(() => {
    // 1. Direct Book Tracking Overall Metrics (Doğrudan Kitap Takibi Başarısı)
    const studentIdStr = String(selectedStudent?.id || '');
    const studentUuidStr = String(toUUID(selectedStudent?.id) || '');

    const validStudentSubs = (submissions || []).filter(s => {
      if (!s) return false;
      const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
      if (!isMatchStudent) return false;

      const subIdStr = String(s.id || s.supabaseId || '');
      if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return false;
      if (s.status === 'draft' || s.status === 'in_progress') return false;
      const raw = s.raw_data || {};
      if (raw.status === 'draft' || raw.status === 'in_progress') return false;

      const correct = s.correctCount ?? raw.correctCount ?? 0;
      const wrong = s.wrongCount ?? raw.wrongCount ?? 0;
      const blank = s.blankCount ?? raw.blankCount ?? 0;
      if (correct === 0 && wrong === 0 && blank === 0 && (!s.answers || s.answers.length === 0)) return false;

      return true;
    });

    // Her test için en iyi / en güncel sonucu al (StudentBookDetailsPage mantığı)
    const bestSubsByTest = {};
    validStudentSubs.forEach(s => {
      const raw = s.raw_data || {};
      const testId = String(s.bookTestId || s.testId || raw.bookTestId || raw.testId || s.id);
      const correct = s.correctCount ?? raw.correctCount ?? 0;
      const wrong = s.wrongCount ?? raw.wrongCount ?? 0;
      const blank = s.blankCount ?? raw.blankCount ?? 0;
      const rawTotal = s.totalQuestions ?? raw.totalQuestions ?? 0;
      const total = Math.max(rawTotal, correct + wrong + blank, 1);

      const scorePct = s.scorePercentage !== undefined && s.scorePercentage !== null
        ? Math.round(s.scorePercentage)
        : (raw.scorePercentage !== undefined && raw.scorePercentage !== null
          ? Math.round(raw.scorePercentage)
          : Math.min(100, Math.round((correct / total) * 100)));

      const existing = bestSubsByTest[testId];
      if (!existing || correct > existing.correct || (correct === existing.correct && scorePct > existing.scorePct)) {
        bestSubsByTest[testId] = {
          ...s,
          testId,
          correct,
          wrong,
          blank,
          total,
          scorePct
        };
      }
    });

    const uniqueSolvedTests = Object.values(bestSubsByTest);

    let bookTotalCorrect = 0;
    let bookTotalWrong = 0;
    let bookTotalBlank = 0;

    uniqueSolvedTests.forEach(sub => {
      bookTotalCorrect += sub.correct || 0;
      bookTotalWrong += sub.wrong || 0;
      bookTotalBlank += sub.blank || 0;
    });

    const bookTotalQuestions = bookTotalCorrect + bookTotalWrong + bookTotalBlank;
    const directBookSuccessRate = bookTotalQuestions > 0
      ? Math.round((bookTotalCorrect / bookTotalQuestions) * 100)
      : 0;

    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalAll = Math.max(tests.length, uniqueSolvedTests.length);
    const totalDone = Math.max(completedTests.length, uniqueSolvedTests.length);
    const completedRate = totalAll > 0 ? (totalDone / totalAll) * 100 : 0;

    const overdueCount = tests.filter(t => t.status === 'Atandı' && isPast(parseSafeDate(t.dueDate)) && !isToday(parseSafeDate(t.dueDate))).length;

    return {
      testCount: totalAll,
      pendingCount: Math.max(0, tests.filter(t => t.status === 'Atandı').length),
      successRate: directBookSuccessRate,
      overdueCount,
      completedRate,
      totalSolvedTests: uniqueSolvedTests.length,
      totalQ: bookTotalQuestions,
      totalCorrect: bookTotalCorrect,
      unifiedSubmissions: uniqueSolvedTests
    };
  }, [tests, assignments, submissions, selectedStudent, curData]);

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => String(g.studentId) === String(selectedStudent.id));
  }, [goals, selectedStudent]);

  const gradeLabel = curData?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';

  /* ─── Derived values ─── */
  const today = new Date();
  const todayStr = today.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayProgramInfo = useMemo(() => {
    const daysMap = [
      { key: 'Paz', long: 'Pazar' },
      { key: 'Pzt', long: 'Pazartesi' },
      { key: 'Sal', long: 'Salı' },
      { key: 'Çrş', long: 'Çarşamba' },
      { key: 'Prş', long: 'Perşembe' },
      { key: 'Cum', long: 'Cuma' },
      { key: 'Cts', long: 'Cumartesi' }
    ];
    const now = new Date();
    const currentDayObj = daysMap[now.getDay()];
    
    const rawProg = coachingProfile?.weeklyProgram;
    let manualItems = [];
    if (Array.isArray(rawProg)) {
      const todayProg = rawProg.find(r => r.day === currentDayObj.key);
      manualItems = todayProg?.items || [];
    }

    // Auto-populate active homeworks based on start date & due date
    const autoHwItems = [];
    const todayYMD = now.toISOString().split('T')[0];
    const todayTime = new Date(todayYMD).getTime();
    const studentId = selectedStudent?.id;

    (homeworks || []).forEach(hw => {
      const gradesList = curData?.grades || [];
      if (!isHomeworkForStudent(hw, selectedStudent, gradesList)) return;

      // A) Book Assignment
      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || hw.bookId;
      if (isBook) {
        const bookObj = books.find(b => String(b.id) === String(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        if (hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
          Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const tYMD = tDateStr.split('T')[0];
            if (todayYMD === tYMD) {
              const tObj = bookTests.find(b => String(b.id) === String(testId));
              const testName = tObj?.name || 'Test';
              const qCount = tObj?.questionCount || 20;

              const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(tObj?.subjectId));
              const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
              const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(tObj?.topicId));
              const topicName = topicObj?.name || tObj?.topicName || '';

              const displayHeader = topicName ? `${subjectName} • ${topicName}` : subjectName;
              const displaySub = `${cleanBookTitle} — ${testName}`;

              const tIdStr = String(testId);
              const tUuidStr = String(toUUID(testId) || '');

              const isSolved = submissions.some(s =>
                String(s.studentId) === String(studentId) &&
                s.status !== 'in_progress' && s.status !== 'draft' &&
                (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || String(s.bookTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
              );

              // Exclude solved/completed tests so they disappear from today's program view
              if (isSolved) return;

              const existsInManual = manualItems.some(m => m.id === `book_test_${hw.id}_${testId}`);
              if (!existsInManual) {
                autoHwItems.push({
                  id: `book_test_${hw.id}_${testId}`,
                  hwId: hw.id,
                  testId: testId,
                  isAutoHomework: true,
                  taskType: 'kitap',
                  subject: displayHeader,
                  topic: displaySub,
                  questionCount: `${qCount} soru`,
                  time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                  done: false
                });
              }
            }
          });
          return;
        }
      }

      // B) Standard Homework or overall due date
      const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
      const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
      const startTime = startYMD ? new Date(startYMD).getTime() : null;

      const rawDue = hw.dueDate || hw.assignedDueDate;
      const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
      const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

      let isForToday = false;
      if (dueTime && startTime) {
        isForToday = todayTime >= startTime && todayTime <= dueTime;
      } else if (dueTime) {
        isForToday = todayYMD === dueYMD || todayTime <= dueTime;
      } else if (startTime) {
        isForToday = todayTime === startTime;
      } else {
        isForToday = true;
      }

      if (isForToday) {
        // If homework has multiple tests, find the unsolved ones
        if (Array.isArray(hw.tests) && hw.tests.length > 1) {
          hw.tests.forEach((testId, idx) => {
            const tIdStr = String(testId);
            const tUuidStr = String(toUUID(testId) || '');
            const isTestSolved = submissions.some(s =>
              String(s.studentId) === String(studentId) &&
              s.status !== 'in_progress' && s.status !== 'draft' &&
              (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
            );
            if (isTestSolved) return;

            const tObj = bookTests.find(b => String(b.id) === tIdStr);
            const testTitle = tObj?.name || `Test ${idx + 1}`;
            const existsInManual = manualItems.some(m => m.id === `auto_hw_${hw.id}_${testId}` || m.hwId === hw.id);
            if (!existsInManual) {
              autoHwItems.push({
                id: `auto_hw_${hw.id}_${testId}`,
                hwId: hw.id,
                testId: testId,
                isAutoHomework: true,
                taskType: isBook ? 'kitap' : 'ödev',
                subject: hw.subject || 'Atanan Kitap/Ödev',
                topic: `${hw.title || 'Ödev'} — ${testTitle}`,
                questionCount: tObj?.questionCount ? `${tObj.questionCount} soru` : null,
                time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
                done: false
              });
            }
          });
          return;
        }

        const sub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId)) ||
          submissions.find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
        const isDone = !!sub;

        // Exclude completed standard homeworks so they disappear from today's program view
        if (isDone) return;

        const existsInManual = manualItems.some(m => m.id === `auto_hw_${hw.id}` || m.hwId === hw.id);
        if (!existsInManual) {
          autoHwItems.push({
            id: `auto_hw_${hw.id}`,
            hwId: hw.id,
            isAutoHomework: true,
            taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
            subject: hw.subject || 'Atanan Ödev',
            topic: hw.title || hw.name || 'Ödev Görevi',
            questionCount: hw.totalQuestions ? `${hw.totalQuestions}` : null,
            time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
            done: false
          });
        }
      }
    });

    // C) Roadmap / Study Plan assigned items with target dates (dueDate)
    const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(studentId));
    studentAssignments.forEach(assignment => {
      // Tamamlanmış yol haritalarını tamamen hariç tut
      if (assignment.status === 'completed' || assignment.status === 'done' || assignment.isCompleted) return;

      const plan = (studyPlans || []).find(p => String(p.id) === String(assignment.planId || assignment.studyPlanId));
      if (!plan) return;

      let compTopics = [];
      if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
      else if (typeof assignment.completedTopics === 'string') {
        try { compTopics = JSON.parse(assignment.completedTopics); } catch(e) {}
      } else if (typeof assignment.topic === 'string') {
        try { compTopics = JSON.parse(assignment.topic); } catch(e) {}
      }
      const completedTopicsSet = new Set(compTopics.map(String));

      // Tüm adımları tamamlanmış mı kontrol et
      let totalPlanSteps = 0;
      let completedPlanSteps = 0;
      (plan.subjects || []).forEach(subject => {
        if (subject.dueDate) {
          totalPlanSteps++;
          if (completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name)) completedPlanSteps++;
        }
        (subject.topics || []).forEach(topic => {
          totalPlanSteps++;
          if (completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name)) completedPlanSteps++;
        });
      });

      if (totalPlanSteps > 0 && completedPlanSteps >= totalPlanSteps) {
        return; // Tüm harita bitti, programa ekleme
      }

      (plan.subjects || []).forEach(subject => {
        const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
        const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
        const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

        // Yalnızca alt konuları olmayan bağımsız ders/ünite varsa ve tamamlanmamışsa ekle
        if (!hasChildTopics && subject.dueDate) {
          const sYMD = subject.dueDate.split('T')[0];
          if (todayYMD === sYMD && !isSubjectCompleted) {
            const existsInManual = manualItems.some(m => m.id === `roadmap_sub_${assignment.id}_${subject.id}`);
            if (!existsInManual) {
              autoHwItems.push({
                id: `roadmap_sub_${assignment.id}_${subject.id}`,
                roadmapAssignmentId: assignment.id,
                isAutoHomework: true,
                isRoadmapTask: true,
                taskType: 'konu',
                subject: `${plan.title} • ${subject.name}`,
                topic: subject.name,
                time: `Hedef: ${new Date(subject.dueDate).toLocaleDateString('tr-TR')}`,
                done: false
              });
            }
          }
        }

        // Alt konuların kendi hedef tarihlerine göre kontrol et
        (subject.topics || []).forEach(topic => {
          if (topic.dueDate) {
            const tYMD = topic.dueDate.split('T')[0];
            if (todayYMD === tYMD) {
              const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
              if (!isCompleted) {
                const existsInManual = manualItems.some(m => m.id === `roadmap_top_${assignment.id}_${topic.id}`);
                if (!existsInManual) {
                  autoHwItems.push({
                    id: `roadmap_top_${assignment.id}_${topic.id}`,
                    roadmapAssignmentId: assignment.id,
                    isAutoHomework: true,
                    isRoadmapTask: true,
                    taskType: 'konu',
                    subject: `${plan.title} • ${subject.name}`,
                    topic: topic.name,
                    time: `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`,
                    done: false
                  });
                }
              }
            }
          }
        });
      });
    });

    const allItems = [...autoHwItems, ...manualItems];
    // Tamamlanan görevleri günün aktif programından filtrele
    const pendingItems = allItems.filter(item => !item.done);

    return {
      dayName: currentDayObj.long,
      dayKey: currentDayObj.key,
      totalCount: allItems.length,
      completedCount: allItems.filter(i => i.done).length,
      items: pendingItems,
      hasAllCompleted: allItems.length > 0 && pendingItems.length === 0
    };
  }, [coachingProfile, homeworks, selectedStudent, curData, submissions, books, bookTests, studyAssignments, studyPlans]);

  const handleToggleTodayTask = async (taskId) => {
    if (!coachingProfile || !coachingProfile.weeklyProgram) return;
    const updatedWeeklyProgram = coachingProfile.weeklyProgram.map(dayRow => {
      if (dayRow.day === todayProgramInfo.dayKey) {
        return {
          ...dayRow,
          items: (dayRow.items || []).map(item => item.id === taskId ? { ...item, done: !item.done } : item)
        };
      }
      return dayRow;
    });
    await saveCoachingProfile({
      ...coachingProfile,
      studentId: selectedStudent?.id,
      weeklyProgram: updatedWeeklyProgram
    });
  };

  const completedCount = tests.filter(t => t.status === 'Sonuçlandı').length;
  const overdueCount = stats.overdueCount;
  const pendingCount = stats.pendingCount;
  const successPct = Math.round(stats.successRate);
  const progressPct = Math.floor(stats.completedRate);

  /* ─── Design Tokens ─── */
  const S = {
    section: { marginBottom: '1.25rem' },
    sectionTitle: { fontSize: '0.76rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, textShadow: '0 2px 8px rgba(0,0,0,0.3)' },
    card: { background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.88) 0%, rgba(49, 46, 129, 0.88) 100%)', backdropFilter: 'blur(20px)', borderRadius: 22, boxShadow: '0 12px 36px rgba(0,0,0,0.25)', border: '1.5px solid rgba(255,255,255,0.20)', overflow: 'hidden' },
  };

  const subjectIcons = {
    'Matematik': '📐', 'Türkçe': '📚', 'Fen Bilimleri': '🔬',
    'Sosyal Bilgiler': '🌍', 'İnkılap Tarihi': '🏛️', 'İngilizce': '🇬🇧', 'Din Kültürü': '🌙'
  };

  const statChips = [
    { label: 'Toplam', value: tests.length, g: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', sh: 'rgba(99, 102, 241, 0.35)', border: '1.5px solid rgba(199, 210, 254, 0.45)', icon: '📋' },
    { label: 'Tamamlandı', value: completedCount, g: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', sh: 'rgba(16, 185, 129, 0.35)', border: '1.5px solid rgba(167, 243, 208, 0.45)', icon: '✅' },
    { label: 'Bekliyor', value: pendingCount, g: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', sh: 'rgba(245, 158, 11, 0.35)', border: '1.5px solid rgba(254, 215, 170, 0.45)', icon: '⏳' },
    { label: 'Gecikti', value: overdueCount, g: 'linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)', sh: 'rgba(244, 63, 94, 0.35)', border: '1.5px solid rgba(254, 205, 211, 0.45)', icon: '🔥' },
  ];

  const quickTiles = [
    {
      icon: BookOpen,
      label: 'Ders Özetleri',
      sub: 'Konu anlatımları & flashcard',
      to: '/student/summaries',
      accentColor: '#10b981',
      iconGradient: 'linear-gradient(135deg, #059669, #10b981)',
      glow: 'rgba(16, 185, 129, 0.25)',
      border: 'rgba(52, 211, 153, 0.35)',
      badgeText: 'Kütüphane'
    },
    {
      icon: BarChart3,
      label: 'Sonuçlarım',
      sub: 'Karne, grafik & net analizi',
      to: '/student-results',
      accentColor: '#6366f1',
      iconGradient: 'linear-gradient(135deg, #4f46e5, #818cf8)',
      glow: 'rgba(99, 102, 241, 0.25)',
      border: 'rgba(165, 180, 252, 0.35)',
      badgeText: `${tests.length} Sınav`
    },
    {
      icon: AlertCircle,
      label: 'Hata Defterim',
      sub: 'Yanlış soru havuzu & tekrar',
      to: '/wrong-answers',
      accentColor: '#f43f5e',
      iconGradient: 'linear-gradient(135deg, #e11d48, #fb7185)',
      glow: 'rgba(244, 63, 94, 0.25)',
      border: 'rgba(251, 113, 133, 0.35)',
      badgeText: 'Analiz Havuzu'
    },
    {
      icon: BookMarked,
      label: 'Kitaplarım',
      sub: 'Soru bankası & ilerleme',
      to: '/student/books',
      accentColor: '#06b6d4',
      iconGradient: 'linear-gradient(135deg, #0891b2, #22d3ee)',
      glow: 'rgba(6, 182, 212, 0.25)',
      border: 'rgba(103, 232, 249, 0.35)',
      badgeText: `${books?.length || 0} Kitap`
    },
    {
      icon: Target,
      label: 'Hedeflerim',
      sub: 'Günlük & haftalık takip',
      to: '/goals',
      accentColor: '#f97316',
      iconGradient: 'linear-gradient(135deg, #ea580c, #fb923c)',
      glow: 'rgba(249, 115, 22, 0.25)',
      border: 'rgba(253, 186, 116, 0.35)',
      badgeText: `${studentGoals?.length || 0} Hedef`
    },
    {
      icon: CalendarDays,
      label: 'Programım',
      sub: 'Haftalık ders planı',
      to: '/my-program',
      accentColor: '#a855f7',
      iconGradient: 'linear-gradient(135deg, #7c3aed, #c084fc)',
      glow: 'rgba(168, 85, 247, 0.25)',
      border: 'rgba(216, 180, 254, 0.35)',
      badgeText: todayProgramInfo.totalCount > 0 ? `${todayProgramInfo.completedCount}/${todayProgramInfo.totalCount} Görev` : 'Haftalık'
    },
  ];

  const renderRoadmaps = () => {
    if (myRoadmaps.length === 0) return null;
    return (
      <div className="sd-section" style={{ ...S.card, overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)', padding:'0.9rem 1.2rem', display:'flex', alignItems:'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width:28, height:28, borderRadius:9, background:'rgba(255,255,255,0.22)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.88rem' }}>🗺️</div>
            <span style={{ fontSize:'0.82rem', fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:'0.06em' }}>Yol Haritalarım</span>
          </div>
          <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#ffffff', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.55rem', borderRadius: 99 }}>{myRoadmaps.length} Plan</span>
        </div>
        <div style={{ padding:'0.75rem' }}>
          {myRoadmaps.map(({ assignment, plan }) => {
            const total = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
            const done = assignment.completedTopics?.length || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={assignment.id} className="sd-hw-card"
                onClick={() => navigate(`/student/study-plan/${assignment.id}`)}
                style={{ padding:'0.95rem', borderRadius:16, display:'flex', alignItems:'center', gap:12, marginBottom:6, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(216,180,254,0.25)' }}>
                <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#6d28d9,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 14px rgba(109,40,217,0.4)' }}><Target size={20} color="white" /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:'0.88rem', color:'white', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plan.title}</div>
                  <div style={{ height:6, background:'rgba(255,255,255,0.15)', borderRadius:99, overflow:'hidden', marginBottom:4 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#38bdf8,#c084fc)', borderRadius:99, transition:'width 1s', boxShadow:'0 0 8px rgba(192,132,252,0.6)' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', fontWeight:800, color:'rgba(255,255,255,0.8)' }}>
                    <span>{done}/{total} konu</span><span style={{ color:'#c084fc', fontWeight:900 }}>%{pct}</span>
                  </div>
                </div>
                <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.38) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.30) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.30) 0%, transparent 55%), linear-gradient(180deg, #111e38 0%, #18284e 35%, #1f3363 70%, #14213d 100%)', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: '#f8fafc' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes sdFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sdPulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.5)} 50%{box-shadow:0 0 0 10px rgba(167,139,250,0)} }
        @keyframes sdShimmer { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
        @keyframes aurora { 0%,100%{transform:translate(0,0) scale(1);opacity:.6} 33%{transform:translate(28px,-18px) scale(1.1);opacity:.8} 66%{transform:translate(-18px,14px) scale(.95);opacity:.5} }
        .sd-tile { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); cursor:pointer; user-select:none; }
        .sd-tile:hover { transform: translateY(-4px) scale(1.02); filter: brightness(1.08); }
        .sd-tile:active { transform: scale(0.96); }
        .sd-btn { transition: all 0.18s ease; user-select:none; }
        .sd-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .sd-btn:active { transform: scale(0.96); }
        .sd-stat-chip { transition: all 0.2s ease; user-select:none; }
        .sd-stat-chip:hover { transform: translateY(-3px); filter: brightness(1.1); }
        .sd-stat-chip:active { transform: scale(0.96); }
        .sd-hw-card { transition: all 0.2s ease; cursor:pointer; user-select:none; }
        .sd-hw-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.3) !important; filter: brightness(1.05); }
        .sd-hw-card:active { transform: scale(0.98); }
        .sd-section { animation: sdFadeUp 0.5s ease both; }
        .sd-task-row { transition: all 0.15s ease; user-select:none; }
        .sd-task-row:hover { filter: brightness(1.1); }
        .sd-task-row:active { transform: scale(0.98); }
        .scroll-hide { scrollbar-width:none; -ms-overflow-style:none; }
        .scroll-hide::-webkit-scrollbar { display:none; }
        @media(min-width:900px) {
          .sd-content-outer { width:100%; max-width:100%; margin:0; padding:0 1.5rem 3rem; }
          .sd-stat-outer { width:100%; max-width:100%; margin:0; padding:0 1.5rem; }
          .sd-hero-inner { width:100%; max-width:100%; margin:0; }
          .sd-main-grid { display:grid; grid-template-columns:1fr 360px; gap:1.5rem; align-items:start; }
        }
        @media(max-width:899px) {
          .sd-content-outer { padding:0 0.85rem calc(env(safe-area-inset-bottom, 0px) + 95px); }
          .sd-stat-outer { padding:0 0.85rem; }
          .sd-main-grid { display:flex; flex-direction:column; gap: 1.15rem; }
        }
      `}</style>

      {/* ════ HERO (NATIVE APP HEADER) ════ */}
      <div style={{
        background:'linear-gradient(135deg, #3730a3 0%, #4f46e5 25%, #7c3aed 55%, #9333ea 80%, #a855f7 100%)',
        padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 1.1rem) 1rem 3rem' : '2.25rem 2rem 4rem',
        position:'relative',
        overflow:'hidden',
        borderBottom:'1.5px solid rgba(255,255,255,0.25)',
        backdropFilter:'blur(20px)'
      }}>
        <div style={{ position:'absolute', top:-80, right:-60, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.4) 0%,transparent 70%)', animation:'aurora 8s ease infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-40, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(236,72,153,0.25) 0%,transparent 70%)', animation:'aurora 12s ease infinite reverse', pointerEvents:'none' }} />

        <div className="sd-hero-inner" style={{ position:'relative', zIndex:2 }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 12 : 16, flex:1, minWidth:0 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width: isMobile ? 62 : 76, height: isMobile ? 62 : 76, borderRadius:'50%', background: avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile ? '1.55rem' : '1.9rem', fontWeight:900, color:'white', border:'3px solid rgba(255,255,255,0.4)', boxShadow:'0 8px 28px rgba(0,0,0,0.4)', animation:'sdPulseRing 3s ease infinite' }}>
                  {selectedStudent?.name?.charAt(0) || 'Ö'}
                </div>
                <div style={{ position:'absolute', bottom:2, right:2, width:14, height:14, borderRadius:'50%', background:'#4ade80', border:'2.5px solid rgba(255,255,255,0.85)', boxShadow:'0 0 8px #4ade80' }} />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.75)', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>Hoş Geldin 👋</div>
                <h1 style={{ fontSize: isMobile ? '1.45rem' : '1.9rem', fontWeight:900, color:'white', margin:0, lineHeight:1.05, letterSpacing:'-0.025em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textShadow:'0 2px 10px rgba(0,0,0,0.3)' }}>
                  {selectedStudent?.name || 'Öğrenci'}
                </h1>
                <div style={{ marginTop:7, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.18)', borderRadius:99, padding:'0.22rem 0.65rem', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.25)' }}>
                    <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.95)', fontWeight:800 }}>📅 {todayStr}</span>
                  </div>
                  {hasCoach && (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(74,222,128,0.22)', borderRadius:99, padding:'0.22rem 0.65rem', border:'1px solid rgba(74,222,128,0.4)', boxShadow:'0 0 10px rgba(74,222,128,0.2)' }}>
                      <span style={{ fontSize:'0.62rem', color:'#4ade80', fontWeight:900 }}>🎓 Koçum Var</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ position:'relative', width: isMobile ? 72 : 86, height: isMobile ? 72 : 86, flexShrink:0 }}>
              <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', transform:'rotate(-90deg)' }} viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.91" fill="none"
                  stroke={successPct >= 70 ? '#4ade80' : successPct >= 50 ? '#fbbf24' : '#f87171'}
                  strokeWidth="3" strokeDasharray={`${Math.min(successPct,100)} 100`} strokeLinecap="round"
                  style={{ transition:'stroke-dasharray 1.2s ease' }}
                />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.12)', borderRadius:'50%', backdropFilter:'blur(10px)', border:'1.5px solid rgba(255,255,255,0.3)', boxShadow:'0 0 20px rgba(99,102,241,0.35)' }}>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight:900, color:'white', lineHeight:1, textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>%{successPct}</div>
                <div style={{ fontSize:'0.48rem', fontWeight:900, color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Başarı</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════ STAT CHIPS ════ */}
      <div className="sd-stat-outer" style={{ marginTop: isMobile ? -28 : -32, marginBottom:'1.4rem', position:'relative', zIndex:10 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap: isMobile ? 6 : 12 }}>
          {statChips.map((c, i) => (
            <div key={i} className="sd-stat-chip sd-tile" style={{ background: c.g, borderRadius: isMobile ? 14 : 18, padding: isMobile ? '0.65rem 0.2rem' : '0.95rem 0.7rem', boxShadow:`0 8px 24px ${c.sh}`, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', border: c.border, animation:`sdFadeUp 0.4s ease ${i*0.06}s both`, minWidth:0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: isMobile ? '0.95rem' : '1.15rem', lineHeight:1, marginBottom:3 }}>{c.icon}</div>
              <div style={{ fontSize: isMobile ? '1.15rem' : '1.45rem', fontWeight:900, color:'#ffffff', lineHeight:1, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{c.value}</div>
              <div style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', fontWeight:900, color:'rgba(255,255,255,0.88)', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>{c.label}</div>
            </div>
          ))}
          <div className="sd-stat-chip sd-tile" style={{ background:'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', borderRadius: isMobile ? 14 : 18, padding: isMobile ? '0.65rem 0.2rem' : '0.95rem 0.7rem', boxShadow:'0 8px 24px rgba(168, 85, 247, 0.4)', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', border:'1.5px solid rgba(233, 213, 255, 0.45)', animation:'sdFadeUp 0.4s ease 0.3s both', minWidth:0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: isMobile ? '0.95rem' : '1.15rem', lineHeight:1, marginBottom:3 }}>🏆</div>
            <div style={{ fontSize: isMobile ? '1.15rem' : '1.45rem', fontWeight:900, color:'#ffffff', lineHeight:1, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>%{progressPct}</div>
            <div style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', fontWeight:900, color:'rgba(255,255,255,0.88)', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>Tamamlanma</div>
          </div>
        </div>
      </div>

      {/* ════ CONTENT WRAP ════ */}
      <div className="sd-content-outer" style={{ paddingBottom:'2rem' }}>

        {coachingNote && (
          <div className="sd-section" style={{ background:'linear-gradient(135deg,#78350f 0%,#b45309 50%,#d97706 100%)', borderRadius:20, padding:'0.95rem 1.2rem', border:'1.5px solid rgba(251,191,36,0.5)', boxShadow:'0 8px 28px rgba(180,83,9,0.35)', display:'flex', alignItems:'flex-start', gap:12, marginBottom:'1.4rem' }}>
            <div style={{ fontSize:'1.3rem', flexShrink:0 }}>💬</div>
            <div>
              <div style={{ fontSize:'0.64rem', fontWeight:900, color:'#fde68a', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Koç Notunuz</div>
              <div style={{ fontSize:'0.86rem', color:'#ffffff', fontWeight:700, lineHeight:1.5 }}>{typeof coachingNote === 'string' ? coachingNote : coachingNote?.note || ''}</div>
            </div>
          </div>
        )}

        <div className="sd-main-grid">

          {/* ──── LEFT COLUMN ──── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* QUICK TILES (PRO BENTO GLASS HUB - Desktop only) */}
            {!isMobile && (
              <div className="sd-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={S.sectionTitle}><Zap size={15} color="#38bdf8" /> Hızlı Erişim Merkezi</div>
                  <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#c7d2fe', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.15rem 0.5rem', borderRadius: 99, letterSpacing: '0.04em' }}>6 Modül</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  {quickTiles.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => navigate(t.to)}
                        className="sd-tile"
                        style={{
                          background: `radial-gradient(ellipse at 15% 20%, ${t.glow} 0%, transparent 70%), linear-gradient(135deg, rgba(30, 41, 59, 0.88) 0%, rgba(45, 41, 105, 0.88) 100%)`,
                          backdropFilter: 'blur(20px)',
                          borderRadius: 20,
                          padding: '1.05rem 1.1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          border: `1.5px solid ${t.border}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
                          position: 'relative',
                          overflow: 'hidden',
                          animation: `sdFadeUp 0.4s ease ${i * 0.05}s both`,
                          minHeight: 124
                        }}
                      >
                        {/* Ambient Glow Orb */}
                        <div style={{ position: 'absolute', right: -15, top: -15, width: 70, height: 70, borderRadius: '50%', background: t.glow, filter: 'blur(20px)', pointerEvents: 'none' }} />

                        {/* Top Row: Icon Badge + Mini Pill Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', zIndex: 2 }}>
                          <div style={{
                            width: 42,
                            height: 42,
                            borderRadius: 13,
                            background: t.iconGradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 14px ${t.glow}`,
                            border: '1.5px solid rgba(255, 255, 255, 0.35)',
                            flexShrink: 0
                          }}>
                            <Icon size={20} color="#ffffff" strokeWidth={2.3} />
                          </div>

                          {t.badgeText && (
                            <span style={{
                              fontSize: '0.56rem',
                              fontWeight: 900,
                              color: '#ffffff',
                              background: 'rgba(255, 255, 255, 0.12)',
                              border: '1px solid rgba(255, 255, 255, 0.22)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: 99,
                              letterSpacing: '0.03em',
                              textTransform: 'uppercase',
                              backdropFilter: 'blur(8px)'
                            }}>
                              {t.badgeText}
                            </span>
                          )}
                        </div>

                        {/* Bottom Info: Title, Subtitle, Arrow */}
                        <div style={{ width: '100%', zIndex: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                              {t.label}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.72)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.sub}
                            </div>
                          </div>

                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: 7,
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0
                          }}>
                            <ChevronRight size={13} color="rgba(255, 255, 255, 0.85)" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TODAY'S PROGRAM */}
            <div className="sd-section">
              <div style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', padding:'0.95rem 1.2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:'0.6rem', fontWeight:800, color:'rgba(255,255,255,0.75)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Günün Programı</div>
                    <div style={{ fontSize:'1rem', fontWeight:900, color:'white', marginTop:1 }}>{todayProgramInfo.dayName}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {todayProgramInfo.totalCount > 0 && (
                      <div style={{ background:'rgba(255,255,255,0.22)', borderRadius:99, padding:'0.2rem 0.65rem', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.3)' }}>
                        <span style={{ fontSize:'0.68rem', fontWeight:900, color:'white' }}>{todayProgramInfo.completedCount}/{todayProgramInfo.totalCount}</span>
                      </div>
                    )}
                    <Link to="/my-program" style={{ textDecoration:'none', background:'rgba(255,255,255,0.2)', borderRadius:10, padding:'0.32rem 0.7rem', fontSize:'0.68rem', fontWeight:800, color:'white', display:'flex', alignItems:'center', gap:4, border:'1px solid rgba(255,255,255,0.3)', backdropFilter:'blur(6px)' }}>
                      Tümü <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>

                <div style={{ padding:'0.75rem' }}>
                  {todayProgramInfo.items.length === 0 ? (
                    todayProgramInfo.hasAllCompleted ? (
                      <div style={{ textAlign:'center', padding:'2rem 1rem', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:'2.2rem' }}>🎉</div>
                        <div style={{ fontWeight:900, fontSize:'0.95rem', color:'#4ade80' }}>Bugünkü Görevler Tamamlandı!</div>
                        <div style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.8)' }}>Harika iş çıkardın, bugünün tüm hedeflerini bitirdin.</div>
                        <Link to="/my-program" style={{ textDecoration:'none', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'white', borderRadius:12, padding:'0.5rem 1.2rem', fontWeight:800, fontSize:'0.78rem', marginTop:6, boxShadow:'0 4px 14px rgba(22,163,74,0.4)' }}>📅 Haftalık Programa Git</Link>
                      </div>
                    ) : (
                      <div style={{ textAlign:'center', padding:'2rem 1rem', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:'2.2rem' }}>✨</div>
                        <div style={{ fontWeight:900, fontSize:'0.95rem', color:'white' }}>Bugün için program yok</div>
                        <div style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.75)' }}>Haftalık programını düzenlemek için tıkla.</div>
                        <Link to="/my-program" style={{ textDecoration:'none', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'white', borderRadius:12, padding:'0.5rem 1.2rem', fontWeight:800, fontSize:'0.78rem', marginTop:6, boxShadow:'0 4px 14px rgba(79,70,229,0.4)' }}>📅 Programa Git</Link>
                      </div>
                    )
                  ) : (() => {
                    const MAX_VISIBLE = 3;
                    const hasMore = todayProgramInfo.items.length > MAX_VISIBLE;
                    const visibleItems = (hasMore && !showAllTodayTasks) ? todayProgramInfo.items.slice(0, MAX_VISIBLE) : todayProgramInfo.items;
                    const hiddenCount = todayProgramInfo.items.length - MAX_VISIBLE;
                    const taskColors = { konu:'#6366f1', soru:'#0891b2', tekrar:'#059669', kitap:'#7c3aed', deneme:'#ea580c', ödev:'#db2777', diger:'#64748b' };
                    const taskIcons = { konu:'📖', soru:'✏️', tekrar:'🔄', kitap:'📚', deneme:'📊', ödev:'📝', diger:'📌' };
                    return (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {visibleItems.map((item, idx) => {
                          const taskColor = taskColors[item.taskType] || '#6366f1';
                          const icon = taskIcons[item.taskType] || '📌';
                          const isQuizTask = item.isAutoHomework || item.testId || item.hwId || item.roadmapAssignmentId;
                          const handleTaskClick = () => {
                            if (item.roadmapAssignmentId) { navigate(`/student/study-plan/${item.roadmapAssignmentId}`); return; }
                            if (item.testId) { navigate(`/book-quiz/${item.testId}?studentId=${selectedStudent.id}`); return; }
                            if (item.hwId) {
                              const hwObj = (homeworks || []).find(h => String(h.id) === String(item.hwId));
                              const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId));
                              const isExam = hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
                              if (isExam) navigate(`/physical-exam/${item.hwId}?studentId=${selectedStudent.id}`);
                              else if (hwObj?.isBookAssignment && hwObj?.tests?.length > 0) navigate(`/book-quiz/${hwObj.tests[0]}?studentId=${selectedStudent.id}`);
                              else navigate(`/quiz/${item.hwId}?studentId=${selectedStudent.id}`);
                              return;
                            }
                            handleToggleTodayTask(item.id);
                          };
                          return (
                            <div key={item.id || idx} className="sd-task-row"
                              onClick={handleTaskClick}
                              style={{ background: item.done ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.08)', borderRadius:14, padding:'0.7rem 0.85rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, cursor:'pointer', border:`1.5px solid ${item.done ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.14)'}`, borderLeft:`4px solid ${item.done ? '#22c55e' : taskColor}`, opacity: item.done ? 0.88 : 1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                                <div style={{ width:34, height:34, borderRadius:10, background: item.done ? '#22c55e' : `${taskColor}30`, border:`1.5px solid ${item.done ? '#22c55e' : taskColor}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0, boxShadow: item.done ? '0 0 10px rgba(34,197,94,0.4)' : 'none' }}>
                                  {item.done ? <Check size={15} color="white" strokeWidth={3} /> : icon}
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:'0.86rem', fontWeight:800, color: item.done ? '#86efac' : '#ffffff', textDecoration: item.done ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {item.subject || item.bookName || 'Ders Görevi'}
                                  </div>
                                  {item.topic && <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.75)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{item.topic}</div>}
                                  {(item.time || item.questionCount) && (
                                    <div style={{ display:'flex', gap:5, marginTop:3 }}>
                                      {item.time && <span style={{ fontSize:'0.6rem', fontWeight:800, color:'#c7d2fe', background:'rgba(99,102,241,0.25)', border:'1px solid rgba(165,180,252,0.3)', padding:'0.1rem 0.45rem', borderRadius:99 }}>⏰ {item.time}</span>}
                                      {item.questionCount && <span style={{ fontSize:'0.6rem', fontWeight:800, color:'#a5f3fc', background:'rgba(8,145,178,0.25)', border:'1px solid rgba(103,232,249,0.3)', padding:'0.1rem 0.45rem', borderRadius:99 }}>✏️ {item.questionCount}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isQuizTask ? (
                                <button onClick={e => { e.stopPropagation(); handleTaskClick(); }} className="sd-btn"
                                  style={{ background:`linear-gradient(135deg,${taskColor},#6366f1)`, color:'white', border:'none', borderRadius:10, padding:'0.38rem 0.8rem', fontSize:'0.72rem', fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap', boxShadow:`0 4px 12px ${taskColor}60`, flexShrink:0 }}>
                                  <PlayCircle size={13} /> Çöz
                                </button>
                              ) : (
                                <div style={{ fontSize:'0.64rem', fontWeight:900, padding:'0.24rem 0.6rem', borderRadius:99, background: item.done ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.25)', border: item.done ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(99,102,241,0.4)', color: item.done ? '#4ade80' : '#c7d2fe', flexShrink:0, whiteSpace:'nowrap' }}>
                                  {item.done ? '✓ Tamam' : 'Tamamla'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {hasMore && (
                          <button onClick={() => setShowAllTodayTasks(p => !p)} className="sd-btn"
                            style={{ width:'100%', padding:'0.55rem', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.18)', color:'#c7d2fe', fontWeight:800, fontSize:'0.75rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:3, backdropFilter:'blur(8px)' }}>
                            {showAllTodayTasks ? <><ChevronUp size={14} /> Daha Az Göster</> : <><ChevronDown size={14} /> {hiddenCount} görev daha</>}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* PENDING HOMEWORKS */}
            <div className="sd-section">
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <div style={{ width:28, height:28, borderRadius:9, background:'linear-gradient(135deg,#ef4444,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', boxShadow:'0 4px 12px rgba(239,68,68,0.4)' }}>📋</div>
                <span style={{ fontSize:'0.82rem', fontWeight:900, color:'#ffffff', textTransform:'uppercase', letterSpacing:'0.06em' }}>Bekleyen Ödevler</span>
                {pendingCount > 0 && (
                  <span style={{ background:'#ef4444', color:'white', borderRadius:99, padding:'0.12rem 0.55rem', fontSize:'0.65rem', fontWeight:900, animation:'sdShimmer 2s infinite', boxShadow:'0 2px 8px rgba(239,68,68,0.5)' }}>{pendingCount}</span>
                )}
              </div>

              {pendingTasks.length === 0 ? (
                <div style={{ ...S.card, padding:'2.5rem 1rem', textAlign:'center' }}>
                  <div style={{ fontSize:'2.8rem', marginBottom:8 }}>🎉</div>
                  <div style={{ fontWeight:900, color:'white', fontSize:'1rem', marginBottom:4 }}>Tüm ödevler tamamlandı!</div>
                  <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.75)' }}>Harika iş çıkardın!</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                  {pendingTasks.map(task => {
                    const dueDate = task.dueDateObj;
                    const overdue = isPast(dueDate) && !isToday(dueDate);
                    const dueToday = isToday(dueDate);
                    const daysDiff = differenceInDays(dueDate, new Date());
                    const subIcon = subjectIcons[task.subject] || '📝';

                    const matchingBook = books?.find(b => String(b.id) === String(task.bookId));
                    const isExam = task.type === 'physicalExam' || task.contentType === 'physicalExam' || task.bookType === 'exam' || matchingBook?.bookType === 'exam' || task.isPhysical;
                    const isBook = task.sourceType === 'trackedBook' || task.isBookAssignment || task.bookId;

                    // Subject / Type Luminous Cosmic Glassmorphic Palette
                    let iconBadgeGradient = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
                    let borderHighlight = 'rgba(165, 180, 252, 0.4)';
                    let subjectGlow = 'rgba(99, 102, 241, 0.2)';
                    let btnGradient = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
                    let badgeBg = 'rgba(99, 102, 241, 0.2)';

                    const subjLower = (task.subject || '').toLowerCase();
                    if (isExam) {
                      iconBadgeGradient = 'linear-gradient(135deg, #a855f7, #ec4899)';
                      borderHighlight = 'rgba(236, 72, 153, 0.45)';
                      subjectGlow = 'rgba(217, 70, 239, 0.22)';
                      btnGradient = 'linear-gradient(135deg, #a855f7, #ec4899)';
                      badgeBg = 'rgba(236, 72, 153, 0.22)';
                    } else if (subjLower.includes('matematik')) {
                      iconBadgeGradient = 'linear-gradient(135deg, #0284c7, #38bdf8)';
                      borderHighlight = 'rgba(56, 189, 248, 0.45)';
                      subjectGlow = 'rgba(14, 165, 233, 0.22)';
                      btnGradient = 'linear-gradient(135deg, #0284c7, #38bdf8)';
                      badgeBg = 'rgba(56, 189, 248, 0.2)';
                    } else if (subjLower.includes('türkçe')) {
                      iconBadgeGradient = 'linear-gradient(135deg, #e11d48, #fb7185)';
                      borderHighlight = 'rgba(251, 113, 133, 0.45)';
                      subjectGlow = 'rgba(244, 63, 94, 0.22)';
                      btnGradient = 'linear-gradient(135deg, #e11d48, #fb7185)';
                      badgeBg = 'rgba(244, 63, 94, 0.2)';
                    } else if (subjLower.includes('fen')) {
                      iconBadgeGradient = 'linear-gradient(135deg, #059669, #34d399)';
                      borderHighlight = 'rgba(52, 211, 153, 0.45)';
                      subjectGlow = 'rgba(16, 185, 129, 0.22)';
                      btnGradient = 'linear-gradient(135deg, #059669, #34d399)';
                      badgeBg = 'rgba(16, 185, 129, 0.2)';
                    } else if (subjLower.includes('sosyal') || subjLower.includes('tarih') || subjLower.includes('inkılap')) {
                      iconBadgeGradient = 'linear-gradient(135deg, #ea580c, #fb923c)';
                      borderHighlight = 'rgba(251, 146, 60, 0.45)';
                      subjectGlow = 'rgba(234, 88, 12, 0.22)';
                      btnGradient = 'linear-gradient(135deg, #ea580c, #fb923c)';
                      badgeBg = 'rgba(234, 88, 12, 0.2)';
                    } else if (isBook) {
                      iconBadgeGradient = 'linear-gradient(135deg, #0d9488, #2dd4bf)';
                      borderHighlight = 'rgba(45, 212, 191, 0.45)';
                      subjectGlow = 'rgba(20, 184, 166, 0.22)';
                      btnGradient = 'linear-gradient(135deg, #0d9488, #2dd4bf)';
                      badgeBg = 'rgba(20, 184, 166, 0.2)';
                    }

                    const handleOpenPendingTask = (e) => {
                      if (e) e.stopPropagation();
                      const targetTestId = task.realTestId || task.testId || task.id;
                      let path = `/quiz/${targetTestId}?studentId=${selectedStudent.id}`;
                      if (isExam) path = `/physical-exam/${task.hwId || task.bookId || targetTestId}?studentId=${selectedStudent.id}`;
                      else if (task.sourceType === 'trackedBook' || task.isBookAssignment) path = `/book-quiz/${targetTestId}?studentId=${selectedStudent.id}`;
                      navigate(path);
                    };

                    const typeBadgeText = isExam ? '🏛️ FİZİKİ DENEME' : isBook ? `📕 KİTAP TESTİ • ${task.subject || 'DERS'}` : `📝 ÖDEV • ${task.subject || 'DERS'}`;

                    const parts = (task.title || '').split(' — ');
                    const displayTestName = task.testName || (parts.length > 1 ? parts.slice(1).join(' — ') : null);
                    const displayBookName = task.bookTitle || (parts.length > 1 ? parts[0] : null);

                    return (
                      <div
                        key={task.id}
                        className="sd-tile"
                        onClick={handleOpenPendingTask}
                        style={{
                          background: `radial-gradient(ellipse at 10% 20%, ${subjectGlow} 0%, transparent 65%), linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(45, 41, 105, 0.9) 100%)`,
                          backdropFilter: 'blur(20px)',
                          borderRadius: 20,
                          padding: isMobile ? '0.9rem 0.95rem' : '1.15rem 1.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                          border: `1.5px solid ${borderHighlight}`,
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Ambient glow highlight */}
                        <div style={{ position: 'absolute', right: -20, top: -20, width: 130, height: 130, borderRadius: '50%', background: subjectGlow, filter: 'blur(25px)', pointerEvents: 'none' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, zIndex: 2, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: isMobile ? 42 : 54,
                            height: isMobile ? 42 : 54,
                            borderRadius: 15,
                            background: iconBadgeGradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: isMobile ? '1.25rem' : '1.6rem',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
                            flexShrink: 0,
                            border: '1.5px solid rgba(255,255,255,0.35)'
                          }}>
                            {isExam ? '🏛️' : isBook ? '📕' : subIcon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: '#ffffff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: badgeBg,
                                padding: '0.12rem 0.5rem',
                                borderRadius: 99,
                                border: `1px solid ${borderHighlight}`
                              }}>
                                {typeBadgeText}
                              </span>
                              {overdue && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'white', background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '0.12rem 0.5rem', borderRadius: 99, boxShadow: '0 2px 10px rgba(239,68,68,0.45)' }}>
                                  🔥 {differenceInDays(new Date(), dueDate)}g Gecikti
                                </span>
                              )}
                              {dueToday && !overdue && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'white', background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '0.12rem 0.5rem', borderRadius: 99, boxShadow: '0 2px 10px rgba(245,158,11,0.45)' }}>
                                  ⚡ Bugün Son
                                </span>
                              )}
                              {!overdue && !dueToday && daysDiff >= 0 && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#c7d2fe', background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(165,180,252,0.35)', padding: '0.12rem 0.5rem', borderRadius: 99 }}>
                                  ⏰ {daysDiff + 1} Gün Kaldı
                                </span>
                              )}
                            </div>

                            {/* Prominent Test Name */}
                            <div style={{
                              fontSize: isMobile ? '0.92rem' : '1.05rem',
                              fontWeight: 900,
                              color: '#ffffff',
                              marginTop: 4,
                              lineHeight: 1.25,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {displayTestName || task.title}
                            </div>

                            {/* Book / Source Name Subtitle */}
                            {displayBookName && (
                              <div style={{
                                fontSize: isMobile ? '0.68rem' : '0.74rem',
                                color: '#93c5fd',
                                fontWeight: 700,
                                marginTop: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>📖</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {displayBookName}
                                </span>
                              </div>
                            )}

                            <div style={{
                              fontSize: isMobile ? '0.66rem' : '0.74rem',
                              color: 'rgba(255,255,255,0.78)',
                              fontWeight: 600,
                              marginTop: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap'
                            }}>
                              <span>📝 {task.questionCount || 0} Soru</span>
                              <span>📅 Son: {task.dueDateStr}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: btnGradient,
                          color: '#ffffff',
                          borderRadius: 14,
                          padding: isMobile ? '0.45rem 0.75rem' : '0.6rem 1.15rem',
                          fontWeight: 900,
                          fontSize: isMobile ? '0.72rem' : '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                          border: '1.5px solid rgba(255,255,255,0.35)',
                          flexShrink: 0,
                          zIndex: 2,
                          whiteSpace: 'nowrap'
                        }}>
                          {isExam ? (isMobile ? 'Karne ➔' : 'Karneyi Gir ➔') : (isMobile ? 'Çöz ➔' : 'Testi Çöz ➔')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ROADMAPS (Mobile view: directly under Pending Homeworks for maximum focus) */}
            {isMobile && renderRoadmaps()}

            {/* COMPLETED EXAMS */}
            {completedCount > 0 && (
              <div className="sd-section" style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#059669,#10b981)', padding:'0.9rem 1.2rem', display:'flex', alignItems:'center', gap:8 }}>
                  <CheckCircle2 size={18} color="white" />
                  <span style={{ fontSize:'0.82rem', fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:'0.06em' }}>Tamamlanan Sınavlar</span>
                  <span style={{ background:'rgba(255,255,255,0.25)', color:'white', borderRadius:99, padding:'0.12rem 0.55rem', fontSize:'0.65rem', fontWeight:900 }}>{completedCount}</span>
                </div>
                {tests.filter(t => t.status === 'Sonuçlandı').slice(0, 5).map((test, i, arr) => {
                  const conf = getSubConf(getThemeKey(getCategoryName(test)));
                  const score = test.correctAnswers || 0;
                  const good = score >= 70;
                  const targetTestId = test.realTestId || test.testId || test.id;
                  const parts = (test.title || '').split(' — ');
                  const displayTestName = test.testName || (parts.length > 1 ? parts.slice(1).join(' — ') : null);
                  const displayBookName = test.bookTitle || (parts.length > 1 ? parts[0] : null);

                  return (
                    <div key={test.id} className="sd-hw-card"
                      onClick={() => {
                        if (test.type === 'physicalExam') {
                          navigate(`/physical-exam/${targetTestId}?studentId=${selectedStudent.id}`);
                        } else if (test.submissionId) {
                          navigate(`/review/${test.submissionId}?studentId=${selectedStudent.id}`);
                        } else if (test.isBookAssignment || test.sourceType === 'trackedBook' || test.bookId) {
                          navigate(`/book-quiz/${targetTestId}?studentId=${selectedStudent.id}&review=true`);
                        } else {
                          navigate(`/quiz-review/${targetTestId}?studentId=${selectedStudent.id}`);
                        }
                      }}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'0.85rem 1.2rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', cursor: 'pointer', background:'rgba(255,255,255,0.04)' }}>
                      <div style={{ width:36, height:36, borderRadius:12, background:conf.bg, border:`1.5px solid ${conf.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><conf.icon size={16} color={conf.color} /></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:'0.84rem', color:'#ffffff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {displayTestName || test.title}
                        </div>
                        {displayBookName && (
                          <div style={{ fontSize:'0.64rem', color:'#93c5fd', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                            📖 {displayBookName}
                          </div>
                        )}
                        <div style={{ fontSize:'0.63rem', color:'rgba(255,255,255,0.7)', fontWeight:600, marginTop:1 }}>
                          {test.dueDate ? new Date(test.dueDate).toLocaleDateString('tr-TR') : 'Tamamlandı'}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontWeight:900, fontSize:'0.92rem', color: good ? '#4ade80' : '#f87171' }}>%{score}</div>
                          <div style={{ width:44, height:4, background: 'rgba(255,255,255,0.15)', borderRadius:99, marginTop:3 }}>
                            <div style={{ height:'100%', width:`${score}%`, background: good ? '#22c55e' : '#ef4444', borderRadius:99, boxShadow: good ? '0 0 6px #22c55e' : 'none' }} />
                          </div>
                        </div>
                        <button onClick={e => {
                          e.stopPropagation();
                          if (test.submissionId) {
                            navigate(`/review/${test.submissionId}?studentId=${selectedStudent.id}`);
                          } else if (test.isBookAssignment || test.sourceType === 'trackedBook' || test.bookId) {
                            navigate(`/book-quiz/${targetTestId}?studentId=${selectedStudent.id}&review=true`);
                          } else {
                            navigate(`/quiz-review/${targetTestId}?studentId=${selectedStudent.id}`);
                          }
                        }} className="sd-btn"
                          style={{ padding:'0.38rem', borderRadius:10, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', cursor:'pointer', display:'flex', color:'white' }} title="Sonucu İncele">
                          <Eye size={14} color="white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>{/* end LEFT COLUMN */}

          {/* ──── RIGHT COLUMN ──── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* ROADMAPS (Desktop) */}
            {!isMobile && renderRoadmaps()}

            {/* GOALS */}
            <div className="sd-section" style={{ ...S.card, overflow:'hidden' }}>
              <div style={{ background:'linear-gradient(135deg,#c2410c,#ea580c)', padding:'0.9rem 1.2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:'rgba(255,255,255,0.22)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.88rem' }}>🎯</div>
                  <span style={{ fontSize:'0.82rem', fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:'0.06em' }}>Hedeflerim ({studentGoals.length})</span>
                </div>
                <button onClick={() => setShowGoalModal(true)} className="sd-btn"
                  style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:900, color:'white', background:'rgba(255,255,255,0.22)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:10, padding:'0.32rem 0.75rem', cursor:'pointer', backdropFilter:'blur(8px)' }}>
                  <Plus size={13} /> Ekle
                </button>
              </div>
              {studentGoals.length === 0 ? (
                <div style={{ padding:'2rem 1rem', textAlign:'center' }}>
                  <div style={{ fontSize:'2.2rem', marginBottom:6 }}>🎯</div>
                  <div style={{ fontWeight:800, color:'white', fontSize:'0.88rem', marginBottom:8 }}>Henüz hedef yok</div>
                  <button onClick={() => setShowGoalModal(true)} className="sd-btn"
                    style={{ background:'linear-gradient(135deg,#ea580c,#f97316)', color:'white', border:'none', borderRadius:12, padding:'0.5rem 1.1rem', fontWeight:800, fontSize:'0.78rem', cursor:'pointer', boxShadow:'0 4px 14px rgba(234,88,12,0.4)' }}>İlk hedefini ekle →</button>
                </div>
              ) : (
                <>
                  {studentGoals.slice(0, 4).map((g, i, arr) => {
                    const pct = Math.min(100, Math.round(((g.current || 0) / (g.target || 1)) * 100));
                    const done = pct >= 100;
                    return (
                      <div key={g.id} style={{ padding:'0.85rem 1.1rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', background:'rgba(255,255,255,0.04)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:800, fontSize:'0.85rem', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{g.title}</div>
                            <div style={{ display:'flex', gap:5 }}>
                              <span style={{ fontSize:'0.6rem', fontWeight:800, background:'rgba(59,130,246,0.25)', border:'1px solid rgba(147,197,253,0.3)', color:'#93c5fd', padding:'0.1rem 0.45rem', borderRadius:99 }}>{g.period}</span>
                              <span style={{ fontSize:'0.6rem', fontWeight:800, background:'rgba(245,158,11,0.25)', border:'1px solid rgba(253,230,138,0.3)', color:'#fde68a', padding:'0.1rem 0.45rem', borderRadius:99 }}>{g.type}</span>
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                            <span style={{ fontSize:'0.85rem', fontWeight:900, color: done ? '#4ade80' : '#fb923c' }}>%{pct}</span>
                            <button onClick={() => deleteGoal(g.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:2, display:'flex' }}><X size={14} /></button>
                          </div>
                        </div>
                        <div style={{ height:6, background:'rgba(255,255,255,0.15)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: done ? '#22c55e' : 'linear-gradient(90deg,#f97316,#fbbf24)', borderRadius:99, transition:'width 0.8s', boxShadow: done ? '0 0 8px #22c55e' : 'none' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', color:'rgba(255,255,255,0.75)', fontWeight:700, marginTop:4 }}>
                          <span>{g.current || 0} / {g.target} {g.type}</span>
                          {done && <span style={{ color:'#4ade80', fontWeight:900 }}>✓ Tamamlandı</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding:'0.75rem', background:'rgba(0,0,0,0.15)', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={() => navigate('/goals')} className="sd-btn"
                      style={{ width:'100%', background:'linear-gradient(135deg,#ea580c,#f97316)', color:'white', border:'none', borderRadius:14, padding:'0.65rem', fontWeight:900, fontSize:'0.8rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, boxShadow:'0 4px 14px rgba(234,88,12,0.35)' }}>
                      Tüm Hedefler <ChevronRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* MOTIVATION + RESULTS */}
            <div className="sd-section" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {(() => {
                const currentDashQuote = DASHBOARD_QUOTES[dashQuoteIdx % DASHBOARD_QUOTES.length];
                const dayLetters = ['Pzt','Sal','Çrş','Prş','Cum','Cts','Paz'];
                const currentDayIdx = (new Date().getDay() + 6) % 7;
                const quoteNum = (dashQuoteIdx % DASHBOARD_QUOTES.length) + 1;
                const catColors = {
                  'Disiplin':  { bg:'rgba(245,158,11,0.25)', text:'#fde68a', dot:'#f59e0b' },
                  'Odak':      { bg:'rgba(139,92,246,0.25)', text:'#ddd6fe', dot:'#8b5cf6' },
                  'Mücadele':  { bg:'rgba(239,68,68,0.25)', text:'#fecaca', dot:'#ef4444' },
                  'İnanç':     { bg:'rgba(59,130,246,0.25)', text:'#bfdbfe', dot:'#3b82f6' },
                  'Eylem':     { bg:'rgba(34,197,94,0.25)', text:'#bbf7d0', dot:'#22c55e' },
                  'Zafer':     { bg:'rgba(234,179,8,0.25)', text:'#fef08a', dot:'#eab308' },
                  'Gelişim':   { bg:'rgba(16,185,129,0.25)', text:'#a7f3d0', dot:'#10b981' },
                  'Özgüven':   { bg:'rgba(236,72,153,0.25)', text:'#fbcfe8', dot:'#ec4899' },
                  'Sabır':     { bg:'rgba(14,165,233,0.25)', text:'#bae6fd', dot:'#0ea5e9' },
                };
                const cat = catColors[currentDashQuote.category] || catColors['Disiplin'];
                return (
                  <div style={{ borderRadius:22, overflow:'hidden', boxShadow:'0 12px 36px rgba(245,158,11,0.25)', border:'1.5px solid rgba(253,230,138,0.5)', background:'linear-gradient(135deg,rgba(45,35,28,0.9) 0%,rgba(120,53,15,0.9) 100%)', backdropFilter:'blur(16px)' }}>
                    {/* Card Header */}
                    <div style={{ background:'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)', padding:'0.85rem 1.2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>
                          {currentDashQuote.emoji || '✨'}
                        </div>
                        <div>
                          <div style={{ fontSize:'0.6rem', fontWeight:800, color:'rgba(255,255,255,0.8)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Günün Motivasyonu</div>
                          <div style={{ fontSize:'0.84rem', fontWeight:900, color:'white' }}>İlham Al, Harekete Geç</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ fontSize:'0.62rem', fontWeight:900, color:'white', background:'rgba(255,255,255,0.2)', borderRadius:99, padding:'0.2rem 0.6rem', border:'1px solid rgba(255,255,255,0.3)' }}>
                          {quoteNum}/{DASHBOARD_QUOTES.length}
                        </div>
                        <button type="button" onClick={() => setDashQuoteIdx(p => p + 1)}
                          style={{ background:'rgba(255,255,255,0.25)', border:'1px solid rgba(255,255,255,0.4)', borderRadius:10, padding:'0.3rem 0.65rem', color:'white', fontSize:'0.66rem', fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', gap:4, backdropFilter:'blur(8px)' }}>
                          <RefreshCw size={11} /> Yeni Söz
                        </button>
                      </div>
                    </div>

                    {/* Quote Body */}
                    <div style={{ padding:'1.1rem 1.2rem' }}>
                      {/* Category badge */}
                      <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:cat.bg, borderRadius:99, padding:'0.2rem 0.7rem', border:`1px solid ${cat.dot}60`, marginBottom:10 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:cat.dot, boxShadow:`0 0 6px ${cat.dot}` }} />
                        <span style={{ fontSize:'0.64rem', fontWeight:900, color:cat.text, textTransform:'uppercase', letterSpacing:'0.08em' }}>{currentDashQuote.category}</span>
                      </div>

                      {/* Quote text */}
                      <div style={{ position:'relative', paddingLeft:14, marginBottom:12 }}>
                        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, borderRadius:99, background:`linear-gradient(180deg,${cat.dot},${cat.dot}44)` }} />
                        <div style={{ fontSize:'0.88rem', color:'#ffffff', lineHeight:1.7, fontWeight:600, fontStyle:'italic' }}>
                          "{currentDashQuote.quote}"
                        </div>
                        <div style={{ marginTop:8, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                          <div style={{ height:1, flex:1, background:'linear-gradient(90deg,transparent,rgba(253,230,138,0.5))' }} />
                          <span style={{ fontSize:'0.72rem', fontWeight:900, color:'#fde68a' }}>— {currentDashQuote.author}</span>
                        </div>
                      </div>

                      {/* Week Tracker */}
                      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:14, padding:'0.75rem 0.85rem', border:'1px solid rgba(251,191,36,0.35)', backdropFilter:'blur(8px)' }}>
                        <div style={{ fontSize:'0.58rem', fontWeight:900, color:'#fde68a', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>📅 Haftalık Çalışma Serisi</div>
                        <div style={{ display:'flex', gap:5 }}>
                          {dayLetters.map((d, i) => {
                            const isPast = i < currentDayIdx;
                            const isToday = i === currentDayIdx;
                            const isFuture = i > currentDayIdx;
                            return (
                              <div key={i} style={{ flex:1, textAlign:'center' }}>
                                <div style={{ fontSize:'0.48rem', fontWeight:900, color: isToday ? '#fbbf24' : 'rgba(255,255,255,0.7)', marginBottom:3, letterSpacing:'-0.02em' }}>{d}</div>
                                <div style={{
                                  aspectRatio:1,
                                  borderRadius:8,
                                  background: isToday ? '#f59e0b' : isPast ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.06)',
                                  border: isToday ? '2px solid #fbbf24' : isPast ? '1px solid rgba(251,191,36,0.6)' : '1px solid rgba(255,255,255,0.1)',
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  boxShadow: isToday ? '0 0 12px rgba(245,158,11,0.6)' : 'none',
                                  transition:'all 0.2s'
                                }}>
                                  {isPast && <span style={{ fontSize:'0.6rem', color:'white', fontWeight:900 }}>✓</span>}
                                  {isToday && <Star size={11} color="white" fill="white" />}
                                  {isFuture && <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(255,255,255,0.2)' }} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button onClick={() => navigate('/student-results')} className="sd-tile"
                style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:18, padding:'0.95rem 1.1rem', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 24px rgba(99,102,241,0.28)', textAlign:'left', width:'100%' }}>
                <div style={{ width:42, height:42, borderRadius:13, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><BarChart3 size={20} color="white" /></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:900, fontSize:'0.9rem', color:'white', marginBottom:2 }}>Detaylı Karne</div>
                  <div style={{ fontSize:'0.67rem', color:'rgba(255,255,255,0.75)', fontWeight:600 }}>Grafik & performans analizi</div>
                </div>
                <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
              </button>
            </div>

          </div>{/* end RIGHT COLUMN */}

        </div>{/* end sd-main-grid */}

      </div>{/* end sd-content-outer */}

      <div style={{ height: isMobile ? '5rem' : '2rem' }} />

      {/* GOAL MODAL */}
      {showGoalModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.8)', backdropFilter:'blur(12px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : '1rem' }}>
          <div style={{ background:'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(49,46,129,0.98) 100%)', border:'1.5px solid rgba(255,255,255,0.25)', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding:'1.6rem', width:'100%', maxWidth: isMobile ? '100%' : 440, boxShadow:'0 32px 80px rgba(0,0,0,0.5)', animation:'sdFadeUp 0.3s ease', color: '#ffffff' }}>
            {isMobile && <div style={{ width:40, height:4, background:'rgba(255,255,255,0.2)', borderRadius:99, margin:'0 auto 1.25rem' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:900, fontSize:'1.05rem', color:'white', margin:0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background:'rgba(255,255,255,0.12)', border:'none', borderRadius:10, padding:'0.45rem', cursor:'pointer', display:'flex', color:'white' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <input placeholder="Hedef başlığı (örn: Günde 50 Matematik Sorusu)..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.1)', color:'white', width:'100%' }} required />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#1e293b', color:'white' }}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v} value={v} style={{ background:'#1e293b', color:'white' }}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#1e293b', color:'white' }}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v} value={v} style={{ background:'#1e293b', color:'white' }}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.1)', color:'white', width:'100%' }} required />
              <button type="submit" className="sd-btn"
                style={{ padding:'0.9rem', borderRadius:14, background:'linear-gradient(135deg,#ea580c,#f97316)', color:'white', fontWeight:900, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(234,88,12,0.4)', marginTop:4 }}>
                Hedefi Kaydet ✓
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
