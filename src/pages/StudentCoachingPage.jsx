import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, AlertTriangle, BookOpen, Calendar,
  MessageSquare, Plus, CheckCircle2, Award, Clock,
  FileText, ArrowRight, Zap, Target, Send, ChevronRight, Check,
  User, Sparkles, TrendingUp, Trash2, CalendarDays, Edit3, UserCheck,
  Printer, Folder, Bookmark, Phone, Heart, Brain, GraduationCap,
  Building, Mail, ShieldAlert, Compass, HelpCircle, Activity, Flame,
  Sliders, PieChart, ListTodo, Save, Eye, Layers, BookMarked, Monitor,
  Dumbbell, Moon, CheckSquare, Square, Filter, Gift, Smile, Users, BookOpenCheck,
  CheckCircle, Repeat, CheckLine, AlertCircle, X, RefreshCw, Trophy
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useSchedule } from '../context/ScheduleContext';
import { useCoaching } from '../context/CoachingContext';
import { useAuth } from '../context/AuthContext';
import { useGoal } from '../context/GoalContext';

const DAYS = [
  { id: 'Pazartesi', label: 'Pazartesi' },
  { id: 'Salı', label: 'Salı' },
  { id: 'Çarşamba', label: 'Çarşamba' },
  { id: 'Perşembe', label: 'Perşembe' },
  { id: 'Cuma', label: 'Cuma' },
  { id: 'Cumartesi', label: 'Cumartesi' },
  { id: 'Pazar', label: 'Pazar' },
];

const WEEK_SHORT_DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const MONTH_WEEKS = ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'];
const SUBJECT_NAMES = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];

/* Helper to parse goal list into checkable items */
const parseCheckableGoalList = (val, defaultItems = []) => {
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

/* Helper for Daily Habits with 7-Day Matrix */
const parseDailyHabitList = (val, defaultItems = []) => {
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

/* Helper for Weekly Habits with 4-Week Matrix */
const parseWeeklyHabitList = (val, defaultItems = []) => {
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

export default function StudentCoachingPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { data: curriculumData } = useCurriculum();
  const { submissions } = useEvaluation();

  const {
    getCoachingProfileForStudent,
    saveCoachingProfile,
    coachingProfiles
  } = useCoaching();

  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();

  const [activeTab, setActiveTab] = useState('info'); 

  const student = users.find(u => String(u.id) === String(studentId));
  const teacherId = currentUser?.id || 'teacher_1';

  const studentGoals = useMemo(() => {
    if (!student) return [];
    return goals.filter(g => String(g.studentId) === String(student.id));
  }, [goals, student]);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalType, setNewGoalType] = useState('Soru');
  const [newGoalPeriod, setNewGoalPeriod] = useState('Günlük');
  const [newGoalTarget, setNewGoalTarget] = useState('100');

  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);

  // Page 3: Hedef Belirleme & Checkable Lists
  const [examGoalType, setExamGoalType] = useState(existingProfile.examGoalType || 'LGS 2026');
  const [targetSchool, setTargetSchool] = useState(existingProfile.targetSchool || '');
  const [targetScore, setTargetScore] = useState(existingProfile.targetScore || '485');
  const [targetNet, setTargetNet] = useState(existingProfile.targetNet || '90');

  const [monthlyItems, setMonthlyItems] = useState(() => parseCheckableGoalList(existingProfile.monthlyGoals, [
    { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
    { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
  ]));

  const [weeklyHabitItems, setWeeklyHabitItems] = useState(() => parseWeeklyHabitList(existingProfile.weeklyGoals, [
    { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', weeks: { 'Hafta 1': true, 'Hafta 2': true, 'Hafta 3': true, 'Hafta 4': false } }
  ]));

  const [dailyHabitItems, setDailyHabitItems] = useState(() => parseDailyHabitList(existingProfile.dailyGoals, [
    { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } }
  ]));

  const [newMonthlyText, setNewMonthlyText] = useState('');
  const [newWeeklyText, setNewWeeklyText] = useState('');
  const [newDailyText, setNewDailyText] = useState('');

  const [isProfileSaved, setIsProfileSaved] = useState(false);

  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.examGoalType) setExamGoalType(existingProfile.examGoalType);
      if (existingProfile.targetSchool) setTargetSchool(existingProfile.targetSchool);
      if (existingProfile.targetScore) setTargetScore(existingProfile.targetScore);
      if (existingProfile.targetNet) setTargetNet(existingProfile.targetNet);

      setMonthlyItems(parseCheckableGoalList(existingProfile.monthlyGoals, [
        { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
        { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
      ]));
      setWeeklyHabitItems(parseWeeklyHabitList(existingProfile.weeklyGoals, [
        { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', weeks: { 'Hafta 1': true, 'Hafta 2': true, 'Hafta 3': true, 'Hafta 4': false } }
      ]));
      setDailyHabitItems(parseDailyHabitList(existingProfile.dailyGoals, [
        { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } }
      ]));
    }
  }, [existingProfile]);

  if (!student) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Öğrenci Bulunamadı</h2>
        <button onClick={() => navigate('/teacher')} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.65rem', fontWeight: 800, cursor: 'pointer', marginTop: '1rem' }}>
          Öğretmen Paneline Dön
        </button>
      </div>
    );
  }

  const saveAllWithLists = async (mList, wList, dList) => {
    await saveCoachingProfile({
      ...existingProfile,
      studentId: student.id,
      examGoalType,
      targetSchool,
      targetScore,
      targetNet: Number(targetNet) || 0,
      monthlyGoals: mList,
      weeklyGoals: wList,
      dailyGoals: dList
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2000);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    saveAllWithLists(monthlyItems, weeklyHabitItems, dailyHabitItems);
  };

  // Handlers for Monthly Items
  const handleToggleMonthlyItem = (id) => {
    const next = monthlyItems.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setMonthlyItems(next);
    saveAllWithLists(next, weeklyHabitItems, dailyHabitItems);
  };
  const handleAddMonthlyItem = (e) => {
    e.preventDefault();
    if (newMonthlyText.trim()) {
      const next = [...monthlyItems, { id: `m_${Date.now()}`, text: newMonthlyText.trim(), done: false }];
      setMonthlyItems(next);
      setNewMonthlyText('');
      saveAllWithLists(next, weeklyHabitItems, dailyHabitItems);
    }
  };
  const handleDeleteMonthlyItem = (id) => {
    const next = monthlyItems.filter(i => i.id !== id);
    setMonthlyItems(next);
    saveAllWithLists(next, weeklyHabitItems, dailyHabitItems);
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
    saveAllWithLists(monthlyItems, next, dailyHabitItems);
  };
  const handleAddWeeklyHabitItem = (e) => {
    e.preventDefault();
    if (newWeeklyText.trim()) {
      const next = [...weeklyHabitItems, { id: `w_${Date.now()}`, text: newWeeklyText.trim(), weeks: { 'Hafta 1': false, 'Hafta 2': false, 'Hafta 3': false, 'Hafta 4': false } }];
      setWeeklyHabitItems(next);
      setNewWeeklyText('');
      saveAllWithLists(monthlyItems, next, dailyHabitItems);
    }
  };
  const handleDeleteWeeklyHabitItem = (id) => {
    const next = weeklyHabitItems.filter(i => i.id !== id);
    setWeeklyHabitItems(next);
    saveAllWithLists(monthlyItems, next, dailyHabitItems);
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
    saveAllWithLists(monthlyItems, weeklyHabitItems, next);
  };
  const handleAddDailyHabitItem = (e) => {
    e.preventDefault();
    if (newDailyText.trim()) {
      const next = [...dailyHabitItems, { id: `d_${Date.now()}`, text: newDailyText.trim(), days: { Pzt: false, Sal: false, Çrş: false, Prş: false, Cum: false, Cts: false, Paz: false } }];
      setDailyHabitItems(next);
      setNewDailyText('');
      saveAllWithLists(monthlyItems, weeklyHabitItems, next);
    }
  };
  const handleDeleteDailyHabitItem = (id) => {
    const next = dailyHabitItems.filter(i => i.id !== id);
    setDailyHabitItems(next);
    saveAllWithLists(monthlyItems, weeklyHabitItems, next);
  };

  const handleAddStudentGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    await addGoal({
      studentId: student.id,
      title: newGoalTitle.trim(),
      type: newGoalType,
      period: newGoalPeriod,
      target: Number(newGoalTarget) || 50,
      current: 0
    });
    setNewGoalTitle('');
    setNewGoalTarget('100');
  };

  const gradeName = curriculumData?.grades?.find(g => g.id === student.gradeId)?.name || 'Öğrenci';

  return (
    <div className="coaching-dossier-page" style={{ minHeight: '100vh', background: '#e2e8f0', padding: 'clamp(1rem,3vw,2rem)', fontFamily: 'inherit' }}>
      
      {/* CONTROL BAR */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/teacher')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '0.85rem', padding: '0.6rem 1.25rem', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Öğretmen Paneline Dön
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: 'white', border: 'none', borderRadius: '0.85rem', padding: '0.65rem 1.4rem', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer' }}>
          <Printer size={18} /> Tüm Koçluk Dosyasını Yazdır / PDF
        </button>
      </div>

      {/* BINDER CONTAINER */}
      <div style={{ background: '#fcfaf6', borderRadius: '1.5rem', border: '3px solid #cbd5e1', boxShadow: '0 20px 50px rgba(0,0,0,0.12)', overflow: 'hidden' }}>

        {/* TOP BAND */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '1.5rem 2rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '4px solid #f59e0b', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem' }}>
              {student.name?.charAt(0) || 'Ö'}
            </div>
            <div>
              <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{student.name} · Öğrenci Rehberlik & Gelişim Takip Dosyası</h1>
            </div>
          </div>
        </div>

        {/* DOSSIER TABS */}
        <div className="no-print" style={{ display: 'flex', background: '#e2e8f0', padding: '0.5rem 1rem 0', gap: '0.4rem', overflowX: 'auto', borderBottom: '2px solid #cbd5e1' }}>
          {[
            { id: 'info', label: '📄 1. Bilgi Formu' },
            { id: 'intake', label: '🧠 2. İlk Tanışma' },
            { id: 'goals', label: '🎯 3. Hedef & Seri Takibi (Canlı Sync)' },
            { id: 'subject_analysis', label: '📚 4. Ders Analizi' },
            { id: 'weekly_program', label: '📅 5. Haftalık Program' },
            { id: 'daily_tracker', label: '⏱️ 6. Günlük Takip' },
            { id: 'mock_tracking', label: '📈 7. Deneme Takibi' },
            { id: 'topic_checklist', label: '📋 8. Konu Çizelgesi' }
          ].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '0.75rem 1.1rem', border: '2px solid #cbd5e1', borderBottom: 'none', borderRadius: '0.85rem 0.85rem 0 0',
                background: active ? '#fcfaf6' : '#cbd5e1', color: active ? '#0f172a' : '#475569',
                fontWeight: active ? 900 : 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* PAGE CONTENT */}
        <div style={{ padding: '2rem', background: '#fcfaf6', minHeight: '600px' }}>

          {/* PAGE 3: HEDEF BELİRLEME & SERİ TAKİBİ */}
          {(activeTab === 'goals' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Target size={24} color="#059669" /> 3. Hedef Belirleme & Canlı Alışkanlık / Seri Takip Matrisi
                  </h3>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 3 / 16
                  </span>
                </div>

                {/* UZUN VADELİ HEDEFLER */}
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <GraduationCap size={20} color="#059669" /> 🏛️ Uzun Vadeli Sınav & Okul Hedefleri (Sınav, Okul, Puan & Net)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Hedef Sınav Türü</label>
                        <select value={examGoalType} onChange={e => setExamGoalType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="LGS 2026">🎓 LGS (Liselere Geçiş Sınavı)</option>
                          <option value="YKS (TYT/AYT) 2026">🏛️ YKS (TYT & AYT Sınavı)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>İstenen Okul & Bölüm</label>
                        <input
                          type="text"
                          placeholder="Örn: Kabataş Erkek Lisesi / İTÜ Müh."
                          value={targetSchool}
                          onChange={e => setTargetSchool(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Puan Hedefi</label>
                        <input
                          type="text"
                          placeholder="Örn: 485 Puan"
                          value={targetScore}
                          onChange={e => setTargetScore(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Net Hedefi (Toplam Net)</label>
                        <input
                          type="number"
                          placeholder="Örn: 90 Net"
                          value={targetNet}
                          onChange={e => setTargetNet(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>
                  </div>
                </form>

                {/* 📅 ORTA VADELİ HEDEFLER (AYLIK KAZANIMLAR CHECKLIST) */}
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Trophy size={20} color="#2563eb" /> 📅 ORTA VADELİ HEDEFLER (AYLIK KAZANIMLAR)
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8' }}>
                      {monthlyItems.filter(i => i.done).length}/{monthlyItems.length} Tamamlandı
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                    {monthlyItems.map(item => (
                      <div key={item.id} onClick={() => handleToggleMonthlyItem(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: item.done ? '#dbeafe' : 'white', borderRadius: '0.75rem', border: item.done ? '1.5px solid #93c5fd' : '1px solid #cbd5e1', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: item.done ? 'none' : '2px solid #94a3b8', background: item.done ? '#2563eb' : 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
                            {item.done && <Check size={16} />}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: item.done ? '#1e3a8a' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                            {item.text}
                          </span>
                        </div>
                        <button type="button" className="no-print" onClick={(e) => { e.stopPropagation(); handleDeleteMonthlyItem(item.id); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddMonthlyItem} className="no-print" style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="+ Yeni aylık hedef maddesi ekle..."
                      value={newMonthlyText}
                      onChange={e => setNewMonthlyText(e.target.value)}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid #93c5fd', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Ekle
                    </button>
                  </form>
                </div>

                {/* ⚡ HAFTALIK HEDEF & SERİ TAKİBİ (4-WEEK MATRIX) */}
                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={20} color="#7c3aed" /> ⚡ HAFTALIK HEDEF & SERİ TAKİBİ (4-HAFTALIK MATRİS)
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    {weeklyHabitItems.map(item => (
                      <div key={item.id} style={{ background: 'white', border: '1.5px solid #e9d5ff', borderRadius: '0.85rem', padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#4c1d95' }}>{item.text}</span>
                          <button type="button" className="no-print" onClick={() => handleDeleteWeeklyHabitItem(item.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={15} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {MONTH_WEEKS.map(w => {
                            const done = item.weeks?.[w];
                            return (
                              <button
                                key={w}
                                type="button"
                                onClick={() => handleToggleWeeklyMatrixDay(item.id, w)}
                                style={{ background: done ? '#7c3aed' : '#f8fafc', color: done ? 'white' : '#64748b', border: done ? 'none' : '1px solid #cbd5e1', borderRadius: 8, padding: '0.4rem', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                              >
                                <span>{w}</span>
                                {done && <Check size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddWeeklyHabitItem} className="no-print" style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="+ Yeni haftalık hedef ekle..."
                      value={newWeeklyText}
                      onChange={e => setNewWeeklyText(e.target.value)}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid #d8b4fe', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Ekle
                    </button>
                  </form>
                </div>

                {/* 🔥 GÜNLÜK RUTİN & SERİ TAKİBİ (7-DAY MATRIX) */}
                <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Flame size={20} color="#dc2626" /> 🔥 GÜNLÜK RUTİN & SERİ TAKİBİ (7-GÜNLÜK MATRİS)
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    {dailyHabitItems.map(item => (
                      <div key={item.id} style={{ background: 'white', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#991b1b' }}>{item.text}</span>
                          <button type="button" className="no-print" onClick={() => handleDeleteDailyHabitItem(item.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={15} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                          {WEEK_SHORT_DAYS.map(day => {
                            const done = item.days?.[day];
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleToggleDailyMatrixDay(item.id, day)}
                                style={{ background: done ? '#dc2626' : '#f8fafc', color: done ? 'white' : '#64748b', border: done ? 'none' : '1px solid #cbd5e1', borderRadius: 8, padding: '0.35rem 0.2rem', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', textAlign: 'center' }}
                              >
                                <div>{day}</div>
                                <div style={{ marginTop: 2, fontSize: '0.7rem' }}>{done ? '✓' : '—'}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddDailyHabitItem} className="no-print" style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="+ Yeni günlük rutin ekle..."
                      value={newDailyText}
                      onChange={e => setNewDailyText(e.target.value)}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid #fca5a5', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Ekle
                    </button>
                  </form>
                </div>

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                  {isProfileSaved ? (
                    <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={20} /> Hedef Belirleme & Seri Takibi Başarıyla Kaydedildi!
                    </span>
                  ) : <span />}
                  <button onClick={handleSaveProfile} style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save size={18} /> Tüm Seri & Hedefleri Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
