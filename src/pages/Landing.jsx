import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  BarChart3,
  BookOpen,
  Sparkles,
  LogIn, 
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes proFadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        
        .pro-btn { transition: all 0.18s ease; }
        .pro-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .pro-btn:active { transform: scale(0.97); }
      `}</style>

      {/* HERO BANNER */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6d28d9 100%)',
        padding: isMobile ? '2rem 1rem 4rem' : '3rem 2rem 5rem',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 260, height: 260, background: 'rgba(168,85,247,0.15)', borderRadius: '50%', filter: 'blur(45px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.4rem 1rem', borderRadius: 99 }}>
              <Sparkles size={16} color="#fbbf24" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>E-Test Pro Portalı 2026</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {currentUser ? (
                 <button onClick={() => navigate(currentUser.role === 'student' ? '/student' : '/teacher')} className="pro-btn" style={{ background: 'white', color: '#4338ca', border: 'none', borderRadius: 99, padding: '0.5rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Panele Git
                 </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="pro-btn" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 99, padding: '0.5rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LogIn size={16} /> Giriş Yap
                  </button>
                  <button onClick={() => navigate('/login')} className="pro-btn" style={{ background: 'white', color: '#4338ca', border: 'none', borderRadius: 99, padding: '0.5rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserPlus size={16} /> Kayıt Ol
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1, animation: 'proFadeUp 0.5s ease both' }}>
            <h1 style={{ fontSize: isMobile ? '2.2rem' : '3.5rem', fontWeight: 900, color: 'white', margin: '0 0 1.5rem 0', lineHeight: 1.15, letterSpacing: '-0.02em', maxWidth: 800 }}>
              Akıllı Eğitim, Yol Haritaları & <span style={{ background: 'linear-gradient(135deg, #a5b4fc, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Canlı Analiz Portalı</span>
            </h1>
            <p style={{ fontSize: isMobile ? '1rem' : '1.25rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 2.5rem 0', lineHeight: 1.6, fontWeight: 500, maxWidth: 680 }}>
              Öğrenciler için adımsayarlı yol haritaları ve test modülleri; öğretmenler için optik karne analizi, soru bankası ve ödev takip sistemi ile eğitimin yeni çağına adım atın.
            </p>

            {!currentUser && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => navigate('/login')} className="pro-btn" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '1rem 2rem', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                  <UserPlus size={22} /> Hemen Kayıt Ol
                </button>
                <button onClick={() => navigate('/login')} className="pro-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '1rem 2rem', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(10px)' }}>
                  <LogIn size={22} /> Giriş Yap
                </button>
              </div>
            )}
            
            {currentUser && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => navigate(currentUser.role === 'student' ? '/student' : '/teacher')} className="pro-btn" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '1rem 2rem', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                  Panele Git <ArrowRight size={22} />
                </button>
              </div>
            )}
          </div>
          
          {/* Informative Features */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '4rem', animation: 'proFadeUp 0.7s ease both' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: 20, color: 'white' }}>
              <Target size={32} color="#fbbf24" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Yol Haritaları</h3>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
                20 günlük adım adım yol haritaları ile hedefinize planlı şekilde ilerleyin.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: 20, color: 'white' }}>
              <BarChart3 size={32} color="#34d399" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Anında Analiz</h3>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
                Optik form ve soru analizi ile zayıf yönlerinizi anında tespit edin.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: 20, color: 'white' }}>
              <BookOpen size={32} color="#38bdf8" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Soru Havuzu</h3>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
                Yanlış havuzu ve zengin soru bankası ile eksiklerinizi hızla kapatın.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
