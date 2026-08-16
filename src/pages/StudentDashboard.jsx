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
        if (subject.dueDate) {
          const sYMD = subject.dueDate.split('T')[0];
          if (todayYMD === sYMD) {
            const isCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name);
            if (!isCompleted) {
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
        }

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
    sectionTitle: { fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
    card: { background: '#ffffff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' },
  };

  const subjectIcons = {
    'Matematik': '📐', 'Türkçe': '📚', 'Fen Bilimleri': '🔬',
    'Sosyal Bilgiler': '🌍', 'İnkılap Tarihi': '🏛️', 'İngilizce': '🇬🇧', 'Din Kültürü': '🌙'
  };

  const statChips = [
    { label: 'Toplam', value: tests.length, color: '#6366f1', bg: '#eef2ff', icon: '📋' },
    { label: 'Tamamlandı', value: completedCount, color: '#16a34a', bg: '#dcfce7', icon: '✅' },
    { label: 'Bekliyor', value: pendingCount, color: '#ea580c', bg: '#ffedd5', icon: '⏳' },
    { label: 'Gecikti', value: overdueCount, color: '#dc2626', bg: '#fee2e2', icon: '🔥' },
  ];

  const quickTiles = [
    { icon: '📖', label: 'Ders Özetleri', sub: 'Konu anlatımları', to: '/student/summaries', g: 'linear-gradient(135deg,#059669,#10b981)', sh: 'rgba(16,185,129,0.3)' },
    { icon: '📊', label: 'Sonuçlarım', sub: 'Karne & analiz', to: '/student-results', g: 'linear-gradient(135deg,#4f46e5,#7c3aed)', sh: 'rgba(99,102,241,0.3)' },
    { icon: '❌', label: 'Yanlışlarım', sub: 'Hata havuzu', to: '/wrong-answers', g: 'linear-gradient(135deg,#db2777,#e11d48)', sh: 'rgba(219,39,119,0.28)' },
    { icon: '📚', label: 'Kitaplarım', sub: 'Kitap ilerlemesi', to: '/student/books', g: 'linear-gradient(135deg,#0891b2,#0d9488)', sh: 'rgba(8,145,178,0.28)' },
    { icon: '🎯', label: 'Hedeflerim', sub: 'Hedef takip', to: '/goals', g: 'linear-gradient(135deg,#ea580c,#dc2626)', sh: 'rgba(234,88,12,0.28)' },
    { icon: '📅', label: 'Programım', sub: 'Haftalık plan', to: '/my-program', g: 'linear-gradient(135deg,#6366f1,#8b5cf6)', sh: 'rgba(99,102,241,0.28)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f8faff 0%,#f1f5f9 50%,#eef2ff 100%)', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes sdFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sdPulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.5)} 50%{box-shadow:0 0 0 10px rgba(167,139,250,0)} }
        @keyframes sdShimmer { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
        @keyframes aurora { 0%,100%{transform:translate(0,0) scale(1);opacity:.6} 33%{transform:translate(28px,-18px) scale(1.1);opacity:.8} 66%{transform:translate(-18px,14px) scale(.95);opacity:.5} }
        .sd-tile { transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1); cursor:pointer; }
        .sd-tile:hover { transform: translateY(-4px) scale(1.02); }
        .sd-tile:active { transform: scale(0.97); }
        .sd-btn { transition: all 0.18s ease; }
        .sd-btn:hover { filter: brightness(1.06); }
        .sd-btn:active { transform: scale(0.97); }
        .sd-stat-chip { transition: all 0.2s ease; }
        .sd-stat-chip:hover { transform: translateY(-3px); }
        .sd-hw-card { transition: all 0.2s ease; cursor:pointer; }
        .sd-hw-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important; }
        .sd-hw-card:active { transform: scale(0.99); }
        .sd-section { animation: sdFadeUp 0.5s ease both; }
        .sd-task-row { transition: all 0.15s ease; }
        .sd-task-row:hover { background: #f0f4ff !important; }
        .scroll-hide { scrollbar-width:none; -ms-overflow-style:none; }
        .scroll-hide::-webkit-scrollbar { display:none; }
        @media(min-width:900px) {
          .sd-content-outer { max-width:1280px; margin:0 auto; padding:0 2rem; }
          .sd-stat-outer { max-width:1280px; margin:0 auto; padding:0 2rem; }
          .sd-hero-inner { max-width:1280px; margin:0 auto; }
          .sd-main-grid { display:grid; grid-template-columns:1fr 360px; gap:1.5rem; align-items:start; }
        }
        @media(max-width:899px) {
          .sd-content-outer { padding:0 0.875rem; }
          .sd-stat-outer { padding:0 0.875rem; }
          .sd-main-grid { display:flex; flex-direction:column; }
        }
      `}</style>

      {/* ════ HERO ════ */}
      <div style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 25%,#4c1d95 55%,#6d28d9 80%,#7c3aed 100%)', padding: isMobile ? '1.5rem 1rem 5.5rem' : '2.25rem 2rem 5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, right:-60, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.35) 0%,transparent 70%)', animation:'aurora 8s ease infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-40, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(236,72,153,0.2) 0%,transparent 70%)', animation:'aurora 12s ease infinite reverse', pointerEvents:'none' }} />

        <div className="sd-hero-inner" style={{ position:'relative', zIndex:2 }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 12 : 16, flex:1, minWidth:0 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width: isMobile ? 62 : 76, height: isMobile ? 62 : 76, borderRadius:'50%', background: avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile ? '1.55rem' : '1.9rem', fontWeight:900, color:'white', border:'3px solid rgba(255,255,255,0.4)', boxShadow:'0 8px 28px rgba(0,0,0,0.3)', animation:'sdPulseRing 3s ease infinite' }}>
                  {selectedStudent?.name?.charAt(0) || 'Ö'}
                </div>
                <div style={{ position:'absolute', bottom:2, right:2, width:14, height:14, borderRadius:'50%', background:'#4ade80', border:'2.5px solid rgba(255,255,255,0.85)' }} />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.65)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Hoş Geldin 👋</div>
                <h1 style={{ fontSize: isMobile ? '1.45rem' : '1.9rem', fontWeight:900, color:'white', margin:0, lineHeight:1.05, letterSpacing:'-0.025em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {selectedStudent?.name || 'Öğrenci'}
                </h1>
                <div style={{ marginTop:7, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.14)', borderRadius:99, padding:'0.22rem 0.65rem', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.18)' }}>
                    <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.9)', fontWeight:700 }}>📅 {todayStr}</span>
                  </div>
                  {hasCoach && (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(74,222,128,0.18)', borderRadius:99, padding:'0.22rem 0.65rem', border:'1px solid rgba(74,222,128,0.3)' }}>
                      <span style={{ fontSize:'0.62rem', color:'#4ade80', fontWeight:800 }}>🎓 Koçum Var</span>
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
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.1)', borderRadius:'50%', backdropFilter:'blur(8px)', border:'1.5px solid rgba(255,255,255,0.25)' }}>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight:900, color:'white', lineHeight:1 }}>%{successPct}</div>
                <div style={{ fontSize:'0.48rem', fontWeight:800, color:'rgba(255,255,255,0.8)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Başarı</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position:'absolute', bottom:-1, left:0, right:0, lineHeight:0 }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ width:'100%', height:48, display:'block' }}>
            <path d="M0,48 C480,10 960,10 1440,48 L1440,48 L0,48 Z" fill="#f8faff" />
          </svg>
        </div>
      </div>

      {/* ════ STAT CHIPS ════ */}
      <div className="sd-stat-outer" style={{ marginTop: isMobile ? -36 : -42, marginBottom:'1.25rem', position:'relative', zIndex:10 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap: isMobile ? 5 : 10 }}>
          {statChips.map((c, i) => (
            <div key={i} className="sd-stat-chip" style={{ background:'white', borderRadius: isMobile ? 12 : 16, padding: isMobile ? '0.55rem 0.15rem' : '0.85rem 0.6rem', boxShadow:'0 6px 20px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', border:`1.5px solid ${c.bg}`, animation:`sdFadeUp 0.4s ease ${i*0.06}s both`, minWidth:0 }}>
              <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight:1, marginBottom:2 }}>{c.icon}</div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight:900, color:c.color, lineHeight:1 }}>{c.value}</div>
              <div style={{ fontSize: isMobile ? '0.48rem' : '0.58rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.01em', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>{c.label}</div>
            </div>
          ))}
          <div className="sd-stat-chip" style={{ background:'white', borderRadius: isMobile ? 12 : 16, padding: isMobile ? '0.55rem 0.15rem' : '0.85rem 0.6rem', boxShadow:'0 6px 20px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', border:'1.5px solid #f3e8ff', animation:'sdFadeUp 0.4s ease 0.3s both', minWidth:0 }}>
            <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight:1, marginBottom:2 }}>🏆</div>
            <div style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight:900, color:'#9333ea', lineHeight:1 }}>%{progressPct}</div>
            <div style={{ fontSize: isMobile ? '0.48rem' : '0.58rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.01em', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>Tamamlanma</div>
          </div>
        </div>
      </div>

      {/* ════ CONTENT WRAP ════ */}
      <div className="sd-content-outer" style={{ paddingBottom:'1rem' }}>

        {coachingNote && (
          <div className="sd-section" style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', borderRadius:16, padding:'0.85rem 1rem', border:'1.5px solid #fde68a', boxShadow:'0 4px 16px rgba(245,158,11,0.1)', display:'flex', alignItems:'flex-start', gap:10, marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'1.1rem', flexShrink:0 }}>💬</div>
            <div>
              <div style={{ fontSize:'0.62rem', fontWeight:900, color:'#b45309', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Koç Notunuz</div>
              <div style={{ fontSize:'0.8rem', color:'#78350f', fontWeight:600, lineHeight:1.5 }}>{typeof coachingNote === 'string' ? coachingNote : coachingNote?.note || ''}</div>
            </div>
          </div>
        )}

        <div className="sd-main-grid">

          {/* ──── LEFT COLUMN ──── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* QUICK TILES (mobile: shown in left column at top) */}
            <div className="sd-section">
              <div style={S.sectionTitle}><span style={{ fontSize:14 }}>⚡</span> Hızlı Erişim</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.7rem' }}>
                {quickTiles.map((t, i) => (
                  <button key={i} onClick={() => navigate(t.to)} className="sd-tile"
                    style={{ background:t.g, borderRadius:18, padding: isMobile ? '0.8rem' : '1rem', display:'flex', alignItems:'center', gap:'0.65rem', border:'none', cursor:'pointer', textAlign:'left', boxShadow:`0 6px 18px ${t.sh}`, animation:`sdFadeUp 0.4s ease ${i*0.07}s both` }}>
                    <div style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile ? '1.2rem' : '1.4rem', flexShrink:0, backdropFilter:'blur(6px)' }}>{t.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize: isMobile ? '0.82rem' : '0.9rem', fontWeight:900, color:'white', lineHeight:1.2 }}>{t.label}</div>
                      <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.78)', fontWeight:600, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TODAY'S PROGRAM */}
            <div className="sd-section">
              <div style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', padding:'0.9rem 1.1rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:'0.58rem', fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Günün Programı</div>
                    <div style={{ fontSize:'0.95rem', fontWeight:900, color:'white', marginTop:1 }}>{todayProgramInfo.dayName}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {todayProgramInfo.totalCount > 0 && (
                      <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:99, padding:'0.18rem 0.6rem', backdropFilter:'blur(8px)' }}>
                        <span style={{ fontSize:'0.65rem', fontWeight:900, color:'white' }}>{todayProgramInfo.completedCount}/{todayProgramInfo.totalCount}</span>
                      </div>
                    )}
                    <Link to="/my-program" style={{ textDecoration:'none', background:'rgba(255,255,255,0.18)', borderRadius:8, padding:'0.28rem 0.6rem', fontSize:'0.65rem', fontWeight:800, color:'white', display:'flex', alignItems:'center', gap:3, border:'1px solid rgba(255,255,255,0.25)' }}>
                      Tümü <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

                <div style={{ padding:'0.6rem' }}>
                  {todayProgramInfo.items.length === 0 ? (
                    todayProgramInfo.hasAllCompleted ? (
                      <div style={{ textAlign:'center', padding:'1.75rem 1rem', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:'2rem' }}>🎉</div>
                        <div style={{ fontWeight:800, fontSize:'0.88rem', color:'#15803d' }}>Bugünkü Görevler Tamamlandı!</div>
                        <div style={{ fontSize:'0.73rem', color:'#64748b' }}>Harika iş çıkardın, bugünün tüm hedeflerini bitirdin.</div>
                        <Link to="/my-program" style={{ textDecoration:'none', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'white', borderRadius:12, padding:'0.45rem 1.1rem', fontWeight:800, fontSize:'0.75rem', marginTop:4, boxShadow:'0 4px 12px rgba(22,163,74,0.3)' }}>📅 Haftalık Programa Git</Link>
                      </div>
                    ) : (
                      <div style={{ textAlign:'center', padding:'1.75rem 1rem', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:'2rem' }}>✨</div>
                        <div style={{ fontWeight:800, fontSize:'0.88rem', color:'#1e293b' }}>Bugün için program yok</div>
                        <div style={{ fontSize:'0.73rem', color:'#64748b' }}>Haftalık programını düzenlemek için tıkla.</div>
                        <Link to="/my-program" style={{ textDecoration:'none', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'white', borderRadius:12, padding:'0.45rem 1.1rem', fontWeight:800, fontSize:'0.75rem', marginTop:4, boxShadow:'0 4px 12px rgba(79,70,229,0.3)' }}>📅 Programa Git</Link>
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
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
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
                              style={{ background: item.done ? '#f0fdf4' : '#fafaff', borderRadius:11, padding:'0.6rem 0.7rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, cursor:'pointer', borderLeft:`4px solid ${item.done ? '#22c55e' : taskColor}`, border:`1px solid ${item.done ? '#bbf7d0' : '#e8ecff'}`, borderLeft:`4px solid ${item.done ? '#22c55e' : taskColor}`, opacity: item.done ? 0.85 : 1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
                                <div style={{ width:30, height:30, borderRadius:8, background: item.done ? '#22c55e' : `${taskColor}15`, border:`1.5px solid ${item.done ? '#22c55e' : taskColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', flexShrink:0 }}>
                                  {item.done ? <Check size={13} color="white" strokeWidth={3} /> : icon}
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:'0.82rem', fontWeight:800, color: item.done ? '#166534' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {item.subject || item.bookName || 'Ders Görevi'}
                                  </div>
                                  {item.topic && <div style={{ fontSize:'0.66rem', color:'#64748b', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.topic}</div>}
                                  {(item.time || item.questionCount) && (
                                    <div style={{ display:'flex', gap:5, marginTop:2 }}>
                                      {item.time && <span style={{ fontSize:'0.58rem', fontWeight:800, color:'#4f46e5', background:'#eef2ff', padding:'0.08rem 0.4rem', borderRadius:99 }}>⏰ {item.time}</span>}
                                      {item.questionCount && <span style={{ fontSize:'0.58rem', fontWeight:800, color:'#0891b2', background:'#ecfeff', padding:'0.08rem 0.4rem', borderRadius:99 }}>✏️ {item.questionCount}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isQuizTask ? (
                                <button onClick={e => { e.stopPropagation(); handleTaskClick(); }} className="sd-btn"
                                  style={{ background:`linear-gradient(135deg,${taskColor},#6366f1)`, color:'white', border:'none', borderRadius:9, padding:'0.3rem 0.65rem', fontSize:'0.66rem', fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap', boxShadow:`0 3px 10px ${taskColor}40`, flexShrink:0 }}>
                                  <PlayCircle size={11} /> Çöz
                                </button>
                              ) : (
                                <div style={{ fontSize:'0.6rem', fontWeight:900, padding:'0.2rem 0.5rem', borderRadius:99, background: item.done ? '#dcfce7' : '#eef2ff', color: item.done ? '#15803d' : '#4f46e5', flexShrink:0, whiteSpace:'nowrap' }}>
                                  {item.done ? '✓ Tamam' : 'Tamamla'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {hasMore && (
                          <button onClick={() => setShowAllTodayTasks(p => !p)} className="sd-btn"
                            style={{ width:'100%', padding:'0.5rem', borderRadius:10, background: showAllTodayTasks ? '#f1f5f9' : 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: showAllTodayTasks ? '1px solid #cbd5e1' : '1.5px solid #c7d2fe', color:'#4f46e5', fontWeight:800, fontSize:'0.72rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:2 }}>
                            {showAllTodayTasks ? <><ChevronUp size={13} /> Daha Az Göster</> : <><ChevronDown size={13} /> {hiddenCount} görev daha</>}
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
                <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#ef4444,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem' }}>📋</div>
                <span style={{ fontSize:'0.78rem', fontWeight:900, color:'#0f172a' }}>Bekleyen Ödevler</span>
                {pendingCount > 0 && (
                  <span style={{ background:'#ef4444', color:'white', borderRadius:99, padding:'0.1rem 0.5rem', fontSize:'0.62rem', fontWeight:900, animation:'sdShimmer 2s infinite' }}>{pendingCount}</span>
                )}
              </div>

              {pendingTasks.length === 0 ? (
                <div style={{ ...S.card, padding:'2rem 1rem', textAlign:'center' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🎉</div>
                  <div style={{ fontWeight:900, color:'#0f172a', fontSize:'0.9rem', marginBottom:4 }}>Tüm ödevler tamamlandı!</div>
                  <div style={{ fontSize:'0.73rem', color:'#94a3b8' }}>Harika iş çıkardın!</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                  {pendingTasks.map(task => {
                    const conf = getSubConf(getThemeKey(task.subject));
                    const dueDate = task.dueDateObj;
                    const overdue = isPast(dueDate) && !isToday(dueDate);
                    const dueToday = isToday(dueDate);
                    const daysDiff = differenceInDays(dueDate, new Date());
                    const subIcon = subjectIcons[task.subject] || '📝';
                    const urgencyColor = overdue ? '#dc2626' : dueToday ? '#d97706' : '#059669';
                    const urgencyBg = overdue ? 'rgba(239,68,68,0.1)' : dueToday ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';
                    const urgencyText = overdue ? `${differenceInDays(new Date(), dueDate)}g Gecikti 🔥` : dueToday ? 'Bugün Son ⚡' : `${daysDiff+1} Gün Kaldı`;

                    const matchingBook = books?.find(b => String(b.id) === String(task.bookId));
                    const isExam = task.type === 'physicalExam' || task.contentType === 'physicalExam' || task.bookType === 'exam' || matchingBook?.bookType === 'exam' || task.isPhysical;
                    const handleOpenPendingTask = (e) => {
                      if (e) e.stopPropagation();
                      const targetTestId = task.realTestId || task.testId || task.id;
                      let path = `/quiz/${targetTestId}?studentId=${selectedStudent.id}`;
                      if (isExam) path = `/physical-exam/${task.hwId || task.bookId || targetTestId}?studentId=${selectedStudent.id}`;
                      else if (task.sourceType === 'trackedBook' || task.isBookAssignment) path = `/book-quiz/${targetTestId}?studentId=${selectedStudent.id}`;
                      navigate(path);
                    };

                    return (
                      <div key={task.id} className="sd-hw-card"
                        onClick={() => handleOpenPendingTask()}
                        style={{ background:'white', borderRadius:18, boxShadow: overdue ? '0 8px 24px rgba(239,68,68,0.1)' : dueToday ? '0 8px 24px rgba(245,158,11,0.1)' : '0 6px 20px rgba(0,0,0,0.05)', border: overdue ? '1.5px solid rgba(239,68,68,0.25)' : dueToday ? '1.5px solid rgba(245,158,11,0.25)' : '1.5px solid rgba(226,232,240,0.8)', overflow:'hidden', position:'relative' }}>
                        <div style={{ height:3, background: overdue ? 'linear-gradient(90deg,#ef4444,#dc2626)' : dueToday ? 'linear-gradient(90deg,#f59e0b,#d97706)' : `linear-gradient(90deg,${conf.color},#6366f1)` }} />
                        <div style={{ padding: isMobile ? '0.85rem' : '1rem 1.1rem' }}>
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6, flexWrap:'wrap' }}>
                                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:conf.bg, border:`1.5px solid ${conf.border}`, borderRadius:99, padding:'0.2rem 0.6rem', fontWeight:800, fontSize:'0.68rem', color:conf.badge }}>
                                  {subIcon} {task.subject}
                                </div>
                                <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:urgencyBg, border:`1px solid ${urgencyColor}30`, borderRadius:99, padding:'0.2rem 0.5rem', fontWeight:900, fontSize:'0.62rem', color:urgencyColor }}>
                                  {urgencyText}
                                </div>
                              </div>
                              <div style={{ fontWeight:900, fontSize: isMobile ? '0.9rem' : '0.96rem', color:'#0f172a', lineHeight:1.35 }}>{task.title}</div>
                            </div>
                            <div style={{ width:40, height:40, borderRadius:12, background:conf.bg, border:`1.5px solid ${conf.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <conf.icon size={17} color={conf.color} />
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, paddingTop:9, borderTop:'1px solid #f1f5f9' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:700, display:'flex', alignItems:'center', gap:3 }}><Calendar size={12} color="#94a3b8" /> {task.dueDateStr}</span>
                              <span style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:700, display:'flex', alignItems:'center', gap:3 }}><BookOpen size={12} color="#94a3b8" /> {task.questionCount || 0} Soru</span>
                            </div>
                            <button onClick={handleOpenPendingTask} className="sd-btn"
                              style={{ background:`linear-gradient(135deg,${conf.color},#6366f1)`, color:'white', border:'none', borderRadius:12, padding:'0.45rem 0.9rem', fontSize:'0.73rem', fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', gap:5, boxShadow:`0 4px 12px ${conf.color}40`, whiteSpace:'nowrap', flexShrink:0 }}>
                              <PlayCircle size={13} /> Hemen Çöz
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COMPLETED EXAMS */}
            {completedCount > 0 && (
              <div className="sd-section" style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ padding:'0.85rem 1.1rem', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center', gap:6 }}>
                  <CheckCircle2 size={16} color="#22c55e" />
                  <span style={{ fontSize:'0.78rem', fontWeight:900, color:'#0f172a' }}>Tamamlanan Sınavlar</span>
                  <span style={{ background:'#dcfce7', color:'#16a34a', borderRadius99:99, padding:'0.1rem 0.45rem', fontSize:'0.62rem', fontWeight:900 }}>{completedCount}</span>
                </div>
                {tests.filter(t => t.status === 'Sonuçlandı').slice(0, 5).map((test, i, arr) => {
                  const conf = getSubConf(getThemeKey(getCategoryName(test)));
                  const score = test.correctAnswers || 0;
                  const good = score >= 70;
                  const targetTestId = test.realTestId || test.testId || test.id;
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
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 1.1rem', borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:conf.bg, border:`1.5px solid ${conf.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><conf.icon size={14} color={conf.color} /></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'0.8rem', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{test.title}</div>
                        <div style={{ fontSize:'0.62rem', color:'#94a3b8', fontWeight:600 }}>{test.dueDate ? new Date(test.dueDate).toLocaleDateString('tr-TR') : 'Tamamlandı'}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontWeight:900, fontSize:'0.88rem', color: good ? '#16a34a' : '#dc2626' }}>%{score}</div>
                          <div style={{ width:40, height:3, background: good ? '#dcfce7' : '#fee2e2', borderRadius:99, marginTop:3 }}>
                            <div style={{ height:'100%', width:`${score}%`, background: good ? '#22c55e' : '#ef4444', borderRadius:99 }} />
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
                          style={{ padding:'0.32rem', borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0', cursor:'pointer', display:'flex' }} title="Sonucu İncele">
                          <Eye size={13} color="#475569" />
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

            {/* ROADMAPS */}
            {myRoadmaps.length > 0 && (
              <div className="sd-section" style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ padding:'0.85rem 1.1rem', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>🗺️</div>
                  <span style={{ fontSize:'0.78rem', fontWeight:900, color:'#0f172a' }}>Yol Haritalarım</span>
                </div>
                <div style={{ padding:'0.5rem' }}>
                  {myRoadmaps.map(({ assignment, plan }) => {
                    const total = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
                    const done = assignment.completedTopics?.length || 0;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={assignment.id} className="sd-hw-card"
                        onClick={() => navigate(`/student/study-plan/${assignment.id}`)}
                        style={{ padding:'0.85rem', borderRadius:14, display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Target size={18} color="white" /></div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:'0.84rem', color:'#0f172a', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plan.title}</div>
                          <div style={{ height:5, background:'#f1f5f9', borderRadius:99, overflow:'hidden', marginBottom:3 }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius:99, transition:'width 1s' }} />
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', fontWeight:700, color:'#94a3b8' }}>
                            <span>{done}/{total} konu</span><span style={{ color:'#6366f1' }}>%{pct}</span>
                          </div>
                        </div>
                        <ChevronRight size={14} color="#cbd5e1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GOALS */}
            <div className="sd-section" style={{ ...S.card, overflow:'hidden' }}>
              <div style={{ padding:'0.85rem 1.1rem', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#ea580c,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>🎯</div>
                  <span style={{ fontSize:'0.78rem', fontWeight:900, color:'#0f172a' }}>Hedeflerim ({studentGoals.length})</span>
                </div>
                <button onClick={() => setShowGoalModal(true)} className="sd-btn"
                  style={{ display:'flex', alignItems:'center', gap:3, fontSize:'0.68rem', fontWeight:800, color:'#6366f1', background:'#eef2ff', border:'none', borderRadius:8, padding:'0.28rem 0.65rem', cursor:'pointer' }}>
                  <Plus size={11} /> Ekle
                </button>
              </div>
              {studentGoals.length === 0 ? (
                <div style={{ padding:'1.5rem 1rem', textAlign:'center' }}>
                  <div style={{ fontSize:'1.75rem', marginBottom:6 }}>🎯</div>
                  <div style={{ fontWeight:700, color:'#64748b', fontSize:'0.8rem', marginBottom:8 }}>Henüz hedef yok</div>
                  <button onClick={() => setShowGoalModal(true)} className="sd-btn"
                    style={{ background:'#eef2ff', color:'#6366f1', border:'none', borderRadius:10, padding:'0.42rem 0.9rem', fontWeight:800, fontSize:'0.74rem', cursor:'pointer' }}>İlk hedefini ekle →</button>
                </div>
              ) : (
                <>
                  {studentGoals.slice(0, 4).map((g, i, arr) => {
                    const pct = Math.min(100, Math.round(((g.current || 0) / (g.target || 1)) * 100));
                    const done = pct >= 100;
                    return (
                      <div key={g.id} style={{ padding:'0.75rem 1rem', borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:'0.8rem', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{g.title}</div>
                            <div style={{ display:'flex', gap:4 }}>
                              <span style={{ fontSize:'0.56rem', fontWeight:800, background:'#eff6ff', color:'#2563eb', padding:'0.08rem 0.4rem', borderRadius:99 }}>{g.period}</span>
                              <span style={{ fontSize:'0.56rem', fontWeight:800, background:'#fef3c7', color:'#b45309', padding:'0.08rem 0.4rem', borderRadius:99 }}>{g.type}</span>
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                            <span style={{ fontSize:'0.78rem', fontWeight:900, color: done ? '#16a34a' : '#6366f1' }}>%{pct}</span>
                            <button onClick={() => deleteGoal(g.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#cbd5e1', padding:2, display:'flex' }}><X size={13} /></button>
                          </div>
                        </div>
                        <div style={{ height:5, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: done ? '#22c55e' : 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius:99, transition:'width 0.8s' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'#94a3b8', fontWeight:600, marginTop:3 }}>
                          <span>{g.current || 0} / {g.target} {g.type}</span>
                          {done && <span style={{ color:'#16a34a', fontWeight:800 }}>✓ Tamamlandı</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding:'0.7rem', background:'#fafafa', borderTop:'1px solid #f1f5f9' }}>
                    <button onClick={() => navigate('/goals')} className="sd-btn"
                      style={{ width:'100%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:12, padding:'0.58rem', fontWeight:800, fontSize:'0.77rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, boxShadow:'0 4px 12px rgba(99,102,241,0.25)' }}>
                      Tüm Hedefler <ChevronRight size={13} />
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
                  'Disiplin':  { bg:'#fef3c7', text:'#b45309', dot:'#f59e0b' },
                  'Odak':      { bg:'#ede9fe', text:'#6d28d9', dot:'#8b5cf6' },
                  'Mücadele':  { bg:'#fee2e2', text:'#b91c1c', dot:'#ef4444' },
                  'İnanç':     { bg:'#dbeafe', text:'#1e40af', dot:'#3b82f6' },
                  'Eylem':     { bg:'#dcfce7', text:'#166534', dot:'#22c55e' },
                  'Zafer':     { bg:'#fef9c3', text:'#854d0e', dot:'#eab308' },
                  'Gelişim':   { bg:'#d1fae5', text:'#065f46', dot:'#10b981' },
                  'Özgüven':   { bg:'#fce7f3', text:'#9d174d', dot:'#ec4899' },
                  'Sabır':     { bg:'#e0f2fe', text:'#075985', dot:'#0ea5e9' },
                };
                const cat = catColors[currentDashQuote.category] || catColors['Disiplin'];
                return (
                  <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 8px 32px rgba(245,158,11,0.15)', border:'1px solid rgba(253,230,138,0.6)' }}>
                    {/* Card Header */}
                    <div style={{ background:'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)', padding:'0.75rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>
                          {currentDashQuote.emoji || '✨'}
                        </div>
                        <div>
                          <div style={{ fontSize:'0.56rem', fontWeight:800, color:'rgba(255,255,255,0.75)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Günün Motivasyonu</div>
                          <div style={{ fontSize:'0.78rem', fontWeight:900, color:'white' }}>İlham Al, Harekete Geç</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ fontSize:'0.58rem', fontWeight:800, color:'rgba(255,255,255,0.8)', background:'rgba(255,255,255,0.15)', borderRadius:99, padding:'0.18rem 0.55rem', border:'1px solid rgba(255,255,255,0.25)' }}>
                          {quoteNum}/{DASHBOARD_QUOTES.length}
                        </div>
                        <button type="button" onClick={() => setDashQuoteIdx(p => p + 1)}
                          style={{ background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:10, padding:'0.28rem 0.6rem', color:'white', fontSize:'0.62rem', fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', gap:4, backdropFilter:'blur(8px)' }}>
                          <RefreshCw size={10} /> Yeni Söz
                        </button>
                      </div>
                    </div>

                    {/* Quote Body */}
                    <div style={{ background:'linear-gradient(180deg,#fffbeb 0%,#fefce8 100%)', padding:'1rem 1.1rem' }}>
                      {/* Category badge */}
                      <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:cat.bg, borderRadius:99, padding:'0.18rem 0.65rem', border:`1px solid ${cat.dot}30`, marginBottom:10 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:cat.dot }} />
                        <span style={{ fontSize:'0.6rem', fontWeight:900, color:cat.text, textTransform:'uppercase', letterSpacing:'0.08em' }}>{currentDashQuote.category}</span>
                      </div>

                      {/* Quote text */}
                      <div style={{ position:'relative', paddingLeft:14, marginBottom:10 }}>
                        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, borderRadius:99, background:`linear-gradient(180deg,${cat.dot},${cat.dot}44)` }} />
                        <div style={{ fontSize:'0.83rem', color:'#1c1917', lineHeight:1.7, fontWeight:600, fontStyle:'italic' }}>
                          "{currentDashQuote.quote}"
                        </div>
                        <div style={{ marginTop:6, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
                          <div style={{ height:1, flex:1, background:'linear-gradient(90deg,transparent,#d97706)' }} />
                          <span style={{ fontSize:'0.65rem', fontWeight:900, color:'#b45309' }}>— {currentDashQuote.author}</span>
                        </div>
                      </div>

                      {/* Week Tracker */}
                      <div style={{ background:'rgba(245,158,11,0.08)', borderRadius:12, padding:'0.65rem 0.75rem', border:'1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize:'0.55rem', fontWeight:900, color:'#92400e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>📅 Haftalık Çalışma Serisi</div>
                        <div style={{ display:'flex', gap:4 }}>
                          {dayLetters.map((d, i) => {
                            const isPast = i < currentDayIdx;
                            const isToday = i === currentDayIdx;
                            const isFuture = i > currentDayIdx;
                            return (
                              <div key={i} style={{ flex:1, textAlign:'center' }}>
                                <div style={{ fontSize:'0.44rem', fontWeight:900, color: isToday ? '#92400e' : '#b45309', marginBottom:3, letterSpacing:'-0.02em' }}>{d}</div>
                                <div style={{
                                  aspectRatio:1,
                                  borderRadius:6,
                                  background: isToday ? '#f59e0b' : isPast ? '#fbbf24' : 'rgba(245,158,11,0.12)',
                                  border: isToday ? '2px solid #d97706' : isPast ? '1px solid #fcd34d' : '1px solid rgba(245,158,11,0.2)',
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  boxShadow: isToday ? '0 0 0 3px rgba(245,158,11,0.25)' : 'none',
                                  transition:'all 0.2s'
                                }}>
                                  {isPast && <span style={{ fontSize:'0.55rem' }}>✓</span>}
                                  {isToday && <Star size={9} color="white" fill="white" />}
                                  {isFuture && <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(245,158,11,0.3)' }} />}
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
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', backdropFilter:'blur(10px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : '1rem' }}>
          <div style={{ background:'white', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding:'1.5rem', width:'100%', maxWidth: isMobile ? '100%' : 420, boxShadow:'0 32px 80px rgba(0,0,0,0.25)', animation:'sdFadeUp 0.3s ease' }}>
            {isMobile && <div style={{ width:40, height:4, background:'#e2e8f0', borderRadius:99, margin:'0 auto 1.25rem' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:900, fontSize:'1rem', color:'#0f172a', margin:0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background:'#f1f5f9', border:'none', borderRadius:10, padding:'0.45rem', cursor:'pointer', display:'flex' }}><X size={16} color="#64748b" /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <input placeholder="Hedef başlığı..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ padding:'0.75rem 1rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a', width:'100%' }} required />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                  style={{ padding:'0.7rem 0.85rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a' }}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                  style={{ padding:'0.7rem 0.85rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a' }}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ padding:'0.75rem 1rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a', width:'100%' }} required />
              <button type="submit" className="sd-btn"
                style={{ padding:'0.9rem', borderRadius:14, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', fontWeight:900, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }}>
                Hedef Kaydet ✓
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
