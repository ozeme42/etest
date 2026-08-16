import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Sparkles, Flame, CheckCircle2, Clock, Music, Headphones, BookOpen,
  Target, Coffee, Moon, Sun, ArrowLeft, Plus, Trash2, Check, BarChart2,
  Zap, Settings2, Bell, Award, ListTodo, Edit3, Shield
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
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 1.2); // C6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 1.2);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.5);
      osc2.stop(now + 2.5);
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
        // Rain: Pink-ish filtered noise
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
        // Ocean Waves: Modulated low-pass noise
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

        // LFO for surge
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.15, now); // ~7 sec wave cycle
        lfoGain.gain.setValueAtTime(300, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(0);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain, lfo };
      } else if (type === 'binaural') {
        // 432Hz Deep Focus Alpha wave (432Hz + 442Hz = 10Hz Alpha pulse)
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
        // Crackling fireplace: White noise with burst filtering
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
        // Pure smooth white noise
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
  "Şimdi gösterdiğin 25 dakikalık odaklanma, gelecekteki seni gururlandıracak.",
  "Dikkatini dağıtan şeyleri sustur; hedeflerinin sesini yükselt.",
  "Zor olan başlamaktır; başladığında odaklanma kendiliğinden akar.",
  "Her çözülen soru ve her biten seans, seni zirveye bir adım daha yaklaştırır.",
  "Bugün yapacağın fedakarlıklar, yarının özgürlüğü ve mutluluğudur.",
  "Önemli olan ne kadar çalıştığın değil, ne kadar odaklı çalıştığındır."
];

// ─── THEMES ────────────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'cozy',
    name: '☕ Sıcak Çalışma Odası',
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    cardBg: 'rgba(30, 27, 75, 0.65)',
    border: 'rgba(99, 102, 241, 0.3)',
    accent: '#6366f1',
    text: '#ffffff',
    subText: '#c7d2fe'
  },
  {
    id: 'zen',
    name: '🎋 Gece Zen / Minimal',
    bg: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    border: 'rgba(148, 163, 184, 0.2)',
    accent: '#38bdf8',
    text: '#f8fafc',
    subText: '#94a3b8'
  },
  {
    id: 'nature',
    name: '🌿 Orman & Doğa',
    bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    cardBg: 'rgba(6, 78, 59, 0.65)',
    border: 'rgba(52, 211, 153, 0.3)',
    accent: '#10b981',
    text: '#ffffff',
    subText: '#a7f3d0'
  },
  {
    id: 'sunset',
    name: '🌅 Günbatımı Odaklanması',
    bg: 'linear-gradient(135deg, #4c0519 0%, #831843 50%, #9d174d 100%)',
    cardBg: 'rgba(76, 5, 25, 0.65)',
    border: 'rgba(244, 114, 182, 0.3)',
    accent: '#f43f5e',
    text: '#ffffff',
    subText: '#fbcfe8'
  }
];

export default function StudyRoomPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { books, bookTests } = useTrackedBooks();
  const { studyAssignments, studyPlans } = useStudyPlan();

  // Timer Modes
  // 'pomodoro' (25m), 'shortBreak' (5m), 'longBreak' (15m), 'stopwatch' (free count-up)
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [durations, setDurations] = useState(() => {
    const saved = localStorage.getItem('study_durations');
    return saved ? JSON.parse(saved) : { pomodoro: 25, shortBreak: 5, longBreak: 15 };
  });

  const [timeLeft, setTimeLeft] = useState(durations.pomodoro * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('cozy');
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);

  // Focus Target & Checklist
  const [currentTask, setCurrentTask] = useState(() => localStorage.getItem('study_current_task') || '');
  const [selectedSubject, setSelectedSubject] = useState('Genel');
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [targetQuestions, setTargetQuestions] = useState(20);
  const [todoList, setTodoList] = useState(() => {
    const saved = localStorage.getItem('study_todolist');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Konu özetini gözden geçir', done: false },
      { id: '2', text: 'Hedef test sorularını çöz', done: false },
      { id: '3', text: 'Yanlış yapılan soruları incele', done: false }
    ];
  });
  const [newTodoText, setNewTodoText] = useState('');

  // Scratchpad Notes
  const [scratchNotes, setScratchNotes] = useState(() => localStorage.getItem('study_scratch_notes') || '');

  // Ambient Sound volumes (0 to 100)
  const [soundVolumes, setSoundVolumes] = useState({
    rain: 0,
    waves: 0,
    binaural: 0,
    fire: 0,
    whitenoise: 0
  });

  // Daily Stats & History
  const [dailyStats, setDailyStats] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_stats_${todayKey}`);
    return saved ? JSON.parse(saved) : { totalMinutes: 0, pomodorosDone: 0, questionsDone: 0 };
  });

  const [completedCycles, setCompletedCycles] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const timerRef = useRef(null);
  const stopwatchRef = useRef(null);
  const containerRef = useRef(null);

  const themeObj = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  // Rotate quotes every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveQuoteIndex(prev => (prev + 1) % FOCUS_QUOTES.length);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('study_durations', JSON.stringify(durations));
  }, [durations]);

  useEffect(() => {
    localStorage.setItem('study_current_task', currentTask);
  }, [currentTask]);

  useEffect(() => {
    localStorage.setItem('study_todolist', JSON.stringify(todoList));
  }, [todoList]);

  useEffect(() => {
    localStorage.setItem('study_scratch_notes', scratchNotes);
  }, [scratchNotes]);

  // Persist Daily Stats
  const saveDailyStats = (updated) => {
    setDailyStats(updated);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_stats_${todayKey}`, JSON.stringify(updated));
  };

  // Sound changes effect
  const handleVolumeChange = (type, val) => {
    const num = Number(val);
    setSoundVolumes(prev => ({ ...prev, [type]: num }));
    ambientAudio.setSoundVolume(type, num / 100);
  };

  // Stop sounds on unmount
  useEffect(() => {
    return () => {
      ambientAudio.stopAll();
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, []);

  // Timer Tick
  useEffect(() => {
    if (timerMode === 'stopwatch') {
      if (isRunning) {
        stopwatchRef.current = setInterval(() => {
          setStopwatchSeconds(prev => {
            const next = prev + 1;
            if (next % 60 === 0) {
              // add a focus minute
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

    // Pomodoro / Break countdown
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          if (timerMode === 'pomodoro' && prev % 60 === 0) {
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
  }, [isRunning, timerMode, dailyStats]);

  const handleTimerComplete = () => {
    ambientAudio.playChime();
    if (timerMode === 'pomodoro') {
      const newCycles = completedCycles + 1;
      setCompletedCycles(newCycles);
      saveDailyStats({
        ...dailyStats,
        totalMinutes: dailyStats.totalMinutes + durations.pomodoro,
        pomodorosDone: dailyStats.pomodorosDone + 1
      });

      // Auto cycle: after 4 pomodoros -> Long break, otherwise Short break
      if (newCycles % 4 === 0) {
        setTimerMode('longBreak');
        setTimeLeft(durations.longBreak * 60);
      } else {
        setTimerMode('shortBreak');
        setTimeLeft(durations.shortBreak * 60);
      }
    } else {
      // Break completed -> Return to Pomodoro
      setTimerMode('pomodoro');
      setTimeLeft(durations.pomodoro * 60);
    }
  };

  const switchMode = (mode) => {
    setIsRunning(false);
    setTimerMode(mode);
    if (mode === 'pomodoro') setTimeLeft(durations.pomodoro * 60);
    else if (mode === 'shortBreak') setTimeLeft(durations.shortBreak * 60);
    else if (mode === 'longBreak') setTimeLeft(durations.longBreak * 60);
    else if (mode === 'stopwatch') setStopwatchSeconds(0);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerMode === 'pomodoro') setTimeLeft(durations.pomodoro * 60);
    else if (timerMode === 'shortBreak') setTimeLeft(durations.shortBreak * 60);
    else if (timerMode === 'longBreak') setTimeLeft(durations.longBreak * 60);
    else if (timerMode === 'stopwatch') setStopwatchSeconds(0);
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

  // Format time mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage for circular ring
  const totalModeSeconds = timerMode === 'pomodoro'
    ? durations.pomodoro * 60
    : timerMode === 'shortBreak'
      ? durations.shortBreak * 60
      : durations.longBreak * 60;

  const progressPct = timerMode === 'stopwatch'
    ? Math.min(100, (stopwatchSeconds % 3600) / 36)
    : Math.max(0, Math.min(100, ((totalModeSeconds - timeLeft) / totalModeSeconds) * 100));

  // Quick Task Suggestions from Book Assignments / Roadmaps
  const studentActiveTasks = useMemo(() => {
    const list = [];
    (books || []).forEach(b => {
      (b.subjects || []).forEach(s => {
        list.push(`${b.title} — ${s.name}`);
      });
    });
    (studyPlans || []).forEach(p => {
      (p.subjects || []).forEach(s => {
        list.push(`${p.title} • ${s.name}`);
      });
    });
    return list.slice(0, 8);
  }, [books, studyPlans]);

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
        transition: 'background 0.5s ease'
      }}
    >
      {/* ─── HEADER / NAV BAR ─── */}
      <div style={{
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${themeObj.border}`,
        backdropFilter: 'blur(12px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: `1px solid ${themeObj.border}`,
              color: 'white',
              borderRadius: 12,
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🎧</span>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'white' }}>
                Odaklı Çalışma Odası
              </h1>
              <span style={{
                background: 'rgba(255,255,255,0.15)',
                color: themeObj.accent,
                fontSize: '0.65rem',
                fontWeight: 900,
                padding: '0.2rem 0.55rem',
                borderRadius: 99,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                border: `1px solid ${themeObj.border}`
              }}>
                PRO POMODORO
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600, marginTop: 1 }}>
              {currentUser?.name || 'Öğrenci'} · Derin Odaklanma Alanı
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme Selector */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 14, border: `1px solid ${themeObj.border}` }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                title={t.name}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTheme === t.id ? themeObj.accent : 'transparent',
                  color: 'white',
                  transition: 'all 0.2s'
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
              background: 'rgba(255,255,255,0.12)',
              border: `1px solid ${themeObj.border}`,
              color: 'white',
              borderRadius: 12,
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.75rem',
              fontWeight: 800
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Zen Ekran</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{
        flex: 1,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        padding: '1.25rem',
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '1.4fr 1fr',
        gap: '1.25rem',
        boxSizing: 'border-box'
      }}>

        {/* ─── LEFT COLUMN: POMODORO & TIMER ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* TIMER CARD */}
          <div style={{
            background: themeObj.cardBg,
            backdropFilter: 'blur(20px)',
            borderRadius: 28,
            border: `1.5px solid ${themeObj.border}`,
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Mode Switcher Buttons */}
            <div style={{
              display: 'flex',
              gap: 6,
              background: 'rgba(0,0,0,0.25)',
              padding: 6,
              borderRadius: 18,
              border: `1px solid ${themeObj.border}`,
              marginBottom: '1.75rem',
              maxWidth: '100%',
              overflowX: 'auto'
            }}>
              {[
                { key: 'pomodoro', label: '🎯 Pomodoro', time: `${durations.pomodoro} dk` },
                { key: 'shortBreak', label: '☕ Kısa Mola', time: `${durations.shortBreak} dk` },
                { key: 'longBreak', label: '🏖️ Uzun Mola', time: `${durations.longBreak} dk` },
                { key: 'stopwatch', label: '⏱️ Kronometre', time: 'Serbest' }
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 14,
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: timerMode === m.key ? themeObj.accent : 'transparent',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    boxShadow: timerMode === m.key ? `0 4px 15px ${themeObj.accent}66` : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{m.label}</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>{m.time}</span>
                </button>
              ))}
            </div>

            {/* Big Circular Timer Display */}
            <div style={{
              position: 'relative',
              width: 240,
              height: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.75rem'
            }}>
              <svg width="240" height="240" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  stroke={themeObj.accent}
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 105}
                  strokeDashoffset={2 * Math.PI * 105 * (1 - progressPct / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>

              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <div style={{
                  fontSize: '3.6rem',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: `0 4px 20px ${themeObj.accent}88`
                }}>
                  {timerMode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(timeLeft)}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: themeObj.subText,
                  marginTop: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {timerMode === 'pomodoro' ? '🔥 Odaklanma Seansı' : timerMode === 'stopwatch' ? '⏱️ Çalışma Süresi' : '🍃 Dinlenme Zamanı'}
                </div>
              </div>
            </div>

            {/* Timer Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
              <button
                onClick={resetTimer}
                title="Sıfırla"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.1)',
                  border: `1px solid ${themeObj.border}`,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <RotateCcw size={20} />
              </button>

              <button
                onClick={() => setIsRunning(!isRunning)}
                style={{
                  padding: '0.9rem 2.5rem',
                  borderRadius: 20,
                  background: isRunning ? '#ef4444' : themeObj.accent,
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: `0 8px 25px ${isRunning ? '#ef444466' : themeObj.accent + '66'}`,
                  transition: 'all 0.2s',
                  transform: isRunning ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {isRunning ? <><Pause size={22} fill="white" /> Duraklat</> : <><Play size={22} fill="white" /> Başlat</>}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                title="Süre Ayarları"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: showSettings ? themeObj.accent : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${themeObj.border}`,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Settings2 size={20} />
              </button>
            </div>

            {/* Pomodoro Cycles Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[0, 1, 2, 3].map(i => {
                const isDone = completedCycles > i;
                const isCurrent = completedCycles === i && timerMode === 'pomodoro';
                return (
                  <div
                    key={i}
                    title={`${i + 1}. Pomodoro`}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 99,
                      background: isDone ? '#10b981' : isCurrent ? themeObj.accent : 'rgba(255,255,255,0.2)',
                      border: isCurrent ? '2px solid white' : 'none',
                      boxShadow: isDone ? '0 0 10px #10b981' : isCurrent ? `0 0 10px ${themeObj.accent}` : 'none',
                      transition: 'all 0.3s'
                    }}
                  />
                );
              })}
              <span style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 700, marginLeft: 6 }}>
                Döngü {Math.floor(completedCycles / 4) + 1}
              </span>
            </div>

            {/* Expandable Duration Settings */}
            {showSettings && (
              <div style={{
                marginTop: '1.5rem',
                width: '100%',
                background: 'rgba(0,0,0,0.35)',
                padding: '1.25rem',
                borderRadius: 20,
                border: `1px solid ${themeObj.border}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10
              }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText, display: 'block', marginBottom: 4 }}>🎯 Odak (dk)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={durations.pomodoro}
                    onChange={e => {
                      const val = Number(e.target.value) || 25;
                      setDurations(p => ({ ...p, pomodoro: val }));
                      if (timerMode === 'pomodoro') setTimeLeft(val * 60);
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 10, border: `1px solid ${themeObj.border}`, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, textAlign: 'center', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText, display: 'block', marginBottom: 4 }}>☕ Kısa Mola (dk)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={durations.shortBreak}
                    onChange={e => {
                      const val = Number(e.target.value) || 5;
                      setDurations(p => ({ ...p, shortBreak: val }));
                      if (timerMode === 'shortBreak') setTimeLeft(val * 60);
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 10, border: `1px solid ${themeObj.border}`, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, textAlign: 'center', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText, display: 'block', marginBottom: 4 }}>🏖️ Uzun Mola (dk)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={durations.longBreak}
                    onChange={e => {
                      const val = Number(e.target.value) || 15;
                      setDurations(p => ({ ...p, longBreak: val }));
                      if (timerMode === 'longBreak') setTimeLeft(val * 60);
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 10, border: `1px solid ${themeObj.border}`, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, textAlign: 'center', outline: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* MOTIVATIONAL QUOTE BANNER */}
          <div style={{
            background: themeObj.cardBg,
            backdropFilter: 'blur(16px)',
            borderRadius: 22,
            border: `1px solid ${themeObj.border}`,
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>
              ✨
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'white', lineHeight: 1.4, fontStyle: 'italic' }}>
                "{FOCUS_QUOTES[activeQuoteIndex]}"
              </div>
            </div>
          </div>

          {/* DAILY STATS SUMMARY */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10
          }}>
            {[
              { label: 'Bugün Odak', value: `${dailyStats.totalMinutes} dk`, icon: '⏱️', color: '#38bdf8' },
              { label: 'Tamamlanan Seans', value: `${dailyStats.pomodorosDone}`, icon: '🎯', color: '#10b981' },
              { label: 'Çözülen Soru', value: `${questionsSolved}`, icon: '✏️', color: '#f59e0b' }
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: themeObj.cardBg,
                  backdropFilter: 'blur(16px)',
                  borderRadius: 20,
                  border: `1px solid ${themeObj.border}`,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{stat.icon}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: themeObj.subText }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white' }}>{stat.value}</div>
              </div>
            ))}
          </div>

        </div>

        {/* ─── RIGHT COLUMN: AMBIENT SOUNDS, TASK TRACKER & NOTES ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 1. AMBIENT SOUND GENERATOR (Yerleşik Odak Sesleri) */}
          <div style={{
            background: themeObj.cardBg,
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: `1.5px solid ${themeObj.border}`,
            padding: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Headphones size={18} color={themeObj.accent} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'white' }}>
                  Arka Plan Odak Sesleri
                </h3>
              </div>
              <span style={{ fontSize: '0.68rem', color: themeObj.subText, fontWeight: 700 }}>
                Mikser & Ambiyans
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'rain', label: 'Yağmur Sesi', icon: '🌧️' },
                { key: 'waves', label: 'Okyanus Dalgası', icon: '🌊' },
                { key: 'fire', label: 'Şömine Çıtırtısı', icon: '🔥' },
                { key: 'binaural', label: '432Hz Derin Odak (Alpha)', icon: '🧠' },
                { key: 'whitenoise', label: 'Beyaz Gürültü (Zen)', icon: '💨' }
              ].map(snd => {
                const vol = soundVolumes[snd.key] || 0;
                return (
                  <div key={snd.key} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '0.65rem 0.85rem', border: `1px solid ${themeObj.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
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

          {/* 2. TASK & QUESTION COUNTER */}
          <div style={{
            background: themeObj.cardBg,
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: `1.5px solid ${themeObj.border}`,
            padding: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Target size={18} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'white' }}>
                Şu Anda Ne Çalışıyorsun?
              </h3>
            </div>

            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Örn: Matematik - Kesirler Soru Çözümü..."
                value={currentTask}
                onChange={e => setCurrentTask(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 14,
                  border: `1.5px solid ${themeObj.border}`,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quick Task Suggestions Pill list */}
            {studentActiveTasks.length > 0 && !currentTask && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {studentActiveTasks.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTask(t)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: `1px solid ${themeObj.border}`,
                      color: themeObj.subText,
                      borderRadius: 10,
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}

            {/* Live Question Counter */}
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 16,
              padding: '0.85rem 1rem',
              border: `1px solid ${themeObj.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 700 }}>Çözülen Soru Sayısı</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>
                  {questionsSolved} <span style={{ fontSize: '0.8rem', color: themeObj.subText }}>/ {targetQuestions} Hedef</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setQuestionsSolved(Math.max(0, questionsSolved - 1))}
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer' }}
                >
                  -
                </button>
                <button
                  onClick={() => setQuestionsSolved(questionsSolved + 1)}
                  style={{ width: 36, height: 36, borderRadius: 10, background: '#f59e0b', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  +
                </button>
                <button
                  onClick={() => setQuestionsSolved(questionsSolved + 5)}
                  style={{ padding: '0 0.6rem', borderRadius: 10, background: 'rgba(245, 158, 11, 0.25)', border: '1px solid #f59e0b', color: '#f59e0b', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* 3. CHECKLIST & NOTES */}
          <div style={{
            background: themeObj.cardBg,
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: `1.5px solid ${themeObj.border}`,
            padding: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListTodo size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'white' }}>
                  Hedef Görev Listesi
                </h3>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800 }}>
                {todoList.filter(t => t.done).length}/{todoList.length} Tamamlandı
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {todoList.map(item => (
                <div
                  key={item.id}
                  onClick={() => setTodoList(todoList.map(t => t.id === item.id ? { ...t, done: !t.done } : t))}
                  style={{
                    background: item.done ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: 12,
                    padding: '0.5rem 0.75rem',
                    border: `1px solid ${item.done ? '#10b98155' : themeObj.border}`,
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
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.done ? '#a7f3d0' : 'white', textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTodoList(todoList.filter(t => t.id !== item.id));
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
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
                  border: `1px solid ${themeObj.border}`,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
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
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Edit3 size={15} color={themeObj.accent} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'white' }}>Hızlı Notlar & Karalama</span>
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
                  border: `1px solid ${themeObj.border}`,
                  background: 'rgba(0,0,0,0.25)',
                  color: 'white',
                  fontSize: '0.75rem',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
