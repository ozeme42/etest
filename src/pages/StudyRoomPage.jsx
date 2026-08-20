import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { toUUID } from '../services/supabaseService';
import { checkIsTaskSolved } from '../components/ProgramCenter';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Sparkles, Flame, CheckCircle2, Clock, Music, Headphones, BookOpen,
  Target, Coffee, Moon, Sun, ArrowLeft, Plus, Minus, Trash2, Check, BarChart2,
  Zap, Settings2, Bell, Award, ListTodo, Edit3, Shield, TreePine, Sprout,
  Trophy, BookmarkCheck, ChevronRight, X, Gift, Compass, Expand, Shrink,
  Gauge, Activity, TrendingUp, HelpCircle, History, BookMarked, PlayCircle,
  Layers, ExternalLink, FileText, Search, Filter, Calendar, Eye, EyeOff, MapPin
} from 'lucide-react';

// ─── AMBIENT SYNTHESIZER (Web Audio API) ───────────────────────────────────────
class AmbientEngine {
  constructor() {
    this.ctx = null;
    this.nodes = {};
    this.volumes = {};
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playChime() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 1.2); // C6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 1.2);

      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now); // G5
      osc3.frequency.exponentialRampToValueAtTime(1567.98, now + 1.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      osc1.connect(gain);
      osc2.connect(gain);
      osc3.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 2.8);
      osc2.stop(now + 2.8);
      osc3.stop(now + 2.8);
    } catch (e) {
      console.warn('Chime error:', e);
    }
  }

  // Çok hafif, tatlı ve rahatsız etmeyen soru başı süre hatırlatma sesi (Soft Ding)
  playSoftDing() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05); // E6
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {
      console.warn('Soft ding error:', e);
    }
  }

  setSoundVolume(type, vol) {
    this.init();
    if (!this.ctx) return;
    this.volumes[type] = vol;

    if (vol <= 0) {
      this.stopSound(type);
      return;
    }

    if (!this.nodes[type]) {
      this.startSound(type);
    }

    if (this.nodes[type]?.gain) {
      this.nodes[type].gain.gain.setTargetAtTime(vol * 0.25, this.ctx.currentTime, 0.1);
    }
  }

  startSound(type) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.connect(this.ctx.destination);

      if (type === 'rain') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.05) * 0.1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain, filter };
      } else if (type === 'waves') {
        const bufferSize = this.ctx.sampleRate * 3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.2;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.15, now);
        lfoGain.gain.setValueAtTime(300, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(0);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain, lfo };
      } else if (type === 'binaural') {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(432, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(442, now);

        osc1.connect(gain);
        osc2.connect(gain);
        osc1.start(0);
        osc2.start(0);
        this.nodes[type] = { sources: [osc1, osc2], gain };
      } else if (type === 'fire') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const r = Math.random();
          data[i] = r > 0.96 ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.03;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain };
      } else if (type === 'whitenoise') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain };
      }
    } catch (e) {
      console.warn('Start sound error:', e);
    }
  }

  stopSound(type) {
    if (this.nodes[type]) {
      try {
        if (this.nodes[type].source) this.nodes[type].source.stop();
        if (this.nodes[type].sources) this.nodes[type].sources.forEach(s => s.stop());
        if (this.nodes[type].lfo) this.nodes[type].lfo.stop();
      } catch (e) {}
      delete this.nodes[type];
    }
  }

  stopAll() {
    Object.keys(this.nodes).forEach(k => this.stopSound(k));
  }
}

const ambientAudio = new AmbientEngine();

// ─── MOTIVATIONAL QUOTES ───────────────────────────────────────────────────────
const FOCUS_QUOTES = [
  "Büyük başarılar, her gün atılan küçük ve odaklı adımların toplamıdır.",
  "Şimdi gösterdiğin odaklanma, gelecekteki seni gururlandıracak.",
  "Dikkatini dağıtan şeyleri sustur; hedeflerinin sesini yükselt.",
  "Zor olan başlamaktır; başladığında odaklanma kendiliğinden akar.",
  "Her çözülen soru ve her biten seans, seni hedefine bir adım daha yaklaştırır.",
  "Bugün yapacağın fedakarlıklar, yarının özgürlüğü ve mutluluğudur.",
  "Önemli olan ne kadar çalıştığın değil, ne kadar odaklı çalıştığındır."
];

const TREE_SPECIES = [
  { icon: '🌲', name: 'Çam Ağacı' },
  { icon: '🌳', name: 'Gürgen Ağacı' },
  { icon: '🌴', name: 'Palmiye' },
  { icon: '🎋', name: 'Bambu' },
  { icon: '🌸', name: 'Kiraz Çiçeği (Sakura)' },
  { icon: '🍎', name: 'Meyveli Elma Ağacı' }
];

// ─── THEMES ────────────────────────────────────────────────────────────────────
const getThemeList = (isDark) => [
  {
    id: 'system',
    name: isDark ? '🌙 Sistem Karanlık' : '☀️ Sistem Aydınlık',
    bg: 'var(--color-bg)',
    cardBg: 'var(--color-surface)',
    innerBg: 'var(--color-surface-hover)',
    buttonBg: 'var(--color-surface-hover)',
    border: 'var(--color-border)',
    accent: '#6366f1',
    text: 'var(--color-text)',
    subText: 'var(--color-text-muted)',
    isDark: isDark
  },
  {
    id: 'cozy',
    name: '☕ Sıcak Oda',
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    cardBg: 'rgba(30, 27, 75, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.28)',
    buttonBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(99, 102, 241, 0.35)',
    accent: '#818cf8',
    text: '#ffffff',
    subText: '#c7d2fe',
    isDark: true
  },
  {
    id: 'zen',
    name: '🎋 Gece Zen',
    bg: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
    cardBg: 'rgba(15, 23, 42, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.32)',
    buttonBg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(148, 163, 184, 0.25)',
    accent: '#38bdf8',
    text: '#f8fafc',
    subText: '#94a3b8',
    isDark: true
  },
  {
    id: 'nature',
    name: '🌿 Orman',
    bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    cardBg: 'rgba(6, 78, 59, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.28)',
    buttonBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(52, 211, 153, 0.35)',
    accent: '#34d399',
    text: '#ffffff',
    subText: '#a7f3d0',
    isDark: true
  },
  {
    id: 'sunset',
    name: '🌅 Günbatımı',
    bg: 'linear-gradient(135deg, #4c0519 0%, #831843 50%, #9d174d 100%)',
    cardBg: 'rgba(76, 5, 25, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.28)',
    buttonBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(244, 114, 182, 0.35)',
    accent: '#fb7185',
    text: '#ffffff',
    subText: '#fbcfe8',
    isDark: true
  }
];

// ─── 📚 DERS LİSTESİ & VARSAYILAN HIZ STANDARTLARI ──────────────────────────
export const STUDY_SUBJECTS = [
  { id: 'Matematik', name: 'Matematik', icon: '📐', defaultMinPerQ: 2.0, color: '#6366f1' },
  { id: 'Fen Bilimleri', name: 'Fen Bilimleri (Fizik/Kimya/Biyo)', icon: '🔬', defaultMinPerQ: 1.5, color: '#10b981' },
  { id: 'Türkçe', name: 'Türkçe / Paragraf', icon: '📚', defaultMinPerQ: 1.25, color: '#f59e0b' },
  { id: 'T.C. İnkılap Tarihi', name: 'İnkılap Tarihi / Tarih', icon: '🏛️', defaultMinPerQ: 1.0, color: '#ec4899' },
  { id: 'Sosyal Bilgiler', name: 'Sosyal Bilgiler / Coğrafya', icon: '🌍', defaultMinPerQ: 1.0, color: '#06b6d4' },
  { id: 'Din Kültürü', name: 'Din Kültürü ve Ahlak Bilgisi', icon: '🕌', defaultMinPerQ: 0.8, color: '#8b5cf6' },
  { id: 'İngilizce', name: 'İngilizce / Yabancı Dil', icon: '🇬🇧', defaultMinPerQ: 1.0, color: '#3b82f6' },
  { id: 'Felsefe / Mantık', name: 'Felsefe / Mantık', icon: '🧠', defaultMinPerQ: 1.2, color: '#14b8a6' },
  { id: 'Genel / Karma', name: 'Genel Deneme / Karma', icon: '🎯', defaultMinPerQ: 1.5, color: '#f97316' }
];

export const formatSecToMinSec = (seconds) => {
  if (!seconds || seconds <= 0) return '0 sn';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} sn`;
  if (s === 0) return `${m} dk`;
  return `${m} dk ${s.toString().padStart(2, '0')} sn`;
};

export const getSpeedEvaluation = (avgSec, defaultMinPerQ) => {
  const targetSec = (defaultMinPerQ || 1.5) * 60;
  if (!avgSec || avgSec <= 0) return { label: 'Henüz Veri Yok', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', icon: '⚪' };
  if (avgSec <= targetSec * 0.8) return { label: 'Süper Hızlı', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '⚡' };
  if (avgSec <= targetSec * 1.15) return { label: 'İdeal Hız', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '🎯' };
  if (avgSec <= targetSec * 1.4) return { label: 'Standart', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '🟡' };
  return { label: 'Detaylı / Uzun', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: '⏳' };
};

export default function StudyRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { books = [], bookTests = [] } = useTrackedBooks() || {};
  const { studyPlans = [], studyAssignments = [] } = useStudyPlan() || {};
  const { homeworks = [] } = useHomework() || {};
  const { submissions = [] } = useEvaluation() || {};
  const { getCoachingProfileForStudent } = useCoaching() || {};

  const coachingProfile = useMemo(() => {
    if (!currentUser?.id || !getCoachingProfileForStudent) return {};
    return getCoachingProfileForStudent(currentUser.id) || {};
  }, [currentUser?.id, getCoachingProfileForStudent]);

  const THEMES = useMemo(() => getThemeList(isDark), [isDark]);

  // ── 🎯 BİRLEŞİK ÇALIŞMA & HEDEF MODLARI: 'question' | 'book' | 'study' | 'break' | 'stopwatch' ──
  const [activeStudyMode, setActiveStudyMode] = useState(() => localStorage.getItem('study_master_mode') || 'question');

  // ── 📝 ATANMIŞ ÖDEV, KİTAP TESTİ & PROGRAM GÖREVLERİ SEÇİMİ ──
  const [selectedTask, setSelectedTask] = useState(null);
  const [showHomeworkPickerModal, setShowHomeworkPickerModal] = useState(false);
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [hwFilterSubject, setHwFilterSubject] = useState('all');
  const [hwSourceTab, setHwSourceTab] = useState('program'); // Default to 'program' for weekly view
  const [hideCompletedTasks, setHideCompletedTasks] = useState(true); // Çözülenler/bitenler varsayılan olarak gizli
  
  const todayDayMap = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
  const currentTodayKey = todayDayMap[new Date().getDay()] || 'Pzt';
  const [selectedProgramDay, setSelectedProgramDay] = useState(currentTodayKey);

  const studentIdStr = String(currentUser?.id || '');
  const studentUuidStr = String(toUUID(currentUser?.id) || '');

  // ── 📅 HAFTALIK GÜN VE TARİH BİLGİLERİ HESAPLAMA ──
  const WEEK_DAYS_CONFIG = useMemo(() => [
    { key: 'Pzt', long: 'Pazartesi', aliases: ['pzt', 'pazartesi', 'monday', 'mon'], icon: '⚡', color: '#4f46e5', bg: isDark ? 'rgba(79, 70, 229, 0.15)' : '#eef2ff' },
    { key: 'Sal', long: 'Salı', aliases: ['sal', 'salı', 'sali', 'tuesday', 'tue'], icon: '🎯', color: '#0891b2', bg: isDark ? 'rgba(8, 145, 178, 0.15)' : '#ecfeff' },
    { key: 'Çrş', long: 'Çarşamba', aliases: ['çrş', 'crs', 'çarşamba', 'carsamba', 'wednesday', 'wed'], icon: '🌿', color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ecfdf5' },
    { key: 'Prş', long: 'Perşembe', aliases: ['prş', 'prs', 'perşembe', 'persembe', 'thursday', 'thu'], icon: '🔥', color: '#d97706', bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb' },
    { key: 'Cum', long: 'Cuma', aliases: ['cum', 'cuma', 'friday', 'fri'], icon: '✨', color: '#7c3aed', bg: isDark ? 'rgba(124, 58, 237, 0.15)' : '#faf5ff' },
    { key: 'Cts', long: 'Cumartesi', aliases: ['cts', 'cumartesi', 'saturday', 'sat'], icon: '🚀', color: '#e11d48', bg: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fff1f2' },
    { key: 'Paz', long: 'Pazar', aliases: ['paz', 'pazar', 'sunday', 'sun'], icon: '🏖️', color: '#2563eb', bg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff' }
  ], [isDark]);

  const weekDayDateMap = useMemo(() => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diffToMonday = d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diffToMonday);

    const map = {};
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    WEEK_DAYS_CONFIG.forEach((cfg, idx) => {
      const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      map[cfg.key] = {
        ymd,
        time: cur.getTime(),
        dateLabel: `${cur.getDate()} ${months[cur.getMonth()]}`
      };
    });
    return map;
  }, [WEEK_DAYS_CONFIG]);

  // Yardımcı: Tarih veya gün adından gün anahtarını (Pzt, Sal...) bul
  const resolveDayKey = (input) => {
    if (!input) return null;
    const str = String(input).trim().toLowerCase();
    
    // 1. Tarih eşleşmesi (YYYY-MM-DD)
    if (str.includes('-') || str.includes('t') || str.includes('.')) {
      const ymd = str.split('t')[0].split(' ')[0].replace(/\//g, '-');
      for (const [k, v] of Object.entries(weekDayDateMap)) {
        if (v.ymd === ymd) return k;
      }
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        const map = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
        return map[parsed.getDay()];
      }
    }

    // 2. Gün adı eşleşmesi
    for (const cfg of WEEK_DAYS_CONFIG) {
      if (cfg.key.toLowerCase() === str || cfg.long.toLowerCase() === str || cfg.aliases.some(a => str === a || str.startsWith(a))) {
        return cfg.key;
      }
    }
    return null;
  };

  // 1. Öğrenciye atanan tüm görevleri birleştir (Ödevler, Kitap Testleri, Ders Programı, Yol Haritaları)
  const allAssignedTasks = useMemo(() => {
    if (!currentUser) return [];

    const isMatchStudent = (s) => {
      if (!s) return false;
      const sId = String(s.studentId || s.student_id || s.user_id || s.userId || '');
      if (!sId) return false;
      if (sId === studentIdStr) return true;
      if (studentUuidStr && (sId === studentUuidStr || toUUID(sId) === studentUuidStr)) return true;
      if (studentIdStr && toUUID(studentIdStr) === sId) return true;
      return false;
    };

    const isMatchHw = (hw) => {
      if (!hw) return false;
      if (hw.studentId === currentUser.id || hw.student_id === currentUser.id) return true;
      if (studentUuidStr && (hw.studentId === studentUuidStr || hw.student_id === studentUuidStr)) return true;
      if (Array.isArray(hw.targetIds)) {
        if (hw.targetIds.includes(currentUser.id) || (studentUuidStr && hw.targetIds.includes(studentUuidStr))) return true;
        if (hw.targetIds.some(tid => String(tid) === studentIdStr || (studentUuidStr && String(tid) === studentUuidStr))) return true;
      }
      return false;
    };

    const taskList = [];
    const seenTaskKeys = new Set();
    const studentHws = (homeworks || []).filter(isMatchHw);

    // A. Atanmış Bireysel & Optik Ödevler
    studentHws.forEach(hw => {
      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && books.some(b => String(b.id) === String(hw.bookId)));

      if (!isBook) {
        const isSolved = checkIsTaskSolved({ hwId: hw.id, id: hw.id }, currentUser.id, submissions, homeworks, studyAssignments);
        const qCount = hw.questionCount || (Array.isArray(hw.questions) ? hw.questions.length : (hw.totalQuestions || 10));
        const assignedDayKey = resolveDayKey(hw.dueDate || hw.startDate || hw.assignedAt);

        const dedupeKey = `hw_${hw.id}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          taskList.push({
            id: hw.id,
            dedupeKey,
            title: hw.title || 'Ödev',
            subtitle: hw.subject || 'Ödev Görevi',
            subject: hw.subject || 'Genel',
            unit: hw.unit || '',
            topic: hw.topic || '',
            questionCount: Number(qCount) || 10,
            dueDate: hw.dueDate,
            dayKey: assignedDayKey,
            dayName: assignedDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === assignedDayKey)?.long : null,
            sourceType: 'homework',
            sourceLabel: '📝 Atanmış Ödev',
            type: hw.type,
            isPhysical: hw.isPhysical || hw.type === 'physicalExam',
            realTestId: hw.realTestId || hw.testId || hw.id,
            isCompleted: isSolved
          });
        }
      }
    });

    // B. Atanmış Kitap Görevleri & Kitap Testleri ("Tüm Kitap Görevi" veya gün gün atanan testler)
    const assignedBookIds = new Set();
    studentHws.forEach(hw => {
      if (hw.bookId) assignedBookIds.add(String(hw.bookId));
      if (hw.isBookAssignment && hw.id) assignedBookIds.add(String(hw.id));
    });
    (books || []).forEach(b => {
      if (assignedBookIds.has(String(b.id)) || (b.assignedStudents && b.assignedStudents.includes(currentUser?.id)) || (b.studentIds && b.studentIds.includes(currentUser?.id))) {
        assignedBookIds.add(String(b.id));
      }
    });

    (books || []).forEach(book => {
      const isAssigned = assignedBookIds.has(String(book.id)) || assignedBookIds.size === 0;
      if (!isAssigned && (books.length > 6)) return;

      const cleanBookTitle = (book.title || 'Kitap')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .trim();

      const matchingHwsForBook = studentHws.filter(h => String(h.bookId) === String(book.id) || String(h.id) === String(book.id));
      const testsForBook = (bookTests || []).filter(bt => String(bt.bookId) === String(book.id));

      testsForBook.forEach(bt => {
        const isSolved = checkIsTaskSolved({ testId: bt.id, bookTestId: bt.id, taskType: 'kitap' }, currentUser.id, submissions, homeworks, studyAssignments);
        const qCount = Number(bt.questionCount) || (bt.answerKey ? Object.keys(bt.answerKey).length : 12);

        // Bu test için belirlenmiş bir gün veya teslim tarihi var mı?
        let testDayKey = null;
        let testDueDate = null;
        matchingHwsForBook.forEach(hw => {
          if (hw.testDueDates && hw.testDueDates[bt.id]) {
            testDueDate = hw.testDueDates[bt.id];
            testDayKey = resolveDayKey(testDueDate);
          } else if (!testDayKey && hw.dueDate) {
            testDayKey = resolveDayKey(hw.dueDate);
          }
        });

        const dedupeKey = `bt_${bt.id}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          taskList.push({
            id: bt.id,
            dedupeKey,
            title: `${cleanBookTitle} — ${bt.name || bt.title || 'Test'}`,
            subtitle: `${cleanBookTitle} (${bt.name || 'Test'})`,
            bookTitle: cleanBookTitle,
            testName: bt.name || bt.title || 'Test',
            subject: bt.subject || book.subject || 'Genel',
            unit: bt.unit || bt.unitName || '',
            topic: bt.topic || bt.topicName || '',
            questionCount: qCount,
            dayKey: testDayKey,
            dayName: testDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === testDayKey)?.long : null,
            dueDate: testDueDate,
            sourceType: 'bookTest',
            sourceLabel: '📚 Kitap Testi',
            isBookAssignment: true,
            bookTestId: bt.id,
            realTestId: bt.id,
            bookId: book.id,
            isCompleted: isSolved
          });
        }
      });
    });

    // C. Haftalık Ders Programı Görevleri (Koçluk / ProgramCenter)
    const weeklyProg = coachingProfile?.weeklyProgram || [];
    weeklyProg.forEach(dayObj => {
      const rawDay = dayObj.day || 'Pzt';
      const dayKey = resolveDayKey(rawDay) || rawDay;
      const dayCfg = WEEK_DAYS_CONFIG.find(d => d.key === dayKey) || { long: rawDay };

      (dayObj.items || []).forEach((item, idx) => {
        const dedupeKey = `prog_${dayKey}_${item.id || idx}_${item.text || item.topic}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          const qCount = Number(item.targetQuestions || item.questionCount) || 20;
          const isSolved = Boolean(item.done || checkIsTaskSolved(item, currentUser.id, submissions, homeworks, studyAssignments));
          
          // Link to book test if testId or bookTestId exists
          const matchedBookTest = (bookTests || []).find(bt => String(bt.id) === String(item.bookTestId || item.testId || item.realTestId));
          const matchedBook = (books || []).find(b => String(b.id) === String(matchedBookTest?.bookId || item.bookId));

          taskList.push({
            id: dedupeKey,
            dedupeKey,
            title: `${item.text || item.topic || `${item.subject || 'Ders'} Çalışması`}`,
            subtitle: `${dayCfg.long} Programı`,
            dayName: dayCfg.long,
            dayKey,
            subject: item.subject || 'Genel',
            unit: item.unit || '',
            topic: item.topic || item.text || '',
            questionCount: qCount,
            sourceType: matchedBookTest ? 'bookTest' : 'program',
            sourceLabel: matchedBookTest ? '📚 Kitap Testi' : '📅 Ders Programı',
            bookTestId: matchedBookTest?.id || item.bookTestId,
            realTestId: matchedBookTest?.id || item.realTestId || item.testId,
            bookTitle: matchedBook?.title,
            isCompleted: isSolved,
            programItem: item
          });
        }
      });
    });

    // D. Yol Haritası (Roadmap / Study Plans)
    const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(currentUser.id) || toUUID(a.studentId) === studentUuidStr);
    studentAssignments.forEach(assignment => {
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

      (plan.subjects || []).forEach(subject => {
        const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
        const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
        const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

        if (!hasChildTopics && subject.dueDate) {
          const sDayKey = resolveDayKey(subject.dueDate);
          const subId = `roadmap_sub_${assignment.id}_${subject.id}`;
          if (!seenTaskKeys.has(subId)) {
            seenTaskKeys.add(subId);
            taskList.push({
              id: subId,
              dedupeKey: subId,
              roadmapAssignmentId: assignment.id,
              isRoadmapTask: true,
              sourceType: 'roadmap',
              sourceLabel: '🗺️ Yol Haritası',
              subject: subject.name || plan.title || 'Genel',
              topic: subject.name,
              title: `${plan.title} • ${subject.name}`,
              subtitle: `${plan.title} Yol Haritası`,
              dayName: sDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === sDayKey)?.long : null,
              dayKey: sDayKey,
              questionCount: 20,
              dueDate: subject.dueDate,
              isCompleted: isSubjectCompleted
            });
          }
        }

        (subject.topics || []).forEach(topic => {
          if (topic.dueDate) {
            const tDayKey = resolveDayKey(topic.dueDate);
            const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
            const topId = `roadmap_top_${assignment.id}_${topic.id}`;
            if (!seenTaskKeys.has(topId)) {
              seenTaskKeys.add(topId);
              taskList.push({
                id: topId,
                dedupeKey: topId,
                roadmapAssignmentId: assignment.id,
                isRoadmapTask: true,
                sourceType: 'roadmap',
                sourceLabel: '🗺️ Yol Haritası',
                subject: subject.name || plan.title || 'Genel',
                topic: topic.name,
                title: `${plan.title} • ${topic.name}`,
                subtitle: `${plan.title} Yol Haritası`,
                dayName: tDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === tDayKey)?.long : null,
                dayKey: tDayKey,
                questionCount: 20,
                dueDate: topic.dueDate,
                isCompleted
              });
            }
          }
        });
      });
    });

    return taskList;
  }, [homeworks, books, bookTests, submissions, coachingProfile, studyPlans, studyAssignments, currentUser, studentIdStr, studentUuidStr, weekDayDateMap, WEEK_DAYS_CONFIG]);

  // Haftalık Program Görevlerini Gün Gün Eksiksiz Gruplama (Tüm Kaynakları Birleştirir)
  const weeklyProgramGrouped = useMemo(() => {
    const studentHws = (homeworks || []).filter(hw => {
      if (!hw || !currentUser) return false;
      if (hw.studentId === currentUser.id || hw.student_id === currentUser.id) return true;
      if (studentUuidStr && (hw.studentId === studentUuidStr || hw.student_id === studentUuidStr)) return true;
      if (Array.isArray(hw.targetIds)) {
        if (hw.targetIds.includes(currentUser.id) || (studentUuidStr && hw.targetIds.includes(studentUuidStr))) return true;
      }
      return false;
    });

    const weeklyProg = coachingProfile?.weeklyProgram || [];
    const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(currentUser.id) || toUUID(a.studentId) === studentUuidStr);

    return WEEK_DAYS_CONFIG.map(dayCfg => {
      const dayTasks = [];
      const seenKeys = new Set();
      const dayInfo = weekDayDateMap[dayCfg.key] || {};

      // 1. Koçluk Ders Programındaki Günlük ve Günlük Tekrarlanan Öğeler
      weeklyProg.forEach(dayObj => {
        const dKey = resolveDayKey(dayObj.day);
        const isMatchThisDay = dKey === dayCfg.key;

        (dayObj.items || []).forEach((item, idx) => {
          const isDaily = item.repeatType === 'daily' || item.isDaily;
          if (isMatchThisDay || isDaily) {
            const dedupeKey = `prog_${dayCfg.key}_${item.id || idx}_${item.text || item.topic}`;
            if (!seenKeys.has(dedupeKey)) {
              seenKeys.add(dedupeKey);
              const qCount = Number(item.targetQuestions || item.questionCount) || 20;
              const isSolved = Boolean(item.done || checkIsTaskSolved(item, currentUser.id, submissions, homeworks, studyAssignments));
              const matchedBookTest = (bookTests || []).find(bt => String(bt.id) === String(item.bookTestId || item.testId || item.realTestId));
              const matchedBook = (books || []).find(b => String(b.id) === String(matchedBookTest?.bookId || item.bookId));

              dayTasks.push({
                id: dedupeKey,
                dedupeKey,
                title: `${item.text || item.topic || `${item.subject || 'Ders'} Çalışması`}`,
                subtitle: `${dayCfg.long} Programı`,
                dayName: dayCfg.long,
                dayKey: dayCfg.key,
                subject: item.subject || 'Genel',
                unit: item.unit || '',
                topic: item.topic || item.text || '',
                questionCount: qCount,
                sourceType: matchedBookTest ? 'bookTest' : 'program',
                sourceLabel: matchedBookTest ? '📚 Kitap Testi' : '📅 Ders Programı',
                bookTestId: matchedBookTest?.id || item.bookTestId,
                realTestId: matchedBookTest?.id || item.realTestId || item.testId,
                bookTitle: matchedBook?.title,
                isCompleted: isSolved,
                programItem: item
              });
            }
          }
        });
      });

      // 2. Kitap Görevlerinin Gün Gün Belirlenmiş Testleri (hw.testDueDates)
      studentHws.forEach(hw => {
        const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && books.some(b => String(b.id) === String(hw.bookId)));
        const bookObj = (books || []).find(b => String(b.id) === String(hw.bookId || hw.id));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap')
          .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
          .replace(/\s*\(Tüm Kitap\)/gi, '')
          .trim();

        if (isBook && hw.testDueDates && typeof hw.testDueDates === 'object') {
          Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const targetDayKey = resolveDayKey(tDateStr);
            const isMatchDate = (dayInfo.ymd && tDateStr.startsWith(dayInfo.ymd)) || (targetDayKey === dayCfg.key);

            if (isMatchDate) {
              const dedupeKey = `day_bt_${dayCfg.key}_${hw.id}_${testId}`;
              if (!seenKeys.has(dedupeKey)) {
                seenKeys.add(dedupeKey);
                const bt = (bookTests || []).find(b => String(b.id) === String(testId));
                const qCount = Number(bt?.questionCount) || (bt?.answerKey ? Object.keys(bt.answerKey).length : 15);
                const isSolved = checkIsTaskSolved({ testId: testId, bookTestId: testId, hwId: hw.id, taskType: 'kitap' }, currentUser.id, submissions, homeworks, studyAssignments);

                dayTasks.push({
                  id: dedupeKey,
                  dedupeKey,
                  title: `${cleanBookTitle} — ${bt?.name || bt?.title || 'Test'}`,
                  subtitle: `${dayCfg.long} Kitap Testi`,
                  dayName: dayCfg.long,
                  dayKey: dayCfg.key,
                  subject: bt?.subject || hw.subject || bookObj?.subject || 'Genel',
                  unit: bt?.unit || bt?.unitName || '',
                  topic: bt?.topic || bt?.topicName || '',
                  questionCount: qCount,
                  dueDate: tDateStr,
                  sourceType: 'bookTest',
                  sourceLabel: '📚 Kitap Testi',
                  bookTestId: testId,
                  realTestId: testId,
                  bookId: bookObj?.id || hw.bookId,
                  bookTitle: cleanBookTitle,
                  isCompleted: isSolved,
                  isBookAssignment: true
                });
              }
            }
          });
        } else if (!isBook || !hw.testDueDates) {
          // Normal ödev veya deneme sınavının teslim günü bu gün mü?
          const hwDayKey = resolveDayKey(hw.dueDate || hw.startDate);
          const isDateMatch = (dayInfo.ymd && hw.dueDate && hw.dueDate.startsWith(dayInfo.ymd)) || (hwDayKey === dayCfg.key);

          if (isDateMatch) {
            const dedupeKey = `day_hw_${dayCfg.key}_${hw.id}`;
            if (!seenKeys.has(dedupeKey)) {
              seenKeys.add(dedupeKey);
              const qCount = Number(hw.questionCount || hw.totalQuestions) || 12;
              const isSolved = checkIsTaskSolved({ hwId: hw.id, id: hw.id }, currentUser.id, submissions, homeworks, studyAssignments);

              dayTasks.push({
                id: dedupeKey,
                dedupeKey,
                title: hw.title || 'Ödev Görevi',
                subtitle: `${dayCfg.long} Ödevi`,
                dayName: dayCfg.long,
                dayKey: dayCfg.key,
                subject: hw.subject || 'Genel',
                unit: hw.unit || '',
                topic: hw.topic || '',
                questionCount: qCount,
                dueDate: hw.dueDate,
                sourceType: 'homework',
                sourceLabel: '📝 Atanmış Ödev',
                realTestId: hw.realTestId || hw.testId || hw.id,
                isCompleted: isSolved
              });
            }
          }
        }
      });

      // 3. Yol Haritası Görevleri (Roadmap Plan items with target dueDate for this day)
      studentAssignments.forEach(assignment => {
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

        (plan.subjects || []).forEach(subject => {
          const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
          const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
          const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

          if (!hasChildTopics && subject.dueDate) {
            const sDayKey = resolveDayKey(subject.dueDate);
            const isMatch = (dayInfo.ymd && subject.dueDate.startsWith(dayInfo.ymd)) || (sDayKey === dayCfg.key);
            if (isMatch) {
              const subId = `roadmap_sub_${assignment.id}_${subject.id}_${dayCfg.key}`;
              if (!seenKeys.has(subId)) {
                seenKeys.add(subId);
                dayTasks.push({
                  id: subId,
                  dedupeKey: subId,
                  roadmapAssignmentId: assignment.id,
                  isRoadmapTask: true,
                  sourceType: 'roadmap',
                  sourceLabel: '🗺️ Yol Haritası',
                  subject: subject.name || plan.title || 'Genel',
                  topic: subject.name,
                  title: `${plan.title} • ${subject.name}`,
                  subtitle: `${dayCfg.long} Yol Haritası`,
                  dayName: dayCfg.long,
                  dayKey: dayCfg.key,
                  questionCount: 20,
                  dueDate: subject.dueDate,
                  isCompleted: isSubjectCompleted
                });
              }
            }
          }

          (subject.topics || []).forEach(topic => {
            if (topic.dueDate) {
              const tDayKey = resolveDayKey(topic.dueDate);
              const isMatch = (dayInfo.ymd && topic.dueDate.startsWith(dayInfo.ymd)) || (tDayKey === dayCfg.key);
              if (isMatch) {
                const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
                const topId = `roadmap_top_${assignment.id}_${topic.id}_${dayCfg.key}`;
                if (!seenKeys.has(topId)) {
                  seenKeys.add(topId);
                  dayTasks.push({
                    id: topId,
                    dedupeKey: topId,
                    roadmapAssignmentId: assignment.id,
                    isRoadmapTask: true,
                    sourceType: 'roadmap',
                    sourceLabel: '🗺️ Yol Haritası',
                    subject: subject.name || plan.title || 'Genel',
                    topic: topic.name,
                    title: `${plan.title} • ${topic.name}`,
                    subtitle: `${dayCfg.long} Yol Haritası`,
                    dayName: dayCfg.long,
                    dayKey: dayCfg.key,
                    questionCount: 20,
                    dueDate: topic.dueDate,
                    isCompleted
                  });
                }
              }
            }
          });
        });
      });

      // 4. allAssignedTasks içindeki gün atanmış diğer tüm görevleri ekle
      allAssignedTasks.forEach(t => {
        if (t.dayKey === dayCfg.key || t.dayName === dayCfg.long) {
          const dedupeKey = `merged_${dayCfg.key}_${t.dedupeKey || t.id}`;
          if (!seenKeys.has(dedupeKey) && !seenKeys.has(t.dedupeKey)) {
            seenKeys.add(dedupeKey);
            seenKeys.add(t.dedupeKey);
            dayTasks.push(t);
          }
        }
      });

      return {
        ...dayCfg,
        dateLabel: dayInfo.dateLabel || '',
        tasks: dayTasks,
        totalQuestions: dayTasks.reduce((acc, t) => acc + (Number(t.questionCount) || 0), 0),
        completedCount: dayTasks.filter(t => t.isCompleted).length
      };
    });
  }, [allAssignedTasks, WEEK_DAYS_CONFIG, weekDayDateMap, homeworks, coachingProfile, books, bookTests, submissions, studyPlans, studyAssignments, currentUser, studentIdStr, studentUuidStr]);

  // Kitap Testlerini Kitap Bazında Gruplama
  const bookGroupedTests = useMemo(() => {
    const bookTestsOnly = allAssignedTasks.filter(t => t.sourceType === 'bookTest');
    const groups = {};
    bookTestsOnly.forEach(t => {
      const bTitle = t.bookTitle || 'Kitap Testleri';
      if (!groups[bTitle]) {
        groups[bTitle] = {
          bookTitle: bTitle,
          bookId: t.bookId,
          subject: t.subject,
          tests: []
        };
      }
      groups[bTitle].tests.push(t);
    });
    return Object.values(groups);
  }, [allAssignedTasks]);

  const pendingAssignedTasks = useMemo(() => {
    return allAssignedTasks.filter(t => !t.isCompleted);
  }, [allAssignedTasks]);

  const filteredTasksList = useMemo(() => {
    return allAssignedTasks.filter(task => {
      if (hideCompletedTasks && task.isCompleted) return false;
      const matchSource = hwSourceTab === 'all' || task.sourceType === hwSourceTab;
      const matchSubject = hwFilterSubject === 'all' || (task.subject && task.subject.toLowerCase().includes(hwFilterSubject.toLowerCase()));
      const matchQuery = !hwSearchQuery.trim() ||
        (task.title || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.subtitle || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.subject || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.topic || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.unit || '').toLowerCase().includes(hwSearchQuery.toLowerCase());
      return matchSource && matchSubject && matchQuery;
    });
  }, [allAssignedTasks, hwSourceTab, hwFilterSubject, hwSearchQuery, hideCompletedTasks]);

  // Görevi / Testi Seçerek Süre & Hedef Hazırlama
  const handleSelectTask = (task, startImmediately = false) => {
    if (!task) return;
    setSelectedTask(task);
    setShowHomeworkPickerModal(false);

    // Dersi otomatik eşle
    const taskSubject = task.subject || '';
    const matchedSubj = STUDY_SUBJECTS.find(s => s.id.toLowerCase() === taskSubject.toLowerCase() || taskSubject.toLowerCase().includes(s.id.toLowerCase()));
    if (matchedSubj) {
      setSelectedSubject(matchedSubj.id);
      localStorage.setItem('study_selected_subject', matchedSubj.id);
    }

    // Hedef soru sayısını ayarla
    const qCount = Math.max(1, Number(task.questionCount) || 12);
    handleSetNewTargetGoal(qCount, true);

    // Soru moduna geç
    setActiveStudyMode('question');
    localStorage.setItem('study_master_mode', 'question');

    if (startImmediately) {
      setIsRunning(true);
      ambientAudio.playChime();
    } else {
      setIsRunning(false);
    }
  };

  // Program sayfasından gelindiğinde görevi otomatik yükle ve hazırla (hemen başlatmaz, öğrenci hazır olunca başlatır)
  useEffect(() => {
    const incomingTask = location.state?.autoStartTask || (() => {
      try {
        const raw = localStorage.getItem('study_active_selected_task');
        if (raw) {
          localStorage.removeItem('study_active_selected_task');
          return JSON.parse(raw);
        }
      } catch(e) {}
      return null;
    })();

    if (incomingTask) {
      handleSelectTask(incomingTask, false);
    }
  }, [location.state]);

  const handleClearSelectedTask = () => {
    setSelectedTask(null);
  };

  const handleLaunchTaskQuiz = (task) => {
    if (!task) return;
    if (task.sourceType === 'bookTest' || task.isBookAssignment) {
      navigate(`/book-quiz/${task.bookTestId || task.realTestId || task.testId || task.id}?studentId=${currentUser.id}`);
    } else if (task.type === 'physicalExam' || task.isPhysical) {
      navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${currentUser.id}`);
    } else if (task.sourceType === 'program') {
      handleSelectTask(task, false);
    } else {
      navigate(`/quiz/${task.realTestId || task.hwId || task.id}?studentId=${currentUser.id}`);
    }
  };

  // ── 📚 DERS BAZLI ÇALIŞMA & SORU SÜRESİ TAKİBİ ──
  const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('study_selected_subject') || 'Matematik');
  const [subjectStats, setSubjectStats] = useState(() => {
    const saved = localStorage.getItem('study_subject_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Soru Başı Bütçe Dakikası (Örn: 2.0 dk / soru)
  const [minutesPerQuestion, setMinutesPerQuestion] = useState(() => {
    const saved = localStorage.getItem('study_min_per_q');
    return saved ? Number(saved) : 2.0;
  });

  // Hedef ve Çözülen Sayısı
  const [targetGoalCount, setTargetGoalCount] = useState(() => {
    const saved = localStorage.getItem('study_target_goal');
    return saved ? Number(saved) : 12;
  });

  const [targetInputVal, setTargetInputVal] = useState(() => {
    const saved = localStorage.getItem('study_target_goal');
    return saved ? String(saved) : '12';
  });

  const [currentProgressCount, setCurrentProgressCount] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_progress_${todayKey}`);
    return saved ? Number(saved) : 0;
  });

  // 🎯 Yeni Hedef Belirleme & Çözülen Sayısını Otomatik Sıfırlama
  const handleSetNewTargetGoal = (newGoalCount, resetProgress = true) => {
    const validGoal = Math.max(1, Math.min(500, Number(newGoalCount) || 12));
    setTargetGoalCount(validGoal);
    setTargetInputVal(String(validGoal));
    localStorage.setItem('study_target_goal', String(validGoal));

    if (resetProgress && !isRunning && sessionElapsedSeconds === 0) {
      setCurrentProgressCount(0);
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`study_progress_${todayKey}`, '0');
      setSessionElapsedSeconds(0);
      setStopwatchSeconds(0);
    }

    if (!isRunning && sessionElapsedSeconds === 0) {
      setTimeLeft(Math.max(5, Math.round(validGoal * minutesPerQuestion)) * 60);
    }
  };

  // 🔄 Çözülen Soru Sayısını Sıfırlama
  const handleResetProgressCount = () => {
    setCurrentProgressCount(0);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_progress_${todayKey}`, '0');
    if (!isRunning && sessionElapsedSeconds === 0) {
      setSessionElapsedSeconds(0);
      setStopwatchSeconds(0);
    }
  };

  // Hesaplanan Soru Süre Bütçesi
  const calculatedQuestionBudgetMinutes = useMemo(() => {
    return Math.max(5, Math.round(targetGoalCount * minutesPerQuestion));
  }, [targetGoalCount, minutesPerQuestion]);

  // Durations (Tek Mola Sistemi: Odak & Mola)
  const [durations, setDurations] = useState(() => {
    const saved = localStorage.getItem('study_durations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          pomodoro: parsed.pomodoro || 25,
          shortBreak: parsed.shortBreak || parsed.breakTime || 10
        };
      } catch (e) {}
    }
    return { pomodoro: 25, shortBreak: 10 };
  });

  // Soru sayısı veya bütçe değiştiğinde odak süresini otomatik senkronize et
  useEffect(() => {
    setDurations(prev => {
      if (prev.pomodoro === calculatedQuestionBudgetMinutes) return prev;
      return { ...prev, pomodoro: calculatedQuestionBudgetMinutes };
    });
  }, [calculatedQuestionBudgetMinutes]);

  const [focusInputVal, setFocusInputVal] = useState(() => String(durations.pomodoro || 25));
  const [breakInputVal, setBreakInputVal] = useState(() => String(durations.shortBreak || 10));

  useEffect(() => {
    setFocusInputVal(String(durations.pomodoro || calculatedQuestionBudgetMinutes || 25));
  }, [durations.pomodoro, calculatedQuestionBudgetMinutes]);

  useEffect(() => {
    setBreakInputVal(String(durations.shortBreak || 10));
  }, [durations.shortBreak]);

  const handleAdjustFocus = (delta) => {
    const current = Number(durations.pomodoro) || calculatedQuestionBudgetMinutes || 25;
    const newVal = Math.min(180, Math.max(1, current + delta));
    setDurations(p => ({ ...p, pomodoro: newVal }));
    setFocusInputVal(String(newVal));
    const newGoal = Math.max(1, Math.round(newVal / minutesPerQuestion));
    setTargetGoalCount(newGoal);
    setTargetInputVal(String(newGoal));
    if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
      setTimeLeft(newVal * 60);
    }
  };

  const handleSetFocusPreset = (minutes) => {
    const val = Math.min(180, Math.max(1, minutes));
    setDurations(p => ({ ...p, pomodoro: val }));
    setFocusInputVal(String(val));
    const newGoal = Math.max(1, Math.round(val / minutesPerQuestion));
    setTargetGoalCount(newGoal);
    setTargetInputVal(String(newGoal));
    if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
      setTimeLeft(val * 60);
    }
  };

  const handleFocusInputChange = (rawStr) => {
    const clean = rawStr.replace(/[^0-9]/g, '');
    setFocusInputVal(clean);
    if (clean && Number(clean) >= 1) {
      const val = Math.min(180, Number(clean));
      setDurations(p => ({ ...p, pomodoro: val }));
      const newGoal = Math.max(1, Math.round(val / minutesPerQuestion));
      setTargetGoalCount(newGoal);
      setTargetInputVal(String(newGoal));
      if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
        setTimeLeft(val * 60);
      }
    }
  };

  const handleFocusInputBlur = () => {
    if (!focusInputVal || Number(focusInputVal) < 1) {
      const fallback = Math.max(1, Number(durations.pomodoro) || calculatedQuestionBudgetMinutes || 25);
      setFocusInputVal(String(fallback));
      setDurations(p => ({ ...p, pomodoro: fallback }));
    } else {
      const clamped = Math.min(180, Math.max(1, Number(focusInputVal)));
      setFocusInputVal(String(clamped));
      setDurations(p => ({ ...p, pomodoro: clamped }));
    }
  };

  const handleAdjustBreak = (delta) => {
    const current = Number(durations.shortBreak) || 10;
    const newVal = Math.min(90, Math.max(1, current + delta));
    setDurations(p => ({ ...p, shortBreak: newVal, breakTime: newVal }));
    setBreakInputVal(String(newVal));
    if (!isRunning && activeStudyMode === 'break') {
      setTimeLeft(newVal * 60);
    }
  };

  const handleSetBreakPreset = (minutes) => {
    const val = Math.min(90, Math.max(1, minutes));
    setDurations(p => ({ ...p, shortBreak: val, breakTime: val }));
    setBreakInputVal(String(val));
    if (!isRunning && activeStudyMode === 'break') {
      setTimeLeft(val * 60);
    }
  };

  const handleBreakInputChange = (rawStr) => {
    const clean = rawStr.replace(/[^0-9]/g, '');
    setBreakInputVal(clean);
    if (clean && Number(clean) >= 1) {
      const val = Math.min(90, Number(clean));
      setDurations(p => ({ ...p, shortBreak: val, breakTime: val }));
      if (!isRunning && activeStudyMode === 'break') {
        setTimeLeft(val * 60);
      }
    }
  };

  const handleBreakInputBlur = () => {
    if (!breakInputVal || Number(breakInputVal) < 1) {
      const fallback = Math.max(1, Number(durations.shortBreak) || 10);
      setBreakInputVal(String(fallback));
      setDurations(p => ({ ...p, shortBreak: fallback, breakTime: fallback }));
    } else {
      const clamped = Math.min(90, Math.max(1, Number(breakInputVal)));
      setBreakInputVal(String(clamped));
      setDurations(p => ({ ...p, shortBreak: clamped, breakTime: clamped }));
    }
  };

  // Dinamik Zaman Sayacı
  const [timeLeft, setTimeLeft] = useState(() => {
    const initMode = localStorage.getItem('study_master_mode') || 'question';
    if (initMode === 'question') {
      const savedGoal = Number(localStorage.getItem('study_target_goal')) || 12;
      const savedMin = Number(localStorage.getItem('study_min_per_q')) || 2.0;
      return Math.max(5, Math.round(savedGoal * savedMin)) * 60;
    }
    return 25 * 60;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  // ⏸️ Seans Başı Maksimum Duraklatma Hakkı Sınırı (Süreye Göre Otomatik Artan/Azalan Dinamik Ölçek)
  const [pauseLimitMode, setPauseLimitMode] = useState(() => {
    const s = localStorage.getItem('study_pause_limit_mode');
    return s || 'auto';
  });

  const currentSessionMinutes = useMemo(() => {
    if (activeStudyMode === 'question') {
      return Number(durations.pomodoro || calculatedQuestionBudgetMinutes) || 25;
    }
    if (activeStudyMode === 'study') {
      return Number(durations.pomodoro) || 25;
    }
    if (activeStudyMode === 'book') {
      return 25;
    }
    if (activeStudyMode === 'break') {
      return Number(durations.shortBreak || 10);
    }
    return 25;
  }, [activeStudyMode, durations.pomodoro, durations.shortBreak, calculatedQuestionBudgetMinutes]);

  const calculateDynamicMaxPauses = (mins) => {
    if (mins <= 15) return 1;       // 1 - 15 dk: 1 hak
    if (mins <= 30) return 2;       // 16 - 30 dk: 2 hak (Örn: 25 dk Pomodoro)
    if (mins <= 45) return 3;       // 31 - 45 dk: 3 hak (Örn: 42 dk soru)
    if (mins <= 65) return 4;       // 46 - 65 dk: 4 hak (Örn: 60 dk ders)
    if (mins <= 90) return 5;       // 66 - 90 dk: 5 hak
    return Math.min(8, Math.floor(mins / 15)); // 90+ dk: her 15 dk için 1 hak
  };

  const maxPauses = useMemo(() => {
    if (pauseLimitMode !== 'auto') {
      const num = Number(pauseLimitMode);
      if (!isNaN(num) && num > 0) return num;
    }
    return calculateDynamicMaxPauses(currentSessionMinutes);
  }, [pauseLimitMode, currentSessionMinutes]);

  const [pauseCount, setPauseCount] = useState(0);
  const [pauseWarningToast, setPauseWarningToast] = useState(null);

  const remainingPauses = Math.max(0, maxPauses - pauseCount);

  const handleToggleRunning = () => {
    if (!isRunning) {
      setIsRunning(true);
      setPauseWarningToast(null);
    } else {
      if (remainingPauses <= 0) {
        setPauseWarningToast(`🚫 Bu seansta duraklatma hakkınız doldu (${maxPauses}/${maxPauses} kullanıldı). Odaklanmanızı korumak için lütfen seansı tamamlayın!`);
        setTimeout(() => {
          setPauseWarningToast(null);
        }, 4000);
        return;
      }
      setPauseCount(c => c + 1);
      setIsRunning(false);
    }
  };

  // 🌟 SADECE BU KARTI TAM EKRAN (ZEN ODAK MODU) YAPMA STATE'İ
  const [isCardFullscreen, setIsCardFullscreen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('system');
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Bonus Mola Kutlama Modalı
  const [earnedBonusModal, setEarnedBonusModal] = useState(null);

  // ── 🌟 EKRAN KAPANMAMA (WAKE LOCK) SİSTEMİ ──
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef(null);

  // Soru Başı Hatırlatıcı Bildirim Sesi (Örn: her 2 dakikada bir küçük yumuşak zil)
  const [questionChimeEnabled, setQuestionChimeEnabled] = useState(() => {
    const saved = localStorage.getItem('study_question_chime_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Ekran Kapanmama (Wake Lock API) Otomatik Yönetimi
  useEffect(() => {
    let isSubscribed = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isRunning) {
        try {
          if (!wakeLockRef.current) {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            if (isSubscribed) setWakeLockActive(true);
            wakeLockRef.current.addEventListener('release', () => {
              if (isSubscribed) setWakeLockActive(false);
              wakeLockRef.current = null;
            });
          }
        } catch (err) {
          console.warn('Wake Lock request error:', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch (err) {}
        wakeLockRef.current = null;
        if (isSubscribed) setWakeLockActive(false);
      }
    };

    if (isRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isRunning]);

  // ── 1. FOREST & BÜYÜYEN AĞAÇ SİSTEMİ ──
  const [plantedForest, setPlantedForest] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_forest_${todayKey}`);
    return saved ? JSON.parse(saved) : [];
  });

  // ── 6. GÜNLÜK ÇALIŞMA SERİSİ (STREAK ATEŞİ) & ROZETLER ──
  const [streakData, setStreakData] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('study_streak_info');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {}
    }
    return { currentStreak: 1, lastStudyDate: todayKey };
  });

  // ToDo Checklist & Scratchpad Notes
  const [todoList, setTodoList] = useState(() => {
    const saved = localStorage.getItem('study_todolist');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Konu özetini gözden geçir', done: false },
      { id: '2', text: 'Hedef test sorularını çöz', done: false },
      { id: '3', text: 'Yanlış yapılan soruları incele', done: false }
    ];
  });
  const [newTodoText, setNewTodoText] = useState('');
  const [scratchNotes, setScratchNotes] = useState(() => localStorage.getItem('study_scratch_notes') || '');

  // Ambient Sound volumes
  const [soundVolumes, setSoundVolumes] = useState({
    rain: 0,
    waves: 0,
    binaural: 0,
    fire: 0,
    whitenoise: 0
  });

  // Daily Stats
  const [dailyStats, setDailyStats] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_stats_${todayKey}`);
    return saved ? JSON.parse(saved) : { totalMinutes: 0, pomodorosDone: 0, questionsDone: 0 };
  });

  // Refs
  const timerRef = useRef(null);
  const stopwatchRef = useRef(null);
  const containerRef = useRef(null);

  const themeObj = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveQuoteIndex(prev => (prev + 1) % FOCUS_QUOTES.length);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('study_master_mode', activeStudyMode);
  }, [activeStudyMode]);

  useEffect(() => {
    localStorage.setItem('study_durations', JSON.stringify(durations));
  }, [durations]);

  useEffect(() => {
    localStorage.setItem('study_min_per_q', String(minutesPerQuestion));
  }, [minutesPerQuestion]);

  useEffect(() => {
    localStorage.setItem('study_target_goal', String(targetGoalCount));
  }, [targetGoalCount]);

  useEffect(() => {
    localStorage.setItem('study_todolist', JSON.stringify(todoList));
  }, [todoList]);

  useEffect(() => {
    localStorage.setItem('study_scratch_notes', scratchNotes);
  }, [scratchNotes]);

  useEffect(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_progress_${todayKey}`, String(currentProgressCount));
  }, [currentProgressCount]);

  // ── 📚 DERS İSTATİSTİĞİ KAYDI & SEÇİMİ ──
  const recordSubjectStudy = (subject, questionsCount, elapsedSec) => {
    if (!subject || questionsCount <= 0 || elapsedSec < 10) return;
    setSubjectStats(prev => {
      const existing = prev[subject] || { totalQuestions: 0, totalSeconds: 0, sessionCount: 0 };
      const updated = {
        ...prev,
        [subject]: {
          totalQuestions: (existing.totalQuestions || 0) + questionsCount,
          totalSeconds: (existing.totalSeconds || 0) + elapsedSec,
          sessionCount: (existing.sessionCount || 0) + 1,
          lastSessionSecPerQ: Math.round(elapsedSec / questionsCount),
          lastUpdated: new Date().toISOString()
        }
      };
      localStorage.setItem('study_subject_stats', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectSubject = (subjId) => {
    setSelectedSubject(subjId);
    localStorage.setItem('study_selected_subject', subjId);
    const subjObj = STUDY_SUBJECTS.find(s => s.id === subjId);
    const stat = subjectStats[subjId];
    let recommendedMin = subjObj ? subjObj.defaultMinPerQ : 1.5;
    if (stat && stat.totalQuestions >= 3 && stat.totalSeconds > 0) {
      recommendedMin = +(stat.totalSeconds / stat.totalQuestions / 60).toFixed(1);
    }
    setMinutesPerQuestion(recommendedMin);

    // Sadece sayaç çalışmıyorken çözülen sayısını ve süreyi güncelle
    if (!isRunning && sessionElapsedSeconds === 0) {
      handleResetProgressCount();
      setTimeLeft(Math.max(5, Math.round(targetGoalCount * recommendedMin)) * 60);
    }
  };

  const clearSubjectStats = (subjectKey = null) => {
    if (subjectKey) {
      setSubjectStats(prev => {
        const next = { ...prev };
        delete next[subjectKey];
        localStorage.setItem('study_subject_stats', JSON.stringify(next));
        return next;
      });
    } else {
      setSubjectStats({});
      localStorage.removeItem('study_subject_stats');
    }
  };

  // Persist Daily Stats & Streak
  const saveDailyStats = (updated) => {
    setDailyStats(updated);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_stats_${todayKey}`, JSON.stringify(updated));
    updateStreak();
  };

  const updateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('study_streak_info');
    let data = { currentStreak: 1, lastStudyDate: today };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lastStudyDate === today) {
          data = parsed;
        } else {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (parsed.lastStudyDate === yesterday) {
            data = { currentStreak: (parsed.currentStreak || 1) + 1, lastStudyDate: today };
          } else {
            data = { currentStreak: 1, lastStudyDate: today };
          }
        }
      } catch (e) {}
    }

    setStreakData(data);
    localStorage.setItem('study_streak_info', JSON.stringify(data));
  };

  // Sound handlers
  const handleVolumeChange = (type, val) => {
    const num = Number(val);
    setSoundVolumes(prev => ({ ...prev, [type]: num }));
    ambientAudio.setSoundVolume(type, num / 100);
  };

  const handleMuteAll = () => {
    const isAnyActive = Object.values(soundVolumes).some(v => v > 0);
    if (isAnyActive) {
      setSoundVolumes({ rain: 0, waves: 0, binaural: 0, fire: 0, whitenoise: 0 });
      ambientAudio.stopAll();
    } else {
      handleVolumeChange('rain', 40);
      handleVolumeChange('binaural', 30);
    }
  };

  useEffect(() => {
    return () => {
      ambientAudio.stopAll();
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, []);

  // Timer Tick
  useEffect(() => {
    if (activeStudyMode === 'stopwatch') {
      if (isRunning) {
        stopwatchRef.current = setInterval(() => {
          setStopwatchSeconds(prev => {
            const next = prev + 1;
            setSessionElapsedSeconds(e => e + 1);
            if (next % 60 === 0) {
              saveDailyStats({
                ...dailyStats,
                totalMinutes: dailyStats.totalMinutes + 1
              });
            }
            return next;
          });
        }, 1000);
      } else {
        clearInterval(stopwatchRef.current);
      }
      return () => clearInterval(stopwatchRef.current);
    }

    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          setSessionElapsedSeconds(e => {
            const nextElapsed = e + 1;
            // 🔔 Soru Başı Bütçe Süresi Hatırlatması (Örn: her 2 dakikada bir çok hafif yumuşak bildirim sesi)
            if (activeStudyMode === 'question' && questionChimeEnabled && minutesPerQuestion > 0) {
              const intervalSec = Math.round(minutesPerQuestion * 60);
              if (intervalSec > 0 && nextElapsed % intervalSec === 0) {
                ambientAudio.playSoftDing();
              }
            }
            return nextElapsed;
          });

          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          if (activeStudyMode !== 'break' && prev % 60 === 0) {
            saveDailyStats({
              ...dailyStats,
              totalMinutes: dailyStats.totalMinutes + 1
            });
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, activeStudyMode, dailyStats, questionChimeEnabled, minutesPerQuestion]);

  // Seans Tamamlama & Ağaç Dikme Mantığı
  const handleTimerComplete = () => {
    ambientAudio.playChime();

    if (activeStudyMode !== 'break') {
      const newCycles = completedCycles + 1;
      setCompletedCycles(newCycles);

      const elapsedSec = sessionElapsedSeconds > 0 ? sessionElapsedSeconds : (totalModeSeconds - timeLeft);

      // Soru modunda ders istatistiğini kaydet
      if (activeStudyMode === 'question' && currentProgressCount > 0) {
        recordSubjectStudy(selectedSubject, currentProgressCount, elapsedSec);
      }

      const randomTree = TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)];
      const modeLabel = activeStudyMode === 'question'
        ? `${currentProgressCount} Soru (${selectedSubject})`
        : activeStudyMode === 'book'
          ? `${currentProgressCount} Sayfa`
          : 'Konu Çalışması';
      const newTreeItem = {
        id: String(Date.now()),
        icon: randomTree.icon,
        name: randomTree.name,
        task: modeLabel,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        duration: Math.max(1, Math.round(elapsedSec / 60))
      };

      const updatedForest = [...plantedForest, newTreeItem];
      setPlantedForest(updatedForest);

      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`study_forest_${todayKey}`, JSON.stringify(updatedForest));

      saveDailyStats({
        ...dailyStats,
        totalMinutes: dailyStats.totalMinutes + Math.max(1, Math.round(elapsedSec / 60)),
        pomodorosDone: dailyStats.pomodorosDone + 1,
        questionsDone: dailyStats.questionsDone + (activeStudyMode === 'question' ? currentProgressCount : 0)
      });

      // Mola moduna geçiş yap (Tek mola sistemi)
      setActiveStudyMode('break');
      const baseBreak = Number(durations.shortBreak || durations.breakTime) || 10;
      setTimeLeft(baseBreak * 60);
      setSessionElapsedSeconds(0);
      setPauseCount(0);
      setPauseWarningToast(null);
    } else {
      // Mola bitti, soru veya konu moduna dön
      setActiveStudyMode('question');
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
      setSessionElapsedSeconds(0);
      setPauseCount(0);
      setPauseWarningToast(null);
    }
  };

  // Birleşik Mod Değiştirici
  const handleSwitchMasterMode = (mode) => {
    if (mode === activeStudyMode) return;

    const studyModes = ['question', 'book', 'study'];
    const isCurrentStudy = studyModes.includes(activeStudyMode);
    const isTargetStudy = studyModes.includes(mode);

    // Eğer çalışma modları (Soru, Kitap, Konu) arasında geçiş yapılıyorsa ve sayaç başlamışsa (çalışıyor veya süre ilerlemişse)
    // Sayacı sıfırlama, kaldığı yerden devam ettir!
    if (isCurrentStudy && isTargetStudy && (isRunning || sessionElapsedSeconds > 0)) {
      setActiveStudyMode(mode);
      localStorage.setItem('study_master_mode', mode);
      return;
    }

    // Mola veya ilk kez başlatılmamış durumdaki geçişler
    setIsRunning(false);
    setActiveStudyMode(mode);
    localStorage.setItem('study_master_mode', mode);
    setSessionElapsedSeconds(0);
    setPauseCount(0);
    setPauseWarningToast(null);

    if (mode === 'question') {
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
    } else if (mode === 'book') {
      setTimeLeft(25 * 60);
    } else if (mode === 'study') {
      setTimeLeft((durations.pomodoro || calculatedQuestionBudgetMinutes || 25) * 60);
    } else if (mode === 'break') {
      const baseBreak = Number(durations.shortBreak || durations.breakTime) || 10;
      setTimeLeft(baseBreak * 60);
    } else if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSessionElapsedSeconds(0);
    setPauseCount(0);
    setPauseWarningToast(null);
    if (activeStudyMode === 'question') {
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
    } else if (activeStudyMode === 'book') {
      setTimeLeft(25 * 60);
    } else if (activeStudyMode === 'study') {
      setTimeLeft((durations.pomodoro || calculatedQuestionBudgetMinutes || 25) * 60);
    } else if (activeStudyMode === 'break') {
      const baseBreak = Number(durations.shortBreak || durations.breakTime) || 10;
      setTimeLeft(baseBreak * 60);
    } else if (activeStudyMode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Toplam Mod Süresi
  const baseBreakMinutes = Number(durations.shortBreak || durations.breakTime) || 10;
  const totalModeSeconds = activeStudyMode === 'question'
    ? calculatedQuestionBudgetMinutes * 60
    : activeStudyMode === 'book'
      ? 25 * 60
      : activeStudyMode === 'study'
        ? (durations.pomodoro || calculatedQuestionBudgetMinutes || 25) * 60
        : baseBreakMinutes * 60;

  const progressPct = activeStudyMode === 'stopwatch'
    ? Math.min(100, (stopwatchSeconds % 3600) / 36)
    : Math.max(0, Math.min(100, ((totalModeSeconds - timeLeft) / totalModeSeconds) * 100));

  // Canlı Ağaç Büyüme Aşaması
  const treeGrowthStage = useMemo(() => {
    if (activeStudyMode === 'break') return { icon: '🍃', label: 'Dinlenme', desc: 'Mola Vakti' };
    if (!isRunning && progressPct === 0) return { icon: '🌱', label: 'Tohum', desc: 'Başlatınca büyüyecek' };
    if (progressPct < 25) return { icon: '🌱', label: 'Filizleniyor', desc: 'Kök salıyor...' };
    if (progressPct < 55) return { icon: '🌿', label: 'Fidan Büyüyor', desc: 'Gelişiyor...' };
    if (progressPct < 85) return { icon: '🌳', label: 'Genç Ağaç', desc: 'Yaprak açıyor...' };
    return { icon: '🌸', label: 'Çiçek Açan Ağaç', desc: 'Neredeyse tamam!' };
  }, [progressPct, activeStudyMode, isRunning]);

  // Dinamik Hedef Yüzdesi
  const targetProgressPct = Math.min(100, Math.round((currentProgressCount / Math.max(1, targetGoalCount)) * 100));

  const handleIncrementProgress = (amount) => {
    const nextVal = Math.max(0, currentProgressCount + amount);
    setCurrentProgressCount(nextVal);
    if (nextVal >= targetGoalCount && currentProgressCount < targetGoalCount) {
      ambientAudio.playChime();
    }
  };

  // ⚡ Soru Çözümünde "Testi Erken Bitir & Mola Kazan" Mantığı
  const handleFinishEarlyAndRewardBreak = () => {
    setIsRunning(false);
    ambientAudio.playChime();

    const budgetSec = calculatedQuestionBudgetMinutes * 60;
    const elapsedSec = sessionElapsedSeconds > 0 ? sessionElapsedSeconds : (totalModeSeconds - timeLeft);
    const savedSeconds = Math.max(0, budgetSec - elapsedSec);
    const bonusMinutes = Math.floor(savedSeconds / 60);

    const standardBreak = Number(durations.shortBreak || durations.breakTime) || 10;
    const finalBreakDuration = standardBreak + bonusMinutes;

    const randomTree = TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)];
    const newTreeItem = {
      id: String(Date.now()),
      icon: randomTree.icon,
      name: randomTree.name,
      task: `⚡ Hızlı Test: ${currentProgressCount} Soru (${bonusMinutes} dk erken bitirme)`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      duration: Math.max(1, Math.round(elapsedSec / 60))
    };

    const updatedForest = [...plantedForest, newTreeItem];
    setPlantedForest(updatedForest);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_forest_${todayKey}`, JSON.stringify(updatedForest));

    saveDailyStats({
      ...dailyStats,
      totalMinutes: dailyStats.totalMinutes + Math.max(1, Math.round(elapsedSec / 60)),
      pomodorosDone: dailyStats.pomodorosDone + 1,
      questionsDone: dailyStats.questionsDone + currentProgressCount
    });

    // Soru modunda ders istatistiğini kaydet
    if (currentProgressCount > 0 && elapsedSec >= 10) {
      recordSubjectStudy(selectedSubject, currentProgressCount, elapsedSec);
    }

    setActiveStudyMode('break');
    setTimeLeft(finalBreakDuration * 60);
    setSessionElapsedSeconds(0);

    setEarnedBonusModal({
      subject: selectedSubject,
      questionsDone: currentProgressCount,
      elapsedMinutes: Math.max(1, Math.round(elapsedSec / 60)),
      budgetMinutes: calculatedQuestionBudgetMinutes,
      bonusMinutes,
      totalBreakMinutes: finalBreakDuration
    });
  };

  // Canlı Seans ve Soru Başı Hız Hesabı
  const currentElapsedSec = sessionElapsedSeconds > 0
    ? sessionElapsedSeconds
    : (activeStudyMode === 'stopwatch' ? stopwatchSeconds : (totalModeSeconds - timeLeft));

  const liveSessionSecPerQ = (activeStudyMode === 'question' && currentProgressCount > 0 && currentElapsedSec > 0)
    ? Math.round(currentElapsedSec / currentProgressCount)
    : 0;

  // ── 📊 DERS BAZLI HIZ İSTATİSTİKLERİ ÖZETİ & HESAPLAMALARI ──
  const trackedSubjectsList = useMemo(() => {
    return STUDY_SUBJECTS.map(subj => {
      const st = subjectStats[subj.id];
      const hasData = st && st.totalQuestions > 0 && st.totalSeconds > 0;
      const avgSec = hasData ? Math.round(st.totalSeconds / st.totalQuestions) : 0;
      const evaluation = getSpeedEvaluation(avgSec, subj.defaultMinPerQ);
      return {
        ...subj,
        totalQuestions: st?.totalQuestions || 0,
        totalSeconds: st?.totalSeconds || 0,
        sessionCount: st?.sessionCount || 0,
        lastSessionSecPerQ: st?.lastSessionSecPerQ || 0,
        hasData,
        avgSec,
        evaluation
      };
    });
  }, [subjectStats]);

  const activeTrackedCount = trackedSubjectsList.filter(s => s.hasData).length;

  const totalTrackedQuestions = useMemo(() => {
    return Object.values(subjectStats).reduce((acc, s) => acc + (s.totalQuestions || 0), 0);
  }, [subjectStats]);

  const totalTrackedSeconds = useMemo(() => {
    return Object.values(subjectStats).reduce((acc, s) => acc + (s.totalSeconds || 0), 0);
  }, [subjectStats]);

  const overallAvgSecPerQ = totalTrackedQuestions > 0 ? Math.round(totalTrackedSeconds / totalTrackedQuestions) : 0;

  const fastestSubject = useMemo(() => {
    const withData = trackedSubjectsList.filter(s => s.hasData && s.avgSec > 0);
    if (withData.length === 0) return null;
    return [...withData].sort((a, b) => a.avgSec - b.avgSec)[0];
  }, [trackedSubjectsList]);

  const slowestSubject = useMemo(() => {
    const withData = trackedSubjectsList.filter(s => s.hasData && s.avgSec > 0);
    if (withData.length === 0) return null;
    return [...withData].sort((a, b) => b.avgSec - a.avgSec)[0];
  }, [trackedSubjectsList]);

  const loadDemoSubjectStats = () => {
    const demo = {
      'Matematik': { totalQuestions: 40, totalSeconds: 5040, sessionCount: 3, lastSessionSecPerQ: 126 },
      'Fen Bilimleri': { totalQuestions: 35, totalSeconds: 3150, sessionCount: 2, lastSessionSecPerQ: 90 },
      'Türkçe': { totalQuestions: 45, totalSeconds: 3105, sessionCount: 3, lastSessionSecPerQ: 69 },
      'T.C. İnkılap Tarihi': { totalQuestions: 25, totalSeconds: 1200, sessionCount: 2, lastSessionSecPerQ: 48 }
    };
    setSubjectStats(demo);
    localStorage.setItem('study_subject_stats', JSON.stringify(demo));
  };

  const currentSubjectObj = STUDY_SUBJECTS.find(s => s.id === selectedSubject) || STUDY_SUBJECTS[0];
  const currentSubjectStat = subjectStats[selectedSubject] || null;
  const currentSubjectAvgSec = (currentSubjectStat && currentSubjectStat.totalQuestions > 0)
    ? Math.round(currentSubjectStat.totalSeconds / currentSubjectStat.totalQuestions)
    : Math.round(currentSubjectObj.defaultMinPerQ * 60);

  // Kartın içindeki render bileşeni (Normal ve Fullscreen için ortak)
  const renderMasterStationContent = (isFullscreenView = false) => (
    <div style={{
      width: '100%',
      maxWidth: isFullscreenView ? 1040 : '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: isFullscreenView ? 22 : 18
    }}>
      {/* 1. ÜST MOD SWITCHER BARI + ZEN BUTONU */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="sr-timer-modes" style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          background: themeObj.innerBg,
          padding: 5,
          borderRadius: 18,
          border: `1.5px solid ${themeObj.border}`
        }}>
          {[
            { id: 'question', label: '✏️ Soru Çözümü', sub: `${calculatedQuestionBudgetMinutes} dk` },
            { id: 'book', label: '📖 Kitap Okuma', sub: 'Sayfa Kotası' },
            { id: 'study', label: '🎯 Konu Çalışma', sub: `${durations.pomodoro || calculatedQuestionBudgetMinutes} dk` },
            { id: 'break', label: '☕ Mola', sub: `${durations.shortBreak || 10} dk` }
          ].map(m => {
            const isSelected = activeStudyMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSwitchMasterMode(m.id)}
                className="sr-timer-mode-btn"
                style={{
                  padding: isFullscreenView ? '0.75rem 0.6rem' : '0.6rem 0.5rem',
                  borderRadius: 14,
                  border: 'none',
                  fontWeight: 900,
                  fontSize: isFullscreenView ? '0.86rem' : '0.78rem',
                  cursor: 'pointer',
                  background: isSelected
                    ? (m.id === 'question' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : m.id === 'book' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : m.id === 'study' ? 'linear-gradient(135deg, #10b981, #059669)' : themeObj.accent)
                    : 'transparent',
                  color: isSelected ? '#ffffff' : themeObj.text,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  boxShadow: isSelected ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{m.label}</span>
                <span style={{ fontSize: isFullscreenView ? '0.7rem' : '0.64rem', opacity: isSelected ? 0.95 : 0.65 }}>{m.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Seçili Görev Bilgisi (Yalnızca Programdan bir görev aktarılmışsa gösterilir) */}
        {selectedTask && (
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                border: `1.5px solid #60a5fa`,
                color: '#ffffff',
                borderRadius: '16px 0 0 16px',
                padding: isFullscreenView ? '0.85rem 1.1rem' : '0.75rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: isFullscreenView ? '0.84rem' : '0.78rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 16px rgba(59,130,246,0.35)'
              }}
              title={selectedTask.title || selectedTask.topic}
            >
              <BookMarked size={17} color="#ffffff" />
              <span>{selectedTask.sourceType === 'program' ? '📅 Program Görevi' : selectedTask.sourceType === 'bookTest' ? '📚 Kitap Testi' : '📝 Ödev'}</span>
            </div>
            <button
              onClick={handleClearSelectedTask}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                border: `1.5px solid #60a5fa`,
                borderLeft: 'none',
                color: '#ffffff',
                borderRadius: '0 16px 16px 0',
                padding: isFullscreenView ? '0.85rem 0.65rem' : '0.75rem 0.55rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s'
              }}
              title="Seçili görevi kaldır"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Haftalık Ders Programına Doğrudan Gitme Butonu */}
        <button
          onClick={() => navigate('/student/program')}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            color: '#ffffff',
            borderRadius: 16,
            padding: isFullscreenView ? '0.85rem 1.1rem' : '0.75rem 0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: isFullscreenView ? '0.84rem' : '0.78rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            transition: 'all 0.15s'
          }}
          title="Haftalık ders programı sayfasına git ve oradan doğrudan görev seçip başlat"
        >
          <Calendar size={17} />
          <span>📅 Program Sayfası</span>
        </button>

        {/* Zen Tam Ekran Butonu */}
        <button
          onClick={() => setIsCardFullscreen(!isCardFullscreen)}
          style={{
            background: isCardFullscreen ? themeObj.accent : themeObj.buttonBg,
            border: `1.5px solid ${themeObj.border}`,
            color: isCardFullscreen ? 'white' : themeObj.text,
            borderRadius: 16,
            padding: isFullscreenView ? '0.85rem 1.1rem' : '0.75rem 0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: isFullscreenView ? '0.84rem' : '0.78rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
            boxShadow: isCardFullscreen ? '0 6px 16px rgba(0,0,0,0.25)' : 'none',
            transition: 'all 0.15s'
          }}
          title={isCardFullscreen ? "Normal Ekrana Dön" : "Geniş Zen Odak Moduna Geç"}
        >
          {isCardFullscreen ? <Shrink size={18} /> : <Expand size={18} />}
          <span>{isCardFullscreen ? 'Küçült' : 'Zen Odak'}</span>
        </button>
      </div>

      {/* 2. MASAÜSTÜ GENİŞ 2 SÜTUNLU ANA İÇERİK IZGARASI */}
      <div className={isFullscreenView ? "sr-zen-grid" : "sr-card-body-grid"}>

        {/* ── SOL BÖLÜM: BÜYÜK SAYAÇ HALKASI + CANLI HIZ + ANA KONTROLLER ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: themeObj.innerBg,
          borderRadius: 24,
          padding: isFullscreenView ? '2rem 1.5rem' : '1.5rem 1.25rem',
          border: `1.5px solid ${themeObj.border}`,
          position: 'relative'
        }}>
          {/* SVG Timer Ring */}
          <div style={{
            position: 'relative',
            width: isFullscreenView ? 300 : 250,
            height: isFullscreenView ? 300 : 250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width={isFullscreenView ? 300 : 250} height={isFullscreenView ? 300 : 250} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
              <circle
                cx={isFullscreenView ? 150 : 125}
                cy={isFullscreenView ? 150 : 125}
                r={isFullscreenView ? 132 : 108}
                stroke={themeObj.isDark ? 'rgba(255,255,255,0.08)' : 'var(--color-border, #e2e8f0)'}
                strokeWidth={isFullscreenView ? 13 : 10}
                fill="transparent"
              />
              <circle
                cx={isFullscreenView ? 150 : 125}
                cy={isFullscreenView ? 150 : 125}
                r={isFullscreenView ? 132 : 108}
                stroke={activeStudyMode === 'question' ? '#f59e0b' : activeStudyMode === 'book' ? '#6366f1' : activeStudyMode === 'break' ? '#38bdf8' : '#10b981'}
                strokeWidth={isFullscreenView ? 13 : 10}
                fill="transparent"
                strokeDasharray={2 * Math.PI * (isFullscreenView ? 132 : 108)}
                strokeDashoffset={2 * Math.PI * (isFullscreenView ? 132 : 108) * (1 - progressPct / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>

            <div style={{ textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {/* Büyüyen Ağaç Simgesi */}
              <div className={isRunning ? "sr-tree-pulse" : ""} style={{ fontSize: isFullscreenView ? '3rem' : '2.2rem', marginBottom: 2 }}>
                {treeGrowthStage.icon}
              </div>

              <div className="sr-timer-digits" style={{
                fontSize: isFullscreenView ? '4.5rem' : '3.4rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: themeObj.text,
                textShadow: themeObj.isDark ? `0 4px 24px ${themeObj.accent}99` : 'none'
              }}>
                {activeStudyMode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(timeLeft)}
              </div>

              {/* Soru / Sayfa Kotası Canlı Göstergesi */}
              {(activeStudyMode === 'question' || activeStudyMode === 'book') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: 6 }}>
                  <div style={{
                    fontSize: isFullscreenView ? '1.05rem' : '0.86rem',
                    fontWeight: 900,
                    color: activeStudyMode === 'question' ? '#f59e0b' : themeObj.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 6
                  }}>
                    {activeStudyMode === 'question' && (
                      <span style={{
                        fontSize: '0.72rem',
                        background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7',
                        color: '#d97706',
                        padding: '2px 8px',
                        borderRadius: 8,
                        fontWeight: 900
                      }}>
                        {currentSubjectObj.icon} {currentSubjectObj.name.split(' ')[0]}
                      </span>
                    )}
                    <span>{currentProgressCount} / {targetGoalCount} {activeStudyMode === 'question' ? 'Soru' : 'Sayfa'}</span>
                    <span style={{ fontSize: '0.76rem', opacity: 0.8 }}>({targetProgressPct}%)</span>

                    {currentProgressCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetProgressCount}
                        title="Çözülen soru sayısını sıfırla (0)"
                        style={{
                          background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#ef4444',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <RotateCcw size={10} /> Sıfırla
                      </button>
                    )}
                  </div>

                  {/* 🎯 SEÇİLİ GÖREV / TEST ROZETİ */}
                  {selectedTask && (
                    <div
                      onClick={() => handleLaunchTaskQuiz(selectedTask)}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: '#3b82f6',
                        background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                        border: '1px solid #93c5fd',
                        borderRadius: 8,
                        padding: '2px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 2
                      }}
                      title="Görevi / testi doğrudan çözmek için tıkla"
                    >
                      <BookMarked size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTask.title}</span>
                      <ChevronRight size={12} />
                    </div>
                  )}

                  {/* CANLI HIZ GÖSTERGESİ */}
                  {activeStudyMode === 'question' && currentProgressCount > 0 && (
                    <div style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: liveSessionSecPerQ <= minutesPerQuestion * 60 ? '#10b981' : '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.1)',
                      padding: '3px 10px',
                      borderRadius: 99,
                      marginTop: 2
                    }}>
                      <Gauge size={13} />
                      <span>Canlı Hız: <strong>{formatSecToMinSec(liveSessionSecPerQ)}</strong> / soru</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  fontSize: isFullscreenView ? '0.9rem' : '0.75rem',
                  fontWeight: 800,
                  color: themeObj.subText,
                  marginTop: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {treeGrowthStage.label} · {treeGrowthStage.desc}
                </div>
              )}
            </div>
          </div>

          {/* Ana Kontroller (Başlat / Duraklat / Sıfırla / Ayarlar) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            <button
              onClick={resetTimer}
              title="Sıfırla"
              style={{
                width: isFullscreenView ? 54 : 46,
                height: isFullscreenView ? 54 : 46,
                borderRadius: 16,
                background: themeObj.buttonBg,
                border: `1.5px solid ${themeObj.border}`,
                color: themeObj.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <RotateCcw size={isFullscreenView ? 22 : 18} />
            </button>

            <button
              onClick={handleToggleRunning}
              className="sr-action-btn-main"
              style={{
                padding: isFullscreenView ? '1.1rem 3.2rem' : '0.9rem 2.5rem',
                borderRadius: 20,
                background: isRunning 
                  ? (remainingPauses === 0 ? 'linear-gradient(135deg, #64748b, #475569)' : '#ef4444') 
                  : (activeStudyMode === 'question' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)'),
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isFullscreenView ? '1.2rem' : '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: isRunning 
                  ? (remainingPauses === 0 ? '0 8px 25px rgba(100,116,139,0.35)' : '0 8px 25px rgba(239,68,68,0.45)') 
                  : '0 8px 25px rgba(245,158,11,0.4)',
                transition: 'all 0.25s ease'
              }}
            >
              {isRunning ? (
                remainingPauses === 0 ? (
                  <><Shield size={isFullscreenView ? 24 : 20} fill="white" /> Duraklatma Kilitli (0 Hak)</>
                ) : (
                  <><Pause size={isFullscreenView ? 24 : 20} fill="white" /> Duraklat ({remainingPauses} Hak)</>
                )
              ) : (
                sessionElapsedSeconds > 0 ? (
                  <><Play size={isFullscreenView ? 24 : 20} fill="white" /> Devam Et</>
                ) : (
                  <><Play size={isFullscreenView ? 24 : 20} fill="white" /> Başlat</>
                )
              )}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Ayarlar"
              style={{
                width: isFullscreenView ? 54 : 46,
                height: isFullscreenView ? 54 : 46,
                borderRadius: 16,
                background: showSettings ? themeObj.accent : themeObj.buttonBg,
                border: `1.5px solid ${themeObj.border}`,
                color: showSettings ? 'white' : themeObj.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Settings2 size={isFullscreenView ? 22 : 18} />
            </button>
          </div>

          {/* Duraklatma Hakkı Göstergesi & Uyarı */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            marginTop: 10
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.74rem',
              fontWeight: 800,
              color: themeObj.subText,
              background: themeObj.innerBg,
              padding: '0.3rem 0.85rem',
              borderRadius: 99,
              border: `1px solid ${themeObj.border}`,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <span>⏸️ Duraklatma Hakkı:</span>
              <span style={{
                padding: '1px 7px',
                borderRadius: 99,
                background: remainingPauses === 0 
                  ? 'rgba(239, 68, 68, 0.18)' 
                  : remainingPauses === 1 
                    ? 'rgba(245, 158, 11, 0.18)' 
                    : 'rgba(16, 185, 129, 0.18)',
                color: remainingPauses === 0 
                  ? '#ef4444' 
                  : remainingPauses === 1 
                    ? '#f59e0b' 
                    : '#10b981',
                fontWeight: 900
              }}>
                {remainingPauses} / {maxPauses} Kalan Hak
              </span>
              <span style={{ fontSize: '0.67rem', color: themeObj.subText, opacity: 0.85 }}>
                ({currentSessionMinutes} dk için {maxPauses} Hak)
              </span>
            </div>

            {pauseWarningToast && (
              <div style={{
                marginTop: 6,
                padding: '0.55rem 0.9rem',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                fontSize: '0.74rem',
                fontWeight: 800,
                textAlign: 'center',
                maxWidth: 360,
                lineHeight: 1.35
              }}>
                {pauseWarningToast}
              </div>
            )}
          </div>
        </div>

        {/* ── SAĞ BÖLÜM: DERS SEÇİMİ + HEDEF AYARLARI + HIZLI SORU BUTONLARI + AYARLAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Soru Çözümü için Ders Seçimi, Hedef & Soru Başı Dakika Bütçesi */}
          {activeStudyMode === 'question' && (
            <div style={{
              background: themeObj.innerBg,
              borderRadius: 20,
              padding: isFullscreenView ? '1.1rem 1.25rem' : '0.95rem 1.1rem',
              border: `1.5px solid ${themeObj.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              {/* 🎯 AKTİF SEÇİLİ GÖREV / TEST BİLGİ KARTI */}
              {selectedTask && (
                <div style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff',
                  border: '1.5px solid #3b82f6',
                  borderRadius: 14,
                  padding: '0.75rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(59,130,246,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flex: 1 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <BookMarked size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          🎯 {selectedTask.sourceLabel || 'Seçili Görev'}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(59,130,246,0.2)', color: '#2563eb', padding: '0.05rem 0.4rem', borderRadius: 6 }}>
                          {selectedTask.subject || 'Genel'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 900, color: themeObj.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedTask.title}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleLaunchTaskQuiz(selectedTask)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 900,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                        transition: 'transform 0.15s'
                      }}
                      title="Testi doğrudan çözmeye başla"
                    >
                      <PlayCircle size={14} /> {selectedTask.sourceType === 'program' ? 'Programda Başla' : 'Testi Doğrudan Çöz'}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelectedTask}
                      style={{
                        padding: '0.4rem 0.65rem',
                        background: 'transparent',
                        color: themeObj.subText,
                        border: `1px solid ${themeObj.border}`,
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Seçimi kaldır"
                    >
                      <X size={13} /> Kaldır
                    </button>
                  </div>
                </div>
              )}

              {/* Ders Seçici & Geçmiş Ortalama Rozeti */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                borderBottom: `1px dashed ${themeObj.border}`,
                paddingBottom: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={16} style={{ color: currentSubjectObj.color }} /> Ders Seçimi:
                  </span>
                  <select
                    value={selectedSubject}
                    onChange={e => handleSelectSubject(e.target.value)}
                    style={{
                      flex: 1,
                      background: themeObj.cardBg,
                      border: `1.5px solid ${themeObj.border}`,
                      color: themeObj.text,
                      borderRadius: 12,
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      padding: '0.45rem 0.75rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {STUDY_SUBJECTS.map(subj => {
                      const st = subjectStats[subj.id];
                      const hasData = st && st.totalQuestions > 0;
                      const avgLabel = hasData ? ` (${formatSecToMinSec(Math.round(st.totalSeconds / st.totalQuestions))}/s)` : '';
                      return (
                        <option key={subj.id} value={subj.id}>
                          {subj.icon} {subj.name} {avgLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Seçili Dersin Kaydedilmiş Geçmiş Ortalaması */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '0.35rem 0.7rem',
                  borderRadius: 10,
                  background: currentSubjectStat ? 'rgba(99, 102, 241, 0.14)' : themeObj.cardBg,
                  color: currentSubjectStat ? '#6366f1' : themeObj.subText,
                  border: `1px solid ${currentSubjectStat ? 'rgba(99, 102, 241, 0.3)' : themeObj.border}`,
                  whiteSpace: 'nowrap'
                }}>
                  <TrendingUp size={14} />
                  <span>
                    {currentSubjectStat && currentSubjectStat.totalQuestions > 0
                      ? `Ortalama: ${formatSecToMinSec(currentSubjectAvgSec)} / soru (${currentSubjectStat.totalQuestions} soru)`
                      : `Öneri: ${currentSubjectObj.defaultMinPerQ} dk / soru`}
                  </span>
                </div>
              </div>

              {/* Hedef Soru Sayısı & Soru Başı Bütçe */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  {/* Hedef Stepper & Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.subText }}>Hedef:</span>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: themeObj.cardBg,
                      border: `1.5px solid ${themeObj.border}`,
                      borderRadius: 12,
                      padding: '2px'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleSetNewTargetGoal(Math.max(1, targetGoalCount - 1), true)}
                        title="1 Azalt"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: 'none',
                          background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                          color: themeObj.text,
                          fontSize: '1rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={targetInputVal}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setTargetInputVal(raw);
                          if (raw && Number(raw) > 0) {
                            handleSetNewTargetGoal(Number(raw), true);
                          }
                        }}
                        onBlur={() => {
                          if (!targetInputVal || Number(targetInputVal) < 1) {
                            setTargetInputVal(String(targetGoalCount || 12));
                          }
                        }}
                        style={{
                          width: 48,
                          padding: '0.35rem 0.2rem',
                          border: 'none',
                          background: 'transparent',
                          color: themeObj.text,
                          fontSize: '0.95rem',
                          fontWeight: 900,
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSetNewTargetGoal(Math.min(500, targetGoalCount + 1), true)}
                        title="1 Arttır"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: 'none',
                          background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                          color: themeObj.text,
                          fontSize: '1rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>Soru</span>
                  </div>

                  {/* Soru Başı Dakika & Bütçe */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.76rem', color: themeObj.subText, fontWeight: 800 }}>Soru Başı:</span>
                    <select
                      value={minutesPerQuestion}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setMinutesPerQuestion(val);
                        if (!isRunning) setTimeLeft(Math.round(targetGoalCount * val) * 60);
                      }}
                      style={{
                        background: themeObj.cardBg,
                        border: `1px solid ${themeObj.border}`,
                        color: themeObj.text,
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        padding: '0.35rem 0.55rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={0.8}>0.8 dk (48 sn)</option>
                      <option value={1.0}>1.0 dk / soru</option>
                      <option value={1.25}>1.25 dk (1 dk 15 sn)</option>
                      <option value={1.5}>1.5 dk (1 dk 30 sn)</option>
                      <option value={2.0}>2.0 dk / soru</option>
                      <option value={2.5}>2.5 dk (2 dk 30 sn)</option>
                      <option value={3.0}>3.0 dk / soru</option>
                    </select>

                    <span style={{
                      background: isDark ? 'rgba(245, 158, 11, 0.22)' : '#fffbeb',
                      color: '#f59e0b',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      padding: '0.35rem 0.65rem',
                      borderRadius: 10,
                      border: '1px solid #fde68a',
                      whiteSpace: 'nowrap'
                    }}>
                      ⏱️ {calculatedQuestionBudgetMinutes} dk Bütçe
                    </span>
                  </div>
                </div>

                {/* Hızlı Hedef Çipleri */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 800 }}>Hızlı Hedef:</span>
                  {[5, 10, 15, 20, 25, 30, 40, 50].map(cnt => {
                    const isSel = targetGoalCount === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleSetNewTargetGoal(cnt, true)}
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isSel ? '#f59e0b' : themeObj.border}`,
                          background: isSel ? (isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7') : themeObj.cardBg,
                          color: isSel ? '#d97706' : themeObj.text,
                          fontSize: '0.72rem',
                          fontWeight: isSel ? 900 : 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cnt} Soru
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Kitap Okuma için Sayfa Kotası */}
          {activeStudyMode === 'book' && (
            <div style={{
              background: themeObj.innerBg,
              borderRadius: 20,
              padding: '1rem 1.25rem',
              border: `1.5px solid ${themeObj.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.subText }}>Hedef Sayfa:</span>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: themeObj.cardBg,
                  border: `1.5px solid ${themeObj.border}`,
                  borderRadius: 12,
                  padding: '2px'
                }}>
                  <button
                    type="button"
                    onClick={() => handleSetNewTargetGoal(Math.max(1, targetGoalCount - 5), true)}
                    title="5 Azalt"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: 'none',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      color: themeObj.text,
                      fontSize: '1rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={targetInputVal}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setTargetInputVal(raw);
                      if (raw && Number(raw) > 0) {
                        handleSetNewTargetGoal(Number(raw), true);
                      }
                    }}
                    onBlur={() => {
                      if (!targetInputVal || Number(targetInputVal) < 1) {
                        setTargetInputVal(String(targetGoalCount || 20));
                      }
                    }}
                    style={{
                      width: 48,
                      padding: '0.35rem 0.2rem',
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSetNewTargetGoal(Math.min(500, targetGoalCount + 5), true)}
                    title="5 Arttır"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: 'none',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                      color: themeObj.text,
                      fontSize: '1rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>Sayfa Okuma</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: themeObj.accent, fontWeight: 900 }}>📖 Sayfa Takibi Aktif</span>
            </div>
          )}

          {/* Hızlı Soru / Sayfa Butonları (+1, -1) */}
          {(activeStudyMode === 'question' || activeStudyMode === 'book') && (
            <div style={{
              background: themeObj.innerBg,
              borderRadius: 20,
              padding: '1rem',
              border: `1.5px solid ${themeObj.border}`,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 10,
              alignItems: 'center'
            }}>
              <button
                onClick={() => handleIncrementProgress(-1)}
                style={{
                  padding: isFullscreenView ? '1rem 1.6rem' : '0.85rem 1.25rem',
                  borderRadius: 14,
                  background: themeObj.buttonBg,
                  border: `1.5px solid ${themeObj.border}`,
                  color: themeObj.text,
                  fontWeight: 900,
                  fontSize: isFullscreenView ? '1.15rem' : '1rem',
                  cursor: 'pointer'
                }}
                title="1 Azalt"
              >
                -1
              </button>

              <button
                onClick={() => handleIncrementProgress(1)}
                className="sr-action-btn-main"
                style={{
                  padding: isFullscreenView ? '1.1rem 1.75rem' : '0.95rem 1.4rem',
                  borderRadius: 14,
                  background: activeStudyMode === 'question' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: isFullscreenView ? '1.18rem' : '1.05rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.18)'
                }}
              >
                <Plus size={isFullscreenView ? 26 : 22} strokeWidth={3} />
                <span>{activeStudyMode === 'question' ? `+1 ${currentSubjectObj.name.split(' ')[0]} Sorusu Çözdüm 🎯` : '+1 Sayfa Okudum 📖'}</span>
              </button>
            </div>
          )}

          {/* Testi Bitir & Kazandığın Molaya Geç Butonu */}
          {activeStudyMode === 'question' && (
            <div>
              {currentProgressCount > 0 ? (
                <button
                  onClick={() => setShowConfirmFinish(true)}
                  className="sr-action-btn-main"
                  style={{
                    width: '100%',
                    padding: isFullscreenView ? '1.1rem 1.4rem' : '0.95rem 1.2rem',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: isFullscreenView ? '1.1rem' : '0.96rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <Zap size={22} fill="white" />
                  <span>Testi Bitir & Molaya Geç ({currentProgressCount} Soru · {liveSessionSecPerQ > 0 ? `${formatSecToMinSec(liveSessionSecPerQ)}/s` : 'Hızlı Bitirme'}) 🏖️</span>
                </button>
              ) : (
                <div style={{
                  fontSize: '0.76rem',
                  color: themeObj.subText,
                  fontWeight: 700,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '0.4rem 0'
                }}>
                  <Zap size={15} color="#f59e0b" />
                  <span>{calculatedQuestionBudgetMinutes} dakikadan önce bitirirsen, artan tüm dakikalar molana eklenir!</span>
                </div>
              )}
            </div>
          )}

          {/* Testi Bitir Onay Modalı */}
          {showConfirmFinish && (
            <div
              onClick={() => setShowConfirmFinish(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem'
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: themeObj.cardBg || '#1e293b',
                  borderRadius: 24,
                  padding: '2rem 1.75rem',
                  maxWidth: 380,
                  width: '100%',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏖️</div>
                <h3 style={{ margin: '0 0 0.5rem', fontWeight: 900, color: themeObj.text || '#f1f5f9', fontSize: '1.15rem' }}>
                  Testi bitirmek istiyor musun?
                </h3>
                <p style={{ margin: '0 0 1.5rem', color: themeObj.subText || '#94a3b8', fontSize: '0.87rem', lineHeight: 1.5 }}>
                  <strong style={{ color: '#10b981' }}>{currentProgressCount} soru</strong> çözdün.
                  {liveSessionSecPerQ > 0 && <> Ortalama <strong style={{ color: '#10b981' }}>{formatSecToMinSec(liveSessionSecPerQ)}/soru</strong>.</>}
                  {' '}Artan süre molana eklenecek! ✨
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowConfirmFinish(false)}
                    style={{
                      flex: 1, padding: '0.8rem', borderRadius: 14,
                      background: 'rgba(148,163,184,0.15)', border: '1.5px solid rgba(148,163,184,0.25)',
                      color: themeObj.subText || '#94a3b8', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    ✕ Vazgeç
                  </button>
                  <button
                    onClick={() => { setShowConfirmFinish(false); handleFinishEarlyAndRewardBreak(); }}
                    style={{
                      flex: 1, padding: '0.8rem', borderRadius: 14,
                      background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                      color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                      boxShadow: '0 6px 16px rgba(16,185,129,0.4)'
                    }}
                  >
                    ✓ Evet, Bitir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ayarlar Açılır Paneli (Tek Mola & Odak Senkronizasyonu) */}
          {showSettings && (
            <div style={{
              background: themeObj.innerBg,
              padding: '1.25rem',
              borderRadius: 20,
              border: `1.5px solid ${themeObj.border}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
            }}>
              {/* ODAK SÜRESİ */}
              <div style={{
                background: themeObj.cardBg,
                padding: '0.85rem 1rem',
                borderRadius: 16,
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 900, color: themeObj.text }}>🎯 Odak Süresi (dk)</label>
                  <span style={{ fontSize: '0.64rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 6 }}>Otomatik Eşitlenir</span>
                </div>

                {/* Touch-friendly Stepper Control */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: themeObj.innerBg,
                  borderRadius: 12,
                  border: `1.5px solid ${themeObj.border}`,
                  padding: 4
                }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustFocus(-5)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="5 dk azalt"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={focusInputVal}
                    onChange={e => handleFocusInputChange(e.target.value)}
                    onBlur={handleFocusInputBlur}
                    style={{
                      width: '100%',
                      maxWidth: 90,
                      padding: '0.4rem 0.2rem',
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      fontWeight: 900,
                      fontSize: '1.15rem',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustFocus(5)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="5 dk artır"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Presets for Mobile */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[15, 25, 30, 42, 45, 60].map(mins => {
                    const isActive = Number(durations.pomodoro) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSetFocusPreset(mins)}
                        style={{
                          flex: 1,
                          minWidth: 32,
                          padding: '0.35rem 0.3rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? '#6366f1' : themeObj.border}`,
                          background: isActive ? '#6366f1' : themeObj.innerBg,
                          color: isActive ? '#ffffff' : themeObj.subText,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {mins}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.64rem', color: themeObj.subText, fontWeight: 700, lineHeight: 1.3 }}>
                  ⚡ Soru sayısına göre: {targetGoalCount} soru × {minutesPerQuestion} dk = {calculatedQuestionBudgetMinutes} dk
                </div>
              </div>

              {/* MOLA SÜRESİ */}
              <div style={{
                background: themeObj.cardBg,
                padding: '0.85rem 1rem',
                borderRadius: 16,
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 900, color: themeObj.text }}>☕ Mola Süresi (dk)</label>
                  <span style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 6 }}>Tek Mola</span>
                </div>

                {/* Touch-friendly Stepper Control */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: themeObj.innerBg,
                  borderRadius: 12,
                  border: `1.5px solid ${themeObj.border}`,
                  padding: 4
                }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustBreak(-1)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="1 dk azalt"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={breakInputVal}
                    onChange={e => handleBreakInputChange(e.target.value)}
                    onBlur={handleBreakInputBlur}
                    style={{
                      width: '100%',
                      maxWidth: 90,
                      padding: '0.4rem 0.2rem',
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      fontWeight: 900,
                      fontSize: '1.15rem',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustBreak(1)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="1 dk artır"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Presets for Mobile */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[5, 8, 10, 15, 20].map(mins => {
                    const isActive = Number(durations.shortBreak) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSetBreakPreset(mins)}
                        style={{
                          flex: 1,
                          minWidth: 32,
                          padding: '0.35rem 0.3rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? '#10b981' : themeObj.border}`,
                          background: isActive ? '#10b981' : themeObj.innerBg,
                          color: isActive ? '#ffffff' : themeObj.subText,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {mins}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.64rem', color: themeObj.subText, fontWeight: 700, lineHeight: 1.3 }}>
                  🏖️ Erken bitirilen seansların artan dakikaları bu molaya otomatik eklenir.
                </div>
              </div>

              {/* 🔔 Soru Başı Süre Hatırlatma Sesi & Ekran Açık Tutma Modu Kontrolleri */}
              <div style={{
                gridColumn: '1 / -1',
                background: themeObj.cardBg,
                borderRadius: 14,
                padding: '0.75rem 1rem',
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: questionChimeEnabled ? 'rgba(245, 158, 11, 0.15)' : themeObj.innerBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bell size={18} color={questionChimeEnabled ? '#f59e0b' : themeObj.subText} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>
                      Soru Başı Süre Hatırlatma Sesi
                    </div>
                    <div style={{ fontSize: '0.66rem', color: themeObj.subText, fontWeight: 700 }}>
                      Her {minutesPerQuestion} dakikada bir (1 soru süresi dolduğunda) hafif yumuşak sesle uyarır
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const next = !questionChimeEnabled;
                    setQuestionChimeEnabled(next);
                    localStorage.setItem('study_question_chime_enabled', String(next));
                    if (next) ambientAudio.playSoftDing();
                  }}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 10,
                    border: 'none',
                    background: questionChimeEnabled ? 'linear-gradient(135deg, #10b981, #059669)' : (themeObj.isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'),
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: questionChimeEnabled ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {questionChimeEnabled ? '🔔 Ses Açık' : '🔕 Kapalı'}
                </button>
              </div>

              {/* 🛑 Seans Başı Duraklatma Limiti Ayarı */}
              <div style={{
                gridColumn: '1 / -1',
                background: themeObj.cardBg,
                borderRadius: 14,
                padding: '0.75rem 1rem',
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444'
                  }}>
                    <Pause size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>
                      Seans Başı Duraklatma Sınırı
                    </div>
                    <div style={{ fontSize: '0.66rem', color: themeObj.subText, fontWeight: 700 }}>
                      Süre arttıkça hak otomatik artar (Örn: ≤15 dk=1, 25 dk=2, 42 dk=3, 60 dk=4 Hak)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'auto', label: '⚡ Süreye Göre (Otomatik)' },
                    { key: '2', label: '2 Hak' },
                    { key: '3', label: '3 Hak' },
                    { key: '5', label: '5 Hak' }
                  ].map(opt => {
                    const isActive = pauseLimitMode === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setPauseLimitMode(opt.key);
                          localStorage.setItem('study_pause_limit_mode', opt.key);
                        }}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? '#ef4444' : themeObj.border}`,
                          background: isActive ? '#ef4444' : themeObj.innerBg,
                          color: isActive ? '#ffffff' : themeObj.subText,
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 2px 8px rgba(239,68,68,0.3)' : 'none'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ekran Kapanmama Bilgi Şeridi */}
              <div style={{
                gridColumn: '1 / -1',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: 12,
                padding: '0.55rem 0.85rem',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.72rem',
                color: '#10b981',
                fontWeight: 800
              }}>
                <Sun size={15} />
                <span>Ekran Kapanmama Modu: Sayaç çalışırken ekranınız dokunmasanız da asla kapanmaz ve uyumaz.</span>
              </div>
            </div>
          )}

          {/* Pomodoro Döngü Noktaları */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.4rem 0' }}>
            {[0, 1, 2, 3].map(i => {
              const isDone = completedCycles > i;
              const isCurrent = completedCycles === i && activeStudyMode !== 'break';
              return (
                <div
                  key={i}
                  title={`${i + 1}. Seans`}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 99,
                    background: isDone ? '#10b981' : isCurrent ? themeObj.accent : (themeObj.isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'),
                    border: isCurrent ? `2px solid ${themeObj.text}` : 'none',
                    boxShadow: isDone ? '0 0 8px #10b981' : isCurrent ? `0 0 8px ${themeObj.accent}` : 'none',
                    transition: 'all 0.3s'
                  }}
                />
              );
            })}
            <span style={{ fontSize: '0.74rem', color: themeObj.subText, fontWeight: 800, marginLeft: 4 }}>
              Döngü {Math.floor(completedCycles / 4) + 1}
            </span>
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: themeObj.bg,
        color: themeObj.text,
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      <style>{`
        .sr-main-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1020px;
          margin: 0 auto;
          width: 100%;
        }
        .sr-card-body-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 1080px) {
          .sr-card-body-grid {
            display: grid;
            grid-template-columns: 1fr 1.12fr;
            gap: 1.5rem;
            align-items: start;
          }
        }
        .sr-zen-grid {
          display: grid;
          grid-template-columns: 1fr 1.22fr;
          gap: 2.25rem;
          align-items: start;
        }
        @media (max-width: 920px) {
          .sr-zen-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
        .sr-theme-btn {
          transition: all 0.15s ease;
        }
        .sr-theme-btn:hover {
          transform: translateY(-1px);
        }
        .sr-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sr-card:hover {
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.09);
        }
        .sr-tree-pulse {
          animation: treePulse 2.5s infinite ease-in-out;
        }
        @keyframes treePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 14px rgba(52, 211, 153, 0.5)); }
          100% { transform: scale(1); }
        }
        .sr-flame-glow {
          animation: flameGlow 1.8s infinite alternate ease-in-out;
        }
        @keyframes flameGlow {
          0% { filter: drop-shadow(0 0 4px #f97316); }
          100% { filter: drop-shadow(0 0 14px #ef4444); }
        }
        .sr-zen-btn-text {
          display: inline;
        }
        .sr-action-btn-main {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sr-action-btn-main:active {
          transform: scale(0.96);
        }

        @media (max-width: 960px) {
          .sr-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .sr-zen-btn-text {
            display: none !important;
          }
          .sr-header-title {
            font-size: 1rem !important;
          }
          .sr-sub-text {
            display: none !important;
          }
          .sr-timer-digits {
            font-size: 2.7rem !important;
          }
          .sr-timer-modes {
            gap: 3px !important;
            padding: 3px !important;
          }
          .sr-timer-mode-btn {
            padding: 0.35rem 0.5rem !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>

      {/* ─── HEADER / NAV BAR ─── */}
      <div style={{
        padding: '0.9rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1.5px solid ${themeObj.border}`,
        background: themeObj.isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/student')}
            style={{
              background: themeObj.buttonBg,
              border: `1.5px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: 12,
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s'
            }}
            title="Öğrenci Paneline Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🎧</span>
              <h1 className="sr-header-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', color: themeObj.text }}>
                Odaklı Çalışma Odası
              </h1>

              {/* 6. GÜNLÜK STREAK ROZETİ */}
              <span className="sr-flame-glow" style={{
                background: themeObj.isDark ? 'rgba(249, 115, 22, 0.22)' : '#fff7ed',
                color: '#f97316',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: '1.5px solid #fdba74'
              }}>
                <Flame size={14} color="#f97316" fill="#f97316" />
                <span>{streakData.currentStreak} Günlük Seri!</span>
              </span>

              {/* 🌟 EKRAN KAPANMAMA MODU ROZETİ */}
              {wakeLockActive && (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#10b981',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1.5px solid #a7f3d0'
                }} title="Sayaç çalıştığı sürece ekranınız hiç kapanmaz.">
                  <Sun size={13} />
                  <span>Ekran Açık Tutuluyor</span>
                </span>
              )}
            </div>
            <div className="sr-sub-text" style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600, marginTop: 1 }}>
              {currentUser?.name || 'Öğrenci'} · Birleşik Odaklanma & Hızlı Mola İstasyonu
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme Selector */}
          <div style={{ display: 'flex', gap: 4, background: themeObj.innerBg, padding: 4, borderRadius: 14, border: `1.5px solid ${themeObj.border}`, overflowX: 'auto' }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                title={t.name}
                className="sr-theme-btn"
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTheme === t.id ? themeObj.accent : 'transparent',
                  color: activeTheme === t.id ? '#ffffff' : themeObj.text,
                  whiteSpace: 'nowrap'
                }}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: themeObj.buttonBg,
              border: `1.5px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: 12,
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.75rem',
              fontWeight: 800,
              transition: 'all 0.15s'
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="sr-zen-btn-text">Zen Ekran</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{
        flex: 1,
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
        padding: '1.5rem 1.75rem',
        boxSizing: 'border-box'
      }}>
        <div className="sr-main-grid">

          {/* ─── LEFT COLUMN: 🌟 BİRLEŞİK ODAK & HEDEF İSTASYONU (MASTER CARD) ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* MASTER CARD: SAYAÇ + HEDEF TAKİPÇİSİ BİRLEŞİK */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: 30,
              border: `1.5px solid ${themeObj.border}`,
              padding: '1.75rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: themeObj.isDark ? '0 20px 50px rgba(0,0,0,0.3)' : '0 6px 25px -2px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {renderMasterStationContent(false)}
            </div>

            {/* ─── 📊 DERS BAZLI SORU SÜRESİ & HIZ ANALİZİ KARTI ─── */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: 24,
              border: `1.5px solid ${themeObj.border}`,
              padding: '1.25rem',
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px -2px rgba(0,0,0,0.03)'
            }}>
              {/* Başlık ve Butonlar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                  }}>
                    <Gauge size={18} color="white" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
                      Ders Bazlı Soru Başı Süre & Hız Analizi
                    </h3>
                    <div style={{ fontSize: '0.68rem', color: themeObj.subText, fontWeight: 600 }}>
                      Hangi derste bir soruya ortalama kaç dakika harcadığınızın tespiti
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {activeTrackedCount > 0 ? (
                    <button
                      onClick={() => {
                        if (window.confirm('Tüm ders süre istatistiklerini sıfırlamak istediğinize emin misiniz?')) {
                          clearSubjectStats();
                        }
                      }}
                      title="İstatistikleri Sıfırla"
                      style={{
                        background: themeObj.innerBg,
                        border: `1px solid ${themeObj.border}`,
                        color: themeObj.subText,
                        padding: '0.3rem 0.55rem',
                        borderRadius: 8,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Sıfırla</span>
                    </button>
                  ) : (
                    <button
                      onClick={loadDemoSubjectStats}
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#6366f1',
                        padding: '0.3rem 0.65rem',
                        borderRadius: 8,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ✨ Örnek Veri Yükle
                    </button>
                  )}
                </div>
              </div>

              {/* Üst Özet Rozetleri (KPIs) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 12
              }}>
                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 14,
                  padding: '0.65rem 0.75rem',
                  border: `1px solid ${themeObj.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: themeObj.subText }}>⚡ Genel Ortalama</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#6366f1' }}>
                    {totalTrackedQuestions > 0 ? `${formatSecToMinSec(overallAvgSecPerQ)} / soru` : 'Henüz Veri Yok'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: themeObj.subText, opacity: 0.85 }}>
                    {totalTrackedQuestions > 0 ? `${totalTrackedQuestions} soru çözüldü` : 'Seans başlatın'}
                  </span>
                </div>

                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 14,
                  padding: '0.65rem 0.75rem',
                  border: `1px solid ${themeObj.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: themeObj.subText }}>🏎️ En Hızlı Ders</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fastestSubject ? `${fastestSubject.icon} ${fastestSubject.name.split(' ')[0]}` : '-'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 800 }}>
                    {fastestSubject ? `${formatSecToMinSec(fastestSubject.avgSec)} / soru` : '-'}
                  </span>
                </div>

                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 14,
                  padding: '0.65rem 0.75rem',
                  border: `1px solid ${themeObj.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: themeObj.subText }}>⏳ En Detaylı Ders</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slowestSubject ? `${slowestSubject.icon} ${slowestSubject.name.split(' ')[0]}` : '-'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 800 }}>
                    {slowestSubject ? `${formatSecToMinSec(slowestSubject.avgSec)} / soru` : '-'}
                  </span>
                </div>
              </div>

              {/* Ders Listesi ve Hız Kartları */}
              {activeTrackedCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                  {trackedSubjectsList
                    .filter(subj => subj.hasData)
                    .sort((a, b) => a.avgSec - b.avgSec)
                    .map(subj => {
                      const isSelected = selectedSubject === subj.id;
                      return (
                        <div
                          key={subj.id}
                          onClick={() => handleSelectSubject(subj.id)}
                          style={{
                            background: isSelected ? (themeObj.isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff') : themeObj.innerBg,
                            border: isSelected ? '1.5px solid #6366f1' : `1px solid ${themeObj.border}`,
                            borderRadius: 14,
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Sol: Ders Adı & İkonu & Çözülen Soru Sayısı */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.25rem' }}>{subj.icon}</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: themeObj.text }}>
                                  {subj.name}
                                </span>
                                {isSelected && (
                                  <span style={{
                                    fontSize: '0.6rem',
                                    background: '#6366f1',
                                    color: 'white',
                                    padding: '1px 5px',
                                    borderRadius: 99,
                                    fontWeight: 800
                                  }}>
                                    Aktif
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: themeObj.subText, fontWeight: 700 }}>
                                {subj.totalQuestions} Soru · {subj.sessionCount} Seans · Toplam {Math.round(subj.totalSeconds / 60)} dk
                              </div>
                            </div>
                          </div>

                          {/* Sağ: Soru Başı Ortalama Süre & Değerlendirme Rozeti */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: subj.evaluation.color }}>
                                {formatSecToMinSec(subj.avgSec)}
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85 }}> / soru</span>
                              </div>
                              <div style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: subj.evaluation.color,
                                background: subj.evaluation.bg,
                                padding: '1px 6px',
                                borderRadius: 6,
                                display: 'inline-block',
                                marginTop: 2
                              }}>
                                {subj.evaluation.label}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSubject(subj.id);
                                if (activeStudyMode !== 'question') handleSwitchMasterMode('question');
                              }}
                              style={{
                                background: isSelected ? '#6366f1' : themeObj.buttonBg,
                                border: `1px solid ${isSelected ? '#6366f1' : themeObj.border}`,
                                color: isSelected ? 'white' : themeObj.text,
                                borderRadius: 10,
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <Play size={11} fill={isSelected ? 'white' : 'currentColor'} />
                              <span>Çalış</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 16,
                  padding: '1.25rem 1rem',
                  border: `1.5px dashed ${themeObj.border}`,
                  textAlign: 'center'
                }}>
                  <Clock size={26} color="#6366f1" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: themeObj.text }}>Henüz Kayıtlı Soru Seansı Yok</div>
                  <div style={{ fontSize: '0.72rem', color: themeObj.subText, marginTop: 3, lineHeight: 1.4, maxWidth: 380, margin: '3px auto 8px' }}>
                    Yukarıdaki <strong>✏️ Soru Çözümü</strong> modundan dersinizi seçip soru çözdükçe, her ders için soru başına harcadığınız süre otomatik olarak burada analiz edilecektir.
                  </div>
                  <button
                    onClick={loadDemoSubjectStats}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1.5px solid rgba(99, 102, 241, 0.3)',
                      color: '#6366f1',
                      padding: '0.45rem 1rem',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ✨ Örnek Analiz Verilerini Gör (Demo)
                  </button>
                </div>
              )}
            </div>

            {/* 1. BUGÜNÜN BAŞARI ORMANI (FOREST BAHÇESİ) */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: 24,
              border: `1.5px solid ${themeObj.border}`,
              padding: '1.25rem',
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px -2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TreePine size={20} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
                    Bugünün Başarı Ormanı
                  </h3>
                </div>
                <span style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                  color: '#10b981',
                  border: '1px solid #a7f3d0',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 99,
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  {plantedForest.length} Ağaç Dikildi
                </span>
              </div>

              {plantedForest.length > 0 ? (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  background: themeObj.innerBg,
                  borderRadius: 16,
                  padding: '0.85rem',
                  border: `1.5px solid ${themeObj.border}`,
                  minHeight: 65,
                  alignItems: 'center'
                }}>
                  {plantedForest.map((tree, i) => (
                    <div
                      key={tree.id || i}
                      title={`${tree.name} (${tree.time}) - ${tree.task}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        background: themeObj.cardBg,
                        padding: '0.4rem 0.6rem',
                        borderRadius: 12,
                        border: `1px solid ${themeObj.border}`,
                        cursor: 'default'
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{tree.icon}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: themeObj.subText }}>{tree.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 16,
                  padding: '1.25rem 1rem',
                  border: `1.5px dashed ${themeObj.border}`,
                  textAlign: 'center',
                  color: themeObj.subText
                }}>
                  <Sprout size={28} color="#10b981" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: themeObj.text }}>Ormanın Henüz Boş</div>
                  <div style={{ fontSize: '0.72rem', marginTop: 2 }}>Hedefini tamamla veya odaklanma seansını bitir ve ilk ağacını dik!</div>
                </div>
              )}
            </div>

            {/* 6. GÜNLÜK HEDEF & ROZETLER */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10
            }}>
              {[
                {
                  label: '50 dk Hedefi',
                  unlocked: dailyStats.totalMinutes >= 50,
                  icon: '🥉',
                  title: 'Bronz Odak',
                  req: '50 dk'
                },
                {
                  label: '100 dk Hedefi',
                  unlocked: dailyStats.totalMinutes >= 100,
                  icon: '🥈',
                  title: 'Gümüş Odak',
                  req: '100 dk'
                },
                {
                  label: '150+ dk Şampiyon',
                  unlocked: dailyStats.totalMinutes >= 150,
                  icon: '🥇',
                  title: 'Altın Şampiyon',
                  req: '150 dk'
                }
              ].map((badge, i) => (
                <div
                  key={i}
                  className="sr-card"
                  style={{
                    background: badge.unlocked
                      ? (isDark ? 'rgba(234, 179, 8, 0.15)' : '#fefce8')
                      : themeObj.cardBg,
                    borderRadius: 20,
                    border: badge.unlocked ? '1.5px solid #facc15' : `1.5px solid ${themeObj.border}`,
                    padding: '0.85rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 3,
                    opacity: badge.unlocked ? 1 : 0.65
                  }}
                >
                  <span style={{ fontSize: '1.6rem' }}>{badge.icon}</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: badge.unlocked ? (isDark ? '#fde047' : '#854d0e') : themeObj.text }}>
                    {badge.title}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: themeObj.subText, fontWeight: 700 }}>
                    {badge.unlocked ? '✅ Kazanıldı' : `${badge.req}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 🌟 SADECE KARTIN TAM EKRAN (ZEN ODAK) OVERLAY MODU ─── */}
      {isCardFullscreen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: themeObj.bg,
          zIndex: 99990,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
          backdropFilter: 'blur(30px)',
          overflowY: 'auto'
        }}>
          {/* Zen Üst Barı */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: 24,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>🎧</span>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: themeObj.text }}>Zen Odak Modu</span>
              <span className="sr-flame-glow" style={{
                background: themeObj.isDark ? 'rgba(249, 115, 22, 0.22)' : '#fff7ed',
                color: '#f97316',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: '1.5px solid #fdba74'
              }}>
                <Flame size={14} color="#f97316" fill="#f97316" />
                <span>{streakData.currentStreak} Günlük Seri!</span>
              </span>

              {/* 🌟 EKRAN KAPANMAMA MODU ROZETİ */}
              {wakeLockActive && (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#10b981',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1.5px solid #a7f3d0'
                }} title="Sayaç çalıştığı sürece ekranınız hiç kapanmaz.">
                  <Sun size={13} />
                  <span>Ekran Açık</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Theme Selector */}
              <div style={{ display: 'flex', gap: 4, background: themeObj.innerBg, padding: 3, borderRadius: 12, border: `1.5px solid ${themeObj.border}` }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTheme(t.id)}
                    style={{
                      padding: '0.3rem 0.55rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: activeTheme === t.id ? themeObj.accent : 'transparent',
                      color: activeTheme === t.id ? '#ffffff' : themeObj.text
                    }}
                  >
                    {t.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Zen Çıkış Butonu */}
              <button
                onClick={() => setIsCardFullscreen(false)}
                style={{
                  background: themeObj.buttonBg,
                  border: `1.5px solid ${themeObj.border}`,
                  color: themeObj.text,
                  borderRadius: 12,
                  padding: '0.5rem 0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  fontWeight: 900
                }}
              >
                <Shrink size={16} />
                <span>Normal Ekrana Dön</span>
              </button>
            </div>
          </div>

          {/* Merkezde Büyük İstasyon Kartı */}
          <div style={{
            background: themeObj.cardBg,
            borderRadius: 32,
            border: `1.5px solid ${themeObj.border}`,
            padding: '2.5rem 2.8rem',
            maxWidth: 1060,
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            marginTop: '2.5rem'
          }}>
            {renderMasterStationContent(true)}
          </div>
        </div>
      )}

      {/* ─── KUTLAMA & BONUS MOLA MODALI ─── */}
      {earnedBonusModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 24,
            padding: '2rem 1.75rem',
            maxWidth: 460,
            width: '100%',
            border: '2px solid #10b981',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            color: 'var(--color-text, #0f172a)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 6 }}>
              🏖️⚡🎉
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: '#10b981' }}>
              Harika Hız! Mola Kazandın!
            </h2>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
              Hedeflenen <strong>{earnedBonusModal.questionsDone} {earnedBonusModal.subject || ''} sorusunu</strong> toplam {earnedBonusModal.budgetMinutes} dakikalık bütçe yerine sadece <strong>{earnedBonusModal.elapsedMinutes} dakikada</strong> tamamladın!
            </p>

            <div style={{
              background: 'var(--color-surface-hover, #f8fafc)',
              borderRadius: 16,
              padding: '0.85rem',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Soru Başı Hız</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#6366f1' }}>
                  {formatSecToMinSec(Math.round((earnedBonusModal.elapsedMinutes * 60) / Math.max(1, earnedBonusModal.questionsDone)))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Erken Bitirme</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>+{earnedBonusModal.bonusMinutes} dk</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Toplam Mola</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981' }}>{earnedBonusModal.totalBreakMinutes} dk</div>
              </div>
            </div>

            <button
              onClick={() => {
                setEarnedBonusModal(null);
                setIsRunning(true);
              }}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
              }}
            >
              🏖️ {earnedBonusModal.totalBreakMinutes} Dakikalık Molayı Başlat!
            </button>
          </div>
        </div>
      )}

      {/* ─── ATANMIŞ ÖDEV, KİTAP TESTİ & HAFTALIK PROGRAM SEÇİM VE BAŞLATMA MODALI ─── */}
      {showHomeworkPickerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 24,
            padding: '1.75rem 1.6rem',
            maxWidth: 720,
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid #3b82f6',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            color: 'var(--color-text, #0f172a)',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}>
            {/* Modal Başlığı */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.35)'
                }}>
                  <BookMarked size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: 'var(--color-text)' }}>
                    Çalışma Görevi / Test / Program Seç
                  </h2>
                  <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', margin: '2px 0 0', fontWeight: 600 }}>
                    Haftalık ders programından gün seçerek veya ödevlerinden birini seçerek çalışmayı başlat
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Bitenleri / Çözülenleri Gizle/Göster Butonu */}
                <button
                  type="button"
                  onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
                  title={hideCompletedTasks ? 'Çözülenleri Göster' : 'Çözülenleri Gizle'}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 10,
                    border: `1.5px solid ${hideCompletedTasks ? '#10b981' : 'var(--color-border, #e2e8f0)'}`,
                    background: hideCompletedTasks ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : 'transparent',
                    color: hideCompletedTasks ? '#10b981' : 'var(--color-text-muted)',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {hideCompletedTasks ? <EyeOff size={13} color="#10b981" /> : <Eye size={13} />}
                  <span>{hideCompletedTasks ? 'Bitenler Gizli' : 'Bitenleri Göster'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHomeworkPickerModal(false)}
                  style={{
                    background: 'var(--color-surface-hover, #f1f5f9)',
                    border: 'none',
                    borderRadius: 10,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-text)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Haftalık Program Sayfasına Hızlı Geçiş Banner'ı */}
            <div style={{
              background: isDark ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(79, 70, 229, 0.18))' : 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
              border: '1.5px solid #818cf8',
              borderRadius: 14,
              padding: '0.6rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 10,
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>📅</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text)' }}>Haftalık Program Sayfasından Seç ve Başlat</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Tüm haftalık planını tam sayfa görüp 'Odada Başlat' ile çalışma odasına dönebilirsin.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHomeworkPickerModal(false);
                  navigate('/student/program');
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>Program Sayfasına Git</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Ana Kategori Sekmeleri (Tabs) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              background: 'var(--color-surface-hover, #f1f5f9)',
              padding: 4,
              borderRadius: 14,
              marginBottom: 12
            }}>
              {[
                { id: 'program', label: '📅 Haftalık Program', count: allAssignedTasks.filter(t => (t.sourceType === 'program' || t.sourceType === 'roadmap' || t.dayKey) && (!hideCompletedTasks || !t.isCompleted)).length },
                { id: 'bookTest', label: '📚 Kitap Testleri', count: allAssignedTasks.filter(t => t.sourceType === 'bookTest' && (!hideCompletedTasks || !t.isCompleted)).length },
                { id: 'homework', label: '📝 Atanmış Ödevler', count: allAssignedTasks.filter(t => t.sourceType === 'homework' && (!hideCompletedTasks || !t.isCompleted)).length },
                { id: 'all', label: '🌟 Tüm Liste', count: allAssignedTasks.filter(t => (!hideCompletedTasks || !t.isCompleted)).length }
              ].map(tab => {
                const isTabActive = hwSourceTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHwSourceTab(tab.id)}
                    style={{
                      padding: '0.55rem 0.4rem',
                      borderRadius: 10,
                      border: 'none',
                      background: isTabActive ? '#3b82f6' : 'transparent',
                      color: isTabActive ? '#ffffff' : 'var(--color-text)',
                      fontWeight: 900,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      background: isTabActive ? 'rgba(255,255,255,0.25)' : 'var(--color-border, #e2e8f0)',
                      color: isTabActive ? '#ffffff' : 'var(--color-text-muted)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: 99
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 1. GÖRÜNÜM: HAFTALIK DERS PROGRAMI (GÜN GÜN SEÇİM & LİSTE) */}
            {hwSourceTab === 'program' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Gün Seçici Yatay Çubuk */}
                <div style={{
                  display: 'flex',
                  gap: 5,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  borderBottom: '1px solid var(--color-border, #e2e8f0)'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedProgramDay('all')}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: 10,
                      border: `1.5px solid ${selectedProgramDay === 'all' ? '#3b82f6' : 'var(--color-border, #e2e8f0)'}`,
                      background: selectedProgramDay === 'all' ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff') : 'transparent',
                      color: selectedProgramDay === 'all' ? '#3b82f6' : 'var(--color-text)',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>🌟 Tüm Hafta</span>
                  </button>

                  {WEEK_DAYS_CONFIG.map(dayCfg => {
                    const isSelected = selectedProgramDay === dayCfg.key;
                    const isToday = currentTodayKey === dayCfg.key;
                    const dayGroup = weeklyProgramGrouped.find(g => g.key === dayCfg.key);
                    const pendingCount = (dayGroup?.tasks || []).filter(t => !t.isCompleted).length;
                    const totalCount = dayGroup?.tasks?.length || 0;
                    const displayCount = hideCompletedTasks ? pendingCount : totalCount;

                    return (
                      <button
                        key={dayCfg.key}
                        type="button"
                        onClick={() => setSelectedProgramDay(dayCfg.key)}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? dayCfg.color : isToday ? '#f59e0b' : 'var(--color-border, #e2e8f0)'}`,
                          background: isSelected
                            ? (isDark ? 'rgba(59,130,246,0.2)' : dayCfg.bg)
                            : isToday
                              ? (isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb')
                              : 'transparent',
                          color: isSelected ? dayCfg.color : 'var(--color-text)',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <span>{dayCfg.icon} {dayCfg.long}</span>
                        {displayCount > 0 && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            background: isSelected ? dayCfg.color : 'var(--color-border, #e2e8f0)',
                            color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                            padding: '0.05rem 0.35rem',
                            borderRadius: 99
                          }}>
                            {displayCount}
                          </span>
                        )}
                        {isToday && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '0.05rem 0.3rem', borderRadius: 4 }}>
                            BUGÜN
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Günlerin Görev Listesi */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4, maxHeight: 380 }}>
                  {weeklyProgramGrouped
                    .filter(dayGroup => selectedProgramDay === 'all' || selectedProgramDay === dayGroup.key)
                    .map(dayGroup => {
                      const isToday = currentTodayKey === dayGroup.key;
                      const visibleTasks = (dayGroup.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted);

                      return (
                        <div
                          key={dayGroup.key}
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                            border: `1.5px solid ${isToday ? dayGroup.color : 'var(--color-border, #e2e8f0)'}`,
                            borderRadius: 16,
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          {/* Gün Başlığı & İlerleme Özeti */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1rem' }}>{dayGroup.icon}</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: dayGroup.color }}>
                                {dayGroup.long}
                              </span>
                              {dayGroup.dateLabel && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                  ({dayGroup.dateLabel})
                                </span>
                              )}
                              {isToday && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#f59e0b', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: 6 }}>
                                  BUGÜNÜN PROGRAMI
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                              {dayGroup.tasks.length > 0 ? (
                                <span>{dayGroup.completedCount} / {dayGroup.tasks.length} Tamamlandı ({dayGroup.totalQuestions} Soru)</span>
                              ) : (
                                <span>Görev Yok</span>
                              )}
                            </div>
                          </div>

                          {/* Günün Görevleri */}
                          {visibleTasks.length === 0 ? (
                            <div style={{
                              padding: '0.9rem',
                              textAlign: 'center',
                              background: 'var(--color-surface, #ffffff)',
                              borderRadius: 12,
                              border: '1px dashed var(--color-border, #cbd5e1)',
                              fontSize: '0.78rem',
                              color: 'var(--color-text-muted)'
                            }}>
                              {dayGroup.tasks.length > 0 && hideCompletedTasks ? (
                                <span style={{ color: '#10b981', fontWeight: 800 }}>
                                  🎉 Bu günün tüm görevleri tamamlandı! ({dayGroup.tasks.length} Görev)
                                </span>
                              ) : (
                                <span>🍃 Bu gün için tanımlı ders programı görevi bulunmuyor.</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowHomeworkPickerModal(false);
                                  setActiveStudyMode('question');
                                }}
                                style={{
                                  marginLeft: 8,
                                  background: 'none',
                                  border: 'none',
                                  color: '#3b82f6',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  fontSize: '0.78rem'
                                }}
                              >
                                Serbest Çalışma Başlat ➔
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {visibleTasks.map(task => {
                                const isSelected = selectedTask?.id === task.id || selectedTask?.dedupeKey === task.dedupeKey;
                                const isRoadmap = task.sourceType === 'roadmap';
                                const isBook = task.sourceType === 'bookTest';
                                const isHw = task.sourceType === 'homework';

                                return (
                                  <div
                                    key={task.dedupeKey || task.id}
                                    style={{
                                      background: isSelected
                                        ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff')
                                        : 'var(--color-surface, #ffffff)',
                                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--color-border, #e2e8f0)',
                                      borderRadius: 12,
                                      padding: '0.75rem 0.95rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: 8
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 180 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                                        <span style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 900,
                                          background: isRoadmap ? 'rgba(139, 92, 246, 0.15)' : isBook ? 'rgba(59, 130, 246, 0.15)' : isHw ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                          color: isRoadmap ? '#8b5cf6' : isBook ? '#3b82f6' : isHw ? '#0891b2' : '#10b981',
                                          padding: '0.1rem 0.45rem',
                                          borderRadius: 6
                                        }}>
                                          {task.sourceLabel || (isRoadmap ? '🗺️ Yol Haritası' : '📅 Ders Programı')}
                                        </span>

                                        <span style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                          background: 'var(--color-surface-hover, #f1f5f9)',
                                          color: 'var(--color-text)',
                                          padding: '0.1rem 0.45rem',
                                          borderRadius: 6
                                        }}>
                                          {task.subject || 'Genel'}
                                        </span>

                                        {task.isCompleted ? (
                                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: 6 }}>
                                            ✓ Tamamlandı
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '0.1rem 0.4rem', borderRadius: 6 }}>
                                            ⏳ Bekliyor
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
                                        {task.title}
                                      </div>

                                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 1 }}>
                                        {task.questionCount} Soru • Yaklaşık {Math.round(task.questionCount * minutesPerQuestion)} dk
                                        {task.bookTitle ? ` • ${task.bookTitle}` : ''}
                                        {task.topic ? ` • ${task.topic}` : ''}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectTask(task, false)}
                                        style={{
                                          padding: '0.45rem 0.85rem',
                                          borderRadius: 10,
                                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                          color: '#ffffff',
                                          border: 'none',
                                          fontWeight: 900,
                                          fontSize: '0.76rem',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 5,
                                          boxShadow: '0 3px 10px rgba(245,158,11,0.25)'
                                        }}
                                      >
                                        <Target size={13} /> Görevi Seç
                                      </button>

                                      {(task.realTestId || task.bookTestId) && (
                                        <button
                                          type="button"
                                          onClick={() => handleLaunchTaskQuiz(task)}
                                          style={{
                                            padding: '0.45rem 0.85rem',
                                            borderRadius: 10,
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: '#ffffff',
                                            border: 'none',
                                            fontWeight: 900,
                                            fontSize: '0.76rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
                                          }}
                                        >
                                          <PlayCircle size={13} /> Hemen Çöz
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. GÖRÜNÜM: KİTAP TESTLERİ (KİTAP BAZINDA GRUPLU) */}
            {hwSourceTab === 'bookTest' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Arama & Ders Filtresi */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Kitap veya test adı ara..."
                      value={hwSearchQuery}
                      onChange={e => setHwSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem 0.5rem 2rem',
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1.5px solid var(--color-border, #e2e8f0)',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={hwFilterSubject}
                    onChange={e => setHwFilterSubject(e.target.value)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: 'var(--color-surface-hover, #f8fafc)',
                      border: '1.5px solid var(--color-border, #e2e8f0)',
                      borderRadius: 12,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Dersler</option>
                    {STUDY_SUBJECTS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Kitaplar ve Testleri */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4, maxHeight: 380 }}>
                  {bookGroupedTests.length === 0 ? (
                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>📚</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>Kitap testi bulunamadı</div>
                    </div>
                  ) : (
                    bookGroupedTests.map(bg => {
                      const matchingTests = bg.tests.filter(t => {
                        if (hideCompletedTasks && t.isCompleted) return false;
                        const matchSubject = hwFilterSubject === 'all' || (t.subject && t.subject.toLowerCase().includes(hwFilterSubject.toLowerCase()));
                        const matchQuery = !hwSearchQuery.trim() ||
                          (t.title || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
                          (bg.bookTitle || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
                          (t.testName || '').toLowerCase().includes(hwSearchQuery.toLowerCase());
                        return matchSubject && matchQuery;
                      });

                      if (matchingTests.length === 0) return null;

                      return (
                        <div
                          key={bg.bookTitle}
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                            border: '1.5px solid var(--color-border, #e2e8f0)',
                            borderRadius: 16,
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.1rem' }}>📖</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#3b82f6' }}>{bg.bookTitle}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                              {matchingTests.length} Bekleyen Test
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                            {matchingTests.map(test => {
                              const isSelected = selectedTask?.id === test.id || selectedTask?.dedupeKey === test.dedupeKey;
                              return (
                                <div
                                  key={test.id}
                                  style={{
                                    background: isSelected ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff') : 'var(--color-surface, #ffffff)',
                                    border: isSelected ? '2px solid #3b82f6' : '1px solid var(--color-border, #e2e8f0)',
                                    borderRadius: 12,
                                    padding: '0.75rem 0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 8
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                      <span style={{ fontSize: '0.66rem', fontWeight: 900, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '0.1rem 0.4rem', borderRadius: 6 }}>
                                        {test.subject || bg.subject || 'Genel'}
                                      </span>
                                      {test.isCompleted ? (
                                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#10b981' }}>✓ Çözüldü</span>
                                      ) : (
                                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#d97706' }}>⏳ Bekliyor</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text)' }}>
                                      {test.testName || test.title}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                      {test.questionCount} Soru • Yaklaşık {Math.round(test.questionCount * minutesPerQuestion)} dk
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectTask(test, false)}
                                      style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.74rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <Target size={12} /> Görevi Seç
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleLaunchTaskQuiz(test)}
                                      style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.74rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <PlayCircle size={12} /> Hemen Çöz
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. GÖRÜNÜM: ATANMIŞ ÖDEVLER & 4. TÜM LİSTE */}
            {(hwSourceTab === 'homework' || hwSourceTab === 'all') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Arama ve Ders Filtresi */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Ödev, konu veya ders ara..."
                      value={hwSearchQuery}
                      onChange={e => setHwSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem 0.5rem 2rem',
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1.5px solid var(--color-border, #e2e8f0)',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={hwFilterSubject}
                    onChange={e => setHwFilterSubject(e.target.value)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: 'var(--color-surface-hover, #f8fafc)',
                      border: '1.5px solid var(--color-border, #e2e8f0)',
                      borderRadius: 12,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Dersler</option>
                    {STUDY_SUBJECTS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Görev Listesi */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4, maxHeight: 380 }}>
                  {filteredTasksList.length === 0 ? (
                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>📭</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>
                        {hideCompletedTasks ? 'Bekleyen ödev / görev bulunmuyor' : 'Kriterlere uygun ödev / görev bulunamadı'}
                      </div>
                    </div>
                  ) : (
                    filteredTasksList.map(task => {
                      const isSelected = selectedTask?.id === task.id || selectedTask?.dedupeKey === task.dedupeKey;
                      const isRoadmap = task.sourceType === 'roadmap';
                      const isBook = task.sourceType === 'bookTest';
                      const isHw = task.sourceType === 'homework';

                      return (
                        <div
                          key={task.dedupeKey || task.id}
                          style={{
                            background: isSelected ? (isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff') : 'var(--color-surface, #ffffff)',
                            border: isSelected ? '2px solid #3b82f6' : '1.5px solid var(--color-border, #e2e8f0)',
                            borderRadius: 16,
                            padding: '0.85rem 1.05rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                background: isRoadmap ? 'rgba(139, 92, 246, 0.15)' : isBook ? 'rgba(59, 130, 246, 0.15)' : isHw ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isRoadmap ? '#8b5cf6' : isBook ? '#3b82f6' : isHw ? '#0891b2' : '#10b981',
                                padding: '0.12rem 0.5rem',
                                borderRadius: 6
                              }}>
                                {task.sourceLabel}
                              </span>

                              <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'var(--color-surface-hover, #f1f5f9)', color: 'var(--color-text)', padding: '0.12rem 0.45rem', borderRadius: 6 }}>
                                {task.subject || 'Genel'}
                              </span>

                              {task.isCompleted ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '0.12rem 0.45rem', borderRadius: 6 }}>
                                  ✓ Tamamlandı
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '0.12rem 0.45rem', borderRadius: 6 }}>
                                  ⏳ Bekliyor
                                </span>
                              )}

                              {task.dueDate && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                  📅 {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)' }}>
                              {task.title}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                              {task.questionCount} Soru • Yaklaşık {Math.round(task.questionCount * minutesPerQuestion)} dk
                              {task.unit ? ` • ${task.unit}` : ''}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleSelectTask(task, false)}
                              style={{
                                padding: '0.5rem 0.9rem',
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: '0 3px 10px rgba(245,158,11,0.3)'
                              }}
                            >
                              <Target size={13} /> Görevi Seç
                            </button>

                            {(task.realTestId || task.bookTestId) && (
                              <button
                                type="button"
                                onClick={() => handleLaunchTaskQuiz(task)}
                                style={{
                                  padding: '0.5rem 0.9rem',
                                  borderRadius: 10,
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  boxShadow: '0 3px 10px rgba(16,185,129,0.3)'
                                }}
                              >
                                <PlayCircle size={14} /> Hemen Çöz
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Modal Alt Kapatma */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowHomeworkPickerModal(false)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 12,
                  background: 'var(--color-surface-hover, #f1f5f9)',
                  color: 'var(--color-text)',
                  border: '1.5px solid var(--color-border)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
