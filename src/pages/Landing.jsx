import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, BarChart3, BookOpen, Sparkles, LogIn, UserPlus,
  ArrowRight, CheckCircle, Zap, BookMarked, ClipboardList,
  GraduationCap, Users, Trophy, TrendingUp, ChevronRight,
  Star, Shield, Clock, Brain, Flame, RotateCcw, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function useCounter(end, duration, startVal) {
  if (duration === undefined) duration = 1800;
  if (startVal === undefined) startVal = 0;
  const [count, setCount] = useState(startVal);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !triggered) setTriggered(true);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [triggered]);
  useEffect(() => {
    if (!triggered) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const prog = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setCount(Math.round(startVal + (end - startVal) * ease));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [triggered, end, duration, startVal]);
  return [count, ref];
}

export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') navigate('/admin', { replace: true });
      else if (currentUser.role === 'teacher') navigate('/teacher', { replace: true });
      else navigate('/student', { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(p => (p + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  const [studentCount, studentRef] = useCounter(1240);
  const [questionCount, questionRef] = useCounter(28500);
  const [successRate, successRef] = useCounter(97);

  const goTo = (path) => navigate(path);

  const features = [
    {
      icon: Target, emoji: '🎯', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)',
      bgStyle: 'linear-gradient(135deg,#451a03,#92400e)',
      title: 'Yol Haritaları',
      desc: 'Adım adım yapılandırılmış çalışma planları ile hedeflerinize sistematik biçimde ulaşın. Her konu için özel süre ve hedef belirleme.',
      pills: ['Günlük Plan', 'Haftalık Hedef', 'Konu Takibi'],
    },
    {
      icon: BarChart3, emoji: '📊', color: '#10b981', glow: 'rgba(16,185,129,0.3)',
      bgStyle: 'linear-gradient(135deg,#022c22,#064e3b)',
      title: 'Anında Analiz',
      desc: 'Optik form, PDF ve online testlerden gelen verileri anında analiz edin. Doğru/yanlış dağılımı, konu bazlı zayıflıklar, başarı grafiği.',
      pills: ['Optik Form', 'PDF Test', 'Karne Grafikleri'],
    },
    {
      icon: BookOpen, emoji: '📚', color: '#38bdf8', glow: 'rgba(56,189,248,0.3)',
      bgStyle: 'linear-gradient(135deg,#0c1445,#1e3a5f)',
      title: 'Soru Havuzu',
      desc: 'Yanlış yaptığın soruları tekrar çöz, çoktan seçmeli ve açık uçlu soru formatları ile kapsamlı hazırlık yap. Akıllı tekrar sistemi.',
      pills: ['Yanlış Havuzu', 'Konu Filtreleme', 'Akıllı Tekrar'],
    },
  ];

  const teacherFeats = [
    { icon: ClipboardList, text: 'Ödev & Test Atama', color: '#818cf8' },
    { icon: BarChart3, text: 'Performans Grafikleri', color: '#34d399' },
    { icon: FileText, text: 'Optik Form Okuma', color: '#f472b6' },
    { icon: Users, text: 'Çoklu Öğrenci Yönetimi', color: '#fbbf24' },
    { icon: BookMarked, text: 'Kitap Test Modülü', color: '#38bdf8' },
    { icon: Brain, text: 'Koçluk Profili', color: '#a78bfa' },
  ];

  const studentFeats = [
    { icon: Target, text: 'Kişisel Yol Haritası', color: '#f59e0b' },
    { icon: Zap, text: 'Anlık Ödev Akışı', color: '#818cf8' },
    { icon: Trophy, text: 'Başarı Rozetleri', color: '#fbbf24' },
    { icon: TrendingUp, text: 'İlerleme Takibi', color: '#34d399' },
    { icon: RotateCcw, text: 'Yanlış Tekrarı', color: '#f472b6' },
    { icon: Clock, text: 'Günlük Program', color: '#38bdf8' },
  ];

  const af = features[activeFeature];

  return (
    <div style={{ minHeight:'100vh', background:'#070714', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", overflowX:'hidden', color:'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; }
        @keyframes lndFadeUp { from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)} }
        @keyframes lndFloat { 0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)} }
        @keyframes lndPulse { 0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.1)} }
        @keyframes lndSpin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes lndAurora { 0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.1)}66%{transform:translate(-20px,15px) scale(0.95)} }
        @keyframes lndShimmer { from{background-position:200% 0}to{background-position:-200% 0} }
        @keyframes lndBadgePop { 0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1} }
        @keyframes lndStarTwinkle { 0%,100%{opacity:0.12}50%{opacity:0.7} }
        @keyframes marqueeLeft { from{transform:translateX(0)}to{transform:translateX(-50%)} }
        .lnd-btn{transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer}
        .lnd-btn:hover{transform:translateY(-3px) scale(1.03)}
        .lnd-btn:active{transform:scale(0.97)}
        .lnd-shimmer-text{
          background:linear-gradient(90deg,#a5b4fc 0%,#f0abfc 25%,#fbbf24 50%,#f0abfc 75%,#a5b4fc 100%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation:lndShimmer 4s linear infinite;
        }
        .lnd-panel-card{transition:all 0.3s ease}
        .lnd-panel-card:hover{transform:translateY(-8px)}
        .lnd-feat-item{transition:all 0.2s ease;cursor:default}
        .lnd-feat-item:hover{transform:translateX(4px);background:rgba(255,255,255,0.07)!important}
        .lnd-nav-pill{transition:all 0.2s ease}
        .lnd-nav-pill:hover{background:rgba(255,255,255,0.15)!important}
        .lnd-trust{transition:all 0.25s ease}
        .lnd-trust:hover{transform:translateY(-4px);border-color:rgba(99,102,241,0.3)!important}
      `}</style>

      {/* Stars */}
      {[...Array(26)].map((_,i) => {
        const sz = Math.random()*2.2+0.7;
        return <div key={i} style={{ position:'fixed', width:sz, height:sz, top:`${Math.random()*80}%`, left:`${Math.random()*100}%`, borderRadius:'50%', background:'white', animation:`lndStarTwinkle ${Math.random()*3+2}s ease-in-out ${Math.random()*3}s infinite`, pointerEvents:'none', zIndex:0 }} />;
      })}

      {/* NAVBAR */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:scrolled?'rgba(7,7,20,0.92)':'transparent', backdropFilter:scrolled?'blur(20px)':'none', borderBottom:scrolled?'1px solid rgba(255,255,255,0.07)':'none', transition:'all 0.35s ease', padding:isMobile?'0.7rem 1rem':'0.82rem 2.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(99,102,241,0.55)', flexShrink:0 }}><Zap size={20} color="white" fill="white" /></div>
          <div>
            <div style={{ fontSize:'0.9rem', fontWeight:900, color:'white', letterSpacing:'-0.01em', lineHeight:1 }}>E-TEST PRO</div>
            <div style={{ fontSize:'0.48rem', fontWeight:700, color:'rgba(165,180,252,0.75)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Eğitim Portalı 2026</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {currentUser ? (
            <button onClick={() => goTo(currentUser.role==='student'?'/student':'/teacher')} className="lnd-btn"
              style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:12, padding:'0.48rem 1.1rem', fontWeight:900, fontSize:'0.82rem', display:'flex', alignItems:'center', gap:5, boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}>Panele Git <ArrowRight size={14} /></button>
          ) : (<>
            <button onClick={() => goTo('/login')} className="lnd-btn lnd-nav-pill"
              style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.88)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, padding:'0.48rem 1rem', fontWeight:700, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:5 }}><LogIn size={13} /> Giriş Yap</button>
            <button onClick={() => goTo('/login')} className="lnd-btn"
              style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:12, padding:'0.48rem 1.1rem', fontWeight:900, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:5, boxShadow:'0 4px 14px rgba(99,102,241,0.5)' }}><UserPlus size={13} /> Kayıt Ol</button>
          </>)}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ minHeight:'100vh', background:'radial-gradient(ellipse 110% 80% at 50% -5%,#2d1b69 0%,#1e1b4b 35%,#0f0c2e 65%,#070714 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', padding:isMobile?'6rem 1rem 3rem':'8rem 2rem 5rem', textAlign:'center' }}>
        <div style={{ position:'absolute', top:'5%', left:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.22) 0%,transparent 70%)', animation:'lndAurora 10s ease infinite', pointerEvents:'none', filter:'blur(22px)' }} />
        <div style={{ position:'absolute', top:'20%', right:'3%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,0.2) 0%,transparent 70%)', animation:'lndAurora 14s ease infinite reverse', pointerEvents:'none', filter:'blur(18px)' }} />
        <div style={{ position:'absolute', bottom:'10%', left:'12%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(244,63,94,0.13) 0%,transparent 70%)', animation:'lndAurora 12s ease infinite 2s', pointerEvents:'none', filter:'blur(22px)' }} />
        <div style={{ position:'absolute', bottom:'18%', right:'15%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)', animation:'lndAurora 9s ease infinite 4s', pointerEvents:'none', filter:'blur(16px)' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, borderRadius:'50%', border:'1px solid rgba(99,102,241,0.07)', animation:'lndSpin 40s linear infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:850, height:850, borderRadius:'50%', border:'1px solid rgba(168,85,247,0.04)', animation:'lndSpin 60s linear infinite reverse', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:2, maxWidth:820, margin:'0 auto', animation:'lndFadeUp 0.6s ease both' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(99,102,241,0.15)', backdropFilter:'blur(12px)', border:'1px solid rgba(99,102,241,0.38)', borderRadius:99, padding:'0.38rem 1rem', marginBottom:'1.75rem', animation:'lndBadgePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
            <Sparkles size={12} color="#a5b4fc" />
            <span style={{ fontSize:'0.68rem', fontWeight:800, color:'#a5b4fc', letterSpacing:'0.1em', textTransform:'uppercase' }}>✦ 2026 Eğitim Platformu</span>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', animation:'lndPulse 2s ease infinite' }} />
          </div>
          <h1 style={{ fontSize:isMobile?'2.4rem':'4rem', fontWeight:900, color:'white', margin:'0 0 1.25rem 0', lineHeight:1.1, letterSpacing:'-0.03em' }}>
            Akıllı Eğitim,<br />Yol Haritaları &{' '}<span className="lnd-shimmer-text">Canlı Analiz Portalı</span>
          </h1>
          <p style={{ fontSize:isMobile?'1rem':'1.18rem', color:'rgba(203,213,225,0.82)', margin:'0 auto 2.5rem', lineHeight:1.7, fontWeight:500, maxWidth:620 }}>
            Öğrenciler için adımsayarlı yol haritaları ve test modülleri; öğretmenler için optik karne analizi, soru bankası ve ödev takip sistemi ile eğitimin yeni çağına adım atın.
          </p>
          <div style={{ display:'flex', gap:'0.85rem', flexWrap:'wrap', justifyContent:'center', marginBottom:'1.25rem' }}>
            {currentUser ? (
              <button onClick={() => goTo(currentUser.role==='student'?'/student':'/teacher')} className="lnd-btn"
                style={{ background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)', color:'white', border:'none', borderRadius:16, padding:isMobile?'0.85rem 1.75rem':'1.05rem 2.25rem', fontWeight:900, fontSize:isMobile?'1rem':'1.1rem', display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 28px rgba(99,102,241,0.55)' }}>Panele Git <ArrowRight size={20} /></button>
            ) : (<>
              <button onClick={() => goTo('/login')} className="lnd-btn"
                style={{ background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)', color:'white', border:'none', borderRadius:16, padding:isMobile?'0.85rem 1.75rem':'1.05rem 2.25rem', fontWeight:900, fontSize:isMobile?'1rem':'1.1rem', display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 28px rgba(99,102,241,0.55)' }}><UserPlus size={20} /> Hemen Kayıt Ol</button>
              <button onClick={() => goTo('/login')} className="lnd-btn"
                style={{ background:'rgba(255,255,255,0.07)', color:'white', border:'1.5px solid rgba(255,255,255,0.18)', borderRadius:16, padding:isMobile?'0.85rem 1.75rem':'1.05rem 2.25rem', fontWeight:800, fontSize:isMobile?'1rem':'1.1rem', display:'flex', alignItems:'center', gap:8, backdropFilter:'blur(16px)' }}><LogIn size={20} /> Giriş Yap</button>
            </>)}
          </div>
          <div style={{ fontSize:'0.7rem', color:'rgba(100,116,139,0.75)', fontWeight:600 }}>🔒 Ücretsiz başlayın · Kredi kartı gerekmez</div>
        </div>
        <div style={{ position:'absolute', bottom:'2rem', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:0.4, animation:'lndFloat 3s ease infinite', zIndex:2 }}>
          <div style={{ fontSize:'0.56rem', fontWeight:700, color:'#94a3b8', letterSpacing:'0.1em', textTransform:'uppercase' }}>Keşfet</div>
          <div style={{ width:1, height:28, background:'linear-gradient(to bottom,rgba(148,163,184,0.8),transparent)' }} />
        </div>
      </div>

      {/* STATS */}
      <div style={{ background:'linear-gradient(90deg,rgba(99,102,241,0.1),rgba(168,85,247,0.1),rgba(99,102,241,0.1))', borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:isMobile?'1.75rem 1rem':'2.25rem 4rem' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:isMobile?'1.5rem':'0' }}>
          {[
            { ref:studentRef, count:studentCount, suffix:'+', label:'Aktif Öğrenci', icon:'👨🎓', color:'#a5b4fc' },
            { ref:questionRef, count:questionCount, suffix:'+', label:'Çözülen Soru', icon:'📝', color:'#34d399' },
            { ref:successRef, count:successRate, suffix:'%', label:'Başarı Oranı', icon:'🏆', color:'#fbbf24' },
          ].map((s,i) => (
            <div key={i} ref={s.ref} style={{ textAlign:'center', padding:'0 2rem', borderRight:!isMobile&&i<2?'1px solid rgba(255,255,255,0.07)':'none' }}>
              <div style={{ fontSize:'1.1rem', marginBottom:5 }}>{s.icon}</div>
              <div style={{ fontSize:isMobile?'2.4rem':'3rem', fontWeight:900, color:s.color, lineHeight:1, letterSpacing:'-0.02em' }}>{s.count.toLocaleString('tr-TR')}{s.suffix}</div>
              <div style={{ fontSize:'0.72rem', color:'rgba(148,163,184,0.75)', fontWeight:800, marginTop:5, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding:isMobile?'3.5rem 1rem':'5rem 2.5rem', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:isMobile?'2.5rem':'3.5rem' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.28)', borderRadius:99, padding:'0.3rem 1rem', marginBottom:'1rem' }}>
            <Sparkles size={12} color="#818cf8" />
            <span style={{ fontSize:'0.63rem', fontWeight:900, color:'#818cf8', letterSpacing:'0.1em', textTransform:'uppercase' }}>Temel Özellikler</span>
          </div>
          <h2 style={{ fontSize:isMobile?'1.9rem':'2.8rem', fontWeight:900, margin:'0 0 1rem', color:'white', letterSpacing:'-0.02em' }}>Her İhtiyacınız İçin<br /><span style={{ background:'linear-gradient(135deg,#a5b4fc,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Güçlü Araçlar</span></h2>
          <p style={{ color:'rgba(148,163,184,0.78)', fontSize:'1rem', maxWidth:520, margin:'0 auto', lineHeight:1.65 }}>Öğretmenden öğrenciye, analiz ekranından soru havuzuna kadar eğitimin her aşaması tek platformda.</p>
        </div>
        <div style={{ display:'flex', gap:isMobile?7:12, justifyContent:'center', marginBottom:'2rem', flexWrap:'wrap' }}>
          {features.map((f,i) => (
            <button key={i} onClick={() => setActiveFeature(i)}
              style={{ display:'flex', alignItems:'center', gap:7, background:activeFeature===i?`rgba(${i===0?'245,158,11':i===1?'16,185,129':'56,189,248'},0.18)`:'rgba(255,255,255,0.05)', border:`1.5px solid ${activeFeature===i?f.color:'rgba(255,255,255,0.1)'}`, borderRadius:12, padding:'0.5rem 1rem', color:activeFeature===i?f.color:'rgba(203,213,225,0.65)', fontWeight:800, fontSize:'0.8rem', cursor:'pointer', transition:'all 0.2s' }}>
              <span>{f.emoji}</span> {f.title}
            </button>
          ))}
        </div>
        <div style={{ background:'rgba(255,255,255,0.03)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:isMobile?'1.5rem':'2.5rem', display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:'2rem', alignItems:'center' }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:60, borderRadius:18, background:af.bgStyle, marginBottom:'1.25rem', boxShadow:`0 8px 24px ${af.glow}` }}>
              {React.createElement(af.icon, { size:28, color:af.color })}
            </div>
            <h3 style={{ fontSize:isMobile?'1.55rem':'2rem', fontWeight:900, color:'white', margin:'0 0 0.85rem', letterSpacing:'-0.01em' }}>{af.title}</h3>
            <p style={{ fontSize:'0.95rem', color:'rgba(148,163,184,0.82)', lineHeight:1.7, margin:'0 0 1.5rem' }}>{af.desc}</p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {af.pills.map((pill,pi) => (
                <span key={pi} style={{ display:'inline-flex', alignItems:'center', gap:5, background:`rgba(${activeFeature===0?'245,158,11':activeFeature===1?'16,185,129':'56,189,248'},0.12)`, border:`1px solid ${af.color}40`, borderRadius:99, padding:'0.3rem 0.85rem', fontSize:'0.72rem', fontWeight:800, color:af.color }}>
                  <CheckCircle size={11} /> {pill}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, height:220, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 60% 40%,${af.glow},transparent 70%)`, opacity:0.5 }} />
            <div style={{ fontSize:'3.5rem', animation:'lndFloat 4s ease infinite', zIndex:1 }}>{af.emoji}</div>
            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'rgba(148,163,184,0.55)', zIndex:1 }}>{af.title} Modülü</div>
          </div>
        </div>
      </div>

      {/* MARQUEE */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'1rem 0', overflow:'hidden', background:'rgba(99,102,241,0.04)' }}>
        <div style={{ display:'flex', animation:'marqueeLeft 22s linear infinite', width:'max-content' }}>
          {[0,1].map(ri => (
            <div key={ri} style={{ display:'flex', gap:'2.5rem', paddingRight:'2.5rem', whiteSpace:'nowrap' }}>
              {['Optik Form','Yol Haritası','Soru Havuzu','Koçluk Sistemi','Ödev Takip','Analiz Paneli','Karne Raporu','PDF Test','Zayıf Konu Tespiti','Kitap Test'].map((item,ii) => (
                <span key={ii} style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:'0.73rem', fontWeight:700, color:'rgba(100,116,139,0.7)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  <Star size={9} color="#6366f1" fill="#6366f1" /> {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* PANELS */}
      <div style={{ padding:isMobile?'3.5rem 1rem':'5rem 2.5rem', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:isMobile?'2.5rem':'3.5rem' }}>
          <h2 style={{ fontSize:isMobile?'1.9rem':'2.8rem', fontWeight:900, margin:'0 0 1rem', color:'white', letterSpacing:'-0.02em' }}>Öğretmen mi, Öğrenci mi?</h2>
          <p style={{ color:'rgba(148,163,184,0.72)', fontSize:'1rem', maxWidth:480, margin:'0 auto' }}>Her iki rol için özel olarak tasarlanmış paneller ile tam kontrol sizin elinizde.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:'1.5rem' }}>
          <div className="lnd-panel-card" style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.07))', border:'1.5px solid rgba(99,102,241,0.22)', borderRadius:24, padding:isMobile?'1.75rem':'2.25rem', boxShadow:'0 16px 48px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
              <div style={{ width:50, height:50, borderRadius:16, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 18px rgba(99,102,241,0.5)', flexShrink:0 }}><GraduationCap size={24} color="white" /></div>
              <div><div style={{ fontSize:'1.2rem', fontWeight:900, color:'white' }}>Öğretmen Paneli</div><div style={{ fontSize:'0.68rem', color:'rgba(165,180,252,0.7)', fontWeight:700 }}>Tam Kontrol & Analiz</div></div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'1.75rem' }}>
              {teacherFeats.map((f,i) => (
                <div key={i} className="lnd-feat-item" style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'0.58rem 0.85rem', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{React.createElement(f.icon,{size:15,color:f.color})}</div>
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'rgba(226,232,240,0.88)' }}>{f.text}</span>
                  <ChevronRight size={14} color="rgba(100,116,139,0.5)" style={{ marginLeft:'auto' }} />
                </div>
              ))}
            </div>
            <button onClick={() => goTo('/login')} className="lnd-btn" style={{ width:'100%', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'white', border:'none', borderRadius:14, padding:'0.85rem', fontWeight:900, fontSize:'0.88rem', display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 6px 20px rgba(99,102,241,0.45)' }}><LogIn size={16} /> Öğretmen Olarak Giriş Yap</button>
          </div>
          <div className="lnd-panel-card" style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,95,70,0.07))', border:'1.5px solid rgba(16,185,129,0.22)', borderRadius:24, padding:isMobile?'1.75rem':'2.25rem', boxShadow:'0 16px 48px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
              <div style={{ width:50, height:50, borderRadius:16, background:'linear-gradient(135deg,#059669,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 18px rgba(16,185,129,0.5)', flexShrink:0 }}><Users size={24} color="white" /></div>
              <div><div style={{ fontSize:'1.2rem', fontWeight:900, color:'white' }}>Öğrenci Paneli</div><div style={{ fontSize:'0.68rem', color:'rgba(110,231,183,0.7)', fontWeight:700 }}>Kişisel Gelişim & Takip</div></div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'1.75rem' }}>
              {studentFeats.map((f,i) => (
                <div key={i} className="lnd-feat-item" style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'0.58rem 0.85rem', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{React.createElement(f.icon,{size:15,color:f.color})}</div>
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'rgba(226,232,240,0.88)' }}>{f.text}</span>
                  <ChevronRight size={14} color="rgba(100,116,139,0.5)" style={{ marginLeft:'auto' }} />
                </div>
              ))}
            </div>
            <button onClick={() => goTo('/login')} className="lnd-btn" style={{ width:'100%', background:'linear-gradient(135deg,#059669,#10b981)', color:'white', border:'none', borderRadius:14, padding:'0.85rem', fontWeight:900, fontSize:'0.88rem', display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 6px 20px rgba(16,185,129,0.45)' }}><LogIn size={16} /> Öğrenci Olarak Giriş Yap</button>
          </div>
        </div>
      </div>

      {/* TRUST */}
      <div style={{ padding:isMobile?'1.5rem 1rem 2.5rem':'2rem 2.5rem 4rem', maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:'1rem', textAlign:'center' }}>
        {[
          {icon:Shield,label:'Güvenli Veri',sub:'SSL Şifreleme',color:'#818cf8'},
          {icon:Zap,label:'Anında Erişim',sub:'7/24 Aktif',color:'#fbbf24'},
          {icon:Star,label:'Premium Tasarım',sub:'Modern UI/UX',color:'#f472b6'},
          {icon:Flame,label:'Sürekli Güncelleme',sub:'Yeni Özellikler',color:'#34d399'},
        ].map((b,i) => (
          <div key={i} className="lnd-trust" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'1.25rem 0.75rem', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ width:42, height:42, borderRadius:13, background:`${b.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>{React.createElement(b.icon,{size:19,color:b.color})}</div>
            <div style={{ fontSize:'0.82rem', fontWeight:900, color:'rgba(226,232,240,0.9)' }}>{b.label}</div>
            <div style={{ fontSize:'0.63rem', fontWeight:600, color:'rgba(100,116,139,0.85)' }}>{b.sub}</div>
          </div>
        ))}
      </div>

      {/* FINAL CTA */}
      <div style={{ padding:isMobile?'3rem 1rem 4rem':'5rem 2.5rem 6rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% 50%,rgba(99,102,241,0.14),transparent)', pointerEvents:'none' }} />
        <div style={{ maxWidth:600, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:isMobile?'2rem':'3.2rem', fontWeight:900, color:'white', marginBottom:'1rem', lineHeight:1.15, letterSpacing:'-0.025em' }}>Başlamaya Hazır<br /><span className="lnd-shimmer-text">mısın?</span></div>
          <p style={{ color:'rgba(148,163,184,0.78)', fontSize:'1rem', marginBottom:'2rem', lineHeight:1.65 }}>Hemen ücretsiz kaydol ve E-Test Pro'nun tüm özelliklerini keşfet.</p>
          {!currentUser ? (
            <button onClick={() => goTo('/login')} className="lnd-btn" style={{ background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)', color:'white', border:'none', borderRadius:18, padding:'1.1rem 2.75rem', fontWeight:900, fontSize:'1.1rem', display:'inline-flex', alignItems:'center', gap:9, boxShadow:'0 12px 36px rgba(99,102,241,0.55)' }}><UserPlus size={22} /> Ücretsiz Başla</button>
          ) : (
            <button onClick={() => goTo(currentUser.role==='student'?'/student':'/teacher')} className="lnd-btn" style={{ background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)', color:'white', border:'none', borderRadius:18, padding:'1.1rem 2.75rem', fontWeight:900, fontSize:'1.1rem', display:'inline-flex', alignItems:'center', gap:9, boxShadow:'0 12px 36px rgba(99,102,241,0.55)' }}>Panele Git <ArrowRight size={22} /></button>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:isMobile?'1.5rem 1rem':'2rem 3rem', display:'flex', flexDirection:isMobile?'column':'row', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center' }}><Zap size={13} color="white" fill="white" /></div>
          <span style={{ fontSize:'0.8rem', fontWeight:800, color:'rgba(255,255,255,0.65)' }}>E-TEST PRO</span>
          <span style={{ fontSize:'0.68rem', color:'rgba(100,116,139,0.75)', fontWeight:600 }}>© 2026 · Tüm hakları saklıdır</span>
        </div>
        <div style={{ display:'flex', gap:16 }}>
          {['Gizlilik','Kullanım Koşulları','İletişim'].map((item,i) => (
            <span key={i} style={{ fontSize:'0.7rem', color:'rgba(100,116,139,0.7)', fontWeight:600, cursor:'pointer' }}
              onMouseEnter={e => e.target.style.color='rgba(165,180,252,0.9)'}
              onMouseLeave={e => e.target.style.color='rgba(100,116,139,0.7)'}>{item}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
