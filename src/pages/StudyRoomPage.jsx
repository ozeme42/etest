import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useTheme } from '../context/ThemeContext';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Sparkles, Flame, CheckCircle2, Clock, Music, Headphones, BookOpen,
  Target, Coffee, Moon, Sun, ArrowLeft, Plus, Trash2, Check, BarChart2,
  Zap, Settings2, Bell, Award, ListTodo, Edit3, Shield, TreePine, Sprout,
  Trophy, BookmarkCheck, ChevronRight, X, Gift, Compass, Expand, Shrink,
  Gauge, Activity, TrendingUp, HelpCircle, History
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
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { books } = useTrackedBooks();
  const { studyPlans } = useStudyPlan();

  const THEMES = useMemo(() => getThemeList(isDark), [isDark]);

  // ── 🎯 BİRLEŞİK ÇALIŞMA & HEDEF MODLARI: 'question' | 'book' | 'study' | 'break' | 'stopwatch' ──
  const [activeStudyMode, setActiveStudyMode] = useState(() => localStorage.getItem('study_master_mode') || 'question');

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

  const [currentProgressCount, setCurrentProgressCount] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_progress_${todayKey}`);
    return saved ? Number(saved) : 0;
  });

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

  // 🌟 SADECE BU KARTI TAM EKRAN (ZEN ODAK MODU) YAPMA STATE'İ
  const [isCardFullscreen, setIsCardFullscreen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('system');
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Bonus Mola Kutlama Modalı
  const [earnedBonusModal, setEarnedBonusModal] = useState(null);

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
    if (!isRunning) {
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
          setSessionElapsedSeconds(e => e + 1);
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
  }, [isRunning, activeStudyMode, dailyStats]);

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
    } else {
      // Mola bitti, soru veya konu moduna dön
      setActiveStudyMode('question');
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
      setSessionElapsedSeconds(0);
    }
  };

  // Birleşik Mod Değiştirici
  const handleSwitchMasterMode = (mode) => {
    setIsRunning(false);
    setActiveStudyMode(mode);
    setSessionElapsedSeconds(0);

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
                  </div>

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
              onClick={() => setIsRunning(!isRunning)}
              className="sr-action-btn-main"
              style={{
                padding: isFullscreenView ? '1.1rem 3.2rem' : '0.9rem 2.5rem',
                borderRadius: 20,
                background: isRunning ? '#ef4444' : (activeStudyMode === 'question' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)'),
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isFullscreenView ? '1.2rem' : '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: `0 8px 25px ${isRunning ? 'rgba(239,68,68,0.45)' : 'rgba(245,158,11,0.4)'}`
              }}
            >
              {isRunning ? <><Pause size={isFullscreenView ? 24 : 20} fill="white" /> Duraklat</> : <><Play size={isFullscreenView ? 24 : 20} fill="white" /> Başlat</>}
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
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.subText }}>Hedef:</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={targetGoalCount}
                    onChange={e => {
                      const val = Math.max(1, Number(e.target.value) || 12);
                      setTargetGoalCount(val);
                      if (!isRunning) setTimeLeft(Math.round(val * minutesPerQuestion) * 60);
                    }}
                    style={{
                      width: 60,
                      padding: '0.4rem',
                      borderRadius: 10,
                      border: `1.5px solid ${themeObj.border}`,
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>Soru</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.subText }}>Hedef Sayfa:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={targetGoalCount}
                  onChange={e => setTargetGoalCount(Math.max(1, Number(e.target.value) || 20))}
                  style={{
                    width: 60,
                    padding: '0.4rem',
                    borderRadius: 10,
                    border: `1.5px solid ${themeObj.border}`,
                    background: themeObj.cardBg,
                    color: themeObj.text,
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
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
                  onClick={handleFinishEarlyAndRewardBreak}
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

          {/* Ayarlar Açılır Paneli (Tek Mola & Odak Senkronizasyonu) */}
          {showSettings && (
            <div style={{
              background: themeObj.innerBg,
              padding: '1.25rem',
              borderRadius: 20,
              border: `1.5px solid ${themeObj.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 900, color: themeObj.text }}>🎯 Odak Süresi (dk)</label>
                  <span style={{ fontSize: '0.64rem', color: '#6366f1', fontWeight: 800 }}>Otomatik Eşitlenir</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={durations.pomodoro || calculatedQuestionBudgetMinutes}
                  onChange={e => {
                    const val = Math.max(1, Number(e.target.value) || 25);
                    setDurations(p => ({ ...p, pomodoro: val }));
                    const newGoal = Math.max(1, Math.round(val / minutesPerQuestion));
                    setTargetGoalCount(newGoal);
                    if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
                      setTimeLeft(val * 60);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 12,
                    border: `1.5px solid ${themeObj.border}`,
                    background: themeObj.cardBg,
                    color: themeObj.text,
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.64rem', color: themeObj.subText, marginTop: 4, fontWeight: 700, lineHeight: 1.3 }}>
                  ⚡ Soru sayısına göre: {targetGoalCount} soru × {minutesPerQuestion} dk = {calculatedQuestionBudgetMinutes} dk
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 900, color: themeObj.text }}>☕ Mola Süresi (dk)</label>
                  <span style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 800 }}>Tek Mola</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={durations.shortBreak || 10}
                  onChange={e => {
                    const val = Math.max(1, Number(e.target.value) || 10);
                    setDurations(p => ({ ...p, shortBreak: val, breakTime: val }));
                    if (!isRunning && activeStudyMode === 'break') {
                      setTimeLeft(val * 60);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 12,
                    border: `1.5px solid ${themeObj.border}`,
                    background: themeObj.cardBg,
                    color: themeObj.text,
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.64rem', color: themeObj.subText, marginTop: 4, fontWeight: 700, lineHeight: 1.3 }}>
                  🏖️ Erken bitirilen seansların artan dakikaları bu molaya otomatik eklenir.
                </div>
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
          display: grid;
          grid-template-columns: 1.45fr 1fr;
          gap: 1.5rem;
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

          {/* ─── RIGHT COLUMN: AMBİYANS SESLERİ, GÖREV LİSTESİ & NOTLAR & MOTİVASYON ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 1. ARKA PLAN ODAK SESLERİ (AMBIENT GENERATOR) */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: 24,
              border: `1.5px solid ${themeObj.border}`,
              padding: '1.25rem',
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px -2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Headphones size={18} color={themeObj.accent} />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
                    Arka Plan Odak Sesleri
                  </h3>
                </div>
                <button
                  onClick={handleMuteAll}
                  style={{
                    background: themeObj.buttonBg,
                    border: `1px solid ${themeObj.border}`,
                    color: themeObj.text,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  {Object.values(soundVolumes).some(v => v > 0) ? '🔇 Sustur' : '🔊 Hızlı Aç'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { key: 'rain', label: 'Yağmur Sesi', icon: '🌧️' },
                  { key: 'waves', label: 'Okyanus Dalgası', icon: '🌊' },
                  { key: 'fire', label: 'Şömine Çıtırtısı', icon: '🔥' },
                  { key: 'binaural', label: '432Hz Derin Odak (Alpha)', icon: '🧠' },
                  { key: 'whitenoise', label: 'Beyaz Gürültü (Zen)', icon: '💨' }
                ].map(snd => {
                  const vol = soundVolumes[snd.key] || 0;
                  return (
                    <div key={snd.key} style={{ background: themeObj.innerBg, borderRadius: 14, padding: '0.6rem 0.8rem', border: `1.5px solid ${themeObj.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: themeObj.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{snd.icon}</span> {snd.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: vol > 0 ? themeObj.accent : themeObj.subText }}>
                          {vol > 0 ? `%${vol}` : 'Kapalı'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={vol}
                        onChange={e => handleVolumeChange(snd.key, e.target.value)}
                        style={{
                          width: '100%',
                          accentColor: themeObj.accent,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. HEDEF GÖREV LİSTESİ & NOTLAR */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: 24,
              border: `1.5px solid ${themeObj.border}`,
              padding: '1.25rem',
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ListTodo size={18} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
                    Hedef Görev Listesi
                  </h3>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800 }}>
                  {todoList.filter(t => t.done).length}/{todoList.length} Tamamlandı
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                {todoList.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setTodoList(todoList.map(t => t.id === item.id ? { ...t, done: !t.done } : t))}
                    style={{
                      background: item.done ? (themeObj.isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4') : themeObj.innerBg,
                      borderRadius: 12,
                      padding: '0.5rem 0.75rem',
                      border: `1.5px solid ${item.done ? (themeObj.isDark ? 'rgba(16, 185, 129, 0.4)' : '#bbf7d0') : themeObj.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        background: item.done ? '#10b981' : 'transparent',
                        border: '2px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.done && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.done ? '#10b981' : themeObj.text, textDecoration: item.done ? 'line-through' : 'none' }}>
                        {item.text}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTodoList(todoList.filter(t => t.id !== item.id));
                      }}
                      style={{ background: 'none', border: 'none', color: themeObj.subText, cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new todo */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Yeni hedef ekle..."
                  value={newTodoText}
                  onChange={e => setNewTodoText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTodoText.trim()) {
                      setTodoList([...todoList, { id: String(Date.now()), text: newTodoText.trim(), done: false }]);
                      setNewTodoText('');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: 10,
                    border: `1.5px solid ${themeObj.border}`,
                    background: themeObj.innerBg,
                    color: themeObj.text,
                    fontSize: '0.78rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => {
                    if (newTodoText.trim()) {
                      setTodoList([...todoList, { id: String(Date.now()), text: newTodoText.trim(), done: false }]);
                      setNewTodoText('');
                    }
                  }}
                  style={{
                    background: themeObj.accent,
                    border: 'none',
                    color: 'white',
                    borderRadius: 10,
                    padding: '0.5rem 0.8rem',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Ekle
                </button>
              </div>

              {/* Scratchpad Notes */}
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Edit3 size={15} color={themeObj.accent} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: themeObj.text }}>Hızlı Notlar & Karalama</span>
                </div>
                <textarea
                  placeholder="Çalışırken aklına gelen formülleri veya önemli notları buraya yaz..."
                  value={scratchNotes}
                  onChange={e => setScratchNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 12,
                    border: `1.5px solid ${themeObj.border}`,
                    background: themeObj.innerBg,
                    color: themeObj.text,
                    fontSize: '0.75rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* 3. MOTIVATIONAL QUOTE BANNER */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(16px)',
              borderRadius: 22,
              border: `1.5px solid ${themeObj.border}`,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: themeObj.isDark ? 'rgba(255,255,255,0.15)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>
                ✨
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: themeObj.text, lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{FOCUS_QUOTES[activeQuoteIndex]}"
                </div>
              </div>
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

    </div>
  );
}
