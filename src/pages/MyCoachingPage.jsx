import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Save, Plus, Trash2, Check, ChevronDown, ChevronRight,
  Star, BookOpen, Calendar, Flame, Moon, Dumbbell,
  TrendingUp, Zap, CheckCircle2, Award, Clock,
  AlertTriangle, Smile, Gift, Activity, BarChart3,
  GraduationCap, User, Layers, ClipboardList, MessageSquare,
  FileText, ArrowLeft, Sparkles, Trophy, Heart, Eye, AlertCircle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';

/* ─── Helpers ─── */
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const DAY_LONG = { 'Pzt': 'Pazartesi', 'Sal': 'Salı', 'Çrş': 'Çarşamba', 'Prş': 'Perşembe', 'Cum': 'Cuma', 'Cts': 'Cumartesi', 'Paz': 'Pazar' };
const SUBJECTS = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Genel Tekrar', 'Soru Çözümü', 'Deneme Sınavı', 'Paragraf / Problem'];
const TOPIC_STATUSES = ['Başlanmadı', 'Başlandı', 'Öğrenildi', 'Tekrar Yapıldı', 'Tamamlandı'];
const STATUS_COLOR = { 'Başlanmadı': '#94a3b8', 'Başlandı': '#f59e0b', 'Öğrenildi': '#3b82f6', 'Tekrar Yapıldı': '#f97316', 'Tamamlandı': '#10b981' };

export function getCurrentWeekKey() {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

export const normalizeWeeklyProgram = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DAYS.map(d => ({ day: d, items: [] }));
  }

  return DAYS.map(d => {
    const found = raw.find(r => r.day === d);
    if (!found) return { day: d, items: [] };

    if (Array.isArray(found.items)) {
      return { day: d, items: found.items };
    }

    const legacyItems = [];
    if (found.lessons || found.hours) {
      legacyItems.push({
        id: `legacy_${d}_1`,
        subject: found.lessons || 'Ders Çalışması',
        topic: '',
        hours: found.hours || '',
        isRecurring: true,
        done: !!found.done
      });
    }
    return { day: d, items: legacyItems };
  });
};

export const processWeeklyProgramWeekChange = (rawProgram, savedWeekKey) => {
  const currentWeek = getCurrentWeekKey();
  let normalized = normalizeWeeklyProgram(rawProgram);

  if (savedWeekKey && savedWeekKey !== currentWeek) {
    normalized = normalized.map(dayObj => ({
      ...dayObj,
      items: (dayObj.items || []).map(item => {
        const isRec = item.isRecurring !== false;
        if (isRec) {
          return { ...item, done: false }; // Reset tick for new week
        }
        // Non-recurring items: un-ticked items remain un-ticked in list
        return item;
      })
    }));
  }
  return normalized;
};

/* ─── Styles ─── */
const inp = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.7rem', border: '1.5px solid #e2e8f0', fontSize: '0.84rem', outline: 'none', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' };
const ta = { ...inp, minHeight: 72, resize: 'vertical', lineHeight: 1.6 };
const lbl = { fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' };

/* ─── Small components ─── */
function TabBtn({ id, active, label, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '0.55rem 0.9rem', border: active ? '2px solid #e2e8f0' : '2px solid transparent',
      borderBottom: active ? '2px solid white' : '2px solid transparent',
      borderRadius: '0.7rem 0.7rem 0 0', background: active ? 'white' : 'transparent',
      color: active ? '#7c3aed' : '#64748b', fontWeight: active ? 900 : 600,
      fontSize: '0.74rem', cursor: 'pointer', whiteSpace: 'nowrap',
      marginBottom: active ? -2 : 0, transition: 'all 0.15s'
    }}>{label}</button>
  );
}

function Card({ emoji, title, children, color = '#7c3aed' }) {
  return (
    <div style={{ background: 'white', borderRadius: '1.25rem', border: '2px solid #f1f5f9', padding: '1.35rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f8fafc' }}>
        <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Tip({ children }) {
  return <div style={{ background: '#f0f4ff', border: '1.5px solid #c7d2fe', borderRadius: '0.75rem', padding: '0.7rem 0.9rem', fontSize: '0.8rem', color: '#3730a3', fontWeight: 700, marginBottom: '1rem' }}>💡 {children}</div>;
}

function CheckItem({ label, checked, onChange, onDelete }) {
  return (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', background: checked ? '#f0fdf4' : '#f8fafc', borderRadius: '0.65rem', border: checked ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer', marginBottom: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: checked ? '#16a34a' : 'white', border: checked ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <Check size={13} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.84rem', color: checked ? '#166534' : '#374151', textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
      </div>
      {onDelete && <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2 }}><Trash2 size={13} /></button>}
    </div>
  );
}

function AddInput({ value, onChange, onAdd, placeholder, color = '#7c3aed' }) {
  return (
    <form onSubmit={e => { e.preventDefault(); onAdd(); }} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input style={{ ...inp, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <button type="submit" style={{ background: color, color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.5rem 0.85rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}><Plus size={15} /></button>
    </form>
  );
}

function Progress({ value, max, color = '#7c3aed', label }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ marginTop: 6 }}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>
        <span>{label}</span><span style={{ color }}>{pct}%</span>
      </div>}
      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════ */
export default function MyCoachingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles,
    isStudentCoached, getMockExamsForStudent, addMockExam, deleteMockExam
  } = useCoaching();
  const { submissions, deleteSubmission } = useEvaluation();
  const { homeworks = [] } = useHomework() || {};

  const studentId = currentUser?.id;
  const isCoached = useMemo(() => {
    if (!studentId) return false;
    // Teacher or admin can view any profile, student can only view if coached
    if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') return true;
    return isStudentCoached(studentId);
  }, [studentId, currentUser?.role, isStudentCoached]);

  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('hedefler');

  /* ── Hedeflerim ── */
  const [goals, setGoals] = useState({
    examGoalType: 'LGS 2026', customExamName: '', targetSchool: '', targetScore: '', targetNet: '',
    gradeClass: '', gradeTerm: '1', gradeTarget: 'Takçek',
    monthlyGoals: [], weeklyGoals: [], dailyGoals: []
  });
  const [newMonthly, setNewMonthly] = useState('');
  const [newWeekly, setNewWeekly] = useState('');
  const [newDaily, setNewDaily] = useState('');

  /* ── Haftalık Program (Multi-item per day) ── */
  const [weeklyProgram, setWeeklyProgram] = useState(DAYS.map(d => ({ day: d, items: [] })));
  const [newScheduleInputs, setNewScheduleInputs] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { subject: SUBJECTS[0], topic: '', hours: '', isRecurring: true } }), {})
  );

  /* ── Günlük Takip ── */
  const [dailyLogs, setDailyLogs] = useState([]);
  const [newLog, setNewLog] = useState({ date: today(), studyHours: '', questions: '', revision: '', sport: false, sleepTime: '' });

  /* ── Manuel Deneme Girişi (Modal & D/Y/B/Net) ── */
  const [showMockModal, setShowMockModal] = useState(false);
  const [newManualMock, setNewManualMock] = useState({
    title: '', date: today(),
    subjects: {
      'Türkçe': { d: '', y: '', b: '', net: '' },
      'Matematik': { d: '', y: '', b: '', net: '' },
      'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
      'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
      'İngilizce': { d: '', y: '', b: '', net: '' },
    }
  });
  const [newSubjectName, setNewSubjectName] = useState('');

  /* ── Konu Takip ── */
  const [topicList, setTopicList] = useState([]);
  const [newTopic, setNewTopic] = useState({ subject: SUBJECTS[0], topic: '', status: 'Başlanmadı' });

  /* ── Soru Takip ── */
  const [questionTrack, setQuestionTrack] = useState({ dailyGoal: '50', solved: '' });

  /* ── Hata Defteri ── */
  const [errors, setErrors] = useState([]);
  const [newError, setNewError] = useState({ subject: SUBJECTS[0], topic: '', reason: '', correct: '', retakeDate: today() });

  /* ── Motivasyon ── */
  const [motivation, setMotivation] = useState({ weekQuote: '', achievements: '', selfNote: '', rewardSystem: '' });

  /* ── Alışkanlıklar ── */
  const [habits, setHabits] = useState([
    { id: uid(), label: 'Erken Kalktım', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Plan Yaptım', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Kitap Okudum', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Spor Yaptım', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Telefon < 2 Saat', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
  ]);
  const [newHabit, setNewHabit] = useState('');

  /* ── Konu Havuzu ── */
  const [topicPool, setTopicPool] = useState([]);
  const [newPoolSubject, setNewPoolSubject] = useState({ name: '', color: '#7c3aed' });
  const [newPoolTopics, setNewPoolTopics] = useState({});
  const [bulkTopicInput, setBulkTopicInput] = useState({});
  const [showBulkInput, setShowBulkInput] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);

  const POOL_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#db2777','#0f766e'];

  const TOPIC_TEMPLATES = {
    'LGS': [
      { name: 'Türkçe', color: '#d97706', topics: ['Sözcükte Anlam','Cümlede Anlam','Söz Varlığı','Yapısal Anlam','Yazım Kuralları','Noktalama İşaretleri','Fiil','İsim Soylu Fiiller','Sıfat','Zarf','Zamir','Bağlaç','Edatlar','Ünlü Uyumları','Paragraf','Anlatım Biçimleri','Metin Türleri'] },
      { name: 'Matematik', color: '#2563eb', topics: ['Doğal Sayılar','Bölme-Kalan','OBEB-OKEK','Kesirler','Ondalık Sayılar','Yüzde','Oran-Orantı','Denklemler','Eşitsizlikler','Üslular','Köklü Sayılar','Veri Analizi','Olasılık','Geometri Temelleri','Üçgenler','Dörtgenler','Daireler','Dik Üçgen','Prizmalar'] },
      { name: 'Fen Bilimleri', color: '#059669', topics: ['Hücreler','Biyolojik Çeşitlilik','Kuvvet ve Hareket','Madde ve Atomun Yapısı','Kimyasal Tepkimeler','Enerji Dönüşümleri','Elektrik ve Manyetizma','Optik','Ses','Çevre ve İklim','Canlılar ve Yaşam'] },
      { name: 'Sosyal Bilgiler', color: '#dc2626', topics: ['Tarihte Yolculuk','Bilim Tarih ve Hukuk','Yaşadığımız Yer','Üretim Tüketim','Demokrasi ve Katılım','Ortak Mirasımız','Küresel Bağlantılar'] },
      { name: 'İngilizce', color: '#0891b2', topics: ['Teens','Yummy Yummy','In the Kitchen','On the Phone','TV & Social Media','Adventures','Tourism','Emergency','Digital Era','Greens'] },
      { name: 'Din Kültürü', color: '#7c3aed', topics: ["Kur'an'ın Temel Eğitimi",'Hz. Muhammed','Küresel Etik','Din ve Hayat','Gençlik Dönemi'] },
    ],
    'TYT': [
      { name: 'TYT Türkçe', color: '#d97706', topics: ['Sözcükte Anlam','Deyim-Atasözü','Cümle Anlamı','Paragraf','Yazım Kuralları','Noktalama','Cümle Türleri','Fiil Çekimleri','Edatlar-Bağlaçlar','Anlatım Bozuklukları'] },
      { name: 'TYT Matematik', color: '#2563eb', topics: ['Temel Kavramlar','Sayı Basamakları','Bölünebilme','OBEB-OKEK','Üslular-Köklüler','Kesirler','Denklemler','Eşitsizlikler','Oran-Orantı','Yüzde-Faiz','Kümeler','Fonksiyonlar','Kombinasyon','Olasılık','İstatistik'] },
      { name: 'TYT Fen', color: '#059669', topics: ['Atom Modelleri','Periyodik Sistem','Kimyasal Bağlar','Asit-Baz','Kinetik Enerji','Newton Yasaları','Optik','Elektrik','DNA ve Kalıtım','Ekosistem'] },
      { name: 'TYT Sosyal', color: '#dc2626', topics: ['Tarih Bilimi','İlk Uygarlıklar','İslam Tarihi','Osmanlı Devleti','Birinci Dünya Savaşı','İstiklal Savaşı','Cumhuriyet Dönemi','Coğrafya Temelleri','Türkiye Coğrafyası','Felsefe Giriş'] },
    ],
    'AYT-Sözel': [
      { name: 'Edebiyat', color: '#d97706', topics: ['Güzel Sanatlar','Dil-Anlatım','Halk Edebiyatı','Divan Edebiyatı','Tanzimat','Servetifünun','Milli Edebiyat','Cumhuriyet Edebiyatı'] },
      { name: 'Tarih', color: '#dc2626', topics: ['Tarih Felsefesi','Meşrutiyet Dönemi','Birinci Dünya Savaşı','Kurtuluş Savaşı','Atatürk Dönemi','Siyasi Tarih','İkinci Dünya Savaşı','Soğuk Savaş'] },
      { name: 'Coğrafya', color: '#059669', topics: ['Doğal Sistemler','Küresel Ortam','Nüfus','Göç','Yerleşme','Tarım','Endüstri','Enerji','Turizm','Afetler'] },
    ],
    'AYT-Sayısal': [
      { name: 'Matematik', color: '#2563eb', topics: ['Fonksiyonlar','Trigonometri','Logaritma','Dizi ve Seriler','Limit-Türev','İntegral','Karmaşık Sayılar','Kombinasyon-Olasılık','Analitik Geometri','Konik Kesitler'] },
      { name: 'Fizik', color: '#0891b2', topics: ['Vektörler','Kinematik','Dinamik','Enerji','İtme-Momentum','Tork-Döndürme','Basınç','Dalgalar','Elektrik','Manyetizma','Modern Fizik'] },
      { name: 'Kimya', color: '#db2777', topics: ['Atom Modelleri','Periyodik Tablo','Kimyasal Bağ','Gaz Yasaları','Termokimya','Kimyasal Denge','Elektrokimya','Organik Kimya'] },
      { name: 'Biyoloji', color: '#059669', topics: ['Hücre','Mitoz-Mayoz','Kalıtım','Mutasyon','Ekosistem','Solunum Sistemleri','Sinir Sistemi','Hormonal Sistem','Üreme'] },
    ],
  };

  const addPoolSubject = () => {
    const name = newPoolSubject.name.trim();
    if (!name) return;
    if (topicPool.find(s => s.name.toLowerCase() === name.toLowerCase())) return;
    const color = POOL_COLORS[topicPool.length % POOL_COLORS.length];
    setTopicPool(prev => [...prev, { id: uid(), name, color: newPoolSubject.color || color, topics: [] }]);
    setNewPoolSubject({ name: '', color: POOL_COLORS[(topicPool.length + 1) % POOL_COLORS.length] });
  };

  const removePoolSubject = (subId) => setTopicPool(prev => prev.filter(s => s.id !== subId));

  const addPoolTopic = (subId) => {
    const name = (newPoolTopics[subId] || '').trim();
    if (!name) return;
    setTopicPool(prev => prev.map(s => s.id === subId
      ? { ...s, topics: [...s.topics, { id: uid(), name, done: false }] } : s));
    setNewPoolTopics(p => ({ ...p, [subId]: '' }));
  };

  const addBulkPoolTopics = (subId) => {
    const text = (bulkTopicInput[subId] || '').trim();
    if (!text) return;
    const names = text.split('\n').map(l => l.trim()).filter(Boolean);
    setTopicPool(prev => prev.map(s => {
      if (s.id !== subId) return s;
      const existingNames = new Set(s.topics.map(t => t.name));
      const newTopics = names.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false }));
      return { ...s, topics: [...s.topics, ...newTopics] };
    }));
    setBulkTopicInput(p => ({ ...p, [subId]: '' }));
    setShowBulkInput(p => ({ ...p, [subId]: false }));
  };

  const removePoolTopic = (subId, topicId) => {
    setTopicPool(prev => prev.map(s => s.id === subId
      ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s));
  };

  const togglePoolTopic = (subId, topicId) => {
    setTopicPool(prev => prev.map(s => s.id === subId
      ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, done: !t.done } : t) } : s));
  };

  const loadTemplate = (tplKey) => {
    const subjects = TOPIC_TEMPLATES[tplKey];
    if (!subjects) return;
    setTopicPool(prev => {
      const next = [...prev];
      subjects.forEach(tplSub => {
        const existing = next.find(s => s.name.toLowerCase() === tplSub.name.toLowerCase());
        if (existing) {
          const existingNames = new Set(existing.topics.map(t => t.name));
          existing.topics = [...existing.topics, ...tplSub.topics.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false }))];
        } else {
          next.push({ id: uid(), name: tplSub.name, color: tplSub.color, topics: tplSub.topics.map(n => ({ id: uid(), name: n, done: false })) });
        }
      });
      return next;
    });
  };

  /* ─── Profile yükle ─── */
  useEffect(() => {
    if (!existingProfile || Object.keys(existingProfile).length === 0) return;
    setGoals(p => ({
      ...p,
      ...(existingProfile.goals || {}),
      examGoalType: existingProfile.examGoalType || existingProfile.goals?.examGoalType || p.examGoalType,
      customExamName: existingProfile.customExamName || existingProfile.goals?.customExamName || p.customExamName,
      targetSchool: existingProfile.targetSchool || existingProfile.goals?.targetSchool || p.targetSchool,
      targetScore:  existingProfile.targetScore  || existingProfile.goals?.targetScore  || p.targetScore,
      targetNet:    String(existingProfile.targetNet ?? existingProfile.goals?.targetNet ?? p.targetNet),
      monthlyGoals: existingProfile.monthlyGoals || existingProfile.goals?.monthlyGoals || p.monthlyGoals,
      weeklyGoals:  existingProfile.weeklyGoals  || existingProfile.goals?.weeklyGoals  || p.weeklyGoals,
      dailyGoals:   existingProfile.dailyGoals   || existingProfile.goals?.dailyGoals   || p.dailyGoals,
    }));
    if (existingProfile.weeklyProgram) {
      setWeeklyProgram(processWeeklyProgramWeekChange(existingProfile.weeklyProgram, existingProfile.weeklyProgramWeekKey));
    }
    if (existingProfile.dailyLogs) setDailyLogs(existingProfile.dailyLogs);
    if (existingProfile.topicList) setTopicList(existingProfile.topicList);
    if (existingProfile.questionTrack) setQuestionTrack(p => ({ ...p, ...existingProfile.questionTrack }));
    if (existingProfile.errors) setErrors(existingProfile.errors);
    if (existingProfile.motivation) setMotivation(p => ({ ...p, ...existingProfile.motivation }));
    if (existingProfile.habits) setHabits(existingProfile.habits);
    if (existingProfile.topicPool) setTopicPool(existingProfile.topicPool);
  }, [existingProfile.studentId]);

  /* ─── Deneme sonuçları (otomatik + manuel kombine) ─── */
  const mySubmissions = useMemo(() => submissions.filter(s => String(s.studentId) === String(studentId)), [submissions, studentId]);
  const studentMockExams = useMemo(() => getMockExamsForStudent(studentId) || [], [getMockExamsForStudent, studentId]);

  const updateSubjectScore = (subjectName, field, value) => {
    setNewManualMock(prev => {
      const currentSub = prev.subjects[subjectName] || { d: '', y: '', b: '', net: '' };
      const updatedSub = { ...currentSub, [field]: value };

      if (field === 'd' || field === 'y') {
        const d = parseFloat(field === 'd' ? value : updatedSub.d) || 0;
        const y = parseFloat(field === 'y' ? value : updatedSub.y) || 0;
        updatedSub.net = Math.max(0, d - (y / 4)).toFixed(2);
      }

      return {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subjectName]: updatedSub
        }
      };
    });
  };

  const addSubjectToMock = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (newManualMock.subjects[trimmed]) return; // zaten var
    setNewManualMock(prev => ({
      ...prev,
      subjects: { ...prev.subjects, [trimmed]: { d: '', y: '', b: '', net: '' } }
    }));
    setNewSubjectName('');
  };

  const removeSubjectFromMock = (subjectName) => {
    setNewManualMock(prev => {
      const updated = { ...prev.subjects };
      delete updated[subjectName];
      return { ...prev, subjects: updated };
    });
  };

  const totalMockD = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.d) || 0), 0);
  const totalMockY = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.y) || 0), 0);
  const totalMockB = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.b) || 0), 0);
  const totalMockNet = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.net) || 0), 0);

  const handleSaveManualMock = async (e) => {
    e.preventDefault();
    if (!newManualMock.title.trim()) return;

    const formattedScores = {};
    Object.entries(newManualMock.subjects).forEach(([subName, val]) => {
      formattedScores[subName] = {
        correct: parseFloat(val.d) || 0,
        wrong: parseFloat(val.y) || 0,
        empty: parseFloat(val.b) || 0,
        net: parseFloat(val.net) || 0
      };
    });

    await addMockExam({
      studentId,
      studentName: currentUser.name,
      title: newManualMock.title.trim(),
      date: newManualMock.date || today(),
      scores: formattedScores,
      totalCorrect: totalMockD,
      totalWrong: totalMockY,
      totalEmpty: totalMockB,
      totalNet: totalMockNet.toFixed(2),
      isManual: true,
      createdBy: 'student',
      approvalStatus: 'pending'
    });

    setShowMockModal(false);
    setNewManualMock({
      title: '', date: today(),
      subjects: {
        'Türkçe': { d: '', y: '', b: '', net: '' },
        'Matematik': { d: '', y: '', b: '', net: '' },
        'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
        'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
        'İngilizce': { d: '', y: '', b: '', net: '' },
      }
    });
  };

  const { generalTrialExams, otherHomeworkSubmissions } = useMemo(() => {
    const normalizeSub = (s, parentHw, defaultType = 'online') => {
      const title = s.title || s.testTitle || parentHw?.title || 'Sınav / Test';
      const isTrial = s.isDeneme || s.isExam || parentHw?.isDeneme || /deneme|lgs|yks|tyt|ayt|bursluluk|kurumsal/i.test(title);

      let correct = s.correctCount ?? s.correct ?? s.totalCorrect ?? 0;
      let wrong = s.wrongCount ?? s.wrong ?? s.totalWrong ?? 0;
      let empty = s.emptyCount ?? s.empty ?? s.totalEmpty ?? 0;

      // Extract from answers array if available
      if (!correct && !wrong && !empty && Array.isArray(s.answers) && s.answers.length > 0) {
        correct = s.answers.filter(a => a.isCorrect === true || a.earnedPoints > 0).length;
        wrong = s.answers.filter(a => a.isCorrect === false).length;
        empty = Math.max(0, s.answers.length - (correct + wrong));
      }

      // Total questions
      const totalQ = parentHw?.totalQuestions || parentHw?.questionCount || s.totalQuestions || (correct + wrong + empty) || 10;

      // Deduce D/Y/B if score was stored as 0-100 percentage or points without D/Y/B
      if (!correct && !wrong && s.score !== undefined && s.score !== null) {
        const numScore = parseFloat(s.score) || 0;
        if (numScore <= totalQ && numScore > 0) {
          correct = Math.round(numScore);
        } else if (numScore > 0) {
          correct = Math.round((numScore / 100) * totalQ);
        }
        empty = Math.max(0, totalQ - (correct + wrong));
      }

      // Net calculation (NEVER use raw score > totalQ as net!)
      let net = 0;
      if (s.net !== undefined && s.net !== null) {
        net = parseFloat(s.net);
      } else if (s.totalNet !== undefined && s.totalNet !== null) {
        net = parseFloat(s.totalNet);
      } else if (correct > 0 || wrong > 0) {
        net = Math.max(0, correct - (wrong / 4));
      } else if (s.score !== undefined && parseFloat(s.score) <= totalQ) {
        net = parseFloat(s.score);
      }

      return {
        id: s.id || `sub_${Date.now()}_${Math.random()}`,
        title,
        date: s.submittedAt?.slice(0, 10) || s.createdAt?.slice(0, 10) || today(),
        totalNet: parseFloat(net.toFixed(2)),
        correctCount: correct,
        wrongCount: wrong,
        emptyCount: empty,
        sourceType: defaultType,
        approvalStatus: 'approved',
        isTrial
      };
    };

    // 1. EvaluationContext Online Sınavlar
    const onlineEval = mySubmissions.map(s => {
      const parentHw = (homeworks || []).find(h => String(h.id) === String(s.testId));
      return normalizeSub(s, parentHw, 'online');
    });

    // 2. HomeworkContext Optik / Ödev Sınavları
    const hwSubmissions = [];
    (homeworks || []).forEach(hw => {
      if (hw.submissions && Array.isArray(hw.submissions)) {
        hw.submissions.forEach(sub => {
          if (String(sub.studentId) === String(studentId)) {
            hwSubmissions.push(normalizeSub(sub, hw, 'optik'));
          }
        });
      }
    });

    // 3. Fiziki Deneme Modülü Sınavları (Her zaman Deneme Sınavıdır)
    const manualExams = studentMockExams.map(m => ({
      id: m.id,
      title: m.title || 'Fiziki Deneme Sınavı',
      date: m.date || m.createdAt?.slice(0, 10) || today(),
      totalNet: parseFloat(m.totalNet) || 0,
      sourceType: 'manual',
      approvalStatus: m.approvalStatus || (m.createdBy === 'student' ? 'pending' : 'approved'),
      scores: m.scores,
      totalCorrect: m.totalCorrect,
      totalWrong: m.totalWrong,
      totalEmpty: m.totalEmpty,
      isTrial: true
    }));

    const seen = new Set();
    const all = [];
    [...manualExams, ...onlineEval, ...hwSubmissions].forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    });

    const trials = all.filter(x => x.isTrial).sort((a, b) => new Date(b.date) - new Date(a.date));
    const homeworksOnly = all.filter(x => !x.isTrial).sort((a, b) => new Date(b.date) - new Date(a.date));

    return { generalTrialExams: trials, otherHomeworkSubmissions: homeworksOnly };
  }, [mySubmissions, homeworks, studentMockExams, studentId]);

  const pendingExams = useMemo(() => {
    return studentMockExams.filter(m => m.approvalStatus === 'pending' || (m.createdBy === 'student' && m.approvalStatus !== 'approved'));
  }, [studentMockExams]);

  /* ─── Kaydet ─── */
  const handleSave = useCallback(async () => {
    await saveCoachingProfile({
      ...existingProfile,
      studentId,
      weeklyProgramWeekKey: getCurrentWeekKey(),
      // /goals & koçluk sayfasıyla senkron
      examGoalType: goals.examGoalType,
      customExamName: goals.customExamName,
      targetSchool: goals.targetSchool,
      targetScore:  goals.targetScore,
      targetNet:    Number(goals.targetNet) || 0,
      monthlyGoals: goals.monthlyGoals,
      weeklyGoals:  goals.weeklyGoals,
      dailyGoals:   goals.dailyGoals,
      goals, weeklyProgram, dailyLogs, topicList, questionTrack, errors, motivation, habits, topicPool
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [goals, weeklyProgram, dailyLogs, topicList, questionTrack, errors, motivation, habits, topicPool]);

  /* ─── Multi-Item Weekly Program Handlers ─── */
  const addWeeklyItem = (dayName) => {
    const input = newScheduleInputs[dayName] || { subject: poolSubjectNames[0] || SUBJECTS[0], topic: '', hours: '', isRecurring: true };
    if (!input.subject && !input.topic) return;

    // '__custom__' seçildiyse _customTopic'i kullan
    const resolvedTopic = input.topic === '__custom__'
      ? (input._customTopic || '').trim()
      : (input.topic || '');

    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: [
              ...(d.items || []),
              {
                id: uid(),
                subject: input.subject || 'Ders',
                topic: resolvedTopic,
                hours: input.hours || '',
                isRecurring: input.isRecurring !== false,
                done: false
              }
            ]
          };
        }
        return d;
      });
    });

    const defaultSubject = poolSubjectNames[0] || SUBJECTS[0];
    setNewScheduleInputs(p => ({
      ...p,
      [dayName]: { subject: defaultSubject, topic: '', hours: '', isRecurring: true }
    }));
  };


  const toggleWeeklyItem = (dayName, itemId) => {
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: (d.items || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
          };
        }
        return d;
      });
    });
  };

  const toggleRecurringItem = (dayName, itemId) => {
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: (d.items || []).map(item => item.id === itemId ? { ...item, isRecurring: item.isRecurring === false ? true : false } : item)
          };
        }
        return d;
      });
    });
  };

  const deleteWeeklyItem = (dayName, itemId) => {
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: (d.items || []).filter(item => item.id !== itemId)
          };
        }
        return d;
      });
    });
  };

  /* ─── Hesaplamalar ─── */
  const totalDailyQuestions = dailyLogs.reduce((s, l) => s + (parseFloat(l.questions) || 0), 0);
  const totalDailyHours = dailyLogs.reduce((s, l) => s + (parseFloat(l.studyHours) || 0), 0);
  const completedMonthly = (goals.monthlyGoals || []).filter(g => g.done).length;
  const completedDaily = (goals.dailyGoals || []).filter(g => g.done).length;
  const completedTopics = topicList.filter(t => t.status === 'Tamamlandı').length;
  const habitScore = habits.reduce((s, h) => s + Object.values(h.days).filter(Boolean).length, 0);
  const maxHabitScore = habits.length * 7;

  const totalWeeklyItems = weeklyProgram.reduce((s, d) => s + (d.items?.length || 0), 0);
  const completedWeeklyItems = weeklyProgram.reduce((s, d) => s + (d.items?.filter(i => i.done).length || 0), 0);

  const TABS = [
    { id: 'ozet', label: '🏠 Özetim' },
    { id: 'hedefler', label: '🎯 Hedeflerim' },
    { id: 'konuhavuzu', label: '📚 Konu Havuzum' },
    { id: 'program', label: '📅 Programım' },
    { id: 'calisma', label: '⏱️ Çalışmalarım' },
    { id: 'konular', label: '📋 Konularım' },
    { id: 'hatalar', label: '🔴 Hata Defterim' },
    { id: 'motivasyon', label: '⭐ Motivasyon' },
    { id: 'aliskanlik', label: '🔥 Alışkanlıklarım' },
    { id: 'denemeler', label: '📊 Deneme Sonuçlarım' },
    { id: 'testlerim', label: '📝 Testlerim' },
  ];

  // Konu havuzundan ders ve konu listeleri
  const poolSubjectNames = topicPool.map(s => s.name);
  const getPoolTopicsForSubject = (subjectName) => {
    const found = topicPool.find(s => s.name === subjectName);
    return found ? found.topics.map(t => t.name) : [];
  };

  /* ─── KOÇ ÖĞRETMENİ OLMAYAN ÖĞRENCİ KONTROLÜ ─── */
  if (currentUser?.role === 'student' && !isCoached) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 480, width: '100%', background: 'white', borderRadius: '1.5rem', border: '2px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '2px solid #fde68a' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.65rem' }}>Koç Öğretmeni Tanımlanmadı</h2>
          <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: '1.75rem', fontWeight: 600 }}>
            Henüz bir koç öğretmeniniz tanımlanmamıştır. Kişisel çalışma programı ve koçluk takibi için lütfen rehber öğretmeninizle / koçunuzla iletişime geçin.
          </p>
          <button onClick={() => navigate('/student')} style={{ padding: '0.75rem 1.6rem', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            Öğrenci Paneline Dön
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 700 }}>Giriş yapmanız gerekiyor.</p>
        <button onClick={() => navigate('/login')} style={{ marginTop: 12, padding: '0.6rem 1.4rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Giriş Yap</button>
      </div>
    );
  }

  const isStandardExam = ['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS', 'Ara Sınıf Takip & Takdir Hedefi'].includes(goals.examGoalType);
  const isGradeTracking = goals.examGoalType === 'Ara Sınıf Takip & Takdir Hedefi';
  const displayExamName = isStandardExam ? goals.examGoalType : (goals.customExamName || goals.examGoalType || 'Özel Sınav');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 40%,#fdf2f8 100%)', padding: 'clamp(0.75rem,3vw,1.75rem)', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9,#5b21b6)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
            {currentUser.name?.charAt(0)?.toUpperCase() || '👤'}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Merhaba, {currentUser.name?.split(' ')[0]} 👋</div>
            <div style={{ fontSize: '0.77rem', opacity: 0.8, fontWeight: 700 }}>📂 Kişisel Koçluk & Gelişim Takip Dosyam</div>
          </div>
        </div>

        {/* Mini istatistikler */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Çözülen Soru', value: Math.round(totalDailyQuestions), icon: '📝' },
            { label: 'Çalışma (s)', value: totalDailyHours.toFixed(1), icon: '⏱️' },
            { label: 'Konu Bitti', value: completedTopics, icon: '✅' },
            { label: 'Deneme', value: mySubmissions.length, icon: '📊' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem', padding: '0.5rem 0.85rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', minWidth: 70 }}>
              <div style={{ fontSize: '1rem', marginBottom: 1 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: 700, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button onClick={handleSave} style={{ background: saved ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '0.85rem', padding: '0.55rem 1.1rem', color: 'white', fontWeight: 900, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}>
          {saved ? <><CheckCircle2 size={16} /> Kaydedildi!</> : <><Save size={16} /> Kaydet</>}
        </button>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ background: 'white', borderRadius: '1rem 1rem 0 0', border: '2px solid #e2e8f0', borderBottom: 'none', display: 'flex', overflowX: 'auto', padding: '0.4rem 0.4rem 0', gap: 3, boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}>
        {TABS.map(t => <TabBtn key={t.id} id={t.id} active={activeTab === t.id} label={t.label} onClick={setActiveTab} />)}
      </div>

      {/* ── CONTENT AREA ── */}
      <div style={{ background: 'white', borderRadius: '0 0 1.25rem 1.25rem', border: '2px solid #e2e8f0', borderTop: 'none', padding: '1.5rem', minHeight: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>

        {/* ═══ KONU HAVUZUM ═══ */}
        {activeTab === 'konuhavuzu' && (
          <div>
            <Tip>Tüm yıl boyunca çalışacağın dersleri ve konuları buraya gir. Haftalık program, konu takibi, hata defteri gibi tüm sekmeler bu listeyi kaynak olarak kullanır.</Tip>

            {/* Hazır Şablon Yükle */}
            {!showTemplates ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setShowTemplates(true)}
                  style={{ background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', padding: '0.4rem 0.8rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  ⚡ Hazır Şablon Yükle
                </button>
              </div>
            ) : (
              <Card emoji="⚡" title="Hazır Şablon ile Hızlı Başla">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(TOPIC_TEMPLATES).map(tplKey => (
                    <button key={tplKey} onClick={() => loadTemplate(tplKey)}
                      style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: '0.7rem', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Plus size={14} /> {tplKey}
                    </button>
                  ))}
                  {topicPool.length > 0 && (
                    <button onClick={() => { if (window.confirm('Tüm ders ve konuları silmek istediğine emin misin?')) setTopicPool([]); }}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '0.7rem', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                      🗑️ Tümünü Temizle
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  💡 Şablon yükle ve üzerinde istediğin değişikliği yap. Birden fazla şablonu birleştirebilirsin.
                </div>
                <button onClick={() => setShowTemplates(false)}
                  style={{ marginTop: 10, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                  Kapat
                </button>
              </Card>
            )}

            {/* Yeni Ders Ekle */}
            <Card emoji="➕" title="Yeni Ders Ekle">
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={lbl}>Ders Adı</label>
                  <input style={inp} value={newPoolSubject.name}
                    onChange={e => setNewPoolSubject(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPoolSubject()}
                    placeholder="Örn: Matematik, Fizik, Edebiyat..." />
                </div>
                <div style={{ minWidth: 80 }}>
                  <label style={lbl}>Renk</label>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                    {POOL_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewPoolSubject(p => ({ ...p, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newPoolSubject.color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer', transition: 'border 0.15s' }} />
                    ))}
                  </div>
                </div>
                <button onClick={addPoolSubject}
                  disabled={!newPoolSubject.name.trim()}
                  style={{ background: newPoolSubject.name.trim() ? '#059669' : '#e2e8f0', color: newPoolSubject.name.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.1rem', fontWeight: 800, fontSize: '0.84rem', cursor: newPoolSubject.name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={15} /> Ders Ekle
                </button>
              </div>
            </Card>

            {/* Ders kartları */}
            {topicPool.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontWeight: 700 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📚</div>
                <div>Henüz ders eklenmedi.</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Yukarıdan hazır şablon yükle veya ders ekle.</div>
              </div>
            )}

            {topicPool.map(sub => {
              const doneCnt = sub.topics.filter(t => t.done).length;
              const total = sub.topics.length;
              return (
                <div key={sub.id} style={{ background: 'white', border: `2px solid ${sub.color}30`, borderRadius: '1rem', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                  {/* Ders Başlık Barı */}
                  <div style={{ background: `linear-gradient(135deg, ${sub.color}18, ${sub.color}08)`, borderBottom: `2px solid ${sub.color}20`, padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: sub.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', flex: 1 }}>{sub.name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: sub.color, background: `${sub.color}15`, padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                      {doneCnt}/{total} konu {total > 0 ? `· ${Math.round(doneCnt/total*100)}%` : ''}
                    </span>
                    <button onClick={() => removePoolSubject(sub.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 6, display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* İlerleme Çubuğu */}
                  {total > 0 && (
                    <div style={{ height: 4, background: '#f1f5f9' }}>
                      <div style={{ height: 4, background: sub.color, width: `${doneCnt/total*100}%`, transition: 'width 0.4s ease', borderRadius: '0 2px 2px 0' }} />
                    </div>
                  )}

                  <div style={{ padding: '0.85rem 1.1rem' }}>
                    {/* Konu Listesi */}
                    {sub.topics.length === 0 && (
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, padding: '0.5rem 0', textAlign: 'center' }}>Henüz konu eklenmedi ↓</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: sub.topics.length ? 10 : 0 }}>
                      {sub.topics.map((t, idx) => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.42rem 0.7rem', background: t.done ? '#f0fdf4' : idx % 2 === 0 ? '#f8fafc' : 'white', borderRadius: '0.6rem', border: t.done ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                          <input type="checkbox" checked={t.done} onChange={() => togglePoolTopic(sub.id, t.id)}
                            style={{ width: 15, height: 15, accentColor: sub.color, cursor: 'pointer', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.84rem', color: t.done ? '#6b7280' : '#374151', textDecoration: t.done ? 'line-through' : 'none' }}>{t.name}</span>
                          {t.done && <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800 }}>✓ Bitti</span>}
                          <button onClick={() => removePoolTopic(sub.id, t.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2, display: 'flex' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Tek Konu Ekle */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        style={{ ...inp, flex: 1, fontSize: '0.82rem', padding: '0.38rem 0.65rem', borderColor: `${sub.color}40` }}
                        value={newPoolTopics[sub.id] || ''}
                        onChange={e => setNewPoolTopics(p => ({ ...p, [sub.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addPoolTopic(sub.id)}
                        placeholder="Konu adı ekle ve Enter'a bas..." />
                      <button onClick={() => addPoolTopic(sub.id)}
                        style={{ background: sub.color, color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.42rem 0.75rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <Plus size={13} /> Ekle
                      </button>
                      <button onClick={() => setShowBulkInput(p => ({ ...p, [sub.id]: !p[sub.id] }))}
                        style={{ background: showBulkInput[sub.id] ? `${sub.color}20` : '#f1f5f9', color: showBulkInput[sub.id] ? sub.color : '#64748b', border: `1.5px solid ${showBulkInput[sub.id] ? sub.color : '#e2e8f0'}`, borderRadius: '0.6rem', padding: '0.42rem 0.75rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        📋 Toplu
                      </button>
                    </div>

                    {/* Toplu Konu Ekle */}
                    {showBulkInput[sub.id] && (
                      <div style={{ marginTop: 8, background: '#f8fafc', border: `1.5px dashed ${sub.color}50`, borderRadius: '0.75rem', padding: '0.75rem' }}>
                        <label style={{ ...lbl, color: sub.color }}>📋 Her satıra bir konu yaz — hepsini bir anda ekle:</label>
                        <textarea
                          style={{ ...ta, borderColor: `${sub.color}40`, minHeight: 100, fontFamily: 'monospace', fontSize: '0.82rem' }}
                          value={bulkTopicInput[sub.id] || ''}
                          onChange={e => setBulkTopicInput(p => ({ ...p, [sub.id]: e.target.value }))}
                          placeholder={`Sayılar\nKesirler\nDenklemler\nOlasılık\n...`} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowBulkInput(p => ({ ...p, [sub.id]: false }))}
                            style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.55rem', padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>İptal</button>
                          <button onClick={() => addBulkPoolTopics(sub.id)}
                            style={{ background: sub.color, color: 'white', border: 'none', borderRadius: '0.55rem', padding: '0.4rem 1rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Plus size={13} /> Tümünü Ekle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Özet İstatistik */}
            {topicPool.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '2px solid #ddd6fe', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 900, color: '#4c1d95', fontSize: '0.9rem' }}>📊 Havuz Özeti</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#7c3aed' }}>{topicPool.length}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 700 }}>Ders</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#7c3aed' }}>{topicPool.reduce((s,sub) => s + sub.topics.length, 0)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 700 }}>Toplam Konu</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#10b981' }}>{topicPool.reduce((s,sub) => s + sub.topics.filter(t=>t.done).length, 0)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Tamamlanan</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#d97706' }}>
                      {topicPool.reduce((s,sub) => s + sub.topics.length, 0) > 0
                        ? Math.round(topicPool.reduce((s,sub) => s + sub.topics.filter(t=>t.done).length, 0) / topicPool.reduce((s,sub) => s + sub.topics.length, 0) * 100)
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>İlerleme</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ÖZET ═══ */}
        {activeTab === 'ozet' && (
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#7c3aed" /> Bugünkü Durumum
            </div>

            {/* Hedef kartı */}
            {(goals.targetSchool || goals.targetScore || displayExamName) && (
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '2px solid #ddd6fe', borderRadius: '1.1rem', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Trophy size={28} color="#7c3aed" />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#4c1d95' }}>Hedefim: {goals.targetSchool || '—'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700 }}>
                    {displayExamName} · Puan Hedefi: {goals.targetScore || '—'} · Net: {goals.targetNet || '—'}
                  </div>
                </div>
              </div>
            )}

            {/* İlerleme kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              {[
                { label: 'Aylık Hedefler', value: completedMonthly, max: (goals.monthlyGoals || []).length, color: '#2563eb', icon: '📅' },
                { label: 'Haftalık Program', value: completedWeeklyItems, max: totalWeeklyItems, color: '#059669', icon: '⚡' },
                { label: 'Günlük Rutinler', value: completedDaily, max: (goals.dailyGoals || []).length, color: '#dc2626', icon: '🔥' },
                { label: 'Konular Tamamlandı', value: completedTopics, max: topicList.length, color: '#7c3aed', icon: '✅' },
              ].map(item => (
                <div key={item.label} style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: '1.3rem', color: item.color }}>{item.value}<span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>/{item.max || '—'}</span></div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{item.label}</div>
                  {item.max > 0 && <Progress value={item.value} max={item.max} color={item.color} />}
                </div>
              ))}
            </div>

            {/* Son çalışma günlükleri */}
            {dailyLogs.length > 0 && (
              <Card emoji="⏱️" title="Son Çalışmalarım">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {dailyLogs.slice(0, 5).map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.85rem', background: '#f8fafc', borderRadius: '0.65rem', fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', fontWeight: 700, minWidth: 80 }}>{log.date}</span>
                      <span style={{ fontWeight: 900, color: '#4f46e5' }}>{log.studyHours}s</span>
                      <span style={{ color: '#374151', fontWeight: 700 }}>{log.questions} soru</span>
                      {log.sport && <span>🏃</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Son deneme */}
            {mySubmissions.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1.5px solid #bae6fd', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0c4a6e', marginBottom: 6 }}>📊 Son Deneme: {mySubmissions[0].testTitle || '—'}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: '#0891b2', color: 'white', fontWeight: 900, fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: 99 }}>Net: {mySubmissions[0].score ?? '—'}</span>
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.82rem' }}>✅ {mySubmissions[0].correctCount ?? '—'} D</span>
                  <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.82rem' }}>❌ {mySubmissions[0].wrongCount ?? '—'} Y</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ HEDEFLERİM ═══ */}
        {activeTab === 'hedefler' && (
          <div>
            <Tip>Hedeflerini belirle ve her gün üzerlerine tıklayarak tamamladıklarını işaretle. Bu sayfa koçunla senkronize çalışır.</Tip>

            {/* Uzun vadeli */}
            <Card emoji="🏛️" title="Uzun Vadeli Hedefim">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Hedef Sınav</label>
                  <select style={inp} value={isStandardExam ? goals.examGoalType : 'Özel Sınav'} onChange={e => {
                    const val = e.target.value;
                    if (val === 'Özel Sınav') {
                      setGoals(p => ({ ...p, examGoalType: 'Özel Sınav', customExamName: p.customExamName || '' }));
                    } else {
                      setGoals(p => ({ ...p, examGoalType: val }));
                    }
                  }}>
                    <option value="LGS 2026">LGS (Liselere Geçiş)</option>
                    <option value="YKS (TYT/AYT) 2026">YKS (TYT / AYT)</option>
                    <option value="KPSS">KPSS</option>
                    <option value="Ara Sınıf Takip & Takdir Hedefi">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                    <option value="Özel Sınav">✏️ Özel Sınav (DGS, ALES, BİLSEM...)</option>
                  </select>
                </div>

                {(!isStandardExam || goals.examGoalType === 'Özel Sınav') && (
                  <div>
                    <label style={lbl}>Özel Sınav Adı</label>
                    <input style={{ ...inp, borderColor: '#7c3aed', background: '#faf5ff' }}
                      value={goals.customExamName || (goals.examGoalType !== 'Özel Sınav' ? goals.examGoalType : '')}
                      onChange={e => {
                        const val = e.target.value;
                        setGoals(p => ({ ...p, customExamName: val, examGoalType: val || 'Özel Sınav' }));
                      }}
                      placeholder="Örn: DGS, BİLSEM, ALES, YÖSDİL, TUS..." />
                  </div>
                )}

                {/* Ara Sınıf Takip Alanları */}
                {isGradeTracking ? (
                  <>
                    <div>
                      <label style={lbl}>Sınıf / Seviye</label>
                      <select style={inp} value={goals.gradeClass} onChange={e => setGoals(p => ({ ...p, gradeClass: e.target.value }))}>
                        <option value="">— Seçin —</option>
                        {['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Dönem</label>
                      <select style={inp} value={goals.gradeTerm} onChange={e => setGoals(p => ({ ...p, gradeTerm: e.target.value }))}>
                        <option value="1">1. Dönem</option>
                        <option value="2">2. Dönem</option>
                        <option value="yıllık">Yıllık</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Hedef Belgem</label>
                      <select style={{ ...inp, fontWeight: 800 }} value={goals.gradeTarget} onChange={e => setGoals(p => ({ ...p, gradeTarget: e.target.value }))}>
                        <option value="Takçek">🟢 Takçek (Temel)</option>
                        <option value="Teşekkür">🧡 Teşekkür (70–84)</option>
                        <option value="Takdir">🏅 Takdir (85+)</option>
                        <option value="Onur">⭐ Onur Belgesi (Tüm dersler Takdir)</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Devamsızlık Hedefi</label>
                      <input style={inp} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Maks. devamsızlık (gün)" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={lbl}>Hedef Okul / Bölüm</label>
                      <input style={inp} value={goals.targetSchool} onChange={e => setGoals(p => ({ ...p, targetSchool: e.target.value }))} placeholder="Örn: Kabataş Lisesi" />
                    </div>
                    <div>
                      <label style={lbl}>Puan Hedefim</label>
                      <input style={inp} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Örn: 485" />
                    </div>
                    <div>
                      <label style={lbl}>Net Hedefim</label>
                      <input style={inp} value={goals.targetNet} onChange={e => setGoals(p => ({ ...p, targetNet: e.target.value }))} placeholder="Örn: 90" />
                    </div>
                  </>
                )}
              </div>

              {/* Ara Sınıf Hedef Özet Kartı */}
              {isGradeTracking && (goals.gradeClass || goals.gradeTarget) && (
                <div style={{ marginTop: '1rem', background: 'linear-gradient(135deg,#fef3c7,#fde68a20)', border: '2px solid #fde68a', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {goals.gradeTarget === 'Onur' ? '⭐' : goals.gradeTarget === 'Takdir' ? '🏅' : goals.gradeTarget === 'Teşekkür' ? '🧡' : '🟢'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#92400e' }}>
                      {goals.gradeClass || '?. Sınıf'} · {goals.gradeTerm === 'yıllık' ? 'Yıllık' : `${goals.gradeTerm}. Dönem`} · Hedef: {goals.gradeTarget}
                    </div>
                    <div style={{ fontSize: '0.77rem', color: '#b45309', fontWeight: 700 }}>
                      {goals.gradeTarget === 'Takdir' ? 'Tüm derslerden 85 ve üzeri alman gerekiyor 💪' :
                       goals.gradeTarget === 'Teşekkür' ? 'Tüm derslerden 70 ve üzeri alman gerekiyor 💪' :
                       goals.gradeTarget === 'Onur' ? 'Tüm derslerden Takdir belgesi alman gerekiyor 🌟' :
                       'Devamsızlık ve ödevlere dikkat! 📚'}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Aylık */}
            <Card emoji="📅" title={`Aylık Hedeflerim (${(goals.monthlyGoals||[]).filter(g=>g.done).length}/${(goals.monthlyGoals||[]).length} tamamlandı)`}>
              {(goals.monthlyGoals || []).length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.83rem', fontWeight: 700, textAlign: 'center', padding: '1rem' }}>Henüz aylık hedef yok. Aşağıdan ekle 👇</div>}
              {(goals.monthlyGoals || []).map(g => (
                <CheckItem key={g.id} label={g.text} checked={g.done}
                  onChange={() => setGoals(p => ({ ...p, monthlyGoals: p.monthlyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                  onDelete={() => setGoals(p => ({ ...p, monthlyGoals: p.monthlyGoals.filter(x => x.id !== g.id) }))} />
              ))}
              {(goals.monthlyGoals||[]).length > 0 && <Progress value={(goals.monthlyGoals||[]).filter(g=>g.done).length} max={(goals.monthlyGoals||[]).length} color="#2563eb" label="Bu ayın ilerlemesi" />}
              <AddInput value={newMonthly} onChange={setNewMonthly} placeholder="Yeni aylık hedef ekle..." color="#2563eb"
                onAdd={() => { if (newMonthly.trim()) { setGoals(p => ({ ...p, monthlyGoals: [...(p.monthlyGoals||[]), { id: uid(), text: newMonthly.trim(), done: false }] })); setNewMonthly(''); }}} />
            </Card>

            {/* Haftalık */}
            <Card emoji="⚡" title={`Haftalık Hedeflerim (${(goals.weeklyGoals||[]).filter(g=>g.done).length}/${(goals.weeklyGoals||[]).length})`}>
              {(goals.weeklyGoals || []).map(g => (
                <CheckItem key={g.id} label={g.text} checked={g.done}
                  onChange={() => setGoals(p => ({ ...p, weeklyGoals: p.weeklyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                  onDelete={() => setGoals(p => ({ ...p, weeklyGoals: p.weeklyGoals.filter(x => x.id !== g.id) }))} />
              ))}
              <AddInput value={newWeekly} onChange={setNewWeekly} placeholder="Yeni haftalık hedef..." color="#7c3aed"
                onAdd={() => { if (newWeekly.trim()) { setGoals(p => ({ ...p, weeklyGoals: [...(p.weeklyGoals||[]), { id: uid(), text: newWeekly.trim(), done: false }] })); setNewWeekly(''); }}} />
            </Card>

            {/* Günlük */}
            <Card emoji="🌅" title={`Günlük Rutinlerim (${(goals.dailyGoals||[]).filter(g=>g.done).length}/${(goals.dailyGoals||[]).length} bugün)`}>
              {(goals.dailyGoals || []).map(g => (
                <CheckItem key={g.id} label={g.text} checked={g.done}
                  onChange={() => setGoals(p => ({ ...p, dailyGoals: p.dailyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                  onDelete={() => setGoals(p => ({ ...p, dailyGoals: p.dailyGoals.filter(x => x.id !== g.id) }))} />
              ))}
              {(goals.dailyGoals||[]).length > 0 && <Progress value={(goals.dailyGoals||[]).filter(g=>g.done).length} max={(goals.dailyGoals||[]).length} color="#dc2626" label="Bugünün tamamlanması" />}
              <AddInput value={newDaily} onChange={setNewDaily} placeholder="Yeni günlük rutin..." color="#dc2626"
                onAdd={() => { if (newDaily.trim()) { setGoals(p => ({ ...p, dailyGoals: [...(p.dailyGoals||[]), { id: uid(), text: newDaily.trim(), done: false }] })); setNewDaily(''); }}} />
            </Card>
          </div>
        )}

        {/* ═══ PROGRAMIM (Kullanışlı Çoklu Ders/Etkinlik Ekleme) ═══ */}
        {activeTab === 'program' && (
          <div>
            <Tip>Haftanın her gününe dilediğin kadar ders, konu ve saat dilimi ekleyebilirsin! Tamamladıkça ✓ işaretle.</Tip>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.85rem 1.1rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>Haftalık İlerleme</span>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{completedWeeklyItems} / {totalWeeklyItems} Ders/Etkinlik Tamamlandı</div>
              </div>
              <div style={{ minWidth: 140 }}>
                <Progress value={completedWeeklyItems} max={totalWeeklyItems || 1} color="#059669" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.1rem' }}>
              {DAYS.map(dayName => {
                const dayData = weeklyProgram.find(w => w.day === dayName) || { day: dayName, items: [] };
                const items = dayData.items || [];
                const completedCount = items.filter(i => i.done).length;
                const input = newScheduleInputs[dayName] || { subject: SUBJECTS[0], topic: '', hours: '' };

                return (
                  <div key={dayName} style={{ background: 'white', borderRadius: '1.1rem', border: '2px solid #f1f5f9', padding: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Day Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', paddingBottom: '0.6rem', borderBottom: '2px solid #f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: '#7c3aed', color: 'white', fontWeight: 900, fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '0.5rem' }}>{dayName}</span>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>{DAY_LONG[dayName]}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, background: completedCount === items.length && items.length > 0 ? '#dcfce7' : '#f1f5f9', color: completedCount === items.length && items.length > 0 ? '#15803d' : '#64748b', padding: '0.25rem 0.6rem', borderRadius: 99 }}>
                        {completedCount}/{items.length} Tamamlandı
                      </span>
                    </div>

                    {/* Schedule items for this day */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, marginBottom: '0.85rem' }}>
                      {items.length === 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0', fontStyle: 'italic', background: '#fafafa', borderRadius: '0.75rem', border: '1px dashed #e2e8f0' }}>
                          Henüz bu güne ders eklenmedi. Aşağıdan ekleyin 👇
                        </div>
                      )}
                      {items.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.6rem 0.75rem', background: item.done ? '#f0fdf4' : '#f8fafc', border: item.done ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '0.75rem', transition: 'all 0.15s' }}>
                          <button type="button" onClick={() => toggleWeeklyItem(dayName, item.id)} style={{ width: 24, height: 24, borderRadius: 6, background: item.done ? '#16a34a' : 'white', border: item.done ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            {item.done && <Check size={15} color="white" strokeWidth={3} />}
                          </button>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: item.done ? '#15803d' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none' }}>
                                {item.subject}
                              </span>
                              {item.hours && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#f3e8ff', color: '#6b21a8', padding: '0.1rem 0.45rem', borderRadius: 4 }}>
                                  ⏱️ {item.hours}
                                </span>
                              )}
                              <button type="button" onClick={() => toggleRecurringItem(dayName, item.id)} title={item.isRecurring !== false ? "Tıkla: Tek Seferlik Yap" : "Tıkla: Her Hafta Tekrarlı Yap"} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                                {item.isRecurring !== false ? (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#e0e7ff', color: '#3730a3', padding: '0.1rem 0.45rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                    🔁 Her Hafta
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.45rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                    📌 Tek Seferlik
                                  </span>
                                )}
                              </button>
                            </div>
                            {item.topic && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: 2, textDecoration: item.done ? 'line-through' : 'none' }}>
                                {item.topic}
                              </div>
                            )}
                          </div>

                          <button type="button" onClick={() => deleteWeeklyItem(dayName, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Add Form for this day */}
                    <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.75rem', marginTop: 'auto' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' }}>
                        ➕ {dayName} Gününe Ders Ekle
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                        <select style={{ ...inp, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                          value={input.subject}
                          onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], subject: e.target.value, topic: '' } }))}>
                          {(poolSubjectNames.length > 0 ? poolSubjectNames : SUBJECTS).map(s => <option key={s}>{s}</option>)}
                        </select>
                        <input style={{ ...inp, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                          value={input.hours}
                          onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], hours: e.target.value } }))}
                          placeholder="Saat / Süre (Örn: 16:00)" />
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        {getPoolTopicsForSubject(input.subject).length > 0 ? (
                          <select
                            style={{ ...inp, flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                            value={input.topic}
                            onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], topic: e.target.value === '__custom__' ? '' : e.target.value, _customTopic: e.target.value === '__custom__' ? (p[dayName]?._customTopic || '') : undefined } }))}>
                            <option value="">— Konu seç —</option>
                            {getPoolTopicsForSubject(input.subject).map(t => <option key={t}>{t}</option>)}
                            <option value="__custom__">✏️ Özel yaz...</option>
                          </select>
                        ) : (
                          <input style={{ ...inp, flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                            value={input.topic}
                            onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], topic: e.target.value } }))}
                            placeholder="Konu / Detay (Örn: 50 Soru çözümü)" />
                        )}
                        <button type="button" onClick={() => addWeeklyItem(dayName)} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.4rem 0.75rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Plus size={14} /> Ekle
                        </button>
                      </div>
                      {input.topic === '__custom__' && (
                        <input style={{ ...inp, width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.78rem', marginBottom: 6 }}
                          value={input._customTopic || ''}
                          onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], _customTopic: e.target.value } }))}
                          placeholder="Özel konu / detay yaz..." />
                      )}
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                        <input type="checkbox"
                          checked={input.isRecurring !== false}
                          onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], isRecurring: e.target.checked } }))} />
                        🔁 Her Hafta Tekrar Et
                      </label>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Soru hedefi */}
            <div style={{ marginTop: '1.25rem' }}>
              <Card emoji="❓" title="Günlük Soru Takibim">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={lbl}>Günlük Hedef (Soru)</label>
                    <input style={inp} type="number" value={questionTrack.dailyGoal} onChange={e => setQuestionTrack(p => ({ ...p, dailyGoal: e.target.value }))} placeholder="Örn: 100" />
                  </div>
                  <div>
                    <label style={lbl}>Bugün Çözdüm</label>
                    <input style={inp} type="number" value={questionTrack.solved} onChange={e => setQuestionTrack(p => ({ ...p, solved: e.target.value }))} placeholder="Kaç soru?" />
                  </div>
                </div>
                {questionTrack.dailyGoal && questionTrack.solved && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <Progress value={parseFloat(questionTrack.solved)||0} max={parseFloat(questionTrack.dailyGoal)||1} color="#7c3aed" label={`${Math.min(100,Math.round(((parseFloat(questionTrack.solved)||0)/(parseFloat(questionTrack.dailyGoal)||1))*100))}% tamamlandı`} />
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ═══ ÇALIŞMALARIM ═══ */}
        {activeTab === 'calisma' && (
          <div>
            <Tip>Her gün ne kadar çalıştığını kaydet. Koçun bu bilgileri görür.</Tip>

            {/* Yeni kayıt */}
            <Card emoji="➕" title="Bugünkü Çalışmamı Kaydet">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.75rem' }}>
                <div><label style={lbl}>Tarih</label><input style={inp} type="date" value={newLog.date} onChange={e => setNewLog(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label style={lbl}>Çalışma Süresi (saat)</label><input style={inp} type="number" step="0.5" value={newLog.studyHours} onChange={e => setNewLog(p => ({ ...p, studyHours: e.target.value }))} placeholder="3.5" /></div>
                <div><label style={lbl}>Çözülen Soru</label><input style={inp} type="number" value={newLog.questions} onChange={e => setNewLog(p => ({ ...p, questions: e.target.value }))} placeholder="120" /></div>
                <div><label style={lbl}>Tekrar / Konu</label><input style={inp} value={newLog.revision} onChange={e => setNewLog(p => ({ ...p, revision: e.target.value }))} placeholder="Ders/konu" /></div>
                <div><label style={lbl}>Uyku Saati</label><input style={inp} value={newLog.sleepTime} onChange={e => setNewLog(p => ({ ...p, sleepTime: e.target.value }))} placeholder="23:00" /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#374151' }}>
                  <input type="checkbox" checked={newLog.sport} onChange={e => setNewLog(p => ({ ...p, sport: e.target.checked }))} /> 🏃 Spor Yaptım
                </label>
                <button onClick={() => {
                  if (!newLog.date) return;
                  setDailyLogs(p => [{ id: uid(), ...newLog }, ...p]);
                  setNewLog({ date: today(), studyHours: '', questions: '', revision: '', sport: false, sleepTime: '' });
                }} style={{ marginLeft: 'auto', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.55rem 1.1rem', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={14} /> Kaydet
                </button>
              </div>
            </Card>

            {/* Geçmiş */}
            {dailyLogs.length > 0 && (
              <Card emoji="📋" title="Çalışma Geçmişim">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {dailyLogs.map(log => (
                    <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '85px 55px 65px 1fr 35px', alignItems: 'center', gap: 6, padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '0.65rem', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>{log.date}</span>
                      <span style={{ fontWeight: 900, color: '#7c3aed' }}>{log.studyHours}s</span>
                      <span style={{ fontWeight: 800, color: '#4f46e5' }}>{log.questions} soru</span>
                      <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.revision} {log.sport ? '🏃' : ''}</span>
                      <button onClick={() => setDailyLogs(p => p.filter(x => x.id !== log.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0' }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: 16, padding: '0.75rem', background: '#f0f4ff', borderRadius: '0.75rem', border: '1px solid #c7d2fe' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 900, color: '#4f46e5', fontSize: '1.1rem' }}>{totalDailyHours.toFixed(1)}s</div><div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Toplam Çalışma</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 900, color: '#7c3aed', fontSize: '1.1rem' }}>{Math.round(totalDailyQuestions)}</div><div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Toplam Soru</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>{dailyLogs.filter(l => l.sport).length}</div><div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Spor Günü</div></div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ KONULARIM ═══ */}
        {activeTab === 'konular' && (
          <div>
            <Tip>Çalıştığın konuları ekle ve durumunu güncelle. "Tamamlandı" olarak işaretlediğin konular yeşile döner.</Tip>

            <Card emoji="➕" title="Konu Ekle">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
                <div><label style={lbl}>Ders</label>
                  <select style={inp} value={newTopic.subject} onChange={e => setNewTopic(p => ({ ...p, subject: e.target.value, topic: '' }))}>
                    {(poolSubjectNames.length > 0 ? poolSubjectNames : SUBJECTS).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Konu Adı</label>
                  {getPoolTopicsForSubject(newTopic.subject).length > 0 ? (
                    <select style={inp} value={newTopic.topic} onChange={e => setNewTopic(p => ({ ...p, topic: e.target.value }))}>
                      <option value="">— Konu seç —</option>
                      {getPoolTopicsForSubject(newTopic.subject)
                        .filter(t => !topicList.find(x => x.subject === newTopic.subject && x.topic === t))
                        .map(t => <option key={t}>{t}</option>)}
                      <option value="__custom__">✏️ Özel yaz...</option>
                    </select>
                  ) : (
                    <input style={inp} value={newTopic.topic} onChange={e => setNewTopic(p => ({ ...p, topic: e.target.value }))} placeholder="Konu adı..." />
                  )}
                  {newTopic.topic === '__custom__' && (
                    <input style={{ ...inp, marginTop: 4 }} value={newTopic._customTopic || ''} onChange={e => setNewTopic(p => ({ ...p, _customTopic: e.target.value }))} placeholder="Konu adını yaz..." />
                  )}
                </div>
                <div><label style={lbl}>Durum</label>
                  <select style={inp} value={newTopic.status} onChange={e => setNewTopic(p => ({ ...p, status: e.target.value }))}>
                    {TOPIC_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={() => {
                  const topicName = newTopic.topic === '__custom__' ? (newTopic._customTopic || '').trim() : newTopic.topic.trim();
                  if (!topicName) return;
                  setTopicList(p => [...p, { id: uid(), subject: newTopic.subject, topic: topicName, status: newTopic.status }]);
                  setNewTopic(p => ({ ...p, topic: '', _customTopic: '' }));
                }}
                  style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 0.85rem', fontWeight: 800, cursor: 'pointer', marginBottom: 0 }}>
                  <Plus size={16} />
                </button>
              </div>
            </Card>

            {/* Konular listesi */}
            {SUBJECTS.map(subj => {
              const items = topicList.filter(t => t.subject === subj);
              if (!items.length) return null;
              const done = items.filter(t => t.status === 'Tamamlandı').length;
              return (
                <Card key={subj} emoji="📚" title={`${subj} (${done}/${items.length} tamamlandı)`}>
                  <Progress value={done} max={items.length} color="#059669" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: '0.75rem' }}>
                    {items.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', background: t.status === 'Tamamlandı' ? '#f0fdf4' : '#f8fafc', borderRadius: '0.65rem', border: t.status === 'Tamamlandı' ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.84rem', color: '#374151' }}>{t.topic}</span>
                        <select value={t.status} onChange={e => setTopicList(p => p.map(x => x.id === t.id ? { ...x, status: e.target.value } : x))}
                          style={{ padding: '0.28rem 0.5rem', borderRadius: '0.5rem', border: `1.5px solid ${STATUS_COLOR[t.status]}40`, background: `${STATUS_COLOR[t.status]}15`, color: STATUS_COLOR[t.status], fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer', outline: 'none' }}>
                          {TOPIC_STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button onClick={() => setTopicList(p => p.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0' }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
            {topicList.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontWeight: 700 }}>Henüz konu eklenmedi. Yukarıdan ekle 👆</div>}
          </div>
        )}

        {/* ═══ HATA DEFTERİM ═══ */}
        {activeTab === 'hatalar' && (
          <div>
            <Tip>Yanlış yaptığın soruları kaydet. Sebebini yaz, ne zaman tekrar edeceğini belirle. Koçun bu hataları da görür.</Tip>

            <Card emoji="➕" title="Yeni Hata Kaydı">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem' }}>
                <div><label style={lbl}>Ders</label>
                  <select style={inp} value={newError.subject} onChange={e => setNewError(p => ({ ...p, subject: e.target.value, topic: '' }))}>
                    {(poolSubjectNames.length > 0 ? poolSubjectNames : SUBJECTS).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Konu</label>
                  {getPoolTopicsForSubject(newError.subject).length > 0 ? (
                    <select style={inp} value={newError.topic} onChange={e => setNewError(p => ({ ...p, topic: e.target.value === '__custom__' ? '' : e.target.value }))}
                      onFocus={e => { if (e.target.value === '__custom__') setNewError(p => ({ ...p, topic: '' })); }}>
                      <option value="">— Konu seç —</option>
                      {getPoolTopicsForSubject(newError.subject).map(t => <option key={t}>{t}</option>)}
                      <option value="__custom__">✏️ Özel yaz...</option>
                    </select>
                  ) : (
                    <input style={inp} value={newError.topic} onChange={e => setNewError(p => ({ ...p, topic: e.target.value }))} placeholder="Hangi konuda?" />
                  )}
                  {(newError.topic === '' && getPoolTopicsForSubject(newError.subject).length > 0) || !getPoolTopicsForSubject(newError.subject).includes(newError.topic) && newError.topic !== '' ? (
                    newError.topic !== '' ? null :
                    <input style={{ ...inp, marginTop: 4 }} value={newError.topic} onChange={e => setNewError(p => ({ ...p, topic: e.target.value }))} placeholder="Veya konu adını yaz..." />
                  ) : null}
                </div>
                <div><label style={lbl}>Neden Yanlış?</label>
                  <select style={inp} value={newError.reason} onChange={e => setNewError(p => ({ ...p, reason: e.target.value }))}>
                    <option value="">Seçin...</option>
                    <option>Dikkat Hatası</option>
                    <option>Bilgi Eksikliği</option>
                    <option>İşlem Hatası</option>
                    <option>Süre Baskısı</option>
                    <option>Soruyu Yanlış Anladım</option>
                  </select>
                </div>
                <div><label style={lbl}>Tekrar Tarihi</label>
                  <input style={inp} type="date" value={newError.retakeDate} onChange={e => setNewError(p => ({ ...p, retakeDate: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Doğrusu / Notum</label>
                  <textarea style={{ ...ta, minHeight: 56 }} value={newError.correct} onChange={e => setNewError(p => ({ ...p, correct: e.target.value }))} placeholder="Doğru çözüm veya aklındakiler..." />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.6rem' }}>
                <button onClick={() => {
                  if (!newError.topic.trim()) return;
                  setErrors(p => [{ id: uid(), ...newError }, ...p]);
                  setNewError({ subject: SUBJECTS[0], topic: '', reason: '', correct: '', retakeDate: today() });
                }} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.55rem 1.1rem', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={14} /> Kaydet
                </button>
              </div>
            </Card>

            {errors.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontWeight: 700 }}>Hata kaydı yok. Harika! 🎉</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {errors.map(err => (
                <div key={err.id} style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '0.7rem', padding: '0.18rem 0.55rem', borderRadius: 99 }}>{err.subject}</span>
                      <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#374151' }}>{err.topic}</span>
                      {err.reason && <span style={{ background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #fecaca' }}>{err.reason}</span>}
                    </div>
                    <button onClick={() => setErrors(p => p.filter(x => x.id !== err.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0' }}><Trash2 size={14} /></button>
                  </div>
                  {err.correct && <div style={{ marginTop: 6, fontSize: '0.81rem', color: '#475569', background: 'white', borderRadius: '0.5rem', padding: '0.45rem 0.7rem', border: '1px solid #fecaca' }}>{err.correct}</div>}
                  {err.retakeDate && <div style={{ marginTop: 4, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>🔁 Tekrar: {err.retakeDate}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ MOTİVASYON ═══ */}
        {activeTab === 'motivasyon' && (
          <div>
            <Tip>Bu sayfa tamamen sana ait! Motivasyonunu yüksek tut, başarılarını unutma.</Tip>

            <Card emoji="⭐" title="Haftanın Sözüm">
              <textarea style={{ ...ta, background: '#fffbeb', borderColor: '#fde68a', minHeight: 60 }} value={motivation.weekQuote} onChange={e => setMotivation(p => ({ ...p, weekQuote: e.target.value }))} placeholder="Bu hafta kendini motive eden bir söz yaz..." />
            </Card>

            <Card emoji="🏆" title="Bu Hafta Başardıklarım">
              <textarea style={{ ...ta, background: '#f0fdf4', borderColor: '#bbf7d0' }} value={motivation.achievements} onChange={e => setMotivation(p => ({ ...p, achievements: e.target.value }))} placeholder="Küçük ya da büyük, her başarını yaz! Hepsini kutlamayı hak ediyorsun 🎉" />
            </Card>

            <Card emoji="💌" title="Gelecekteki Kendime Not">
              <textarea style={{ ...ta, background: '#f0f4ff', borderColor: '#c7d2fe' }} value={motivation.selfNote} onChange={e => setMotivation(p => ({ ...p, selfNote: e.target.value }))} placeholder="Sınav günü kendine ne söylemek isterdin? Şimdi yaz..." />
            </Card>

            <Card emoji="🎁" title="Ödül Sistemim">
              <textarea style={{ ...ta, minHeight: 60, background: '#fdf2f8', borderColor: '#f0abfc' }} value={motivation.rewardSystem} onChange={e => setMotivation(p => ({ ...p, rewardSystem: e.target.value }))} placeholder="Hedefimi tutarsam kendime ne hediye alacağım? Örn: 5 net artışı = sinema 🎬" />
            </Card>
          </div>
        )}

        {/* ═══ ALIŞKANLIKLARIM ═══ */}
        {activeTab === 'aliskanlik' && (
          <div>
            <Tip>Her gün akşam tamamladığın alışkanlıkları işaretle. Hücreye tıkla, 5/7 veya üzeri olunca 🔥 kazanırsın!</Tip>

            <Card emoji="🔥" title="Alışkanlık Takibim">
              <form onSubmit={e => { e.preventDefault(); if (newHabit.trim()) { setHabits(p => [...p, { id: uid(), label: newHabit.trim(), days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) }]); setNewHabit(''); }}} style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
                <input style={{ ...inp, flex: 1 }} value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Yeni alışkanlık ekle..." />
                <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.5rem 0.85rem', fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /></button>
              </form>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 5px', minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.3rem 0.75rem', fontWeight: 800, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Alışkanlık</th>
                      {DAYS.map(d => <th key={d} style={{ textAlign: 'center', width: 40, fontWeight: 800, fontSize: '0.72rem', color: '#64748b' }}>{d}</th>)}
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(h => {
                      const count = Object.values(h.days).filter(Boolean).length;
                      return (
                        <tr key={h.id}>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.83rem', color: '#374151', background: '#f8fafc', borderRadius: '0.5rem 0 0 0.5rem', border: '1px solid #e2e8f0', borderRight: 'none' }}>
                            {h.label} {count >= 5 ? '🔥' : ''}
                          </td>
                          {DAYS.map(d => (
                            <td key={d} style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none', borderRight: 'none', padding: 3 }}>
                              <button onClick={() => setHabits(p => p.map(x => x.id === h.id ? { ...x, days: { ...x.days, [d]: !x.days[d] } } : x))}
                                style={{ width: 30, height: 30, borderRadius: '50%', background: h.days[d] ? '#dc2626' : 'white', border: h.days[d] ? 'none' : '2px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto', transition: 'all 0.15s' }}>
                                {h.days[d] && <Check size={13} color="white" strokeWidth={3} />}
                              </button>
                            </td>
                          ))}
                          <td style={{ background: '#f8fafc', borderRadius: '0 0.5rem 0.5rem 0', border: '1px solid #e2e8f0', borderLeft: 'none', textAlign: 'center' }}>
                            <button onClick={() => setHabits(p => p.filter(x => x.id !== h.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '0.85rem', background: '#fef2f2', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {habits.map(h => {
                  const count = Object.values(h.days).filter(Boolean).length;
                  return (
                    <span key={h.id} style={{ fontWeight: 800, fontSize: '0.73rem', padding: '0.2rem 0.6rem', borderRadius: 99, background: count >= 5 ? '#dc2626' : '#f1f5f9', color: count >= 5 ? 'white' : '#64748b' }}>
                      {h.label}: {count}/7 {count >= 5 ? '🔥' : ''}
                    </span>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ DENEME SONUÇLARIM ═══ */}
        {activeTab === 'denemeler' && (
          <div>
            <Tip>Çözdüğün online sınavlar buraya otomatik yansır. Dışarıda girdiğin denemeleri de yukarıdaki buton ile ekleyip koçuna onaya gönderebilirsin!</Tip>

            {/* Top Action Bar with Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.85rem 1.1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>Harici / Fiziki Deneme Kaydı</span>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Fiziki girdiğin denemelerin D/Y/B ve netlerini açılır pencereden kolayca ekle.</div>
              </div>
              <button onClick={() => setShowMockModal(true)} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                <Plus size={16} /> ➕ Yeni Deneme Sonucu Ekle
              </button>
            </div>

            {/* ⏳ Koç Onayı Bekleyenler */}
            {pendingExams.length > 0 && (
              <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '1.1rem', padding: '1.1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                  <span>⏳</span> Koç Onayı Bekleyen Manuel Denemeler ({pendingExams.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingExams.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0.65rem 0.85rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #fef08a' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{m.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                          {m.date} · Net: <strong style={{ color: '#7c3aed' }}>{m.totalNet}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: 99, border: '1px solid #fde68a' }}>
                          ⏳ Koç Onayı Bekliyor
                        </span>
                        <button type="button" onClick={() => deleteMockExam(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🏆 GENEL DENEME SINAVLARI */}
            {generalTrialExams.length === 0 && pendingExams.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontWeight: 700 }}>
                <BarChart3 size={40} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
                Henüz çözülmüş veya eklenmiş Genel Deneme Sınavı yok.
              </div>
            )}

            {generalTrialExams.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🏆</span> Genel Deneme Sınavları ({generalTrialExams.length})
                </div>

                {/* Özet istatistik */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Toplam Deneme', value: generalTrialExams.length, color: '#7c3aed' },
                    { label: 'Ortalama Net', value: (generalTrialExams.reduce((s, x) => s + (x.totalNet || 0), 0) / generalTrialExams.length).toFixed(1), color: '#2563eb' },
                    { label: 'En Yüksek Net', value: Math.max(...generalTrialExams.map(x => x.totalNet || 0)).toFixed(1), color: '#059669' },
                    { label: 'Son Deneme', value: generalTrialExams[0]?.totalNet ?? '—', color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Deneme Listesi */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {generalTrialExams.map((s, i) => (
                    <div key={s.id || i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0.85rem 1rem', background: i === 0 ? '#f5f3ff' : '#f8fafc', borderRadius: '0.85rem', border: i === 0 ? '1.5px solid #ddd6fe' : '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#7c3aed' : '#e2e8f0', color: i === 0 ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{s.title}</span>
                            {s.sourceType === 'online' && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: 4 }}>⚡ Online Sınav</span>
                            )}
                            {s.sourceType === 'optik' && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.45rem', borderRadius: 4 }}>🎯 Optik Form Deneme</span>
                            )}
                            {s.sourceType === 'manual' && (
                              s.approvalStatus === 'pending' ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: 4 }}>📋 Fiziki Deneme (⏳ Onay Bekliyor)</span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: 4 }}>📋 Fiziki Deneme (✅ Koç Onaylı)</span>
                              )
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>Tarih: {s.date}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#7c3aed' }}>{s.totalNet}</span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>net</span>
                          <button type="button" onClick={() => s.sourceType === 'online' ? deleteSubmission(s.id) : deleteMockExam(s.id)} title="Denemeyi Sil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, marginLeft: 4 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Ders bazlı fiziki deneme detayları */}
                      {s.scores && Object.keys(s.scores).length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, pt: 4, borderTop: '1px border-dashed #e2e8f0' }}>
                          {Object.entries(s.scores).map(([subName, sc]) => (
                            <div key={subName} style={{ fontSize: '0.7rem', fontWeight: 700, background: 'white', border: '1px solid #e2e8f0', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#64748b', fontWeight: 800 }}>{subName}:</span>
                              <span style={{ color: '#7c3aed', fontWeight: 900 }}>{sc.net} Net</span>
                              <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>({sc.correct || 0}D {sc.wrong || 0}Y {sc.empty || 0}B)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TESTLERİM (ÖDEV VE KONU TESTLERİ SEKME) ═══ */}
        {activeTab === 'testlerim' && (
          <div>
            <Tip>Sistemde veya ödevler sekmesinde çözdüğün tüm konu testleri ve ödev sonuçların burada saklanır.</Tip>

            {otherHomeworkSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontWeight: 700 }}>
                <ClipboardList size={40} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
                Henüz çözülmüş ödev veya konu testi bulunmuyor.
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📝</span> Çözülen Ödevler & Konu Testlerim ({otherHomeworkSubmissions.length})
                </div>

                {/* Özet istatistik */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Çözülen Test', value: otherHomeworkSubmissions.length, color: '#2563eb' },
                    { label: 'Ortalama Net', value: (otherHomeworkSubmissions.reduce((s, x) => s + (x.totalNet || 0), 0) / otherHomeworkSubmissions.length).toFixed(1), color: '#7c3aed' },
                    { label: 'Toplam Doğru', value: otherHomeworkSubmissions.reduce((s, x) => s + (x.correctCount || 0), 0), color: '#059669' },
                    { label: 'Toplam Yanlış', value: otherHomeworkSubmissions.reduce((s, x) => s + (x.wrongCount || 0), 0), color: '#dc2626' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {otherHomeworkSubmissions.map((s, i) => (
                    <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{s.title}</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                          Tarih: {s.date} · ✅ {s.correctCount} Doğru · ❌ {s.wrongCount} Yanlış · ⭕ {s.emptyCount} Boş
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#2563eb' }}>{s.totalNet}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>net</span>
                        <button type="button" onClick={() => deleteSubmission(s.id)} title="Testi Sil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, marginLeft: 4 }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

            {/* ═══ DENEME EKLEME MODAL POPUP ═══ */}
            {showMockModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                <div style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                  
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>📝</span>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>Yeni Deneme Sonucu Ekle</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Sonuçlarınız kaydolduktan sonra koç öğretmeninizin onayına sunulur.</p>
                      </div>
                    </div>
                    <button onClick={() => setShowMockModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveManualMock}>
                    {/* Header Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={lbl}>Deneme Adı / Yayın</label>
                        <input style={inp} value={newManualMock.title} onChange={e => setNewManualMock(p => ({ ...p, title: e.target.value }))} placeholder="Örn: Özdebir Türkiye Geneli LGS-3" required />
                      </div>
                      <div>
                        <label style={lbl}>Tarih</label>
                        <input style={inp} type="date" value={newManualMock.date} onChange={e => setNewManualMock(p => ({ ...p, date: e.target.value }))} />
                      </div>
                    </div>

                    {/* Subject Table / Grid */}
                    <div style={{ fontWeight: 800, fontSize: '0.83rem', color: '#1e293b', marginBottom: 8 }}>Ders Bazlı Doğru, Yanlış, Boş ve Net Sayıları:</div>
                    
                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.85rem', overflow: 'hidden', marginBottom: '0.85rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: 800, fontSize: '0.73rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Ders</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#16a34a', width: 70 }}>Doğru (D)</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#dc2626', width: 70 }}>Yanlış (Y)</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#d97706', width: 70 }}>Boş (B)</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#7c3aed', width: 85 }}>Net</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: 36 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(newManualMock.subjects).map((subName, idx) => {
                            const sub = newManualMock.subjects[subName];
                            const total = Object.keys(newManualMock.subjects).length;
                            return (
                              <tr key={subName} style={{ borderBottom: idx < total - 1 ? '1px solid #f1f5f9' : 'none', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>{subName}</td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: '#bbf7d0' }}
                                    value={sub.d} onChange={e => updateSubjectScore(subName, 'd', e.target.value)} placeholder="0" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: '#fca5a5' }}
                                    value={sub.y} onChange={e => updateSubjectScore(subName, 'y', e.target.value)} placeholder="0" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: '#fde68a' }}
                                    value={sub.b} onChange={e => updateSubjectScore(subName, 'b', e.target.value)} placeholder="0" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" step="0.25" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.82rem', fontWeight: 900, color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}
                                    value={sub.net} onChange={e => updateSubjectScore(subName, 'net', e.target.value)} placeholder="0.00" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <button type="button" onClick={() => removeSubjectFromMock(subName)} title="Dersi kaldır"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Ders Ekle Satırı */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center', background: '#f8fafc', border: '1.5px dashed #c7d2fe', borderRadius: '0.85rem', padding: '0.65rem 0.85rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', whiteSpace: 'nowrap' }}>➕ Ders Ekle:</span>
                      <select
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        style={{ ...inp, flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                      >
                        <option value="">— Ders seç veya yaz —</option>
                        {['Türkçe','Matematik','Fen Bilimleri','Sosyal Bilgiler','İngilizce','Din Kültürü','Yabancı Dil','Tarih','Coğrafya','Fizik','Kimya','Biyoloji','Edebiyat','Geometri','TYT Türkçe','TYT Matematik','TYT Fen','TYT Sosyal']
                          .filter(s => !newManualMock.subjects[s])
                          .map(s => <option key={s} value={s}>{s}</option>)
                        }
                      </select>
                      <input
                        type="text"
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubjectToMock())}
                        placeholder="veya özel ders adı yaz"
                        style={{ ...inp, flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                      />
                      <button
                        type="button"
                        onClick={addSubjectToMock}
                        disabled={!newSubjectName.trim() || !!newManualMock.subjects[newSubjectName.trim()]}
                        style={{ background: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? '#6366f1' : '#e2e8f0', color: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.6rem', padding: '0.4rem 0.9rem', fontWeight: 800, fontSize: '0.82rem', cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                      >
                        Ekle
                      </button>
                    </div>

                    {/* Summary Bar */}
                    <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4c1d95', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>✅ {totalMockD} Doğru</span>
                        <span>❌ {totalMockY} Yanlış</span>
                        <span>⭕ {totalMockB} Boş</span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6d28d9' }}>
                        Toplam Net: <span style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{totalMockNet.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button type="button" onClick={() => setShowMockModal(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.2rem', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer' }}>
                        Vazgeç
                      </button>
                      <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.4rem', fontWeight: 900, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                        <Plus size={16} /> Kaydet ve Koç Onayına Gönder
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

      </div>

      {/* ── FLOATING SAVE ── */}
      <div style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 100 }}>
        <button onClick={handleSave} style={{
          background: saved ? '#059669' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
          color: 'white', border: 'none', borderRadius: '1rem',
          padding: '0.7rem 1.4rem', fontWeight: 900, fontSize: '0.85rem',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.25s'
        }}>
          {saved ? <><CheckCircle2 size={16} /> Kaydedildi!</> : <><Save size={16} /> Kaydet</>}
        </button>
      </div>

    </div>
  );
}
