import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Calendar as CalendarIcon, 
  Layers, GraduationCap, AlertCircle, Timer, 
  BookOpen, ChevronDown, ChevronRight, Check, Sparkles, 
  PlayCircle, Target, BarChart, Clock3, Eye,
  User, ScrollText, Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, Plus, X, Zap, Trophy, Flame,
  BookMarked, BrainCircuit, CalendarDays, Clock, CheckCircle, ExternalLink
} from "lucide-react";
import { parse, isPast, isToday, differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useGoal } from '../context/GoalContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const parseSafeDate = (dateStr) => {
  if (!dateStr) return new Date();
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  return parse(dateStr, 'dd MMMM yyyy', new Date(), { locale: tr });
};

const Badge = ({ className, children }) => (
  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
    {children}
  </span>
);

const categoryThemes = {
  'Matematik': { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: Ruler, border: 'border-blue-200 dark:border-blue-800/50', accent: 'bg-blue-500', grad: 'from-blue-500 to-indigo-600' },
  'Fen Bilimleri': { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', icon: TestTube2, border: 'border-teal-200 dark:border-teal-800/50', accent: 'bg-teal-500', grad: 'from-teal-500 to-emerald-600' },
  'Türkçe': { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', icon: BookCopy, border: 'border-orange-200 dark:border-orange-800/50', accent: 'bg-orange-500', grad: 'from-orange-500 to-amber-600' },
  'Sosyal Bilgiler': { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', icon: Globe, border: 'border-purple-200 dark:border-purple-800/50', accent: 'bg-purple-500', grad: 'from-purple-500 to-violet-600' },
  'İngilizce': { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', icon: MessageSquare, border: 'border-rose-200 dark:border-rose-800/50', accent: 'bg-rose-500', grad: 'from-rose-500 to-pink-600' },
  'Genel Deneme Sınavları': { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', icon: Trophy, border: 'border-indigo-200 dark:border-indigo-800/50', accent: 'bg-indigo-500', grad: 'from-indigo-500 to-purple-600' },
  'Yanlışlarım': { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', icon: AlertCircle, border: 'border-red-200 dark:border-red-800/50', accent: 'bg-red-500', grad: 'from-red-500 to-rose-600' },
  'Diğer': { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', icon: FileText, border: 'border-slate-200 dark:border-slate-700', accent: 'bg-slate-500', grad: 'from-slate-500 to-gray-600' },
};

export const getCategoryName = (test) => test.subject || 'Diğer';

function getThemeKey(cat) {
  if (!cat) return 'Diğer';
  const c = cat.toLowerCase('tr-TR');
  if (c.includes('matematik') || c.includes('mat')) return 'Matematik';
  if (c.includes('fen')) return 'Fen Bilimleri';
  if (c.includes('türkçe') || c.includes('turkce')) return 'Türkçe';
  if (c.includes('sosyal')) return 'Sosyal Bilgiler';
  if (c.includes('ingilizce') || c.includes('ing')) return 'İngilizce';
  if (c.includes('deneme') || c.includes('genel')) return 'Genel Deneme Sınavları';
  return 'Diğer';
}

function CircleProgress({ value, size = 48, strokeWidth = 5, color = '#6366f1', bg = 'rgba(99,102,241,0.12)' }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(value, 100)) / 100;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, progress, progressColor }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between relative overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-md", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {progress !== undefined && (
          <div className="relative">
            <CircleProgress value={progress} size={42} strokeWidth={4} color={progressColor || '#6366f1'} />
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{value}</p>
        {sub && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      </div>
      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">{label}</p>
    </div>
  );
}

function TaskCard({ task, selectedStudent, onComplete }) {
  const category = task.subject || 'Genel';
  const theme = categoryThemes[getThemeKey(category)] || categoryThemes['Diğer'];
  const Icon = theme.icon;
  const dueDate = task.dueDateObj;
  const overdue = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  const daysDiff = differenceInDays(dueDate, new Date());

  const urgencyBadge = overdue
    ? <Badge className="bg-rose-500 text-white text-[10px] font-black animate-pulse">🔥 {differenceInDays(new Date(), dueDate)}g gecikti</Badge>
    : dueToday
    ? <Badge className="bg-amber-500 text-white text-[10px] font-black animate-pulse">⚡ Bugün son</Badge>
    : daysDiff <= 2
    ? <Badge className="bg-orange-400 text-white text-[10px] font-black">{daysDiff + 1}g kaldı</Badge>
    : <Badge className="bg-emerald-500 text-white text-[10px] font-black">{daysDiff + 1}g kaldı</Badge>;

  return (
    <div className={cn(
      "relative rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-slate-800/90",
      theme.border
    )}>
      <div className={cn("h-1.5 w-full bg-gradient-to-r", theme.grad)} />
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md", theme.bg, theme.text)}>{category}</span>
              {urgencyBadge}
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">{task.title}</h3>
          </div>
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border-2 bg-white dark:bg-slate-900 shadow-sm", theme.border)}>
            <Icon className={cn("w-5 h-5", theme.text)} />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          {task.type === 'test' && task.questionCount !== undefined && (
            <>
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Soru</p>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{task.questionCount || '—'}</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
            </>
          )}
          {task.type === 'study' && task.planName && (
            <>
              <div className="flex-1 text-center overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Plan</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{task.planName}</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
            </>
          )}
          <div className="flex-1 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tarih</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{task.dueDateStr}</p>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Süre</p>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{task.durationMinutes}dk</p>
          </div>
        </div>

        <div className="mt-auto">
          {task.type === 'test' ? (
            <Link
              to={task.sourceType === 'trackedBook'
                ? `/book-quiz/${task.id}?studentId=${selectedStudent.id}`
                : `/quiz/${task.id}?studentId=${selectedStudent.id}`}
            >
              <button className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/25">
                <PlayCircle className="w-4 h-4" />
                Ödevi Çöz
              </button>
            </Link>
          ) : (
            <button
              onClick={() => onComplete(task.id, 'assigned')}
              className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25"
            >
              <Check className="w-4 h-4" />
              Konuyu Bitirdim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, onDelete, onUpdateProgress }) {
  const navigate = useNavigate();
  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const isComplete = percent >= 100;
  const typeConfig = {
    'Soru': { stroke: '#f43f5e', icon: Target },
    'Sayfa': { stroke: '#3b82f6', icon: BookOpen },
    'Dakika': { stroke: '#10b981', icon: Timer },
  };
  const t = typeConfig[goal.type] || typeConfig['Soru'];
  const Icon = t.icon;

  const handleOpenLink = (e) => {
    e.stopPropagation();
    if (!goal.link) return;
    if (goal.link.startsWith('http://') || goal.link.startsWith('https://')) {
      window.open(goal.link, '_blank');
    } else {
      navigate(goal.link);
    }
  };

  return (
    <div className={cn(
      "relative bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden group flex flex-col justify-between p-5 gap-3 hover:shadow-xl transition-all",
      isComplete && "ring-2 ring-emerald-500"
    )}>
      {isComplete && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}
      
      <button onClick={() => onDelete(goal.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500 z-10">
        <X className="w-4 h-4" />
      </button>

      <div>
        <div className="flex items-center justify-between w-full mb-2">
          <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">{goal.period}</Badge>
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px] font-bold">
            <Icon className="w-3.5 h-3.5" /> {goal.type}
          </div>
        </div>

        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 text-center line-clamp-2 leading-snug" title={goal.title}>{goal.title}</h4>
      </div>

      <div className="relative flex items-center justify-center my-1">
        <ResponsiveContainer width={100} height={100}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="100%" barSize={9}
            data={[{ name: 'p', value: percent, fill: isComplete ? '#10b981' : t.stroke }]}
            startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: 'rgba(0,0,0,0.04)' }} clockWise dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={cn("text-lg font-black leading-none", isComplete ? "text-emerald-500" : "text-slate-800 dark:text-white")}>%{percent}</span>
        </div>
      </div>

      {/* PROGRESS QUICK INCREMENT BUTTONS */}
      <div className="flex items-center justify-center gap-1.5 my-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateProgress(goal.id, 5); }}
          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-emerald-500 hover:text-white text-[10px] font-black text-slate-600 dark:text-slate-300 transition-colors"
          title="+5 Miktar Ekle"
        >
          +5
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateProgress(goal.id, 10); }}
          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-emerald-500 hover:text-white text-[10px] font-black text-slate-600 dark:text-slate-300 transition-colors"
          title="+10 Miktar Ekle"
        >
          +10
        </button>
      </div>

      {/* GOAL LINK LAUNCHER BUTTON */}
      {goal.link && (
        <button
          onClick={handleOpenLink}
          className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Sayfaya Git</span>
        </button>
      )}

      <div className="w-full flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="text-center flex-1">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black">Mevcut</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-200">{goal.current}</p>
        </div>
        <div className="w-px bg-slate-100 dark:bg-slate-700/60" />
        <div className="text-center flex-1">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black">Hedef</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-200">{goal.target}</p>
        </div>
      </div>
    </div>
  );
}

const quickLinks = [
  { label: 'Sonuçlarım & Karne', sub: 'Grafikli karnenizi görün', icon: BarChart, grad: 'from-indigo-500 via-purple-500 to-indigo-600', shadow: 'shadow-indigo-500/25', to: '/student-results' },
  { label: 'Yanlışlarım & Havuz', sub: 'Hata havuzunu inceleyin', icon: AlertCircle, grad: 'from-rose-500 via-pink-500 to-red-600', shadow: 'shadow-rose-500/25', to: '/wrong-answers' },
  { label: 'Hedefler', sub: 'Hedefler ve program sayfası', icon: Target, grad: 'from-rose-500 via-pink-500 to-purple-600', shadow: 'shadow-rose-500/25', to: '/goals' },
  { label: 'Haftalık Program', sub: 'Ders çalışma saatleri', icon: CalendarDays, grad: 'from-amber-500 via-orange-500 to-amber-600', shadow: 'shadow-amber-500/25', to: '/goals' },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { data } = useCurriculum();
  const { homeworks } = useHomework();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { studyAssignments, updateStudyAssignment } = useStudyPlan();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = useSchedule();

  const { currentUser } = useAuth();
  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      setSelectedStudent(currentUser);
    } else if (studentMembers.length > 0) {
      setSelectedStudent(studentMembers[0]);
    } else {
      setSelectedStudent(null);
    }
  }, [currentUser, studentMembers]);

  const [expandedBooks, setExpandedBooks] = useState(new Set());
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    type: 'Soru',
    period: 'Günlük',
    target: 50,
    linkPreset: '',
    customLink: ''
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Pazartesi');
  const [newSchedule, setNewSchedule] = useState({ day: 'Pazartesi', time: '09:00', title: '' });

  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (newGoal.title && newGoal.target > 0) {
      const finalLink = newGoal.linkPreset === 'custom' ? newGoal.customLink : newGoal.linkPreset;
      addGoal({
        title: newGoal.title,
        type: newGoal.type,
        period: newGoal.period,
        target: newGoal.target,
        link: finalLink,
        studentId: selectedStudent?.id
      });
      setShowGoalModal(false);
      setNewGoal({ title: '', type: 'Soru', period: 'Günlük', target: 50, linkPreset: '', customLink: '' });
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

  const tests = useMemo(() => {
    if (!selectedStudent) return [];
    return homeworks.filter(hw => {
      if (hw.targetType === 'grade') return hw.targetIds.includes(selectedStudent.gradeId);
      if (hw.targetType === 'student') return hw.targetIds.includes(selectedStudent.id);
      return false;
    }).map(hw => {
      const sub = submissions.find(s => 
        (s.testId === hw.id || s.hwId === hw.id || (hw.tests && (hw.tests.includes(s.testId) || hw.tests.includes(s.bookTestId)))) && 
        s.studentId === selectedStudent.id
      ) || (hw.submissions || []).find(s => s.studentId === selectedStudent.id);

      return {
        ...hw,
        status: sub ? 'Sonuçlandı' : 'Atandı',
        assignedDate: hw.createdAt || new Date().toISOString(),
        questionCount: hw.totalQuestions || 10,
        correctAnswers: sub ? (sub.score || 0) : 0,
      };
    });
  }, [homeworks, selectedStudent, submissions]);

  const assignments = useMemo(() => {
    if (!selectedStudent) return [];
    return studyAssignments
      .filter(s => s.studentId === selectedStudent?.id)
      .map(a => ({ ...a, planName: 'Ders Planı', planLink: '#' }));
  }, [studyAssignments, selectedStudent]);

  const assignmentsByBook = useMemo(() => {
    const grouped = {};
    assignments.forEach(a => {
      const planId = 'Genel Plan';
      if (!grouped[planId]) grouped[planId] = { title: 'Tüm Konular', assignments: [], total: 0, completed: 0, id: planId };
      grouped[planId].assignments.push(a);
      grouped[planId].total++;
      if (a.status === 'completed') grouped[planId].completed++;
    });
    return Object.values(grouped).filter(g => g.total > 0).sort((a, b) => (b.total - b.completed) - (a.total - a.completed));
  }, [assignments]);

  const pendingTasks = useMemo(() => {
    const tTasks = tests.filter(t => t.status === 'Atandı').map(t => {
      const dateObj = parseSafeDate(t.dueDate);
      return {
        id: t.id, type: 'test', title: t.title, subject: getCategoryName(t),
        dueDateStr: new Date(t.dueDate).toLocaleDateString('tr-TR'),
        dueDateObj: dateObj, questionCount: t.questionCount,
        durationMinutes: (t.questionCount || 0) * 2 || 30,
        sourceType: t.sourceType,
      };
    });
    const aTasks = assignments.filter(a => a.status === 'assigned').map(a => {
      const dateObj = parseSafeDate(a.dueDate);
      return {
        id: a.id, type: 'study', title: a.topic, subject: a.subject,
        dueDateStr: format(dateObj, 'dd MMMM yyyy', { locale: tr }),
        dueDateObj: dateObj, questionCount: null,
        planName: a.planName || 'Bireysel Çalışma',
        planLink: a.planLink,
        durationMinutes: a.durationMinutes || 30,
      };
    });
    return [...tTasks, ...aTasks].sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime());
  }, [tests, assignments]);

  const focusTask = useMemo(() => {
    const testsOnly = pendingTasks.filter(t => t.type === 'test');
    if (testsOnly.length === 0) return null;
    return testsOnly[0];
  }, [pendingTasks]);

  const stats = useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalTasksCount = tests.length + assignments.length;
    const totalCompletedTasksCount = completedTests.length + completedAssignments.length;
    const completedRate = totalTasksCount > 0 ? (totalCompletedTasksCount / totalTasksCount) * 100 : 0;
    
    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => { totalQ += t.questionCount || 0; totalC += ((t.correctAnswers || 0) / 100) * (t.questionCount || 0); });
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    const overdueCount = tests.filter(t => t.status === 'Atandı' && isPast(parseSafeDate(t.dueDate)) && !isToday(parseSafeDate(t.dueDate))).length;
    
    return { testCount: tests.length, pendingCount: (tests.length - completedTests.length) + (assignments.length - completedAssignments.length), successRate, overdueCount, completedAssignmentsRate: completedRate };
  }, [tests, assignments]);

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => g.studentId === selectedStudent.id);
  }, [goals, selectedStudent]);

  const studentSchedules = useMemo(() => {
    if (!selectedStudent) return [];
    return schedules.filter(s => s.studentId === selectedStudent.id && s.day === selectedDay);
  }, [schedules, selectedStudent, selectedDay]);

  const toggleBook = (id) => setExpandedBooks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleCompleteStudy = (id, currentStatus) => updateStudyAssignment(id, { status: currentStatus === 'completed' ? 'assigned' : 'completed' });

  const gradeLabel = data?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || 'Öğrenci';
  const daysOfWeek = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0B1120] dark:via-[#0d1528] dark:to-[#0B1120] font-sans text-slate-800 dark:text-slate-200">

      {/* STICKY TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0d1528]/80 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-none">Öğrenci Paneli</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Eğitim & Sınav Portalı</p>
            </div>
          </div>

          {/* STUDENT SELECTOR SWITCHER */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1" style={{ scrollbarWidth: 'none' }}>
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs font-black transition-all whitespace-nowrap shrink-0 shadow-sm",
                    active
                      ? "bg-white dark:bg-slate-800 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md ring-2 ring-indigo-500/20"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black", active ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300")}>
                    {s.name.charAt(0)}
                  </div>
                  <span>{s.name}</span>
                  {active && <span className="hidden md:inline text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase">Aktif</span>}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-20">

        {/* HERO BANNER & FOCUS CARD */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* HERO BANNER (3 COLS) */}
          <div className="lg:col-span-3 rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 shadow-2xl shadow-indigo-500/25 flex flex-col justify-between">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-indigo-100 text-[11px] font-black uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Hoş Geldin 👋
                  </span>
                  <h2 className="text-white font-black text-3xl sm:text-4xl leading-tight">{selectedStudent?.name || 'Öğrenci'}</h2>
                  <p className="text-indigo-200/80 text-sm font-semibold mt-1">{gradeLabel} Derecesinde Devam Ediyor</p>
                </div>
                <div className="text-right bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl">
                  <p className="text-indigo-200 text-[10px] uppercase tracking-widest font-black mb-0.5">Genel Başarı</p>
                  <div className="flex items-baseline justify-end gap-0.5">
                    <span className="text-white/70 text-lg font-bold">%</span>
                    <span className="text-white font-black text-4xl leading-none">{Math.floor(stats.successRate)}</span>
                  </div>
                </div>
              </div>

              {/* FOCUS TASK CARD */}
              <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl p-4 sm:p-5 shadow-inner">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Günün Öncelikli Sınavı</span>
                  </div>
                  {focusTask && <span className="text-[10px] font-black bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase">Acil Çözüm</span>}
                </div>

                {focusTask ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-black text-base leading-snug truncate">{focusTask.title}</p>
                      <div className="flex items-center gap-3 text-white/70 text-xs mt-1 font-bold">
                        <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {focusTask.dueDateStr}</span>
                        <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {focusTask.durationMinutes} dk</span>
                        {focusTask.questionCount && <span>• {focusTask.questionCount} Soru</span>}
                      </div>
                    </div>

                    <Link
                      to={focusTask.sourceType === 'trackedBook'
                        ? `/book-quiz/${focusTask.id}?studentId=${selectedStudent.id}`
                        : `/quiz/${focusTask.id}?studentId=${selectedStudent.id}`}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-transform"
                    >
                      <PlayCircle className="w-4 h-4 text-indigo-600" />
                      Hemen Çöz
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white/90 text-sm font-bold py-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Harika! Tüm acil sınav ve görevlerinizi tamamladınız.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STATS GRID (2 COLS) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3.5">
            <StatCard label="Tamamlama Oranı" value={`%${stats.completedAssignmentsRate.toFixed(0)}`} icon={Trophy} color="bg-gradient-to-br from-amber-500 to-orange-600" progress={stats.completedAssignmentsRate} progressColor="#f59e0b" />
            <StatCard label="Toplam Görev" value={stats.testCount} sub={`${stats.pendingCount} bekliyor`} icon={Layers} color="bg-gradient-to-br from-indigo-500 to-blue-600" />
            <StatCard label="Başarı Oranı" value={`%${Math.floor(stats.successRate)}`} icon={Sparkles} color="bg-gradient-to-br from-emerald-500 to-teal-600" progress={stats.successRate} progressColor="#10b981" />
            <div className={cn(
              "bg-white dark:bg-slate-800/80 rounded-3xl p-5 border shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-lg",
              stats.overdueCount > 0 ? "border-rose-300 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20" : "border-slate-200/80 dark:border-slate-700/60"
            )}>
              <div className="flex items-start justify-between">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-md", stats.overdueCount > 0 ? "bg-rose-500" : "bg-slate-400")}>
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className={cn("text-3xl font-black leading-none", stats.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>{stats.overdueCount}</p>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">Acil Müdahale</p>
              </div>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Geciken Görev</p>
            </div>
          </div>

        </section>

        {/* QUICK ACCESS LAUNCHERS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Hızlı Modül Erişimi
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {quickLinks.map(({ label, sub, icon: Icon, grad, shadow, to }) => (
              <Link key={label} to={to} className="group">
                <div className={cn("rounded-3xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 flex items-center gap-3.5 bg-gradient-to-br relative overflow-hidden", grad, shadow)}>
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-sm leading-snug">{label}</h3>
                    <p className="text-white/70 text-[11px] font-semibold mt-0.5 hidden sm:block truncate">{sub}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-60 shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* PERSONAL GOALS */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <Link to="/goals" className="group inline-flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-rose-500 transition-colors">
                  <Target className="w-5 h-5 text-rose-500" />
                  Hedefler
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h2>
              </Link>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">{studentGoals.length > 0 ? `${studentGoals.length} aktif hedef takip ediliyor` : 'Henüz hedef belirlemediniz'}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                to="/goals"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Hedefler
              </Link>
              <button onClick={() => setShowGoalModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 active:scale-95 transition-all">
                <Plus className="w-4 h-4" /> Yeni Hedef Ekle
              </button>
            </div>
          </div>

          {studentGoals.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white/50 dark:bg-slate-900/40">
              <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Henüz kişisel bir hedef koymadın. Kendini geliştirmek için hemen bir hedef belirle!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {studentGoals.map(goal => <GoalCard key={goal.id} goal={goal} onDelete={deleteGoal} onUpdateProgress={updateGoalProgress} />)}
            </div>
          )}
        </section>

        {/* WEEKLY SCHEDULE & TIMETABLE WIDGET */}
        <section id="schedule" className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                Haftalık Çalışma Programı
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Güne özel ders çalışma ve etüt saatleriniz</p>
            </div>

            <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all">
              <Plus className="w-4 h-4" /> Programa Ekle
            </button>
          </div>

          {/* DAY TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
            {daysOfWeek.map(day => {
              const active = selectedDay === day;
              const count = selectedStudent ? schedules.filter(s => s.studentId === selectedStudent.id && s.day === day).length : 0;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl font-black text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2",
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  <span>{day}</span>
                  {count > 0 && <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", active ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* TIMETABLE LIST */}
          <div className="space-y-2.5">
            {studentSchedules.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                {selectedDay} günü için henüz etüt / çalışma saati eklenmedi.
              </div>
            ) : (
              studentSchedules.map(sch => (
                <div key={sch.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleScheduleDone(sch.id)} className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors", sch.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600")}>
                      {sch.done && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <p className={cn("text-sm font-black leading-snug", sch.done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100")}>{sch.title}</p>
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-indigo-500" /> {sch.time}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => deleteSchedule(sch.id)} className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PENDING TASKS */}
        {pendingTasks.length > 0 && (
          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-indigo-500" />
              Bekleyen Görevler
              <Badge className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs ml-1 font-black">{pendingTasks.length}</Badge>
            </h2>
            <div className="space-y-6">
              {pendingTasks.filter(t => t.type === 'test').length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> Sınavlar & Testler
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pendingTasks.filter(t => t.type === 'test').map(task => (
                      <TaskCard key={task.id} task={task} selectedStudent={selectedStudent} onComplete={handleCompleteStudy} />
                    ))}
                  </div>
                </div>
              )}
              {pendingTasks.filter(t => t.type === 'study').length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" /> Konu Çalışmaları
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pendingTasks.filter(t => t.type === 'study').map(task => (
                      <TaskCard key={task.id} task={task} selectedStudent={selectedStudent} onComplete={handleCompleteStudy} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* STUDY PLAN SECTION */}
        {assignmentsByBook.length > 0 && (
          <section id="study-plan">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" /> Konu Çalışma Planı
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {assignmentsByBook.map((group, index) => {
                const pct = (group.completed / group.total) * 100;
                const done = group.completed === group.total;
                const open = expandedBooks.has(group.id);
                const pending = group.assignments.filter(a => a.status !== 'completed');
                const completed = group.assignments.filter(a => a.status === 'completed');
                const coverGrads = ['from-blue-600 to-indigo-800', 'from-emerald-500 to-teal-700', 'from-amber-500 to-orange-700', 'from-rose-500 to-red-800'];
                return (
                  <div key={group.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <button onClick={() => toggleBook(group.id)} className="w-full p-5 flex items-start gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors relative">
                      {!done && <div className="absolute top-4 left-4 z-20"><div className="w-3 h-3 rounded-full bg-blue-500 animate-ping" /></div>}
                      <div className={cn("w-14 h-20 rounded-xl shrink-0 bg-gradient-to-br relative border-l-4 border-black/20 shadow-md", coverGrads[index % coverGrads.length])}>
                        <div className="absolute top-2 left-2 text-[8px] font-black text-white/80 uppercase leading-tight">DERS<br/>PLANI</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2">{group.title}</h3>
                          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform shrink-0 ml-2 mt-0.5", open && "rotate-180")} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-3">{group.completed}/{group.total} tamamlandı</p>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-700", done ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </button>
                    {open && (
                      <div className="bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-700/50 p-4 space-y-2">
                        {pending.map(a => (
                          <div key={a.id} onClick={() => handleCompleteStudy(a.id, a.status)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <div className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 shrink-0 hover:border-indigo-500 transition-colors" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{a.topic}</p>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded mt-1 inline-block">{a.subject}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>

      {/* NEW GOAL MODAL (WITH PAGE LINK SUPPORT) */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> Yeni Hedef & Bağlantı Belirle
              </h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Hedef Başlığı</label>
                <input type="text" required value={newGoal.title} onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))} placeholder="Örn: Günlük Matematik Soru Çözümü" className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Hedef Türü</label>
                  <select value={newGoal.type} onChange={e => setNewGoal(g => ({ ...g, type: e.target.value }))} className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none">
                    <option value="Soru">Soru Sayısı</option>
                    <option value="Sayfa">Kitap Sayfası</option>
                    <option value="Dakika">Çalışma Süresi (dk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Periyot</label>
                  <select value={newGoal.period} onChange={e => setNewGoal(g => ({ ...g, period: e.target.value }))} className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none">
                    <option value="Günlük">Günlük</option>
                    <option value="Haftalık">Haftalık</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Hedef Miktarı</label>
                <input type="number" min="1" required value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: parseInt(e.target.value) || 1 }))} className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
              </div>

              {/* PAGE LINK / URL SELECTION */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">🔗 Hedef Sayfası / Linki (İsteğe Bağlı)</label>
                <select
                  value={newGoal.linkPreset}
                  onChange={e => setNewGoal(g => ({ ...g, linkPreset: e.target.value }))}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none"
                >
                  <option value="">🚫 Bağlantı Yok</option>
                  <option value="/wrong-answers">❌ Yanlışlarım & Hata Havuzum</option>
                  <option value="/student-results">📊 Sınav Sonuçlarım & Grafikler</option>
                  <option value="/question-bank">📚 Soru Bankası Portalı</option>
                  <option value="custom">🌐 Özel Web Adresi (URL)</option>
                </select>

                {newGoal.linkPreset === 'custom' && (
                  <input
                    type="text"
                    required
                    value={newGoal.customLink}
                    onChange={e => setNewGoal(g => ({ ...g, customLink: e.target.value }))}
                    placeholder="Örn: https://eba.gov.tr veya /quiz/..."
                    className="w-full mt-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowGoalModal(false)} className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200">İptal</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" /> Programa Çalışma Ekle
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Ders / Etüt Adı</label>
                <input type="text" required value={newSchedule.title} onChange={e => setNewSchedule(s => ({ ...s, title: e.target.value }))} placeholder="Örn: 8. Sınıf Fen Bilimleri Etüdü" className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Gün</label>
                  <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none">
                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Saat</label>
                  <input type="time" required value={newSchedule.time} onChange={e => setNewSchedule(s => ({ ...s, time: e.target.value }))} className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200">İptal</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md">Programa Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
