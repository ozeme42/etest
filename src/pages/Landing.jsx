import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, BookOpen, Trophy, Users, Zap, Target, 
  BarChart3, CheckCircle2, ChevronRight, ArrowRight, Star, 
  Sparkles, Flame, Clock, Calendar, ShieldCheck, LogIn, AlertCircle, FileText, PlayCircle, HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks } = useHomework();
  const { submissions } = useEvaluation();
  const { studyPlans, studyAssignments } = useStudyPlan();
  const { books } = useTrackedBooks();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute live system stats
  const totalHomeworks = homeworks?.length || 0;
  const totalSubmissions = submissions?.length || 0;
  const totalPlans = studyPlans?.length || 0;
  const totalBooks = books?.length || 0;

  // Compute pending tasks for student if logged in
  const myPendingTasks = currentUser?.role === 'student' 
    ? (homeworks || []).filter(hw => {
        const solved = (submissions || []).some(s => String(s.hwId || s.testId) === String(hw.id) && String(s.studentId) === String(currentUser.id));
        return !solved;
      }).slice(0, 3)
    : [];

  const myAssignments = currentUser?.role === 'student'
    ? (studyAssignments || []).filter(a => String(a.studentId) === String(currentUser.id))
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes proFadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes proPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
        @keyframes proShimmer { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
        
        .pro-tile { transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
        .pro-tile:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.12) !important; }
        .pro-tile:active { transform: scale(0.98); }
        
        .pro-btn { transition: all 0.18s ease; }
        .pro-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .pro-btn:active { transform: scale(0.97); }
        
        .pro-card { transition: all 0.2s ease; }
        .pro-card:hover { border-color: #cbd5e1; box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
      `}</style>

      {/* ════════════════ 1. HERO BANNER ════════════════ */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6d28d9 100%)',
        padding: isMobile ? '2rem 1rem 4rem' : '3rem 2rem 5rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(49,46,129,0.25)'
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 260, height: 260, background: 'rgba(168,85,247,0.15)', borderRadius: '50%', filter: 'blur(45px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          
          {/* Top user bar or login badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.4rem 1rem', borderRadius: 99 }}>
              <Sparkles size={16} color="#fbbf24" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>E-Test Pro Portalı 2026</span>
            </div>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.4rem 0.85rem', borderRadius: 99 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>
                  {currentUser.name?.charAt(0)}
                </div>
                <span style={{ color: 'white', fontWeight: 800, fontSize: '0.82rem' }}>{currentUser.name}</span>
                <span style={{ background: '#22c55e', color: 'white', fontSize: '0.62rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99, textTransform: 'uppercase' }}>
                  {currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Admin'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate('/login')} className="pro-btn" style={{ background: 'white', color: '#4338ca', border: 'none', borderRadius: 99, padding: '0.45rem 1.1rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  Giriş Yap
                </button>
              </div>
            )}
          </div>

          {/* Hero main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '2rem', alignItems: 'center' }}>
            
            {/* Left Column: Heading + CTAs */}
            <div style={{ animation: 'proFadeUp 0.5s ease both' }}>
              <h1 style={{ fontSize: isMobile ? '1.85rem' : '2.8rem', fontWeight: 900, color: 'white', margin: '0 0 1rem 0', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                Akıllı Eğitim, Yol Haritaları & <span style={{ background: 'linear-gradient(135deg, #a5b4fc, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Canlı Analiz Portalı</span>
              </h1>
              <p style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 1.75rem 0', lineHeight: 1.6, fontWeight: 500, maxWidth: 620 }}>
                Öğrenciler için adımsayarlı yol haritaları ve test modülleri; öğretmenler için optik karne analizi, soru bankası ve ödev takip sistemi.
              </p>

              <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                {currentUser?.role === 'student' ? (
                  <button onClick={() => navigate('/student')} className="pro-btn" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '0.85rem 1.6rem', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                    <GraduationCap size={20} /> Öğrenci Paneline Git <ArrowRight size={18} />
                  </button>
                ) : currentUser?.role === 'teacher' ? (
                  <button onClick={() => navigate('/teacher')} className="pro-btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '0.85rem 1.6rem', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
                    <Users size={20} /> Öğretmen Paneline Git <ArrowRight size={18} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => navigate('/student')} className="pro-btn" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '0.85rem 1.5rem', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                      <GraduationCap size={18} /> Öğrenci Portalı <ChevronRight size={16} />
                    </button>
                    <button onClick={() => navigate('/teacher')} className="pro-btn" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '0.85rem 1.5rem', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={18} /> Öğretmen & Koç Portalı
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic System Overview Card */}
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 24, padding: isMobile ? '1.25rem' : '1.75rem', animation: 'proFadeUp 0.6s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 8, marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sistem Durumu</div>
                  <div style={{ fontSize: '1.1rem', color: 'white', fontWeight: 900, marginTop: 2 }}>Canlı Veri Özeti</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
                  <BarChart3 size={20} color="white" />
                </div>
              </div>

              {/* Stats 2x2 grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.85rem 1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{totalHomeworks}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: 4 }}>Toplam Ödev & Test</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.85rem 1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{totalSubmissions}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: 4 }}>Tamamlanan Sınav</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.85rem 1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{totalPlans}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: 4 }}>Yol Haritası</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.85rem 1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{totalBooks}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: 4 }}>Kayıtlı Kitap</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* White curved wave */}
        <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ width: '100%', height: 48, display: 'block' }}>
            <path d="M0,48 C360,10 1080,10 1440,48 L1440,48 L0,48 Z" fill="#f8fafc" />
          </svg>
        </div>
      </div>

      {/* ════════════════ 2. PRO COMMAND TILES ════════════════ */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '1.5rem 1rem' : '2rem', marginTop: -20, position: 'relative', zIndex: 10 }}>
        
        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem' }}>
          <Zap size={15} color="#6366f1" /> Hızlı İşlem & Portal Merkezleri
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '0.85rem' : '1.25rem' }}>
          
          {/* Tile 1: Öğrenci Paneli */}
          <div onClick={() => navigate('/student')} className="pro-tile"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 24, padding: isMobile ? '1.15rem' : '1.5rem', cursor: 'pointer', color: 'white', boxShadow: '0 8px 24px rgba(79,70,229,0.18)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: isMobile ? 130 : 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={24} />
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>Öğrenci Paneli</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>Ödevler, karne & istatistikler</div>
            </div>
          </div>

          {/* Tile 2: Kitaplarım */}
          <div onClick={() => navigate('/student/books')} className="pro-tile"
            style={{ background: 'linear-gradient(135deg, #0891b2, #0d9488)', borderRadius: 24, padding: isMobile ? '1.15rem' : '1.5rem', cursor: 'pointer', color: 'white', boxShadow: '0 8px 24px rgba(8,145,178,0.18)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: isMobile ? 130 : 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={24} />
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>Kitaplarım</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>Akıllı kitap takibi & testler</div>
            </div>
          </div>

          {/* Tile 3: Yol Haritaları */}
          <div onClick={() => navigate('/study-plans')} className="pro-tile"
            style={{ background: 'linear-gradient(135deg, #9333ea, #c026d3)', borderRadius: 24, padding: isMobile ? '1.15rem' : '1.5rem', cursor: 'pointer', color: 'white', boxShadow: '0 8px 24px rgba(147,51,234,0.18)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: isMobile ? 130 : 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={24} />
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>Yol Haritaları</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>Günü gününe müfredat adımları</div>
            </div>
          </div>

          {/* Tile 4: Karne & Analiz */}
          <div onClick={() => navigate('/student-results')} className="pro-tile"
            style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', borderRadius: 24, padding: isMobile ? '1.15rem' : '1.5rem', cursor: 'pointer', color: 'white', boxShadow: '0 8px 24px rgba(22,163,74,0.18)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: isMobile ? 130 : 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={24} />
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>Karne & Analiz</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>Optik sonuçlar & başarı grafikleri</div>
            </div>
          </div>

          {/* Tile 5: Yanlış Soru Havuzu */}
          <div onClick={() => navigate('/wrong-answers')} className="pro-tile"
            style={{ background: 'linear-gradient(135deg, #db2777, #e11d48)', borderRadius: 24, padding: isMobile ? '1.15rem' : '1.5rem', cursor: 'pointer', color: 'white', boxShadow: '0 8px 24px rgba(219,39,119,0.18)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: isMobile ? 130 : 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={24} />
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>Yanlış Havuzu</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>Hatalı sorularla akıllı tekrar</div>
            </div>
          </div>

          {/* Tile 6: Öğretmen & Koçluk */}
          <div onClick={() => navigate('/teacher')} className="pro-tile"
            style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)', borderRadius: 24, padding: isMobile ? '1.15rem' : '1.5rem', cursor: 'pointer', color: 'white', boxShadow: '0 8px 24px rgba(234,88,12,0.18)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: isMobile ? 130 : 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>Koçluk & Yönetim</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>Öğrenci takibi & ödev yönetimi</div>
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════ 3. DYNAMIC WIDGETS & SECTIONS ════════════════ */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem 2rem 4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '1.5rem' }}>
          
          {/* Left Column: Pending Tasks & Roadmaps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Pending Tasks */}
            <div style={{ background: 'white', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={20} color="#6366f1" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>Bekleyen Sınav & Ödevler</h3>
                </div>
                <button onClick={() => navigate('/student')} className="pro-btn" style={{ background: '#eef2ff', color: '#6366f1', border: 'none', borderRadius: 10, padding: '0.35rem 0.75rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Tümünü Gör →
                </button>
              </div>

              {myPendingTasks.length === 0 ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '1px border-dashed #cbd5e1' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🎉</div>
                  <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.88rem' }}>Bekleyen ödev veya test yok!</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>Tüm ödevlerin tamamlandı veya öğretmen ataması bekleniyor.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myPendingTasks.map(task => (
                    <div key={task.id} style={{ padding: '0.85rem 1rem', borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#6366f1', background: '#eef2ff', padding: '0.15rem 0.5rem', borderRadius: 99, textTransform: 'uppercase' }}>
                          {task.subject || 'Genel'}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/quiz/${task.id}?studentId=${currentUser.id}`)} className="pro-btn" style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, padding: '0.45rem 0.85rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <PlayCircle size={14} /> Çöz
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Roadmaps Overview */}
            <div style={{ background: 'white', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={20} color="#9333ea" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>Aktif Yol Haritaları</h3>
                </div>
                <button onClick={() => navigate('/study-plans')} className="pro-btn" style={{ background: '#f3e8ff', color: '#9333ea', border: 'none', borderRadius: 10, padding: '0.35rem 0.75rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Tüm Planlar →
                </button>
              </div>

              {studyPlans.length === 0 ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 16 }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🗺️</div>
                  <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.88rem' }}>Henüz yol haritası eklenmedi</div>
                  <button onClick={() => navigate('/study-plans')} className="pro-btn" style={{ marginTop: 8, background: '#9333ea', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                    İlk Planı Oluştur
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {studyPlans.slice(0, 3).map(plan => {
                    const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
                    return (
                      <div key={plan.id} onClick={() => navigate(`/study-plans/${plan.id}`)} style={{ padding: '0.85rem 1rem', borderRadius: 16, background: '#faf5ff', border: '1px solid #f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} className="pro-card">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#581c87' }}>{plan.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#7e22ce', fontWeight: 600, marginTop: 2 }}>{plan.subjects?.length || 0} Ünite · {totalTopics} Konu</div>
                        </div>
                        <ChevronRight size={18} color="#a855f7" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Motivation & Quick Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Daily Motivation Widget */}
            <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: 24, padding: '1.5rem', border: '1px solid #fcd34d', boxShadow: '0 4px 20px rgba(245,158,11,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Flame size={22} color="#f59e0b" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#92400e' }}>Günün Motivasyonu</h4>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5, fontWeight: 700, fontStyle: 'italic', borderLeft: '3px solid #f59e0b', paddingLeft: 10 }}>
                "Disiplin, ne istediğin ile şu anda neyi daha çok istediğin arasındaki seçimdir!" 🌟
              </p>
              <div style={{ display: 'flex', items: 'center', gap: 6 }}>
                {['Paz','Sal','Çar','Per','Cum','Cmt','Paz'].map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', background: i < 5 ? '#f59e0b' : 'rgba(245,158,11,0.2)', padding: '0.35rem 0', borderRadius: 8, color: 'white', fontWeight: 900, fontSize: '0.62rem' }}>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links Card */}
            <div style={{ background: 'white', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={18} color="#10b981" /> Hizmet & Araç Bağlantıları
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <Link to="/physical-exam" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 12, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>📝 Fiziksel Deneme Hazırlama</span>
                  <ChevronRight size={16} color="#94a3b8" />
                </Link>
                <Link to="/questions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 12, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>🗃️ Soru Bankası Havuzu</span>
                  <ChevronRight size={16} color="#94a3b8" />
                </Link>
                <Link to="/statistics" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 12, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>📈 Genel İstatistik & Grafikler</span>
                  <ChevronRight size={16} color="#94a3b8" />
                </Link>
                <Link to="/goals" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 12, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>🎯 Hedefler & Çalışma Programı</span>
                  <ChevronRight size={16} color="#94a3b8" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
